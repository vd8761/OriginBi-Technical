# Backend Plugin Contract

Last updated: 2026-05-11

This document defines the target backend structure for plugin packages in the Go exam engine. It is a design document only; it does not describe the current code as fully implemented.

## Goal

The Go engine should become a plugin host for exam runtime behavior. The engine should not hardcode assessment behavior such as coding language policy, testcase execution rules, or evaluator selection. Instead, it should route lifecycle events and runtime actions through registered plugins.

## Proposed Backend Folder Shape

```text
backend/exam-engine/
  internal/
    pluginhost/
      registry.go
      manifest.go
      dependencies.go
      entitlements.go
      dispatcher.go
      schemas.go
  plugins/
    assessment-coding/
      plugin.json
      plugin.go
      runtime.go
      authoring.go
      evaluation.go
      reporting.go
      migrations/
    evaluation-testcase/
      plugin.json
      plugin.go
    evaluation-llm/
      plugin.json
      plugin.go
    evaluator-openai/
      plugin.json
      plugin.go
    proctoring-tab-switch/
      plugin.json
      plugin.go
```

The exact package names can change, but plugin code should live in a dedicated `plugins/` folder so ownership is visible and future plugin packages are easy to add or remove.

## Plugin Manifest

Each backend plugin should have a manifest. The manifest is data, not executable code.

Suggested fields:

```json
{
  "id": "assessment.coding",
  "slug": "assessment-coding",
  "name": "Coding Assessment",
  "version": "1.0.0",
  "type": "base",
  "category": "assessment",
  "enabledByDefault": true,
  "requiresLicense": false,
  "requires": ["runtime.exam-session"],
  "extends": [],
  "provides": [
    "assessment.type",
    "question.type.code",
    "runtime.action.run-code",
    "runtime.action.submit-code"
  ],
  "configSchemaRef": "schemas/config.schema.json",
  "snapshotSchemaRef": "schemas/snapshot.schema.json",
  "answerSchemaRef": "schemas/answer.schema.json",
  "events": [
    "code.run.started",
    "code.run.completed",
    "code.submitted"
  ]
}
```

Manifest rules:

- `id` is stable and should not be renamed.
- `version` should follow semantic versioning for plugin contract changes.
- `type` is `base` or `addon`.
- `requires` lists required dependencies.
- `extends` lists the plugin or capability being extended.
- `provides` lists capabilities other plugins can depend on.
- Schema refs point to files packaged with the plugin.

## Plugin Registration

At boot, the engine should:

1. Load compiled plugin packages.
2. Load each plugin manifest.
3. Validate manifest shape.
4. Register plugin ID and provided capabilities.
5. Check dependency graph for missing dependencies and cycles.
6. Sync manifest metadata into the `plugins` database table.
7. Expose registry state through admin APIs.

The engine should fail fast only for invalid built-in base plugins that the platform itself requires. Optional plugin load failures should mark that plugin unhealthy and unavailable without bringing down the whole service.

## Runtime Interfaces

Suggested Go interfaces. These are conceptual and can be split for clean package boundaries.

```go
type Plugin interface {
    Manifest() Manifest
}

type RuntimePlugin interface {
    Plugin
    OnAttemptStart(ctx Context, input AttemptStartInput) (AttemptStartOutput, error)
    OnSnapshotBuild(ctx Context, input SnapshotInput) (SnapshotOutput, error)
    OnAnswerSave(ctx Context, input AnswerSaveInput) (AnswerSaveOutput, error)
    OnSubmit(ctx Context, input SubmitInput) (SubmitOutput, error)
}

type ActionPlugin interface {
    Plugin
    Actions() []ActionDefinition
    HandleAction(ctx Context, action ActionRequest) (ActionResponse, error)
}

type EvaluationPlugin interface {
    Plugin
    Evaluate(ctx Context, input EvaluationInput) (EvaluationOutput, error)
}

type ProctoringPlugin interface {
    Plugin
    AcceptEvent(ctx Context, input ProctoringEventInput) (ProctoringEventOutput, error)
}
```

The kernel should provide the context, authorization, transaction, snapshot, and entitlement information. The plugin should provide domain behavior.

## Action Dispatch

Runtime actions should be generic at the kernel level.

