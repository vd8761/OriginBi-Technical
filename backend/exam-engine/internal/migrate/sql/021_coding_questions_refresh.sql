-- +goose Up
-- Refresh the seeded coding question bank with a fresh set tagged per
-- language. Each question has 2-3 test cases; the first is a sample
-- (visible in the candidate UI), the rest are hidden. Bodies match the
-- assessment.coding/schemas/question-body.schema.json — in particular,
-- `allowedLanguages` is the per-question language whitelist.
--
-- The coding exam_version (00000000-0000-0000-0000-000000000601) is also
-- rewired so the new 10 questions become the active pool. Existing
-- candidate attempts on the old question_versions are preserved by the
-- DELETE order (exam_questions first, then questions cascade).
--
-- Idempotent under stable UUIDs: re-running this migration drops the
-- previous coding-plugin seed rows and reinserts the same 10 questions.

-- ─── Resolve ids ─────────────────────────────────────────────────────────
-- plugin_id, org_id, exam_version_id, section_id captured as constants.

-- Unwire old coding exam questions, then drop the questions (cascades to
-- question_versions and question_test_cases). RESTRICT FK on
-- exam_questions.question_version_id forces the unwire to come first.
DELETE FROM exam_questions
WHERE exam_version_id = '00000000-0000-0000-0000-000000000601';

DELETE FROM questions
WHERE plugin_id = (SELECT id FROM plugins WHERE slug = 'assessment.coding')
  AND (created_by IS NULL OR id IN (
        '11111111-0000-0000-0000-000000000001',
        '11111111-0000-0000-0000-000000000002',
        '11111111-0000-0000-0000-000000000003',
        '11111111-0000-0000-0000-000000000004',
        '11111111-0000-0000-0000-000000000005',
        '11111111-0000-0000-0000-000000000006',
        '11111111-0000-0000-0000-000000000007',
        '11111111-0000-0000-0000-000000000008',
        '11111111-0000-0000-0000-000000000009',
        '11111111-0000-0000-0000-000000000010'
  ));

