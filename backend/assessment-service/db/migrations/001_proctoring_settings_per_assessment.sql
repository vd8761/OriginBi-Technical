-- Adds per-assessment proctoring configuration to tech_assessments.
-- TypeORM with synchronize:true will pick these up automatically in dev;
-- production needs this migration run manually before deploying the
-- matching service / frontend.

ALTER TABLE tech_assessments
    ADD COLUMN IF NOT EXISTS proctoring_require_fullscreen BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS fullscreen_exit_limit         INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS proctoring_block_devtools     BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS devtools_open_limit           INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS mouse_focus_loss_limit        INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS keypress_log_enabled          BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS require_camera_mic            BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS live_proctoring_enabled       BOOLEAN NOT NULL DEFAULT TRUE;
