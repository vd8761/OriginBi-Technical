-- +goose Up
-- =====================================================================
-- 004 — Telemetry: append-only proctoring events + connectivity heartbeats.
-- Partitioned for write-amp + cheap retention via partition drops.
-- =====================================================================

-- ---------------- attempt_events: monthly partitioned ----------------
CREATE TABLE attempt_events (
    id                  BIGSERIAL,
    attempt_id          UUID NOT NULL,
    occurred_at         TIMESTAMPTZ NOT NULL,
    kind                TEXT NOT NULL,
    severity            SMALLINT NOT NULL DEFAULT 0,
    exam_question_id    UUID,
    plugin_id           UUID,
    payload             JSONB NOT NULL DEFAULT '{}',
    PRIMARY KEY (occurred_at, id)
) PARTITION BY RANGE (occurred_at);

CREATE INDEX attempt_events_attempt_idx
    ON attempt_events (attempt_id, occurred_at DESC);
CREATE INDEX attempt_events_kind_idx
    ON attempt_events (kind, occurred_at);
CREATE INDEX attempt_events_severity_idx
    ON attempt_events (severity, occurred_at)
    WHERE severity >= 2;

-- Create 12 monthly partitions starting from the current month so that the
-- engine can immediately accept ingest without an extra bootstrap step.
-- A scheduled maintenance task (in Go) will keep extending the runway.
-- +goose StatementBegin
DO $$
DECLARE
    start_date DATE := date_trunc('month', CURRENT_DATE)::DATE;
    end_date   DATE;
    pname      TEXT;
    i          INT;
BEGIN
    FOR i IN 0..11 LOOP
        end_date := (start_date + ((i+1) || ' months')::INTERVAL)::DATE;
        pname := 'attempt_events_'
                 || to_char((start_date + (i || ' months')::INTERVAL)::DATE, 'YYYY_MM');
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF attempt_events
             FOR VALUES FROM (%L) TO (%L)',
            pname,
            (start_date + (i || ' months')::INTERVAL)::DATE,
            end_date
        );
    END LOOP;
END
$$;
-- +goose StatementEnd

-- ---------------- summary table for fast dashboards ----------------
CREATE TABLE attempt_event_summary (
    attempt_id  UUID NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
    kind        TEXT NOT NULL,
    count       INT NOT NULL DEFAULT 0,
    last_at     TIMESTAMPTZ,
    PRIMARY KEY (attempt_id, kind)
);

-- ---------------- attempt_heartbeats: daily partitioned ----------------
CREATE TABLE attempt_heartbeats (
    id              BIGSERIAL,
    attempt_id      UUID NOT NULL,
    sent_at         TIMESTAMPTZ NOT NULL,
    received_at     TIMESTAMPTZ NOT NULL,
    rtt_ms          INT,
    client_state    JSONB NOT NULL DEFAULT '{}',
    PRIMARY KEY (received_at, id)
) PARTITION BY RANGE (received_at);

CREATE INDEX attempt_heartbeats_attempt_idx
    ON attempt_heartbeats (attempt_id, received_at DESC);

-- 30 daily partitions starting today.
-- +goose StatementBegin
DO $$
DECLARE
    start_date DATE := CURRENT_DATE;
    pname      TEXT;
    i          INT;
BEGIN
    FOR i IN 0..29 LOOP
        pname := 'attempt_heartbeats_'
                 || to_char((start_date + (i || ' days')::INTERVAL)::DATE, 'YYYY_MM_DD');
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF attempt_heartbeats
             FOR VALUES FROM (%L) TO (%L)',
            pname,
            (start_date + (i || ' days')::INTERVAL)::DATE,
            (start_date + ((i+1) || ' days')::INTERVAL)::DATE
        );
    END LOOP;
END
$$;
-- +goose StatementEnd

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

-- ---------------- helper: ensure_event_partition ----------------
-- Idempotent partition creator the Go service can call from a daily cron.
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION ensure_attempt_events_partition(target_month DATE)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    pname TEXT := 'attempt_events_' || to_char(target_month, 'YYYY_MM');
    pstart DATE := date_trunc('month', target_month)::DATE;
    pend   DATE := (pstart + INTERVAL '1 month')::DATE;
BEGIN
    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF attempt_events
         FOR VALUES FROM (%L) TO (%L)',
        pname, pstart, pend
    );
END
$$;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION ensure_attempt_heartbeats_partition(target_day DATE)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    pname TEXT := 'attempt_heartbeats_' || to_char(target_day, 'YYYY_MM_DD');
BEGIN
    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF attempt_heartbeats
         FOR VALUES FROM (%L) TO (%L)',
        pname, target_day, (target_day + INTERVAL '1 day')::DATE
    );
END
$$;
-- +goose StatementEnd

-- +goose Down
DROP FUNCTION IF EXISTS ensure_attempt_heartbeats_partition(DATE);
DROP FUNCTION IF EXISTS ensure_attempt_events_partition(DATE);
DROP TABLE IF EXISTS attempt_connectivity_gaps;
DROP TABLE IF EXISTS attempt_heartbeats;  -- partitions cascade
DROP TABLE IF EXISTS attempt_event_summary;
DROP TABLE IF EXISTS attempt_events;       -- partitions cascade