Instead of hardcoding:

```text
POST /v1/attempts/{attempt_id}/answers/{exam_question_id}/runs
```

Target model:

```text
POST /v1/attempts/{attempt_id}/questions/{exam_question_id}/actions/{action}
```

Example action IDs:

- `coding.run-custom`
- `coding.run-tests`
- `coding.submit`
- `mcq.select-option`
- `proctoring.record-tab-switch`
- `llm.evaluate`

Compatibility note:

Existing endpoints can remain as stable public aliases while internally dispatching to plugin actions.

## Persistence Rules

The kernel owns transactions and shared tables. Plugins can own payload schemas and plugin-specific tables.

Shared kernel tables:

- `plugins`
- `platform_plugin_entitlements`
- `org_plugin_entitlements`
- `exam_plugin_entitlements`
- `exam_question_plugin_entitlements`
- `exam_versions`
- `exam_sections`
- `exam_questions`
- `attempts`
- `attempt_question_state`
- `answers`
- `attempt_events`
- `evaluations`
- `result_publications`

Plugin-specific tables can exist when generic JSON payloads are not enough.

Examples:

- `coding_code_submissions`
- `coding_code_runs`
- `coding_code_run_test_results`
- `llm_evaluation_requests`
- `proctoring_session_flags`

The current schema has generic `code_submissions`, `code_runs`, and `code_run_test_results`. In the plugin target state, those can remain but should be owned by the coding/testcase plugins conceptually.

## Schema Validation

Plugins should define JSON Schemas for:

- Authoring config.
- Exam config.
- Question config.
- Attempt snapshot payload.
- Answer payload.
- Action request payload.
- Action response payload.
- Report payload.

The kernel should validate:

- Required plugin exists.
- Plugin is enabled in the resolved scope.
- Payload matches the plugin schema.
- Payload size limits.
- The caller has permission.

The plugin should validate:

- Domain-specific rules.
- Language policy.
- Testcase rules.
- Evaluation mode compatibility.
- Provider-specific constraints.

## Frozen Snapshot Contract

At attempt start, plugin state must be frozen into the attempt snapshot.

Snapshot should include:

- Plugin IDs.
- Plugin versions.
- Effective config.
- Enabled actions.
- Runtime constraints.
- Question payload versions.
- Scoring policy.
- Evaluation policy.

Runtime should never read live plugin config for an active attempt unless the action is explicitly designed as an admin override.

## Safe Disabled Behavior

If a plugin is disabled globally:

- It should not appear in authoring.
- New exams cannot use it.
- New attempts cannot start if their frozen exam requires it.
- Active attempts already using it continue with their frozen snapshot unless an admin cancels them.
- Reports for historical attempts still render through archival plugin metadata or a fallback renderer.

If an addon plugin is disabled:

- The base plugin still works.
- Addon actions disappear.
- Addon UI disappears.
- Addon evaluation/report sections are omitted or shown as unavailable.

## Admin APIs

Target admin APIs:

```text
GET  /v1/admin/plugins
GET  /v1/admin/plugins/{plugin_id}
PUT  /v1/admin/plugins/{plugin_id}/state
PUT  /v1/admin/plugins/{plugin_id}/config
GET  /v1/admin/plugins/{plugin_id}/dependents
GET  /v1/admin/plugins/{plugin_id}/usage
POST /v1/admin/plugins/resolve-plan
POST /v1/admin/plugins/apply-plan
```

The `resolve-plan` endpoint should return the dependency and impact plan before applying changes.

Example:

```json
{
  "requested": {
    "pluginId": "evaluation.llm",
    "state": "disabled"
  },
  "impact": {
    "alsoDisabled": ["evaluator.openai"],
    "blockedExams": 2,
    "activeAttemptsAffected": 0,
    "historicalReportsRemainReadable": true
  }
}
```

## No Arbitrary Code Uploads

The admin portal should not allow admins to upload server executable plugin code in v1.

Allowed:

- Enable packaged plugins.
- Disable packaged plugins.
- Restrict plugins.
- Configure plugin settings.
- Assign plugin entitlements to organizations.

Not allowed in v1:

- Upload Go code.
- Upload Node code.
- Upload arbitrary scripts.
- Evaluate admin-provided code on the server.

