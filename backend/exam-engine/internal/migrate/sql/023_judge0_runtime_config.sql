-- +goose Up
-- Align persisted runner defaults with the Judge0 image deployed for OriginBI.
-- The image rejects max_file_size > 4096 and exposes Go as language id 60.
UPDATE plugins
SET schema = jsonb_set(
        jsonb_set(
            COALESCE(schema, '{}'::jsonb),
            '{defaults,outputLimitKb}',
            '4096'::jsonb,
            true
        ),
        '{multiFileLanguageId}',
        '89'::jsonb,
        true
    )
WHERE slug = 'runner.judge0';

UPDATE plugins
SET schema = jsonb_set(
        jsonb_set(
            COALESCE(schema, '{}'::jsonb),
            '{judge0LanguageId}',
            '60'::jsonb,
            true
        ),
        '{displayName}',
        '"Go 1.13"'::jsonb,
        true
    ),
    name = 'Go 1.13'
WHERE slug = 'language.go';

-- +goose Down
UPDATE plugins
SET schema = jsonb_set(
        COALESCE(schema, '{}'::jsonb),
        '{defaults,outputLimitKb}',
        '16384'::jsonb,
        true
    )
WHERE slug = 'runner.judge0';

UPDATE plugins
SET schema = jsonb_set(
        jsonb_set(
            COALESCE(schema, '{}'::jsonb),
            '{judge0LanguageId}',
            '95'::jsonb,
            true
        ),
        '{displayName}',
        '"Go 1.22"'::jsonb,
        true
    ),
    name = 'Go 1.22'
WHERE slug = 'language.go';
