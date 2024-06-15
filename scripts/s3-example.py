import boto3
from botocore.exceptions import NoCredentialsError, PartialCredentialsError
from dotenv import load_dotenv

from pathlib import Path
env_path = Path('..') / '.env'
load_dotenv(dotenv_path=env_path)

s3 = boto3.client('s3')

def download_file(bucket_name, object_name, file_name):
    try:
        # Download the file
        s3.download_file(bucket_name, object_name, file_name)
        print(f"File {file_name} downloaded successfully.")
    except NoCredentialsError:
        print("Credentials not available.")
    except PartialCredentialsError:
        print("Incomplete credentials provided.")
    except Exception as e:
        print(f"An error occurred: {e}")

download_file('voluntary-local-reviews', 'Accra_Ghana_Voluntary Local Review_English_2020.pdf', 'Accra_Ghana_Voluntary Local Review_English_2020.pdf')
 