-- ============================================================================
-- COMPREHENSIVE ADAPTIVE FIX: Ensure all required columns/tables exist
-- ============================================================================
-- Run this against the database to ensure all modules can use adaptive blocks.
-- All statements use IF NOT EXISTS, so this is safe to run multiple times.
-- ============================================================================

-- ── 1. Ensure tech_assessments has adaptive columns ──────────────────────────

ALTER TABLE tech_assessments
  ADD COLUMN IF NOT EXISTS adaptive_enabled       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS adaptive_total_marks    INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS adaptive_total_blocks   INTEGER NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS adaptive_seconds_per_mark INTEGER NOT NULL DEFAULT 45,
  ADD COLUMN IF NOT EXISTS block_config            JSONB;

-- ── 2. Ensure ALL junction tables have block tracking columns ────────────────

-- Aptitude
ALTER TABLE tech_aptitude_attempt_questions
  ADD COLUMN IF NOT EXISTS block_number          INTEGER,
  ADD COLUMN IF NOT EXISTS block_sequence_order  INTEGER,
  ADD COLUMN IF NOT EXISTS is_locked             BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS expected_time_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS time_taken_seconds    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metadata              JSONB,
  ADD COLUMN IF NOT EXISTS answered_at           TIMESTAMP;

-- Grammar (Communication)
ALTER TABLE tech_grammar_attempt_questions
  ADD COLUMN IF NOT EXISTS block_number          INTEGER,
  ADD COLUMN IF NOT EXISTS block_sequence_order  INTEGER,
  ADD COLUMN IF NOT EXISTS is_locked             BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS expected_time_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS time_taken_seconds    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metadata              JSONB,
  ADD COLUMN IF NOT EXISTS answered_at           TIMESTAMP;

-- MNC
ALTER TABLE tech_mnc_attempt_questions
  ADD COLUMN IF NOT EXISTS block_number          INTEGER,
  ADD COLUMN IF NOT EXISTS block_sequence_order  INTEGER,
  ADD COLUMN IF NOT EXISTS is_locked             BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS expected_time_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS time_taken_seconds    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metadata              JSONB,
  ADD COLUMN IF NOT EXISTS answered_at           TIMESTAMP;

-- Role
ALTER TABLE tech_role_attempt_questions
  ADD COLUMN IF NOT EXISTS block_number          INTEGER,
  ADD COLUMN IF NOT EXISTS block_sequence_order  INTEGER,
  ADD COLUMN IF NOT EXISTS is_locked             BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS expected_time_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS time_taken_seconds    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metadata              JSONB;

-- ── 3. Ensure question tables have required columns ──────────────────────────

-- MNC: category + subcategory
ALTER TABLE tech_mnc_questions
  ADD COLUMN IF NOT EXISTS category    VARCHAR(100),
  ADD COLUMN IF NOT EXISTS subcategory VARCHAR(100),
  ADD COLUMN IF NOT EXISTS mode        VARCHAR(10) NOT NULL DEFAULT 'main';

-- Role: difficulty + category + subcategory
ALTER TABLE tech_role_questions
  ADD COLUMN IF NOT EXISTS difficulty  VARCHAR(10) NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS category    VARCHAR(100),
  ADD COLUMN IF NOT EXISTS subcategory VARCHAR(100),
  ADD COLUMN IF NOT EXISTS metadata    JSONB,
  ADD COLUMN IF NOT EXISTS image_url   TEXT;

-- Grammar: mode
ALTER TABLE tech_grammar_questions
  ADD COLUMN IF NOT EXISTS mode        VARCHAR(10) NOT NULL DEFAULT 'main';

-- ── 4. Ensure adaptive engine tables exist ───────────────────────────────────

