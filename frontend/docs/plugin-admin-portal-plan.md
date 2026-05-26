# Plugin Admin Portal Plan

Last updated: 2026-05-11

This document describes the frontend admin experience needed for the plugin-first Exam Portal architecture. It is a planning document only and does not mean the GUI is fully implemented today.

Related backend plugin docs:

- [Plugin architecture index](../../backend/exam-engine/docs/plugin-architecture/README.md)
- [Plugin model](../../backend/exam-engine/docs/plugin-architecture/plugin-model.md)
- [Admin portal and security](../../backend/exam-engine/docs/plugin-architecture/admin-portal-and-security.md)
- [Frontend plugin boundaries](../../backend/exam-engine/docs/plugin-architecture/frontend-plugin-boundaries.md)

## Goal

Build a secure admin GUI where platform admins can manage packaged plugins without editing code or manually changing database rows.

The admin UI should make plugin state understandable:

- What is installed?
- What is enabled?
- What is disabled?
- What is restricted?
- What depends on what?
- What will break if I disable this?
- Which organizations and exams use it?

## Current State

The frontend has an admin plugin page connected to the Go engine plugin APIs, but it is still an early slice.

Current limitations:

- Plugin dependency graph is not fully represented.
- Base vs addon classification is not fully modeled in UI.
- Impact preview is not implemented.
- Organization entitlement management is not complete.
- Config schema rendering is not complete.
- Audit trail UI is not complete.
- Admin RBAC needs production hardening.

## Target Admin Screens

### Plugin Catalog

Route idea:

```text
/admin/plugins
```

Purpose:

Show all installed plugins and their global state.

Cards or table rows should include:

- Plugin name.
- Plugin ID.
- Version.
- Type: base or addon.
- Category: assessment, evaluation, proctoring, runner, reporting, billing.
- Global state: enabled, disabled, restricted.
- Health status.
- Dependency status.
- Usage count.

Actions:

- View details.
- Enable.
- Disable.
- Restrict.
- Configure.

### Plugin Detail

Route idea:

```text
/admin/plugins/[pluginId]
```

Tabs:

- Overview.
- Dependencies.
- Configuration.
- Organization Entitlements.
- Usage.
- Health.
- Audit Log.

### Dependency View

The dependency tab should show a graph.

Example:

```text
assessment.coding
  evaluation.llm
    evaluator.openai
```

Warnings:

- Missing dependency.
- Disabled dependency.
- Conflict with another plugin.
- Dependent plugins that will be disabled.

### Impact Preview Dialog

Before applying sensitive changes, show impact.

Example UI copy:

```text
Disable evaluation.llm?

This will also make evaluator.openai unavailable.
3 organizations currently have this plugin enabled.
8 published exams reference this plugin.
0 active attempts will be changed.

Future attempts for affected exams may be blocked until configs are updated.
```

Admin must confirm.

### Plugin Configuration

The config screen should render from backend-provided schema.

Examples:

- Coding allowed languages.
- Allow question-level language overrides.
- Judge0 timeout limits.
- LLM evaluator model.
- Manual review required.
- Proctoring tab switch threshold.

Rules:

- Frontend validates for convenience.
- Backend validates authoritatively.
- Secrets are never displayed.

### Organization Entitlements

Platform admin can configure plugin access per organization.

Example:

```text
Organization: Corporate A
Coding: Enabled
Languages: Python, Java
LLM Evaluation: Disabled
Tab Switch Proctoring: Enabled
```

Organization admins see only allowed controls when building exams.

## Frontend Component Boundaries

Target folder:

```text
frontend/plugins/
  assessment-coding/
  evaluation-testcase/
  evaluation-llm/
  evaluator-openai/
  proctoring-tab-switch/
```

Each plugin can export:

- Admin config component.
- Candidate runtime component.
- Authoring component.
- Report component.

The admin shell decides which component to render based on backend plugin state and packaged frontend registry.

## Security Rules

Frontend must not be the security boundary.

Hard rules:

- Admin routes require backend session validation.
- Plugin mutation APIs require platform admin authorization.
- UI must not expose secret values.
- Config changes must go through backend validation.
- Disable actions must use backend impact preview.
- Organization admins cannot modify platform plugin state.

## User Experience Rules

The plugin admin UI should be calm and explicit.

Recommended behavior:

- Always show why a plugin is unavailable.
- Show dependency chains before state changes.
- Avoid hiding dangerous impact behind generic confirmations.
- Show active attempts separately from future attempts.
- Make restricted state visually different from disabled.
- Make base vs addon obvious.

## Empty And Error States

Plugin catalog empty:

```text
No packaged plugins were discovered in this deployment.
```

Dependency missing:

```text
This plugin cannot be enabled because evaluation.llm is disabled.
```

Renderer missing:

```text
This plugin is installed on the backend, but this frontend build does not include its admin UI.
```

Health warning:

```text
runner.judge0 is enabled, but Judge0 is currently unreachable.
```

## Test Plan

- Non-admin users cannot open `/admin/plugins`.
- Platform admin can list plugins.
- Platform admin can view plugin details.
- Disabled dependency makes dependent plugin unavailable.
- Impact preview appears before disabling a used plugin.
- Config schema validation shows inline errors.
- Secret fields never echo stored values.
- Organization entitlements cannot exceed platform restrictions.
- Frontend does not crash when a plugin has no renderer.

## Open Decisions

- Should the admin plugin graph be a visual graph or nested tree in v1?
- Should plugin config forms be fully schema-generated or custom per plugin?
- Should organization admins get read-only visibility into dependency reasons?
- Should plugin health block enabling or only warn?
- Should plugin changes require a reason note?

