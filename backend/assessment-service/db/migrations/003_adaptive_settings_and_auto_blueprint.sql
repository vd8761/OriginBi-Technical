-- ============================================================================
-- Migration 003: Adaptive Settings on Assessment + Auto-Blueprint Tables
-- ============================================================================
-- Adds adaptive configuration columns directly to tech_assessments so the
-- blueprint is computed automatically from the question bank — no manual
-- blueprint setup step required.
--
-- New columns on tech_assessments:
--   adaptive_total_marks       INT     — total marks for the adaptive session
--   adaptive_total_blocks      INT     — number of blocks (default 4)
--   adaptive_seconds_per_mark  INT     — seconds per mark for time limits (default 45)
--
-- Creates adaptive engine tables if they don't already exist:
--   adaptive_blueprint
--   adaptive_blocks
--   block_attempts
--   block_snapshots
--   adaptive_paths
--   adaptive_subcategory_coverage
--   adaptive_performance_analytics
-- ============================================================================

-- ── 1. Add adaptive config columns to tech_assessments ──────────────────────

ALTER TABLE tech_assessments
  ADD COLUMN IF NOT EXISTS adaptive_total_marks      INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS adaptive_total_blocks     INTEGER NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS adaptive_seconds_per_mark INTEGER NOT NULL DEFAULT 45;

COMMENT ON COLUMN tech_assessments.adaptive_total_marks IS
  'Total marks for the adaptive assessment session. Auto-blueprint uses this to distribute marks across categories.';
COMMENT ON COLUMN tech_assessments.adaptive_total_blocks IS
  'Number of adaptive blocks (rounds). Each block adapts difficulty based on previous block performance.';
COMMENT ON COLUMN tech_assessments.adaptive_seconds_per_mark IS
  'Expected seconds per mark for time-limit calculation per question.';

-- ── 2. adaptive_blueprint ────────────────────────────────────────────────────

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

CREATE INDEX IF NOT EXISTS idx_adaptive_blueprint_assessment
  ON adaptive_blueprint (assessment_id);

-- ── 3. adaptive_blocks ───────────────────────────────────────────────────────

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

CREATE INDEX IF NOT EXISTS idx_adaptive_blocks_assessment
  ON adaptive_blocks (assessment_id);

-- ── 4. block_attempts ────────────────────────────────────────────────────────

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

CREATE INDEX IF NOT EXISTS idx_block_attempts_token
  ON block_attempts (attempt_token);
CREATE INDEX IF NOT EXISTS idx_block_attempts_user
  ON block_attempts (user_id);

-- ── 5. block_snapshots ───────────────────────────────────────────────────────

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

CREATE INDEX IF NOT EXISTS idx_block_snapshots_token
  ON block_snapshots (attempt_token);

-- ── 6. adaptive_paths ────────────────────────────────────────────────────────

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

CREATE INDEX IF NOT EXISTS idx_adaptive_paths_token
  ON adaptive_paths (attempt_token);

-- ── 7. adaptive_subcategory_coverage ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS adaptive_subcategory_coverage (
  coverage_id   BIGSERIAL PRIMARY KEY,
  attempt_token VARCHAR(200) NOT NULL UNIQUE,
  assessment_id BIGINT NOT NULL,
  coverage      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_adaptive_coverage_token
  ON adaptive_subcategory_coverage (attempt_token);

-- ── 8. adaptive_performance_analytics ────────────────────────────────────────

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

CREATE INDEX IF NOT EXISTS idx_adaptive_analytics_token
  ON adaptive_performance_analytics (attempt_token);
CREATE INDEX IF NOT EXISTS idx_adaptive_analytics_assessment
  ON adaptive_performance_analytics (assessment_id);
CREATE INDEX IF NOT EXISTS idx_adaptive_analytics_user
  ON adaptive_performance_analytics (user_id);

-- ── 9. Add block_config and mode columns where missing ───────────────────────

ALTER TABLE tech_assessments
  ADD COLUMN IF NOT EXISTS block_config JSONB;

-- Add mode column to question tables if missing (needed for trial/main filtering)
ALTER TABLE tech_aptitude_questions
  ADD COLUMN IF NOT EXISTS mode VARCHAR(10) NOT NULL DEFAULT 'main';
ALTER TABLE tech_grammar_questions
  ADD COLUMN IF NOT EXISTS mode VARCHAR(10) NOT NULL DEFAULT 'main';
ALTER TABLE tech_mnc_questions
  ADD COLUMN IF NOT EXISTS mode VARCHAR(10) NOT NULL DEFAULT 'main';

-- Add block tracking columns to attempt junction tables
ALTER TABLE tech_aptitude_attempt_questions
  ADD COLUMN IF NOT EXISTS block_number          INTEGER,
  ADD COLUMN IF NOT EXISTS block_sequence_order  INTEGER,
  ADD COLUMN IF NOT EXISTS is_locked             BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS expected_time_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS time_taken_seconds    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expected_time_seconds_col INTEGER,
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
