import pandas as pd
import psycopg2
import sys
import re

EXCEL_FILE = r"C:\Users\Jaya Krishna\Desktop\Role based Questions - Production ready.xlsx"
DB_CONN = "postgresql://postgres:0023@localhost:5432/originbi?sslmode=disable"

def clean_text(text):
    if not text or pd.isna(text):
        return ""
    # Remove extra spaces, newlines, and trailing/leading quotes/whitespaces
    return re.sub(r'\s+', ' ', str(text)).strip().lower()

def main():
    print("Connecting to database...")
    try:
        conn = psycopg2.connect(DB_CONN)
        cur = conn.cursor()
    except Exception as e:
        print(f"Failed to connect to database: {e}")
        sys.exit(1)

    print("Loading excel file...")
    try:
        xl = pd.ExcelFile(EXCEL_FILE)
        df = pd.read_excel(EXCEL_FILE, sheet_name=xl.sheet_names[0])
        print(f"Loaded {len(df)} rows from excel.")
    except Exception as e:
        print(f"Failed to load excel: {e}")
        sys.exit(1)

    # Cache all questions in memory for fast lookup
    print("Fetching questions from DB...")
    cur.execute("SELECT role_question_id, question_text FROM tech_role_questions WHERE correct_option_id IS NULL")
    db_questions = cur.fetchall()
    print(f"Found {len(db_questions)} questions in DB with NULL correct_option_id.")

    # Create a lookup map of clean_text(question_text) -> role_question_id
    q_map = {}
    for q_id, q_text in db_questions:
        cleaned = clean_text(q_text)
        if cleaned:
            q_map[cleaned] = q_id

    updated_count = 0
    not_found_options = 0

    print("Matching and updating correct options...")
    for idx, row in df.iterrows():
        question_text = row.get('Question') or row.get('Question Text') or ''
        cleaned_q = clean_text(question_text)
        if cleaned_q not in q_map:
            continue

        q_id = q_map[cleaned_q]

        # Get the correct answer letter (e.g. 'A', 'B', 'C', 'D')
        correct_val = row.get('Correct Answer') or row.get('Correct') or ''
        if pd.isna(correct_val):
            continue
        correct_letter = str(correct_val).strip().upper()

        if correct_letter not in ['A', 'B', 'C', 'D']:
            continue

        # Get option text corresponding to correct letter
        option_col = f"Option {correct_letter}"
        correct_option_text = row.get(option_col) or row.get(correct_letter) or ''
        if pd.isna(correct_option_text):
            continue
        cleaned_opt_text = clean_text(correct_option_text)

        # Query options from DB for this question
        cur.execute("SELECT option_id, option_text FROM tech_role_options WHERE role_question_id = %s", (q_id,))
        options = cur.fetchall()

        # Match by text
        matched_option_id = None
        for opt_id, opt_text in options:
            if clean_text(opt_text) == cleaned_opt_text:
                matched_option_id = opt_id
                break

        # Fallback: if exact match fails, try substring or index matching
        if not matched_option_id and len(options) > 0:
            letter_idx = ord(correct_letter) - ord('A')
            if letter_idx < len(options):
                matched_option_id = options[letter_idx][0]

        if matched_option_id:
            cur.execute(
                "UPDATE tech_role_questions SET correct_option_id = %s, updated_at = NOW() WHERE role_question_id = %s",
                (matched_option_id, q_id)
            )
            updated_count += 1
        else:
            not_found_options += 1

        if idx % 1000 == 0 and idx > 0:
            print(f"Processed {idx} rows. Updated: {updated_count}")

    conn.commit()
    print(f"\nUpdate completed successfully!")
    print(f"Total updated: {updated_count}")
    print(f"Option mismatch count: {not_found_options}")

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
