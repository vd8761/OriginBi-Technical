# Plugin Model

Last updated: 2026-05-11

This document defines the plugin vocabulary and product model for the Exam Portal. It is the conceptual foundation for the backend and frontend implementation docs in this folder.

## Goal

The platform should support plug-and-play assessment capabilities. A disabled plugin should not break the whole system. It should only remove or restrict the behavior, UI, authoring controls, runtime actions, scoring logic, and reporting fields owned by that plugin.

The current coding assessment should eventually become a plugin rather than a hardcoded special case.

## What A Plugin Is

A plugin is a packaged capability that can contribute one or more of these things:

- Assessment type.
- Question type.
- Section settings.
- Runtime behavior.
- Candidate UI.
- Admin configuration UI.
- Validation rules.
- Scoring rules.
- Evaluation workflow.
- Proctoring behavior.
- Monitoring events.
- Report sections.
- Billing or entitlement rules.
- Integration with an external provider.

Plugins are enabled and configured through the platform plugin registry and entitlement cascade.

## Platform Kernel

Some behavior cannot be a plugin because plugins need a trusted runtime envelope. This is the platform kernel.

Kernel-owned behavior:

- User authentication.
- Session validation.
- Tenant boundary enforcement.
- Admin authorization.
- Plugin registry loading.
- Plugin dependency graph resolution.
- Plugin enablement checks.
- Exam assignment ownership checks.
- Attempt lifecycle state machine.
- Frozen snapshot creation and loading.
- Transaction commit and rollback.
- Audit envelope.
- Telemetry envelope.
- Secure routing and origin checks.

The kernel should know that plugins exist, but it should avoid knowing assessment-specific business logic.

## Plugin Types

### Base Plugin

A base plugin provides a capability that other plugins can depend on.

Base plugins can be enabled by default or required by platform policy. A base plugin can still be disabled if no active dependency or policy prevents it.

Examples:

- `assessment.coding`
- `assessment.mcq`
- `runtime.exam-session`
- `evaluation.llm`
- `proctoring.core`

Important nuance:

A plugin can be an addon in one relationship and a base plugin in another relationship.

Example:

```text
assessment.coding
  depends on: runtime.exam-session

evaluation.llm
  addon for: assessment.coding
  depends on: assessment.coding

evaluator.openai
  addon for: evaluation.llm
  depends on: evaluation.llm
```

In this chain, `evaluation.llm` is an addon to coding, but it is a base dependency for `evaluator.openai`.

### Addon Plugin

An addon plugin improves, extends, or modifies behavior supplied by another plugin.

Addon plugins must be optional from the platform perspective. If an addon is disabled, the base flow should still work unless a specific exam snapshot requires that addon.

Examples:

- `proctoring.tab-switch`
- `proctoring.fullscreen`
- `proctoring.copy-paste-detection`
- `evaluation.testcase`
- `evaluation.manual-review`
- `evaluation.llm`
- `evaluator.openai`
- `reporting.code-quality`
- `billing.coupon`

## Plugin Dependency Kinds

Dependencies should be explicit in the plugin manifest.

Suggested dependency kinds:

- `required`: plugin cannot be enabled or used unless dependency is enabled.
- `optional`: plugin can use another plugin if present, but still works without it.
- `conflicts`: plugin cannot be enabled with another plugin in the same scope.
- `extends`: plugin contributes behavior to another plugin.
- `provider`: plugin implements a provider contract for another plugin.

Example:

```json
{
  "id": "evaluator.openai",
  "type": "addon",
  "extends": ["evaluation.llm"],
  "requires": ["evaluation.llm"],
  "provides": ["llm.provider"]
}
```

## Plugin States

The schema already models plugin entitlement states as:

- `disabled`
- `enabled`
- `restricted`

Recommended meaning:

- `disabled`: plugin cannot be selected, configured, invoked, scored, or shown except in historical reports.
- `enabled`: plugin is available with default or configured behavior.
- `restricted`: plugin is available only under configured conditions.

Examples of restricted conditions:

- Allowed languages: `["python", "java"]`.
- Allowed evaluator modes: `["testcase", "manual"]`.
- Proctoring disabled for practice exams.
- LLM evaluator enabled only for specific organizations.
- OpenAI evaluator enabled only for admin-published exams.

## Scope Levels

Plugin state can be resolved at multiple levels:

1. Platform global registry.
2. Organization entitlement.
3. Exam configuration.
4. Exam section configuration.
5. Question-level override.
6. Attempt snapshot.

The final runtime decision must use the frozen attempt snapshot, not live config.

## Plugin State Rules

The platform should follow these rules:

- Lower scopes cannot enable a plugin that an upper scope disabled.
- Lower scopes can further restrict an enabled plugin if policy allows.
- Runtime attempts use frozen plugin state captured at start.
- Disabling a plugin affects future attempts, not active attempts.
- Active attempts can only be cancelled or force-changed by explicit admin action.
- Historical reports remain readable even when the plugin is later disabled.

## What Must Not Be Hardcoded

Over time, these should move out of direct platform logic:

- Coding language IDs.
- Judge0 language mappings.
- Coding file validation.
- Testcase execution behavior.
- MCQ scoring rules.
- Negative marking logic.
- Proctoring event definitions.
- LLM evaluation provider selection.
- Manual review workflow.
- Candidate report sections.
- Admin config forms.

The kernel can enforce that a plugin action is valid and allowed. The plugin should own what that action means.

## Examples

### Coding Without Addons

Enabled:

- `assessment.coding`
- `evaluation.testcase`

Disabled:

- `evaluation.llm`
- `proctoring.tab-switch`

Expected behavior:

- Candidate can take coding assessment.
- Candidate can run tests.
- No LLM score is shown.
- No tab-switch warning is shown.

### Coding With Proctoring Addon

Enabled:

- `assessment.coding`
- `evaluation.testcase`
- `proctoring.tab-switch`

Expected behavior:

- Candidate can take coding assessment.
- Tab switches are recorded.
- Reports include tab-switch events.
- If `proctoring.tab-switch` is later disabled, coding still works.

### OpenAI Evaluator

Enabled:

- `assessment.coding`
- `evaluation.llm`
- `evaluator.openai`

Expected behavior:

- Coding attempts can request LLM evaluation.
- The LLM evaluator routes provider calls through the OpenAI evaluator plugin.
- If `evaluation.llm` is disabled, `evaluator.openai` must also become unavailable.

