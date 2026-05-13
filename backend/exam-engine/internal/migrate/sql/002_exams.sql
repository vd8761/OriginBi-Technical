-- +goose Up
-- =====================================================================
-- 002 — Exam templates, exams, sections, exam-level entitlements, assignments.
-- =====================================================================

CREATE TYPE exam_status AS ENUM (
    'draft',
    'scheduled',
    'published',
    'live',
    'paused',
    'completed',
    'archived'
);

CREATE TYPE assignment_status AS ENUM ('pending', 'active', 'expired', 'revoked');

-- ---------------- exam templates ----------------
CREATE TABLE exam_templates (
    id                      UUID PRIMARY KEY,
    org_id                  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name                    TEXT NOT NULL,
    description             TEXT,
    audience                TEXT NOT NULL,
    is_public               BOOLEAN NOT NULL DEFAULT FALSE,
    current_version_id      UUID,
    created_by              BIGINT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at              TIMESTAMPTZ
);
CREATE INDEX exam_templates_org_idx ON exam_templates(org_id) WHERE deleted_at IS NULL;
CREATE INDEX exam_templates_public_idx ON exam_templates(is_public) WHERE is_public AND deleted_at IS NULL;

CREATE TABLE exam_template_versions (
    id              UUID PRIMARY KEY,
    template_id     UUID NOT NULL REFERENCES exam_templates(id) ON DELETE CASCADE,
    version_number  INT NOT NULL,
    body            JSONB NOT NULL,
    created_by      BIGINT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (template_id, version_number)
);

ALTER TABLE exam_templates
    ADD CONSTRAINT exam_templates_current_version_fk
    FOREIGN KEY (current_version_id) REFERENCES exam_template_versions(id);

-- ---------------- exams ----------------
CREATE TABLE exams (
    id                      UUID PRIMARY KEY,
    org_id                  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    template_id             UUID REFERENCES exam_templates(id),
    audience                TEXT NOT NULL,
    title                   TEXT NOT NULL,
    slug                    TEXT NOT NULL,
    description             TEXT,
    current_version_id      UUID,
    created_by              BIGINT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at              TIMESTAMPTZ,
    UNIQUE (org_id, slug)
);
CREATE INDEX exams_org_idx ON exams(org_id) WHERE deleted_at IS NULL;

CREATE TABLE exam_versions (
    id                      UUID PRIMARY KEY,
    exam_id                 UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    version_number          INT NOT NULL,
    status                  exam_status NOT NULL DEFAULT 'draft',
    total_time_seconds      INT NOT NULL,
    schedule_starts_at      TIMESTAMPTZ,
    schedule_ends_at        TIMESTAMPTZ,
    pass_score              NUMERIC(8,2),
    max_score               NUMERIC(8,2) NOT NULL DEFAULT 0,
    attempt_policy          JSONB NOT NULL DEFAULT '{}',
    navigation_policy       JSONB NOT NULL DEFAULT '{}',
    shuffle_questions       BOOLEAN NOT NULL DEFAULT FALSE,
    shuffle_options         BOOLEAN NOT NULL DEFAULT FALSE,
    allow_review            BOOLEAN NOT NULL DEFAULT TRUE,
    result_release_mode     TEXT NOT NULL DEFAULT 'on_publish',
    settings                JSONB NOT NULL DEFAULT '{}',
    snapshot                JSONB,
    published_at            TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (exam_id, version_number)
);
CREATE INDEX exam_versions_status_idx ON exam_versions(status);
CREATE INDEX exam_versions_window_idx ON exam_versions(schedule_starts_at, schedule_ends_at);

ALTER TABLE exams
    ADD CONSTRAINT exams_current_version_fk
    FOREIGN KEY (current_version_id) REFERENCES exam_versions(id);

