# Judge0 Service Status and Next Steps

Last updated: 2026-05-08

This document summarizes the current Judge0 setup under `backend/judge0/` and how it fits into the Exam Portal coding-assessment runtime.

Judge0 is currently the local code execution runtime. The intended production shape is backend-mediated execution through the Go exam engine, not direct browser access.

## Related Documents

- Backend schema source of truth: [database-plan.md](../../exam-engine/docs/database-plan.md)
- Go exam-engine status: [implementation-status-and-next-steps.md](../../exam-engine/docs/implementation-status-and-next-steps.md)
- Frontend status: [exam-portal-status-and-next-steps.md](../../../frontend/docs/exam-portal-status-and-next-steps.md)

## Completed

### Local Service Files

The current Judge0 service folder contains:

```text
backend/judge0/docker-compose.yml
backend/judge0/judge0.conf
backend/judge0/docs/service-status-and-next-steps.md
```

These files provide the local Docker Compose based Judge0 runtime used during development.

### Runtime URL

Default Judge0 base URL:

```text
http://localhost:2358
```

Backend override:

```text
JUDGE0_URL
```

Legacy frontend override:

```text
NEXT_PUBLIC_JUDGE0_URL
```

The Go engine now uses `JUDGE0_URL` for backend-mediated runs.

### Language IDs

Current Judge0 language IDs:

- Python: `71`
- JavaScript: `63`
- Java: `62`
- C++: `54`
- C: `50`
- Multi-file: `89`

### Go Engine Integration

The Go exam engine now owns the primary coding runtime path.

Implemented endpoint:

```text
POST /v1/attempts/{attempt_id}/answers/{exam_question_id}/runs
```

Implemented behavior:

- Validates logged-in user session.
- Validates active attempt ownership.
- Validates that the question belongs to the attempt's frozen exam version.
- Validates language and run mode.
- Persists the latest answer payload.
- Persists immutable code submissions and files.
- Persists code run records.
- Executes custom stdin or visible testcase runs against Judge0.
- Persists stdout, stderr, compile output, Judge0 status, execution time, memory, and test results.
- Validates candidate code file paths, duplicate paths, source size, entry file, and custom stdin size before calling Judge0.
- Limits Judge0 response decoding in the Go engine.
- Returns policy-shaped feedback to the frontend.

### Frontend Relationship

The frontend Coding assessment now calls the Go engine when a backend attempt is active.

The older direct browser-to-Judge0 client still exists in:

```text
frontend/lib/judge0.ts
frontend/components/assessment/coding/runWithJudge0.ts
```

That direct path should be treated as a local fallback only. It is not the production path because it cannot enforce attempt ownership, hidden testcase policy, language entitlements, timing, or persistence.

### Development Assumptions

Current local assumptions:

- Judge0 is reachable from the local machine at `http://localhost:2358`.
- Local CORS may still be permissive for fallback browser execution.
- No Judge0 authentication is required locally.
- The Go engine can reach Judge0 over localhost in the development environment.
- Candidate code execution through direct browser calls is acceptable only for prototype fallback behavior.

## Planned Production Role

Production flow should be:

1. Candidate writes code in the Next.js frontend.
2. Frontend autosaves answers to the Go exam engine.
3. Frontend requests code execution through the Go exam engine.
4. Go engine validates attempt ownership, status, language entitlement, question config, run mode, and execution limits.
5. Go engine submits code to Judge0 over a private network.
6. Go engine stores code submissions, code runs, and testcase results.
7. Frontend receives only allowed feedback for that exam policy.
8. Final scoring uses persisted submissions/runs/results rather than browser-local state.

## Not Yet Implemented

Judge0 and engine integration gaps:

- Production private network isolation.
- Judge0 authentication or network-level access control.
- Startup language availability checks.
- Health diagnostics that verify required languages are installed.
- Resource limits loaded from frozen exam/question/plugin config.
- Organization-level language restrictions.
- Exam-level language restrictions.
- Question-level language restrictions.
- Compile/run attempt limits.
- Hidden testcase execution policy.
- Final grading worker over hidden and visible cases.
- Logs and metrics for queue latency, run duration, memory, status IDs, compile failures, and Judge0 failures.
- Retention policy for raw output and logs.
- Operational runbook for production Judge0 deployment.

## Next Steps

Recommended order:

1. Keep direct browser-to-Judge0 calls as development fallback only.
2. Make the Go engine the only frontend path for coding runs.
3. Add Judge0 readiness diagnostics to the Go engine.
4. Add language availability checks for Python, Java, C++, JavaScript, C, and multi-file mode.
5. Move execution limits from hard-coded Go constants into frozen question/plugin config.
6. Enforce plugin and organization language allowlists.
7. Add hidden testcase strategy.
8. Add final grading worker and result publication handoff.
9. Add logs and metrics for Judge0 calls.
10. Document production deployment, isolation, scaling, backup, and failure behavior.

## Open Decisions

- Whether Judge0 should run as one shared platform service or as isolated services per environment or tenant.
- Whether all five languages stay enabled by default in production.
- Whether Judge0 multi-file language ID `89` is reliable enough for production.
- Whether backend should normalize multi-file bundling per language rather than relying on Judge0 multi-file behavior.
- How much compile/runtime detail candidates should see during active exams.
- Whether custom stdin should be enabled globally or controlled by plugin/exam config.
- How long raw code outputs and execution logs should be retained.

## Current Repository Notes

- `backend/judge0/docs/` was created during the documentation pass.
- The current service docs now reflect that Go-engine-mediated runs have been implemented.
- Judge0 Docker Compose configuration has not been production-hardened yet.
