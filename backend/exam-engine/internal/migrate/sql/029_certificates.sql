-- +goose Up
-- Certificates issued automatically when a candidate's evaluated attempt scores
-- at or above the pass threshold (default 90%). One certificate per attempt.
-- The serial is the public, shareable identifier verified at /v1/certificates/{serial}.
CREATE TABLE certificates (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial            TEXT NOT NULL UNIQUE,
    attempt_id        UUID NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
    candidate_user_id BIGINT NOT NULL,
    assignment_ref    TEXT,
    language          TEXT,
    candidate_name    TEXT,
    score             NUMERIC(8,2) NOT NULL,
    max_score         NUMERIC(8,2) NOT NULL,
    percentage        NUMERIC(5,2) NOT NULL,
    issued_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata          JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- One certificate per attempt — re-evaluation is idempotent via ON CONFLICT.
CREATE UNIQUE INDEX certificates_attempt_uq ON certificates(attempt_id);
CREATE INDEX certificates_user_idx ON certificates(candidate_user_id);

-- Retake policy: coding assignments are created with max_attempts = 1 today,
-- which makes startAttempt return 409 once a terminal attempt exists. Bump the
-- default so the consolidated purchase flow can grant retakes, and lift any
-- existing single-attempt coding assignments to the new default. Admin-created
-- assignments with a deliberate cap are left untouched.
ALTER TABLE exam_assignments ALTER COLUMN max_attempts SET DEFAULT 3;

UPDATE exam_assignments
SET max_attempts = 3
WHERE assignment_ref LIKE 'coding:%'
  AND max_attempts = 1;

-- Data fix: language.go was missing its legacyItemRef, so 'coding:go' could
-- never resolve to the Go language plugin (purchase + entitlement both key off
-- schema->>'legacyItemRef'). Set it to match the other languages.
UPDATE plugins
SET schema = jsonb_set(schema, '{legacyItemRef}', '"coding:go"', true)
WHERE slug = 'language.go'
  AND category = 'language'
  AND (schema->>'legacyItemRef') IS NULL;

-- +goose Down
ALTER TABLE exam_assignments ALTER COLUMN max_attempts SET DEFAULT 1;
DROP INDEX IF EXISTS certificates_user_idx;
DROP INDEX IF EXISTS certificates_attempt_uq;
DROP TABLE IF EXISTS certificates;
