-- +goose Up
-- =====================================================================
-- 015 — plugin_decisions audit log.
--
-- Records every consequential action a plugin took in response to an
-- ingested event. Telemetry (attempt_events) records what the client
-- reported; plugin_decisions records what the engine *did* about it.
-- The two together let an auditor reconstruct any flagged session
-- without trusting either source alone.
--
-- See docs/architecture/PLUGIN_ARCHITECTURE.md §4.3 for the contract.
-- =====================================================================

CREATE TABLE IF NOT EXISTS plugin_decisions (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id        uuid NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
    plugin_id         uuid NOT NULL REFERENCES plugins(id),
    trigger_event_id  uuid,
    decision          text NOT NULL,
    reason            text,
    payload           jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS plugin_decisions_attempt_idx
    ON plugin_decisions (attempt_id, created_at DESC);

CREATE INDEX IF NOT EXISTS plugin_decisions_plugin_idx
    ON plugin_decisions (plugin_id, created_at DESC);

-- Lookups by decision verb are common for the admin proctoring view
-- ("show me everything we auto-terminated today").
CREATE INDEX IF NOT EXISTS plugin_decisions_decision_idx
    ON plugin_decisions (decision, created_at DESC);

COMMENT ON TABLE plugin_decisions IS
    'Audit log of consequential actions taken by a plugin in reaction to an event. Paired with attempt_events.';

-- +goose Down
DROP TABLE IF EXISTS plugin_decisions;
