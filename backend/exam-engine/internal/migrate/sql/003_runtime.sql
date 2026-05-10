-- +goose Up
-- =====================================================================
-- 003 — Runtime: attempts, per-question state, answers, code execution.
-- =====================================================================

CREATE TYPE attempt_status AS ENUM (
    'assigned',
    'started',
    'in_progress',
    'paused',
    'submitted',
    'timed_out',
    'under_review',
    'evaluated',
    'published',
    'cancelled'
);

CREATE TYPE q_state AS ENUM (
    'unattempted',
    'viewed',
    'attempted',
    'solved',
    'flagged',
    'skipped'
);

CREATE TYPE code_run_mode AS ENUM ('custom', 'sample', 'tests', 'final');

-- ---------------- attempts ----------------
CREATE TABLE attempts (
    id                      UUID PRIMARY KEY,
    assignment_id           UUID NOT NULL REFERENCES exam_assignments(id) ON DELETE RESTRICT,
    candidate_user_id       BIGINT NOT NULL,
    exam_version_id         UUID NOT NULL REFERENCES exam_versions(id),
    status                  attempt_status NOT NULL DEFAULT 'assigned',
    started_at              TIMESTAMPTZ,
    submitted_at            TIMESTAMPTZ,
    deadline_at             TIMESTAMPTZ,
    time_remaining_ms       INT,
    last_seen_at            TIMESTAMPTZ,
    fingerprint             JSONB NOT NULL DEFAULT '{}',
    final_score             NUMERIC(8,2),
    grading_status          TEXT NOT NULL DEFAULT 'pending',
    cancelled_reason        TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX attempts_candidate_idx
    ON attempts(candidate_user_id);
CREATE INDEX attempts_status_live_idx
    ON attempts(status)
    WHERE status IN ('started','in_progress','paused');
CREATE INDEX attempts_review_idx
    ON attempts(status)
    WHERE status = 'under_review';
CREATE INDEX attempts_assignment_idx
    ON attempts(assignment_id);

-- ---------------- per-question UI state ----------------
CREATE TABLE attempt_question_state (
    id                  UUID PRIMARY KEY,
    attempt_id          UUID NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
    exam_question_id    UUID NOT NULL REFERENCES exam_questions(id) ON DELETE RESTRICT,
    state               q_state NOT NULL DEFAULT 'unattempted',
    time_spent_ms       BIGINT NOT NULL DEFAULT 0,
    visit_count         INT NOT NULL DEFAULT 0,
    first_viewed_at     TIMESTAMPTZ,
    last_viewed_at      TIMESTAMPTZ,
    UNIQUE (attempt_id, exam_question_id)
);
CREATE INDEX aqs_attempt_idx ON attempt_question_state(attempt_id);

-- ---------------- answers ----------------
CREATE TABLE answers (
    id                      UUID PRIMARY KEY,
    attempt_id              UUID NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
    exam_question_id        UUID NOT NULL REFERENCES exam_questions(id) ON DELETE RESTRICT,
    question_version_id     UUID NOT NULL REFERENCES question_versions(id),
    payload                 JSONB NOT NULL,
    submitted_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    auto_score              NUMERIC(8,2),
    auto_feedback           JSONB,
    final_score             NUMERIC(8,2),
    grading_status          TEXT NOT NULL DEFAULT 'pending',
    UNIQUE (attempt_id, exam_question_id)
);
CREATE INDEX answers_attempt_idx ON answers(attempt_id);

-- ---------------- code submissions ----------------
CREATE TABLE code_submissions (
    id              UUID PRIMARY KEY,
    answer_id       UUID NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
    language        TEXT NOT NULL,
    entry_path      TEXT NOT NULL,
    total_bytes     INT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX code_subs_answer_idx ON code_submissions(answer_id);

CREATE TABLE code_submission_files (
    submission_id   UUID NOT NULL REFERENCES code_submissions(id) ON DELETE CASCADE,
    path            TEXT NOT NULL,
    content         TEXT NOT NULL,
    is_read_only    BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (submission_id, path)
);

-- ---------------- code runs ----------------
CREATE TABLE code_runs (
    id                      UUID PRIMARY KEY,
    attempt_id              UUID NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
    answer_id               UUID NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
    submission_id           UUID NOT NULL REFERENCES code_submissions(id),
    mode                    code_run_mode NOT NULL,
    judge0_token            TEXT,
    judge0_status_id        SMALLINT,
    judge0_status_desc      TEXT,
    stdout                  TEXT,
    stderr                  TEXT,
    compile_output          TEXT,
    time_seconds            NUMERIC(8,3),
    memory_kb               INT,
    exit_code               INT,
    custom_stdin            TEXT,
    started_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at             TIMESTAMPTZ
);
CREATE INDEX code_runs_answer_idx  ON code_runs(answer_id);
CREATE INDEX code_runs_attempt_idx ON code_runs(attempt_id, started_at DESC);

CREATE TABLE code_run_test_results (
    id              UUID PRIMARY KEY,
    code_run_id     UUID NOT NULL REFERENCES code_runs(id) ON DELETE CASCADE,
    test_case_id    UUID REFERENCES question_test_cases(id) ON DELETE SET NULL,
    ordinal         INT NOT NULL,
    passed          BOOLEAN NOT NULL,
    actual_stdout   TEXT,
    expected_stdout TEXT,
    time_seconds    NUMERIC(8,3),
    memory_kb       INT,
    UNIQUE (code_run_id, ordinal)
);

-- +goose Down
DROP TABLE IF EXISTS code_run_test_results;
DROP TABLE IF EXISTS code_runs;
DROP TABLE IF EXISTS code_submission_files;
DROP TABLE IF EXISTS code_submissions;
DROP TABLE IF EXISTS answers;
DROP TABLE IF EXISTS attempt_question_state;
DROP TABLE IF EXISTS attempts;
DROP TYPE IF EXISTS code_run_mode;
DROP TYPE IF EXISTS q_state;
DROP TYPE IF EXISTS attempt_status;
