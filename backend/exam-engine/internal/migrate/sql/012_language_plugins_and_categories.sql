-- +goose NO TRANSACTION
-- +goose Up
-- =====================================================================
-- 012 - Plugin catalog enrichment + language plugins + pricing FK.
--
-- This migration turns the plugin catalog into the authoritative model for
-- coding-assessment capabilities (per docs/plugin-architecture/*). Three
-- structural shifts:
--
--   1) plugins gains plugin_type/category/requires/extends/provides columns
--      so manifests from docs/plugin-architecture/backend-contract.md can be
--      represented in-table.
--
--   2) Each programming language becomes its own addon plugin under
--      assessment.coding (language.python, language.java, ...). The Judge0
--      mapping + runtime limits live in plugins.schema instead of a hardcoded
--      Go map. Adding a language is now an admin INSERT, not a code change.
--
--   3) pricing_items.plugin_id ties the existing 'coding:python' paywall
--      directly to its language.python plugin row, so the user entitlement
--      resolver can resolve "what languages did this user pay for?" with a
--      single join.
--
-- This migration uses -- +goose NO TRANSACTION because ALTER TYPE ... ADD
-- VALUE cannot have its new value used in the same transaction in Postgres,
-- and we both add the 'language'/'runner' enum values AND insert plugin rows
-- using them. Every statement is idempotent (IF NOT EXISTS / ON CONFLICT /
-- conditional UPDATE) so partial reruns are safe.
-- =====================================================================

-- 1. plugin_kind enum: add language + runner categories.
ALTER TYPE plugin_kind ADD VALUE IF NOT EXISTS 'language';
ALTER TYPE plugin_kind ADD VALUE IF NOT EXISTS 'runner';

-- 2. plugins: manifest columns.
ALTER TABLE plugins
    ADD COLUMN IF NOT EXISTS plugin_type TEXT,
    ADD COLUMN IF NOT EXISTS category    TEXT,
    ADD COLUMN IF NOT EXISTS requires    JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS extends     JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS provides    JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS plugins_category_idx ON plugins(category) WHERE category IS NOT NULL;

-- 3. pricing_items: plugin FK + index.
ALTER TABLE pricing_items
    ADD COLUMN IF NOT EXISTS plugin_id UUID REFERENCES plugins(id);

CREATE INDEX IF NOT EXISTS pricing_items_plugin_idx
    ON pricing_items(plugin_id) WHERE plugin_id IS NOT NULL;

-- 4. Repurpose existing seeded rows so their identity matches the plugin
--    architecture. UUIDs are preserved so existing FKs from exam_sections,
--    questions, exam_question_plugin_entitlements, etc. keep working.

-- code.judge0 (id 0013) -> assessment.coding (base assessment plugin).
UPDATE plugins SET
    slug        = 'assessment.coding',
    name        = 'Coding Assessment',
    plugin_type = 'base',
    category    = 'assessment',
    requires    = '["runtime.exam-session"]'::jsonb,
    provides    = '["assessment.type.coding","question.type.code","runtime.action.coding.run-custom","runtime.action.coding.run-tests","runtime.action.coding.submit"]'::jsonb
WHERE id = '00000000-0000-0000-0000-000000000013';

-- auto.testcases (id 0020) -> evaluation.testcase (addon of assessment.coding).
UPDATE plugins SET
    slug        = 'evaluation.testcase',
    name        = 'Test Case Evaluator',
    plugin_type = 'addon',
    category    = 'evaluation',
    extends     = '["assessment.coding"]'::jsonb,
    requires    = '["assessment.coding","code.runner"]'::jsonb,
    provides    = '["evaluator.testcase"]'::jsonb
WHERE id = '00000000-0000-0000-0000-000000000020';

-- manual.review (id 0021) -> evaluation.manual-review.
UPDATE plugins SET
    slug        = 'evaluation.manual-review',
    name        = 'Manual Review',
    plugin_type = 'addon',
    category    = 'evaluation',
    extends     = '["assessment.coding"]'::jsonb,
    requires    = '["assessment.coding"]'::jsonb,
    provides    = '["evaluator.manual"]'::jsonb
WHERE id = '00000000-0000-0000-0000-000000000021';

-- llm.openai (id 0022) -> evaluator.openai (provider for evaluation.llm).
UPDATE plugins SET
    slug        = 'evaluator.openai',
    name        = 'OpenAI Evaluator',
    plugin_type = 'addon',
    category    = 'evaluation',
    extends     = '["evaluation.llm"]'::jsonb,
    requires    = '["evaluation.llm"]'::jsonb,
    provides    = '["llm.provider"]'::jsonb
WHERE id = '00000000-0000-0000-0000-000000000022';

-- llm.anthropic (id 0023) -> evaluator.anthropic.
UPDATE plugins SET
    slug        = 'evaluator.anthropic',
    name        = 'Anthropic Evaluator',
    plugin_type = 'addon',
    category    = 'evaluation',
    extends     = '["evaluation.llm"]'::jsonb,
    requires    = '["evaluation.llm"]'::jsonb,
    provides    = '["llm.provider"]'::jsonb
WHERE id = '00000000-0000-0000-0000-000000000023';

-- Stamp the rest of the existing rows so the catalog is consistent.
UPDATE plugins SET plugin_type = 'base',  category = 'assessment'
    WHERE id IN (
        '00000000-0000-0000-0000-000000000010',  -- mcq.aptitude
        '00000000-0000-0000-0000-000000000011',  -- mcq.verbal
        '00000000-0000-0000-0000-000000000012',  -- mcq.technical
        '00000000-0000-0000-0000-000000000014'   -- essay
    ) AND category IS NULL;

UPDATE plugins SET plugin_type = 'addon', category = 'proctoring'
    WHERE id BETWEEN '00000000-0000-0000-0000-000000000030'
                 AND '00000000-0000-0000-0000-000000000037'
      AND category IS NULL;

UPDATE plugins SET plugin_type = 'addon', category = 'feature'
    WHERE id BETWEEN '00000000-0000-0000-0000-000000000040'
                 AND '00000000-0000-0000-0000-000000000043'
      AND category IS NULL;

UPDATE plugins SET plugin_type = 'addon', category = 'media'
    WHERE id BETWEEN '00000000-0000-0000-0000-000000000050'
                 AND '00000000-0000-0000-0000-000000000052'
      AND category IS NULL;

-- 5. New plugin rows: runner.judge0 (code runner) + evaluation.llm (base for
--    LLM evaluators). evaluation.llm carries no schema today; evaluator.openai
--    and evaluator.anthropic above extend it.
INSERT INTO plugins (
    id, kind, slug, name, version, schema, requires_license, enabled_by_default,
    plugin_type, category, requires, extends, provides
) VALUES
(
    '00000000-0000-0000-0000-000000000080', 'runner', 'runner.judge0', 'Judge0 Runner', '1.0.0',
    '{"defaultBaseUrl":"http://localhost:2358","multiFileLanguageId":89,"defaults":{"timeLimitMs":3000,"memoryLimitKb":131072,"stackLimitKb":32768,"processesLimit":32,"outputLimitKb":16384}}'::jsonb,
    false, true,
    'addon', 'runner',
    '[]'::jsonb,
    '[]'::jsonb,
    '["code.runner"]'::jsonb
),
(
    '00000000-0000-0000-0000-000000000081', 'evaluator', 'evaluation.llm', 'LLM Evaluator', '1.0.0',
    '{}'::jsonb,
    true, false,
    'addon', 'evaluation',
    '["assessment.coding"]'::jsonb,
    '["assessment.coding"]'::jsonb,
    '["evaluator.llm-response"]'::jsonb
)
ON CONFLICT DO NOTHING;

-- 6. Language addon plugins. Each carries its Judge0 ID + per-language defaults
--    in `schema`. Values match today's hardcoded map in code_run_handlers.go.
--    language.go is included as the proof-of-concept "added without a code
--    change" entry; admins can update its judge0LanguageId once Judge0 lists Go.
INSERT INTO plugins (
    id, kind, slug, name, version, schema, requires_license, enabled_by_default,
    plugin_type, category, requires, extends, provides
) VALUES
(
    '00000000-0000-0000-0000-000000000090', 'language', 'language.python', 'Python 3.11', '1.0.0',
    '{"displayName":"Python 3.11","judge0LanguageId":71,"fileExtension":".py","defaultEntryFile":"solution.py","compileFlags":null,"timeLimitMs":3000,"memoryLimitKb":131072,"stackLimitKb":32768,"processesLimit":32,"outputLimitKb":16384,"supportsMultiFile":true,"monacoLanguageId":"python","icon":"python.webp","legacyItemRef":"coding:python"}'::jsonb,
    false, true,
    'addon', 'language',
    '["assessment.coding","code.runner"]'::jsonb,
    '["assessment.coding"]'::jsonb,
    '["language.runtime"]'::jsonb
),
(
    '00000000-0000-0000-0000-000000000091', 'language', 'language.java', 'Java 17', '1.0.0',
    '{"displayName":"Java 17","judge0LanguageId":62,"fileExtension":".java","defaultEntryFile":"Main.java","compileFlags":null,"timeLimitMs":5000,"memoryLimitKb":262144,"stackLimitKb":65536,"processesLimit":32,"outputLimitKb":16384,"supportsMultiFile":true,"monacoLanguageId":"java","icon":"java.webp","legacyItemRef":"coding:java"}'::jsonb,
    false, true,
    'addon', 'language',
    '["assessment.coding","code.runner"]'::jsonb,
    '["assessment.coding"]'::jsonb,
    '["language.runtime"]'::jsonb
),
(
    '00000000-0000-0000-0000-000000000092', 'language', 'language.cpp', 'C++ 20', '1.0.0',
    '{"displayName":"C++ 20","judge0LanguageId":54,"fileExtension":".cpp","defaultEntryFile":"main.cpp","compileFlags":"-O2 -std=c++20","timeLimitMs":3000,"memoryLimitKb":131072,"stackLimitKb":65536,"processesLimit":32,"outputLimitKb":16384,"supportsMultiFile":true,"monacoLanguageId":"cpp","icon":"cpp.webp","legacyItemRef":"coding:cpp"}'::jsonb,
    false, true,
    'addon', 'language',
    '["assessment.coding","code.runner"]'::jsonb,
    '["assessment.coding"]'::jsonb,
    '["language.runtime"]'::jsonb
),
(
    '00000000-0000-0000-0000-000000000093', 'language', 'language.c', 'C (GCC 11)', '1.0.0',
    '{"displayName":"C (GCC 11)","judge0LanguageId":50,"fileExtension":".c","defaultEntryFile":"main.c","compileFlags":"-O2 -std=c11","timeLimitMs":3000,"memoryLimitKb":131072,"stackLimitKb":65536,"processesLimit":32,"outputLimitKb":16384,"supportsMultiFile":false,"monacoLanguageId":"c","icon":"c.webp","legacyItemRef":"coding:c"}'::jsonb,
    false, true,
    'addon', 'language',
    '["assessment.coding","code.runner"]'::jsonb,
    '["assessment.coding"]'::jsonb,
    '["language.runtime"]'::jsonb
),
(
    '00000000-0000-0000-0000-000000000094', 'language', 'language.javascript', 'JavaScript (Node 20)', '1.0.0',
    '{"displayName":"JavaScript (Node 20)","judge0LanguageId":63,"fileExtension":".js","defaultEntryFile":"solution.js","compileFlags":null,"timeLimitMs":3000,"memoryLimitKb":131072,"stackLimitKb":32768,"processesLimit":32,"outputLimitKb":16384,"supportsMultiFile":true,"monacoLanguageId":"javascript","icon":"js.webp","legacyItemRef":"coding:javascript"}'::jsonb,
    false, true,
    'addon', 'language',
    '["assessment.coding","code.runner"]'::jsonb,
    '["assessment.coding"]'::jsonb,
    '["language.runtime"]'::jsonb
),
(
    '00000000-0000-0000-0000-000000000095', 'language', 'language.go', 'Go 1.22', '1.0.0',
    '{"displayName":"Go 1.22","judge0LanguageId":95,"fileExtension":".go","defaultEntryFile":"main.go","compileFlags":null,"timeLimitMs":3000,"memoryLimitKb":131072,"stackLimitKb":32768,"processesLimit":32,"outputLimitKb":16384,"supportsMultiFile":true,"monacoLanguageId":"go","icon":null,"legacyItemRef":null}'::jsonb,
    false, true,
    'addon', 'language',
    '["assessment.coding","code.runner"]'::jsonb,
    '["assessment.coding"]'::jsonb,
    '["language.runtime"]'::jsonb
)
ON CONFLICT DO NOTHING;

-- 7. Backfill pricing_items.plugin_id from existing 'coding:*' item_refs.
UPDATE pricing_items SET plugin_id = '00000000-0000-0000-0000-000000000090' WHERE item_ref = 'coding:python'     AND plugin_id IS NULL;
UPDATE pricing_items SET plugin_id = '00000000-0000-0000-0000-000000000091' WHERE item_ref = 'coding:java'       AND plugin_id IS NULL;
UPDATE pricing_items SET plugin_id = '00000000-0000-0000-0000-000000000092' WHERE item_ref = 'coding:cpp'        AND plugin_id IS NULL;
UPDATE pricing_items SET plugin_id = '00000000-0000-0000-0000-000000000093' WHERE item_ref = 'coding:c'          AND plugin_id IS NULL;
UPDATE pricing_items SET plugin_id = '00000000-0000-0000-0000-000000000094' WHERE item_ref = 'coding:javascript' AND plugin_id IS NULL;

-- +goose Down

-- Unlink pricing rows from language plugins first so the DELETEs below succeed.
UPDATE pricing_items SET plugin_id = NULL WHERE plugin_id IN (
    '00000000-0000-0000-0000-000000000090',
    '00000000-0000-0000-0000-000000000091',
    '00000000-0000-0000-0000-000000000092',
    '00000000-0000-0000-0000-000000000093',
    '00000000-0000-0000-0000-000000000094',
    '00000000-0000-0000-0000-000000000095'
);

DELETE FROM plugins WHERE id IN (
    '00000000-0000-0000-0000-000000000080',  -- runner.judge0
    '00000000-0000-0000-0000-000000000081',  -- evaluation.llm
    '00000000-0000-0000-0000-000000000090',
    '00000000-0000-0000-0000-000000000091',
    '00000000-0000-0000-0000-000000000092',
    '00000000-0000-0000-0000-000000000093',
    '00000000-0000-0000-0000-000000000094',
    '00000000-0000-0000-0000-000000000095'
);

-- Restore prior slug/name for repurposed rows.
UPDATE plugins SET slug = 'code.judge0',    name = 'Coding (Judge0)'           WHERE id = '00000000-0000-0000-0000-000000000013';
UPDATE plugins SET slug = 'auto.testcases', name = 'Auto — Test cases'         WHERE id = '00000000-0000-0000-0000-000000000020';
UPDATE plugins SET slug = 'manual.review',  name = 'Manual review'              WHERE id = '00000000-0000-0000-0000-000000000021';
UPDATE plugins SET slug = 'llm.openai',     name = 'LLM evaluator (OpenAI)'    WHERE id = '00000000-0000-0000-0000-000000000022';
UPDATE plugins SET slug = 'llm.anthropic',  name = 'LLM evaluator (Anthropic)' WHERE id = '00000000-0000-0000-0000-000000000023';

DROP INDEX IF EXISTS pricing_items_plugin_idx;
ALTER TABLE pricing_items DROP COLUMN IF EXISTS plugin_id;

DROP INDEX IF EXISTS plugins_category_idx;
ALTER TABLE plugins
    DROP COLUMN IF EXISTS provides,
    DROP COLUMN IF EXISTS extends,
    DROP COLUMN IF EXISTS requires,
    DROP COLUMN IF EXISTS category,
    DROP COLUMN IF EXISTS plugin_type;

-- Note: Postgres does not support removing enum values. The 'language' and
-- 'runner' values remain on plugin_kind; this is harmless and avoids a
-- destructive enum recreate.
