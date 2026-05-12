# Admin Portal And Security

Last updated: 2026-05-11

This document defines the desired admin plugin management experience and the security controls needed before plugin management is production safe.

## Goals

The admin portal should let platform admins manage plugins without editing code or touching the database manually.

Admin users should be able to:

- View installed plugins.
- Understand plugin type: base or addon.
- See dependencies and dependents.
- Enable, disable, or restrict plugins globally.
- Configure plugin settings.
- Grant organization entitlements.
- See impact before disabling plugins.
- View plugin usage across exams and organizations.
- Audit who changed what.

The admin portal should not let users upload arbitrary executable code.

## Admin Roles

Recommended minimum role split:

- `platform_admin`: full plugin management.
- `platform_operator`: view plugin health and usage; cannot change state.
- `org_admin`: view only plugins entitled to their organization; can configure only allowed exam-level settings.
- `reviewer`: no plugin management except review queue features.

The current local admin bootstrap is useful for development, but production should require a proper admin identity and role assignment workflow.

## Plugin Management Screens

### Plugin Catalog

Shows all installed plugins.

Columns:

- Name.
- Plugin ID.
- Version.
- Type: base or addon.
- Category.
- Global state.
- Health.
- Required dependencies.
- Dependent plugins.
- Usage count.
- Last updated.

Useful filters:

- Enabled.
- Disabled.
- Restricted.
- Base plugins.
- Addon plugins.
- Assessment plugins.
- Evaluation plugins.
- Proctoring plugins.
- Plugins with warnings.

### Plugin Detail

Shows one plugin.

Sections:

- Overview.
- Manifest metadata.
- Dependency graph.
- Global state.
- Default config.
- Organization entitlements.
- Exams using this plugin.
- Active attempts using this plugin.
- Historical report usage.
- Audit log.
- Health checks.

### Dependency Graph

The UI should show dependency chains clearly.

Example:

```text
assessment.coding
  evaluation.llm
    evaluator.openai
```

If a dependency is disabled, dependent plugins should show:

```text
Unavailable because evaluation.llm is disabled.
```

### Impact Preview

Before applying changes, admin should see an impact preview.

Example:

```json
{
  "action": "disable",
  "pluginId": "evaluation.llm",
  "impact": {
    "dependentPlugins": ["evaluator.openai"],
    "organizationsAffected": 3,
    "examsAffected": 8,
    "activeAttemptsAffected": 0,
    "futureAttemptsBlocked": 8,
    "historicalReportsSafe": true
  }
}
```

The portal should require confirmation for destructive changes like disabling a plugin used by published exams.

## Secure State Changes

Every plugin state mutation should be:

- Authenticated.
- Authorized.
- CSRF/origin protected.
- Validated against dependency rules.
- Applied transactionally.
- Audited.

Audit record should include:

- Actor user ID.
- Actor role.
- Plugin ID.
- Previous state.
- New state.
- Previous config hash.
- New config hash.
- Scope changed.
- Reason or note.
- Request ID.
- Timestamp.

## State Change Rules

### Enable Plugin

Before enabling:

- Required dependencies must be enabled.
- Conflicting plugins must not be enabled in same scope.
- Config must validate.
- License requirement must be satisfied, if relevant.

### Disable Plugin

Before disabling:

- Show dependent plugins.
- Show published/scheduled exams using it.
- Show active attempts using it.
- Decide whether dependent addon plugins should automatically disable.
- Require confirmation if impact is non-empty.

### Restrict Plugin

Before restricting:

- Validate config schema.
- Verify existing exam configs remain valid or show impact.
- Do not mutate active attempt snapshots.

## Plugin Config

Each plugin should expose a config schema and optionally a UI schema.

Example:

```json
{
  "languages": {
    "type": "array",
    "items": {
      "enum": ["python", "java", "cpp", "javascript", "c"]
    }
  },
  "allowQuestionOverride": {
    "type": "boolean"
  }
}
```

The backend must validate config. The frontend can render forms from schema, but frontend validation is only a convenience.

## Organization Entitlements

Platform admins can configure organization-level plugin access.

Example:

- Corporate A: Coding enabled, Python and Java only.
- College B: Coding enabled, all languages.
- Corporate C: LLM evaluation disabled.

Organization admins only see controls that the platform entitlement allows.

## Exam-Level Controls

Organization admins can configure exam-level plugin settings only inside their entitlement.

Example:

If organization allows Python and Java:

- Exam can choose Python only.
- Exam can choose Java only.
- Exam can choose Python and Java.
- Exam cannot choose C++.

## Security Boundaries

Hard requirements:

- Plugin management routes must require platform admin privileges.
- Organization admins cannot change global plugin states.
- Plugin config must be validated server-side.
- Plugin config cannot contain executable code.
- Secrets should not be stored in general JSON config.
- Provider secrets should use a secret manager or encrypted config table.
- All state changes must be audited.
- Plugin admin APIs must reject cross-tenant writes.

## Provider Secrets

For plugins like `evaluator.openai`, config is split:

- Non-secret config: model, timeout, rubric options.
- Secret config: API key or provider credential reference.

Recommended pattern:

```json
{
  "model": "provider-model-id",
  "credentialRef": "secret://openai/default"
}
```

Never expose secret values back to the frontend.

## Health Checks

Plugins can expose health checks.

Examples:

- Judge0 reachable.
- OpenAI credential configured.
- LLM evaluator queue healthy.
- Manual review queue backlog under threshold.

Health status should not automatically disable plugins, but it should warn admins and can block new attempts if policy says the dependency is required.

## Production Safety Checklist

Before calling plugin admin production ready:

- Admin RBAC is enforced in backend, not only frontend.
- All plugin state changes are audited.
- Dependency impact preview exists.
- Config schemas are validated backend-side.
- Active attempts use frozen snapshots.
- Disabled addon plugins do not break base flows.
- Secrets are isolated.
- Historical reports render without live plugin dependencies when possible.
- Automated tests cover dependency resolution and disabled-plugin behavior.

