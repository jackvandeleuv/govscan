import os
import pandas as pd
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

CSV_DIR = "supabase-data"


def upload_csv_to_supabase(table_name: str, csv_path: str):
    try:
        df = pd.read_csv(csv_path)
        
        data = df.to_dict(orient='records')

        response = supabase.table(table_name).upsert(data).execute()

        if response.error:
            print(f"Error uploading {csv_path} to {table_name}: {response.error}")
        else:
            print(f"Successfully uploaded {csv_path} to {table_name}")
    except Exception as e:
        print(f"Failed to upload {csv_path}: {e}")

def main():
    for file_name in os.listdir(CSV_DIR):
        file_path = f'{CSV_DIR}/{file_name}'

        table_name = "data_pg_vector_store"
        upload_csv_to_supabase(table_name, file_path)


if __name__ == "__main__":
    main()
