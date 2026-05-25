-- +goose Up
-- Clamp language plugins' outputLimitKb to 4096 to match the deployed Judge0
-- image (mrkushalsm/judge0:cgv2), which rejects max_file_size > 4096. Without
-- this, payload.go silently caps at 4096 at runtime but the DB rows lie to
-- admins viewing the Languages UI. Idempotent: only rows above 4096 change.
UPDATE plugins
SET schema = jsonb_set(schema, '{outputLimitKb}', '4096'::jsonb, true)
WHERE category = 'language'
  AND COALESCE((schema->>'outputLimitKb')::int, 0) > 4096;

-- +goose Down
-- Restore the previous default for the rows we seeded in 012. Custom languages
-- added since are left at 4096 (their pre-clamp value is not recoverable).
UPDATE plugins
SET schema = jsonb_set(schema, '{outputLimitKb}', '16384'::jsonb, true)
WHERE slug IN (
    'language.python',
    'language.java',
    'language.cpp',
    'language.c',
    'language.javascript',
    'language.go'
);
