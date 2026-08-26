-- Coding exam shell — required on every database, including production.
--
-- exam-engine falls back to a fixed exam-version UUID when it cannot find a
-- coding exam dynamically (internal/server/coding_lifecycle.go:
-- codingExamVersionFallback). `exam_assignments.exam_version_id` is NOT NULL
-- and references `exam_versions`, so on a database without these rows the
-- first candidate to buy the coding module gets a foreign-key violation from
-- POST /v1/purchases/coding. Nothing in the migrations creates them, which is
-- why this exists as a seed rather than living in a schema file: it is data.
--
-- The three IDs are the well-known seed values the fallback expects. Do not
-- renumber them.
--
--   ...600  exams.id           container exam
--   ...601  exam_versions.id   the fallback version
--   ...602  exam_sections.id   the section bound to the assessment.coding plugin
--
-- Also ensures the singleton platform organization (...0001), which the exam
-- rows reference and which exam-engine uses as systemOrgFallback.
--
-- Idempotent: safe to re-run. Apply with
--   psql "$DATABASE_URL" -f backend/exam-engine/scripts/seed_coding_exam_shell.sql
-- after exam-engine's migrations have run.

BEGIN;

INSERT INTO organizations (id, kind, name, slug, settings)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'system',
    'OriginBI Platform',
    'system',
    '{"description": "singleton platform owner; do not delete"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- exams.current_version_id and exam_versions.exam_id reference each other, so
-- the exam goes in without a current version, the version follows, and the
-- pointer is set last. Inserting them the obvious way trips
-- exams_current_version_fk.
INSERT INTO exams (id, org_id, audience, title, slug, description, current_version_id)
VALUES (
    '00000000-0000-0000-0000-000000000600',
    '00000000-0000-0000-0000-000000000001',
    'public',
    'Coding Assessment',
    'coding-assessment',
    'Container exam for per-language coding attempts.',
    NULL
)
ON CONFLICT (id) DO NOTHING;

-- Published, not draft: an unpublished version is not servable, and this one
-- exists precisely to be the fallback target.
INSERT INTO exam_versions (
    id, exam_id, version_number, status, total_time_seconds,
    allow_review, result_release_mode, published_at
)
VALUES (
    '00000000-0000-0000-0000-000000000601',
    '00000000-0000-0000-0000-000000000600',
    1,
    'published',
    3600,
    true,
    'on_publish',
    now()
)
ON CONFLICT (id) DO NOTHING;

-- plugin_id is assessment.coding's fixed id, seeded by the migrations.
INSERT INTO exam_sections (
    id, exam_version_id, plugin_id, ordinal, name, time_limit_seconds, is_optional
)
VALUES (
    '00000000-0000-0000-0000-000000000602',
    '00000000-0000-0000-0000-000000000601',
    (SELECT id FROM plugins WHERE slug = 'assessment.coding'),
    1,
    'Coding',
    3600,
    false
)
ON CONFLICT (id) DO NOTHING;

-- Close the cycle now that the version exists.
UPDATE exams
   SET current_version_id = '00000000-0000-0000-0000-000000000601'
 WHERE id = '00000000-0000-0000-0000-000000000600'
   AND current_version_id IS DISTINCT FROM '00000000-0000-0000-0000-000000000601';

COMMIT;
