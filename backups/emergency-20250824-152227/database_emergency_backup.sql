--
-- PostgreSQL database dump
--

-- Dumped from database version 16.10 (Debian 16.10-1.pgdg13+1)
-- Dumped by pg_dump version 16.9 (Homebrew)

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

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ai_configs; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.ai_configs (
    id integer NOT NULL,
    config_key character varying(100) NOT NULL,
    config_value jsonb NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.ai_configs OWNER TO dev_user;

--
-- Name: ai_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.ai_configs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_configs_id_seq OWNER TO dev_user;

--
-- Name: ai_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.ai_configs_id_seq OWNED BY public.ai_configs.id;


--
-- Name: encryption_keys; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.encryption_keys (
    id integer NOT NULL,
    key_name character varying(100) NOT NULL,
    key_value text NOT NULL,
    algorithm character varying(50) DEFAULT 'AES-256-GCM'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone
);


ALTER TABLE public.encryption_keys OWNER TO dev_user;

--
-- Name: encryption_keys_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.encryption_keys_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.encryption_keys_id_seq OWNER TO dev_user;

--
-- Name: encryption_keys_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.encryption_keys_id_seq OWNED BY public.encryption_keys.id;


--
-- Name: progress_config; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.progress_config (
    id integer NOT NULL,
    config_name character varying(100) NOT NULL,
    status_progress_map jsonb DEFAULT '{"todo": 0, "draft": 0, "blocked": 0, "on_hold": null, "testing": 75, "archived": 100, "planning": 10, "cancelled": 0, "completed": 100, "suspended": null, "in_progress": 50}'::jsonb NOT NULL,
    include_cancelled boolean DEFAULT false,
    include_archived boolean DEFAULT false,
    blocked_policy character varying(20) DEFAULT 'zero'::character varying,
    default_weight_field character varying(50) DEFAULT 'story_points'::character varying,
    enable_caching boolean DEFAULT false,
    cache_ttl_seconds integer DEFAULT 300,
    default_calculation_method character varying(50) DEFAULT 'status_based'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by integer,
    updated_by integer,
    CONSTRAINT progress_config_blocked_policy_check CHECK (((blocked_policy)::text = ANY ((ARRAY['zero'::character varying, 'ignore'::character varying, 'last_known'::character varying])::text[]))),
    CONSTRAINT progress_config_default_weight_field_check CHECK (((default_weight_field)::text = ANY ((ARRAY['story_points'::character varying, 'estimated_hours'::character varying, 'estimated_minutes'::character varying, 'equal'::character varying])::text[])))
);


ALTER TABLE public.progress_config OWNER TO dev_user;

--
-- Name: progress_config_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.progress_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.progress_config_id_seq OWNER TO dev_user;

--
-- Name: progress_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.progress_config_id_seq OWNED BY public.progress_config.id;


--
-- Name: progress_snapshots; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.progress_snapshots (
    id integer NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id integer NOT NULL,
    progress numeric(5,2) NOT NULL,
    method_used character varying(100),
    computed_at timestamp with time zone DEFAULT now() NOT NULL,
    inputs jsonb DEFAULT '{}'::jsonb,
    breakdown jsonb DEFAULT '[]'::jsonb,
    config_id integer,
    total_weight numeric(10,2),
    children_count integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT progress_snapshots_entity_type_check CHECK (((entity_type)::text = ANY ((ARRAY['task'::character varying, 'epic'::character varying, 'project'::character varying, 'release'::character varying])::text[]))),
    CONSTRAINT progress_snapshots_progress_check CHECK (((progress >= (0)::numeric) AND (progress <= (100)::numeric)))
);


ALTER TABLE public.progress_snapshots OWNER TO dev_user;

--
-- Name: progress_snapshots_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.progress_snapshots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.progress_snapshots_id_seq OWNER TO dev_user;

--
-- Name: progress_snapshots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.progress_snapshots_id_seq OWNED BY public.progress_snapshots.id;


--
-- Name: projects; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.projects (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    status character varying(50) DEFAULT 'active'::character varying,
    created_by integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.projects OWNER TO dev_user;

--
-- Name: projects_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.projects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.projects_id_seq OWNER TO dev_user;

--
-- Name: projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;


--
-- Name: task_time_logs; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.task_time_logs (
    id integer NOT NULL,
    task_id integer NOT NULL,
    user_id integer,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone,
    duration_seconds integer,
    description text,
    is_active boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.task_time_logs OWNER TO dev_user;

--
-- Name: task_time_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.task_time_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.task_time_logs_id_seq OWNER TO dev_user;

--
-- Name: task_time_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.task_time_logs_id_seq OWNED BY public.task_time_logs.id;


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.tasks (
    id integer NOT NULL,
    title character varying(500) NOT NULL,
    description text,
    status character varying(50) DEFAULT 'todo'::character varying,
    priority character varying(20) DEFAULT 'medium'::character varying,
    project_id integer,
    parent_id integer,
    assignee_id integer,
    created_by integer,
    due_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    manual_progress_override boolean DEFAULT false,
    manual_progress_value numeric(5,2),
    checklist_total integer DEFAULT 0,
    checklist_done integer DEFAULT 0,
    actual_spent_seconds bigint DEFAULT 0,
    story_points numeric(10,2),
    cached_progress numeric(5,2),
    cached_progress_updated_at timestamp with time zone,
    CONSTRAINT chk_checklist_done_lte_total CHECK ((checklist_done <= checklist_total)),
    CONSTRAINT tasks_actual_spent_seconds_check CHECK ((actual_spent_seconds >= 0)),
    CONSTRAINT tasks_cached_progress_check CHECK (((cached_progress >= (0)::numeric) AND (cached_progress <= (100)::numeric))),
    CONSTRAINT tasks_checklist_done_check CHECK ((checklist_done >= 0)),
    CONSTRAINT tasks_checklist_total_check CHECK ((checklist_total >= 0)),
    CONSTRAINT tasks_manual_progress_value_check CHECK (((manual_progress_value >= (0)::numeric) AND (manual_progress_value <= (100)::numeric))),
    CONSTRAINT tasks_story_points_check CHECK ((story_points >= (0)::numeric))
);


ALTER TABLE public.tasks OWNER TO dev_user;

--
-- Name: tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tasks_id_seq OWNER TO dev_user;

--
-- Name: tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.tasks_id_seq OWNED BY public.tasks.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(255) NOT NULL,
    email character varying(255),
    password_hash character varying(255),
    full_name character varying(255),
    avatar_url character varying(255),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO dev_user;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO dev_user;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: ai_configs id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.ai_configs ALTER COLUMN id SET DEFAULT nextval('public.ai_configs_id_seq'::regclass);


--
-- Name: encryption_keys id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.encryption_keys ALTER COLUMN id SET DEFAULT nextval('public.encryption_keys_id_seq'::regclass);


--
-- Name: progress_config id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.progress_config ALTER COLUMN id SET DEFAULT nextval('public.progress_config_id_seq'::regclass);


--
-- Name: progress_snapshots id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.progress_snapshots ALTER COLUMN id SET DEFAULT nextval('public.progress_snapshots_id_seq'::regclass);


--
-- Name: projects id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.projects ALTER COLUMN id SET DEFAULT nextval('public.projects_id_seq'::regclass);


--
-- Name: task_time_logs id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.task_time_logs ALTER COLUMN id SET DEFAULT nextval('public.task_time_logs_id_seq'::regclass);


--
-- Name: tasks id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.tasks ALTER COLUMN id SET DEFAULT nextval('public.tasks_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: ai_configs; Type: TABLE DATA; Schema: public; Owner: dev_user
--

COPY public.ai_configs (id, config_key, config_value, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: encryption_keys; Type: TABLE DATA; Schema: public; Owner: dev_user
--

COPY public.encryption_keys (id, key_name, key_value, algorithm, is_active, created_at, expires_at) FROM stdin;
1	default	OcRPS0d2fNiN5Hra3vrNVAGoqXH1eJhFdzYI8oZeGmM=	AES-256-GCM	t	2025-08-24 07:19:30.386622+00	\N
\.


--
-- Data for Name: progress_config; Type: TABLE DATA; Schema: public; Owner: dev_user
--

COPY public.progress_config (id, config_name, status_progress_map, include_cancelled, include_archived, blocked_policy, default_weight_field, enable_caching, cache_ttl_seconds, default_calculation_method, created_at, updated_at, created_by, updated_by) FROM stdin;
1	default	{"todo": 0, "draft": 0, "blocked": 0, "on_hold": null, "testing": 75, "archived": 100, "planning": 10, "cancelled": 0, "completed": 100, "suspended": null, "in_progress": 50}	f	f	zero	story_points	f	300	status_based	2025-08-24 07:19:30.386365+00	2025-08-24 07:19:30.386365+00	1	1
\.


--
-- Data for Name: progress_snapshots; Type: TABLE DATA; Schema: public; Owner: dev_user
--

COPY public.progress_snapshots (id, entity_type, entity_id, progress, method_used, computed_at, inputs, breakdown, config_id, total_weight, children_count, created_at) FROM stdin;
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: dev_user
--

COPY public.projects (id, name, description, status, created_by, created_at, updated_at) FROM stdin;
1	Default Project	Default project for tasks	active	1	2025-08-24 07:19:30.386047+00	2025-08-24 07:19:30.386047+00
\.


--
-- Data for Name: task_time_logs; Type: TABLE DATA; Schema: public; Owner: dev_user
--

COPY public.task_time_logs (id, task_id, user_id, start_time, end_time, duration_seconds, description, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: dev_user
--

COPY public.tasks (id, title, description, status, priority, project_id, parent_id, assignee_id, created_by, due_date, created_at, updated_at, manual_progress_override, manual_progress_value, checklist_total, checklist_done, actual_spent_seconds, story_points, cached_progress, cached_progress_updated_at) FROM stdin;
1	数据库同步测试任务	通过直接数据库操作创建的任务	todo	medium	1	\N	\N	2	\N	2025-08-24 07:20:34.50509+00	2025-08-24 07:20:34.50509+00	f	\N	0	0	0	\N	\N	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: dev_user
--

COPY public.users (id, username, email, password_hash, full_name, avatar_url, is_active, created_at, updated_at) FROM stdin;
1	admin	admin@example.com	\N	Administrator	\N	t	2025-08-24 07:19:30.385682+00	2025-08-24 07:19:30.385682+00
2	testuser	test@example.com	\N	Test User	\N	t	2025-08-24 07:20:29.617151+00	2025-08-24 07:20:29.617151+00
\.


--
-- Name: ai_configs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dev_user
--

SELECT pg_catalog.setval('public.ai_configs_id_seq', 1, false);


--
-- Name: encryption_keys_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dev_user
--

SELECT pg_catalog.setval('public.encryption_keys_id_seq', 1, true);


--
-- Name: progress_config_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dev_user
--

SELECT pg_catalog.setval('public.progress_config_id_seq', 1, true);


--
-- Name: progress_snapshots_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dev_user
--

SELECT pg_catalog.setval('public.progress_snapshots_id_seq', 1, false);


--
-- Name: projects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dev_user
--

SELECT pg_catalog.setval('public.projects_id_seq', 1, true);


--
-- Name: task_time_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dev_user
--

SELECT pg_catalog.setval('public.task_time_logs_id_seq', 1, false);


--
-- Name: tasks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dev_user
--

SELECT pg_catalog.setval('public.tasks_id_seq', 1, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dev_user
--

SELECT pg_catalog.setval('public.users_id_seq', 2, true);


--
-- Name: ai_configs ai_configs_config_key_key; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.ai_configs
    ADD CONSTRAINT ai_configs_config_key_key UNIQUE (config_key);


--
-- Name: ai_configs ai_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.ai_configs
    ADD CONSTRAINT ai_configs_pkey PRIMARY KEY (id);


--
-- Name: encryption_keys encryption_keys_key_name_key; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.encryption_keys
    ADD CONSTRAINT encryption_keys_key_name_key UNIQUE (key_name);


--
-- Name: encryption_keys encryption_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.encryption_keys
    ADD CONSTRAINT encryption_keys_pkey PRIMARY KEY (id);


--
-- Name: progress_config progress_config_config_name_key; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.progress_config
    ADD CONSTRAINT progress_config_config_name_key UNIQUE (config_name);


--
-- Name: progress_config progress_config_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.progress_config
    ADD CONSTRAINT progress_config_pkey PRIMARY KEY (id);


--
-- Name: progress_snapshots progress_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.progress_snapshots
    ADD CONSTRAINT progress_snapshots_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: task_time_logs task_time_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.task_time_logs
    ADD CONSTRAINT task_time_logs_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_ai_configs_active; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_ai_configs_active ON public.ai_configs USING btree (is_active);


--
-- Name: idx_encryption_keys_active; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_encryption_keys_active ON public.encryption_keys USING btree (is_active);


--
-- Name: idx_progress_snapshots_entity; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_progress_snapshots_entity ON public.progress_snapshots USING btree (entity_type, entity_id, computed_at DESC);


--
-- Name: idx_task_time_logs_task_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_task_time_logs_task_id ON public.task_time_logs USING btree (task_id);


--
-- Name: idx_task_time_logs_user_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_task_time_logs_user_id ON public.task_time_logs USING btree (user_id);


--
-- Name: idx_tasks_assignee_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_tasks_assignee_id ON public.tasks USING btree (assignee_id);


--
-- Name: idx_tasks_parent_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_tasks_parent_id ON public.tasks USING btree (parent_id);


--
-- Name: idx_tasks_project_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_tasks_project_id ON public.tasks USING btree (project_id);


--
-- Name: idx_tasks_status; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_tasks_status ON public.tasks USING btree (status);


--
-- Name: progress_snapshots progress_snapshots_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.progress_snapshots
    ADD CONSTRAINT progress_snapshots_config_id_fkey FOREIGN KEY (config_id) REFERENCES public.progress_config(id);


--
-- Name: projects projects_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: task_time_logs task_time_logs_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.task_time_logs
    ADD CONSTRAINT task_time_logs_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_time_logs task_time_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.task_time_logs
    ADD CONSTRAINT task_time_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: tasks tasks_assignee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.users(id);


--
-- Name: tasks tasks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: tasks tasks_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.tasks(id);


--
-- Name: tasks tasks_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: TABLE pg_stat_replication; Type: ACL; Schema: pg_catalog; Owner: dev_user
--

GRANT SELECT ON TABLE pg_catalog.pg_stat_replication TO repl_user;


--
-- PostgreSQL database dump complete
--

