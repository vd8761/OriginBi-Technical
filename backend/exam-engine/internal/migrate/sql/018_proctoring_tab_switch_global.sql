-- +goose Up
-- =====================================================================
-- 018 - Broaden proctoring.tab-switch to apply across every assessment.
--
-- Previously the manifest set extends = ["assessment.coding"], which the
-- new package-aware mePluginConfig resolver treats as "only return this
-- plugin when the candidate is on a coding attempt". To run proctoring on
-- aptitude / communication / mnc / role (and on coding too), drop the
-- assessment-specific constraint. Empty extends is the "global addon"
-- semantic the resolver looks for.
--
-- The manifest schema (defaults, emits, surfaces, etc.) is untouched.
-- =====================================================================

UPDATE plugins
SET extends = '[]'::jsonb
WHERE id = '00000000-0000-0000-0000-000000000030';

-- +goose Down
UPDATE plugins
SET extends = '["assessment.coding"]'::jsonb
WHERE id = '00000000-0000-0000-0000-000000000030';
