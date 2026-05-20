-- Freezes the assessment configuration onto each purchase.
--
-- When a candidate pays for (schedules) an assessment, the proctoring and
-- exam settings as they stand at that moment are captured into
-- settings_snapshot. The exam then runs against the snapshot, so a later
-- admin edit to tech_assessments never retroactively changes an already
-- scheduled exam.
--
-- Legacy rows keep settings_snapshot NULL; the effective-settings resolver
-- falls back to the live tech_assessments row for those.

ALTER TABLE tech_assessment_purchases
    ADD COLUMN IF NOT EXISTS settings_snapshot JSONB;
