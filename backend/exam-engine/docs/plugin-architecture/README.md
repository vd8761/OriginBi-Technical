# Plugin Architecture Documentation

Last updated: 2026-05-11

This folder documents the desired plugin-first direction for the OriginBI Exam Portal. It is intentionally high level and implementation-oriented, but it does not change the current runtime code. Use this folder as continuation context before starting a plugin refactor.

The existing product principle remains:

- Every assessment capability should be plugin based.
- Corporate and college tenants share the same tenant model in v1.
- Live attempts must use frozen snapshots.
- LLM evaluation stays separately entitled.
- The platform must continue working when optional plugins are disabled.

The current implementation is not fully plugin-native yet. The coding assessment works as an early slice, but several coding behaviors are still implemented directly in the Go engine and frontend. The goal of this documentation set is to define the target shape before any code is moved.

## Document Map

- [plugin-model.md](plugin-model.md)  
  Defines platform kernel, base plugins, addon plugins, dependency chains, plugin states, and what "plugin based" should mean in this system.

- [backend-contract.md](backend-contract.md)  
  Defines the backend plugin package layout, manifest shape, runtime contracts, API/action dispatch model, storage rules, and how to avoid hardcoded assessment behavior.

- [dependency-resolution-and-entitlements.md](dependency-resolution-and-entitlements.md)  
  Defines dependency resolution, enable/disable behavior, entitlement cascade, tenant/exam/question overrides, and safe behavior when plugins are unavailable.

- [coding-assessment-plugin.md](coding-assessment-plugin.md)  
  Defines how the current coding assessment should become a base plugin, which responsibilities it owns, and which addon plugins can extend it.

- [admin-portal-and-security.md](admin-portal-and-security.md)  
  Defines the admin plugin management portal, secure operations, audit trail, dependency warnings, and production safety rules.

- [frontend-plugin-boundaries.md](frontend-plugin-boundaries.md)  
  Defines how frontend plugin modules should be packaged, discovered, rendered, and safely controlled by backend entitlements.

- [rollout-plan.md](rollout-plan.md)  
  Defines a staged migration path from the current hardcoded coding slice to the target plugin-first architecture.

## Source Of Truth Links

- Current backend schema source: [../database-plan.md](../database-plan.md)
- Current backend status: [../implementation-status-and-next-steps.md](../implementation-status-and-next-steps.md)
- Current frontend status: [../../../../frontend/docs/exam-portal-status-and-next-steps.md](../../../../frontend/docs/exam-portal-status-and-next-steps.md)
- Frontend admin plugin plan: [../../../../frontend/docs/plugin-admin-portal-plan.md](../../../../frontend/docs/plugin-admin-portal-plan.md)
- Judge0 service status: [../../../judge0/docs/service-status-and-next-steps.md](../../../judge0/docs/service-status-and-next-steps.md)

## Important Boundary

The system should be plugin based, but it should not make everything dynamically executable at runtime.

For production safety, the target model is:

- Plugin code is packaged in known backend/frontend folders.
- Plugin manifests describe capabilities, dependencies, config schema, and extension points.
- The database stores enablement, entitlement, and configuration state.
- Admins can enable, disable, restrict, and configure plugins.
- Admins cannot upload arbitrary server code through the GUI.

This gives plug-and-play product behavior without turning the admin panel into a remote code execution surface.

## Non-Plugin Platform Kernel

A tiny kernel remains outside the plugin system. This is required so plugins have something stable to run on.

Kernel-owned responsibilities:

- Identity and session validation.
- Platform admin authorization.
- Tenant and organization boundary checks.
- Plugin registry loading.
- Dependency resolution.
- Entitlement resolution.
- Exam and attempt lifecycle envelope.
- Frozen snapshot lifecycle.
- Transaction boundaries.
- Audit and telemetry envelope.
- Secure API routing.

Everything else should be pushed into plugin-owned contracts over time.

