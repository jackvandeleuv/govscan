import pandas as pd
import os

OCR_DIR = 'ocr-text'
EMBEDDING_DIR = 'embeddings'

for file_name in os.listdir(OCR_DIR):
    print(f'[INFO] Processing {file_name}')
    file_path = OCR_DIR + '/' + file_name
    if not os.path.isfile(file_path):
        print(f'[WARNING] Invalid path: {file_path}')
        continue

    