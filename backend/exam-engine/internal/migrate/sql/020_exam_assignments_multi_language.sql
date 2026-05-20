-- +goose Up
-- The original schema put a strict UNIQUE on
-- (exam_version_id, candidate_user_id, assigned_org_id) which made sense
-- when each exam_version was a one-shot assignment per candidate. For the
-- coding exam (exam_version_id = ...0601) each language plugin is a
-- separate purchase that re-uses the same exam_version, so this constraint
-- blocks the SECOND demoPurchase a candidate makes for a different
-- language with `duplicate key value violates unique constraint
-- exam_assignments_exam_version_id_candidate_user_id_assigned_key`.
--
-- The intended per-language uniqueness already lives in the partial index
-- `assignments_candidate_ref_active_idx` on
-- (candidate_user_id, assignment_ref) WHERE assignment_ref IS NOT NULL
-- AND status <> 'revoked'. Drop the over-strict constraint so multiple
-- coding languages can be purchased.

ALTER TABLE exam_assignments
    DROP CONSTRAINT IF EXISTS exam_assignments_exam_version_id_candidate_user_id_assigned_key;
