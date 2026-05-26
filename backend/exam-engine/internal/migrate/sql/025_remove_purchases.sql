-- +goose Up
ALTER TABLE exam_assignments DROP CONSTRAINT IF EXISTS exam_assignments_purchase_id_fkey;
ALTER TABLE exam_assignments DROP COLUMN IF EXISTS purchase_id;
DROP TABLE IF EXISTS purchases CASCADE;

-- +goose Down
-- Re-creating the purchases table and reference if rolled back.
CREATE TABLE IF NOT EXISTS purchases (
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
CREATE INDEX IF NOT EXISTS purchases_user_idx ON purchases(user_id);
CREATE INDEX IF NOT EXISTS purchases_item_idx ON purchases(pricing_item_id);

ALTER TABLE exam_assignments
    ADD COLUMN IF NOT EXISTS purchase_id UUID REFERENCES purchases(id);
