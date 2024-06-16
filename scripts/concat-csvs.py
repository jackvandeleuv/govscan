import pandas as pd
import os

OCR_DIR = 'ocr-chunks'
EMBEDDING_DIR = 'embeddings'
VLR_METADATA_PATH = 'vlrs-6-13-24.csv'
DOC_TYPE = 'Voluntary Local Review'
S3_BUCKET_NAME = 'voluntary-local-reviews'
DOCUMENT_TABLE_FILE = 'supabase-data/document.csv'
DATA_PG_VECTOR_STORE_FILE = 'supabase-data/data_pg_vector_store'
NUM_VECTOR_DATA_SPLITS = 5


def create_file_name(row: pd.Series, extension: str) -> str:
    file_name = '_'.join([
        row['Local / Regional Government'],
        row['Country'],
        row['Report(s)'],
        row['Language'],
        str(row['Year'])
    ]) + extension
    file_name = file_name.replace(':', '')  # Sanitize file name.
    return file_name


def export_documents():
    df = pd.read_csv(VLR_METADATA_PATH)
    data = []
    for _, row in df.iterrows():
        data.append({
            'id': row['UUID'],
            'year': row['Year'],
            'doc_type': DOC_TYPE,
            'geography': row['Local / Regional Government'] + ', ' + row['Country'],
            'language': row['Language'],
            'source_url': row['URL'],
            'aws_s3_bucket_name': S3_BUCKET_NAME,
            'aws_s3_object_name': create_file_name(row, '.pdf'),
            'aws_s3_file_name': create_file_name(row, '.pdf') 
        })

    # Write to disk.
    pd.DataFrame(data).to_csv(DOCUMENT_TABLE_FILE, index=False)


def export_data_pg_vector_store():
    dfs = []
    df = pd.read_csv(VLR_METADATA_PATH)

    for _, row in df.iterrows():
        file_name = create_file_name(row, '.csv')

        chunks = pd.read_csv(f'{OCR_DIR}/OCR_{file_name}')

        # Modify to fit with supabase
        chunks['document_id'] = row['UUID']
        chunks = chunks
        embeddings = pd.read_csv(f'{EMBEDDING_DIR}/EMBED_OCR_{file_name}')

        chunks = chunks.reset_index()
        dfs.append(chunks.merge(embeddings, on='index'))

    # Write to disk.
    df = pd.concat(dfs, axis=0).drop([
        'index',
        'file_path',
        'file_name'
    ], axis=1)

    # Split df so it is under Supabase's 100MB limit.
    start = 0
    chunk_len = len(df) // NUM_VECTOR_DATA_SPLITS
    end = chunk_len
    print(len(df))
    while start < len(df):
        df_slice = df.iloc[start : end]
        df_slice.to_csv(DATA_PG_VECTOR_STORE_FILE + f'_{start}_{end}' + '.csv', index=False)
        start = end
        end = end + chunk_len


export_documents()
export_data_pg_vector_store()