-- ---------------- sections ----------------
CREATE TABLE exam_sections (
    id                  UUID PRIMARY KEY,
    exam_version_id     UUID NOT NULL REFERENCES exam_versions(id) ON DELETE CASCADE,
    plugin_id           UUID REFERENCES plugins(id),
    ordinal             INT NOT NULL,
    name                TEXT NOT NULL,
    description         TEXT,
    time_limit_seconds  INT,
    is_optional         BOOLEAN NOT NULL DEFAULT FALSE,
    cutoff_score        NUMERIC(8,2),
    config              JSONB NOT NULL DEFAULT '{}',
    UNIQUE (exam_version_id, ordinal)
);

-- ---------------- exam questions ----------------
CREATE TABLE exam_questions (
    id                      UUID PRIMARY KEY,
    exam_version_id         UUID NOT NULL REFERENCES exam_versions(id) ON DELETE CASCADE,
    section_id              UUID REFERENCES exam_sections(id) ON DELETE SET NULL,
    question_version_id     UUID NOT NULL REFERENCES question_versions(id) ON DELETE RESTRICT,
    ordinal                 INT NOT NULL,
    score_override          NUMERIC(8,2),
    is_mandatory            BOOLEAN NOT NULL DEFAULT TRUE,
    per_question_seconds    INT,
    UNIQUE (exam_version_id, ordinal)
);
CREATE INDEX eq_question_version_idx ON exam_questions(question_version_id);
CREATE INDEX eq_section_idx ON exam_questions(section_id);

-- ---------------- entitlements: levels 3 + 4 ----------------
CREATE TABLE exam_plugin_entitlements (
    id              UUID PRIMARY KEY,
    exam_version_id UUID NOT NULL REFERENCES exam_versions(id) ON DELETE CASCADE,
    plugin_id       UUID NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
    state           plugin_state NOT NULL,
    config          JSONB NOT NULL DEFAULT '{}',
    UNIQUE (exam_version_id, plugin_id)
);
CREATE INDEX epe_exam_idx ON exam_plugin_entitlements(exam_version_id);

CREATE TABLE exam_question_plugin_entitlements (
    id                  UUID PRIMARY KEY,
    exam_question_id    UUID NOT NULL REFERENCES exam_questions(id) ON DELETE CASCADE,
    plugin_id           UUID NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
    state               plugin_state NOT NULL,
    config              JSONB NOT NULL DEFAULT '{}',
    UNIQUE (exam_question_id, plugin_id)
);

-- ---------------- assignments ----------------
CREATE TABLE exam_assignments (
    id                  UUID PRIMARY KEY,
    exam_version_id     UUID NOT NULL REFERENCES exam_versions(id) ON DELETE RESTRICT,
    candidate_user_id   BIGINT NOT NULL,
    assigned_by         BIGINT,
    assigned_org_id     UUID REFERENCES organizations(id),
    available_from      TIMESTAMPTZ,
    available_until     TIMESTAMPTZ,
    max_attempts        INT NOT NULL DEFAULT 1,
    status              assignment_status NOT NULL DEFAULT 'pending',
    invite_token        TEXT,
    metadata            JSONB NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (exam_version_id, candidate_user_id, assigned_org_id)
);
CREATE INDEX assignments_candidate_idx ON exam_assignments(candidate_user_id);
CREATE INDEX assignments_window_idx    ON exam_assignments(available_from, available_until);
CREATE INDEX assignments_token_idx     ON exam_assignments(invite_token) WHERE invite_token IS NOT NULL;

-- +goose Down
DROP TABLE IF EXISTS exam_assignments;
DROP TABLE IF EXISTS exam_question_plugin_entitlements;
DROP TABLE IF EXISTS exam_plugin_entitlements;
DROP TABLE IF EXISTS exam_questions;
DROP TABLE IF EXISTS exam_sections;
ALTER TABLE exams DROP CONSTRAINT IF EXISTS exams_current_version_fk;
DROP TABLE IF EXISTS exam_versions;
DROP TABLE IF EXISTS exams;
ALTER TABLE exam_templates DROP CONSTRAINT IF EXISTS exam_templates_current_version_fk;
DROP TABLE IF EXISTS exam_template_versions;
DROP TABLE IF EXISTS exam_templates;
DROP TYPE IF EXISTS assignment_status;
DROP TYPE IF EXISTS exam_status;
