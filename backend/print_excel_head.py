import pandas as pd
import sys

EXCEL_FILE = r"C:\Users\Jaya Krishna\Desktop\Role based Questions - Production ready.xlsx"

try:
    xl = pd.ExcelFile(EXCEL_FILE)
    df = pd.read_excel(EXCEL_FILE, sheet_name=xl.sheet_names[0], nrows=5)
    print("Columns:", df.columns.tolist())
    print("\nFirst 3 rows:")
    print(df.head(3).to_dict(orient='records'))
except Exception as e:
    print("Error:", e)
