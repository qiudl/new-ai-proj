--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (Debian 16.9-1.pgdg120+1)
-- Dumped by pg_dump version 16.9 (Debian 16.9-1.pgdg120+1)

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


--
-- Name: timing_status_type; Type: TYPE; Schema: public; Owner: user
--

CREATE TYPE public.timing_status_type AS ENUM (
    'stopped',
    'running',
    'paused'
);


ALTER TYPE public.timing_status_type OWNER TO "user";

--
-- Name: check_task_hierarchy(); Type: FUNCTION; Schema: public; Owner: user
--

CREATE FUNCTION public.check_task_hierarchy() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    current_parent_id INTEGER;
    depth_count INTEGER := 0;
BEGIN
    -- If no parent_id, it's a root task
    IF NEW.parent_id IS NULL THEN
        NEW.task_level := 0;
        RETURN NEW;
    END IF;

    -- Check if parent exists and is in same project
    IF NOT EXISTS (
        SELECT 1 FROM tasks 
        WHERE id = NEW.parent_id 
        AND project_id = NEW.project_id 
        AND deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Parent task must exist and be in the same project';
    END IF;

    -- Prevent self-reference
    IF NEW.parent_id = NEW.id THEN
        RAISE EXCEPTION 'Task cannot be its own parent';
    END IF;

    -- Check for cycles and calculate level
    current_parent_id := NEW.parent_id;
    depth_count := 1;
    
    WHILE current_parent_id IS NOT NULL AND depth_count <= 4 LOOP
        -- Check if we've created a cycle
        IF current_parent_id = NEW.id THEN
            RAISE EXCEPTION 'Circular reference detected in task hierarchy';
        END IF;
        
        -- Get next parent
        SELECT parent_id INTO current_parent_id 
        FROM tasks 
        WHERE id = current_parent_id;
        
        depth_count := depth_count + 1;
    END LOOP;

    -- Check depth limit
    IF depth_count > 3 THEN
        RAISE EXCEPTION 'Task hierarchy depth cannot exceed 3 levels';
    END IF;

    -- Set the task level
    NEW.task_level := depth_count;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.check_task_hierarchy() OWNER TO "user";

--
-- Name: cleanup_recycled_items(integer); Type: FUNCTION; Schema: public; Owner: user
--

CREATE FUNCTION public.cleanup_recycled_items(older_than_days integer DEFAULT 30) RETURNS TABLE(deleted_projects integer, deleted_tasks integer)
    LANGUAGE plpgsql
    AS $$
DECLARE
    cutoff_date TIMESTAMPTZ;
    proj_count INTEGER;
    task_count INTEGER;
BEGIN
    cutoff_date := NOW() - INTERVAL '1 day' * older_than_days;
    
    -- Delete old recycled tasks
    DELETE FROM tasks 
    WHERE deleted_at IS NOT NULL AND deleted_at < cutoff_date;
    GET DIAGNOSTICS task_count = ROW_COUNT;
    
    -- Delete old recycled projects
    DELETE FROM projects 
    WHERE deleted_at IS NOT NULL AND deleted_at < cutoff_date;
    GET DIAGNOSTICS proj_count = ROW_COUNT;
    
    deleted_projects := proj_count;
    deleted_tasks := task_count;
    
    RETURN NEXT;
END;
$$;


ALTER FUNCTION public.cleanup_recycled_items(older_than_days integer) OWNER TO "user";

--
-- Name: create_audit_log(integer, character varying, character varying, integer, jsonb, inet, text); Type: FUNCTION; Schema: public; Owner: user
--

CREATE FUNCTION public.create_audit_log(p_user_id integer, p_action character varying, p_entity_type character varying, p_entity_id integer, p_entity_data jsonb DEFAULT NULL::jsonb, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    audit_id INTEGER;
BEGIN
    INSERT INTO system_audit_log (
        user_id, action, entity_type, entity_id, entity_data, ip_address, user_agent
    ) VALUES (
        p_user_id, p_action, p_entity_type, p_entity_id, p_entity_data, p_ip_address, p_user_agent
    ) RETURNING id INTO audit_id;
    
    RETURN audit_id;
END;
$$;


ALTER FUNCTION public.create_audit_log(p_user_id integer, p_action character varying, p_entity_type character varying, p_entity_id integer, p_entity_data jsonb, p_ip_address inet, p_user_agent text) OWNER TO "user";

--
-- Name: get_task_query_stats(); Type: FUNCTION; Schema: public; Owner: user
--

CREATE FUNCTION public.get_task_query_stats() RETURNS TABLE(query_type text, avg_execution_time_ms numeric, total_executions bigint, last_execution timestamp with time zone)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'global_tasks_query'::TEXT,
        0.0::NUMERIC,
        0::BIGINT,
        NOW()::TIMESTAMPTZ;
END;
$$;


ALTER FUNCTION public.get_task_query_stats() OWNER TO "user";

--
-- Name: restore_project(integer, integer); Type: FUNCTION; Schema: public; Owner: user
--

CREATE FUNCTION public.restore_project(p_project_id integer, p_user_id integer DEFAULT NULL::integer) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    project_record RECORD;
BEGIN
    -- Get project data
    SELECT * INTO project_record FROM projects WHERE id = p_project_id AND deleted_at IS NOT NULL;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Restore the project
    UPDATE projects 
    SET deleted_at = NULL 
    WHERE id = p_project_id;
    
    -- Create audit log
    PERFORM create_audit_log(
        p_user_id,
        'RESTORE',
        'project',
        p_project_id,
        row_to_json(project_record)::jsonb
    );
    
    RETURN TRUE;
END;
$$;


ALTER FUNCTION public.restore_project(p_project_id integer, p_user_id integer) OWNER TO "user";

--
-- Name: restore_task(integer, integer); Type: FUNCTION; Schema: public; Owner: user
--

CREATE FUNCTION public.restore_task(p_task_id integer, p_user_id integer DEFAULT NULL::integer) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    task_record RECORD;
    project_deleted BOOLEAN;
BEGIN
    -- Get task data
    SELECT t.*, p.deleted_at IS NOT NULL as project_is_deleted
    INTO task_record
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    WHERE t.id = p_task_id AND t.deleted_at IS NOT NULL;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check if parent project is deleted
    IF task_record.project_is_deleted THEN
        RAISE EXCEPTION 'Cannot restore task: parent project is deleted';
    END IF;
    
    -- Restore the task
    UPDATE tasks 
    SET deleted_at = NULL 
    WHERE id = p_task_id;
    
    -- Create audit log
    PERFORM create_audit_log(
        p_user_id,
        'RESTORE',
        'task',
        p_task_id,
        row_to_json(task_record)::jsonb
    );
    
    RETURN TRUE;
END;
$$;


ALTER FUNCTION public.restore_task(p_task_id integer, p_user_id integer) OWNER TO "user";

--
-- Name: soft_delete_project(integer, integer); Type: FUNCTION; Schema: public; Owner: user
--

CREATE FUNCTION public.soft_delete_project(p_project_id integer, p_user_id integer DEFAULT NULL::integer) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    project_record RECORD;
BEGIN
    -- Get project data for audit log
    SELECT p.*, u.username as owner_username 
    INTO project_record
    FROM projects p
    LEFT JOIN users u ON p.owner_id = u.id
    WHERE p.id = p_project_id AND p.deleted_at IS NULL;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Soft delete the project
    UPDATE projects 
    SET deleted_at = NOW() 
    WHERE id = p_project_id AND deleted_at IS NULL;
    
    -- Also soft delete all tasks in the project
    UPDATE tasks 
    SET deleted_at = NOW() 
    WHERE project_id = p_project_id AND deleted_at IS NULL;
    
    -- Create audit log
    PERFORM create_audit_log(
        p_user_id,
        'DELETE',
        'project',
        p_project_id,
        row_to_json(project_record)::jsonb
    );
    
    RETURN TRUE;
END;
$$;


ALTER FUNCTION public.soft_delete_project(p_project_id integer, p_user_id integer) OWNER TO "user";

--
-- Name: soft_delete_task(integer, integer); Type: FUNCTION; Schema: public; Owner: user
--

CREATE FUNCTION public.soft_delete_task(p_task_id integer, p_user_id integer DEFAULT NULL::integer) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    task_record RECORD;
BEGIN
    -- Get task data for audit log
    SELECT t.*, p.name as project_name, u.username as assignee_username
    INTO task_record
    FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    LEFT JOIN users u ON t.assignee_id = u.id
    WHERE t.id = p_task_id AND t.deleted_at IS NULL;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Soft delete the task
    UPDATE tasks 
    SET deleted_at = NOW() 
    WHERE id = p_task_id AND deleted_at IS NULL;
    
    -- Create audit log
    PERFORM create_audit_log(
        p_user_id,
        'DELETE',
        'task',
        p_task_id,
        row_to_json(task_record)::jsonb
    );
    
    RETURN TRUE;
END;
$$;


ALTER FUNCTION public.soft_delete_task(p_task_id integer, p_user_id integer) OWNER TO "user";

--
-- Name: update_companies_updated_at(); Type: FUNCTION; Schema: public; Owner: user
--

CREATE FUNCTION public.update_companies_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_companies_updated_at() OWNER TO "user";

--
-- Name: update_parent_task_progress(); Type: FUNCTION; Schema: public; Owner: user
--

CREATE FUNCTION public.update_parent_task_progress() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    parent_task_id INTEGER;
    total_children INTEGER;
    completed_children INTEGER;
    new_progress INTEGER;
    new_status VARCHAR(20);
BEGIN
    -- Get parent task ID from the affected task
    IF TG_OP = 'DELETE' THEN
        parent_task_id := OLD.parent_id;
    ELSE
        parent_task_id := NEW.parent_id;
    END IF;

    -- If no parent, nothing to update
    IF parent_task_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Calculate children statistics
    SELECT 
        COUNT(*),
        COUNT(CASE WHEN status = 'completed' THEN 1 END)
    INTO total_children, completed_children
    FROM tasks 
    WHERE parent_id = parent_task_id 
    AND deleted_at IS NULL;

    -- Calculate new progress
    IF total_children = 0 THEN
        new_progress := 0;
        new_status := 'todo';
    ELSE
        new_progress := (completed_children * 100) / total_children;
        
        -- Determine new status
        IF completed_children = 0 THEN
            new_status := 'todo';
        ELSIF completed_children = total_children THEN
            new_status := 'completed';
        ELSE
            new_status := 'in_progress';
        END IF;
    END IF;

    -- Update parent task
    UPDATE tasks 
    SET 
        custom_fields = COALESCE(custom_fields, '{}') || jsonb_build_object('progress', new_progress),
        status = new_status,
        updated_at = NOW()
    WHERE id = parent_task_id;

    -- Create timeline event for parent update
    INSERT INTO timeline_events (task_id, event_type, description, user_id)
    VALUES (
        parent_task_id,
        'updated',
        'Progress updated automatically based on subtask completion',
        NULL
    );

    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION public.update_parent_task_progress() OWNER TO "user";

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: user
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO "user";

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ai_configs; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.ai_configs (
    id integer NOT NULL,
    provider character varying(50) NOT NULL,
    api_key_encrypted text NOT NULL,
    api_key_hash character varying(255) NOT NULL,
    model character varying(255) NOT NULL,
    base_url text,
    temperature numeric(3,2) DEFAULT 0.7 NOT NULL,
    max_tokens integer DEFAULT 4000 NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    metadata jsonb,
    created_by integer,
    updated_by integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    last_tested_at timestamp with time zone,
    test_success_count integer DEFAULT 0 NOT NULL,
    test_failure_count integer DEFAULT 0 NOT NULL,
    CONSTRAINT ai_configs_max_tokens_check CHECK (((max_tokens >= 1) AND (max_tokens <= 32000))),
    CONSTRAINT ai_configs_provider_check CHECK (((provider)::text = ANY ((ARRAY['openai'::character varying, 'claude'::character varying, 'deepseek'::character varying])::text[]))),
    CONSTRAINT ai_configs_temperature_check CHECK (((temperature >= (0)::numeric) AND (temperature <= (2)::numeric)))
);


ALTER TABLE public.ai_configs OWNER TO "user";

--
-- Name: ai_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.ai_configs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_configs_id_seq OWNER TO "user";

--
-- Name: ai_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.ai_configs_id_seq OWNED BY public.ai_configs.id;


--
-- Name: ai_test_logs; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.ai_test_logs (
    id integer NOT NULL,
    config_id integer,
    provider character varying(50) NOT NULL,
    success boolean NOT NULL,
    response_time_ms integer,
    error_message text,
    tested_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    tested_by integer
);


ALTER TABLE public.ai_test_logs OWNER TO "user";

--
-- Name: ai_test_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.ai_test_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_test_logs_id_seq OWNER TO "user";

--
-- Name: ai_test_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.ai_test_logs_id_seq OWNED BY public.ai_test_logs.id;


--
-- Name: ai_usage_stats; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.ai_usage_stats (
    id integer NOT NULL,
    config_id integer,
    provider character varying(50) NOT NULL,
    usage_date date NOT NULL,
    request_count integer DEFAULT 0 NOT NULL,
    token_count integer DEFAULT 0 NOT NULL,
    cost_amount numeric(10,4) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.ai_usage_stats OWNER TO "user";

--
-- Name: ai_usage_stats_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.ai_usage_stats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_usage_stats_id_seq OWNER TO "user";

--
-- Name: ai_usage_stats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.ai_usage_stats_id_seq OWNED BY public.ai_usage_stats.id;


--
-- Name: audit_configs; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.audit_configs (
    id integer NOT NULL,
    resource_type character varying(50) NOT NULL,
    action character varying(100) NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    log_before_data boolean DEFAULT false NOT NULL,
    log_after_data boolean DEFAULT true NOT NULL,
    log_changes boolean DEFAULT true NOT NULL,
    retention_days integer DEFAULT 365 NOT NULL,
    sensitive_fields text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_retention_days CHECK ((retention_days > 0))
);


ALTER TABLE public.audit_configs OWNER TO "user";

--
-- Name: audit_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.audit_configs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_configs_id_seq OWNER TO "user";

--
-- Name: audit_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.audit_configs_id_seq OWNED BY public.audit_configs.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.audit_logs (
    id bigint NOT NULL,
    event_id character varying(36) NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    user_id integer,
    user_email character varying(255),
    user_name character varying(255),
    user_role character varying(50),
    action character varying(100) NOT NULL,
    resource_type character varying(50) NOT NULL,
    resource_id character varying(50),
    resource_name character varying(255),
    ip_address inet,
    user_agent text,
    session_id character varying(128),
    request_id character varying(36),
    description text,
    before_data jsonb,
    after_data jsonb,
    changes jsonb,
    status character varying(20) DEFAULT 'success'::character varying NOT NULL,
    error_message text,
    project_id integer,
    parent_event_id character varying(36),
    correlation_id character varying(36),
    metadata jsonb,
    tags text[],
    CONSTRAINT chk_status CHECK (((status)::text = ANY (ARRAY[('success'::character varying)::text, ('failed'::character varying)::text, ('pending'::character varying)::text])))
);


ALTER TABLE public.audit_logs OWNER TO "user";

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.audit_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO "user";

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: companies; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.companies (
    id integer NOT NULL,
    company_name character varying(255) NOT NULL,
    company_code character varying(50),
    industry character varying(100),
    company_type character varying(50) DEFAULT 'client'::character varying,
    business_license character varying(100),
    tax_number character varying(100),
    legal_representative character varying(100),
    address text,
    city character varying(100),
    province character varying(100),
    postal_code character varying(20),
    website character varying(255),
    main_phone character varying(50),
    main_email character varying(255),
    status character varying(20) DEFAULT 'active'::character varying,
    priority character varying(10) DEFAULT 'medium'::character varying,
    annual_contract_value numeric(15,2),
    total_contract_value numeric(15,2),
    start_date date,
    employee_count integer,
    company_size character varying(20),
    created_by integer,
    updated_by integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone,
    CONSTRAINT companies_company_size_check CHECK (((company_size)::text = ANY ((ARRAY['startup'::character varying, 'small'::character varying, 'medium'::character varying, 'large'::character varying, 'enterprise'::character varying])::text[]))),
    CONSTRAINT companies_priority_check CHECK (((priority)::text = ANY ((ARRAY['high'::character varying, 'medium'::character varying, 'low'::character varying])::text[]))),
    CONSTRAINT companies_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'potential'::character varying, 'suspended'::character varying])::text[])))
);


ALTER TABLE public.companies OWNER TO "user";

--
-- Name: companies_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.companies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.companies_id_seq OWNER TO "user";

--
-- Name: companies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.companies_id_seq OWNED BY public.companies.id;


--
-- Name: company_roles; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.company_roles (
    id integer NOT NULL,
    role_code character varying(50) NOT NULL,
    role_name character varying(100) NOT NULL,
    role_description text,
    is_system_role boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.company_roles OWNER TO "user";

--
-- Name: company_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.company_roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.company_roles_id_seq OWNER TO "user";

--
-- Name: company_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.company_roles_id_seq OWNED BY public.company_roles.id;


--
-- Name: company_user_project_permissions; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.company_user_project_permissions (
    id integer NOT NULL,
    company_user_id integer,
    project_id integer,
    can_view_project boolean DEFAULT true,
    can_edit_project boolean DEFAULT false,
    can_delete_project boolean DEFAULT false,
    can_manage_tasks boolean DEFAULT false,
    can_view_financials boolean DEFAULT false,
    can_manage_members boolean DEFAULT false,
    permission_start_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    permission_end_date timestamp without time zone,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.company_user_project_permissions OWNER TO "user";

--
-- Name: company_user_project_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.company_user_project_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.company_user_project_permissions_id_seq OWNER TO "user";

--
-- Name: company_user_project_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.company_user_project_permissions_id_seq OWNED BY public.company_user_project_permissions.id;


--
-- Name: company_users; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.company_users (
    id integer NOT NULL,
    customer_id integer,
    name character varying(100) NOT NULL,
    "position" character varying(100),
    department character varying(100),
    email character varying(255),
    phone character varying(50),
    mobile character varying(50),
    work_phone character varying(50),
    role character varying(50) DEFAULT 'normal'::character varying,
    is_primary_contact boolean DEFAULT false,
    can_make_decisions boolean DEFAULT false,
    access_level integer DEFAULT 1,
    status character varying(20) DEFAULT 'active'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    role_id integer,
    custom_permissions jsonb DEFAULT '{}'::jsonb,
    permission_expires_at timestamp without time zone,
    is_permission_locked boolean DEFAULT false,
    CONSTRAINT company_users_access_level_check CHECK (((access_level >= 1) AND (access_level <= 5))),
    CONSTRAINT company_users_role_check CHECK (((role)::text = ANY (ARRAY[('primary_contact'::character varying)::text, ('technical_contact'::character varying)::text, ('decision_maker'::character varying)::text, ('finance_contact'::character varying)::text, ('normal'::character varying)::text]))),
    CONSTRAINT company_users_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('inactive'::character varying)::text, ('left'::character varying)::text])))
);


ALTER TABLE public.company_users OWNER TO "user";

--
-- Name: company_users_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.company_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.company_users_id_seq OWNER TO "user";

--
-- Name: company_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.company_users_id_seq OWNED BY public.company_users.id;


--
-- Name: customer_contacts; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.customer_contacts (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    contact_type character varying(20) NOT NULL,
    subject character varying(255),
    content text,
    contact_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    next_contact_date timestamp without time zone,
    status character varying(20) DEFAULT 'planned'::character varying NOT NULL,
    result character varying(100),
    contacted_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT customer_contacts_contact_type_check CHECK (((contact_type)::text = ANY (ARRAY[('email'::character varying)::text, ('phone'::character varying)::text, ('meeting'::character varying)::text, ('visit'::character varying)::text, ('other'::character varying)::text]))),
    CONSTRAINT customer_contacts_status_check CHECK (((status)::text = ANY (ARRAY[('planned'::character varying)::text, ('completed'::character varying)::text, ('cancelled'::character varying)::text])))
);


ALTER TABLE public.customer_contacts OWNER TO "user";

--
-- Name: customer_contacts_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.customer_contacts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customer_contacts_id_seq OWNER TO "user";

--
-- Name: customer_contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.customer_contacts_id_seq OWNED BY public.customer_contacts.id;


--
-- Name: customer_users; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.customer_users (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    user_id integer NOT NULL,
    role character varying(20) DEFAULT 'contact'::character varying NOT NULL,
    is_primary boolean DEFAULT false,
    permissions jsonb,
    access_level integer DEFAULT 1,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT customer_users_access_level_check CHECK (((access_level >= 1) AND (access_level <= 10))),
    CONSTRAINT customer_users_role_check CHECK (((role)::text = ANY (ARRAY[('contact'::character varying)::text, ('manager'::character varying)::text, ('viewer'::character varying)::text, ('admin'::character varying)::text])))
);


ALTER TABLE public.customer_users OWNER TO "user";

--
-- Name: customer_users_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.customer_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customer_users_id_seq OWNER TO "user";

--
-- Name: customer_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.customer_users_id_seq OWNED BY public.customer_users.id;


--
-- Name: customers; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.customers (
    id integer NOT NULL,
    company_name character varying(255) NOT NULL,
    company_code character varying(100),
    industry character varying(100),
    company_type character varying(50) DEFAULT 'limited_company'::character varying,
    business_license character varying(100),
    tax_number character varying(50),
    legal_representative character varying(100),
    address text,
    city character varying(100),
    province character varying(100),
    postal_code character varying(20),
    website character varying(255),
    main_phone character varying(50),
    main_email character varying(255),
    status character varying(20) DEFAULT 'potential'::character varying,
    priority character varying(20) DEFAULT 'medium'::character varying,
    annual_contract_value numeric(15,2) DEFAULT 0,
    total_contract_value numeric(15,2) DEFAULT 0,
    start_date date,
    employee_count integer,
    company_size character varying(20),
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone,
    CONSTRAINT check_company_name_not_empty CHECK (((company_name IS NOT NULL) AND ((company_name)::text <> ''::text))),
    CONSTRAINT customers_company_size_check CHECK (((company_size)::text = ANY (ARRAY[('startup'::character varying)::text, ('small'::character varying)::text, ('medium'::character varying)::text, ('large'::character varying)::text, ('enterprise'::character varying)::text]))),
    CONSTRAINT customers_priority_check CHECK (((priority)::text = ANY (ARRAY[('high'::character varying)::text, ('medium'::character varying)::text, ('low'::character varying)::text]))),
    CONSTRAINT customers_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('inactive'::character varying)::text, ('potential'::character varying)::text, ('suspended'::character varying)::text])))
);


ALTER TABLE public.customers OWNER TO "user";

--
-- Name: customers_backup; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.customers_backup (
    id integer,
    name character varying(255),
    company character varying(255),
    industry character varying(100),
    contact_person character varying(255),
    email character varying(255),
    phone character varying(50),
    address text,
    website character varying(255),
    status character varying(20),
    priority character varying(20),
    contract_value numeric(15,2),
    start_date character varying(50),
    end_date character varying(50),
    custom_fields jsonb,
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    deleted_at timestamp without time zone
);


ALTER TABLE public.customers_backup OWNER TO "user";

--
-- Name: customers_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customers_id_seq OWNER TO "user";

--
-- Name: customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.customers_id_seq OWNED BY public.customers.id;


--
-- Name: encryption_keys; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.encryption_keys (
    id integer NOT NULL,
    key_name character varying(255) NOT NULL,
    key_value text NOT NULL,
    algorithm character varying(50) DEFAULT 'AES-256-GCM'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.encryption_keys OWNER TO "user";

--
-- Name: encryption_keys_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.encryption_keys_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.encryption_keys_id_seq OWNER TO "user";

--
-- Name: encryption_keys_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.encryption_keys_id_seq OWNED BY public.encryption_keys.id;


--
-- Name: projects; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.projects (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    owner_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now(),
    project_number character varying(50),
    company_id integer,
    status character varying(20) DEFAULT 'planning'::character varying,
    priority character varying(10) DEFAULT 'medium'::character varying,
    progress integer DEFAULT 0,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    budget numeric(15,2)
);


ALTER TABLE public.projects OWNER TO "user";

--
-- Name: tasks; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.tasks (
    id integer NOT NULL,
    project_id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    status character varying(20) DEFAULT 'todo'::character varying NOT NULL,
    assignee_id integer,
    due_date date,
    custom_fields jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    parent_id integer,
    task_level integer DEFAULT 0 NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    deleted_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now(),
    total_time_seconds integer DEFAULT 0,
    archived_at timestamp with time zone,
    CONSTRAINT check_task_level CHECK (((task_level >= 0) AND (task_level <= 3)))
);


ALTER TABLE public.tasks OWNER TO "user";

--
-- Name: users; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(20) DEFAULT 'developer'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    email character varying(255),
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    profile jsonb DEFAULT '{}'::jsonb,
    last_login_at timestamp with time zone,
    current_timing_task_id integer,
    timing_start_time timestamp without time zone,
    timing_status public.timing_status_type DEFAULT 'stopped'::public.timing_status_type,
    user_type character varying(20) DEFAULT 'system'::character varying,
    company_id integer,
    company_user_id integer,
    contact_person_name character varying(100),
    contact_phone character varying(50),
    department_title character varying(100),
    is_primary_contact boolean DEFAULT false,
    account_expires_at timestamp with time zone,
    last_project_access timestamp with time zone,
    notes text,
    current_user_timer_task_id integer,
    timing_paused_time timestamp without time zone,
    timing_accumulated_seconds integer DEFAULT 0 NOT NULL,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY (ARRAY[('admin'::character varying)::text, ('project_manager'::character varying)::text, ('developer'::character varying)::text, ('client'::character varying)::text]))),
    CONSTRAINT users_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('inactive'::character varying)::text, ('suspended'::character varying)::text]))),
    CONSTRAINT users_user_type_check CHECK (((user_type)::text = ANY ((ARRAY['system'::character varying, 'company'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO "user";

--
-- Name: COLUMN users.timing_paused_time; Type: COMMENT; Schema: public; Owner: user
--

COMMENT ON COLUMN public.users.timing_paused_time IS 'Timestamp when the timer was paused (NULL if not paused)';


--
-- Name: COLUMN users.timing_accumulated_seconds; Type: COMMENT; Schema: public; Owner: user
--

COMMENT ON COLUMN public.users.timing_accumulated_seconds IS 'Accumulated seconds from previous timing sessions before current pause';


--
-- Name: overdue_tasks; Type: VIEW; Schema: public; Owner: user
--

CREATE VIEW public.overdue_tasks AS
 SELECT t.id,
    t.title,
    t.description,
    t.status,
    t.due_date,
    t.created_at,
    p.name AS project_name,
    u.username AS assignee_username,
    (CURRENT_DATE - t.due_date) AS days_overdue
   FROM ((public.tasks t
     JOIN public.projects p ON (((t.project_id = p.id) AND (p.deleted_at IS NULL))))
     LEFT JOIN public.users u ON ((t.assignee_id = u.id)))
  WHERE ((t.due_date < CURRENT_DATE) AND ((t.status)::text = ANY (ARRAY[('todo'::character varying)::text, ('in_progress'::character varying)::text])) AND (t.deleted_at IS NULL))
  ORDER BY t.due_date;


ALTER VIEW public.overdue_tasks OWNER TO "user";

--
-- Name: permission_audit_logs; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.permission_audit_logs (
    id integer NOT NULL,
    company_user_id integer,
    target_user_id integer,
    action_type character varying(50) NOT NULL,
    permission_code character varying(100),
    resource_type character varying(50),
    resource_id integer,
    old_value jsonb,
    new_value jsonb,
    reason text,
    performed_by integer,
    performed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ip_address inet,
    user_agent text
);


ALTER TABLE public.permission_audit_logs OWNER TO "user";

--
-- Name: permission_audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.permission_audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.permission_audit_logs_id_seq OWNER TO "user";

--
-- Name: permission_audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.permission_audit_logs_id_seq OWNED BY public.permission_audit_logs.id;


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.permissions (
    id integer NOT NULL,
    permission_code character varying(100) NOT NULL,
    permission_name character varying(100) NOT NULL,
    permission_description text,
    module character varying(50) NOT NULL,
    resource character varying(50) NOT NULL,
    action character varying(50) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.permissions OWNER TO "user";

--
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.permissions_id_seq OWNER TO "user";

--
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- Name: project_companies; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.project_companies (
    id integer NOT NULL,
    project_id integer NOT NULL,
    company_id integer NOT NULL,
    role character varying(50),
    is_primary boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.project_companies OWNER TO "user";

--
-- Name: project_companies_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.project_companies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_companies_id_seq OWNER TO "user";

--
-- Name: project_companies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.project_companies_id_seq OWNED BY public.project_companies.id;


--
-- Name: project_users; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.project_users (
    id integer NOT NULL,
    project_id integer NOT NULL,
    user_id integer NOT NULL,
    role character varying(50) DEFAULT 'developer'::character varying,
    is_primary boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.project_users OWNER TO "user";

--
-- Name: project_users_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.project_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_users_id_seq OWNER TO "user";

--
-- Name: project_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.project_users_id_seq OWNED BY public.project_users.id;


--
-- Name: projects_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.projects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.projects_id_seq OWNER TO "user";

--
-- Name: projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;


--
-- Name: recycled_projects; Type: VIEW; Schema: public; Owner: user
--

CREATE VIEW public.recycled_projects AS
 SELECT p.id,
    p.name,
    p.description,
    p.owner_id,
    u.username AS owner_username,
    p.created_at,
    p.updated_at,
    p.deleted_at,
    count(t.id) AS deleted_tasks_count
   FROM ((public.projects p
     LEFT JOIN public.users u ON ((p.owner_id = u.id)))
     LEFT JOIN public.tasks t ON (((p.id = t.project_id) AND (t.deleted_at IS NOT NULL))))
  WHERE (p.deleted_at IS NOT NULL)
  GROUP BY p.id, p.name, p.description, p.owner_id, u.username, p.created_at, p.updated_at, p.deleted_at
  ORDER BY p.deleted_at DESC;


ALTER VIEW public.recycled_projects OWNER TO "user";

--
-- Name: recycled_tasks; Type: VIEW; Schema: public; Owner: user
--

CREATE VIEW public.recycled_tasks AS
 SELECT t.id,
    t.project_id,
    t.title,
    t.description,
    t.status,
    t.assignee_id,
    t.due_date,
    t.custom_fields,
    t.created_at,
    t.deleted_at,
    p.name AS project_name,
    u.username AS assignee_username
   FROM ((public.tasks t
     LEFT JOIN public.projects p ON ((t.project_id = p.id)))
     LEFT JOIN public.users u ON ((t.assignee_id = u.id)))
  WHERE (t.deleted_at IS NOT NULL)
  ORDER BY t.deleted_at DESC;


ALTER VIEW public.recycled_tasks OWNER TO "user";

--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.role_permissions (
    id integer NOT NULL,
    role_id integer,
    permission_id integer,
    is_granted boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.role_permissions OWNER TO "user";

--
-- Name: role_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.role_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.role_permissions_id_seq OWNER TO "user";

--
-- Name: role_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.role_permissions_id_seq OWNED BY public.role_permissions.id;


--
-- Name: system_audit_log; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.system_audit_log (
    id integer NOT NULL,
    user_id integer,
    action character varying(50) NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id integer NOT NULL,
    entity_data jsonb,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_audit_action CHECK (((action)::text = ANY (ARRAY[('CREATE'::character varying)::text, ('UPDATE'::character varying)::text, ('DELETE'::character varying)::text, ('RESTORE'::character varying)::text, ('LOGIN'::character varying)::text, ('LOGOUT'::character varying)::text]))),
    CONSTRAINT chk_audit_entity_type CHECK (((entity_type)::text = ANY (ARRAY[('project'::character varying)::text, ('task'::character varying)::text, ('user'::character varying)::text, ('system'::character varying)::text])))
);


ALTER TABLE public.system_audit_log OWNER TO "user";

--
-- Name: system_audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.system_audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.system_audit_log_id_seq OWNER TO "user";

--
-- Name: system_audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.system_audit_log_id_seq OWNED BY public.system_audit_log.id;


--
-- Name: task_time_logs; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.task_time_logs (
    id integer NOT NULL,
    task_id integer,
    user_id integer NOT NULL,
    start_time timestamp without time zone NOT NULL,
    end_time timestamp without time zone,
    duration_seconds integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    user_timer_task_id integer
);


ALTER TABLE public.task_time_logs OWNER TO "user";

--
-- Name: task_time_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.task_time_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.task_time_logs_id_seq OWNER TO "user";

--
-- Name: task_time_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.task_time_logs_id_seq OWNED BY public.task_time_logs.id;


--
-- Name: task_updates; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.task_updates (
    id integer NOT NULL,
    task_id integer NOT NULL,
    update_type character varying(50) NOT NULL,
    old_value text,
    new_value text,
    updated_by integer,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT task_updates_update_type_check CHECK (((update_type)::text = ANY ((ARRAY['status'::character varying, 'progress'::character varying, 'notes'::character varying, 'parent'::character varying, 'title'::character varying, 'description'::character varying, 'assignee'::character varying, 'due_date'::character varying, 'custom_fields'::character varying])::text[])))
);


ALTER TABLE public.task_updates OWNER TO "user";

--
-- Name: task_updates_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.task_updates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.task_updates_id_seq OWNER TO "user";

--
-- Name: task_updates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.task_updates_id_seq OWNED BY public.task_updates.id;


--
-- Name: tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tasks_id_seq OWNER TO "user";

--
-- Name: tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.tasks_id_seq OWNED BY public.tasks.id;


--
-- Name: timeline_events; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.timeline_events (
    id integer NOT NULL,
    task_id integer NOT NULL,
    event_type character varying(50) NOT NULL,
    event_date timestamp with time zone DEFAULT now() NOT NULL,
    description text NOT NULL,
    user_id integer,
    metadata jsonb,
    CONSTRAINT timeline_events_event_type_check CHECK (((event_type)::text = ANY (ARRAY[('created'::character varying)::text, ('updated'::character varying)::text, ('completed'::character varying)::text, ('deleted'::character varying)::text, ('restored'::character varying)::text])))
);


ALTER TABLE public.timeline_events OWNER TO "user";

--
-- Name: timeline_events_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.timeline_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.timeline_events_id_seq OWNER TO "user";

--
-- Name: timeline_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.timeline_events_id_seq OWNED BY public.timeline_events.id;


--
-- Name: user_stats; Type: VIEW; Schema: public; Owner: user
--

CREATE VIEW public.user_stats AS
 SELECT count(*) AS total_users,
    count(*) FILTER (WHERE ((status)::text = 'active'::text)) AS active_users,
    count(*) FILTER (WHERE ((status)::text = 'inactive'::text)) AS inactive_users,
    count(*) FILTER (WHERE ((status)::text = 'suspended'::text)) AS suspended_users,
    count(*) FILTER (WHERE ((role)::text = 'admin'::text)) AS admin_count,
    count(*) FILTER (WHERE ((role)::text = 'project_manager'::text)) AS project_manager_count,
    count(*) FILTER (WHERE ((role)::text = 'developer'::text)) AS developer_count,
    count(*) FILTER (WHERE ((role)::text = 'client'::text)) AS client_count,
    count(*) FILTER (WHERE (created_at >= (now() - '30 days'::interval))) AS recent_registrations
   FROM public.users;


ALTER VIEW public.user_stats OWNER TO "user";

--
-- Name: user_task_assignments; Type: VIEW; Schema: public; Owner: user
--

CREATE VIEW public.user_task_assignments AS
 SELECT u.id AS user_id,
    u.username,
    u.role,
    count(t.id) AS assigned_tasks,
    count(
        CASE
            WHEN ((t.status)::text = 'completed'::text) THEN 1
            ELSE NULL::integer
        END) AS completed_tasks,
    count(
        CASE
            WHEN ((t.status)::text = 'in_progress'::text) THEN 1
            ELSE NULL::integer
        END) AS in_progress_tasks,
    count(
        CASE
            WHEN ((t.status)::text = 'todo'::text) THEN 1
            ELSE NULL::integer
        END) AS todo_tasks
   FROM (public.users u
     LEFT JOIN public.tasks t ON (((u.id = t.assignee_id) AND (t.deleted_at IS NULL))))
  GROUP BY u.id, u.username, u.role;


ALTER VIEW public.user_task_assignments OWNER TO "user";

--
-- Name: user_timer_tasks; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.user_timer_tasks (
    id integer NOT NULL,
    user_id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    category character varying(20) DEFAULT 'personal'::character varying,
    priority character varying(10) DEFAULT 'medium'::character varying,
    status character varying(20) DEFAULT 'active'::character varying,
    color character varying(7) DEFAULT '#4CAF50'::character varying,
    is_favorite boolean DEFAULT false,
    total_time_seconds integer DEFAULT 0,
    target_time_seconds integer DEFAULT 0,
    tags text[],
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone,
    CONSTRAINT user_timer_tasks_category_check CHECK (((category)::text = ANY ((ARRAY['personal'::character varying, 'work'::character varying, 'study'::character varying, 'fitness'::character varying, 'hobby'::character varying])::text[]))),
    CONSTRAINT user_timer_tasks_priority_check CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying])::text[]))),
    CONSTRAINT user_timer_tasks_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'paused'::character varying, 'completed'::character varying, 'archived'::character varying])::text[])))
);


