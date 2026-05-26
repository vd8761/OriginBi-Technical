-- +goose Up
-- =====================================================================
-- 004 — Telemetry: append-only proctoring events + connectivity heartbeats.
-- Converted to flat tables for simplicity in standard environments.
-- =====================================================================

-- ---------------- attempt_events: normal table ----------------
CREATE TABLE attempt_events (
    id                  BIGSERIAL PRIMARY KEY,
    attempt_id          UUID NOT NULL,
    occurred_at         TIMESTAMPTZ NOT NULL,
    kind                TEXT NOT NULL,
    severity            SMALLINT NOT NULL DEFAULT 0,
    exam_question_id    UUID,
    plugin_id           UUID,
    payload             JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX attempt_events_attempt_idx
    ON attempt_events (attempt_id, occurred_at DESC);
CREATE INDEX attempt_events_kind_idx
    ON attempt_events (kind, occurred_at);
CREATE INDEX attempt_events_severity_idx
    ON attempt_events (severity, occurred_at)
    WHERE severity >= 2;

-- ---------------- summary table for fast dashboards ----------------
CREATE TABLE attempt_event_summary (
    attempt_id  UUID NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
    kind        TEXT NOT NULL,
    count       INT NOT NULL DEFAULT 0,
    last_at     TIMESTAMPTZ,
    PRIMARY KEY (attempt_id, kind)
);

-- ---------------- attempt_heartbeats: normal table ----------------
CREATE TABLE attempt_heartbeats (
    id              BIGSERIAL PRIMARY KEY,
    attempt_id      UUID NOT NULL,
    sent_at         TIMESTAMPTZ NOT NULL,
    received_at     TIMESTAMPTZ NOT NULL,
    rtt_ms          INT,
    client_state    JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX attempt_heartbeats_attempt_idx
    ON attempt_heartbeats (attempt_id, received_at DESC);

-- ---------------- materialized connectivity gaps ----------------
CREATE TABLE attempt_connectivity_gaps (
    id              UUID PRIMARY KEY,
    attempt_id      UUID NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
    started_at      TIMESTAMPTZ NOT NULL,
    ended_at        TIMESTAMPTZ NOT NULL,
    duration_ms     INT NOT NULL,
    breached_grace  BOOLEAN NOT NULL,
    auto_resolved   BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX gaps_attempt_idx
    ON attempt_connectivity_gaps(attempt_id, started_at);

-- +goose Down
DROP TABLE IF EXISTS attempt_connectivity_gaps;
DROP TABLE IF EXISTS attempt_heartbeats;
DROP TABLE IF EXISTS attempt_event_summary;
DROP TABLE IF EXISTS attempt_events;
