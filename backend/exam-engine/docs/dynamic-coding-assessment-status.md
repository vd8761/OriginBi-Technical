# Dynamic Coding Assessment — Implementation Status & Forward Plan

**Last updated:** 2026-05-13
**Owner:** in-flight; pick up here.
**Related design docs:** [plugin-architecture/README.md](plugin-architecture/README.md), [plugin-architecture/coding-assessment-plugin.md](plugin-architecture/coding-assessment-plugin.md), [plugin-architecture/rollout-plan.md](plugin-architecture/rollout-plan.md), [database-plan.md](database-plan.md).

This doc is a single-file handoff. Read top-to-bottom: rationale → what shipped → what's next. Everything you need to continue is here, including file paths, UUIDs, slug names, error codes, and verification recipes.

---

## 1. Why we're doing this

The coding assessment in `backend/exam-engine` runs end-to-end today (login → demo purchase → assignment → attempt start → autosave → Judge0 run/test → submit → score). But five hardcoded ribs block the product from growing past its current single-exam, five-language form:

1. **Questions are seeded via SQL.** `internal/migrate/sql/011_coding_question_payloads_and_final_tests.sql` writes `question_versions.body` directly for the five seeded problems. Authoring a new question means writing a migration. Admins cannot add or edit questions through any UI.
2. **Judge0 language IDs are hardcoded in Go.** `internal/server/code_run_handlers.go:670–693` maps `python→71, java→62, cpp→54, c→50, javascript→63, multi-file→89`. Supporting Go, Rust, Ruby, or C# requires a code change and redeploy.
3. **The purchasable-language whitelist is hardcoded.** `internal/server/purchase_handlers.go:237–243` (`isCodingItemRef`) has a literal `switch` over `coding:python|java|cpp|javascript|c`. Pricing a new language requires editing the binary.
4. **The "coding assessment" is not a real plugin.** Plugin tables and entitlement cascade existed (`plugins`, `platform_plugin_entitlements`, `org_plugin_entitlements`, `exam_plugin_entitlements`, `exam_question_plugin_entitlements`) but the engine ignored them — every coding behavior lived directly in handlers.
5. **Question body shape was informal.** Seeded bodies mixed `{prompt: "<code>nums</code>"}` (HTML) with richer `{starterCode, starterFiles, entryFile}` blocks. There was no schema, no markdown rendering hint, and no support for region-level read-only locks inside a file.

**The fix is plugin-first**, matching the existing `docs/plugin-architecture/` design:

- Every coding capability becomes a plugin row with a manifest in the `plugins` table.
- Each programming language is its own addon plugin under `assessment.coding` (`language.python`, `language.java`, …). Runtime config (Judge0 ID, time/memory/stack limits, file extension, multi-file support, monaco mapping) lives in `plugins.schema` JSONB on that row.
- Pricing rows (`pricing_items`) point at a language plugin via FK. The same `purchases` row that today says "this user paid 199 INR for `coding:python`" now authoritatively grants access to `language.python`.
- Adding a new language is admin work: insert a `plugins` row, optionally add a `pricing_items` row, optionally seed starter content. **No code change. No redeploy.**

The user's central requirement — *"the language is like a plugin; coding assessment's child are plugins; user gets only what they paid"* — is implemented as `language.* extends assessment.coding`, with user entitlement resolved as `purchases ∪ org_plugin_entitlements ∪ free-tier` intersected with `platform_plugin_entitlements`.

---

## 2. End-state target

When all eight phases land, the platform behaves like this:

### Admin

- `/admin/coding` — list/create/edit/delete coding questions through a 5-tab editor (Problem / Test Cases / Languages & Starter / Limits & Judge / Settings). Bulk import via CSV/JSON.
- `/admin/plugins/languages` — list every `language.*` plugin; edit its Judge0 ID, time/memory/output limits, file extension, multi-file support, monaco mapping. Add a new language plugin row through the UI.
- `/admin/plugins/[id]` — generic plugin detail with dependency view, configuration, organization entitlements, impact-preview before disabling.
- `/admin/exam-packages` — create per-language exam packages with price, allowed languages (multi-select of `language.*` plugins), proctoring config, duration.
- `/admin/users/[id]/entitlements` — support tool showing every language plugin a user can access and the source (`purchase` / `org` / `free-tier`).

### Candidate

- Lands on `/explore`, sees exams; for each, the language picker is the intersection of `org entitlement ∩ exam_section.config.languages ∩ question.allowedLanguages ∩ user entitlement`.
- Pays for `language.python` once → can take any coding exam that allows Python.
- Question statement is rendered from markdown by default (HTML/plain still supported for legacy seeds).
- Starter files include read-only files and **locked regions** (line ranges that Monaco refuses to edit and the backend re-validates on every run/submit; structured `LOCKED_REGION_MODIFIED` error with `startLine`/`endLine`/`reason`).
- Per-test-case partial-credit scoring: `score = max_score × Σ(passed_weight) / Σ(total_weight)`. Negative marking honored from `question_versions.is_negative_marked` / `negative_score`.

### Operator

- `GET /v1/admin/judge0/health` enumerates every `language.*` plugin and cross-checks `schema.judge0LanguageId` against Judge0's `/languages`. Admins see drift before candidates do.
- Plugin admin actions are audited (`evaluations` table already carries the LLM scaffolding; an `audit_log` is a deferred concern).

---

## 3. Architecture map

### Plugin tree

```
runtime.exam-session            (kernel; not a plugin row)
assessment.coding               (base, category=assessment)
├── runner.judge0               (addon, provides code.runner)
├── evaluation.testcase         (addon, requires assessment.coding + code.runner)
├── evaluation.manual-review    (addon, scaffold only)
├── evaluation.llm              (addon, scaffold only — separately entitled)
│   ├── evaluator.openai        (addon-of-addon, scaffold only)
│   └── evaluator.anthropic     (addon-of-addon, scaffold only)
├── language.python             (addon, extends assessment.coding, requires code.runner)
├── language.java
├── language.cpp
├── language.c
├── language.javascript
└── language.go                 (added without a code change — proof of concept)
```

### Tables touched (all already existed; we enriched them)

| Table | What it does | New columns |
|---|---|---|
| `plugins` | One row per installed plugin. Manifest fields. | `plugin_type`, `category`, `requires`, `extends`, `provides` (migration 012) |
| `platform_plugin_entitlements` | Global enable/disable/restrict + config. | — |
| `org_plugin_entitlements` | Per-org override; can further restrict an enabled plugin. | — |
| `exam_plugin_entitlements` | Per-exam-version override. | — |
| `exam_question_plugin_entitlements` | Per-question override. | — |
| `pricing_items` | Purchasable items (`item_kind='coding_language'`, `item_ref='coding:python'`). | `plugin_id` FK to `plugins` (012) |
| `purchases` | User paid for a `pricing_items` row. | — |
| `exam_assignments` | Pins a user to an exam version + a language (`assignment_ref='coding:python'`) + a `purchase_id`. | — (already added in 009) |
| `questions` / `question_versions` | Question catalog + frozen bodies. `body` is JSONB. | — |
| `question_test_cases` | Per-version test cases. Has `weight`, `comparator`, `is_sample`, `is_hidden`. | — |
| `code_submissions` / `code_submission_files` | Candidate's submission, per-file. `is_read_only` already there. | `locked_regions JSONB` (013) for region-lock audit |
| `code_runs` / `code_run_test_results` | Judge0 outcomes. | — |
| `evaluations` | Auto/manual/LLM evaluation rows. Has `llm_model`, `llm_input_tokens`, `llm_cost_usd`, etc. | — (no new LLM table) |