-- Internal helper expressed as a DO block: takes deterministic IDs so
-- the migration is re-runnable, and rebuilds exam_questions in lockstep.
-- +goose StatementBegin
DO $body$
DECLARE
    pid uuid := (SELECT id FROM plugins WHERE slug = 'assessment.coding' LIMIT 1);
    org uuid := '00000000-0000-0000-0000-000000000001';
    exam_ver uuid := '00000000-0000-0000-0000-000000000601';
    section uuid := '00000000-0000-0000-0000-000000000602';

    -- (qid, vid, eqid, title, difficulty, score, langs csv, prompt, samples_json, tests_json)
    seed CONSTANT jsonb := jsonb_build_array(
        jsonb_build_object(
            'qid','11111111-0000-0000-0000-000000000001','vid','22222222-0000-0000-0000-000000000001','eqid','33333333-0000-0000-0000-000000000001',
            'title','Two Sum','difficulty',1,'score',10,
            'langs', jsonb_build_array('language.python','language.java','language.cpp','language.javascript','language.c'),
            'section','Arrays & Hashing',
            'prompt','## Two Sum'||E'\n\n'||'Read two space-separated integers `a` and `b` from stdin and print their sum.',
            'samples', jsonb_build_array(jsonb_build_object('input','2 3','output','5','explanation','2 + 3 = 5')),
            'tests', jsonb_build_array(
                jsonb_build_object('name','sample','sample',true,  'stdin','2 3',     'expected','5'),
                jsonb_build_object('name','pos',   'sample',false, 'stdin','100 250', 'expected','350'),
                jsonb_build_object('name','neg',   'sample',false, 'stdin','-7 12',   'expected','5')
            )),
        jsonb_build_object(
            'qid','11111111-0000-0000-0000-000000000002','vid','22222222-0000-0000-0000-000000000002','eqid','33333333-0000-0000-0000-000000000002',
            'title','Reverse a String','difficulty',1,'score',10,
            'langs', jsonb_build_array('language.python','language.java','language.cpp','language.javascript','language.c'),
            'section','Strings',
            'prompt','## Reverse a String'||E'\n\n'||'Read a single line of text from stdin and print it reversed.',
            'samples', jsonb_build_array(jsonb_build_object('input','hello','output','olleh')),
            'tests', jsonb_build_array(
                jsonb_build_object('name','sample','sample',true,  'stdin','hello','expected','olleh'),
                jsonb_build_object('name','mixed', 'sample',false, 'stdin','OriginBI','expected','IBnigirO'),
                jsonb_build_object('name','palindrome','sample',false,'stdin','racecar','expected','racecar')
            )),
        jsonb_build_object(
            'qid','11111111-0000-0000-0000-000000000003','vid','22222222-0000-0000-0000-000000000003','eqid','33333333-0000-0000-0000-000000000003',
            'title','FizzBuzz','difficulty',1,'score',10,
            'langs', jsonb_build_array('language.python','language.java','language.cpp','language.javascript','language.c'),
            'section','Loops',
            'prompt','## FizzBuzz'||E'\n\n'||'Read an integer `n`. Print numbers `1..n` one per line, replacing multiples of 3 with `Fizz`, multiples of 5 with `Buzz`, and multiples of 15 with `FizzBuzz`.',
            'samples', jsonb_build_array(jsonb_build_object('input','5','output',E'1\n2\nFizz\n4\nBuzz')),
            'tests', jsonb_build_array(
                jsonb_build_object('name','n=5', 'sample',true,  'stdin','5', 'expected',E'1\n2\nFizz\n4\nBuzz'),
                jsonb_build_object('name','n=15','sample',false, 'stdin','15','expected',E'1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz')
            )),
        jsonb_build_object(
            'qid','11111111-0000-0000-0000-000000000004','vid','22222222-0000-0000-0000-000000000004','eqid','33333333-0000-0000-0000-000000000004',
            'title','Palindrome Check','difficulty',1,'score',10,
            'langs', jsonb_build_array('language.python','language.java','language.cpp','language.javascript','language.c'),
            'section','Strings',
            'prompt','## Palindrome Check'||E'\n\n'||'Read a string. Print `YES` if it is a palindrome (case-insensitive, ignoring spaces), `NO` otherwise.',
            'samples', jsonb_build_array(jsonb_build_object('input','Madam','output','YES')),
            'tests', jsonb_build_array(
                jsonb_build_object('name','sample','sample',true,  'stdin','Madam',      'expected','YES'),
                jsonb_build_object('name','spaces','sample',false, 'stdin','nurses run', 'expected','YES'),
                jsonb_build_object('name','no',    'sample',false, 'stdin','hello',      'expected','NO')
            )),
        jsonb_build_object(
            'qid','11111111-0000-0000-0000-000000000005','vid','22222222-0000-0000-0000-000000000005','eqid','33333333-0000-0000-0000-000000000005',
            'title','Find Maximum in Array','difficulty',2,'score',15,
            'langs', jsonb_build_array('language.python','language.java','language.cpp','language.c'),
            'section','Arrays',
            'prompt','## Find Maximum'||E'\n\n'||'First line: integer `n`. Second line: `n` space-separated integers. Print the maximum.',
            'samples', jsonb_build_array(jsonb_build_object('input',E'5\n3 7 1 9 4','output','9')),
            'tests', jsonb_build_array(
                jsonb_build_object('name','sample','sample',true,  'stdin',E'5\n3 7 1 9 4',   'expected','9'),
                jsonb_build_object('name','neg',   'sample',false, 'stdin',E'4\n-1 -5 -3 -2', 'expected','-1'),
                jsonb_build_object('name','single','sample',false, 'stdin',E'1\n42',          'expected','42')
            )),
        jsonb_build_object(
            'qid','11111111-0000-0000-0000-000000000006','vid','22222222-0000-0000-0000-000000000006','eqid','33333333-0000-0000-0000-000000000006',
            'title','Binary Search','difficulty',3,'score',20,
            'langs', jsonb_build_array('language.python','language.java','language.cpp','language.javascript','language.c'),
            'section','Searching',
            'prompt','## Binary Search'||E'\n\n'||'Line 1: `n` and `target`. Line 2: `n` sorted ascending integers. Print the 0-based index of `target`, or `-1` if absent.',
            'samples', jsonb_build_array(jsonb_build_object('input',E'5 7\n1 3 5 7 9','output','3')),
            'tests', jsonb_build_array(
                jsonb_build_object('name','found',  'sample',true,  'stdin',E'5 7\n1 3 5 7 9','expected','3'),
                jsonb_build_object('name','missing','sample',false, 'stdin',E'5 8\n1 3 5 7 9','expected','-1'),
                jsonb_build_object('name','firstpos','sample',false,'stdin',E'4 1\n1 2 3 4',  'expected','0')
            )),
        jsonb_build_object(
            'qid','11111111-0000-0000-0000-000000000007','vid','22222222-0000-0000-0000-000000000007','eqid','33333333-0000-0000-0000-000000000007',
            'title','Valid Parentheses','difficulty',3,'score',20,
            'langs', jsonb_build_array('language.python','language.java','language.javascript'),
            'section','Stacks',
            'prompt','## Valid Parentheses'||E'\n\n'||'Read a string of `()[]{}` brackets. Print `YES` if every opener has a matching closer in the right order, `NO` otherwise.',
            'samples', jsonb_build_array(jsonb_build_object('input','()[]{}','output','YES')),
            'tests', jsonb_build_array(
                jsonb_build_object('name','balanced','sample',true,  'stdin','()[]{}','expected','YES'),
                jsonb_build_object('name','mismatch','sample',false, 'stdin','([)]',  'expected','NO'),
                jsonb_build_object('name','nested',  'sample',false, 'stdin','{[()]}','expected','YES')
            )),
        jsonb_build_object(
            'qid','11111111-0000-0000-0000-000000000008','vid','22222222-0000-0000-0000-000000000008','eqid','33333333-0000-0000-0000-000000000008',
            'title','Merge Two Sorted Arrays','difficulty',3,'score',20,
            'langs', jsonb_build_array('language.python','language.java','language.cpp','language.javascript','language.c'),
            'section','Arrays',
            'prompt','## Merge Two Sorted Arrays'||E'\n\n'||'Line 1: `m n`. Line 2: `m` sorted ascending ints. Line 3: `n` sorted ascending ints. Print the merged sorted array on one line, space-separated.',
            'samples', jsonb_build_array(jsonb_build_object('input',E'3 3\n1 3 5\n2 4 6','output','1 2 3 4 5 6')),
            'tests', jsonb_build_array(
                jsonb_build_object('name','sample',  'sample',true,  'stdin',E'3 3\n1 3 5\n2 4 6','expected','1 2 3 4 5 6'),
                jsonb_build_object('name','one-empty','sample',false,'stdin',E'0 3\n\n2 4 6',     'expected','2 4 6'),
                jsonb_build_object('name','dupes',   'sample',false, 'stdin',E'3 2\n1 2 2\n2 3',  'expected','1 2 2 2 3')
            )),
        jsonb_build_object(
            'qid','11111111-0000-0000-0000-000000000009','vid','22222222-0000-0000-0000-000000000009','eqid','33333333-0000-0000-0000-000000000009',
            'title','Longest Substring Without Repeating Chars','difficulty',4,'score',25,
            'langs', jsonb_build_array('language.python','language.java','language.javascript'),
            'section','Sliding Window',
            'prompt','## Longest Substring Without Repeating Characters'||E'\n\n'||'Read a string. Print the length of the longest substring with all distinct characters.',
            'samples', jsonb_build_array(jsonb_build_object('input','abcabcbb','output','3')),
            'tests', jsonb_build_array(
                jsonb_build_object('name','sample',  'sample',true,  'stdin','abcabcbb','expected','3'),
                jsonb_build_object('name','all-same','sample',false, 'stdin','bbbbb',   'expected','1'),
                jsonb_build_object('name','mixed',   'sample',false, 'stdin','pwwkew',  'expected','3')
            )),
        jsonb_build_object(
            'qid','11111111-0000-0000-0000-000000000010','vid','22222222-0000-0000-0000-000000000010','eqid','33333333-0000-0000-0000-000000000010',
            'title','LRU Cache Simulation','difficulty',4,'score',30,
            'langs', jsonb_build_array('language.python','language.java','language.cpp'),
            'section','Design',
            'prompt','## LRU Cache'||E'\n\n'||'Line 1: capacity `c` and number of ops `q`. Next `q` lines: `PUT k v` or `GET k`. For each `GET`, print the value or `-1` if missing.',
            'samples', jsonb_build_array(jsonb_build_object('input',E'2 4\nPUT 1 10\nPUT 2 20\nGET 1\nGET 3','output',E'10\n-1')),
            'tests', jsonb_build_array(
                jsonb_build_object('name','sample','sample',true,  'stdin',E'2 4\nPUT 1 10\nPUT 2 20\nGET 1\nGET 3','expected',E'10\n-1'),
                jsonb_build_object('name','evict', 'sample',false, 'stdin',E'2 5\nPUT 1 1\nPUT 2 2\nPUT 3 3\nGET 1\nGET 3','expected',E'-1\n3')
            ))
    );
    item jsonb;
    ord int := 1;
    tord int;
    tc jsonb;
