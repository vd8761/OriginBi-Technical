import pandas as pd
import numpy as np
import os
import sys
import argparse

def main():
    parser = argparse.ArgumentParser(description="Deduplicate assessment questions Excel files before importing.")
    parser.add_argument("file_path", nargs="?", default=None, help="Path to the Excel file to deduplicate.")
    args = parser.parse_args()

    # Default file path if not provided
    if args.file_path is None:
        default_file = r"C:\Users\Jaya Krishna\Desktop\Role-Based-Assessment-Questions-Final.xlsx"
        if os.path.exists(default_file):
            file_path = default_file
        else:
            file_path = input("Enter the path to the Excel file to deduplicate: ").strip()
    else:
        file_path = args.file_path

    if not os.path.exists(file_path):
        print(f"\n[ERROR] File not found at: {file_path}")
        sys.exit(1)

    print(f"\n[FILE] Loading Excel file: {file_path}")
    try:
        xl = pd.ExcelFile(file_path)
        sheet_name = xl.sheet_names[0]
        print(f"[SHEET] Reading sheet: '{sheet_name}'")
        df = pd.read_excel(file_path, sheet_name=sheet_name)
    except Exception as e:
        print(f"[ERROR] Error loading Excel file: {e}")
        sys.exit(1)

    total_rows = len(df)
    print(f"[STATS] Total raw rows loaded: {total_rows}")

    if 'Question' not in df.columns:
        print("[ERROR] Column 'Question' not found in the spreadsheet!")
        sys.exit(1)

    # 1. Strip whitespaces and handle case-insensitive text checks
    print("\n[STEP 1] Performing exact case-insensitive deduplication on 'Question' text...")
    
    # Create a temporary normalized question column for matching
    df['_temp_normalized_question'] = df['Question'].astype(str).str.strip().str.lower().str.replace(r'\s+', ' ', regex=True)
    
    # Identify exact duplicates
    exact_duplicates_mask = df.duplicated(subset=['_temp_normalized_question'], keep='first')
    exact_duplicates_count = exact_duplicates_mask.sum()
    
    # Filter them out
    df_clean = df[~exact_duplicates_mask].copy()
    print(f"[INFO] Removed {exact_duplicates_count} exact duplicates.")

    # 2. Check for template/formulaic repetitions (semantic duplication)
    print("\n[STEP 2] Checking for formulaic/templated duplicates...")
    # Clean out temp columns
    df_clean.drop(columns=['_temp_normalized_question'], inplace=True)
    
    # Check for template repetition by stripping out common technical keywords/placeholders 
    # to see if the sentence structure is identical.
    def get_template_fingerprint(q_text):
        words = str(q_text).strip().lower().split()
        tech_terms = {'html5', 'css', 'javascript', 'docker', 'python', 'java', 'sql', 'swift', 'kotlin', 'c++', 'aws', 'kubernetes', 'git'}
        fingerprint_words = [w for w in words if w not in tech_terms and len(w) > 3]
        return " ".join(fingerprint_words)

    df_clean['_temp_fingerprint'] = df_clean['Question'].apply(get_template_fingerprint)
    
    template_mask = df_clean.duplicated(subset=['_temp_fingerprint'], keep='first') & (df_clean['_temp_fingerprint'].str.split().str.len() < 15)
    template_duplicates_count = template_mask.sum()
    
    # Filter them out
    df_clean = df_clean[~template_mask].copy()
    df_clean.drop(columns=['_temp_fingerprint'], inplace=True)
    
    print(f"[INFO] Removed {template_duplicates_count} highly similar template/formulaic duplicates.")

    # Final Summary
    final_count = len(df_clean)
    print("\n--- Deduplication Summary ---")
    print(f"  * Original Rows:         {total_rows}")
    print(f"  * Exact Duplicates:      - {exact_duplicates_count}")
    print(f"  * Formulaic Duplicates:  - {template_duplicates_count}")
    print(f"  * Final Clean Rows:      {final_count} (Saved)")

    # Save output to a new file
    dir_name, file_name = os.path.split(file_path)
    base_name, ext = os.path.splitext(file_name)
    output_file_name = f"{base_name}_deduplicated{ext}"
    output_file_path = os.path.join(dir_name, output_file_name)

    print(f"\n[SAVE] Saving deduplicated Excel file to: {output_file_path}")
    try:
        df_clean.to_excel(output_file_path, sheet_name=sheet_name, index=False)
        print("[SUCCESS] Deduplication completed successfully!")
    except Exception as e:
        print(f"[ERROR] Error saving deduplicated file: {e}")

if __name__ == "__main__":
    main()
