-- +goose Up
-- =====================================================================
-- 007 — Optional monetization (carries the existing per-language coding paywall).
-- =====================================================================

CREATE TABLE pricing_items (
    id              UUID PRIMARY KEY,
    org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
    item_kind       TEXT NOT NULL,
    item_ref        TEXT NOT NULL,
    price_cents     INT NOT NULL,
    currency        TEXT NOT NULL DEFAULT 'INR',
    UNIQUE (org_id, item_kind, item_ref)
);

CREATE TABLE purchases (
    id              UUID PRIMARY KEY,
    user_id         BIGINT NOT NULL,
    pricing_item_id UUID NOT NULL REFERENCES pricing_items(id),
    paid_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    amount_cents    INT NOT NULL,
    currency        TEXT NOT NULL,
    provider        TEXT NOT NULL,
    provider_ref    TEXT,
    metadata        JSONB NOT NULL DEFAULT '{}'
);
CREATE INDEX purchases_user_idx ON purchases(user_id);
CREATE INDEX purchases_item_idx ON purchases(pricing_item_id);

-- +goose Down
DROP TABLE IF EXISTS purchases;
DROP TABLE IF EXISTS pricing_items;
