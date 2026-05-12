-- +goose Up
-- =====================================================================
-- 006 — Result Publication: explicit row per attempt-result release.
-- =====================================================================

CREATE TABLE result_publications (
    id              UUID PRIMARY KEY,
    attempt_id      UUID NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
    published_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_by    BIGINT,
    visibility      TEXT NOT NULL,
    feedback_level  TEXT NOT NULL,
    snapshot        JSONB NOT NULL,
    revoked_at      TIMESTAMPTZ,
    revoked_by      BIGINT
);
CREATE INDEX rp_attempt_idx ON result_publications(attempt_id);

-- +goose Down
DROP TABLE IF EXISTS result_publications;
