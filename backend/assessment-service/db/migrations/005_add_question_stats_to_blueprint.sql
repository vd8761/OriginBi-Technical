-- ============================================================================
-- Migration 005: Add question_stats column to adaptive_blueprint
-- ============================================================================

ALTER TABLE adaptive_blueprint
  ADD COLUMN IF NOT EXISTS question_stats JSONB NOT NULL DEFAULT '{}';

COMMENT ON COLUMN adaptive_blueprint.question_stats IS
  'Caches generated/aggregated stats about questions in this assessment to build difficulty blueprints.';
