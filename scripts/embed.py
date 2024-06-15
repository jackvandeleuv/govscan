import json
from typing import *
import httpx
import os
import pandas as pd
import asyncio

EMBEDDING_MODEL = "text-embedding-3-small"
OCR_DIR = 'ocr-chunks'
EMBEDDING_DIR = 'embeddings'

async def embed(string: str) -> List[float]:
    headers = {
        "Authorization": f"Bearer {os.environ.get('OPENAI_API_KEY')}",
        "Content-Type": "application/json"
    }
    data = json.dumps({
        "input": string,
        "model": EMBEDDING_MODEL,
        "encoding_format": "float"
    })

    async with httpx.AsyncClient() as client:
        response = await client.post("https://api.openai.com/v1/embeddings", headers=headers, data=data)
        response_json = response.json()
        return response_json['data'][0]['embedding']
    

async def main():
    for file_name in os.listdir(OCR_DIR):
        print(f'[INFO] Processing {file_name}')
        file_path = OCR_DIR + '/' + file_name
        if not os.path.isfile(file_path):
            print(f'[WARNING] Invalid path: {file_path}')
            continue

        df = pd.read_csv(file_path)

        embeddings = []
        for idx, row in df.iterrows():
            print(f'[INFO] Embedding chunk {idx}.')
            embedding = await embed(row['text'])
            embeddings.append({
                'index': idx,
                'embedding': embedding,
                'embedding_model': EMBEDDING_MODEL,
                'file_name': file_name
            })

        # Write to disk.
        pd.DataFrame(embeddings) \
            .to_csv(EMBEDDING_DIR + '/' + 'EMBED_' + file_name, index=False)


asyncio.run(main())
