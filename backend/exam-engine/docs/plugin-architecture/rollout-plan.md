# Plugin Architecture Rollout Plan

Last updated: 2026-05-11

This document defines a practical migration path from the current working coding-assessment slice to the target plugin-first architecture.

No runtime code should be changed just because this document exists. Use this as the plan for a future implementation pass.

## Guiding Rules

- Preserve the current working coding flow during migration.
- Move behavior behind plugin contracts gradually.
- Do not introduce arbitrary code upload.
- Keep backend as source of truth for security.
- Keep active attempts stable with frozen snapshots.
- Make disabled addon plugins non-breaking.
- Add tests before replacing hardcoded behavior.

## Phase 0: Documentation And Agreement

Status: this documentation pass.

Deliverables:

- Define plugin vocabulary.
- Define base vs addon plugin rules.
- Define dependency examples.
- Define coding plugin target.
- Define admin portal target.
- Define frontend boundaries.
- Define migration path.

No runtime code changes.

## Phase 1: Registry Foundation

Goal: introduce a plugin registry without changing user-facing behavior.

Backend work:

- Add `internal/pluginhost`.
- Define manifest struct.
- Load packaged manifests.
- Validate manifests on boot.
- Sync manifest metadata to `plugins`.
- Add dependency graph resolver.
- Add tests for dependency graph cycles and missing dependencies.

Frontend work:

- Add frontend plugin registry types.
- Register current coding renderer statically.
- Keep existing routes and UI behavior.

Expected result:

- The system knows about plugins structurally.
- Coding still works as before.

## Phase 2: Effective Entitlement Resolver

Goal: centralize plugin state resolution.

Backend work:

- Build effective plugin resolver across platform, org, exam, question.
- Add config merge rules.
- Add dependency-aware availability diagnostics.
- Add tests for disabled upper-scope behavior.
- Add tests for restricted lower-scope behavior.

Frontend work:

- Show availability reasons in admin UI.
- Hide unavailable plugin controls based on backend response.

Expected result:

- Plugin availability is computed in one place.
- The UI can explain why a plugin is unavailable.

## Phase 3: Snapshot Plugin Map

Goal: freeze plugin config into attempts.

Backend work:

- Add plugin map to attempt snapshot.
- Store plugin IDs, versions, states, configs, and actions.
- Use snapshot plugin map for runtime checks.
- Keep current coding endpoints as compatibility aliases.

Frontend work:

- Read plugin map from snapshot.
- Render coding based on snapshot plugin state.

Expected result:

- Runtime no longer depends on live plugin config for active attempts.

## Phase 4: Coding Base Plugin

Goal: move coding behavior behind `assessment.coding`.

Backend work:

- Add `plugins/assessment-coding`.
- Move coding validation into plugin package.
- Move coding action definitions into plugin package.
- Dispatch current run and submit actions through plugin host.
- Move coding language config out of hardcoded maps.

Frontend work:

- Move coding UI files under `frontend/plugins/assessment-coding` or add adapter exports.
- Keep route compatibility.

Expected result:

- Coding is implemented as the first base assessment plugin.

## Phase 5: Runner And Evaluation Addons

Goal: split Judge0 and testcase evaluation out of core coding.

Backend work:

- Add `runner.judge0`.
- Add `evaluation.testcase`.
- Move Judge0 language mapping into runner plugin.
- Move testcase comparison and result mapping into evaluator plugin.
- Add plugin health for Judge0.

Frontend work:

- Render Run Tests only when `evaluation.testcase` is enabled.
- Render Run Code only when a code runner is enabled.

Expected result:

- Coding can exist without Judge0 if another evaluator path is configured.

## Phase 6: Proctoring Addons

Goal: make proctoring optional and plugin-owned.

Backend work:

- Add `proctoring.tab-switch`.
- Define proctoring event schema.
- Move proctoring thresholds into plugin config.
- Add reporting payload for proctoring events.

Frontend work:

- Move tab-switch watcher behind plugin component.
- Render warnings only when plugin is enabled in snapshot.

Expected result:

- Coding works whether proctoring is enabled or disabled.

## Phase 7: LLM Evaluation And OpenAI Provider

Goal: implement nested addon dependency.

Backend work:

- Add `evaluation.llm`.
- Add provider contract.
- Add `evaluator.openai`.
- Enforce `evaluator.openai requires evaluation.llm`.
- Store LLM evaluation jobs and results.
- Keep LLM separately entitled.

Frontend work:

- Admin config for LLM evaluator.
- Admin config for OpenAI provider.
- Report sections for LLM evaluation.

Expected result:

- LLM is an addon to coding.
- OpenAI evaluator is an addon/provider for LLM evaluator.

## Phase 8: Admin Plugin Portal

Goal: production-grade plugin management GUI.

Backend work:

- Add dependency impact preview API.
- Add plugin usage API.
- Add plugin audit log.
- Add secure config update endpoints.
- Enforce platform admin authorization.

Frontend work:

- Plugin catalog.
- Plugin detail.
- Dependency graph.
- Enable/disable/restrict controls.
- Config forms.
- Organization entitlement panel.
- Audit trail.

Expected result:

- Platform admins can safely manage plugins through GUI.

## Phase 9: Remove Hardcoded Paths

Goal: complete plugin-first transition.

Backend work:

- Replace hardcoded assessment dispatch with plugin action dispatch.
- Keep compatibility aliases where needed.
- Remove direct language/testcase assumptions from kernel.

Frontend work:

- Replace hardcoded assessment lists with backend-driven plugin catalog.
- Keep stable URLs for current assessments.

Expected result:

- New assessment types can be added through plugin packages and entitlements.

## Test Plan By Phase

Registry:

- Plugin manifests load.
- Missing required dependency fails validation.
- Cycles are rejected.
- Optional plugin failure does not crash service.

Entitlements:

- Platform disabled blocks org/exam enablement.
- Org restriction limits exam config.
- Question restriction cannot widen exam config.
- Dependency disabled makes dependent plugin unavailable.

Snapshots:

- Attempt snapshot stores plugin state and config.
- Live config changes do not affect active attempt.
- Disabled future plugin blocks new attempts only.

Coding plugin:

- Coding starts only when `assessment.coding` is enabled.
- Language restrictions are enforced by plugin config.
- Run Code appears only when code runner is available.
- Run Tests appears only when testcase evaluator is available.

Admin:

- Non-admin cannot access plugin management.
- Admin sees impact preview before disable.
- State changes are audited.
- Config schema validation rejects invalid config.

Frontend:

- Disabled base plugin does not appear in explore.
- Disabled addon plugin hides only addon UI.
- Unknown plugin renderer does not crash the app.

## Open Decisions

- How much of the current schema should be renamed to plugin-specific table names?
- Should plugin migrations be separate files per plugin or compiled into the main migration sequence?
- Should a plugin be removable from a deployment while historical attempts still need report rendering?
- Should addon plugins be enabled by default when their base plugin is enabled?
- Should provider plugins be scoped globally only, or can organizations bring their own credentials?

