-- ==================================================================
-- 001 baseline - squashed from migrations 001..010 (applied on Neon)
-- Generated 2026-05-28T05:29:36Z from pg_dump of origin_neon
-- ==================================================================

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
-- Name: adaptive_blocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.adaptive_blocks (
    block_id bigint NOT NULL,
    assessment_id bigint NOT NULL,
    block_number integer NOT NULL,
    difficulty_distribution jsonb DEFAULT '{"easy": 70, "hard": 0, "medium": 30}'::jsonb NOT NULL,
    is_adaptive boolean DEFAULT true NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    generated_questions jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: adaptive_blocks_block_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.adaptive_blocks_block_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: adaptive_blocks_block_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.adaptive_blocks_block_id_seq OWNED BY public.adaptive_blocks.block_id;


--
-- Name: adaptive_blueprint; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.adaptive_blueprint (
    blueprint_id bigint NOT NULL,
    assessment_id bigint NOT NULL,
    total_marks numeric(10,2) DEFAULT 100 NOT NULL,
    total_blocks integer DEFAULT 4 NOT NULL,
    marks_per_block numeric(10,2) DEFAULT 25 NOT NULL,
    seconds_per_mark integer DEFAULT 45 NOT NULL,
    category_blueprint jsonb DEFAULT '{}'::jsonb NOT NULL,
    subcategory_blueprint jsonb DEFAULT '{}'::jsonb NOT NULL,
    difficulty_profiles jsonb DEFAULT '{}'::jsonb NOT NULL,
    question_stats jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: adaptive_blueprint_blueprint_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.adaptive_blueprint_blueprint_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: adaptive_blueprint_blueprint_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.adaptive_blueprint_blueprint_id_seq OWNED BY public.adaptive_blueprint.blueprint_id;


--
-- Name: adaptive_paths; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.adaptive_paths (
    path_id bigint NOT NULL,
    attempt_token character varying(200) NOT NULL,
    assessment_id bigint NOT NULL,
    user_id bigint NOT NULL,
    difficulty_path jsonb DEFAULT '[]'::jsonb NOT NULL,
    accuracy_path jsonb DEFAULT '[]'::jsonb NOT NULL,
    time_path jsonb DEFAULT '[]'::jsonb NOT NULL,
    current_block integer DEFAULT 1 NOT NULL,
    total_correct integer DEFAULT 0 NOT NULL,
    total_questions integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: adaptive_paths_path_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.adaptive_paths_path_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: adaptive_paths_path_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.adaptive_paths_path_id_seq OWNED BY public.adaptive_paths.path_id;


--
-- Name: adaptive_performance_analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.adaptive_performance_analytics (
    analytics_id bigint NOT NULL,
    attempt_token character varying(200) NOT NULL,
    assessment_id bigint NOT NULL,
    user_id bigint NOT NULL,
    obtained_marks numeric(10,2) DEFAULT 0 NOT NULL,
    total_marks numeric(10,2) DEFAULT 0 NOT NULL,
    marks_percentage numeric(6,2) DEFAULT 0 NOT NULL,
    final_evaluation_score numeric(6,2) DEFAULT 0 NOT NULL,
    performance_level character varying(30) DEFAULT 'Needs Foundation'::character varying NOT NULL,
    skipped_count integer DEFAULT 0 NOT NULL,
    skipped_marks numeric(10,2) DEFAULT 0 NOT NULL,
    wrong_count integer DEFAULT 0 NOT NULL,
    skip_impact numeric(6,2) DEFAULT 0 NOT NULL,
    skip_confidence numeric(6,2) DEFAULT 0 NOT NULL,
    difficulty_handling numeric(6,2) DEFAULT 0 NOT NULL,
    speed_efficiency numeric(6,2) DEFAULT 0 NOT NULL,
    topic_mastery_score numeric(6,2) DEFAULT 0 NOT NULL,
    reliability_score numeric(6,2) DEFAULT 0 NOT NULL,
    reliability_level character varying(10) DEFAULT 'Low'::character varying NOT NULL,
    topic_mastery jsonb DEFAULT '[]'::jsonb NOT NULL,
    block_performance jsonb DEFAULT '[]'::jsonb NOT NULL,
    category_performance jsonb DEFAULT '{}'::jsonb NOT NULL,
    strong_topics jsonb DEFAULT '[]'::jsonb NOT NULL,
    weak_topics jsonb DEFAULT '[]'::jsonb NOT NULL,
    slow_topics jsonb DEFAULT '[]'::jsonb NOT NULL,
    skipped_topics jsonb DEFAULT '[]'::jsonb NOT NULL,
    recommended_topics jsonb DEFAULT '[]'::jsonb NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: adaptive_performance_analytics_analytics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.adaptive_performance_analytics_analytics_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: adaptive_performance_analytics_analytics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.adaptive_performance_analytics_analytics_id_seq OWNED BY public.adaptive_performance_analytics.analytics_id;


--
-- Name: adaptive_subcategory_coverage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.adaptive_subcategory_coverage (
    coverage_id bigint NOT NULL,
    attempt_token character varying(200) NOT NULL,
    assessment_id bigint NOT NULL,
    coverage jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: adaptive_subcategory_coverage_coverage_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.adaptive_subcategory_coverage_coverage_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: adaptive_subcategory_coverage_coverage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.adaptive_subcategory_coverage_coverage_id_seq OWNED BY public.adaptive_subcategory_coverage.coverage_id;


--
-- Name: block_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.block_attempts (
    block_attempt_id bigint NOT NULL,
    attempt_token character varying(200) NOT NULL,
    block_id bigint,
    user_id bigint NOT NULL,
    block_number integer NOT NULL,
    status character varying(20) DEFAULT 'in_progress'::character varying NOT NULL,
    started_at timestamp without time zone DEFAULT now() NOT NULL,
    completed_at timestamp without time zone,
    difficulty_achieved character varying(10) DEFAULT 'easy'::character varying NOT NULL,
    total_count integer DEFAULT 0 NOT NULL,
    total_block_marks numeric(10,2) DEFAULT 0 NOT NULL,
    obtained_marks numeric(10,2) DEFAULT 0 NOT NULL,
    skipped_marks numeric(10,2) DEFAULT 0 NOT NULL,
    correct_count integer DEFAULT 0 NOT NULL,
    wrong_count integer DEFAULT 0 NOT NULL,
    skipped_count integer DEFAULT 0 NOT NULL,
    attempted_count integer DEFAULT 0 NOT NULL,
    marks_score numeric(6,2),
    adaptive_accuracy numeric(6,2),
    attempt_accuracy numeric(6,2),
    skip_count_rate numeric(6,2),
    skipped_marks_rate numeric(6,2),
    skip_impact numeric(6,2),
    skip_confidence numeric(6,2),
    difficulty_handling numeric(6,2),
    speed_efficiency numeric(6,2),
    block_readiness_score numeric(6,2),
    next_block_difficulty character varying(10),
    accuracy_score numeric(6,4),
    time_taken_seconds integer DEFAULT 0 NOT NULL,
    snapshot_taken boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: block_attempts_block_attempt_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.block_attempts_block_attempt_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: block_attempts_block_attempt_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.block_attempts_block_attempt_id_seq OWNED BY public.block_attempts.block_attempt_id;


--
-- Name: block_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.block_snapshots (
    snapshot_id bigint NOT NULL,
    attempt_token character varying(200) NOT NULL,
    block_number integer NOT NULL,
    assessment_id bigint NOT NULL,
    user_id bigint NOT NULL,
    question_answers jsonb DEFAULT '{}'::jsonb NOT NULL,
    total_questions integer DEFAULT 0 NOT NULL,
    correct_count integer DEFAULT 0 NOT NULL,
    wrong_count integer DEFAULT 0 NOT NULL,
    skipped_count integer DEFAULT 0 NOT NULL,
    attempted_count integer DEFAULT 0 NOT NULL,
    total_block_marks numeric(10,2) DEFAULT 0 NOT NULL,
    obtained_marks numeric(10,2) DEFAULT 0 NOT NULL,
    skipped_marks numeric(10,2) DEFAULT 0 NOT NULL,
    marks_score numeric(6,2) DEFAULT 0 NOT NULL,
    adaptive_accuracy numeric(6,2) DEFAULT 0 NOT NULL,
    attempt_accuracy numeric(6,2) DEFAULT 0 NOT NULL,
    skip_count_rate numeric(6,2) DEFAULT 0 NOT NULL,
    skipped_marks_rate numeric(6,2) DEFAULT 0 NOT NULL,
    skip_impact numeric(6,2) DEFAULT 0 NOT NULL,
    skip_confidence numeric(6,2) DEFAULT 0 NOT NULL,
    difficulty_handling numeric(6,2) DEFAULT 0 NOT NULL,
    speed_efficiency numeric(6,2) DEFAULT 0 NOT NULL,
    block_readiness_score numeric(6,2) DEFAULT 0 NOT NULL,
    next_block_difficulty character varying(10) DEFAULT 'easy'::character varying NOT NULL,
    time_taken_seconds integer DEFAULT 0 NOT NULL,
    coverage_map jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: block_snapshots_snapshot_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.block_snapshots_snapshot_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: block_snapshots_snapshot_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.block_snapshots_snapshot_id_seq OWNED BY public.block_snapshots.snapshot_id;


--
-- Name: adaptive_blocks block_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adaptive_blocks ALTER COLUMN block_id SET DEFAULT nextval('public.adaptive_blocks_block_id_seq'::regclass);


--
-- Name: adaptive_blueprint blueprint_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adaptive_blueprint ALTER COLUMN blueprint_id SET DEFAULT nextval('public.adaptive_blueprint_blueprint_id_seq'::regclass);


--
-- Name: adaptive_paths path_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adaptive_paths ALTER COLUMN path_id SET DEFAULT nextval('public.adaptive_paths_path_id_seq'::regclass);


--
-- Name: adaptive_performance_analytics analytics_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adaptive_performance_analytics ALTER COLUMN analytics_id SET DEFAULT nextval('public.adaptive_performance_analytics_analytics_id_seq'::regclass);


--
-- Name: adaptive_subcategory_coverage coverage_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adaptive_subcategory_coverage ALTER COLUMN coverage_id SET DEFAULT nextval('public.adaptive_subcategory_coverage_coverage_id_seq'::regclass);


--
-- Name: block_attempts block_attempt_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.block_attempts ALTER COLUMN block_attempt_id SET DEFAULT nextval('public.block_attempts_block_attempt_id_seq'::regclass);


--
-- Name: block_snapshots snapshot_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.block_snapshots ALTER COLUMN snapshot_id SET DEFAULT nextval('public.block_snapshots_snapshot_id_seq'::regclass);


--
-- Name: adaptive_blocks adaptive_blocks_assessment_id_block_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adaptive_blocks
    ADD CONSTRAINT adaptive_blocks_assessment_id_block_number_key UNIQUE (assessment_id, block_number);


--
-- Name: adaptive_blocks adaptive_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adaptive_blocks
    ADD CONSTRAINT adaptive_blocks_pkey PRIMARY KEY (block_id);


--
-- Name: adaptive_blueprint adaptive_blueprint_assessment_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adaptive_blueprint
    ADD CONSTRAINT adaptive_blueprint_assessment_id_key UNIQUE (assessment_id);


--
-- Name: adaptive_blueprint adaptive_blueprint_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adaptive_blueprint
    ADD CONSTRAINT adaptive_blueprint_pkey PRIMARY KEY (blueprint_id);


--
-- Name: adaptive_paths adaptive_paths_attempt_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adaptive_paths
    ADD CONSTRAINT adaptive_paths_attempt_token_key UNIQUE (attempt_token);


--
-- Name: adaptive_paths adaptive_paths_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adaptive_paths
    ADD CONSTRAINT adaptive_paths_pkey PRIMARY KEY (path_id);


--
-- Name: adaptive_performance_analytics adaptive_performance_analytics_attempt_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adaptive_performance_analytics
    ADD CONSTRAINT adaptive_performance_analytics_attempt_token_key UNIQUE (attempt_token);


--
-- Name: adaptive_performance_analytics adaptive_performance_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adaptive_performance_analytics
    ADD CONSTRAINT adaptive_performance_analytics_pkey PRIMARY KEY (analytics_id);


--
-- Name: adaptive_subcategory_coverage adaptive_subcategory_coverage_attempt_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adaptive_subcategory_coverage
    ADD CONSTRAINT adaptive_subcategory_coverage_attempt_token_key UNIQUE (attempt_token);


--
-- Name: adaptive_subcategory_coverage adaptive_subcategory_coverage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.adaptive_subcategory_coverage
    ADD CONSTRAINT adaptive_subcategory_coverage_pkey PRIMARY KEY (coverage_id);


--
-- Name: block_attempts block_attempts_attempt_token_block_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.block_attempts
    ADD CONSTRAINT block_attempts_attempt_token_block_number_key UNIQUE (attempt_token, block_number);


--
-- Name: block_attempts block_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.block_attempts
    ADD CONSTRAINT block_attempts_pkey PRIMARY KEY (block_attempt_id);


--
-- Name: block_snapshots block_snapshots_attempt_token_block_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.block_snapshots
    ADD CONSTRAINT block_snapshots_attempt_token_block_number_key UNIQUE (attempt_token, block_number);


--
-- Name: block_snapshots block_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.block_snapshots
    ADD CONSTRAINT block_snapshots_pkey PRIMARY KEY (snapshot_id);


--
-- Name: idx_adaptive_analytics_assessment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_adaptive_analytics_assessment ON public.adaptive_performance_analytics USING btree (assessment_id);


--
-- Name: idx_adaptive_analytics_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_adaptive_analytics_token ON public.adaptive_performance_analytics USING btree (attempt_token);


--
-- Name: idx_adaptive_analytics_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_adaptive_analytics_user ON public.adaptive_performance_analytics USING btree (user_id);


--
-- Name: idx_adaptive_blocks_assessment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_adaptive_blocks_assessment ON public.adaptive_blocks USING btree (assessment_id);


--
-- Name: idx_adaptive_blueprint_assessment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_adaptive_blueprint_assessment ON public.adaptive_blueprint USING btree (assessment_id);


--
-- Name: idx_adaptive_coverage_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_adaptive_coverage_token ON public.adaptive_subcategory_coverage USING btree (attempt_token);


--
-- Name: idx_adaptive_paths_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_adaptive_paths_token ON public.adaptive_paths USING btree (attempt_token);


--
-- Name: idx_block_attempts_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_block_attempts_token ON public.block_attempts USING btree (attempt_token);


--
-- Name: idx_block_attempts_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_block_attempts_user ON public.block_attempts USING btree (user_id);


--
-- Name: idx_block_snapshots_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_block_snapshots_token ON public.block_snapshots USING btree (attempt_token);


--
-- PostgreSQL database dump complete
--


