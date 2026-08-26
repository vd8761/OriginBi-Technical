-- Per-account, per-day counters for rate-limited user actions.
--
-- auth-service caps password-reset requests at a few per account per day. That
-- cap has to survive a restart and be shared across processes, so it lives in
-- the database rather than in memory. The sibling originbi platform had this
-- table (as user_action_logs) and the separated technical database did not, so
-- the forgot-password path had no per-account limit at all — only a per-IP
-- throttle, which a distributed attempt walks straight past while mailbombing
-- one person.
--
-- The unique key is what makes the counter safe: the INSERT ... ON CONFLICT
-- upsert in ForgotPasswordService relies on it, so two concurrent requests
-- increment rather than race to insert two rows.
--
-- Owned by assessment-service's migrator because auth-service deliberately
-- runs no migrations of its own — one writer per schema.

CREATE TABLE IF NOT EXISTS user_action_logs (
    id            BIGSERIAL PRIMARY KEY,
    user_id       BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type   VARCHAR(50) NOT NULL,
    action_date   DATE        NOT NULL DEFAULT CURRENT_DATE,
    attempt_count INTEGER     NOT NULL DEFAULT 1,
    metadata      JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, action_type, action_date)
);

CREATE INDEX IF NOT EXISTS idx_user_action_logs_user_date
    ON user_action_logs (user_id, action_date DESC);
