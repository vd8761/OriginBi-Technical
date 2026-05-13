# Coding Assessment Plugin

Last updated: 2026-05-11

This document describes the target shape for turning the current coding assessment into a base plugin.

## Current Reality

The current coding assessment is functional, but it is not fully plugin-native yet.

Implemented today:

- Authenticated user flow.
- Demo purchase.
- Non-expiring assignment.
- Attempt start/resume.
- Frozen backend snapshot.
- Autosave.
- Code run through Go engine and Judge0.
- Testcase execution.
- Submit.
- Heartbeat and telemetry events.

Still too hardcoded today:

- Coding-specific run endpoint.
- Language mapping.
- Judge0 execution assumptions.
- Coding question handling.
- Code file payload assumptions.
- Testcase evaluation flow.
- Candidate coding UI selection.
- Admin plugin controls are basic and not yet dependency-aware.

Target: move these responsibilities behind `assessment.coding` and related addon plugins.

## Plugin Identity

Suggested manifest identity:

```json
{
  "id": "assessment.coding",
  "slug": "assessment-coding",
  "name": "Coding Assessment",
  "type": "base",
  "category": "assessment",
  "enabledByDefault": true,
  "requires": ["runtime.exam-session"],
  "provides": [
    "assessment.type.coding",
    "question.type.code",
    "runtime.action.coding.run-custom",
    "runtime.action.coding.run-tests",
    "runtime.action.coding.submit"
  ]
}
```

## Responsibilities Owned By Coding Plugin

The coding plugin should own:

- Coding assessment registration.
- Coding section authoring schema.
- Coding question schema.
- Supported language policy.
- Starter file schema.
- Entry file selection.
- Code payload validation.
- Code answer payload schema.
- Runtime action definitions.
- Code run action request/response shapes.
- Candidate coding snapshot shape.
- Coding-specific report sections.
- Coding telemetry event names.

## Responsibilities Not Owned By Coding Plugin

The coding plugin should not own:

- User authentication.
- Session cookies.
- Tenant authorization.
- Global plugin registry.
- Generic attempt lifecycle.
- Generic telemetry storage.
- Generic assignment ownership.
- Payment provider workflow.
- Platform admin RBAC.

Those belong to the kernel or other plugins.

## Addon Plugins For Coding

### Testcase Evaluation

Suggested plugin:

```text
evaluation.testcase
```

Relationship:

```text
evaluation.testcase extends assessment.coding
```

Responsibilities:

- Testcase schema.
- Visible/hidden testcase rules.
- Judge result comparison.
- Partial score calculation.
- Testcase result report fields.

The current code treats testcase execution as part of coding. Target state should separate it as an evaluator addon that coding can use by default.

### Judge0 Runner

Suggested plugin:

```text
runner.judge0
```

Relationship:

```text
runner.judge0 provides code.runner
evaluation.testcase depends on code.runner
assessment.coding can optionally depend on code.runner for Run Code
```

Responsibilities:

- Judge0 language ID mapping.
- Base64 behavior.
- Single-file vs multi-file packaging.
- Runtime limits.
- Judge0 request/response mapping.
- Judge0 availability health check.

This prevents Judge0-specific assumptions from living directly inside the kernel.

### Manual Review

Suggested plugin:

```text
evaluation.manual-review
```

Relationship:

```text
evaluation.manual-review extends assessment.coding
```

Responsibilities:

- Reviewer assignment.
- Review queue state.
- Rubric form schema.
- Reviewer score submission.
- Pending review status.
- Review audit trail.

### LLM Evaluation

Suggested plugin:

```text
evaluation.llm
```

Relationship:

```text
evaluation.llm extends assessment.coding
```

Responsibilities:

- Generic LLM evaluation prompt contract.
- LLM rubric schema.
- Provider-agnostic request shape.
- Evaluation status lifecycle.
- Safety and retry policy.

### OpenAI Evaluator

Suggested plugin:

```text
evaluator.openai
```

Relationship:

```text
evaluator.openai extends evaluation.llm
evaluator.openai requires evaluation.llm
```

Responsibilities:

- OpenAI provider config.
- Model selection.
- Request building.
- Response parsing.
- Provider-level error handling.

Important: `evaluation.llm` is an addon to coding, but it is a base dependency for `evaluator.openai`.

