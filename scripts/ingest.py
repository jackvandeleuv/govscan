from typing import *
import anthropic 
import time
from pathlib import Path
import fitz
import base64
import os 
import re
from dotenv import load_dotenv
import numpy as np
import json
import httpx
import pandas as pd

# Load environmental variables
load_dotenv()

# Client
client = anthropic.Anthropic(api_key=os.environ.get('ANTHROPIC_API_KEY'))

# Constants
IMAGE_FOLDER_PATH = '../temp-images'
STRIDE = 20  # Stride is overlap between passages.
CHUNK_LEN = 80
HAIKU_MODEL = 'claude-3-haiku-20240307'
MAX_TOKENS = 4096


def ocr_image(image_path, encode_function, model, max_tokens):
    content_list = []

    # Add the image for OCR processing
    image_data = encode_function(image_path)
    image_content = {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": image_data}}
    content_list.append({"type": "text", "text": """Image for OCR:\n<image>"""})
    content_list.append(image_content)
    content_list.append({"type": "text", "text": "</image>"})

    # Concluding text for the OCR task
    concluding_text = {
        "type": "text",
        "text": """
            Please use an OCR tool or library to recognize and extract any text contained in the image. If the
            image does not contain any recognizable text, simply respond "No text detected in the image."

            If text is successfully extracted from the image, format the output as follows:
            <ocr_result>
            Extracted text goes here
            </ocr_result>

            Do not include any other explanatory text or notes in your response, only the extracted text inside
            the <ocr_result> tags. If no text is detected, respond with only "No text detected in the image."
        """
    }
    content_list.append(concluding_text)

    message_payload = {"model": model, "max_tokens": max_tokens, "messages": [{"role": "user", "content": content_list}]}
    return message_payload


def process_single_image(folder_path, encode_function, model, max_tokens, filename):
    image_path = os.path.join(folder_path, filename)
    message_payload = ocr_image(image_path, encode_function, model, max_tokens)

    try:
        response = client.messages.create(model=message_payload["model"], max_tokens=message_payload["max_tokens"], messages=message_payload["messages"])
    except anthropic.RateLimitError as rle:
        print('Hit rate limit. Waiting 60 seconds.')
        time.sleep(60)
        response = client.messages.create(model=message_payload["model"], max_tokens=message_payload["max_tokens"], messages=message_payload["messages"])
    except anthropic.BadRequestError as bre:
        print(str(bre))
        return "<OUTPUT BLOCKED BY CONTENT FILTERING POLICY>"

    ocr_text = response.content[0].text 
    return ocr_text


def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')
    

def extract_text_from_ocr_result(ocr_result):
    """
    Function to remove <ocr_result> tags and extract the text
    """
    clean_text = ocr_result.replace('<ocr_result>', '').replace('</ocr_result>', '')
    return clean_text.strip()


def pdf_to_images(pdf_path, output_folder):
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    for filename in os.listdir(output_folder):
        file_path = os.path.join(output_folder, filename)
        if os.path.isfile(file_path) or os.path.islink(file_path):
            os.unlink(file_path)

    doc = fitz.open(pdf_path)
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)

        pix = page.get_pixmap()

        image_filename = f"{output_folder}/page_{page_num + 1}.png"

        pix.save(image_filename)
        print(f"Saved {image_filename}")

    doc.close()


def natural_sort_key(s, _nsre=re.compile('([0-9]+)')):
    return [int(text) if text.isdigit() else text.lower() for text in re.split(_nsre, s)]


class Document:
    def __init__(self, text, metadata):
        self.text = text
        self.metadata = metadata


class SimpleMultimodalReader:
    def load_data(
        self, 
        file: Path, 
        extra_info: Optional[Dict] = None
    )-> List[Document]:
        # Convert PDF to Images and Save
        pdf_to_images(file, IMAGE_FOLDER_PATH)

        # Extract text with Haiku
        image_files = sorted([f for f in os.listdir(IMAGE_FOLDER_PATH) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.gif'))], key=natural_sort_key)
        ocr_texts = []

        encode_function = encode_image

        for i, image_file in enumerate(image_files):
            print("Processing image file:", i + 1)
            time.sleep(.25)  # TODO: Implement smarter rate limiting.
            ocr_text = process_single_image(IMAGE_FOLDER_PATH, encode_function, HAIKU_MODEL, MAX_TOKENS, image_file)
            ocr_texts.append(ocr_text)

        cleaned_texts = [extract_text_from_ocr_result(text) for text in ocr_texts]
        page_data = [{"text": str(el), "page_number": idx + 1} for idx, el in enumerate(cleaned_texts)]
        
        chunks_data = []

        start = 0
        end = start + CHUNK_LEN

        for page in page_data:
            tokens = page['text'].split()
            while end < len(tokens):
                chunks_data.append({
                    "chunk": ' '.join(tokens[start : end]),
                    "page_number": page["page_number"]
                })
                start += STRIDE
                end += STRIDE
            start = 0
            end = start + CHUNK_LEN


        print('chunks_data:', chunks_data)
        docs = []
        for row in chunks_data:
            metadata = {"page_label": row['page_number'], "file_name": str(file)}
            if extra_info is not None:
                metadata.update(extra_info)

            docs.append(Document(text=row['chunk'], metadata=metadata))

        return docs


async def embed_chunk(query_str: str) -> List[float]:
    headers = {
        "Authorization": f"Bearer {os.environ.get('OPENAI_API_KEY')}",
        "Content-Type": "application/json"
    }
    data = json.dumps({
        "input": query_str,
        "model": "text-embedding-3-large",
        "encoding_format": "float"
    })

    async with httpx.AsyncClient() as client:
        response = await client.post("https://api.openai.com/v1/embeddings", headers=headers, data=data)
        response_json = response.json()
        return response_json['data'][0]['embedding']


def ingest(path: str):
    name_minus_ext, _ = path.rsplit('.', 1)
    _, name_minus_dir = name_minus_ext.split('/', 1)
    file_name = f'ocr-text/OCR_{name_minus_dir}.csv'
    COLUMNS = ['file_path', 'text', 'page', 'chunk_num']

    reader = SimpleMultimodalReader()
    chunks = reader.load_data(path, extra_info=None)
    print('chunks', chunks)
    data = []
    for i, chunk in enumerate(chunks):
        data.append({
            'file_path': path, 
            'text': chunk.text, 
            'page': chunk.metadata['page_label'], 
            'chunk_num': i
        })
    df = pd.DataFrame(data, columns=COLUMNS)
    print(data)
    print(df)
    print(f'[INFO] Writing {file_name} to disk.')
    df.to_csv(file_name, index=False)
    print('[INFO] Completed.')


for file_path in os.listdir('vlrs'):
    file_path = 'vlrs/' + file_path 
    if os.path.isfile(file_path):
        print(f'[INFO] Ingesting {file_path}.')
        ingest(file_path)

# Clean up temp images dir.
os.rmdir('../temp-images')
