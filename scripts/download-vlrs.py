import pandas as pd
import requests
import re

PATH = 'vlrs/'
vlrs = pd.read_csv('vlrs-7-15-24.csv')
for idx, row in vlrs.iterrows():
    response = requests.get(row['URL'])
    file_name = '_'.join([
        row['Local / Regional Government'],
        row['Country'],
        row['Report(s)'],
        row['Language'],
        str(row['Year'])
    ])
    clean_name = re.sub(r'[<>:"/\\|?*]', '', file_name)
    clean_name = clean_name + '.pdf'
    with open(PATH + clean_name, 'wb') as file:
        file.write(response.content)
        