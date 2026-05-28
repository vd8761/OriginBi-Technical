-- +goose Up
-- ==================================================================
-- 001 baseline - squashed from migrations 001..026 (applied on Neon)
-- + enum types + ALTER TYPE additions + seed data (plugins, organizations)
-- Generated 2026-05-28T05:29:36Z from pg_dump of origin_neon
--
-- Notes:
--   * Triggers and FKs referencing externally-managed tables (groups, programs
--     and their TypeORM-created trigger functions) are NOT included here.
--     Set those up via the assessment-service or sibling app before applying
--     this baseline on a fresh install.
-- ==================================================================

-- ── custom types (from migrations 001-005, 012) ──────────────
-- ── CREATE TYPE statements extracted from migrations 001-026 ──────

-- from 001_init.sql
CREATE TYPE org_kind AS ENUM ('individual', 'corporate', 'college', 'system');

-- from 001_init.sql
CREATE TYPE plugin_kind AS ENUM (
    'question_type',
    'proctoring_signal',
    'evaluator',
    'media_renderer',
    'feature'
);

-- from 001_init.sql
CREATE TYPE plugin_state AS ENUM ('disabled', 'enabled', 'restricted');

-- from 002_exams.sql
CREATE TYPE exam_status AS ENUM (
    'draft',
    'scheduled',
    'published',
    'live',
    'paused',
    'completed',
    'archived'
);

-- from 002_exams.sql
CREATE TYPE assignment_status AS ENUM ('pending', 'active', 'expired', 'revoked');

-- from 003_runtime.sql
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

-- from 003_runtime.sql
CREATE TYPE q_state AS ENUM (
    'unattempted',
    'viewed',
    'attempted',
    'solved',
    'flagged',
    'skipped'
);

-- from 003_runtime.sql
CREATE TYPE code_run_mode AS ENUM ('custom', 'sample', 'tests', 'final');

-- from 005_evaluation.sql
CREATE TYPE evaluator_kind AS ENUM ('auto', 'manual', 'llm');

-- from 005_evaluation.sql
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



-- from 012_language_plugins_and_categories.sql
ALTER TYPE plugin_kind ADD VALUE IF NOT EXISTS 'language';
ALTER TYPE plugin_kind ADD VALUE IF NOT EXISTS 'runner';

