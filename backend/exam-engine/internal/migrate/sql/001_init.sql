-- +goose Up
-- =====================================================================
-- 001 — Foundation: extensions, enums, identity, plugins, taxonomy, questions.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------- enums ----------------
CREATE TYPE org_kind AS ENUM ('individual', 'corporate', 'college', 'system');

CREATE TYPE plugin_kind AS ENUM (
    'question_type',
    'proctoring_signal',
    'evaluator',
    'media_renderer',
    'feature'
);

CREATE TYPE plugin_state AS ENUM ('disabled', 'enabled', 'restricted');

-- ---------------- organizations ----------------
CREATE TABLE organizations (
    id              UUID PRIMARY KEY,
    kind            org_kind NOT NULL,
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL UNIQUE,
    owner_user_id   BIGINT,
    parent_org_id   UUID REFERENCES organizations(id),
    branding        JSONB NOT NULL DEFAULT '{}',
    settings        JSONB NOT NULL DEFAULT '{}',
    user_quota      INT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);
CREATE INDEX organizations_owner_idx ON organizations(owner_user_id);
CREATE INDEX organizations_kind_idx  ON organizations(kind);

CREATE TABLE organization_members (
    id              UUID PRIMARY KEY,
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         BIGINT NOT NULL,
    role            TEXT NOT NULL,
    invited_by      BIGINT,
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at      TIMESTAMPTZ,
    UNIQUE (org_id, user_id, role)
);
CREATE INDEX om_user_idx ON organization_members(user_id) WHERE revoked_at IS NULL;
CREATE INDEX om_org_idx  ON organization_members(org_id)  WHERE revoked_at IS NULL;

-- Note: FKs to a `users` table are not declared here because that table is
-- owned by the identity service. Referential integrity to users is enforced
-- at the application layer.

-- ---------------- plugin catalog ----------------
CREATE TABLE plugins (
    id                  UUID PRIMARY KEY,
    kind                plugin_kind NOT NULL,
    slug                TEXT NOT NULL,
    name                TEXT NOT NULL,
    version             TEXT NOT NULL,
    schema              JSONB NOT NULL DEFAULT '{}',
    requires_license    BOOLEAN NOT NULL DEFAULT FALSE,
    enabled_by_default  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (slug, version)
);
CREATE INDEX plugins_kind_idx ON plugins(kind);

-- ---------------- entitlements: levels 1 + 2 ----------------
CREATE TABLE platform_plugin_entitlements (
    plugin_id   UUID PRIMARY KEY REFERENCES plugins(id) ON DELETE CASCADE,
    state       plugin_state NOT NULL,
    config      JSONB NOT NULL DEFAULT '{}',
    updated_by  BIGINT,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE org_plugin_entitlements (
    id          UUID PRIMARY KEY,
    org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plugin_id   UUID NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
    state       plugin_state NOT NULL,
    config      JSONB NOT NULL DEFAULT '{}',
    granted_by  BIGINT,
    granted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (org_id, plugin_id)
);
CREATE INDEX ope_org_idx ON org_plugin_entitlements(org_id);

-- ---------------- taxonomy ----------------
CREATE TABLE tags (
    id      UUID PRIMARY KEY,
    org_id  UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name    TEXT NOT NULL,
    kind    TEXT NOT NULL DEFAULT 'topic',
    color   TEXT,
    UNIQUE (org_id, kind, name)
);

CREATE TABLE media_assets (
    id              UUID PRIMARY KEY,
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    uploaded_by     BIGINT,
    storage_key     TEXT NOT NULL,
    mime_type       TEXT NOT NULL,
    byte_size       BIGINT NOT NULL,
    sha256          BYTEA NOT NULL,
    width           INT,
    height          INT,
    duration_ms     INT,
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ,
    UNIQUE (org_id, sha256)
);

-- ---------------- questions ----------------
CREATE TABLE questions (
    id                  UUID PRIMARY KEY,
    org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plugin_id           UUID NOT NULL REFERENCES plugins(id),
    created_by          BIGINT,
    current_version_id  UUID,
    title               TEXT NOT NULL,
    is_archived         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ
);
CREATE INDEX questions_org_idx    ON questions(org_id) WHERE deleted_at IS NULL;
CREATE INDEX questions_plugin_idx ON questions(plugin_id);

CREATE TABLE question_versions (
    id                      UUID PRIMARY KEY,
    question_id             UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    version_number          INT NOT NULL,
    difficulty              SMALLINT NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
    estimated_time_seconds  INT,
    body                    JSONB NOT NULL,
    max_score               NUMERIC(8,2) NOT NULL DEFAULT 0,
    is_negative_marked      BOOLEAN NOT NULL DEFAULT FALSE,
    negative_score          NUMERIC(8,2) NOT NULL DEFAULT 0,
    created_by              BIGINT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (question_id, version_number)
);

ALTER TABLE questions
    ADD CONSTRAINT questions_current_version_fk
    FOREIGN KEY (current_version_id) REFERENCES question_versions(id);

CREATE TABLE question_options (
    id                      UUID PRIMARY KEY,
    question_version_id     UUID NOT NULL REFERENCES question_versions(id) ON DELETE CASCADE,
    ordinal                 INT NOT NULL,
    label                   TEXT NOT NULL,
    is_correct              BOOLEAN NOT NULL DEFAULT FALSE,
    explanation             TEXT,
    UNIQUE (question_version_id, ordinal)
);

CREATE TABLE question_test_cases (
    id                      UUID PRIMARY KEY,
    question_version_id     UUID NOT NULL REFERENCES question_versions(id) ON DELETE CASCADE,
    ordinal                 INT NOT NULL,
    name                    TEXT,
    is_sample               BOOLEAN NOT NULL DEFAULT FALSE,
    is_hidden               BOOLEAN NOT NULL DEFAULT FALSE,
    weight                  NUMERIC(6,2) NOT NULL DEFAULT 1,
    stdin                   TEXT NOT NULL DEFAULT '',
    expected_stdout         TEXT NOT NULL DEFAULT '',
    comparator              TEXT NOT NULL DEFAULT 'trim_equal',
    comparator_config       JSONB NOT NULL DEFAULT '{}',
    UNIQUE (question_version_id, ordinal)
);

CREATE TABLE question_tags (
    question_id     UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    tag_id          UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (question_id, tag_id)
);

CREATE TABLE question_media (
    question_version_id     UUID NOT NULL REFERENCES question_versions(id) ON DELETE CASCADE,
    media_asset_id          UUID NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
    role                    TEXT NOT NULL,
    ordinal                 INT NOT NULL DEFAULT 0,
    PRIMARY KEY (question_version_id, media_asset_id, role)
);

-- +goose Down
DROP TABLE IF EXISTS question_media;
DROP TABLE IF EXISTS question_tags;
DROP TABLE IF EXISTS question_test_cases;
DROP TABLE IF EXISTS question_options;
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_current_version_fk;
DROP TABLE IF EXISTS question_versions;
DROP TABLE IF EXISTS questions;
DROP TABLE IF EXISTS media_assets;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS org_plugin_entitlements;
DROP TABLE IF EXISTS platform_plugin_entitlements;
DROP TABLE IF EXISTS plugins;
DROP TABLE IF EXISTS organization_members;
DROP TABLE IF EXISTS organizations;
DROP TYPE IF EXISTS plugin_state;
DROP TYPE IF EXISTS plugin_kind;
DROP TYPE IF EXISTS org_kind;
