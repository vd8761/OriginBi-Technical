-- +goose Up
-- Per-language coding-exam builder config. One row per language plugin slug
-- (e.g. 'language.python'). When a candidate starts a coding attempt with
-- assignment_ref = 'coding:python', the builder reads this row and assembles
-- a fresh question set from the bank.
--
-- Absence of a row = "default-all policy": serve every active matching
-- question, no filter beyond language + plugin_slug = 'assessment.coding'.

-- language_slug is intentionally NOT a FK: plugins is keyed on (slug, version)
-- and versioning the config alongside language versions would force a config
-- migration every time a language plugin bumps. The slug values are stable
-- ('language.python' etc.); existence is validated at the API layer.
CREATE TABLE coding_language_configs (
    language_slug          TEXT PRIMARY KEY,
    total_questions        INT  NOT NULL CHECK (total_questions >= 1),
    easy_count             INT  NOT NULL DEFAULT 0 CHECK (easy_count   >= 0),
    medium_count           INT  NOT NULL DEFAULT 0 CHECK (medium_count >= 0),
    hard_count             INT  NOT NULL DEFAULT 0 CHECK (hard_count   >= 0),
    -- UI-only hint: backend always operates on the resolved counts above.
    -- 'percent' mode means the UI displayed inputs as % of total when last
    -- saved; on edit, the UI recomputes count/total*100 to show the same shape.
    input_mode             TEXT NOT NULL DEFAULT 'count' CHECK (input_mode IN ('count','percent')),
    -- Best-effort spillover: when a difficulty bucket is short, pull from an
    -- adjacent bucket instead of failing the attempt.
    allow_spillover        BOOLEAN NOT NULL DEFAULT TRUE,
    -- Optional topic filter. JSON array of tag strings; questions whose
    -- body->'tags' intersects this list are eligible. NULL or '[]' = no filter.
    include_tags           JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Optional per-language time override (seconds). NULL falls back to
    -- exam_versions.total_time_seconds. Different languages have different
    -- verbosity (Java vs Python), so admins often want differentiated timers.
    time_seconds_override  INT,
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by             BIGINT,
    CONSTRAINT counts_sum_to_total CHECK (easy_count + medium_count + hard_count = total_questions),
    CONSTRAINT include_tags_is_array CHECK (jsonb_typeof(include_tags) = 'array'),
    CONSTRAINT time_override_positive CHECK (time_seconds_override IS NULL OR time_seconds_override > 0)
);

CREATE INDEX coding_language_configs_updated_idx ON coding_language_configs(updated_at DESC);

-- ─── Per-attempt exam_questions rows ────────────────────────────────────────
-- The builder needs to write real exam_questions rows per attempt so that
-- answers.exam_question_id and code_runs.exam_question_id (both FK to
-- exam_questions(id)) stay valid. These rows hang off the attempt and cascade
-- away on attempt deletion.
ALTER TABLE exam_questions
    ADD COLUMN attempt_built_for UUID REFERENCES attempts(id) ON DELETE CASCADE;

CREATE INDEX eq_attempt_built_idx
    ON exam_questions(attempt_built_for)
    WHERE attempt_built_for IS NOT NULL;

-- The legacy unique (exam_version_id, ordinal) constraint can't coexist with
-- per-attempt rows that share an exam_version_id and reuse ordinals 1..N.
-- Replace it with a partial unique that only applies to admin-wired rows
-- (those with NULL attempt_built_for). Per-attempt rows skip the constraint;
-- their uniqueness is enforced by (attempt_built_for, ordinal) below.
ALTER TABLE exam_questions
    DROP CONSTRAINT exam_questions_exam_version_id_ordinal_key;

CREATE UNIQUE INDEX exam_questions_admin_ordinal_uq
    ON exam_questions(exam_version_id, ordinal)
    WHERE attempt_built_for IS NULL;

CREATE UNIQUE INDEX exam_questions_attempt_ordinal_uq
    ON exam_questions(attempt_built_for, ordinal)
    WHERE attempt_built_for IS NOT NULL;


-- +goose Down
DROP INDEX IF EXISTS exam_questions_attempt_ordinal_uq;
DROP INDEX IF EXISTS exam_questions_admin_ordinal_uq;
ALTER TABLE exam_questions
    ADD CONSTRAINT exam_questions_exam_version_id_ordinal_key UNIQUE (exam_version_id, ordinal);
DROP INDEX IF EXISTS eq_attempt_built_idx;
ALTER TABLE exam_questions
    DROP COLUMN IF EXISTS attempt_built_for;
DROP INDEX IF EXISTS coding_language_configs_updated_idx;
DROP TABLE IF EXISTS coding_language_configs;
