-- +goose Up
-- =====================================================================
-- 009 - Identity, sessions, coding assignment refs, pricing, and seed exam.
-- =====================================================================

CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    email           TEXT NOT NULL UNIQUE,
    password        TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'active',
    is_admin        BOOLEAN NOT NULL DEFAULT FALSE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE TABLE registrations (
    user_id             BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    full_name           TEXT NOT NULL,
    gender              TEXT NOT NULL,
    country_code        TEXT NOT NULL DEFAULT '+91',
    phone               TEXT NOT NULL DEFAULT '',
    user_role           TEXT NOT NULL DEFAULT 'COLLEGE_STUDENT',
    date_of_birth       DATE,
    city                TEXT,
    state               TEXT,
    country             TEXT,
    education_level     TEXT,
    institution_name    TEXT,
    graduation_year     INT,
    work_status         TEXT,
    metadata            JSONB NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_sessions (
    id              UUID PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      TEXT NOT NULL UNIQUE,
    user_agent      TEXT,
    ip_address      TEXT,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at      TIMESTAMPTZ
);
CREATE INDEX user_sessions_user_idx ON user_sessions(user_id);
CREATE INDEX user_sessions_active_idx ON user_sessions(expires_at) WHERE revoked_at IS NULL;

ALTER TABLE exam_assignments
    ADD COLUMN IF NOT EXISTS assignment_ref TEXT,
    ADD COLUMN IF NOT EXISTS purchase_id UUID REFERENCES purchases(id);

ALTER TABLE exam_assignments
    DROP CONSTRAINT IF EXISTS exam_assignments_exam_version_id_candidate_user_id_assigned_org_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS assignments_candidate_ref_active_idx
    ON exam_assignments(candidate_user_id, assignment_ref)
    WHERE assignment_ref IS NOT NULL AND status <> 'revoked';

CREATE UNIQUE INDEX IF NOT EXISTS purchases_user_item_provider_ref_idx
    ON purchases(user_id, pricing_item_id, provider_ref);

-- Seed coding language pricing for the local demo payment flow.
INSERT INTO pricing_items (id, org_id, item_kind, item_ref, price_cents, currency) VALUES
    ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000001', 'coding_language', 'coding:python', 19900, 'INR'),
    ('00000000-0000-0000-0000-000000000502', '00000000-0000-0000-0000-000000000001', 'coding_language', 'coding:java', 19900, 'INR'),
    ('00000000-0000-0000-0000-000000000503', '00000000-0000-0000-0000-000000000001', 'coding_language', 'coding:cpp', 19900, 'INR'),
    ('00000000-0000-0000-0000-000000000504', '00000000-0000-0000-0000-000000000001', 'coding_language', 'coding:javascript', 19900, 'INR'),
    ('00000000-0000-0000-0000-000000000505', '00000000-0000-0000-0000-000000000001', 'coding_language', 'coding:c', 19900, 'INR')
ON CONFLICT DO NOTHING;

-- Seed the current student coding assessment as platform-owned content.
INSERT INTO exams (
    id, org_id, audience, title, slug, description, created_by
) VALUES (
    '00000000-0000-0000-0000-000000000600',
    '00000000-0000-0000-0000-000000000001',
    'individual',
    'Coding Assessment',
    'coding-assessment',
    'Validate programming fundamentals with number logic, strings, arrays, and simulation-driven exercises.',
    NULL
) ON CONFLICT DO NOTHING;

INSERT INTO exam_versions (
    id, exam_id, version_number, status, total_time_seconds, max_score,
    attempt_policy, settings, published_at
) VALUES (
    '00000000-0000-0000-0000-000000000601',
    '00000000-0000-0000-0000-000000000600',
    1,
    'published',
    5400,
    80,
    '{"max_attempts":1,"retakes_enabled":false}',
    '{"assignment_refs":["coding:python","coding:java","coding:cpp","coding:javascript","coding:c"],"result_release_mode":"manual"}',
    now()
) ON CONFLICT DO NOTHING;

UPDATE exams
SET current_version_id = '00000000-0000-0000-0000-000000000601'
WHERE id = '00000000-0000-0000-0000-000000000600' AND current_version_id IS NULL;

INSERT INTO exam_sections (
    id, exam_version_id, plugin_id, ordinal, name, description, time_limit_seconds, config
) VALUES (
    '00000000-0000-0000-0000-000000000602',
    '00000000-0000-0000-0000-000000000601',
    '00000000-0000-0000-0000-000000000013',
    1,
    'Coding',
    'Programming fundamentals and problem solving.',
    5400,
    '{"languages":["python","java","cpp","javascript","c"]}'
) ON CONFLICT DO NOTHING;

INSERT INTO questions (id, org_id, plugin_id, created_by, title) VALUES
    ('00000000-0000-0000-0000-000000000610', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000013', NULL, 'Two Sum'),
    ('00000000-0000-0000-0000-000000000611', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000013', NULL, 'Identify the Data Structure'),
    ('00000000-0000-0000-0000-000000000612', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000013', NULL, 'Implement the Algorithm'),
    ('00000000-0000-0000-0000-000000000613', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', NULL, 'Time Complexity'),
    ('00000000-0000-0000-0000-000000000614', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000013', NULL, 'Longest Common Subsequence')
ON CONFLICT DO NOTHING;

INSERT INTO question_versions (
    id, question_id, version_number, difficulty, estimated_time_seconds, body, max_score
) VALUES
    ('00000000-0000-0000-0000-000000000620', '00000000-0000-0000-0000-000000000610', 1, 1, 900,
     '{"type":"code-pretext","section":"Arrays & Hashing","prompt":"Given nums and target, return indices of two numbers that add to target."}', 10),
    ('00000000-0000-0000-0000-000000000621', '00000000-0000-0000-0000-000000000611', 1, 2, 900,
     '{"type":"image","section":"Data Structures","prompt":"Implement push, pop, and peek for a LIFO data structure."}', 20),
    ('00000000-0000-0000-0000-000000000622', '00000000-0000-0000-0000-000000000612', 1, 2, 900,
     '{"type":"media","section":"Algorithms","prompt":"Implement optimized Bubble Sort."}', 15),
    ('00000000-0000-0000-0000-000000000623', '00000000-0000-0000-0000-000000000613', 1, 1, 300,
     '{"type":"mcq","section":"Complexity Analysis","prompt":"What is the time complexity of the snippet?"}', 5),
    ('00000000-0000-0000-0000-000000000624', '00000000-0000-0000-0000-000000000614', 1, 3, 1200,
     '{"type":"code-pretext","section":"Dynamic Programming","prompt":"Print the length of the longest common subsequence."}', 30)
ON CONFLICT DO NOTHING;

UPDATE questions SET current_version_id = '00000000-0000-0000-0000-000000000620' WHERE id = '00000000-0000-0000-0000-000000000610' AND current_version_id IS NULL;
UPDATE questions SET current_version_id = '00000000-0000-0000-0000-000000000621' WHERE id = '00000000-0000-0000-0000-000000000611' AND current_version_id IS NULL;
UPDATE questions SET current_version_id = '00000000-0000-0000-0000-000000000622' WHERE id = '00000000-0000-0000-0000-000000000612' AND current_version_id IS NULL;
UPDATE questions SET current_version_id = '00000000-0000-0000-0000-000000000623' WHERE id = '00000000-0000-0000-0000-000000000613' AND current_version_id IS NULL;
UPDATE questions SET current_version_id = '00000000-0000-0000-0000-000000000624' WHERE id = '00000000-0000-0000-0000-000000000614' AND current_version_id IS NULL;

INSERT INTO exam_questions (
    id, exam_version_id, section_id, question_version_id, ordinal, score_override, is_mandatory
) VALUES
    ('00000000-0000-0000-0000-000000000630', '00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000602', '00000000-0000-0000-0000-000000000620', 1, 10, true),
    ('00000000-0000-0000-0000-000000000631', '00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000602', '00000000-0000-0000-0000-000000000621', 2, 20, true),
    ('00000000-0000-0000-0000-000000000632', '00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000602', '00000000-0000-0000-0000-000000000622', 3, 15, true),
    ('00000000-0000-0000-0000-000000000633', '00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000602', '00000000-0000-0000-0000-000000000623', 4, 5, true),
    ('00000000-0000-0000-0000-000000000634', '00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000602', '00000000-0000-0000-0000-000000000624', 5, 30, true)
ON CONFLICT DO NOTHING;

INSERT INTO question_options (id, question_version_id, ordinal, label, is_correct, explanation) VALUES
    ('00000000-0000-0000-0000-000000000640', '00000000-0000-0000-0000-000000000623', 1, 'O(n)', false, NULL),
    ('00000000-0000-0000-0000-000000000641', '00000000-0000-0000-0000-000000000623', 2, 'O(log n)', true, 'The loop doubles i each iteration.'),
    ('00000000-0000-0000-0000-000000000642', '00000000-0000-0000-0000-000000000623', 3, 'O(n log n)', false, NULL),
    ('00000000-0000-0000-0000-000000000643', '00000000-0000-0000-0000-000000000623', 4, 'O(n^2)', false, NULL)
ON CONFLICT DO NOTHING;

INSERT INTO question_test_cases (id, question_version_id, ordinal, name, is_sample, is_hidden, weight, stdin, expected_stdout) VALUES
    ('00000000-0000-0000-0000-000000000650', '00000000-0000-0000-0000-000000000620', 1, 'Two Sum sample 1', true, false, 1, '2 7 11 15
9', '[0, 1]'),
    ('00000000-0000-0000-0000-000000000651', '00000000-0000-0000-0000-000000000620', 2, 'Two Sum sample 2', true, false, 1, '3 2 4
6', '[1, 2]'),
    ('00000000-0000-0000-0000-000000000652', '00000000-0000-0000-0000-000000000620', 3, 'Two Sum sample 3', true, false, 1, '3 3
6', '[0, 1]'),
    ('00000000-0000-0000-0000-000000000653', '00000000-0000-0000-0000-000000000621', 1, 'Stack sample 1', true, false, 1, 'push 1
push 2
peek', '2'),
    ('00000000-0000-0000-0000-000000000654', '00000000-0000-0000-0000-000000000621', 2, 'Stack sample 2', true, false, 1, 'push 1
pop
push 5
peek', '5'),
    ('00000000-0000-0000-0000-000000000655', '00000000-0000-0000-0000-000000000621', 3, 'Stack sample 3', true, false, 1, 'push 7
push 8
pop
peek', '8
7'),
    ('00000000-0000-0000-0000-000000000656', '00000000-0000-0000-0000-000000000622', 1, 'Bubble sample 1', true, false, 1, '64 34 25 12 22 11 90', '11 12 22 25 34 64 90'),
    ('00000000-0000-0000-0000-000000000657', '00000000-0000-0000-0000-000000000622', 2, 'Bubble sample 2', true, false, 1, '5 1 4 2 8', '1 2 4 5 8'),
    ('00000000-0000-0000-0000-000000000658', '00000000-0000-0000-0000-000000000622', 3, 'Bubble sample 3', true, false, 1, '1 2 3', '1 2 3'),
    ('00000000-0000-0000-0000-000000000659', '00000000-0000-0000-0000-000000000624', 1, 'LCS sample 1', true, false, 1, 'abcde
ace', '3'),
    ('00000000-0000-0000-0000-000000000660', '00000000-0000-0000-0000-000000000624', 2, 'LCS sample 2', true, false, 1, 'abc
abc', '3'),
    ('00000000-0000-0000-0000-000000000661', '00000000-0000-0000-0000-000000000624', 3, 'LCS sample 3', true, false, 1, 'abc
def', '0')
ON CONFLICT DO NOTHING;

-- +goose Down
DELETE FROM question_test_cases WHERE id IN (
    '00000000-0000-0000-0000-000000000650',
    '00000000-0000-0000-0000-000000000651',
    '00000000-0000-0000-0000-000000000652',
    '00000000-0000-0000-0000-000000000653',
    '00000000-0000-0000-0000-000000000654',
    '00000000-0000-0000-0000-000000000655',
    '00000000-0000-0000-0000-000000000656',
    '00000000-0000-0000-0000-000000000657',
    '00000000-0000-0000-0000-000000000658',
    '00000000-0000-0000-0000-000000000659',
    '00000000-0000-0000-0000-000000000660',
    '00000000-0000-0000-0000-000000000661'
);
DELETE FROM question_options WHERE question_version_id = '00000000-0000-0000-0000-000000000623';
DELETE FROM exam_questions WHERE exam_version_id = '00000000-0000-0000-0000-000000000601';
UPDATE questions SET current_version_id = NULL WHERE id IN (
    '00000000-0000-0000-0000-000000000610',
    '00000000-0000-0000-0000-000000000611',
    '00000000-0000-0000-0000-000000000612',
    '00000000-0000-0000-0000-000000000613',
    '00000000-0000-0000-0000-000000000614'
);
DELETE FROM question_versions WHERE id IN (
    '00000000-0000-0000-0000-000000000620',
    '00000000-0000-0000-0000-000000000621',
    '00000000-0000-0000-0000-000000000622',
    '00000000-0000-0000-0000-000000000623',
    '00000000-0000-0000-0000-000000000624'
);
DELETE FROM questions WHERE id IN (
    '00000000-0000-0000-0000-000000000610',
    '00000000-0000-0000-0000-000000000611',
    '00000000-0000-0000-0000-000000000612',
    '00000000-0000-0000-0000-000000000613',
    '00000000-0000-0000-0000-000000000614'
);
DELETE FROM exam_sections WHERE id = '00000000-0000-0000-0000-000000000602';
UPDATE exams SET current_version_id = NULL WHERE id = '00000000-0000-0000-0000-000000000600';
DELETE FROM exam_versions WHERE id = '00000000-0000-0000-0000-000000000601';
DELETE FROM exams WHERE id = '00000000-0000-0000-0000-000000000600';
DELETE FROM pricing_items WHERE item_ref LIKE 'coding:%';
DROP INDEX IF EXISTS purchases_user_item_provider_ref_idx;
DROP INDEX IF EXISTS assignments_candidate_ref_active_idx;
ALTER TABLE exam_assignments DROP COLUMN IF EXISTS purchase_id;
ALTER TABLE exam_assignments DROP COLUMN IF EXISTS assignment_ref;
ALTER TABLE exam_assignments
    ADD CONSTRAINT exam_assignments_exam_version_id_candidate_user_id_assigned_org_id_key
    UNIQUE (exam_version_id, candidate_user_id, assigned_org_id);
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS registrations;
DROP TABLE IF EXISTS users;
