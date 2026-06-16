import pandas as pd
import sys

EXCEL_FILE = r"C:\Users\Jaya Krishna\Desktop\Role based Questions - Production ready.xlsx"

try:
    xl = pd.ExcelFile(EXCEL_FILE)
    df = pd.read_excel(EXCEL_FILE, sheet_name=xl.sheet_names[0])
    row = df.iloc[4220].to_dict()
    print("Row 4220:")
    print(row)
except Exception as e:
    print("Error:", e)
