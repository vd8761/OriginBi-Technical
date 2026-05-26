-- +goose Up
-- =====================================================================
-- 017 - First-party Settings proctoring plugins.
--
-- Phase E moves the six hardcoded proctoring Settings cards behind plugin
-- manifests. These rows give each card its own platform entitlement config
-- and UI surface while keeping the kernel Settings page thin.
-- =====================================================================

INSERT INTO plugins (
    id, kind, slug, name, version, schema, requires_license, enabled_by_default,
    plugin_type, category, requires, extends, provides
) VALUES
(
    '00000000-0000-0000-0000-0000000000a0', 'proctoring_signal', 'proctoring.camera-vision', 'Camera & Vision', '1.0.0',
    '{"defaults":{"enabled":true,"captureMode":"interval","intervalSec":30,"faceDetect":true,"multiFace":"flag"},"admin_ui":[{"mount":"settings.proctoring","label":"Camera & Vision","component":"frontend/plugins/proctoring-camera-vision/manifest.tsx"}]}'::jsonb,
    false, true, 'addon', 'proctoring', '["runtime.exam-session"]'::jsonb, '["assessment.coding"]'::jsonb, '["proctoring.constraint.camera"]'::jsonb
),
(
    '00000000-0000-0000-0000-0000000000a1', 'proctoring_signal', 'proctoring.microphone-audio', 'Microphone & Audio', '1.0.0',
    '{"defaults":{"enabled":true,"noiseAlert":true},"admin_ui":[{"mount":"settings.proctoring","label":"Microphone & Audio","component":"frontend/plugins/proctoring-microphone-audio/manifest.tsx"}]}'::jsonb,
    false, true, 'addon', 'proctoring', '["runtime.exam-session"]'::jsonb, '["assessment.coding"]'::jsonb, '["proctoring.constraint.microphone"]'::jsonb
),
(
    '00000000-0000-0000-0000-0000000000a2', 'proctoring_signal', 'proctoring.screen-browser', 'Screen & Browser', '1.0.0',
    '{"defaults":{"fullscreenLock":true,"allowExits":2,"screenShare":true},"admin_ui":[{"mount":"settings.proctoring","label":"Screen & Browser","component":"frontend/plugins/proctoring-screen-browser/manifest.tsx"}]}'::jsonb,
    false, true, 'addon', 'proctoring', '["runtime.exam-session"]'::jsonb, '["assessment.coding"]'::jsonb, '["proctoring.constraint.fullscreen","proctoring.constraint.screen-share"]'::jsonb
),
(
    '00000000-0000-0000-0000-0000000000a3', 'proctoring_signal', 'proctoring.ai-monitoring', 'AI Monitoring', '1.0.0',
    '{"defaults":{"enabled":true,"eyeTracking":false,"suspiciousActivity":true,"lipSync":false,"plagiarism":true},"admin_ui":[{"mount":"settings.proctoring","label":"AI Monitoring","component":"frontend/plugins/proctoring-ai-monitoring/manifest.tsx"}]}'::jsonb,
    false, true, 'addon', 'proctoring', '["runtime.exam-session"]'::jsonb, '["assessment.coding"]'::jsonb, '["proctoring.constraint.ai-monitoring"]'::jsonb
),
(
    '00000000-0000-0000-0000-0000000000a4', 'proctoring_signal', 'proctoring.identity-verification', 'Identity Verification', '1.0.0',
    '{"defaults":{"enabled":true,"idUpload":true,"livenessCheck":true,"photoAtStart":true},"admin_ui":[{"mount":"settings.proctoring","label":"Identity Verification","component":"frontend/plugins/proctoring-identity-verification/manifest.tsx"}]}'::jsonb,
    false, true, 'addon', 'proctoring', '["runtime.exam-session"]'::jsonb, '["assessment.coding"]'::jsonb, '["proctoring.constraint.identity"]'::jsonb
),
(
    '00000000-0000-0000-0000-0000000000a5', 'proctoring_signal', 'proctoring.network-location', 'Network & Location', '1.0.0',
    '{"defaults":{"ipLogging":true,"vpnBlock":true,"geofence":"country"},"admin_ui":[{"mount":"settings.proctoring","label":"Network & Location","component":"frontend/plugins/proctoring-network-location/manifest.tsx"}]}'::jsonb,
    false, true, 'addon', 'proctoring', '["runtime.exam-session"]'::jsonb, '["assessment.coding"]'::jsonb, '["proctoring.constraint.network-location"]'::jsonb
)
ON CONFLICT DO NOTHING;

-- +goose Down
DELETE FROM plugins WHERE id IN (
    '00000000-0000-0000-0000-0000000000a0',
    '00000000-0000-0000-0000-0000000000a1',
    '00000000-0000-0000-0000-0000000000a2',
    '00000000-0000-0000-0000-0000000000a3',
    '00000000-0000-0000-0000-0000000000a4',
    '00000000-0000-0000-0000-0000000000a5'
);
