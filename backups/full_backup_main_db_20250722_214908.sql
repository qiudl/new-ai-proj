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
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: check_task_hierarchy(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: cleanup_recycled_items(integer); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: create_audit_log(integer, character varying, character varying, integer, jsonb, inet, text); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: get_task_query_stats(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: restore_project(integer, integer); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: restore_task(integer, integer); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: soft_delete_project(integer, integer); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: soft_delete_task(integer, integer); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: update_parent_task_progress(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: audit_configs; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: audit_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_configs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_configs_id_seq OWNED BY public.audit_configs.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
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
    CONSTRAINT chk_status CHECK (((status)::text = ANY ((ARRAY['success'::character varying, 'failed'::character varying, 'pending'::character varying])::text[])))
);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: company_roles; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: company_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.company_roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: company_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.company_roles_id_seq OWNED BY public.company_roles.id;


--
-- Name: company_user_project_permissions; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: company_user_project_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.company_user_project_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: company_user_project_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.company_user_project_permissions_id_seq OWNED BY public.company_user_project_permissions.id;


--
-- Name: company_users; Type: TABLE; Schema: public; Owner: -
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
    CONSTRAINT company_users_role_check CHECK (((role)::text = ANY ((ARRAY['primary_contact'::character varying, 'technical_contact'::character varying, 'decision_maker'::character varying, 'finance_contact'::character varying, 'normal'::character varying])::text[]))),
    CONSTRAINT company_users_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'left'::character varying])::text[])))
);


--
-- Name: company_users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.company_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: company_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.company_users_id_seq OWNED BY public.company_users.id;


--
-- Name: customer_contacts; Type: TABLE; Schema: public; Owner: -
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
    CONSTRAINT customer_contacts_contact_type_check CHECK (((contact_type)::text = ANY ((ARRAY['email'::character varying, 'phone'::character varying, 'meeting'::character varying, 'visit'::character varying, 'other'::character varying])::text[]))),
    CONSTRAINT customer_contacts_status_check CHECK (((status)::text = ANY ((ARRAY['planned'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: customer_contacts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_contacts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_contacts_id_seq OWNED BY public.customer_contacts.id;


--
-- Name: customer_users; Type: TABLE; Schema: public; Owner: -
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
    CONSTRAINT customer_users_role_check CHECK (((role)::text = ANY ((ARRAY['contact'::character varying, 'manager'::character varying, 'viewer'::character varying, 'admin'::character varying])::text[])))
);


--
-- Name: customer_users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_users_id_seq OWNED BY public.customer_users.id;


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
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
    CONSTRAINT customers_company_size_check CHECK (((company_size)::text = ANY ((ARRAY['startup'::character varying, 'small'::character varying, 'medium'::character varying, 'large'::character varying, 'enterprise'::character varying])::text[]))),
    CONSTRAINT customers_priority_check CHECK (((priority)::text = ANY ((ARRAY['high'::character varying, 'medium'::character varying, 'low'::character varying])::text[]))),
    CONSTRAINT customers_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'potential'::character varying, 'suspended'::character varying])::text[])))
);


--
-- Name: customers_backup; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: customers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customers_id_seq OWNED BY public.customers.id;


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    owner_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
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
    CONSTRAINT check_task_level CHECK (((task_level >= 0) AND (task_level <= 3)))
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
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
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'project_manager'::character varying, 'developer'::character varying, 'client'::character varying])::text[]))),
    CONSTRAINT users_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'suspended'::character varying])::text[])))
);


--
-- Name: overdue_tasks; Type: VIEW; Schema: public; Owner: -
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
  WHERE ((t.due_date < CURRENT_DATE) AND ((t.status)::text = ANY ((ARRAY['todo'::character varying, 'in_progress'::character varying])::text[])) AND (t.deleted_at IS NULL))
  ORDER BY t.due_date;


--
-- Name: permission_audit_logs; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: permission_audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.permission_audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: permission_audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.permission_audit_logs_id_seq OWNED BY public.permission_audit_logs.id;


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- Name: project_task_stats; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.project_task_stats AS
 SELECT p.id AS project_id,
    p.name AS project_name,
    p.owner_id,
    u.username AS owner_username,
    count(t.id) AS total_tasks,
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
        END) AS todo_tasks,
    round((((count(
        CASE
            WHEN ((t.status)::text = 'completed'::text) THEN 1
            ELSE NULL::integer
        END))::numeric * 100.0) / (NULLIF(count(t.id), 0))::numeric), 2) AS completion_percentage
   FROM ((public.projects p
     LEFT JOIN public.tasks t ON (((p.id = t.project_id) AND (t.deleted_at IS NULL))))
     LEFT JOIN public.users u ON ((p.owner_id = u.id)))
  WHERE (p.deleted_at IS NULL)
  GROUP BY p.id, p.name, p.owner_id, u.username;


--
-- Name: projects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.projects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;


--
-- Name: recycled_projects; Type: VIEW; Schema: public; Owner: -
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


--
-- Name: recycled_tasks; Type: VIEW; Schema: public; Owner: -
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


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    id integer NOT NULL,
    role_id integer,
    permission_id integer,
    is_granted boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: role_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.role_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: role_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.role_permissions_id_seq OWNED BY public.role_permissions.id;


--
-- Name: system_audit_log; Type: TABLE; Schema: public; Owner: -
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
    CONSTRAINT chk_audit_action CHECK (((action)::text = ANY ((ARRAY['CREATE'::character varying, 'UPDATE'::character varying, 'DELETE'::character varying, 'RESTORE'::character varying, 'LOGIN'::character varying, 'LOGOUT'::character varying])::text[]))),
    CONSTRAINT chk_audit_entity_type CHECK (((entity_type)::text = ANY ((ARRAY['project'::character varying, 'task'::character varying, 'user'::character varying, 'system'::character varying])::text[])))
);


--
-- Name: system_audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_audit_log_id_seq OWNED BY public.system_audit_log.id;


--
-- Name: task_updates; Type: TABLE; Schema: public; Owner: -
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
    CONSTRAINT task_updates_update_type_check CHECK (((update_type)::text = ANY ((ARRAY['status'::character varying, 'progress'::character varying, 'notes'::character varying, 'parent'::character varying])::text[])))
);


