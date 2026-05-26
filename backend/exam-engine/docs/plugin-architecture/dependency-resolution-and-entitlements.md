# Dependency Resolution And Entitlements

Last updated: 2026-05-11

This document defines how plugin dependencies and entitlements should be resolved. It is the heart of making the system work even when plugins are disabled.

## Goals

- Lower roles cannot use plugins that upper roles disabled.
- Addon plugins cannot run unless their dependencies are enabled.
- Base plugins continue working when optional addon plugins are disabled.
- Active attempts remain stable because they use frozen snapshots.
- Admins can safely understand the impact before changing plugin state.

## Inputs

Dependency resolution uses:

- Packaged plugin manifests.
- Platform plugin state.
- Organization plugin entitlement.
- Exam plugin entitlement.
- Question-level plugin entitlement.
- Frozen attempt snapshot.
- Current request context.

## Dependency Graph

Each plugin contributes graph edges.

Example:

```text
runtime.exam-session
  -> assessment.coding
       -> evaluation.testcase
       -> evaluation.manual-review
       -> evaluation.llm
            -> evaluator.openai
       -> proctoring.tab-switch
```

Suggested edge meanings:

- `A requires B`: A cannot be enabled unless B is effectively enabled.
- `A extends B`: A adds behavior to B, but B can work without A.
- `A conflicts B`: A and B cannot both be enabled in the same scope.
- `A provides capability C`: other plugins can depend on C instead of a concrete plugin.

## Enablement Resolution

Effective plugin state should be resolved top down.

Order:

1. Plugin manifest default.
2. Platform/global state.
3. Organization state.
4. Exam state.
5. Section state, if implemented.
6. Question state.
7. Attempt snapshot state.

The most restrictive upper scope wins.

Example:

```text
platform: assessment.coding enabled
organization: assessment.coding restricted, languages = ["python"]
exam: assessment.coding enabled
question: assessment.coding restricted, languages = ["python"]
effective: enabled only for python
```

If the platform state is disabled:

```text
platform: assessment.coding disabled
organization: assessment.coding enabled
effective: disabled
```

## Config Merge

Config should merge carefully. Recommended rule:

- Upper scopes define maximum allowed boundaries.
- Lower scopes choose values inside those boundaries.
- Lower scopes cannot widen upper-scope restrictions.

Example:

```json
{
  "platform": {
    "languages": ["python", "java", "cpp"]
  },
  "organization": {
    "languages": ["python", "java"]
  },
  "exam": {
    "languages": ["python"]
  },
  "effective": {
    "languages": ["python"]
  }
}
```

For booleans:

- Upper `false` should usually force effective `false`.
- Lower `true` cannot override upper `false`.

For numeric limits:

- Upper scope sets max or min.
- Lower scope must stay within range.

## Dependency Resolution Algorithm

Recommended high-level algorithm:

1. Load all packaged plugin manifests.
2. Build graph of plugin IDs and capability IDs.
3. Reject cycles for required dependencies.
4. For each requested plugin, resolve effective state at the target scope.
5. Walk required dependencies recursively.
6. If any required dependency is disabled, mark the requested plugin unavailable.
7. Walk conflicts.
8. Resolve final config.
9. Return effective plugin map and diagnostics.

Diagnostics are important. The admin UI and authoring UI should not only say "disabled"; they should explain why.

Example diagnostic:

```json
{
  "pluginId": "evaluator.openai",
  "state": "unavailable",
  "reason": "required_dependency_disabled",
  "dependency": "evaluation.llm"
}
```

## Attempt Snapshot Rules

At attempt start:

- Resolve all plugins required by the exam.
- Verify dependencies are available.
- Build the frozen plugin map.
- Store plugin ID, version, state, config, and action permissions.

During the attempt:

- Use only the frozen plugin map.
- Do not read live platform config for normal candidate actions.
- Record all plugin actions as telemetry.

After the attempt:

- Evaluation uses the frozen evaluation policy.
- Reports use the frozen report policy.

## Disabling A Plugin

Disabling must be safe and explicit.

Before disabling:

- Check dependent plugins.
- Check exams using this plugin.
- Check active attempts using this plugin.
- Check scheduled exams using this plugin.
- Check organizations entitled to this plugin.
- Show an impact plan.

Recommended behavior:

- Future authoring: plugin removed from UI.
- Future attempts: blocked if exam requires disabled plugin.
- Active attempts: continue using frozen snapshot unless explicitly cancelled.
- Completed attempts: reports stay readable.

## Addon Failure Behavior

If an addon is disabled or unavailable:

- The base plugin should still load.
- Addon actions should not be listed.
- Addon UI should not render.
- Addon config should be hidden or read-only.
- Addon telemetry should stop.
- Historical addon telemetry remains visible.

Example:

If `proctoring.tab-switch` is disabled:

- Coding assessment still starts.
- Tab-switch warnings are not shown.
- `tab_switch` telemetry is not required.
- Reports should not mark missing proctoring data as an error.

## Required Dependency Failure Behavior

If a required dependency is disabled:

- The dependent plugin becomes unavailable.
- Admin UI should show dependency reason.
- Candidate UI should not show dependent action.
- Attempt start should fail if the frozen exam requires that dependent plugin.

Example:

If `evaluation.llm` is disabled:

- `evaluator.openai` is unavailable.
- LLM score config is hidden.
- Coding testcase evaluation can still work.

## Entitlement Tables

The current schema already has the right general idea:

- `plugins`
- `platform_plugin_entitlements`
- `org_plugin_entitlements`
- `exam_plugin_entitlements`
- `exam_question_plugin_entitlements`

Future additions to consider:

- `plugin_dependencies`
- `plugin_capabilities`
- `plugin_config_versions`
- `plugin_usage_index`
- `plugin_audit_log`

These can be derived from manifests initially, then persisted for admin visibility and querying.

## Open Decisions

- Should plugin dependency graph be stored in DB, generated from manifests, or both?
- Should dependency checks run at boot only, or also at every admin state change?
- Should active attempts continue if a plugin binary is removed from the deployed service?
- Should historical report rendering require archived plugin UI bundles?
- Should organization admins be allowed to restrict addon plugins, or only platform admins?

