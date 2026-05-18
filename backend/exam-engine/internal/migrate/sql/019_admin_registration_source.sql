-- +goose Up
-- =====================================================================
-- 019 - Ensure registrations.registration_source exists for the
--       "ADMIN-registered users get all assessments free" gate.
--
-- In production the registrations table is owned by the parent app and
-- already has this column (see originbi/backend/shared/entities/
-- registration.entity.ts). For standalone exam-engine dev DBs the
-- fallback table from migration 009 doesn't include it. Idempotently
-- add it so the auth_handlers / purchase_handlers queries always work.
-- =====================================================================

ALTER TABLE registrations
    ADD COLUMN IF NOT EXISTS registration_source TEXT NOT NULL DEFAULT 'SELF';

CREATE INDEX IF NOT EXISTS registrations_admin_source_idx
    ON registrations(user_id)
    WHERE registration_source = 'ADMIN';

-- +goose Down
DROP INDEX IF EXISTS registrations_admin_source_idx;
ALTER TABLE registrations DROP COLUMN IF EXISTS registration_source;
