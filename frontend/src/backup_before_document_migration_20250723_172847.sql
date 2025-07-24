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
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


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
-- Name: check_user_company_access(integer, integer); Type: FUNCTION; Schema: public; Owner: user
--

CREATE FUNCTION public.check_user_company_access(p_user_id integer, p_company_id integer) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_user_type VARCHAR(20);
    v_user_company_id INTEGER;
BEGIN
    SELECT user_type, company_id 
    INTO v_user_type, v_user_company_id
    FROM users 
    WHERE id = p_user_id;
    
    -- 如果用户不存在，返回false
    IF v_user_type IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- 系统用户可以访问所有企业
    IF v_user_type = 'system' THEN
        RETURN TRUE;
    END IF;
    
    -- 企业用户只能访问自己的企业
    IF v_user_type = 'company' AND v_user_company_id = p_company_id THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$;


ALTER FUNCTION public.check_user_company_access(p_user_id integer, p_company_id integer) OWNER TO "user";

--
-- Name: check_user_project_access(integer, integer); Type: FUNCTION; Schema: public; Owner: user
--

CREATE FUNCTION public.check_user_project_access(p_user_id integer, p_project_id integer) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_user_type VARCHAR(20);
    v_user_company_id INTEGER;
    v_project_company_count INTEGER;
BEGIN
    SELECT user_type, company_id 
    INTO v_user_type, v_user_company_id
    FROM users 
    WHERE id = p_user_id;
    
    -- 如果用户不存在，返回false
    IF v_user_type IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- 系统用户可以访问所有项目
    IF v_user_type = 'system' THEN
        RETURN TRUE;
    END IF;
    
    -- 企业用户只能访问关联的项目
    IF v_user_type = 'company' THEN
        -- 检查project_companies表是否存在
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_companies') THEN
            SELECT COUNT(*) 
            INTO v_project_company_count
            FROM project_companies pc
            WHERE pc.project_id = p_project_id 
            AND pc.customer_id = v_user_company_id;
            
            RETURN v_project_company_count > 0;
        ELSE
            -- 如果project_companies表不存在，暂时允许访问所有项目
            RETURN TRUE;
        END IF;
    END IF;
    
    RETURN FALSE;
END;
$$;


ALTER FUNCTION public.check_user_project_access(p_user_id integer, p_project_id integer) OWNER TO "user";

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
-- Name: update_documents_updated_at(); Type: FUNCTION; Schema: public; Owner: user
--