CREATE TABLE IF NOT EXISTS adaptive_blueprint (
  blueprint_id          BIGSERIAL PRIMARY KEY,
  assessment_id         BIGINT NOT NULL UNIQUE,
  total_marks           NUMERIC(10,2) NOT NULL DEFAULT 100,
  total_blocks          INTEGER NOT NULL DEFAULT 4,
  marks_per_block       NUMERIC(10,2) NOT NULL DEFAULT 25,
  seconds_per_mark      INTEGER NOT NULL DEFAULT 45,
  category_blueprint    JSONB NOT NULL DEFAULT '{}',
  subcategory_blueprint JSONB NOT NULL DEFAULT '{}',
  difficulty_profiles   JSONB NOT NULL DEFAULT '{}',
  question_stats        JSONB NOT NULL DEFAULT '{}',
  created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS adaptive_blocks (
  block_id                BIGSERIAL PRIMARY KEY,
  assessment_id           BIGINT NOT NULL,
  block_number            INTEGER NOT NULL,
  difficulty_distribution JSONB NOT NULL DEFAULT '{"easy":70,"medium":30,"hard":0}',
  is_adaptive             BOOLEAN NOT NULL DEFAULT TRUE,
  status                  VARCHAR(20) NOT NULL DEFAULT 'pending',
  generated_questions     JSONB,
  created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (assessment_id, block_number)
);

CREATE TABLE IF NOT EXISTS block_attempts (
  block_attempt_id      BIGSERIAL PRIMARY KEY,
  attempt_token         VARCHAR(200) NOT NULL,
  block_id              BIGINT,
  user_id               BIGINT NOT NULL,
  block_number          INTEGER NOT NULL,
  status                VARCHAR(20) NOT NULL DEFAULT 'in_progress',
  started_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at          TIMESTAMP,
  difficulty_achieved   VARCHAR(10) NOT NULL DEFAULT 'easy',
  total_count           INTEGER NOT NULL DEFAULT 0,
  total_block_marks     NUMERIC(10,2) NOT NULL DEFAULT 0,
  obtained_marks        NUMERIC(10,2) NOT NULL DEFAULT 0,
  skipped_marks         NUMERIC(10,2) NOT NULL DEFAULT 0,
  correct_count         INTEGER NOT NULL DEFAULT 0,
  wrong_count           INTEGER NOT NULL DEFAULT 0,
  skipped_count         INTEGER NOT NULL DEFAULT 0,
  attempted_count       INTEGER NOT NULL DEFAULT 0,
  marks_score           NUMERIC(6,2),
  adaptive_accuracy     NUMERIC(6,2),
  attempt_accuracy      NUMERIC(6,2),
  skip_count_rate       NUMERIC(6,2),
  skipped_marks_rate    NUMERIC(6,2),
  skip_impact           NUMERIC(6,2),
  skip_confidence       NUMERIC(6,2),
  difficulty_handling   NUMERIC(6,2),
  speed_efficiency      NUMERIC(6,2),
  block_readiness_score NUMERIC(6,2),
  next_block_difficulty VARCHAR(10),
  accuracy_score        NUMERIC(6,4),
  time_taken_seconds    INTEGER NOT NULL DEFAULT 0,
  snapshot_taken        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (attempt_token, block_number)
);

CREATE TABLE IF NOT EXISTS block_snapshots (
  snapshot_id           BIGSERIAL PRIMARY KEY,
  attempt_token         VARCHAR(200) NOT NULL,
  block_number          INTEGER NOT NULL,
  assessment_id         BIGINT NOT NULL,
  user_id               BIGINT NOT NULL,
  question_answers      JSONB NOT NULL DEFAULT '{}',
  total_questions       INTEGER NOT NULL DEFAULT 0,
  correct_count         INTEGER NOT NULL DEFAULT 0,
  wrong_count           INTEGER NOT NULL DEFAULT 0,
  skipped_count         INTEGER NOT NULL DEFAULT 0,
  attempted_count       INTEGER NOT NULL DEFAULT 0,
  total_block_marks     NUMERIC(10,2) NOT NULL DEFAULT 0,
  obtained_marks        NUMERIC(10,2) NOT NULL DEFAULT 0,
  skipped_marks         NUMERIC(10,2) NOT NULL DEFAULT 0,
  marks_score           NUMERIC(6,2) NOT NULL DEFAULT 0,
  adaptive_accuracy     NUMERIC(6,2) NOT NULL DEFAULT 0,
  attempt_accuracy      NUMERIC(6,2) NOT NULL DEFAULT 0,
  skip_count_rate       NUMERIC(6,2) NOT NULL DEFAULT 0,
  skipped_marks_rate    NUMERIC(6,2) NOT NULL DEFAULT 0,
  skip_impact           NUMERIC(6,2) NOT NULL DEFAULT 0,
  skip_confidence       NUMERIC(6,2) NOT NULL DEFAULT 0,
  difficulty_handling   NUMERIC(6,2) NOT NULL DEFAULT 0,
  speed_efficiency      NUMERIC(6,2) NOT NULL DEFAULT 0,
  block_readiness_score NUMERIC(6,2) NOT NULL DEFAULT 0,
  next_block_difficulty VARCHAR(10) NOT NULL DEFAULT 'easy',
  time_taken_seconds    INTEGER NOT NULL DEFAULT 0,
  coverage_map          JSONB NOT NULL DEFAULT '{}',
  created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (attempt_token, block_number)
);

CREATE TABLE IF NOT EXISTS adaptive_paths (
  path_id         BIGSERIAL PRIMARY KEY,
  attempt_token   VARCHAR(200) NOT NULL UNIQUE,
  assessment_id   BIGINT NOT NULL,
  user_id         BIGINT NOT NULL,
  difficulty_path JSONB NOT NULL DEFAULT '[]',
  accuracy_path   JSONB NOT NULL DEFAULT '[]',
  time_path       JSONB NOT NULL DEFAULT '[]',
  current_block   INTEGER NOT NULL DEFAULT 1,
  total_correct   INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS adaptive_subcategory_coverage (
  coverage_id   BIGSERIAL PRIMARY KEY,
  attempt_token VARCHAR(200) NOT NULL UNIQUE,
  assessment_id BIGINT NOT NULL,
  coverage      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS adaptive_performance_analytics (
  analytics_id          BIGSERIAL PRIMARY KEY,
  attempt_token         VARCHAR(200) NOT NULL UNIQUE,
  assessment_id         BIGINT NOT NULL,
  user_id               BIGINT NOT NULL,
  obtained_marks        NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_marks           NUMERIC(10,2) NOT NULL DEFAULT 0,
  marks_percentage      NUMERIC(6,2) NOT NULL DEFAULT 0,
  final_evaluation_score NUMERIC(6,2) NOT NULL DEFAULT 0,
  performance_level     VARCHAR(30) NOT NULL DEFAULT 'Needs Foundation',
  skipped_count         INTEGER NOT NULL DEFAULT 0,
  skipped_marks         NUMERIC(10,2) NOT NULL DEFAULT 0,
  wrong_count           INTEGER NOT NULL DEFAULT 0,
  skip_impact           NUMERIC(6,2) NOT NULL DEFAULT 0,
  skip_confidence       NUMERIC(6,2) NOT NULL DEFAULT 0,
  difficulty_handling   NUMERIC(6,2) NOT NULL DEFAULT 0,
  speed_efficiency      NUMERIC(6,2) NOT NULL DEFAULT 0,
  topic_mastery_score   NUMERIC(6,2) NOT NULL DEFAULT 0,
  reliability_score     NUMERIC(6,2) NOT NULL DEFAULT 0,
  reliability_level     VARCHAR(10) NOT NULL DEFAULT 'Low',
  topic_mastery         JSONB NOT NULL DEFAULT '[]',
  block_performance     JSONB NOT NULL DEFAULT '[]',
  category_performance  JSONB NOT NULL DEFAULT '{}',
  strong_topics         JSONB NOT NULL DEFAULT '[]',
  weak_topics           JSONB NOT NULL DEFAULT '[]',
  slow_topics           JSONB NOT NULL DEFAULT '[]',
  skipped_topics        JSONB NOT NULL DEFAULT '[]',
  recommended_topics    JSONB NOT NULL DEFAULT '[]',
  metadata              JSONB NOT NULL DEFAULT '{}',
  created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── 5. Enable adaptive for ALL assessment modules ────────────────────────────

UPDATE tech_assessments SET adaptive_enabled = TRUE WHERE module_type IN ('aptitude', 'grammar', 'mnc', 'role');

-- ── 6. Create indexes ────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_adaptive_blueprint_assessment ON adaptive_blueprint (assessment_id);
CREATE INDEX IF NOT EXISTS idx_adaptive_blocks_assessment ON adaptive_blocks (assessment_id);
CREATE INDEX IF NOT EXISTS idx_block_attempts_token ON block_attempts (attempt_token);
CREATE INDEX IF NOT EXISTS idx_block_attempts_user ON block_attempts (user_id);
CREATE INDEX IF NOT EXISTS idx_block_snapshots_token ON block_snapshots (attempt_token);
CREATE INDEX IF NOT EXISTS idx_adaptive_paths_token ON adaptive_paths (attempt_token);
CREATE INDEX IF NOT EXISTS idx_adaptive_coverage_token ON adaptive_subcategory_coverage (attempt_token);
CREATE INDEX IF NOT EXISTS idx_adaptive_analytics_token ON adaptive_performance_analytics (attempt_token);
CREATE INDEX IF NOT EXISTS idx_adaptive_analytics_assessment ON adaptive_performance_analytics (assessment_id);
CREATE INDEX IF NOT EXISTS idx_adaptive_analytics_user ON adaptive_performance_analytics (user_id);
CREATE INDEX IF NOT EXISTS idx_mnc_attempt_questions_block ON tech_mnc_attempt_questions(mnc_attempt_id, block_number);
CREATE INDEX IF NOT EXISTS idx_grammar_attempt_questions_block ON tech_grammar_attempt_questions(grammar_attempt_id, block_number);
CREATE INDEX IF NOT EXISTS idx_role_attempt_questions_block ON tech_role_attempt_questions(role_attempt_id, block_number);

-- ── 7. Add missing block UNIQUE constraints on junction tables ───────────────

-- Grammar: block_number + block_sequence_order uniqueness (matches aptitude pattern)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_grammar_attempt_block_seq'
  ) THEN
    ALTER TABLE tech_grammar_attempt_questions
      ADD CONSTRAINT uq_grammar_attempt_block_seq
      UNIQUE (grammar_attempt_id, block_number, block_sequence_order);
  END IF;
END $$;

-- MNC: same
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_mnc_attempt_block_seq'
  ) THEN
    ALTER TABLE tech_mnc_attempt_questions
      ADD CONSTRAINT uq_mnc_attempt_block_seq
      UNIQUE (mnc_attempt_id, block_number, block_sequence_order);
  END IF;
END $$;

-- Role: same
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_role_attempt_block_seq'
  ) THEN
    ALTER TABLE tech_role_attempt_questions
      ADD CONSTRAINT uq_role_attempt_block_seq
      UNIQUE (role_attempt_id, block_number, block_sequence_order);
  END IF;
END $$;
