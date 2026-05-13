-- +goose Up
-- =====================================================================
-- 010 - Runtime traceability and load-safety indexes.
-- =====================================================================

-- A paid assignment gets one active runtime at a time. This makes double-clicks,
-- browser retries, and load-balanced duplicate requests converge on the same
-- resumable attempt instead of creating parallel attempts.
WITH ranked AS (
    SELECT
        id,
        row_number() OVER (
            PARTITION BY assignment_id
            ORDER BY created_at DESC, started_at DESC NULLS LAST
        ) AS rn
    FROM attempts
    WHERE status IN ('started', 'in_progress', 'paused')
)
UPDATE attempts a
SET status = 'cancelled',
    cancelled_reason = 'superseded duplicate active attempt before active-attempt uniqueness migration'
FROM ranked r
WHERE a.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS attempts_one_active_per_assignment_idx
    ON attempts (assignment_id)
    WHERE status IN ('started', 'in_progress', 'paused');

-- Hot paths for dashboards, autosave/review lookup, and judge monitoring.
CREATE INDEX IF NOT EXISTS attempts_live_last_seen_idx
    ON attempts (last_seen_at DESC)
    WHERE status IN ('started', 'in_progress', 'paused');

CREATE INDEX IF NOT EXISTS answers_grading_status_idx
    ON answers (grading_status, submitted_at DESC);

CREATE INDEX IF NOT EXISTS code_runs_unfinished_idx
    ON code_runs (started_at)
    WHERE finished_at IS NULL;

CREATE INDEX IF NOT EXISTS code_run_test_results_passed_idx
    ON code_run_test_results (code_run_id, passed);

-- +goose Down
DROP INDEX IF EXISTS code_run_test_results_passed_idx;
DROP INDEX IF EXISTS code_runs_unfinished_idx;
DROP INDEX IF EXISTS answers_grading_status_idx;
DROP INDEX IF EXISTS attempts_live_last_seen_idx;
DROP INDEX IF EXISTS attempts_one_active_per_assignment_idx;
