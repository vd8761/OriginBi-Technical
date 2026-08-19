-- Academic reference tables: programs, departments, degree types.
--
-- These are read by the admin User Management page, which LEFT JOINs them to
-- resolve a user's designation, department and degree names. They existed only
-- in the sibling `originbi` database — a leftover from when both platforms
-- shared one database. On the separated technical database every query
-- touching them failed, so /admin/users returned 500 and showed no users at
-- all despite users existing.
--
-- Shapes mirror the sibling's so data can be imported if the platforms ever
-- need to share this catalogue again. They are intentionally created empty:
-- the LEFT JOINs COALESCE to '' and the page renders correctly with no rows.

CREATE TABLE IF NOT EXISTS programs (
    id               BIGSERIAL PRIMARY KEY,
    code             VARCHAR(50)  NOT NULL UNIQUE,
    name             VARCHAR(255) NOT NULL,
    description      TEXT,
    assessment_title VARCHAR(255),
    report_title     VARCHAR(255),
    is_demo          BOOLEAN NOT NULL DEFAULT false,
    is_active        BOOLEAN NOT NULL DEFAULT true,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS departments (
    id         BIGSERIAL PRIMARY KEY,
    name       TEXT NOT NULL,
    short_name VARCHAR(50),
    category   VARCHAR(50),
    metadata   JSONB   NOT NULL DEFAULT '{}'::jsonb,
    is_active  BOOLEAN NOT NULL DEFAULT true,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS degree_types (
    id         BIGSERIAL PRIMARY KEY,
    name       VARCHAR(50) NOT NULL,
    level      VARCHAR(20),
    is_active  BOOLEAN NOT NULL DEFAULT true,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS department_degrees (
    id              BIGSERIAL PRIMARY KEY,
    department_id   BIGINT   NOT NULL REFERENCES departments(id),
    degree_type_id  BIGINT   NOT NULL REFERENCES degree_types(id),
    course_duration SMALLINT NOT NULL DEFAULT 4,
    is_active       BOOLEAN  NOT NULL DEFAULT true,
    is_deleted      BOOLEAN  NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (department_id, degree_type_id)
);

CREATE INDEX IF NOT EXISTS idx_department_degrees_department ON department_degrees(department_id);
CREATE INDEX IF NOT EXISTS idx_department_degrees_degree     ON department_degrees(degree_type_id);
