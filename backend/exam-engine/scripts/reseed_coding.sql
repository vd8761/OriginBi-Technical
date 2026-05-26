-- Wipe + reseed coding-question fixtures for end-to-end testing.
-- Body shape mirrors seed/coding_questions_full.json so the authoring
-- validator (assessment-coding/authoring.go) accepts it.
BEGIN;

-- 1. Drop attempt-side data first — cascades to answers, code_runs,
--    code_submissions, code_submission_files, code_run_test_results,
--    attempt_question_state, evaluations, attempt_event_summary, etc.
DELETE FROM attempts;

-- 2. exam_assignments has nothing left pointing at it from attempts now.
DELETE FROM exam_assignments;

-- 3. exam_questions blocks question_versions deletion (RESTRICT).
DELETE FROM exam_questions
WHERE question_version_id IN (
    SELECT qv.id FROM question_versions qv
    JOIN questions q ON q.id = qv.question_id
    WHERE q.plugin_id = (SELECT id FROM plugins WHERE slug = 'assessment.coding')
);

-- 4. questions.current_version_id is NO ACTION → NULL it before dropping versions.
UPDATE questions
SET current_version_id = NULL
WHERE plugin_id = (SELECT id FROM plugins WHERE slug = 'assessment.coding');

-- 5. question_versions cascade to question_test_cases / question_options / question_media.
DELETE FROM question_versions
WHERE question_id IN (
    SELECT id FROM questions
    WHERE plugin_id = (SELECT id FROM plugins WHERE slug = 'assessment.coding')
);

-- 6. Finally drop the question rows themselves (cascade to question_tags).
DELETE FROM questions
WHERE plugin_id = (SELECT id FROM plugins WHERE slug = 'assessment.coding');

-- ── Reseed: three minimal coding questions covering Easy/Medium/Hard ──
DO $$
DECLARE
    coding_plugin UUID := (SELECT id FROM plugins WHERE slug = 'assessment.coding');
    sys_org       UUID := '00000000-0000-0000-0000-000000000001';
    q1_id UUID := 'aaaaaaaa-0000-0000-0000-000000000001';
    q1_v  UUID := 'aaaaaaaa-1111-0000-0000-000000000001';
    q2_id UUID := 'aaaaaaaa-0000-0000-0000-000000000002';
    q2_v  UUID := 'aaaaaaaa-1111-0000-0000-000000000002';
    q3_id UUID := 'aaaaaaaa-0000-0000-0000-000000000003';
    q3_v  UUID := 'aaaaaaaa-1111-0000-0000-000000000003';