--
-- Name: task_updates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.task_updates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: task_updates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.task_updates_id_seq OWNED BY public.task_updates.id;


--
-- Name: tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tasks_id_seq OWNED BY public.tasks.id;


--
-- Name: timeline_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.timeline_events (
    id integer NOT NULL,
    task_id integer NOT NULL,
    event_type character varying(50) NOT NULL,
    event_date timestamp with time zone DEFAULT now() NOT NULL,
    description text NOT NULL,
    user_id integer,
    metadata jsonb,
    CONSTRAINT timeline_events_event_type_check CHECK (((event_type)::text = ANY ((ARRAY['created'::character varying, 'updated'::character varying, 'completed'::character varying, 'deleted'::character varying, 'restored'::character varying])::text[])))
);


--
-- Name: timeline_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.timeline_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: timeline_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.timeline_events_id_seq OWNED BY public.timeline_events.id;


--
-- Name: user_stats; Type: VIEW; Schema: public; Owner: -
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


--
-- Name: user_task_assignments; Type: VIEW; Schema: public; Owner: -
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


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
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
-- Name: audit_configs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_configs ALTER COLUMN id SET DEFAULT nextval('public.audit_configs_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: company_roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_roles ALTER COLUMN id SET DEFAULT nextval('public.company_roles_id_seq'::regclass);


--
-- Name: company_user_project_permissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_user_project_permissions ALTER COLUMN id SET DEFAULT nextval('public.company_user_project_permissions_id_seq'::regclass);


--
-- Name: company_users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_users ALTER COLUMN id SET DEFAULT nextval('public.company_users_id_seq'::regclass);


--
-- Name: customer_contacts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_contacts ALTER COLUMN id SET DEFAULT nextval('public.customer_contacts_id_seq'::regclass);


--
-- Name: customer_users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_users ALTER COLUMN id SET DEFAULT nextval('public.customer_users_id_seq'::regclass);


--
-- Name: customers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers ALTER COLUMN id SET DEFAULT nextval('public.customers_id_seq'::regclass);


--
-- Name: permission_audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permission_audit_logs ALTER COLUMN id SET DEFAULT nextval('public.permission_audit_logs_id_seq'::regclass);


--
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- Name: projects id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects ALTER COLUMN id SET DEFAULT nextval('public.projects_id_seq'::regclass);


--
-- Name: role_permissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions ALTER COLUMN id SET DEFAULT nextval('public.role_permissions_id_seq'::regclass);


--
-- Name: system_audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_audit_log ALTER COLUMN id SET DEFAULT nextval('public.system_audit_log_id_seq'::regclass);


--
-- Name: task_updates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_updates ALTER COLUMN id SET DEFAULT nextval('public.task_updates_id_seq'::regclass);


--
-- Name: tasks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks ALTER COLUMN id SET DEFAULT nextval('public.tasks_id_seq'::regclass);


--
-- Name: timeline_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timeline_events ALTER COLUMN id SET DEFAULT nextval('public.timeline_events_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: audit_configs; Type: TABLE DATA; Schema: public; Owner: -
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
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_logs (id, event_id, "timestamp", user_id, user_email, user_name, user_role, action, resource_type, resource_id, resource_name, ip_address, user_agent, session_id, request_id, description, before_data, after_data, changes, status, error_message, project_id, parent_event_id, correlation_id, metadata, tags) FROM stdin;
1	17116c51-4ead-4d20-acd2-0edcae64cb0c	2025-07-20 12:09:12.767611+00	1	test@example.com	testuser		task.create	task	123	Test Task	192.168.1.1					\N	\N	\N	success		\N			\N	\N
2	f35e1574-e4ce-46d4-adc6-b579d22690fd	2025-07-20 12:09:12.772354+00	1	test@example.com	testuser		task.update	task	123	Updated Task	192.168.1.1					{"id": 123, "title": "Original Task", "status": "todo", "due_date": null, "parent_id": null, "created_at": "0001-01-01T00:00:00Z", "project_id": 1, "sort_order": 0, "task_level": 0, "updated_at": "0001-01-01T00:00:00Z", "assignee_id": null, "description": "Original description", "custom_fields": null}	{"id": 123, "title": "Updated Task", "status": "in_progress", "due_date": null, "parent_id": null, "created_at": "0001-01-01T00:00:00Z", "project_id": 1, "sort_order": 0, "task_level": 0, "updated_at": "0001-01-01T00:00:00Z", "assignee_id": null, "description": "Updated description", "custom_fields": null}	{"title": {"to": "Updated Task", "from": "Original Task"}, "status": {"to": "in_progress", "from": "todo"}, "description": {"to": "Updated description", "from": "Original description"}}	success		1			\N	\N
3	c1678614-bdf2-4b63-8f7d-cdbbbe1e50ab	2025-07-20 12:09:13.782277+00	1	test@example.com	testuser		task.delete	task	999		192.168.1.1					\N	\N	\N	failed	Task not found	\N			\N	\N
\.


--
-- Data for Name: company_roles; Type: TABLE DATA; Schema: public; Owner: -
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
-- Data for Name: company_user_project_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.company_user_project_permissions (id, company_user_id, project_id, can_view_project, can_edit_project, can_delete_project, can_manage_tasks, can_view_financials, can_manage_members, permission_start_date, permission_end_date, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: company_users; Type: TABLE DATA; Schema: public; Owner: -
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
-- Data for Name: customer_contacts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.customer_contacts (id, customer_id, contact_type, subject, content, contact_date, next_contact_date, status, result, contacted_by, created_at, updated_at) FROM stdin;
1	1	email	项目合作咨询	关于新项目的合作细节讨论	2025-07-20 23:55:26.600934	\N	completed	\N	1	2025-07-20 23:55:26.600934	2025-07-20 23:55:26.600934
2	1	phone	跟进合同签署	确认合同条款和签署时间	2025-07-20 23:55:26.600934	\N	completed	\N	1	2025-07-20 23:55:26.600934	2025-07-20 23:55:26.600934
3	2	meeting	需求调研会议	深入了解客户具体需求	2025-07-20 23:55:26.600934	\N	planned	\N	1	2025-07-20 23:55:26.600934	2025-07-20 23:55:26.600934
4	3	email	产品介绍	发送产品详细介绍和报价	2025-07-20 23:55:26.600934	\N	completed	\N	1	2025-07-20 23:55:26.600934	2025-07-20 23:55:26.600934
5	1	email	测试联系	这是一个测试联系记录	2025-07-21 08:15:44.369398	\N	planned	\N	1	2025-07-21 00:15:44.369726	2025-07-21 00:15:44.369726
\.


--
-- Data for Name: customer_users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.customer_users (id, customer_id, user_id, role, is_primary, permissions, access_level, created_at, updated_at) FROM stdin;
1	1	1	admin	t	\N	10	2025-07-20 23:55:26.60007	2025-07-20 23:55:26.60007
2	2	1	manager	t	\N	8	2025-07-20 23:55:26.60007	2025-07-20 23:55:26.60007
3	3	1	contact	t	\N	5	2025-07-20 23:55:26.60007	2025-07-20 23:55:26.60007
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.customers (id, company_name, company_code, industry, company_type, business_license, tax_number, legal_representative, address, city, province, postal_code, website, main_phone, main_email, status, priority, annual_contract_value, total_contract_value, start_date, employee_count, company_size, created_by, updated_by, created_at, updated_at, deleted_at) FROM stdin;
2	腾讯科技有限公司	TCT001	互联网科技	limited_company	91440300708461136T	\N	马化腾	深圳市南山区科技园科技中一路腾讯大厦	深圳	广东	\N	https://www.tencent.com	0755-86013388	contact@tencent.com	active	high	800000.00	0.00	\N	3000	enterprise	1	\N	2025-07-21 12:52:05.776093	2025-07-21 12:52:05.776093	\N
3	百度在线网络技术有限公司	BDU001	人工智能	limited_company	91110000802100433B	\N	李彦宏	北京市海淀区上地十街10号百度大厦	北京	北京	\N	https://www.baidu.com	010-59928888	contact@baidu.com	potential	medium	500000.00	0.00	\N	2000	large	1	\N	2025-07-21 12:52:05.776093	2025-07-21 12:52:05.776093	\N
4	华为技术有限公司	HW001	通信设备	limited_company	91440300279439003E	\N	任正非	深圳市龙岗区坂田华为总部办公楼	深圳	广东	\N	https://www.huawei.com	0755-28780808	contact@huawei.com	active	high	1500000.00	0.00	\N	8000	enterprise	1	\N	2025-07-21 12:52:05.776093	2025-07-21 12:52:05.776093	\N
5	测试企业_1753169472416_更新	TEST1753169472416	软件开发	limited_company	91000000000000000X	\N	张三	北京市朝阳区测试街道123号	北京	北京	100000	https://test.example.com	010-12345678	test@example.com	active	high	100000.00	0.00	\N	50	small	1	1	2025-07-22 07:31:12.422247	2025-07-22 07:31:12.433867	\N
1	北京品牌鞋服有限公司	\N	品牌鞋服		\N	\N	\N	北京北神树	北京	北京	\N		\N	\N	active	high	\N	0.00	\N	\N	\N	1	1	2025-07-21 12:52:05.776093	2025-07-22 04:58:33.854226	\N
8	李宁集团	\N	鞋服	limited_company	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	active	high	\N	0.00	\N	\N	\N	1	1	2025-07-22 09:06:34.496343	2025-07-22 09:23:52.355272	\N
7	北京智慧云彩电子商务科技有限公司	DEMO1753169966	软件开发	limited_company	\N	\N	\N	JavaScript测试地址	北京	北京	\N	\N	010-88776655	updated@example.com	active	high	0.00	0.00	\N	\N	\N	1	1	2025-07-22 07:39:26.507378	2025-07-22 09:28:45.341639	\N
6	新测试企业2025	NTC2025	软件开发	limited_company	\N	\N	\N	北京市海淀区中关村软件园	北京	北京	\N	\N	010-88888888	contact@newtest2025.com	potential	high	\N	0.00	\N	\N	\N	1	\N	2025-07-22 07:32:44.640965	2025-07-22 07:32:44.640965	2025-07-22 13:28:56.944349
9	北京通运物流有限公司	111	物流	limited_company	111	111	魏小健	3322	北京	北京	\N	\N	010-99922332	xiaojian@tongyun.com	active	high	\N	0.00	\N	20	small	1	1	2025-07-22 09:26:50.849844	2025-07-22 13:30:53.037928	\N
\.


--
-- Data for Name: customers_backup; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.customers_backup (id, name, company, industry, contact_person, email, phone, address, website, status, priority, contract_value, start_date, end_date, custom_fields, created_by, updated_by, created_at, updated_at, deleted_at) FROM stdin;
1	张三	阿里巴巴集团	电子商务	李经理	zhangsan@alibaba.com	13800138001	杭州市余杭区	\N	active	high	100000.00	\N	\N	{"tags": ["VIP客户", "长期合作"], "source": "官网咨询"}	1	\N	2025-07-20 23:55:26.595848	2025-07-20 23:55:26.595848	\N
2	王五	腾讯科技	互联网	陈总监	wangwu@tencent.com	13800138002	深圳市南山区	\N	potential	medium	80000.00	\N	\N	{"tags": ["潜在客户"], "source": "展会"}	1	\N	2025-07-20 23:55:26.595848	2025-07-20 23:55:26.595848	\N
3	李四	百度公司	搜索引擎	刘主管	lisi@baidu.com	13800138003	北京市海淀区	\N	active	medium	60000.00	\N	\N	{"tags": ["技术导向"], "source": "推荐"}	1	\N	2025-07-20 23:55:26.595848	2025-07-20 23:55:26.595848	\N
4	测试客户	测试公司	软件	张测试	test@example.com	13800000000	测试地址	\N	potential	medium	\N	\N	\N	\N	1	\N	2025-07-21 00:15:44.188157	2025-07-21 00:15:44.188157	\N
\.


--
-- Data for Name: permission_audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.permission_audit_logs (id, company_user_id, target_user_id, action_type, permission_code, resource_type, resource_id, old_value, new_value, reason, performed_by, performed_at, ip_address, user_agent) FROM stdin;
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: -
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
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.projects (id, name, description, owner_id, created_at, deleted_at, updated_at) FROM stdin;
1	AI项目管理平台MVP	智能项目管理平台的最小可行产品开发	1	2025-07-20 04:02:26.599473+00	\N	2025-07-20 04:10:54.556316+00
2	机器学习模型训练	深度学习模型训练和部署项目	1	2025-07-20 04:02:26.599473+00	2025-07-20 13:41:13.084359+00	2025-07-20 04:10:54.556316+00
3	前端界面优化	React前端界面设计和用户体验优化	2	2025-07-20 04:02:26.599473+00	2025-07-20 13:41:16.002279+00	2025-07-20 04:10:54.556316+00
34	李宁团购管理平台	111	1	2025-07-20 05:45:14.616094+00	\N	2025-07-22 07:12:26.428187+00
36	测试项目关联功能	测试项目创建和用户关联功能	1	2025-07-22 12:06:36.591547+00	\N	2025-07-22 12:06:36.591547+00
35	通运物流系统	这是修复后的项目描述	1	2025-07-22 09:43:56.660978+00	\N	2025-07-22 13:01:56.041559+00
37	酷采3.0	重构	1	2025-07-22 13:41:28.353679+00	\N	2025-07-22 13:41:28.353679+00
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: -
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
-- Data for Name: system_audit_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_audit_log (id, user_id, action, entity_type, entity_id, entity_data, ip_address, user_agent, created_at) FROM stdin;
\.


--
-- Data for Name: task_updates; Type: TABLE DATA; Schema: public; Owner: -
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
\.


--
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tasks (id, project_id, title, description, status, assignee_id, due_date, custom_fields, created_at, parent_id, task_level, sort_order, deleted_at, updated_at) FROM stdin;
2	1	安装Docker环境	在开发机器上安装Docker Desktop	completed	1	2025-07-19	{"priority": "high", "estimated_hours": 2}	2025-07-20 04:11:54.875182+00	1	2	1	\N	2025-07-20 04:11:54.875182+00
3	1	配置Docker Compose文件	创建docker-compose.yml配置文件	in_progress	1	2025-07-20	{"priority": "high", "estimated_hours": 4}	2025-07-20 04:11:54.875182+00	1	2	2	\N	2025-07-20 04:11:54.875182+00
4	1	环境测试验证	验证Docker环境是否正常工作	todo	1	2025-07-20	{"priority": "medium", "estimated_hours": 2}	2025-07-20 04:11:54.875182+00	1	2	3	\N	2025-07-20 04:11:54.875182+00
1	1	项目环境搭建	搭建开发环境，包括Docker配置	in_progress	1	2025-07-20	{"priority": "high", "progress": 33, "estimated_hours": 8}	2025-07-20 04:11:54.875182+00	\N	0	1	\N	2025-07-20 04:11:54.875182+00
8	1	设计用户表结构	设计用户表的字段和约束	cancelled	1	2025-07-21	{"priority": "high", "project_name": "AI项目管理平台MVP", "assignee_name": "admin", "children_count": 0, "estimated_hours": 4}	2025-07-20 04:12:27.867965+00	5	2	1	2025-07-20 11:33:15.779927+00	2025-07-20 04:12:27.867965+00
20	34	新功能开发计划	开发新的用户界面功能	todo	1	2025-08-01	{"tags": ["功能开发", "前端"], "priority": "high", "estimated_hours": 40}	2025-07-20 10:47:46.203969+00	\N	0	0	\N	2025-07-20 10:47:46.203969+00
14	34	项目环境搭建	搭建开发环境，包括Docker配置	todo	1	2025-07-20	{"tags": ["环境", "Docker"], "priority": "high", "estimated_hours": 8}	2025-07-20 05:45:38.356928+00	\N	0	0	\N	2025-07-20 05:45:38.356928+00
16	34	API接口开发	开发后端REST API接口	todo	\N	2025-07-25	{"tags": ["API", "后端"], "priority": "medium", "estimated_hours": 24}	2025-07-20 05:45:38.373697+00	\N	0	0	\N	2025-07-20 05:45:38.373697+00
17	34	前端页面开发	开发React前端界面	todo	\N	2025-07-30	{"tags": ["前端", "React"], "priority": "medium", "estimated_hours": 32}	2025-07-20 05:45:38.375025+00	\N	0	0	\N	2025-07-20 05:45:38.375025+00
18	34	测试和部署	进行系统测试和生产环境部署	todo	\N	2025-08-05	{"tags": ["测试", "部署"], "priority": "high", "estimated_hours": 12}	2025-07-20 05:45:38.375804+00	\N	0	0	\N	2025-07-20 05:45:38.375804+00
9	1	设计项目表结构	设计项目表的字段和关系	completed	1	2025-07-21	{"priority": "high", "estimated_hours": 6}	2025-07-20 04:12:27.867965+00	5	2	2	2025-07-20 11:33:15.779927+00	2025-07-20 04:12:27.867965+00
21	34	UI组件设计	设计新的用户界面组件	todo	1	2025-07-22	{"tags": ["设计", "组件", "子任务"], "priority": "high", "estimated_hours": 16}	2025-07-20 10:47:46.209074+00	\N	0	0	\N	2025-07-20 10:47:46.209074+00
22	34	前端代码实现	实现前端界面代码	todo	1	2025-07-28	{"tags": ["前端", "开发", "子任务"], "priority": "medium", "estimated_hours": 20}	2025-07-20 10:47:46.210216+00	\N	0	0	\N	2025-07-20 10:47:46.210216+00
24	34	API接口对接	与后端API进行接口对接	todo	\N	2025-07-26	{"tags": ["API", "集成"], "priority": "medium", "estimated_hours": 8}	2025-07-20 10:47:46.211349+00	\N	0	0	\N	2025-07-20 10:47:46.211349+00
25	34	文档编写	编写功能使用文档	todo	\N	2025-08-02	{"tags": ["文档", "说明"], "priority": "low", "estimated_hours": 4}	2025-07-20 10:47:46.212046+00	\N	0	0	\N	2025-07-20 10:47:46.212046+00
27	34	设计文档	开发新的用户界面功能	todo	1	2025-08-01	{"tags": ["功能开发", "前端"], "priority": "high", "estimated_hours": 40}	2025-07-20 10:56:41.668068+00	\N	0	0	2025-07-20 11:32:44.263758+00	2025-07-20 10:56:41.668068+00
10	1	设计任务表结构	设计任务表的字段和层级关系	completed	1	2025-07-21	{"priority": "high", "estimated_hours": 6}	2025-07-20 04:12:27.867965+00	5	2	3	2025-07-20 11:33:15.779927+00	2025-07-20 04:12:27.867965+00
5	1	数据库设计	设计项目数据库表结构	in_progress	1	2025-07-21	{"priority": "high", "progress": 66, "project_name": "AI项目管理平台MVP", "assignee_name": "admin", "children_count": 3, "estimated_hours": 16}	2025-07-20 04:12:27.867965+00	\N	0	2	2025-07-20 11:33:15.779927+00	2025-07-20 05:49:43.033812+00
29	34	33223		in_progress	\N	\N	{"tags": [], "priority": "medium", "project_name": "李宁团购管理平台", "children_count": 0}	2025-07-20 11:34:08.606596+00	26	2	0	2025-07-20 11:34:43.022857+00	2025-07-20 11:34:08.606596+00
32	34	孙任务	3	todo	\N	\N	{"tags": [], "priority": "medium"}	2025-07-20 11:36:06.920694+00	31	3	0	\N	2025-07-20 11:36:06.920694+00
28	34	child task	22	completed	\N	\N	{"tags": [], "priority": "medium", "project_name": "李宁团购管理平台", "children_count": 0}	2025-07-20 11:33:47.11278+00	26	2	0	\N	2025-07-20 11:33:47.11278+00
31	34	第一次测试		todo	\N	\N	{"tags": [], "priority": "medium", "progress": 0}	2025-07-20 11:35:52.13218+00	30	2	0	\N	2025-07-20 11:36:06.920694+00
26	34	新功能开发计划文档	开发新的用户界面功能	in_progress	1	2025-08-01	{"tags": ["功能开发", "前端"], "priority": "high", "progress": 50, "estimated_hours": 40}	2025-07-20 10:56:41.663893+00	\N	0	0	\N	2025-07-20 11:34:36.564077+00
19	1	222	2	todo	\N	\N	{"tags": [], "priority": "medium"}	2025-07-20 05:49:05.777786+00	6	2	0	2025-07-20 12:03:58.049031+00	2025-07-20 05:49:05.777786+00
7	1	前端页面开发	开发React前端界面	todo	2	2025-07-30	{"priority": "medium", "estimated_hours": 40}	2025-07-20 04:12:27.867965+00	\N	0	4	2025-07-20 12:09:19.93083+00	2025-07-20 04:12:27.867965+00
11	1	用户认证API	实现用户登录注册接口	todo	2	2025-07-24	{"priority": "high", "estimated_hours": 8}	2025-07-20 04:12:27.867965+00	6	2	1	2025-07-20 12:09:19.93083+00	2025-07-20 04:12:27.867965+00
12	1	项目管理API	实现项目CRUD接口	todo	2	2025-07-25	{"priority": "high", "estimated_hours": 12}	2025-07-20 04:12:27.867965+00	6	2	2	2025-07-20 12:09:19.93083+00	2025-07-20 04:12:27.867965+00
13	1	任务管理API	实现任务CRUD和层级接口	todo	2	2025-07-26	{"priority": "high", "estimated_hours": 12}	2025-07-20 04:12:27.867965+00	6	2	3	2025-07-20 12:09:19.93083+00	2025-07-20 04:12:27.867965+00
23	34	功能测试	测试新功能的各项指标	todo	1	2025-07-30	{"tags": ["测试", "验收", "子任务"], "priority": "medium", "estimated_hours": 4}	2025-07-20 10:47:46.210874+00	\N	0	0	2025-07-22 12:18:12.890231+00	2025-07-20 10:47:46.210874+00
15	34	数据库设计	设计项目数据库表结构	completed	1	2025-07-21	{"tags": ["数据库", "设计"], "priority": "high", "progress": 0, "estimated_hours": 16}	2025-07-20 05:45:38.372525+00	\N	0	0	\N	2025-07-21 02:48:47.033796+00
30	34	UTA测试	33	in_progress	\N	\N	{"tags": [], "priority": "medium", "progress": 0}	2025-07-20 11:35:32.061031+00	\N	0	0	\N	2025-07-22 12:56:59.599075+00
6	1	API接口开发	开发后端REST API接口	todo	2	2025-07-25	{"tags": [], "priority": "medium", "progress": 0, "estimated_hours": 32}	2025-07-20 04:12:27.867965+00	\N	0	3	2025-07-20 12:09:19.93083+00	2025-07-20 05:49:05.777786+00
35	34	2222		in_progress	\N	\N	{"tags": [], "priority": "medium"}	2025-07-20 23:28:21.219334+00	15	2	0	\N	2025-07-20 23:28:21.219334+00
41	34	文档编写	编写功能使用文档	todo	\N	2025-08-02	{"tags": ["文档", "说明"], "priority": "low", "estimated_hours": 4}	2025-07-21 02:49:43.555474+00	\N	0	0	2025-07-22 12:16:44.653481+00	2025-07-21 02:49:43.555474+00
36	34	新功能开发计划	开发新的用户界面功能	todo	1	2025-08-01	{"tags": ["功能开发", "前端"], "priority": "high", "estimated_hours": 40}	2025-07-21 02:49:43.548936+00	\N	0	0	2025-07-22 12:17:25.242184+00	2025-07-21 02:49:43.548936+00
37	34	UI组件设计	设计新的用户界面组件	todo	1	2025-07-22	{"tags": ["设计", "组件", "子任务"], "priority": "high", "estimated_hours": 16}	2025-07-21 02:49:43.55219+00	\N	0	0	2025-07-22 12:17:25.242184+00	2025-07-21 02:49:43.55219+00
38	34	前端代码实现	实现前端界面代码	todo	1	2025-07-28	{"tags": ["前端", "开发", "子任务"], "priority": "medium", "estimated_hours": 20}	2025-07-21 02:49:43.553035+00	\N	0	0	2025-07-22 12:17:25.242184+00	2025-07-21 02:49:43.553035+00
39	34	功能测试	测试新功能的各项指标	todo	1	2025-07-30	{"tags": ["测试", "验收", "子任务"], "priority": "medium", "estimated_hours": 4}	2025-07-21 02:49:43.55394+00	\N	0	0	2025-07-22 12:17:25.242184+00	2025-07-21 02:49:43.55394+00
40	34	API接口对接	与后端API进行接口对接	todo	\N	2025-07-26	{"tags": ["API", "集成"], "priority": "medium", "estimated_hours": 8}	2025-07-21 02:49:43.554739+00	\N	0	0	2025-07-22 12:17:25.242184+00	2025-07-21 02:49:43.554739+00
42	34	孙任务	1122	todo	\N	\N	{"tags": [], "priority": "medium"}	2025-07-22 12:56:59.599075+00	30	2	0	\N	2025-07-22 12:56:59.599075+00
\.


--
-- Data for Name: timeline_events; Type: TABLE DATA; Schema: public; Owner: -
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
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, username, password_hash, role, created_at, updated_at, email, status, profile, last_login_at) FROM stdin;
2	dev_user_1	$2a$10$rOhwZ8sZFCjltzNdQqSLg.6qF2vKKcnwz0JN5jzMQjBpYOJQcn7BS	developer	2025-07-20 04:02:26.599031+00	2025-07-22 04:28:54.796722+00	dev_user_1@example.com	active	{}	\N
3	dev_user_2	$2a$10$rOhwZ8sZFCjltzNdQqSLg.6qF2vKKcnwz0JN5jzMQjBpYOJQcn7BS	developer	2025-07-20 04:02:26.599031+00	2025-07-22 04:28:54.796722+00	dev_user_2@example.com	active	{}	\N
34	qiudl	$2a$10$vU9/Zr.nwK9ILoDhTgwD9uxURMbvdgDeCTLNPdbuwvez6XlU2yl02	admin	2025-07-20 04:26:16.82371+00	2025-07-22 04:28:54.796722+00	qiudl@example.com	active	{}	\N
1	admin	$2a$10$rOhwZ8sZFCjltzNdQqSLg.6qF2vKKcnwz0JN5jzMQjBpYOJQcn7BS	admin	2025-07-20 04:02:26.599031+00	2025-07-22 04:28:54.796722+00	admin@joylodging.com	active	{}	\N
35	project_manager_1	$2a$10$rOhwZ8sZFCjltzNdQqSLg.6qF2vKKcnwz0JN5jzMQjBpYOJQcn7BS	project_manager	2025-07-22 04:28:05.428915+00	2025-07-22 04:28:54.796722+00	pm1@example.com	active	{"name": "项目经理1", "phone": "13800138001", "department": "技术部"}	\N
36	developer_1	$2a$10$rOhwZ8sZFCjltzNdQqSLg.6qF2vKKcnwz0JN5jzMQjBpYOJQcn7BS	developer	2025-07-22 04:28:05.428915+00	2025-07-22 04:28:54.796722+00	dev1@example.com	active	{"name": "开发工程师1", "phone": "13800138002", "department": "研发部"}	\N
37	client_1	$2a$10$rOhwZ8sZFCjltzNdQqSLg.6qF2vKKcnwz0JN5jzMQjBpYOJQcn7BS	client	2025-07-22 04:28:05.428915+00	2025-07-22 04:28:54.796722+00	client1@example.com	active	{"name": "客户1", "phone": "13800138003", "department": "甲方公司"}	\N
41	test_user	$2a$10$2o9oi0595Hao7ZwAiF.bpObJCQkcQ1kDMhTMk.vb.UsJbd728o56S	developer	2025-07-22 04:33:28.993199+00	2025-07-22 04:33:28.993199+00	test@example.com	active	{"name": "测试用户", "phone": "13800000000", "department": "测试部门"}	\N
43	weier	$2a$10$PGTGjpmlcaP6dlp1SglAHudxJbEjus8jAKa2zr9AYY.zLUKtfVQoy	admin	2025-07-22 07:28:36.641277+00	2025-07-22 07:28:36.641277+00	weier@joylodging.com	active	{"name": "吴薇儿", "department": "实施部"}	\N
\.


--
-- Name: audit_configs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.audit_configs_id_seq', 29, true);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 3, true);


--
-- Name: company_roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.company_roles_id_seq', 6, true);


--
-- Name: company_user_project_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.company_user_project_permissions_id_seq', 1, false);


--
-- Name: company_users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.company_users_id_seq', 14, true);


--
-- Name: customer_contacts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.customer_contacts_id_seq', 5, true);


--
-- Name: customer_users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.customer_users_id_seq', 3, true);


--
-- Name: customers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.customers_id_seq', 9, true);


--
-- Name: permission_audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.permission_audit_logs_id_seq', 1, false);


--
-- Name: permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.permissions_id_seq', 25, true);


--
-- Name: projects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.projects_id_seq', 37, true);


--
-- Name: role_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.role_permissions_id_seq', 70, true);


--
-- Name: system_audit_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.system_audit_log_id_seq', 1, false);


--
-- Name: task_updates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.task_updates_id_seq', 12, true);


--
-- Name: tasks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.tasks_id_seq', 42, true);


--
-- Name: timeline_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.timeline_events_id_seq', 44, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 43, true);


--
-- Name: audit_configs audit_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_configs
    ADD CONSTRAINT audit_configs_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_event_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_event_id_key UNIQUE (event_id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: company_roles company_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_roles
    ADD CONSTRAINT company_roles_pkey PRIMARY KEY (id);


--
-- Name: company_roles company_roles_role_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_roles
    ADD CONSTRAINT company_roles_role_code_key UNIQUE (role_code);


--
-- Name: company_user_project_permissions company_user_project_permissions_company_user_id_project_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_user_project_permissions
    ADD CONSTRAINT company_user_project_permissions_company_user_id_project_id_key UNIQUE (company_user_id, project_id);


--
-- Name: company_user_project_permissions company_user_project_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_user_project_permissions
    ADD CONSTRAINT company_user_project_permissions_pkey PRIMARY KEY (id);


--
-- Name: company_users company_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_users
    ADD CONSTRAINT company_users_pkey PRIMARY KEY (id);


--
-- Name: customer_contacts customer_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_contacts
    ADD CONSTRAINT customer_contacts_pkey PRIMARY KEY (id);


--
-- Name: customer_users customer_users_customer_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_users
    ADD CONSTRAINT customer_users_customer_id_user_id_key UNIQUE (customer_id, user_id);


--
-- Name: customer_users customer_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_users
    ADD CONSTRAINT customer_users_pkey PRIMARY KEY (id);


--
-- Name: customers customers_company_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_company_code_key UNIQUE (company_code);


--
-- Name: customers customers_company_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_company_name_key UNIQUE (company_name);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: permission_audit_logs permission_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permission_audit_logs
    ADD CONSTRAINT permission_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_permission_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_permission_code_key UNIQUE (permission_code);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_role_id_permission_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_permission_id_key UNIQUE (role_id, permission_id);


--
-- Name: system_audit_log system_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_audit_log
    ADD CONSTRAINT system_audit_log_pkey PRIMARY KEY (id);


--
-- Name: task_updates task_updates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_updates
    ADD CONSTRAINT task_updates_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: timeline_events timeline_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timeline_events
    ADD CONSTRAINT timeline_events_pkey PRIMARY KEY (id);


--
-- Name: audit_configs uq_audit_configs_resource_action; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_configs
    ADD CONSTRAINT uq_audit_configs_resource_action UNIQUE (resource_type, action);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_audit_log_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_action ON public.system_audit_log USING btree (action);


--
-- Name: idx_audit_log_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_created_at ON public.system_audit_log USING btree (created_at);


--
-- Name: idx_audit_log_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_entity ON public.system_audit_log USING btree (entity_type, entity_id);


--
-- Name: idx_audit_log_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_user_id ON public.system_audit_log USING btree (user_id);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_correlation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_correlation ON public.audit_logs USING btree (correlation_id);


--
-- Name: idx_audit_logs_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_event_id ON public.audit_logs USING btree (event_id);


--
-- Name: idx_audit_logs_parent_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_parent_event ON public.audit_logs USING btree (parent_event_id);


--
-- Name: idx_audit_logs_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_project ON public.audit_logs USING btree (project_id);


--
-- Name: idx_audit_logs_request; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_request ON public.audit_logs USING btree (request_id);


--
-- Name: idx_audit_logs_resource; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_resource ON public.audit_logs USING btree (resource_type, resource_id);


--
-- Name: idx_audit_logs_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_session ON public.audit_logs USING btree (session_id);


--
-- Name: idx_audit_logs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_status ON public.audit_logs USING btree (status);


--
-- Name: idx_audit_logs_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs USING btree ("timestamp" DESC);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: idx_company_user_project_permissions_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_company_user_project_permissions_project_id ON public.company_user_project_permissions USING btree (project_id);


--
-- Name: idx_company_user_project_permissions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_company_user_project_permissions_user_id ON public.company_user_project_permissions USING btree (company_user_id);


--
-- Name: idx_company_users_customer_id_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_company_users_customer_id_active ON public.company_users USING btree (customer_id, status) WHERE ((status)::text = 'active'::text);


--
-- Name: idx_company_users_primary_contact; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_company_users_primary_contact ON public.company_users USING btree (customer_id) WHERE (is_primary_contact = true);


--
-- Name: idx_company_users_role_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_company_users_role_id ON public.company_users USING btree (role_id);


--
-- Name: idx_customer_contacts_contact_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_contacts_contact_date ON public.customer_contacts USING btree (contact_date);


--
-- Name: idx_customer_contacts_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_contacts_customer_id ON public.customer_contacts USING btree (customer_id);


--
-- Name: idx_customer_contacts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_contacts_status ON public.customer_contacts USING btree (status);


--
-- Name: idx_customer_users_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_users_customer_id ON public.customer_users USING btree (customer_id);


--
-- Name: idx_customer_users_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_users_user_id ON public.customer_users USING btree (user_id);


--
-- Name: idx_permission_audit_logs_performed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_permission_audit_logs_performed_at ON public.permission_audit_logs USING btree (performed_at);


--
-- Name: idx_permission_audit_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_permission_audit_logs_user_id ON public.permission_audit_logs USING btree (company_user_id);


--
-- Name: idx_projects_active_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_active_deleted ON public.projects USING btree (owner_id, created_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_projects_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_deleted_at ON public.projects USING btree (deleted_at);


--
-- Name: idx_projects_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_name ON public.projects USING btree (name);


--
-- Name: idx_role_permissions_permission_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_role_permissions_permission_id ON public.role_permissions USING btree (permission_id);


--
-- Name: idx_role_permissions_role_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_role_permissions_role_id ON public.role_permissions USING btree (role_id);


--
-- Name: idx_task_updates_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_updates_created_at ON public.task_updates USING btree (created_at DESC);


--
-- Name: idx_task_updates_task_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_updates_task_created ON public.task_updates USING btree (task_id, created_at DESC);


--
-- Name: idx_task_updates_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_updates_task_id ON public.task_updates USING btree (task_id);


--
-- Name: idx_task_updates_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_updates_type ON public.task_updates USING btree (update_type);


--
-- Name: idx_task_updates_type_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_updates_type_created ON public.task_updates USING btree (update_type, created_at DESC);


--
-- Name: idx_tasks_active_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_active_deleted ON public.tasks USING btree (project_id, status) WHERE (deleted_at IS NULL);


--
-- Name: idx_tasks_assignee_id_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_assignee_id_deleted_at ON public.tasks USING btree (assignee_id, deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_tasks_assignee_status_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_assignee_status_deleted ON public.tasks USING btree (assignee_id, status, deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_tasks_custom_fields_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_custom_fields_gin ON public.tasks USING gin (custom_fields) WHERE (deleted_at IS NULL);


--
-- Name: INDEX idx_tasks_custom_fields_gin; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_tasks_custom_fields_gin IS 'Enables efficient searches within JSONB custom fields';


--
-- Name: idx_tasks_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_deleted_at ON public.tasks USING btree (deleted_at);


--
-- Name: idx_tasks_deleted_at_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_deleted_at_created_at ON public.tasks USING btree (deleted_at, created_at DESC) WHERE (deleted_at IS NULL);


--
-- Name: INDEX idx_tasks_deleted_at_created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_tasks_deleted_at_created_at IS 'Optimizes global task listing ordered by creation date';


--
-- Name: idx_tasks_due_date_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_due_date_deleted_at ON public.tasks USING btree (due_date, deleted_at) WHERE ((deleted_at IS NULL) AND (due_date IS NOT NULL));


--
-- Name: idx_tasks_global_query_covering; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_global_query_covering ON public.tasks USING btree (deleted_at, created_at, id, project_id, title, status, assignee_id, due_date, parent_id, task_level, sort_order) WHERE (deleted_at IS NULL);


--
-- Name: INDEX idx_tasks_global_query_covering; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_tasks_global_query_covering IS 'Covering index for global task queries to avoid table lookups';


--
-- Name: idx_tasks_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_level ON public.tasks USING btree (task_level);


--
-- Name: idx_tasks_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_parent_id ON public.tasks USING btree (parent_id);


--
-- Name: idx_tasks_parent_level_sort; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_parent_level_sort ON public.tasks USING btree (parent_id, task_level, sort_order) WHERE (deleted_at IS NULL);


--
-- Name: idx_tasks_project_id_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_project_id_deleted_at ON public.tasks USING btree (project_id, deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_tasks_project_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_project_parent ON public.tasks USING btree (project_id, parent_id);


--
-- Name: idx_tasks_project_parent_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_project_parent_deleted ON public.tasks USING btree (project_id, parent_id, deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_tasks_sort_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_sort_order ON public.tasks USING btree (sort_order);


--
-- Name: idx_tasks_status_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_status_deleted_at ON public.tasks USING btree (status, deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_timeline_events_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timeline_events_date ON public.timeline_events USING btree (event_date DESC);


--
-- Name: idx_timeline_events_task_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timeline_events_task_date ON public.timeline_events USING btree (task_id, event_date DESC);


--
-- Name: idx_timeline_events_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timeline_events_task_id ON public.timeline_events USING btree (task_id);


--
-- Name: idx_timeline_events_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timeline_events_type ON public.timeline_events USING btree (event_type);


--
-- Name: idx_timeline_events_type_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timeline_events_type_date ON public.timeline_events USING btree (event_type, event_date DESC);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_last_login; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_last_login ON public.users USING btree (last_login_at);


--
-- Name: idx_users_profile_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_profile_gin ON public.users USING gin (profile);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_users_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_status ON public.users USING btree (status);


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_username ON public.users USING btree (username);


--
-- Name: tasks trigger_check_task_hierarchy; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_check_task_hierarchy BEFORE INSERT OR UPDATE OF parent_id ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.check_task_hierarchy();


--
-- Name: tasks trigger_update_parent_progress; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_parent_progress AFTER INSERT OR DELETE OR UPDATE OF status ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_parent_task_progress();


--
-- Name: company_roles update_company_roles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_company_roles_updated_at BEFORE UPDATE ON public.company_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: company_user_project_permissions update_company_user_project_permissions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_company_user_project_permissions_updated_at BEFORE UPDATE ON public.company_user_project_permissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: company_users update_company_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_company_users_updated_at BEFORE UPDATE ON public.company_users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: customer_contacts update_customer_contacts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_customer_contacts_updated_at BEFORE UPDATE ON public.customer_contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: customer_users update_customer_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_customer_users_updated_at BEFORE UPDATE ON public.customer_users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: company_user_project_permissions company_user_project_permissions_company_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_user_project_permissions
    ADD CONSTRAINT company_user_project_permissions_company_user_id_fkey FOREIGN KEY (company_user_id) REFERENCES public.company_users(id) ON DELETE CASCADE;


--
-- Name: company_user_project_permissions company_user_project_permissions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_user_project_permissions
    ADD CONSTRAINT company_user_project_permissions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: company_user_project_permissions company_user_project_permissions_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_user_project_permissions
    ADD CONSTRAINT company_user_project_permissions_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: company_users company_users_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_users
    ADD CONSTRAINT company_users_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: company_users company_users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_users
    ADD CONSTRAINT company_users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.company_roles(id);


--
-- Name: customer_contacts customer_contacts_contacted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_contacts
    ADD CONSTRAINT customer_contacts_contacted_by_fkey FOREIGN KEY (contacted_by) REFERENCES public.users(id);


--
-- Name: customer_users customer_users_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_users
    ADD CONSTRAINT customer_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: customers customers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: customers customers_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: audit_logs fk_audit_logs_project; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT fk_audit_logs_project FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: audit_logs fk_audit_logs_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: permission_audit_logs permission_audit_logs_company_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permission_audit_logs
    ADD CONSTRAINT permission_audit_logs_company_user_id_fkey FOREIGN KEY (company_user_id) REFERENCES public.company_users(id);


--
-- Name: permission_audit_logs permission_audit_logs_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permission_audit_logs
    ADD CONSTRAINT permission_audit_logs_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(id);


--
-- Name: permission_audit_logs permission_audit_logs_target_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permission_audit_logs
    ADD CONSTRAINT permission_audit_logs_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES public.company_users(id);


--
-- Name: projects projects_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.company_roles(id) ON DELETE CASCADE;


--
-- Name: system_audit_log system_audit_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_audit_log
    ADD CONSTRAINT system_audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: task_updates task_updates_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_updates
    ADD CONSTRAINT task_updates_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_updates task_updates_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_updates
    ADD CONSTRAINT task_updates_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_assignee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: timeline_events timeline_events_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timeline_events
    ADD CONSTRAINT timeline_events_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: timeline_events timeline_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timeline_events
    ADD CONSTRAINT timeline_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

