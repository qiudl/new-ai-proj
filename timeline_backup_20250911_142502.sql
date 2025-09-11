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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: task_status_history; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.task_status_history (
    id integer NOT NULL,
    task_id integer NOT NULL,
    old_status character varying(50),
    new_status character varying(50) NOT NULL,
    change_reason character varying(500),
    change_type character varying(50) DEFAULT 'manual'::character varying,
    changed_by integer NOT NULL,
    related_task_ids integer[] DEFAULT '{}'::integer[],
    workflow_stage character varying(100),
    parallel_group_id character varying(100),
    dependency_resolved boolean DEFAULT false,
    metadata jsonb DEFAULT '{}'::jsonb,
    change_timestamp timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_change_type CHECK (((change_type)::text = ANY (ARRAY[('manual'::character varying)::text, ('automatic'::character varying)::text, ('dependency_resolved'::character varying)::text, ('parallel_sync'::character varying)::text, ('workflow_transition'::character varying)::text, ('bulk_update'::character varying)::text, ('system_migration'::character varying)::text]))),
    CONSTRAINT valid_new_status CHECK (((new_status)::text = ANY (ARRAY[('draft'::character varying)::text, ('planning'::character varying)::text, ('todo'::character varying)::text, ('in_progress'::character varying)::text, ('testing'::character varying)::text, ('review'::character varying)::text, ('completed'::character varying)::text, ('cancelled'::character varying)::text, ('on_hold'::character varying)::text, ('suspended'::character varying)::text, ('blocked'::character varying)::text, ('archived'::character varying)::text, ('failed'::character varying)::text, ('pending'::character varying)::text]))),
    CONSTRAINT valid_old_status CHECK (((old_status IS NULL) OR ((old_status)::text = ''::text) OR ((old_status)::text = ANY (ARRAY[('draft'::character varying)::text, ('planning'::character varying)::text, ('todo'::character varying)::text, ('in_progress'::character varying)::text, ('testing'::character varying)::text, ('review'::character varying)::text, ('completed'::character varying)::text, ('cancelled'::character varying)::text, ('on_hold'::character varying)::text, ('suspended'::character varying)::text, ('blocked'::character varying)::text, ('archived'::character varying)::text, ('failed'::character varying)::text, ('pending'::character varying)::text]))))
);


ALTER TABLE public.task_status_history OWNER TO dev_user;

--
-- Name: TABLE task_status_history; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON TABLE public.task_status_history IS 'Task status change history with parallel development support';


--
-- Name: COLUMN task_status_history.task_id; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.task_status_history.task_id IS 'Reference to the task that changed status';


--
-- Name: COLUMN task_status_history.old_status; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.task_status_history.old_status IS 'Previous status (NULL for initial status)';


--
-- Name: COLUMN task_status_history.new_status; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.task_status_history.new_status IS 'New status after change';


--
-- Name: COLUMN task_status_history.change_reason; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.task_status_history.change_reason IS 'Human-readable reason for the status change';


--
-- Name: COLUMN task_status_history.change_type; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.task_status_history.change_type IS 'Type of change: manual, automatic, dependency_resolved, parallel_sync, workflow_transition, bulk_update, system_migration';


--
-- Name: COLUMN task_status_history.related_task_ids; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.task_status_history.related_task_ids IS 'Array of task IDs that influenced this status change';


--
-- Name: COLUMN task_status_history.workflow_stage; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.task_status_history.workflow_stage IS 'Workflow stage that triggered this change';


--
-- Name: COLUMN task_status_history.parallel_group_id; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.task_status_history.parallel_group_id IS 'Group identifier for parallel tasks';


--
-- Name: COLUMN task_status_history.dependency_resolved; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.task_status_history.dependency_resolved IS 'Whether this change resolved a task dependency';


--
-- Name: COLUMN task_status_history.metadata; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.task_status_history.metadata IS 'Additional metadata about the status change';


--
-- Name: task_status_history_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.task_status_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.task_status_history_id_seq OWNER TO dev_user;

--
-- Name: task_status_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.task_status_history_id_seq OWNED BY public.task_status_history.id;


--
-- Name: task_status_history id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.task_status_history ALTER COLUMN id SET DEFAULT nextval('public.task_status_history_id_seq'::regclass);


--
-- Data for Name: task_status_history; Type: TABLE DATA; Schema: public; Owner: dev_user
--