BEGIN
    -- Q1 (Easy, 10 pts, 2 tests = 5/test): Sum Two Integers
    INSERT INTO questions (id, org_id, plugin_id, created_by, title)
    VALUES (q1_id, sys_org, coding_plugin, 1, 'Sum Two Integers');
    INSERT INTO question_versions (
        id, question_id, version_number, difficulty, estimated_time_seconds,
        body, max_score, is_negative_marked, negative_score, created_by
    ) VALUES (
        q1_v, q1_id, 1, 1, 300,
        jsonb_build_object(
            'type',          'coding',
            'responseType',  'code',
            'title',         'Sum Two Integers',
            'section',       'Math',
            'category',      'Math',
            'difficulty',    'easy',
            'mode',          'main',
            'tags',          jsonb_build_array('math','io','warmup'),
            'promptFormat',  'markdown',
            'prompt',        '## Sum Two Integers' || E'\n\n' || 'Read two space-separated integers from stdin and print their sum.',
            'allowedLanguages', jsonb_build_array('language.python','language.javascript','language.java','language.cpp','language.c'),
            'multiFile',     false,
            'starterCode',   jsonb_build_object(
                'language.python', E'import sys\n\nif __name__ == "__main__":\n    a, b = map(int, sys.stdin.readline().split())\n    print(a + b)\n'
            )
        ),
        10, false, 0, 1
    );
    INSERT INTO question_test_cases (id, question_version_id, ordinal, name, is_sample, is_hidden, weight, stdin, expected_stdout, comparator, comparator_config)
    VALUES
        (gen_random_uuid(), q1_v, 1, 'sample',  true,  false, 1, '2 3',  '5',  'trim_equal', '{}'),
        (gen_random_uuid(), q1_v, 2, 'hidden1', false, true,  1, '13 1', '14', 'trim_equal', '{}');
    UPDATE questions SET current_version_id = q1_v WHERE id = q1_id;

    -- Q2 (Medium, 20 pts, 4 tests = 5/test): Reverse a String
    INSERT INTO questions (id, org_id, plugin_id, created_by, title)
    VALUES (q2_id, sys_org, coding_plugin, 1, 'Reverse a String');
    INSERT INTO question_versions (
        id, question_id, version_number, difficulty, estimated_time_seconds,
        body, max_score, is_negative_marked, negative_score, created_by
    ) VALUES (
        q2_v, q2_id, 1, 2, 600,
        jsonb_build_object(
            'type',          'coding',
            'responseType',  'code',
            'title',         'Reverse a String',
            'section',       'Strings',
            'category',      'Strings',
            'difficulty',    'medium',
            'mode',          'main',
            'tags',          jsonb_build_array('strings','io'),
            'promptFormat',  'markdown',
            'prompt',        '## Reverse a String' || E'\n\n' || 'Read a single line from stdin and print it reversed.',
            'allowedLanguages', jsonb_build_array('language.python','language.javascript','language.java','language.cpp','language.c'),
            'multiFile',     false,
            'starterCode',   jsonb_build_object(
                'language.python', E'import sys\n\nif __name__ == "__main__":\n    line = sys.stdin.readline().rstrip("\\n")\n    print(line[::-1])\n'
            )
        ),
        20, false, 0, 1
    );
    INSERT INTO question_test_cases (id, question_version_id, ordinal, name, is_sample, is_hidden, weight, stdin, expected_stdout, comparator, comparator_config)
    VALUES
        (gen_random_uuid(), q2_v, 1, 'sample',  true,  false, 1, 'hello',  'olleh',  'trim_equal', '{}'),
        (gen_random_uuid(), q2_v, 2, 'hidden1', false, true,  1, 'world',  'dlrow',  'trim_equal', '{}'),
        (gen_random_uuid(), q2_v, 3, 'hidden2', false, true,  1, 'abcd',   'dcba',   'trim_equal', '{}'),
        (gen_random_uuid(), q2_v, 4, 'palindrome', false, true,  1, 'racecar','racecar','trim_equal', '{}');
    UPDATE questions SET current_version_id = q2_v WHERE id = q2_id;

    -- Q3 (Hard, 30 pts, 6 tests = 5/test): FizzBuzz to N
    INSERT INTO questions (id, org_id, plugin_id, created_by, title)
    VALUES (q3_id, sys_org, coding_plugin, 1, 'FizzBuzz to N');
    INSERT INTO question_versions (
        id, question_id, version_number, difficulty, estimated_time_seconds,
        body, max_score, is_negative_marked, negative_score, created_by
    ) VALUES (
        q3_v, q3_id, 1, 3, 900,
        jsonb_build_object(
            'type',          'coding',
            'responseType',  'code',
            'title',         'FizzBuzz to N',
            'section',       'Loops',
            'category',      'Control Flow',
            'difficulty',    'hard',
            'mode',          'main',
            'tags',          jsonb_build_array('loops','classic'),
            'promptFormat',  'markdown',
            'prompt',        '## FizzBuzz to N' || E'\n\n' || 'Read an integer N from stdin. For each i in 1..N print Fizz if i%3=0, Buzz if i%5=0, FizzBuzz if both, else i. One per line.',
            'allowedLanguages', jsonb_build_array('language.python','language.javascript','language.java','language.cpp','language.c'),
            'multiFile',     false,
            'starterCode',   jsonb_build_object(
                'language.python', E'import sys\n\nif __name__ == "__main__":\n    n = int(sys.stdin.readline().strip())\n    for i in range(1, n + 1):\n        if i % 15 == 0: print("FizzBuzz")\n        elif i % 3 == 0: print("Fizz")\n        elif i % 5 == 0: print("Buzz")\n        else: print(i)\n'
            )
        ),
        30, false, 0, 1
    );
    INSERT INTO question_test_cases (id, question_version_id, ordinal, name, is_sample, is_hidden, weight, stdin, expected_stdout, comparator, comparator_config)
    VALUES
        (gen_random_uuid(), q3_v, 1, 'sample1', true,  false, 1, '3',  E'1\n2\nFizz',                                       'trim_equal', '{}'),
        (gen_random_uuid(), q3_v, 2, 'sample2', true,  false, 1, '5',  E'1\n2\nFizz\n4\nBuzz',                                'trim_equal', '{}'),
        (gen_random_uuid(), q3_v, 3, 'hidden1', false, true,  1, '6',  E'1\n2\nFizz\n4\nBuzz\nFizz',                          'trim_equal', '{}'),
        (gen_random_uuid(), q3_v, 4, 'hidden2', false, true,  1, '10', E'1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz',        'trim_equal', '{}'),
        (gen_random_uuid(), q3_v, 5, 'hidden3', false, true,  1, '15', E'1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz', 'trim_equal', '{}'),
        (gen_random_uuid(), q3_v, 6, 'edge',    false, true,  1, '1',  '1',                                                    'trim_equal', '{}');
    UPDATE questions SET current_version_id = q3_v WHERE id = q3_id;
END $$;

COMMIT;

-- Verification
SELECT q.title, qv.version_number, qv.max_score, COUNT(tc.id) AS test_case_count,
       jsonb_pretty(qv.body)::text AS body_preview
FROM questions q
JOIN question_versions qv ON qv.id = q.current_version_id
LEFT JOIN question_test_cases tc ON tc.question_version_id = qv.id
WHERE q.plugin_id = (SELECT id FROM plugins WHERE slug = 'assessment.coding')
GROUP BY q.id, q.title, qv.version_number, qv.max_score, qv.body
ORDER BY q.title;
