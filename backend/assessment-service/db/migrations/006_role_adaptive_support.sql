-- ============================================================================
-- Migration 006: Role-Based Assessment Adaptive Support
-- ============================================================================
-- Adds the columns required for role-based assessments to participate in the
-- adaptive engine (blueprint auto-generation + block generation).
--
-- Changes:
--   tech_role_questions
--     + difficulty   VARCHAR(10) DEFAULT 'medium'  — used by block generator
--     + category     VARCHAR(100) NULL              — optional finer grouping
--     + subcategory  VARCHAR(100) NULL              — optional finer grouping
--     + metadata     JSONB NULL                     — kind/image metadata
--     + image_url    TEXT NULL                      — question image
--
--   tech_role_attempt_questions
--     + block_number          INTEGER NULL           — which adaptive block
--     + block_sequence_order  INTEGER NULL           — position within block
--     + expected_time_seconds INTEGER NULL           — per-question time budget
--     + time_taken_seconds    INTEGER DEFAULT 0      — actual time taken
--     + metadata              JSONB NULL             — extra metadata
-- ============================================================================

-- ── 1. Add difficulty + category/subcategory + metadata to role questions ────

ALTER TABLE tech_role_questions
  ADD COLUMN IF NOT EXISTS difficulty  VARCHAR(10)  NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS category    VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS subcategory VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS metadata    JSONB        NULL,
  ADD COLUMN IF NOT EXISTS image_url   TEXT         NULL;

COMMENT ON COLUMN tech_role_questions.difficulty IS
  'Difficulty level for adaptive engine: easy | medium | hard. Defaults to medium.';
COMMENT ON COLUMN tech_role_questions.category IS
  'Optional category for finer blueprint grouping. Falls back to domain when NULL.';
COMMENT ON COLUMN tech_role_questions.subcategory IS
  'Optional subcategory for finer blueprint grouping. Falls back to domain when NULL.';

-- ── 2. Add block tracking columns to role attempt junction table ─────────────

ALTER TABLE tech_role_attempt_questions
  ADD COLUMN IF NOT EXISTS block_number          INTEGER NULL,
  ADD COLUMN IF NOT EXISTS block_sequence_order  INTEGER NULL,
  ADD COLUMN IF NOT EXISTS expected_time_seconds INTEGER NULL,
  ADD COLUMN IF NOT EXISTS time_taken_seconds    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metadata              JSONB   NULL;

COMMENT ON COLUMN tech_role_attempt_questions.block_number IS
  'Adaptive block number this question belongs to (NULL for non-adaptive attempts).';
COMMENT ON COLUMN tech_role_attempt_questions.block_sequence_order IS
  'Position of this question within its adaptive block.';
COMMENT ON COLUMN tech_role_attempt_questions.expected_time_seconds IS
  'Expected time budget for this question based on marks × seconds_per_mark.';

-- ── 3. Index for block-level queries ─────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_role_attempt_questions_block
  ON tech_role_attempt_questions(role_attempt_id, block_number);
