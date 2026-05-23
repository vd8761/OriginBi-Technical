-- Migration 010: Add missing columns to tech_assessments and question tables
-- This ensures that production databases (like Neon) have all the columns
-- that the backend entities and bulk import logic require.

-- 1. tech_assessments columns
ALTER TABLE tech_assessments
  ADD COLUMN IF NOT EXISTS categories JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS question_limit INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS difficulty_marks JSONB DEFAULT '{"easy": 1, "medium": 2, "hard": 5}'::jsonb,
  ADD COLUMN IF NOT EXISTS difficulty_negative_marks JSONB DEFAULT '{"easy": 0, "medium": 0.25, "hard": 0.25}'::jsonb,
  ADD COLUMN IF NOT EXISTS tab_switch_limit INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS anti_copy_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS enabled_question_types JSONB,
  ADD COLUMN IF NOT EXISTS metadata JSONB,
  ADD COLUMN IF NOT EXISTS adaptive_config JSONB DEFAULT '{"enabled": false, "adaptation_strategy": "performance_based", "difficulty_progression": "static"}'::jsonb;

-- 2. tech_aptitude_questions columns
ALTER TABLE tech_aptitude_questions
  ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS metadata JSONB,
  ADD COLUMN IF NOT EXISTS mode VARCHAR(20) DEFAULT 'trial';

-- 3. tech_grammar_questions columns
ALTER TABLE tech_grammar_questions
  ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS metadata JSONB,
  ADD COLUMN IF NOT EXISTS mode VARCHAR(20) DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS subcategory VARCHAR(100);

-- 4. tech_mnc_questions columns
ALTER TABLE tech_mnc_questions
  ADD COLUMN IF NOT EXISTS metadata JSONB,
  ADD COLUMN IF NOT EXISTS mode VARCHAR(20) DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 5. tech_role_questions columns
ALTER TABLE tech_role_questions
  ADD COLUMN IF NOT EXISTS metadata JSONB,
  ADD COLUMN IF NOT EXISTS mode VARCHAR(20) DEFAULT 'trial';

-- 6. tech_coding_questions columns
ALTER TABLE tech_coding_questions
  ADD COLUMN IF NOT EXISTS metadata JSONB,
  ADD COLUMN IF NOT EXISTS mode VARCHAR(20) DEFAULT 'trial';

-- 7. attempts tables (metadata and mode)
ALTER TABLE tech_aptitude_attempts
  ADD COLUMN IF NOT EXISTS metadata JSONB,
  ADD COLUMN IF NOT EXISTS mode VARCHAR(20) DEFAULT 'main';

ALTER TABLE tech_grammar_attempts
  ADD COLUMN IF NOT EXISTS metadata JSONB,
  ADD COLUMN IF NOT EXISTS mode VARCHAR(20) DEFAULT 'main';

ALTER TABLE tech_mnc_attempts
  ADD COLUMN IF NOT EXISTS metadata JSONB,
  ADD COLUMN IF NOT EXISTS mode VARCHAR(20) DEFAULT 'main';

ALTER TABLE tech_role_attempts
  ADD COLUMN IF NOT EXISTS metadata JSONB,
  ADD COLUMN IF NOT EXISTS mode VARCHAR(20) DEFAULT 'main';

ALTER TABLE tech_coding_attempts
  ADD COLUMN IF NOT EXISTS metadata JSONB,
  ADD COLUMN IF NOT EXISTS mode VARCHAR(20) DEFAULT 'main';

-- 8. attempt_questions and attempt_options metadata columns
ALTER TABLE tech_coding_attempt_questions
  ADD COLUMN IF NOT EXISTS metadata JSONB;

ALTER TABLE tech_aptitude_attempt_question_options
  ADD COLUMN IF NOT EXISTS metadata JSONB;

ALTER TABLE tech_grammar_attempt_question_options
  ADD COLUMN IF NOT EXISTS metadata JSONB;

ALTER TABLE tech_mnc_attempt_question_options
  ADD COLUMN IF NOT EXISTS metadata JSONB;

ALTER TABLE tech_role_attempt_question_options
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- 9. options tables metadata columns
ALTER TABLE tech_aptitude_options
  ADD COLUMN IF NOT EXISTS metadata JSONB;

ALTER TABLE tech_grammar_options
  ADD COLUMN IF NOT EXISTS metadata JSONB;

ALTER TABLE tech_mnc_options
  ADD COLUMN IF NOT EXISTS metadata JSONB;

ALTER TABLE tech_role_options
  ADD COLUMN IF NOT EXISTS metadata JSONB;