### Entitlement resolution

When a candidate hits "Run Code" with `language=python`:

```
1. Resolve language plugin slug from 'python' → 'language.python' via runner.judge0 lookup.
2. Check user entitlement:
     UserLanguagePlugins(userID) = ⋃(
       purchases JOIN pricing_items.plugin_id WHERE plugin.category='language',
       organization_members JOIN org_plugin_entitlements WHERE state='enabled' AND plugin.category='language',
       free-tier: plugins WHERE category='language' AND enabled_by_default AND NOT requires_license,
     ) ∖ platform_plugin_entitlements WHERE state='disabled'
3. Verify language.python ∈ UserLanguagePlugins; otherwise 403 LANGUAGE_NOT_ENTITLED.
4. Verify language.python ∈ exam_section.config.languages.
5. Verify language.python ∈ question.body.allowedLanguages (or omitted = inherit).
6. Dispatch action coding.run-tests (or run-custom) via pluginhost.Registry.Dispatch.
7. assessment.coding.runtime.ValidateAnswer enforces snapshot lock rules.
8. runner.judge0 builds the Judge0 payload from language.python.schema.
9. evaluation.testcase scores partial credit.
```

Live config changes don't affect active attempts: the per-attempt language is pinned by `exam_assignments.assignment_ref` (the purchased language) and the question body is frozen in `question_versions.body` from the moment the attempt started.

---

## 4. What's shipped — Phases 1–4

### Phase 1 — Migration 012: plugin catalog enrichment + language plugins + pricing FK ✅

**File:** [internal/migrate/sql/012_language_plugins_and_categories.sql](../internal/migrate/sql/012_language_plugins_and_categories.sql)

Marked `-- +goose NO TRANSACTION` because `ALTER TYPE plugin_kind ADD VALUE` can't have its new value used in the same transaction. Every statement is idempotent (IF NOT EXISTS / ON CONFLICT / conditional UPDATE) so partial reruns are safe.

What it changes:

- `plugin_kind` enum: adds `'language'` and `'runner'`.
- `plugins`: adds `plugin_type TEXT`, `category TEXT`, `requires JSONB`, `extends JSONB`, `provides JSONB` + `plugins_category_idx`.
- `pricing_items`: adds `plugin_id UUID REFERENCES plugins(id)` + `pricing_items_plugin_idx`.
- **Repurposes existing seeded UUIDs in-place** so every foreign key from `exam_sections.plugin_id`, `questions.plugin_id`, etc. keeps working:

  | UUID `…0000XX` | Was | Now |
  |---|---|---|
  | `0013` | `code.judge0` | **`assessment.coding`** (base, category=assessment) |
  | `0020` | `auto.testcases` | **`evaluation.testcase`** (addon) |
  | `0021` | `manual.review` | **`evaluation.manual-review`** (addon) |
  | `0022` | `llm.openai` | **`evaluator.openai`** (addon) |
  | `0023` | `llm.anthropic` | **`evaluator.anthropic`** (addon) |

- **New rows** added with fresh UUIDs:

  | UUID | Slug | Notes |
  |---|---|---|
  | `…0080` | `runner.judge0` | `provides: ["code.runner"]`. Schema carries Judge0 base URL + global defaults. |
  | `…0081` | `evaluation.llm` | Base for LLM evaluators. `requires_license=true`, `enabled_by_default=false`. |
  | `…0090` | `language.python` | Judge0 71, 3000 ms, 128 MB, multi-file. |
  | `…0091` | `language.java` | Judge0 62, 5000 ms, 256 MB, multi-file. |
  | `…0092` | `language.cpp` | Judge0 54, 3000 ms, 128 MB, multi-file. C++20, `-O2 -std=c++20`. |
  | `…0093` | `language.c` | Judge0 50, 3000 ms, 128 MB, **single file only**. C11, `-O2 -std=c11`. |
  | `…0094` | `language.javascript` | Judge0 63, 3000 ms, 128 MB, multi-file. |
  | `…0095` | `language.go` | Judge0 95, 3000 ms, 128 MB. **Demonstrates "no-code-change" language addition.** |

- Each `language.*` row's `schema` JSONB is the LanguageConfig: `displayName`, `judge0LanguageId`, `fileExtension`, `defaultEntryFile`, `compileFlags`, `timeLimitMs`, `memoryLimitKb`, `stackLimitKb`, `processesLimit`, `outputLimitKb`, `supportsMultiFile`, `monacoLanguageId`, `icon`, `legacyItemRef` (back-pointer to `coding:python` etc.).
- `pricing_items.plugin_id` backfilled from `item_ref`: `coding:python → …0090`, `coding:java → …0091`, etc.
- `-- +goose Down` reverses every change. Caveat: Postgres can't drop enum values; `language` and `runner` remain on `plugin_kind` after a revert (harmless).

**Test guard:** [db_ready_test.go](../internal/migrate/db_ready_test.go) — required goose version bumped 11 → 12. Asserts all 6 language plugins exist with `category='language'`, asserts UUID `…0013` is now slug `assessment.coding`, asserts the 5 `coding:*` pricing rows are JOIN-linked to language plugins.

### Phase 2 — Plugin host package ✅

**Folder:** [internal/pluginhost/](../internal/pluginhost/)

Five files, all production. No external deps beyond what was already in `go.mod`.

| File | Purpose |
|---|---|
| `manifest.go` | `Manifest` struct (mirrors a `plugins` row); `PluginType` and `Category` typed enums; `LanguageConfig` typed view of `Manifest.Schema` for `category='language'` plugins. `Manifest.IsLanguage()`, `Manifest.DecodeLanguageConfig()` helpers. |
| `registry.go` | `Registry` struct (in-process cache, RWMutex). `Bootstrap(ctx, pool, logger, opts)` reads every `plugins` row, runs dep graph validation, fails only if a slug in `opts.BlockingSlugs` is broken (production: `{"assessment.coding": true}`). `Reload(ctx)` for admin-triggered refresh. Lookups: `BySlug`, `ByID`, `ByCategory`, `All` (dep order). |
| `dependencies.go` | DFS-based topological resolver. Detects `missing-require`, `missing-extends`, `cycle` errors. `FilterErrorsBlocking` separates fatal-on-boot errors from warnings. Deterministic order (slug-alphabetical tiebreak). |
| `entitlements.go` | The user-language resolver per the plan. `UserLanguagePlugins(ctx, userID) []LanguageEntitlement` — union of purchases, org entitlements, free-tier; intersected with platform availability. `IsLanguageEntitledForUser`, `LanguagePluginByItemRef`, `IsPurchasableLanguagePlugin` (drop-in replacement for the hardcoded `isCodingItemRef`). |
| `dispatcher.go` | `RegisterAction(slug, action, handler)` + `Dispatch(ctx, ActionRequest)`. Collision detection (`ErrActionConflict`), unknown-action handling (`ErrActionUnknown`). Separate `sync.RWMutex` from the manifest cache so hot dispatch doesn't contend with admin Reloads. |