COPY public.task_status_history (id, task_id, old_status, new_status, change_reason, change_type, changed_by, related_task_ids, workflow_stage, parallel_group_id, dependency_resolved, metadata, change_timestamp, created_at) FROM stdin;
1	188	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-17 14:53:09.993952	2025-08-17 14:53:09.993952
2	186	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-17 14:55:25.529629	2025-08-17 14:55:25.529629
3	175	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-17 16:35:57.69682	2025-08-17 16:35:57.69682
7	145	pending	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-17 16:46:25.768891	2025-08-17 16:46:25.768891
8	145	completed	pending	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-17 16:46:44.069006	2025-08-17 16:46:44.069006
9	145	pending	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-17 16:48:12.718564	2025-08-17 16:48:12.718564
10	189	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-17 16:55:35.882786	2025-08-17 16:55:35.882786
11	191	pending	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-17 17:14:23.327721	2025-08-17 17:14:23.327721
12	192	pending	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-17 17:49:44.402805	2025-08-17 17:49:44.402805
13	191	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-17 17:49:44.402805	2025-08-17 17:49:44.402805
14	193	pending	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-17 18:01:06.010895	2025-08-17 18:01:06.010895
15	197	in_progress	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 00:43:25.120441	2025-08-18 00:43:25.120441
16	195	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 04:24:59.519991	2025-08-18 04:24:59.519991
17	188	in_progress	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 04:25:51.199092	2025-08-18 04:25:51.199092
18	201	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 04:44:20.600093	2025-08-18 04:44:20.600093
19	200	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 04:44:20.600093	2025-08-18 04:44:20.600093
20	202	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 04:44:20.620903	2025-08-18 04:44:20.620903
21	202	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 05:34:20.503466	2025-08-18 05:34:20.503466
22	203	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 05:38:14.627649	2025-08-18 05:38:14.627649
23	195	completed	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 06:06:54.093642	2025-08-18 06:06:54.093642
24	221	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 10:37:18.737294	2025-08-18 10:37:18.737294
25	220	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 10:37:18.737294	2025-08-18 10:37:18.737294
59	97	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 15:27:37.417606	2025-08-18 15:27:37.417606
60	97	in_progress	pending	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 15:28:35.598227	2025-08-18 15:28:35.598227
61	97	pending	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 15:31:06.05461	2025-08-18 15:31:06.05461
62	97	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 15:33:26.664826	2025-08-18 15:33:26.664826
71	236	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 15:47:05.87747	2025-08-18 15:47:05.87747
72	237	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 15:47:05.87747	2025-08-18 15:47:05.87747
73	238	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 15:47:05.87747	2025-08-18 15:47:05.87747
74	239	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 15:47:05.87747	2025-08-18 15:47:05.87747
77	228	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 15:48:54.966721	2025-08-18 15:48:54.966721
78	224	planning	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 15:48:54.966721	2025-08-18 15:48:54.966721
79	224	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 15:52:31.805071	2025-08-18 15:52:31.805071
80	227	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 15:52:50.250804	2025-08-18 15:52:50.250804
81	224	in_progress	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 15:52:50.250804	2025-08-18 15:52:50.250804
82	222	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 15:57:43.133844	2025-08-18 15:57:43.133844
83	222	completed	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 16:00:21.235786	2025-08-18 16:00:21.235786
84	221	completed	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 16:29:12.412494	2025-08-18 16:29:12.412494
85	222	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 16:29:43.282462	2025-08-18 16:29:43.282462
86	236	completed	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 16:29:54.981479	2025-08-18 16:29:54.981479
87	237	completed	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 16:29:54.981479	2025-08-18 16:29:54.981479
88	238	completed	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 16:29:54.981479	2025-08-18 16:29:54.981479
89	239	completed	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 16:29:54.981479	2025-08-18 16:29:54.981479
90	236	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 16:32:21.115071	2025-08-18 16:32:21.115071
91	237	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 16:32:21.147054	2025-08-18 16:32:21.147054
92	238	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 16:32:21.163021	2025-08-18 16:32:21.163021
93	239	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 16:32:21.185826	2025-08-18 16:32:21.185826
94	249	todo	planning	\N	manual	1	{}	\N	\N	f	{}	2025-08-18 16:46:00.148342	2025-08-18 16:46:00.148342
95	256	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 16:52:33.685189	2025-08-18 16:52:33.685189
96	249	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 16:56:00.953511	2025-08-18 16:56:00.953511
97	256	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 16:59:53.675285	2025-08-18 16:59:53.675285
98	245	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 16:59:53.675285	2025-08-18 16:59:53.675285
99	245	completed	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 17:00:27.413121	2025-08-18 17:00:27.413121
100	252	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 17:04:12.481481	2025-08-18 17:04:12.481481
101	259	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 17:28:06.349343	2025-08-18 17:28:06.349343
102	260	draft	planning	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 17:33:11.690665	2025-08-18 17:33:11.690665
104	236	completed	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 17:33:53.980749	2025-08-18 17:33:53.980749
105	260	planning	blocked	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 17:34:01.278802	2025-08-18 17:34:01.278802
106	237	completed	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 17:34:06.638416	2025-08-18 17:34:06.638416
107	238	completed	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 17:34:20.122446	2025-08-18 17:34:20.122446
108	260	blocked	archived	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 17:34:29.118287	2025-08-18 17:34:29.118287
109	239	completed	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 17:34:31.007395	2025-08-18 17:34:31.007395
110	249	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 17:41:18.393435	2025-08-18 17:41:18.393435
111	237	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 17:45:45.067088	2025-08-18 17:45:45.067088
112	229	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 17:51:10.189452	2025-08-18 17:51:10.189452
113	238	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 17:54:58.359586	2025-08-18 17:54:58.359586
114	263	draft	planning	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 18:00:18.285184	2025-08-18 18:00:18.285184
115	239	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 22:21:31.243167	2025-08-18 22:21:31.243167
116	229	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 22:47:26.723772	2025-08-18 22:47:26.723772
117	230	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-18 23:25:23.851924	2025-08-18 23:25:23.851924
118	231	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-19 00:18:23.216123	2025-08-19 00:18:23.216123
119	264	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-19 00:26:37.279626	2025-08-19 00:26:37.279626
120	232	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-19 01:04:11.983556	2025-08-19 01:04:11.983556
121	271	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-19 07:13:45.007184	2025-08-19 07:13:45.007184
122	271	completed	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-19 07:21:20.75969	2025-08-19 07:21:20.75969
123	233	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-19 07:22:36.09195	2025-08-19 07:22:36.09195
124	234	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-19 07:38:39.109526	2025-08-19 07:38:39.109526
125	197	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-19 07:53:08.034072	2025-08-19 07:53:08.034072
126	275	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-19 09:20:02.471366	2025-08-19 09:20:02.471366
127	276	pending	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-19 21:45:58.106156	2025-08-19 21:45:58.106156
128	277	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-19 23:46:27.041683	2025-08-19 23:46:27.041683
150	305	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-20 00:41:14.578179	2025-08-20 00:41:14.578179
151	278	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-20 00:42:11.434747	2025-08-20 00:42:11.434747
152	300		completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-20 00:52:24.968141	2025-08-20 00:52:24.968141
153	301		completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-20 02:30:03.84584	2025-08-20 02:30:03.84584
154	302		completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-20 04:33:56.875396	2025-08-20 04:33:56.875396
155	263	planning	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-20 05:47:53.87315	2025-08-20 05:47:53.87315
156	303		completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-20 09:02:01.798794	2025-08-20 09:02:01.798794
157	274	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-20 09:06:51.855448	2025-08-20 09:06:51.855448
158	310	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-20 09:08:53.749074	2025-08-20 09:08:53.749074
159	311	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-20 09:15:40.105476	2025-08-20 09:15:40.105476
160	312	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-20 09:16:00.12183	2025-08-20 09:16:00.12183
161	313	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-20 09:16:19.471411	2025-08-20 09:16:19.471411
162	314	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-20 09:20:25.03133	2025-08-20 09:20:25.03133
163	304		completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-20 10:17:03.368348	2025-08-20 10:17:03.368348
164	278	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-20 10:29:25.404296	2025-08-20 10:29:25.404296
165	224	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-20 10:30:10.893281	2025-08-20 10:30:10.893281
166	227	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-20 12:51:49.44409	2025-08-20 12:51:49.44409
167	228	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-20 13:26:38.061564	2025-08-20 13:26:38.061564
168	230	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-20 13:26:48.582107	2025-08-20 13:26:48.582107
169	235	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-20 13:27:03.762197	2025-08-20 13:27:03.762197
170	224	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-20 13:27:03.762197	2025-08-20 13:27:03.762197
171	318	pending	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-20 13:45:05.590734	2025-08-20 13:45:05.590734
172	328	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-20 15:15:51.766491	2025-08-20 15:15:51.766491
173	323	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-20 15:17:11.809371	2025-08-20 15:17:11.809371
174	325	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-20 15:17:57.015766	2025-08-20 15:17:57.015766
175	236	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 01:35:18.934836	2025-08-21 01:35:18.934836
176	236	completed	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 02:02:23.099992	2025-08-21 02:02:23.099992
177	333	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 02:06:52.143453	2025-08-21 02:06:52.143453
178	336	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 02:11:29.711101	2025-08-21 02:11:29.711101
179	336	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 02:13:19.366191	2025-08-21 02:13:19.366191
180	335	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 02:13:19.366191	2025-08-21 02:13:19.366191
181	337	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 02:13:30.54475	2025-08-21 02:13:30.54475
182	337	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 02:26:09.013741	2025-08-21 02:26:09.013741
183	339	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 02:26:38.913775	2025-08-21 02:26:38.913775
184	339	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 02:26:52.746178	2025-08-21 02:26:52.746178
185	340	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 02:26:57.455347	2025-08-21 02:26:57.455347
186	340	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 02:27:09.831621	2025-08-21 02:27:09.831621
187	338	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 02:27:20.916093	2025-08-21 02:27:20.916093
188	338	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 02:27:27.619843	2025-08-21 02:27:27.619843
189	335	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 02:27:27.619843	2025-08-21 02:27:27.619843
194	333	in_progress	blocked	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 02:30:32.76232	2025-08-21 02:30:32.76232
195	334	todo	blocked	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 02:32:07.900952	2025-08-21 02:32:07.900952
196	335	completed	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 02:32:45.487854	2025-08-21 02:32:45.487854
197	341	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 02:36:05.989629	2025-08-21 02:36:05.989629
198	341	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 02:55:45.945379	2025-08-21 02:55:45.945379
199	348	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 03:21:45.565335	2025-08-21 03:21:45.565335
200	342	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 03:36:53.326073	2025-08-21 03:36:53.326073
201	335	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 03:36:53.326073	2025-08-21 03:36:53.326073
202	336	completed	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 03:40:30.553555	2025-08-21 03:40:30.553555
203	335	completed	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 03:40:30.553555	2025-08-21 03:40:30.553555
204	356	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 10:02:11.441748	2025-08-21 10:02:11.441748
205	356	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 10:20:57.472354	2025-08-21 10:20:57.472354
206	347	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 10:20:57.472354	2025-08-21 10:20:57.472354
207	357	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 10:23:34.596341	2025-08-21 10:23:34.596341
208	357	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 10:41:16.021119	2025-08-21 10:41:16.021119
209	358	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 10:41:22.988407	2025-08-21 10:41:22.988407
210	349	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 10:48:13.87177	2025-08-21 10:48:13.87177
211	390	todo	planning	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 12:22:24.12971	2025-08-21 12:22:24.12971
212	390	planning	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 12:22:24.172288	2025-08-21 12:22:24.172288
213	402	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 12:29:34.002625	2025-08-21 12:29:34.002625
214	403	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 12:29:45.291057	2025-08-21 12:29:45.291057
215	402	in_progress	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 12:30:26.199225	2025-08-21 12:30:26.199225
216	403	in_progress	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 12:30:49.416314	2025-08-21 12:30:49.416314
217	393	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 12:34:04.895588	2025-08-21 12:34:04.895588
218	393	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 14:00:05.58526	2025-08-21 14:00:05.58526
219	390	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 14:00:05.58526	2025-08-21 14:00:05.58526
220	407	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 14:34:20.101552	2025-08-21 14:34:20.101552
221	407	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 14:36:53.245046	2025-08-21 14:36:53.245046
222	402	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 14:36:53.245046	2025-08-21 14:36:53.245046
223	408	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 14:41:11.922925	2025-08-21 14:41:11.922925
224	359	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 15:08:35.726336	2025-08-21 15:08:35.726336
225	408	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 15:18:16.877488	2025-08-21 15:18:16.877488
226	409	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 15:19:05.798826	2025-08-21 15:19:05.798826
227	410	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 15:19:45.228391	2025-08-21 15:19:45.228391
228	402	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 15:19:45.228391	2025-08-21 15:19:45.228391
229	401	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 15:19:45.228391	2025-08-21 15:19:45.228391
231	419	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 23:49:14.05078	2025-08-21 23:49:14.05078
232	418	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 23:49:14.05078	2025-08-21 23:49:14.05078
233	420	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 23:49:14.077409	2025-08-21 23:49:14.077409
234	421	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 23:49:14.087636	2025-08-21 23:49:14.087636
235	422	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 23:49:14.095796	2025-08-21 23:49:14.095796
236	423	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 23:49:14.105158	2025-08-21 23:49:14.105158
237	424	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 23:49:14.112065	2025-08-21 23:49:14.112065
238	418	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-21 23:49:14.112065	2025-08-21 23:49:14.112065
264	458	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-24 07:41:18.038094	2025-08-24 07:41:18.038094
265	458	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-24 07:41:21.974811	2025-08-24 07:41:21.974811
266	360	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-24 08:14:13.307224	2025-08-24 08:14:13.307224
267	359	in_progress	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-24 08:14:13.307224	2025-08-24 08:14:13.307224
268	360	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-24 08:15:48.720089	2025-08-24 08:15:48.720089
269	391	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-24 08:15:48.720089	2025-08-24 08:15:48.720089
270	361	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-24 08:15:56.675091	2025-08-24 08:15:56.675091
271	460	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-24 08:28:29.859683	2025-08-24 08:28:29.859683
272	460	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-24 08:46:11.562354	2025-08-24 08:46:11.562354
273	461	todo	planning	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-24 08:50:12.253939	2025-08-24 08:50:12.253939
274	466	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-24 08:53:43.895562	2025-08-24 08:53:43.895562
275	467	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-24 08:56:22.459576	2025-08-24 08:56:22.459576
276	461	planning	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-24 08:58:46.808472	2025-08-24 08:58:46.808472
277	467	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-24 11:10:16.366996	2025-08-24 11:10:16.366996
278	468	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-24 14:37:53.323415	2025-08-24 14:37:53.323415
279	468	completed	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-24 14:58:07.800187	2025-08-24 14:58:07.800187
280	468	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-24 14:59:07.028995	2025-08-24 14:59:07.028995
281	469	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-24 15:16:39.754752	2025-08-24 15:16:39.754752
282	472		todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-24 15:22:51.390123	2025-08-24 15:22:51.390123
283	469	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-24 15:23:53.54327	2025-08-24 15:23:53.54327
284	474	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-25 10:00:53.905683	2025-08-25 10:00:53.905683
285	474	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-25 10:15:37.370841	2025-08-25 10:15:37.370841
286	482	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-25 14:33:32.582232	2025-08-25 14:33:32.582232
287	472	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-25 14:38:18.610724	2025-08-25 14:38:18.610724
288	483	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-25 14:41:03.122496	2025-08-25 14:41:03.122496
289	475	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-25 14:49:48.130829	2025-08-25 14:49:48.130829
290	475	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-25 14:57:19.645977	2025-08-25 14:57:19.645977
291	475	completed	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-25 15:45:36.491498	2025-08-25 15:45:36.491498
292	475	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-25 15:57:02.626163	2025-08-25 15:57:02.626163
293	488	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-25 16:02:58.955236	2025-08-25 16:02:58.955236
294	489	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-25 23:02:45.428876	2025-08-25 23:02:45.428876
295	501	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-25 23:04:59.250214	2025-08-25 23:04:59.250214
296	489	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-25 23:05:24.630581	2025-08-25 23:05:24.630581
297	501	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-25 23:08:51.295826	2025-08-25 23:08:51.295826
298	502	todo	planning	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-25 23:11:29.668536	2025-08-25 23:11:29.668536
299	502	planning	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-25 23:11:33.864938	2025-08-25 23:11:33.864938
300	502	todo	planning	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-25 23:20:01.6258	2025-08-25 23:20:01.6258
301	507	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-25 23:23:24.897014	2025-08-25 23:23:24.897014
302	511	todo	planning	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-25 23:25:31.321033	2025-08-25 23:25:31.321033
303	511	planning	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-25 23:25:35.145339	2025-08-25 23:25:35.145339
304	518	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-25 23:29:58.513587	2025-08-25 23:29:58.513587
305	507	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-25 23:30:45.74092	2025-08-25 23:30:45.74092
306	508	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-25 23:34:14.849384	2025-08-25 23:34:14.849384
307	518	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-25 23:37:49.103783	2025-08-25 23:37:49.103783
308	519	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-25 23:39:43.782707	2025-08-25 23:39:43.782707
309	508	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-25 23:49:10.74045	2025-08-25 23:49:10.74045
310	509	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 00:04:09.050494	2025-08-26 00:04:09.050494
311	509	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 00:17:42.344889	2025-08-26 00:17:42.344889
312	510	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 00:18:32.295728	2025-08-26 00:18:32.295728
313	521	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 00:21:19.189364	2025-08-26 00:21:19.189364
314	521	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 00:23:40.863188	2025-08-26 00:23:40.863188
315	521	completed	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 00:25:30.580684	2025-08-26 00:25:30.580684
316	510	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 01:00:43.532232	2025-08-26 01:00:43.532232
317	523	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 01:06:41.792656	2025-08-26 01:06:41.792656
318	522	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 01:08:58.103445	2025-08-26 01:08:58.103445
319	521	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 01:08:58.103445	2025-08-26 01:08:58.103445
320	523	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 01:11:47.282926	2025-08-26 01:11:47.282926
321	524	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 01:18:22.672358	2025-08-26 01:18:22.672358
322	525	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 01:19:16.284621	2025-08-26 01:19:16.284621
323	524	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 01:26:50.322666	2025-08-26 01:26:50.322666
324	525	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 01:33:44.778421	2025-08-26 01:33:44.778421
325	521	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 01:33:44.778421	2025-08-26 01:33:44.778421
326	526	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 01:37:13.221862	2025-08-26 01:37:13.221862
327	527	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 01:37:17.566978	2025-08-26 01:37:17.566978
328	526	in_progress	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 01:37:22.586908	2025-08-26 01:37:22.586908
329	528	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 01:37:42.429314	2025-08-26 01:37:42.429314
330	528	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 01:37:59.415944	2025-08-26 01:37:59.415944
331	526	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 01:37:59.415944	2025-08-26 01:37:59.415944
332	527	in_progress	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 01:38:00.277566	2025-08-26 01:38:00.277566
333	529	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 01:38:03.902805	2025-08-26 01:38:03.902805
334	529	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 01:38:40.360146	2025-08-26 01:38:40.360146
335	530	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 01:38:47.02205	2025-08-26 01:38:47.02205
336	530	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 01:39:35.20066	2025-08-26 01:39:35.20066
337	531	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 01:39:42.338674	2025-08-26 01:39:42.338674
338	531	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 01:40:21.301162	2025-08-26 01:40:21.301162
339	532	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 01:40:27.233303	2025-08-26 01:40:27.233303
340	532	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 01:41:18.112699	2025-08-26 01:41:18.112699
341	526	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 01:41:18.112699	2025-08-26 01:41:18.112699
342	536	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 01:48:17.693693	2025-08-26 01:48:17.693693
343	536	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 01:49:39.864416	2025-08-26 01:49:39.864416
344	538	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 01:51:45.028288	2025-08-26 01:51:45.028288
345	538	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 01:51:48.641946	2025-08-26 01:51:48.641946
346	533	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 01:55:18.111489	2025-08-26 01:55:18.111489
347	527	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 01:55:18.111489	2025-08-26 01:55:18.111489
348	534	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 01:55:21.471851	2025-08-26 01:55:21.471851
349	535	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 01:55:24.289805	2025-08-26 01:55:24.289805
350	537	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 01:55:27.525053	2025-08-26 01:55:27.525053
351	539	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 01:55:31.222166	2025-08-26 01:55:31.222166
352	527	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 01:55:31.222166	2025-08-26 01:55:31.222166
353	540	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 02:01:01.49614	2025-08-26 02:01:01.49614
354	540	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 02:03:35.138837	2025-08-26 02:03:35.138837
355	541	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 02:06:39.295553	2025-08-26 02:06:39.295553
356	541	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 02:21:09.260439	2025-08-26 02:21:09.260439
357	549	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 02:43:54.486846	2025-08-26 02:43:54.486846
358	550	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 02:46:21.295399	2025-08-26 02:46:21.295399
359	549	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 02:47:23.621316	2025-08-26 02:47:23.621316
360	552	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 02:49:56.637103	2025-08-26 02:49:56.637103
361	553	planning	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 10:14:39.227367	2025-08-26 10:14:39.227367
362	553	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 13:40:06.648491	2025-08-26 13:40:06.648491
363	564	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 14:54:07.321898	2025-08-26 14:54:07.321898
364	565	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 21:03:34.566759	2025-08-26 21:03:34.566759
365	566	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 21:04:35.48601	2025-08-26 21:04:35.48601
366	565	in_progress	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 21:04:35.48601	2025-08-26 21:04:35.48601
367	566	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 21:11:35.923825	2025-08-26 21:11:35.923825
368	565	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 21:11:35.923825	2025-08-26 21:11:35.923825
369	567	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 21:15:09.247939	2025-08-26 21:15:09.247939
370	567	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 21:27:06.973401	2025-08-26 21:27:06.973401
371	568	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 21:28:49.438693	2025-08-26 21:28:49.438693
372	568	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 21:33:13.868612	2025-08-26 21:33:13.868612
373	565	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 21:33:13.868612	2025-08-26 21:33:13.868612
374	575	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 21:39:20.108319	2025-08-26 21:39:20.108319
375	580	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 21:39:50.524928	2025-08-26 21:39:50.524928
376	575	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 21:42:11.24149	2025-08-26 21:42:11.24149
377	569	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 21:42:11.24149	2025-08-26 21:42:11.24149
378	577	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 21:42:14.548128	2025-08-26 21:42:14.548128
379	577	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 21:42:46.269524	2025-08-26 21:42:46.269524
380	578	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 21:42:57.386716	2025-08-26 21:42:57.386716
381	578	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 21:43:00.163066	2025-08-26 21:43:00.163066
382	579	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 21:43:03.230906	2025-08-26 21:43:03.230906
383	579	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 21:43:19.771892	2025-08-26 21:43:19.771892
384	569	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 21:43:23.50903	2025-08-26 21:43:23.50903
385	581	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 22:02:53.416922	2025-08-26 22:02:53.416922
386	581	in_progress	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 22:03:47.60085	2025-08-26 22:03:47.60085
387	582	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 22:05:25.055205	2025-08-26 22:05:25.055205
388	581	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 22:05:25.055205	2025-08-26 22:05:25.055205
389	580	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 22:07:45.114048	2025-08-26 22:07:45.114048
390	583	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-26 23:06:37.609716	2025-08-26 23:06:37.609716
391	584	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 00:22:36.235185	2025-08-27 00:22:36.235185
392	585	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 02:09:32.761731	2025-08-27 02:09:32.761731
393	585	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 02:13:47.181771	2025-08-27 02:13:47.181771
394	586	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 02:18:08.936397	2025-08-27 02:18:08.936397
395	587	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 02:22:20.340553	2025-08-27 02:22:20.340553
396	587	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 02:24:41.829294	2025-08-27 02:24:41.829294
397	588	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 02:34:31.743561	2025-08-27 02:34:31.743561
398	588	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 02:40:44.947805	2025-08-27 02:40:44.947805
399	589	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 02:50:55.714755	2025-08-27 02:50:55.714755
400	589	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 02:58:31.577593	2025-08-27 02:58:31.577593
401	590	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 03:29:10.267678	2025-08-27 03:29:10.267678
402	590	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 03:31:49.821993	2025-08-27 03:31:49.821993
403	591	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 03:36:05.648652	2025-08-27 03:36:05.648652
404	591	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 03:38:42.33331	2025-08-27 03:38:42.33331
405	592	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 03:40:55.452127	2025-08-27 03:40:55.452127
406	592	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 03:43:10.585741	2025-08-27 03:43:10.585741
407	593	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 03:45:16.571693	2025-08-27 03:45:16.571693
408	594	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 04:01:38.369459	2025-08-27 04:01:38.369459
409	594	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 04:03:28.220005	2025-08-27 04:03:28.220005
410	595	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 04:06:02.878827	2025-08-27 04:06:02.878827
411	595	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 04:08:56.452705	2025-08-27 04:08:56.452705
412	596	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 04:11:40.293377	2025-08-27 04:11:40.293377
413	597	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 05:54:21.310731	2025-08-27 05:54:21.310731
414	598	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:00:50.079482	2025-08-27 06:00:50.079482
415	598	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:02:45.50259	2025-08-27 06:02:45.50259
416	598	completed	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:05:44.659838	2025-08-27 06:05:44.659838
417	605	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:06:21.953227	2025-08-27 06:06:21.953227
418	605	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:07:52.530747	2025-08-27 06:07:52.530747
419	599	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:07:52.530747	2025-08-27 06:07:52.530747
420	606	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:07:55.692665	2025-08-27 06:07:55.692665
421	603	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:12:33.471305	2025-08-27 06:12:33.471305
422	603	in_progress	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:15:47.053445	2025-08-27 06:15:47.053445
423	609	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:16:13.408968	2025-08-27 06:16:13.408968
424	609	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:17:07.210283	2025-08-27 06:17:07.210283
425	603	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:17:07.210283	2025-08-27 06:17:07.210283
426	610	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:17:11.122836	2025-08-27 06:17:11.122836
427	610	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:18:59.737364	2025-08-27 06:18:59.737364
428	614	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:19:14.169703	2025-08-27 06:19:14.169703
429	606	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:19:23.10942	2025-08-27 06:19:23.10942
430	607	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:20:08.642947	2025-08-27 06:20:08.642947
431	614	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:20:33.626092	2025-08-27 06:20:33.626092
432	611	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:21:11.27214	2025-08-27 06:21:11.27214
433	611	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:25:06.39011	2025-08-27 06:25:06.39011
434	612	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:25:10.745676	2025-08-27 06:25:10.745676
435	596	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:25:35.406953	2025-08-27 06:25:35.406953
436	612	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:26:40.496213	2025-08-27 06:26:40.496213
437	613	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:26:44.465544	2025-08-27 06:26:44.465544
438	613	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:30:05.862972	2025-08-27 06:30:05.862972
439	615	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:30:09.94893	2025-08-27 06:30:09.94893
440	359	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:31:00.100411	2025-08-27 06:31:00.100411
441	607	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:31:06.574653	2025-08-27 06:31:06.574653
442	615	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:32:09.05135	2025-08-27 06:32:09.05135
443	603	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:32:09.05135	2025-08-27 06:32:09.05135
444	598	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:32:09.05135	2025-08-27 06:32:09.05135
445	359	in_progress	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:32:42.06573	2025-08-27 06:32:42.06573
446	616	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:32:52.617875	2025-08-27 06:32:52.617875
447	608	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:33:44.380775	2025-08-27 06:33:44.380775
448	616	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:33:52.214008	2025-08-27 06:33:52.214008
449	359	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:33:52.214008	2025-08-27 06:33:52.214008
450	617	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:33:57.246538	2025-08-27 06:33:57.246538
451	617	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:36:32.168176	2025-08-27 06:36:32.168176
452	618	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:36:36.218265	2025-08-27 06:36:36.218265
453	618	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:45:06.42833	2025-08-27 06:45:06.42833
454	619	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:45:24.628848	2025-08-27 06:45:24.628848
455	609	completed	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:49:00.361806	2025-08-27 06:49:00.361806
456	603	completed	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:49:00.361806	2025-08-27 06:49:00.361806
457	598	in_progress	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:49:00.361806	2025-08-27 06:49:00.361806
458	619	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:53:21.413828	2025-08-27 06:53:21.413828
459	609	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:53:22.561677	2025-08-27 06:53:22.561677
460	603	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:53:22.561677	2025-08-27 06:53:22.561677
461	598	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:53:22.561677	2025-08-27 06:53:22.561677
462	620	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:53:25.090612	2025-08-27 06:53:25.090612
463	610	completed	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:54:33.247397	2025-08-27 06:54:33.247397
464	603	completed	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:54:33.247397	2025-08-27 06:54:33.247397
465	598	in_progress	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:54:33.247397	2025-08-27 06:54:33.247397
466	608	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:54:39.296282	2025-08-27 06:54:39.296282
467	599	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:54:39.296282	2025-08-27 06:54:39.296282
468	598	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:54:39.296282	2025-08-27 06:54:39.296282
469	610	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:58:53.791367	2025-08-27 06:58:53.791367
470	603	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 06:58:53.791367	2025-08-27 06:58:53.791367
471	620	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 07:00:15.323636	2025-08-27 07:00:15.323636
472	622	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 07:03:16.642443	2025-08-27 07:03:16.642443
473	621	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 07:07:14.754966	2025-08-27 07:07:14.754966
474	622	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 07:09:33.881949	2025-08-27 07:09:33.881949
475	600	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 07:09:33.881949	2025-08-27 07:09:33.881949
476	623	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 07:10:49.482885	2025-08-27 07:10:49.482885
477	623	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 07:24:25.50328	2025-08-27 07:24:25.50328
478	624	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 07:27:44.728402	2025-08-27 07:27:44.728402
479	624	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 07:46:56.593708	2025-08-27 07:46:56.593708
480	625	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 07:48:27.5567	2025-08-27 07:48:27.5567
481	621	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 07:48:55.116964	2025-08-27 07:48:55.116964
482	640	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 07:51:43.101361	2025-08-27 07:51:43.101361
483	640	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 07:58:45.492584	2025-08-27 07:58:45.492584
484	363	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 08:02:28.365745	2025-08-27 08:02:28.365745
485	363	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 08:12:11.721868	2025-08-27 08:12:11.721868
486	386	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 08:12:11.721868	2025-08-27 08:12:11.721868
487	364	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 08:14:54.399146	2025-08-27 08:14:54.399146
488	625	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 08:15:11.876689	2025-08-27 08:15:11.876689
489	626	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 08:19:53.419422	2025-08-27 08:19:53.419422
490	364	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 08:28:00.084711	2025-08-27 08:28:00.084711
491	626	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 08:29:35.279598	2025-08-27 08:29:35.279598
492	627	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 08:31:45.464742	2025-08-27 08:31:45.464742
493	365	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 08:32:58.250007	2025-08-27 08:32:58.250007
494	366	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 08:33:07.138673	2025-08-27 08:33:07.138673
495	627	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 08:44:43.369905	2025-08-27 08:44:43.369905
496	628	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 08:45:50.414175	2025-08-27 08:45:50.414175
4120	790	in_progress	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 09:00:53.898893	2025-08-27 09:00:53.898893
4121	785	todo	in_progress	开始执行任务: 第一阶段：需求分析与技术设计	manual	1	{}	\N	\N	f	{}	2025-06-28 09:00:53.898893	2025-08-27 09:00:53.898893
499	628	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 08:47:54.034364	2025-08-27 08:47:54.034364
500	601	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 08:47:54.034364	2025-08-27 08:47:54.034364
4122	785	in_progress	completed	任务完成: 第一阶段：需求分析与技术设计	manual	1	{}	\N	\N	f	{}	2025-07-02 02:00:53.898893	2025-08-27 09:00:53.898893
4123	786	todo	in_progress	开始执行任务: 业务需求调研	manual	1	{}	\N	\N	f	{}	2025-07-03 09:00:53.898893	2025-08-27 09:00:53.898893
4124	786	in_progress	completed	任务完成: 业务需求调研	manual	1	{}	\N	\N	f	{}	2025-07-07 03:00:53.898893	2025-08-27 09:00:53.898893
4125	787	todo	in_progress	开始执行任务: 技术方案设计	manual	1	{}	\N	\N	f	{}	2025-07-10 09:00:53.898893	2025-08-27 09:00:53.898893
4126	787	in_progress	completed	任务完成: 技术方案设计	manual	1	{}	\N	\N	f	{}	2025-07-14 04:00:53.898893	2025-08-27 09:00:53.898893
4127	788	todo	in_progress	开始执行任务: 数据库设计	manual	1	{}	\N	\N	f	{}	2025-07-17 09:00:53.898893	2025-08-27 09:00:53.898893
4128	788	in_progress	completed	任务完成: 数据库设计	manual	1	{}	\N	\N	f	{}	2025-07-21 05:00:53.898893	2025-08-27 09:00:53.898893
4129	2	todo	in_progress	开始执行任务: 安装Docker环境	manual	1	{}	\N	\N	f	{}	2025-07-21 04:11:54.875182	2025-08-27 09:00:53.898893
4130	2	in_progress	completed	任务完成: 安装Docker环境	manual	1	{}	\N	\N	f	{}	2025-07-24 06:11:54.875182	2025-08-27 09:00:53.898893
4131	10	todo	in_progress	开始执行任务: 设计任务表结构	manual	1	{}	\N	\N	f	{}	2025-07-21 04:12:27.867965	2025-08-27 09:00:53.898893
4132	10	in_progress	completed	任务完成: 设计任务表结构	manual	1	{}	\N	\N	f	{}	2025-07-24 14:12:27.867965	2025-08-27 09:00:53.898893
4133	9	todo	in_progress	开始执行任务: 设计项目表结构	manual	1	{}	\N	\N	f	{}	2025-07-21 04:12:27.867965	2025-08-27 09:00:53.898893
4134	9	in_progress	completed	任务完成: 设计项目表结构	manual	1	{}	\N	\N	f	{}	2025-07-24 13:12:27.867965	2025-08-27 09:00:53.898893
4135	15	todo	in_progress	开始执行任务: 数据库设计	manual	1	{}	\N	\N	f	{}	2025-07-21 05:45:38.372525	2025-08-27 09:00:53.898893
4136	15	in_progress	completed	任务完成: 数据库设计	manual	1	{}	\N	\N	f	{}	2025-07-24 20:45:38.372525	2025-08-27 09:00:53.898893
4137	28	todo	in_progress	开始执行任务: child task	manual	1	{}	\N	\N	f	{}	2025-07-21 11:33:47.11278	2025-08-27 09:00:53.898893
4138	28	in_progress	completed	任务完成: child task	manual	1	{}	\N	\N	f	{}	2025-07-24 15:33:47.11278	2025-08-27 09:00:53.898893
4139	789	todo	in_progress	开始执行任务: API接口设计	manual	1	{}	\N	\N	f	{}	2025-07-24 09:00:53.898893	2025-08-27 09:00:53.898893
4140	789	in_progress	completed	任务完成: API接口设计	manual	1	{}	\N	\N	f	{}	2025-07-28 06:00:53.898893	2025-08-27 09:00:53.898893
4141	46	todo	in_progress	开始执行任务: 31周-01-01：分析计时器的bugs原因	manual	1	{}	\N	\N	f	{}	2025-08-02 15:29:15.584265	2025-08-27 09:00:53.898893
4142	46	in_progress	completed	任务完成: 31周-01-01：分析计时器的bugs原因	manual	1	{}	\N	\N	f	{}	2025-08-06 13:29:15.584265	2025-08-27 09:00:53.898893
4143	47	todo	in_progress	开始执行任务: 31周-01-02：启动计时器权限不足bug	manual	1	{}	\N	\N	f	{}	2025-08-02 15:36:46.531296	2025-08-27 09:00:53.898893
4144	47	in_progress	completed	任务完成: 31周-01-02：启动计时器权限不足bug	manual	1	{}	\N	\N	f	{}	2025-08-06 14:36:46.531296	2025-08-27 09:00:53.898893
4145	48	todo	in_progress	开始执行任务: 31周-01-03：重构计时器处理器	manual	1	{}	\N	\N	f	{}	2025-08-03 01:37:37.653977	2025-08-27 09:00:53.898893
4146	48	in_progress	completed	任务完成: 31周-01-03：重构计时器处理器	manual	1	{}	\N	\N	f	{}	2025-08-06 01:37:37.653977	2025-08-27 09:00:53.898893
4147	50	todo	in_progress	开始执行任务: Claude Code MCP 集成测试任务	manual	1	{}	\N	\N	f	{}	2025-08-03 02:49:49.442039	2025-08-27 09:00:53.898893
4148	50	in_progress	completed	任务完成: Claude Code MCP 集成测试任务	manual	1	{}	\N	\N	f	{}	2025-08-06 04:49:49.442039	2025-08-27 09:00:53.898893
4149	51	todo	in_progress	开始执行任务: 子任务: 前端集成开发	manual	1	{}	\N	\N	f	{}	2025-08-03 02:49:49.455893	2025-08-27 09:00:53.898893
4150	51	in_progress	completed	任务完成: 子任务: 前端集成开发	manual	1	{}	\N	\N	f	{}	2025-08-06 05:49:49.455893	2025-08-27 09:00:53.898893
4151	52	todo	in_progress	开始执行任务: 子任务: 后端 API 调试	manual	1	{}	\N	\N	f	{}	2025-08-03 02:49:49.465095	2025-08-27 09:00:53.898893
4152	52	in_progress	completed	任务完成: 子任务: 后端 API 调试	manual	1	{}	\N	\N	f	{}	2025-08-06 06:49:49.465095	2025-08-27 09:00:53.898893
4153	53	todo	in_progress	开始执行任务: 测试1: create_task功能验证	manual	1	{}	\N	\N	f	{}	2025-08-03 03:10:48.464245	2025-08-27 09:00:53.898893
4154	53	in_progress	completed	任务完成: 测试1: create_task功能验证	manual	1	{}	\N	\N	f	{}	2025-08-06 08:10:48.464245	2025-08-27 09:00:53.898893
4155	54	todo	in_progress	开始执行任务: 测试2: list_tasks功能验证	manual	1	{}	\N	\N	f	{}	2025-08-03 03:10:51.472675	2025-08-27 09:00:53.898893
4156	54	in_progress	completed	任务完成: 测试2: list_tasks功能验证	manual	1	{}	\N	\N	f	{}	2025-08-06 09:10:51.472675	2025-08-27 09:00:53.898893
4157	55	todo	in_progress	开始执行任务: 测试3: start_task功能验证	manual	1	{}	\N	\N	f	{}	2025-08-03 03:10:54.912394	2025-08-27 09:00:53.898893
4158	55	in_progress	completed	任务完成: 测试3: start_task功能验证	manual	1	{}	\N	\N	f	{}	2025-08-06 10:10:54.912394	2025-08-27 09:00:53.898893
4159	56	todo	in_progress	开始执行任务: 测试4: complete_task功能验证	manual	1	{}	\N	\N	f	{}	2025-08-03 03:10:58.311231	2025-08-27 09:00:53.898893
4160	56	in_progress	completed	任务完成: 测试4: complete_task功能验证	manual	1	{}	\N	\N	f	{}	2025-08-06 11:10:58.311231	2025-08-27 09:00:53.898893
4161	57	todo	in_progress	开始执行任务: 测试5: create_subtask功能验证	manual	1	{}	\N	\N	f	{}	2025-08-03 03:11:01.411968	2025-08-27 09:00:53.898893
4162	57	in_progress	completed	任务完成: 测试5: create_subtask功能验证	manual	1	{}	\N	\N	f	{}	2025-08-06 12:11:01.411968	2025-08-27 09:00:53.898893
4163	58	todo	in_progress	开始执行任务: 测试6: find_task功能验证	manual	1	{}	\N	\N	f	{}	2025-08-03 03:11:04.378923	2025-08-27 09:00:53.898893
4164	58	in_progress	completed	任务完成: 测试6: find_task功能验证	manual	1	{}	\N	\N	f	{}	2025-08-06 13:11:04.378923	2025-08-27 09:00:53.898893
4165	59	todo	in_progress	开始执行任务: 测试任务A: API接口开发	manual	1	{}	\N	\N	f	{}	2025-08-03 03:11:17.364849	2025-08-27 09:00:53.898893
4166	59	in_progress	completed	任务完成: 测试任务A: API接口开发	manual	1	{}	\N	\N	f	{}	2025-08-06 14:11:17.364849	2025-08-27 09:00:53.898893
4167	63	todo	in_progress	开始执行任务: 录制AI自动化测试 - 测试用	manual	1	{}	\N	\N	f	{}	2025-08-03 04:14:50.531608	2025-08-27 09:00:53.898893
4168	63	in_progress	completed	任务完成: 录制AI自动化测试 - 测试用	manual	1	{}	\N	\N	f	{}	2025-08-06 19:14:50.531608	2025-08-27 09:00:53.898893
4169	64	todo	in_progress	开始执行任务: 测试任务编辑 - 调试模式	manual	1	{}	\N	\N	f	{}	2025-08-03 04:15:23.543898	2025-08-27 09:00:53.898893
4170	64	in_progress	completed	任务完成: 测试任务编辑 - 调试模式	manual	1	{}	\N	\N	f	{}	2025-08-06 20:15:23.543898	2025-08-27 09:00:53.898893
4171	65	todo	in_progress	开始执行任务: 用调试模式测试任务保存失败	manual	1	{}	\N	\N	f	{}	2025-08-03 04:45:37.871781	2025-08-27 09:00:53.898893
4172	65	in_progress	completed	任务完成: 用调试模式测试任务保存失败	manual	1	{}	\N	\N	f	{}	2025-08-06 21:45:37.871781	2025-08-27 09:00:53.898893
4173	66	todo	in_progress	开始执行任务: 31周-02：claude-mcp功能1.1版升级	manual	1	{}	\N	\N	f	{}	2025-08-03 05:25:23.914464	2025-08-27 09:00:53.898893
4174	66	in_progress	completed	任务完成: 31周-02：claude-mcp功能1.1版升级	manual	1	{}	\N	\N	f	{}	2025-08-06 23:25:23.914464	2025-08-27 09:00:53.898893
4175	67	todo	in_progress	开始执行任务: 31-02-01：创建兄弟任务接口	manual	1	{}	\N	\N	f	{}	2025-08-03 05:25:34.341301	2025-08-27 09:00:53.898893
4176	67	in_progress	completed	任务完成: 31-02-01：创建兄弟任务接口	manual	1	{}	\N	\N	f	{}	2025-08-07 00:25:34.341301	2025-08-27 09:00:53.898893
4177	71	todo	in_progress	开始执行任务: 31-02-02：手工批量创建子任务接口	manual	1	{}	\N	\N	f	{}	2025-08-03 05:34:26.4299	2025-08-27 09:00:53.898893
4178	71	in_progress	completed	任务完成: 31-02-02：手工批量创建子任务接口	manual	1	{}	\N	\N	f	{}	2025-08-07 04:34:26.4299	2025-08-27 09:00:53.898893
4179	72	todo	in_progress	开始执行任务: 31-02-03：任务文档接口	manual	1	{}	\N	\N	f	{}	2025-08-03 05:34:26.443355	2025-08-27 09:00:53.898893
4180	72	in_progress	completed	任务完成: 31-02-03：任务文档接口	manual	1	{}	\N	\N	f	{}	2025-08-06 05:34:26.443355	2025-08-27 09:00:53.898893
4181	73	todo	in_progress	开始执行任务: 31-02-04：任务详情接口	manual	1	{}	\N	\N	f	{}	2025-08-03 05:34:26.457873	2025-08-27 09:00:53.898893
4182	73	in_progress	completed	任务完成: 31-02-04：任务详情接口	manual	1	{}	\N	\N	f	{}	2025-08-06 06:34:26.457873	2025-08-27 09:00:53.898893
4183	76	todo	in_progress	开始执行任务: 31-02-05：delete_task - 删除单个任务	manual	1	{}	\N	\N	f	{}	2025-08-03 06:37:28.211678	2025-08-27 09:00:53.898893
4184	76	in_progress	completed	任务完成: 31-02-05：delete_task - 删除单个任务	manual	1	{}	\N	\N	f	{}	2025-08-06 10:37:28.211678	2025-08-27 09:00:53.898893
4185	77	todo	in_progress	开始执行任务: 31-02-06：update_task - 更新任务信息	manual	1	{}	\N	\N	f	{}	2025-08-03 06:38:40.03891	2025-08-27 09:00:53.898893
4186	77	in_progress	completed	任务完成: 31-02-06：update_task - 更新任务信息	manual	1	{}	\N	\N	f	{}	2025-08-06 11:38:40.03891	2025-08-27 09:00:53.898893
4187	78	todo	in_progress	开始执行任务: 31-02-07：archive_task - 归档任务	manual	1	{}	\N	\N	f	{}	2025-08-03 06:38:40.579589	2025-08-27 09:00:53.898893
4188	78	in_progress	completed	任务完成: 31-02-07：archive_task - 归档任务	manual	1	{}	\N	\N	f	{}	2025-08-06 12:38:40.579589	2025-08-27 09:00:53.898893
4189	79	todo	in_progress	开始执行任务: 31-02-08：move_task - 移动任务到其他项目	manual	1	{}	\N	\N	f	{}	2025-08-03 06:38:41.122123	2025-08-27 09:00:53.898893
4190	79	in_progress	completed	任务完成: 31-02-08：move_task - 移动任务到其他项目	manual	1	{}	\N	\N	f	{}	2025-08-06 13:38:41.122123	2025-08-27 09:00:53.898893
4191	88	todo	in_progress	开始执行任务: 最终更新的标题	manual	1	{}	\N	\N	f	{}	2025-08-03 07:06:47.465043	2025-08-27 09:00:53.898893
4192	88	in_progress	completed	任务完成: 最终更新的标题	manual	1	{}	\N	\N	f	{}	2025-08-06 23:06:47.465043	2025-08-27 09:00:53.898893
4193	89	todo	in_progress	开始执行任务: 最终更新的标题	manual	1	{}	\N	\N	f	{}	2025-08-03 07:08:44.167493	2025-08-27 09:00:53.898893
4194	89	in_progress	completed	任务完成: 最终更新的标题	manual	1	{}	\N	\N	f	{}	2025-08-07 00:08:44.167493	2025-08-27 09:00:53.898893
4195	95	todo	in_progress	开始执行任务: 修复项目详情页任务管理tab统计卡片高度对齐问题	manual	1	{}	\N	\N	f	{}	2025-08-03 07:27:57.937543	2025-08-27 09:00:53.898893
4196	95	in_progress	completed	任务完成: 修复项目详情页任务管理tab统计卡片高度对齐问题	manual	1	{}	\N	\N	f	{}	2025-08-07 06:27:57.937543	2025-08-27 09:00:53.898893
4197	97	todo	in_progress	开始执行任务: 测试移动任务功能	manual	1	{}	\N	\N	f	{}	2025-08-03 07:28:04.466398	2025-08-27 09:00:53.898893
4198	97	in_progress	completed	任务完成: 测试移动任务功能	manual	1	{}	\N	\N	f	{}	2025-08-06 08:28:04.466398	2025-08-27 09:00:53.898893
4199	104	todo	in_progress	开始执行任务: 完善任务信息功能 - 增加Markdown编辑器支持详细信息记录	manual	1	{}	\N	\N	f	{}	2025-08-03 07:35:09.468791	2025-08-27 09:00:53.898893
4200	104	in_progress	completed	任务完成: 完善任务信息功能 - 增加Markdown编辑器支持详细信息记录	manual	1	{}	\N	\N	f	{}	2025-08-06 15:35:09.468791	2025-08-27 09:00:53.898893
4201	108	todo	in_progress	开始执行任务: 🎉 Markdown功能完整演示	manual	1	{}	\N	\N	f	{}	2025-08-03 08:29:36.39604	2025-08-27 09:00:53.898893
4202	108	in_progress	completed	任务完成: 🎉 Markdown功能完整演示	manual	1	{}	\N	\N	f	{}	2025-08-06 20:29:36.39604	2025-08-27 09:00:53.898893
4203	109	todo	in_progress	开始执行任务: 优化任务统计卡片布局	manual	1	{}	\N	\N	f	{}	2025-08-03 08:29:51.579555	2025-08-27 09:00:53.898893
4204	109	in_progress	completed	任务完成: 优化任务统计卡片布局	manual	1	{}	\N	\N	f	{}	2025-08-06 21:29:51.579555	2025-08-27 09:00:53.898893
4205	110	todo	in_progress	开始执行任务: 优化"编辑任务"页面	manual	1	{}	\N	\N	f	{}	2025-08-03 08:37:48.892454	2025-08-27 09:00:53.898893
4206	110	in_progress	completed	任务完成: 优化"编辑任务"页面	manual	1	{}	\N	\N	f	{}	2025-08-06 22:37:48.892454	2025-08-27 09:00:53.898893
4207	111	todo	in_progress	开始执行任务: 增加选择父任务功能	manual	1	{}	\N	\N	f	{}	2025-08-03 08:37:55.727072	2025-08-27 09:00:53.898893
4208	111	in_progress	completed	任务完成: 增加选择父任务功能	manual	1	{}	\N	\N	f	{}	2025-08-06 23:37:55.727072	2025-08-27 09:00:53.898893
4209	112	todo	in_progress	开始执行任务: 增加任务信息编辑框	manual	1	{}	\N	\N	f	{}	2025-08-03 08:37:59.708474	2025-08-27 09:00:53.898893
4210	112	in_progress	completed	任务完成: 增加任务信息编辑框	manual	1	{}	\N	\N	f	{}	2025-08-07 00:37:59.708474	2025-08-27 09:00:53.898893
4211	116	todo	in_progress	开始执行任务: 子任务3-数据库设计	manual	1	{}	\N	\N	f	{}	2025-08-03 08:57:14.030187	2025-08-27 09:00:53.898893
4212	116	in_progress	completed	任务完成: 子任务3-数据库设计	manual	1	{}	\N	\N	f	{}	2025-08-07 04:57:14.030187	2025-08-27 09:00:53.898893
4213	119	todo	in_progress	开始执行任务: 任务详情页子任务表格增强 - 添加任务ID列和排序功能	manual	1	{}	\N	\N	f	{}	2025-08-03 08:58:22.352961	2025-08-27 09:00:53.898893
4214	119	in_progress	completed	任务完成: 任务详情页子任务表格增强 - 添加任务ID列和排序功能	manual	1	{}	\N	\N	f	{}	2025-08-07 07:58:22.352961	2025-08-27 09:00:53.898893
4215	120	todo	in_progress	开始执行任务: 优化任务详情页：简化编辑器	manual	1	{}	\N	\N	f	{}	2025-08-03 09:04:44.245116	2025-08-27 09:00:53.898893
4216	120	in_progress	completed	任务完成: 优化任务详情页：简化编辑器	manual	1	{}	\N	\N	f	{}	2025-08-06 09:04:44.245116	2025-08-27 09:00:53.898893
4217	121	todo	in_progress	开始执行任务: 修复项目任务列表页的bugs	manual	1	{}	\N	\N	f	{}	2025-08-03 09:19:06.695157	2025-08-27 09:00:53.898893
4218	121	in_progress	completed	任务完成: 修复项目任务列表页的bugs	manual	1	{}	\N	\N	f	{}	2025-08-06 10:19:06.695157	2025-08-27 09:00:53.898893
4219	122	todo	in_progress	开始执行任务: 实现AI智能任务管理功能集	manual	1	{}	\N	\N	f	{}	2025-08-03 09:21:20.399238	2025-08-27 09:00:53.898893
4220	122	in_progress	completed	任务完成: 实现AI智能任务管理功能集	manual	1	{}	\N	\N	f	{}	2025-08-06 11:21:20.399238	2025-08-27 09:00:53.898893
4221	123	todo	in_progress	开始执行任务: Phase 1: EnhancedProjectTaskManager问题诊断	manual	1	{}	\N	\N	f	{}	2025-08-03 09:30:54.288289	2025-08-27 09:00:53.898893
4222	123	in_progress	completed	任务完成: Phase 1: EnhancedProjectTaskManager问题诊断	manual	1	{}	\N	\N	f	{}	2025-08-06 12:30:54.288289	2025-08-27 09:00:53.898893
4223	124	todo	in_progress	开始执行任务: [子任务121-1] Phase 1: EnhancedProjectTaskManager问题诊断	manual	1	{}	\N	\N	f	{}	2025-08-03 09:33:04.994021	2025-08-27 09:00:53.898893
4224	124	in_progress	completed	任务完成: [子任务121-1] Phase 1: EnhancedProjectTaskManager问题诊断	manual	1	{}	\N	\N	f	{}	2025-08-06 13:33:04.994021	2025-08-27 09:00:53.898893
4225	125	todo	in_progress	开始执行任务: [子任务121-2] Phase 2: 代码修复与组件恢复	manual	1	{}	\N	\N	f	{}	2025-08-03 09:33:43.626513	2025-08-27 09:00:53.898893
4226	125	in_progress	completed	任务完成: [子任务121-2] Phase 2: 代码修复与组件恢复	manual	1	{}	\N	\N	f	{}	2025-08-06 14:33:43.626513	2025-08-27 09:00:53.898893
4227	126	todo	in_progress	开始执行任务: [子任务121-3] Phase 3: 测试验证与质量保证	manual	1	{}	\N	\N	f	{}	2025-08-03 09:34:30.137126	2025-08-27 09:00:53.898893
4228	126	in_progress	completed	任务完成: [子任务121-3] Phase 3: 测试验证与质量保证	manual	1	{}	\N	\N	f	{}	2025-08-06 15:34:30.137126	2025-08-27 09:00:53.898893
4229	127	todo	in_progress	开始执行任务: [子任务121-4] Phase 4: Git提交与部署验证	manual	1	{}	\N	\N	f	{}	2025-08-03 09:35:16.211049	2025-08-27 09:00:53.898893
4230	127	in_progress	completed	任务完成: [子任务121-4] Phase 4: Git提交与部署验证	manual	1	{}	\N	\N	f	{}	2025-08-06 16:35:16.211049	2025-08-27 09:00:53.898893
4231	136	todo	in_progress	开始执行任务: [子任务122-1] 数据库扩展支持依赖关系	manual	1	{}	\N	\N	f	{}	2025-08-03 11:01:59.173593	2025-08-27 09:00:53.898893
4232	136	in_progress	completed	任务完成: [子任务122-1] 数据库扩展支持依赖关系	manual	1	{}	\N	\N	f	{}	2025-08-07 03:01:59.173593	2025-08-27 09:00:53.898893
4233	137	todo	in_progress	开始执行任务: [子任务122-2] AI依赖分析算法实现	manual	1	{}	\N	\N	f	{}	2025-08-03 11:01:59.19462	2025-08-27 09:00:53.898893
4234	137	in_progress	completed	任务完成: [子任务122-2] AI依赖分析算法实现	manual	1	{}	\N	\N	f	{}	2025-08-07 04:01:59.19462	2025-08-27 09:00:53.898893
4235	138	todo	in_progress	开始执行任务: [子任务122-3] AI标签生成器组件	manual	1	{}	\N	\N	f	{}	2025-08-03 11:02:31.934475	2025-08-27 09:00:53.898893
4236	138	in_progress	completed	任务完成: [子任务122-3] AI标签生成器组件	manual	1	{}	\N	\N	f	{}	2025-08-07 05:02:31.934475	2025-08-27 09:00:53.898893
4237	139	todo	in_progress	开始执行任务: [子任务122-4] AI优先级和工时预估器	manual	1	{}	\N	\N	f	{}	2025-08-03 11:02:31.96086	2025-08-27 09:00:53.898893
4238	139	in_progress	completed	任务完成: [子任务122-4] AI优先级和工时预估器	manual	1	{}	\N	\N	f	{}	2025-08-07 06:02:31.96086	2025-08-27 09:00:53.898893
4239	140	todo	in_progress	开始执行任务: [子任务122-5] 甘特图和依赖可视化	manual	1	{}	\N	\N	f	{}	2025-08-03 11:03:16.888892	2025-08-27 09:00:53.898893
4240	140	in_progress	completed	任务完成: [子任务122-5] 甘特图和依赖可视化	manual	1	{}	\N	\N	f	{}	2025-08-07 07:03:16.888892	2025-08-27 09:00:53.898893
4241	141	todo	in_progress	开始执行任务: [子任务122-6] 集成测试和部署	manual	1	{}	\N	\N	f	{}	2025-08-03 11:03:16.916826	2025-08-27 09:00:53.898893
4242	141	in_progress	completed	任务完成: [子任务122-6] 集成测试和部署	manual	1	{}	\N	\N	f	{}	2025-08-07 08:03:16.916826	2025-08-27 09:00:53.898893
4243	142	todo	in_progress	开始执行任务: 批量更新任务状态	manual	1	{}	\N	\N	f	{}	2025-08-03 11:11:09.198484	2025-08-27 09:00:53.898893
4244	142	in_progress	completed	任务完成: 批量更新任务状态	manual	1	{}	\N	\N	f	{}	2025-08-07 09:11:09.198484	2025-08-27 09:00:53.898893
4245	143	todo	in_progress	开始执行任务: 31-04-01：为任务文档关联任务	manual	1	{}	\N	\N	f	{}	2025-08-03 12:15:11.326716	2025-08-27 09:00:53.898893
4246	143	in_progress	completed	任务完成: 31-04-01：为任务文档关联任务	manual	1	{}	\N	\N	f	{}	2025-08-07 11:15:11.326716	2025-08-27 09:00:53.898893
4247	145	todo	in_progress	开始执行任务: 修复任务文档列表的关联关系	manual	1	{}	\N	\N	f	{}	2025-08-03 12:49:11.836266	2025-08-27 09:00:53.898893
4248	145	in_progress	completed	任务完成: 修复任务文档列表的关联关系	manual	1	{}	\N	\N	f	{}	2025-08-06 13:49:11.836266	2025-08-27 09:00:53.898893
4249	162	todo	in_progress	开始执行任务: Phase1: 代码整合阶段 - 统一架构设计和实现	manual	1	{}	\N	\N	f	{}	2025-08-03 13:36:16.237947	2025-08-27 09:00:53.898893
4250	162	in_progress	completed	任务完成: Phase1: 代码整合阶段 - 统一架构设计和实现	manual	1	{}	\N	\N	f	{}	2025-08-07 07:36:16.237947	2025-08-27 09:00:53.898893
4251	167	todo	in_progress	开始执行任务: Phase1.1: 计时器API接口完整性检查与环境验证	manual	1	{}	\N	\N	f	{}	2025-08-03 14:43:05.37872	2025-08-27 09:00:53.898893
4252	167	in_progress	completed	任务完成: Phase1.1: 计时器API接口完整性检查与环境验证	manual	1	{}	\N	\N	f	{}	2025-08-07 13:43:05.37872	2025-08-27 09:00:53.898893
4253	169	todo	in_progress	开始执行任务: Phase2.2: 首页历史任务计时器交互bugs排查	manual	1	{}	\N	\N	f	{}	2025-08-03 14:44:55.549297	2025-08-27 09:00:53.898893
4254	169	in_progress	completed	任务完成: Phase2.2: 首页历史任务计时器交互bugs排查	manual	1	{}	\N	\N	f	{}	2025-08-06 15:44:55.549297	2025-08-27 09:00:53.898893
4255	175	todo	in_progress	开始执行任务: Bug修复执行计划: 恢复计时器核心功能	manual	1	{}	\N	\N	f	{}	2025-08-03 23:38:07.093408	2025-08-27 09:00:53.898893
4256	175	in_progress	completed	任务完成: Bug修复执行计划: 恢复计时器核心功能	manual	1	{}	\N	\N	f	{}	2025-08-07 06:38:07.093408	2025-08-27 09:00:53.898893
4257	181	todo	in_progress	开始执行任务: 🔧 调试模式：深度诊断文档API 404错误	manual	1	{}	\N	\N	f	{}	2025-08-04 00:46:57.219862	2025-08-27 09:00:53.898893
4258	181	in_progress	completed	任务完成: 🔧 调试模式：深度诊断文档API 404错误	manual	1	{}	\N	\N	f	{}	2025-08-07 13:46:57.219862	2025-08-27 09:00:53.898893
4259	182	todo	in_progress	开始执行任务: 修复TaskDocumentEditor API响应结构不匹配导致的编辑功能失效	manual	1	{}	\N	\N	f	{}	2025-08-04 01:22:12.549601	2025-08-27 09:00:53.898893
4260	182	in_progress	completed	任务完成: 修复TaskDocumentEditor API响应结构不匹配导致的编辑功能失效	manual	1	{}	\N	\N	f	{}	2025-08-07 15:22:12.549601	2025-08-27 09:00:53.898893
4261	186	todo	in_progress	开始执行任务: 实现任务项目详情页gantt图	manual	1	{}	\N	\N	f	{}	2025-08-04 01:56:48.511175	2025-08-27 09:00:53.898893
4262	186	in_progress	completed	任务完成: 实现任务项目详情页gantt图	manual	1	{}	\N	\N	f	{}	2025-08-07 19:56:48.511175	2025-08-27 09:00:53.898893
4263	187	todo	in_progress	开始执行任务: 本机开发环境快速登录功能完成 - admin和qiudl用户	manual	1	{}	\N	\N	f	{}	2025-08-17 11:59:14.126802	2025-08-27 09:00:53.898893
4264	187	in_progress	completed	任务完成: 本机开发环境快速登录功能完成 - admin和qiudl用户	manual	1	{}	\N	\N	f	{}	2025-08-21 06:59:14.126802	2025-08-27 09:00:53.898893
4265	189	todo	in_progress	开始执行任务: 测试自动停止计时器功能	manual	1	{}	\N	\N	f	{}	2025-08-18 16:55:18.409236	2025-08-27 09:00:53.898893
4266	189	in_progress	completed	任务完成: 测试自动停止计时器功能	manual	1	{}	\N	\N	f	{}	2025-08-22 13:55:18.409236	2025-08-27 09:00:53.898893
4267	192	todo	in_progress	开始执行任务: 运输业务日报表后端开发	manual	1	{}	\N	\N	f	{}	2025-08-18 17:14:23.327721	2025-08-27 09:00:53.898893
4268	192	in_progress	completed	任务完成: 运输业务日报表后端开发	manual	1	{}	\N	\N	f	{}	2025-08-21 17:14:23.327721	2025-08-27 09:00:53.898893
4269	193	todo	in_progress	开始执行任务: 业务综合日报表前端开发	manual	1	{}	\N	\N	f	{}	2025-08-18 17:22:47.624957	2025-08-27 09:00:53.898893
4270	193	in_progress	completed	任务完成: 业务综合日报表前端开发	manual	1	{}	\N	\N	f	{}	2025-08-21 18:22:47.624957	2025-08-27 09:00:53.898893
4271	197	todo	in_progress	开始执行任务: 设计dashboard物流业务分析页面	manual	1	{}	\N	\N	f	{}	2025-08-19 00:39:18.648314	2025-08-27 09:00:53.898893
4272	197	in_progress	completed	任务完成: 设计dashboard物流业务分析页面	manual	1	{}	\N	\N	f	{}	2025-08-22 05:39:18.648314	2025-08-27 09:00:53.898893
4273	201	todo	in_progress	开始执行任务: 数据库迁移与表创建	manual	1	{}	\N	\N	f	{}	2025-08-19 04:38:58.264914	2025-08-27 09:00:53.898893
4274	201	in_progress	completed	任务完成: 数据库迁移与表创建	manual	1	{}	\N	\N	f	{}	2025-08-22 13:38:58.264914	2025-08-27 09:00:53.898893
4275	202	todo	in_progress	开始执行任务: 后端API重构	manual	1	{}	\N	\N	f	{}	2025-08-19 04:38:58.270091	2025-08-27 09:00:53.898893
4276	202	in_progress	completed	任务完成: 后端API重构	manual	1	{}	\N	\N	f	{}	2025-08-22 14:38:58.270091	2025-08-27 09:00:53.898893
4277	222	todo	in_progress	开始执行任务: 第二阶段：优化交互体验和视觉设计	manual	1	{}	\N	\N	f	{}	2025-08-19 09:55:37.660638	2025-08-27 09:00:53.898893
4278	222	in_progress	completed	任务完成: 第二阶段：优化交互体验和视觉设计	manual	1	{}	\N	\N	f	{}	2025-08-22 15:55:37.660638	2025-08-27 09:00:53.898893
4279	224	todo	in_progress	开始执行任务: 运单成本计算模块	manual	1	{}	\N	\N	f	{}	2025-08-19 13:09:09.956589	2025-08-27 09:00:53.898893
4280	224	in_progress	completed	任务完成: 运单成本计算模块	manual	1	{}	\N	\N	f	{}	2025-08-22 21:09:09.956589	2025-08-27 09:00:53.898893
4281	227	todo	in_progress	开始执行任务: 【子任务1】数据模型分析与设计	manual	1	{}	\N	\N	f	{}	2025-08-19 13:21:37.539316	2025-08-27 09:00:53.898893
4282	227	in_progress	completed	任务完成: 【子任务1】数据模型分析与设计	manual	1	{}	\N	\N	f	{}	2025-08-23 00:21:37.539316	2025-08-27 09:00:53.898893
4283	228	todo	in_progress	开始执行任务: 【子任务2】成本录入界面设计	manual	1	{}	\N	\N	f	{}	2025-08-19 13:22:16.20909	2025-08-27 09:00:53.898893
4284	228	in_progress	completed	任务完成: 【子任务2】成本录入界面设计	manual	1	{}	\N	\N	f	{}	2025-08-23 01:22:16.20909	2025-08-27 09:00:53.898893
4285	229	todo	in_progress	开始执行任务: 【子任务3】托运单运费补充功能	manual	1	{}	\N	\N	f	{}	2025-08-19 13:22:16.233117	2025-08-27 09:00:53.898893
4286	229	in_progress	completed	任务完成: 【子任务3】托运单运费补充功能	manual	1	{}	\N	\N	f	{}	2025-08-23 02:22:16.233117	2025-08-27 09:00:53.898893
4287	230	todo	in_progress	开始执行任务: 【子任务4】成本分摊算法实现	manual	1	{}	\N	\N	f	{}	2025-08-19 13:23:40.662487	2025-08-27 09:00:53.898893
4288	230	in_progress	completed	任务完成: 【子任务4】成本分摊算法实现	manual	1	{}	\N	\N	f	{}	2025-08-23 03:23:40.662487	2025-08-27 09:00:53.898893
4289	231	todo	in_progress	开始执行任务: 【子任务5】后端API开发	manual	1	{}	\N	\N	f	{}	2025-08-19 13:23:40.683207	2025-08-27 09:00:53.898893
4290	231	in_progress	completed	任务完成: 【子任务5】后端API开发	manual	1	{}	\N	\N	f	{}	2025-08-23 04:23:40.683207	2025-08-27 09:00:53.898893
4291	232	todo	in_progress	开始执行任务: 【子任务6】前端成本管理界面	manual	1	{}	\N	\N	f	{}	2025-08-19 13:28:41.891387	2025-08-27 09:00:53.898893
4292	232	in_progress	completed	任务完成: 【子任务6】前端成本管理界面	manual	1	{}	\N	\N	f	{}	2025-08-23 05:28:41.891387	2025-08-27 09:00:53.898893
4293	233	todo	in_progress	开始执行任务: 【子任务7】成本报表和查询	manual	1	{}	\N	\N	f	{}	2025-08-19 13:28:41.928194	2025-08-27 09:00:53.898893
4294	233	in_progress	completed	任务完成: 【子任务7】成本报表和查询	manual	1	{}	\N	\N	f	{}	2025-08-23 06:28:41.928194	2025-08-27 09:00:53.898893
4295	234	todo	in_progress	开始执行任务: 【子任务8】数据校验和业务规则	manual	1	{}	\N	\N	f	{}	2025-08-19 13:30:58.333765	2025-08-27 09:00:53.898893
4296	234	in_progress	completed	任务完成: 【子任务8】数据校验和业务规则	manual	1	{}	\N	\N	f	{}	2025-08-23 07:30:58.333765	2025-08-27 09:00:53.898893
4297	235	todo	in_progress	开始执行任务: 【子任务9】测试和文档完善	manual	1	{}	\N	\N	f	{}	2025-08-19 13:30:58.359889	2025-08-27 09:00:53.898893
4298	235	in_progress	completed	任务完成: 【子任务9】测试和文档完善	manual	1	{}	\N	\N	f	{}	2025-08-23 08:30:58.359889	2025-08-27 09:00:53.898893
4299	237	todo	in_progress	开始执行任务: Bug修复：Markdown编辑器无法读取文档内容	manual	1	{}	\N	\N	f	{}	2025-08-19 13:33:42.258284	2025-08-27 09:00:53.898893
4300	237	in_progress	completed	任务完成: Bug修复：Markdown编辑器无法读取文档内容	manual	1	{}	\N	\N	f	{}	2025-08-23 10:33:42.258284	2025-08-27 09:00:53.898893
4301	238	todo	in_progress	开始执行任务: Bug修复：高级管理器弹窗无法关闭	manual	1	{}	\N	\N	f	{}	2025-08-19 13:35:00.31311	2025-08-27 09:00:53.898893
4302	238	in_progress	completed	任务完成: Bug修复：高级管理器弹窗无法关闭	manual	1	{}	\N	\N	f	{}	2025-08-23 11:35:00.31311	2025-08-27 09:00:53.898893
4303	239	todo	in_progress	开始执行任务: Bug修复：新建文档缺少标题保存功能	manual	1	{}	\N	\N	f	{}	2025-08-19 13:35:45.28574	2025-08-27 09:00:53.898893
4304	239	in_progress	completed	任务完成: Bug修复：新建文档缺少标题保存功能	manual	1	{}	\N	\N	f	{}	2025-08-23 12:35:45.28574	2025-08-27 09:00:53.898893
4305	249	todo	in_progress	开始执行任务: 任务状态系统扩充：实现11种状态的完整工作流	manual	1	{}	\N	\N	f	{}	2025-08-19 16:38:58.151554	2025-08-27 09:00:53.898893
4306	249	in_progress	completed	任务完成: 任务状态系统扩充：实现11种状态的完整工作流	manual	1	{}	\N	\N	f	{}	2025-08-23 01:38:58.151554	2025-08-27 09:00:53.898893
4307	252	todo	in_progress	开始执行任务: 第二阶段：升级后端API支持11种新状态系统	manual	1	{}	\N	\N	f	{}	2025-08-19 16:40:22.439415	2025-08-27 09:00:53.898893
4308	252	in_progress	completed	任务完成: 第二阶段：升级后端API支持11种新状态系统	manual	1	{}	\N	\N	f	{}	2025-08-23 04:40:22.439415	2025-08-27 09:00:53.898893
4309	256	todo	in_progress	开始执行任务: 测试新建任务文档是否能保存成功	manual	1	{}	\N	\N	f	{}	2025-08-19 16:52:22.821946	2025-08-27 09:00:53.898893
4310	256	in_progress	completed	任务完成: 测试新建任务文档是否能保存成功	manual	1	{}	\N	\N	f	{}	2025-08-23 08:52:22.821946	2025-08-27 09:00:53.898893
4311	265	todo	in_progress	开始执行任务: 建立项目开发环境和代码仓库	manual	1	{}	\N	\N	f	{}	2025-08-20 00:08:32.847963	2025-08-27 09:00:53.898893
4312	265	in_progress	completed	任务完成: 建立项目开发环境和代码仓库	manual	1	{}	\N	\N	f	{}	2025-08-23 01:08:32.847963	2025-08-27 09:00:53.898893
4313	274	todo	in_progress	开始执行任务: 实现自动化批量任务文档生成脚本	manual	1	{}	\N	\N	f	{}	2025-08-20 07:57:57.362895	2025-08-27 09:00:53.898893
4314	274	in_progress	completed	任务完成: 实现自动化批量任务文档生成脚本	manual	1	{}	\N	\N	f	{}	2025-08-23 17:57:57.362895	2025-08-27 09:00:53.898893
4315	275	todo	in_progress	开始执行任务: 菜单配置自动化设计和实现记录	manual	1	{}	\N	\N	f	{}	2025-08-20 09:03:03.800034	2025-08-27 09:00:53.898893
4316	275	in_progress	completed	任务完成: 菜单配置自动化设计和实现记录	manual	1	{}	\N	\N	f	{}	2025-08-23 20:03:03.800034	2025-08-27 09:00:53.898893
4317	276	todo	in_progress	开始执行任务: 分析并解决运输单成本前端显示问题	manual	1	{}	\N	\N	f	{}	2025-08-20 21:39:00.84682	2025-08-27 09:00:53.898893
4318	276	in_progress	completed	任务完成: 分析并解决运输单成本前端显示问题	manual	1	{}	\N	\N	f	{}	2025-08-24 09:39:00.84682	2025-08-27 09:00:53.898893
4319	277	todo	in_progress	开始执行任务: 运输单成本系统问题分析与解决方案设计	manual	1	{}	\N	\N	f	{}	2025-08-20 23:23:07.151956	2025-08-27 09:00:53.898893
4320	277	in_progress	completed	任务完成: 运输单成本系统问题分析与解决方案设计	manual	1	{}	\N	\N	f	{}	2025-08-24 12:23:07.151956	2025-08-27 09:00:53.898893
4321	278	todo	in_progress	开始执行任务: 运输单成本管理模块v0.2	manual	1	{}	\N	\N	f	{}	2025-08-21 00:04:29.596187	2025-08-27 09:00:53.898893
4322	278	in_progress	completed	任务完成: 运输单成本管理模块v0.2	manual	1	{}	\N	\N	f	{}	2025-08-24 14:04:29.596187	2025-08-27 09:00:53.898893
4323	300	todo	in_progress	开始执行任务: 【任务278-子任务1】修复运输单成本创建页面的模拟数据问题	manual	1	{}	\N	\N	f	{}	2025-08-21 00:34:32.760413	2025-08-27 09:00:53.898893
4324	300	in_progress	completed	任务完成: 【任务278-子任务1】修复运输单成本创建页面的模拟数据问题	manual	1	{}	\N	\N	f	{}	2025-08-24 12:34:32.760413	2025-08-27 09:00:53.898893
4325	301	todo	in_progress	开始执行任务: 【任务278-子任务2】检查并修正运输单图表显示数据问题	manual	1	{}	\N	\N	f	{}	2025-08-21 00:35:16.826676	2025-08-27 09:00:53.898893
4326	301	in_progress	completed	任务完成: 【任务278-子任务2】检查并修正运输单图表显示数据问题	manual	1	{}	\N	\N	f	{}	2025-08-24 13:35:16.826676	2025-08-27 09:00:53.898893
4327	302	todo	in_progress	开始执行任务: 【任务278-子任务3】实现批量创建运输单成本功能	manual	1	{}	\N	\N	f	{}	2025-08-21 00:35:18.717423	2025-08-27 09:00:53.898893
4328	302	in_progress	completed	任务完成: 【任务278-子任务3】实现批量创建运输单成本功能	manual	1	{}	\N	\N	f	{}	2025-08-24 14:35:18.717423	2025-08-27 09:00:53.898893
4329	303	todo	in_progress	开始执行任务: 【任务278-子任务4】重新设计并实现运输单模板功能	manual	1	{}	\N	\N	f	{}	2025-08-21 00:35:19.700298	2025-08-27 09:00:53.898893
4330	303	in_progress	completed	任务完成: 【任务278-子任务4】重新设计并实现运输单模板功能	manual	1	{}	\N	\N	f	{}	2025-08-24 15:35:19.700298	2025-08-27 09:00:53.898893
4331	304	todo	in_progress	开始执行任务: 【任务278-子任务5】优化成本类型表格样式和用户体验	manual	1	{}	\N	\N	f	{}	2025-08-21 00:35:20.402294	2025-08-27 09:00:53.898893
4332	304	in_progress	completed	任务完成: 【任务278-子任务5】优化成本类型表格样式和用户体验	manual	1	{}	\N	\N	f	{}	2025-08-24 16:35:20.402294	2025-08-27 09:00:53.898893
4333	310	todo	in_progress	开始执行任务: 第一阶段：后端批量文档API接口开发	manual	1	{}	\N	\N	f	{}	2025-08-21 04:25:07.274045	2025-08-27 09:00:53.898893
4334	310	in_progress	completed	任务完成: 第一阶段：后端批量文档API接口开发	manual	1	{}	\N	\N	f	{}	2025-08-25 02:25:07.274045	2025-08-27 09:00:53.898893
4335	311	todo	in_progress	开始执行任务: 第二阶段：智能模板管理和内容生成引擎	manual	1	{}	\N	\N	f	{}	2025-08-21 04:26:44.976136	2025-08-27 09:00:53.898893
4336	311	in_progress	completed	任务完成: 第二阶段：智能模板管理和内容生成引擎	manual	1	{}	\N	\N	f	{}	2025-08-25 03:26:44.976136	2025-08-27 09:00:53.898893
4337	312	todo	in_progress	开始执行任务: 第三阶段：MCP服务器集成和Claude Code命令	manual	1	{}	\N	\N	f	{}	2025-08-21 04:33:44.19703	2025-08-27 09:00:53.898893
4338	312	in_progress	completed	任务完成: 第三阶段：MCP服务器集成和Claude Code命令	manual	1	{}	\N	\N	f	{}	2025-08-24 04:33:44.19703	2025-08-27 09:00:53.898893
4339	313	todo	in_progress	开始执行任务: 第四阶段：配置驱动的批量脚本和工具开发	manual	1	{}	\N	\N	f	{}	2025-08-21 04:41:43.815926	2025-08-27 09:00:53.898893
4340	313	in_progress	completed	任务完成: 第四阶段：配置驱动的批量脚本和工具开发	manual	1	{}	\N	\N	f	{}	2025-08-24 05:41:43.815926	2025-08-27 09:00:53.898893
4341	314	todo	in_progress	开始执行任务: Task 274和子系统全面检查验证	manual	1	{}	\N	\N	f	{}	2025-08-21 09:00:48.125284	2025-08-27 09:00:53.898893
4342	314	in_progress	completed	任务完成: Task 274和子系统全面检查验证	manual	1	{}	\N	\N	f	{}	2025-08-24 11:00:48.125284	2025-08-27 09:00:53.898893
4343	316	todo	in_progress	开始执行任务: 测试任务2 - 已完成任务时间验证	manual	1	{}	\N	\N	f	{}	2025-08-21 09:11:38.548051	2025-08-27 09:00:53.898893
4344	316	in_progress	completed	任务完成: 测试任务2 - 已完成任务时间验证	manual	1	{}	\N	\N	f	{}	2025-08-24 13:11:38.548051	2025-08-27 09:00:53.898893
4345	318	todo	in_progress	开始执行任务: 【Bug修复】运单搜索报错：Unknown column o.shipper_name	manual	1	{}	\N	\N	f	{}	2025-08-21 13:32:01.777597	2025-08-27 09:00:53.898893
4346	318	in_progress	completed	任务完成: 【Bug修复】运单搜索报错：Unknown column o.shipper_name	manual	1	{}	\N	\N	f	{}	2025-08-24 19:32:01.777597	2025-08-27 09:00:53.898893
4347	323	todo	in_progress	开始执行任务: 【子任务3】系统管理界面：品牌配置管理页面	manual	1	{}	\N	\N	f	{}	2025-08-21 14:29:38.947768	2025-08-27 09:00:53.898893
4348	323	in_progress	completed	任务完成: 【子任务3】系统管理界面：品牌配置管理页面	manual	1	{}	\N	\N	f	{}	2025-08-25 01:29:38.947768	2025-08-27 09:00:53.898893
4349	325	todo	in_progress	开始执行任务: 【子任务4】前端导航栏改造：动态品牌显示	manual	1	{}	\N	\N	f	{}	2025-08-21 14:40:18.057242	2025-08-27 09:00:53.898893
4350	325	in_progress	completed	任务完成: 【子任务4】前端导航栏改造：动态品牌显示	manual	1	{}	\N	\N	f	{}	2025-08-25 03:40:18.057242	2025-08-27 09:00:53.898893
4351	328	todo	in_progress	开始执行任务: 【并行任务】前端组件设计：品牌配置UI组件库	manual	1	{}	\N	\N	f	{}	2025-08-21 14:42:49.732709	2025-08-27 09:00:53.898893
4352	328	in_progress	completed	任务完成: 【并行任务】前端组件设计：品牌配置UI组件库	manual	1	{}	\N	\N	f	{}	2025-08-25 06:42:49.732709	2025-08-27 09:00:53.898893
4353	337	todo	in_progress	开始执行任务: 复现问题：运行/构建并记录错误与行为	manual	1	{}	\N	\N	f	{}	2025-08-22 02:10:44.948089	2025-08-27 09:00:53.898893
4354	337	in_progress	completed	任务完成: 复现问题：运行/构建并记录错误与行为	manual	1	{}	\N	\N	f	{}	2025-08-25 03:10:44.948089	2025-08-27 09:00:53.898893
4355	338	todo	in_progress	开始执行任务: 编写修复计划：问题归因、影响面、备份与回滚方案	manual	1	{}	\N	\N	f	{}	2025-08-22 02:10:47.213017	2025-08-27 09:00:53.898893
4356	338	in_progress	completed	任务完成: 编写修复计划：问题归因、影响面、备份与回滚方案	manual	1	{}	\N	\N	f	{}	2025-08-25 04:10:47.213017	2025-08-27 09:00:53.898893
4357	339	todo	in_progress	开始执行任务: 实现修复：代码修改与单元测试/集成测试	manual	1	{}	\N	\N	f	{}	2025-08-22 02:10:49.353588	2025-08-27 09:00:53.898893
4358	339	in_progress	completed	任务完成: 实现修复：代码修改与单元测试/集成测试	manual	1	{}	\N	\N	f	{}	2025-08-25 05:10:49.353588	2025-08-27 09:00:53.898893
4359	340	todo	in_progress	开始执行任务: 验证与验收：本地、Docker环境与CI（Jenkins Docker Agent）	manual	1	{}	\N	\N	f	{}	2025-08-22 02:10:51.478721	2025-08-27 09:00:53.898893
4360	340	in_progress	completed	任务完成: 验证与验收：本地、Docker环境与CI（Jenkins Docker Agent）	manual	1	{}	\N	\N	f	{}	2025-08-25 06:10:51.478721	2025-08-27 09:00:53.898893
4361	341	todo	in_progress	开始执行任务: 后端：为 /work-notes 路由增加路由映射层单元测试，确保长期一致性	manual	1	{}	\N	\N	f	{}	2025-08-22 02:32:45.487854	2025-08-27 09:00:53.898893
4362	341	in_progress	completed	任务完成: 后端：为 /work-notes 路由增加路由映射层单元测试，确保长期一致性	manual	1	{}	\N	\N	f	{}	2025-08-25 07:32:45.487854	2025-08-27 09:00:53.898893
4363	342	todo	in_progress	开始执行任务: 前端：增加端到端测试覆盖工作笔记复制与模板切换操作	manual	1	{}	\N	\N	f	{}	2025-08-22 02:32:52.19518	2025-08-27 09:00:53.898893
4364	342	in_progress	completed	任务完成: 前端：增加端到端测试覆盖工作笔记复制与模板切换操作	manual	1	{}	\N	\N	f	{}	2025-08-25 08:32:52.19518	2025-08-27 09:00:53.898893
4365	356	todo	in_progress	开始执行任务: 梳理数据模型与索引优化（documents、task_documents、tasks 及相关索引）	manual	1	{}	\N	\N	f	{}	2025-08-22 09:54:41.747135	2025-08-27 09:00:53.898893
4366	356	in_progress	completed	任务完成: 梳理数据模型与索引优化（documents、task_documents、tasks 及相关索引）	manual	1	{}	\N	\N	f	{}	2025-08-26 05:54:41.747135	2025-08-27 09:00:53.898893
4367	357	todo	in_progress	开始执行任务: 统一 has/get/list 读取路径的进一步收敛（完全走 DB；去除分叉与竞态来源）	manual	1	{}	\N	\N	f	{}	2025-08-22 09:55:07.980836	2025-08-27 09:00:53.898893
4368	357	in_progress	completed	任务完成: 统一 has/get/list 读取路径的进一步收敛（完全走 DB；去除分叉与竞态来源）	manual	1	{}	\N	\N	f	{}	2025-08-26 06:55:07.980836	2025-08-27 09:00:53.898893
4369	360	todo	in_progress	开始执行任务: T0.1 需求澄清与验收标准定义	manual	1	{}	\N	\N	f	{}	2025-08-22 11:47:47.758612	2025-08-27 09:00:53.898893
4370	360	in_progress	completed	任务完成: T0.1 需求澄清与验收标准定义	manual	1	{}	\N	\N	f	{}	2025-08-25 11:47:47.758612	2025-08-27 09:00:53.898893
4371	363	todo	in_progress	开始执行任务: T1.1 选择ORM与迁移工具、初始化迁移（folder, note_folder）	manual	1	{}	\N	\N	f	{}	2025-08-22 11:47:56.211981	2025-08-27 09:00:53.898893
4372	363	in_progress	completed	任务完成: T1.1 选择ORM与迁移工具、初始化迁移（folder, note_folder）	manual	1	{}	\N	\N	f	{}	2025-08-25 14:47:56.211981	2025-08-27 09:00:53.898893
4373	364	todo	in_progress	开始执行任务: T1.2 ltree/层级结构方案实现与索引	manual	1	{}	\N	\N	f	{}	2025-08-22 11:48:00.836757	2025-08-27 09:00:53.898893
4374	364	in_progress	completed	任务完成: T1.2 ltree/层级结构方案实现与索引	manual	1	{}	\N	\N	f	{}	2025-08-25 15:48:00.836757	2025-08-27 09:00:53.898893
4375	393	todo	in_progress	开始执行任务: 设计与评审 API：/api/tasks/{id}/descendants（depth/分页/权限）	manual	1	{}	\N	\N	f	{}	2025-08-22 12:22:24.182414	2025-08-27 09:00:53.898893
4376	393	in_progress	completed	任务完成: 设计与评审 API：/api/tasks/{id}/descendants（depth/分页/权限）	manual	1	{}	\N	\N	f	{}	2025-08-25 21:22:24.182414	2025-08-27 09:00:53.898893
4377	402	todo	in_progress	开始执行任务: M1-1 数据模型与迁移（task_dependencies/task_attributes等）	manual	1	{}	\N	\N	f	{}	2025-08-22 12:26:28.378443	2025-08-27 09:00:53.898893
4378	402	in_progress	completed	任务完成: M1-1 数据模型与迁移（task_dependencies/task_attributes等）	manual	1	{}	\N	\N	f	{}	2025-08-26 06:26:28.378443	2025-08-27 09:00:53.898893
4379	407	todo	in_progress	开始执行任务: 402.1 迁移初始化与表设计（attributes/dependencies/milestones）	manual	1	{}	\N	\N	f	{}	2025-08-22 12:30:26.199225	2025-08-27 09:00:53.898893
4380	407	in_progress	completed	任务完成: 402.1 迁移初始化与表设计（attributes/dependencies/milestones）	manual	1	{}	\N	\N	f	{}	2025-08-26 11:30:26.199225	2025-08-27 09:00:53.898893
4381	408	todo	in_progress	开始执行任务: 402.2 枚举与字典（category/risk_level）	manual	1	{}	\N	\N	f	{}	2025-08-22 12:30:32.009643	2025-08-27 09:00:53.898893
4382	408	in_progress	completed	任务完成: 402.2 枚举与字典（category/risk_level）	manual	1	{}	\N	\N	f	{}	2025-08-25 12:30:32.009643	2025-08-27 09:00:53.898893
4383	409	todo	in_progress	开始执行任务: 402.3 回滚与本地验证（Docker Postgres）	manual	1	{}	\N	\N	f	{}	2025-08-22 12:30:39.971393	2025-08-27 09:00:53.898893
4384	409	in_progress	completed	任务完成: 402.3 回滚与本地验证（Docker Postgres）	manual	1	{}	\N	\N	f	{}	2025-08-25 13:30:39.971393	2025-08-27 09:00:53.898893
4385	410	todo	in_progress	开始执行任务: 402.4 种子与兼容层（解析描述→结构化）	manual	1	{}	\N	\N	f	{}	2025-08-22 12:30:44.150901	2025-08-27 09:00:53.898893
4386	410	in_progress	completed	任务完成: 402.4 种子与兼容层（解析描述→结构化）	manual	1	{}	\N	\N	f	{}	2025-08-25 14:30:44.150901	2025-08-27 09:00:53.898893
4387	418	todo	in_progress	开始执行任务: 新增全部任务模块（All Tasks 页面）	manual	1	{}	\N	\N	f	{}	2025-08-22 23:38:48.450085	2025-08-27 09:00:53.898893
4388	418	in_progress	completed	任务完成: 新增全部任务模块（All Tasks 页面）	manual	1	{}	\N	\N	f	{}	2025-08-26 09:38:48.450085	2025-08-27 09:00:53.898893
4389	419	todo	in_progress	开始执行任务: 在 taskService 中新增 getAllTasks（调用 /api/v1/tasks）	manual	1	{}	\N	\N	f	{}	2025-08-22 23:38:51.73011	2025-08-27 09:00:53.898893
4390	419	in_progress	completed	任务完成: 在 taskService 中新增 getAllTasks（调用 /api/v1/tasks）	manual	1	{}	\N	\N	f	{}	2025-08-26 10:38:51.73011	2025-08-27 09:00:53.898893
4391	420	todo	in_progress	开始执行任务: 修改 TasksPage 支持全局模式（无 projectId 时加载全部任务）	manual	1	{}	\N	\N	f	{}	2025-08-22 23:38:56.780789	2025-08-27 09:00:53.898893
4392	420	in_progress	completed	任务完成: 修改 TasksPage 支持全局模式（无 projectId 时加载全部任务）	manual	1	{}	\N	\N	f	{}	2025-08-26 11:38:56.780789	2025-08-27 09:00:53.898893
4393	421	todo	in_progress	开始执行任务: 在 App.tsx 新增 /tasks 路由（指向 TasksPage）	manual	1	{}	\N	\N	f	{}	2025-08-22 23:39:01.342945	2025-08-27 09:00:53.898893
4394	421	in_progress	completed	任务完成: 在 App.tsx 新增 /tasks 路由（指向 TasksPage）	manual	1	{}	\N	\N	f	{}	2025-08-26 12:39:01.342945	2025-08-27 09:00:53.898893
4395	422	todo	in_progress	开始执行任务: 新增文档：docs/features/all-tasks-module.md（接口、路由、验证步骤）	manual	1	{}	\N	\N	f	{}	2025-08-22 23:39:03.665311	2025-08-27 09:00:53.898893
4396	422	in_progress	completed	任务完成: 新增文档：docs/features/all-tasks-module.md（接口、路由、验证步骤）	manual	1	{}	\N	\N	f	{}	2025-08-26 13:39:03.665311	2025-08-27 09:00:53.898893
4397	423	todo	in_progress	开始执行任务: 更新导航（可选）：在导航中暴露“全部任务”入口 /tasks	manual	1	{}	\N	\N	f	{}	2025-08-22 23:39:06.72686	2025-08-27 09:00:53.898893
4398	423	in_progress	completed	任务完成: 更新导航（可选）：在导航中暴露“全部任务”入口 /tasks	manual	1	{}	\N	\N	f	{}	2025-08-26 14:39:06.72686	2025-08-27 09:00:53.898893
4399	424	todo	in_progress	开始执行任务: 验证与提交：本地验证 /tasks + 项目内回归；提交变更并记录变更说明	manual	1	{}	\N	\N	f	{}	2025-08-22 23:39:14.873792	2025-08-27 09:00:53.898893
4400	424	in_progress	completed	任务完成: 验证与提交：本地验证 /tasks + 项目内回归；提交变更并记录变更说明	manual	1	{}	\N	\N	f	{}	2025-08-26 15:39:14.873792	2025-08-27 09:00:53.898893
4401	458	todo	in_progress	开始执行任务: 测试 MCP 集成功能	manual	1	{}	\N	\N	f	{}	2025-08-25 07:41:14.512033	2025-08-27 09:00:53.898893
4402	458	in_progress	completed	任务完成: 测试 MCP 集成功能	manual	1	{}	\N	\N	f	{}	2025-08-28 09:41:14.512033	2025-08-27 09:00:53.898893
4403	460	todo	in_progress	开始执行任务: 修复任务详情页文档编辑器无法获取内容的bug	manual	1	{}	\N	\N	f	{}	2025-08-25 08:27:30.972401	2025-08-27 09:00:53.898893
4404	460	in_progress	completed	任务完成: 修复任务详情页文档编辑器无法获取内容的bug	manual	1	{}	\N	\N	f	{}	2025-08-28 12:27:30.972401	2025-08-27 09:00:53.898893
4405	467	todo	in_progress	开始执行任务: 修复Markdown文档内容不能正常显示的问题	manual	1	{}	\N	\N	f	{}	2025-08-25 08:56:04.191999	2025-08-27 09:00:53.898893
4406	467	in_progress	completed	任务完成: 修复Markdown文档内容不能正常显示的问题	manual	1	{}	\N	\N	f	{}	2025-08-28 19:56:04.191999	2025-08-27 09:00:53.898893
4407	468	todo	in_progress	开始执行任务: 修复DocumentService API响应格式不匹配问题	manual	1	{}	\N	\N	f	{}	2025-08-25 14:37:28.792061	2025-08-27 09:00:53.898893
4408	468	in_progress	completed	任务完成: 修复DocumentService API响应格式不匹配问题	manual	1	{}	\N	\N	f	{}	2025-08-29 02:37:28.792061	2025-08-27 09:00:53.898893
4409	469	todo	in_progress	开始执行任务: 修复任务详情页文档创建缺少任务ID关联的问题	manual	1	{}	\N	\N	f	{}	2025-08-25 15:14:35.007689	2025-08-27 09:00:53.898893
4410	469	in_progress	completed	任务完成: 修复任务详情页文档创建缺少任务ID关联的问题	manual	1	{}	\N	\N	f	{}	2025-08-29 04:14:35.007689	2025-08-27 09:00:53.898893
4411	474	todo	in_progress	开始执行任务: 优化任务列表默认排序规则 - 按根任务时间倒序	manual	1	{}	\N	\N	f	{}	2025-08-26 10:00:34.747805	2025-08-27 09:00:53.898893
4412	474	in_progress	completed	任务完成: 优化任务列表默认排序规则 - 按根任务时间倒序	manual	1	{}	\N	\N	f	{}	2025-08-30 04:00:34.747805	2025-08-27 09:00:53.898893
4413	483	todo	in_progress	开始执行任务: 批量修改父任务功能优化：搜索支持任务ID和修复保存失败假象	manual	1	{}	\N	\N	f	{}	2025-08-26 14:39:49.526569	2025-08-27 09:00:53.898893
4414	483	in_progress	completed	任务完成: 批量修改父任务功能优化：搜索支持任务ID和修复保存失败假象	manual	1	{}	\N	\N	f	{}	2025-08-29 17:39:49.526569	2025-08-27 09:00:53.898893
4415	489	todo	in_progress	开始执行任务: 完成用户管理CRUD接口实现	manual	1	{}	\N	\N	f	{}	2025-08-26 22:58:29.345333	2025-08-27 09:00:53.898893
4416	489	in_progress	completed	任务完成: 完成用户管理CRUD接口实现	manual	1	{}	\N	\N	f	{}	2025-08-30 07:58:29.345333	2025-08-27 09:00:53.898893
4417	501	todo	in_progress	开始执行任务: 开发批量转换为任务文档功能	manual	1	{}	\N	\N	f	{}	2025-08-26 23:04:53.00778	2025-08-27 09:00:53.898893
4418	501	in_progress	completed	任务完成: 开发批量转换为任务文档功能	manual	1	{}	\N	\N	f	{}	2025-08-30 20:04:53.00778	2025-08-27 09:00:53.898893
4419	507	todo	in_progress	开始执行任务: 阶段1：设计权限模型和核心服务	manual	1	{}	\N	\N	f	{}	2025-08-26 23:20:40.273714	2025-08-27 09:00:53.898893
4420	507	in_progress	completed	任务完成: 阶段1：设计权限模型和核心服务	manual	1	{}	\N	\N	f	{}	2025-08-30 02:20:40.273714	2025-08-27 09:00:53.898893
4421	508	todo	in_progress	开始执行任务: 阶段2：实现API中间件权限验证	manual	1	{}	\N	\N	f	{}	2025-08-26 23:20:45.309162	2025-08-27 09:00:53.898893
4422	508	in_progress	completed	任务完成: 阶段2：实现API中间件权限验证	manual	1	{}	\N	\N	f	{}	2025-08-30 03:20:45.309162	2025-08-27 09:00:53.898893
4423	509	todo	in_progress	开始执行任务: 阶段3：MCP桥接权限集成	manual	1	{}	\N	\N	f	{}	2025-08-26 23:20:50.757513	2025-08-27 09:00:53.898893
4424	509	in_progress	completed	任务完成: 阶段3：MCP桥接权限集成	manual	1	{}	\N	\N	f	{}	2025-08-30 04:20:50.757513	2025-08-27 09:00:53.898893
4425	510	todo	in_progress	开始执行任务: 阶段4：权限测试和性能优化	manual	1	{}	\N	\N	f	{}	2025-08-26 23:20:55.046971	2025-08-27 09:00:53.898893
4426	510	in_progress	completed	任务完成: 阶段4：权限测试和性能优化	manual	1	{}	\N	\N	f	{}	2025-08-30 05:20:55.046971	2025-08-27 09:00:53.898893
4427	518	todo	in_progress	开始执行任务: 权限管理数据库设计：表结构创建和初始化	manual	1	{}	\N	\N	f	{}	2025-08-26 23:29:52.183469	2025-08-27 09:00:53.898893
4428	518	in_progress	completed	任务完成: 权限管理数据库设计：表结构创建和初始化	manual	1	{}	\N	\N	f	{}	2025-08-30 13:29:52.183469	2025-08-27 09:00:53.898893
4429	521	todo	in_progress	开始执行任务: 检查本项目代码中用户管理的部分的完成情况	manual	1	{}	\N	\N	f	{}	2025-08-27 00:21:12.326087	2025-08-27 09:00:53.898893
4430	521	in_progress	completed	任务完成: 检查本项目代码中用户管理的部分的完成情况	manual	1	{}	\N	\N	f	{}	2025-08-30 17:21:12.326087	2025-08-27 09:00:53.898893
4431	522	todo	in_progress	开始执行任务: 创建用户统计数据库视图	manual	1	{}	\N	\N	f	{}	2025-08-27 00:25:30.580684	2025-08-27 09:00:53.898893
4432	522	in_progress	completed	任务完成: 创建用户统计数据库视图	manual	1	{}	\N	\N	f	{}	2025-08-30 18:25:30.580684	2025-08-27 09:00:53.898893
4433	523	todo	in_progress	开始执行任务: 完善个人资料管理接口	manual	1	{}	\N	\N	f	{}	2025-08-27 00:25:34.438631	2025-08-27 09:00:53.898893
4434	523	in_progress	completed	任务完成: 完善个人资料管理接口	manual	1	{}	\N	\N	f	{}	2025-08-30 19:25:34.438631	2025-08-27 09:00:53.898893
4435	524	todo	in_progress	开始执行任务: 调整企业用户的数据库约束	manual	1	{}	\N	\N	f	{}	2025-08-27 00:25:37.794491	2025-08-27 09:00:53.898893
4436	524	in_progress	completed	任务完成: 调整企业用户的数据库约束	manual	1	{}	\N	\N	f	{}	2025-08-30 20:25:37.794491	2025-08-27 09:00:53.898893
4437	525	todo	in_progress	开始执行任务: 实现软删除功能以符合架构设计	manual	1	{}	\N	\N	f	{}	2025-08-27 00:25:41.431153	2025-08-27 09:00:53.898893
4438	525	in_progress	completed	任务完成: 实现软删除功能以符合架构设计	manual	1	{}	\N	\N	f	{}	2025-08-30 21:25:41.431153	2025-08-27 09:00:53.898893
4439	526	todo	in_progress	开始执行任务: 集成用户管理到前端页面	manual	1	{}	\N	\N	f	{}	2025-08-27 01:37:09.45766	2025-08-27 09:00:53.898893
4440	526	in_progress	completed	任务完成: 集成用户管理到前端页面	manual	1	{}	\N	\N	f	{}	2025-08-30 23:37:09.45766	2025-08-27 09:00:53.898893
4441	527	todo	in_progress	开始执行任务: 将权限管理集成到前端页面中	manual	1	{}	\N	\N	f	{}	2025-08-27 01:37:10.914269	2025-08-27 09:00:53.898893
4442	527	in_progress	completed	任务完成: 将权限管理集成到前端页面中	manual	1	{}	\N	\N	f	{}	2025-08-31 00:37:10.914269	2025-08-27 09:00:53.898893
4443	528	todo	in_progress	开始执行任务: 优化用户管理菜单导航结构	manual	1	{}	\N	\N	f	{}	2025-08-27 01:37:22.586908	2025-08-27 09:00:53.898893
4444	528	in_progress	completed	任务完成: 优化用户管理菜单导航结构	manual	1	{}	\N	\N	f	{}	2025-08-30 01:37:22.586908	2025-08-27 09:00:53.898893
4445	529	todo	in_progress	开始执行任务: 完善企业用户与系统用户的导航区分	manual	1	{}	\N	\N	f	{}	2025-08-27 01:37:26.174304	2025-08-27 09:00:53.898893
4446	529	in_progress	completed	任务完成: 完善企业用户与系统用户的导航区分	manual	1	{}	\N	\N	f	{}	2025-08-30 02:37:26.174304	2025-08-27 09:00:53.898893
4447	530	todo	in_progress	开始执行任务: 增强用户管理页面的筛选和搜索功能	manual	1	{}	\N	\N	f	{}	2025-08-27 01:37:29.852086	2025-08-27 09:00:53.898893
4448	530	in_progress	completed	任务完成: 增强用户管理页面的筛选和搜索功能	manual	1	{}	\N	\N	f	{}	2025-08-30 03:37:29.852086	2025-08-27 09:00:53.898893
4449	531	todo	in_progress	开始执行任务: 添加用户管理快捷操作和批量功能	manual	1	{}	\N	\N	f	{}	2025-08-27 01:37:33.181744	2025-08-27 09:00:53.898893
4450	531	in_progress	completed	任务完成: 添加用户管理快捷操作和批量功能	manual	1	{}	\N	\N	f	{}	2025-08-30 04:37:33.181744	2025-08-27 09:00:53.898893
4451	532	todo	in_progress	开始执行任务: 创建用户管理集成文档	manual	1	{}	\N	\N	f	{}	2025-08-27 01:37:37.12824	2025-08-27 09:00:53.898893
4452	532	in_progress	completed	任务完成: 创建用户管理集成文档	manual	1	{}	\N	\N	f	{}	2025-08-30 05:37:37.12824	2025-08-27 09:00:53.898893
4453	533	todo	in_progress	开始执行任务: 创建增强的路由权限控制组件	manual	1	{}	\N	\N	f	{}	2025-08-27 01:38:00.277566	2025-08-27 09:00:53.898893
4454	533	in_progress	completed	任务完成: 创建增强的路由权限控制组件	manual	1	{}	\N	\N	f	{}	2025-08-30 06:38:00.277566	2025-08-27 09:00:53.898893
4455	534	todo	in_progress	开始执行任务: 修改App.tsx集成路由权限控制	manual	1	{}	\N	\N	f	{}	2025-08-27 01:39:36.128606	2025-08-27 09:00:53.898893
4456	534	in_progress	completed	任务完成: 修改App.tsx集成路由权限控制	manual	1	{}	\N	\N	f	{}	2025-08-30 07:39:36.128606	2025-08-27 09:00:53.898893
4457	535	todo	in_progress	开始执行任务: 为关键页面组件添加权限控制	manual	1	{}	\N	\N	f	{}	2025-08-27 01:47:46.977058	2025-08-27 09:00:53.898893
4458	535	in_progress	completed	任务完成: 为关键页面组件添加权限控制	manual	1	{}	\N	\N	f	{}	2025-08-30 08:47:46.977058	2025-08-27 09:00:53.898893
4459	536	todo	in_progress	开始执行任务: 修复PermissionRoute组件中的authService.getCurrentUserId错误	manual	1	{}	\N	\N	f	{}	2025-08-27 01:48:13.125137	2025-08-27 09:00:53.898893
4460	536	in_progress	completed	任务完成: 修复PermissionRoute组件中的authService.getCurrentUserId错误	manual	1	{}	\N	\N	f	{}	2025-08-30 09:48:13.125137	2025-08-27 09:00:53.898893
4461	537	todo	in_progress	开始执行任务: 创建权限检查辅助组件和Hook	manual	1	{}	\N	\N	f	{}	2025-08-27 01:51:12.684168	2025-08-27 09:00:53.898893
4462	537	in_progress	completed	任务完成: 创建权限检查辅助组件和Hook	manual	1	{}	\N	\N	f	{}	2025-08-30 10:51:12.684168	2025-08-27 09:00:53.898893
4463	538	todo	in_progress	开始执行任务: 修复 ProjectsPage.tsx 重复导入 React 的语法错误	manual	1	{}	\N	\N	f	{}	2025-08-27 01:51:41.589179	2025-08-27 09:00:53.898893
4464	538	in_progress	completed	任务完成: 修复 ProjectsPage.tsx 重复导入 React 的语法错误	manual	1	{}	\N	\N	f	{}	2025-08-30 11:51:41.589179	2025-08-27 09:00:53.898893
4465	539	todo	in_progress	开始执行任务: 创建权限功能演示页面	manual	1	{}	\N	\N	f	{}	2025-08-27 01:52:44.445659	2025-08-27 09:00:53.898893
4466	539	in_progress	completed	任务完成: 创建权限功能演示页面	manual	1	{}	\N	\N	f	{}	2025-08-30 12:52:44.445659	2025-08-27 09:00:53.898893
4467	540	todo	in_progress	开始执行任务: 创建系统管理员用户guoym	manual	1	{}	\N	\N	f	{}	2025-08-27 02:00:58.642079	2025-08-27 09:00:53.898893
4468	540	in_progress	completed	任务完成: 创建系统管理员用户guoym	manual	1	{}	\N	\N	f	{}	2025-08-30 14:00:58.642079	2025-08-27 09:00:53.898893
4469	541	todo	in_progress	开始执行任务: 修复用户权限和身份显示问题	manual	1	{}	\N	\N	f	{}	2025-08-27 02:06:35.350378	2025-08-27 09:00:53.898893
4470	541	in_progress	completed	任务完成: 修复用户权限和身份显示问题	manual	1	{}	\N	\N	f	{}	2025-08-30 15:06:35.350378	2025-08-27 09:00:53.898893
4471	549	todo	in_progress	开始执行任务: 解决 guoym 登录后变成 admin 用户的身份混乱问题	manual	1	{}	\N	\N	f	{}	2025-08-27 02:43:51.663423	2025-08-27 09:00:53.898893
4472	549	in_progress	completed	任务完成: 解决 guoym 登录后变成 admin 用户的身份混乱问题	manual	1	{}	\N	\N	f	{}	2025-08-30 23:43:51.663423	2025-08-27 09:00:53.898893
4473	565	todo	in_progress	开始执行任务: 修复权限管理页面API路由错误	manual	1	{}	\N	\N	f	{}	2025-08-27 21:00:27.609435	2025-08-27 09:00:53.898893
4474	565	in_progress	completed	任务完成: 修复权限管理页面API路由错误	manual	1	{}	\N	\N	f	{}	2025-08-31 10:00:27.609435	2025-08-27 09:00:53.898893
4475	566	todo	in_progress	开始执行任务: 检查和实现permissions相关API路由	manual	1	{}	\N	\N	f	{}	2025-08-27 21:00:48.091801	2025-08-27 09:00:53.898893
4476	566	in_progress	completed	任务完成: 检查和实现permissions相关API路由	manual	1	{}	\N	\N	f	{}	2025-08-31 11:00:48.091801	2025-08-27 09:00:53.898893
4477	567	todo	in_progress	开始执行任务: 修复权限验证中间件和403错误	manual	1	{}	\N	\N	f	{}	2025-08-27 21:00:51.286702	2025-08-27 09:00:53.898893
4478	567	in_progress	completed	任务完成: 修复权限验证中间件和403错误	manual	1	{}	\N	\N	f	{}	2025-08-31 12:00:51.286702	2025-08-27 09:00:53.898893
4479	568	todo	in_progress	开始执行任务: 验证权限数据完整性和初始化	manual	1	{}	\N	\N	f	{}	2025-08-27 21:00:54.90503	2025-08-27 09:00:53.898893
4480	568	in_progress	completed	任务完成: 验证权限数据完整性和初始化	manual	1	{}	\N	\N	f	{}	2025-08-31 13:00:54.90503	2025-08-27 09:00:53.898893
4481	569	todo	in_progress	开始执行任务: 修复企业用户管理页面API 500错误	manual	1	{}	\N	\N	f	{}	2025-08-27 21:37:47.952719	2025-08-27 09:00:53.898893
4482	569	in_progress	completed	任务完成: 修复企业用户管理页面API 500错误	manual	1	{}	\N	\N	f	{}	2025-08-31 14:37:47.952719	2025-08-27 09:00:53.898893
4483	575	todo	in_progress	开始执行任务: 检查后端服务和Docker状态	manual	1	{}	\N	\N	f	{}	2025-08-27 21:38:53.261246	2025-08-27 09:00:53.898893
4484	575	in_progress	completed	任务完成: 检查后端服务和Docker状态	manual	1	{}	\N	\N	f	{}	2025-08-31 20:38:53.261246	2025-08-27 09:00:53.898893
4485	577	todo	in_progress	开始执行任务: 验证数据库连接和表结构	manual	1	{}	\N	\N	f	{}	2025-08-27 21:38:59.539922	2025-08-27 09:00:53.898893
4486	577	in_progress	completed	任务完成: 验证数据库连接和表结构	manual	1	{}	\N	\N	f	{}	2025-08-30 22:38:59.539922	2025-08-27 09:00:53.898893
4487	578	todo	in_progress	开始执行任务: 修复企业用户API接口实现	manual	1	{}	\N	\N	f	{}	2025-08-27 21:39:03.075413	2025-08-27 09:00:53.898893
4488	578	in_progress	completed	任务完成: 修复企业用户API接口实现	manual	1	{}	\N	\N	f	{}	2025-08-30 23:39:03.075413	2025-08-27 09:00:53.898893
4489	579	todo	in_progress	开始执行任务: 测试和验证修复结果	manual	1	{}	\N	\N	f	{}	2025-08-27 21:39:05.951341	2025-08-27 09:00:53.898893
4490	579	in_progress	completed	任务完成: 测试和验证修复结果	manual	1	{}	\N	\N	f	{}	2025-08-31 00:39:05.951341	2025-08-27 09:00:53.898893
4491	580	todo	in_progress	开始执行任务: 修复工作笔记MCP接口创建失败问题	manual	1	{}	\N	\N	f	{}	2025-08-27 21:39:40.704361	2025-08-27 09:00:53.898893
4492	580	in_progress	completed	任务完成: 修复工作笔记MCP接口创建失败问题	manual	1	{}	\N	\N	f	{}	2025-08-31 01:39:40.704361	2025-08-27 09:00:53.898893
4493	581	todo	in_progress	开始执行任务: 修复企业用户管理页面 API 响应数据访问错误	manual	1	{}	\N	\N	f	{}	2025-08-27 22:02:49.602074	2025-08-27 09:00:53.898893
4494	581	in_progress	completed	任务完成: 修复企业用户管理页面 API 响应数据访问错误	manual	1	{}	\N	\N	f	{}	2025-08-31 03:02:49.602074	2025-08-27 09:00:53.898893
4495	582	todo	in_progress	开始执行任务: 批量修复所有 service 文件中的 API 响应数据访问错误	manual	1	{}	\N	\N	f	{}	2025-08-27 22:03:47.60085	2025-08-27 09:00:53.898893
4496	582	in_progress	completed	任务完成: 批量修复所有 service 文件中的 API 响应数据访问错误	manual	1	{}	\N	\N	f	{}	2025-08-31 04:03:47.60085	2025-08-27 09:00:53.898893
4497	585	todo	in_progress	开始执行任务: 修复用户管理页面"新建用户"按钮无响应问题	manual	1	{}	\N	\N	f	{}	2025-08-28 02:09:29.6478	2025-08-27 09:00:53.898893
4498	585	in_progress	completed	任务完成: 修复用户管理页面"新建用户"按钮无响应问题	manual	1	{}	\N	\N	f	{}	2025-08-31 11:09:29.6478	2025-08-27 09:00:53.898893
4499	587	todo	in_progress	开始执行任务: 修复用户管理页面 Dropdown 嵌套错误并优化新增用户UI	manual	1	{}	\N	\N	f	{}	2025-08-28 02:22:14.378389	2025-08-27 09:00:53.898893
4500	587	in_progress	completed	任务完成: 修复用户管理页面 Dropdown 嵌套错误并优化新增用户UI	manual	1	{}	\N	\N	f	{}	2025-08-31 13:22:14.378389	2025-08-27 09:00:53.898893
4501	588	todo	in_progress	开始执行任务: 修复用户管理页面列表显示空白问题	manual	1	{}	\N	\N	f	{}	2025-08-28 02:28:18.309259	2025-08-27 09:00:53.898893
4502	588	in_progress	completed	任务完成: 修复用户管理页面列表显示空白问题	manual	1	{}	\N	\N	f	{}	2025-08-31 14:28:18.309259	2025-08-27 09:00:53.898893
4503	589	todo	in_progress	开始执行任务: 修复企业用户创建提交500错误	manual	1	{}	\N	\N	f	{}	2025-08-28 02:49:44.491788	2025-08-27 09:00:53.898893
4504	589	in_progress	completed	任务完成: 修复企业用户创建提交500错误	manual	1	{}	\N	\N	f	{}	2025-08-31 15:49:44.491788	2025-08-27 09:00:53.898893
4505	590	todo	in_progress	开始执行任务: 修复企业用户创建成功后前端不显示问题	manual	1	{}	\N	\N	f	{}	2025-08-28 03:29:03.521029	2025-08-27 09:00:53.898893
4506	590	in_progress	completed	任务完成: 修复企业用户创建成功后前端不显示问题	manual	1	{}	\N	\N	f	{}	2025-08-31 17:29:03.521029	2025-08-27 09:00:53.898893
4507	591	todo	in_progress	开始执行任务: 深度排查企业用户创建后不显示的根本原因	manual	1	{}	\N	\N	f	{}	2025-08-28 03:36:02.64708	2025-08-27 09:00:53.898893
4508	591	in_progress	completed	任务完成: 深度排查企业用户创建后不显示的根本原因	manual	1	{}	\N	\N	f	{}	2025-08-31 18:36:02.64708	2025-08-27 09:00:53.898893
4509	592	todo	in_progress	开始执行任务: 直接测试前端页面企业用户显示问题	manual	1	{}	\N	\N	f	{}	2025-08-28 03:40:51.291621	2025-08-27 09:00:53.898893
4510	592	in_progress	completed	任务完成: 直接测试前端页面企业用户显示问题	manual	1	{}	\N	\N	f	{}	2025-08-31 19:40:51.291621	2025-08-27 09:00:53.898893
4511	594	todo	in_progress	开始执行任务: 修复企业用户创建问题：提交成功但消息窗报失败	manual	1	{}	\N	\N	f	{}	2025-08-28 04:01:31.803105	2025-08-27 09:00:53.898893
4512	594	in_progress	completed	任务完成: 修复企业用户创建问题：提交成功但消息窗报失败	manual	1	{}	\N	\N	f	{}	2025-08-31 22:01:31.803105	2025-08-27 09:00:53.898893
4513	595	todo	in_progress	开始执行任务: 完善用户管理页面的用户统计功能	manual	1	{}	\N	\N	f	{}	2025-08-28 04:05:59.790179	2025-08-27 09:00:53.898893
4514	595	in_progress	completed	任务完成: 完善用户管理页面的用户统计功能	manual	1	{}	\N	\N	f	{}	2025-08-31 23:05:59.790179	2025-08-27 09:00:53.898893
4515	596	todo	in_progress	开始执行任务: 修复用户管理页面统计数据显示问题	manual	1	{}	\N	\N	f	{}	2025-08-28 04:11:36.649346	2025-08-27 09:00:53.898893
4516	596	in_progress	completed	任务完成: 修复用户管理页面统计数据显示问题	manual	1	{}	\N	\N	f	{}	2025-09-01 00:11:36.649346	2025-08-27 09:00:53.898893
4517	597	todo	in_progress	开始执行任务: 修复React重复Key警告问题	manual	1	{}	\N	\N	f	{}	2025-08-28 05:54:05.02534	2025-08-27 09:00:53.898893
4518	597	in_progress	completed	任务完成: 修复React重复Key警告问题	manual	1	{}	\N	\N	f	{}	2025-09-01 02:54:05.02534	2025-08-27 09:00:53.898893
4519	599	todo	in_progress	开始执行任务: 阶段1：数据库设计与基础框架 (4周)	manual	1	{}	\N	\N	f	{}	2025-08-28 06:05:44.659838	2025-08-27 09:00:53.898893
4520	599	in_progress	completed	任务完成: 阶段1：数据库设计与基础框架 (4周)	manual	1	{}	\N	\N	f	{}	2025-09-01 05:05:44.659838	2025-08-27 09:00:53.898893
4521	603	todo	in_progress	开始执行任务: 阶段5：前端界面与系统集成 (3周)	manual	1	{}	\N	\N	f	{}	2025-08-28 06:06:00.959399	2025-08-27 09:00:53.898893
4522	603	in_progress	completed	任务完成: 阶段5：前端界面与系统集成 (3周)	manual	1	{}	\N	\N	f	{}	2025-08-31 09:06:00.959399	2025-08-27 09:00:53.898893
4523	605	todo	in_progress	开始执行任务: 1.1 设计数据库表结构	manual	1	{}	\N	\N	f	{}	2025-08-28 06:06:08.680335	2025-08-27 09:00:53.898893
4524	605	in_progress	completed	任务完成: 1.1 设计数据库表结构	manual	1	{}	\N	\N	f	{}	2025-08-31 11:06:08.680335	2025-08-27 09:00:53.898893
4525	606	todo	in_progress	开始执行任务: 1.2 创建数据库迁移文件	manual	1	{}	\N	\N	f	{}	2025-08-28 06:06:11.844277	2025-08-27 09:00:53.898893
4526	606	in_progress	completed	任务完成: 1.2 创建数据库迁移文件	manual	1	{}	\N	\N	f	{}	2025-08-31 12:06:11.844277	2025-08-27 09:00:53.898893
4527	607	todo	in_progress	开始执行任务: 1.3 实现基础Model层	manual	1	{}	\N	\N	f	{}	2025-08-28 06:06:15.291603	2025-08-27 09:00:53.898893
4528	607	in_progress	completed	任务完成: 1.3 实现基础Model层	manual	1	{}	\N	\N	f	{}	2025-08-31 13:06:15.291603	2025-08-27 09:00:53.898893
4529	608	todo	in_progress	开始执行任务: 1.4 开发权限验证中间件框架	manual	1	{}	\N	\N	f	{}	2025-08-28 06:06:18.760309	2025-08-27 09:00:53.898893
4530	608	in_progress	completed	任务完成: 1.4 开发权限验证中间件框架	manual	1	{}	\N	\N	f	{}	2025-08-31 14:06:18.760309	2025-08-27 09:00:53.898893
4531	609	todo	in_progress	开始执行任务: 创建角色管理页面基础框架	manual	1	{}	\N	\N	f	{}	2025-08-28 06:15:47.053445	2025-08-27 09:00:53.898893
4532	609	in_progress	completed	任务完成: 创建角色管理页面基础框架	manual	1	{}	\N	\N	f	{}	2025-08-31 15:15:47.053445	2025-08-27 09:00:53.898893
4533	610	todo	in_progress	开始执行任务: 实现角色CRUD功能	manual	1	{}	\N	\N	f	{}	2025-08-28 06:15:50.343593	2025-08-27 09:00:53.898893
4534	610	in_progress	completed	任务完成: 实现角色CRUD功能	manual	1	{}	\N	\N	f	{}	2025-08-31 16:15:50.343593	2025-08-27 09:00:53.898893
4535	611	todo	in_progress	开始执行任务: 创建权限矩阵可视化组件	manual	1	{}	\N	\N	f	{}	2025-08-28 06:15:54.764052	2025-08-27 09:00:53.898893
4536	611	in_progress	completed	任务完成: 创建权限矩阵可视化组件	manual	1	{}	\N	\N	f	{}	2025-08-31 17:15:54.764052	2025-08-27 09:00:53.898893
4537	612	todo	in_progress	开始执行任务: 实现用户-角色关联管理	manual	1	{}	\N	\N	f	{}	2025-08-28 06:15:57.946772	2025-08-27 09:00:53.898893
4538	612	in_progress	completed	任务完成: 实现用户-角色关联管理	manual	1	{}	\N	\N	f	{}	2025-08-31 18:15:57.946772	2025-08-27 09:00:53.898893
4539	613	todo	in_progress	开始执行任务: 集成企业角色管理到现有页面	manual	1	{}	\N	\N	f	{}	2025-08-28 06:16:01.731898	2025-08-27 09:00:53.898893
4540	613	in_progress	completed	任务完成: 集成企业角色管理到现有页面	manual	1	{}	\N	\N	f	{}	2025-08-31 19:16:01.731898	2025-08-27 09:00:53.898893
4541	614	todo	in_progress	开始执行任务: 添加角色管理页面到路由配置	manual	1	{}	\N	\N	f	{}	2025-08-28 06:16:05.700222	2025-08-27 09:00:53.898893
4542	614	in_progress	completed	任务完成: 添加角色管理页面到路由配置	manual	1	{}	\N	\N	f	{}	2025-08-31 20:16:05.700222	2025-08-27 09:00:53.898893
4543	615	todo	in_progress	开始执行任务: 系统集成测试和优化	manual	1	{}	\N	\N	f	{}	2025-08-28 06:16:09.144705	2025-08-27 09:00:53.898893
4544	615	in_progress	completed	任务完成: 系统集成测试和优化	manual	1	{}	\N	\N	f	{}	2025-08-31 21:16:09.144705	2025-08-27 09:00:53.898893
4545	616	todo	in_progress	开始执行任务: Batch 0.1: 需求澄清与验收标准定义	manual	1	{}	\N	\N	f	{}	2025-08-28 06:32:42.06573	2025-08-27 09:00:53.898893
4546	616	in_progress	completed	任务完成: Batch 0.1: 需求澄清与验收标准定义	manual	1	{}	\N	\N	f	{}	2025-08-31 22:32:42.06573	2025-08-27 09:00:53.898893
4547	617	todo	in_progress	开始执行任务: Batch 0.2: 架构蓝图、数据模型冻结（v1）	manual	1	{}	\N	\N	f	{}	2025-08-28 06:32:45.20702	2025-08-27 09:00:53.898893
4548	617	in_progress	completed	任务完成: Batch 0.2: 架构蓝图、数据模型冻结（v1）	manual	1	{}	\N	\N	f	{}	2025-08-31 23:32:45.20702	2025-08-27 09:00:53.898893
4549	618	todo	in_progress	开始执行任务: Batch 0.3: 开发环境与CI基础设施	manual	1	{}	\N	\N	f	{}	2025-08-28 06:32:48.97416	2025-08-27 09:00:53.898893
4550	618	in_progress	completed	任务完成: Batch 0.3: 开发环境与CI基础设施	manual	1	{}	\N	\N	f	{}	2025-09-01 00:32:48.97416	2025-08-27 09:00:53.898893
4551	619	todo	in_progress	开始执行任务: Batch 1.1: 数据模型扩展与迁移脚本	manual	1	{}	\N	\N	f	{}	2025-08-28 06:45:10.87981	2025-08-27 09:00:53.898893
4552	619	in_progress	completed	任务完成: Batch 1.1: 数据模型扩展与迁移脚本	manual	1	{}	\N	\N	f	{}	2025-09-01 01:45:10.87981	2025-08-27 09:00:53.898893
4553	620	todo	in_progress	开始执行任务: Batch 1.2: ltree层级结构实现与索引优化	manual	1	{}	\N	\N	f	{}	2025-08-28 06:45:15.857646	2025-08-27 09:00:53.898893
4554	620	in_progress	completed	任务完成: Batch 1.2: ltree层级结构实现与索引优化	manual	1	{}	\N	\N	f	{}	2025-09-01 02:45:15.857646	2025-08-27 09:00:53.898893
4555	621	todo	in_progress	开始执行任务: Batch 1.3: 种子数据脚本与测试数据	manual	1	{}	\N	\N	f	{}	2025-08-28 06:45:19.933546	2025-08-27 09:00:53.898893
4556	621	in_progress	completed	任务完成: Batch 1.3: 种子数据脚本与测试数据	manual	1	{}	\N	\N	f	{}	2025-09-01 03:45:19.933546	2025-08-27 09:00:53.898893
4557	622	todo	in_progress	开始执行任务: 创建默认系统角色数据初始化	manual	1	{}	\N	\N	f	{}	2025-08-28 06:56:27.209117	2025-08-27 09:00:53.898893
4558	622	in_progress	completed	任务完成: 创建默认系统角色数据初始化	manual	1	{}	\N	\N	f	{}	2025-09-01 04:56:27.209117	2025-08-27 09:00:53.898893
4559	623	todo	in_progress	开始执行任务: 创建权限系统基础数据初始化	manual	1	{}	\N	\N	f	{}	2025-08-28 06:56:31.143278	2025-08-27 09:00:53.898893
4560	623	in_progress	completed	任务完成: 创建权限系统基础数据初始化	manual	1	{}	\N	\N	f	{}	2025-09-01 05:56:31.143278	2025-08-27 09:00:53.898893
4561	624	todo	in_progress	开始执行任务: 实现角色权限关联表初始化	manual	1	{}	\N	\N	f	{}	2025-08-28 06:56:35.987832	2025-08-27 09:00:53.898893
4562	624	in_progress	completed	任务完成: 实现角色权限关联表初始化	manual	1	{}	\N	\N	f	{}	2025-08-31 06:56:35.987832	2025-08-27 09:00:53.898893
4563	625	todo	in_progress	开始执行任务: 开发数据库迁移脚本和种子数据	manual	1	{}	\N	\N	f	{}	2025-08-28 06:56:39.855221	2025-08-27 09:00:53.898893
4564	625	in_progress	completed	任务完成: 开发数据库迁移脚本和种子数据	manual	1	{}	\N	\N	f	{}	2025-08-31 07:56:39.855221	2025-08-27 09:00:53.898893
4565	626	todo	in_progress	开始执行任务: 实现企业默认角色自动创建机制	manual	1	{}	\N	\N	f	{}	2025-08-28 06:56:43.280941	2025-08-27 09:00:53.898893
4566	626	in_progress	completed	任务完成: 实现企业默认角色自动创建机制	manual	1	{}	\N	\N	f	{}	2025-08-31 08:56:43.280941	2025-08-27 09:00:53.898893
4567	627	todo	in_progress	开始执行任务: 开发角色权限验证中间件	manual	1	{}	\N	\N	f	{}	2025-08-28 06:56:46.736464	2025-08-27 09:00:53.898893
4568	627	in_progress	completed	任务完成: 开发角色权限验证中间件	manual	1	{}	\N	\N	f	{}	2025-08-31 09:56:46.736464	2025-08-27 09:00:53.898893
4569	628	todo	in_progress	开始执行任务: 权限验证中间件开发	manual	1	{}	\N	\N	f	{}	2025-08-28 06:56:48.882228	2025-08-27 09:00:53.898893
4570	628	in_progress	completed	任务完成: 权限验证中间件开发	manual	1	{}	\N	\N	f	{}	2025-08-31 10:56:48.882228	2025-08-27 09:00:53.898893
4571	640	todo	in_progress	开始执行任务: Batch 1 数据层与迁移 - 架构分析与优化	manual	1	{}	\N	\N	f	{}	2025-08-28 07:51:37.160333	2025-08-27 09:00:53.898893
4572	640	in_progress	completed	任务完成: Batch 1 数据层与迁移 - 架构分析与优化	manual	1	{}	\N	\N	f	{}	2025-08-31 23:51:37.160333	2025-08-27 09:00:53.898893
4573	3	todo	in_progress	开始执行任务: 配置Docker Compose文件	manual	1	{}	\N	\N	f	{}	2025-07-22 04:11:54.875182	2025-08-27 09:00:53.898893
4574	1	todo	in_progress	开始执行任务: 项目环境搭建	manual	1	{}	\N	\N	f	{}	2025-07-22 04:11:54.875182	2025-08-27 09:00:53.898893
4575	5	todo	in_progress	开始执行任务: 数据库设计	manual	1	{}	\N	\N	f	{}	2025-07-22 04:12:27.867965	2025-08-27 09:00:53.898893
4576	26	todo	in_progress	开始执行任务: 新功能开发计划文档	manual	1	{}	\N	\N	f	{}	2025-07-22 10:56:41.663893	2025-08-27 09:00:53.898893
4577	29	todo	in_progress	开始执行任务: 33223	manual	1	{}	\N	\N	f	{}	2025-07-22 11:34:08.606596	2025-08-27 09:00:53.898893
4578	30	todo	in_progress	开始执行任务: UTA测试	manual	1	{}	\N	\N	f	{}	2025-07-22 11:35:32.061031	2025-08-27 09:00:53.898893
4579	35	todo	in_progress	开始执行任务: 2222	manual	1	{}	\N	\N	f	{}	2025-07-22 23:28:21.219334	2025-08-27 09:00:53.898893
4580	45	todo	in_progress	开始执行任务: 31周-01：修复定时器	manual	1	{}	\N	\N	f	{}	2025-08-03 13:27:38.72271	2025-08-27 09:00:53.898893
4581	70	todo	in_progress	开始执行任务: 31-02-01：新增与"创建兄弟任务"、"手工批量创建子任务"、"任务文档"、"任务详情"的接口	manual	1	{}	\N	\N	f	{}	2025-08-04 05:28:29.48643	2025-08-27 09:00:53.898893
4582	74	todo	in_progress	开始执行任务: 31周-02：claude-mcp功能1.1版升级	manual	1	{}	\N	\N	f	{}	2025-08-04 05:59:14.143558	2025-08-27 09:00:53.898893
4583	75	todo	in_progress	开始执行任务: 31-02-01：新增与"创建兄弟任务"、"手工批量创建子任务"、"任务文档"、"任务详情"的接口	manual	1	{}	\N	\N	f	{}	2025-08-04 05:59:14.156896	2025-08-27 09:00:53.898893
4584	113	todo	in_progress	开始执行任务: 子任务表格测试-父任务	manual	1	{}	\N	\N	f	{}	2025-08-04 08:57:13.970696	2025-08-27 09:00:53.898893
4585	115	todo	in_progress	开始执行任务: 子任务2-后端API	manual	1	{}	\N	\N	f	{}	2025-08-04 08:57:14.015171	2025-08-27 09:00:53.898893
4586	128	todo	in_progress	开始执行任务: 31周-03：任务管理优化	manual	1	{}	\N	\N	f	{}	2025-08-04 10:24:16.755278	2025-08-27 09:00:53.898893
4587	129	todo	in_progress	开始执行任务: 31周-04：文档管理功能2.0	manual	1	{}	\N	\N	f	{}	2025-08-04 10:33:02.564038	2025-08-27 09:00:53.898893
4588	165	todo	in_progress	开始执行任务: 计时器功能完善	manual	1	{}	\N	\N	f	{}	2025-08-04 14:33:17.762559	2025-08-27 09:00:53.898893
4589	791	todo	in_progress	开始执行任务: NLP模型开发	manual	1	{}	\N	\N	f	{}	2025-08-08 09:00:53.898893	2025-08-27 09:00:53.898893
4590	794	todo	in_progress	开始执行任务: 后端API开发	manual	1	{}	\N	\N	f	{}	2025-08-15 09:00:53.898893	2025-08-27 09:00:53.898893
4591	191	todo	in_progress	开始执行任务: 每日报表功能开发	manual	1	{}	\N	\N	f	{}	2025-08-19 17:08:18.68252	2025-08-27 09:00:53.898893
4592	196	todo	in_progress	开始执行任务: 二次检查	manual	1	{}	\N	\N	f	{}	2025-08-20 00:30:39.47954	2025-08-27 09:00:53.898893
4593	199	todo	in_progress	开始执行任务: 修复apiKey不对的bug	manual	1	{}	\N	\N	f	{}	2025-08-20 04:25:51.199092	2025-08-27 09:00:53.898893
4594	200	todo	in_progress	开始执行任务: 任务文档重构	manual	1	{}	\N	\N	f	{}	2025-08-20 04:38:58.2548	2025-08-27 09:00:53.898893
4595	203	todo	in_progress	开始执行任务: 前端服务整合	manual	1	{}	\N	\N	f	{}	2025-08-20 04:38:58.2732	2025-08-27 09:00:53.898893
4596	213	todo	in_progress	开始执行任务: 修复任务详情页，编辑任务选择父任务出现的bugs	manual	1	{}	\N	\N	f	{}	2025-08-20 06:06:54.093642	2025-08-27 09:00:53.898893
4597	220	todo	in_progress	开始执行任务: 重构任务详情页的任务文档页面设计	manual	1	{}	\N	\N	f	{}	2025-08-20 09:51:09.362912	2025-08-27 09:00:53.898893
4598	243	todo	in_progress	开始执行任务: feature:运输单成本计算模块	manual	1	{}	\N	\N	f	{}	2025-08-20 14:19:17.708013	2025-08-27 09:00:53.898893
4599	245	todo	in_progress	开始执行任务: Bug修复：新建任务文档无法保存	manual	1	{}	\N	\N	f	{}	2025-08-20 16:27:03.320163	2025-08-27 09:00:53.898893
4600	259	todo	in_progress	开始执行任务: 测试弹窗修复 - Modal Fix Test	manual	1	{}	\N	\N	f	{}	2025-08-20 17:27:04.02548	2025-08-27 09:00:53.898893
4601	264	todo	in_progress	开始执行任务: 给金曼荣公司演示系统	manual	1	{}	\N	\N	f	{}	2025-08-20 23:09:58.813656	2025-08-27 09:00:53.898893
4602	305	todo	in_progress	开始执行任务: 测试灵活时间管理系统 - 已更新	manual	1	{}	\N	\N	f	{}	2025-08-22 00:35:57.204238	2025-08-27 09:00:53.898893
4603	309	todo	in_progress	开始执行任务: 精准时间统计测试任务	manual	1	{}	\N	\N	f	{}	2025-08-22 04:17:59.053395	2025-08-27 09:00:53.898893
4604	315	todo	in_progress	开始执行任务: 测试任务1 - 精准时间统计验证	manual	1	{}	\N	\N	f	{}	2025-08-22 09:11:16.669239	2025-08-27 09:00:53.898893
4605	324	todo	in_progress	开始执行任务: Bug修复：首页Dashboard获取不到项目数据	manual	1	{}	\N	\N	f	{}	2025-08-22 14:29:47.158535	2025-08-27 09:00:53.898893
4606	335	todo	in_progress	开始执行任务: 修复工作笔记模块	manual	1	{}	\N	\N	f	{}	2025-08-23 02:10:26.795807	2025-08-27 09:00:53.898893
4607	347	todo	in_progress	开始执行任务: 修复任务文档系统一致性与可见性（上下文工程核心）	manual	1	{}	\N	\N	f	{}	2025-08-23 03:19:46.51281	2025-08-27 09:00:53.898893
4608	348	todo	in_progress	开始执行任务: 阶段1：后端API事务化改造与一致性读取（create/update + link 原子化；统一 has/get/list 读路径）	manual	1	{}	\N	\N	f	{}	2025-08-23 03:20:02.489784	2025-08-27 09:00:53.898893
4609	349	todo	in_progress	开始执行任务: 阶段2：文件镜像写入可选化与健康检查（/health/docs 暴露索引/镜像状态；启动权限/卷检查）	manual	1	{}	\N	\N	f	{}	2025-08-23 03:20:25.069053	2025-08-27 09:00:53.898893
4610	358	todo	in_progress	开始执行任务: 部署前检查清单与回滚预案（Docker-Postgres 配置、健康检查、数据备份）	manual	1	{}	\N	\N	f	{}	2025-08-23 09:55:13.341559	2025-08-27 09:00:53.898893
4611	359	todo	in_progress	开始执行任务: 工作笔记分类管理（文件夹树）试点：多AI并行开发	manual	1	{}	\N	\N	f	{}	2025-08-23 11:47:00.86867	2025-08-27 09:00:53.898893
4612	361	todo	in_progress	开始执行任务: T0.2 架构蓝图与数据模型冻结（v1）	manual	1	{}	\N	\N	f	{}	2025-08-23 11:47:50.992491	2025-08-27 09:00:53.898893
4613	365	todo	in_progress	开始执行任务: T1.3 种子数据脚本	manual	1	{}	\N	\N	f	{}	2025-08-23 11:48:03.703401	2025-08-27 09:00:53.898893
4614	366	todo	in_progress	开始执行任务: T2.1 后端项目模块搭建（folders, notes模块）	manual	1	{}	\N	\N	f	{}	2025-08-23 11:48:06.54686	2025-08-27 09:00:53.898893
4615	386	todo	in_progress	开始执行任务: Batch 1 数据层与迁移	manual	1	{}	\N	\N	f	{}	2025-08-23 11:53:08.932161	2025-08-27 09:00:53.898893
4616	390	todo	in_progress	开始执行任务: 将任务详情页的子任务列表扩展为能显示孙任务的层级结构	manual	1	{}	\N	\N	f	{}	2025-08-23 12:13:42.50377	2025-08-27 09:00:53.898893
4617	391	todo	in_progress	开始执行任务: Batch 0 任务对齐与基础设施	manual	1	{}	\N	\N	f	{}	2025-08-23 12:13:48.526307	2025-08-27 09:00:53.898893
4618	401	todo	in_progress	开始执行任务: 依赖关系管理改造：支持多AI并行、类型归类与甘特图可视化	manual	1	{}	\N	\N	f	{}	2025-08-23 12:25:45.68814	2025-08-27 09:00:53.898893
4619	466	todo	in_progress	开始执行任务: 修复Markdown文档内容不能正常显示的问题	manual	1	{}	\N	\N	f	{}	2025-08-26 08:51:59.305174	2025-08-27 09:00:53.898893
4620	470	todo	in_progress	开始执行任务: 111	manual	1	{}	\N	\N	f	{}	2025-08-26 15:15:24.83175	2025-08-27 09:00:53.898893
4621	472	todo	in_progress	开始执行任务: 小bugs修复汇总任务	manual	1	{}	\N	\N	f	{}	2025-08-26 15:22:44.660764	2025-08-27 09:00:53.898893
4622	475	todo	in_progress	开始执行任务: 实现工作笔记转任务文档功能	manual	1	{}	\N	\N	f	{}	2025-08-27 13:15:03.782814	2025-08-27 09:00:53.898893
4623	482	todo	in_progress	开始执行任务: 优化批量修改父任务功能：搜索支持任务ID和修复保存失败假象	manual	1	{}	\N	\N	f	{}	2025-08-27 14:28:11.80922	2025-08-27 09:00:53.898893
4624	488	todo	in_progress	开始执行任务: 修复用户信息API 500错误 - /api/v1/system/user/info	manual	1	{}	\N	\N	f	{}	2025-08-27 16:02:49.397022	2025-08-27 09:00:53.898893
4625	519	todo	in_progress	开始执行任务: 角色管理接口 - CRUD操作和权限分配	manual	1	{}	\N	\N	f	{}	2025-08-27 23:39:36.471132	2025-08-27 09:00:53.898893
4626	550	todo	in_progress	开始执行任务: 为北京欢乐宿公司创建企业用户songjx	manual	1	{}	\N	\N	f	{}	2025-08-28 02:46:15.050901	2025-08-27 09:00:53.898893
4627	552	todo	in_progress	开始执行任务: 重新调查guoym用户身份问题 - 深度排查	manual	1	{}	\N	\N	f	{}	2025-08-28 02:49:51.313187	2025-08-27 09:00:53.898893
4628	553	todo	in_progress	开始执行任务: [权限] 将 admin 账号提升为 superadmin（无权限限制）	manual	1	{}	\N	\N	f	{}	2025-08-28 10:14:39.157785	2025-08-27 09:00:53.898893
4629	564	todo	in_progress	开始执行任务: 测试create-task接口	manual	1	{}	\N	\N	f	{}	2025-08-28 13:27:47.494011	2025-08-27 09:00:53.898893
4630	583	todo	in_progress	开始执行任务: 修复DocumentRepositoryAdapter类型错误	manual	1	{}	\N	\N	f	{}	2025-08-28 23:06:30.609705	2025-08-27 09:00:53.898893
4631	584	todo	in_progress	开始执行任务: [BUG修复] 修复后端代码中任务文档表名引用错误	manual	1	{}	\N	\N	f	{}	2025-08-29 00:22:32.868917	2025-08-27 09:00:53.898893
4632	586	todo	in_progress	开始执行任务: 修复React.Children.only错误 - Dropdown组件多子元素问题	manual	1	{}	\N	\N	f	{}	2025-08-29 02:18:05.923222	2025-08-27 09:00:53.898893
4633	593	todo	in_progress	开始执行任务: 修复企业用户Table组件渲染问题	manual	1	{}	\N	\N	f	{}	2025-08-29 03:45:13.122996	2025-08-27 09:00:53.898893
4634	598	todo	in_progress	开始执行任务: 设计角色管理方案 - 系统用户和企业用户默认角色权限体系	manual	1	{}	\N	\N	f	{}	2025-08-29 05:58:47.39596	2025-08-27 09:00:53.898893
4635	600	todo	in_progress	开始执行任务: 阶段2：角色权限定义与初始化 (3周)	manual	1	{}	\N	\N	f	{}	2025-08-29 06:05:47.455092	2025-08-27 09:00:53.898893
4636	601	todo	in_progress	开始执行任务: 阶段3：权限验证与API开发 (4周)	manual	1	{}	\N	\N	f	{}	2025-08-29 06:05:54.160026	2025-08-27 09:00:53.898893
4637	365	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 09:01:14.335034	2025-08-27 09:01:14.335034
4638	386	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 09:01:14.335034	2025-08-27 09:01:14.335034
4639	629	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 09:02:30.700849	2025-08-27 09:02:30.700849
4640	366	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 09:06:56.021216	2025-08-27 09:06:56.021216
4641	387	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 09:06:56.021216	2025-08-27 09:06:56.021216
4642	370	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 09:15:53.834567	2025-08-27 09:15:53.834567
4643	370	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 09:20:07.068104	2025-08-27 09:20:07.068104
4644	372	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 09:32:20.098429	2025-08-27 09:32:20.098429
4647	632	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 10:10:55.4639	2025-08-27 10:10:55.4639
4648	372	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 10:11:00.695606	2025-08-27 10:11:00.695606
4649	632	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 10:18:10.584583	2025-08-27 10:18:10.584583
4650	801	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 11:05:18.199036	2025-08-27 11:05:18.199036
4651	367	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 11:07:05.318622	2025-08-27 11:07:05.318622
4652	368	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 11:10:12.894322	2025-08-27 11:10:12.894322
4653	367	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 11:18:31.151058	2025-08-27 11:18:31.151058
4654	371	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-27 11:22:09.721977	2025-08-27 11:22:09.721977
4655	803	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-28 14:58:56.238685	2025-08-28 14:58:56.238685
4656	803	in_progress	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-28 14:59:17.775185	2025-08-28 14:59:17.775185
4657	803	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-28 14:59:36.468697	2025-08-28 14:59:36.468697
4658	808	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-28 15:07:36.73857	2025-08-28 15:07:36.73857
4659	809	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-28 15:09:06.121439	2025-08-28 15:09:06.121439
4660	809	in_progress	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-28 15:09:13.335204	2025-08-28 15:09:13.335204
4661	809	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-28 15:09:18.028537	2025-08-28 15:09:18.028537
4662	814	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-28 15:24:51.734905	2025-08-28 15:24:51.734905
4663	815	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-28 15:30:09.538743	2025-08-28 15:30:09.538743
4664	815	in_progress	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-28 15:33:04.787216	2025-08-28 15:33:04.787216
4665	842	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-28 21:22:23.279856	2025-08-28 21:22:23.279856
4666	849	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 05:04:32.154796	2025-08-29 05:04:32.154796
4667	520	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 05:05:55.687584	2025-08-29 05:05:55.687584
4668	848	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 05:17:49.915041	2025-08-29 05:17:49.915041
4669	848	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 05:20:04.775045	2025-08-29 05:20:04.775045
4670	851	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 05:38:55.27679	2025-08-29 05:38:55.27679
4671	848	completed	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 05:40:48.458124	2025-08-29 05:40:48.458124
4672	851	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 05:49:46.057215	2025-08-29 05:49:46.057215
4673	848	todo	cancelled	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 05:51:07.012734	2025-08-29 05:51:07.012734
4674	848	cancelled	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 05:51:18.106719	2025-08-29 05:51:18.106719
4675	860	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 05:56:42.977665	2025-08-29 05:56:42.977665
4676	873	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 06:00:33.95851	2025-08-29 06:00:33.95851
4677	866	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 06:09:24.255232	2025-08-29 06:09:24.255232
4678	874	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 06:48:35.210827	2025-08-29 06:48:35.210827
4679	874	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 06:50:07.697745	2025-08-29 06:50:07.697745
4680	866	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 06:54:34.167402	2025-08-29 06:54:34.167402
4681	850	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 06:57:26.642379	2025-08-29 06:57:26.642379
4682	861	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 07:02:14.124839	2025-08-29 07:02:14.124839
4683	860	in_progress	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 07:02:14.124839	2025-08-29 07:02:14.124839
4684	850	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 07:07:51.895305	2025-08-29 07:07:51.895305
4685	875	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 07:17:28.194087	2025-08-29 07:17:28.194087
4686	880	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 07:19:47.923286	2025-08-29 07:19:47.923286
4687	875	in_progress	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 07:20:00.929546	2025-08-29 07:20:00.929546
4688	875	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 07:21:01.339062	2025-08-29 07:21:01.339062
4689	880	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 07:21:28.604084	2025-08-29 07:21:28.604084
4690	880	completed	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 07:23:04.127804	2025-08-29 07:23:04.127804
4691	875	completed	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 07:27:16.180516	2025-08-29 07:27:16.180516
4692	909	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 07:38:40.210387	2025-08-29 07:38:40.210387
4693	890	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 07:42:10.232528	2025-08-29 07:42:10.232528
4694	909	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 07:44:10.701044	2025-08-29 07:44:10.701044
4695	875	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 07:44:10.701044	2025-08-29 07:44:10.701044
4696	890	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 07:46:59.663708	2025-08-29 07:46:59.663708
4697	885	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 07:46:59.663708	2025-08-29 07:46:59.663708
4698	910	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 08:04:09.793177	2025-08-29 08:04:09.793177
4699	891	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 08:31:42.737072	2025-08-29 08:31:42.737072
4700	891	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 08:33:30.003834	2025-08-29 08:33:30.003834
4701	892	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 08:34:20.995305	2025-08-29 08:34:20.995305
4702	892	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 08:36:48.044171	2025-08-29 08:36:48.044171
4703	885	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 08:36:48.044171	2025-08-29 08:36:48.044171
4704	880	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 08:36:48.044171	2025-08-29 08:36:48.044171
4705	921	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 09:23:15.41117	2025-08-29 09:23:15.41117
4706	921	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 09:27:07.816077	2025-08-29 09:27:07.816077
4707	922	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 09:27:18.090156	2025-08-29 09:27:18.090156
4708	921	completed	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 09:27:18.090156	2025-08-29 09:27:18.090156
4709	923	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 09:27:36.999792	2025-08-29 09:27:36.999792
4710	924	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 09:27:40.854077	2025-08-29 09:27:40.854077
4711	925	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 09:27:44.935961	2025-08-29 09:27:44.935961
4712	926	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 09:31:36.83333	2025-08-29 09:31:36.83333
4713	927	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 10:27:07.002954	2025-08-29 10:27:07.002954
4714	927	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 10:40:44.96412	2025-08-29 10:40:44.96412
4715	928	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 10:41:31.142748	2025-08-29 10:41:31.142748
4716	928	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 10:50:28.582328	2025-08-29 10:50:28.582328
4717	929	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 10:51:48.71717	2025-08-29 10:51:48.71717
4718	926	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 10:57:07.733802	2025-08-29 10:57:07.733802
4719	929	in_progress	cancelled	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 10:58:04.850054	2025-08-29 10:58:04.850054
4720	921	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 10:58:40.427001	2025-08-29 10:58:40.427001
4721	886	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 10:59:43.450239	2025-08-29 10:59:43.450239
4722	932	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 11:06:14.718773	2025-08-29 11:06:14.718773
4723	886	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 11:10:32.694382	2025-08-29 11:10:32.694382
4724	933	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 11:10:44.911079	2025-08-29 11:10:44.911079
4725	893	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 11:18:01.975594	2025-08-29 11:18:01.975594
4726	886	completed	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 11:18:01.975594	2025-08-29 11:18:01.975594
4727	893	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 11:18:06.277661	2025-08-29 11:18:06.277661
4728	886	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 11:18:06.277661	2025-08-29 11:18:06.277661
4729	894	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 11:18:09.381787	2025-08-29 11:18:09.381787
4730	894	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 11:18:13.887204	2025-08-29 11:18:13.887204
4731	895	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 11:18:18.41211	2025-08-29 11:18:18.41211
4732	895	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 11:18:22.814434	2025-08-29 11:18:22.814434
4733	896	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 11:18:26.825802	2025-08-29 11:18:26.825802
4734	896	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 11:18:48.684302	2025-08-29 11:18:48.684302
4735	886	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 11:18:48.684302	2025-08-29 11:18:48.684302
4736	935	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 11:21:46.449197	2025-08-29 11:21:46.449197
4737	936	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 11:24:45.198743	2025-08-29 11:24:45.198743
4738	937	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 11:29:39.774246	2025-08-29 11:29:39.774246
4739	936	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 11:32:00.977777	2025-08-29 11:32:00.977777
4740	937	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 12:48:57.683943	2025-08-29 12:48:57.683943
4741	939	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 13:34:45.134025	2025-08-29 13:34:45.134025
4742	939	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 13:36:10.050171	2025-08-29 13:36:10.050171
4743	940	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 13:38:00.662866	2025-08-29 13:38:00.662866
4744	940	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 13:39:58.683728	2025-08-29 13:39:58.683728
4745	941	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 13:47:04.005893	2025-08-29 13:47:04.005893
4746	941	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 13:49:23.970894	2025-08-29 13:49:23.970894
4747	942	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 13:52:25.896649	2025-08-29 13:52:25.896649
4748	942	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 13:53:55.929049	2025-08-29 13:53:55.929049
4749	943	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 13:56:25.6764	2025-08-29 13:56:25.6764
4750	873	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 13:57:18.163605	2025-08-29 13:57:18.163605
4751	860	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 13:57:31.833134	2025-08-29 13:57:31.833134
4752	944	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 13:58:14.439846	2025-08-29 13:58:14.439846
4753	943	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 14:00:00.613464	2025-08-29 14:00:00.613464
4754	945	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 14:02:48.776771	2025-08-29 14:02:48.776771
4755	944	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 14:03:59.584425	2025-08-29 14:03:59.584425
4756	945	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 14:08:14.247737	2025-08-29 14:08:14.247737
4757	947	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 14:08:42.33032	2025-08-29 14:08:42.33032
4758	948	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-29 23:53:16.888171	2025-08-29 23:53:16.888171
4759	949	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-30 01:18:56.11245	2025-08-30 01:18:56.11245
4760	950	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-30 01:26:26.887284	2025-08-30 01:26:26.887284
4761	950	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-30 01:31:00.53583	2025-08-30 01:31:00.53583
4762	950	completed	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-30 01:31:18.786662	2025-08-30 01:31:18.786662
4763	952	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-30 01:32:53.864849	2025-08-30 01:32:53.864849
4764	952	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-30 01:34:57.408164	2025-08-30 01:34:57.408164
4765	951	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-30 03:07:20.520179	2025-08-30 03:07:20.520179
4766	951	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-30 03:07:24.49567	2025-08-30 03:07:24.49567
4767	953	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-30 03:13:24.327533	2025-08-30 03:13:24.327533
4768	954	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-30 03:38:00.231148	2025-08-30 03:38:00.231148
4769	955	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-30 03:39:36.288781	2025-08-30 03:39:36.288781
4770	954	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-30 03:42:26.944645	2025-08-30 03:42:26.944645
4771	955	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-30 03:42:39.340568	2025-08-30 03:42:39.340568
4772	956	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-30 03:46:57.996187	2025-08-30 03:46:57.996187
4773	954	completed	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-30 03:48:27.145847	2025-08-30 03:48:27.145847
4774	957	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-30 03:49:18.878734	2025-08-30 03:49:18.878734
4775	957	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-30 03:51:46.359709	2025-08-30 03:51:46.359709
4776	954	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-30 03:51:46.359709	2025-08-30 03:51:46.359709
4777	958	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-30 03:51:52.171714	2025-08-30 03:51:52.171714
4778	958	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-30 03:55:04.251634	2025-08-30 03:55:04.251634
4779	954	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-30 03:55:04.251634	2025-08-30 03:55:04.251634
4780	949	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-30 03:56:01.610693	2025-08-30 03:56:01.610693
4781	956	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-30 03:58:02.174204	2025-08-30 03:58:02.174204
4782	957	completed	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-30 04:00:13.433313	2025-08-30 04:00:13.433313
4783	954	completed	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-30 04:00:13.433313	2025-08-30 04:00:13.433313
4784	949	completed	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-30 04:13:14.041089	2025-08-30 04:13:14.041089
4785	960	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-30 04:27:58.632543	2025-08-30 04:27:58.632543
4786	957	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-30 05:05:34.115361	2025-08-30 05:05:34.115361
4787	954	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-30 05:05:34.115361	2025-08-30 05:05:34.115361
4788	960	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-30 05:13:39.6663	2025-08-30 05:13:39.6663
4789	946	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-30 05:21:28.945998	2025-08-30 05:21:28.945998
4790	946	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-30 05:31:59.539123	2025-08-30 05:31:59.539123
4791	961	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-30 11:51:47.593856	2025-08-30 11:51:47.593856
4792	962	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-30 11:53:18.080721	2025-08-30 11:53:18.080721
4793	961	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-30 12:05:20.875677	2025-08-30 12:05:20.875677
4794	964	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-30 14:01:18.602818	2025-08-30 14:01:18.602818
4795	965	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-30 14:35:14.672122	2025-08-30 14:35:14.672122
4796	964	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-30 14:36:42.131747	2025-08-30 14:36:42.131747
4797	965	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-30 14:39:14.892307	2025-08-30 14:39:14.892307
4798	966	todo	planning	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-30 14:53:06.871983	2025-08-30 14:53:06.871983
4799	966	planning	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-30 14:53:11.908789	2025-08-30 14:53:11.908789
4800	983	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-30 23:43:36.114385	2025-08-30 23:43:36.114385
4801	984	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-31 00:42:58.798446	2025-08-31 00:42:58.798446
4802	984	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-31 00:48:13.466713	2025-08-31 00:48:13.466713
4803	996	todo	planning	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-31 00:52:19.307011	2025-08-31 00:52:19.307011
4804	996	planning	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-31 00:52:24.846356	2025-08-31 00:52:24.846356
4805	991	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-31 00:59:26.868456	2025-08-31 00:59:26.868456
4806	1004	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-31 01:03:39.782043	2025-08-31 01:03:39.782043
4807	1004	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-31 01:07:23.80775	2025-08-31 01:07:23.80775
4808	1010	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-31 01:11:33.983141	2025-08-31 01:11:33.983141
4809	991	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-31 01:36:26.988369	2025-08-31 01:36:26.988369
4810	1011	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-31 01:38:56.968374	2025-08-31 01:38:56.968374
4811	1012	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-31 01:40:28.422749	2025-08-31 01:40:28.422749
4812	1012	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-31 01:40:36.144174	2025-08-31 01:40:36.144174
4813	1014	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-31 01:48:04.691307	2025-08-31 01:48:04.691307
4814	1011	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-31 01:49:11.424915	2025-08-31 01:49:11.424915
4815	1014	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-31 01:52:24.621016	2025-08-31 01:52:24.621016
4816	1027	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-31 01:57:56.378442	2025-08-31 01:57:56.378442
4817	1020	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-31 01:58:19.403967	2025-08-31 01:58:19.403967
4818	1028	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-31 01:59:36.895062	2025-08-31 01:59:36.895062
4819	1028	in_progress	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-31 01:59:42.020996	2025-08-31 01:59:42.020996
4820	1020	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-31 02:06:14.194927	2025-08-31 02:06:14.194927
4821	1032	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-31 02:06:17.060545	2025-08-31 02:06:17.060545
4822	1027	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-31 02:20:11.951662	2025-08-31 02:20:11.951662
4823	1033	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-31 02:22:03.73976	2025-08-31 02:22:03.73976
4824	1033	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-31 02:27:27.583314	2025-08-31 02:27:27.583314
4825	1032	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-31 02:28:08.979414	2025-08-31 02:28:08.979414
4826	1037	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-31 02:48:58.571533	2025-08-31 02:48:58.571533
4827	1038	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-31 03:07:19.222824	2025-08-31 03:07:19.222824
4828	962	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-31 15:16:43.836895	2025-08-31 15:16:43.836895
4829	1055	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-31 20:36:20.690905	2025-08-31 20:36:20.690905
4830	1055	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-08-31 20:49:44.452432	2025-08-31 20:49:44.452432
4831	1056	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-01 04:59:59.567883	2025-09-01 04:59:59.567883
4832	1068	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-01 07:10:43.940077	2025-09-01 07:10:43.940077
4833	1063	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-01 07:10:43.940077	2025-09-01 07:10:43.940077
4834	1071	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-01 07:12:02.401651	2025-09-01 07:12:02.401651
4835	1069	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-01 07:26:02.701604	2025-09-01 07:26:02.701604
4836	1076	pending	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-01 13:57:55.103621	2025-09-01 13:57:55.103621
4837	1077	pending	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-01 14:04:29.601711	2025-09-01 14:04:29.601711
4838	1081	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-01 14:09:32.744711	2025-09-01 14:09:32.744711
4839	1081	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-01 14:16:37.845195	2025-09-01 14:16:37.845195
4840	1077	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-01 14:28:57.732683	2025-09-01 14:28:57.732683
4841	1076	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-01 14:28:57.732683	2025-09-01 14:28:57.732683
4842	1078	pending	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-01 14:46:43.159205	2025-09-01 14:46:43.159205
4843	1078	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-01 15:04:23.752273	2025-09-01 15:04:23.752273
4844	1079	pending	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-01 15:08:14.560936	2025-09-01 15:08:14.560936
4845	1080	pending	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-01 15:10:10.318435	2025-09-01 15:10:10.318435
4846	1082	todo	planning	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-01 15:23:48.623642	2025-09-01 15:23:48.623642
4847	1082	planning	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-01 15:24:10.832247	2025-09-01 15:24:10.832247
4848	1083	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-01 15:25:53.106382	2025-09-01 15:25:53.106382
4849	1079	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-01 15:28:10.229634	2025-09-01 15:28:10.229634
4850	1080	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-01 16:06:39.941673	2025-09-01 16:06:39.941673
4851	1076	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-01 16:06:39.941673	2025-09-01 16:06:39.941673
4852	1083	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-01 16:14:18.726389	2025-09-01 16:14:18.726389
4853	1082	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-01 16:14:18.726389	2025-09-01 16:14:18.726389
4854	1084	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-01 16:16:14.229443	2025-09-01 16:16:14.229443
4855	1084	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-01 16:21:57.712739	2025-09-01 16:21:57.712739
4856	1085	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-01 16:23:48.514179	2025-09-01 16:23:48.514179
4857	1085	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-01 16:29:47.919445	2025-09-01 16:29:47.919445
4858	1086	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-01 16:31:04.255028	2025-09-01 16:31:04.255028
4859	1086	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-01 16:37:04.675646	2025-09-01 16:37:04.675646
4860	1089	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-01 16:52:04.41786	2025-09-01 16:52:04.41786
4861	1089	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-01 16:56:29.945779	2025-09-01 16:56:29.945779
4862	1088	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-01 17:06:31.056122	2025-09-01 17:06:31.056122
4863	1069	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-01 23:09:12.415439	2025-09-01 23:09:12.415439
4864	1091	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-01 23:30:44.737552	2025-09-01 23:30:44.737552
4865	1091	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-01 23:30:58.59371	2025-09-01 23:30:58.59371
4866	1092	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-02 00:07:38.423281	2025-09-02 00:07:38.423281
4867	1092	in_progress	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-02 00:09:15.485462	2025-09-02 00:09:15.485462
4868	1093	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-02 00:09:29.386274	2025-09-02 00:09:29.386274
4869	1093	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-02 00:09:44.259571	2025-09-02 00:09:44.259571
4870	1092	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-02 00:09:44.259571	2025-09-02 00:09:44.259571
4871	1092	completed	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-02 00:13:35.158697	2025-09-02 00:13:35.158697
4872	1094	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-02 00:13:40.414935	2025-09-02 00:13:40.414935
4873	1094	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-02 00:17:55.308419	2025-09-02 00:17:55.308419
4874	1092	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-02 00:17:55.308419	2025-09-02 00:17:55.308419
4875	1096	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-02 14:00:10.911739	2025-09-02 14:00:10.911739
4876	1095	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-02 14:00:52.392488	2025-09-02 14:00:52.392488
4877	1096	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-02 14:05:22.506281	2025-09-02 14:05:22.506281
4878	1097	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-02 14:21:02.495415	2025-09-02 14:21:02.495415
4879	1100	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-02 14:42:16.448763	2025-09-02 14:42:16.448763
4880	1097	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-02 14:47:21.566192	2025-09-02 14:47:21.566192
4881	1101	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-02 14:51:59.072178	2025-09-02 14:51:59.072178
4882	1101	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-02 15:03:49.723167	2025-09-02 15:03:49.723167
4883	1102	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-02 15:10:38.780826	2025-09-02 15:10:38.780826
4884	1102	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-02 15:25:07.35714	2025-09-02 15:25:07.35714
4885	1103	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-02 15:28:05.960154	2025-09-02 15:28:05.960154
4886	1103	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-02 15:30:58.57283	2025-09-02 15:30:58.57283
4887	1098	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-02 15:34:09.982202	2025-09-02 15:34:09.982202
4888	1099	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-02 21:36:30.089967	2025-09-02 21:36:30.089967
4889	1110	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 00:57:37.037434	2025-09-03 00:57:37.037434
4890	1113	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 00:58:30.260405	2025-09-03 00:58:30.260405
4892	1113	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 00:58:30.374484	2025-09-03 00:58:30.374484
4893	1149	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 01:27:33.956371	2025-09-03 01:27:33.956371
4894	1151	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 01:27:42.101979	2025-09-03 01:27:42.101979
4895	1151	in_progress	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 01:27:50.215229	2025-09-03 01:27:50.215229
4896	1151	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 01:28:47.503738	2025-09-03 01:28:47.503738
4897	1151	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 01:30:10.603251	2025-09-03 01:30:10.603251
4900	1149	in_progress	on_hold	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 01:49:00.231801	2025-09-03 01:49:00.231801
4901	1149	on_hold	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 01:49:03.876039	2025-09-03 01:49:03.876039
4902	1155	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 02:36:22.905906	2025-09-03 02:36:22.905906
4903	1155	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 02:42:36.460109	2025-09-03 02:42:36.460109
4904	1156	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 02:47:11.364757	2025-09-03 02:47:11.364757
4905	1156	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 02:52:18.746552	2025-09-03 02:52:18.746552
4906	1154	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 02:55:26.678709	2025-09-03 02:55:26.678709
4907	1157	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 05:10:16.327591	2025-09-03 05:10:16.327591
4908	1157	in_progress	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 05:13:25.717755	2025-09-03 05:13:25.717755
4909	1157	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 05:14:01.583339	2025-09-03 05:14:01.583339
4910	1154	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 05:20:48.410763	2025-09-03 05:20:48.410763
4911	1160	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 05:25:08.996522	2025-09-03 05:25:08.996522
4912	1161	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 05:26:44.077275	2025-09-03 05:26:44.077275
4913	1160	in_progress	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 05:26:44.077275	2025-09-03 05:26:44.077275
4914	1161	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 05:30:37.260715	2025-09-03 05:30:37.260715
4915	1160	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 05:30:37.260715	2025-09-03 05:30:37.260715
4916	1162	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 05:31:18.703078	2025-09-03 05:31:18.703078
4917	1160	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 05:31:27.653969	2025-09-03 05:31:27.653969
4918	1162	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 05:48:46.810467	2025-09-03 05:48:46.810467
4919	1160	completed	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 05:48:46.810467	2025-09-03 05:48:46.810467
4920	1164	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 05:50:39.552693	2025-09-03 05:50:39.552693
4921	1164	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 05:57:41.589366	2025-09-03 05:57:41.589366
4922	1164	completed	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 06:10:37.524742	2025-09-03 06:10:37.524742
4923	1167	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 06:13:15.535756	2025-09-03 06:13:15.535756
4924	1167	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 06:17:05.977175	2025-09-03 06:17:05.977175
4925	1164	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 06:17:05.977175	2025-09-03 06:17:05.977175
4926	1171	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 07:14:23.076864	2025-09-03 07:14:23.076864
4927	1171	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 07:20:09.663942	2025-09-03 07:20:09.663942
4928	1166	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 07:31:04.714526	2025-09-03 07:31:04.714526
4929	1166	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 07:36:53.743421	2025-09-03 07:36:53.743421
4930	1149	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 08:10:19.448574	2025-09-03 08:10:19.448574
4931	1160	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 08:10:32.469437	2025-09-03 08:10:32.469437
4932	1164	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 08:37:42.617729	2025-09-03 08:37:42.617729
4933	1176	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 12:14:04.940963	2025-09-03 12:14:04.940963
4934	1175	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 12:16:21.19097	2025-09-03 12:16:21.19097
4935	1175	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 12:30:07.959048	2025-09-03 12:30:07.959048
4936	1175	completed	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 12:35:34.287288	2025-09-03 12:35:34.287288
4937	1177	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 12:41:20.440515	2025-09-03 12:41:20.440515
4938	1177	in_progress	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 13:05:17.315875	2025-09-03 13:05:17.315875
4939	1181	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 13:06:07.061355	2025-09-03 13:06:07.061355
4940	1181	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 13:48:46.89084	2025-09-03 13:48:46.89084
4941	1177	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 13:48:46.89084	2025-09-03 13:48:46.89084
4942	1175	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 13:48:46.89084	2025-09-03 13:48:46.89084
4943	1180		todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 13:54:42.622458	2025-09-03 13:54:42.622458
4944	1180	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 13:54:46.819	2025-09-03 13:54:46.819
4945	1179	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 13:55:11.905257	2025-09-03 13:55:11.905257
4946	1180	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 13:55:28.757999	2025-09-03 13:55:28.757999
4947	1179	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 13:55:31.310547	2025-09-03 13:55:31.310547
4948	1095	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 13:55:40.415711	2025-09-03 13:55:40.415711
4949	1177	completed	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 13:58:58.972941	2025-09-03 13:58:58.972941
4950	1175	completed	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 13:58:58.972941	2025-09-03 13:58:58.972941
4951	1182	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 13:59:18.524081	2025-09-03 13:59:18.524081
4952	1182	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 14:24:24.279629	2025-09-03 14:24:24.279629
4953	1177	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 14:24:24.279629	2025-09-03 14:24:24.279629
4954	1175	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 14:24:24.279629	2025-09-03 14:24:24.279629
4955	1177	completed	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 14:36:00.622783	2025-09-03 14:36:00.622783
4956	1175	completed	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 14:36:00.622783	2025-09-03 14:36:00.622783
4957	1184	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 14:37:34.383629	2025-09-03 14:37:34.383629
4958	1184	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 14:56:34.513881	2025-09-03 14:56:34.513881
4959	1177	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 14:56:34.513881	2025-09-03 14:56:34.513881
4960	1175	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 14:56:34.513881	2025-09-03 14:56:34.513881
4961	264	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 15:14:40.042071	2025-09-03 15:14:40.042071
4962	1041	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 15:14:59.413699	2025-09-03 15:14:59.413699
4963	1039	todo	cancelled	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 15:15:05.075326	2025-09-03 15:15:05.075326
4964	1105	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 15:15:29.173673	2025-09-03 15:15:29.173673
4965	1183	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 15:15:36.726302	2025-09-03 15:15:36.726302
4966	1177	completed	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 15:30:04.029561	2025-09-03 15:30:04.029561
4967	1175	completed	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 15:30:04.029561	2025-09-03 15:30:04.029561
4968	1185	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 15:30:23.738499	2025-09-03 15:30:23.738499
4969	1185	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 15:42:53.264929	2025-09-03 15:42:53.264929
4970	1177	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 15:42:53.264929	2025-09-03 15:42:53.264929
4971	1175	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 15:42:53.264929	2025-09-03 15:42:53.264929
4972	1186	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 15:55:29.766428	2025-09-03 15:55:29.766428
4973	1189	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 15:57:07.51003	2025-09-03 15:57:07.51003
4974	1189	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 16:03:18.828903	2025-09-03 16:03:18.828903
4975	1186	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 16:08:28.296527	2025-09-03 16:08:28.296527
4976	1177	completed	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 23:57:19.528607	2025-09-03 23:57:19.528607
4977	1175	completed	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-03 23:57:19.528607	2025-09-03 23:57:19.528607
4978	1191	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-04 00:02:50.798417	2025-09-04 00:02:50.798417
4979	1191	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-04 00:03:42.556869	2025-09-04 00:03:42.556869
4980	1190	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-04 00:19:00.195215	2025-09-04 00:19:00.195215
4981	1190	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-04 00:26:56.601696	2025-09-04 00:26:56.601696
4982	1177	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-04 00:26:56.601696	2025-09-04 00:26:56.601696
4983	1175	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-04 00:26:56.601696	2025-09-04 00:26:56.601696
4984	1192	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-04 00:33:09.093714	2025-09-04 00:33:09.093714
4985	1192	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-04 00:34:22.474945	2025-09-04 00:34:22.474945
4986	1193	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-04 00:47:41.586481	2025-09-04 00:47:41.586481
4987	1193	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-04 00:52:09.68294	2025-09-04 00:52:09.68294
4988	1194	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-04 00:56:38.018564	2025-09-04 00:56:38.018564
4989	1196	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-04 05:57:45.306791	2025-09-04 05:57:45.306791
4990	1196	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-04 06:03:06.218211	2025-09-04 06:03:06.218211
4991	1195	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-04 06:03:06.218211	2025-09-04 06:03:06.218211
4992	1196	completed	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-04 06:31:37.952983	2025-09-04 06:31:37.952983
4993	1195	in_progress	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-04 06:31:37.952983	2025-09-04 06:31:37.952983
4994	1198	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-04 06:31:51.63993	2025-09-04 06:31:51.63993
4995	1198	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-04 06:37:55.149596	2025-09-04 06:37:55.149596
4996	1196	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-04 06:37:55.149596	2025-09-04 06:37:55.149596
4997	1195	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-04 06:37:55.149596	2025-09-04 06:37:55.149596
4998	1197	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-04 07:21:31.347352	2025-09-04 07:21:31.347352
4999	1197	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-04 07:27:26.61228	2025-09-04 07:27:26.61228
5000	1195	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-04 07:27:26.61228	2025-09-04 07:27:26.61228
5001	1199	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-04 07:42:30.484014	2025-09-04 07:42:30.484014
5002	1200	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-04 08:02:58.883383	2025-09-04 08:02:58.883383
5003	1200	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-04 08:07:21.785913	2025-09-04 08:07:21.785913
5004	1201	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-04 14:18:36.789211	2025-09-04 14:18:36.789211
5005	1201	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-04 21:46:33.536336	2025-09-04 21:46:33.536336
5006	1202	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-04 21:51:12.860294	2025-09-04 21:51:12.860294
5007	1203	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-04 22:04:17.943575	2025-09-04 22:04:17.943575
5008	1204	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-04 22:25:27.547114	2025-09-04 22:25:27.547114
5009	1204	in_progress	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-04 22:26:21.119851	2025-09-04 22:26:21.119851
5010	1206	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-04 22:26:33.850314	2025-09-04 22:26:33.850314
5011	1206	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-04 22:30:00.533935	2025-09-04 22:30:00.533935
5012	1204	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-04 22:30:00.533935	2025-09-04 22:30:00.533935
5013	1207	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-04 22:38:36.690683	2025-09-04 22:38:36.690683
5014	1205	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-04 22:55:36.767148	2025-09-04 22:55:36.767148
5015	1205	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-04 23:02:10.357943	2025-09-04 23:02:10.357943
5016	1209	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-04 23:44:25.803851	2025-09-04 23:44:25.803851
5017	1209	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-04 23:47:01.26912	2025-09-04 23:47:01.26912
5018	1208	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-04 23:47:01.26912	2025-09-04 23:47:01.26912
5019	1210	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-04 23:49:53.347542	2025-09-04 23:49:53.347542
5020	1210	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-04 23:58:41.856761	2025-09-04 23:58:41.856761
5021	1211	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-04 23:58:46.932548	2025-09-04 23:58:46.932548
5022	1211	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 00:02:47.952746	2025-09-05 00:02:47.952746
5023	1212	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 00:02:53.208959	2025-09-05 00:02:53.208959
5024	1212	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 00:08:12.163409	2025-09-05 00:08:12.163409
5025	1213	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 00:08:17.952365	2025-09-05 00:08:17.952365
5026	1213	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 00:15:00.04049	2025-09-05 00:15:00.04049
5027	1208	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 00:15:00.04049	2025-09-05 00:15:00.04049
5028	1214	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 00:22:59.713037	2025-09-05 00:22:59.713037
5029	1214	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 00:33:10.370865	2025-09-05 00:33:10.370865
5030	1216	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 00:42:19.000623	2025-09-05 00:42:19.000623
5031	1216	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 00:45:39.87849	2025-09-05 00:45:39.87849
5032	1215	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 00:45:39.87849	2025-09-05 00:45:39.87849
5033	1217	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 00:45:45.076874	2025-09-05 00:45:45.076874
5034	1217	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 00:49:10.634657	2025-09-05 00:49:10.634657
5035	1218	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 00:49:16.163559	2025-09-05 00:49:16.163559
5036	1218	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 00:54:39.266475	2025-09-05 00:54:39.266475
5037	1219	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 00:54:45.506704	2025-09-05 00:54:45.506704
5038	1219	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 01:28:39.840212	2025-09-05 01:28:39.840212
5039	1215	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 01:28:39.840212	2025-09-05 01:28:39.840212
5040	1220	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 04:26:34.037107	2025-09-05 04:26:34.037107
5041	1220	in_progress	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 04:32:05.206427	2025-09-05 04:32:05.206427
5042	1220	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 04:34:08.457731	2025-09-05 04:34:08.457731
5043	1222	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 04:37:03.049484	2025-09-05 04:37:03.049484
5044	1220	completed	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 04:37:03.049484	2025-09-05 04:37:03.049484
5045	1223	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 04:52:08.575405	2025-09-05 04:52:08.575405
5046	1238	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 06:02:45.152221	2025-09-05 06:02:45.152221
5047	1221	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 06:35:51.237704	2025-09-05 06:35:51.237704
5048	1228	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 06:36:21.601162	2025-09-05 06:36:21.601162
5049	1221	in_progress	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 06:36:21.601162	2025-09-05 06:36:21.601162
5050	1228	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 06:39:19.138421	2025-09-05 06:39:19.138421
5051	1226	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 06:39:19.138421	2025-09-05 06:39:19.138421
5052	1229	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 06:39:27.702234	2025-09-05 06:39:27.702234
5053	1229	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 06:41:20.119704	2025-09-05 06:41:20.119704
5054	1230	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 06:41:30.862574	2025-09-05 06:41:30.862574
5055	1230	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 06:44:15.139674	2025-09-05 06:44:15.139674
5056	1226	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 06:44:15.139674	2025-09-05 06:44:15.139674
5057	1221	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 06:44:15.139674	2025-09-05 06:44:15.139674
5058	1227	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 06:50:57.582341	2025-09-05 06:50:57.582341
5059	1231	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 06:51:07.143688	2025-09-05 06:51:07.143688
5060	1227	in_progress	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 06:51:07.143688	2025-09-05 06:51:07.143688
5061	1227	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 06:54:29.366536	2025-09-05 06:54:29.366536
5062	1227	in_progress	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 07:01:28.937714	2025-09-05 07:01:28.937714
5063	1244	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 07:01:36.421485	2025-09-05 07:01:36.421485
5064	1227	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 07:01:36.421485	2025-09-05 07:01:36.421485
5065	1245	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 07:02:16.776035	2025-09-05 07:02:16.776035
5066	1223	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 07:05:33.323608	2025-09-05 07:05:33.323608
5067	1220	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 07:05:33.323608	2025-09-05 07:05:33.323608
5068	1224	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 07:06:06.846189	2025-09-05 07:06:06.846189
5069	1224	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 07:06:15.758732	2025-09-05 07:06:15.758732
5070	1225	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 07:06:22.453651	2025-09-05 07:06:22.453651
5071	1248	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 07:12:59.100148	2025-09-05 07:12:59.100148
5072	1249	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 07:13:15.202032	2025-09-05 07:13:15.202032
5073	1249	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 07:24:20.135657	2025-09-05 07:24:20.135657
5074	1235	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 07:26:57.707921	2025-09-05 07:26:57.707921
5075	1235	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 07:33:53.711552	2025-09-05 07:33:53.711552
5076	1236	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 07:39:56.358716	2025-09-05 07:39:56.358716
5077	1235	completed	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 07:39:56.358716	2025-09-05 07:39:56.358716
5078	1249	completed	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 07:42:58.314879	2025-09-05 07:42:58.314879
5079	1253	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 07:43:16.107309	2025-09-05 07:43:16.107309
5080	1252	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 07:43:43.893143	2025-09-05 07:43:43.893143
5081	1249	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 07:43:43.893143	2025-09-05 07:43:43.893143
5082	1254	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 07:43:55.577746	2025-09-05 07:43:55.577746
5083	1255	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 07:44:06.285726	2025-09-05 07:44:06.285726
5084	1256	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 07:44:25.419114	2025-09-05 07:44:25.419114
5085	1249	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 07:44:25.419114	2025-09-05 07:44:25.419114
5086	1225	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 08:15:23.436511	2025-09-05 08:15:23.436511
5087	1220	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 08:17:18.492531	2025-09-05 08:17:18.492531
5088	1237	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 08:39:47.914537	2025-09-05 08:39:47.914537
5089	1236	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 08:43:25.825794	2025-09-05 08:43:25.825794
5090	1235	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 08:43:25.825794	2025-09-05 08:43:25.825794
5091	1237	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 09:01:18.883641	2025-09-05 09:01:18.883641
5092	1235	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 09:01:18.883641	2025-09-05 09:01:18.883641
5093	1221	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 09:06:27.602722	2025-09-05 09:06:27.602722
5094	1239	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 09:11:27.358456	2025-09-05 09:11:27.358456
5095	1221	completed	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 09:11:27.358456	2025-09-05 09:11:27.358456
5096	1239	in_progress	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 09:11:44.978908	2025-09-05 09:11:44.978908
5097	1258	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 09:12:28.043809	2025-09-05 09:12:28.043809
5098	1258	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 09:20:13.249528	2025-09-05 09:20:13.249528
5099	1239	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 09:20:13.249528	2025-09-05 09:20:13.249528
5100	1259	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 09:20:25.103444	2025-09-05 09:20:25.103444
5101	1259	in_progress	on_hold	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 09:22:44.699164	2025-09-05 09:22:44.699164
5102	1240	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 09:23:45.150908	2025-09-05 09:23:45.150908
5103	1240	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 09:31:13.283788	2025-09-05 09:31:13.283788
5104	1241	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 09:32:58.971306	2025-09-05 09:32:58.971306
5105	1241	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 09:44:05.264062	2025-09-05 09:44:05.264062
5106	1243	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 09:46:37.814975	2025-09-05 09:46:37.814975
5107	1253	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 09:51:03.347078	2025-09-05 09:51:03.347078
5108	1243	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 10:20:37.688026	2025-09-05 10:20:37.688026
5109	1242	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 11:08:57.431015	2025-09-05 11:08:57.431015
5110	1262	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 11:49:47.708039	2025-09-05 11:49:47.708039
5111	1269	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 12:13:42.485868	2025-09-05 12:13:42.485868
5112	1269	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 12:18:33.141819	2025-09-05 12:18:33.141819
5113	1264	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 12:18:33.141819	2025-09-05 12:18:33.141819
5114	1270	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 12:19:44.361857	2025-09-05 12:19:44.361857
5115	1270	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 12:23:29.272038	2025-09-05 12:23:29.272038
5116	1271	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 12:24:40.092346	2025-09-05 12:24:40.092346
5117	1271	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 12:25:57.40797	2025-09-05 12:25:57.40797
5118	1272	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 12:26:59.607155	2025-09-05 12:26:59.607155
5119	1272	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 12:30:36.572974	2025-09-05 12:30:36.572974
5120	1264	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 12:30:36.572974	2025-09-05 12:30:36.572974
5121	1263	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 12:30:36.572974	2025-09-05 12:30:36.572974
5122	1265	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 12:59:42.806768	2025-09-05 12:59:42.806768
5123	1273	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 13:04:04.431356	2025-09-05 13:04:04.431356
5124	1265	in_progress	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 13:04:04.431356	2025-09-05 13:04:04.431356
5125	1274	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 13:05:08.018072	2025-09-05 13:05:08.018072
5126	1274	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 13:12:46.277719	2025-09-05 13:12:46.277719
5127	1275	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 13:33:57.139457	2025-09-05 13:33:57.139457
5128	1275	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 13:44:10.930261	2025-09-05 13:44:10.930261
5129	1276	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 13:48:43.910728	2025-09-05 13:48:43.910728
5130	1041	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 13:54:43.127382	2025-09-05 13:54:43.127382
5131	1040	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 13:54:44.774306	2025-09-05 13:54:44.774306
5132	1276	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 15:03:36.320244	2025-09-05 15:03:36.320244
5133	1285	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 21:51:32.548688	2025-09-05 21:51:32.548688
5134	1285	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 21:54:07.218778	2025-09-05 21:54:07.218778
5135	1305	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 22:21:52.390644	2025-09-05 22:21:52.390644
5136	1305	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 22:23:41.227427	2025-09-05 22:23:41.227427
5137	1305	completed	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 22:28:26.975736	2025-09-05 22:28:26.975736
5138	1312	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 22:32:03.757828	2025-09-05 22:32:03.757828
5139	1313	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 22:32:08.040478	2025-09-05 22:32:08.040478
5140	1312	in_progress	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 22:32:08.040478	2025-09-05 22:32:08.040478
5141	1313	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 22:35:36.965335	2025-09-05 22:35:36.965335
5142	1312	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 22:35:36.965335	2025-09-05 22:35:36.965335
5143	1314	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 22:35:41.466528	2025-09-05 22:35:41.466528
5144	1314	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 22:37:25.984036	2025-09-05 22:37:25.984036
5145	1312	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 22:37:25.984036	2025-09-05 22:37:25.984036
5146	1305	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 22:37:25.984036	2025-09-05 22:37:25.984036
5147	1315	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 22:39:57.649014	2025-09-05 22:39:57.649014
5148	1316	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 22:40:23.220057	2025-09-05 22:40:23.220057
5149	1315	in_progress	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 22:40:23.220057	2025-09-05 22:40:23.220057
5150	1316	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 22:45:57.208301	2025-09-05 22:45:57.208301
5151	1315	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 22:45:57.208301	2025-09-05 22:45:57.208301
5152	1317	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 22:46:01.264436	2025-09-05 22:46:01.264436
5153	1317	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 22:48:34.436188	2025-09-05 22:48:34.436188
5154	1318	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 22:48:38.824009	2025-09-05 22:48:38.824009
5155	1319	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 22:56:50.231189	2025-09-05 22:56:50.231189
5156	1320	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 22:56:53.598351	2025-09-05 22:56:53.598351
5157	1319	in_progress	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 22:56:53.598351	2025-09-05 22:56:53.598351
5158	1320	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 22:59:56.754225	2025-09-05 22:59:56.754225
5159	1319	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 22:59:56.754225	2025-09-05 22:59:56.754225
5160	1321	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 23:00:00.10626	2025-09-05 23:00:00.10626
5161	1321	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 23:02:54.432158	2025-09-05 23:02:54.432158
5162	1322	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 23:02:58.607955	2025-09-05 23:02:58.607955
5163	1322	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 23:10:43.340268	2025-09-05 23:10:43.340268
5164	1319	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 23:10:43.340268	2025-09-05 23:10:43.340268
5165	1318	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 23:17:13.967171	2025-09-05 23:17:13.967171
5166	1315	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 23:17:13.967171	2025-09-05 23:17:13.967171
5167	1305	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 23:17:13.967171	2025-09-05 23:17:13.967171
5168	1323	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 23:20:37.581475	2025-09-05 23:20:37.581475
5169	1323	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 23:23:31.173908	2025-09-05 23:23:31.173908
5170	1288	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 23:32:50.457302	2025-09-05 23:32:50.457302
5171	1288	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 23:45:18.255128	2025-09-05 23:45:18.255128
5172	1287	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 23:45:18.255128	2025-09-05 23:45:18.255128
5173	1289	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 23:46:49.030602	2025-09-05 23:46:49.030602
5174	1289	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 23:54:03.546713	2025-09-05 23:54:03.546713
5175	1290	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 23:56:19.102161	2025-09-05 23:56:19.102161
5176	1324	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-05 23:58:50.367358	2025-09-05 23:58:50.367358
5177	1290	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 00:01:07.39813	2025-09-06 00:01:07.39813
5178	1324	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 00:01:54.51309	2025-09-06 00:01:54.51309
5179	1291	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 00:01:55.992806	2025-09-06 00:01:55.992806
5180	1291	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 00:04:01.172551	2025-09-06 00:04:01.172551
5181	1287	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 00:04:01.172551	2025-09-06 00:04:01.172551
5182	1292	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 00:09:35.21324	2025-09-06 00:09:35.21324
5183	1292	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 00:31:43.167498	2025-09-06 00:31:43.167498
5184	1293	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 00:41:53.421794	2025-09-06 00:41:53.421794
5185	1292	completed	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 00:41:53.421794	2025-09-06 00:41:53.421794
5186	1293	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 00:42:07.669097	2025-09-06 00:42:07.669097
5187	1292	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 00:42:07.669097	2025-09-06 00:42:07.669097
5188	1294	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 06:58:30.111431	2025-09-06 06:58:30.111431
5189	1325	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 07:00:02.331527	2025-09-06 07:00:02.331527
5190	1294	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 07:03:54.965699	2025-09-06 07:03:54.965699
5191	1295	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 07:14:22.320016	2025-09-06 07:14:22.320016
5192	1325	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 10:33:03.285402	2025-09-06 10:33:03.285402
5193	1295	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 10:33:18.464882	2025-09-06 10:33:18.464882
5194	1292	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 10:33:18.464882	2025-09-06 10:33:18.464882
5195	1296	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 10:45:19.350613	2025-09-06 10:45:19.350613
5196	1296	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 10:55:05.187836	2025-09-06 10:55:05.187836
5197	1297	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 10:58:52.584391	2025-09-06 10:58:52.584391
5198	1296	completed	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 10:58:52.584391	2025-09-06 10:58:52.584391
5199	1297	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 11:05:36.198511	2025-09-06 11:05:36.198511
5200	1296	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 11:05:36.198511	2025-09-06 11:05:36.198511
5201	1298	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 11:10:33.452905	2025-09-06 11:10:33.452905
5202	1298	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 11:32:47.096338	2025-09-06 11:32:47.096338
5203	1299	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 11:33:43.211459	2025-09-06 11:33:43.211459
5204	1299	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 11:41:22.076566	2025-09-06 11:41:22.076566
5205	1300	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 11:42:38.331868	2025-09-06 11:42:38.331868
5206	1326	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 11:46:39.237535	2025-09-06 11:46:39.237535
5207	1326	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 11:57:26.16612	2025-09-06 11:57:26.16612
5208	1301	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 12:35:26.435364	2025-09-06 12:35:26.435364
5209	1301	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 12:46:27.963647	2025-09-06 12:46:27.963647
5210	1302	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 12:48:09.787944	2025-09-06 12:48:09.787944
5211	1301	completed	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 12:48:09.787944	2025-09-06 12:48:09.787944
5212	1302	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 13:05:05.063785	2025-09-06 13:05:05.063785
5213	1301	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 13:05:05.063785	2025-09-06 13:05:05.063785
5214	1303	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 13:07:09.741598	2025-09-06 13:07:09.741598
5215	1327	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 13:13:20.333502	2025-09-06 13:13:20.333502
5216	1327	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 13:23:35.063626	2025-09-06 13:23:35.063626
5217	1303	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 13:36:11.964147	2025-09-06 13:36:11.964147
5218	1301	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 13:36:11.964147	2025-09-06 13:36:11.964147
5219	1304	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 14:24:12.608803	2025-09-06 14:24:12.608803
5220	1304	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 15:20:29.256268	2025-09-06 15:20:29.256268
5221	1306	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 15:22:38.370915	2025-09-06 15:22:38.370915
5222	1304	completed	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 15:22:38.370915	2025-09-06 15:22:38.370915
5223	1307	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 15:38:26.864086	2025-09-06 15:38:26.864086
5224	1307	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 16:10:33.514337	2025-09-06 16:10:33.514337
5225	1304	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 16:10:33.514337	2025-09-06 16:10:33.514337
5226	1309	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-06 16:26:48.16742	2025-09-06 16:26:48.16742
5227	1309	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:22:20.889833	2025-09-07 00:22:20.889833
5228	1308	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:22:20.889833	2025-09-07 00:22:20.889833
5229	1310	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:23:43.872575	2025-09-07 00:23:43.872575
5230	1328	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:27:06.829683	2025-09-07 00:27:06.829683
5231	1328	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:31:23.390482	2025-09-07 00:31:23.390482
5232	1310	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:38:37.298004	2025-09-07 00:38:37.298004
5233	1311	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:42:43.742897	2025-09-07 00:42:43.742897
5234	1328	completed	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:45:16.862118	2025-09-07 00:45:16.862118
5235	1328	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:06.100677	2025-09-07 00:48:06.100677
5236	1311	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:06.12011	2025-09-07 00:48:06.12011
5237	1308	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:06.12011	2025-09-07 00:48:06.12011
5238	1300	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:06.132	2025-09-07 00:48:06.132
5239	1296	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:06.132	2025-09-07 00:48:06.132
5240	1263	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:06.142576	2025-09-07 00:48:06.142576
5241	1273	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:06.148376	2025-09-07 00:48:06.148376
5242	1265	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:06.148376	2025-09-07 00:48:06.148376
5243	1263	completed	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:06.148376	2025-09-07 00:48:06.148376
5244	1238	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:06.154736	2025-09-07 00:48:06.154736
5245	1222	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:06.159122	2025-09-07 00:48:06.159122
5246	1204	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:06.16594	2025-09-07 00:48:06.16594
5247	1207	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:06.169867	2025-09-07 00:48:06.169867
5248	1194	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:06.175938	2025-09-07 00:48:06.175938
5249	1106	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:06.183015	2025-09-07 00:48:06.183015
5250	1099	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:06.18864	2025-09-07 00:48:06.18864
5251	1095	completed	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:06.18864	2025-09-07 00:48:06.18864
5252	1098	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:06.193486	2025-09-07 00:48:06.193486
5253	1095	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:06.193486	2025-09-07 00:48:06.193486
5254	1100	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:06.198115	2025-09-07 00:48:06.198115
5255	1082	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:06.201684	2025-09-07 00:48:06.201684
5256	1038	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:06.206586	2025-09-07 00:48:06.206586
5257	1037	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:06.210084	2025-09-07 00:48:06.210084
5258	1010	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:06.214496	2025-09-07 00:48:06.214496
5259	1330	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:06.2257	2025-09-07 00:48:06.2257
5260	1330	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:20.406138	2025-09-07 00:48:20.406138
5261	1263	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:20.410184	2025-09-07 00:48:20.410184
5262	983	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:20.414314	2025-09-07 00:48:20.414314
5263	950	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:20.421536	2025-09-07 00:48:20.421536
5264	947	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:20.426146	2025-09-07 00:48:20.426146
5265	880	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:20.433684	2025-09-07 00:48:20.433684
5266	875	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:20.440769	2025-09-07 00:48:20.440769
5267	910	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:20.44866	2025-09-07 00:48:20.44866
5268	875	completed	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:20.44866	2025-09-07 00:48:20.44866
5269	861	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:20.45363	2025-09-07 00:48:20.45363
5270	860	completed	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:20.45363	2025-09-07 00:48:20.45363
5271	520	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:20.459364	2025-09-07 00:48:20.459364
5272	842	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:20.46418	2025-09-07 00:48:20.46418
5273	815	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:20.46418	2025-09-07 00:48:20.46418
5274	814	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:20.47028	2025-09-07 00:48:20.47028
5275	808	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:20.474921	2025-09-07 00:48:20.474921
5276	359	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:20.48056	2025-09-07 00:48:20.48056
5277	387	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:20.485223	2025-09-07 00:48:20.485223
5278	371	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:20.488543	2025-09-07 00:48:20.488543
5279	387	completed	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:20.488543	2025-09-07 00:48:20.488543
5280	368	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:20.492967	2025-09-07 00:48:20.492967
5281	801	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:20.498184	2025-09-07 00:48:20.498184
5282	601	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:20.501565	2025-09-07 00:48:20.501565
5283	598	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:20.505574	2025-09-07 00:48:20.505574
5284	1331	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:48:20.518081	2025-09-07 00:48:20.518081
5285	1332	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:53:41.933219	2025-09-07 00:53:41.933219
5286	1332	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 00:57:24.048698	2025-09-07 00:57:24.048698
5287	1332	completed	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 01:01:49.243867	2025-09-07 01:01:49.243867
5288	1333	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 01:02:23.642076	2025-09-07 01:02:23.642076
5289	1332	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 01:02:26.296839	2025-09-07 01:02:26.296839
5290	1333	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 01:04:43.326415	2025-09-07 01:04:43.326415
5291	1334	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 01:05:05.092215	2025-09-07 01:05:05.092215
5292	1286	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 01:05:10.471696	2025-09-07 01:05:10.471696
5293	1334	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 01:05:26.387895	2025-09-07 01:05:26.387895
5294	1335	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 01:05:43.312441	2025-09-07 01:05:43.312441
5295	1337	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 01:08:04.081865	2025-09-07 01:08:04.081865
5296	1335	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 01:09:47.325595	2025-09-07 01:09:47.325595
5297	1336	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 01:10:10.744451	2025-09-07 01:10:10.744451
5298	1336	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 01:15:51.751469	2025-09-07 01:15:51.751469
5299	1332	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 01:15:51.751469	2025-09-07 01:15:51.751469
5300	1337	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 01:21:30.884703	2025-09-07 01:21:30.884703
5301	1344	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 01:47:18.718522	2025-09-07 01:47:18.718522
5302	1344	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 01:58:37.798109	2025-09-07 01:58:37.798109
5303	1345	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 02:07:03.580148	2025-09-07 02:07:03.580148
5304	1346	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 02:12:12.282352	2025-09-07 02:12:12.282352
5305	1345	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 02:16:41.777546	2025-09-07 02:16:41.777546
5306	1346	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 02:23:24.125814	2025-09-07 02:23:24.125814
5307	1346	completed	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 02:24:59.942772	2025-09-07 02:24:59.942772
5308	1346	in_progress	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 02:53:18.024786	2025-09-07 02:53:18.024786
5309	1366	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 03:11:05.886171	2025-09-07 03:11:05.886171
5310	1366	in_progress	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 03:11:06.20133	2025-09-07 03:11:06.20133
5311	1367	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 03:13:30.512712	2025-09-07 03:13:30.512712
5312	1348	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 03:13:55.750301	2025-09-07 03:13:55.750301
5313	1367	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 03:19:36.909512	2025-09-07 03:19:36.909512
5314	1366	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 03:19:36.909512	2025-09-07 03:19:36.909512
5315	1368	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 03:26:34.097483	2025-09-07 03:26:34.097483
5316	1368	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 03:31:36.313623	2025-09-07 03:31:36.313623
5317	1369	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 03:32:08.514907	2025-09-07 03:32:08.514907
5318	1348	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 03:32:30.284061	2025-09-07 03:32:30.284061
5319	1347	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 03:32:30.284061	2025-09-07 03:32:30.284061
5320	1349	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 03:40:12.213866	2025-09-07 03:40:12.213866
5321	1369	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 03:45:14.709277	2025-09-07 03:45:14.709277
5322	1370	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 03:47:30.505531	2025-09-07 03:47:30.505531
5323	1349	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 03:50:46.734773	2025-09-07 03:50:46.734773
5324	1370	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 04:14:21.07549	2025-09-07 04:14:21.07549
5325	1350	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 04:23:47.245103	2025-09-07 04:23:47.245103
5326	1371	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 04:25:22.707577	2025-09-07 04:25:22.707577
5327	1350	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 04:50:47.599282	2025-09-07 04:50:47.599282
5328	1351	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 04:56:00.309143	2025-09-07 04:56:00.309143
5329	1371	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 05:08:25.643058	2025-09-07 05:08:25.643058
5330	1366	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 05:08:25.643058	2025-09-07 05:08:25.643058
5331	1351	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 05:33:51.626261	2025-09-07 05:33:51.626261
5332	1347	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 05:33:51.626261	2025-09-07 05:33:51.626261
5333	1346	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 05:33:51.626261	2025-09-07 05:33:51.626261
5334	1352	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 05:52:15.948422	2025-09-07 05:52:15.948422
5335	1352	in_progress	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 05:58:39.149557	2025-09-07 05:58:39.149557
5336	1352	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 06:01:36.542059	2025-09-07 06:01:36.542059
5337	1372	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 06:07:54.672537	2025-09-07 06:07:54.672537
5338	1352	completed	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 06:07:54.672537	2025-09-07 06:07:54.672537
5339	1375	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 06:15:49.540964	2025-09-07 06:15:49.540964
5340	1375	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 06:28:31.715479	2025-09-07 06:28:31.715479
5341	1376	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 06:37:17.916117	2025-09-07 06:37:17.916117
5342	1372	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 06:46:09.251954	2025-09-07 06:46:09.251954
5343	1352	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 06:46:09.251954	2025-09-07 06:46:09.251954
5344	1373	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 06:51:38.058889	2025-09-07 06:51:38.058889
5345	1376	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 07:05:44.360266	2025-09-07 07:05:44.360266
5346	1373	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 07:50:20.78174	2025-09-07 07:50:20.78174
5347	1374	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 07:55:31.556505	2025-09-07 07:55:31.556505
5348	1374	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 08:43:47.94278	2025-09-07 08:43:47.94278
5349	1352	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 08:43:47.94278	2025-09-07 08:43:47.94278
5350	1358	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 08:45:34.03552	2025-09-07 08:45:34.03552
5351	1358	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 09:07:43.594899	2025-09-07 09:07:43.594899
5352	1357	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 09:07:43.594899	2025-09-07 09:07:43.594899
5353	1359	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 09:18:10.768886	2025-09-07 09:18:10.768886
5354	1359	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 09:51:30.148273	2025-09-07 09:51:30.148273
5355	1360	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 09:53:45.509927	2025-09-07 09:53:45.509927
5356	1360	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 10:17:07.365293	2025-09-07 10:17:07.365293
5357	1357	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 10:17:07.365293	2025-09-07 10:17:07.365293
5358	1346	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 10:17:07.365293	2025-09-07 10:17:07.365293
5359	1377	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 10:46:49.846947	2025-09-07 10:46:49.846947
5360	1377	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 10:56:45.220449	2025-09-07 10:56:45.220449
5361	1378	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 11:12:33.634876	2025-09-07 11:12:33.634876
5362	1380	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 11:25:28.193589	2025-09-07 11:25:28.193589
5363	1379	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 11:28:05.962795	2025-09-07 11:28:05.962795
5364	1380	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 11:42:43.772929	2025-09-07 11:42:43.772929
5365	1379	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 11:49:18.639826	2025-09-07 11:49:18.639826
5366	1378	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 11:53:45.848664	2025-09-07 11:53:45.848664
5367	1381	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 11:58:42.721323	2025-09-07 11:58:42.721323
5368	1381	in_progress	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 12:03:42.963452	2025-09-07 12:03:42.963452
5369	1390	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 12:13:57.255962	2025-09-07 12:13:57.255962
5370	1381	todo	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 12:23:08.386335	2025-09-07 12:23:08.386335
5371	1390	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 12:24:10.638819	2025-09-07 12:24:10.638819
5372	1383	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 12:27:29.657292	2025-09-07 12:27:29.657292
5373	1381	completed	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 12:27:29.657292	2025-09-07 12:27:29.657292
5374	1394	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 19:06:03.209532	2025-09-07 19:06:03.209532
5375	1394	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 19:14:41.877875	2025-09-07 19:14:41.877875
5376	1394	completed	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 19:18:32.722742	2025-09-07 19:18:32.722742
5377	1399	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 19:27:15.51811	2025-09-07 19:27:15.51811
5378	1399	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 19:33:45.754431	2025-09-07 19:33:45.754431
5379	1395	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 19:33:45.754431	2025-09-07 19:33:45.754431
5380	1400	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 19:39:53.624831	2025-09-07 19:39:53.624831
5381	1400	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 19:51:40.602359	2025-09-07 19:51:40.602359
5382	1401	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 19:53:33.011095	2025-09-07 19:53:33.011095
5383	1401	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 20:27:26.858883	2025-09-07 20:27:26.858883
5384	1395	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 20:27:26.858883	2025-09-07 20:27:26.858883
5385	1394	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 20:27:26.858883	2025-09-07 20:27:26.858883
5386	1402	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 20:29:48.848241	2025-09-07 20:29:48.848241
5387	1402	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 20:42:39.611522	2025-09-07 20:42:39.611522
5388	1396	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 20:42:39.611522	2025-09-07 20:42:39.611522
5389	1403	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 20:54:38.988463	2025-09-07 20:54:38.988463
5390	1403	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 21:20:29.764099	2025-09-07 21:20:29.764099
5391	1404	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 21:22:54.939061	2025-09-07 21:22:54.939061
5392	1404	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 22:46:08.646971	2025-09-07 22:46:08.646971
5393	1396	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 22:46:08.646971	2025-09-07 22:46:08.646971
5394	1412	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-07 22:55:27.289263	2025-09-07 22:55:27.289263
5395	1413	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-08 00:33:56.888591	2025-09-08 00:33:56.888591
5396	1412	in_progress	todo	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-08 00:33:56.888591	2025-09-08 00:33:56.888591
5397	1413	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-08 00:45:37.600589	2025-09-08 00:45:37.600589
5398	1412	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-08 00:45:37.600589	2025-09-08 00:45:37.600589
5399	1414	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-08 00:53:58.802303	2025-09-08 00:53:58.802303
5400	1414	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-08 00:56:32.965075	2025-09-08 00:56:32.965075
5401	1415	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-08 01:04:19.654935	2025-09-08 01:04:19.654935
5402	1415	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-08 01:07:21.029204	2025-09-08 01:07:21.029204
5403	1416	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-08 01:13:45.885615	2025-09-08 01:13:45.885615
5404	1416	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-08 01:20:14.549057	2025-09-08 01:20:14.549057
5405	1417	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-08 01:37:48.517718	2025-09-08 01:37:48.517718
5406	1417	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-08 01:51:42.633982	2025-09-08 01:51:42.633982
5407	1418	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-08 02:54:11.398713	2025-09-08 02:54:11.398713
5408	1418	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-08 03:06:14.430735	2025-09-08 03:06:14.430735
5409	1419	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-08 03:11:07.081255	2025-09-08 03:11:07.081255
5410	1419	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-08 03:32:07.913199	2025-09-08 03:32:07.913199
5411	1420	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-08 03:50:41.95899	2025-09-08 03:50:41.95899
5412	1421	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-08 07:34:45.561626	2025-09-08 07:34:45.561626
5413	1421	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-08 07:58:05.445446	2025-09-08 07:58:05.445446
5414	1422	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-08 08:01:51.139076	2025-09-08 08:01:51.139076
5415	1422	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-08 08:34:32.409874	2025-09-08 08:34:32.409874
5416	1425	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-11 05:16:48.092148	2025-09-11 05:16:48.092148
5417	1425	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-11 05:16:52.087047	2025-09-11 05:16:52.087047
5418	1427	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-11 06:02:47.490493	2025-09-11 06:02:47.490493
5419	1427	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-11 06:04:44.673872	2025-09-11 06:04:44.673872
5420	1424	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-11 06:04:44.673872	2025-09-11 06:04:44.673872
5421	1428	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-11 06:10:11.488783	2025-09-11 06:10:11.488783
5422	1454	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-11 06:12:22.592038	2025-09-11 06:12:22.592038
5423	1455	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-11 06:14:46.145739	2025-09-11 06:14:46.145739
5424	1455	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-11 06:14:53.377875	2025-09-11 06:14:53.377875
5425	1454	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-11 06:15:12.17551	2025-09-11 06:15:12.17551
5426	1434	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-11 06:15:30.180831	2025-09-11 06:15:30.180831
5427	1434	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-11 06:17:05.347555	2025-09-11 06:17:05.347555
5428	1426	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-11 06:17:05.347555	2025-09-11 06:17:05.347555
5429	1435	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-11 06:17:23.376674	2025-09-11 06:17:23.376674
5430	1428	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-11 06:17:53.820261	2025-09-11 06:17:53.820261
5431	1429	todo	in_progress	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-11 06:19:16.907163	2025-09-11 06:19:16.907163
5432	1429	in_progress	completed	\N	automatic	1	{}	\N	\N	f	{"auto_logged": true, "trigger_source": "task_update"}	2025-09-11 06:23:13.84075	2025-09-11 06:23:13.84075
\.


--
-- Name: task_status_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: dev_user
--

SELECT pg_catalog.setval('public.task_status_history_id_seq', 5432, true);


--
-- Name: task_status_history task_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.task_status_history
    ADD CONSTRAINT task_status_history_pkey PRIMARY KEY (id);


--
-- Name: task_status_history task_status_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.task_status_history
    ADD CONSTRAINT task_status_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id);


--
-- Name: task_status_history task_status_history_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.task_status_history
    ADD CONSTRAINT task_status_history_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

