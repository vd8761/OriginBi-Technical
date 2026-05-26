-- Smoke test: insert a Python config + a few sample bank questions, then
-- exercise the same query the builder uses.

BEGIN;

-- 1. Configure Python: 10 questions, 4 easy / 4 medium / 2 hard.
INSERT INTO coding_language_configs (
    language_slug, total_questions, easy_count, medium_count, hard_count,
    input_mode, allow_spillover, include_tags
) VALUES (
    'language.python', 10, 4, 4, 2,
    'count', true, '["math","arrays"]'::jsonb
)
ON CONFLICT (language_slug) DO UPDATE
  SET total_questions = EXCLUDED.total_questions,
      easy_count      = EXCLUDED.easy_count,
      medium_count    = EXCLUDED.medium_count,
      hard_count      = EXCLUDED.hard_count,
      include_tags    = EXCLUDED.include_tags;

SELECT 'config inserted' AS step, * FROM coding_language_configs WHERE language_slug = 'language.python';

-- 2. The exact pool query the builder runs (no random/limit so we can count).
SELECT 'eligible questions' AS step, COUNT(*) AS n
FROM questions q
JOIN question_versions qv ON qv.id = q.current_version_id
JOIN plugins p ON p.id = q.plugin_id
WHERE p.slug = 'assessment.coding'
  AND q.is_archived = false
  AND COALESCE(qv.body->>'mode', 'main') = 'main'
  AND qv.body->'allowedLanguages' ? 'language.python';

ROLLBACK;