**Wiring** ([cmd/server/main.go](../cmd/server/main.go)): `pluginhost.Bootstrap` runs after pool open, before HTTP listen. Failure on `assessment.coding` is fatal; other plugin warnings are logged.

**Server integration** ([internal/server/server.go](../internal/server/server.go)): `plugins *pluginhost.Registry` field + `AttachPluginRegistry(r)` setter — additive, no breaking change to `server.New(pool, logger, verifier, defaultOrgID)`.

**Tests:** [internal/pluginhost/dependencies_test.go](../internal/pluginhost/dependencies_test.go) — 5 unit tests (happy path, missing require, cycle detection, deterministic ordering, blocking filter). All pass.

### Phase 3 — Migration 013 + `assessment.coding` plugin package ✅

**Migration:** [internal/migrate/sql/013_question_body_polish.sql](../internal/migrate/sql/013_question_body_polish.sql)

- `code_submission_files.locked_regions JSONB` for region-lock audit at submission time.
- Idempotent `UPDATE question_versions SET body = jsonb_set(body, '{promptFormat}', '"html"', true) WHERE body ? 'prompt' AND NOT body ? 'promptFormat'` — stamps the existing 5 seeded bodies as HTML so the candidate renderer can dispatch. New authoring defaults to `"markdown"`.
- Test guard bumped to 13, new assertions for both effects.

**Plugin package:** [plugins/assessment-coding/](../plugins/assessment-coding/)

- `plugin.json` — full manifest mirror of migration 012's row.
- `schemas/config.schema.json` — per-scope plugin config schema (allowed languages, action toggles, size limits).
- `schemas/question-body.schema.json` — **authoritative question body shape**:
  - `promptFormat: "markdown" | "html" | "plain"`
  - `allowedLanguages: ["language.python", ...]` (plugin slugs, not legacy `coding:python` strings)
  - `entryFile: {python: "solution.py", ...}`
  - `starterCode: {python: "..."}` (legacy single-file shorthand; kept for round-trip)
  - `starterFiles: {python: [{path, content, readOnly?, lockedRegions?: [{startLine, endLine, reason?}], language?}]}` (multi-file aware, file + region locks)
  - `samples[]`, `constraints`, `hints[].afterFailures`, `judgeConfig` (per-question overrides)
  - `image`, `media`, `pretext` passthrough for round-trip with seeded bodies
- `schemas/answer.schema.json` — candidate submission shape (matches `RunRequest`).
- `types.go` — `QuestionBody`, `StarterFile`, `LockedRegion`, `Answer`, `Sample`, `Hint`, `JudgeConfig`; `Schemas()` accessor; action ID constants (`coding.run-custom`, `coding.run-tests`, `coding.submit`); embedded schema FS via `//go:embed schemas/*.json`.
- `authoring.go` — `ValidateQuestionBody(raw, ctx)` / `ValidateQuestionBodyStruct(body, ctx)`. Structured `ValidationError{Code, Field, Message, Detail}`. `KnownLanguageSlugs` callback so this package stays independent of `pluginhost`.
- `runtime.go` — `ValidateAnswer(answer, RuntimeContext)`. Enforces all snapshot-driven invariants including **whole-file** and **region-level** locks. Error details carry `path`, `startLine`, `endLine`, `reason` for the frontend.

**Validation error codes** (stable; frontend branches on these):

| Code | Where | Meaning |
|---|---|---|
| `INVALID_JSON` | authoring | Body is not parseable JSON |
| `WRONG_TYPE` | authoring | `type != "coding"` |
| `TITLE_REQUIRED` / `PROMPT_REQUIRED` | authoring | Required field missing |
| `INVALID_PROMPT_FORMAT` | authoring | Not markdown/html/plain |
| `INVALID_LANGUAGE_SLUG` | authoring | Doesn't start with `language.` |
| `UNKNOWN_LANGUAGE` | authoring | Slug not installed as a plugin |
| `LANGUAGE_NOT_ALLOWED` | authoring + runtime | Used a language outside `allowedLanguages` |
| `DUPLICATE_LANGUAGE` | authoring | `allowedLanguages` has duplicates |
| `DUPLICATE_FILE_PATH` | authoring | Two starter files share a path |
| `INVALID_FILE_PATH` | authoring | Path contains `..` |
| `FILE_TOO_LARGE` | authoring + runtime | Single file exceeds budget |
| `TOTAL_TOO_LARGE` | runtime | Submission total exceeds budget |
| `TOO_MANY_FILES` | runtime | File count exceeds budget |
| `LOCKED_REGION_OUT_OF_RANGE` | authoring | startLine/endLine doesn't fit file |
| `ENTRY_FILE_REQUIRED` / `ENTRY_FILE_MISSING` | authoring + runtime | Entry file not specified / not present in submission |
| `HINTS_NOT_MONOTONIC` | authoring | Hint N+1 unlocks before hint N |
| `LOCKED_FILE_MODIFIED` | runtime | Read-only file content changed |
| `LOCKED_FILE_MISSING` | runtime | Locked file dropped from submission |
| `LOCKED_REGION_MODIFIED` | runtime | Lines inside a locked region changed (Detail: path, startLine, endLine, reason) |

**Tests:** [authoring_test.go](../plugins/assessment-coding/authoring_test.go) (9 tests) + [runtime_test.go](../plugins/assessment-coding/runtime_test.go) (8 tests) = 17 unit tests. Coverage includes: happy paths, every error code above, region edits outside the lock (must be allowed), region edits inside the lock (must be rejected with full Detail), default entry file fallback, path traversal rejection, hints ordering, duplicate path detection.

**Verification commands**

```bash
cd backend/exam-engine
go build ./...                                    # builds clean
go vet ./internal/pluginhost/... ./cmd/...        # vets clean
go test ./internal/pluginhost/... ./plugins/...   # 22 tests pass
go test ./internal/migrate/...                    # skips without DATABASE_URL
DATABASE_URL=postgres://... go test ./internal/migrate/...   # full migration verify
```

---

## 5. What to do next — Phases 4–8

Each phase is a separately-reviewable change. Goal at each phase boundary: production-buildable, all tests pass, the live coding flow keeps working byte-identically for unchanged inputs.

### Phase 4 — `runner.judge0` + `evaluation.testcase` + delete hardcoded paths ✅

**Status:** completed 2026-05-13.

Implemented in this workspace:

- `plugins/runner-judge0/` now owns Judge0 language lookup, payload construction, submission posting, and admin health language enumeration from `language.*` plugin manifests.
- `plugins/evaluation-testcase/` now owns comparator dispatch and partial-credit scoring, including negative marking.
- `POST /v1/attempts/{attempt_id}/answers/{exam_question_id}/runs` dispatches through `pluginhost` actions (`coding.run-custom`, `coding.run-tests`, `coding.submit`) before executing the existing run pipeline.
- `purchase_handlers.go` validates demo purchases through `pricing_items.plugin_id` / language plugin resolution instead of the hardcoded `coding:*` switch.
- `judge0Health` lists installed `language.*` plugins instead of a fixed Python/Java/C++/C/JavaScript list.
- Run and submit paths normalize legacy language names to canonical `language.*` slugs, enforce user language entitlement, validate locked files/regions through `assessment.coding.ValidateAnswer`, and return structured validation errors.
- Final coding grading now delegates weighted partial-credit math to `evaluation.testcase.PartialCredit`.
- If `runner.judge0` is platform-disabled, candidates get a graceful `503` runner-unavailable response.

