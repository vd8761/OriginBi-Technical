# Frontend Plugin Boundaries

Last updated: 2026-05-11

This document defines the target frontend plugin architecture. It complements [backend-contract.md](backend-contract.md) and [admin-portal-and-security.md](admin-portal-and-security.md).

## Goal

The frontend should render assessment, authoring, admin, runtime, and reporting experiences based on plugin metadata and backend entitlements. It should not hardcode which assessment types exist or which controls are available.

The frontend should not decide security. It can hide unavailable controls for user experience, but the backend must enforce all permissions and plugin states.

## Proposed Frontend Folder Shape

```text
frontend/
  lib/
    plugins/
      registry.ts
      types.ts
      guards.ts
      config-renderer.tsx
  plugins/
    assessment-coding/
      manifest.ts
      CandidateRuntime.tsx
      AdminConfig.tsx
      AuthoringPanel.tsx
      ReportSection.tsx
    evaluation-testcase/
      manifest.ts
      AdminConfig.tsx
      ReportSection.tsx
    evaluation-llm/
      manifest.ts
      AdminConfig.tsx
      ReportSection.tsx
    evaluator-openai/
      manifest.ts
      AdminConfig.tsx
    proctoring-tab-switch/
      manifest.ts
      RuntimeWatcher.tsx
      AdminConfig.tsx
      ReportSection.tsx
```

The backend remains the source of truth. Frontend manifests help map plugin IDs to packaged React components.

## Frontend Plugin Manifest

Suggested shape:

```ts
export const manifest = {
  id: "assessment.coding",
  version: "1.0.0",
  slots: {
    candidateRuntime: CodingCandidateRuntime,
    adminConfig: CodingAdminConfig,
    authoringPanel: CodingAuthoringPanel,
    reportSection: CodingReportSection,
  },
};
```

The frontend manifest should not contain secrets or authoritative entitlement logic.

## Slot Model

Plugins can contribute UI to named slots.

Candidate slots:

- Explore card details.
- Pre-test gate.
- Runtime question panel.
- Runtime action toolbar.
- Runtime monitoring hooks.
- Completion summary.

Admin slots:

- Plugin config form.
- Organization entitlement form.
- Exam builder controls.
- Question editor controls.
- Dependency warning panel.
- Plugin health panel.

Reporting slots:

- Candidate report section.
- Admin analytics section.
- Organization report section.
- Audit details panel.

## Candidate Runtime

Candidate pages should be driven by the frozen attempt snapshot.

Flow:

1. Frontend loads attempt snapshot.
2. Snapshot includes enabled plugins and plugin configs.
3. Frontend registry maps plugin IDs to local components.
4. Only enabled plugin components render.
5. Candidate actions call generic backend action endpoints or compatibility aliases.

If the frontend has no renderer for a plugin:

- Show a safe unavailable message.
- Do not crash the whole exam page.
- Record a frontend error telemetry event if possible.

## Admin Runtime

Admin plugin screens should be backend-driven.

The admin UI should call:

- List plugins.
- View plugin detail.
- View dependency graph.
- Preview state change impact.
- Apply state change.
- Update config.
- View audit log.

Frontend should render config forms from schema when possible. Custom plugin admin components can improve the UI, but backend validation is still required.

## Avoiding Hardcoded Assessment Lists

Current frontend has hardcoded assessment entries. Target state should shift to:

- Backend returns available assessment plugins.
- Frontend maps plugin IDs to packaged renderers.
- Hidden or disabled plugins do not appear.
- Unknown plugin appears only as generic fallback if allowed.

Current hardcoded lists can remain temporarily during migration, but new plugin work should not add more static assessment assumptions.

## Secure UI Behavior

Frontend must not:

- Assume hidden means secure.
- Store plugin secrets in local storage.
- Trust localStorage payment/completion state for backend decisions.
- Let admin submit config that backend will not validate.
- Render plugin admin screens without backend admin authorization.

Frontend should:

- Use `ob_session` HttpOnly cookie.
- Use backend session checks.
- Respect plugin entitlement returned by backend.
- Show dependency reasons clearly.
- Avoid crashing when a plugin is disabled.

## Disabled Plugin UI Behavior

If a base assessment plugin is disabled:

- Hide from explore and authoring.
- Show "Unavailable" only when navigating to a stale link.
- Do not allow payment or attempt start.

If an addon plugin is disabled:

- Hide addon controls.
- Keep base plugin runtime usable.
- Omit addon report sections.
- Do not show false errors for missing addon data.

## Example: Coding With Testcase But No Proctoring

Snapshot:

```json
{
  "plugins": {
    "assessment.coding": { "state": "enabled" },
    "evaluation.testcase": { "state": "enabled" },
    "proctoring.tab-switch": { "state": "disabled" }
  }
}
```

Frontend behavior:

- Render coding editor.
- Render Run Tests.
- Do not render tab-switch warning banner.
- Do not submit tab-switch events.
- Do not show proctoring report section.

## Example: Missing Frontend Renderer

Snapshot:

```json
{
  "plugins": {
    "assessment.sql": { "state": "enabled" }
  }
}
```

But frontend has no `assessment.sql` renderer.

Expected behavior:

- Candidate should not enter the attempt if the platform cannot render it.
- Admin preview should warn that frontend support is missing.
- Backend can still keep the plugin registered for future deployments.

## Open Decisions

- Should frontend plugin manifests be generated from backend manifests?
- Should plugin UI components be statically imported or dynamically imported?
- Should unknown plugin renderers block exam start?
- How should historical reports render if the frontend plugin is removed?
- Should organization admins see plugin health or only platform admins?

