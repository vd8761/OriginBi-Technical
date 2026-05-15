-- +goose Up
-- =====================================================================
-- 016 - First real proctoring plugin: proctoring.tab-switch.
--
-- Upgrades the legacy proct.tab_switch seed row into the Phase D lighthouse
-- plugin. The Go subscriber is first-party code compiled into the engine;
-- this row is the manifest/config surface the registry and frontend consume.
-- =====================================================================

UPDATE plugins
SET slug = 'proctoring.tab-switch',
    name = 'Tab Switch Monitor',
    version = '1.0.0',
    plugin_type = 'addon',
    category = 'proctoring',
    requires = '["runtime.exam-session"]'::jsonb,
    extends = '["assessment.coding"]'::jsonb,
    provides = '["proctoring.constraint.tab-focus"]'::jsonb,
    enabled_by_default = true,
    requires_license = false,
    schema = '{
      "defaults": {
        "enabled": true,
        "threshold": 3,
        "graceMs": 10000,
        "warnBeforeTerminate": true
      },
      "emits": [
        { "kind": "proctoring.tab.switched", "severity": "warn", "payload_schema_ref": "#/schemas/tab_switched" },
        { "kind": "proctoring.tab.refocused", "severity": "info", "payload_schema_ref": "#/schemas/tab_refocused" }
      ],
      "subscribes": ["proctoring.tab.switched", "attempt.submitted"],
      "client_constraints": [
        {
          "id": "tab-focus",
          "kind": "focus-required",
          "config_schema": { "$ref": "#/schemas/tab_focus_config" }
        }
      ],
      "admin_ui": [
        {
          "mount": "settings.proctoring",
          "label": "Tab Switching",
          "schema": "#/schemas/tab_focus_config",
          "component": "frontend/plugins/proctoring-tab-switch/manifest.tsx"
        }
      ],
      "candidate_ui": [
        {
          "mount": "attempt.warning-toast",
          "label": "Tab switch warnings",
          "component": "frontend/plugins/proctoring-tab-switch/manifest.tsx"
        }
      ],
      "schemas": {
        "tab_switched": {
          "type": "object",
          "properties": {
            "reason": { "type": "string" },
            "visibilityState": { "type": "string" },
            "count": { "type": "number" }
          }
        },
        "tab_refocused": {
          "type": "object",
          "properties": {
            "durationMs": { "type": "number" }
          }
        },
        "tab_focus_config": {
          "type": "object",
          "properties": {
            "enabled": { "type": "boolean" },
            "threshold": { "type": "integer", "minimum": 1, "maximum": 20 },
            "graceMs": { "type": "integer", "minimum": 0, "maximum": 60000 },
            "warnBeforeTerminate": { "type": "boolean" }
          }
        }
      }
    }'::jsonb
WHERE id = '00000000-0000-0000-0000-000000000030';

-- +goose Down
UPDATE plugins
SET slug = 'proct.tab_switch',
    name = 'Proctoring - Tab switch',
    schema = '{}'::jsonb,
    requires = '[]'::jsonb,
    extends = '[]'::jsonb,
    provides = '[]'::jsonb
WHERE id = '00000000-0000-0000-0000-000000000030';
