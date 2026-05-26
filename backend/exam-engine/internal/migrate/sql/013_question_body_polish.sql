-- +goose Up
-- =====================================================================
-- 013 - Question body polish: region-level locks + promptFormat.
--
-- Two small shape changes that unlock authoring v1:
--
--   1) code_submission_files.locked_regions JSONB — captures the snapshot's
--      per-file lock spec at submission time so the locked-region enforcer in
--      assessment.coding can diff candidate edits against the frozen lock and
--      produce a structured LOCKED_REGION_MODIFIED error.
--
--   2) question_versions.body gets a promptFormat marker. Seeded bodies use
--      HTML (`<code>nums</code>`) so we stamp 'html' on every existing row;
--      new questions authored via the admin API default to 'markdown'. The
--      candidate-side renderer dispatches per format.
-- =====================================================================

ALTER TABLE code_submission_files
    ADD COLUMN IF NOT EXISTS locked_regions JSONB;

-- Idempotent: skip rows that already have promptFormat set, and skip rows that
-- don't have a `prompt` field (some future body shapes may not).
UPDATE question_versions
SET body = jsonb_set(body, '{promptFormat}', '"html"'::jsonb, true)
WHERE body ? 'prompt'
  AND NOT (body ? 'promptFormat');

-- +goose Down
-- We don't strip the promptFormat marker on revert because:
--   - The default is to inherit html for legacy rows, which is correct.
--   - Newer (markdown) rows authored after rollout would be lossy to revert.
-- The locked_regions column is droppable cleanly.
ALTER TABLE code_submission_files
    DROP COLUMN IF EXISTS locked_regions;