-- ── tables, indexes, constraints (from pg_dump) ──────────────
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.8 (ad62774)
-- Dumped by pg_dump version 17.10 (Ubuntu 17.10-1.pgdg24.04+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: answers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.answers (
    id uuid NOT NULL,
    attempt_id uuid NOT NULL,
    exam_question_id uuid NOT NULL,
    question_version_id uuid NOT NULL,
    payload jsonb NOT NULL,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    auto_score numeric(8,2),
    auto_feedback jsonb,
    final_score numeric(8,2),
    grading_status text DEFAULT 'pending'::text NOT NULL
);


--
-- Name: attempt_connectivity_gaps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attempt_connectivity_gaps (
    id uuid NOT NULL,
    attempt_id uuid NOT NULL,
    started_at timestamp with time zone NOT NULL,
    ended_at timestamp with time zone NOT NULL,
    duration_ms integer NOT NULL,
    breached_grace boolean NOT NULL,
    auto_resolved boolean DEFAULT false NOT NULL
);


--
-- Name: attempt_event_summary; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attempt_event_summary (
    attempt_id uuid NOT NULL,
    kind text NOT NULL,
    count integer DEFAULT 0 NOT NULL,
    last_at timestamp with time zone
);


--
-- Name: attempt_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attempt_events (
    id bigint NOT NULL,
    attempt_id uuid NOT NULL,
    occurred_at timestamp with time zone NOT NULL,
    kind text NOT NULL,
    severity smallint DEFAULT 0 NOT NULL,
    exam_question_id uuid,
    plugin_id uuid,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: attempt_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.attempt_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: attempt_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.attempt_events_id_seq OWNED BY public.attempt_events.id;


--
-- Name: attempt_heartbeats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attempt_heartbeats (
    id bigint NOT NULL,
    attempt_id uuid NOT NULL,
    sent_at timestamp with time zone NOT NULL,
    received_at timestamp with time zone NOT NULL,
    rtt_ms integer,
    client_state jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: attempt_heartbeats_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.attempt_heartbeats_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: attempt_heartbeats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.attempt_heartbeats_id_seq OWNED BY public.attempt_heartbeats.id;


--
-- Name: attempt_question_state; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attempt_question_state (
    id uuid NOT NULL,
    attempt_id uuid NOT NULL,
    exam_question_id uuid NOT NULL,
    state public.q_state DEFAULT 'unattempted'::public.q_state NOT NULL,
    time_spent_ms bigint DEFAULT 0 NOT NULL,
    visit_count integer DEFAULT 0 NOT NULL,
    first_viewed_at timestamp with time zone,
    last_viewed_at timestamp with time zone
);


--
-- Name: attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attempts (
    id uuid NOT NULL,
    assignment_id uuid NOT NULL,
    candidate_user_id bigint NOT NULL,
    exam_version_id uuid NOT NULL,
    status public.attempt_status DEFAULT 'assigned'::public.attempt_status NOT NULL,
    started_at timestamp with time zone,
    submitted_at timestamp with time zone,
    deadline_at timestamp with time zone,
    time_remaining_ms integer,
    last_seen_at timestamp with time zone,
    fingerprint jsonb DEFAULT '{}'::jsonb NOT NULL,
    final_score numeric(8,2),
    grading_status text DEFAULT 'pending'::text NOT NULL,
    cancelled_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: code_run_test_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.code_run_test_results (
    id uuid NOT NULL,
    code_run_id uuid NOT NULL,
    test_case_id uuid,
    ordinal integer NOT NULL,
    passed boolean NOT NULL,
    actual_stdout text,
    expected_stdout text,
    time_seconds numeric(8,3),
    memory_kb integer
);


--
-- Name: code_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.code_runs (
    id uuid NOT NULL,
    attempt_id uuid NOT NULL,
    answer_id uuid NOT NULL,
    submission_id uuid NOT NULL,
    mode public.code_run_mode NOT NULL,
    judge0_token text,
    judge0_status_id smallint,
    judge0_status_desc text,
    stdout text,
    stderr text,
    compile_output text,
    time_seconds numeric(8,3),
    memory_kb integer,
    exit_code integer,
    custom_stdin text,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone
);


--
-- Name: code_submission_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.code_submission_files (
    submission_id uuid NOT NULL,
    path text NOT NULL,
    content text NOT NULL,
    is_read_only boolean DEFAULT false NOT NULL,
    language text,
    locked_regions jsonb
);


--
-- Name: code_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.code_submissions (
    id uuid NOT NULL,
    answer_id uuid NOT NULL,
    language text NOT NULL,
    entry_path text NOT NULL,
    total_bytes integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: evaluation_criterion_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.evaluation_criterion_scores (
    id uuid NOT NULL,
    evaluation_id uuid NOT NULL,
    rubric_criterion_id uuid NOT NULL,
    score numeric(6,2) NOT NULL,
    feedback text
);


--
-- Name: evaluations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.evaluations (
    id uuid NOT NULL,
    answer_id uuid NOT NULL,
    evaluator_kind public.evaluator_kind NOT NULL,
    plugin_id uuid,
    evaluator_user_id bigint,
    status public.evaluation_status DEFAULT 'queued'::public.evaluation_status NOT NULL,
    score numeric(8,2),
    feedback text,
    llm_model text,
    llm_input_tokens integer,
    llm_output_tokens integer,
    llm_cost_usd numeric(10,4),
    llm_raw_response jsonb,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: exam_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_assignments (
    id uuid NOT NULL,
    exam_version_id uuid NOT NULL,
    candidate_user_id bigint NOT NULL,
    assigned_by bigint,
    assigned_org_id uuid,
    available_from timestamp with time zone,
    available_until timestamp with time zone,
    max_attempts integer DEFAULT 1 NOT NULL,
    status public.assignment_status DEFAULT 'pending'::public.assignment_status NOT NULL,
    invite_token text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    assignment_ref text
);


--
-- Name: exam_plugin_entitlements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_plugin_entitlements (
    id uuid NOT NULL,
    exam_version_id uuid NOT NULL,
    plugin_id uuid NOT NULL,
    state public.plugin_state NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: exam_question_plugin_entitlements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_question_plugin_entitlements (
    id uuid NOT NULL,
    exam_question_id uuid NOT NULL,
    plugin_id uuid NOT NULL,
    state public.plugin_state NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: exam_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_questions (
    id uuid NOT NULL,
    exam_version_id uuid NOT NULL,
    section_id uuid,
    question_version_id uuid NOT NULL,
    ordinal integer NOT NULL,
    score_override numeric(8,2),
    is_mandatory boolean DEFAULT true NOT NULL,
    per_question_seconds integer,
    rubric_id uuid
);


--
-- Name: exam_sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_sections (
    id uuid NOT NULL,
    exam_version_id uuid NOT NULL,
    plugin_id uuid,
    ordinal integer NOT NULL,
    name text NOT NULL,
    description text,
    time_limit_seconds integer,
    is_optional boolean DEFAULT false NOT NULL,
    cutoff_score numeric(8,2),
    config jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: exam_template_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_template_versions (
    id uuid NOT NULL,
    template_id uuid NOT NULL,
    version_number integer NOT NULL,
    body jsonb NOT NULL,
    created_by bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: exam_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_templates (
    id uuid NOT NULL,
    org_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    audience text NOT NULL,
    is_public boolean DEFAULT false NOT NULL,
    current_version_id uuid,
    created_by bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: exam_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_versions (
    id uuid NOT NULL,
    exam_id uuid NOT NULL,
    version_number integer NOT NULL,
    status public.exam_status DEFAULT 'draft'::public.exam_status NOT NULL,
    total_time_seconds integer NOT NULL,
    schedule_starts_at timestamp with time zone,
    schedule_ends_at timestamp with time zone,
    pass_score numeric(8,2),
    max_score numeric(8,2) DEFAULT 0 NOT NULL,
    attempt_policy jsonb DEFAULT '{}'::jsonb NOT NULL,
    navigation_policy jsonb DEFAULT '{}'::jsonb NOT NULL,
    shuffle_questions boolean DEFAULT false NOT NULL,
    shuffle_options boolean DEFAULT false NOT NULL,
    allow_review boolean DEFAULT true NOT NULL,
    result_release_mode text DEFAULT 'on_publish'::text NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    snapshot jsonb,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: exams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exams (
    id uuid NOT NULL,
    org_id uuid NOT NULL,
    template_id uuid,
    audience text NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    description text,
    current_version_id uuid,
    created_by bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: manual_review_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.manual_review_assignments (
    id uuid NOT NULL,
    evaluation_id uuid NOT NULL,
    reviewer_user_id bigint,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    sla_due_at timestamp with time zone,
    started_at timestamp with time zone,
    completed_at timestamp with time zone
);


--
-- Name: media_assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.media_assets (
    id uuid NOT NULL,
    org_id uuid NOT NULL,
    uploaded_by bigint,
    storage_key text NOT NULL,
    mime_type text NOT NULL,
    byte_size bigint NOT NULL,
    sha256 bytea NOT NULL,
    width integer,
    height integer,
    duration_ms integer,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: org_plugin_entitlements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.org_plugin_entitlements (
    id uuid NOT NULL,
    org_id uuid NOT NULL,
    plugin_id uuid NOT NULL,
    state public.plugin_state NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    granted_by bigint,
    granted_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: organization_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organization_members (
    id uuid NOT NULL,
    org_id uuid NOT NULL,
    user_id bigint NOT NULL,
    role text NOT NULL,
    invited_by bigint,
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone
);


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    id uuid NOT NULL,
    kind public.org_kind NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    owner_user_id bigint,
    parent_org_id uuid,
    branding jsonb DEFAULT '{}'::jsonb NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    user_quota integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: platform_plugin_entitlements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_plugin_entitlements (
    plugin_id uuid NOT NULL,
    state public.plugin_state NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_by bigint,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: plugin_decisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plugin_decisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    attempt_id uuid NOT NULL,
    plugin_id uuid NOT NULL,
    trigger_event_id uuid,
    decision text NOT NULL,
    reason text,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: plugins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plugins (
    id uuid NOT NULL,
    kind public.plugin_kind NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    version text NOT NULL,
    schema jsonb DEFAULT '{}'::jsonb NOT NULL,
    requires_license boolean DEFAULT false NOT NULL,
    enabled_by_default boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    plugin_type text,
    category text,
    requires jsonb DEFAULT '[]'::jsonb NOT NULL,
    extends jsonb DEFAULT '[]'::jsonb NOT NULL,
    provides jsonb DEFAULT '[]'::jsonb NOT NULL
);


--
-- Name: question_media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_media (
    question_version_id uuid NOT NULL,
    media_asset_id uuid NOT NULL,
    role text NOT NULL,
    ordinal integer DEFAULT 0 NOT NULL
);


--
-- Name: question_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_options (
    id uuid NOT NULL,
    question_version_id uuid NOT NULL,
    ordinal integer NOT NULL,
    label text NOT NULL,
    is_correct boolean DEFAULT false NOT NULL,
    explanation text
);


--
-- Name: question_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_tags (
    question_id uuid NOT NULL,
    tag_id uuid NOT NULL
);


--
-- Name: question_test_cases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_test_cases (
    id uuid NOT NULL,
    question_version_id uuid NOT NULL,
    ordinal integer NOT NULL,
    name text,
    is_sample boolean DEFAULT false NOT NULL,
    is_hidden boolean DEFAULT false NOT NULL,
    weight numeric(6,2) DEFAULT 1 NOT NULL,
    stdin text DEFAULT ''::text NOT NULL,
    expected_stdout text DEFAULT ''::text NOT NULL,
    comparator text DEFAULT 'trim_equal'::text NOT NULL,
    comparator_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    explanation text DEFAULT ''::text NOT NULL
);


--
-- Name: question_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_versions (
    id uuid NOT NULL,
    question_id uuid NOT NULL,
    version_number integer NOT NULL,
    difficulty smallint NOT NULL,
    estimated_time_seconds integer,
    body jsonb NOT NULL,
    max_score numeric(8,2) DEFAULT 0 NOT NULL,
    is_negative_marked boolean DEFAULT false NOT NULL,
    negative_score numeric(8,2) DEFAULT 0 NOT NULL,
    created_by bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT question_versions_difficulty_check CHECK (((difficulty >= 1) AND (difficulty <= 5)))
);


--
-- Name: questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.questions (
    id uuid NOT NULL,
    org_id uuid NOT NULL,
    plugin_id uuid NOT NULL,
    created_by bigint,
    current_version_id uuid,
    title text NOT NULL,
    is_archived boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: registrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.registrations (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    registration_source character varying(20) DEFAULT 'SELF'::character varying NOT NULL,
    created_by_user_id bigint,
    corporate_account_id bigint,
    reseller_account_id bigint,
    school_level character varying(20),
    school_stream character varying(20),
    department_degree_id bigint,
    group_id bigint,
    payment_required boolean DEFAULT false NOT NULL,
    payment_provider character varying(20),
    payment_reference character varying(100),
    payment_amount numeric(10,2),
    payment_status character varying(20) DEFAULT 'NOT_REQUIRED'::character varying NOT NULL,
    payment_created_at timestamp with time zone,
    paid_at timestamp with time zone,
    status character varying(20) DEFAULT 'INCOMPLETE'::character varying NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    country_code character varying(10) DEFAULT '+91'::character varying NOT NULL,
    mobile_number character varying(20) NOT NULL,
    gender character varying(10),
    full_name character varying(255),
    assessment_session_id bigint,
    program_id bigint,
    student_board character varying(20),
    has_ai_counsellor boolean DEFAULT false NOT NULL,
    is_tech_assessment smallint DEFAULT 0
);


--
-- Name: registrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.registrations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: registrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.registrations_id_seq OWNED BY public.registrations.id;


--
-- Name: result_publications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.result_publications (
    id uuid NOT NULL,
    attempt_id uuid NOT NULL,
    published_at timestamp with time zone DEFAULT now() NOT NULL,
    published_by bigint,
    visibility text NOT NULL,
    feedback_level text NOT NULL,
    snapshot jsonb NOT NULL,
    revoked_at timestamp with time zone,
    revoked_by bigint
);


--
-- Name: rubric_criteria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rubric_criteria (
    id uuid NOT NULL,
    rubric_id uuid NOT NULL,
    ordinal integer NOT NULL,
    name text NOT NULL,
    description text,
    max_score numeric(6,2) NOT NULL
);


--
-- Name: rubrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rubrics (
    id uuid NOT NULL,
    org_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tags (
    id uuid NOT NULL,
    org_id uuid,
    name text NOT NULL,
    kind text DEFAULT 'topic'::text NOT NULL,
    color text
);


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    id uuid NOT NULL,
    user_id bigint NOT NULL,
    token_hash text NOT NULL,
    user_agent text,
    ip_address text,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    email_verified boolean DEFAULT false NOT NULL,
    first_login_at timestamp with time zone,
    last_login_at timestamp with time zone,
    login_count integer DEFAULT 0 NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_blocked boolean DEFAULT false NOT NULL,
    corporate_id character varying,
    cognito_sub character varying,
    email character varying,
    role character varying,
    avatar_url character varying,
    last_login_ip character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: attempt_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attempt_events ALTER COLUMN id SET DEFAULT nextval('public.attempt_events_id_seq'::regclass);


--
-- Name: attempt_heartbeats id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attempt_heartbeats ALTER COLUMN id SET DEFAULT nextval('public.attempt_heartbeats_id_seq'::regclass);


--
-- Name: registrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registrations ALTER COLUMN id SET DEFAULT nextval('public.registrations_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: answers answers_attempt_id_exam_question_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answers
    ADD CONSTRAINT answers_attempt_id_exam_question_id_key UNIQUE (attempt_id, exam_question_id);


--
-- Name: answers answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answers
    ADD CONSTRAINT answers_pkey PRIMARY KEY (id);


--
-- Name: attempt_connectivity_gaps attempt_connectivity_gaps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attempt_connectivity_gaps
    ADD CONSTRAINT attempt_connectivity_gaps_pkey PRIMARY KEY (id);


--
-- Name: attempt_event_summary attempt_event_summary_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attempt_event_summary
    ADD CONSTRAINT attempt_event_summary_pkey PRIMARY KEY (attempt_id, kind);


--
-- Name: attempt_events attempt_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attempt_events
    ADD CONSTRAINT attempt_events_pkey PRIMARY KEY (id);


--
-- Name: attempt_heartbeats attempt_heartbeats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attempt_heartbeats
    ADD CONSTRAINT attempt_heartbeats_pkey PRIMARY KEY (id);


--
-- Name: attempt_question_state attempt_question_state_attempt_id_exam_question_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attempt_question_state
    ADD CONSTRAINT attempt_question_state_attempt_id_exam_question_id_key UNIQUE (attempt_id, exam_question_id);


--
-- Name: attempt_question_state attempt_question_state_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attempt_question_state
    ADD CONSTRAINT attempt_question_state_pkey PRIMARY KEY (id);


--
-- Name: attempts attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attempts
    ADD CONSTRAINT attempts_pkey PRIMARY KEY (id);


--
-- Name: code_run_test_results code_run_test_results_code_run_id_ordinal_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.code_run_test_results
    ADD CONSTRAINT code_run_test_results_code_run_id_ordinal_key UNIQUE (code_run_id, ordinal);


--
-- Name: code_run_test_results code_run_test_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.code_run_test_results
    ADD CONSTRAINT code_run_test_results_pkey PRIMARY KEY (id);


--
-- Name: code_runs code_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.code_runs
    ADD CONSTRAINT code_runs_pkey PRIMARY KEY (id);


--
-- Name: code_submission_files code_submission_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.code_submission_files
    ADD CONSTRAINT code_submission_files_pkey PRIMARY KEY (submission_id, path);


--
-- Name: code_submissions code_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.code_submissions
    ADD CONSTRAINT code_submissions_pkey PRIMARY KEY (id);


--
-- Name: evaluation_criterion_scores evaluation_criterion_scores_evaluation_id_rubric_criterion__key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evaluation_criterion_scores
    ADD CONSTRAINT evaluation_criterion_scores_evaluation_id_rubric_criterion__key UNIQUE (evaluation_id, rubric_criterion_id);


--
-- Name: evaluation_criterion_scores evaluation_criterion_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evaluation_criterion_scores
    ADD CONSTRAINT evaluation_criterion_scores_pkey PRIMARY KEY (id);


--
-- Name: evaluations evaluations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evaluations
    ADD CONSTRAINT evaluations_pkey PRIMARY KEY (id);


--
-- Name: exam_assignments exam_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_assignments
    ADD CONSTRAINT exam_assignments_pkey PRIMARY KEY (id);


--
-- Name: exam_plugin_entitlements exam_plugin_entitlements_exam_version_id_plugin_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_plugin_entitlements
    ADD CONSTRAINT exam_plugin_entitlements_exam_version_id_plugin_id_key UNIQUE (exam_version_id, plugin_id);


--
-- Name: exam_plugin_entitlements exam_plugin_entitlements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_plugin_entitlements
    ADD CONSTRAINT exam_plugin_entitlements_pkey PRIMARY KEY (id);


--
-- Name: exam_question_plugin_entitlements exam_question_plugin_entitlement_exam_question_id_plugin_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_question_plugin_entitlements
    ADD CONSTRAINT exam_question_plugin_entitlement_exam_question_id_plugin_id_key UNIQUE (exam_question_id, plugin_id);


--
-- Name: exam_question_plugin_entitlements exam_question_plugin_entitlements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_question_plugin_entitlements
    ADD CONSTRAINT exam_question_plugin_entitlements_pkey PRIMARY KEY (id);


--
-- Name: exam_questions exam_questions_exam_version_id_ordinal_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_questions
    ADD CONSTRAINT exam_questions_exam_version_id_ordinal_key UNIQUE (exam_version_id, ordinal);


--
-- Name: exam_questions exam_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_questions
    ADD CONSTRAINT exam_questions_pkey PRIMARY KEY (id);


--
-- Name: exam_sections exam_sections_exam_version_id_ordinal_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_sections
    ADD CONSTRAINT exam_sections_exam_version_id_ordinal_key UNIQUE (exam_version_id, ordinal);


--
-- Name: exam_sections exam_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_sections
    ADD CONSTRAINT exam_sections_pkey PRIMARY KEY (id);


--
-- Name: exam_template_versions exam_template_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_template_versions
    ADD CONSTRAINT exam_template_versions_pkey PRIMARY KEY (id);


--
-- Name: exam_template_versions exam_template_versions_template_id_version_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_template_versions
    ADD CONSTRAINT exam_template_versions_template_id_version_number_key UNIQUE (template_id, version_number);


--
-- Name: exam_templates exam_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_templates
    ADD CONSTRAINT exam_templates_pkey PRIMARY KEY (id);


--
-- Name: exam_versions exam_versions_exam_id_version_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_versions
    ADD CONSTRAINT exam_versions_exam_id_version_number_key UNIQUE (exam_id, version_number);


--
-- Name: exam_versions exam_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_versions
    ADD CONSTRAINT exam_versions_pkey PRIMARY KEY (id);


--
-- Name: exams exams_org_id_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_org_id_slug_key UNIQUE (org_id, slug);


--
-- Name: exams exams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_pkey PRIMARY KEY (id);


--
-- Name: manual_review_assignments manual_review_assignments_evaluation_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manual_review_assignments
    ADD CONSTRAINT manual_review_assignments_evaluation_id_key UNIQUE (evaluation_id);


--
-- Name: manual_review_assignments manual_review_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manual_review_assignments
    ADD CONSTRAINT manual_review_assignments_pkey PRIMARY KEY (id);


--
-- Name: media_assets media_assets_org_id_sha256_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_assets
    ADD CONSTRAINT media_assets_org_id_sha256_key UNIQUE (org_id, sha256);


--
-- Name: media_assets media_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_assets
    ADD CONSTRAINT media_assets_pkey PRIMARY KEY (id);


--
-- Name: org_plugin_entitlements org_plugin_entitlements_org_id_plugin_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_plugin_entitlements
    ADD CONSTRAINT org_plugin_entitlements_org_id_plugin_id_key UNIQUE (org_id, plugin_id);


--
-- Name: org_plugin_entitlements org_plugin_entitlements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_plugin_entitlements
    ADD CONSTRAINT org_plugin_entitlements_pkey PRIMARY KEY (id);


--
-- Name: organization_members organization_members_org_id_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_org_id_user_id_role_key UNIQUE (org_id, user_id, role);


--
-- Name: organization_members organization_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_slug_key UNIQUE (slug);


--
-- Name: platform_plugin_entitlements platform_plugin_entitlements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_plugin_entitlements
    ADD CONSTRAINT platform_plugin_entitlements_pkey PRIMARY KEY (plugin_id);


--
-- Name: plugin_decisions plugin_decisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plugin_decisions
    ADD CONSTRAINT plugin_decisions_pkey PRIMARY KEY (id);


--
-- Name: plugins plugins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plugins
    ADD CONSTRAINT plugins_pkey PRIMARY KEY (id);


--
-- Name: plugins plugins_slug_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plugins
    ADD CONSTRAINT plugins_slug_version_key UNIQUE (slug, version);


--
-- Name: question_media question_media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_media
    ADD CONSTRAINT question_media_pkey PRIMARY KEY (question_version_id, media_asset_id, role);


--
-- Name: question_options question_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_options
    ADD CONSTRAINT question_options_pkey PRIMARY KEY (id);


--
-- Name: question_options question_options_question_version_id_ordinal_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_options
    ADD CONSTRAINT question_options_question_version_id_ordinal_key UNIQUE (question_version_id, ordinal);


--
-- Name: question_tags question_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_tags
    ADD CONSTRAINT question_tags_pkey PRIMARY KEY (question_id, tag_id);


--
-- Name: question_test_cases question_test_cases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_test_cases
    ADD CONSTRAINT question_test_cases_pkey PRIMARY KEY (id);


--
-- Name: question_test_cases question_test_cases_question_version_id_ordinal_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_test_cases
    ADD CONSTRAINT question_test_cases_question_version_id_ordinal_key UNIQUE (question_version_id, ordinal);


--
-- Name: question_versions question_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_versions
    ADD CONSTRAINT question_versions_pkey PRIMARY KEY (id);


--
-- Name: question_versions question_versions_question_id_version_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_versions
    ADD CONSTRAINT question_versions_question_id_version_number_key UNIQUE (question_id, version_number);


--
-- Name: questions questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_pkey PRIMARY KEY (id);


--
-- Name: registrations registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registrations
    ADD CONSTRAINT registrations_pkey PRIMARY KEY (id);


--
-- Name: result_publications result_publications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.result_publications
    ADD CONSTRAINT result_publications_pkey PRIMARY KEY (id);


--
-- Name: rubric_criteria rubric_criteria_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rubric_criteria
    ADD CONSTRAINT rubric_criteria_pkey PRIMARY KEY (id);


--
-- Name: rubric_criteria rubric_criteria_rubric_id_ordinal_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rubric_criteria
    ADD CONSTRAINT rubric_criteria_rubric_id_ordinal_key UNIQUE (rubric_id, ordinal);


--
-- Name: rubrics rubrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rubrics
    ADD CONSTRAINT rubrics_pkey PRIMARY KEY (id);


--
-- Name: tags tags_org_id_kind_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_org_id_kind_name_key UNIQUE (org_id, kind, name);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_token_hash_key UNIQUE (token_hash);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: answers_attempt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX answers_attempt_idx ON public.answers USING btree (attempt_id);


--
-- Name: answers_grading_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX answers_grading_status_idx ON public.answers USING btree (grading_status, submitted_at DESC);


--
-- Name: aqs_attempt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX aqs_attempt_idx ON public.attempt_question_state USING btree (attempt_id);


--
-- Name: assignments_candidate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX assignments_candidate_idx ON public.exam_assignments USING btree (candidate_user_id);


--
-- Name: assignments_candidate_ref_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX assignments_candidate_ref_active_idx ON public.exam_assignments USING btree (candidate_user_id, assignment_ref) WHERE ((assignment_ref IS NOT NULL) AND (status <> 'revoked'::public.assignment_status));


--
-- Name: assignments_token_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX assignments_token_idx ON public.exam_assignments USING btree (invite_token) WHERE (invite_token IS NOT NULL);


--
-- Name: assignments_window_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX assignments_window_idx ON public.exam_assignments USING btree (available_from, available_until);


--
-- Name: attempt_events_attempt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX attempt_events_attempt_idx ON public.attempt_events USING btree (attempt_id, occurred_at DESC);


--
-- Name: attempt_events_kind_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX attempt_events_kind_idx ON public.attempt_events USING btree (kind, occurred_at);


--
-- Name: attempt_events_severity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX attempt_events_severity_idx ON public.attempt_events USING btree (severity, occurred_at) WHERE (severity >= 2);


--
-- Name: attempt_heartbeats_attempt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX attempt_heartbeats_attempt_idx ON public.attempt_heartbeats USING btree (attempt_id, received_at DESC);


--
-- Name: attempts_assignment_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX attempts_assignment_idx ON public.attempts USING btree (assignment_id);


--
-- Name: attempts_candidate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX attempts_candidate_idx ON public.attempts USING btree (candidate_user_id);


--
-- Name: attempts_live_last_seen_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX attempts_live_last_seen_idx ON public.attempts USING btree (last_seen_at DESC) WHERE (status = ANY (ARRAY['started'::public.attempt_status, 'in_progress'::public.attempt_status, 'paused'::public.attempt_status]));


--
-- Name: attempts_one_active_per_assignment_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX attempts_one_active_per_assignment_idx ON public.attempts USING btree (assignment_id) WHERE (status = ANY (ARRAY['started'::public.attempt_status, 'in_progress'::public.attempt_status, 'paused'::public.attempt_status]));


--
-- Name: attempts_review_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX attempts_review_idx ON public.attempts USING btree (status) WHERE (status = 'under_review'::public.attempt_status);


--
-- Name: attempts_status_live_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX attempts_status_live_idx ON public.attempts USING btree (status) WHERE (status = ANY (ARRAY['started'::public.attempt_status, 'in_progress'::public.attempt_status, 'paused'::public.attempt_status]));


--
-- Name: code_run_test_results_passed_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX code_run_test_results_passed_idx ON public.code_run_test_results USING btree (code_run_id, passed);


--
-- Name: code_runs_answer_final_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX code_runs_answer_final_idx ON public.code_runs USING btree (answer_id, finished_at DESC) WHERE ((mode = 'final'::public.code_run_mode) AND (finished_at IS NOT NULL));


--
-- Name: code_runs_answer_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX code_runs_answer_idx ON public.code_runs USING btree (answer_id);


--
-- Name: code_runs_attempt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX code_runs_attempt_idx ON public.code_runs USING btree (attempt_id, started_at DESC);


--
-- Name: code_runs_unfinished_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX code_runs_unfinished_idx ON public.code_runs USING btree (started_at) WHERE (finished_at IS NULL);


--
-- Name: code_subs_answer_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX code_subs_answer_idx ON public.code_submissions USING btree (answer_id);


--
-- Name: epe_exam_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX epe_exam_idx ON public.exam_plugin_entitlements USING btree (exam_version_id);


--
-- Name: eq_question_version_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX eq_question_version_idx ON public.exam_questions USING btree (question_version_id);


--
-- Name: eq_section_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX eq_section_idx ON public.exam_questions USING btree (section_id);


--
-- Name: evaluations_answer_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX evaluations_answer_idx ON public.evaluations USING btree (answer_id);


--
-- Name: evaluations_queue_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX evaluations_queue_idx ON public.evaluations USING btree (status, evaluator_kind) WHERE (status = ANY (ARRAY['queued'::public.evaluation_status, 'running'::public.evaluation_status, 'pending_manual_review'::public.evaluation_status]));


--
-- Name: exam_templates_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX exam_templates_org_idx ON public.exam_templates USING btree (org_id) WHERE (deleted_at IS NULL);


--
-- Name: exam_templates_public_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX exam_templates_public_idx ON public.exam_templates USING btree (is_public) WHERE (is_public AND (deleted_at IS NULL));


--
-- Name: exam_versions_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX exam_versions_status_idx ON public.exam_versions USING btree (status);


--
-- Name: exam_versions_window_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX exam_versions_window_idx ON public.exam_versions USING btree (schedule_starts_at, schedule_ends_at);


--
-- Name: exams_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX exams_org_idx ON public.exams USING btree (org_id) WHERE (deleted_at IS NULL);


--
-- Name: gaps_attempt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX gaps_attempt_idx ON public.attempt_connectivity_gaps USING btree (attempt_id, started_at);


--
-- Name: mra_reviewer_open_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mra_reviewer_open_idx ON public.manual_review_assignments USING btree (reviewer_user_id) WHERE (completed_at IS NULL);


--
-- Name: om_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX om_org_idx ON public.organization_members USING btree (org_id) WHERE (revoked_at IS NULL);


--
-- Name: om_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX om_user_idx ON public.organization_members USING btree (user_id) WHERE (revoked_at IS NULL);


--
-- Name: ope_org_enabled_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ope_org_enabled_idx ON public.org_plugin_entitlements USING btree (org_id, plugin_id) WHERE (state = 'enabled'::public.plugin_state);


--
-- Name: ope_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ope_org_idx ON public.org_plugin_entitlements USING btree (org_id);


--
-- Name: organizations_kind_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX organizations_kind_idx ON public.organizations USING btree (kind);


--
-- Name: organizations_owner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX organizations_owner_idx ON public.organizations USING btree (owner_user_id);


--
-- Name: plugin_decisions_attempt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX plugin_decisions_attempt_idx ON public.plugin_decisions USING btree (attempt_id, created_at DESC);


--
-- Name: plugin_decisions_decision_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX plugin_decisions_decision_idx ON public.plugin_decisions USING btree (decision, created_at DESC);


--
-- Name: plugin_decisions_plugin_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX plugin_decisions_plugin_idx ON public.plugin_decisions USING btree (plugin_id, created_at DESC);


--
-- Name: plugins_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX plugins_category_idx ON public.plugins USING btree (category) WHERE (category IS NOT NULL);


--
-- Name: plugins_kind_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX plugins_kind_idx ON public.plugins USING btree (kind);


--
-- Name: questions_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX questions_org_idx ON public.questions USING btree (org_id) WHERE (deleted_at IS NULL);


--
-- Name: questions_plugin_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX questions_plugin_idx ON public.questions USING btree (plugin_id);


--
-- Name: registrations_admin_source_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX registrations_admin_source_idx ON public.registrations USING btree (user_id) WHERE ((registration_source)::text = 'ADMIN'::text);


--
-- Name: rp_attempt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX rp_attempt_idx ON public.result_publications USING btree (attempt_id);


--
-- Name: user_sessions_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_sessions_active_idx ON public.user_sessions USING btree (expires_at) WHERE (revoked_at IS NULL);


--
-- Name: user_sessions_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_sessions_user_idx ON public.user_sessions USING btree (user_id);


--
-- Name: registrations FK_6aacc9b213fd8c881af6c738ecf; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registrations
    ADD CONSTRAINT "FK_6aacc9b213fd8c881af6c738ecf" FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: answers answers_attempt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answers
    ADD CONSTRAINT answers_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.attempts(id) ON DELETE CASCADE;


--
-- Name: answers answers_exam_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answers
    ADD CONSTRAINT answers_exam_question_id_fkey FOREIGN KEY (exam_question_id) REFERENCES public.exam_questions(id) ON DELETE RESTRICT;


--
-- Name: answers answers_question_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.answers
    ADD CONSTRAINT answers_question_version_id_fkey FOREIGN KEY (question_version_id) REFERENCES public.question_versions(id);


--
-- Name: attempt_connectivity_gaps attempt_connectivity_gaps_attempt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attempt_connectivity_gaps
    ADD CONSTRAINT attempt_connectivity_gaps_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.attempts(id) ON DELETE CASCADE;


--
-- Name: attempt_event_summary attempt_event_summary_attempt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attempt_event_summary
    ADD CONSTRAINT attempt_event_summary_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.attempts(id) ON DELETE CASCADE;


--
-- Name: attempt_question_state attempt_question_state_attempt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attempt_question_state
    ADD CONSTRAINT attempt_question_state_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.attempts(id) ON DELETE CASCADE;


--
-- Name: attempt_question_state attempt_question_state_exam_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attempt_question_state
    ADD CONSTRAINT attempt_question_state_exam_question_id_fkey FOREIGN KEY (exam_question_id) REFERENCES public.exam_questions(id) ON DELETE RESTRICT;


--
-- Name: attempts attempts_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attempts
    ADD CONSTRAINT attempts_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.exam_assignments(id) ON DELETE RESTRICT;


--
-- Name: attempts attempts_exam_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attempts
    ADD CONSTRAINT attempts_exam_version_id_fkey FOREIGN KEY (exam_version_id) REFERENCES public.exam_versions(id);


--
-- Name: code_run_test_results code_run_test_results_code_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.code_run_test_results
    ADD CONSTRAINT code_run_test_results_code_run_id_fkey FOREIGN KEY (code_run_id) REFERENCES public.code_runs(id) ON DELETE CASCADE;


--
-- Name: code_run_test_results code_run_test_results_test_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.code_run_test_results
    ADD CONSTRAINT code_run_test_results_test_case_id_fkey FOREIGN KEY (test_case_id) REFERENCES public.question_test_cases(id) ON DELETE SET NULL;


--
-- Name: code_runs code_runs_answer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.code_runs
    ADD CONSTRAINT code_runs_answer_id_fkey FOREIGN KEY (answer_id) REFERENCES public.answers(id) ON DELETE CASCADE;


--
-- Name: code_runs code_runs_attempt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.code_runs
    ADD CONSTRAINT code_runs_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.attempts(id) ON DELETE CASCADE;


--
-- Name: code_runs code_runs_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.code_runs
    ADD CONSTRAINT code_runs_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.code_submissions(id);


--
-- Name: code_submission_files code_submission_files_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.code_submission_files
    ADD CONSTRAINT code_submission_files_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.code_submissions(id) ON DELETE CASCADE;


--
-- Name: code_submissions code_submissions_answer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.code_submissions
    ADD CONSTRAINT code_submissions_answer_id_fkey FOREIGN KEY (answer_id) REFERENCES public.answers(id) ON DELETE CASCADE;


--
-- Name: evaluation_criterion_scores evaluation_criterion_scores_evaluation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evaluation_criterion_scores
    ADD CONSTRAINT evaluation_criterion_scores_evaluation_id_fkey FOREIGN KEY (evaluation_id) REFERENCES public.evaluations(id) ON DELETE CASCADE;


--
-- Name: evaluation_criterion_scores evaluation_criterion_scores_rubric_criterion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evaluation_criterion_scores
    ADD CONSTRAINT evaluation_criterion_scores_rubric_criterion_id_fkey FOREIGN KEY (rubric_criterion_id) REFERENCES public.rubric_criteria(id) ON DELETE RESTRICT;


--
-- Name: evaluations evaluations_answer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evaluations
    ADD CONSTRAINT evaluations_answer_id_fkey FOREIGN KEY (answer_id) REFERENCES public.answers(id) ON DELETE CASCADE;


--
-- Name: evaluations evaluations_plugin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evaluations
    ADD CONSTRAINT evaluations_plugin_id_fkey FOREIGN KEY (plugin_id) REFERENCES public.plugins(id);


--
-- Name: exam_assignments exam_assignments_assigned_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_assignments
    ADD CONSTRAINT exam_assignments_assigned_org_id_fkey FOREIGN KEY (assigned_org_id) REFERENCES public.organizations(id);


--
-- Name: exam_assignments exam_assignments_exam_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_assignments
    ADD CONSTRAINT exam_assignments_exam_version_id_fkey FOREIGN KEY (exam_version_id) REFERENCES public.exam_versions(id) ON DELETE RESTRICT;


--
-- Name: exam_plugin_entitlements exam_plugin_entitlements_exam_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_plugin_entitlements
    ADD CONSTRAINT exam_plugin_entitlements_exam_version_id_fkey FOREIGN KEY (exam_version_id) REFERENCES public.exam_versions(id) ON DELETE CASCADE;


--
-- Name: exam_plugin_entitlements exam_plugin_entitlements_plugin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_plugin_entitlements
    ADD CONSTRAINT exam_plugin_entitlements_plugin_id_fkey FOREIGN KEY (plugin_id) REFERENCES public.plugins(id) ON DELETE CASCADE;


--
-- Name: exam_question_plugin_entitlements exam_question_plugin_entitlements_exam_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_question_plugin_entitlements
    ADD CONSTRAINT exam_question_plugin_entitlements_exam_question_id_fkey FOREIGN KEY (exam_question_id) REFERENCES public.exam_questions(id) ON DELETE CASCADE;


--
-- Name: exam_question_plugin_entitlements exam_question_plugin_entitlements_plugin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_question_plugin_entitlements
    ADD CONSTRAINT exam_question_plugin_entitlements_plugin_id_fkey FOREIGN KEY (plugin_id) REFERENCES public.plugins(id) ON DELETE CASCADE;


--
-- Name: exam_questions exam_questions_exam_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_questions
    ADD CONSTRAINT exam_questions_exam_version_id_fkey FOREIGN KEY (exam_version_id) REFERENCES public.exam_versions(id) ON DELETE CASCADE;


--
-- Name: exam_questions exam_questions_question_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_questions
    ADD CONSTRAINT exam_questions_question_version_id_fkey FOREIGN KEY (question_version_id) REFERENCES public.question_versions(id) ON DELETE RESTRICT;


--
-- Name: exam_questions exam_questions_rubric_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_questions
    ADD CONSTRAINT exam_questions_rubric_id_fkey FOREIGN KEY (rubric_id) REFERENCES public.rubrics(id) ON DELETE SET NULL;


--
-- Name: exam_questions exam_questions_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_questions
    ADD CONSTRAINT exam_questions_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.exam_sections(id) ON DELETE SET NULL;


--
-- Name: exam_sections exam_sections_exam_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_sections
    ADD CONSTRAINT exam_sections_exam_version_id_fkey FOREIGN KEY (exam_version_id) REFERENCES public.exam_versions(id) ON DELETE CASCADE;


--
-- Name: exam_sections exam_sections_plugin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_sections
    ADD CONSTRAINT exam_sections_plugin_id_fkey FOREIGN KEY (plugin_id) REFERENCES public.plugins(id);


--
-- Name: exam_template_versions exam_template_versions_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_template_versions
    ADD CONSTRAINT exam_template_versions_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.exam_templates(id) ON DELETE CASCADE;


--
-- Name: exam_templates exam_templates_current_version_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_templates
    ADD CONSTRAINT exam_templates_current_version_fk FOREIGN KEY (current_version_id) REFERENCES public.exam_template_versions(id);


--
-- Name: exam_templates exam_templates_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_templates
    ADD CONSTRAINT exam_templates_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: exam_versions exam_versions_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_versions
    ADD CONSTRAINT exam_versions_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;


--
-- Name: exams exams_current_version_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_current_version_fk FOREIGN KEY (current_version_id) REFERENCES public.exam_versions(id);


--
-- Name: exams exams_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: exams exams_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.exam_templates(id);


--
-- Name: manual_review_assignments manual_review_assignments_evaluation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manual_review_assignments
    ADD CONSTRAINT manual_review_assignments_evaluation_id_fkey FOREIGN KEY (evaluation_id) REFERENCES public.evaluations(id) ON DELETE CASCADE;


--
-- Name: media_assets media_assets_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_assets
    ADD CONSTRAINT media_assets_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: org_plugin_entitlements org_plugin_entitlements_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_plugin_entitlements
    ADD CONSTRAINT org_plugin_entitlements_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: org_plugin_entitlements org_plugin_entitlements_plugin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_plugin_entitlements
    ADD CONSTRAINT org_plugin_entitlements_plugin_id_fkey FOREIGN KEY (plugin_id) REFERENCES public.plugins(id) ON DELETE CASCADE;


--
-- Name: organization_members organization_members_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: organizations organizations_parent_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_parent_org_id_fkey FOREIGN KEY (parent_org_id) REFERENCES public.organizations(id);


--
-- Name: platform_plugin_entitlements platform_plugin_entitlements_plugin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_plugin_entitlements
    ADD CONSTRAINT platform_plugin_entitlements_plugin_id_fkey FOREIGN KEY (plugin_id) REFERENCES public.plugins(id) ON DELETE CASCADE;


--
-- Name: plugin_decisions plugin_decisions_attempt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plugin_decisions
    ADD CONSTRAINT plugin_decisions_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.attempts(id) ON DELETE CASCADE;


--
-- Name: plugin_decisions plugin_decisions_plugin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plugin_decisions
    ADD CONSTRAINT plugin_decisions_plugin_id_fkey FOREIGN KEY (plugin_id) REFERENCES public.plugins(id);


--
-- Name: question_media question_media_media_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_media
    ADD CONSTRAINT question_media_media_asset_id_fkey FOREIGN KEY (media_asset_id) REFERENCES public.media_assets(id) ON DELETE RESTRICT;


--
-- Name: question_media question_media_question_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_media
    ADD CONSTRAINT question_media_question_version_id_fkey FOREIGN KEY (question_version_id) REFERENCES public.question_versions(id) ON DELETE CASCADE;


--
-- Name: question_options question_options_question_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_options
    ADD CONSTRAINT question_options_question_version_id_fkey FOREIGN KEY (question_version_id) REFERENCES public.question_versions(id) ON DELETE CASCADE;


--
-- Name: question_tags question_tags_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_tags
    ADD CONSTRAINT question_tags_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: question_tags question_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_tags
    ADD CONSTRAINT question_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: question_test_cases question_test_cases_question_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_test_cases
    ADD CONSTRAINT question_test_cases_question_version_id_fkey FOREIGN KEY (question_version_id) REFERENCES public.question_versions(id) ON DELETE CASCADE;


--
-- Name: question_versions question_versions_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_versions
    ADD CONSTRAINT question_versions_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: questions questions_current_version_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_current_version_fk FOREIGN KEY (current_version_id) REFERENCES public.question_versions(id);


--
-- Name: questions questions_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: questions questions_plugin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_plugin_id_fkey FOREIGN KEY (plugin_id) REFERENCES public.plugins(id);


--
-- Name: result_publications result_publications_attempt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.result_publications
    ADD CONSTRAINT result_publications_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.attempts(id) ON DELETE CASCADE;


--
-- Name: rubric_criteria rubric_criteria_rubric_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rubric_criteria
    ADD CONSTRAINT rubric_criteria_rubric_id_fkey FOREIGN KEY (rubric_id) REFERENCES public.rubrics(id) ON DELETE CASCADE;


--
-- Name: rubrics rubrics_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rubrics
    ADD CONSTRAINT rubrics_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: tags tags_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--



-- ── seed data ───────────────────────────────────────────────
--
--




--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.organizations VALUES
	('00000000-0000-0000-0000-000000000001', 'system', 'OriginBI Platform', 'system', NULL, NULL, '{}', '{"description": "singleton platform owner; do not delete"}', NULL, '2026-05-23 03:34:09.49978+00', NULL);


--
-- Data for Name: plugins; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.plugins VALUES
	('00000000-0000-0000-0000-000000000013', 'question_type', 'assessment.coding', 'Coding Assessment', '1.0.0', '{}', false, true, '2026-05-23 03:34:09.49978+00', 'base', 'assessment', '["runtime.exam-session"]', '[]', '["assessment.type.coding", "question.type.code", "runtime.action.coding.run-custom", "runtime.action.coding.run-tests", "runtime.action.coding.submit"]'),
	('00000000-0000-0000-0000-000000000020', 'evaluator', 'evaluation.testcase', 'Test Case Evaluator', '1.0.0', '{}', false, true, '2026-05-23 03:34:09.49978+00', 'addon', 'evaluation', '["assessment.coding", "code.runner"]', '["assessment.coding"]', '["evaluator.testcase"]'),
	('00000000-0000-0000-0000-000000000021', 'evaluator', 'evaluation.manual-review', 'Manual Review', '1.0.0', '{}', false, true, '2026-05-23 03:34:09.49978+00', 'addon', 'evaluation', '["assessment.coding"]', '["assessment.coding"]', '["evaluator.manual"]'),
	('00000000-0000-0000-0000-000000000022', 'evaluator', 'evaluator.openai', 'OpenAI Evaluator', '1.0.0', '{}', true, false, '2026-05-23 03:34:09.49978+00', 'addon', 'evaluation', '["evaluation.llm"]', '["evaluation.llm"]', '["llm.provider"]'),
	('00000000-0000-0000-0000-000000000023', 'evaluator', 'evaluator.anthropic', 'Anthropic Evaluator', '1.0.0', '{}', true, false, '2026-05-23 03:34:09.49978+00', 'addon', 'evaluation', '["evaluation.llm"]', '["evaluation.llm"]', '["llm.provider"]'),
	('00000000-0000-0000-0000-000000000010', 'question_type', 'mcq.aptitude', 'MCQ — Aptitude', '1.0.0', '{}', false, true, '2026-05-23 03:34:09.49978+00', 'base', 'assessment', '[]', '[]', '[]'),
	('00000000-0000-0000-0000-000000000011', 'question_type', 'mcq.verbal', 'MCQ — Verbal', '1.0.0', '{}', false, true, '2026-05-23 03:34:09.49978+00', 'base', 'assessment', '[]', '[]', '[]'),
	('00000000-0000-0000-0000-000000000012', 'question_type', 'mcq.technical', 'MCQ — Technical', '1.0.0', '{}', false, true, '2026-05-23 03:34:09.49978+00', 'base', 'assessment', '[]', '[]', '[]'),
	('00000000-0000-0000-0000-000000000014', 'question_type', 'essay', 'Essay / Long Form', '1.0.0', '{}', false, true, '2026-05-23 03:34:09.49978+00', 'base', 'assessment', '[]', '[]', '[]'),
	('00000000-0000-0000-0000-000000000031', 'proctoring_signal', 'proct.paste', 'Proctoring — Paste', '1.0.0', '{}', false, true, '2026-05-23 03:34:09.49978+00', 'addon', 'proctoring', '[]', '[]', '[]'),
	('00000000-0000-0000-0000-000000000032', 'proctoring_signal', 'proct.copy', 'Proctoring — Copy', '1.0.0', '{}', false, true, '2026-05-23 03:34:09.49978+00', 'addon', 'proctoring', '[]', '[]', '[]'),
	('00000000-0000-0000-0000-000000000033', 'proctoring_signal', 'proct.right_click', 'Proctoring — Right click', '1.0.0', '{}', false, true, '2026-05-23 03:34:09.49978+00', 'addon', 'proctoring', '[]', '[]', '[]'),
	('00000000-0000-0000-0000-000000000034', 'proctoring_signal', 'proct.fullscreen_exit', 'Proctoring — Fullscreen exit', '1.0.0', '{}', false, true, '2026-05-23 03:34:09.49978+00', 'addon', 'proctoring', '[]', '[]', '[]'),
	('00000000-0000-0000-0000-000000000035', 'proctoring_signal', 'proct.mouse_leave', 'Proctoring — Mouse leave', '1.0.0', '{}', false, true, '2026-05-23 03:34:09.49978+00', 'addon', 'proctoring', '[]', '[]', '[]'),
	('00000000-0000-0000-0000-000000000036', 'proctoring_signal', 'proct.dev_tools', 'Proctoring — Dev tools opened', '1.0.0', '{}', false, true, '2026-05-23 03:34:09.49978+00', 'addon', 'proctoring', '[]', '[]', '[]'),
	('00000000-0000-0000-0000-000000000037', 'proctoring_signal', 'proct.connectivity', 'Proctoring — Connectivity gap', '1.0.0', '{}', false, true, '2026-05-23 03:34:09.49978+00', 'addon', 'proctoring', '[]', '[]', '[]'),
	('00000000-0000-0000-0000-000000000040', 'feature', 'feat.per_question_timer', 'Per-question timer', '1.0.0', '{}', false, true, '2026-05-23 03:34:09.49978+00', 'addon', 'feature', '[]', '[]', '[]'),
	('00000000-0000-0000-0000-000000000041', 'feature', 'feat.shuffle_questions', 'Shuffle questions', '1.0.0', '{}', false, true, '2026-05-23 03:34:09.49978+00', 'addon', 'feature', '[]', '[]', '[]'),
	('00000000-0000-0000-0000-000000000042', 'feature', 'feat.shuffle_options', 'Shuffle options', '1.0.0', '{}', false, true, '2026-05-23 03:34:09.49978+00', 'addon', 'feature', '[]', '[]', '[]'),
	('00000000-0000-0000-0000-000000000043', 'feature', 'feat.section_navigation', 'Section navigation', '1.0.0', '{}', false, true, '2026-05-23 03:34:09.49978+00', 'addon', 'feature', '[]', '[]', '[]'),
	('00000000-0000-0000-0000-000000000050', 'media_renderer', 'media.image', 'Image renderer', '1.0.0', '{}', false, true, '2026-05-23 03:34:09.49978+00', 'addon', 'media', '[]', '[]', '[]'),
	('00000000-0000-0000-0000-000000000051', 'media_renderer', 'media.video.youtube', 'YouTube video renderer', '1.0.0', '{}', false, true, '2026-05-23 03:34:09.49978+00', 'addon', 'media', '[]', '[]', '[]'),
	('00000000-0000-0000-0000-000000000052', 'media_renderer', 'media.audio', 'Audio renderer', '1.0.0', '{}', false, true, '2026-05-23 03:34:09.49978+00', 'addon', 'media', '[]', '[]', '[]'),
	('00000000-0000-0000-0000-000000000081', 'evaluator', 'evaluation.llm', 'LLM Evaluator', '1.0.0', '{}', true, false, '2026-05-23 03:34:25.480576+00', 'addon', 'evaluation', '["assessment.coding"]', '["assessment.coding"]', '["evaluator.llm-response"]'),
	('00000000-0000-0000-0000-000000000080', 'runner', 'runner.judge0', 'Judge0 Runner', '1.0.0', '{"defaults": {"timeLimitMs": 3000, "stackLimitKb": 32768, "memoryLimitKb": 131072, "outputLimitKb": 4096, "processesLimit": 32}, "defaultBaseUrl": "http://localhost:2358", "multiFileLanguageId": 89}', false, true, '2026-05-23 03:34:25.480576+00', 'addon', 'runner', '[]', '[]', '["code.runner"]'),
	('00000000-0000-0000-0000-000000000090', 'language', 'language.python', 'Python 3.11', '1.0.0', '{"icon": "python.webp", "displayName": "Python 3.11", "timeLimitMs": 3000, "compileFlags": null, "stackLimitKb": 32768, "fileExtension": ".py", "legacyItemRef": "coding:python", "memoryLimitKb": 131072, "outputLimitKb": 4096, "processesLimit": 32, "defaultEntryFile": "solution.py", "judge0LanguageId": 71, "monacoLanguageId": "python", "supportsMultiFile": true}', false, true, '2026-05-23 03:34:25.697439+00', 'addon', 'language', '["assessment.coding", "code.runner"]', '["assessment.coding"]', '["language.runtime"]'),
	('00000000-0000-0000-0000-0000000000a0', 'proctoring_signal', 'proctoring.camera-vision', 'Camera & Vision', '1.0.0', '{"admin_ui": [{"label": "Camera & Vision", "mount": "settings.proctoring", "component": "frontend/plugins/proctoring-camera-vision/manifest.tsx"}], "defaults": {"enabled": true, "multiFace": "flag", "faceDetect": true, "captureMode": "interval", "intervalSec": 30}}', false, true, '2026-05-23 03:34:33.461773+00', 'addon', 'proctoring', '["runtime.exam-session"]', '["assessment.coding"]', '["proctoring.constraint.camera"]'),
	('00000000-0000-0000-0000-0000000000a1', 'proctoring_signal', 'proctoring.microphone-audio', 'Microphone & Audio', '1.0.0', '{"admin_ui": [{"label": "Microphone & Audio", "mount": "settings.proctoring", "component": "frontend/plugins/proctoring-microphone-audio/manifest.tsx"}], "defaults": {"enabled": true, "noiseAlert": true}}', false, true, '2026-05-23 03:34:33.461773+00', 'addon', 'proctoring', '["runtime.exam-session"]', '["assessment.coding"]', '["proctoring.constraint.microphone"]'),
	('00000000-0000-0000-0000-0000000000a2', 'proctoring_signal', 'proctoring.screen-browser', 'Screen & Browser', '1.0.0', '{"admin_ui": [{"label": "Screen & Browser", "mount": "settings.proctoring", "component": "frontend/plugins/proctoring-screen-browser/manifest.tsx"}], "defaults": {"allowExits": 2, "screenShare": true, "fullscreenLock": true}}', false, true, '2026-05-23 03:34:33.461773+00', 'addon', 'proctoring', '["runtime.exam-session"]', '["assessment.coding"]', '["proctoring.constraint.fullscreen", "proctoring.constraint.screen-share"]'),
	('00000000-0000-0000-0000-0000000000a3', 'proctoring_signal', 'proctoring.ai-monitoring', 'AI Monitoring', '1.0.0', '{"admin_ui": [{"label": "AI Monitoring", "mount": "settings.proctoring", "component": "frontend/plugins/proctoring-ai-monitoring/manifest.tsx"}], "defaults": {"enabled": true, "lipSync": false, "plagiarism": true, "eyeTracking": false, "suspiciousActivity": true}}', false, true, '2026-05-23 03:34:33.461773+00', 'addon', 'proctoring', '["runtime.exam-session"]', '["assessment.coding"]', '["proctoring.constraint.ai-monitoring"]'),
	('00000000-0000-0000-0000-0000000000a4', 'proctoring_signal', 'proctoring.identity-verification', 'Identity Verification', '1.0.0', '{"admin_ui": [{"label": "Identity Verification", "mount": "settings.proctoring", "component": "frontend/plugins/proctoring-identity-verification/manifest.tsx"}], "defaults": {"enabled": true, "idUpload": true, "photoAtStart": true, "livenessCheck": true}}', false, true, '2026-05-23 03:34:33.461773+00', 'addon', 'proctoring', '["runtime.exam-session"]', '["assessment.coding"]', '["proctoring.constraint.identity"]'),
	('00000000-0000-0000-0000-0000000000a5', 'proctoring_signal', 'proctoring.network-location', 'Network & Location', '1.0.0', '{"admin_ui": [{"label": "Network & Location", "mount": "settings.proctoring", "component": "frontend/plugins/proctoring-network-location/manifest.tsx"}], "defaults": {"geofence": "country", "vpnBlock": true, "ipLogging": true}}', false, true, '2026-05-23 03:34:33.461773+00', 'addon', 'proctoring', '["runtime.exam-session"]', '["assessment.coding"]', '["proctoring.constraint.network-location"]'),
	('00000000-0000-0000-0000-000000000030', 'proctoring_signal', 'proctoring.tab-switch', 'Tab Switch Monitor', '1.0.0', '{"emits": [{"kind": "proctoring.tab.switched", "severity": "warn", "payload_schema_ref": "#/schemas/tab_switched"}, {"kind": "proctoring.tab.refocused", "severity": "info", "payload_schema_ref": "#/schemas/tab_refocused"}], "schemas": {"tab_switched": {"type": "object", "properties": {"count": {"type": "number"}, "reason": {"type": "string"}, "visibilityState": {"type": "string"}}}, "tab_refocused": {"type": "object", "properties": {"durationMs": {"type": "number"}}}, "tab_focus_config": {"type": "object", "properties": {"enabled": {"type": "boolean"}, "graceMs": {"type": "integer", "maximum": 60000, "minimum": 0}, "threshold": {"type": "integer", "maximum": 20, "minimum": 1}, "warnBeforeTerminate": {"type": "boolean"}}}}, "admin_ui": [{"label": "Tab Switching", "mount": "settings.proctoring", "schema": "#/schemas/tab_focus_config", "component": "frontend/plugins/proctoring-tab-switch/manifest.tsx"}], "defaults": {"enabled": true, "graceMs": 10000, "threshold": 3, "warnBeforeTerminate": true}, "subscribes": ["proctoring.tab.switched", "attempt.submitted"], "candidate_ui": [{"label": "Tab switch warnings", "mount": "attempt.warning-toast", "component": "frontend/plugins/proctoring-tab-switch/manifest.tsx"}], "client_constraints": [{"id": "tab-focus", "kind": "focus-required", "config_schema": {"$ref": "#/schemas/tab_focus_config"}}]}', false, true, '2026-05-23 03:34:09.49978+00', 'addon', 'proctoring', '["runtime.exam-session"]', '[]', '["proctoring.constraint.tab-focus"]'),
	('00000000-0000-0000-0000-000000000091', 'language', 'language.java', 'Java 17', '1.0.0', '{"icon": "java.webp", "displayName": "Java 17", "timeLimitMs": 5000, "compileFlags": null, "stackLimitKb": 65536, "fileExtension": ".java", "legacyItemRef": "coding:java", "memoryLimitKb": 262144, "outputLimitKb": 4096, "processesLimit": 32, "defaultEntryFile": "Main.java", "judge0LanguageId": 62, "monacoLanguageId": "java", "supportsMultiFile": true}', false, true, '2026-05-23 03:34:25.697439+00', 'addon', 'language', '["assessment.coding", "code.runner"]', '["assessment.coding"]', '["language.runtime"]'),
	('00000000-0000-0000-0000-000000000092', 'language', 'language.cpp', 'C++ 20', '1.0.0', '{"icon": "cpp.webp", "displayName": "C++ 20", "timeLimitMs": 3000, "compileFlags": "-O2 -std=c++20", "stackLimitKb": 65536, "fileExtension": ".cpp", "legacyItemRef": "coding:cpp", "memoryLimitKb": 131072, "outputLimitKb": 4096, "processesLimit": 32, "defaultEntryFile": "main.cpp", "judge0LanguageId": 54, "monacoLanguageId": "cpp", "supportsMultiFile": true}', false, true, '2026-05-23 03:34:25.697439+00', 'addon', 'language', '["assessment.coding", "code.runner"]', '["assessment.coding"]', '["language.runtime"]'),
	('00000000-0000-0000-0000-000000000093', 'language', 'language.c', 'C (GCC 11)', '1.0.0', '{"icon": "c.webp", "displayName": "C (GCC 11)", "timeLimitMs": 3000, "compileFlags": "-O2 -std=c11", "stackLimitKb": 65536, "fileExtension": ".c", "legacyItemRef": "coding:c", "memoryLimitKb": 131072, "outputLimitKb": 4096, "processesLimit": 32, "defaultEntryFile": "main.c", "judge0LanguageId": 50, "monacoLanguageId": "c", "supportsMultiFile": false}', false, true, '2026-05-23 03:34:25.697439+00', 'addon', 'language', '["assessment.coding", "code.runner"]', '["assessment.coding"]', '["language.runtime"]'),
	('00000000-0000-0000-0000-000000000094', 'language', 'language.javascript', 'JavaScript (Node 20)', '1.0.0', '{"icon": "js.webp", "displayName": "JavaScript (Node 20)", "timeLimitMs": 3000, "compileFlags": null, "stackLimitKb": 32768, "fileExtension": ".js", "legacyItemRef": "coding:javascript", "memoryLimitKb": 131072, "outputLimitKb": 4096, "processesLimit": 32, "defaultEntryFile": "solution.js", "judge0LanguageId": 63, "monacoLanguageId": "javascript", "supportsMultiFile": true}', false, true, '2026-05-23 03:34:25.697439+00', 'addon', 'language', '["assessment.coding", "code.runner"]', '["assessment.coding"]', '["language.runtime"]'),
	('00000000-0000-0000-0000-000000000095', 'language', 'language.go', 'Go 1.13', '1.0.0', '{"icon": null, "displayName": "Go 1.13", "timeLimitMs": 3000, "compileFlags": null, "stackLimitKb": 32768, "fileExtension": ".go", "legacyItemRef": null, "memoryLimitKb": 131072, "outputLimitKb": 4096, "processesLimit": 32, "defaultEntryFile": "main.go", "judge0LanguageId": 60, "monacoLanguageId": "go", "supportsMultiFile": true}', false, true, '2026-05-23 03:34:25.697439+00', 'addon', 'language', '["assessment.coding", "code.runner"]', '["assessment.coding"]', '["language.runtime"]');


--
--



-- +goose Down
-- Intentionally empty: this baseline is not reversible. Restore from backup.
