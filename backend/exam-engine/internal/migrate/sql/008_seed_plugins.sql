-- +goose Up
-- =====================================================================
-- 008 — Seed: system organization + initial plugin catalog.
-- Names + slugs match the Exam Portal Plan exactly.
-- =====================================================================

-- Singleton system org. Platform admins are members of this org.
INSERT INTO organizations (id, kind, name, slug, settings)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'system',
    'OriginBI Platform',
    'system',
    '{"description":"singleton platform owner; do not delete"}'
) ON CONFLICT DO NOTHING;

-- Question types
INSERT INTO plugins (id, kind, slug, name, version, requires_license, enabled_by_default) VALUES
    ('00000000-0000-0000-0000-000000000010', 'question_type', 'mcq.aptitude',  'MCQ — Aptitude',     '1.0.0', false, true),
    ('00000000-0000-0000-0000-000000000011', 'question_type', 'mcq.verbal',    'MCQ — Verbal',       '1.0.0', false, true),
    ('00000000-0000-0000-0000-000000000012', 'question_type', 'mcq.technical', 'MCQ — Technical',    '1.0.0', false, true),
    ('00000000-0000-0000-0000-000000000013', 'question_type', 'code.judge0',   'Coding (Judge0)',    '1.0.0', false, true),
    ('00000000-0000-0000-0000-000000000014', 'question_type', 'essay',         'Essay / Long Form',  '1.0.0', false, true)
ON CONFLICT DO NOTHING;

-- Evaluators
INSERT INTO plugins (id, kind, slug, name, version, requires_license, enabled_by_default) VALUES
    ('00000000-0000-0000-0000-000000000020', 'evaluator', 'auto.testcases', 'Auto — Test cases',  '1.0.0', false, true),
    ('00000000-0000-0000-0000-000000000021', 'evaluator', 'manual.review',  'Manual review',       '1.0.0', false, true),
    ('00000000-0000-0000-0000-000000000022', 'evaluator', 'llm.openai',     'LLM evaluator (OpenAI)', '1.0.0', true,  false),
    ('00000000-0000-0000-0000-000000000023', 'evaluator', 'llm.anthropic',  'LLM evaluator (Anthropic)', '1.0.0', true, false)
ON CONFLICT DO NOTHING;

-- Proctoring signals (each is an independently toggleable plugin)
INSERT INTO plugins (id, kind, slug, name, version, requires_license, enabled_by_default) VALUES
    ('00000000-0000-0000-0000-000000000030', 'proctoring_signal', 'proct.tab_switch',       'Proctoring — Tab switch',         '1.0.0', false, true),
    ('00000000-0000-0000-0000-000000000031', 'proctoring_signal', 'proct.paste',            'Proctoring — Paste',              '1.0.0', false, true),
    ('00000000-0000-0000-0000-000000000032', 'proctoring_signal', 'proct.copy',             'Proctoring — Copy',               '1.0.0', false, true),
    ('00000000-0000-0000-0000-000000000033', 'proctoring_signal', 'proct.right_click',      'Proctoring — Right click',        '1.0.0', false, true),
    ('00000000-0000-0000-0000-000000000034', 'proctoring_signal', 'proct.fullscreen_exit',  'Proctoring — Fullscreen exit',    '1.0.0', false, true),
    ('00000000-0000-0000-0000-000000000035', 'proctoring_signal', 'proct.mouse_leave',      'Proctoring — Mouse leave',        '1.0.0', false, true),
    ('00000000-0000-0000-0000-000000000036', 'proctoring_signal', 'proct.dev_tools',        'Proctoring — Dev tools opened',   '1.0.0', false, true),
    ('00000000-0000-0000-0000-000000000037', 'proctoring_signal', 'proct.connectivity',     'Proctoring — Connectivity gap',   '1.0.0', false, true)
ON CONFLICT DO NOTHING;

-- Features
INSERT INTO plugins (id, kind, slug, name, version, requires_license, enabled_by_default) VALUES
    ('00000000-0000-0000-0000-000000000040', 'feature', 'feat.per_question_timer',  'Per-question timer',  '1.0.0', false, true),
    ('00000000-0000-0000-0000-000000000041', 'feature', 'feat.shuffle_questions',   'Shuffle questions',   '1.0.0', false, true),
    ('00000000-0000-0000-0000-000000000042', 'feature', 'feat.shuffle_options',     'Shuffle options',     '1.0.0', false, true),
    ('00000000-0000-0000-0000-000000000043', 'feature', 'feat.section_navigation',  'Section navigation',  '1.0.0', false, true)
ON CONFLICT DO NOTHING;

-- Media renderers
INSERT INTO plugins (id, kind, slug, name, version, requires_license, enabled_by_default) VALUES
    ('00000000-0000-0000-0000-000000000050', 'media_renderer', 'media.image',         'Image renderer',          '1.0.0', false, true),
    ('00000000-0000-0000-0000-000000000051', 'media_renderer', 'media.video.youtube', 'YouTube video renderer',  '1.0.0', false, true),
    ('00000000-0000-0000-0000-000000000052', 'media_renderer', 'media.audio',         'Audio renderer',          '1.0.0', false, true)
ON CONFLICT DO NOTHING;

-- +goose Down
DELETE FROM plugins WHERE id LIKE '00000000-0000-0000-0000-0000000000%';
DELETE FROM organizations WHERE id = '00000000-0000-0000-0000-000000000001';
