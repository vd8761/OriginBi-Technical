-- Migration 002: Add adaptive_enabled boolean flag to tech_assessments
-- This is a simple, dedicated column for the Adaptive Questions plugin toggle.
-- It controls whether block-based adaptive question delivery is active for an assessment.
-- Only meaningful for: aptitude, grammar (communication), mnc, role.
-- Coding assessments ignore this flag.

ALTER TABLE tech_assessments
  ADD COLUMN IF NOT EXISTS adaptive_enabled BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN tech_assessments.adaptive_enabled IS
  'When true, the assessment uses block-based adaptive question delivery. '
  'Applicable to aptitude, grammar, mnc, and role module types only.';
