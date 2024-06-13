import pandas as pd
import requests

PATH = 'vlrs/'
vlrs = pd.read_csv('vlrs-6-13-24.csv')
for idx, row in vlrs.iterrows():
    response = requests.get(row['URL'])
    file_name = '_'.join([
        row['Local / Regional Government'],
        row['Country'],
        row['Report(s)'],
        row['Language'],
        str(row['Year'])
    ])
    file_name = file_name + '.pdf'
    with open(PATH + file_name, 'wb') as file:
        file.write(response.content)