Verification run after implementation:

```bash
go test ./...
go vet ./internal/pluginhost/... ./plugins/... ./cmd/... ./internal/server/...
go build ./...
```

All passed.

**Goal.** Replace the three hardcoded paths (Judge0 language map, `isCodingItemRef`, all-or-nothing scoring) with plugin-routed code. The existing route `POST /v1/attempts/{attempt_id}/answers/{exam_question_id}/runs` stays — internally it now dispatches via `pluginhost`.

**Files to create**

```
plugins/runner-judge0/
  plugin.json              # mirrors migration 012's runner.judge0 row (UUID …0080)
  runtimes.go              # LookupLanguage(slug) -> LanguageConfig; ResolveJudge0ID(slug) -> int
  payload.go               # buildJudge0Payload moved here from code_run_handlers.go:249
  judge0.go                # postJudge0 client moved here from code_run_handlers.go:618
  health.go                # cross-checks plugin language IDs against Judge0 /languages

plugins/evaluation-testcase/
  plugin.json              # mirrors migration 012's evaluation.testcase row (UUID …0020)
  scoring.go               # partial-credit formula
  comparators.go           # trim_equal | strict | json | regex | custom_checker dispatch

plugins/assessment-coding/
  evaluation.go            # delegates submit grading to evaluation.testcase via pluginhost
  register.go              # wires actions into pluginhost.Registry at boot
```

**Files to modify**

```
cmd/server/main.go
  After pluginhost.Bootstrap, call:
    assessmentcoding.Register(pluginRegistry, deps)
    runnerjudge0.Register(pluginRegistry, deps)
    evaluationtestcase.Register(pluginRegistry, deps)
  `deps` is a small struct carrying the pgx pool, judge0 http client, and slog logger.

internal/server/code_run_handlers.go
  - Delete lines 670–693 (the hardcoded language ID switch).
  - Delete lines 160–166 (the hardcoded health check list).
  - runCode handler becomes:
        action := actionForMode(req.Mode)          // custom -> coding.run-custom, test -> coding.run-tests
        resp, err := s.plugins.Dispatch(ctx, pluginhost.ActionRequest{
            AttemptID: aid, ExamQuestionID: eqid, UserID: userID,
            Action: action, Payload: rawBody,
        })
    The persistence helpers (persistRunStart, persistRunFinish, loadRunTests) move into
    plugins/assessment-coding/runtime.go OR stay in server/ as exported helpers consumed
    by the plugin. Prefer the second: less code motion, cleaner diff.

internal/server/attempt_handlers.go
  - gradeCodingAnswerTx (around line 1153): replace the all-or-nothing logic with a call
    into the evaluation.testcase scoring function. Pass it the per-attempt code_runs row
    of mode='final' (after Phase 4 we start writing one) plus the question_test_cases
    rows; receive (score, perCaseResults).
  - attempt_handlers.go:960 (replace(assign.assignment_ref,'coding:','')) — keep the
    legacy slug derivation as a fallback, but enrich the runtime context with the
    resolved plugin.slug ('language.python') so plugin handlers see the canonical form.

internal/server/purchase_handlers.go
  - Delete isCodingItemRef (lines 237–243).
  - In demoPurchase, replace the hardcoded check with:
        ok, err := s.plugins.IsPurchasableLanguagePlugin(ctx, req.ItemRef)
    where s.plugins is the *pluginhost.Registry attached in main.go.

internal/server/admin_handlers.go
  - judge0Health: rewrite the language-list construction. Instead of:
        languages := []string{"python","java","cpp","c","javascript","multi-file"}
    do:
        for _, m := range s.plugins.ByCategory(pluginhost.CategoryLanguage) {
            cfg, _ := m.DecodeLanguageConfig()
            ...
        }
```

**Action registration shape (in plugins/assessment-coding/register.go)**

```go
func Register(reg *pluginhost.Registry, deps Deps) error {
    if err := reg.RegisterAction(Slug, ActionRunCustom, runCustomHandler(deps)); err != nil {
        return err
    }
    if err := reg.RegisterAction(Slug, ActionRunTests, runTestsHandler(deps)); err != nil {
        return err
    }
    if err := reg.RegisterAction(Slug, ActionSubmit, submitHandler(deps)); err != nil {
        return err
    }
    return nil
}
```

Each handler:

