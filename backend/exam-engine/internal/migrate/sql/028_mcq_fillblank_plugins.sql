-- +goose Up
-- =====================================================================
-- 028 — Register assessment.mcq + assessment.fillblank as base plugins,
-- and extend per-language config to carry a question_type discriminator
-- so each language can independently configure Coding, MCQ, and
-- Fill-in-the-Blank pools.
-- =====================================================================

-- 1. Plugin rows for the two new question-bank assessments. Manifest columns
--    (plugin_type/category/requires/provides) mirror the assessment.coding
--    row laid down in migration 012 so the pluginhost graph resolver treats
--    them as peer base plugins.
INSERT INTO plugins (
    id, kind, slug, name, version,
    plugin_type, category, requires, extends, provides,
    requires_license, enabled_by_default
) VALUES (
    '00000000-0000-0000-0000-000000000060', 'question_type',
    'assessment.mcq', 'Multiple Choice Questions', '1.0.0',
    'base', 'assessment',
    '["runtime.exam-session"]'::jsonb,
    '[]'::jsonb,
    '["assessment.type.mcq","question.type.mcq","runtime.action.mcq.submit"]'::jsonb,
    false, true
) ON CONFLICT (slug, version) DO NOTHING;

INSERT INTO plugins (
    id, kind, slug, name, version,
    plugin_type, category, requires, extends, provides,
    requires_license, enabled_by_default
) VALUES (
    '00000000-0000-0000-0000-000000000061', 'question_type',
    'assessment.fillblank', 'Fill in the Blanks', '1.0.0',
    'base', 'assessment',
    '["runtime.exam-session"]'::jsonb,
    '[]'::jsonb,
    '["assessment.type.fillblank","question.type.fillblank","runtime.action.fillblank.submit"]'::jsonb,
    false, true
) ON CONFLICT (slug, version) DO NOTHING;

-- 2. Per-language config now carries a question_type so a single language can
--    have independent settings per assessment type. Existing rows keyed by
--    language_slug alone get question_type='coding'.
ALTER TABLE coding_language_configs
    ADD COLUMN IF NOT EXISTS question_type TEXT NOT NULL DEFAULT 'coding'
    CHECK (question_type IN ('coding','mcq','fillblank'));

-- The legacy PK is on language_slug alone; widen it to (language_slug,
-- question_type). Default-backfilled rows are already 'coding'.
ALTER TABLE coding_language_configs
    DROP CONSTRAINT IF EXISTS coding_language_configs_pkey;

ALTER TABLE coding_language_configs
    ADD CONSTRAINT coding_language_configs_pkey
    PRIMARY KEY (language_slug, question_type);

-- An "enabled" flag lets admins toggle a category off without losing the
-- per-difficulty counts they entered. Default true so existing coding rows
-- keep behaving as today.
ALTER TABLE coding_language_configs
    ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT TRUE;


-- +goose Down
ALTER TABLE coding_language_configs
    DROP CONSTRAINT IF EXISTS coding_language_configs_pkey;

ALTER TABLE coding_language_configs
    ADD CONSTRAINT coding_language_configs_pkey PRIMARY KEY (language_slug);

ALTER TABLE coding_language_configs
    DROP COLUMN IF EXISTS enabled,
    DROP COLUMN IF EXISTS question_type;

DELETE FROM plugins WHERE slug IN ('assessment.mcq','assessment.fillblank');