BEGIN
    FOR item IN SELECT * FROM jsonb_array_elements(seed) LOOP
        INSERT INTO questions (id, org_id, plugin_id, title, created_by)
        VALUES ((item->>'qid')::uuid, org, pid, item->>'title', NULL);

        INSERT INTO question_versions (id, question_id, version_number, difficulty, body, max_score, estimated_time_seconds, created_at)
        VALUES (
            (item->>'vid')::uuid,
            (item->>'qid')::uuid,
            1,
            (item->>'difficulty')::int,
            jsonb_build_object(
                'type','coding','responseType','code','promptFormat','markdown',
                'title', item->>'title',
                'section', item->>'section',
                'category', item->>'section',
                'mode','main',
                'prompt', item->>'prompt',
                'allowedLanguages', item->'langs',
                'samples', item->'samples'
            ),
            (item->>'score')::numeric,
            300,
            now()
        );

        UPDATE questions SET current_version_id = (item->>'vid')::uuid WHERE id = (item->>'qid')::uuid;

        tord := 1;
        FOR tc IN SELECT * FROM jsonb_array_elements(item->'tests') LOOP
            INSERT INTO question_test_cases (id, question_version_id, ordinal, name, is_sample, is_hidden, weight, stdin, expected_stdout, comparator)
            VALUES (
                uuid_generate_v4(),
                (item->>'vid')::uuid,
                tord,
                tc->>'name',
                (tc->>'sample')::boolean,
                NOT (tc->>'sample')::boolean,
                1,
                tc->>'stdin',
                tc->>'expected',
                'trim_equal'
            );
            tord := tord + 1;
        END LOOP;

        INSERT INTO exam_questions (id, exam_version_id, section_id, question_version_id, ordinal, score_override, is_mandatory)
        VALUES (
            (item->>'eqid')::uuid,
            exam_ver,
            section,
            (item->>'vid')::uuid,
            ord,
            (item->>'score')::numeric,
            true
        );

        ord := ord + 1;
    END LOOP;
END $body$;
-- +goose StatementEnd
