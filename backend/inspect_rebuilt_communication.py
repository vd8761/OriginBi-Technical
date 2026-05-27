import pandas as pd
import json
import sys

EXCEL_FILE = r"C:\Users\Jaya Krishna\Downloads\communication_assessment_questions_rebuilt.xlsx"

try:
    print("Loading rebuilt communication excel file...")
    # Load sheet names
    xl = pd.ExcelFile(EXCEL_FILE)
    sheet_name = xl.sheet_names[0]
    print(f"Sheet Name: {sheet_name}")
    
    # Read the full file
    df = pd.read_excel(EXCEL_FILE, sheet_name=sheet_name)
    print(f"Successfully loaded {len(df)} rows.")
    print("\nColumns:")
    print(df.columns.tolist())
    
    # Check unique value distributions of categorical columns
    print("\nCategorical Distributions:")
    cols_to_check = ['Main Category', 'Sub Category', 'Question Type', 'Question Level', 'Basis / Purpose', 'Marks Per Question']
    for col in cols_to_check:
        # Check standard casing or space casing
        matched_col = None
        for c in df.columns:
            if c.lower().replace(" ", "").replace("/", "") == col.lower().replace(" ", "").replace("/", ""):
                matched_col = c
                break
        
        if matched_col:
            print(f"\n--- Distribution of {matched_col} ---")
            print(df[matched_col].value_counts().head(10))
            
    # Draw a representative sample of 15 questions to check quality
    print("\nSampling 15 questions for detailed quality audit...")
    sample_df = df.sample(n=min(15, len(df)), random_state=42)
    
    samples = []
    for idx, row in sample_df.iterrows():
        # Match columns flexibly
        s_no = row.get('S.No') or row.get('S. No') or row.get('S.No.') or idx+1
        main_cat = row.get('Main Category') or row.get('Category') or ''
        sub_cat = row.get('Sub Category') or row.get('Subcategory') or ''
        q_type = row.get('Question Type') or row.get('Type') or ''
        level = row.get('Question Level') or row.get('Difficulty') or ''
        question = row.get('Question') or row.get('Question Text') or ''
        opt_a = row.get('Option A') or row.get('A') or ''
        opt_b = row.get('Option B') or row.get('B') or ''
        opt_c = row.get('Option C') or row.get('C') or ''
        opt_d = row.get('Option D') or row.get('D') or ''
        correct = row.get('Correct Answer') or row.get('Correct') or ''
        explanation = row.get('Explanation') or ''
        
        samples.append({
            'S.No': s_no,
            'Main Category': main_cat,
            'Sub Category': sub_cat,
            'Question Type': q_type,
            'Question Level': level,
            'Question': question,
            'Option A': opt_a,
            'Option B': opt_b,
            'Option C': opt_c,
            'Option D': opt_d,
            'Correct Answer': correct,
            'Explanation': explanation
        })
        
    output_path = r"c:\Users\Jaya Krishna\Desktop\OriginBi-Technical\backend\rebuilt_communication_sample.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(samples, f, indent=2, default=str)
        
    print(f"Saved 15 sample questions to: {output_path}")

except Exception as e:
    print(f"Error during inspection: {e}")
    sys.exit(1)