### Proctoring Addons

Suggested plugins:

- `proctoring.tab-switch`
- `proctoring.fullscreen`
- `proctoring.copy-paste`
- `proctoring.devtools-detection`
- `proctoring.camera`, future only if needed

Responsibilities:

- Candidate warnings.
- Runtime event definitions.
- Violation thresholds.
- Report fields.
- Admin config form.

Coding should continue to work when these are disabled.

## Runtime Actions

Current route:

```text
POST /v1/attempts/{attempt_id}/answers/{exam_question_id}/runs
```

Target plugin action model:

```text
POST /v1/attempts/{attempt_id}/questions/{exam_question_id}/actions/coding.run-custom
POST /v1/attempts/{attempt_id}/questions/{exam_question_id}/actions/coding.run-tests
```

The current route can remain as a compatibility alias.

Action payload:

```json
{
  "language": "python",
  "files": [
    {
      "path": "solution.py",
      "content": "print('ok')"
    }
  ],
  "entryFile": "solution.py",
  "customStdin": ""
}
```

Plugin-owned validation:

- Language is enabled by entitlement.
- Entry file exists.
- File count within config.
- Source size within config.
- Path names are safe.
- Read-only files are not modified when the snapshot says they are locked.
- Action is enabled for the attempt snapshot.

## Language Policy

Language policy must be plugin config, not hardcoded.

Scopes:

- Platform default languages.
- Organization allowed languages.
- Exam allowed languages.
- Question allowed languages.
- Attempt snapshot frozen languages.

Example config:

```json
{
  "languages": {
    "defaultAllowed": ["python", "java", "cpp", "javascript", "c"],
    "allowQuestionOverride": true,
    "requireEntryFile": true
  }
}
```

## Evaluation Policy

Coding evaluation should be plugin-composed.

Examples:

```json
{
  "evaluation": {
    "methods": ["testcase"],
    "finalScorePolicy": "testcase-only"
  }
}
```

```json
{
  "evaluation": {
    "methods": ["testcase", "manual-review"],
    "finalScorePolicy": "manual-overrides-testcase",
    "holdResultUntilManualReview": true
  }
}
```

```json
{
  "evaluation": {
    "methods": ["testcase", "llm"],
    "llmProvider": "evaluator.openai",
    "finalScorePolicy": "weighted",
    "weights": {
      "testcase": 0.7,
      "llm": 0.3
    }
  }
}
```

## Snapshot Shape

Attempt snapshot should include plugin state.

Example:

```json
{
  "plugins": {
    "assessment.coding": {
      "version": "1.0.0",
      "state": "enabled",
      "config": {
        "languages": ["python"],
        "actions": ["coding.run-custom", "coding.run-tests", "coding.submit"]
      }
    },
    "evaluation.testcase": {
      "version": "1.0.0",
      "state": "enabled"
    },
    "proctoring.tab-switch": {
      "version": "1.0.0",
      "state": "disabled"
    }
  }
}
```

## Disabled Behavior

If `assessment.coding` is disabled:

- Coding is hidden from authoring.
- Coding is hidden from explore/payment for future purchases.
- New coding assignments cannot be created.
- New coding attempts cannot start.
- Active coding attempts continue only if frozen snapshot policy allows.
- Historical coding reports remain readable.

If `evaluation.testcase` is disabled:

- Coding can still collect code if another evaluation mode is enabled.
- Run Tests action disappears.
- Submit can use manual or LLM evaluation if enabled.

If `runner.judge0` is disabled:

- Run Code and Run Tests are unavailable.
- Manual review or LLM-only workflows can still accept code submissions if configured.

If `proctoring.tab-switch` is disabled:

- Coding works normally.
- Tab-switch warnings disappear.
- Tab-switch report section is omitted.

## Migration From Current Code

Target refactor sequence:

1. Introduce plugin manifest for current coding behavior.
2. Register `assessment.coding` from manifest.
3. Store effective plugin config in attempt snapshot.
4. Route current run endpoint through plugin action dispatcher.
5. Move language policy into plugin config.
6. Move Judge0 mapping into `runner.judge0`.
7. Move testcase scoring into `evaluation.testcase`.
8. Move proctoring warnings into addon plugin.
9. Make frontend render coding through plugin registry.

This should happen gradually. The current working coding flow should remain usable during the migration.

