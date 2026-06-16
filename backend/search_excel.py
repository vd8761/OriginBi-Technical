import pandas as pd
import sys

EXCEL_FILE = r"C:\Users\Jaya Krishna\Desktop\Role based Questions - Production ready.xlsx"

try:
    xl = pd.ExcelFile(EXCEL_FILE)
    df = pd.read_excel(EXCEL_FILE, sheet_name=xl.sheet_names[0])
    print(f"Loaded {len(df)} rows.")
    
    # Search for question containing "Rust order management"
    matches = df[df['Question'].str.contains("Rust order management", na=False, case=False)]
    print("Matches for 'Rust order management':")
    print(matches[['S.No', 'Question', 'Correct Answer']])
    
    # Search for "A candidate must design user registration"
    matches2 = df[df['Question'].str.contains("user registration and login", na=False, case=False)]
    print("\nMatches for 'user registration and login':")
    print(matches2[['S.No', 'Question', 'Correct Answer']])
    
except Exception as e:
    print("Error:", e)