CREATE FUNCTION public.update_documents_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_documents_updated_at() OWNER TO "user";

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
    CONSTRAINT chk_status CHECK (((status)::text = ANY ((ARRAY['success'::character varying, 'failed'::character varying, 'pending'::character varying])::text[])))
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
-- Name: company_user_permission_templates; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.company_user_permission_templates (
    id integer NOT NULL,
    role_code character varying(50) NOT NULL,
    role_name character varying(100) NOT NULL,
    role_description text,
    permissions jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.company_user_permission_templates OWNER TO "user";

--
-- Name: company_user_permission_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.company_user_permission_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.company_user_permission_templates_id_seq OWNER TO "user";

--
-- Name: company_user_permission_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.company_user_permission_templates_id_seq OWNED BY public.company_user_permission_templates.id;


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
    CONSTRAINT company_users_role_check CHECK (((role)::text = ANY ((ARRAY['primary_contact'::character varying, 'technical_contact'::character varying, 'decision_maker'::character varying, 'finance_contact'::character varying, 'normal'::character varying])::text[]))),
    CONSTRAINT company_users_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'left'::character varying])::text[])))
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
    CONSTRAINT customer_contacts_contact_type_check CHECK (((contact_type)::text = ANY ((ARRAY['email'::character varying, 'phone'::character varying, 'meeting'::character varying, 'visit'::character varying, 'other'::character varying])::text[]))),
    CONSTRAINT customer_contacts_status_check CHECK (((status)::text = ANY ((ARRAY['planned'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
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
    CONSTRAINT customer_users_role_check CHECK (((role)::text = ANY ((ARRAY['contact'::character varying, 'manager'::character varying, 'viewer'::character varying, 'admin'::character varying])::text[])))
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
    CONSTRAINT customers_company_size_check CHECK (((company_size)::text = ANY ((ARRAY['startup'::character varying, 'small'::character varying, 'medium'::character varying, 'large'::character varying, 'enterprise'::character varying])::text[]))),
    CONSTRAINT customers_priority_check CHECK (((priority)::text = ANY ((ARRAY['high'::character varying, 'medium'::character varying, 'low'::character varying])::text[]))),
    CONSTRAINT customers_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'potential'::character varying, 'suspended'::character varying])::text[])))
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
-- Name: documents; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.documents (
    id integer NOT NULL,
    project_id integer,
    title character varying(255) NOT NULL,
    content text DEFAULT ''::text,
    created_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.documents OWNER TO "user";

--
-- Name: TABLE documents; Type: COMMENT; Schema: public; Owner: user
--

COMMENT ON TABLE public.documents IS '项目文档表 - 存储项目相关的文档信息';


--
-- Name: COLUMN documents.id; Type: COMMENT; Schema: public; Owner: user
--

COMMENT ON COLUMN public.documents.id IS '文档唯一标识';


--
-- Name: COLUMN documents.project_id; Type: COMMENT; Schema: public; Owner: user
--

COMMENT ON COLUMN public.documents.project_id IS '所属项目ID';


--
-- Name: COLUMN documents.title; Type: COMMENT; Schema: public; Owner: user
--

COMMENT ON COLUMN public.documents.title IS '文档标题';


--
-- Name: COLUMN documents.content; Type: COMMENT; Schema: public; Owner: user
--

COMMENT ON COLUMN public.documents.content IS '文档内容（纯文本）';


--
-- Name: COLUMN documents.created_by; Type: COMMENT; Schema: public; Owner: user
--

COMMENT ON COLUMN public.documents.created_by IS '创建者用户ID';


--
-- Name: COLUMN documents.created_at; Type: COMMENT; Schema: public; Owner: user
--

COMMENT ON COLUMN public.documents.created_at IS '创建时间';


--
-- Name: COLUMN documents.updated_at; Type: COMMENT; Schema: public; Owner: user
--

COMMENT ON COLUMN public.documents.updated_at IS '最后更新时间';


--
-- Name: documents_id_seq; Type: SEQUENCE; Schema: public; Owner: user
--

CREATE SEQUENCE public.documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.documents_id_seq OWNER TO "user";

--
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: user
--

ALTER SEQUENCE public.documents_id_seq OWNED BY public.documents.id;


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
    company_id integer,
    status character varying(20) DEFAULT 'planning'::character varying,
    priority character varying(10) DEFAULT 'medium'::character varying,
    progress integer DEFAULT 0,
    start_date date,
    end_date date,
    budget numeric(15,2),
    CONSTRAINT projects_priority_check CHECK (((priority)::text = ANY ((ARRAY['high'::character varying, 'medium'::character varying, 'low'::character varying])::text[]))),
    CONSTRAINT projects_progress_check CHECK (((progress >= 0) AND (progress <= 100))),
    CONSTRAINT projects_status_check CHECK (((status)::text = ANY ((ARRAY['planning'::character varying, 'active'::character varying, 'on_hold'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
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
    user_type character varying(20) DEFAULT 'system'::character varying,
    company_id integer,
    company_user_id integer,
    is_company_admin boolean DEFAULT false,
    company_permissions jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT users_company_association_check CHECK (((((user_type)::text = 'system'::text) AND (company_id IS NULL)) OR (((user_type)::text = 'company'::text) AND (company_id IS NOT NULL)))),
    CONSTRAINT users_role_type_check CHECK (((((user_type)::text = 'system'::text) AND ((role)::text = ANY ((ARRAY['admin'::character varying, 'project_manager'::character varying, 'developer'::character varying])::text[]))) OR (((user_type)::text = 'company'::text) AND ((role)::text = ANY ((ARRAY['company_admin'::character varying, 'company_user'::character varying])::text[]))))),
    CONSTRAINT users_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'suspended'::character varying])::text[]))),
    CONSTRAINT users_type_check CHECK (((user_type)::text = ANY ((ARRAY['system'::character varying, 'company'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO "user";

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
  WHERE ((t.due_date < CURRENT_DATE) AND ((t.status)::text = ANY ((ARRAY['todo'::character varying, 'in_progress'::character varying])::text[])) AND (t.deleted_at IS NULL))
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
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
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
-- Name: project_task_stats; Type: VIEW; Schema: public; Owner: user
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


ALTER VIEW public.project_task_stats OWNER TO "user";

--
-- Name: project_users; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.project_users (
    id integer NOT NULL,
    project_id integer NOT NULL,
    user_id integer NOT NULL,
    role character varying(20) DEFAULT 'customer'::character varying NOT NULL,
    is_primary boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT project_users_role_check CHECK (((role)::text = ANY ((ARRAY['manager'::character varying, 'developer'::character varying, 'designer'::character varying, 'consultant'::character varying, 'customer'::character varying])::text[])))
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
    CONSTRAINT chk_audit_action CHECK (((action)::text = ANY ((ARRAY['CREATE'::character varying, 'UPDATE'::character varying, 'DELETE'::character varying, 'RESTORE'::character varying, 'LOGIN'::character varying, 'LOGOUT'::character varying])::text[]))),
    CONSTRAINT chk_audit_entity_type CHECK (((entity_type)::text = ANY ((ARRAY['project'::character varying, 'task'::character varying, 'user'::character varying, 'system'::character varying])::text[])))
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
    CONSTRAINT task_updates_update_type_check CHECK (((update_type)::text = ANY ((ARRAY['status'::character varying, 'progress'::character varying, 'notes'::character varying, 'parent'::character varying])::text[])))
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
    CONSTRAINT timeline_events_event_type_check CHECK (((event_type)::text = ANY ((ARRAY['created'::character varying, 'updated'::character varying, 'completed'::character varying, 'deleted'::character varying, 'restored'::character varying])::text[])))
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
-- Name: user_stats_enhanced; Type: VIEW; Schema: public; Owner: user
--

CREATE VIEW public.user_stats_enhanced AS
 SELECT count(*) AS total_users,
    count(*) FILTER (WHERE ((user_type)::text = 'system'::text)) AS system_users,
    count(*) FILTER (WHERE ((user_type)::text = 'company'::text)) AS company_users,
    count(*) FILTER (WHERE ((status)::text = 'active'::text)) AS active_users,
    count(*) FILTER (WHERE ((status)::text = 'inactive'::text)) AS inactive_users,
    count(*) FILTER (WHERE ((status)::text = 'suspended'::text)) AS suspended_users,
    count(*) FILTER (WHERE (((user_type)::text = 'system'::text) AND ((role)::text = 'admin'::text))) AS admin_count,
    count(*) FILTER (WHERE (((user_type)::text = 'system'::text) AND ((role)::text = 'project_manager'::text))) AS project_manager_count,
    count(*) FILTER (WHERE (((user_type)::text = 'system'::text) AND ((role)::text = 'developer'::text))) AS developer_count,
    count(*) FILTER (WHERE (((user_type)::text = 'company'::text) AND ((role)::text = 'company_admin'::text))) AS company_admin_count,
    count(*) FILTER (WHERE (((user_type)::text = 'company'::text) AND ((role)::text = 'company_user'::text))) AS company_user_count,
    count(*) FILTER (WHERE (created_at >= (now() - '30 days'::interval))) AS recent_registrations,
    count(DISTINCT company_id) FILTER (WHERE ((user_type)::text = 'company'::text)) AS companies_with_users
   FROM public.users;


ALTER VIEW public.user_stats_enhanced OWNER TO "user";

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
-- Name: users_backup_008; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.users_backup_008 (
    id integer,
    username character varying(50),
    password_hash character varying(255),
    role character varying(20),
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email character varying(255),
    status character varying(20),
    profile jsonb,
    last_login_at timestamp with time zone
);


ALTER TABLE public.users_backup_008 OWNER TO "user";

--
-- Name: users_backup_009; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.users_backup_009 (
    id integer,
    username character varying(50),
    password_hash character varying(255),
    role character varying(20),
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email character varying(255),
    status character varying(20),
    profile jsonb,
    last_login_at timestamp with time zone,
    user_type character varying(20),
    company_id integer,
    company_user_id integer,
    is_company_admin boolean,
    company_permissions jsonb
);


ALTER TABLE public.users_backup_009 OWNER TO "user";

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
-- Name: audit_configs id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.audit_configs ALTER COLUMN id SET DEFAULT nextval('public.audit_configs_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: company_roles id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.company_roles ALTER COLUMN id SET DEFAULT nextval('public.company_roles_id_seq'::regclass);


--
-- Name: company_user_permission_templates id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.company_user_permission_templates ALTER COLUMN id SET DEFAULT nextval('public.company_user_permission_templates_id_seq'::regclass);


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
-- Name: documents id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.documents ALTER COLUMN id SET DEFAULT nextval('public.documents_id_seq'::regclass);


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
-- Name: users id; Type: DEFAULT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


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
-- Data for Name: company_user_permission_templates; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.company_user_permission_templates (id, role_code, role_name, role_description, permissions, is_active, created_at, updated_at) FROM stdin;
2	company_admin	企业管理员	企业内部管理员，管理企业用户和项目	{"task": {"edit": true, "view": true, "assign": true, "create": true, "delete": true}, "company": {"edit": true, "view": true}, "finance": {"view": true}, "project": {"edit": true, "view": true, "create": true, "delete": false}, "reports": {"view": true}, "company_users": {"edit": true, "view": true, "create": true, "delete": false}}	t	2025-07-22 13:59:40.707862	2025-07-22 13:59:40.707862
3	company_user	企业普通用户	企业内部用户，查看分配的任务和项目	{"task": {"edit": true, "view": true, "assign": false, "create": false, "delete": false}, "company": {"edit": false, "view": true}, "finance": {"view": false}, "project": {"edit": false, "view": true, "create": false, "delete": false}, "reports": {"view": false}}	t	2025-07-22 13:59:40.707862	2025-07-22 13:59:40.707862
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
5	2	钱七	产品经理	产品部	qianqi@tencent.com	0755-86013002	13800002002	\N	technical_contact	f	t	4	active	\N	2025-07-21 12:52:43.268123	2025-07-21 12:52:43.268123	\N	{}	\N	f
6	3	孙八	技术总监	AI实验室	sunba@baidu.com	010-59928001	13800003001	\N	primary_contact	t	t	5	active	\N	2025-07-21 12:52:43.268123	2025-07-21 12:52:43.268123	\N	{}	\N	f
8	4	吴十	解决方案总监	企业BG	wushi@huawei.com	0755-28780001	13800004001	\N	primary_contact	t	t	5	active	\N	2025-07-21 12:52:43.268123	2025-07-21 12:52:43.268123	\N	{}	\N	f
9	4	郑一	技术专家	研发部	zhengyi@huawei.com	0755-28780002	13800004002	\N	technical_contact	f	t	4	active	\N	2025-07-21 12:52:43.268123	2025-07-21 12:52:43.268123	\N	{}	\N	f
10	5	测试用户_1753169472441	产品经理	产品部	test_1753169472441@example.com	138-0000-0000	138-0000-0000	\N	normal	f	f	2	active	测试用户账号	2025-07-22 07:31:12.44102	2025-07-22 07:31:12.44102	\N	{}	\N	f
11	7	张经理	产品经理	产品部	zhang.manager@example.com	138-0000-0001	138-0000-0001	\N	primary_contact	t	t	4	active	主要联系人，负责产品决策	2025-07-22 07:39:26.594616	2025-07-22 07:39:26.594616	\N	{}	\N	f
13	1	测试用户	技术经理	技术部	test@company.com	13800138000	\N	\N	technical_contact	f	f	2	active	\N	2025-07-22 12:07:02.491135	2025-07-22 12:07:02.491135	\N	{}	\N	f
14	8	迟勇	\N	\N	\N	\N	\N	\N	normal	f	f	1	active	\N	2025-07-22 13:41:21.697412	2025-07-22 13:41:21.697412	\N	{}	\N	f
12	9	魏小健	总经理	总经办	\N	\N	\N	\N	primary_contact	t	f	1	active	\N	2025-07-22 11:47:45.026236	2025-07-22 13:58:11.5882	\N	{}	\N	f
7	3	顾鹏	商务经理	商务部	zhoujiu@baidu.com	010-59928002	13800003002	\N	normal	f	f	3	active	\N	2025-07-21 12:52:43.268123	2025-07-22 14:03:07.581025	\N	{}	\N	f
4	2	宋佳香		技术部	zhaoliu@tencent.com	0755-86013001	13800002001	\N	primary_contact	t	t	5	active	\N	2025-07-21 12:52:43.268123	2025-07-22 14:04:34.221341	\N	{}	\N	f
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
8	李宁（中国）体育用品有限公司	\N	鞋服	limited_company	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	active	high	\N	0.00	\N	\N	\N	1	1	2025-07-22 09:06:34.496343	2025-07-23 02:49:39.366956	\N
11	河南携成食品有限公司	\N	食品快消	limited_company	\N	\N	吕凯	\N	\N	\N	\N	\N	\N	\N	inactive	low	0.00	0.00	\N	\N	\N	1	1	2025-07-22 13:59:40.707862	2025-07-23 02:49:57.630681	\N
6	新测试企业2025	NTC2025	软件开发	limited_company	\N	\N	\N	北京市海淀区中关村软件园	北京	北京	\N	\N	010-88888888	contact@newtest2025.com	potential	high	\N	0.00	\N	\N	\N	1	\N	2025-07-22 07:32:44.640965	2025-07-22 07:32:44.640965	2025-07-22 13:28:56.944349
2	北京欢乐宿供应链科技有限公司	TCT001	互联网科技	limited_company	91440300708461136T	\N	吴薇儿	北京市朝阳区	朝阳区	北京	\N	https://www.tencent.com	0755-86013388	contact@tencent.com	active	high	0.00	0.00	\N	3	startup	1	1	2025-07-21 12:52:05.776093	2025-07-22 14:04:18.577672	\N
5	测试企业_1753169472416_更新	TEST1753169472416	软件开发	limited_company	91000000000000000X	\N	张三	北京市朝阳区测试街道123号	北京	北京	100000	https://test.example.com	010-12345678	test@example.com	active	high	100000.00	0.00	\N	50	small	1	1	2025-07-22 07:31:12.422247	2025-07-22 07:31:12.433867	2025-07-22 15:14:57.470613
4	华为技术有限公司	HW001	通信设备	limited_company	91440300279439003E	\N	任正非	深圳市龙岗区坂田华为总部办公楼	深圳	广东	\N	https://www.huawei.com	0755-28780808	contact@huawei.com	active	high	1500000.00	0.00	\N	8000	enterprise	1	\N	2025-07-21 12:52:05.776093	2025-07-21 12:52:05.776093	2025-07-23 02:46:57.551224
1	北京宏昆控股有限公司	\N	品牌鞋服	limited_company	\N	\N	\N	北京北神树	北京	北京	\N		\N	\N	active	high	\N	0.00	\N	\N	\N	1	1	2025-07-21 12:52:05.776093	2025-07-23 02:47:36.211973	\N
3	深圳酷采信息技术有限公司	BDU001	软件开发	limited_company	91110000802100433B	\N	迟勇	北京市海淀区上地十街10号百度大厦	北京	北京	\N	https://www.baidu.com	010-59928888	contact@baidu.com	active	high	0.00	0.00	\N	30	small	1	1	2025-07-21 12:52:05.776093	2025-07-23 02:50:12.835021	\N
9	北京通运物流有限公司	111	物流	limited_company	111	111	魏小健	3322	北京	北京	\N	\N	010-99922332	xiaojian@tongyun.com	active	high	\N	0.00	\N	20	small	1	1	2025-07-22 09:26:50.849844	2025-07-23 02:50:24.870972	\N
7	北京智慧云彩电子商务科技有限公司	010101	软件开发	limited_company	\N	\N	邱栋梁	JavaScript测试地址	北京	北京	\N	www.zhiyuncai.com	15901490365	qiudl@zhiyuncai.com	active	high	0.00	0.00	\N	\N	\N	1	1	2025-07-22 07:39:26.507378	2025-07-23 02:51:22.229689	\N
12	北京对丝信息技术有限公司	\N	软件开发	limited_company	\N	\N	郭彦梅	\N	\N	\N	\N	\N	\N	\N	active	high	\N	0.00	\N	\N	\N	1	1	2025-07-23 03:15:59.813764	2025-07-23 03:16:09.117989	\N
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
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.documents (id, project_id, title, content, created_by, created_at, updated_at) FROM stdin;
1	1	测试文档	这是一个测试文档的内容	1	2025-07-22 23:05:06.125847	2025-07-22 23:05:06.125847
2	1	项目需求文档	这是项目的详细需求说明文档，包含所有功能要求和技术规范。	1	2025-07-22 23:51:11.632728	2025-07-22 23:51:11.632728
3	1	技术架构设计	本文档描述了项目的整体技术架构，包括前端、后端和数据库设计。	1	2025-07-22 23:51:11.632728	2025-07-22 23:51:11.632728
4	2	用户手册	用户操作指南和常见问题解答。	2	2025-07-22 23:51:11.632728	2025-07-22 23:51:11.632728
5	1	API测试文档	这是通过API创建的测试文档，用于验证文档管理功能是否正常工作。	34	2025-07-23 00:00:22.425063	2025-07-23 00:00:22.425063
6	1	项目启动计划	# 项目启动计划\n\n## 1. 项目背景\n本项目旨在开发一个AI驱动的项目管理平台，帮助团队更高效地管理项目和任务。\n\n## 2. 项目目标\n- 提供直观的项目管理界面\n- 集成AI助手功能\n- 支持团队协作\n- 实现任务自动化\n\n## 3. 项目里程碑\n- Phase 1: MVP开发 (4周)\n- Phase 2: 功能完善 (6周)\n- Phase 3: 上线部署 (2周)	34	2025-07-23 00:02:10.860309	2025-07-23 00:02:10.860309
7	1	开发规范文档(已更新)	# 代码开发规范\n\n## 前端开发规范\n- 使用TypeScript\n- 遵循ESLint规则\n- 组件命名使用PascalCase\n- 文件命名使用camelCase\n\n## 后端开发规范\n- 使用Go语言\n- 遵循gofmt格式化\n- API设计遵循RESTful原则\n- 错误处理要完整\n\n## Git提交规范\n- feat: 新功能\n- fix: 修复bug\n- docs: 文档更新\n- style: 代码格式调整\n\n## 更新内容\n- 添加了代码审查流程\n- 完善了测试要求	34	2025-07-23 00:02:39.197588	2025-07-23 00:25:08.786537
8	39	FlexibleDataTable设计方案.md	项目概述\n根据用户需求，我设计并实现了一个企业级的可复用列表组件 FlexibleDataTable，该组件参考现有的企业客户管理列表模式，提供了固定左侧核心字段、固定右侧操作区、可移动中间字段等功能，支持表头排序和字段显示控制。\n🎯 核心特性\n1. 三段式布局设计\n左侧固定区域：显示核心识别字段（如ID、名称等）\n中间可变区域：支持拖拽排序的动态字段\n右侧固定区域：操作按钮区域\n2. 列管理功能\n✅ 列显示/隐藏控制\n✅ 拖拽调整列顺序（中间列）\n✅ 动态调整列宽\n✅ 列配置本地存储\n3. 表格增强功能\n✅ 集成搜索和筛选\n✅ 表头排序支持\n✅ 批量操作功能\n✅ 数据导出功能\n✅ 分页和状态管理\n4. 个性化配置\n✅ 用户配置持久化存储\n✅ 可配置的工具栏\n✅ 响应式设计\n🏗️ 架构设计\n目录结构\nfrontend/src/components/FlexibleDataTable/\n├── FlexibleDataTable.tsx          # 主组件\n├── types.ts                       # 类型定义\n├── index.ts                       # 统一导出\n├── README.md                      # 使用文档\n├── FlexibleDataTable.css          # 样式文件\n├── hooks/\n│   ├── useColumnConfig.ts         # 列配置管理hook\n│   └── useTableState.ts           # 表格状态管理hook\n└── components/\n    ├── ColumnSettings.tsx         # 列设置抽屉\n    ├── TableToolbar.tsx           # 工具栏组件\n    ├── ResizableTitle.tsx         # 可调整大小的表头\n    └── ResizableTitle.css         # 调整大小样式\n核心接口设计\n#### FlexibleColumnConfig - 列配置接口\ninterface FlexibleColumnConfig {\n  key: string;                    // 列唯一标识\n  title: string;                  // 列标题\n  dataIndex: string | string[];   // 数据字段路径\n  width?: number;                 // 列宽度\n  fixed?: 'left' | 'right';      // 固定位置\n  visible: boolean;               // 是否可见\n  sortable: boolean;              // 是否可排序\n  resizable: boolean;             // 是否可调整宽度\n  draggable: boolean;             // 是否可拖拽（仅中间列）\n  required?: boolean;             // 是否必须显示（不可隐藏）\n  render?: (value, record, index) => ReactNode;  // 自定义渲染\n  // ... 更多配置选项\n}\n#### FlexibleDataTableProps - 主组件接口\ninterface FlexibleDataTableProps {\n  dataSource: any[];              // 数据源\n  columns: FlexibleColumnConfig[]; // 列配置\n  actions?: ActionButton[];       // 操作按钮\n  batchActions?: BatchAction[];   // 批量操作\n  searchConfig?: SearchConfig;    // 搜索配置\n  paginationConfig?: PaginationConfig; // 分页配置\n  configStorage?: {               // 个性化配置存储\n    key: string;\n    saveColumns?: boolean;\n    savePagination?: boolean;\n  };\n  // ... 更多配置选项\n}\n🛠️ 技术实现\n1. 依赖包安装\nnpm install react-beautiful-dnd react-resizable @types/react-beautiful-dnd @types/react-resizable\n2. 核心功能实现\n#### 固定左右列实现\n使用 Ant Design Table 的 fixed 属性\nCSS 增强实现阴影效果和边框分隔\n固定列背景色区分\n#### 中间列拖拽排序\n集成 react-beautiful-dnd 实现拖拽功能\n列设置抽屉中的可视化拖拽排序\n拖拽状态的视觉反馈\n#### 列宽调整\n集成 react-resizable 实现列宽拖拽调整\n自定义 ResizableTitle 组件\n最小/最大宽度限制\n#### 状态管理\n自定义 hooks 实现状态逻辑分离\nlocalStorage 持久化用户配置\n支持多表格实例的独立配置\n3. 样式系统\n完整的 CSS 样式定义\n响应式设计支持\n主题色彩体系\n打印样式优化\n📖 使用示例\n基础使用\nimport { FlexibleDataTable, FlexibleTableConfig } from './components/FlexibleDataTable';\nconst columns = [\n  FlexibleTableConfig.columnPresets.id(),\n  FlexibleTableConfig.createLeftFixedColumn({\n    key: 'name',\n    title: '名称',\n    dataIndex: 'name',\n    width: 200,\n    required: true,\n  }),\n  FlexibleTableConfig.createColumn({\n    key: 'status',\n    title: '状态',\n    dataIndex: 'status',\n    width: 100,\n    render: (status) => <Tag color={status === 'active' ? 'green' : 'red'}>{status}</Tag>,\n  }),\n];\nconst actions = [\n  FlexibleTableConfig.createActionButton({\n    key: 'edit',\n    title: '编辑',\n    icon: <EditOutlined />,\n    onClick: (record) => { /* 编辑逻辑 */ },\n  }),\n];\n<FlexibleDataTable\n  dataSource={data}\n  columns={columns}\n  actions={actions}\n  configStorage={{ key: 'my_table', saveColumns: true }}\n/>\n文档管理应用示例\n创建了 DocumentListNew.tsx 展示在文档管理模块中的具体应用：\n文档列表展示\n搜索和筛选功能\n批量操作（删除、导出）\n个性化配置存储\n🎨 设计亮点\n1. 配置化驱动\n通过 FlexibleTableConfig 提供便捷的配置生成器\n预设常用列类型（id、name、status、time等）\n简化组件使用复杂度\n2. 渐进式增强\n基于 Ant Design Table 构建，保持兼容性\n可选择性使用高级功能\n平滑的学习曲线\n3. 企业级特性\n完整的 TypeScript 类型支持\n国际化友好设计\n性能优化（虚拟化、懒加载）\n可访问性支持\n4. 用户体验优化\n直观的列设置界面\n拖拽排序的视觉反馈\n响应式布局适配\n操作确认和错误处理\n🔧 配置管理\n列配置分类\n左固定列：核心识别字段，不可拖拽，通常必须显示\n中间列：详细信息字段，支持拖拽排序和显示控制\n右固定列：操作按钮，固定在右侧，不可拖拽\n个性化存储\n使用 localStorage 存储用户配置\n支持多表格实例独立配置\n配置版本兼容性处理\n默认配置\n提供合理的默认值\n支持全局配置覆盖\n环境适应性配置\n📊 性能优化\n1. 渲染优化\n使用 useMemo 缓存列配置计算\n使用 useCallback 缓存事件处理函数\n避免不必要的重渲染\n2. 内存管理\n及时清理事件监听器\n优化大数据集的处理\n合理的状态更新策略\n3. 加载性能\n懒加载非核心功能\n代码分割和按需加载\nCSS 和 JS 优化\n🧪 质量保证\n1. TypeScript 支持\n完整的类型定义\n严格的类型检查\n智能的代码提示\n2. 错误处理\n优雅的错误降级\n用户友好的错误提示\n详细的错误日志\n3. 测试覆盖\n单元测试（待实现）\n集成测试（待实现）\n端到端测试（待实现）\n🚀 扩展性设计\n1. 插件化架构\n支持自定义工具栏按钮\n支持自定义筛选器类型\n支持自定义导出格式\n2. 主题系统\nCSS 变量支持\n多主题切换\n深色模式支持\n3. 国际化\n内置中文文案\n支持多语言扩展\n地区化配置\n📝 命名规范\n组件命名为 FlexibleDataTable，体现了其核心特点：\nFlexible：灵活可配置\nData：数据驱动\nTable：表格展示\n相关文件和接口都采用一致的命名前缀，便于识别和维护。\n🔄 后续计划\n短期计划\n完善单元测试\n添加更多预设列类型\n优化移动端体验\n增加更多导出格式\n长期计划\n虚拟滚动支持\n树形表格支持  \n图表集成功能\n拖拽调整行顺序\n📋 总结\nFlexibleDataTable 成功实现了用户需求的企业级列表组件，具备以下优势：\n架构清晰：分层设计，职责明确\n功能完整：覆盖企业应用的核心需求\n易于使用：提供便捷的配置工具和文档\n扩展性强：支持自定义和插件化扩展\n性能优秀：优化的渲染和状态管理\n类型安全：完整的 TypeScript 支持\n该组件可以在项目的各个模块中复用，如用户管理、项目管理、任务列表等，显著提升开发效率和用户体验的一致性。\n***开发时间：约 4 小时  \n代码行数：约 1500+ 行  \n文件数量：12 个  \n测试状态：TypeScript 类型检查通过  \n文档状态：完整的使用文档和示例	34	2025-07-23 03:44:16.797649	2025-07-23 03:47:40.43607
11	\N	111	# 新建文档\n\n开始编写您的Markdown文档...1111	34	2025-07-23 09:03:49.189343	2025-07-23 09:04:03.592346
12	\N	222	2222323	34	2025-07-23 09:12:59.960234	2025-07-23 09:13:41.334795
13	40	新建Markdown文档	# 新建文档333\n3333	34	2025-07-23 09:20:13.18293	2025-07-23 09:20:13.18293
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
5	37	8	主客户	t	2025-07-23 00:11:15.024455+00	2025-07-23 00:11:15.024455+00
7	35	9	主客户	t	2025-07-23 02:57:57.85916+00	2025-07-23 02:57:57.85916+00
8	35	2	客户	f	2025-07-23 02:57:57.85975+00	2025-07-23 02:57:57.85975+00
9	39	2	主客户	t	2025-07-23 03:12:54.216618+00	2025-07-23 03:12:54.216618+00
11	38	2	主客户	t	2025-07-23 03:13:42.751088+00	2025-07-23 03:13:42.751088+00
12	34	8	主客户	t	2025-07-23 03:14:28.600817+00	2025-07-23 03:14:28.600817+00
13	34	3	客户	f	2025-07-23 03:14:28.601575+00	2025-07-23 03:14:28.601575+00
14	1	7	主客户	t	2025-07-23 03:15:13.079848+00	2025-07-23 03:15:13.079848+00
15	40	12	主客户	t	2025-07-23 03:17:21.545346+00	2025-07-23 03:17:21.545346+00
\.


--
-- Data for Name: project_users; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.project_users (id, project_id, user_id, role, is_primary, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.projects (id, name, description, owner_id, created_at, deleted_at, updated_at, company_id, status, priority, progress, start_date, end_date, budget) FROM stdin;
2	机器学习模型训练	深度学习模型训练和部署项目	1	2025-07-20 04:02:26.599473+00	2025-07-20 13:41:13.084359+00	2025-07-20 04:10:54.556316+00	\N	planning	medium	0	\N	\N	\N
3	前端界面优化	React前端界面设计和用户体验优化	2	2025-07-20 04:02:26.599473+00	2025-07-20 13:41:16.002279+00	2025-07-20 04:10:54.556316+00	\N	planning	medium	0	\N	\N	\N
37	酷采3.0	重构	1	2025-07-22 13:41:28.353679+00	\N	2025-07-23 00:11:15.020777+00	8	planning	medium	2	2025-07-23	2025-08-31	\N
36	测试项目关联功能	测试项目创建和用户关联功能	1	2025-07-22 12:06:36.591547+00	2025-07-23 00:12:55.076827+00	2025-07-22 12:06:36.591547+00	\N	planning	medium	0	\N	\N	\N
35	通运物流系统	物流运输企业管理系统	1	2025-07-22 09:43:56.660978+00	\N	2025-07-23 02:57:57.856913+00	9	planning	medium	1	2025-07-23	2025-10-31	\N
39	AI项目管理平台	服务于各个软件客户	1	2025-07-23 03:12:54.208763+00	\N	2025-07-23 03:12:54.208763+00	2	active	medium	50	2025-05-01	2025-12-31	\N
38	供应链出海平台	多语言平台	1	2025-07-22 14:05:13.165276+00	\N	2025-07-23 03:13:42.749191+00	2	active	high	1	2025-01-15	2025-12-20	1000000.00
34	李宁团购管理平台	111	1	2025-07-20 05:45:14.616094+00	\N	2025-07-23 03:14:28.599103+00	8	active	medium	30	2025-05-01	2025-12-31	\N
1	新智云采购平台	微服务k8s	1	2025-07-20 04:02:26.599473+00	\N	2025-07-23 03:15:13.075907+00	7	planning	medium	0	2025-07-23	2026-08-31	\N
40	对丝ERP	服务鞋服经销商ERP	1	2025-07-23 03:17:21.543787+00	\N	2025-07-23 03:17:21.543787+00	12	active	high	80	2024-08-01	2026-09-30	\N
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
\.


--
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: user
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
43	39	用claude批量导入任务		todo	\N	2025-07-23	{"tags": [], "priority": "medium"}	2025-07-23 04:02:56.161452+00	\N	0	0	\N	2025-07-23 04:02:56.161452+00
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
45	43	created	0001-01-01 00:00:00+00	Task '用claude批量导入任务' was created	\N	{"initial_status": "todo"}
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.users (id, username, password_hash, role, created_at, updated_at, email, status, profile, last_login_at, user_type, company_id, company_user_id, is_company_admin, company_permissions) FROM stdin;
2	dev_user_1	$2a$10$rOhwZ8sZFCjltzNdQqSLg.6qF2vKKcnwz0JN5jzMQjBpYOJQcn7BS	developer	2025-07-20 04:02:26.599031+00	2025-07-22 04:28:54.796722+00	dev_user_1@example.com	active	{}	\N	system	\N	\N	f	{}
3	dev_user_2	$2a$10$rOhwZ8sZFCjltzNdQqSLg.6qF2vKKcnwz0JN5jzMQjBpYOJQcn7BS	developer	2025-07-20 04:02:26.599031+00	2025-07-22 04:28:54.796722+00	dev_user_2@example.com	active	{}	\N	system	\N	\N	f	{}
34	qiudl	$2a$10$vU9/Zr.nwK9ILoDhTgwD9uxURMbvdgDeCTLNPdbuwvez6XlU2yl02	admin	2025-07-20 04:26:16.82371+00	2025-07-22 04:28:54.796722+00	qiudl@example.com	active	{}	\N	system	\N	\N	f	{}
1	admin	$2a$10$rOhwZ8sZFCjltzNdQqSLg.6qF2vKKcnwz0JN5jzMQjBpYOJQcn7BS	admin	2025-07-20 04:02:26.599031+00	2025-07-22 04:28:54.796722+00	admin@joylodging.com	active	{}	\N	system	\N	\N	f	{}
35	project_manager_1	$2a$10$rOhwZ8sZFCjltzNdQqSLg.6qF2vKKcnwz0JN5jzMQjBpYOJQcn7BS	project_manager	2025-07-22 04:28:05.428915+00	2025-07-22 04:28:54.796722+00	pm1@example.com	active	{"name": "项目经理1", "phone": "13800138001", "department": "技术部"}	\N	system	\N	\N	f	{}
36	developer_1	$2a$10$rOhwZ8sZFCjltzNdQqSLg.6qF2vKKcnwz0JN5jzMQjBpYOJQcn7BS	developer	2025-07-22 04:28:05.428915+00	2025-07-22 04:28:54.796722+00	dev1@example.com	active	{"name": "开发工程师1", "phone": "13800138002", "department": "研发部"}	\N	system	\N	\N	f	{}
37	client_1	$2a$10$rOhwZ8sZFCjltzNdQqSLg.6qF2vKKcnwz0JN5jzMQjBpYOJQcn7BS	company_user	2025-07-22 04:28:05.428915+00	2025-07-22 15:38:08.075278+00	client1@example.com	active	{"name": "客户1", "phone": "13800138003", "department": "甲方公司"}	\N	company	11	\N	f	{}
41	test_user	$2a$10$2o9oi0595Hao7ZwAiF.bpObJCQkcQ1kDMhTMk.vb.UsJbd728o56S	developer	2025-07-22 04:33:28.993199+00	2025-07-22 04:33:28.993199+00	test@example.com	active	{"name": "测试用户", "phone": "13800000000", "department": "测试部门"}	\N	system	\N	\N	f	{}
43	weier	$2a$10$PGTGjpmlcaP6dlp1SglAHudxJbEjus8jAKa2zr9AYY.zLUKtfVQoy	admin	2025-07-22 07:28:36.641277+00	2025-07-22 07:28:36.641277+00	weier@joylodging.com	active	{"name": "吴薇儿", "department": "实施部"}	\N	system	\N	\N	f	{}
46	testadmin	a.6qF2vKKcnwz0JN5jzMQjBpYOJQcn7BS	admin	2025-07-22 23:05:42.869804+00	2025-07-22 23:05:42.869804+00	testadmin@example.com	active	{}	\N	system	\N	\N	f	{}
47	testuser_1753229783722	$2a$10$J6LYygKH9WMfGFjWHWNj5uXNTyLbwbpvy9GZlfATZmgBSvC2MGZBO	developer	2025-07-23 00:16:23.789353+00	2025-07-23 00:16:23.789353+00	test_1753229783722@example.com	active	{"name": "测试用户", "phone": "13800000000", "department": "技术部"}	\N	system	\N	\N	f	{}
44	test_company_user_1753197318481	$2a$10$l9Rfd1FTBDXeLOyqrW8T8e..cL5RHiplFKBqZgiLIzUaIU9jGkQXS	company_user	2025-07-22 15:15:18.611131+00	2025-07-22 15:15:18.611131+00	test1753197318481@company.com	active	{"name": "测试企业用户", "phone": "13800138000", "department": "测试部门"}	\N	company	1	\N	f	{}
49	jiaxiang	$2a$10$XYX28nK.plNeCFjZGg7J7e6DUMhgaN2LJ0bUwxd4aTeAhjFUMheti	project_manager	2025-07-23 03:40:10.627574+00	2025-07-23 03:40:10.627574+00	jiaxiang@joylodging.com	active	{"name": "宋佳香"}	\N	system	\N	\N	f	{}
50	guoym	$2a$10$3R64nuTIGXHR/kuTU8e/gemb1afWnW3lqqBGnm0urf/S0WB3q.E/S	developer	2025-07-23 03:40:51.804914+00	2025-07-23 03:40:51.804914+00	guoym@joylodging.com	active	{"name": "郭彦梅"}	\N	system	\N	\N	f	{}
\.


--
-- Data for Name: users_backup_008; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.users_backup_008 (id, username, password_hash, role, created_at, updated_at, email, status, profile, last_login_at) FROM stdin;
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
-- Data for Name: users_backup_009; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.users_backup_009 (id, username, password_hash, role, created_at, updated_at, email, status, profile, last_login_at, user_type, company_id, company_user_id, is_company_admin, company_permissions) FROM stdin;
37	client_1	$2a$10$rOhwZ8sZFCjltzNdQqSLg.6qF2vKKcnwz0JN5jzMQjBpYOJQcn7BS	client	2025-07-22 04:28:05.428915+00	2025-07-22 13:59:40.707862+00	client1@example.com	active	{"name": "客户1", "phone": "13800138003", "department": "甲方公司"}	\N	company	11	\N	f	{}
\.


--
-- Name: audit_configs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: user
--

SELECT pg_catalog.setval('public.audit_configs_id_seq', 29, true);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: user
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 3, true);


--
-- Name: company_roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: user
--

SELECT pg_catalog.setval('public.company_roles_id_seq', 6, true);


--
-- Name: company_user_permission_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: user
--

SELECT pg_catalog.setval('public.company_user_permission_templates_id_seq', 3, true);


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

SELECT pg_catalog.setval('public.customers_id_seq', 12, true);


--
-- Name: documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: user
--

SELECT pg_catalog.setval('public.documents_id_seq', 13, true);


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

SELECT pg_catalog.setval('public.project_companies_id_seq', 15, true);


--
-- Name: project_users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: user
--

SELECT pg_catalog.setval('public.project_users_id_seq', 7, true);


--
-- Name: projects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: user
--

SELECT pg_catalog.setval('public.projects_id_seq', 40, true);


--
-- Name: role_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: user
--

SELECT pg_catalog.setval('public.role_permissions_id_seq', 70, true);


--
-- Name: system_audit_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: user
--

SELECT pg_catalog.setval('public.system_audit_log_id_seq', 1, false);


--
-- Name: task_updates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: user
--

SELECT pg_catalog.setval('public.task_updates_id_seq', 12, true);


--
-- Name: tasks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: user
--

SELECT pg_catalog.setval('public.tasks_id_seq', 43, true);


--
-- Name: timeline_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: user
--

SELECT pg_catalog.setval('public.timeline_events_id_seq', 45, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: user
--

SELECT pg_catalog.setval('public.users_id_seq', 50, true);


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
-- Name: company_user_permission_templates company_user_permission_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.company_user_permission_templates
    ADD CONSTRAINT company_user_permission_templates_pkey PRIMARY KEY (id);


--
-- Name: company_user_permission_templates company_user_permission_templates_role_code_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.company_user_permission_templates
    ADD CONSTRAINT company_user_permission_templates_role_code_key UNIQUE (role_code);


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
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


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
-- Name: idx_documents_created_by; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_documents_created_by ON public.documents USING btree (created_by);


--
-- Name: idx_documents_project_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_documents_project_id ON public.documents USING btree (project_id);


--
-- Name: idx_documents_title; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_documents_title ON public.documents USING btree (title);


--
-- Name: idx_documents_updated_at; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_documents_updated_at ON public.documents USING btree (updated_at DESC);


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
-- Name: idx_projects_company_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_projects_company_id ON public.projects USING btree (company_id);


--
-- Name: idx_projects_dates; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_projects_dates ON public.projects USING btree (start_date, end_date);


--
-- Name: idx_projects_deleted_at; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_projects_deleted_at ON public.projects USING btree (deleted_at);


--
-- Name: idx_projects_name; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_projects_name ON public.projects USING btree (name);


--
-- Name: idx_projects_priority; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_projects_priority ON public.projects USING btree (priority);


--
-- Name: idx_projects_status; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_projects_status ON public.projects USING btree (status);


--
-- Name: idx_role_permissions_permission_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_role_permissions_permission_id ON public.role_permissions USING btree (permission_id);


--
-- Name: idx_role_permissions_role_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_role_permissions_role_id ON public.role_permissions USING btree (role_id);


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
-- Name: idx_users_active_company; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_users_active_company ON public.users USING btree (company_id, status) WHERE (((user_type)::text = 'company'::text) AND ((status)::text = 'active'::text));


--
-- Name: idx_users_company_id; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_users_company_id ON public.users USING btree (company_id) WHERE ((user_type)::text = 'company'::text);


--
-- Name: idx_users_company_role; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_users_company_role ON public.users USING btree (company_id, role) WHERE ((user_type)::text = 'company'::text);


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
-- Name: idx_users_type_role; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_users_type_role ON public.users USING btree (user_type, role);


--
-- Name: idx_users_type_status; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_users_type_status ON public.users USING btree (user_type, status);


--
-- Name: idx_users_user_type; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_users_user_type ON public.users USING btree (user_type);


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_users_username ON public.users USING btree (username);


--
-- Name: tasks trigger_check_task_hierarchy; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER trigger_check_task_hierarchy BEFORE INSERT OR UPDATE OF parent_id ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.check_task_hierarchy();


--
-- Name: documents trigger_documents_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER trigger_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_documents_updated_at();


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
-- Name: project_companies update_project_companies_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER update_project_companies_updated_at BEFORE UPDATE ON public.project_companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: project_users update_project_users_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER update_project_users_updated_at BEFORE UPDATE ON public.project_users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


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
-- Name: documents documents_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: documents documents_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


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
-- Name: users fk_users_company_id; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_users_company_id FOREIGN KEY (company_id) REFERENCES public.customers(id) ON DELETE SET NULL;


--
-- Name: users fk_users_company_user_id; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_users_company_user_id FOREIGN KEY (company_user_id) REFERENCES public.company_users(id) ON DELETE SET NULL;


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
-- Name: projects projects_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.customers(id);


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
-- PostgreSQL database dump complete
--

