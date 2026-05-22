-- ============================================================================
-- Migration 008: Adaptive block columns on ALL module junction tables
-- ============================================================================
-- The adaptive block generator / snapshot / analytics services INSERT and
-- SELECT block-tracking columns on every module's attempt-question junction
-- table. Earlier migrations only added these to the aptitude (and partially
-- mnc/role) junctions, so adaptive block/generate crashes for communication
-- (grammar) and any other module whose junction is missing the columns.
--
-- This migration is the schema-only subset of 007 — it does NOT force-enable
-- adaptive mode on existing assessments. All statements use IF NOT EXISTS and
-- are safe to run multiple times.
-- ============================================================================

-- ── Block-tracking columns on every junction table ───────────────────────────

ALTER TABLE tech_aptitude_attempt_questions
  ADD COLUMN IF NOT EXISTS block_number          INTEGER,
  ADD COLUMN IF NOT EXISTS block_sequence_order  INTEGER,
  ADD COLUMN IF NOT EXISTS is_locked             BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS expected_time_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS time_taken_seconds    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metadata              JSONB,
  ADD COLUMN IF NOT EXISTS answered_at           TIMESTAMP;

ALTER TABLE tech_grammar_attempt_questions
  ADD COLUMN IF NOT EXISTS block_number          INTEGER,
  ADD COLUMN IF NOT EXISTS block_sequence_order  INTEGER,
  ADD COLUMN IF NOT EXISTS is_locked             BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS expected_time_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS time_taken_seconds    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metadata              JSONB,
  ADD COLUMN IF NOT EXISTS answered_at           TIMESTAMP;

ALTER TABLE tech_mnc_attempt_questions
  ADD COLUMN IF NOT EXISTS block_number          INTEGER,
  ADD COLUMN IF NOT EXISTS block_sequence_order  INTEGER,
  ADD COLUMN IF NOT EXISTS is_locked             BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS expected_time_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS time_taken_seconds    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metadata              JSONB,
  ADD COLUMN IF NOT EXISTS answered_at           TIMESTAMP;

ALTER TABLE tech_role_attempt_questions
  ADD COLUMN IF NOT EXISTS block_number          INTEGER,
  ADD COLUMN IF NOT EXISTS block_sequence_order  INTEGER,
  ADD COLUMN IF NOT EXISTS is_locked             BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS expected_time_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS time_taken_seconds    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metadata              JSONB,
  ADD COLUMN IF NOT EXISTS answered_at           TIMESTAMP;

-- ── Question-table columns used by the blueprint / generator ─────────────────

ALTER TABLE tech_mnc_questions
  ADD COLUMN IF NOT EXISTS category    VARCHAR(100),
  ADD COLUMN IF NOT EXISTS subcategory VARCHAR(100),
  ADD COLUMN IF NOT EXISTS mode        VARCHAR(10) NOT NULL DEFAULT 'main';

ALTER TABLE tech_role_questions
  ADD COLUMN IF NOT EXISTS difficulty  VARCHAR(10) NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS category    VARCHAR(100),
  ADD COLUMN IF NOT EXISTS subcategory VARCHAR(100),
  ADD COLUMN IF NOT EXISTS metadata    JSONB,
  ADD COLUMN IF NOT EXISTS image_url   TEXT;

ALTER TABLE tech_grammar_questions
  ADD COLUMN IF NOT EXISTS mode        VARCHAR(10) NOT NULL DEFAULT 'main';

-- ── Indexes for block-level queries ──────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_apt_attempt_questions_block
  ON tech_aptitude_attempt_questions(aptitude_attempt_id, block_number);
CREATE INDEX IF NOT EXISTS idx_grammar_attempt_questions_block
  ON tech_grammar_attempt_questions(grammar_attempt_id, block_number);
CREATE INDEX IF NOT EXISTS idx_mnc_attempt_questions_block
  ON tech_mnc_attempt_questions(mnc_attempt_id, block_number);
CREATE INDEX IF NOT EXISTS idx_role_attempt_questions_block
  ON tech_role_attempt_questions(role_attempt_id, block_number);

-- NOTE: A unique constraint on (attempt_id, block_number, block_sequence_order)
-- is intentionally NOT added. Every junction table already has a
-- UNIQUE (attempt_id, question_id) constraint, which is what the generator's
-- `INSERT ... ON CONFLICT DO NOTHING` relies on. Adding the block-sequence
-- unique can fail on databases that already contain duplicate rows from
-- earlier broken adaptive runs, and it is not required for correctness.