ALTER TABLE public.user_timer_tasks OWNER TO "user";

--
-- Name: user_timer_tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.user_timer_tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_timer_tasks_id_seq OWNER TO "user";

--
-- Name: user_timer_tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.user_timer_tasks_id_seq OWNED BY public.user_timer_tasks.id;


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO "user";

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: ai_configs id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.ai_configs ALTER COLUMN id SET DEFAULT nextval('public.ai_configs_id_seq'::regclass);


--
-- Name: ai_test_logs id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.ai_test_logs ALTER COLUMN id SET DEFAULT nextval('public.ai_test_logs_id_seq'::regclass);


--
-- Name: ai_usage_stats id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.ai_usage_stats ALTER COLUMN id SET DEFAULT nextval('public.ai_usage_stats_id_seq'::regclass);


--
-- Name: audit_configs id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.audit_configs ALTER COLUMN id SET DEFAULT nextval('public.audit_configs_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: companies id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.companies ALTER COLUMN id SET DEFAULT nextval('public.companies_id_seq'::regclass);


--
-- Name: company_roles id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.company_roles ALTER COLUMN id SET DEFAULT nextval('public.company_roles_id_seq'::regclass);


--
-- Name: company_user_project_permissions id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.company_user_project_permissions ALTER COLUMN id SET DEFAULT nextval('public.company_user_project_permissions_id_seq'::regclass);


--
-- Name: company_users id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.company_users ALTER COLUMN id SET DEFAULT nextval('public.company_users_id_seq'::regclass);


--
-- Name: customer_contacts id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.customer_contacts ALTER COLUMN id SET DEFAULT nextval('public.customer_contacts_id_seq'::regclass);


--
-- Name: customer_users id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.customer_users ALTER COLUMN id SET DEFAULT nextval('public.customer_users_id_seq'::regclass);


--
-- Name: customers id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.customers ALTER COLUMN id SET DEFAULT nextval('public.customers_id_seq'::regclass);


--
-- Name: encryption_keys id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.encryption_keys ALTER COLUMN id SET DEFAULT nextval('public.encryption_keys_id_seq'::regclass);


--
-- Name: permission_audit_logs id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.permission_audit_logs ALTER COLUMN id SET DEFAULT nextval('public.permission_audit_logs_id_seq'::regclass);


--
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- Name: project_companies id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.project_companies ALTER COLUMN id SET DEFAULT nextval('public.project_companies_id_seq'::regclass);


--
-- Name: project_users id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.project_users ALTER COLUMN id SET DEFAULT nextval('public.project_users_id_seq'::regclass);


--
-- Name: projects id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.projects ALTER COLUMN id SET DEFAULT nextval('public.projects_id_seq'::regclass);


--
-- Name: role_permissions id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.role_permissions ALTER COLUMN id SET DEFAULT nextval('public.role_permissions_id_seq'::regclass);


--
-- Name: system_audit_log id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.system_audit_log ALTER COLUMN id SET DEFAULT nextval('public.system_audit_log_id_seq'::regclass);


--
-- Name: task_time_logs id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.task_time_logs ALTER COLUMN id SET DEFAULT nextval('public.task_time_logs_id_seq'::regclass);


--
-- Name: task_updates id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.task_updates ALTER COLUMN id SET DEFAULT nextval('public.task_updates_id_seq'::regclass);


--
-- Name: tasks id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.tasks ALTER COLUMN id SET DEFAULT nextval('public.tasks_id_seq'::regclass);


--
-- Name: timeline_events id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.timeline_events ALTER COLUMN id SET DEFAULT nextval('public.timeline_events_id_seq'::regclass);


--
-- Name: user_timer_tasks id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.user_timer_tasks ALTER COLUMN id SET DEFAULT nextval('public.user_timer_tasks_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: ai_configs; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.ai_configs (id, provider, api_key_encrypted, api_key_hash, model, base_url, temperature, max_tokens, enabled, metadata, created_by, updated_by, created_at, updated_at, last_tested_at, test_success_count, test_failure_count) FROM stdin;
\.


--
-- Data for Name: ai_test_logs; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.ai_test_logs (id, config_id, provider, success, response_time_ms, error_message, tested_at, tested_by) FROM stdin;
\.


--
-- Data for Name: ai_usage_stats; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.ai_usage_stats (id, config_id, provider, usage_date, request_count, token_count, cost_amount, created_at) FROM stdin;
\.


--
-- Data for Name: audit_configs; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.audit_configs (id, resource_type, action, enabled, log_before_data, log_after_data, log_changes, retention_days, sensitive_fields, created_at, updated_at) FROM stdin;
1	task	task.create	t	f	t	t	365	{}	2025-07-20 12:06:45.262463+00	2025-07-20 12:06:45.262463+00
2	task	task.update	t	t	t	t	365	{}	2025-07-20 12:06:45.262463+00	2025-07-20 12:06:45.262463+00
3	task	task.delete	t	t	f	f	2555	{}	2025-07-20 12:06:45.262463+00	2025-07-20 12:06:45.262463+00
4	task	task.status_change	t	t	t	t	365	{}	2025-07-20 12:06:45.262463+00	2025-07-20 12:06:45.262463+00
5	task	task.assign	t	t	t	t	365	{}	2025-07-20 12:06:45.262463+00	2025-07-20 12:06:45.262463+00
6	task	task.unassign	t	t	t	t	365	{}	2025-07-20 12:06:45.262463+00	2025-07-20 12:06:45.262463+00
7	task	task.move	t	t	t	t	365	{}	2025-07-20 12:06:45.262463+00	2025-07-20 12:06:45.262463+00
8	task	task.duplicate	t	f	t	f	365	{}	2025-07-20 12:06:45.262463+00	2025-07-20 12:06:45.262463+00
9	task	task.bulk_update	t	f	f	t	365	{}	2025-07-20 12:06:45.262463+00	2025-07-20 12:06:45.262463+00
10	task	task.bulk_delete	t	t	f	f	2555	{}	2025-07-20 12:06:45.262463+00	2025-07-20 12:06:45.262463+00
11	task	task.restore	t	t	t	t	365	{}	2025-07-20 12:06:45.262463+00	2025-07-20 12:06:45.262463+00
12	project	project.create	t	f	t	t	365	{}	2025-07-20 12:06:45.262463+00	2025-07-20 12:06:45.262463+00
13	project	project.update	t	t	t	t	365	{}	2025-07-20 12:06:45.262463+00	2025-07-20 12:06:45.262463+00
14	project	project.delete	t	t	f	f	2555	{}	2025-07-20 12:06:45.262463+00	2025-07-20 12:06:45.262463+00
15	project	project.archive	t	t	t	t	365	{}	2025-07-20 12:06:45.262463+00	2025-07-20 12:06:45.262463+00
16	project	project.restore	t	t	t	t	365	{}	2025-07-20 12:06:45.262463+00	2025-07-20 12:06:45.262463+00
17	project	project.add_member	t	f	t	t	365	{}	2025-07-20 12:06:45.262463+00	2025-07-20 12:06:45.262463+00
18	project	project.remove_member	t	t	f	t	365	{}	2025-07-20 12:06:45.262463+00	2025-07-20 12:06:45.262463+00
19	project	project.update_permissions	t	t	t	t	365	{}	2025-07-20 12:06:45.262463+00	2025-07-20 12:06:45.262463+00
20	user	user.login	t	f	f	f	90	{password,token}	2025-07-20 12:06:45.262463+00	2025-07-20 12:06:45.262463+00
21	user	user.logout	t	f	f	f	90	{}	2025-07-20 12:06:45.262463+00	2025-07-20 12:06:45.262463+00
22	user	user.register	t	f	t	f	2555	{password,password_hash}	2025-07-20 12:06:45.262463+00	2025-07-20 12:06:45.262463+00
23	user	user.update_profile	t	t	t	t	365	{}	2025-07-20 12:06:45.262463+00	2025-07-20 12:06:45.262463+00
24	user	user.change_password	t	f	f	f	365	{password,password_hash,current_password,new_password}	2025-07-20 12:06:45.262463+00	2025-07-20 12:06:45.262463+00
25	user	user.reset_password	t	f	f	f	365	{password,password_hash,token,reset_token}	2025-07-20 12:06:45.262463+00	2025-07-20 12:06:45.262463+00
26	system	system.config_change	t	t	t	t	2555	{}	2025-07-20 12:06:45.262463+00	2025-07-20 12:06:45.262463+00
27	system	system.backup	t	f	f	f	365	{}	2025-07-20 12:06:45.262463+00	2025-07-20 12:06:45.262463+00
28	system	system.restore	t	f	f	f	365	{}	2025-07-20 12:06:45.262463+00	2025-07-20 12:06:45.262463+00
29	system	system.maintenance	t	f	f	f	365	{}	2025-07-20 12:06:45.262463+00	2025-07-20 12:06:45.262463+00
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.audit_logs (id, event_id, "timestamp", user_id, user_email, user_name, user_role, action, resource_type, resource_id, resource_name, ip_address, user_agent, session_id, request_id, description, before_data, after_data, changes, status, error_message, project_id, parent_event_id, correlation_id, metadata, tags) FROM stdin;
1	17116c51-4ead-4d20-acd2-0edcae64cb0c	2025-07-20 12:09:12.767611+00	1	test@example.com	testuser		task.create	task	123	Test Task	192.168.1.1					\N	\N	\N	success		\N			\N	\N
2	f35e1574-e4ce-46d4-adc6-b579d22690fd	2025-07-20 12:09:12.772354+00	1	test@example.com	testuser		task.update	task	123	Updated Task	192.168.1.1					{"id": 123, "title": "Original Task", "status": "todo", "due_date": null, "parent_id": null, "created_at": "0001-01-01T00:00:00Z", "project_id": 1, "sort_order": 0, "task_level": 0, "updated_at": "0001-01-01T00:00:00Z", "assignee_id": null, "description": "Original description", "custom_fields": null}	{"id": 123, "title": "Updated Task", "status": "in_progress", "due_date": null, "parent_id": null, "created_at": "0001-01-01T00:00:00Z", "project_id": 1, "sort_order": 0, "task_level": 0, "updated_at": "0001-01-01T00:00:00Z", "assignee_id": null, "description": "Updated description", "custom_fields": null}	{"title": {"to": "Updated Task", "from": "Original Task"}, "status": {"to": "in_progress", "from": "todo"}, "description": {"to": "Updated description", "from": "Original description"}}	success		1			\N	\N
3	c1678614-bdf2-4b63-8f7d-cdbbbe1e50ab	2025-07-20 12:09:13.782277+00	1	test@example.com	testuser		task.delete	task	999		192.168.1.1					\N	\N	\N	failed	Task not found	\N			\N	\N
\.


--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.companies (id, company_name, company_code, industry, company_type, business_license, tax_number, legal_representative, address, city, province, postal_code, website, main_phone, main_email, status, priority, annual_contract_value, total_contract_value, start_date, employee_count, company_size, created_by, updated_by, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: company_roles; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.company_roles (id, role_code, role_name, role_description, is_system_role, is_active, created_at, updated_at) FROM stdin;
1	company_admin	企业管理员	拥有企业内所有权限，可管理企业信息和所有用户	t	t	2025-07-21 13:49:09.17121	2025-07-21 13:49:09.17121
2	project_manager	项目经理	可管理分配的项目，包括项目信息、任务和团队成员	t	t	2025-07-21 13:49:09.17121	2025-07-21 13:49:09.17121
3	finance_manager	财务负责人	可查看和管理财务相关信息，包括合同金额和费用	t	t	2025-07-21 13:49:09.17121	2025-07-21 13:49:09.17121
4	tech_lead	技术负责人	可管理技术相关项目和任务，参与技术决策	t	t	2025-07-21 13:49:09.17121	2025-07-21 13:49:09.17121
5	business_contact	商务联系人	企业对外商务联系人，可查看项目进展和商务信息	t	t	2025-07-21 13:49:09.17121	2025-07-21 13:49:09.17121
6	member	普通成员	基础成员权限，可查看分配的项目和任务	t	t	2025-07-21 13:49:09.17121	2025-07-21 13:49:09.17121
\.


--
-- Data for Name: company_user_project_permissions; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.company_user_project_permissions (id, company_user_id, project_id, can_view_project, can_edit_project, can_delete_project, can_manage_tasks, can_view_financials, can_manage_members, permission_start_date, permission_end_date, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: company_users; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.company_users (id, customer_id, name, "position", department, email, phone, mobile, work_phone, role, is_primary_contact, can_make_decisions, access_level, status, notes, created_at, updated_at, role_id, custom_permissions, permission_expires_at, is_permission_locked) FROM stdin;
1	1	张三	CTO	技术部	zhangsan@alibaba.com	0571-85022001	13800001001	\N	primary_contact	t	t	5	active	\N	2025-07-21 12:52:43.268123	2025-07-21 12:52:43.268123	\N	{}	\N	f
2	1	李四	项目经理	技术部	lisi@alibaba.com	0571-85022002	13800001002	\N	technical_contact	f	t	4	active	\N	2025-07-21 12:52:43.268123	2025-07-21 12:52:43.268123	\N	{}	\N	f
3	1	王五	财务经理	财务部	wangwu@alibaba.com	0571-85022003	13800001003	\N	finance_contact	f	f	3	active	\N	2025-07-21 12:52:43.268123	2025-07-21 12:52:43.268123	\N	{}	\N	f
4	2	赵六	VP Engineering	技术部	zhaoliu@tencent.com	0755-86013001	13800002001	\N	primary_contact	t	t	5	active	\N	2025-07-21 12:52:43.268123	2025-07-21 12:52:43.268123	\N	{}	\N	f
5	2	钱七	产品经理	产品部	qianqi@tencent.com	0755-86013002	13800002002	\N	technical_contact	f	t	4	active	\N	2025-07-21 12:52:43.268123	2025-07-21 12:52:43.268123	\N	{}	\N	f
6	3	孙八	技术总监	AI实验室	sunba@baidu.com	010-59928001	13800003001	\N	primary_contact	t	t	5	active	\N	2025-07-21 12:52:43.268123	2025-07-21 12:52:43.268123	\N	{}	\N	f
7	3	周九	商务经理	商务部	zhoujiu@baidu.com	010-59928002	13800003002	\N	normal	f	f	3	active	\N	2025-07-21 12:52:43.268123	2025-07-21 12:52:43.268123	\N	{}	\N	f
8	4	吴十	解决方案总监	企业BG	wushi@huawei.com	0755-28780001	13800004001	\N	primary_contact	t	t	5	active	\N	2025-07-21 12:52:43.268123	2025-07-21 12:52:43.268123	\N	{}	\N	f
9	4	郑一	技术专家	研发部	zhengyi@huawei.com	0755-28780002	13800004002	\N	technical_contact	f	t	4	active	\N	2025-07-21 12:52:43.268123	2025-07-21 12:52:43.268123	\N	{}	\N	f
10	5	测试用户_1753169472441	产品经理	产品部	test_1753169472441@example.com	138-0000-0000	138-0000-0000	\N	normal	f	f	2	active	测试用户账号	2025-07-22 07:31:12.44102	2025-07-22 07:31:12.44102	\N	{}	\N	f
11	7	张经理	产品经理	产品部	zhang.manager@example.com	138-0000-0001	138-0000-0001	\N	primary_contact	t	t	4	active	主要联系人，负责产品决策	2025-07-22 07:39:26.594616	2025-07-22 07:39:26.594616	\N	{}	\N	f
12	9	1111	\N	\N	\N	\N	\N	\N	normal	f	f	1	active	\N	2025-07-22 11:47:45.026236	2025-07-22 11:47:45.026236	\N	{}	\N	f
13	1	测试用户	技术经理	技术部	test@company.com	13800138000	\N	\N	technical_contact	f	f	2	active	\N	2025-07-22 12:07:02.491135	2025-07-22 12:07:02.491135	\N	{}	\N	f
14	8	迟勇	\N	\N	\N	\N	\N	\N	normal	f	f	1	active	\N	2025-07-22 13:41:21.697412	2025-07-22 13:41:21.697412	\N	{}	\N	f
\.


--
-- Data for Name: customer_contacts; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.customer_contacts (id, customer_id, contact_type, subject, content, contact_date, next_contact_date, status, result, contacted_by, created_at, updated_at) FROM stdin;
1	1	email	项目合作咨询	关于新项目的合作细节讨论	2025-07-20 23:55:26.600934	\N	completed	\N	1	2025-07-20 23:55:26.600934	2025-07-20 23:55:26.600934
2	1	phone	跟进合同签署	确认合同条款和签署时间	2025-07-20 23:55:26.600934	\N	completed	\N	1	2025-07-20 23:55:26.600934	2025-07-20 23:55:26.600934
3	2	meeting	需求调研会议	深入了解客户具体需求	2025-07-20 23:55:26.600934	\N	planned	\N	1	2025-07-20 23:55:26.600934	2025-07-20 23:55:26.600934
4	3	email	产品介绍	发送产品详细介绍和报价	2025-07-20 23:55:26.600934	\N	completed	\N	1	2025-07-20 23:55:26.600934	2025-07-20 23:55:26.600934
5	1	email	测试联系	这是一个测试联系记录	2025-07-21 08:15:44.369398	\N	planned	\N	1	2025-07-21 00:15:44.369726	2025-07-21 00:15:44.369726
\.


--
-- Data for Name: customer_users; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.customer_users (id, customer_id, user_id, role, is_primary, permissions, access_level, created_at, updated_at) FROM stdin;
1	1	1	admin	t	\N	10	2025-07-20 23:55:26.60007	2025-07-20 23:55:26.60007
2	2	1	manager	t	\N	8	2025-07-20 23:55:26.60007	2025-07-20 23:55:26.60007
3	3	1	contact	t	\N	5	2025-07-20 23:55:26.60007	2025-07-20 23:55:26.60007
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.customers (id, company_name, company_code, industry, company_type, business_license, tax_number, legal_representative, address, city, province, postal_code, website, main_phone, main_email, status, priority, annual_contract_value, total_contract_value, start_date, employee_count, company_size, created_by, updated_by, created_at, updated_at, deleted_at) FROM stdin;
8	李宁集团	\N	鞋服	limited_company	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	active	high	\N	0.00	\N	\N	\N	1	1	2025-07-22 09:06:34.496343	2025-07-22 09:23:52.355272	\N
7	北京智慧云彩电子商务科技有限公司	DEMO1753169966	软件开发	limited_company	\N	\N	\N	JavaScript测试地址	北京	北京	\N	\N	010-88776655	updated@example.com	active	high	0.00	0.00	\N	\N	\N	1	1	2025-07-22 07:39:26.507378	2025-07-22 09:28:45.341639	\N
6	新测试企业2025	NTC2025	软件开发	limited_company	\N	\N	\N	北京市海淀区中关村软件园	北京	北京	\N	\N	010-88888888	contact@newtest2025.com	potential	high	\N	0.00	\N	\N	\N	1	\N	2025-07-22 07:32:44.640965	2025-07-22 07:32:44.640965	2025-07-22 13:28:56.944349
9	北京通运物流有限公司	111	物流	limited_company	111	111	魏小健	3322	北京	北京	\N	\N	010-99922332	xiaojian@tongyun.com	active	high	\N	0.00	\N	20	small	1	1	2025-07-22 09:26:50.849844	2025-07-22 13:30:53.037928	\N
5	测试企业_1753169472416_更新	TEST1753169472416	软件开发	limited_company	91000000000000000X	\N	张三	北京市朝阳区测试街道123号	北京	北京	100000	https://test.example.com	010-12345678	test@example.com	active	high	100000.00	0.00	\N	50	small	1	1	2025-07-22 07:31:12.422247	2025-07-22 07:31:12.433867	2025-08-01 12:26:00.776151
2	腾讯科技有限公司	TCT001	互联网科技	limited_company	91440300708461136T	\N	马化腾	深圳市南山区科技园科技中一路腾讯大厦	深圳	广东	\N	https://www.tencent.com	0755-86013388	contact@tencent.com	active	high	800000.00	0.00	\N	3000	enterprise	1	\N	2025-07-21 12:52:05.776093	2025-07-21 12:52:05.776093	2025-08-01 12:26:03.496506
3	百度在线网络技术有限公司	BDU001	人工智能	limited_company	91110000802100433B	\N	李彦宏	北京市海淀区上地十街10号百度大厦	北京	北京	\N	https://www.baidu.com	010-59928888	contact@baidu.com	potential	medium	500000.00	0.00	\N	2000	large	1	\N	2025-07-21 12:52:05.776093	2025-07-21 12:52:05.776093	2025-08-01 12:26:06.288887
1	北京品牌鞋服有限公司	\N	品牌鞋服		\N	\N	\N	北京北神树	北京	北京	\N		\N	\N	active	high	\N	0.00	\N	\N	\N	1	1	2025-07-21 12:52:05.776093	2025-07-22 04:58:33.854226	2025-08-01 12:26:09.383477
4	华为技术有限公司	HW001	通信设备	limited_company	91440300279439003E	\N	任正非	深圳市龙岗区坂田华为总部办公楼	深圳	广东	\N	https://www.huawei.com	0755-28780808	contact@huawei.com	active	high	1500000.00	0.00	\N	8000	enterprise	1	\N	2025-07-21 12:52:05.776093	2025-07-21 12:52:05.776093	2025-08-01 12:26:12.698899
10	北京欢乐宿供应链科技有限公司	\N	\N	limited_company	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	active	high	\N	0.00	\N	\N	\N	1	\N	2025-08-01 12:27:03.40532	2025-08-01 12:27:03.40532	\N
\.


--
-- Data for Name: customers_backup; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.customers_backup (id, name, company, industry, contact_person, email, phone, address, website, status, priority, contract_value, start_date, end_date, custom_fields, created_by, updated_by, created_at, updated_at, deleted_at) FROM stdin;
1	张三	阿里巴巴集团	电子商务	李经理	zhangsan@alibaba.com	13800138001	杭州市余杭区	\N	active	high	100000.00	\N	\N	{"tags": ["VIP客户", "长期合作"], "source": "官网咨询"}	1	\N	2025-07-20 23:55:26.595848	2025-07-20 23:55:26.595848	\N
2	王五	腾讯科技	互联网	陈总监	wangwu@tencent.com	13800138002	深圳市南山区	\N	potential	medium	80000.00	\N	\N	{"tags": ["潜在客户"], "source": "展会"}	1	\N	2025-07-20 23:55:26.595848	2025-07-20 23:55:26.595848	\N
3	李四	百度公司	搜索引擎	刘主管	lisi@baidu.com	13800138003	北京市海淀区	\N	active	medium	60000.00	\N	\N	{"tags": ["技术导向"], "source": "推荐"}	1	\N	2025-07-20 23:55:26.595848	2025-07-20 23:55:26.595848	\N
4	测试客户	测试公司	软件	张测试	test@example.com	13800000000	测试地址	\N	potential	medium	\N	\N	\N	\N	1	\N	2025-07-21 00:15:44.188157	2025-07-21 00:15:44.188157	\N
\.


--
-- Data for Name: encryption_keys; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.encryption_keys (id, key_name, key_value, algorithm, created_at, is_active) FROM stdin;
1	default_ai_key	KXNnroR0OWaGkqwujqEQnP030QwWf1SKZXYtMwnCfOU=	AES-256-GCM	2025-08-01 11:46:07.651108+00	t
\.


--
-- Data for Name: permission_audit_logs; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.permission_audit_logs (id, company_user_id, target_user_id, action_type, permission_code, resource_type, resource_id, old_value, new_value, reason, performed_by, performed_at, ip_address, user_agent) FROM stdin;
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.permissions (id, permission_code, permission_name, permission_description, module, resource, action, is_active, created_at) FROM stdin;
1	company.info.read	查看企业信息	可以查看企业基本信息	company	company_info	read	t	2025-07-21 13:49:09.17121
2	company.info.update	编辑企业信息	可以修改企业基本信息	company	company_info	update	t	2025-07-21 13:49:09.17121
3	company.users.read	查看企业用户	可以查看企业内所有用户信息	company	company_users	read	t	2025-07-21 13:49:09.17121
4	company.users.create	添加企业用户	可以添加新的企业用户	company	company_users	create	t	2025-07-21 13:49:09.17121
5	company.users.update	编辑企业用户	可以修改企业用户信息和权限	company	company_users	update	t	2025-07-21 13:49:09.17121
6	company.users.delete	删除企业用户	可以删除企业用户	company	company_users	delete	t	2025-07-21 13:49:09.17121
7	company.roles.manage	管理企业角色	可以创建、编辑、删除企业自定义角色	company	company_roles	manage	t	2025-07-21 13:49:09.17121
8	project.list.read	查看项目列表	可以查看企业项目列表	project	projects	read	t	2025-07-21 13:49:09.17121
9	project.detail.read	查看项目详情	可以查看项目详细信息	project	project_detail	read	t	2025-07-21 13:49:09.17121
10	project.create	创建项目	可以创建新项目	project	projects	create	t	2025-07-21 13:49:09.17121
11	project.update	编辑项目	可以修改项目信息	project	projects	update	t	2025-07-21 13:49:09.17121
12	project.delete	删除项目	可以删除项目	project	projects	delete	t	2025-07-21 13:49:09.17121
13	project.members.manage	管理项目成员	可以添加、移除项目成员并设置权限	project	project_members	manage	t	2025-07-21 13:49:09.17121
14	task.list.read	查看任务列表	可以查看项目任务列表	task	tasks	read	t	2025-07-21 13:49:09.17121
15	task.detail.read	查看任务详情	可以查看任务详细信息	task	task_detail	read	t	2025-07-21 13:49:09.17121
16	task.create	创建任务	可以创建新任务	task	tasks	create	t	2025-07-21 13:49:09.17121
17	task.update	编辑任务	可以修改任务信息和状态	task	tasks	update	t	2025-07-21 13:49:09.17121
18	task.delete	删除任务	可以删除任务	task	tasks	delete	t	2025-07-21 13:49:09.17121
19	task.assign	分配任务	可以将任务分配给其他用户	task	tasks	assign	t	2025-07-21 13:49:09.17121
20	finance.contracts.read	查看合同信息	可以查看合同和财务信息	finance	contracts	read	t	2025-07-21 13:49:09.17121
21	finance.contracts.manage	管理合同	可以创建、编辑合同信息	finance	contracts	manage	t	2025-07-21 13:49:09.17121
22	finance.reports.read	查看财务报表	可以查看财务统计和报表	finance	reports	read	t	2025-07-21 13:49:09.17121
23	system.audit_logs.read	查看审计日志	可以查看系统审计日志	system	audit_logs	read	t	2025-07-21 13:49:09.17121
24	system.settings.read	查看系统设置	可以查看系统设置信息	system	settings	read	t	2025-07-21 13:49:09.17121
25	system.settings.manage	管理系统设置	可以修改系统设置	system	settings	manage	t	2025-07-21 13:49:09.17121
\.


--
-- Data for Name: project_companies; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.project_companies (id, project_id, company_id, role, is_primary, created_at, updated_at) FROM stdin;
1	1	10	主客户	t	2025-08-01 12:27:46.482281+00	2025-08-01 12:27:46.482281+00
\.


--
-- Data for Name: project_users; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.project_users (id, project_id, user_id, role, is_primary, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.projects (id, name, description, owner_id, created_at, deleted_at, updated_at, project_number, company_id, status, priority, progress, start_date, end_date, budget) FROM stdin;
2	机器学习模型训练	深度学习模型训练和部署项目	1	2025-07-20 04:02:26.599473+00	2025-07-20 13:41:13.084359+00	2025-07-20 04:10:54.556316+00	\N	\N	planning	medium	0	\N	\N	\N
3	前端界面优化	React前端界面设计和用户体验优化	2	2025-07-20 04:02:26.599473+00	2025-07-20 13:41:16.002279+00	2025-07-20 04:10:54.556316+00	\N	\N	planning	medium	0	\N	\N	\N
34	李宁团购管理平台	111	1	2025-07-20 05:45:14.616094+00	\N	2025-07-22 07:12:26.428187+00	\N	\N	planning	medium	0	\N	\N	\N
35	通运物流系统	这是修复后的项目描述	1	2025-07-22 09:43:56.660978+00	\N	2025-07-22 13:01:56.041559+00	\N	\N	planning	medium	0	\N	\N	\N
1	AI项目管理平台MVP	智能项目管理平台的最小可行产品开发	1	2025-07-20 04:02:26.599473+00	\N	2025-08-01 12:27:46.476692+00	P101	10	planning	medium	70	2025-08-01 00:00:00+00	2026-09-30 00:00:00+00	\N
36	测试项目关联功能	测试项目创建和用户关联功能	1	2025-07-22 12:06:36.591547+00	2025-08-01 12:27:52.156752+00	2025-07-22 12:06:36.591547+00	\N	\N	planning	medium	0	\N	\N	\N
37	酷采3.0	重构	1	2025-07-22 13:41:28.353679+00	2025-08-01 12:27:54.686941+00	2025-07-22 13:41:28.353679+00	\N	\N	planning	medium	0	\N	\N	\N
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.role_permissions (id, role_id, permission_id, is_granted, created_at) FROM stdin;
1	1	1	t	2025-07-21 13:49:09.17121
2	1	2	t	2025-07-21 13:49:09.17121
3	1	3	t	2025-07-21 13:49:09.17121
4	1	4	t	2025-07-21 13:49:09.17121
5	1	5	t	2025-07-21 13:49:09.17121
6	1	6	t	2025-07-21 13:49:09.17121
7	1	7	t	2025-07-21 13:49:09.17121
8	1	8	t	2025-07-21 13:49:09.17121
9	1	9	t	2025-07-21 13:49:09.17121
10	1	10	t	2025-07-21 13:49:09.17121
11	1	11	t	2025-07-21 13:49:09.17121
12	1	12	t	2025-07-21 13:49:09.17121
13	1	13	t	2025-07-21 13:49:09.17121
14	1	14	t	2025-07-21 13:49:09.17121
15	1	15	t	2025-07-21 13:49:09.17121
16	1	16	t	2025-07-21 13:49:09.17121
17	1	17	t	2025-07-21 13:49:09.17121
18	1	18	t	2025-07-21 13:49:09.17121
19	1	19	t	2025-07-21 13:49:09.17121
20	1	20	t	2025-07-21 13:49:09.17121
21	1	21	t	2025-07-21 13:49:09.17121
22	1	22	t	2025-07-21 13:49:09.17121
23	1	23	t	2025-07-21 13:49:09.17121
24	1	24	t	2025-07-21 13:49:09.17121
25	1	25	t	2025-07-21 13:49:09.17121
26	2	1	t	2025-07-21 13:49:09.17121
27	2	3	t	2025-07-21 13:49:09.17121
28	2	8	t	2025-07-21 13:49:09.17121
29	2	9	t	2025-07-21 13:49:09.17121
30	2	10	t	2025-07-21 13:49:09.17121
31	2	11	t	2025-07-21 13:49:09.17121
32	2	13	t	2025-07-21 13:49:09.17121
33	2	14	t	2025-07-21 13:49:09.17121
34	2	15	t	2025-07-21 13:49:09.17121
35	2	16	t	2025-07-21 13:49:09.17121
36	2	17	t	2025-07-21 13:49:09.17121
37	2	18	t	2025-07-21 13:49:09.17121
38	2	19	t	2025-07-21 13:49:09.17121
39	3	1	t	2025-07-21 13:49:09.17121
40	3	3	t	2025-07-21 13:49:09.17121
41	3	8	t	2025-07-21 13:49:09.17121
42	3	9	t	2025-07-21 13:49:09.17121
43	3	14	t	2025-07-21 13:49:09.17121
44	3	15	t	2025-07-21 13:49:09.17121
45	3	20	t	2025-07-21 13:49:09.17121
46	3	21	t	2025-07-21 13:49:09.17121
47	3	22	t	2025-07-21 13:49:09.17121
48	4	1	t	2025-07-21 13:49:09.17121
49	4	3	t	2025-07-21 13:49:09.17121
50	4	8	t	2025-07-21 13:49:09.17121
51	4	9	t	2025-07-21 13:49:09.17121
52	4	11	t	2025-07-21 13:49:09.17121
53	4	14	t	2025-07-21 13:49:09.17121
54	4	15	t	2025-07-21 13:49:09.17121
55	4	16	t	2025-07-21 13:49:09.17121
56	4	17	t	2025-07-21 13:49:09.17121
57	4	19	t	2025-07-21 13:49:09.17121
58	5	1	t	2025-07-21 13:49:09.17121
59	5	3	t	2025-07-21 13:49:09.17121
60	5	8	t	2025-07-21 13:49:09.17121
61	5	9	t	2025-07-21 13:49:09.17121
62	5	14	t	2025-07-21 13:49:09.17121
63	5	15	t	2025-07-21 13:49:09.17121
64	5	20	t	2025-07-21 13:49:09.17121
65	6	1	t	2025-07-21 13:49:09.17121
66	6	8	t	2025-07-21 13:49:09.17121
67	6	9	t	2025-07-21 13:49:09.17121
68	6	14	t	2025-07-21 13:49:09.17121
69	6	15	t	2025-07-21 13:49:09.17121
70	6	17	t	2025-07-21 13:49:09.17121
\.


--
-- Data for Name: system_audit_log; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.system_audit_log (id, user_id, action, entity_type, entity_id, entity_data, ip_address, user_agent, created_at) FROM stdin;
\.


--
-- Data for Name: task_time_logs; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.task_time_logs (id, task_id, user_id, start_time, end_time, duration_seconds, created_at, updated_at, user_timer_task_id) FROM stdin;
1	\N	34	2025-08-01 12:16:29.485726	2025-08-01 15:28:48.513171	11539	2025-08-01 15:28:48.510725	2025-08-01 15:28:48.510725	2
2	\N	34	2025-08-01 15:36:55.154858	2025-08-01 15:37:01.409858	6	2025-08-01 15:37:01.408845	2025-08-01 15:37:01.408845	2
3	\N	34	2025-08-01 15:43:26.167883	2025-08-01 15:44:05.845306	39	2025-08-01 15:44:05.843032	2025-08-01 15:44:05.843032	2
4	\N	34	2025-08-01 15:46:17.909616	2025-08-01 15:46:47.620322	29	2025-08-01 15:46:47.619336	2025-08-01 15:46:47.619336	2
5	45	34	2025-08-01 15:55:05.616647	2025-08-01 15:55:34.26961	28	2025-08-01 15:55:34.26892	2025-08-01 15:55:34.26892	\N
6	\N	34	2025-08-01 15:56:41.834801	2025-08-01 16:01:15.108112	273	2025-08-01 16:01:15.094614	2025-08-01 16:01:15.094614	2
7	45	34	2025-08-01 16:01:15.109599	2025-08-01 16:01:49.701756	34	2025-08-01 16:01:49.700897	2025-08-01 16:01:49.700897	\N
8	\N	34	2025-08-01 16:03:32.679867	2025-08-01 16:03:38.762491	6	2025-08-01 16:03:38.760757	2025-08-01 16:03:38.760757	2
9	\N	34	2025-08-01 16:04:57.39169	2025-08-01 16:17:28.457218	751	2025-08-01 16:17:28.456033	2025-08-01 16:17:28.456033	2
10	\N	34	2025-08-01 16:18:36.592629	2025-08-01 16:22:22.246402	225	2025-08-01 16:22:22.243571	2025-08-01 16:22:22.243571	2
11	\N	34	2025-08-01 16:22:59.971584	2025-08-01 16:23:26.21225	26	2025-08-01 16:23:26.210933	2025-08-01 16:23:26.210933	2
12	\N	34	2025-08-01 16:24:11.963287	2025-08-01 16:26:07.698668	115	2025-08-01 16:26:07.697411	2025-08-01 16:26:07.697411	2
13	45	34	2025-08-01 16:30:45.606838	2025-08-01 16:32:48.395266	122	2025-08-01 16:32:48.387165	2025-08-01 16:32:48.387165	\N
14	45	34	2025-08-01 16:54:33.499742	2025-08-01 16:54:36.754258	3	2025-08-01 16:54:36.753119	2025-08-01 16:54:36.753119	\N
15	\N	34	2025-08-01 16:55:08.993446	2025-08-01 16:55:11.154146	2	2025-08-01 16:55:11.151489	2025-08-01 16:55:11.151489	2
16	\N	34	2025-08-01 16:55:13.375442	2025-08-01 16:55:25.256903	11	2025-08-01 16:55:25.256025	2025-08-01 16:55:25.256025	2
17	45	34	2025-08-01 17:01:30.322665	2025-08-01 17:02:10.130119	39	2025-08-01 17:02:10.127555	2025-08-01 17:02:10.127555	\N
18	\N	34	2025-08-01 17:06:23.112853	2025-08-01 17:06:28.262164	5	2025-08-01 17:06:28.261575	2025-08-01 17:06:28.261575	2
19	\N	34	2025-08-02 01:20:02.154417	2025-08-02 01:27:37.85323	455	2025-08-02 01:27:37.85247	2025-08-02 01:27:37.85247	2
20	\N	34	2025-08-02 01:27:57.938396	2025-08-02 01:28:02.79202	4	2025-08-02 01:28:02.79156	2025-08-02 01:28:02.79156	2
\.


--
-- Data for Name: task_updates; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.task_updates (id, task_id, update_type, old_value, new_value, updated_by, notes, created_at) FROM stdin;
1	6	status	todo	in_progress	\N	\N	2025-07-20 05:48:46.961803+00
2	8	status	completed	todo	\N	\N	2025-07-20 05:49:34.238285+00
3	8	status	todo	in_progress	\N	\N	2025-07-20 05:49:39.48817+00
4	8	status	in_progress	cancelled	\N	\N	2025-07-20 05:49:43.035191+00
5	5	status	in_progress	completed	\N	\N	2025-07-20 05:49:47.809768+00
6	5	status	completed	in_progress	\N	\N	2025-07-20 05:49:50.161376+00
7	26	status	todo	in_progress	\N	\N	2025-07-20 11:34:01.939255+00
8	29	status	todo	in_progress	\N	\N	2025-07-20 11:34:29.451229+00
9	28	status	todo	completed	\N	\N	2025-07-20 11:34:36.56622+00
10	35	status	todo	in_progress	\N	\N	2025-07-21 02:48:47.039725+00
11	15	status	todo	completed	\N	\N	2025-07-21 02:48:58.926969+00
12	30	status	todo	in_progress	\N	\N	2025-07-22 12:57:28.879883+00
13	47	status	in_progress	cancelled	\N	\N	2025-08-02 01:38:08.503647+00
14	46	status	in_progress	cancelled	\N	\N	2025-08-02 01:38:22.298613+00
15	50	status	todo	in_progress	\N	\N	2025-08-02 02:49:49.476391+00
16	50	status	in_progress	completed	\N	\N	2025-08-02 02:49:51.490368+00
17	53	status	pending	in_progress	\N	\N	2025-08-02 03:11:10.52612+00
18	53	status	in_progress	completed	\N	\N	2025-08-02 03:11:27.703429+00
19	54	status	pending	in_progress	\N	\N	2025-08-02 03:11:31.039873+00
20	54	status	in_progress	completed	\N	\N	2025-08-02 03:11:37.708483+00
21	55	status	pending	in_progress	\N	\N	2025-08-02 03:11:41.713277+00
22	59	status	pending	in_progress	\N	\N	2025-08-02 03:11:44.622348+00
23	55	status	in_progress	completed	\N	\N	2025-08-02 03:11:47.874711+00
24	56	status	pending	in_progress	\N	\N	2025-08-02 03:11:50.86576+00
25	59	status	in_progress	completed	\N	\N	2025-08-02 03:11:54.443105+00
26	56	status	in_progress	completed	\N	\N	2025-08-02 03:11:57.52084+00
27	57	status	pending	in_progress	\N	\N	2025-08-02 03:12:04.146878+00
28	57	status	in_progress	completed	\N	\N	2025-08-02 03:12:15.100078+00
29	58	status	pending	in_progress	\N	\N	2025-08-02 03:12:17.994508+00
30	58	status	in_progress	completed	\N	\N	2025-08-02 03:12:31.918513+00
33	64	status	pending	in_progress	\N	\N	2025-08-02 04:22:47.179747+00
35	64	title	录制AI自动化测试 - 已更新	录制AI自动化测试 - 修复后再次更新	\N	\N	2025-08-02 04:26:23.408066+00
36	64	status	in_progress	completed	\N	\N	2025-08-02 04:26:23.408958+00
37	64	description	用Playwright对测试1: create_task功能验证任务进行测试 - 这是一个更新后的描述	用Playwright对测试1: create_task功能验证任务进行测试 - 修复后的描述	\N	\N	2025-08-02 04:26:23.409369+00
38	65	description	通过Claude Code创建的子任务：用调试模式测试任务保存失败	开启前端和后端的详细调试模式，诊断任务保存失败的问题\n\n调试任务清单:\n☐ 检查前端任务编辑组件的网络请求\n☐ 查看浏览器开发者工具的Network和Console\n☐ 修复发现的前端问题\n☐ 分析前端代码的任务保存逻辑\n\n详细调试步骤:\n\n1. 前端调试设置:\n   - 打开浏览器开发者工具 (F12)\n   - 切换到 Network 标签页\n   - 启用 "Preserve log" 选项\n   - 清空现有日志记录\n\n2. 后端调试设置:\n   - 查看 Docker 容器日志: docker logs go_backend -f\n   - 检查 API 错误响应\n   - 监控数据库连接状态\n\n3. 重现问题:\n   - 进入任务详情页: http://localhost:3000/projects/1/tasks/50\n   - 尝试编辑任务标题或描述\n   - 点击保存按钮\n   - 观察请求失败的具体错误\n\n4. 分析网络请求:\n   - 检查 PUT /api/v1/projects/1/tasks/{id} 请求\n   - 验证请求头中的 Authorization\n   - 查看请求体数据格式\n   - 分析响应状态码和错误消息\n\n5. 前端代码检查:\n   - 检查 TaskEdit 组件的提交逻辑\n   - 验证表单数据序列化\n   - 确认 API 调用参数正确性\n   - 检查错误处理机制\n\n6. 修复验证:\n   - 应用修复方案\n   - 重新测试任务保存功能\n   - 验证错误消息显示\n   - 确认数据持久化\n\n完成时间: 今天\n优先级: 高\n父任务: #50 Claude Code MCP 集成测试任务\n\n预期结果:\n- 识别任务保存失败的根本原因\n- 修复前端或后端的相关问题\n- 确保任务编辑功能正常工作\n- 提供详细的调试报告	\N	\N	2025-08-02 04:46:10.906308+00
39	53	description	通过Claude Code创建的子任务：测试1: create_task功能验证	通过Claude Code创建的子任务：测试1: create_task功能1111	\N	\N	2025-08-02 04:51:14.464218+00
40	53	description	通过Claude Code创建的子任务：测试1: create_task功能1111	# 测试1: create_task功能验证 - 测试用例方案\n\n## 测试目标\n验证任务管理系统的创建任务(create_task)功能是否正常工作，确保用户能够成功创建新任务并在界面中正确显示。\n\n## 测试环境\n- 浏览器: Chrome/Firefox 最新版\n- 测试地址: http://localhost:3000\n- 登录凭据: admin / password\n- 父任务页面: http://localhost:3000/projects/1/tasks/50\n\n## 测试前提条件\n1. 系统服务正常运行 (前端、后端、数据库)\n2. 用户已成功登录系统\n3. 用户具有任务创建权限\n4. 当前位于任务详情页面\n\n## 测试用例设计\n\n### 用例1: 基础任务创建功能验证\n**测试步骤:**\n1. 登录系统 (admin/password)\n2. 导航到任务详情页: /projects/1/tasks/50\n3. 查找并点击"创建子任务"或"添加任务"按钮\n4. 在任务标题字段输入: "自动化测试创建的任务 - " + 当前时间戳\n5. 在任务描述字段输入: "这是通过Playwright自动化测试创建的任务，用于验证create_task功能"\n6. 点击"保存"或"创建"按钮\n7. 等待页面响应(2秒)\n8. 验证新任务是否出现在任务列表中\n\n**预期结果:**\n- 任务创建成功，页面显示成功提示\n- 新任务出现在任务列表中\n- 任务标题和描述正确显示\n- 任务状态为"pending"或"待处理"\n\n### 用例2: 表单验证测试\n**测试步骤:**\n1. 点击"创建子任务"按钮\n2. 不填写任务标题，直接点击保存\n3. 观察表单验证提示\n4. 填写极长的任务标题(超过100字符)\n5. 点击保存并观察系统响应\n\n**预期结果:**\n- 空标题时显示验证错误提示\n- 超长标题得到适当处理(截断或错误提示)\n\n### 用例3: 用户界面交互验证\n**测试步骤:**\n1. 验证创建任务表单的UI元素\n2. 检查表单字段的可用性\n3. 验证按钮的响应状态\n4. 检查页面的响应式布局\n\n**预期结果:**\n- 所有UI元素正确显示和交互\n- 表单提交后按钮状态正确更新\n- 页面布局在不同屏幕尺寸下正常\n\n## 测试执行策略\n\n### 自动化测试脚本要求:\n1. **录制视频**: 开启屏幕录制功能\n2. **模拟人类操作**: \n   - 每次点击后等待500ms\n   - 页面切换后等待2秒\n   - 输入文字时模拟打字速度\n3. **详细日志**: 记录每个操作步骤和结果\n4. **截图保存**: 关键步骤自动截图\n5. **错误处理**: 捕获并记录任何异常\n\n### 验证检查点:\n- ✅ 登录成功\n- ✅ 页面加载完成\n- ✅ 找到创建任务按钮\n- ✅ 表单正确显示\n- ✅ 任务创建成功\n- ✅ 新任务在列表中显示\n- ✅ 任务详情正确\n\n## 测试数据\n- 任务标题: "Playwright自动测试任务-" + 时间戳\n- 任务描述: "通过自动化测试创建，验证create_task功能的正确性"\n- 优先级: 中等\n- 截止日期: 今天\n\n## 成功标准\n1. 任务创建流程完全无错误\n2. 新任务正确保存到数据库\n3. 前端界面正确显示新任务\n4. 所有用户交互响应正常\n5. 测试视频完整记录整个过程\n\n## 风险和注意事项\n- 网络延迟可能影响测试时序\n- 页面加载时间可能变化\n- 需要确保测试数据不与现有数据冲突\n- 测试后清理创建的测试数据\n\n## 执行时间估算\n- 准备阶段: 1分钟\n- 执行测试: 3-5分钟\n- 结果验证: 1分钟\n- 总计: 5-7分钟	\N	\N	2025-08-02 04:54:10.971843+00
41	64	title	录制AI自动化测试 - 修复后再次更新	测试任务编辑 - 调试模式	\N	\N	2025-08-02 05:11:00.138806+00
42	64	status	completed	in_progress	\N	\N	2025-08-02 05:11:00.139876+00
43	64	description	用Playwright对测试1: create_task功能验证任务进行测试 - 修复后的描述	这是一个用于调试的任务编辑测试	\N	\N	2025-08-02 05:11:00.140396+00
44	69	status	todo	in_progress	\N	\N	2025-08-02 05:28:29.497248+00
45	70	status	pending	in_progress	\N	\N	2025-08-02 05:28:29.505341+00
46	67	title	31-02-01：新增与"创建兄弟任务"、"手工批量创建子任务"、"任务文档"、"任务详情"的接口	31-02-01：创建兄弟任务接口	\N	\N	2025-08-02 05:34:26.421934+00
47	71	status	pending	in_progress	\N	\N	2025-08-02 05:34:26.438471+00
48	72	status	pending	in_progress	\N	\N	2025-08-02 05:34:26.452802+00
49	73	status	pending	in_progress	\N	\N	2025-08-02 05:34:26.464889+00
50	66	status	todo	in_progress	\N	\N	2025-08-02 05:34:26.470393+00
51	66	description	基于现有任务管理系统，通过MCP桥接服务实现Claude Code与任务管理系统的深度集成，实现自然语言驱动的任务管理工作流。	# 31周-02：claude-mcp功能1.1版升级\n\n## 📋 项目概述\n基于现有的AI项目管理平台，通过MCP桥接服务实现Claude Code与任务管理系统的深度集成，实现自然语言驱动的任务管理工作流。\n\n## 🎯 核心目标\n- 扩展MCP服务器功能，支持更多任务管理操作\n- 实现兄弟任务创建、批量子任务创建等高级功能\n- 完善任务文档和详情查看接口\n- 确保Claude Code能够通过自然语言执行复杂任务操作\n\n## 📊 开发阶段规划\n\n### Phase 1: 基础接口开发 (预计2天)\n☐ 分析现有API端点和数据结构\n☐ 设计新增接口的规格文档\n☐ 确定输入输出参数格式\n☐ 制定错误处理策略\n\n### Phase 2: MCP服务器集成 (预计2天)\n☐ 扩展TaskMCPServer类功能\n☐ 实现新的MCP工具方法\n☐ 更新工具注册列表\n☐ 测试MCP协议兼容性\n\n### Phase 3: 功能实现与测试 (预计3天)\n☐ 实现创建兄弟任务接口\n☐ 实现手工批量创建子任务接口\n☐ 实现任务文档管理接口\n☐ 实现任务详情查看接口\n☐ 编写单元测试和集成测试\n\n### Phase 4: 文档与验收 (预计1天)\n☐ 完善API文档\n☐ 编写使用指南\n☐ 执行端到端测试\n☐ 代码审查和优化\n\n## 🛠 技术架构考虑\n\n### MCP协议compliance\n☐ 确保符合MCP协议标准\n☐ 实现正确的工具注册机制\n☐ 处理请求响应格式规范\n☐ 错误处理和状态码规范\n\n### API设计原则\n☐ RESTful接口设计\n☐ 统一的请求响应格式\n☐ 完善的参数验证\n☐ 合理的权限控制\n\n### 性能优化\n☐ 数据库查询优化\n☐ 批量操作性能考虑\n☐ 错误重试机制\n☐ 并发处理能力\n\n## ✅ 验收标准\n\n### 功能完整性\n☐ 所有4个子任务功能完整实现\n☐ 支持通过Claude Code自然语言调用\n☐ 错误处理覆盖各种边界情况\n☐ API响应时间在可接受范围内\n\n### 质量标准\n☐ 代码覆盖率达到80%以上\n☐ 所有单元测试通过\n☐ 集成测试场景完整\n☐ 文档齐全且准确\n\n### 用户体验\n☐ Claude Code集成测试通过\n☐ 自然语言指令识别准确\n☐ 操作反馈清晰明确\n☐ 错误提示友好易懂\n\n## 📅 关键里程碑\n- 8月2日: 需求分析和设计完成\n- 8月3日: 基础接口开发完成\n- 8月4日: MCP集成完成\n- 8月5日: 功能测试完成\n- 8月6日: 文档和验收完成\n\n## 🔗 相关资源\n- 现有MCP服务器: /mcp-task-bridge/\n- API文档: /backend/docs/\n- 测试用例: /mcp-test-automation/\n- 前端界面: http://localhost:3000	\N	\N	2025-08-02 05:37:14.208308+00
56	74	status	todo	in_progress	\N	\N	2025-08-02 05:59:14.163361+00
57	75	status	pending	in_progress	\N	\N	2025-08-02 05:59:14.16776+00
58	74	status	todo	in_progress	\N	\N	2025-08-02 06:01:09.97639+00
59	48	status	in_progress	completed	\N	\N	2025-08-02 06:02:46.9691+00
60	76	description	通过Claude Code创建的子任务：31-02-05：delete_task - 删除单个任务	作为一名专业的MCP服务器开发工程师，你需要为ai-proj任务管理系统实现delete_task功能。\n\n**任务目标**：\n- 在TaskMCPServer类中添加deleteTask方法\n- 在MCP工具列表中注册delete_task工具\n- 实现安全的任务删除机制\n\n**技术要求**：\n1. API集成：调用DELETE /api/v1/projects/{projectId}/tasks/{taskId}端点\n2. 安全验证：验证用户权限和任务所有权\n3. 级联处理：检查并处理子任务的删除逻辑\n4. 错误处理：提供详细的错误信息和回滚机制\n5. 日志记录：记录删除操作的审计日志\n\n**输入参数**：\n- id (number): 要删除的任务ID\n- force (boolean, 可选): 是否强制删除（包含子任务）\n\n**输出格式**：\n- success: boolean\n- message: string\n- deleted_task_id: number\n- affected_subtasks: number[]\n\n**代码文件**：\n- /mcp-task-bridge/task-mcp.ts (添加deleteTask方法)\n- /mcp-task-bridge/index.ts (注册delete_task工具)\n\n请确保代码质量、错误处理完善，并遵循现有代码风格。	\N	\N	2025-08-02 06:37:28.230822+00
61	77	description	通过Claude Code创建的子任务：31-02-06：update_task - 更新任务信息	作为一名专业的MCP服务器开发工程师，你需要为ai-proj任务管理系统实现update_task功能。\n\n**任务目标**：\n- 在TaskMCPServer类中添加updateTask方法\n- 在MCP工具列表中注册update_task工具\n- 实现灵活的任务字段更新机制\n\n**技术要求**：\n1. API集成：调用PUT /api/v1/projects/{projectId}/tasks/{taskId}端点\n2. 字段验证：验证更新字段的有效性和格式\n3. 部分更新：支持只更新指定字段，保持其他字段不变\n4. 状态管理：正确处理任务状态转换逻辑\n5. 变更记录：记录字段变更历史和操作者信息\n\n**输入参数**：\n- id (number): 要更新的任务ID\n- updates (object): 更新字段对象\n  - title (string, 可选): 新标题\n  - description (string, 可选): 新描述\n  - status (string, 可选): 新状态\n  - priority (string, 可选): 新优先级\n  - due_date (string, 可选): 新截止日期\n\n**输出格式**：\n- success: boolean\n- message: string\n- updated_task: Task对象\n- changed_fields: string[]\n\n**代码文件**：\n- /mcp-task-bridge/task-mcp.ts (添加updateTask方法)\n- /mcp-task-bridge/index.ts (注册update_task工具)\n\n请确保输入验证严格、支持增量更新，并维护数据一致性。	\N	\N	2025-08-02 06:38:40.05755+00
62	78	description	通过Claude Code创建的子任务：31-02-07：archive_task - 归档任务	作为一名专业的MCP服务器开发工程师，你需要为ai-proj任务管理系统实现archive_task功能。\n\n**任务目标**：\n- 在TaskMCPServer类中添加archiveTask方法\n- 在MCP工具列表中注册archive_task工具\n- 实现完整的任务归档和恢复机制\n\n**技术要求**：\n1. API集成：调用POST /api/v1/projects/{projectId}/tasks/{taskId}/archive端点\n2. 归档逻辑：实现软删除机制，保持数据完整性\n3. 批量操作：支持单个和批量任务归档\n4. 状态管理：正确设置archived_at时间戳和归档状态\n5. 恢复功能：提供unarchiveTask反向操作\n\n**输入参数**：\n- id (number): 要归档的任务ID\n- reason (string, 可选): 归档原因\n- archive_subtasks (boolean, 可选): 是否同时归档子任务\n\n**输出格式**：\n- success: boolean\n- message: string\n- archived_task_id: number\n- archived_at: string (ISO日期)\n- archived_subtasks: number[]\n\n**代码文件**：\n- /mcp-task-bridge/task-mcp.ts (添加archiveTask和unarchiveTask方法)\n- /mcp-task-bridge/index.ts (注册archive_task和unarchive_task工具)\n\n请确保归档操作可逆、支持批量处理，并维护完整的审计跟踪。	\N	\N	2025-08-02 06:38:40.592533+00
63	79	description	通过Claude Code创建的子任务：31-02-08：move_task - 移动任务到其他项目	作为一名专业的MCP服务器开发工程师，你需要为ai-proj任务管理系统实现move_task功能。\n\n**任务目标**：\n- 在TaskMCPServer类中添加moveTask方法\n- 在MCP工具列表中注册move_task工具\n- 实现安全的跨项目任务移动机制\n\n**技术要求**：\n1. API集成：调用POST /api/v1/projects/{sourceProjectId}/tasks/{taskId}/move端点\n2. 权限验证：验证用户对源项目和目标项目的操作权限\n3. 关系保持：正确处理任务层级关系和依赖\n4. 数据一致性：确保移动过程中的数据完整性\n5. 事务处理：使用事务确保操作的原子性\n\n**输入参数**：\n- task_id (number): 要移动的任务ID\n- source_project_id (number): 源项目ID\n- target_project_id (number): 目标项目ID\n- move_subtasks (boolean, 可选): 是否移动子任务\n- preserve_hierarchy (boolean, 可选): 是否保持层级结构\n\n**输出格式**：\n- success: boolean\n- message: string\n- moved_task_id: number\n- source_project: number\n- target_project: number\n- moved_subtasks: number[]\n- operation_id: string\n\n**代码文件**：\n- /mcp-task-bridge/task-mcp.ts (添加moveTask方法)\n- /mcp-task-bridge/index.ts (注册move_task工具)\n\n请确保移动操作安全可靠、支持复杂层级结构，并提供详细的操作日志。	\N	\N	2025-08-02 06:38:41.137404+00
64	88	title	测试更新功能的任务	更新后的任务标题	\N	\N	2025-08-02 07:06:47.495725+00
65	88	status	pending	in_progress	\N	\N	2025-08-02 07:06:47.505723+00
66	88	title	更新后的任务标题	最终更新的标题	\N	\N	2025-08-02 07:06:47.532423+00
67	88	status	in_progress	completed	\N	\N	2025-08-02 07:06:47.532825+00
68	88	description	通过Claude Code创建：测试更新功能的任务	这是更新后的详细描述	\N	\N	2025-08-02 07:06:47.533482+00
69	89	title	测试更新功能的任务	更新后的任务标题	\N	\N	2025-08-02 07:08:44.191856+00
70	89	status	pending	in_progress	\N	\N	2025-08-02 07:08:44.201312+00
71	89	title	更新后的任务标题	最终更新的标题	\N	\N	2025-08-02 07:08:44.229918+00
72	89	status	in_progress	completed	\N	\N	2025-08-02 07:08:44.230719+00
73	89	description	通过Claude Code创建：测试更新功能的任务	这是更新后的详细描述	\N	\N	2025-08-02 07:08:44.231226+00
74	95	status	pending	in_progress	\N	\N	2025-08-02 07:28:04.815951+00
75	95	status	in_progress	completed	\N	\N	2025-08-02 07:28:31.498228+00
76	106	description	通过Claude Code创建：Markdown功能测试	# Markdown功能测试\n\n这是一个**粗体**文本和*斜体*文本的示例。\n\n## 功能列表\n\n- ✅ 粗体支持\n- ✅ 斜体支持\n- ✅ 标题支持\n- ✅ 列表支持\n\n### 代码示例\n\n```javascript\nfunction hello() {\n  console.log("Hello Markdown!");\n}\n```\n\n### 链接测试\n\n这是一个[链接示例](https://example.com)。\n\n> 这是一个引用块的示例	\N	\N	2025-08-02 08:14:17.914258+00
\.


--
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.tasks (id, project_id, title, description, status, assignee_id, due_date, custom_fields, created_at, parent_id, task_level, sort_order, deleted_at, updated_at, total_time_seconds, archived_at) FROM stdin;
8	1	设计用户表结构	设计用户表的字段和约束	cancelled	1	2025-07-21	{"priority": "high", "project_name": "AI项目管理平台MVP", "assignee_name": "admin", "children_count": 0, "estimated_hours": 4}	2025-07-20 04:12:27.867965+00	5	2	1	2025-07-20 11:33:15.779927+00	2025-07-20 04:12:27.867965+00	0	\N
67	1	31-02-01：创建兄弟任务接口	# 31-02-01：创建兄弟任务接口\n\n## 🎯 功能需求分析\n\n### 核心功能定义\n☐ 在指定任务的同级别创建新任务（兄弟任务）\n☐ 保持与原任务相同的父级关系和层级结构\n☐ 支持自定义任务标题、描述、优先级等属性\n☐ 自动继承项目ID和部分默认属性\n\n### 输入输出规格\n**输入参数:**\n☐ referenceTaskId (number): 参考任务ID，新任务将创建为其兄弟\n☐ title (string): 新任务标题\n☐ description (string, optional): 任务描述\n☐ priority (string, optional): 优先级 (low/medium/high)\n☐ assigneeId (number, optional): 指派用户ID\n☐ dueDate (string, optional): 截止日期\n\n**输出格式:**\n```json\n{\n  "success": true/false,\n  "data": {\n    "id": "新任务ID",\n    "title": "任务标题",\n    "parent_id": "父任务ID（与参考任务相同）",\n    "project_id": "项目ID",\n    "status": "pending",\n    "sibling_of": "参考任务ID"\n  },\n  "message": "✅ 兄弟任务已创建"\n}\n```\n\n### 业务逻辑梳理\n☐ 查询参考任务的详细信息\n☐ 获取参考任务的父级ID和项目ID\n☐ 验证用户是否有在该项目创建任务的权限\n☐ 创建新任务并设置正确的层级关系\n☐ 返回创建结果和关系信息\n\n## 🛠 技术实现方案\n\n### API设计\n**端点:** POST /api/v1/projects/{projectId}/tasks/{referenceTaskId}/sibling\n☐ 设计RESTful风格的API端点\n☐ 实现参数验证中间件\n☐ 添加权限检查逻辑\n☐ 实现错误处理和状态码\n\n**数据库操作:**\n☐ 查询参考任务信息: SELECT * FROM tasks WHERE id = ?\n☐ 获取父级信息验证层级关系\n☐ 插入新任务记录，parent_id与参考任务相同\n☐ 更新相关统计信息（如子任务数量）\n\n### 数据结构设计\n```typescript\ninterface CreateSiblingTaskRequest {\n  title: string;\n  description?: string;\n  priority?: 'low' | 'medium' | 'high';\n  assigneeId?: number;\n  dueDate?: string;\n}\n\ninterface SiblingTaskResponse {\n  id: number;\n  title: string;\n  parent_id: number | null;\n  project_id: number;\n  status: string;\n  created_at: string;\n  sibling_of: number;\n}\n```\n\n### 错误处理\n☐ 参考任务不存在: 404 Not Found\n☐ 权限不足: 403 Forbidden  \n☐ 参数验证失败: 400 Bad Request\n☐ 数据库操作失败: 500 Internal Server Error\n☐ 循环依赖检查: 409 Conflict\n\n### 参数验证\n☐ 验证referenceTaskId为有效数字\n☐ 验证title非空且长度在限制范围内\n☐ 验证priority枚举值正确性\n☐ 验证dueDate格式符合ISO 8601\n☐ 验证assigneeId对应用户存在\n\n## 🔌 MCP集成要求\n\n### MCP Server方法实现\n☐ 实现 createSiblingTask(referenceTaskId, taskData) 方法\n☐ 添加到TaskMCPServer类中\n☐ 实现错误处理和响应格式化\n☐ 添加调试日志输出\n\n### 工具注册\n☐ 在MCP Server的tools/list中注册新工具\n☐ 定义工具描述: "创建兄弟任务"\n☐ 配置输入参数schema\n☐ 设置工具分类和权限\n\n```javascript\n{\n  name: 'create_sibling_task',\n  description: '在指定任务的同级别创建兄弟任务',\n  inputSchema: {\n    type: 'object',\n    properties: {\n      referenceTaskId: { type: 'number', description: '参考任务ID' },\n      title: { type: 'string', description: '新任务标题' },\n      description: { type: 'string', description: '任务描述（可选）' },\n      priority: { type: 'string', enum: ['low', 'medium', 'high'] }\n    },\n    required: ['referenceTaskId', 'title']\n  }\n}\n```\n\n### 请求响应处理\n☐ 实现tools/call处理逻辑\n☐ 参数解析和验证\n☐ 调用后端API\n☐ 格式化返回结果\n\n## 🧪 测试计划\n\n### 单元测试\n☐ 测试参考任务查询逻辑\n☐ 测试参数验证功能\n☐ 测试权限检查机制\n☐ 测试错误处理覆盖率\n\n### 集成测试  \n☐ 测试完整的创建兄弟任务流程\n☐ 测试与前端的API集成\n☐ 测试数据库事务完整性\n☐ 测试并发操作安全性\n\n### 端到端测试\n☐ 通过Claude Code自然语言创建兄弟任务\n☐ 验证前端界面正确显示新任务\n☐ 测试任务层级关系正确性\n☐ 验证权限控制有效性\n\n### 测试用例\n☐ 正常场景: 成功创建兄弟任务\n☐ 边界场景: 参考任务为根任务\n☐ 异常场景: 参考任务不存在\n☐ 权限场景: 无权限创建任务\n\n## ⏱ 预计工期\n\n### 开发时间估算\n☐ API设计和数据库schema: 2小时\n☐ 后端接口实现: 4小时\n☐ MCP集成开发: 2小时\n☐ 单元测试编写: 2小时\n☐ 集成测试和调试: 2小时\n☐ **总计: 12小时 (1.5工作日)**\n\n### 关键里程碑\n☐ 8月2日下午: API设计完成\n☐ 8月3日上午: 后端实现完成\n☐ 8月3日下午: MCP集成完成\n☐ 8月3日晚: 测试完成\n\n## ✅ 验收标准\n☐ 能够通过Claude Code执行: "为任务#50创建兄弟任务：前端优化"\n☐ 新创建的任务与参考任务在同一层级\n☐ 任务关系在前端界面正确显示\n☐ 所有测试用例通过\n☐ API文档完整准确\n\n## 🔗 依赖关系\n- 需要现有的任务CRUD API\n- 依赖用户权限管理系统\n- 前端任务树显示组件\n- MCP协议基础设施	in_progress	\N	\N	{}	2025-08-02 05:25:34.341301+00	66	2	0	\N	2025-08-02 05:38:35.358298+00	0	\N
77	1	31-02-06：update_task - 更新任务信息	作为一名专业的MCP服务器开发工程师，你需要为ai-proj任务管理系统实现update_task功能。\n\n**任务目标**：\n- 在TaskMCPServer类中添加updateTask方法\n- 在MCP工具列表中注册update_task工具\n- 实现灵活的任务字段更新机制\n\n**技术要求**：\n1. API集成：调用PUT /api/v1/projects/{projectId}/tasks/{taskId}端点\n2. 字段验证：验证更新字段的有效性和格式\n3. 部分更新：支持只更新指定字段，保持其他字段不变\n4. 状态管理：正确处理任务状态转换逻辑\n5. 变更记录：记录字段变更历史和操作者信息\n\n**输入参数**：\n- id (number): 要更新的任务ID\n- updates (object): 更新字段对象\n  - title (string, 可选): 新标题\n  - description (string, 可选): 新描述\n  - status (string, 可选): 新状态\n  - priority (string, 可选): 新优先级\n  - due_date (string, 可选): 新截止日期\n\n**输出格式**：\n- success: boolean\n- message: string\n- updated_task: Task对象\n- changed_fields: string[]\n\n**代码文件**：\n- /mcp-task-bridge/task-mcp.ts (添加updateTask方法)\n- /mcp-task-bridge/index.ts (注册update_task工具)\n\n请确保输入验证严格、支持增量更新，并维护数据一致性。	pending	\N	\N	{}	2025-08-02 06:38:40.03891+00	66	2	0	\N	2025-08-02 06:38:40.056352+00	0	\N
9	1	设计项目表结构	设计项目表的字段和关系	completed	1	2025-07-21	{"priority": "high", "estimated_hours": 6}	2025-07-20 04:12:27.867965+00	5	2	2	2025-07-20 11:33:15.779927+00	2025-07-20 04:12:27.867965+00	0	\N
27	34	设计文档	开发新的用户界面功能	todo	1	2025-08-01	{"tags": ["功能开发", "前端"], "priority": "high", "estimated_hours": 40}	2025-07-20 10:56:41.668068+00	\N	0	0	2025-07-20 11:32:44.263758+00	2025-07-20 10:56:41.668068+00	0	\N
10	1	设计任务表结构	设计任务表的字段和层级关系	completed	1	2025-07-21	{"priority": "high", "estimated_hours": 6}	2025-07-20 04:12:27.867965+00	5	2	3	2025-07-20 11:33:15.779927+00	2025-07-20 04:12:27.867965+00	0	\N
5	1	数据库设计	设计项目数据库表结构	in_progress	1	2025-07-21	{"priority": "high", "progress": 66, "project_name": "AI项目管理平台MVP", "assignee_name": "admin", "children_count": 3, "estimated_hours": 16}	2025-07-20 04:12:27.867965+00	\N	0	2	2025-07-20 11:33:15.779927+00	2025-07-20 05:49:43.033812+00	0	\N
29	34	33223		in_progress	\N	\N	{"tags": [], "priority": "medium", "project_name": "李宁团购管理平台", "children_count": 0}	2025-07-20 11:34:08.606596+00	26	2	0	2025-07-20 11:34:43.022857+00	2025-07-20 11:34:08.606596+00	0	\N
86	1	子任务1：MCP服务器配置优化	通过Claude Code创建的子任务：子任务1：MCP服务器配置优化	pending	\N	\N	{}	2025-08-02 06:59:32.876835+00	85	2	0	2025-08-02 06:59:43.266468+00	2025-08-02 06:59:32.876835+00	0	\N
87	1	子任务2：API接口错误处理完善	通过Claude Code创建的子任务：子任务2：API接口错误处理完善	pending	\N	\N	{}	2025-08-02 06:59:36.671943+00	85	2	0	2025-08-02 07:11:07.187792+00	2025-08-02 06:59:36.671943+00	0	\N
85	1	任务#50：Claude MCP集成测试主任务	通过Claude Code创建：任务#50：Claude MCP集成测试主任务	todo	\N	\N	{"progress": 0}	2025-08-02 06:59:27.277497+00	\N	0	0	2025-08-02 07:11:07.187792+00	2025-08-02 06:59:36.671943+00	0	\N
92	1	测试移动任务功能	通过Claude Code创建：测试移动任务功能	todo	\N	\N	{"priority": "low"}	2025-08-02 07:26:22.740307+00	\N	0	0	2025-08-02 07:26:22.834155+00	2025-08-02 07:26:22.740307+00	0	\N
19	1	222	2	todo	\N	\N	{"tags": [], "priority": "medium"}	2025-07-20 05:49:05.777786+00	6	2	0	2025-07-20 12:03:58.049031+00	2025-07-20 05:49:05.777786+00	0	\N
7	1	前端页面开发	开发React前端界面	todo	2	2025-07-30	{"priority": "medium", "estimated_hours": 40}	2025-07-20 04:12:27.867965+00	\N	0	4	2025-07-20 12:09:19.93083+00	2025-07-20 04:12:27.867965+00	0	\N
11	1	用户认证API	实现用户登录注册接口	todo	2	2025-07-24	{"priority": "high", "estimated_hours": 8}	2025-07-20 04:12:27.867965+00	6	2	1	2025-07-20 12:09:19.93083+00	2025-07-20 04:12:27.867965+00	0	\N
12	1	项目管理API	实现项目CRUD接口	todo	2	2025-07-25	{"priority": "high", "estimated_hours": 12}	2025-07-20 04:12:27.867965+00	6	2	2	2025-07-20 12:09:19.93083+00	2025-07-20 04:12:27.867965+00	0	\N
13	1	任务管理API	实现任务CRUD和层级接口	todo	2	2025-07-26	{"priority": "high", "estimated_hours": 12}	2025-07-20 04:12:27.867965+00	6	2	3	2025-07-20 12:09:19.93083+00	2025-07-20 04:12:27.867965+00	0	\N
23	34	功能测试	测试新功能的各项指标	todo	1	2025-07-30	{"tags": ["测试", "验收", "子任务"], "priority": "medium", "estimated_hours": 4}	2025-07-20 10:47:46.210874+00	\N	0	0	2025-07-22 12:18:12.890231+00	2025-07-20 10:47:46.210874+00	0	\N
97	34	测试移动任务功能	通过Claude Code创建：测试移动任务功能	todo	\N	\N	{"priority": "low"}	2025-08-02 07:28:04.466398+00	\N	0	0	\N	2025-08-02 07:28:04.466398+00	0	\N
6	1	API接口开发	开发后端REST API接口	todo	2	2025-07-25	{"tags": [], "priority": "medium", "progress": 0, "estimated_hours": 32}	2025-07-20 04:12:27.867965+00	\N	0	3	2025-07-20 12:09:19.93083+00	2025-07-20 05:49:05.777786+00	0	\N
96	1	测试移动任务功能	通过Claude Code创建：测试移动任务功能	todo	\N	\N	{"priority": "low"}	2025-08-02 07:28:04.420562+00	\N	0	0	2025-08-02 07:28:04.471827+00	2025-08-02 07:28:04.420562+00	0	\N
41	34	文档编写	编写功能使用文档	todo	\N	2025-08-02	{"tags": ["文档", "说明"], "priority": "low", "estimated_hours": 4}	2025-07-21 02:49:43.555474+00	\N	0	0	2025-07-22 12:16:44.653481+00	2025-07-21 02:49:43.555474+00	0	\N
36	34	新功能开发计划	开发新的用户界面功能	todo	1	2025-08-01	{"tags": ["功能开发", "前端"], "priority": "high", "estimated_hours": 40}	2025-07-21 02:49:43.548936+00	\N	0	0	2025-07-22 12:17:25.242184+00	2025-07-21 02:49:43.548936+00	0	\N
37	34	UI组件设计	设计新的用户界面组件	todo	1	2025-07-22	{"tags": ["设计", "组件", "子任务"], "priority": "high", "estimated_hours": 16}	2025-07-21 02:49:43.55219+00	\N	0	0	2025-07-22 12:17:25.242184+00	2025-07-21 02:49:43.55219+00	0	\N
20	34	新功能开发计划	开发新的用户界面功能	todo	1	2025-08-01	{"tags": ["功能开发", "前端"], "priority": "high", "estimated_hours": 40}	2025-07-20 10:47:46.203969+00	\N	0	0	2025-08-01 15:25:21.695762+00	2025-07-20 10:47:46.203969+00	0	\N
14	34	项目环境搭建	搭建开发环境，包括Docker配置	todo	1	2025-07-20	{"tags": ["环境", "Docker"], "priority": "high", "estimated_hours": 8}	2025-07-20 05:45:38.356928+00	\N	0	0	2025-08-01 15:25:21.695762+00	2025-07-20 05:45:38.356928+00	0	\N
16	34	API接口开发	开发后端REST API接口	todo	\N	2025-07-25	{"tags": ["API", "后端"], "priority": "medium", "estimated_hours": 24}	2025-07-20 05:45:38.373697+00	\N	0	0	2025-08-01 15:25:21.695762+00	2025-07-20 05:45:38.373697+00	0	\N
17	34	前端页面开发	开发React前端界面	todo	\N	2025-07-30	{"tags": ["前端", "React"], "priority": "medium", "estimated_hours": 32}	2025-07-20 05:45:38.375025+00	\N	0	0	2025-08-01 15:25:21.695762+00	2025-07-20 05:45:38.375025+00	0	\N
99	1	子任务	通过Claude Code创建的子任务：子任务	todo	\N	\N	{"priority": "low"}	2025-08-02 07:28:04.49289+00	98	2	0	2025-08-02 07:28:04.525445+00	2025-08-02 07:28:04.49289+00	0	\N
98	1	有子任务的父任务	通过Claude Code创建：有子任务的父任务	todo	\N	\N	{"priority": "low", "progress": 0}	2025-08-02 07:28:04.48416+00	\N	0	0	2025-08-02 07:28:04.538078+00	2025-08-02 07:28:04.49289+00	0	\N
38	34	前端代码实现	实现前端界面代码	todo	1	2025-07-28	{"tags": ["前端", "开发", "子任务"], "priority": "medium", "estimated_hours": 20}	2025-07-21 02:49:43.553035+00	\N	0	0	2025-07-22 12:17:25.242184+00	2025-07-21 02:49:43.553035+00	0	\N
39	34	功能测试	测试新功能的各项指标	todo	1	2025-07-30	{"tags": ["测试", "验收", "子任务"], "priority": "medium", "estimated_hours": 4}	2025-07-21 02:49:43.55394+00	\N	0	0	2025-07-22 12:17:25.242184+00	2025-07-21 02:49:43.55394+00	0	\N
40	34	API接口对接	与后端API进行接口对接	todo	\N	2025-07-26	{"tags": ["API", "集成"], "priority": "medium", "estimated_hours": 8}	2025-07-21 02:49:43.554739+00	\N	0	0	2025-07-22 12:17:25.242184+00	2025-07-21 02:49:43.554739+00	0	\N
104	1	完善任务信息功能 - 增加Markdown编辑器支持详细信息记录	通过Claude Code创建：完善任务信息功能 - 增加Markdown编辑器支持详细信息记录	pending	\N	\N	{}	2025-08-02 07:35:09.468791+00	\N	0	0	\N	2025-08-02 07:35:09.468791+00	0	\N
2	1	安装Docker环境	在开发机器上安装Docker Desktop	completed	1	2025-07-19	{"priority": "high", "estimated_hours": 2}	2025-07-20 04:11:54.875182+00	1	2	1	2025-08-01 13:27:12.375804+00	2025-07-20 04:11:54.875182+00	0	\N
3	1	配置Docker Compose文件	创建docker-compose.yml配置文件	in_progress	1	2025-07-20	{"priority": "high", "estimated_hours": 4}	2025-07-20 04:11:54.875182+00	1	2	2	2025-08-01 13:27:12.375804+00	2025-07-20 04:11:54.875182+00	0	\N
4	1	环境测试验证	验证Docker环境是否正常工作	todo	1	2025-07-20	{"priority": "medium", "estimated_hours": 2}	2025-07-20 04:11:54.875182+00	1	2	3	2025-08-01 13:27:12.375804+00	2025-07-20 04:11:54.875182+00	0	\N
1	1	项目环境搭建	搭建开发环境，包括Docker配置	in_progress	1	2025-07-20	{"priority": "high", "progress": 33, "estimated_hours": 8}	2025-07-20 04:11:54.875182+00	\N	0	1	2025-08-01 13:27:12.375804+00	2025-07-20 04:11:54.875182+00	0	\N
43	1	测试文档自动生成任务	这是一个用于测试文档自动生成功能的任务	todo	\N	\N	{}	2025-08-01 12:37:25.092086+00	\N	0	0	2025-08-01 13:27:12.375804+00	2025-08-01 12:37:25.092086+00	0	\N
44	1	测试文档自动生成任务	这是一个用于测试文档自动生成功能的任务	todo	\N	\N	{}	2025-08-01 12:39:34.266907+00	\N	0	0	2025-08-01 13:27:12.375804+00	2025-08-01 12:39:34.266907+00	0	\N
18	34	测试和部署	进行系统测试和生产环境部署	todo	\N	2025-08-05	{"tags": ["测试", "部署"], "priority": "high", "estimated_hours": 12}	2025-07-20 05:45:38.375804+00	\N	0	0	2025-08-01 15:25:21.695762+00	2025-07-20 05:45:38.375804+00	0	\N
21	34	UI组件设计	设计新的用户界面组件	todo	1	2025-07-22	{"tags": ["设计", "组件", "子任务"], "priority": "high", "estimated_hours": 16}	2025-07-20 10:47:46.209074+00	\N	0	0	2025-08-01 15:25:21.695762+00	2025-07-20 10:47:46.209074+00	0	\N
22	34	前端代码实现	实现前端界面代码	todo	1	2025-07-28	{"tags": ["前端", "开发", "子任务"], "priority": "medium", "estimated_hours": 20}	2025-07-20 10:47:46.210216+00	\N	0	0	2025-08-01 15:25:21.695762+00	2025-07-20 10:47:46.210216+00	0	\N
24	34	API接口对接	与后端API进行接口对接	todo	\N	2025-07-26	{"tags": ["API", "集成"], "priority": "medium", "estimated_hours": 8}	2025-07-20 10:47:46.211349+00	\N	0	0	2025-08-01 15:25:21.695762+00	2025-07-20 10:47:46.211349+00	0	\N
25	34	文档编写	编写功能使用文档	todo	\N	2025-08-02	{"tags": ["文档", "说明"], "priority": "low", "estimated_hours": 4}	2025-07-20 10:47:46.212046+00	\N	0	0	2025-08-01 15:25:21.695762+00	2025-07-20 10:47:46.212046+00	0	\N
32	34	孙任务	3	todo	\N	\N	{"tags": [], "priority": "medium"}	2025-07-20 11:36:06.920694+00	31	3	0	2025-08-01 15:25:21.695762+00	2025-07-20 11:36:06.920694+00	0	\N
28	34	child task	22	completed	\N	\N	{"tags": [], "priority": "medium", "project_name": "李宁团购管理平台", "children_count": 0}	2025-07-20 11:33:47.11278+00	26	2	0	2025-08-01 15:25:21.695762+00	2025-07-20 11:33:47.11278+00	0	\N
31	34	第一次测试		todo	\N	\N	{"tags": [], "priority": "medium", "progress": 0}	2025-07-20 11:35:52.13218+00	30	2	0	2025-08-01 15:25:21.695762+00	2025-07-20 11:36:06.920694+00	0	\N
26	34	新功能开发计划文档	开发新的用户界面功能	in_progress	1	2025-08-01	{"tags": ["功能开发", "前端"], "priority": "high", "progress": 50, "estimated_hours": 40}	2025-07-20 10:56:41.663893+00	\N	0	0	2025-08-01 15:25:21.695762+00	2025-07-20 11:34:36.564077+00	0	\N
15	34	数据库设计	设计项目数据库表结构	completed	1	2025-07-21	{"tags": ["数据库", "设计"], "priority": "high", "progress": 0, "estimated_hours": 16}	2025-07-20 05:45:38.372525+00	\N	0	0	2025-08-01 15:25:21.695762+00	2025-07-21 02:48:47.033796+00	0	\N
30	34	UTA测试	33	in_progress	\N	\N	{"tags": [], "priority": "medium", "progress": 0}	2025-07-20 11:35:32.061031+00	\N	0	0	2025-08-01 15:25:21.695762+00	2025-07-22 12:56:59.599075+00	0	\N
35	34	2222		in_progress	\N	\N	{"tags": [], "priority": "medium"}	2025-07-20 23:28:21.219334+00	15	2	0	2025-08-01 15:25:21.695762+00	2025-07-20 23:28:21.219334+00	0	\N
42	34	孙任务	1122	todo	\N	\N	{"tags": [], "priority": "medium"}	2025-07-22 12:56:59.599075+00	30	2	0	2025-08-01 15:25:21.695762+00	2025-07-22 12:56:59.599075+00	0	\N
47	1	31周-01-02：启动计时器权限不足bug	personalTimerService.ts:210 \n POST http://localhost/api/v1/user/timer/start-personal 403 (Forbidden)\nconsoleFilter.ts:31 Failed to start timer: AppError: 权限不足\n    at api.ts:118:1\n    at async Object.startPersonalTimer (personalTimerService.ts:210:1)\n    at async TimerContext.tsx:283:1\n    at async Object.onClick (MVPTaskDetailTimer.tsx:159:1)\n	cancelled	\N	\N	{"tags": [], "priority": "medium"}	2025-08-01 15:36:46.531296+00	45	2	0	\N	2025-08-02 01:38:08.499869+00	0	\N
68	1	测试MCP连接任务	通过Claude Code创建：测试MCP连接任务	pending	\N	\N	{}	2025-08-02 05:28:18.970915+00	\N	0	0	2025-08-02 05:30:58.50776+00	2025-08-02 05:28:18.970915+00	0	\N
70	1	31-02-01：新增与"创建兄弟任务"、"手工批量创建子任务"、"任务文档"、"任务详情"的接口	通过Claude Code创建的子任务：31-02-01：新增与"创建兄弟任务"、"手工批量创建子任务"、"任务文档"、"任务详情"的接口	in_progress	\N	\N	{}	2025-08-02 05:28:29.48643+00	69	2	0	2025-08-02 05:30:58.50776+00	2025-08-02 05:28:29.504338+00	0	\N
46	1	31周-01-01：分析计时器的bugs原因	The current code is registering the old timer handler routes\n  (/api/v1/timer/start, /api/v1/timer/stop) but the frontend is trying to call\n  the new personal timer routes (/api/v1/user/timer/stop)	cancelled	\N	\N	{"tags": [], "priority": "high", "estimated_hours": 1}	2025-08-01 15:29:15.584265+00	45	2	0	\N	2025-08-02 01:38:22.294373+00	0	\N
69	1	31周-02：claude-mcp功能1.1版升级	通过Claude Code创建：31周-02：claude-mcp功能1.1版升级	todo	\N	\N	{"progress": 0}	2025-08-02 05:28:29.474142+00	\N	0	0	2025-08-02 05:30:58.50776+00	2025-08-02 05:28:29.504338+00	0	\N
48	1	31周-01-03：重构计时器处理器	 当前架构问题\n\n  1. TimerHandler - 处理项目任务计时（旧版）\n  2. PersonalTimerHandler - 处理个人+项目任务计时（新版）\n  3. UserTimerHandler - 处理个人任务CRUD\n  4. ConcurrentSafeTimerHandler - 并发安全版本\n\n  问题分析：\n  - 🔄 职责重叠: PersonalTimerHandler 既处理个人任务又处理项目任务\n  - 📝 代码重复: 多个处理器有相似的事务处理、用户状态管理\n  - 🏗️ 架构复杂: 4个处理器增加维护成本\n  - 🏷️ 命名混乱: PersonalTimerHandler 实际处理两种任务类型\n\n  重构方案建议\n\n⏺ Update Todos\n  ⎿  ☐ 设计统一的计时器架构 - UnifiedTimerHandler      \n     ☐ 提取共同的计时核心逻辑到 TimerService\n     ☐ 重新设计API路由 - 统一 /user/timer/* 接口\n     ☐ 添加任务类型枚举 (personal/project) 替代多处理器\n     ☐ 实现暂停/恢复功能作为重构的一部分	completed	\N	\N	{"tags": [], "priority": "high", "estimated_hours": 1}	2025-08-02 01:37:37.653977+00	45	2	0	\N	2025-08-02 06:02:46.96185+00	0	\N
105	1	升级任务文档功能 - 支持富文本编辑和多文档管理	通过Claude Code创建：升级任务文档功能 - 支持富文本编辑和多文档管理	pending	\N	\N	{}	2025-08-02 07:35:13.615558+00	\N	0	0	\N	2025-08-02 07:35:13.615558+00	0	\N
49	1	MCP测试任务	通过Claude Code MCP创建的测试任务	pending	\N	\N	{}	2025-08-02 02:37:08.549866+00	\N	0	0	2025-08-02 05:16:04.365965+00	2025-08-02 02:37:08.549866+00	0	\N
51	1	子任务: 前端集成开发	通过Claude Code创建的子任务：子任务: 前端集成开发	pending	\N	\N	{}	2025-08-02 02:49:49.455893+00	50	2	0	\N	2025-08-02 02:49:49.455893+00	0	\N
59	1	测试任务A: API接口开发	通过Claude Code创建：测试任务A: API接口开发	completed	\N	\N	{}	2025-08-02 03:11:17.364849+00	\N	0	0	2025-08-02 05:16:04.365965+00	2025-08-02 03:11:54.442053+00	0	\N
52	1	子任务: 后端 API 调试	通过Claude Code创建的子任务：子任务: 后端 API 调试	pending	\N	\N	{}	2025-08-02 02:49:49.465095+00	50	2	0	\N	2025-08-02 02:49:49.465095+00	0	\N
61	1	子任务A: 设计UI界面	通过Claude Code创建的子任务：子任务A: 设计UI界面	pending	\N	\N	{}	2025-08-02 03:12:07.545145+00	60	2	0	2025-08-02 05:16:04.365965+00	2025-08-02 03:12:07.545145+00	0	\N
62	1	子任务B: 实现交互逻辑	通过Claude Code创建的子任务：子任务B: 实现交互逻辑	pending	\N	\N	{}	2025-08-02 03:12:11.009595+00	60	2	0	2025-08-02 05:16:04.365965+00	2025-08-02 03:12:11.009595+00	0	\N
60	1	测试任务B: 前端组件设计	通过Claude Code创建：测试任务B: 前端组件设计	todo	\N	\N	{"progress": 0}	2025-08-02 03:11:20.713823+00	\N	0	0	2025-08-02 05:16:04.365965+00	2025-08-02 03:12:11.009595+00	0	\N
55	1	测试3: start_task功能验证	通过Claude Code创建的子任务：测试3: start_task功能验证	completed	\N	\N	{}	2025-08-02 03:10:54.912394+00	50	2	0	\N	2025-08-02 03:11:47.872599+00	0	\N
71	1	31-02-02：手工批量创建子任务接口	# 31-02-02：手工批量创建子任务接口\n\n## 🎯 功能需求分析\n\n### 核心功能定义\n☐ 支持一次性为指定父任务创建多个子任务\n☐ 允许手工指定每个子任务的详细属性\n☐ 提供批量操作的事务性保证（全部成功或全部失败）\n☐ 支持任务模板和快速批量创建模式\n\n### 输入输出规格\n**输入参数:**\n☐ parentTaskId (number): 父任务ID\n☐ tasks (array): 子任务列表\n  - title (string): 任务标题\n  - description (string, optional): 任务描述\n  - priority (string, optional): 优先级\n  - assigneeId (number, optional): 指派用户\n  - dueDate (string, optional): 截止日期\n  - estimatedHours (number, optional): 预估工时\n  - tags (array, optional): 标签列表\n☐ options (object, optional): 批量创建选项\n  - autoAssign (boolean): 是否自动分配\n  - inheritSettings (boolean): 是否继承父任务设置\n  - startStatus (string): 初始状态\n\n**输出格式:**\n```json\n{\n  "success": true/false,\n  "data": {\n    "parent_id": "父任务ID",\n    "created_count": "成功创建数量",\n    "failed_count": "失败数量",\n    "tasks": [\n      {\n        "id": "任务ID",\n        "title": "任务标题",\n        "status": "pending",\n        "order": "排序位置"\n      }\n    ],\n    "errors": ["错误信息列表"]\n  },\n  "message": "✅ 批量创建完成：成功X个，失败Y个"\n}\n```\n\n### 业务逻辑梳理\n☐ 验证父任务存在性和权限\n☐ 批量验证所有子任务数据格式\n☐ 检查任务标题重复性\n☐ 计算子任务排序顺序\n☐ 使用数据库事务确保原子性\n☐ 处理部分成功的情况\n\n## 🛠 技术实现方案\n\n### API设计\n**端点:** POST /api/v1/projects/{projectId}/tasks/{parentTaskId}/bulk-subtasks\n☐ 设计支持批量操作的RESTful接口\n☐ 实现请求体大小限制（避免过大批量操作）\n☐ 添加批量操作专用的验证逻辑\n☐ 实现进度回调机制（用于大批量操作）\n\n**数据库操作:**\n☐ 开启数据库事务 BEGIN TRANSACTION\n☐ 批量插入子任务记录 INSERT INTO tasks\n☐ 更新父任务的子任务计数\n☐ 创建任务关系记录\n☐ 提交事务 COMMIT 或回滚 ROLLBACK\n\n### 数据结构设计\n```typescript\ninterface BulkSubTaskRequest {\n  parentTaskId: number;\n  tasks: SubTaskData[];\n  options?: BulkCreateOptions;\n}\n\ninterface SubTaskData {\n  title: string;\n  description?: string;\n  priority?: 'low' | 'medium' | 'high';\n  assigneeId?: number;\n  dueDate?: string;\n  estimatedHours?: number;\n  tags?: string[];\n}\n\ninterface BulkCreateOptions {\n  autoAssign?: boolean;\n  inheritSettings?: boolean;\n  startStatus?: 'pending' | 'todo' | 'in_progress';\n  maxBatchSize?: number;\n}\n\ninterface BulkCreateResult {\n  parent_id: number;\n  created_count: number;\n  failed_count: number;\n  tasks: CreatedTask[];\n  errors: string[];\n}\n```\n\n### 错误处理\n☐ 父任务不存在: 404 Not Found\n☐ 批量大小超限: 413 Payload Too Large\n☐ 数据验证失败: 400 Bad Request\n☐ 数据库事务失败: 500 Internal Server Error\n☐ 部分创建失败: 207 Multi-Status\n\n### 参数验证\n☐ 验证parentTaskId有效性\n☐ 验证tasks数组不为空且不超过限制\n☐ 逐一验证每个子任务数据格式\n☐ 检查assigneeId用户存在性\n☐ 验证日期格式和逻辑合理性\n\n### 性能优化\n☐ 使用批量INSERT语句而非逐个插入\n☐ 实现分批处理避免超时\n☐ 添加操作进度反馈\n☐ 优化数据库索引查询\n\n## 🔌 MCP集成要求\n\n### MCP Server方法实现\n☐ 实现 bulkCreateSubTasks(parentTaskId, tasksData, options) 方法\n☐ 支持简化的批量创建: createMultipleSubTasks(parentId, titles[])\n☐ 添加进度回调支持\n☐ 实现错误聚合和报告\n\n### 工具注册\n☐ 注册 bulk_create_subtasks 工具\n☐ 注册 quick_create_subtasks 工具（简化版）\n☐ 配置合理的输入参数限制\n☐ 添加使用示例和文档\n\n```javascript\n{\n  name: 'bulk_create_subtasks',\n  description: '批量创建子任务，支持详细配置',\n  inputSchema: {\n    type: 'object',\n    properties: {\n      parentTaskId: { type: 'number', description: '父任务ID' },\n      tasks: {\n        type: 'array',\n        items: {\n          type: 'object',\n          properties: {\n            title: { type: 'string', description: '任务标题' },\n            description: { type: 'string', description: '任务描述' },\n            priority: { type: 'string', enum: ['low', 'medium', 'high'] }\n          },\n          required: ['title']\n        },\n        maxItems: 20,\n        description: '子任务列表（最多20个）'\n      }\n    },\n    required: ['parentTaskId', 'tasks']\n  }\n},\n{\n  name: 'quick_create_subtasks',\n  description: '快速批量创建子任务，仅需标题',\n  inputSchema: {\n    type: 'object',\n    properties: {\n      parentTaskId: { type: 'number', description: '父任务ID' },\n      titles: {\n        type: 'array',\n        items: { type: 'string' },\n        maxItems: 10,\n        description: '任务标题列表（最多10个）'\n      }\n    },\n    required: ['parentTaskId', 'titles']\n  }\n}\n```\n\n### 请求响应处理\n☐ 实现两种批量模式的处理逻辑\n☐ 添加操作进度信息\n☐ 格式化批量操作结果\n☐ 处理部分成功的复杂情况\n\n## 🧪 测试计划\n\n### 单元测试\n☐ 测试批量数据验证逻辑\n☐ 测试数据库事务处理\n☐ 测试错误聚合机制\n☐ 测试性能边界情况\n\n### 集成测试  \n☐ 测试大批量创建操作（100个子任务）\n☐ 测试并发批量创建\n☐ 测试事务回滚机制\n☐ 测试内存使用情况\n\n### 端到端测试\n☐ 通过Claude Code执行批量创建\n☐ 验证前端批量显示效果\n☐ 测试用户体验流畅性\n☐ 验证权限和安全性\n\n### 压力测试\n☐ 测试最大批量大小限制\n☐ 测试数据库连接池压力\n☐ 测试内存泄漏情况\n☐ 测试超时处理机制\n\n## ⏱ 预计工期\n\n### 开发时间估算\n☐ API设计和数据结构: 3小时\n☐ 后端批量处理逻辑: 6小时\n☐ 数据库事务优化: 2小时\n☐ MCP集成和工具注册: 3小时\n☐ 单元测试和集成测试: 4小时\n☐ 性能测试和优化: 2小时\n☐ **总计: 20小时 (2.5工作日)**\n\n### 关键里程碑\n☐ 8月2日: API设计和数据结构完成\n☐ 8月3日: 后端核心逻辑实现\n☐ 8月4日: MCP集成和基础测试\n☐ 8月5日: 性能优化和压力测试\n\n## ✅ 验收标准\n☐ 支持一次创建最多20个子任务\n☐ 批量操作事务性保证\n☐ 响应时间在5秒内（20个任务）\n☐ 内存使用合理，无泄漏\n☐ 错误处理覆盖所有场景\n☐ Claude Code集成测试通过\n\n### 性能指标\n☐ 10个子任务创建时间 < 2秒\n☐ 20个子任务创建时间 < 5秒\n☐ 内存峰值 < 100MB\n☐ 数据库连接及时释放\n\n### 用户体验\n☐ 操作进度实时反馈\n☐ 错误信息清晰明确\n☐ 部分失败时的合理处理\n☐ 前端界面响应流畅\n\n## 🔗 依赖关系\n- 数据库事务处理机制\n- 任务权限验证系统\n- 前端批量显示组件\n- MCP协议基础设施\n- 性能监控和日志系统\n\n## 📝 使用示例\n**Claude Code自然语言:**\n- "为任务#66批量创建5个子任务：前端开发、后端开发、测试、部署、文档"\n- "在项目管理任务下快速创建：需求分析、UI设计、开发实现、测试验证"\n\n**MCP调用示例:**\n```javascript\n// 详细模式\nbulkCreateSubTasks(66, [\n  { title: "前端开发", priority: "high", assigneeId: 1 },\n  { title: "后端开发", priority: "high", assigneeId: 2 },\n  { title: "测试验证", priority: "medium", assigneeId: 3 }\n]);\n\n// 快速模式  \nquickCreateSubTasks(66, [\n  "需求分析", "UI设计", "开发实现", "测试验证"\n]);\n```	in_progress	\N	\N	{}	2025-08-02 05:34:26.4299+00	66	2	0	\N	2025-08-02 05:39:31.3307+00	0	\N
72	1	31-02-03：任务文档接口	# 31-02-03：任务文档接口\n\n## 🎯 功能需求分析\n\n### 核心功能定义\n☐ 提供任务文档的完整CRUD操作接口\n☐ 支持任务文档的创建、读取、更新、删除\n☐ 实现文档版本历史管理\n☐ 支持文档模板和智能推荐\n☐ 提供文档搜索和关联查询功能\n\n### 输入输出规格\n**文档创建输入:**\n☐ taskId (number): 任务ID\n☐ content (string): 文档内容（Markdown格式）\n☐ title (string, optional): 文档标题\n☐ template (string, optional): 模板类型\n☐ autoGenerate (boolean, optional): 是否自动生成\n\n**文档查询输入:**\n☐ taskId (number): 任务ID\n☐ version (string, optional): 版本号\n☐ format (string, optional): 输出格式 (markdown/html/json)\n\n**输出格式:**\n```json\n{\n  "success": true/false,\n  "data": {\n    "task_id": "任务ID",\n    "document": {\n      "id": "文档ID",\n      "title": "文档标题",\n      "content": "文档内容",\n      "format": "markdown",\n      "version": "1.0.0",\n      "created_at": "创建时间",\n      "updated_at": "更新时间",\n      "author": "作者信息",\n      "word_count": "字数统计",\n      "templates_used": ["使用的模板"],\n      "metadata": {\n        "tags": ["标签"],\n        "category": "文档分类",\n        "status": "draft/published"\n      }\n    },\n    "history": ["历史版本列表"],\n    "related_docs": ["相关文档"]\n  },\n  "message": "✅ 任务文档操作成功"\n}\n```\n\n### 业务逻辑梳理\n☐ 任务文档的生命周期管理\n☐ 文档与任务的关联关系维护\n☐ 版本控制和历史记录\n☐ 智能模板匹配和推荐\n☐ 文档内容搜索和索引\n☐ 权限控制和访问管理\n\n## 🛠 技术实现方案\n\n### API设计\n**文档管理端点:**\n☐ GET /api/v1/projects/{projectId}/tasks/{taskId}/document - 获取任务文档\n☐ POST /api/v1/projects/{projectId}/tasks/{taskId}/document - 创建任务文档\n☐ PUT /api/v1/projects/{projectId}/tasks/{taskId}/document - 更新任务文档\n☐ DELETE /api/v1/projects/{projectId}/tasks/{taskId}/document - 删除任务文档\n☐ GET /api/v1/projects/{projectId}/tasks/{taskId}/document/history - 获取文档历史\n☐ POST /api/v1/projects/{projectId}/tasks/{taskId}/document/template - 从模板创建\n\n**文档搜索端点:**\n☐ GET /api/v1/projects/{projectId}/documents/search - 文档全文搜索\n☐ GET /api/v1/tasks/{taskId}/documents/related - 获取相关文档\n\n### 数据结构设计\n```typescript\ninterface TaskDocument {\n  id: string;\n  task_id: number;\n  project_id: number;\n  title: string;\n  content: string;\n  format: 'markdown' | 'html' | 'text';\n  version: string;\n  status: 'draft' | 'published' | 'archived';\n  author_id: number;\n  created_at: string;\n  updated_at: string;\n  metadata: DocumentMetadata;\n}\n\ninterface DocumentMetadata {\n  tags: string[];\n  category: string;\n  word_count: number;\n  templates_used: string[];\n  auto_generated: boolean;\n  last_editor: number;\n}\n\ninterface DocumentVersion {\n  version: string;\n  content: string;\n  author_id: number;\n  created_at: string;\n  change_summary: string;\n}\n\ninterface DocumentTemplate {\n  id: string;\n  name: string;\n  category: string;\n  content_template: string;\n  variables: TemplateVariable[];\n  conditions: TemplateCondition[];\n}\n```\n\n### 文档处理功能\n☐ Markdown渲染和预览\n☐ 文档格式转换 (Markdown ↔ HTML)\n☐ 文档内容校验和清理\n☐ 自动生成文档摘要\n☐ 关键词提取和标签推荐\n☐ 文档相似度计算\n\n### 模板系统\n☐ 智能模板匹配算法\n☐ 模板变量替换机制\n☐ 条件模板选择逻辑\n☐ 自定义模板创建\n☐ 模板使用统计分析\n\n### 版本控制\n☐ 文档版本自动编号\n☐ 变更历史记录\n☐ 版本比较和差异显示\n☐ 版本回退功能\n☐ 分支和合并支持\n\n## 🔌 MCP集成要求\n\n### MCP Server方法实现\n☐ getTaskDocument(taskId, options) - 获取任务文档\n☐ createTaskDocument(taskId, content, options) - 创建任务文档\n☐ updateTaskDocument(taskId, content, options) - 更新任务文档\n☐ generateTaskDocument(taskId, template) - 自动生成文档\n☐ searchTaskDocuments(query, filters) - 搜索文档\n☐ getDocumentHistory(taskId) - 获取文档历史\n\n### 工具注册\n```javascript\n{\n  name: 'get_task_document',\n  description: '获取指定任务的文档内容',\n  inputSchema: {\n    type: 'object',\n    properties: {\n      taskId: { type: 'number', description: '任务ID' },\n      format: { type: 'string', enum: ['markdown', 'html', 'text'], default: 'markdown' },\n      version: { type: 'string', description: '版本号（可选）' }\n    },\n    required: ['taskId']\n  }\n},\n{\n  name: 'create_task_document',\n  description: '为任务创建或更新文档',\n  inputSchema: {\n    type: 'object',\n    properties: {\n      taskId: { type: 'number', description: '任务ID' },\n      content: { type: 'string', description: '文档内容（Markdown格式）' },\n      title: { type: 'string', description: '文档标题（可选）' },\n      template: { type: 'string', description: '使用的模板（可选）' }\n    },\n    required: ['taskId', 'content']\n  }\n},\n{\n  name: 'generate_task_document',\n  description: '基于任务信息自动生成文档',\n  inputSchema: {\n    type: 'object',\n    properties: {\n      taskId: { type: 'number', description: '任务ID' },\n      template: { type: 'string', description: '文档模板类型' },\n      includeSubtasks: { type: 'boolean', description: '是否包含子任务信息' }\n    },\n    required: ['taskId']\n  }\n}\n```\n\n### 智能文档生成\n☐ 基于任务信息自动生成文档结构\n☐ 智能推荐合适的文档模板\n☐ 自动填充任务相关信息\n☐ 生成待办事项和检查清单\n☐ 创建项目进度跟踪文档\n\n## 🧪 测试计划\n\n### 单元测试\n☐ 文档CRUD操作测试\n☐ 模板匹配算法测试\n☐ 版本控制逻辑测试\n☐ 文档格式转换测试\n☐ 权限控制测试\n\n### 集成测试  \n☐ 文档与任务关联测试\n☐ 多用户协作编辑测试\n☐ 文档搜索功能测试\n☐ 模板系统集成测试\n☐ 版本历史完整性测试\n\n### 端到端测试\n☐ 通过Claude Code创建和编辑文档\n☐ 文档在前端界面的显示测试\n☐ 文档导出和分享功能测试\n☐ 移动端文档访问测试\n\n### 性能测试\n☐ 大文档处理性能测试\n☐ 文档搜索响应速度测试\n☐ 并发编辑性能测试\n☐ 版本历史查询性能测试\n\n## ⏱ 预计工期\n\n### 开发时间估算\n☐ 文档数据模型设计: 2小时\n☐ 基础CRUD接口实现: 6小时\n☐ 版本控制系统: 4小时\n☐ 模板系统开发: 6小时\n☐ 智能生成功能: 4小时\n☐ 搜索功能实现: 3小时\n☐ MCP集成和工具注册: 3小时\n☐ 测试和优化: 4小时\n☐ **总计: 32小时 (4工作日)**\n\n### 关键里程碑\n☐ 8月2日: 数据模型和基础API设计\n☐ 8月3日: 文档CRUD和版本控制实现\n☐ 8月4日: 模板系统和智能生成功能\n☐ 8月5日: 搜索功能和MCP集成\n☐ 8月6日: 测试完善和性能优化\n\n## ✅ 验收标准\n\n### 功能完整性\n☐ 支持完整的文档生命周期管理\n☐ 版本控制功能稳定可靠\n☐ 模板系统智能推荐准确\n☐ 文档搜索结果相关性高\n☐ 智能生成内容质量合格\n\n### 性能指标\n☐ 文档加载时间 < 2秒\n☐ 文档保存响应 < 1秒\n☐ 搜索响应时间 < 3秒\n☐ 支持最大100KB文档大小\n☐ 版本历史查询 < 1秒\n\n### 用户体验\n☐ 文档编辑界面友好直观\n☐ 版本比较功能清晰易用\n☐ 模板选择和应用流畅\n☐ 错误提示准确有帮助\n☐ 移动端适配良好\n\n### Claude Code集成\n☐ 自然语言创建文档: "为任务#66创建开发文档"\n☐ 智能生成: "基于任务信息生成项目计划文档"\n☐ 文档查询: "显示任务#50的文档内容"\n☐ 版本管理: "查看任务文档的修改历史"\n\n## 🔗 依赖关系\n- 任务管理核心系统\n- 用户权限和认证系统\n- 文件存储和管理服务\n- 全文搜索引擎\n- Markdown渲染组件\n- 前端富文本编辑器\n\n## 📝 使用场景示例\n\n### 典型工作流\n1. **自动生成**: 创建任务时自动生成基础文档模板\n2. **协作编辑**: 团队成员共同完善任务文档内容\n3. **版本跟踪**: 记录文档变更历史和关键决策\n4. **智能搜索**: 快速查找相关任务和历史文档\n5. **模板复用**: 将成功的文档结构保存为模板\n\n### 文档模板类型\n☐ 需求分析文档模板\n☐ 技术设计文档模板\n☐ 测试计划文档模板\n☐ 项目总结文档模板\n☐ 会议纪要文档模板\n☐ 问题跟踪文档模板\n\n## 🎨 前端集成考虑\n☐ 富文本编辑器集成\n☐ 实时预览功能\n☐ 文档导出功能（PDF/Word）\n☐ 评论和批注系统\n☐ 文档分享和权限设置	in_progress	\N	\N	{}	2025-08-02 05:34:26.443355+00	66	2	0	\N	2025-08-02 05:40:35.620427+00	0	\N
63	1	录制AI自动化测试 - 测试用	通过Claude Code创建的子任务：录制AI自动化测试 - 测试用	pending	\N	\N	{}	2025-08-02 04:14:50.531608+00	50	2	0	\N	2025-08-02 04:14:50.531608+00	0	\N
45	1	31周-01：修复定时器		in_progress	34	\N	{"tags": [], "priority": "medium", "progress": 33}	2025-08-01 13:27:38.72271+00	\N	0	0	\N	2025-08-02 06:02:46.96185+00	0	\N
56	1	测试4: complete_task功能验证	通过Claude Code创建的子任务：测试4: complete_task功能验证	completed	\N	\N	{}	2025-08-02 03:10:58.311231+00	50	2	0	\N	2025-08-02 03:11:57.519312+00	0	\N
81	1	测试子任务	通过Claude Code创建的子任务：测试子任务	pending	\N	\N	{}	2025-08-02 06:42:40.898548+00	80	2	0	2025-08-02 06:42:40.929111+00	2025-08-02 06:42:40.898548+00	0	\N
80	1	测试删除功能的任务	通过Claude Code创建：测试删除功能的任务	todo	\N	\N	{"progress": 0}	2025-08-02 06:42:40.867113+00	\N	0	0	2025-08-02 06:42:40.932274+00	2025-08-02 06:42:40.898548+00	0	\N
54	1	测试2: list_tasks功能验证	通过Claude Code创建的子任务：测试2: list_tasks功能验证	completed	\N	\N	{}	2025-08-02 03:10:51.472675+00	50	2	0	\N	2025-08-02 03:11:37.704974+00	0	\N
73	1	31-02-04：任务详情接口	# 31-02-04：任务详情接口\n\n## 🎯 功能需求分析\n\n### 核心功能定义\n☐ 提供任务完整详细信息的查询接口\n☐ 支持任务详情的结构化展示和格式化输出\n☐ 包含任务关联信息（子任务、父任务、依赖关系）\n☐ 提供任务统计信息和进度分析\n☐ 支持任务详情的多种视图模式\n\n### 输入输出规格\n**查询输入参数:**\n☐ taskId (number): 任务ID\n☐ includeRelations (boolean): 是否包含关联信息\n☐ includeHistory (boolean): 是否包含历史记录\n☐ includeStats (boolean): 是否包含统计信息\n☐ includeDocuments (boolean): 是否包含文档信息\n☐ includeComments (boolean): 是否包含评论信息\n☐ format (string): 输出格式 (detailed/summary/compact)\n☐ viewMode (string): 视图模式 (developer/manager/client)\n\n**详细输出格式:**\n```json\n{\n  "success": true,\n  "data": {\n    "task": {\n      "id": "任务ID",\n      "title": "任务标题",\n      "description": "任务描述",\n      "status": "任务状态",\n      "priority": "优先级",\n      "project_id": "项目ID",\n      "project_name": "项目名称",\n      "assignee": {\n        "id": "用户ID",\n        "name": "用户姓名",\n        "email": "用户邮箱",\n        "avatar": "头像URL"\n      },\n      "creator": {\n        "id": "创建者ID",\n        "name": "创建者姓名",\n        "created_at": "创建时间"\n      },\n      "dates": {\n        "created_at": "创建时间",\n        "updated_at": "更新时间",\n        "due_date": "截止日期",\n        "started_at": "开始时间",\n        "completed_at": "完成时间"\n      },\n      "metrics": {\n        "estimated_hours": "预估工时",\n        "actual_hours": "实际工时",\n        "progress_percentage": "完成百分比",\n        "time_spent": "已花费时间",\n        "time_remaining": "剩余时间"\n      },\n      "tags": ["标签列表"],\n      "custom_fields": {}\n    },\n    "relations": {\n      "parent": {\n        "id": "父任务ID",\n        "title": "父任务标题",\n        "status": "父任务状态"\n      },\n      "children": [\n        {\n          "id": "子任务ID",\n          "title": "子任务标题", \n          "status": "子任务状态",\n          "progress": "完成进度"\n        }\n      ],\n      "siblings": ["兄弟任务列表"],\n      "dependencies": {\n        "blocking": ["阻塞的任务"],\n        "blocked_by": ["被阻塞的任务"]\n      }\n    },\n    "statistics": {\n      "children_count": "子任务总数",\n      "completed_children": "已完成子任务数",\n      "completion_rate": "完成率",\n      "average_completion_time": "平均完成时间",\n      "workload_distribution": "工作量分布"\n    },\n    "history": [\n      {\n        "action": "操作类型",\n        "user": "操作用户",\n        "timestamp": "时间戳",\n        "details": "详细信息"\n      }\n    ],\n    "documents": [\n      {\n        "id": "文档ID",\n        "title": "文档标题",\n        "type": "文档类型",\n        "last_updated": "最后更新时间"\n      }\n    ],\n    "comments": [\n      {\n        "id": "评论ID",\n        "author": "评论作者",\n        "content": "评论内容",\n        "created_at": "创建时间"\n      }\n    ]\n  },\n  "message": "✅ 任务详情获取成功"\n}\n```\n\n### 业务逻辑梳理\n☐ 任务基础信息聚合查询\n☐ 关联关系的递归查询和组装\n☐ 统计信息的实时计算\n☐ 权限控制和信息过滤\n☐ 视图模式的差异化处理\n☐ 缓存策略和性能优化\n\n## 🛠 技术实现方案\n\n### API设计\n**主要端点:**\n☐ GET /api/v1/projects/{projectId}/tasks/{taskId}/details - 获取任务详情\n☐ GET /api/v1/projects/{projectId}/tasks/{taskId}/summary - 获取任务摘要\n☐ GET /api/v1/projects/{projectId}/tasks/{taskId}/relations - 获取任务关系\n☐ GET /api/v1/projects/{projectId}/tasks/{taskId}/timeline - 获取任务时间线\n☐ GET /api/v1/projects/{projectId}/tasks/{taskId}/metrics - 获取任务指标\n\n**查询优化:**\n☐ 使用联表查询减少数据库调用次数\n☐ 实现分页查询支持大量子任务\n☐ 添加字段选择器减少数据传输\n☐ 使用缓存提升热点数据访问速度\n\n### 数据结构设计\n```typescript\ninterface TaskDetailRequest {\n  taskId: number;\n  includes: {\n    relations?: boolean;\n    history?: boolean;\n    statistics?: boolean;\n    documents?: boolean;\n    comments?: boolean;\n    timeTracking?: boolean;\n  };\n  format: 'detailed' | 'summary' | 'compact';\n  viewMode: 'developer' | 'manager' | 'client';\n}\n\ninterface TaskDetailResponse {\n  task: TaskInfo;\n  relations?: TaskRelations;\n  statistics?: TaskStatistics;\n  history?: TaskHistory[];\n  documents?: DocumentInfo[];\n  comments?: CommentInfo[];\n  permissions: UserPermissions;\n}\n\ninterface TaskInfo {\n  id: number;\n  title: string;\n  description: string;\n  status: TaskStatus;\n  priority: Priority;\n  project: ProjectInfo;\n  assignee: UserInfo;\n  creator: UserInfo;\n  dates: TaskDates;\n  metrics: TaskMetrics;\n  tags: string[];\n  customFields: Record<string, any>;\n}\n\ninterface TaskRelations {\n  parent: TaskSummary | null;\n  children: TaskSummary[];\n  siblings: TaskSummary[];\n  dependencies: {\n    blocking: TaskSummary[];\n    blockedBy: TaskSummary[];\n  };\n  hierarchy: {\n    level: number;\n    path: number[];\n    rootTask: TaskSummary;\n  };\n}\n\ninterface TaskStatistics {\n  childrenCount: number;\n  completedChildren: number;\n  completionRate: number;\n  timeMetrics: {\n    estimatedHours: number;\n    actualHours: number;\n    efficiency: number;\n  };\n  workloadDistribution: WorkloadInfo[];\n}\n```\n\n### 查询优化策略\n☐ 实现智能字段选择，按需加载数据\n☐ 使用数据库连接池优化并发查询\n☐ 添加查询结果缓存层\n☐ 实现分批查询大量关联数据\n☐ 使用索引优化复杂查询性能\n\n### 权限和安全\n☐ 基于用户角色过滤敏感信息\n☐ 实现字段级别的权限控制\n☐ 添加任务访问日志记录\n☐ 防止信息泄露和越权访问\n☐ 实现数据脱敏处理\n\n### 视图模式处理\n**开发者视图:**\n☐ 包含完整的技术细节\n☐ 显示代码相关信息\n☐ 提供调试和诊断数据\n\n**管理者视图:**\n☐ 侧重项目进度和资源分配\n☐ 突出关键指标和风险点\n☐ 提供决策支持信息\n\n**客户视图:**\n☐ 隐藏内部技术细节\n☐ 重点展示交付成果\n☐ 简化术语和表达方式\n\n## 🔌 MCP集成要求\n\n### MCP Server方法实现\n☐ getTaskDetails(taskId, options) - 获取完整任务详情\n☐ getTaskSummary(taskId) - 获取任务摘要\n☐ getTaskRelations(taskId) - 获取任务关系\n☐ getTaskTimeline(taskId) - 获取任务时间线\n☐ getTaskMetrics(taskId) - 获取任务指标\n☐ formatTaskForDisplay(taskId, format) - 格式化任务展示\n\n### 工具注册\n```javascript\n{\n  name: 'get_task_details',\n  description: '获取任务的完整详细信息',\n  inputSchema: {\n    type: 'object',\n    properties: {\n      taskId: { type: 'number', description: '任务ID' },\n      includeRelations: { type: 'boolean', description: '包含关联信息', default: true },\n      includeHistory: { type: 'boolean', description: '包含历史记录', default: false },\n      includeStats: { type: 'boolean', description: '包含统计信息', default: true },\n      format: { type: 'string', enum: ['detailed', 'summary', 'compact'], default: 'detailed' },\n      viewMode: { type: 'string', enum: ['developer', 'manager', 'client'], default: 'developer' }\n    },\n    required: ['taskId']\n  }\n},\n{\n  name: 'get_task_summary',\n  description: '获取任务摘要信息',\n  inputSchema: {\n    type: 'object',\n    properties: {\n      taskId: { type: 'number', description: '任务ID' }\n    },\n    required: ['taskId']\n  }\n},\n{\n  name: 'analyze_task_progress',\n  description: '分析任务进度和性能指标',\n  inputSchema: {\n    type: 'object',\n    properties: {\n      taskId: { type: 'number', description: '任务ID' },\n      includeSubtasks: { type: 'boolean', description: '包含子任务分析', default: true }\n    },\n    required: ['taskId']\n  }\n}\n```\n\n### 智能分析功能\n☐ 任务健康度评估\n☐ 进度预测和风险识别\n☐ 性能瓶颈分析\n☐ 资源利用率统计\n☐ 改进建议生成\n\n## 🧪 测试计划\n\n### 单元测试\n☐ 任务详情查询逻辑测试\n☐ 关联关系构建测试\n☐ 统计计算准确性测试\n☐ 权限过滤功能测试\n☐ 视图模式转换测试\n\n### 集成测试  \n☐ 复杂任务层级查询测试\n☐ 大量数据查询性能测试\n☐ 并发访问稳定性测试\n☐ 缓存一致性测试\n☐ 跨项目权限测试\n\n### 端到端测试\n☐ Claude Code自然语言查询任务详情\n☐ 前端界面详情页面渲染测试\n☐ 移动端适配和显示测试\n☐ 不同用户角色访问测试\n\n### 性能基准测试\n☐ 简单任务查询 < 500ms\n☐ 复杂任务（100个子任务）< 2s\n☐ 并发100个请求稳定响应\n☐ 内存使用控制在合理范围\n\n## ⏱ 预计工期\n\n### 开发时间估算\n☐ API设计和数据模型: 3小时\n☐ 基础查询逻辑实现: 6小时\n☐ 关联关系查询优化: 4小时\n☐ 统计计算和分析功能: 5小时\n☐ 权限控制和视图过滤: 3小时\n☐ 缓存和性能优化: 4小时\n☐ MCP集成和工具注册: 3小时\n☐ 测试和文档完善: 4小时\n☐ **总计: 32小时 (4工作日)**\n\n### 关键里程碑\n☐ 8月2日: API设计和基础查询实现\n☐ 8月3日: 关联关系和统计功能完成\n☐ 8月4日: 权限控制和性能优化\n☐ 8月5日: MCP集成和测试验收\n\n## ✅ 验收标准\n\n### 功能完整性\n☐ 支持任务详情的全方位查询\n☐ 关联关系查询准确无误\n☐ 统计信息计算正确\n☐ 权限控制严格有效\n☐ 多视图模式正常切换\n\n### 性能指标\n☐ 基础查询响应时间 < 500ms\n☐ 复杂查询响应时间 < 2秒\n☐ 支持并发100+用户访问\n☐ 缓存命中率 > 80%\n☐ 内存使用稳定无泄漏\n\n### 用户体验\n☐ 信息展示结构清晰\n☐ 加载过程有适当反馈\n☐ 错误处理友好明确\n☐ 移动端显示适配良好\n☐ 不同角色看到合适信息\n\n### Claude Code集成\n☐ "显示任务#66的详细信息"\n☐ "分析任务#50的进度情况"\n☐ "查看任务#67的关联关系"\n☐ "统计任务#66的子任务完成情况"\n\n## 🔗 依赖关系\n- 任务管理核心数据库\n- 用户权限管理系统\n- 项目管理模块\n- 时间跟踪系统\n- 文档管理系统\n- 评论和协作模块\n\n## 📊 数据分析功能\n\n### 任务健康度评估\n☐ 基于进度和时间的健康度评分\n☐ 风险预警机制\n☐ 阻塞因素识别\n☐ 资源瓶颈分析\n\n### 进度预测\n☐ 基于历史数据的完成时间预测\n☐ 里程碑达成概率计算\n☐ 工作量分布分析\n☐ 团队效率评估\n\n### 智能建议\n☐ 任务优先级调整建议\n☐ 资源重新分配建议\n☐ 流程优化建议\n☐ 风险缓解措施建议\n\n## 📱 前端展示优化\n\n### 响应式设计\n☐ 桌面端详情面板设计\n☐ 移动端卡片式布局\n☐ 平板端适配优化\n☐ 打印友好的格式\n\n### 交互体验\n☐ 渐进式信息加载\n☐ 实时数据更新\n☐ 快捷操作按钮\n☐ 信息层级折叠展开\n\n### 可视化元素\n☐ 进度条和百分比显示\n☐ 状态图标和颜色编码\n☐ 时间线可视化\n☐ 关系图谱展示\n\n## 🔍 搜索和过滤\n\n### 高级搜索\n☐ 多字段组合搜索\n☐ 时间范围过滤\n☐ 状态和优先级筛选\n☐ 标签和分类过滤\n\n### 智能推荐\n☐ 相关任务推荐\n☐ 类似问题解决方案\n☐ 最佳实践建议\n☐ 模板和工具推荐\n\n## 📈 监控和分析\n\n### 使用统计\n☐ 查询频率统计\n☐ 用户行为分析\n☐ 性能监控指标\n☐ 错误率跟踪\n\n### 业务洞察\n☐ 任务完成效率分析\n☐ 团队协作模式识别\n☐ 项目健康度趋势\n☐ 资源利用率报告	todo	\N	\N	{"progress": 0}	2025-08-02 05:34:26.457873+00	66	2	0	\N	2025-08-02 06:55:12.230331+00	0	\N
88	1	最终更新的标题	这是更新后的详细描述	completed	\N	\N	{}	2025-08-02 07:06:47.465043+00	\N	0	0	2025-08-02 07:06:47.548853+00	2025-08-02 07:06:47.531949+00	0	\N
57	1	测试5: create_subtask功能验证	通过Claude Code创建的子任务：测试5: create_subtask功能验证	completed	\N	\N	{}	2025-08-02 03:11:01.411968+00	50	2	0	\N	2025-08-02 03:12:15.098936+00	0	\N
94	1	子任务	通过Claude Code创建的子任务：子任务	todo	\N	\N	{"priority": "low"}	2025-08-02 07:26:22.873248+00	93	2	0	2025-08-02 07:26:22.904639+00	2025-08-02 07:26:22.873248+00	0	\N
58	1	测试6: find_task功能验证	通过Claude Code创建的子任务：测试6: find_task功能验证	completed	\N	\N	{}	2025-08-02 03:11:04.378923+00	50	2	0	\N	2025-08-02 03:12:31.917119+00	0	\N
93	1	有子任务的父任务	通过Claude Code创建：有子任务的父任务	todo	\N	\N	{"priority": "low", "progress": 0}	2025-08-02 07:26:22.847539+00	\N	0	0	2025-08-02 07:26:22.925499+00	2025-08-02 07:26:22.873248+00	0	\N
65	1	用调试模式测试任务保存失败	开启前端和后端的详细调试模式，诊断任务保存失败的问题\n\n调试任务清单:\n☐ 检查前端任务编辑组件的网络请求\n☐ 查看浏览器开发者工具的Network和Console\n☐ 修复发现的前端问题\n☐ 分析前端代码的任务保存逻辑\n\n详细调试步骤:\n\n1. 前端调试设置:\n   - 打开浏览器开发者工具 (F12)\n   - 切换到 Network 标签页\n   - 启用 "Preserve log" 选项\n   - 清空现有日志记录\n\n2. 后端调试设置:\n   - 查看 Docker 容器日志: docker logs go_backend -f\n   - 检查 API 错误响应\n   - 监控数据库连接状态\n\n3. 重现问题:\n   - 进入任务详情页: http://localhost:3000/projects/1/tasks/50\n   - 尝试编辑任务标题或描述\n   - 点击保存按钮\n   - 观察请求失败的具体错误\n\n4. 分析网络请求:\n   - 检查 PUT /api/v1/projects/1/tasks/{id} 请求\n   - 验证请求头中的 Authorization\n   - 查看请求体数据格式\n   - 分析响应状态码和错误消息\n\n5. 前端代码检查:\n   - 检查 TaskEdit 组件的提交逻辑\n   - 验证表单数据序列化\n   - 确认 API 调用参数正确性\n   - 检查错误处理机制\n\n6. 修复验证:\n   - 应用修复方案\n   - 重新测试任务保存功能\n   - 验证错误消息显示\n   - 确认数据持久化\n\n完成时间: 今天\n优先级: 高\n父任务: #50 Claude Code MCP 集成测试任务\n\n预期结果:\n- 识别任务保存失败的根本原因\n- 修复前端或后端的相关问题\n- 确保任务编辑功能正常工作\n- 提供详细的调试报告	pending	\N	\N	{}	2025-08-02 04:45:37.871781+00	50	2	0	\N	2025-08-02 04:46:10.903274+00	0	\N
64	1	测试任务编辑 - 调试模式	这是一个用于调试的任务编辑测试	in_progress	\N	\N	{}	2025-08-02 04:15:23.543898+00	50	2	0	\N	2025-08-02 05:11:00.132639+00	0	\N
53	1	测试1: create_task功能验证	# 测试1: create_task功能验证 - 测试用例方案\n\n## 测试目标\n验证任务管理系统的创建任务(create_task)功能是否正常工作，确保用户能够成功创建新任务并在界面中正确显示。\n\n## 测试环境\n- 浏览器: Chrome/Firefox 最新版\n- 测试地址: http://localhost:3000\n- 登录凭据: admin / password\n- 父任务页面: http://localhost:3000/projects/1/tasks/50\n\n## 测试前提条件\n1. 系统服务正常运行 (前端、后端、数据库)\n2. 用户已成功登录系统\n3. 用户具有任务创建权限\n4. 当前位于任务详情页面\n\n## 测试用例设计\n\n### 用例1: 基础任务创建功能验证\n**测试步骤:**\n1. 登录系统 (admin/password)\n2. 导航到任务详情页: /projects/1/tasks/50\n3. 查找并点击"创建子任务"或"添加任务"按钮\n4. 在任务标题字段输入: "自动化测试创建的任务 - " + 当前时间戳\n5. 在任务描述字段输入: "这是通过Playwright自动化测试创建的任务，用于验证create_task功能"\n6. 点击"保存"或"创建"按钮\n7. 等待页面响应(2秒)\n8. 验证新任务是否出现在任务列表中\n\n**预期结果:**\n- 任务创建成功，页面显示成功提示\n- 新任务出现在任务列表中\n- 任务标题和描述正确显示\n- 任务状态为"pending"或"待处理"\n\n### 用例2: 表单验证测试\n**测试步骤:**\n1. 点击"创建子任务"按钮\n2. 不填写任务标题，直接点击保存\n3. 观察表单验证提示\n4. 填写极长的任务标题(超过100字符)\n5. 点击保存并观察系统响应\n\n**预期结果:**\n- 空标题时显示验证错误提示\n- 超长标题得到适当处理(截断或错误提示)\n\n### 用例3: 用户界面交互验证\n**测试步骤:**\n1. 验证创建任务表单的UI元素\n2. 检查表单字段的可用性\n3. 验证按钮的响应状态\n4. 检查页面的响应式布局\n\n**预期结果:**\n- 所有UI元素正确显示和交互\n- 表单提交后按钮状态正确更新\n- 页面布局在不同屏幕尺寸下正常\n\n## 测试执行策略\n\n### 自动化测试脚本要求:\n1. **录制视频**: 开启屏幕录制功能\n2. **模拟人类操作**: \n   - 每次点击后等待500ms\n   - 页面切换后等待2秒\n   - 输入文字时模拟打字速度\n3. **详细日志**: 记录每个操作步骤和结果\n4. **截图保存**: 关键步骤自动截图\n5. **错误处理**: 捕获并记录任何异常\n\n### 验证检查点:\n- ✅ 登录成功\n- ✅ 页面加载完成\n- ✅ 找到创建任务按钮\n- ✅ 表单正确显示\n- ✅ 任务创建成功\n- ✅ 新任务在列表中显示\n- ✅ 任务详情正确\n\n## 测试数据\n- 任务标题: "Playwright自动测试任务-" + 时间戳\n- 任务描述: "通过自动化测试创建，验证create_task功能的正确性"\n- 优先级: 中等\n- 截止日期: 今天\n\n## 成功标准\n1. 任务创建流程完全无错误\n2. 新任务正确保存到数据库\n3. 前端界面正确显示新任务\n4. 所有用户交互响应正常\n5. 测试视频完整记录整个过程\n\n## 风险和注意事项\n- 网络延迟可能影响测试时序\n- 页面加载时间可能变化\n- 需要确保测试数据不与现有数据冲突\n- 测试后清理创建的测试数据\n\n## 执行时间估算\n- 准备阶段: 1分钟\n- 执行测试: 3-5分钟\n- 结果验证: 1分钟\n- 总计: 5-7分钟	completed	\N	\N	{"tags": [], "priority": "medium"}	2025-08-02 03:10:48.464245+00	50	2	0	\N	2025-08-02 05:11:20.924895+00	0	\N
50	1	Claude Code MCP 集成测试任务	通过Claude Code创建：Claude Code MCP 集成测试任务	in_progress	\N	\N	{"progress": 54}	2025-08-02 02:49:49.442039+00	\N	0	0	\N	2025-08-02 05:11:20.924895+00	0	\N
106	1	Markdown功能测试	# Markdown功能测试\n\n这是一个**粗体**文本和*斜体*文本的示例。\n\n## 功能列表\n\n- ✅ 粗体支持\n- ✅ 斜体支持\n- ✅ 标题支持\n- ✅ 列表支持\n\n### 代码示例\n\n```javascript\nfunction hello() {\n  console.log("Hello Markdown!");\n}\n```\n\n### 链接测试\n\n这是一个[链接示例](https://example.com)。\n\n> 这是一个引用块的示例	todo	\N	\N	{"priority": "low"}	2025-08-02 08:14:17.887855+00	\N	0	0	\N	2025-08-02 08:14:17.913287+00	0	\N
89	1	最终更新的标题	这是更新后的详细描述	completed	\N	\N	{"priority": "medium"}	2025-08-02 07:08:44.167493+00	\N	0	0	2025-08-02 07:08:44.243958+00	2025-08-02 07:08:44.229091+00	0	\N
75	1	31-02-01：新增与"创建兄弟任务"、"手工批量创建子任务"、"任务文档"、"任务详情"的接口	通过Claude Code创建的子任务：31-02-01：新增与"创建兄弟任务"、"手工批量创建子任务"、"任务文档"、"任务详情"的接口	in_progress	\N	\N	{}	2025-08-02 05:59:14.156896+00	74	2	0	2025-08-02 06:08:39.853354+00	2025-08-02 05:59:14.166936+00	0	\N
74	1	31周-02：claude-mcp功能1.1版升级	通过Claude Code创建：31周-02：claude-mcp功能1.1版升级	in_progress	\N	\N	{"progress": 0}	2025-08-02 05:59:14.143558+00	\N	0	0	2025-08-02 06:08:40.38344+00	2025-08-02 06:01:09.973562+00	0	\N
76	1	31-02-05：delete_task - 删除单个任务	作为一名专业的MCP服务器开发工程师，你需要为ai-proj任务管理系统实现delete_task功能。\n\n**任务目标**：\n- 在TaskMCPServer类中添加deleteTask方法\n- 在MCP工具列表中注册delete_task工具\n- 实现安全的任务删除机制\n\n**技术要求**：\n1. API集成：调用DELETE /api/v1/projects/{projectId}/tasks/{taskId}端点\n2. 安全验证：验证用户权限和任务所有权\n3. 级联处理：检查并处理子任务的删除逻辑\n4. 错误处理：提供详细的错误信息和回滚机制\n5. 日志记录：记录删除操作的审计日志\n\n**输入参数**：\n- id (number): 要删除的任务ID\n- force (boolean, 可选): 是否强制删除（包含子任务）\n\n**输出格式**：\n- success: boolean\n- message: string\n- deleted_task_id: number\n- affected_subtasks: number[]\n\n**代码文件**：\n- /mcp-task-bridge/task-mcp.ts (添加deleteTask方法)\n- /mcp-task-bridge/index.ts (注册delete_task工具)\n\n请确保代码质量、错误处理完善，并遵循现有代码风格。	pending	\N	\N	{}	2025-08-02 06:37:28.211678+00	66	2	0	\N	2025-08-02 06:37:28.229836+00	0	\N
82	1	测试子任务：API接口参数验证逻辑	通过Claude Code创建的子任务：测试子任务：API接口参数验证逻辑	pending	\N	\N	{}	2025-08-02 06:49:27.544991+00	73	3	0	2025-08-02 06:49:28.577717+00	2025-08-02 06:49:27.544991+00	0	\N
83	1	测试子任务：API接口参数验证逻辑实现	通过Claude Code创建的子任务：测试子任务：API接口参数验证逻辑实现	pending	\N	\N	{}	2025-08-02 06:50:11.37973+00	73	3	0	2025-08-02 06:50:13.407915+00	2025-08-02 06:50:11.37973+00	0	\N
95	1	修复项目详情页任务管理tab统计卡片高度对齐问题	通过Claude Code创建：修复项目详情页任务管理tab统计卡片高度对齐问题	completed	\N	\N	{}	2025-08-02 07:27:57.937543+00	\N	0	0	\N	2025-08-02 07:28:31.496651+00	0	\N
107	1	API Markdown测试	## API创建的任务\n\n这是通过**API直接创建**的任务，包含Markdown格式：\n\n- 支持列表\n- 支持*斜体*\n- 支持`代码`\n\n### 代码块测试\n\n```json\n{\n  "success": true,\n  "message": "Markdown支持正常"\n}\n```	todo	\N	\N	{"priority": "medium"}	2025-08-02 08:17:53.801299+00	\N	0	0	\N	2025-08-02 08:17:53.801299+00	0	\N
79	1	31-02-08：move_task - 移动任务到其他项目	作为一名专业的MCP服务器开发工程师，你需要为ai-proj任务管理系统实现move_task功能。\n\n**任务目标**：\n- 在TaskMCPServer类中添加moveTask方法\n- 在MCP工具列表中注册move_task工具\n- 实现安全的跨项目任务移动机制\n\n**技术要求**：\n1. API集成：调用POST /api/v1/projects/{sourceProjectId}/tasks/{taskId}/move端点\n2. 权限验证：验证用户对源项目和目标项目的操作权限\n3. 关系保持：正确处理任务层级关系和依赖\n4. 数据一致性：确保移动过程中的数据完整性\n5. 事务处理：使用事务确保操作的原子性\n\n**输入参数**：\n- task_id (number): 要移动的任务ID\n- source_project_id (number): 源项目ID\n- target_project_id (number): 目标项目ID\n- move_subtasks (boolean, 可选): 是否移动子任务\n- preserve_hierarchy (boolean, 可选): 是否保持层级结构\n\n**输出格式**：\n- success: boolean\n- message: string\n- moved_task_id: number\n- source_project: number\n- target_project: number\n- moved_subtasks: number[]\n- operation_id: string\n\n**代码文件**：\n- /mcp-task-bridge/task-mcp.ts (添加moveTask方法)\n- /mcp-task-bridge/index.ts (注册move_task工具)\n\n请确保移动操作安全可靠、支持复杂层级结构，并提供详细的操作日志。	pending	\N	\N	{}	2025-08-02 06:38:41.122123+00	66	2	0	\N	2025-08-02 06:38:41.135531+00	0	\N
78	1	31-02-07：archive_task - 归档任务	作为一名专业的MCP服务器开发工程师，你需要为ai-proj任务管理系统实现archive_task功能。\n\n**任务目标**：\n- 在TaskMCPServer类中添加archiveTask方法\n- 在MCP工具列表中注册archive_task工具\n- 实现完整的任务归档和恢复机制\n\n**技术要求**：\n1. API集成：调用POST /api/v1/projects/{projectId}/tasks/{taskId}/archive端点\n2. 归档逻辑：实现软删除机制，保持数据完整性\n3. 批量操作：支持单个和批量任务归档\n4. 状态管理：正确设置archived_at时间戳和归档状态\n5. 恢复功能：提供unarchiveTask反向操作\n\n**输入参数**：\n- id (number): 要归档的任务ID\n- reason (string, 可选): 归档原因\n- archive_subtasks (boolean, 可选): 是否同时归档子任务\n\n**输出格式**：\n- success: boolean\n- message: string\n- archived_task_id: number\n- archived_at: string (ISO日期)\n- archived_subtasks: number[]\n\n**代码文件**：\n- /mcp-task-bridge/task-mcp.ts (添加archiveTask和unarchiveTask方法)\n- /mcp-task-bridge/index.ts (注册archive_task和unarchive_task工具)\n\n请确保归档操作可逆、支持批量处理，并维护完整的审计跟踪。	pending	\N	\N	{}	2025-08-02 06:38:40.579589+00	66	2	0	\N	2025-08-02 06:38:40.591566+00	0	\N
66	1	31周-02：claude-mcp功能1.1版升级	# 31周-02：claude-mcp功能1.1版升级\n\n## 📋 项目概述\n基于现有的AI项目管理平台，通过MCP桥接服务实现Claude Code与任务管理系统的深度集成，实现自然语言驱动的任务管理工作流。\n\n## 🎯 核心目标\n- 扩展MCP服务器功能，支持更多任务管理操作\n- 实现兄弟任务创建、批量子任务创建等高级功能\n- 完善任务文档和详情查看接口\n- 确保Claude Code能够通过自然语言执行复杂任务操作\n\n## 📊 开发阶段规划\n\n### Phase 1: 基础接口开发 (预计2天)\n☐ 分析现有API端点和数据结构\n☐ 设计新增接口的规格文档\n☐ 确定输入输出参数格式\n☐ 制定错误处理策略\n\n### Phase 2: MCP服务器集成 (预计2天)\n☐ 扩展TaskMCPServer类功能\n☐ 实现新的MCP工具方法\n☐ 更新工具注册列表\n☐ 测试MCP协议兼容性\n\n### Phase 3: 功能实现与测试 (预计3天)\n☐ 实现创建兄弟任务接口\n☐ 实现手工批量创建子任务接口\n☐ 实现任务文档管理接口\n☐ 实现任务详情查看接口\n☐ 编写单元测试和集成测试\n\n### Phase 4: 文档与验收 (预计1天)\n☐ 完善API文档\n☐ 编写使用指南\n☐ 执行端到端测试\n☐ 代码审查和优化\n\n## 🛠 技术架构考虑\n\n### MCP协议compliance\n☐ 确保符合MCP协议标准\n☐ 实现正确的工具注册机制\n☐ 处理请求响应格式规范\n☐ 错误处理和状态码规范\n\n### API设计原则\n☐ RESTful接口设计\n☐ 统一的请求响应格式\n☐ 完善的参数验证\n☐ 合理的权限控制\n\n### 性能优化\n☐ 数据库查询优化\n☐ 批量操作性能考虑\n☐ 错误重试机制\n☐ 并发处理能力\n\n## ✅ 验收标准\n\n### 功能完整性\n☐ 所有4个子任务功能完整实现\n☐ 支持通过Claude Code自然语言调用\n☐ 错误处理覆盖各种边界情况\n☐ API响应时间在可接受范围内\n\n### 质量标准\n☐ 代码覆盖率达到80%以上\n☐ 所有单元测试通过\n☐ 集成测试场景完整\n☐ 文档齐全且准确\n\n### 用户体验\n☐ Claude Code集成测试通过\n☐ 自然语言指令识别准确\n☐ 操作反馈清晰明确\n☐ 错误提示友好易懂\n\n## 📅 关键里程碑\n- 8月2日: 需求分析和设计完成\n- 8月3日: 基础接口开发完成\n- 8月4日: MCP集成完成\n- 8月5日: 功能测试完成\n- 8月6日: 文档和验收完成\n\n## 🔗 相关资源\n- 现有MCP服务器: /mcp-task-bridge/\n- API文档: /backend/docs/\n- 测试用例: /mcp-test-automation/\n- 前端界面: http://localhost:3000	todo	\N	\N	{"progress": 0}	2025-08-02 05:25:23.914464+00	\N	0	0	\N	2025-08-02 06:55:12.230331+00	0	\N
84	1	测试子任务：API接口参数验证逻辑测试	通过Claude Code创建的子任务：测试子任务：API接口参数验证逻辑测试	pending	\N	\N	{}	2025-08-02 06:55:12.230331+00	73	3	0	2025-08-02 06:55:12.256449+00	2025-08-02 06:55:12.230331+00	0	\N
91	1	测试默认值的子任务	通过Claude Code创建的子任务：测试默认值的子任务	todo	\N	\N	{"priority": "low"}	2025-08-02 07:11:33.877757+00	90	2	0	2025-08-02 07:11:33.895711+00	2025-08-02 07:11:33.877757+00	0	\N
90	1	测试默认值的任务	通过Claude Code创建：测试默认值的任务	todo	\N	\N	{"priority": "low", "progress": 0}	2025-08-02 07:11:33.8606+00	\N	0	0	2025-08-02 07:11:33.908126+00	2025-08-02 07:11:33.877757+00	0	\N
100	1	测试移动任务功能	通过Claude Code创建：测试移动任务功能	todo	\N	\N	{"priority": "low"}	2025-08-02 07:28:50.521229+00	\N	0	0	2025-08-02 07:28:50.57567+00	2025-08-02 07:28:50.521229+00	0	\N
101	34	测试移动任务功能	通过Claude Code创建：测试移动任务功能	todo	\N	\N	{"priority": "low"}	2025-08-02 07:28:50.570496+00	\N	0	0	2025-08-02 07:28:50.598589+00	2025-08-02 07:28:50.570496+00	0	\N
103	1	子任务	通过Claude Code创建的子任务：子任务	todo	\N	\N	{"priority": "low"}	2025-08-02 07:28:50.610091+00	102	2	0	2025-08-02 07:28:50.638986+00	2025-08-02 07:28:50.610091+00	0	\N
102	1	有子任务的父任务	通过Claude Code创建：有子任务的父任务	todo	\N	\N	{"priority": "low", "progress": 0}	2025-08-02 07:28:50.601704+00	\N	0	0	2025-08-02 07:28:50.652094+00	2025-08-02 07:28:50.610091+00	0	\N
\.


--
-- Data for Name: timeline_events; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.timeline_events (id, task_id, event_type, event_date, description, user_id, metadata) FROM stdin;
1	1	updated	2025-07-20 04:11:54.875182+00	Progress updated automatically based on subtask completion	\N	\N
2	1	updated	2025-07-20 04:11:54.875182+00	Progress updated automatically based on subtask completion	\N	\N
3	1	updated	2025-07-20 04:11:54.875182+00	Progress updated automatically based on subtask completion	\N	\N
4	5	updated	2025-07-20 04:12:27.867965+00	Progress updated automatically based on subtask completion	\N	\N
5	5	updated	2025-07-20 04:12:27.867965+00	Progress updated automatically based on subtask completion	\N	\N
6	5	updated	2025-07-20 04:12:27.867965+00	Progress updated automatically based on subtask completion	\N	\N
7	6	updated	2025-07-20 04:12:27.867965+00	Progress updated automatically based on subtask completion	\N	\N
8	6	updated	2025-07-20 04:12:27.867965+00	Progress updated automatically based on subtask completion	\N	\N
9	6	updated	2025-07-20 04:12:27.867965+00	Progress updated automatically based on subtask completion	\N	\N
10	6	updated	0001-01-01 00:00:00+00	Task 'API接口开发' status was changed	\N	{"changes_count": 1}
11	6	updated	2025-07-20 05:49:05.777786+00	Progress updated automatically based on subtask completion	\N	\N
12	19	created	0001-01-01 00:00:00+00	Task '222' was created	\N	{"initial_status": "todo"}
13	5	updated	2025-07-20 05:49:34.231832+00	Progress updated automatically based on subtask completion	\N	\N
14	8	updated	0001-01-01 00:00:00+00	Task '设计用户表结构' status was changed	\N	{"changes_count": 1}
15	5	updated	2025-07-20 05:49:39.483341+00	Progress updated automatically based on subtask completion	\N	\N
16	8	updated	0001-01-01 00:00:00+00	Task '设计用户表结构' status was changed	\N	{"changes_count": 1}
17	5	updated	2025-07-20 05:49:43.033812+00	Progress updated automatically based on subtask completion	\N	\N
18	8	updated	0001-01-01 00:00:00+00	Task '设计用户表结构' status was changed	\N	{"changes_count": 1}
19	5	updated	0001-01-01 00:00:00+00	Task '数据库设计' status was changed	\N	{"changes_count": 1}
20	5	updated	0001-01-01 00:00:00+00	Task '数据库设计' status was changed	\N	{"changes_count": 1}
21	26	updated	2025-07-20 11:33:47.11278+00	Progress updated automatically based on subtask completion	\N	\N
22	28	created	0001-01-01 00:00:00+00	Task 'child task' was created	\N	{"initial_status": "todo"}
23	26	updated	0001-01-01 00:00:00+00	Task '新功能开发计划文档' status was changed	\N	{"changes_count": 1}
24	26	updated	2025-07-20 11:34:08.606596+00	Progress updated automatically based on subtask completion	\N	\N
25	29	created	0001-01-01 00:00:00+00	Task '33223' was created	\N	{"initial_status": "todo"}
26	26	updated	2025-07-20 11:34:29.441941+00	Progress updated automatically based on subtask completion	\N	\N
27	29	updated	0001-01-01 00:00:00+00	Task '33223' status was changed	\N	{"changes_count": 1}
28	26	updated	2025-07-20 11:34:33.634684+00	Progress updated automatically based on subtask completion	\N	\N
29	26	updated	2025-07-20 11:34:36.564077+00	Progress updated automatically based on subtask completion	\N	\N
30	28	updated	0001-01-01 00:00:00+00	Task 'child task' status was changed	\N	{"changes_count": 1}
31	30	created	0001-01-01 00:00:00+00	Task 'UTA测试' was created	\N	{"initial_status": "todo"}
32	30	updated	2025-07-20 11:35:52.13218+00	Progress updated automatically based on subtask completion	\N	\N
33	31	created	0001-01-01 00:00:00+00	Task '第一次测试' was created	\N	{"initial_status": "todo"}
34	30	updated	2025-07-20 11:36:06.920694+00	Progress updated automatically based on subtask completion	\N	\N
35	31	updated	2025-07-20 11:36:06.920694+00	Progress updated automatically based on subtask completion	\N	\N
36	32	created	0001-01-01 00:00:00+00	Task '孙任务' was created	\N	{"initial_status": "todo"}
37	15	updated	2025-07-20 23:28:21.219334+00	Progress updated automatically based on subtask completion	\N	\N
38	35	created	0001-01-01 00:00:00+00	Task '2222' was created	\N	{"initial_status": "todo"}
39	15	updated	2025-07-21 02:48:47.033796+00	Progress updated automatically based on subtask completion	\N	\N
40	35	updated	0001-01-01 00:00:00+00	Task '2222' status was changed	\N	{"changes_count": 1}
41	15	updated	0001-01-01 00:00:00+00	Task '数据库设计' status was changed	\N	{"changes_count": 1}
42	30	updated	2025-07-22 12:56:59.599075+00	Progress updated automatically based on subtask completion	\N	\N
43	42	created	0001-01-01 00:00:00+00	Task '孙任务' was created	\N	{"initial_status": "todo"}
44	30	updated	0001-01-01 00:00:00+00	Task 'UTA测试' status was changed	\N	{"changes_count": 1}
45	43	created	0001-01-01 00:00:00+00	Task '测试文档自动生成任务' was created	\N	{"initial_status": "todo"}
46	44	created	0001-01-01 00:00:00+00	Task '测试文档自动生成任务' was created	\N	{"initial_status": "todo"}
47	45	created	0001-01-01 00:00:00+00	Task '31周-01：修复定时器' was created	\N	{"initial_status": "in_progress"}
48	45	updated	2025-08-01 15:29:15.584265+00	Progress updated automatically based on subtask completion	\N	\N
49	46	created	0001-01-01 00:00:00+00	Task '31周-01-01：分析计时器的bugs原因' was created	\N	{"initial_status": "in_progress"}
50	45	updated	2025-08-01 15:36:46.531296+00	Progress updated automatically based on subtask completion	\N	\N
51	47	created	0001-01-01 00:00:00+00	Task '31周-01-02：启动计时器权限不足bug' was created	\N	{"initial_status": "in_progress"}
52	45	updated	2025-08-02 01:37:37.653977+00	Progress updated automatically based on subtask completion	\N	\N
53	48	created	0001-01-01 00:00:00+00	Task '31周-01-03：重构计时器处理器' was created	\N	{"initial_status": "in_progress"}
54	45	updated	2025-08-02 01:38:08.499869+00	Progress updated automatically based on subtask completion	\N	\N
55	47	updated	0001-01-01 00:00:00+00	Task '31周-01-02：启动计时器权限不足bug' status was changed	\N	{"changes_count": 1}
56	45	updated	2025-08-02 01:38:22.294373+00	Progress updated automatically based on subtask completion	\N	\N
57	46	updated	0001-01-01 00:00:00+00	Task '31周-01-01：分析计时器的bugs原因' status was changed	\N	{"changes_count": 1}
58	49	created	0001-01-01 00:00:00+00	Task 'MCP测试任务' was created	\N	{"initial_status": "pending"}
59	50	created	0001-01-01 00:00:00+00	Task 'Claude Code MCP 集成测试任务' was created	\N	{"initial_status": "pending"}
60	50	updated	2025-08-02 02:49:49.455893+00	Progress updated automatically based on subtask completion	\N	\N
61	51	created	0001-01-01 00:00:00+00	Task '子任务: 前端集成开发' was created	\N	{"initial_status": "pending"}
62	50	updated	2025-08-02 02:49:49.465095+00	Progress updated automatically based on subtask completion	\N	\N
63	52	created	0001-01-01 00:00:00+00	Task '子任务: 后端 API 调试' was created	\N	{"initial_status": "pending"}
64	50	updated	0001-01-01 00:00:00+00	Task 'Claude Code MCP 集成测试任务' status was changed	\N	{"changes_count": 1}
126	50	updated	2025-08-02 04:54:10.967895+00	Progress updated automatically based on subtask completion	\N	\N
65	50	updated	0001-01-01 00:00:00+00	Task 'Claude Code MCP 集成测试任务' status was changed	\N	{"changes_count": 1}
66	50	updated	2025-08-02 03:10:48.464245+00	Progress updated automatically based on subtask completion	\N	\N
67	53	created	0001-01-01 00:00:00+00	Task '测试1: create_task功能验证' was created	\N	{"initial_status": "pending"}
68	50	updated	2025-08-02 03:10:51.472675+00	Progress updated automatically based on subtask completion	\N	\N
69	54	created	0001-01-01 00:00:00+00	Task '测试2: list_tasks功能验证' was created	\N	{"initial_status": "pending"}
70	50	updated	2025-08-02 03:10:54.912394+00	Progress updated automatically based on subtask completion	\N	\N
71	55	created	0001-01-01 00:00:00+00	Task '测试3: start_task功能验证' was created	\N	{"initial_status": "pending"}
72	50	updated	2025-08-02 03:10:58.311231+00	Progress updated automatically based on subtask completion	\N	\N
73	56	created	0001-01-01 00:00:00+00	Task '测试4: complete_task功能验证' was created	\N	{"initial_status": "pending"}
74	50	updated	2025-08-02 03:11:01.411968+00	Progress updated automatically based on subtask completion	\N	\N
75	57	created	0001-01-01 00:00:00+00	Task '测试5: create_subtask功能验证' was created	\N	{"initial_status": "pending"}
76	50	updated	2025-08-02 03:11:04.378923+00	Progress updated automatically based on subtask completion	\N	\N
77	58	created	0001-01-01 00:00:00+00	Task '测试6: find_task功能验证' was created	\N	{"initial_status": "pending"}
78	50	updated	2025-08-02 03:11:10.524687+00	Progress updated automatically based on subtask completion	\N	\N
79	53	updated	0001-01-01 00:00:00+00	Task '测试1: create_task功能验证' status was changed	\N	{"changes_count": 1}
80	59	created	0001-01-01 00:00:00+00	Task '测试任务A: API接口开发' was created	\N	{"initial_status": "pending"}
81	60	created	0001-01-01 00:00:00+00	Task '测试任务B: 前端组件设计' was created	\N	{"initial_status": "pending"}
82	50	updated	2025-08-02 03:11:27.702599+00	Progress updated automatically based on subtask completion	\N	\N
83	53	updated	0001-01-01 00:00:00+00	Task '测试1: create_task功能验证' status was changed	\N	{"changes_count": 1}
84	50	updated	2025-08-02 03:11:31.038681+00	Progress updated automatically based on subtask completion	\N	\N
85	54	updated	0001-01-01 00:00:00+00	Task '测试2: list_tasks功能验证' status was changed	\N	{"changes_count": 1}
86	50	updated	2025-08-02 03:11:37.704974+00	Progress updated automatically based on subtask completion	\N	\N
87	54	updated	0001-01-01 00:00:00+00	Task '测试2: list_tasks功能验证' status was changed	\N	{"changes_count": 1}
88	50	updated	2025-08-02 03:11:41.711518+00	Progress updated automatically based on subtask completion	\N	\N
89	55	updated	0001-01-01 00:00:00+00	Task '测试3: start_task功能验证' status was changed	\N	{"changes_count": 1}
90	59	updated	0001-01-01 00:00:00+00	Task '测试任务A: API接口开发' status was changed	\N	{"changes_count": 1}
91	50	updated	2025-08-02 03:11:47.872599+00	Progress updated automatically based on subtask completion	\N	\N
92	55	updated	0001-01-01 00:00:00+00	Task '测试3: start_task功能验证' status was changed	\N	{"changes_count": 1}
93	50	updated	2025-08-02 03:11:50.864191+00	Progress updated automatically based on subtask completion	\N	\N
94	56	updated	0001-01-01 00:00:00+00	Task '测试4: complete_task功能验证' status was changed	\N	{"changes_count": 1}
95	59	updated	0001-01-01 00:00:00+00	Task '测试任务A: API接口开发' status was changed	\N	{"changes_count": 1}
96	50	updated	2025-08-02 03:11:57.519312+00	Progress updated automatically based on subtask completion	\N	\N
97	56	updated	0001-01-01 00:00:00+00	Task '测试4: complete_task功能验证' status was changed	\N	{"changes_count": 1}
98	50	updated	2025-08-02 03:12:04.145738+00	Progress updated automatically based on subtask completion	\N	\N
99	57	updated	0001-01-01 00:00:00+00	Task '测试5: create_subtask功能验证' status was changed	\N	{"changes_count": 1}
100	60	updated	2025-08-02 03:12:07.545145+00	Progress updated automatically based on subtask completion	\N	\N
101	61	created	0001-01-01 00:00:00+00	Task '子任务A: 设计UI界面' was created	\N	{"initial_status": "pending"}
102	60	updated	2025-08-02 03:12:11.009595+00	Progress updated automatically based on subtask completion	\N	\N
103	62	created	0001-01-01 00:00:00+00	Task '子任务B: 实现交互逻辑' was created	\N	{"initial_status": "pending"}
104	50	updated	2025-08-02 03:12:15.098936+00	Progress updated automatically based on subtask completion	\N	\N
105	57	updated	0001-01-01 00:00:00+00	Task '测试5: create_subtask功能验证' status was changed	\N	{"changes_count": 1}
106	50	updated	2025-08-02 03:12:17.993173+00	Progress updated automatically based on subtask completion	\N	\N
107	58	updated	0001-01-01 00:00:00+00	Task '测试6: find_task功能验证' status was changed	\N	{"changes_count": 1}
108	50	updated	2025-08-02 03:12:31.917119+00	Progress updated automatically based on subtask completion	\N	\N
109	58	updated	0001-01-01 00:00:00+00	Task '测试6: find_task功能验证' status was changed	\N	{"changes_count": 1}
110	50	updated	2025-08-02 04:14:50.531608+00	Progress updated automatically based on subtask completion	\N	\N
111	63	created	0001-01-01 00:00:00+00	Task '录制AI自动化测试 - 测试用' was created	\N	{"initial_status": "pending"}
112	50	updated	2025-08-02 04:15:23.543898+00	Progress updated automatically based on subtask completion	\N	\N
113	64	created	0001-01-01 00:00:00+00	Task '录制AI自动化测试' was created	\N	{"initial_status": "pending"}
114	50	updated	2025-08-02 04:15:49.575148+00	Progress updated automatically based on subtask completion	\N	\N
115	64	updated	0001-01-01 00:00:00+00	Task '录制AI自动化测试' description was changed	\N	{"changes_count": 1}
116	50	updated	2025-08-02 04:22:47.17437+00	Progress updated automatically based on subtask completion	\N	\N
117	64	updated	0001-01-01 00:00:00+00	Task '录制AI自动化测试 - 已更新' was updated (3 changes)	\N	{"changes_count": 3}
118	50	updated	2025-08-02 04:26:23.40348+00	Progress updated automatically based on subtask completion	\N	\N
119	64	updated	0001-01-01 00:00:00+00	Task '录制AI自动化测试 - 修复后再次更新' was updated (3 changes)	\N	{"changes_count": 3}
120	50	updated	2025-08-02 04:45:37.871781+00	Progress updated automatically based on subtask completion	\N	\N
121	65	created	0001-01-01 00:00:00+00	Task '用调试模式测试任务保存失败' was created	\N	{"initial_status": "pending"}
122	50	updated	2025-08-02 04:46:10.903274+00	Progress updated automatically based on subtask completion	\N	\N
123	65	updated	0001-01-01 00:00:00+00	Task '用调试模式测试任务保存失败' description was changed	\N	{"changes_count": 1}
124	50	updated	2025-08-02 04:51:14.449897+00	Progress updated automatically based on subtask completion	\N	\N
125	53	updated	0001-01-01 00:00:00+00	Task '测试1: create_task功能验证' description was changed	\N	{"changes_count": 1}
127	53	updated	0001-01-01 00:00:00+00	Task '测试1: create_task功能验证' description was changed	\N	{"changes_count": 1}
128	50	updated	2025-08-02 05:11:00.132639+00	Progress updated automatically based on subtask completion	\N	\N
129	64	updated	0001-01-01 00:00:00+00	Task '测试任务编辑 - 调试模式' was updated (3 changes)	\N	{"changes_count": 3}
130	50	updated	2025-08-02 05:11:20.924895+00	Progress updated automatically based on subtask completion	\N	\N
131	66	created	0001-01-01 00:00:00+00	Task '31周-02：claude-mcp功能1.1版升级' was created	\N	{"initial_status": "in_progress"}
132	66	updated	2025-08-02 05:25:34.341301+00	Progress updated automatically based on subtask completion	\N	\N
133	67	created	0001-01-01 00:00:00+00	Task '31-02-01：新增与"创建兄弟任务"、"手工批量创建子任务"、"任务文档"、"任务详情"的接口' was created	\N	{"initial_status": "in_progress"}
134	68	created	0001-01-01 00:00:00+00	Task '测试MCP连接任务' was created	\N	{"initial_status": "pending"}
135	69	created	0001-01-01 00:00:00+00	Task '31周-02：claude-mcp功能1.1版升级' was created	\N	{"initial_status": "pending"}
136	69	updated	2025-08-02 05:28:29.48643+00	Progress updated automatically based on subtask completion	\N	\N
137	70	created	0001-01-01 00:00:00+00	Task '31-02-01：新增与"创建兄弟任务"、"手工批量创建子任务"、"任务文档"、"任务详情"的接口' was created	\N	{"initial_status": "pending"}
138	69	updated	0001-01-01 00:00:00+00	Task '31周-02：claude-mcp功能1.1版升级' status was changed	\N	{"changes_count": 1}
139	69	updated	2025-08-02 05:28:29.504338+00	Progress updated automatically based on subtask completion	\N	\N
140	70	updated	0001-01-01 00:00:00+00	Task '31-02-01：新增与"创建兄弟任务"、"手工批量创建子任务"、"任务文档"、"任务详情"的接口' status was changed	\N	{"changes_count": 1}
141	66	updated	2025-08-02 05:34:26.409889+00	Progress updated automatically based on subtask completion	\N	\N
142	67	updated	0001-01-01 00:00:00+00	Task '31-02-01：创建兄弟任务接口' title was changed	\N	{"changes_count": 1}
143	66	updated	2025-08-02 05:34:26.4299+00	Progress updated automatically based on subtask completion	\N	\N
144	71	created	0001-01-01 00:00:00+00	Task '31-02-02：手工批量创建子任务接口' was created	\N	{"initial_status": "pending"}
145	66	updated	2025-08-02 05:34:26.437642+00	Progress updated automatically based on subtask completion	\N	\N
146	71	updated	0001-01-01 00:00:00+00	Task '31-02-02：手工批量创建子任务接口' status was changed	\N	{"changes_count": 1}
147	66	updated	2025-08-02 05:34:26.443355+00	Progress updated automatically based on subtask completion	\N	\N
148	72	created	0001-01-01 00:00:00+00	Task '31-02-03：任务文档接口' was created	\N	{"initial_status": "pending"}
149	66	updated	2025-08-02 05:34:26.451937+00	Progress updated automatically based on subtask completion	\N	\N
150	72	updated	0001-01-01 00:00:00+00	Task '31-02-03：任务文档接口' status was changed	\N	{"changes_count": 1}
151	66	updated	2025-08-02 05:34:26.457873+00	Progress updated automatically based on subtask completion	\N	\N
152	73	created	0001-01-01 00:00:00+00	Task '31-02-04：任务详情接口' was created	\N	{"initial_status": "pending"}
153	66	updated	2025-08-02 05:34:26.464205+00	Progress updated automatically based on subtask completion	\N	\N
154	73	updated	0001-01-01 00:00:00+00	Task '31-02-04：任务详情接口' status was changed	\N	{"changes_count": 1}
155	66	updated	0001-01-01 00:00:00+00	Task '31周-02：claude-mcp功能1.1版升级' status was changed	\N	{"changes_count": 1}
156	66	updated	0001-01-01 00:00:00+00	Task '31周-02：claude-mcp功能1.1版升级' description was changed	\N	{"changes_count": 1}
157	66	updated	2025-08-02 05:38:35.358298+00	Progress updated automatically based on subtask completion	\N	\N
158	67	updated	0001-01-01 00:00:00+00	Task '31-02-01：创建兄弟任务接口' description was changed	\N	{"changes_count": 1}
159	66	updated	2025-08-02 05:39:31.3307+00	Progress updated automatically based on subtask completion	\N	\N
160	71	updated	0001-01-01 00:00:00+00	Task '31-02-02：手工批量创建子任务接口' description was changed	\N	{"changes_count": 1}
161	66	updated	2025-08-02 05:40:35.620427+00	Progress updated automatically based on subtask completion	\N	\N
162	72	updated	0001-01-01 00:00:00+00	Task '31-02-03：任务文档接口' description was changed	\N	{"changes_count": 1}
163	66	updated	2025-08-02 05:43:30.103657+00	Progress updated automatically based on subtask completion	\N	\N
164	73	updated	0001-01-01 00:00:00+00	Task '31-02-04：任务详情接口' description was changed	\N	{"changes_count": 1}
165	74	created	0001-01-01 00:00:00+00	Task '31周-02：claude-mcp功能1.1版升级' was created	\N	{"initial_status": "pending"}
166	74	updated	2025-08-02 05:59:14.156896+00	Progress updated automatically based on subtask completion	\N	\N
167	75	created	0001-01-01 00:00:00+00	Task '31-02-01：新增与"创建兄弟任务"、"手工批量创建子任务"、"任务文档"、"任务详情"的接口' was created	\N	{"initial_status": "pending"}
168	74	updated	0001-01-01 00:00:00+00	Task '31周-02：claude-mcp功能1.1版升级' status was changed	\N	{"changes_count": 1}
169	74	updated	2025-08-02 05:59:14.166936+00	Progress updated automatically based on subtask completion	\N	\N
170	75	updated	0001-01-01 00:00:00+00	Task '31-02-01：新增与"创建兄弟任务"、"手工批量创建子任务"、"任务文档"、"任务详情"的接口' status was changed	\N	{"changes_count": 1}
171	74	updated	0001-01-01 00:00:00+00	Task '31周-02：claude-mcp功能1.1版升级' status was changed	\N	{"changes_count": 1}
172	45	updated	2025-08-02 06:02:46.96185+00	Progress updated automatically based on subtask completion	\N	\N
173	48	updated	0001-01-01 00:00:00+00	Task '31周-01-03：重构计时器处理器' status was changed	\N	{"changes_count": 1}
174	66	updated	2025-08-02 06:37:28.211678+00	Progress updated automatically based on subtask completion	\N	\N
175	76	created	0001-01-01 00:00:00+00	Task '31-02-05：delete_task - 删除单个任务' was created	\N	{"initial_status": "pending"}
176	66	updated	2025-08-02 06:37:28.229836+00	Progress updated automatically based on subtask completion	\N	\N
177	76	updated	0001-01-01 00:00:00+00	Task '31-02-05：delete_task - 删除单个任务' description was changed	\N	{"changes_count": 1}
178	66	updated	2025-08-02 06:38:40.03891+00	Progress updated automatically based on subtask completion	\N	\N
179	77	created	0001-01-01 00:00:00+00	Task '31-02-06：update_task - 更新任务信息' was created	\N	{"initial_status": "pending"}
180	66	updated	2025-08-02 06:38:40.056352+00	Progress updated automatically based on subtask completion	\N	\N
181	77	updated	0001-01-01 00:00:00+00	Task '31-02-06：update_task - 更新任务信息' description was changed	\N	{"changes_count": 1}
182	66	updated	2025-08-02 06:38:40.579589+00	Progress updated automatically based on subtask completion	\N	\N
183	78	created	0001-01-01 00:00:00+00	Task '31-02-07：archive_task - 归档任务' was created	\N	{"initial_status": "pending"}
184	66	updated	2025-08-02 06:38:40.591566+00	Progress updated automatically based on subtask completion	\N	\N
185	78	updated	0001-01-01 00:00:00+00	Task '31-02-07：archive_task - 归档任务' description was changed	\N	{"changes_count": 1}
186	66	updated	2025-08-02 06:38:41.122123+00	Progress updated automatically based on subtask completion	\N	\N
187	79	created	0001-01-01 00:00:00+00	Task '31-02-08：move_task - 移动任务到其他项目' was created	\N	{"initial_status": "pending"}
188	66	updated	2025-08-02 06:38:41.135531+00	Progress updated automatically based on subtask completion	\N	\N
189	79	updated	0001-01-01 00:00:00+00	Task '31-02-08：move_task - 移动任务到其他项目' description was changed	\N	{"changes_count": 1}
190	80	created	0001-01-01 00:00:00+00	Task '测试删除功能的任务' was created	\N	{"initial_status": "pending"}
191	80	updated	2025-08-02 06:42:40.898548+00	Progress updated automatically based on subtask completion	\N	\N
192	81	created	0001-01-01 00:00:00+00	Task '测试子任务' was created	\N	{"initial_status": "pending"}
193	66	updated	2025-08-02 06:49:27.544991+00	Progress updated automatically based on subtask completion	\N	\N
194	73	updated	2025-08-02 06:49:27.544991+00	Progress updated automatically based on subtask completion	\N	\N
195	82	created	0001-01-01 00:00:00+00	Task '测试子任务：API接口参数验证逻辑' was created	\N	{"initial_status": "pending"}
196	66	updated	2025-08-02 06:50:11.37973+00	Progress updated automatically based on subtask completion	\N	\N
197	73	updated	2025-08-02 06:50:11.37973+00	Progress updated automatically based on subtask completion	\N	\N
198	83	created	0001-01-01 00:00:00+00	Task '测试子任务：API接口参数验证逻辑实现' was created	\N	{"initial_status": "pending"}
199	66	updated	2025-08-02 06:55:12.230331+00	Progress updated automatically based on subtask completion	\N	\N
200	73	updated	2025-08-02 06:55:12.230331+00	Progress updated automatically based on subtask completion	\N	\N
201	84	created	0001-01-01 00:00:00+00	Task '测试子任务：API接口参数验证逻辑测试' was created	\N	{"initial_status": "pending"}
202	85	created	0001-01-01 00:00:00+00	Task '任务#50：Claude MCP集成测试主任务' was created	\N	{"initial_status": "pending"}
203	85	updated	2025-08-02 06:59:32.876835+00	Progress updated automatically based on subtask completion	\N	\N
204	86	created	0001-01-01 00:00:00+00	Task '子任务1：MCP服务器配置优化' was created	\N	{"initial_status": "pending"}
205	85	updated	2025-08-02 06:59:36.671943+00	Progress updated automatically based on subtask completion	\N	\N
206	87	created	0001-01-01 00:00:00+00	Task '子任务2：API接口错误处理完善' was created	\N	{"initial_status": "pending"}
207	88	created	0001-01-01 00:00:00+00	Task '测试更新功能的任务' was created	\N	{"initial_status": "pending"}
208	88	updated	0001-01-01 00:00:00+00	Task '更新后的任务标题' title was changed	\N	{"changes_count": 1}
209	88	updated	0001-01-01 00:00:00+00	Task '更新后的任务标题' status was changed	\N	{"changes_count": 1}
210	88	updated	0001-01-01 00:00:00+00	Task '最终更新的标题' was updated (3 changes)	\N	{"changes_count": 3}
211	89	created	0001-01-01 00:00:00+00	Task '测试更新功能的任务' was created	\N	{"initial_status": "pending"}
212	89	updated	0001-01-01 00:00:00+00	Task '更新后的任务标题' title was changed	\N	{"changes_count": 1}
213	89	updated	0001-01-01 00:00:00+00	Task '更新后的任务标题' status was changed	\N	{"changes_count": 1}
214	89	updated	0001-01-01 00:00:00+00	Task '最终更新的标题' was updated (3 changes)	\N	{"changes_count": 3}
215	90	created	0001-01-01 00:00:00+00	Task '测试默认值的任务' was created	\N	{"initial_status": "todo"}
216	90	updated	2025-08-02 07:11:33.877757+00	Progress updated automatically based on subtask completion	\N	\N
217	91	created	0001-01-01 00:00:00+00	Task '测试默认值的子任务' was created	\N	{"initial_status": "todo"}
218	92	created	0001-01-01 00:00:00+00	Task '测试移动任务功能' was created	\N	{"initial_status": "todo"}
219	93	created	0001-01-01 00:00:00+00	Task '有子任务的父任务' was created	\N	{"initial_status": "todo"}
220	93	updated	2025-08-02 07:26:22.873248+00	Progress updated automatically based on subtask completion	\N	\N
221	94	created	0001-01-01 00:00:00+00	Task '子任务' was created	\N	{"initial_status": "todo"}
222	95	created	0001-01-01 00:00:00+00	Task '修复项目详情页任务管理tab统计卡片高度对齐问题' was created	\N	{"initial_status": "pending"}
223	96	created	0001-01-01 00:00:00+00	Task '测试移动任务功能' was created	\N	{"initial_status": "todo"}
224	97	created	0001-01-01 00:00:00+00	Task '测试移动任务功能' was created	\N	{"initial_status": "todo"}
225	98	created	0001-01-01 00:00:00+00	Task '有子任务的父任务' was created	\N	{"initial_status": "todo"}
226	98	updated	2025-08-02 07:28:04.49289+00	Progress updated automatically based on subtask completion	\N	\N
227	99	created	0001-01-01 00:00:00+00	Task '子任务' was created	\N	{"initial_status": "todo"}
228	95	updated	0001-01-01 00:00:00+00	Task '修复项目详情页任务管理tab统计卡片高度对齐问题' status was changed	\N	{"changes_count": 1}
229	95	updated	0001-01-01 00:00:00+00	Task '修复项目详情页任务管理tab统计卡片高度对齐问题' status was changed	\N	{"changes_count": 1}
230	100	created	0001-01-01 00:00:00+00	Task '测试移动任务功能' was created	\N	{"initial_status": "todo"}
231	101	created	0001-01-01 00:00:00+00	Task '测试移动任务功能' was created	\N	{"initial_status": "todo"}
232	102	created	0001-01-01 00:00:00+00	Task '有子任务的父任务' was created	\N	{"initial_status": "todo"}
233	102	updated	2025-08-02 07:28:50.610091+00	Progress updated automatically based on subtask completion	\N	\N
234	103	created	0001-01-01 00:00:00+00	Task '子任务' was created	\N	{"initial_status": "todo"}
235	104	created	0001-01-01 00:00:00+00	Task '完善任务信息功能 - 增加Markdown编辑器支持详细信息记录' was created	\N	{"initial_status": "pending"}
236	105	created	0001-01-01 00:00:00+00	Task '升级任务文档功能 - 支持富文本编辑和多文档管理' was created	\N	{"initial_status": "pending"}
237	106	created	0001-01-01 00:00:00+00	Task 'Markdown功能测试' was created	\N	{"initial_status": "todo"}
238	106	updated	0001-01-01 00:00:00+00	Task 'Markdown功能测试' description was changed	\N	{"changes_count": 1}
239	107	created	0001-01-01 00:00:00+00	Task 'API Markdown测试' was created	\N	{"initial_status": "todo"}
\.


--
-- Data for Name: user_timer_tasks; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.user_timer_tasks (id, user_id, title, description, category, priority, status, color, is_favorite, total_time_seconds, target_time_seconds, tags, metadata, created_at, updated_at, deleted_at) FROM stdin;
1	1	学习react		personal	medium	active	#1890ff	f	0	0	{}	{}	2025-08-01 12:08:50.08969+00	2025-08-01 12:08:50.08969+00	\N
2	34	每天快走30分钟		personal	medium	active	#1890ff	t	0	1800	{}	{}	2025-08-01 12:16:26.476499+00	2025-08-01 12:16:26.476499+00	\N
3	1	测试个人任务文档	用于测试个人任务文档自动生成	study	high	active	#722ed1	f	0	0	\N	\N	2025-08-01 12:37:25.132243+00	2025-08-01 12:37:25.132243+00	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.users (id, username, password_hash, role, created_at, updated_at, email, status, profile, last_login_at, current_timing_task_id, timing_start_time, timing_status, user_type, company_id, company_user_id, contact_person_name, contact_phone, department_title, is_primary_contact, account_expires_at, last_project_access, notes, current_user_timer_task_id, timing_paused_time, timing_accumulated_seconds) FROM stdin;
2	dev_user_1	$2a$10$dtRo4ed4NNLad/6.YzvTKOUkIzlKnR2lb4ok6c3FMOCpkd.HkYlYC	developer	2025-07-20 04:02:26.599031+00	2025-08-01 11:51:56.975802+00	dev_user_1@example.com	active	{}	\N	\N	\N	stopped	system	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	0
3	dev_user_2	$2a$10$dtRo4ed4NNLad/6.YzvTKOUkIzlKnR2lb4ok6c3FMOCpkd.HkYlYC	developer	2025-07-20 04:02:26.599031+00	2025-08-01 11:51:56.975802+00	dev_user_2@example.com	active	{}	\N	\N	\N	stopped	system	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	0
35	project_manager_1	$2a$10$dtRo4ed4NNLad/6.YzvTKOUkIzlKnR2lb4ok6c3FMOCpkd.HkYlYC	project_manager	2025-07-22 04:28:05.428915+00	2025-08-01 11:51:56.975802+00	pm1@example.com	active	{"name": "项目经理1", "phone": "13800138001", "department": "技术部"}	\N	\N	\N	stopped	system	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	0
36	developer_1	$2a$10$dtRo4ed4NNLad/6.YzvTKOUkIzlKnR2lb4ok6c3FMOCpkd.HkYlYC	developer	2025-07-22 04:28:05.428915+00	2025-08-01 11:51:56.975802+00	dev1@example.com	active	{"name": "开发工程师1", "phone": "13800138002", "department": "研发部"}	\N	\N	\N	stopped	system	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	0
37	client_1	$2a$10$dtRo4ed4NNLad/6.YzvTKOUkIzlKnR2lb4ok6c3FMOCpkd.HkYlYC	client	2025-07-22 04:28:05.428915+00	2025-08-01 11:51:56.975802+00	client1@example.com	active	{"name": "客户1", "phone": "13800138003", "department": "甲方公司"}	\N	\N	\N	stopped	system	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	0
41	test_user	$2a$10$dtRo4ed4NNLad/6.YzvTKOUkIzlKnR2lb4ok6c3FMOCpkd.HkYlYC	developer	2025-07-22 04:33:28.993199+00	2025-08-01 11:51:56.975802+00	test@example.com	active	{"name": "测试用户", "phone": "13800000000", "department": "测试部门"}	\N	\N	\N	stopped	system	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	0
43	weier	$2a$10$dtRo4ed4NNLad/6.YzvTKOUkIzlKnR2lb4ok6c3FMOCpkd.HkYlYC	admin	2025-07-22 07:28:36.641277+00	2025-08-01 11:51:56.975802+00	weier@joylodging.com	active	{"name": "吴薇儿", "department": "实施部"}	\N	\N	\N	stopped	system	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	0
34	qiudl	$2a$10$P9CtyjQElBgJ4wEmsP8G2uzU8EIiPLgpIxRawkTB45K4AovegX81C	admin	2025-07-20 04:26:16.82371+00	2025-08-02 01:28:02.79156+00	qiudl@joylodging.com	active	{}	\N	\N	\N	stopped	system	\N	\N	\N	\N	\N	f	\N	\N	\N	\N	\N	0
1	admin	$2a$10$dtRo4ed4NNLad/6.YzvTKOUkIzlKnR2lb4ok6c3FMOCpkd.HkYlYC	admin	2025-07-20 04:02:26.599031+00	2025-08-02 05:03:04.693915+00	admin@joylodging.com	active	{}	\N	\N	2025-08-02 04:24:15.467983	paused	system	\N	\N	\N	\N	\N	f	\N	\N	\N	1	2025-08-02 05:03:04.695164	60767
\.


--
-- Name: ai_configs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: user
--

SELECT pg_catalog.setval('public.ai_configs_id_seq', 1, false);


--
-- Name: ai_test_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: user
--

SELECT pg_catalog.setval('public.ai_test_logs_id_seq', 1, false);


--
-- Name: ai_usage_stats_id_seq; Type: SEQUENCE SET; Schema: public; Owner: user
--

SELECT pg_catalog.setval('public.ai_usage_stats_id_seq', 1, false);


--
-- Name: audit_configs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: user
--

SELECT pg_catalog.setval('public.audit_configs_id_seq', 29, true);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: user
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 3, true);


--
-- Name: companies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: user
--

SELECT pg_catalog.setval('public.companies_id_seq', 1, false);


--
-- Name: company_roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: user
--

SELECT pg_catalog.setval('public.company_roles_id_seq', 6, true);


--
-- Name: company_user_project_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: user
--

SELECT pg_catalog.setval('public.company_user_project_permissions_id_seq', 1, false);


--
-- Name: company_users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: user
--

SELECT pg_catalog.setval('public.company_users_id_seq', 14, true);


--
-- Name: customer_contacts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: user
--

SELECT pg_catalog.setval('public.customer_contacts_id_seq', 5, true);


--
-- Name: customer_users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: user
--

SELECT pg_catalog.setval('public.customer_users_id_seq', 3, true);


--
-- Name: customers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: user
--

SELECT pg_catalog.setval('public.customers_id_seq', 10, true);


--
-- Name: encryption_keys_id_seq; Type: SEQUENCE SET; Schema: public; Owner: user
--

SELECT pg_catalog.setval('public.encryption_keys_id_seq', 1, true);


--
-- Name: permission_audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: user
--

SELECT pg_catalog.setval('public.permission_audit_logs_id_seq', 1, false);


--
-- Name: permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: user
--

SELECT pg_catalog.setval('public.permissions_id_seq', 25, true);


--
-- Name: project_companies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: user
--

SELECT pg_catalog.setval('public.project_companies_id_seq', 1, true);


--
-- Name: project_users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: user
--

SELECT pg_catalog.setval('public.project_users_id_seq', 1, false);


--
-- Name: projects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: user
--

SELECT pg_catalog.setval('public.projects_id_seq', 37, true);


--
-- Name: role_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: user
--

SELECT pg_catalog.setval('public.role_permissions_id_seq', 70, true);


--
-- Name: system_audit_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: user
--

SELECT pg_catalog.setval('public.system_audit_log_id_seq', 1, false);


--
-- Name: task_time_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: user
--

SELECT pg_catalog.setval('public.task_time_logs_id_seq', 20, true);


--
-- Name: task_updates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: user
--

SELECT pg_catalog.setval('public.task_updates_id_seq', 76, true);


--
-- Name: tasks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: user
--

SELECT pg_catalog.setval('public.tasks_id_seq', 107, true);


--
-- Name: timeline_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: user
--

SELECT pg_catalog.setval('public.timeline_events_id_seq', 239, true);


--
-- Name: user_timer_tasks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: user
--

SELECT pg_catalog.setval('public.user_timer_tasks_id_seq', 3, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: user
--

SELECT pg_catalog.setval('public.users_id_seq', 43, true);


--
-- Name: ai_configs ai_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.ai_configs
    ADD CONSTRAINT ai_configs_pkey PRIMARY KEY (id);


--
-- Name: ai_configs ai_configs_provider_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.ai_configs
    ADD CONSTRAINT ai_configs_provider_key UNIQUE (provider);


--
-- Name: ai_test_logs ai_test_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.ai_test_logs
    ADD CONSTRAINT ai_test_logs_pkey PRIMARY KEY (id);


--
-- Name: ai_usage_stats ai_usage_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.ai_usage_stats
    ADD CONSTRAINT ai_usage_stats_pkey PRIMARY KEY (id);


--
-- Name: audit_configs audit_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.audit_configs
    ADD CONSTRAINT audit_configs_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_event_id_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_event_id_key UNIQUE (event_id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: company_roles company_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.company_roles
    ADD CONSTRAINT company_roles_pkey PRIMARY KEY (id);


--
-- Name: company_roles company_roles_role_code_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.company_roles
    ADD CONSTRAINT company_roles_role_code_key UNIQUE (role_code);


--
-- Name: company_user_project_permissions company_user_project_permissions_company_user_id_project_id_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.company_user_project_permissions
    ADD CONSTRAINT company_user_project_permissions_company_user_id_project_id_key UNIQUE (company_user_id, project_id);


--
-- Name: company_user_project_permissions company_user_project_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.company_user_project_permissions
    ADD CONSTRAINT company_user_project_permissions_pkey PRIMARY KEY (id);


--
-- Name: company_users company_users_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.company_users
    ADD CONSTRAINT company_users_pkey PRIMARY KEY (id);


--
-- Name: customer_contacts customer_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.customer_contacts
    ADD CONSTRAINT customer_contacts_pkey PRIMARY KEY (id);


--
-- Name: customer_users customer_users_customer_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.customer_users
    ADD CONSTRAINT customer_users_customer_id_user_id_key UNIQUE (customer_id, user_id);


--
-- Name: customer_users customer_users_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.customer_users
    ADD CONSTRAINT customer_users_pkey PRIMARY KEY (id);


--
-- Name: customers customers_company_code_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_company_code_key UNIQUE (company_code);


--
-- Name: customers customers_company_name_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_company_name_key UNIQUE (company_name);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: encryption_keys encryption_keys_key_name_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.encryption_keys
    ADD CONSTRAINT encryption_keys_key_name_key UNIQUE (key_name);


--
-- Name: encryption_keys encryption_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.encryption_keys
    ADD CONSTRAINT encryption_keys_pkey PRIMARY KEY (id);


--
-- Name: permission_audit_logs permission_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.permission_audit_logs
    ADD CONSTRAINT permission_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_permission_code_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_permission_code_key UNIQUE (permission_code);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: project_companies project_companies_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.project_companies
    ADD CONSTRAINT project_companies_pkey PRIMARY KEY (id);


--
-- Name: project_companies project_companies_project_id_company_id_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.project_companies
    ADD CONSTRAINT project_companies_project_id_company_id_key UNIQUE (project_id, company_id);


--
-- Name: project_users project_users_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.project_users
    ADD CONSTRAINT project_users_pkey PRIMARY KEY (id);


--
-- Name: project_users project_users_project_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.project_users
    ADD CONSTRAINT project_users_project_id_user_id_key UNIQUE (project_id, user_id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_role_id_permission_id_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_permission_id_key UNIQUE (role_id, permission_id);


--
-- Name: system_audit_log system_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.system_audit_log
    ADD CONSTRAINT system_audit_log_pkey PRIMARY KEY (id);


--
-- Name: task_time_logs task_time_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.task_time_logs
    ADD CONSTRAINT task_time_logs_pkey PRIMARY KEY (id);


--
-- Name: task_updates task_updates_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.task_updates
    ADD CONSTRAINT task_updates_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: timeline_events timeline_events_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.timeline_events
    ADD CONSTRAINT timeline_events_pkey PRIMARY KEY (id);


--
-- Name: audit_configs uq_audit_configs_resource_action; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.audit_configs
    ADD CONSTRAINT uq_audit_configs_resource_action UNIQUE (resource_type, action);


--
-- Name: user_timer_tasks user_timer_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.user_timer_tasks
    ADD CONSTRAINT user_timer_tasks_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_ai_configs_created_by; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_ai_configs_created_by ON public.ai_configs USING btree (created_by);


--
-- Name: idx_ai_configs_enabled; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_ai_configs_enabled ON public.ai_configs USING btree (enabled);


--
-- Name: idx_ai_configs_provider; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_ai_configs_provider ON public.ai_configs USING btree (provider);


--
-- Name: idx_ai_configs_updated_at; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_ai_configs_updated_at ON public.ai_configs USING btree (updated_at);


--
-- Name: idx_ai_test_logs_config_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_ai_test_logs_config_id ON public.ai_test_logs USING btree (config_id);


--
-- Name: idx_ai_test_logs_provider; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_ai_test_logs_provider ON public.ai_test_logs USING btree (provider);


--
-- Name: idx_ai_test_logs_success; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_ai_test_logs_success ON public.ai_test_logs USING btree (success);


--
-- Name: idx_ai_test_logs_tested_at; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_ai_test_logs_tested_at ON public.ai_test_logs USING btree (tested_at);


--
-- Name: idx_ai_usage_stats_config_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_ai_usage_stats_config_id ON public.ai_usage_stats USING btree (config_id);


--
-- Name: idx_ai_usage_stats_provider; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_ai_usage_stats_provider ON public.ai_usage_stats USING btree (provider);


--
-- Name: idx_ai_usage_stats_unique; Type: INDEX; Schema: public; Owner: user
--

CREATE UNIQUE INDEX idx_ai_usage_stats_unique ON public.ai_usage_stats USING btree (config_id, usage_date);


--
-- Name: idx_ai_usage_stats_usage_date; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_ai_usage_stats_usage_date ON public.ai_usage_stats USING btree (usage_date);


--
-- Name: idx_audit_log_action; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_audit_log_action ON public.system_audit_log USING btree (action);


--
-- Name: idx_audit_log_created_at; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_audit_log_created_at ON public.system_audit_log USING btree (created_at);


--
-- Name: idx_audit_log_entity; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_audit_log_entity ON public.system_audit_log USING btree (entity_type, entity_id);


--
-- Name: idx_audit_log_user_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_audit_log_user_id ON public.system_audit_log USING btree (user_id);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_correlation; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_audit_logs_correlation ON public.audit_logs USING btree (correlation_id);


--
-- Name: idx_audit_logs_event_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_audit_logs_event_id ON public.audit_logs USING btree (event_id);


--
-- Name: idx_audit_logs_parent_event; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_audit_logs_parent_event ON public.audit_logs USING btree (parent_event_id);


--
-- Name: idx_audit_logs_project; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_audit_logs_project ON public.audit_logs USING btree (project_id);


--
-- Name: idx_audit_logs_request; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_audit_logs_request ON public.audit_logs USING btree (request_id);


--
-- Name: idx_audit_logs_resource; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_audit_logs_resource ON public.audit_logs USING btree (resource_type, resource_id);


--
-- Name: idx_audit_logs_session; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_audit_logs_session ON public.audit_logs USING btree (session_id);


--
-- Name: idx_audit_logs_status; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_audit_logs_status ON public.audit_logs USING btree (status);


--
-- Name: idx_audit_logs_timestamp; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs USING btree ("timestamp" DESC);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: idx_companies_code; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_companies_code ON public.companies USING btree (company_code);


--
-- Name: idx_companies_created_by; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_companies_created_by ON public.companies USING btree (created_by);


--
-- Name: idx_companies_name; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_companies_name ON public.companies USING btree (company_name);


--
-- Name: idx_companies_status; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_companies_status ON public.companies USING btree (status);


--
-- Name: idx_company_user_project_permissions_project_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_company_user_project_permissions_project_id ON public.company_user_project_permissions USING btree (project_id);


--
-- Name: idx_company_user_project_permissions_user_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_company_user_project_permissions_user_id ON public.company_user_project_permissions USING btree (company_user_id);


--
-- Name: idx_company_users_customer_id_active; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_company_users_customer_id_active ON public.company_users USING btree (customer_id, status) WHERE ((status)::text = 'active'::text);


--
-- Name: idx_company_users_primary_contact; Type: INDEX; Schema: public; Owner: user
--

CREATE UNIQUE INDEX idx_company_users_primary_contact ON public.company_users USING btree (customer_id) WHERE (is_primary_contact = true);


--
-- Name: idx_company_users_role_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_company_users_role_id ON public.company_users USING btree (role_id);


--
-- Name: idx_customer_contacts_contact_date; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_customer_contacts_contact_date ON public.customer_contacts USING btree (contact_date);


--
-- Name: idx_customer_contacts_customer_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_customer_contacts_customer_id ON public.customer_contacts USING btree (customer_id);


--
-- Name: idx_customer_contacts_status; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_customer_contacts_status ON public.customer_contacts USING btree (status);


--
-- Name: idx_customer_users_customer_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_customer_users_customer_id ON public.customer_users USING btree (customer_id);


--
-- Name: idx_customer_users_user_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_customer_users_user_id ON public.customer_users USING btree (user_id);


--
-- Name: idx_permission_audit_logs_performed_at; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_permission_audit_logs_performed_at ON public.permission_audit_logs USING btree (performed_at);


--
-- Name: idx_permission_audit_logs_user_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_permission_audit_logs_user_id ON public.permission_audit_logs USING btree (company_user_id);


--
-- Name: idx_project_companies_company_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_project_companies_company_id ON public.project_companies USING btree (company_id);


--
-- Name: idx_project_companies_project_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_project_companies_project_id ON public.project_companies USING btree (project_id);


--
-- Name: idx_project_users_project_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_project_users_project_id ON public.project_users USING btree (project_id);


--
-- Name: idx_project_users_user_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_project_users_user_id ON public.project_users USING btree (user_id);


--
-- Name: idx_projects_active_deleted; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_projects_active_deleted ON public.projects USING btree (owner_id, created_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_projects_deleted_at; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_projects_deleted_at ON public.projects USING btree (deleted_at);


--
-- Name: idx_projects_name; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_projects_name ON public.projects USING btree (name);


--
-- Name: idx_role_permissions_permission_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_role_permissions_permission_id ON public.role_permissions USING btree (permission_id);


--
-- Name: idx_role_permissions_role_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_role_permissions_role_id ON public.role_permissions USING btree (role_id);


--
-- Name: idx_task_time_logs_start_time; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_task_time_logs_start_time ON public.task_time_logs USING btree (start_time);


--
-- Name: idx_task_time_logs_task_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_task_time_logs_task_id ON public.task_time_logs USING btree (task_id);


--
-- Name: idx_task_time_logs_user_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_task_time_logs_user_id ON public.task_time_logs USING btree (user_id);


--
-- Name: idx_task_time_logs_user_task; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_task_time_logs_user_task ON public.task_time_logs USING btree (user_id, task_id);


--
-- Name: idx_task_updates_created_at; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_task_updates_created_at ON public.task_updates USING btree (created_at DESC);


--
-- Name: idx_task_updates_task_created; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_task_updates_task_created ON public.task_updates USING btree (task_id, created_at DESC);


--
-- Name: idx_task_updates_task_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_task_updates_task_id ON public.task_updates USING btree (task_id);


--
-- Name: idx_task_updates_type; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_task_updates_type ON public.task_updates USING btree (update_type);


--
-- Name: idx_task_updates_type_created; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_task_updates_type_created ON public.task_updates USING btree (update_type, created_at DESC);


--
-- Name: idx_task_updates_type_value; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_task_updates_type_value ON public.task_updates USING btree (update_type, new_value);


--
-- Name: idx_tasks_active_deleted; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_tasks_active_deleted ON public.tasks USING btree (project_id, status) WHERE (deleted_at IS NULL);


--
-- Name: idx_tasks_assignee_id_deleted_at; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_tasks_assignee_id_deleted_at ON public.tasks USING btree (assignee_id, deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_tasks_assignee_status_deleted; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_tasks_assignee_status_deleted ON public.tasks USING btree (assignee_id, status, deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_tasks_custom_fields_gin; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_tasks_custom_fields_gin ON public.tasks USING gin (custom_fields) WHERE (deleted_at IS NULL);


--
-- Name: INDEX idx_tasks_custom_fields_gin; Type: COMMENT; Schema: public; Owner: user
--

COMMENT ON INDEX public.idx_tasks_custom_fields_gin IS 'Enables efficient searches within JSONB custom fields';


--
-- Name: idx_tasks_deleted_at; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_tasks_deleted_at ON public.tasks USING btree (deleted_at);


--
-- Name: idx_tasks_deleted_at_created_at; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_tasks_deleted_at_created_at ON public.tasks USING btree (deleted_at, created_at DESC) WHERE (deleted_at IS NULL);


--
-- Name: INDEX idx_tasks_deleted_at_created_at; Type: COMMENT; Schema: public; Owner: user
--

COMMENT ON INDEX public.idx_tasks_deleted_at_created_at IS 'Optimizes global task listing ordered by creation date';


--
-- Name: idx_tasks_due_date_deleted_at; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_tasks_due_date_deleted_at ON public.tasks USING btree (due_date, deleted_at) WHERE ((deleted_at IS NULL) AND (due_date IS NOT NULL));


--
-- Name: idx_tasks_global_query_covering; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_tasks_global_query_covering ON public.tasks USING btree (deleted_at, created_at, id, project_id, title, status, assignee_id, due_date, parent_id, task_level, sort_order) WHERE (deleted_at IS NULL);


--
-- Name: INDEX idx_tasks_global_query_covering; Type: COMMENT; Schema: public; Owner: user
--

COMMENT ON INDEX public.idx_tasks_global_query_covering IS 'Covering index for global task queries to avoid table lookups';


--
-- Name: idx_tasks_level; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_tasks_level ON public.tasks USING btree (task_level);


--
-- Name: idx_tasks_parent_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_tasks_parent_id ON public.tasks USING btree (parent_id);


--
-- Name: idx_tasks_parent_level_sort; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_tasks_parent_level_sort ON public.tasks USING btree (parent_id, task_level, sort_order) WHERE (deleted_at IS NULL);


--
-- Name: idx_tasks_project_id_deleted_at; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_tasks_project_id_deleted_at ON public.tasks USING btree (project_id, deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_tasks_project_parent; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_tasks_project_parent ON public.tasks USING btree (project_id, parent_id);


--
-- Name: idx_tasks_project_parent_deleted; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_tasks_project_parent_deleted ON public.tasks USING btree (project_id, parent_id, deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_tasks_sort_order; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_tasks_sort_order ON public.tasks USING btree (sort_order);


--
-- Name: idx_tasks_status_deleted_at; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_tasks_status_deleted_at ON public.tasks USING btree (status, deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_tasks_total_time; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_tasks_total_time ON public.tasks USING btree (total_time_seconds);


--
-- Name: idx_timeline_events_date; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_timeline_events_date ON public.timeline_events USING btree (event_date DESC);


--
-- Name: idx_timeline_events_task_date; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_timeline_events_task_date ON public.timeline_events USING btree (task_id, event_date DESC);


--
-- Name: idx_timeline_events_task_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_timeline_events_task_id ON public.timeline_events USING btree (task_id);


--
-- Name: idx_timeline_events_type; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_timeline_events_type ON public.timeline_events USING btree (event_type);


--
-- Name: idx_timeline_events_type_date; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_timeline_events_type_date ON public.timeline_events USING btree (event_type, event_date DESC);


--
-- Name: idx_user_timer_tasks_category; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_user_timer_tasks_category ON public.user_timer_tasks USING btree (category);


--
-- Name: idx_user_timer_tasks_created_at; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_user_timer_tasks_created_at ON public.user_timer_tasks USING btree (created_at);


--
-- Name: idx_user_timer_tasks_status; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_user_timer_tasks_status ON public.user_timer_tasks USING btree (status);


--
-- Name: idx_user_timer_tasks_user_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_user_timer_tasks_user_id ON public.user_timer_tasks USING btree (user_id);


--
-- Name: idx_users_current_timing_task; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_users_current_timing_task ON public.users USING btree (current_timing_task_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_last_login; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_users_last_login ON public.users USING btree (last_login_at);


--
-- Name: idx_users_profile_gin; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_users_profile_gin ON public.users USING gin (profile);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_users_status; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_users_status ON public.users USING btree (status);


--
-- Name: idx_users_timing_accumulated_seconds; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_users_timing_accumulated_seconds ON public.users USING btree (timing_accumulated_seconds);


--
-- Name: idx_users_timing_paused_time; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_users_timing_paused_time ON public.users USING btree (timing_paused_time);


--
-- Name: idx_users_timing_status; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_users_timing_status ON public.users USING btree (timing_status);


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_users_username ON public.users USING btree (username);


--
-- Name: companies companies_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER companies_updated_at_trigger BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_companies_updated_at();


--
-- Name: tasks trigger_check_task_hierarchy; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER trigger_check_task_hierarchy BEFORE INSERT OR UPDATE OF parent_id ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.check_task_hierarchy();


--
-- Name: tasks trigger_update_parent_progress; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER trigger_update_parent_progress AFTER INSERT OR DELETE OR UPDATE OF status ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_parent_task_progress();


--
-- Name: company_roles update_company_roles_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER update_company_roles_updated_at BEFORE UPDATE ON public.company_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: company_user_project_permissions update_company_user_project_permissions_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER update_company_user_project_permissions_updated_at BEFORE UPDATE ON public.company_user_project_permissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: company_users update_company_users_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER update_company_users_updated_at BEFORE UPDATE ON public.company_users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: customer_contacts update_customer_contacts_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER update_customer_contacts_updated_at BEFORE UPDATE ON public.customer_contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: customer_users update_customer_users_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER update_customer_users_updated_at BEFORE UPDATE ON public.customer_users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: task_time_logs update_task_time_logs_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER update_task_time_logs_updated_at BEFORE UPDATE ON public.task_time_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ai_configs ai_configs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.ai_configs
    ADD CONSTRAINT ai_configs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: ai_configs ai_configs_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.ai_configs
    ADD CONSTRAINT ai_configs_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: ai_test_logs ai_test_logs_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.ai_test_logs
    ADD CONSTRAINT ai_test_logs_config_id_fkey FOREIGN KEY (config_id) REFERENCES public.ai_configs(id) ON DELETE CASCADE;


--
-- Name: ai_test_logs ai_test_logs_tested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.ai_test_logs
    ADD CONSTRAINT ai_test_logs_tested_by_fkey FOREIGN KEY (tested_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: ai_usage_stats ai_usage_stats_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.ai_usage_stats
    ADD CONSTRAINT ai_usage_stats_config_id_fkey FOREIGN KEY (config_id) REFERENCES public.ai_configs(id) ON DELETE CASCADE;


--
-- Name: companies companies_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: companies companies_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: company_user_project_permissions company_user_project_permissions_company_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.company_user_project_permissions
    ADD CONSTRAINT company_user_project_permissions_company_user_id_fkey FOREIGN KEY (company_user_id) REFERENCES public.company_users(id) ON DELETE CASCADE;


--
-- Name: company_user_project_permissions company_user_project_permissions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.company_user_project_permissions
    ADD CONSTRAINT company_user_project_permissions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: company_user_project_permissions company_user_project_permissions_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.company_user_project_permissions
    ADD CONSTRAINT company_user_project_permissions_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: company_users company_users_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.company_users
    ADD CONSTRAINT company_users_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: company_users company_users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.company_users
    ADD CONSTRAINT company_users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.company_roles(id);


--
-- Name: customer_contacts customer_contacts_contacted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.customer_contacts
    ADD CONSTRAINT customer_contacts_contacted_by_fkey FOREIGN KEY (contacted_by) REFERENCES public.users(id);


--
-- Name: customer_users customer_users_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.customer_users
    ADD CONSTRAINT customer_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: customers customers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: customers customers_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: audit_logs fk_audit_logs_project; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT fk_audit_logs_project FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: audit_logs fk_audit_logs_user; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: task_time_logs fk_task_time_logs_task; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.task_time_logs
    ADD CONSTRAINT fk_task_time_logs_task FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_time_logs fk_task_time_logs_user; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.task_time_logs
    ADD CONSTRAINT fk_task_time_logs_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users fk_users_current_timing_task; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_users_current_timing_task FOREIGN KEY (current_timing_task_id) REFERENCES public.tasks(id) ON DELETE SET NULL;


--
-- Name: users fk_users_current_user_timer_task; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_users_current_user_timer_task FOREIGN KEY (current_user_timer_task_id) REFERENCES public.user_timer_tasks(id) ON DELETE SET NULL;


--
-- Name: permission_audit_logs permission_audit_logs_company_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.permission_audit_logs
    ADD CONSTRAINT permission_audit_logs_company_user_id_fkey FOREIGN KEY (company_user_id) REFERENCES public.company_users(id);


--
-- Name: permission_audit_logs permission_audit_logs_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.permission_audit_logs
    ADD CONSTRAINT permission_audit_logs_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(id);


--
-- Name: permission_audit_logs permission_audit_logs_target_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.permission_audit_logs
    ADD CONSTRAINT permission_audit_logs_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES public.company_users(id);


--
-- Name: project_companies project_companies_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.project_companies
    ADD CONSTRAINT project_companies_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: project_companies project_companies_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.project_companies
    ADD CONSTRAINT project_companies_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_users project_users_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.project_users
    ADD CONSTRAINT project_users_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_users project_users_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.project_users
    ADD CONSTRAINT project_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: projects projects_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.company_roles(id) ON DELETE CASCADE;


--
-- Name: system_audit_log system_audit_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.system_audit_log
    ADD CONSTRAINT system_audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: task_time_logs task_time_logs_user_timer_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.task_time_logs
    ADD CONSTRAINT task_time_logs_user_timer_task_id_fkey FOREIGN KEY (user_timer_task_id) REFERENCES public.user_timer_tasks(id) ON DELETE CASCADE;


--
-- Name: task_updates task_updates_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.task_updates
    ADD CONSTRAINT task_updates_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_updates task_updates_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.task_updates
    ADD CONSTRAINT task_updates_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_assignee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: timeline_events timeline_events_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.timeline_events
    ADD CONSTRAINT timeline_events_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: timeline_events timeline_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.timeline_events
    ADD CONSTRAINT timeline_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: user_timer_tasks user_timer_tasks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.user_timer_tasks
    ADD CONSTRAINT user_timer_tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

