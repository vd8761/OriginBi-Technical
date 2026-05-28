-- Drop the tech_coding_* table family. Coding questions now live exclusively
-- in exam-engine (`questions` with plugin_slug = 'assessment.coding') and are
-- served from its admin + runtime APIs.
--
-- Order: drop the leaf tables (attempt_questions) before their parents
-- (attempts, questions) — though CASCADE makes the ordering safe either way.

BEGIN;

DROP TABLE IF EXISTS tech_coding_attempt_questions CASCADE;
DROP TABLE IF EXISTS tech_coding_attempts          CASCADE;
DROP TABLE IF EXISTS tech_coding_questions         CASCADE;

COMMIT;
