-- +goose Up
-- =====================================================================
-- 005 — Rubrics, evaluations (auto / manual / LLM), reviewer queue.
-- =====================================================================

CREATE TYPE evaluator_kind AS ENUM ('auto', 'manual', 'llm');

CREATE TYPE evaluation_status AS ENUM (
    'queued',
    'running',
    'auto_evaluated',
    'pending_manual_review',
    'manually_reviewed',
    'failed',
    'superseded',
    'published'
);

CREATE TABLE rubrics (
    id          UUID PRIMARY KEY,
    org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE rubric_criteria (
    id          UUID PRIMARY KEY,
    rubric_id   UUID NOT NULL REFERENCES rubrics(id) ON DELETE CASCADE,
    ordinal     INT NOT NULL,
    name        TEXT NOT NULL,
    description TEXT,
    max_score   NUMERIC(6,2) NOT NULL,
    UNIQUE (rubric_id, ordinal)
);

-- exam_questions can pin a rubric for grading
ALTER TABLE exam_questions
    ADD COLUMN rubric_id UUID REFERENCES rubrics(id) ON DELETE SET NULL;

CREATE TABLE evaluations (
    id                  UUID PRIMARY KEY,
    answer_id           UUID NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
    evaluator_kind      evaluator_kind NOT NULL,
    plugin_id           UUID REFERENCES plugins(id),
    evaluator_user_id   BIGINT,
    status              evaluation_status NOT NULL DEFAULT 'queued',
    score               NUMERIC(8,2),
    feedback            TEXT,
    llm_model           TEXT,
    llm_input_tokens    INT,
    llm_output_tokens   INT,
    llm_cost_usd        NUMERIC(10,4),
    llm_raw_response    JSONB,
    started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at        TIMESTAMPTZ,
    metadata            JSONB NOT NULL DEFAULT '{}'
);
CREATE INDEX evaluations_answer_idx ON evaluations(answer_id);
CREATE INDEX evaluations_queue_idx
    ON evaluations(status, evaluator_kind)
    WHERE status IN ('queued','running','pending_manual_review');

CREATE TABLE evaluation_criterion_scores (
    id                  UUID PRIMARY KEY,
    evaluation_id       UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
    rubric_criterion_id UUID NOT NULL REFERENCES rubric_criteria(id) ON DELETE RESTRICT,
    score               NUMERIC(6,2) NOT NULL,
    feedback            TEXT,
    UNIQUE (evaluation_id, rubric_criterion_id)
);

CREATE TABLE manual_review_assignments (
    id                  UUID PRIMARY KEY,
    evaluation_id       UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
    reviewer_user_id    BIGINT,
    assigned_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    sla_due_at          TIMESTAMPTZ,
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    UNIQUE (evaluation_id)
);
CREATE INDEX mra_reviewer_open_idx
    ON manual_review_assignments(reviewer_user_id)
    WHERE completed_at IS NULL;

-- +goose Down
DROP TABLE IF EXISTS manual_review_assignments;
DROP TABLE IF EXISTS evaluation_criterion_scores;
DROP TABLE IF EXISTS evaluations;
ALTER TABLE exam_questions DROP COLUMN IF EXISTS rubric_id;
DROP TABLE IF EXISTS rubric_criteria;
DROP TABLE IF EXISTS rubrics;
DROP TYPE IF EXISTS evaluation_status;
DROP TYPE IF EXISTS evaluator_kind;
