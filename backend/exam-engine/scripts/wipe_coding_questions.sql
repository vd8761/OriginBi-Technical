-- Wipe every coding question (plugin_slug='assessment.coding') and the
-- attempt/answer/code-run trail that references them.
--
-- The question_versions / question_test_cases / question_tags / question_media
-- tables all CASCADE from questions(id), so the last DELETE below handles them
-- automatically. But exam_questions and answers use ON DELETE RESTRICT /
-- NO ACTION respectively — those need to go first or the cascade aborts.
--
-- Run: psql "$DATABASE_URL" -f wipe_coding_questions.sql

BEGIN;

-- 1. code_runs hang off answers; clear them first.
DELETE FROM code_runs
WHERE answer_id IN (
    SELECT a.id
    FROM answers a
    JOIN question_versions qv ON qv.id = a.question_version_id
    JOIN questions q          ON q.id  = qv.question_id
    JOIN plugins p            ON p.id  = q.plugin_id
    WHERE p.slug = 'assessment.coding'
);

-- 2. candidate answers (ON DELETE NO ACTION on question_version_id).
DELETE FROM answers
WHERE question_version_id IN (
    SELECT qv.id
    FROM question_versions qv
    JOIN questions q ON q.id = qv.question_id
    JOIN plugins p   ON p.id = q.plugin_id
    WHERE p.slug = 'assessment.coding'
);

-- 3. exam_questions (ON DELETE RESTRICT on question_version_id).
DELETE FROM exam_questions
WHERE question_version_id IN (
    SELECT qv.id
    FROM question_versions qv
    JOIN questions q ON q.id = qv.question_id
    JOIN plugins p   ON p.id = q.plugin_id
    WHERE p.slug = 'assessment.coding'
);

-- 4. the questions themselves. Cascades to question_versions,
--    question_test_cases, question_tags, question_media.
DELETE FROM questions
WHERE plugin_id IN (SELECT id FROM plugins WHERE slug = 'assessment.coding');

COMMIT;
