-- ============================================================================
-- Migration 004: Add category and subcategory to tech_mnc_questions
-- ============================================================================

ALTER TABLE tech_mnc_questions
  ADD COLUMN IF NOT EXISTS category VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS subcategory VARCHAR(100) NULL;

-- Backfill legacy records using topic_group
UPDATE tech_mnc_questions
SET category = COALESCE(category, topic_group),
    subcategory = COALESCE(subcategory, topic_group);