1. Decode the `ActionRequest.Payload` into an `Answer` (per `schemas/answer.schema.json`).
2. Resolve the attempt + question + frozen starter snapshot from DB.
3. Call `ValidateAnswer(answer, RuntimeContext)` — return 422 + `ValidationErrors` JSON on failure.
4. Resolve the language plugin via `pluginhost.Registry.BySlug(answer.Language)`.
5. Hand off to `runner.judge0` via a direct Go call (these live in the same process and don't need plugin dispatch round-tripping).
6. For `coding.run-tests`: scoring lives in `evaluation.testcase`.
7. Return `ActionResponse{HTTPStatus: 200, Body: ...}`.

**Scoring formula (evaluation.testcase/scoring.go)**

```go
// PartialCredit returns score in [0, max_score]:
//   score = max_score × Σ(weight_i for passed) / Σ(weight_i for all)
// Negative marking honors question_versions.is_negative_marked / .negative_score:
//   if not solved AND is_negative_marked: score = -negative_score
//   else: score = max(score, 0)
```

Implementation reads `question_test_cases` rows (already weighted), receives the per-case `code_run_test_results` rows, computes the ratio, applies negative marking. Pure function; testable without DB.

**runner.judge0/runtimes.go**

```go
type Registry struct { reg *pluginhost.Registry }

func (r *Registry) Lookup(langSlug string) (*pluginhost.LanguageConfig, error)
func (r *Registry) Judge0ID(langSlug string) (int, error)
func (r *Registry) AllInstalled() []*pluginhost.LanguageConfig
```

`Lookup` reads from `r.reg.BySlug(langSlug).DecodeLanguageConfig()`. **No DB query per run** — the registry holds everything in memory.

**Verification**

1. `go build ./...` clean. `go vet` clean.
2. Capture a golden run/test response from a clean checkout (pre-Phase-4). After Phase 4, send the same `RunRequest` to a freshly migrated DB and `diff` the JSON. Diff must be empty except for timestamps and run IDs.
3. Unit test the scoring formula against a 6-case fixture with weights 1/1/1/2/2/3, 4 passing — expected score `7/10 × max_score`.
4. Disable `runner.judge0` via `platform_plugin_entitlements (state='disabled')`; restart; verify candidate gets a graceful "code runner unavailable" instead of a 500.
5. Add a new language plugin row (`language.kotlin`) via raw `INSERT INTO plugins …`; restart the engine; without code change, `GET /v1/admin/judge0/health` should list Kotlin and `language.kotlin` should appear in the question editor's allowed-language picker.
6. Negative test: `POST /v1/admin/coding/answers/.../runs` with `language=language.kotlin` for a user with no purchase → 403 `LANGUAGE_NOT_ENTITLED` from the entitlement gate.

**Pitfalls**

- **Frozen question body vs live config.** Don't re-resolve the language plugin from the live registry mid-attempt — use the slug captured in `exam_assignments.assignment_ref`. If a plugin's `schema.judge0LanguageId` is changed mid-attempt, the active attempt keeps the old ID; new attempts get the new one.
- **`code_runs.mode` enum.** Today: `'custom','sample','tests','final'`. After Phase 4 you may want to start writing `mode='final'` on submit so `gradeCodingAnswerTx` can pick it deterministically. Migration is not needed (enum already has the value); the change is purely in the submit handler.
- **Comparator dispatch.** The schema has 5 comparators but only `trim_equal` is implemented today. Implement at least `trim_equal` + `strict` in Phase 4; defer `json` / `regex` / `custom_checker` if time-boxed.
- **Locked file enforcement on the submit path.** Phase 3's `ValidateAnswer` covers run-time enforcement, but submit goes through `attempt_handlers.go`'s `submitAttempt`. Make sure that also calls `ValidateAnswer` with the snapshot context, otherwise candidates could bypass locks by editing only in the final submission.

---

### Phase 5 — Admin authoring APIs + `/v1/me/languages` ✅

**Status:** completed 2026-05-13.

Implemented in this workspace:

- Added `internal/server/admin_authoring_handlers.go` with admin question CRUD, version-publishing, current-version test-case CRUD, and JSON/CSV bulk import with all-row prevalidation.
- Added `internal/server/me_handlers.go` with `GET /v1/me/languages`, backed by `pluginhost.UserLanguagePlugins`.
- Extended `internal/server/admin_handlers.go` with plugin category filtering, detail, create, metadata update, state update with preview, dependents, and admin user entitlement lookup.
- Added `internal/server/admin_package_handlers.go` with basic exam-package list/create/get/update and `POST /v1/admin/pricing-items`.
- Mounted the Phase 5 routes in `internal/server/server.go`.
- New language plugin creation validates `language.<slug>` shape and the typed `LanguageConfig`, then reloads the in-process plugin registry before returning.

Verification run after implementation:

```bash
go test ./...
go vet ./internal/pluginhost/... ./plugins/... ./cmd/... ./internal/server/...
go build ./...
```

All passed.

**Goal.** A REST surface admins can use to manage questions, language plugins, exam packages, and pricing — and a candidate-side helper that returns the user's entitled languages.

**Files to create**

```
internal/server/admin_authoring_handlers.go    # primary file; ~600 lines expected
internal/server/me_handlers.go                  # GET /v1/me/languages
internal/server/admin_authoring_test.go         # table-driven integration tests
```

**Routes to mount** (in `internal/server/server.go` inside the existing `r.Route("/v1", …)` group, under the same `s.sessionMiddleware`)

```
Admin (requires platform_admin):
  GET    /v1/admin/questions                          list (filter: plugin_slug, difficulty, tag, archived, search)
  POST   /v1/admin/questions                          create question + version 1
  GET    /v1/admin/questions/{id}                     fetch with current version
  PUT    /v1/admin/questions/{id}                     publish a new version (old versions stay frozen)
  DELETE /v1/admin/questions/{id}                     soft-delete (is_archived=true)
  GET    /v1/admin/questions/{id}/test-cases          list
  POST   /v1/admin/questions/{id}/test-cases          append (must target current version)
  PUT    /v1/admin/questions/{id}/test-cases/{tcId}   update
  DELETE /v1/admin/questions/{id}/test-cases/{tcId}   remove
  POST   /v1/admin/questions/bulk-import              multipart CSV or JSON, per-row errors

  GET    /v1/admin/plugins                            extended response: type, category, deps, dependents
  GET    /v1/admin/plugins?category=language          language registry view
  POST   /v1/admin/plugins                            create a new plugin row (admin-driven language addition)
  PUT    /v1/admin/plugins/{id}                       update name/schema/version
  PUT    /v1/admin/plugins/{id}/state                 enable/disable/restrict; ?preview=1 returns impact
  GET    /v1/admin/plugins/{id}/dependents            who depends on this

  GET    /v1/admin/exam-packages                      list
  POST   /v1/admin/exam-packages                      create exam_template + exam_version + pricing_items
  GET    /v1/admin/exam-packages/{id}
  PUT    /v1/admin/exam-packages/{id}
  POST   /v1/admin/pricing-items                      create pricing for a language plugin

  GET    /v1/admin/users/{userId}/entitlements        plugin entitlements + source (purchase/org/free)

Candidate (requires session):
  GET    /v1/me/languages                             user's entitled language plugins + source
```

**Authoring flow detail (POST /v1/admin/questions)**

1. Decode body: `{title, plugin_slug:"assessment.coding", body:{...QuestionBody...}, test_cases:[{name, is_sample, is_hidden, weight, stdin, expected_stdout, comparator}], max_score, is_negative_marked, negative_score, estimated_time_seconds}`.
2. Resolve `plugin_id` from `plugin_slug` via `s.plugins.BySlug(...)`.
3. Build `AuthoringContext{IsKnownLanguage: func(slug) bool { return s.plugins.BySlug(slug) != nil }, MaxStarterBytes: 65536}`.
4. Call `assessmentcoding.ValidateQuestionBody(rawBody, ctx)` — return 422 + `ValidationErrors` if it fails.
5. Begin a transaction:
   - `INSERT INTO questions (org_id, plugin_id, created_by, title)` → returns `question_id`.
   - `INSERT INTO question_versions (question_id, version_number=1, difficulty, estimated_time_seconds, body, max_score, is_negative_marked, negative_score, created_by)` → returns `version_id`.
   - For each test case: `INSERT INTO question_test_cases (...)`.
   - `UPDATE questions SET current_version_id = $version_id WHERE id = $question_id`.
6. Commit, return `{id, current_version_id, version_number: 1}`.

**PUT /v1/admin/questions/{id} (publish a new version)**

Important: never mutate `question_versions` rows in place. Insert a new row with `version_number = current.version_number + 1`. Existing `exam_questions` rows continue pointing at the old `question_version_id` so in-flight attempts are unaffected. The admin UI updates `exam_questions` via a separate "swap to latest" action.

**POST /v1/admin/plugins (create a language)**

Body: `{kind:"language", slug:"language.kotlin", name:"Kotlin 1.9", version:"1.0.0", schema:{...LanguageConfig...}, requires_license:false, enabled_by_default:true, plugin_type:"addon", category:"language", requires:["assessment.coding","code.runner"], extends:["assessment.coding"], provides:["language.runtime"]}`.

Server:

1. Validate slug pattern `^language\.[a-z][a-z0-9-]*$`.
2. Validate `schema` against an embedded JSON Schema (Phase 4 already has `LanguageConfig` Go type; consider adding a `schemas/language.schema.json` and validate against it).
3. Insert the row.
4. Call `s.plugins.Reload(ctx)` to refresh the in-process registry.
5. Return the new manifest.

**GET /v1/me/languages (candidate)**

Returns:

```json
{
  "languages": [
    {
      "slug": "language.python",
      "displayName": "Python 3.11",
      "monacoLanguageId": "python",
      "icon": "python.webp",
      "source": "purchase",
      "itemRef": "coding:python"
    },
    {
      "slug": "language.java",
      "displayName": "Java 17",
      "monacoLanguageId": "java",
      "icon": "java.webp",
      "source": "org",
      "orgId": "00000000-…"
    }
  ]
}
```

Implementation: `s.plugins.UserLanguagePlugins(ctx, principal.UserID)` → marshal.

**Pitfalls**

- **Admin authorization.** Today `/v1/admin/*` only checks "is admin" via the session middleware. For Phase 5 routes touching plugin state, this is good enough for v1, but production hardening (`platform_admin` vs `org_admin` split) is a known deferred item.
- **Bulk import safety.** Validate every row before any insert. Don't half-import. Return per-row errors with row numbers; the admin UI shows them inline.
- **`exam_versions.settings.allowed_languages`.** When the admin creates an exam package, the languages they pick get stored both in `exam_versions.settings` (frozen at publish) AND `exam_sections.config.languages`. The candidate-side filter reads both: section is the lower scope.
- **Idempotency of plugin reloads.** After admin POSTs a new plugin, `Reload` must complete before the response returns; otherwise a follow-up `GET /v1/admin/plugins` won't see the new row.

**Verification**

1. CRUD round-trip a question with starter code in 3 languages, 2 sample + 4 hidden test cases (weights 5/10/15/15/25/30), `is_negative_marked=true` / `negative_score=2`. Re-fetch returns byte-identical body.
2. Bulk-import a CSV with 5 valid + 3 invalid rows (one invalid because it references `language.kotlin` which doesn't exist); response lists 3 row-numbered errors; the 5 valid rows are persisted.
3. Add a new language plugin via `POST /v1/admin/plugins` with `slug=language.rust`, restart NOT required. `GET /v1/admin/plugins?category=language` lists it; the question editor's language picker lists it.
4. Create a user, purchase `coding:python` via the existing `/v1/purchases/demo`, then `GET /v1/me/languages` returns `[{slug: language.python, source: purchase, itemRef: coding:python}]`.
5. Grant Java to the user's org via `INSERT INTO org_plugin_entitlements`; `GET /v1/me/languages` now returns both.
6. Disable `language.python` platform-wide via `UPDATE platform_plugin_entitlements SET state='disabled'`; `GET /v1/me/languages` drops Python even though the user paid for it.

---

### Phase 6 — LLM evaluation scaffold ✅

**Status:** completed 2026-05-14.

Implemented in this workspace:

- Added `plugins/evaluation-llm/` with manifest, embedded config schema, and `llm.evaluate` registration.
- `llm.evaluate` dispatch now returns `501 Not Implemented` with `{"error":"evaluation.llm.dispatcher_not_implemented","detail":"Provider call not implemented in this build"}`.
- Added `plugins/evaluator-openai/` and `plugins/evaluator-anthropic/` manifests plus provider config schemas.
- `Server.AttachPluginRegistry` registers the `evaluation.llm` action handler at boot.
- `GET /v1/admin/plugins` and `GET /v1/admin/plugins/{id}` now include embedded `configSchema` for `evaluation.llm`, `evaluator.openai`, and `evaluator.anthropic`.

Verification run after implementation:

```bash
go test ./...
go vet ./internal/pluginhost/... ./plugins/... ./cmd/... ./internal/server/...
go build ./...
```

All passed.

**Goal.** Make the LLM evaluation plugin tree configurable and admin-visible, but stop short of actually calling a provider. The existing `evaluations` table at `005_evaluation.sql:41` already carries every LLM column (`llm_model`, `llm_input_tokens`, `llm_output_tokens`, `llm_cost_usd`, `llm_raw_response`), so no new tables.

**Files to create**

```
plugins/evaluation-llm/
  plugin.json                       # mirrors migration 012's evaluation.llm row (UUID …0081)
  schemas/config.schema.json        # rubric, finalScorePolicy, holdResultUntilManualReview
  register.go                       # registers a 501-Not-Implemented action handler

plugins/evaluator-openai/
  plugin.json                       # mirrors evaluator.openai row (UUID …0022)
  schemas/config.schema.json        # provider, model, credentialRef, timeoutSeconds

plugins/evaluator-anthropic/
  plugin.json
  schemas/config.schema.json
```

**Behavior**

- An admin can enable `evaluation.llm` + `evaluator.openai`, fill in `model="gpt-4o-mini"` and `credentialRef="secret://openai/default"`. The config is persisted in `org_plugin_entitlements.config` JSONB.
- Invoking LLM evaluation (e.g. via a future `POST /v1/admin/answers/{id}/evaluate?evaluator=llm`) returns `501 Not Implemented` with body `{"error":"evaluation.llm.dispatcher_not_implemented","detail":"Provider call not implemented in this build"}`.
- The admin UI in Phase 7 displays a clear "Not implemented" notice next to the Save button.

**No code change needed in the engine** beyond registering the action handler that returns 501.

**Verification**

1. `GET /v1/admin/plugins?category=evaluation` lists `evaluation.testcase`, `evaluation.manual-review`, `evaluation.llm`.
2. `GET /v1/admin/plugins/{evaluation.llm.id}` returns the config schema.
3. Enable + configure `evaluation.llm` via `PUT /v1/admin/plugins/{id}/state`; verify the config JSON round-trips.
4. Trigger the future LLM evaluation route → 501 with the structured error.

---

### Phase 7 — Frontend admin portal (Next.js 16)

**Goal.** Build the admin UI in the existing `OriginBi-Technical/frontend/` Next.js 16 app, using the prototype at `C:\Users\Sriharan\Downloads\OriginBi-Technical Admin\src\coding_editor.jsx` as the design reference.

> ⚠️ Per `OriginBi-Technical/frontend/AGENTS.md`: Next.js 16 has breaking changes from public docs. Read `node_modules/next/dist/docs/` for any unfamiliar API (server actions, params access, etc.) before writing code.

**Routes to create**

```
app/admin/
  layout.tsx                        # sidebar + topbar shell (port from prototype src/shell.jsx)
  coding/
    page.tsx                        # question list
    [questionId]/page.tsx           # 5-tab editor (Problem / Test Cases / Languages / Limits / Settings)
    new/page.tsx                    # create flow (reuses [questionId] in 'new' mode)
    bulk-import/page.tsx            # CSV/JSON upload
  plugins/
    page.tsx                        # extend existing page with category facets + base/addon column
    [pluginId]/page.tsx             # tabs: Overview / Dependencies / Configuration / Org Entitlements / Audit
    languages/page.tsx              # convenience filter view
    languages/new/page.tsx          # add new language plugin
  exam-packages/
    page.tsx                        # list
    [pkgId]/page.tsx                # editor
  users/
    [userId]/entitlements/page.tsx  # support tool
```

**Plugin slots** (one folder per plugin slug under `frontend/plugins/`, per `docs/plugin-architecture/frontend-plugin-boundaries.md`)

```
frontend/plugins/
  assessment-coding/
    manifest.ts                     # { slug, slots: { authoring, adminConfig, candidate, report } }
    AuthoringPanel.tsx              # the 5-tab editor; uses Monaco + react-markdown
    AdminConfig.tsx                 # plugin-level config form
    CandidateRuntime.tsx            # re-exports the existing /assessment/coding page (Phase 8 hooks here)
    ReportSection.tsx
  evaluation-testcase/
    manifest.ts
    AdminConfig.tsx                 # comparator defaults, partial-credit toggle
  evaluation-llm/
    manifest.ts
    AdminConfig.tsx                 # provider/model/rubric with "Not implemented" notice
  evaluator-openai/
    manifest.ts
    AdminConfig.tsx                 # model picker + credentialRef field
  language/
    manifest.ts                     # one generic UI reused for every language.* plugin
    AdminConfig.tsx                 # judge0LanguageId, limits, file ext, monaco mapping, icon

frontend/lib/plugins/registry.ts    # maps plugin.slug -> { authoring, adminConfig, candidate, report }
frontend/lib/admin-api.ts           # typed fetch wrappers for /v1/admin/*
```

**Editor tab mapping (prototype → real)**

The 5 tabs from the Downloads prototype `coding_editor.jsx` map onto `AuthoringPanel.tsx` like this:

| Prototype tab | Real implementation | Writes to |
|---|---|---|
| **Problem** | Markdown editor (default), with HTML/plain toggle. Pretext code block, image upload, sample examples list. | `question_versions.body.{title, prompt, promptFormat, pretext, image, samples}` |
| **Test Cases** | List+detail. Weight numeric, visible toggle, comparator picker (`trim_equal` / `strict` / `json` / `regex`). Per-case stdin/expected. | `question_test_cases` via `POST/PUT/DELETE /v1/admin/questions/{id}/test-cases/{tcId?}` |
| **Languages & Starter** | Multi-select of `GET /v1/admin/plugins?category=language`. Per-enabled-language: Monaco panel with multi-file editing, file-level `readOnly` toggle, **region-level lock UI** (select lines → click "Lock region" → fills `lockedRegions[]`). | `question_versions.body.{allowedLanguages, starterFiles, entryFile}` |
| **Limits & Judge** | Per-question overrides for `timeLimitMs`, `memoryLimitKb`. Defaults pulled from the language plugin's `LanguageConfig`. Judge config toggles + hints. | `question_versions.body.{judgeConfig, hints}` |
| **Settings** | Candidate experience (copy-paste lock, line numbers, lock-on-submit), proctoring toggles (write to `exam_versions.settings.proctoring`), plagiarism/AI-detection placeholder switches (stored but unenforced for v1). | `exam_versions.settings`; some fields stay UI-only for v1 |

**Region lock UX (the hard part)**

In `AuthoringPanel.tsx`:

1. Monaco editor renders a starter file with line numbers.
2. Admin selects lines (e.g. 1–3), clicks "Lock region" button in the toolbar.
3. The component does `monaco.deltaDecorations([], [{range: ..., options: {className: 'lock-region', glyphMarginClassName: 'lock-glyph'}}])` to visually mark the range.
4. The lock spec is pushed into form state: `lockedRegions.push({startLine: 1, endLine: 3, reason: ''})`.
5. Admin can click any glyph to edit the reason or remove the lock.
6. On save, `lockedRegions` rides along with the file in `starterFiles[lang][i]`.

In the candidate runtime (Phase 8):

1. Monaco loaded with `readOnly: true` per file if `starterFile.readOnly`.
2. For files with `lockedRegions`, register a `monaco.editor.onWillType` (or `onDidChangeModelContent`) interceptor: if the change overlaps a locked range, revert it. Visual: gray background + lock glyph on locked lines.
3. Backend re-validates on every run/submit (already implemented in Phase 3); the frontend lock is convenience UX only.

**Required npm deps**

```bash
cd OriginBi-Technical/frontend
npm install @monaco-editor/react react-markdown remark-gfm
```

(Check whether Monaco is already installed; the candidate-side editor at `app/assessment/coding/page.tsx` may already pull it in.)

**Modifications to existing pages**

```
frontend/app/admin/plugins/page.tsx
  - Add category facet sidebar.
  - Show base/addon badge column.
  - Add "Impact preview" modal triggered by Disable button — calls
    PUT /v1/admin/plugins/{id}/state?preview=1 first.

frontend/app/admin/questions/page.tsx
  - When the row is for a coding plugin, route to /admin/coding/{id}.
  - Keep MCQ flow as-is.
```

**Verification**

1. `npm run dev`. Login through `/admin/login`. Navigate to `/admin/coding`.
2. Create a question with markdown statement, 3 starter languages, one read-only `helpers.py`, lines 1–3 of `solution.py` locked, 2 sample + 4 hidden test cases. Save. Re-open. Round-trip clean.
3. Add a new language via `/admin/plugins/languages/new` — Rust with Judge0 ID 73. Without backend redeploy, Rust appears in the question editor language picker.
4. Create an exam package "Python Coding Test" priced ₹499 bound to `language.python` only. Verify a non-Python user gets a clear "Purchase Python to start" CTA at `/explore`.
5. Disable `evaluation.testcase` from `/admin/plugins`. Impact preview lists `assessment.coding` (loses Run Tests). After confirmation, candidates on new attempts see no "Run Tests" button.

---

### Phase 8 — Candidate-side filter + Monaco lock UX

**Goal.** Tighten the candidate runtime to honor the new entitlement and lock model.

**Files to modify**

```
frontend/app/assessment/coding/page.tsx
  - On mount, call GET /v1/me/languages → store user's entitled language plugins.
  - Compute pickerLanguages = userLanguages ∩ question.allowedLanguages ∩ section.config.languages.
  - If empty: show "Purchase a language to start" CTA with a deep link to /explore/{examId}.
  - Else: render language tabs from pickerLanguages.

frontend/components/assessment/coding/FileTree.tsx (and the editor wrapper)
  - For each starter file, pass readOnly + lockedRegions to Monaco.
  - Wire the lockedRegions interceptor (see Phase 7's region lock UX section).
  - When the backend returns LOCKED_FILE_MODIFIED or LOCKED_REGION_MODIFIED on a run,
    surface the structured Detail to highlight the violated range in Monaco.
```

**Verification**

1. As a candidate with only `coding:python` purchased, open a coding exam: only Python appears in the language picker.
2. Try to bypass: open browser devtools, POST `/v1/attempts/.../runs` with `language=language.java` directly → 403 `LANGUAGE_NOT_ENTITLED`.
3. Click into a `readOnly` file → Monaco refuses keystrokes; the file's tab shows a lock icon.
4. Type inside a locked region → reverted immediately; status banner says "This region is locked: function signature".
5. API-bypass test: POST a run with a modified locked-region content → backend returns 422 `LOCKED_REGION_MODIFIED` with full Detail.

---

## 6. Quick reference

### Stable UUIDs (do not change)

| UUID | Plugin |
|---|---|
| `00000000-0000-0000-0000-000000000013` | `assessment.coding` |
| `00000000-0000-0000-0000-000000000020` | `evaluation.testcase` |
| `00000000-0000-0000-0000-000000000021` | `evaluation.manual-review` |
| `00000000-0000-0000-0000-000000000022` | `evaluator.openai` |
| `00000000-0000-0000-0000-000000000023` | `evaluator.anthropic` |
| `00000000-0000-0000-0000-000000000080` | `runner.judge0` |
| `00000000-0000-0000-0000-000000000081` | `evaluation.llm` |
| `00000000-0000-0000-0000-000000000090` | `language.python` |
| `00000000-0000-0000-0000-000000000091` | `language.java` |
| `00000000-0000-0000-0000-000000000092` | `language.cpp` |
| `00000000-0000-0000-0000-000000000093` | `language.c` |
| `00000000-0000-0000-0000-000000000094` | `language.javascript` |
| `00000000-0000-0000-0000-000000000095` | `language.go` |

### Action IDs

| Action | Owner plugin | Phase |
|---|---|---|
| `coding.run-custom` | `assessment.coding` | 4 |
| `coding.run-tests` | `assessment.coding` | 4 |
| `coding.submit` | `assessment.coding` | 4 |
| `llm.evaluate` | `evaluation.llm` | 6 (returns 501) |

### Legacy → plugin slug map

| Legacy `pricing_items.item_ref` | Plugin slug |
|---|---|
| `coding:python` | `language.python` |
| `coding:java` | `language.java` |
| `coding:cpp` | `language.cpp` |
| `coding:c` | `language.c` |
| `coding:javascript` | `language.javascript` |

The legacy `item_ref` strings are also stored in each language plugin's `schema.legacyItemRef` field; this is the authoritative bridge.

### Migration table

| # | File | Adds | Down? |
|---|---|---|---|
| 012 | [012_language_plugins_and_categories.sql](../internal/migrate/sql/012_language_plugins_and_categories.sql) | `plugin_type`/`category`/`requires`/`extends`/`provides` on `plugins`; `pricing_items.plugin_id`; 6 language plugins; `runner.judge0`; `evaluation.llm`; renames 5 seeded plugin slugs in place. | Yes (enum values not removable but harmless) |
| 013 | [013_question_body_polish.sql](../internal/migrate/sql/013_question_body_polish.sql) | `code_submission_files.locked_regions JSONB`; stamps `promptFormat: "html"` on existing seeded bodies. | Yes |

### Source-tree layout after Phase 3

```
backend/exam-engine/
  cmd/server/main.go                                   # wires pluginhost.Bootstrap
  internal/
    pluginhost/                                        # NEW (Phase 2)
      manifest.go
      registry.go
      dependencies.go
      dependencies_test.go
      entitlements.go
      dispatcher.go
    migrate/sql/
      001_init.sql ... 011_*.sql                       # untouched
      012_language_plugins_and_categories.sql          # NEW (Phase 1)
      013_question_body_polish.sql                     # NEW (Phase 3)
    server/
      server.go                                        # AttachPluginRegistry added
      …                                                # untouched
  plugins/
    assessment-coding/                                 # NEW (Phase 3)
      plugin.json
      schemas/
        config.schema.json
        question-body.schema.json
        answer.schema.json
      types.go
      authoring.go
      authoring_test.go
      runtime.go
      runtime_test.go
  docs/
    dynamic-coding-assessment-status.md                # this file
    plugin-architecture/…                              # design refs
```

---

## 7. How to run / verify locally

```bash
# 1. Build everything
cd OriginBi-Technical/backend/exam-engine
go build ./...

# 2. Unit tests (no DB required)
go test ./internal/pluginhost/... ./plugins/...

# 3. Vet
go vet ./internal/pluginhost/... ./plugins/... ./cmd/...

# 4. Full integration with a real Postgres
export DATABASE_URL=postgres://exam:exam@localhost:5432/exam_engine?sslmode=disable
go test ./internal/migrate/...                # runs migrations + asserts schema invariants

# 5. Start the server (requires DATABASE_URL + Cognito env)
export RUN_MIGRATIONS=true
export JUDGE0_URL=http://localhost:2358
go run ./cmd/server

# 6. Smoke: registry loaded
curl -H "Cookie: ob_session=..." http://localhost:8080/v1/admin/plugins
#   Expect: rows including assessment.coding, runner.judge0, language.python..go,
#   evaluation.testcase, evaluation.llm, evaluator.openai, evaluator.anthropic.
```

If `pluginhost.Bootstrap` fails on `assessment.coding`, the server exits 1 with a clear error. Other plugin errors log a warning and proceed.

---

## 8. Pointers to related docs

- **Plugin architecture (design)** — [plugin-architecture/README.md](plugin-architecture/README.md), [plugin-model.md](plugin-architecture/plugin-model.md), [backend-contract.md](plugin-architecture/backend-contract.md), [frontend-plugin-boundaries.md](plugin-architecture/frontend-plugin-boundaries.md), [admin-portal-and-security.md](plugin-architecture/admin-portal-and-security.md), [coding-assessment-plugin.md](plugin-architecture/coding-assessment-plugin.md), [dependency-resolution-and-entitlements.md](plugin-architecture/dependency-resolution-and-entitlements.md), [rollout-plan.md](plugin-architecture/rollout-plan.md).
- **Database** — [database-plan.md](database-plan.md).
- **Engine status snapshot** — [implementation-status-and-next-steps.md](implementation-status-and-next-steps.md). Update this when Phase 4 lands so it reflects the plugin-routed coding flow.
- **Judge0 service** — [../../judge0/docs/service-status-and-next-steps.md](../../judge0/docs/service-status-and-next-steps.md).
- **Frontend admin plan** — [../../../frontend/docs/plugin-admin-portal-plan.md](../../../frontend/docs/plugin-admin-portal-plan.md).
- **UX prototype (design reference only)** — `C:\Users\Sriharan\Downloads\OriginBi-Technical Admin\src\coding_editor.jsx`.
- **The user's working plan file** — `C:\Users\Sriharan\.claude\plans\plan-for-coding-assessment-crystalline-hedgehog.md`. Treat as the authoritative scope spec; this status doc tracks execution against it.

---

## 9. Open decisions / deferred

- **Phase 2 of the rollout (cross-scope entitlement resolver).** Org and per-question entitlement is resolved for `language.*` plugins. Other plugins (`evaluation.*`, `proctoring.*`) still resolve at platform + exam levels only.
- **Phase 3 of the rollout (snapshot plugin map).** Active attempts continue to read live plugin config. The per-attempt language pin via `exam_assignments.assignment_ref` mitigates the only practically dangerous case.
- **Phase 6 of the rollout (proctoring as plugins).** Proctoring config stays in `exam_versions.settings` for v1.
- **Phase 7 of the rollout (real LLM evaluation).** Scaffold only; the `evaluations` table is ready, the worker isn't.
- **Phase 9 of the rollout (remove all hardcoded paths).** MCQ and other assessment types remain hardcoded; only coding becomes plugin-routed.
- **Reference-solution / generator-script tooling** (prototype's Test Cases tab) — UI stubs only, no backend.
- **Plagiarism / AI-generated code detection** — toggles persist in settings but no detector runs.
- **Refunds / language unentitlement** — once purchased, permanent. No admin UI in v1.
- **Org-scoped admin authoring** — only platform admins author questions and create language plugins in v1.
