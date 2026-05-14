-- +goose Up
-- =====================================================================
-- 014 — Index polish + integrity fixes flagged by the schema audit.
--
-- Three targeted changes:
--
--  1) Fix `purchases_user_item_provider_ref_idx` so it doesn't allow
--     unbounded duplicates when `provider_ref` is NULL. In Postgres,
--     NULL values in a UNIQUE index are treated as distinct, so the
--     existing index (created in 009) silently fails to constrain the
--     demo-purchase flow which always writes NULL provider_ref. We
--     split the single index into two partial indexes:
--       - provider-ref present: unique on the triple (idempotency
--         from external billing providers)
--       - provider-ref NULL: unique on (user_id, pricing_item_id) so
--         a user can only own a single demo purchase per item.
--
--  2) Add a covering index for the hot grading query:
--         WHERE answer_id = ? AND mode = 'final'
--         ORDER BY finished_at DESC LIMIT 1
--     Used by gradeCodingAnswerTx (attempt_handlers.go) on every
--     submit. Today this hits `code_runs_answer_idx(answer_id)` and
--     sorts in memory.
--
--  3) Add a partial index on `org_plugin_entitlements(org_id)` filtered
--     by state='enabled' to speed up the language-entitlement resolver
--     (UserLanguagePlugins) which always restricts to enabled rows.
--
-- All statements are idempotent.
-- =====================================================================

DROP INDEX IF EXISTS purchases_user_item_provider_ref_idx;

CREATE UNIQUE INDEX IF NOT EXISTS purchases_user_item_provider_ref_present_idx
    ON purchases(user_id, pricing_item_id, provider_ref)
    WHERE provider_ref IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS purchases_user_item_no_provider_idx
    ON purchases(user_id, pricing_item_id)
    WHERE provider_ref IS NULL;

CREATE INDEX IF NOT EXISTS code_runs_answer_final_idx
    ON code_runs(answer_id, finished_at DESC)
    WHERE mode = 'final' AND finished_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS ope_org_enabled_idx
    ON org_plugin_entitlements(org_id, plugin_id)
    WHERE state = 'enabled';

-- +goose Down

DROP INDEX IF EXISTS ope_org_enabled_idx;
DROP INDEX IF EXISTS code_runs_answer_final_idx;
DROP INDEX IF EXISTS purchases_user_item_no_provider_idx;
DROP INDEX IF EXISTS purchases_user_item_provider_ref_present_idx;

-- Restore the original (broken) index so a Down migration leaves the
-- schema in a state the prior code expects.
CREATE UNIQUE INDEX IF NOT EXISTS purchases_user_item_provider_ref_idx
    ON purchases(user_id, pricing_item_id, provider_ref);
