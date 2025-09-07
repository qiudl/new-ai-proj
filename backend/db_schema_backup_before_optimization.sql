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
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS '';


--
-- Name: ltree; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS ltree WITH SCHEMA public;


--
-- Name: EXTENSION ltree; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION ltree IS 'data type for hierarchical tree-like structures';


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
-- Name: api_permission_type; Type: TYPE; Schema: public; Owner: dev_user
--

CREATE TYPE public.api_permission_type AS ENUM (
    'api.read',
    'api.write',
    'api.admin',
    'tasks.read',
    'tasks.write',
    'projects.read',
    'projects.write',
    'users.read',
    'users.write',
    'analytics.read',
    'analytics.write',
    'system.monitor'
);


ALTER TYPE public.api_permission_type OWNER TO dev_user;

--
-- Name: rate_limit_type; Type: TYPE; Schema: public; Owner: dev_user
--

CREATE TYPE public.rate_limit_type AS ENUM (
    'per_minute',
    'per_hour',
    'per_day',
    'per_month'
);


ALTER TYPE public.rate_limit_type OWNER TO dev_user;

--
-- Name: timing_status_type; Type: TYPE; Schema: public; Owner: dev_user
--

CREATE TYPE public.timing_status_type AS ENUM (
    'stopped',
    'running',
    'paused'
);


ALTER TYPE public.timing_status_type OWNER TO dev_user;

--
-- Name: calculate_estimation_accuracy(integer, integer); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.calculate_estimation_accuracy(estimated_minutes integer, actual_minutes integer) RETURNS numeric
    LANGUAGE plpgsql
    AS $$
DECLARE
    variance NUMERIC;
    accuracy NUMERIC;
BEGIN
    IF estimated_minutes = 0 OR actual_minutes = 0 THEN
        RETURN 0.0;
    END IF;
    
    variance := ABS(estimated_minutes - actual_minutes)::NUMERIC / estimated_minutes::NUMERIC;
    accuracy := GREATEST(0.0, 1.0 - variance);
    
    RETURN ROUND(accuracy * 100, 2);
END;
$$;


ALTER FUNCTION public.calculate_estimation_accuracy(estimated_minutes integer, actual_minutes integer) OWNER TO dev_user;

--
-- Name: calculate_task_path(integer); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.calculate_task_path(task_id integer) RETURNS public.ltree
    LANGUAGE plpgsql
    AS $$
DECLARE
    task_record RECORD;
    parent_path ltree;
    result_path ltree;
BEGIN
    -- 获取任务信息
    SELECT id, parent_id INTO task_record
    FROM tasks 
    WHERE id = task_id AND deleted_at IS NULL;
    
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    
    -- 如果没有父任务，返回任务ID作为路径
    IF task_record.parent_id IS NULL THEN
        RETURN task_id::text::ltree;
    END IF;
    
    -- 递归获取父任务路径
    SELECT path INTO parent_path
    FROM tasks 
    WHERE id = task_record.parent_id AND deleted_at IS NULL;
    
    -- 如果父任务路径不存在，递归计算
    IF parent_path IS NULL THEN
        parent_path := calculate_task_path(task_record.parent_id);
        -- 更新父任务路径
        UPDATE tasks SET path = parent_path WHERE id = task_record.parent_id;
    END IF;
    
    -- 构建当前任务路径
    result_path := parent_path || task_id::text::ltree;
    
    RETURN result_path;
END;
$$;


ALTER FUNCTION public.calculate_task_path(task_id integer) OWNER TO dev_user;

--
-- Name: check_api_quota(bigint, public.rate_limit_type); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.check_api_quota(p_api_key_id bigint, p_rate_limit_window public.rate_limit_type DEFAULT 'per_hour'::public.rate_limit_type) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    key_record api_keys%ROWTYPE;
    current_usage INTEGER;
    window_start TIMESTAMP WITH TIME ZONE;
BEGIN
    -- 获取API密钥信息
    SELECT * INTO key_record FROM api_keys WHERE id = p_api_key_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- 计算时间窗口起始时间
    CASE p_rate_limit_window
        WHEN 'per_minute' THEN
            window_start := date_trunc('minute', NOW());
        WHEN 'per_hour' THEN
            window_start := date_trunc('hour', NOW());
        WHEN 'per_day' THEN
            window_start := date_trunc('day', NOW());
        WHEN 'per_month' THEN
            window_start := date_trunc('month', NOW());
    END CASE;
    
    -- 计算当前窗口内的使用量
    SELECT COUNT(*) INTO current_usage
    FROM api_usage_logs
    WHERE api_key_id = p_api_key_id
      AND request_timestamp >= window_start;
    
    -- 检查是否超过限制
    RETURN current_usage < key_record.rate_limit_count;
END;
$$;


ALTER FUNCTION public.check_api_quota(p_api_key_id bigint, p_rate_limit_window public.rate_limit_type) OWNER TO dev_user;

--
-- Name: check_legacy_timer_tables(); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.check_legacy_timer_tables() RETURNS TABLE(has_task_time_logs boolean, task_logs_count integer, has_personal_timers boolean, personal_timers_count integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'task_time_logs') as has_task_time_logs,
        COALESCE((SELECT COUNT(*) FROM task_time_logs), 0)::INTEGER as task_logs_count,
        EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'personal_timer_tasks') as has_personal_timers,
        COALESCE((SELECT COUNT(*) FROM personal_timer_tasks), 0)::INTEGER as personal_timers_count;
END;
$$;


ALTER FUNCTION public.check_legacy_timer_tables() OWNER TO dev_user;

--
-- Name: check_task_dependencies(); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.check_task_dependencies() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Prevent self-dependency
    IF NEW.id = ANY(SELECT jsonb_array_elements_text(NEW.dependencies)::int) THEN
        RAISE EXCEPTION 'Task cannot depend on itself';
    END IF;
    
    -- Prevent dependency on non-existent tasks (within same project)
    IF EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(NEW.dependencies) AS dep(task_id)
        WHERE NOT EXISTS (
            SELECT 1 FROM tasks 
            WHERE id = dep.task_id::int 
            AND project_id = NEW.project_id 
            AND deleted_at IS NULL
        )
    ) THEN
        RAISE EXCEPTION 'Cannot depend on non-existent or deleted tasks within the same project';
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.check_task_dependencies() OWNER TO dev_user;

--
-- Name: check_task_hierarchy(); Type: FUNCTION; Schema: public; Owner: dev_user
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
    
    WHILE current_parent_id IS NOT NULL AND depth_count <= 5 LOOP
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

    -- Check depth limit (increased from 3 to 4)
    IF depth_count > 4 THEN
        RAISE EXCEPTION 'Task hierarchy depth cannot exceed 4 levels';
    END IF;

    -- Set the task level
    NEW.task_level := depth_count;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.check_task_hierarchy() OWNER TO dev_user;

--
-- Name: check_user_permission(integer, character varying); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.check_user_permission(user_id_param integer, permission_code_param character varying) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    has_permission BOOLEAN := false;
BEGIN
    -- 检查用户是否有指定权限
    SELECT EXISTS(
        SELECT 1 
        FROM user_effective_permissions uep
        WHERE uep.user_id = user_id_param 
          AND uep.permission_code = permission_code_param
    ) INTO has_permission;
    
    RETURN has_permission;
END;
$$;


ALTER FUNCTION public.check_user_permission(user_id_param integer, permission_code_param character varying) OWNER TO dev_user;

--
-- Name: check_user_permission_fast(integer, character varying); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.check_user_permission_fast(p_user_id integer, p_permission_code character varying) RETURNS TABLE(has_permission boolean, source character varying, reason text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- 首先检查物化视图（最快）
    RETURN QUERY
    SELECT 
        true as has_permission,
        'role'::VARCHAR(20) as source,
        format('Permission granted through role: %s', role_name) as reason
    FROM mv_user_effective_permissions
    WHERE company_user_id = p_user_id 
    AND permission_code = p_permission_code 
    AND is_granted = true
    LIMIT 1;
    
    -- 如果物化视图中没有找到，检查是否用户/权限存在但被拒绝
    IF NOT FOUND THEN
        -- 检查用户是否存在且激活
        IF EXISTS (
            SELECT 1 FROM company_users 
            WHERE id = p_user_id AND status = 'active'
        ) THEN
            -- 检查权限是否存在
            IF EXISTS (
                SELECT 1 FROM permissions 
                WHERE permission_code = p_permission_code AND is_active = true
            ) THEN
                RETURN QUERY SELECT 
                    false as has_permission,
                    'denied'::VARCHAR(20) as source,
                    'Permission not granted to user role'::TEXT as reason;
            ELSE
                RETURN QUERY SELECT 
                    false as has_permission,
                    'invalid'::VARCHAR(20) as source,
                    'Permission code does not exist'::TEXT as reason;
            END IF;
        ELSE
            RETURN QUERY SELECT 
                false as has_permission,
                'invalid'::VARCHAR(20) as source,
                'User does not exist or is inactive'::TEXT as reason;
        END IF;
    END IF;
END;
$$;


ALTER FUNCTION public.check_user_permission_fast(p_user_id integer, p_permission_code character varying) OWNER TO dev_user;

--
-- Name: check_user_permissions_batch(integer, character varying[]); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.check_user_permissions_batch(p_user_id integer, p_permission_codes character varying[]) RETURNS TABLE(permission_code character varying, has_permission boolean, source character varying, reason text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    WITH permission_checks AS (
        SELECT 
            unnest(p_permission_codes) as perm_code
    ),
    user_permissions AS (
        SELECT 
            pc.perm_code,
            COALESCE(mv.is_granted, false) as has_permission,
            CASE 
                WHEN mv.permission_code IS NOT NULL THEN 'role'
                WHEN EXISTS (SELECT 1 FROM permissions p WHERE p.permission_code = pc.perm_code AND p.is_active = true) THEN 'denied'
                ELSE 'invalid'
            END as source,
            CASE 
                WHEN mv.permission_code IS NOT NULL THEN format('Permission granted through role: %s', mv.role_name)
                WHEN EXISTS (SELECT 1 FROM permissions p WHERE p.permission_code = pc.perm_code AND p.is_active = true) THEN 'Permission not granted to user role'
                ELSE 'Permission code does not exist'
            END as reason
        FROM permission_checks pc
        LEFT JOIN mv_user_effective_permissions mv ON pc.perm_code = mv.permission_code AND mv.company_user_id = p_user_id
    )
    SELECT 
        up.perm_code::VARCHAR(100),
        up.has_permission,
        up.source::VARCHAR(20),
        up.reason::TEXT
    FROM user_permissions up;
END;
$$;


ALTER FUNCTION public.check_user_permissions_batch(p_user_id integer, p_permission_codes character varying[]) OWNER TO dev_user;

--
-- Name: cleanup_expired_permission_cache(); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.cleanup_expired_permission_cache() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- 删除过期的权限缓存记录
    DELETE FROM permission_cache 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- 记录清理日志
    INSERT INTO system_audit_log (
        action_type, 
        description, 
        details, 
        performed_at
    ) VALUES (
        'cache_cleanup',
        'Cleaned up expired permission cache entries',
        format('Deleted entries: %s', deleted_count),
        NOW()
    );
    
    RETURN deleted_count;
EXCEPTION
    WHEN OTHERS THEN
        -- 如果权限缓存表不存在，返回0
        RETURN 0;
END;
$$;


ALTER FUNCTION public.cleanup_expired_permission_cache() OWNER TO dev_user;

--
-- Name: cleanup_old_api_logs(integer); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.cleanup_old_api_logs(retention_days integer DEFAULT 90) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- 删除超过保留期的API使用日志
    DELETE FROM api_usage_logs 
    WHERE request_timestamp < NOW() - (retention_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- 记录清理操作到审计日志
    INSERT INTO audit_logs (
        event_id, 
        action, 
        resource_type, 
        description,
        metadata
    ) VALUES (
        gen_random_uuid()::text,
        'cleanup',
        'api_usage_logs',
        format('Cleaned up %s old API usage logs older than %s days', deleted_count, retention_days),
        jsonb_build_object('deleted_count', deleted_count, 'retention_days', retention_days)
    );
    
    RETURN deleted_count;
END;
$$;


ALTER FUNCTION public.cleanup_old_api_logs(retention_days integer) OWNER TO dev_user;

--
-- Name: cleanup_recycled_items(integer); Type: FUNCTION; Schema: public; Owner: dev_user
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


ALTER FUNCTION public.cleanup_recycled_items(older_than_days integer) OWNER TO dev_user;

--
-- Name: convert_time_unit(integer, character varying, numeric); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.convert_time_unit(minutes integer, target_unit character varying DEFAULT 'auto'::character varying, work_hours_per_day numeric DEFAULT 8.0) RETURNS TABLE(value numeric, unit character varying, display_text character varying)
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- 自动选择最佳单位
    IF target_unit = 'auto' THEN
        IF minutes < 60 THEN
            target_unit := 'minute';
        ELSIF minutes < (work_hours_per_day * 60) THEN
            target_unit := 'hour';
        ELSE
            target_unit := 'day';
        END IF;
    END IF;
    
    -- 执行转换
    CASE target_unit
        WHEN 'minute' THEN
            RETURN QUERY SELECT 
                minutes::NUMERIC,
                'minute'::VARCHAR(10),
                CASE 
                    WHEN minutes = 1 THEN '1分钟'
                    ELSE minutes || '分钟'
                END::VARCHAR(50);
                
        WHEN 'hour' THEN
            RETURN QUERY SELECT 
                ROUND((minutes / 60.0)::NUMERIC, 1),
                'hour'::VARCHAR(10),
                ROUND((minutes / 60.0)::NUMERIC, 1) || '小时'::VARCHAR(50);
                
        WHEN 'day' THEN
            RETURN QUERY SELECT 
                ROUND((minutes / (work_hours_per_day * 60))::NUMERIC, 1),
                'day'::VARCHAR(10),
                ROUND((minutes / (work_hours_per_day * 60))::NUMERIC, 1) || '天'::VARCHAR(50);
                
        WHEN 'week' THEN
            RETURN QUERY SELECT 
                ROUND((minutes / (work_hours_per_day * 60 * 5))::NUMERIC, 1),
                'week'::VARCHAR(10),
                ROUND((minutes / (work_hours_per_day * 60 * 5))::NUMERIC, 1) || '周'::VARCHAR(50);
    END CASE;
END;
$$;


ALTER FUNCTION public.convert_time_unit(minutes integer, target_unit character varying, work_hours_per_day numeric) OWNER TO dev_user;

--
-- Name: create_audit_log(integer, character varying, character varying, integer, jsonb, inet, text); Type: FUNCTION; Schema: public; Owner: dev_user
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


ALTER FUNCTION public.create_audit_log(p_user_id integer, p_action character varying, p_entity_type character varying, p_entity_id integer, p_entity_data jsonb, p_ip_address inet, p_user_agent text) OWNER TO dev_user;

--
-- Name: create_document_version(); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.create_document_version() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- 当文档内容发生变化时，自动创建新版本
    IF OLD.content IS DISTINCT FROM NEW.content OR OLD.title IS DISTINCT FROM NEW.title THEN
        INSERT INTO document_versions (
            document_id, 
            version_number, 
            title, 
            content, 
            changes_summary, 
            metadata,
            created_by
        )
        VALUES (
            NEW.id,
            NEW.version,
            NEW.title,
            NEW.content,
            CASE 
                WHEN OLD.title IS DISTINCT FROM NEW.title THEN '标题更新'
                WHEN OLD.content IS DISTINCT FROM NEW.content THEN '内容更新'
                ELSE '文档更新'
            END,
            NEW.metadata,
            NEW.owner_id
        );
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.create_document_version() OWNER TO dev_user;

--
-- Name: generate_api_key_prefix(text); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.generate_api_key_prefix(key_type text DEFAULT 'general'::text) RETURNS text
    LANGUAGE plpgsql
    AS $$
BEGIN
    CASE key_type
        WHEN 'admin' THEN RETURN 'ak_admin_';
        WHEN 'user' THEN RETURN 'ak_user_';
        WHEN 'service' THEN RETURN 'ak_svc_';
        WHEN 'readonly' THEN RETURN 'ak_ro_';
        ELSE RETURN 'ak_';
    END CASE;
END;
$$;


ALTER FUNCTION public.generate_api_key_prefix(key_type text) OWNER TO dev_user;

--
-- Name: get_task_ancestors(integer); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.get_task_ancestors(task_id integer) RETURNS TABLE(id integer, title character varying, level integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    WITH task_path AS (
        SELECT path FROM tasks WHERE tasks.id = task_id AND deleted_at IS NULL
    )
    SELECT t.id, t.title, nlevel(tp.path) - nlevel(t.path) as level
    FROM tasks t, task_path tp
    WHERE t.path @> tp.path
    AND t.deleted_at IS NULL
    ORDER BY nlevel(t.path);
END;
$$;


ALTER FUNCTION public.get_task_ancestors(task_id integer) OWNER TO dev_user;

--
-- Name: get_task_children(integer); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.get_task_children(task_id integer) RETURNS TABLE(id integer, title character varying, sort_order integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, t.title, t.sort_order
    FROM tasks t
    WHERE t.parent_id = task_id
    AND t.deleted_at IS NULL
    ORDER BY t.sort_order, t.id;
END;
$$;


ALTER FUNCTION public.get_task_children(task_id integer) OWNER TO dev_user;

--
-- Name: get_task_descendants(integer); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.get_task_descendants(task_id integer) RETURNS TABLE(id integer, title character varying, level integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    WITH task_path AS (
        SELECT path FROM tasks WHERE tasks.id = task_id AND deleted_at IS NULL
    )
    SELECT t.id, t.title, nlevel(t.path) - nlevel(tp.path) as level
    FROM tasks t, task_path tp
    WHERE tp.path @> t.path
    AND t.path != tp.path  -- 排除自己
    AND t.deleted_at IS NULL
    ORDER BY t.path;
END;
$$;


ALTER FUNCTION public.get_task_descendants(task_id integer) OWNER TO dev_user;

--
-- Name: get_task_query_stats(); Type: FUNCTION; Schema: public; Owner: dev_user
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


ALTER FUNCTION public.get_task_query_stats() OWNER TO dev_user;

--
-- Name: get_task_status_timeline(integer); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.get_task_status_timeline(p_task_id integer) RETURNS TABLE(change_id integer, old_status character varying, new_status character varying, change_reason character varying, change_type character varying, changed_by_username character varying, change_timestamp timestamp without time zone, related_task_count integer, parallel_group_id character varying)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tsh.id as change_id,
        tsh.old_status,
        tsh.new_status,
        tsh.change_reason,
        tsh.change_type,
        u.username as changed_by_username,
        tsh.change_timestamp,
        COALESCE(array_length(tsh.related_task_ids, 1), 0) as related_task_count,
        tsh.parallel_group_id
    FROM task_status_history tsh
    LEFT JOIN users u ON tsh.changed_by = u.id
    WHERE tsh.task_id = p_task_id
    ORDER BY tsh.change_timestamp DESC;
END;
$$;


ALTER FUNCTION public.get_task_status_timeline(p_task_id integer) OWNER TO dev_user;

--
-- Name: get_user_permissions(integer); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.get_user_permissions(user_id_param integer) RETURNS TABLE(permission_code character varying, permission_name character varying, module character varying, resource character varying, action character varying)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        uep.permission_code,
        uep.permission_name,
        uep.module,
        uep.resource,
        uep.action
    FROM user_effective_permissions uep
    WHERE uep.user_id = user_id_param
    ORDER BY uep.module, uep.resource, uep.action;
END;
$$;


ALTER FUNCTION public.get_user_permissions(user_id_param integer) OWNER TO dev_user;

--
-- Name: is_task_ancestor(integer, integer); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.is_task_ancestor(ancestor_id integer, descendant_id integer) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    ancestor_path ltree;
    descendant_path ltree;
BEGIN
    -- 获取祖先任务路径
    SELECT path INTO ancestor_path
    FROM tasks 
    WHERE id = ancestor_id AND deleted_at IS NULL;
    
    -- 获取后代任务路径
    SELECT path INTO descendant_path
    FROM tasks 
    WHERE id = descendant_id AND deleted_at IS NULL;
    
    -- 检查路径关系
    IF ancestor_path IS NULL OR descendant_path IS NULL THEN
        RETURN FALSE;
    END IF;
    
    RETURN ancestor_path @> descendant_path AND ancestor_path != descendant_path;
END;
$$;


ALTER FUNCTION public.is_task_ancestor(ancestor_id integer, descendant_id integer) OWNER TO dev_user;

--
-- Name: log_task_status_change(); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.log_task_status_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    parallel_group VARCHAR(100);
    related_tasks INTEGER[];
BEGIN
    -- Only log if status actually changed (for UPDATE) or this is an INSERT
    IF (TG_OP = 'INSERT') OR (OLD.status IS DISTINCT FROM NEW.status) THEN
        -- Generate parallel group ID if this task has parallel relationships
        SELECT COALESCE(
            'parallel_group_' || MIN(tr.id),
            NULL
        ) INTO parallel_group
        FROM task_relationships tr
        WHERE (tr.source_task_id = NEW.id OR tr.target_task_id = NEW.id)
        AND tr.relationship_type = 'parallel_with'
        AND tr.deleted_at IS NULL;

        -- Get related task IDs
        SELECT ARRAY_AGG(DISTINCT
            CASE
                WHEN tr.source_task_id = NEW.id THEN tr.target_task_id
                ELSE tr.source_task_id
            END
        ) INTO related_tasks
        FROM task_relationships tr
        WHERE (tr.source_task_id = NEW.id OR tr.target_task_id = NEW.id)
        AND tr.deleted_at IS NULL;

        -- Insert status history record
        INSERT INTO task_status_history (
            task_id,
            old_status,
            new_status,
            change_type,
            changed_by,
            related_task_ids,
            parallel_group_id,
            dependency_resolved,
            metadata
        ) VALUES (
            NEW.id,
            CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status END,
            NEW.status,
            'automatic',
            1, -- Default to user 1 since updated_by field doesn't exist
            COALESCE(related_tasks, '{}'),
            parallel_group,
            (NEW.status = 'completed' AND EXISTS(
                SELECT 1 FROM task_relationships tr
                WHERE tr.target_task_id = NEW.id 
                AND tr.relationship_type = 'depends_on'
                AND tr.deleted_at IS NULL
            )),
            jsonb_build_object(
                'auto_logged', true,
                'trigger_source', CASE WHEN TG_OP = 'INSERT' THEN 'task_create' ELSE 'task_update' END
            )
        );
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.log_task_status_change() OWNER TO dev_user;

--
-- Name: log_time_estimation_change(); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.log_time_estimation_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- 当估算时间或实际时间发生变化时，记录历史
    IF (OLD.estimated_minutes IS DISTINCT FROM NEW.estimated_minutes) OR 
       (OLD.actual_minutes IS DISTINCT FROM NEW.actual_minutes) THEN
        
        INSERT INTO time_estimation_history (
            task_id,
            estimated_minutes,
            actual_minutes,
            estimation_method,
            estimation_accuracy,
            variance_percent,
            notes
        ) VALUES (
            NEW.id,
            NEW.estimated_minutes,
            NEW.actual_minutes,
            'manual',
            CASE 
                WHEN NEW.actual_minutes > 0 AND NEW.estimated_minutes > 0 THEN
                    calculate_estimation_accuracy(NEW.estimated_minutes, NEW.actual_minutes)
                ELSE NULL
            END,
            CASE 
                WHEN NEW.actual_minutes > 0 AND NEW.estimated_minutes > 0 THEN
                    ROUND((ABS(NEW.estimated_minutes - NEW.actual_minutes)::NUMERIC / NEW.estimated_minutes::NUMERIC * 100), 2)
                ELSE NULL
            END,
            CASE 
                WHEN OLD.estimated_minutes IS DISTINCT FROM NEW.estimated_minutes THEN '估算时间更新'
                WHEN OLD.actual_minutes IS DISTINCT FROM NEW.actual_minutes THEN '实际时间更新'
                ELSE '时间字段更新'
            END
        );
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.log_time_estimation_change() OWNER TO dev_user;

--
-- Name: move_task_to_parent(integer, integer); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.move_task_to_parent(task_id integer, new_parent_id integer DEFAULT NULL::integer) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    old_path ltree;
    new_path ltree;
    task_record RECORD;
    child_record RECORD;
BEGIN
    -- 获取任务信息
    SELECT path, parent_id INTO task_record FROM tasks WHERE id = task_id AND deleted_at IS NULL;
    
    IF NOT FOUND THEN
        RAISE NOTICE 'Task not found: %', task_id;
        RETURN FALSE;
    END IF;
    
    -- 检查循环引用
    IF new_parent_id IS NOT NULL THEN
        IF is_task_ancestor(task_id, new_parent_id) THEN
            RAISE NOTICE 'Cannot move task to its descendant';
            RETURN FALSE;
        END IF;
    END IF;
    
    -- 更新parent_id（触发器会自动更新路径）
    UPDATE tasks SET parent_id = new_parent_id WHERE id = task_id;
    
    RAISE NOTICE 'Task % moved successfully', task_id;
    RETURN TRUE;
END;
$$;


ALTER FUNCTION public.move_task_to_parent(task_id integer, new_parent_id integer) OWNER TO dev_user;

--
-- Name: permission_system_health_check(); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.permission_system_health_check() RETURNS TABLE(check_name character varying, status character varying, details text, recommendation text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- 检查2: 无权限的角色（修复列歧义）
    RETURN QUERY
    SELECT 
        'roles_without_permissions'::VARCHAR(50),
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'INFO' END::VARCHAR(20),
        format('Found %s roles without any permissions', COUNT(*))::TEXT,
        CASE WHEN COUNT(*) > 0 THEN 'Review role configurations and assign appropriate permissions' ELSE 'All roles have permissions' END::TEXT
    FROM company_roles cr
    LEFT JOIN role_permissions rp ON cr.id = rp.role_id AND rp.is_granted = true
    WHERE cr.is_active = true AND rp.role_id IS NULL;
    
    -- 检查4: 权限分布统计（修复列引用）
    RETURN QUERY
    SELECT 
        'permission_distribution'::VARCHAR(50),
        'INFO'::VARCHAR(20),
        format('Total active permissions: %s, Total active roles: %s, Total active users: %s', 
               perm_count, role_count, user_count)::TEXT,
        'Monitor permission usage and optimize as needed'::TEXT
    FROM (
        SELECT 
            (SELECT COUNT(*) FROM permissions WHERE is_active = true) as perm_count,
            (SELECT COUNT(*) FROM company_roles WHERE is_active = true) as role_count,
            (SELECT COUNT(*) FROM company_users WHERE company_users.status = 'active') as user_count
    ) counts;
END;
$$;


ALTER FUNCTION public.permission_system_health_check() OWNER TO dev_user;

--
-- Name: preview_migration_stats(); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.preview_migration_stats() RETURNS TABLE(table_name text, record_count integer, latest_record timestamp with time zone, migration_ready boolean)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'task_time_logs'::TEXT,
        COALESCE((SELECT COUNT(*) FROM task_time_logs), 0)::INTEGER,
        COALESCE((SELECT MAX(created_at) FROM task_time_logs), NULL),
        EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'task_time_logs')
    UNION ALL
    SELECT 
        'personal_timer_tasks'::TEXT,
        COALESCE((SELECT COUNT(*) FROM personal_timer_tasks), 0)::INTEGER,
        COALESCE((SELECT MAX(created_at) FROM personal_timer_tasks), NULL),
        EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'personal_timer_tasks');
END;
$$;


ALTER FUNCTION public.preview_migration_stats() OWNER TO dev_user;

--
-- Name: refresh_all_task_paths(); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.refresh_all_task_paths() RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    task_record RECORD;
    updated_count integer := 0;
BEGIN
    -- 按层级顺序处理（从根节点开始）
    FOR task_record IN 
        WITH RECURSIVE task_hierarchy AS (
            -- 根节点（没有父任务的任务）
            SELECT id, parent_id, 0 as level
            FROM tasks 
            WHERE parent_id IS NULL AND deleted_at IS NULL
            
            UNION ALL
            
            -- 子节点
            SELECT t.id, t.parent_id, th.level + 1
            FROM tasks t
            JOIN task_hierarchy th ON t.parent_id = th.id
            WHERE t.deleted_at IS NULL
        )
        SELECT id, parent_id, level
        FROM task_hierarchy
        ORDER BY level, id
    LOOP
        UPDATE tasks 
        SET path = calculate_task_path(task_record.id),
            depth = task_record.level
        WHERE id = task_record.id;
        
        updated_count := updated_count + 1;
    END LOOP;
    
    RAISE NOTICE 'Updated paths for % tasks', updated_count;
END;
$$;


ALTER FUNCTION public.refresh_all_task_paths() OWNER TO dev_user;

--
-- Name: refresh_permission_materialized_views(); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.refresh_permission_materialized_views() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    affected_rows INTEGER;
BEGIN
    start_time := NOW();
    
    -- 刷新用户权限物化视图
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_effective_permissions;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    end_time := NOW();
    
    -- 记录刷新日志
    INSERT INTO system_audit_log (
        action_type, 
        description, 
        details, 
        performed_at
    ) VALUES (
        'materialized_view_refresh',
        'Refreshed permission materialized views',
        format('Affected rows: %s, Duration: %s', affected_rows, end_time - start_time),
        NOW()
    );
    
    RETURN format('Materialized view refreshed successfully. Affected rows: %s, Duration: %s', 
                  affected_rows, end_time - start_time);
END;
$$;


ALTER FUNCTION public.refresh_permission_materialized_views() OWNER TO dev_user;

--
-- Name: reset_failed_login_attempts(); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.reset_failed_login_attempts() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- 成功登录时重置失败计数和解锁账户
    IF NEW.last_login_at IS NOT NULL AND 
       (OLD.last_login_at IS NULL OR NEW.last_login_at > OLD.last_login_at) THEN
        NEW.failed_login_attempts = 0;
        NEW.locked_until = NULL;
    END IF;
    
    -- 失败次数达到5次时锁定账户30分钟
    IF NEW.failed_login_attempts >= 5 AND OLD.failed_login_attempts < 5 THEN
        NEW.locked_until = NOW() + INTERVAL '30 minutes';
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.reset_failed_login_attempts() OWNER TO dev_user;

--
-- Name: restore_project(integer, integer); Type: FUNCTION; Schema: public; Owner: dev_user
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


ALTER FUNCTION public.restore_project(p_project_id integer, p_user_id integer) OWNER TO dev_user;

--
-- Name: restore_task(integer, integer); Type: FUNCTION; Schema: public; Owner: dev_user
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


ALTER FUNCTION public.restore_task(p_task_id integer, p_user_id integer) OWNER TO dev_user;

--
-- Name: soft_delete_project(integer, integer); Type: FUNCTION; Schema: public; Owner: dev_user
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


ALTER FUNCTION public.soft_delete_project(p_project_id integer, p_user_id integer) OWNER TO dev_user;

--
-- Name: soft_delete_task(integer, integer); Type: FUNCTION; Schema: public; Owner: dev_user
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


ALTER FUNCTION public.soft_delete_task(p_task_id integer, p_user_id integer) OWNER TO dev_user;

--
-- Name: sync_time_fields(); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.sync_time_fields() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- 同步due_date字段（向后兼容）
    IF NEW.due_datetime IS NOT NULL THEN
        NEW.due_date := NEW.due_datetime::DATE;
    END IF;
    
    -- 同步estimated_hours字段（向后兼容）
    IF NEW.estimated_minutes IS NOT NULL AND NEW.estimated_minutes > 0 THEN
        NEW.estimated_hours := ROUND((NEW.estimated_minutes / 60.0)::NUMERIC, 2);
    END IF;
    
    -- 同步total_time_seconds字段（向后兼容）
    IF NEW.actual_minutes IS NOT NULL AND NEW.actual_minutes > 0 THEN
        NEW.total_time_seconds := NEW.actual_minutes * 60;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.sync_time_fields() OWNER TO dev_user;

--
-- Name: update_ai_config_updated_at(); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.update_ai_config_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_ai_config_updated_at() OWNER TO dev_user;

--
-- Name: update_companies_updated_at(); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.update_companies_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_companies_updated_at() OWNER TO dev_user;

--
-- Name: update_company_departments_updated_at(); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.update_company_departments_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_company_departments_updated_at() OWNER TO dev_user;

--
-- Name: update_department_level_and_path(); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.update_department_level_and_path() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    parent_level INTEGER := 0;
    parent_path TEXT := '';
BEGIN
    -- 如果有父部门，获取父部门的level和path
    IF NEW.parent_id IS NOT NULL THEN
        SELECT level, COALESCE(path, '') 
        INTO parent_level, parent_path
        FROM enterprise_departments 
        WHERE id = NEW.parent_id AND enterprise_id = NEW.enterprise_id;
        
        NEW.level = parent_level + 1;
        NEW.path = CASE 
            WHEN parent_path = '' THEN NEW.parent_id::TEXT
            ELSE parent_path || '/' || NEW.parent_id::TEXT
        END;
    ELSE
        NEW.level = 1;
        NEW.path = '';
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_department_level_and_path() OWNER TO dev_user;

--
-- Name: update_departments_updated_at(); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.update_departments_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_departments_updated_at() OWNER TO dev_user;

--
-- Name: update_documents_updated_at(); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.update_documents_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_documents_updated_at() OWNER TO dev_user;

--
-- Name: update_enterprise_departments_updated_at(); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.update_enterprise_departments_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_enterprise_departments_updated_at() OWNER TO dev_user;

--
-- Name: update_enterprise_users_updated_at(); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.update_enterprise_users_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_enterprise_users_updated_at() OWNER TO dev_user;

--
-- Name: update_enterprises_updated_at(); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.update_enterprises_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_enterprises_updated_at() OWNER TO dev_user;

--
-- Name: update_parent_task_progress(); Type: FUNCTION; Schema: public; Owner: dev_user
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


ALTER FUNCTION public.update_parent_task_progress() OWNER TO dev_user;

--
-- Name: update_system_users_updated_at(); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.update_system_users_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_system_users_updated_at() OWNER TO dev_user;

--
-- Name: update_task_documents_updated_at(); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.update_task_documents_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_task_documents_updated_at() OWNER TO dev_user;

--
-- Name: update_task_path(); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.update_task_path() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    new_path ltree;
    new_depth integer;
BEGIN
    -- 计算新路径
    new_path := calculate_task_path(NEW.id);
    
    -- 计算深度
    IF new_path IS NOT NULL THEN
        new_depth := nlevel(new_path) - 1;
    ELSE
        new_depth := 0;
    END IF;
    
    -- 更新路径和深度
    NEW.path := new_path;
    NEW.depth := new_depth;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_task_path() OWNER TO dev_user;

--
-- Name: update_task_relationships_updated_at(); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.update_task_relationships_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_task_relationships_updated_at() OWNER TO dev_user;

--
-- Name: update_timer_search_vector(); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.update_timer_search_vector() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('simple', COALESCE(NEW.target_title, '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('simple', COALESCE(NEW.category, '')), 'C') ||
        setweight(to_tsvector('simple', array_to_string(NEW.tags, ' ')), 'D');
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_timer_search_vector() OWNER TO dev_user;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO dev_user;

--
-- Name: update_work_note_folders_updated_at(); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.update_work_note_folders_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_work_note_folders_updated_at() OWNER TO dev_user;

--
-- Name: update_work_note_task_relations_updated_at(); Type: FUNCTION; Schema: public; Owner: dev_user
--

CREATE FUNCTION public.update_work_note_task_relations_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_work_note_task_relations_updated_at() OWNER TO dev_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.api_keys (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    key_hash character varying(255) NOT NULL,
    key_prefix character varying(20) NOT NULL,
    secret_hash character varying(255),
    permissions public.api_permission_type[] DEFAULT '{}'::public.api_permission_type[] NOT NULL,
    scope_projects integer[],
    scope_users integer[],
    rate_limit_count integer DEFAULT 1000,
    rate_limit_window public.rate_limit_type DEFAULT 'per_hour'::public.rate_limit_type,
    daily_quota integer,
    monthly_quota integer,
    is_active boolean DEFAULT true NOT NULL,
    expires_at timestamp with time zone,
    last_used_at timestamp with time zone,
    usage_count bigint DEFAULT 0 NOT NULL,
    allowed_ips inet[],
    allowed_domains character varying(255)[],
    user_agent_pattern character varying(500),
    created_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by integer,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    tags character varying(50)[] DEFAULT '{}'::character varying[]
);


ALTER TABLE public.api_keys OWNER TO dev_user;

--
-- Name: TABLE api_keys; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON TABLE public.api_keys IS 'API密钥管理表 - 存储所有API访问密钥的配置和权限信息';


--
-- Name: COLUMN api_keys.key_hash; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.api_keys.key_hash IS '密钥哈希值，使用安全哈希算法存储，不存储明文';


--
-- Name: COLUMN api_keys.permissions; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.api_keys.permissions IS '权限数组，定义此密钥可以访问的API功能';


--
-- Name: COLUMN api_keys.scope_projects; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.api_keys.scope_projects IS '项目范围限制，空数组表示可访问所有项目';


--
-- Name: COLUMN api_keys.rate_limit_count; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.api_keys.rate_limit_count IS '速率限制次数，配合rate_limit_window使用';


--
-- Name: COLUMN api_keys.allowed_ips; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.api_keys.allowed_ips IS 'IP白名单，空数组表示不限制来源IP';


--
-- Name: users; Type: TABLE; Schema: public; Owner: dev_user
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
    current_timer_id integer,
    deleted_at timestamp with time zone,
    CONSTRAINT users_company_association_check CHECK (((((user_type)::text = 'system'::text) AND (company_id IS NULL)) OR (((user_type)::text = 'company'::text) AND (company_id IS NOT NULL) AND ((role)::text = ANY ((ARRAY['company_admin'::character varying, 'company_user'::character varying])::text[]))))),
    CONSTRAINT users_company_required_fields_check CHECK ((((user_type)::text <> 'company'::text) OR ((contact_person_name IS NOT NULL) AND ((contact_person_name)::text <> ''::text) AND (contact_phone IS NOT NULL) AND ((contact_phone)::text <> ''::text) AND (department_title IS NOT NULL) AND ((department_title)::text <> ''::text)))),
    CONSTRAINT users_role_check CHECK (((role)::text = ANY (ARRAY[('admin'::character varying)::text, ('project_manager'::character varying)::text, ('developer'::character varying)::text, ('client'::character varying)::text, ('company_admin'::character varying)::text, ('company_user'::character varying)::text]))),
    CONSTRAINT users_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('inactive'::character varying)::text, ('suspended'::character varying)::text]))),
    CONSTRAINT users_user_type_check CHECK (((user_type)::text = ANY (ARRAY[('system'::character varying)::text, ('company'::character varying)::text])))
);


ALTER TABLE public.users OWNER TO dev_user;

--
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON TABLE public.users IS '用户表 - 支持系统用户和企业用户两种类型';


--
-- Name: COLUMN users.timing_paused_time; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.users.timing_paused_time IS 'Timestamp when the timer was paused (NULL if not paused)';


--
-- Name: COLUMN users.timing_accumulated_seconds; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.users.timing_accumulated_seconds IS 'Accumulated seconds from previous timing sessions before current pause';


--
-- Name: COLUMN users.current_timer_id; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.users.current_timer_id IS '当前活动的计时器ID';


--
-- Name: CONSTRAINT users_company_association_check ON users; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON CONSTRAINT users_company_association_check ON public.users IS '确保企业用户与公司正确关联';


--
-- Name: CONSTRAINT users_company_required_fields_check ON users; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON CONSTRAINT users_company_required_fields_check ON public.users IS '确保企业用户必填字段完整';


--
-- Name: active_api_keys; Type: VIEW; Schema: public; Owner: dev_user
--

CREATE VIEW public.active_api_keys AS
 SELECT ak.id,
    ak.name,
    ak.description,
    ak.key_hash,
    ak.key_prefix,
    ak.secret_hash,
    ak.permissions,
    ak.scope_projects,
    ak.scope_users,
    ak.rate_limit_count,
    ak.rate_limit_window,
    ak.daily_quota,
    ak.monthly_quota,
    ak.is_active,
    ak.expires_at,
    ak.last_used_at,
    ak.usage_count,
    ak.allowed_ips,
    ak.allowed_domains,
    ak.user_agent_pattern,
    ak.created_by,
    ak.created_at,
    ak.updated_by,
    ak.updated_at,
    ak.deleted_at,
    ak.metadata,
    ak.tags,
    u.username AS created_by_username,
    u.email AS created_by_email
   FROM (public.api_keys ak
     JOIN public.users u ON ((ak.created_by = u.id)))
  WHERE ((ak.is_active = true) AND ((ak.expires_at IS NULL) OR (ak.expires_at > now())) AND (ak.deleted_at IS NULL));


ALTER VIEW public.active_api_keys OWNER TO dev_user;

--
-- Name: ai_configs; Type: TABLE; Schema: public; Owner: dev_user
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
    CONSTRAINT ai_configs_provider_check CHECK (((provider)::text = ANY (ARRAY[('openai'::character varying)::text, ('claude'::character varying)::text, ('deepseek'::character varying)::text]))),
    CONSTRAINT ai_configs_temperature_check CHECK (((temperature >= (0)::numeric) AND (temperature <= (2)::numeric)))
);


ALTER TABLE public.ai_configs OWNER TO dev_user;

--
-- Name: TABLE ai_configs; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON TABLE public.ai_configs IS 'AI provider configurations with encrypted API keys';


--
-- Name: COLUMN ai_configs.provider; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.ai_configs.provider IS 'AI provider: openai, claude, or deepseek';


--
-- Name: COLUMN ai_configs.api_key_encrypted; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.ai_configs.api_key_encrypted IS 'Encrypted API key using AES-256-GCM';


--
-- Name: COLUMN ai_configs.api_key_hash; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.ai_configs.api_key_hash IS 'SHA-256 hash of the API key for integrity verification';


--
-- Name: COLUMN ai_configs.metadata; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.ai_configs.metadata IS 'JSON metadata including rate limits, cost tracking, and security settings';


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
-- Name: ai_usage_stats; Type: TABLE; Schema: public; Owner: dev_user
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


ALTER TABLE public.ai_usage_stats OWNER TO dev_user;

--
-- Name: TABLE ai_usage_stats; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON TABLE public.ai_usage_stats IS 'Daily usage statistics for AI configurations';


--
-- Name: ai_usage_stats_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.ai_usage_stats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_usage_stats_id_seq OWNER TO dev_user;

--
-- Name: ai_usage_stats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.ai_usage_stats_id_seq OWNED BY public.ai_usage_stats.id;


--
-- Name: api_keys_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.api_keys_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.api_keys_id_seq OWNER TO dev_user;

--
-- Name: api_keys_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.api_keys_id_seq OWNED BY public.api_keys.id;


--
-- Name: api_quota_stats; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.api_quota_stats (
    id bigint NOT NULL,
    api_key_id bigint NOT NULL,
    stat_date date NOT NULL,
    stat_hour integer,
    request_count integer DEFAULT 0 NOT NULL,
    success_count integer DEFAULT 0 NOT NULL,
    error_count integer DEFAULT 0 NOT NULL,
    rate_limit_count integer DEFAULT 0 NOT NULL,
    total_response_time_ms bigint DEFAULT 0 NOT NULL,
    avg_response_time_ms integer DEFAULT 0 NOT NULL,
    total_request_size bigint DEFAULT 0 NOT NULL,
    total_response_size bigint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.api_quota_stats OWNER TO dev_user;

--
-- Name: TABLE api_quota_stats; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON TABLE public.api_quota_stats IS 'API配额统计表 - 预聚合的配额使用统计，用于快速查询和限制检查';


--
-- Name: api_quota_stats_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.api_quota_stats_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.api_quota_stats_id_seq OWNER TO dev_user;

--
-- Name: api_quota_stats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.api_quota_stats_id_seq OWNED BY public.api_quota_stats.id;


--
-- Name: api_usage_logs; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.api_usage_logs (
    id bigint NOT NULL,
    api_key_id bigint NOT NULL,
    user_id integer,
    endpoint character varying(500) NOT NULL,
    method character varying(10) NOT NULL,
    request_size integer,
    response_size integer,
    ip_address inet NOT NULL,
    user_agent text,
    referer text,
    x_forwarded_for inet[],
    request_timestamp timestamp with time zone DEFAULT now() NOT NULL,
    response_timestamp timestamp with time zone,
    response_time_ms integer,
    response_status integer NOT NULL,
    response_type character varying(100),
    error_message text,
    error_code character varying(50),
    action_type character varying(100),
    resource_type character varying(100),
    resource_id character varying(100),
    project_id integer,
    rate_limited boolean DEFAULT false,
    blocked_reason character varying(255),
    security_flags character varying(50)[] DEFAULT '{}'::character varying[],
    quota_remaining integer,
    request_sequence bigint,
    request_headers jsonb,
    request_params jsonb,
    response_metadata jsonb,
    correlation_id character varying(36),
    trace_id character varying(36)
);


ALTER TABLE public.api_usage_logs OWNER TO dev_user;

--
-- Name: TABLE api_usage_logs; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON TABLE public.api_usage_logs IS 'API使用日志表 - 记录所有API请求的详细信息，支持按月分区';


--
-- Name: COLUMN api_usage_logs.response_time_ms; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.api_usage_logs.response_time_ms IS '请求响应时间（毫秒），用于性能监控';


--
-- Name: COLUMN api_usage_logs.rate_limited; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.api_usage_logs.rate_limited IS '是否触发速率限制，用于限流分析';


--
-- Name: COLUMN api_usage_logs.security_flags; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.api_usage_logs.security_flags IS '安全标记数组，如suspicious_ip, high_frequency等';


--
-- Name: COLUMN api_usage_logs.correlation_id; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.api_usage_logs.correlation_id IS '关联ID，用于追踪相关的多个API请求';


--
-- Name: api_usage_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.api_usage_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.api_usage_logs_id_seq OWNER TO dev_user;

--
-- Name: api_usage_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.api_usage_logs_id_seq OWNED BY public.api_usage_logs.id;


--
-- Name: api_usage_summary; Type: VIEW; Schema: public; Owner: dev_user
--

CREATE VIEW public.api_usage_summary AS
 SELECT ak.id,
    ak.name,
    ak.key_prefix,
    count(aul.id) AS total_requests,
    count(
        CASE
            WHEN (aul.response_status < 400) THEN 1
            ELSE NULL::integer
        END) AS successful_requests,
    count(
        CASE
            WHEN (aul.response_status >= 400) THEN 1
            ELSE NULL::integer
        END) AS failed_requests,
    avg(aul.response_time_ms) AS avg_response_time,
    max(aul.request_timestamp) AS last_used_at,
    sum(
        CASE
            WHEN aul.rate_limited THEN 1
            ELSE 0
        END) AS rate_limited_count
   FROM (public.api_keys ak
     LEFT JOIN public.api_usage_logs aul ON (((ak.id = aul.api_key_id) AND (aul.request_timestamp >= (CURRENT_DATE - '30 days'::interval)))))
  WHERE (ak.deleted_at IS NULL)
  GROUP BY ak.id, ak.name, ak.key_prefix;


ALTER VIEW public.api_usage_summary OWNER TO dev_user;

--
-- Name: audit_configs; Type: TABLE; Schema: public; Owner: dev_user
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


ALTER TABLE public.audit_configs OWNER TO dev_user;

--
-- Name: audit_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.audit_configs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_configs_id_seq OWNER TO dev_user;

--
-- Name: audit_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.audit_configs_id_seq OWNED BY public.audit_configs.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: dev_user
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


ALTER TABLE public.audit_logs OWNER TO dev_user;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.audit_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO dev_user;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: companies; Type: TABLE; Schema: public; Owner: dev_user
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
    CONSTRAINT companies_company_size_check CHECK (((company_size)::text = ANY (ARRAY[('startup'::character varying)::text, ('small'::character varying)::text, ('medium'::character varying)::text, ('large'::character varying)::text, ('enterprise'::character varying)::text]))),
    CONSTRAINT companies_priority_check CHECK (((priority)::text = ANY (ARRAY[('high'::character varying)::text, ('medium'::character varying)::text, ('low'::character varying)::text]))),
    CONSTRAINT companies_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('inactive'::character varying)::text, ('potential'::character varying)::text, ('suspended'::character varying)::text])))
);


ALTER TABLE public.companies OWNER TO dev_user;

--
-- Name: companies_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.companies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.companies_id_seq OWNER TO dev_user;

--
-- Name: companies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.companies_id_seq OWNED BY public.companies.id;


--
-- Name: company_departments; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.company_departments (
    id integer NOT NULL,
    company_id integer NOT NULL,
    name character varying(255) NOT NULL,
    parent_id integer,
    manager_id integer,
    description text,
    level integer DEFAULT 1 NOT NULL,
    employee_count integer DEFAULT 0 NOT NULL,
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    path text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT company_departments_level_check CHECK (((level >= 1) AND (level <= 10))),
    CONSTRAINT company_departments_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying])::text[])))
);


ALTER TABLE public.company_departments OWNER TO dev_user;

--
-- Name: TABLE company_departments; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON TABLE public.company_departments IS '企业部门表 - 支持多租户数据隔离 (已清理旧departments表)';


--
-- Name: COLUMN company_departments.company_id; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.company_departments.company_id IS '所属企业ID，关联companies表';


--
-- Name: COLUMN company_departments.parent_id; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.company_departments.parent_id IS '父部门ID，实现部门层级结构';


--
-- Name: COLUMN company_departments.manager_id; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.company_departments.manager_id IS '部门经理ID，关联company_users表';


--
-- Name: COLUMN company_departments.level; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.company_departments.level IS '部门层级深度，根部门为1';


--
-- Name: COLUMN company_departments.employee_count; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.company_departments.employee_count IS '部门员工数统计';


--
-- Name: COLUMN company_departments.path; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.company_departments.path IS '部门层级路径，用于快速查询子树';


--
-- Name: company_departments_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.company_departments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.company_departments_id_seq OWNER TO dev_user;

--
-- Name: company_departments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.company_departments_id_seq OWNED BY public.company_departments.id;


--
-- Name: company_roles; Type: TABLE; Schema: public; Owner: dev_user
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


ALTER TABLE public.company_roles OWNER TO dev_user;

--
-- Name: company_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.company_roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.company_roles_id_seq OWNER TO dev_user;

--
-- Name: company_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.company_roles_id_seq OWNED BY public.company_roles.id;


--
-- Name: company_user_project_permissions; Type: TABLE; Schema: public; Owner: dev_user
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


ALTER TABLE public.company_user_project_permissions OWNER TO dev_user;

--
-- Name: company_user_project_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.company_user_project_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.company_user_project_permissions_id_seq OWNER TO dev_user;

--
-- Name: company_user_project_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.company_user_project_permissions_id_seq OWNED BY public.company_user_project_permissions.id;


--
-- Name: company_users; Type: TABLE; Schema: public; Owner: dev_user
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
    department_id integer,
    CONSTRAINT company_users_access_level_check CHECK (((access_level >= 1) AND (access_level <= 5))),
    CONSTRAINT company_users_role_check CHECK (((role)::text = ANY (ARRAY[('primary_contact'::character varying)::text, ('technical_contact'::character varying)::text, ('decision_maker'::character varying)::text, ('finance_contact'::character varying)::text, ('normal'::character varying)::text]))),
    CONSTRAINT company_users_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('inactive'::character varying)::text, ('left'::character varying)::text])))
);


ALTER TABLE public.company_users OWNER TO dev_user;

--
-- Name: COLUMN company_users.department_id; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.company_users.department_id IS '部门ID - 关联到company_departments表 (多租户安全)';


--
-- Name: company_users_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.company_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.company_users_id_seq OWNER TO dev_user;

--
-- Name: company_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.company_users_id_seq OWNED BY public.company_users.id;


--
-- Name: customer_contacts; Type: TABLE; Schema: public; Owner: dev_user
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


ALTER TABLE public.customer_contacts OWNER TO dev_user;

--
-- Name: customer_contacts_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.customer_contacts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customer_contacts_id_seq OWNER TO dev_user;

--
-- Name: customer_contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.customer_contacts_id_seq OWNED BY public.customer_contacts.id;


--
-- Name: customer_users; Type: TABLE; Schema: public; Owner: dev_user
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


ALTER TABLE public.customer_users OWNER TO dev_user;

--
-- Name: customer_users_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.customer_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customer_users_id_seq OWNER TO dev_user;

--
-- Name: customer_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.customer_users_id_seq OWNED BY public.customer_users.id;


--
-- Name: customers; Type: TABLE; Schema: public; Owner: dev_user
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


ALTER TABLE public.customers OWNER TO dev_user;

--
-- Name: customers_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customers_id_seq OWNER TO dev_user;

--
-- Name: customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.customers_id_seq OWNED BY public.customers.id;


--
-- Name: document_folders; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.document_folders (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    parent_folder_id integer,
    owner_id integer,
    visibility character varying(50) DEFAULT 'private'::character varying NOT NULL,
    color character varying(7),
    icon character varying(50),
    sort_order integer DEFAULT 0,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone,
    CONSTRAINT document_folders_visibility_check CHECK (((visibility)::text = ANY (ARRAY[('private'::character varying)::text, ('team'::character varying)::text, ('public'::character varying)::text])))
);


ALTER TABLE public.document_folders OWNER TO dev_user;

--
-- Name: document_folders_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.document_folders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.document_folders_id_seq OWNER TO dev_user;

--
-- Name: document_folders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.document_folders_id_seq OWNED BY public.document_folders.id;


--
-- Name: documents; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.documents (
    id integer NOT NULL,
    project_id integer,
    title character varying(255) NOT NULL,
    content text DEFAULT ''::text,
    created_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    customer_id integer,
    owner_id integer DEFAULT 1 NOT NULL,
    type character varying(50) DEFAULT 'markdown'::character varying NOT NULL,
    status character varying(50) DEFAULT 'draft'::character varying NOT NULL,
    category character varying(100),
    subcategory character varying(100),
    visibility character varying(50) DEFAULT 'private'::character varying,
    shared_with integer[],
    file_url character varying(500),
    file_size bigint,
    mime_type character varying(100),
    tags text[],
    description text,
    version integer DEFAULT 1,
    deleted_at timestamp without time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    is_template boolean DEFAULT false,
    folder_id integer,
    archived boolean DEFAULT false NOT NULL,
    archived_at timestamp with time zone,
    archived_by integer,
    unarchived_at timestamp with time zone,
    unarchived_by integer,
    CONSTRAINT check_document_status CHECK (((status)::text = ANY (ARRAY[('draft'::character varying)::text, ('published'::character varying)::text, ('archived'::character varying)::text]))),
    CONSTRAINT check_single_association CHECK ((((project_id IS NOT NULL) AND (customer_id IS NULL)) OR ((project_id IS NULL) AND (customer_id IS NOT NULL)) OR ((project_id IS NULL) AND (customer_id IS NULL)))),
    CONSTRAINT check_visibility CHECK (((visibility)::text = ANY (ARRAY[('private'::character varying)::text, ('team'::character varying)::text, ('public'::character varying)::text]))),
    CONSTRAINT documents_type_check CHECK (((type)::text = ANY (ARRAY[('markdown'::character varying)::text, ('image'::character varying)::text, ('pdf'::character varying)::text, ('doc'::character varying)::text, ('xlsx'::character varying)::text, ('pptx'::character varying)::text, ('txt'::character varying)::text, ('html'::character varying)::text])))
);


ALTER TABLE public.documents OWNER TO dev_user;

--
-- Name: TABLE documents; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON TABLE public.documents IS '文档表 - 支持项目、客户和个人文档关联';


--
-- Name: COLUMN documents.id; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.documents.id IS '文档唯一标识';


--
-- Name: COLUMN documents.project_id; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.documents.project_id IS '关联项目ID（可为空）';


--
-- Name: COLUMN documents.title; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.documents.title IS '文档标题';


--
-- Name: COLUMN documents.content; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.documents.content IS '文档内容（纯文本）';


--
-- Name: COLUMN documents.created_by; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.documents.created_by IS '创建者用户ID';


--
-- Name: COLUMN documents.created_at; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.documents.created_at IS '创建时间';


--
-- Name: COLUMN documents.updated_at; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.documents.updated_at IS '最后更新时间';


--
-- Name: COLUMN documents.customer_id; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.documents.customer_id IS '关联客户ID（可为空）';


--
-- Name: COLUMN documents.owner_id; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.documents.owner_id IS '文档所有者ID（必填）';


--
-- Name: COLUMN documents.type; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.documents.type IS '文档类型：markdown, image, pdf';


--
-- Name: COLUMN documents.status; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.documents.status IS '文档状态：draft, published, archived';


--
-- Name: COLUMN documents.visibility; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.documents.visibility IS '可见性：private, team, public';


--
-- Name: COLUMN documents.shared_with; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.documents.shared_with IS '共享给的用户ID数组';


--
-- Name: document_stats; Type: VIEW; Schema: public; Owner: dev_user
--

CREATE VIEW public.document_stats AS
 SELECT count(*) AS total_documents,
    count(
        CASE
            WHEN (project_id IS NOT NULL) THEN 1
            ELSE NULL::integer
        END) AS project_documents,
    count(
        CASE
            WHEN (customer_id IS NOT NULL) THEN 1
            ELSE NULL::integer
        END) AS customer_documents,
    count(
        CASE
            WHEN ((project_id IS NULL) AND (customer_id IS NULL)) THEN 1
            ELSE NULL::integer
        END) AS personal_documents,
    count(
        CASE
            WHEN ((type)::text = 'markdown'::text) THEN 1
            ELSE NULL::integer
        END) AS markdown_documents,
    count(
        CASE
            WHEN ((type)::text = 'image'::text) THEN 1
            ELSE NULL::integer
        END) AS image_documents,
    count(
        CASE
            WHEN ((type)::text = 'pdf'::text) THEN 1
            ELSE NULL::integer
        END) AS pdf_documents,
    count(
        CASE
            WHEN ((status)::text = 'draft'::text) THEN 1
            ELSE NULL::integer
        END) AS draft_documents,
    count(
        CASE
            WHEN ((status)::text = 'published'::text) THEN 1
            ELSE NULL::integer
        END) AS published_documents,
    count(
        CASE
            WHEN ((status)::text = 'archived'::text) THEN 1
            ELSE NULL::integer
        END) AS archived_documents,
    count(
        CASE
            WHEN (created_at >= (now() - '7 days'::interval)) THEN 1
            ELSE NULL::integer
        END) AS recent_documents
   FROM public.documents
  WHERE (deleted_at IS NULL);


ALTER VIEW public.document_stats OWNER TO dev_user;

--
-- Name: document_versions; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.document_versions (
    id integer NOT NULL,
    document_id integer NOT NULL,
    version_number integer NOT NULL,
    title character varying(255),
    content text,
    changes_summary text,
    metadata jsonb,
    created_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.document_versions OWNER TO dev_user;

--
-- Name: TABLE document_versions; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON TABLE public.document_versions IS '文档版本表 - 记录文档的历史版本';


--
-- Name: COLUMN document_versions.version_number; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.document_versions.version_number IS '版本号，与documents表的version字段对应';


--
-- Name: COLUMN document_versions.changes_summary; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.document_versions.changes_summary IS '变更摘要，描述本次版本的主要变化';


--
-- Name: document_versions_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.document_versions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.document_versions_id_seq OWNER TO dev_user;

--
-- Name: document_versions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.document_versions_id_seq OWNED BY public.document_versions.id;


--
-- Name: documents_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.documents_id_seq OWNER TO dev_user;

--
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.documents_id_seq OWNED BY public.documents.id;


--
-- Name: encryption_keys; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.encryption_keys (
    id integer NOT NULL,
    key_name character varying(255) NOT NULL,
    key_value text NOT NULL,
    algorithm character varying(50) DEFAULT 'AES-256-GCM'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.encryption_keys OWNER TO dev_user;

--
-- Name: TABLE encryption_keys; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON TABLE public.encryption_keys IS 'Encryption keys for securing sensitive data';


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
-- Name: enterprise_departments; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.enterprise_departments (
    id integer NOT NULL,
    enterprise_id integer NOT NULL,
    name character varying(255) NOT NULL,
    parent_id integer,
    level integer DEFAULT 1 NOT NULL,
    path text,
    sort_order integer DEFAULT 0,
    manager_id integer,
    description text,
    employee_count integer DEFAULT 0,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_by integer,
    updated_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT enterprise_departments_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::text[])))
);


ALTER TABLE public.enterprise_departments OWNER TO dev_user;

--
-- Name: TABLE enterprise_departments; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON TABLE public.enterprise_departments IS '企业部门表，支持层级结构，替代原有company_departments表';


--
-- Name: COLUMN enterprise_departments.id; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprise_departments.id IS '部门唯一标识';


--
-- Name: COLUMN enterprise_departments.enterprise_id; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprise_departments.enterprise_id IS '所属企业ID，关联enterprises表';


--
-- Name: COLUMN enterprise_departments.name; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprise_departments.name IS '部门名称';


--
-- Name: COLUMN enterprise_departments.parent_id; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprise_departments.parent_id IS '父部门ID，自引用关系';


--
-- Name: COLUMN enterprise_departments.level; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprise_departments.level IS '部门层级，从1开始';


--
-- Name: COLUMN enterprise_departments.path; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprise_departments.path IS '部门路径，存储从根到父级的完整路径';


--
-- Name: COLUMN enterprise_departments.sort_order; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprise_departments.sort_order IS '同级部门排序权重';


--
-- Name: COLUMN enterprise_departments.manager_id; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprise_departments.manager_id IS '部门经理ID，关联enterprise_users表';


--
-- Name: COLUMN enterprise_departments.description; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprise_departments.description IS '部门描述';


--
-- Name: COLUMN enterprise_departments.employee_count; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprise_departments.employee_count IS '员工数量统计';


--
-- Name: COLUMN enterprise_departments.status; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprise_departments.status IS '部门状态：active(活跃), inactive(非活跃), archived(已归档)';


--
-- Name: COLUMN enterprise_departments.created_by; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprise_departments.created_by IS '创建人用户ID';


--
-- Name: COLUMN enterprise_departments.updated_by; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprise_departments.updated_by IS '最后更新人用户ID';


--
-- Name: COLUMN enterprise_departments.created_at; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprise_departments.created_at IS '创建时间';


--
-- Name: COLUMN enterprise_departments.updated_at; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprise_departments.updated_at IS '更新时间';


--
-- Name: COLUMN enterprise_departments.deleted_at; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprise_departments.deleted_at IS '软删除时间';


--
-- Name: enterprise_departments_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.enterprise_departments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.enterprise_departments_id_seq OWNER TO dev_user;

--
-- Name: enterprise_departments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.enterprise_departments_id_seq OWNED BY public.enterprise_departments.id;


--
-- Name: enterprise_users; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.enterprise_users (
    id integer NOT NULL,
    enterprise_id integer NOT NULL,
    username character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    name character varying(255),
    phone character varying(50),
    "position" character varying(255),
    department_id integer,
    role_id integer,
    is_primary_contact boolean DEFAULT false,
    can_make_decisions boolean DEFAULT false,
    access_level integer DEFAULT 1,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    invitation_token character varying(255),
    invitation_sent_at timestamp with time zone,
    invitation_accepted_at timestamp with time zone,
    last_login_at timestamp with time zone,
    avatar character varying(255),
    bio text,
    created_by integer,
    updated_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT enterprise_users_access_level_check CHECK (((access_level >= 1) AND (access_level <= 5))),
    CONSTRAINT enterprise_users_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'pending'::character varying, 'locked'::character varying])::text[])))
);


ALTER TABLE public.enterprise_users OWNER TO dev_user;

--
-- Name: TABLE enterprise_users; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON TABLE public.enterprise_users IS '企业用户表，统一管理所有企业用户信息，替代原有customer_users/company_users表';


--
-- Name: COLUMN enterprise_users.id; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprise_users.id IS '用户唯一标识';


--
-- Name: COLUMN enterprise_users.enterprise_id; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprise_users.enterprise_id IS '所属企业ID，关联enterprises表';


--
-- Name: COLUMN enterprise_users.username; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprise_users.username IS '用户名，在同一企业内唯一';


--
-- Name: COLUMN enterprise_users.email; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprise_users.email IS '邮箱地址，全局唯一';


--
-- Name: COLUMN enterprise_users.name; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprise_users.name IS '用户真实姓名';


--
-- Name: COLUMN enterprise_users.phone; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprise_users.phone IS '联系电话';


--
-- Name: COLUMN enterprise_users."position"; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprise_users."position" IS '职位';


--
-- Name: COLUMN enterprise_users.department_id; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprise_users.department_id IS '部门ID，关联enterprise_departments表';


--
-- Name: COLUMN enterprise_users.role_id; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprise_users.role_id IS '角色ID，关联enterprise_roles表';


--
-- Name: COLUMN enterprise_users.is_primary_contact; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprise_users.is_primary_contact IS '是否为主要联系人';


--
-- Name: COLUMN enterprise_users.can_make_decisions; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprise_users.can_make_decisions IS '是否可以做决策';


--
-- Name: COLUMN enterprise_users.access_level; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprise_users.access_level IS '访问级别，1-5级，5为最高权限';


--
-- Name: COLUMN enterprise_users.status; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprise_users.status IS '用户状态：active(活跃), inactive(非活跃), pending(待激活), locked(锁定)';


--
-- Name: COLUMN enterprise_users.invitation_token; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprise_users.invitation_token IS '邀请令牌，用于用户激活';


--
-- Name: COLUMN enterprise_users.invitation_sent_at; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprise_users.invitation_sent_at IS '邀请发送时间';


--
-- Name: COLUMN enterprise_users.invitation_accepted_at; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprise_users.invitation_accepted_at IS '邀请接受时间';


--
-- Name: COLUMN enterprise_users.last_login_at; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprise_users.last_login_at IS '最后登录时间';


--
-- Name: COLUMN enterprise_users.avatar; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprise_users.avatar IS '用户头像URL';


--
-- Name: COLUMN enterprise_users.bio; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprise_users.bio IS '用户简介';


--
-- Name: COLUMN enterprise_users.created_by; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprise_users.created_by IS '创建人用户ID';


--
-- Name: COLUMN enterprise_users.updated_by; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprise_users.updated_by IS '最后更新人用户ID';


--
-- Name: COLUMN enterprise_users.created_at; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprise_users.created_at IS '创建时间';


--
-- Name: COLUMN enterprise_users.updated_at; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprise_users.updated_at IS '更新时间';


--
-- Name: COLUMN enterprise_users.deleted_at; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprise_users.deleted_at IS '软删除时间';


--
-- Name: enterprise_users_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.enterprise_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.enterprise_users_id_seq OWNER TO dev_user;

--
-- Name: enterprise_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.enterprise_users_id_seq OWNED BY public.enterprise_users.id;


--
-- Name: enterprises; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.enterprises (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(100) NOT NULL,
    industry_type character varying(100),
    business_type character varying(50) DEFAULT 'corporation'::character varying NOT NULL,
    registration_number character varying(100),
    tax_id character varying(100),
    legal_representative character varying(255),
    contact_email character varying(255),
    contact_phone character varying(50),
    address text,
    city character varying(100),
    province character varying(100),
    postal_code character varying(20),
    website character varying(255),
    description text,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_by integer,
    updated_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT enterprises_business_type_check CHECK (((business_type)::text = ANY ((ARRAY['individual'::character varying, 'partnership'::character varying, 'corporation'::character varying, 'llc'::character varying])::text[]))),
    CONSTRAINT enterprises_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'suspended'::character varying])::text[])))
);


ALTER TABLE public.enterprises OWNER TO dev_user;

--
-- Name: TABLE enterprises; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON TABLE public.enterprises IS '统一企业管理表，替代原有customers/companies表';


--
-- Name: COLUMN enterprises.id; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprises.id IS '企业唯一标识';


--
-- Name: COLUMN enterprises.name; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprises.name IS '企业名称';


--
-- Name: COLUMN enterprises.code; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprises.code IS '企业代码，全局唯一';


--
-- Name: COLUMN enterprises.industry_type; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprises.industry_type IS '行业类型';


--
-- Name: COLUMN enterprises.business_type; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprises.business_type IS '企业性质：individual(个人), partnership(合伙), corporation(公司), llc(有限责任)';


--
-- Name: COLUMN enterprises.registration_number; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprises.registration_number IS '工商注册号';


--
-- Name: COLUMN enterprises.tax_id; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprises.tax_id IS '税号';


--
-- Name: COLUMN enterprises.legal_representative; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprises.legal_representative IS '法定代表人';


--
-- Name: COLUMN enterprises.contact_email; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprises.contact_email IS '联系邮箱';


--
-- Name: COLUMN enterprises.contact_phone; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprises.contact_phone IS '联系电话';


--
-- Name: COLUMN enterprises.address; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprises.address IS '详细地址';


--
-- Name: COLUMN enterprises.city; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprises.city IS '城市';


--
-- Name: COLUMN enterprises.province; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprises.province IS '省份';


--
-- Name: COLUMN enterprises.postal_code; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprises.postal_code IS '邮政编码';


--
-- Name: COLUMN enterprises.website; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprises.website IS '官方网站';


--
-- Name: COLUMN enterprises.description; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprises.description IS '企业描述';


--
-- Name: COLUMN enterprises.status; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprises.status IS '企业状态：active(活跃), inactive(非活跃), suspended(暂停)';


--
-- Name: COLUMN enterprises.created_by; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprises.created_by IS '创建人用户ID';


--
-- Name: COLUMN enterprises.updated_by; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprises.updated_by IS '最后更新人用户ID';


--
-- Name: COLUMN enterprises.created_at; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprises.created_at IS '创建时间';


--
-- Name: COLUMN enterprises.updated_at; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprises.updated_at IS '更新时间';


--
-- Name: COLUMN enterprises.deleted_at; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.enterprises.deleted_at IS '软删除时间';


--
-- Name: enterprises_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.enterprises_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.enterprises_id_seq OWNER TO dev_user;

--
-- Name: enterprises_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.enterprises_id_seq OWNED BY public.enterprises.id;


--
-- Name: high_error_endpoints; Type: VIEW; Schema: public; Owner: dev_user
--

CREATE VIEW public.high_error_endpoints AS
 SELECT endpoint,
    method,
    count(*) AS total_requests,
    count(
        CASE
            WHEN (response_status >= 400) THEN 1
            ELSE NULL::integer
        END) AS error_requests,
    round((((count(
        CASE
            WHEN (response_status >= 400) THEN 1
            ELSE NULL::integer
        END))::numeric / (count(*))::numeric) * (100)::numeric), 2) AS error_rate_percent,
    avg(response_time_ms) AS avg_response_time
   FROM public.api_usage_logs
  WHERE (request_timestamp >= (CURRENT_DATE - '7 days'::interval))
  GROUP BY endpoint, method
 HAVING ((count(*) >= 10) AND (((count(
        CASE
            WHEN (response_status >= 400) THEN 1
            ELSE NULL::integer
        END))::numeric / (count(*))::numeric) > 0.1))
  ORDER BY (round((((count(
        CASE
            WHEN (response_status >= 400) THEN 1
            ELSE NULL::integer
        END))::numeric / (count(*))::numeric) * (100)::numeric), 2)) DESC;


ALTER VIEW public.high_error_endpoints OWNER TO dev_user;

--
-- Name: unified_timer_logs; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.unified_timer_logs (
    id integer NOT NULL,
    user_id integer NOT NULL,
    target_type character varying(20) NOT NULL,
    target_id integer,
    target_title character varying(500) NOT NULL,
    target_metadata jsonb DEFAULT '{}'::jsonb,
    start_time timestamp with time zone DEFAULT now() NOT NULL,
    end_time timestamp with time zone,
    duration_seconds integer,
    actual_work_seconds integer,
    status character varying(20) DEFAULT 'running'::character varying NOT NULL,
    pause_count integer DEFAULT 0,
    pause_total_seconds integer DEFAULT 0,
    pause_events jsonb DEFAULT '[]'::jsonb,
    category character varying(100),
    tags text[] DEFAULT '{}'::text[],
    priority character varying(10),
    description text,
    work_location character varying(200),
    mood character varying(20),
    interruption_count integer DEFAULT 0,
    project_id integer,
    parent_task_id integer,
    template_id integer,
    inference_confidence numeric(3,2),
    inference_reasoning jsonb DEFAULT '[]'::jsonb,
    user_feedback integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by integer NOT NULL,
    source_type character varying(20) DEFAULT 'unified'::character varying,
    legacy_task_time_log_id integer,
    legacy_personal_timer_id integer,
    search_vector tsvector,
    family_key integer,
    CONSTRAINT chk_actual_work_duration CHECK (((actual_work_seconds IS NULL) OR (duration_seconds IS NULL) OR (actual_work_seconds <= duration_seconds))),
    CONSTRAINT chk_inference_confidence CHECK (((inference_confidence IS NULL) OR ((inference_confidence >= 0.0) AND (inference_confidence <= 1.0)))),
    CONSTRAINT chk_pause_total_duration CHECK (((pause_total_seconds IS NULL) OR (duration_seconds IS NULL) OR (pause_total_seconds <= duration_seconds))),
    CONSTRAINT chk_timer_duration CHECK ((((end_time IS NULL) AND (duration_seconds IS NULL)) OR ((end_time IS NOT NULL) AND (duration_seconds IS NOT NULL) AND (duration_seconds >= 0)))),
    CONSTRAINT unified_timer_logs_mood_check CHECK (((mood)::text = ANY (ARRAY[('focused'::character varying)::text, ('distracted'::character varying)::text, ('tired'::character varying)::text, ('energetic'::character varying)::text, ('neutral'::character varying)::text]))),
    CONSTRAINT unified_timer_logs_priority_check CHECK (((priority)::text = ANY (ARRAY[('low'::character varying)::text, ('medium'::character varying)::text, ('high'::character varying)::text]))),
    CONSTRAINT unified_timer_logs_source_type_check CHECK (((source_type)::text = ANY (ARRAY[('unified'::character varying)::text, ('migrated_task'::character varying)::text, ('migrated_personal'::character varying)::text, ('imported'::character varying)::text]))),
    CONSTRAINT unified_timer_logs_status_check CHECK (((status)::text = ANY (ARRAY[('running'::character varying)::text, ('paused'::character varying)::text, ('completed'::character varying)::text, ('cancelled'::character varying)::text]))),
    CONSTRAINT unified_timer_logs_target_type_check CHECK (((target_type)::text = ANY (ARRAY[('project_task'::character varying)::text, ('personal_task'::character varying)::text, ('quick_timer'::character varying)::text, ('pomodoro'::character varying)::text]))),
    CONSTRAINT unified_timer_logs_user_feedback_check CHECK ((user_feedback = ANY (ARRAY[1, 2, 3, 4, 5])))
);


ALTER TABLE public.unified_timer_logs OWNER TO dev_user;

--
-- Name: TABLE unified_timer_logs; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON TABLE public.unified_timer_logs IS '统一计时记录表 - 整合项目任务计时和个人计时';


--
-- Name: COLUMN unified_timer_logs.target_type; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.unified_timer_logs.target_type IS '计时目标类型: project_task(项目任务), personal_task(个人任务), quick_timer(快速计时), pomodoro(番茄钟)';


--
-- Name: COLUMN unified_timer_logs.target_metadata; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.unified_timer_logs.target_metadata IS '目标元数据，存储额外的上下文信息';


--
-- Name: COLUMN unified_timer_logs.actual_work_seconds; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.unified_timer_logs.actual_work_seconds IS '实际工作时长(秒)，扣除暂停时间';


--
-- Name: COLUMN unified_timer_logs.pause_events; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.unified_timer_logs.pause_events IS '暂停事件记录，JSON数组格式';


--
-- Name: COLUMN unified_timer_logs.inference_confidence; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.unified_timer_logs.inference_confidence IS '智能推断置信度 0.00-1.00';


--
-- Name: COLUMN unified_timer_logs.user_feedback; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.unified_timer_logs.user_feedback IS '用户对推断结果的评分 1-5分';


--
-- Name: inference_accuracy_stats; Type: VIEW; Schema: public; Owner: dev_user
--

CREATE VIEW public.inference_accuracy_stats AS
 SELECT user_id,
    target_type,
    count(*) AS total_inferences,
    count(user_feedback) AS feedback_count,
    avg(inference_confidence) AS avg_confidence,
    avg(
        CASE
            WHEN (user_feedback >= 3) THEN 1.0
            ELSE 0.0
        END) AS accuracy_rate,
    sum(
        CASE
            WHEN (user_feedback = 5) THEN 1
            ELSE 0
        END) AS excellent_count,
    sum(
        CASE
            WHEN (user_feedback <= 2) THEN 1
            ELSE 0
        END) AS poor_count
   FROM public.unified_timer_logs utl
  WHERE ((inference_confidence IS NOT NULL) AND (created_at >= (CURRENT_DATE - '30 days'::interval)))
  GROUP BY user_id, target_type
 HAVING (count(*) >= 5);


ALTER VIEW public.inference_accuracy_stats OWNER TO dev_user;

--
-- Name: VIEW inference_accuracy_stats; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON VIEW public.inference_accuracy_stats IS '智能推断准确率统计视图';


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: dev_user
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


ALTER TABLE public.permissions OWNER TO dev_user;

--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.role_permissions (
    id integer NOT NULL,
    role_id integer,
    permission_id integer,
    is_granted boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.role_permissions OWNER TO dev_user;

--
-- Name: mv_user_effective_permissions; Type: MATERIALIZED VIEW; Schema: public; Owner: dev_user
--

CREATE MATERIALIZED VIEW public.mv_user_effective_permissions AS
 SELECT cu.id AS company_user_id,
    cu.name AS user_name,
    cu.email AS user_email,
    cr.id AS role_id,
    cr.role_code,
    cr.role_name,
    p.id AS permission_id,
    p.permission_code,
    p.permission_name,
    p.module,
    p.resource,
    p.action,
    rp.is_granted,
    now() AS last_updated
   FROM (((public.company_users cu
     JOIN public.company_roles cr ON (((cu.role_id = cr.id) AND (cr.is_active = true))))
     JOIN public.role_permissions rp ON ((cr.id = rp.role_id)))
     JOIN public.permissions p ON (((rp.permission_id = p.id) AND (p.is_active = true))))
  WHERE (((cu.status)::text = 'active'::text) AND (rp.is_granted = true))
  WITH NO DATA;


ALTER MATERIALIZED VIEW public.mv_user_effective_permissions OWNER TO dev_user;

--
-- Name: projects; Type: TABLE; Schema: public; Owner: dev_user
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
    budget numeric(15,2),
    enterprise_id integer
);


ALTER TABLE public.projects OWNER TO dev_user;

--
-- Name: tasks; Type: TABLE; Schema: public; Owner: dev_user
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
    dependencies jsonb DEFAULT '[]'::jsonb,
    estimated_hours numeric(5,2) DEFAULT 0,
    priority character varying(20) DEFAULT 'medium'::character varying,
    tags jsonb DEFAULT '[]'::jsonb,
    start_datetime timestamp with time zone,
    due_datetime timestamp with time zone,
    estimated_minutes integer DEFAULT 0,
    actual_minutes integer DEFAULT 0,
    time_unit_preference character varying(10) DEFAULT 'auto'::character varying,
    work_hours_per_day numeric(4,2) DEFAULT 8.0,
    time_tracking_mode character varying(20) DEFAULT 'manual'::character varying,
    path public.ltree,
    depth integer DEFAULT 0,
    CONSTRAINT check_actual_minutes CHECK ((actual_minutes >= 0)),
    CONSTRAINT check_datetime_order CHECK (((start_datetime IS NULL) OR (due_datetime IS NULL) OR (start_datetime <= due_datetime))),
    CONSTRAINT check_estimated_minutes CHECK ((estimated_minutes >= 0)),
    CONSTRAINT check_task_level CHECK (((task_level >= 0) AND (task_level <= 4))),
    CONSTRAINT check_time_tracking_mode CHECK (((time_tracking_mode)::text = ANY (ARRAY[('manual'::character varying)::text, ('automatic'::character varying)::text, ('hybrid'::character varying)::text]))),
    CONSTRAINT check_time_unit_preference CHECK (((time_unit_preference)::text = ANY (ARRAY[('auto'::character varying)::text, ('minutes'::character varying)::text, ('hours'::character varying)::text, ('days'::character varying)::text]))),
    CONSTRAINT check_work_hours_per_day CHECK (((work_hours_per_day > (0)::numeric) AND (work_hours_per_day <= (24)::numeric))),
    CONSTRAINT tasks_priority_check CHECK (((priority)::text = ANY (ARRAY[('low'::character varying)::text, ('medium'::character varying)::text, ('high'::character varying)::text])))
);


ALTER TABLE public.tasks OWNER TO dev_user;

--
-- Name: COLUMN tasks.dependencies; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.tasks.dependencies IS 'JSONB array of task IDs that this task depends on. Format: [123, 456, 789]';


--
-- Name: COLUMN tasks.estimated_hours; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.tasks.estimated_hours IS 'AI-estimated hours for task completion';


--
-- Name: COLUMN tasks.priority; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.tasks.priority IS 'AI-analyzed task priority: low, medium, high';


--
-- Name: COLUMN tasks.tags; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.tasks.tags IS 'AI-generated tags for task categorization. Format: ["frontend", "react", "optimization"]';


--
-- Name: COLUMN tasks.start_datetime; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.tasks.start_datetime IS '任务开始时间（精确到分钟）';


--
-- Name: COLUMN tasks.due_datetime; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.tasks.due_datetime IS '任务截止时间（精确到分钟）';


--
-- Name: COLUMN tasks.estimated_minutes; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.tasks.estimated_minutes IS '预估用时（分钟），支持分钟级精度';


--
-- Name: COLUMN tasks.actual_minutes; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.tasks.actual_minutes IS '实际用时（分钟），从计时器或手动输入';


--
-- Name: COLUMN tasks.time_unit_preference; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.tasks.time_unit_preference IS '时间显示单位偏好：auto自动, minutes分钟, hours小时, days天';


--
-- Name: COLUMN tasks.work_hours_per_day; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.tasks.work_hours_per_day IS '每日工作小时数，用于天数换算';


--
-- Name: COLUMN tasks.time_tracking_mode; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.tasks.time_tracking_mode IS '时间追踪模式：manual手动, automatic自动, hybrid混合';


--
-- Name: overdue_tasks; Type: VIEW; Schema: public; Owner: dev_user
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


ALTER VIEW public.overdue_tasks OWNER TO dev_user;

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
-- Name: parallel_task_status_overview; Type: VIEW; Schema: public; Owner: dev_user
--

CREATE VIEW public.parallel_task_status_overview AS
 SELECT tsh.parallel_group_id,
    count(*) AS total_tasks,
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
    max(tsh.change_timestamp) AS last_update,
    round((((count(
        CASE
            WHEN ((t.status)::text = 'completed'::text) THEN 1
            ELSE NULL::integer
        END))::numeric * 100.0) / (count(*))::numeric), 2) AS completion_percentage
   FROM (public.task_status_history tsh
     JOIN public.tasks t ON ((tsh.task_id = t.id)))
  WHERE ((tsh.parallel_group_id IS NOT NULL) AND (t.deleted_at IS NULL) AND (tsh.id = ( SELECT max(tsh2.id) AS max
           FROM public.task_status_history tsh2
          WHERE (tsh2.task_id = tsh.task_id))))
  GROUP BY tsh.parallel_group_id;


ALTER VIEW public.parallel_task_status_overview OWNER TO dev_user;

--
-- Name: permission_audit_logs; Type: TABLE; Schema: public; Owner: dev_user
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


ALTER TABLE public.permission_audit_logs OWNER TO dev_user;

--
-- Name: permission_audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.permission_audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.permission_audit_logs_id_seq OWNER TO dev_user;

--
-- Name: permission_audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.permission_audit_logs_id_seq OWNED BY public.permission_audit_logs.id;


--
-- Name: permission_cache; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.permission_cache (
    id bigint NOT NULL,
    cache_key character varying(255) NOT NULL,
    company_user_id integer NOT NULL,
    permission_code character varying(100) NOT NULL,
    resource_id integer,
    has_permission boolean NOT NULL,
    source character varying(50) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.permission_cache OWNER TO dev_user;

--
-- Name: permission_cache_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.permission_cache_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.permission_cache_id_seq OWNER TO dev_user;

--
-- Name: permission_cache_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.permission_cache_id_seq OWNED BY public.permission_cache.id;


--
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.permissions_id_seq OWNER TO dev_user;

--
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


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
-- Name: project_companies; Type: TABLE; Schema: public; Owner: dev_user
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


ALTER TABLE public.project_companies OWNER TO dev_user;

--
-- Name: project_companies_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.project_companies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_companies_id_seq OWNER TO dev_user;

--
-- Name: project_companies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.project_companies_id_seq OWNED BY public.project_companies.id;


--
-- Name: project_time_summary; Type: VIEW; Schema: public; Owner: dev_user
--

CREATE VIEW public.project_time_summary AS
 SELECT p.id AS project_id,
    p.name AS project_name,
    count(t.id) AS total_tasks,
    count(
        CASE
            WHEN (t.estimated_minutes > 0) THEN 1
            ELSE NULL::integer
        END) AS tasks_with_estimates,
    count(
        CASE
            WHEN (t.actual_minutes > 0) THEN 1
            ELSE NULL::integer
        END) AS tasks_with_actuals,
    COALESCE(sum(t.estimated_minutes), (0)::bigint) AS total_estimated_minutes,
    COALESCE(sum(t.actual_minutes), (0)::bigint) AS total_actual_minutes,
    round(avg(
        CASE
            WHEN ((t.actual_minutes > 0) AND (t.estimated_minutes > 0)) THEN public.calculate_estimation_accuracy(t.estimated_minutes, t.actual_minutes)
            ELSE NULL::numeric
        END), 2) AS avg_estimation_accuracy,
    count(
        CASE
            WHEN ((t.status)::text = 'completed'::text) THEN 1
            ELSE NULL::integer
        END) AS completed_tasks,
    count(
        CASE
            WHEN ((t.status)::text = ANY (ARRAY[('todo'::character varying)::text, ('in_progress'::character varying)::text])) THEN 1
            ELSE NULL::integer
        END) AS active_tasks,
    count(
        CASE
            WHEN ((t.due_datetime < now()) AND ((t.status)::text <> ALL (ARRAY[('completed'::character varying)::text, ('cancelled'::character varying)::text]))) THEN 1
            ELSE NULL::integer
        END) AS overdue_tasks,
        CASE
            WHEN (sum(t.actual_minutes) > sum(t.estimated_minutes)) THEN 'over_budget'::text
            WHEN (count(
            CASE
                WHEN ((t.due_datetime < now()) AND ((t.status)::text <> ALL (ARRAY[('completed'::character varying)::text, ('cancelled'::character varying)::text]))) THEN 1
                ELSE NULL::integer
            END) > 0) THEN 'has_overdue'::text
            ELSE 'on_track'::text
        END AS project_time_status
   FROM (public.projects p
     LEFT JOIN public.tasks t ON (((p.id = t.project_id) AND (t.deleted_at IS NULL))))
  GROUP BY p.id, p.name;


ALTER VIEW public.project_time_summary OWNER TO dev_user;

--
-- Name: VIEW project_time_summary; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON VIEW public.project_time_summary IS '项目时间统计视图，提供项目级别的时间分析';


--
-- Name: project_users; Type: TABLE; Schema: public; Owner: dev_user
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


ALTER TABLE public.project_users OWNER TO dev_user;

--
-- Name: project_users_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.project_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_users_id_seq OWNER TO dev_user;

--
-- Name: project_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.project_users_id_seq OWNED BY public.project_users.id;


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
-- Name: recycled_projects; Type: VIEW; Schema: public; Owner: dev_user
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


ALTER VIEW public.recycled_projects OWNER TO dev_user;

--
-- Name: recycled_tasks; Type: VIEW; Schema: public; Owner: dev_user
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


ALTER VIEW public.recycled_tasks OWNER TO dev_user;

--
-- Name: role_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.role_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.role_permissions_id_seq OWNER TO dev_user;

--
-- Name: role_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.role_permissions_id_seq OWNED BY public.role_permissions.id;


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.schema_migrations (
    id integer NOT NULL,
    migration_name character varying(255) NOT NULL,
    executed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    checksum character varying(64),
    execution_time_ms integer
);


ALTER TABLE public.schema_migrations OWNER TO dev_user;

--
-- Name: schema_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.schema_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.schema_migrations_id_seq OWNER TO dev_user;

--
-- Name: schema_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.schema_migrations_id_seq OWNED BY public.schema_migrations.id;


--
-- Name: system_audit_log; Type: TABLE; Schema: public; Owner: dev_user
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


ALTER TABLE public.system_audit_log OWNER TO dev_user;

--
-- Name: system_audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.system_audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.system_audit_log_id_seq OWNER TO dev_user;

--
-- Name: system_audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.system_audit_log_id_seq OWNED BY public.system_audit_log.id;


--
-- Name: system_users; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.system_users (
    id integer NOT NULL,
    username character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255),
    name character varying(255),
    phone character varying(50),
    avatar character varying(255),
    bio text,
    role character varying(50) DEFAULT 'admin'::character varying NOT NULL,
    permissions jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    is_verified boolean DEFAULT false,
    last_login_at timestamp with time zone,
    last_login_ip character varying(45),
    failed_login_attempts integer DEFAULT 0,
    locked_until timestamp with time zone,
    password_changed_at timestamp with time zone,
    must_change_password boolean DEFAULT false,
    api_key character varying(255),
    api_key_expires_at timestamp with time zone,
    session_token character varying(255),
    session_expires_at timestamp with time zone,
    mfa_enabled boolean DEFAULT false,
    mfa_secret character varying(255),
    mfa_backup_codes jsonb,
    notification_preferences jsonb DEFAULT '{"system_alerts": true, "security_alerts": true, "email_notifications": true}'::jsonb,
    created_by integer,
    updated_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT system_users_role_check CHECK (((role)::text = ANY ((ARRAY['super_admin'::character varying, 'admin'::character varying, 'project_manager'::character varying, 'developer'::character varying, 'viewer'::character varying])::text[])))
);


ALTER TABLE public.system_users OWNER TO dev_user;

--
-- Name: TABLE system_users; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON TABLE public.system_users IS '系统用户表，管理系统管理员账户，与企业用户分离';


--
-- Name: COLUMN system_users.id; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.system_users.id IS '用户唯一标识';


--
-- Name: COLUMN system_users.username; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.system_users.username IS '用户名，全局唯一';


--
-- Name: COLUMN system_users.email; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.system_users.email IS '邮箱地址，全局唯一';


--
-- Name: COLUMN system_users.password_hash; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.system_users.password_hash IS '密码哈希值';


--
-- Name: COLUMN system_users.name; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.system_users.name IS '用户真实姓名';


--
-- Name: COLUMN system_users.phone; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.system_users.phone IS '联系电话';


--
-- Name: COLUMN system_users.avatar; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.system_users.avatar IS '用户头像URL';


--
-- Name: COLUMN system_users.bio; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.system_users.bio IS '用户简介';


--
-- Name: COLUMN system_users.role; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.system_users.role IS '系统角色：super_admin(超级管理员), admin(管理员), project_manager(项目经理), developer(开发者), viewer(查看者)';


--
-- Name: COLUMN system_users.permissions; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.system_users.permissions IS '权限列表JSON数组';


--
-- Name: COLUMN system_users.is_active; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.system_users.is_active IS '是否激活';


--
-- Name: COLUMN system_users.is_verified; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.system_users.is_verified IS '是否已验证邮箱';


--
-- Name: COLUMN system_users.last_login_at; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.system_users.last_login_at IS '最后登录时间';


--
-- Name: COLUMN system_users.last_login_ip; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.system_users.last_login_ip IS '最后登录IP地址';


--
-- Name: COLUMN system_users.failed_login_attempts; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.system_users.failed_login_attempts IS '失败登录次数';


--
-- Name: COLUMN system_users.locked_until; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.system_users.locked_until IS '账户锁定到期时间';


--
-- Name: COLUMN system_users.password_changed_at; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.system_users.password_changed_at IS '密码最后修改时间';


--
-- Name: COLUMN system_users.must_change_password; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.system_users.must_change_password IS '是否必须修改密码';


--
-- Name: COLUMN system_users.api_key; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.system_users.api_key IS 'API访问密钥';


--
-- Name: COLUMN system_users.api_key_expires_at; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.system_users.api_key_expires_at IS 'API密钥过期时间';


--
-- Name: COLUMN system_users.session_token; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.system_users.session_token IS '会话令牌';


--
-- Name: COLUMN system_users.session_expires_at; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.system_users.session_expires_at IS '会话过期时间';


--
-- Name: COLUMN system_users.mfa_enabled; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.system_users.mfa_enabled IS '是否启用多因素认证';


--
-- Name: COLUMN system_users.mfa_secret; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.system_users.mfa_secret IS '多因素认证密钥';


--
-- Name: COLUMN system_users.mfa_backup_codes; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.system_users.mfa_backup_codes IS '多因素认证备用代码';


--
-- Name: COLUMN system_users.notification_preferences; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.system_users.notification_preferences IS '通知偏好设置JSON';


--
-- Name: COLUMN system_users.created_by; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.system_users.created_by IS '创建人用户ID';


--
-- Name: COLUMN system_users.updated_by; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.system_users.updated_by IS '最后更新人用户ID';


--
-- Name: COLUMN system_users.created_at; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.system_users.created_at IS '创建时间';


--
-- Name: COLUMN system_users.updated_at; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.system_users.updated_at IS '更新时间';


--
-- Name: COLUMN system_users.deleted_at; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.system_users.deleted_at IS '软删除时间';


--
-- Name: system_users_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.system_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.system_users_id_seq OWNER TO dev_user;

--
-- Name: system_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.system_users_id_seq OWNED BY public.system_users.id;


--
-- Name: task_current_status_with_history; Type: VIEW; Schema: public; Owner: dev_user
--

CREATE VIEW public.task_current_status_with_history AS
 SELECT t.id AS task_id,
    t.title,
    t.status AS current_status,
    t.project_id,
    tsh.change_timestamp AS last_status_change,
    tsh.changed_by AS last_changed_by,
    u.username AS last_changed_by_username,
    tsh.change_reason AS last_change_reason,
    tsh.parallel_group_id,
    tsh.workflow_stage
   FROM ((public.tasks t
     LEFT JOIN public.task_status_history tsh ON ((t.id = tsh.task_id)))
     LEFT JOIN public.users u ON ((tsh.changed_by = u.id)))
  WHERE ((tsh.id = ( SELECT max(tsh2.id) AS max
           FROM public.task_status_history tsh2
          WHERE (tsh2.task_id = t.id))) AND (t.deleted_at IS NULL));


ALTER VIEW public.task_current_status_with_history OWNER TO dev_user;

--
-- Name: task_relationships; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.task_relationships (
    id integer NOT NULL,
    source_task_id integer NOT NULL,
    target_task_id integer NOT NULL,
    relationship_type character varying(50) NOT NULL,
    relationship_status character varying(50) DEFAULT 'active'::character varying,
    created_by integer NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone,
    CONSTRAINT no_self_reference CHECK ((source_task_id <> target_task_id)),
    CONSTRAINT valid_relationship_status CHECK (((relationship_status)::text = ANY (ARRAY[('active'::character varying)::text, ('inactive'::character varying)::text, ('completed'::character varying)::text, ('cancelled'::character varying)::text]))),
    CONSTRAINT valid_relationship_type CHECK (((relationship_type)::text = ANY (ARRAY[('depends_on'::character varying)::text, ('blocks'::character varying)::text, ('parallel_with'::character varying)::text, ('follows'::character varying)::text, ('related_to'::character varying)::text, ('child_of'::character varying)::text, ('parent_of'::character varying)::text, ('sibling_of'::character varying)::text])))
);


ALTER TABLE public.task_relationships OWNER TO dev_user;

--
-- Name: TABLE task_relationships; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON TABLE public.task_relationships IS 'Task relationships table for supporting parallel development workflows';


--
-- Name: COLUMN task_relationships.source_task_id; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.task_relationships.source_task_id IS 'The source task in the relationship';


--
-- Name: COLUMN task_relationships.target_task_id; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.task_relationships.target_task_id IS 'The target task in the relationship';


--
-- Name: COLUMN task_relationships.relationship_type; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.task_relationships.relationship_type IS 'Type of relationship: depends_on, blocks, parallel_with, follows, related_to, child_of, parent_of, sibling_of';


--
-- Name: COLUMN task_relationships.relationship_status; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.task_relationships.relationship_status IS 'Status of the relationship: active, inactive, completed, cancelled';


--
-- Name: COLUMN task_relationships.metadata; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.task_relationships.metadata IS 'Additional metadata for the relationship (e.g., dependency conditions, parallel constraints)';


--
-- Name: task_dependencies; Type: VIEW; Schema: public; Owner: dev_user
--

CREATE VIEW public.task_dependencies AS
 SELECT tr.source_task_id AS task_id,
    tr.target_task_id AS depends_on_task_id,
    t1.title AS task_title,
    t2.title AS depends_on_task_title,
    t2.status AS dependency_status,
    tr.relationship_status,
    tr.metadata,
    tr.created_at AS relationship_created_at
   FROM ((public.task_relationships tr
     JOIN public.tasks t1 ON ((tr.source_task_id = t1.id)))
     JOIN public.tasks t2 ON ((tr.target_task_id = t2.id)))
  WHERE (((tr.relationship_type)::text = 'depends_on'::text) AND (tr.deleted_at IS NULL) AND (t1.deleted_at IS NULL) AND (t2.deleted_at IS NULL));


ALTER VIEW public.task_dependencies OWNER TO dev_user;

--
-- Name: task_documents; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.task_documents (
    id integer NOT NULL,
    task_id integer NOT NULL,
    document_id integer NOT NULL,
    relationship_type character varying(50) DEFAULT 'attachment'::character varying,
    sort_order integer DEFAULT 0,
    created_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone
);


ALTER TABLE public.task_documents OWNER TO dev_user;

--
-- Name: TABLE task_documents; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON TABLE public.task_documents IS '任务文档关联表 - 管理任务与文档的关联关系';


--
-- Name: COLUMN task_documents.relationship_type; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.task_documents.relationship_type IS '关联类型：attachment(附件)、reference(参考)、requirement(需求)、output(输出)';


--
-- Name: COLUMN task_documents.sort_order; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.task_documents.sort_order IS '排序顺序，用于控制文档在任务中的显示顺序';


--
-- Name: task_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.task_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.task_documents_id_seq OWNER TO dev_user;

--
-- Name: task_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.task_documents_id_seq OWNED BY public.task_documents.id;


--
-- Name: task_hierarchy_view; Type: VIEW; Schema: public; Owner: dev_user
--

CREATE VIEW public.task_hierarchy_view AS
 WITH RECURSIVE task_tree AS (
         SELECT tasks.id,
            tasks.title,
            tasks.parent_id,
            tasks.path,
            tasks.depth,
            ARRAY[tasks.id] AS path_array,
            (tasks.title)::text AS path_string
           FROM public.tasks
          WHERE ((tasks.parent_id IS NULL) AND (tasks.deleted_at IS NULL))
        UNION ALL
         SELECT t.id,
            t.title,
            t.parent_id,
            t.path,
            t.depth,
            (tt.path_array || t.id),
            ((tt.path_string || ' > '::text) || (t.title)::text) AS text
           FROM (public.tasks t
             JOIN task_tree tt ON ((t.parent_id = tt.id)))
          WHERE (t.deleted_at IS NULL)
        )
 SELECT id,
    title,
    parent_id,
    path,
    depth,
    path_array,
    path_string,
    array_length(path_array, 1) AS hierarchy_level
   FROM task_tree
  ORDER BY path;


ALTER VIEW public.task_hierarchy_view OWNER TO dev_user;

--
-- Name: task_parallel_groups; Type: VIEW; Schema: public; Owner: dev_user
--

CREATE VIEW public.task_parallel_groups AS
 SELECT tr.source_task_id AS task_id,
    tr.target_task_id AS parallel_task_id,
    t1.title AS task_title,
    t2.title AS parallel_task_title,
    t1.status AS task_status,
    t2.status AS parallel_task_status,
    tr.metadata,
    tr.created_at AS relationship_created_at
   FROM ((public.task_relationships tr
     JOIN public.tasks t1 ON ((tr.source_task_id = t1.id)))
     JOIN public.tasks t2 ON ((tr.target_task_id = t2.id)))
  WHERE (((tr.relationship_type)::text = 'parallel_with'::text) AND (tr.deleted_at IS NULL) AND (t1.deleted_at IS NULL) AND (t2.deleted_at IS NULL));


ALTER VIEW public.task_parallel_groups OWNER TO dev_user;

--
-- Name: task_relationships_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.task_relationships_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.task_relationships_id_seq OWNER TO dev_user;

--
-- Name: task_relationships_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.task_relationships_id_seq OWNED BY public.task_relationships.id;


--
-- Name: task_status_config; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.task_status_config (
    status_code character varying(20) NOT NULL,
    status_name_zh character varying(50) NOT NULL,
    status_name_en character varying(50) NOT NULL,
    description text,
    progress_percentage integer DEFAULT 0,
    color_code character varying(7),
    category character varying(20) NOT NULL,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.task_status_config OWNER TO dev_user;

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
-- Name: task_time_logs; Type: TABLE; Schema: public; Owner: dev_user
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
    user_timer_task_id integer,
    created_by integer NOT NULL
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
-- Name: task_time_summary; Type: VIEW; Schema: public; Owner: dev_user
--

CREATE VIEW public.task_time_summary AS
 SELECT id,
    project_id,
    title,
    status,
    estimated_minutes,
    actual_minutes,
    start_datetime,
    due_datetime,
    time_unit_preference,
        CASE
            WHEN ((actual_minutes > 0) AND (estimated_minutes > 0)) THEN (actual_minutes - estimated_minutes)
            ELSE NULL::integer
        END AS variance_minutes,
        CASE
            WHEN ((actual_minutes > 0) AND (estimated_minutes > 0)) THEN public.calculate_estimation_accuracy(estimated_minutes, actual_minutes)
            ELSE NULL::numeric
        END AS estimation_accuracy,
    ( SELECT convert_time_unit.display_text
           FROM public.convert_time_unit(t.estimated_minutes, t.time_unit_preference, t.work_hours_per_day) convert_time_unit(value, unit, display_text)
         LIMIT 1) AS estimated_display,
    ( SELECT convert_time_unit.display_text
           FROM public.convert_time_unit(t.actual_minutes, t.time_unit_preference, t.work_hours_per_day) convert_time_unit(value, unit, display_text)
         LIMIT 1) AS actual_display,
        CASE
            WHEN (start_datetime IS NULL) THEN 'not_started'::text
            WHEN (due_datetime IS NULL) THEN 'no_deadline'::text
            WHEN ((due_datetime < now()) AND ((status)::text <> ALL (ARRAY[('completed'::character varying)::text, ('cancelled'::character varying)::text]))) THEN 'overdue'::text
            WHEN ((due_datetime <= (now() + '1 day'::interval)) AND ((status)::text <> ALL (ARRAY[('completed'::character varying)::text, ('cancelled'::character varying)::text]))) THEN 'due_soon'::text
            ELSE 'on_track'::text
        END AS time_status,
    created_at,
    updated_at
   FROM public.tasks t
  WHERE (deleted_at IS NULL);


ALTER VIEW public.task_time_summary OWNER TO dev_user;

--
-- Name: VIEW task_time_summary; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON VIEW public.task_time_summary IS '任务时间统计视图，提供完整的时间分析数据';


--
-- Name: task_updates; Type: TABLE; Schema: public; Owner: dev_user
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
    CONSTRAINT task_updates_update_type_check CHECK (((update_type)::text = ANY (ARRAY[('status'::character varying)::text, ('progress'::character varying)::text, ('notes'::character varying)::text, ('parent'::character varying)::text, ('title'::character varying)::text, ('description'::character varying)::text, ('assignee'::character varying)::text, ('due_date'::character varying)::text, ('custom_fields'::character varying)::text])))
);


ALTER TABLE public.task_updates OWNER TO dev_user;

--
-- Name: task_updates_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.task_updates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.task_updates_id_seq OWNER TO dev_user;

--
-- Name: task_updates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.task_updates_id_seq OWNED BY public.task_updates.id;


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
-- Name: time_estimation_history; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.time_estimation_history (
    id integer NOT NULL,
    task_id integer NOT NULL,
    estimated_minutes integer NOT NULL,
    actual_minutes integer,
    estimation_method character varying(20) DEFAULT 'manual'::character varying,
    estimation_accuracy numeric(5,2),
    variance_percent numeric(6,2),
    estimated_by integer,
    template_id integer,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT check_estimation_method CHECK (((estimation_method)::text = ANY (ARRAY[('manual'::character varying)::text, ('template'::character varying)::text, ('ai_assisted'::character varying)::text, ('historical'::character varying)::text])))
);


ALTER TABLE public.time_estimation_history OWNER TO dev_user;

--
-- Name: TABLE time_estimation_history; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON TABLE public.time_estimation_history IS '时间估算历史表，追踪估算准确性';


--
-- Name: time_estimation_history_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.time_estimation_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.time_estimation_history_id_seq OWNER TO dev_user;

--
-- Name: time_estimation_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.time_estimation_history_id_seq OWNED BY public.time_estimation_history.id;


--
-- Name: time_estimation_templates; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.time_estimation_templates (
    id integer NOT NULL,
    template_name character varying(100) NOT NULL,
    task_type character varying(50),
    complexity_level character varying(20) DEFAULT 'medium'::character varying,
    base_minutes integer NOT NULL,
    multiplier_factor numeric(4,2) DEFAULT 1.0,
    min_minutes integer,
    max_minutes integer,
    description text,
    tags jsonb DEFAULT '[]'::jsonb,
    usage_count integer DEFAULT 0,
    accuracy_rating numeric(3,2) DEFAULT 0.0,
    created_by integer,
    is_global boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT check_accuracy_rating CHECK (((accuracy_rating >= 0.0) AND (accuracy_rating <= 5.0))),
    CONSTRAINT check_complexity_level CHECK (((complexity_level)::text = ANY (ARRAY[('simple'::character varying)::text, ('medium'::character varying)::text, ('complex'::character varying)::text, ('expert'::character varying)::text]))),
    CONSTRAINT check_time_bounds CHECK (((min_minutes IS NULL) OR (max_minutes IS NULL) OR (min_minutes <= max_minutes)))
);


ALTER TABLE public.time_estimation_templates OWNER TO dev_user;

--
-- Name: TABLE time_estimation_templates; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON TABLE public.time_estimation_templates IS '时间估算模板表，用于AI辅助时间估算';


--
-- Name: time_estimation_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.time_estimation_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.time_estimation_templates_id_seq OWNER TO dev_user;

--
-- Name: time_estimation_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.time_estimation_templates_id_seq OWNED BY public.time_estimation_templates.id;


--
-- Name: time_unit_configs; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.time_unit_configs (
    id integer NOT NULL,
    unit_code character varying(15) NOT NULL,
    unit_name_en character varying(20) NOT NULL,
    unit_name_zh character varying(20) NOT NULL,
    minutes_per_unit integer NOT NULL,
    display_precision integer DEFAULT 1,
    is_work_time boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.time_unit_configs OWNER TO dev_user;

--
-- Name: TABLE time_unit_configs; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON TABLE public.time_unit_configs IS '时间单位配置表，支持灵活的时间单位管理';


--
-- Name: time_unit_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.time_unit_configs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.time_unit_configs_id_seq OWNER TO dev_user;

--
-- Name: time_unit_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.time_unit_configs_id_seq OWNED BY public.time_unit_configs.id;


--
-- Name: timeline_events; Type: TABLE; Schema: public; Owner: dev_user
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


ALTER TABLE public.timeline_events OWNER TO dev_user;

--
-- Name: timeline_events_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.timeline_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.timeline_events_id_seq OWNER TO dev_user;

--
-- Name: timeline_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.timeline_events_id_seq OWNED BY public.timeline_events.id;


--
-- Name: timer_templates; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.timer_templates (
    id integer NOT NULL,
    user_id integer NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    target_type character varying(20) NOT NULL,
    default_title character varying(500),
    default_category character varying(100),
    default_duration_minutes integer,
    default_tags text[] DEFAULT '{}'::text[],
    default_metadata jsonb DEFAULT '{}'::jsonb,
    auto_start boolean DEFAULT false,
    auto_break_reminder boolean DEFAULT false,
    break_duration_minutes integer DEFAULT 5,
    daily_limit_hours integer,
    usage_count integer DEFAULT 0,
    last_used_at timestamp with time zone,
    is_system_template boolean DEFAULT false,
    is_shared boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT timer_templates_target_type_check CHECK (((target_type)::text = ANY (ARRAY[('project_task'::character varying)::text, ('personal_task'::character varying)::text, ('quick_timer'::character varying)::text, ('pomodoro'::character varying)::text])))
);


ALTER TABLE public.timer_templates OWNER TO dev_user;

--
-- Name: TABLE timer_templates; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON TABLE public.timer_templates IS '计时模板表 - 用户自定义和系统预设的计时模板';


--
-- Name: timer_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.timer_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.timer_templates_id_seq OWNER TO dev_user;

--
-- Name: timer_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.timer_templates_id_seq OWNED BY public.timer_templates.id;


--
-- Name: unified_timer_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.unified_timer_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.unified_timer_logs_id_seq OWNER TO dev_user;

--
-- Name: unified_timer_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.unified_timer_logs_id_seq OWNED BY public.unified_timer_logs.id;


--
-- Name: user_activity_stats_view; Type: VIEW; Schema: public; Owner: dev_user
--

CREATE VIEW public.user_activity_stats_view AS
 SELECT u.id AS user_id,
    u.username,
    u.email,
    u.user_type,
    u.role,
    u.status,
    u.last_login_at,
    u.created_at,
    COALESCE(task_stats.assigned_tasks, (0)::bigint) AS assigned_tasks,
    COALESCE(task_stats.completed_tasks, (0)::bigint) AS completed_tasks,
    COALESCE(task_stats.in_progress_tasks, (0)::bigint) AS in_progress_tasks,
    COALESCE(timer_stats.total_time_minutes, (0)::numeric) AS total_time_minutes,
    COALESCE(timer_stats.active_sessions, (0)::bigint) AS active_timer_sessions,
        CASE
            WHEN (u.last_login_at >= (now() - '1 day'::interval)) THEN 'today'::text
            WHEN (u.last_login_at >= (now() - '7 days'::interval)) THEN 'this_week'::text
            WHEN (u.last_login_at >= (now() - '30 days'::interval)) THEN 'this_month'::text
            WHEN (u.last_login_at IS NOT NULL) THEN 'older'::text
            ELSE 'never'::text
        END AS login_activity
   FROM ((public.users u
     LEFT JOIN ( SELECT tasks.assignee_id,
            count(*) AS assigned_tasks,
            count(
                CASE
                    WHEN ((tasks.status)::text = 'completed'::text) THEN 1
                    ELSE NULL::integer
                END) AS completed_tasks,
            count(
                CASE
                    WHEN ((tasks.status)::text = 'in_progress'::text) THEN 1
                    ELSE NULL::integer
                END) AS in_progress_tasks
           FROM public.tasks
          WHERE ((tasks.assignee_id IS NOT NULL) AND (tasks.deleted_at IS NULL))
          GROUP BY tasks.assignee_id) task_stats ON ((u.id = task_stats.assignee_id)))
     LEFT JOIN ( SELECT task_time_logs.user_id,
            sum((EXTRACT(epoch FROM (task_time_logs.end_time - task_time_logs.start_time)) / (60)::numeric)) AS total_time_minutes,
            count(
                CASE
                    WHEN (task_time_logs.end_time IS NULL) THEN 1
                    ELSE NULL::integer
                END) AS active_sessions
           FROM public.task_time_logs
          WHERE (task_time_logs.user_id IS NOT NULL)
          GROUP BY task_time_logs.user_id) timer_stats ON ((u.id = timer_stats.user_id)))
  WHERE ((u.status)::text <> 'deleted'::text);


ALTER VIEW public.user_activity_stats_view OWNER TO dev_user;

--
-- Name: VIEW user_activity_stats_view; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON VIEW public.user_activity_stats_view IS '用户活动统计视图：包含任务分配、完成情况和登录活跃度（已修复列名）';


--
-- Name: user_basic_stats_view; Type: VIEW; Schema: public; Owner: dev_user
--

CREATE VIEW public.user_basic_stats_view AS
 SELECT count(*) AS total_users,
    count(
        CASE
            WHEN ((status)::text = 'active'::text) THEN 1
            ELSE NULL::integer
        END) AS active_users,
    count(
        CASE
            WHEN ((status)::text = 'inactive'::text) THEN 1
            ELSE NULL::integer
        END) AS inactive_users,
    count(
        CASE
            WHEN ((status)::text = 'suspended'::text) THEN 1
            ELSE NULL::integer
        END) AS suspended_users,
    count(
        CASE
            WHEN ((user_type)::text = 'system'::text) THEN 1
            ELSE NULL::integer
        END) AS system_users,
    count(
        CASE
            WHEN ((user_type)::text = 'company'::text) THEN 1
            ELSE NULL::integer
        END) AS company_users,
    count(
        CASE
            WHEN ((last_login_at IS NOT NULL) AND (last_login_at >= (now() - '7 days'::interval))) THEN 1
            ELSE NULL::integer
        END) AS active_last_week,
    count(
        CASE
            WHEN ((last_login_at IS NOT NULL) AND (last_login_at >= (now() - '30 days'::interval))) THEN 1
            ELSE NULL::integer
        END) AS active_last_month,
    count(
        CASE
            WHEN (created_at >= (now() - '7 days'::interval)) THEN 1
            ELSE NULL::integer
        END) AS new_registrations_week,
    count(
        CASE
            WHEN (created_at >= (now() - '30 days'::interval)) THEN 1
            ELSE NULL::integer
        END) AS new_registrations_month
   FROM public.users;


ALTER VIEW public.user_basic_stats_view OWNER TO dev_user;

--
-- Name: VIEW user_basic_stats_view; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON VIEW public.user_basic_stats_view IS '基础用户统计视图：总数、状态分布、活跃度统计';


--
-- Name: user_company_stats_view; Type: VIEW; Schema: public; Owner: dev_user
--

CREATE VIEW public.user_company_stats_view AS
 SELECT c.id AS company_id,
    c.company_name,
    c.company_code,
    count(u.id) AS total_company_users,
    count(
        CASE
            WHEN ((u.status)::text = 'active'::text) THEN 1
            ELSE NULL::integer
        END) AS active_company_users,
    count(
        CASE
            WHEN (u.is_primary_contact = true) THEN 1
            ELSE NULL::integer
        END) AS primary_contacts,
    count(
        CASE
            WHEN (u.last_login_at >= (now() - '30 days'::interval)) THEN 1
            ELSE NULL::integer
        END) AS recently_active_users,
    count(
        CASE
            WHEN ((u.account_expires_at IS NOT NULL) AND (u.account_expires_at <= (now() + '30 days'::interval))) THEN 1
            ELSE NULL::integer
        END) AS expiring_accounts,
    min(u.created_at) AS first_user_created,
    max(u.last_login_at) AS last_company_activity
   FROM (public.companies c
     LEFT JOIN public.users u ON (((c.id = u.company_id) AND ((u.user_type)::text = 'company'::text))))
  WHERE (c.deleted_at IS NULL)
  GROUP BY c.id, c.company_name, c.company_code
 HAVING (count(u.id) > 0)
  ORDER BY (count(u.id)) DESC;


ALTER VIEW public.user_company_stats_view OWNER TO dev_user;

--
-- Name: VIEW user_company_stats_view; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON VIEW public.user_company_stats_view IS '企业用户统计视图：按公司分组的用户统计信息';


--
-- Name: user_document_access; Type: VIEW; Schema: public; Owner: dev_user
--

CREATE VIEW public.user_document_access AS
 SELECT d.id AS document_id,
    d.title,
    d.type,
    d.status,
    d.project_id,
    d.customer_id,
    d.owner_id,
    d.visibility,
    d.created_at,
    d.updated_at,
    u.id AS user_id,
    u.username,
    u.role,
        CASE
            WHEN (d.owner_id = u.id) THEN 'owner'::text
            WHEN ((u.role)::text = 'admin'::text) THEN 'admin'::text
            WHEN ((d.project_id IS NOT NULL) AND (EXISTS ( SELECT 1
               FROM public.project_users pu
              WHERE ((pu.project_id = d.project_id) AND (pu.user_id = u.id))))) THEN 'project_member'::text
            WHEN ((d.customer_id IS NOT NULL) AND (u.company_id = d.customer_id)) THEN 'customer_member'::text
            WHEN ((d.visibility)::text = 'public'::text) THEN 'public_reader'::text
            WHEN (u.id = ANY (d.shared_with)) THEN 'shared_reader'::text
            ELSE 'no_access'::text
        END AS access_level
   FROM (public.documents d
     CROSS JOIN public.users u)
  WHERE (d.deleted_at IS NULL);


ALTER VIEW public.user_document_access OWNER TO dev_user;

--
-- Name: user_effective_permissions; Type: VIEW; Schema: public; Owner: dev_user
--

CREATE VIEW public.user_effective_permissions AS
 SELECT DISTINCT cu.id AS user_id,
    cu.name AS user_name,
    cu.email,
    p.permission_code,
    p.permission_name,
    p.module,
    p.resource,
    p.action,
    'role'::text AS permission_source
   FROM (((public.company_users cu
     JOIN public.company_roles r ON ((cu.role_id = r.id)))
     JOIN public.role_permissions rp ON (((r.id = rp.role_id) AND (rp.is_granted = true))))
     JOIN public.permissions p ON ((rp.permission_id = p.id)))
  WHERE (((cu.status)::text = 'active'::text) AND (r.is_active = true) AND (p.is_active = true));


ALTER VIEW public.user_effective_permissions OWNER TO dev_user;

--
-- Name: user_performance_view; Type: VIEW; Schema: public; Owner: dev_user
--

CREATE VIEW public.user_performance_view AS
 SELECT u.id AS user_id,
    u.username,
    u.role,
    u.user_type,
    COALESCE(task_metrics.total_assigned, (0)::bigint) AS total_tasks_assigned,
    COALESCE(task_metrics.completed_tasks, (0)::bigint) AS completed_tasks,
    COALESCE(task_metrics.completion_rate, (0)::numeric) AS completion_percentage,
    COALESCE(time_metrics.total_hours, (0)::numeric) AS total_hours_logged,
    COALESCE(time_metrics.avg_session_hours, (0)::numeric) AS avg_session_hours,
    COALESCE(activity_metrics.days_since_login, (999)::numeric) AS days_since_last_login,
    COALESCE(activity_metrics.projects_involved, (0)::bigint) AS projects_involved
   FROM (((public.users u
     LEFT JOIN ( SELECT tasks.assignee_id,
            count(*) AS total_assigned,
            count(
                CASE
                    WHEN ((tasks.status)::text = 'completed'::text) THEN 1
                    ELSE NULL::integer
                END) AS completed_tasks,
            round((((count(
                CASE
                    WHEN ((tasks.status)::text = 'completed'::text) THEN 1
                    ELSE NULL::integer
                END))::numeric * 100.0) / (NULLIF(count(*), 0))::numeric), 2) AS completion_rate
           FROM public.tasks
          WHERE ((tasks.assignee_id IS NOT NULL) AND (tasks.deleted_at IS NULL))
          GROUP BY tasks.assignee_id) task_metrics ON ((u.id = task_metrics.assignee_id)))
     LEFT JOIN ( SELECT task_time_logs.user_id,
            round(sum((EXTRACT(epoch FROM (task_time_logs.end_time - task_time_logs.start_time)) / (3600)::numeric)), 2) AS total_hours,
            round(avg((EXTRACT(epoch FROM (task_time_logs.end_time - task_time_logs.start_time)) / (3600)::numeric)), 2) AS avg_session_hours
           FROM public.task_time_logs
          WHERE ((task_time_logs.end_time IS NOT NULL) AND (task_time_logs.user_id IS NOT NULL))
          GROUP BY task_time_logs.user_id) time_metrics ON ((u.id = time_metrics.user_id)))
     LEFT JOIN ( SELECT u_1.id AS user_id,
            EXTRACT(days FROM (now() - u_1.last_login_at)) AS days_since_login,
            count(DISTINCT t.project_id) AS projects_involved
           FROM (public.users u_1
             LEFT JOIN public.tasks t ON (((u_1.id = t.assignee_id) AND (t.deleted_at IS NULL))))
          GROUP BY u_1.id, u_1.last_login_at) activity_metrics ON ((u.id = activity_metrics.user_id)))
  WHERE ((u.status)::text = 'active'::text);


ALTER VIEW public.user_performance_view OWNER TO dev_user;

--
-- Name: VIEW user_performance_view; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON VIEW public.user_performance_view IS '用户绩效统计视图：任务完成率、工时统计等绩效指标（已修复列名）';


--
-- Name: user_registration_trends_view; Type: VIEW; Schema: public; Owner: dev_user
--

CREATE VIEW public.user_registration_trends_view AS
 SELECT date_trunc('week'::text, created_at) AS week_start,
    count(*) AS registrations,
    count(
        CASE
            WHEN ((user_type)::text = 'system'::text) THEN 1
            ELSE NULL::integer
        END) AS system_registrations,
    count(
        CASE
            WHEN ((user_type)::text = 'company'::text) THEN 1
            ELSE NULL::integer
        END) AS company_registrations,
    sum(count(*)) OVER (ORDER BY (date_trunc('week'::text, created_at))) AS cumulative_total
   FROM public.users
  WHERE (created_at >= (now() - '3 mons'::interval))
  GROUP BY (date_trunc('week'::text, created_at))
  ORDER BY (date_trunc('week'::text, created_at)) DESC;


ALTER VIEW public.user_registration_trends_view OWNER TO dev_user;

--
-- Name: VIEW user_registration_trends_view; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON VIEW public.user_registration_trends_view IS '用户注册趋势视图：按周统计的注册数量趋势';


--
-- Name: user_role_stats_view; Type: VIEW; Schema: public; Owner: dev_user
--

CREATE VIEW public.user_role_stats_view AS
 SELECT role,
    user_type,
    count(*) AS user_count,
    count(
        CASE
            WHEN ((status)::text = 'active'::text) THEN 1
            ELSE NULL::integer
        END) AS active_count,
    count(
        CASE
            WHEN (last_login_at >= (now() - '30 days'::interval)) THEN 1
            ELSE NULL::integer
        END) AS recently_active
   FROM public.users
  WHERE ((status)::text <> 'deleted'::text)
  GROUP BY role, user_type
  ORDER BY user_type, role;


ALTER VIEW public.user_role_stats_view OWNER TO dev_user;

--
-- Name: VIEW user_role_stats_view; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON VIEW public.user_role_stats_view IS '用户角色分布统计视图：按角色和类型分组的用户数量';


--
-- Name: user_stats; Type: VIEW; Schema: public; Owner: dev_user
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


ALTER VIEW public.user_stats OWNER TO dev_user;

--
-- Name: user_task_assignments; Type: VIEW; Schema: public; Owner: dev_user
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


ALTER VIEW public.user_task_assignments OWNER TO dev_user;

--
-- Name: user_timer_preferences; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.user_timer_preferences (
    user_id integer NOT NULL,
    default_category character varying(100) DEFAULT '工作'::character varying,
    auto_pause_on_idle boolean DEFAULT true,
    idle_threshold_minutes integer DEFAULT 5,
    auto_stop_on_completion boolean DEFAULT false,
    pomodoro_work_minutes integer DEFAULT 25,
    pomodoro_short_break_minutes integer DEFAULT 5,
    pomodoro_long_break_minutes integer DEFAULT 15,
    pomodoro_cycles_before_long_break integer DEFAULT 4,
    notification_enabled boolean DEFAULT true,
    sound_enabled boolean DEFAULT true,
    notification_minutes_before_end integer DEFAULT 5,
    daily_goal_hours numeric(4,2) DEFAULT 8.0,
    weekly_goal_hours numeric(5,2) DEFAULT 40.0,
    preferred_timer_view character varying(20) DEFAULT 'normal'::character varying,
    preferred_theme character varying(10) DEFAULT 'auto'::character varying,
    show_seconds boolean DEFAULT true,
    show_progress_bar boolean DEFAULT true,
    enable_auto_inference boolean DEFAULT true,
    inference_feedback_frequency character varying(20) DEFAULT 'sometimes'::character varying,
    learning_mode boolean DEFAULT true,
    share_anonymous_data boolean DEFAULT false,
    backup_enabled boolean DEFAULT true,
    data_retention_days integer DEFAULT 365,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_timer_preferences_inference_feedback_frequency_check CHECK (((inference_feedback_frequency)::text = ANY (ARRAY[('always'::character varying)::text, ('sometimes'::character varying)::text, ('never'::character varying)::text]))),
    CONSTRAINT user_timer_preferences_preferred_theme_check CHECK (((preferred_theme)::text = ANY (ARRAY[('light'::character varying)::text, ('dark'::character varying)::text, ('auto'::character varying)::text]))),
    CONSTRAINT user_timer_preferences_preferred_timer_view_check CHECK (((preferred_timer_view)::text = ANY (ARRAY[('compact'::character varying)::text, ('normal'::character varying)::text, ('expanded'::character varying)::text])))
);


ALTER TABLE public.user_timer_preferences OWNER TO dev_user;

--
-- Name: TABLE user_timer_preferences; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON TABLE public.user_timer_preferences IS '用户计时偏好设置表';


--
-- Name: user_timer_stats; Type: VIEW; Schema: public; Owner: dev_user
--

CREATE VIEW public.user_timer_stats AS
 SELECT user_id,
    date_trunc('day'::text, start_time) AS date,
    target_type,
    category,
    count(*) AS session_count,
    sum(duration_seconds) AS total_seconds,
    sum(actual_work_seconds) AS actual_work_seconds,
    avg(duration_seconds) AS avg_duration_seconds,
    avg(actual_work_seconds) AS avg_work_seconds,
    sum(
        CASE
            WHEN ((status)::text = 'completed'::text) THEN 1
            ELSE 0
        END) AS completed_sessions,
    sum(
        CASE
            WHEN ((status)::text = 'cancelled'::text) THEN 1
            ELSE 0
        END) AS cancelled_sessions,
    avg(pause_count) AS avg_pause_count,
    avg(
        CASE
            WHEN (duration_seconds > 0) THEN (((actual_work_seconds)::numeric / (duration_seconds)::numeric) * (100)::numeric)
            ELSE (0)::numeric
        END) AS efficiency_percentage
   FROM public.unified_timer_logs utl
  WHERE ((start_time >= (CURRENT_DATE - '90 days'::interval)) AND (duration_seconds IS NOT NULL))
  GROUP BY user_id, (date_trunc('day'::text, start_time)), target_type, category;


ALTER VIEW public.user_timer_stats OWNER TO dev_user;

--
-- Name: VIEW user_timer_stats; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON VIEW public.user_timer_stats IS '用户计时统计视图 - 按日期、类型、分类聚合的统计数据';


--
-- Name: user_timer_tasks; Type: TABLE; Schema: public; Owner: dev_user
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
    CONSTRAINT user_timer_tasks_category_check CHECK (((category)::text = ANY (ARRAY[('personal'::character varying)::text, ('work'::character varying)::text, ('study'::character varying)::text, ('fitness'::character varying)::text, ('hobby'::character varying)::text]))),
    CONSTRAINT user_timer_tasks_priority_check CHECK (((priority)::text = ANY (ARRAY[('low'::character varying)::text, ('medium'::character varying)::text, ('high'::character varying)::text]))),
    CONSTRAINT user_timer_tasks_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('paused'::character varying)::text, ('completed'::character varying)::text, ('archived'::character varying)::text])))
);


ALTER TABLE public.user_timer_tasks OWNER TO dev_user;

--
-- Name: user_timer_tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.user_timer_tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_timer_tasks_id_seq OWNER TO dev_user;

--
-- Name: user_timer_tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.user_timer_tasks_id_seq OWNED BY public.user_timer_tasks.id;


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
-- Name: v_permission_analytics; Type: VIEW; Schema: public; Owner: dev_user
--

CREATE VIEW public.v_permission_analytics AS
 SELECT p.module,
    count(*) AS total_permissions,
    count(
        CASE
            WHEN (rp.is_granted = true) THEN 1
            ELSE NULL::integer
        END) AS granted_count,
    count(DISTINCT rp.role_id) AS roles_with_permission,
    count(DISTINCT mv.company_user_id) AS users_with_permission,
    round((((count(
        CASE
            WHEN (rp.is_granted = true) THEN 1
            ELSE NULL::integer
        END))::numeric * 100.0) / (NULLIF(count(*), 0))::numeric), 2) AS grant_percentage
   FROM ((public.permissions p
     LEFT JOIN public.role_permissions rp ON ((p.id = rp.permission_id)))
     LEFT JOIN public.mv_user_effective_permissions mv ON (((p.permission_code)::text = (mv.permission_code)::text)))
  WHERE (p.is_active = true)
  GROUP BY p.module
  ORDER BY (count(*)) DESC;


ALTER VIEW public.v_permission_analytics OWNER TO dev_user;

--
-- Name: v_project_user_permissions; Type: VIEW; Schema: public; Owner: dev_user
--

CREATE VIEW public.v_project_user_permissions AS
 SELECT cupp.id,
    cupp.company_user_id,
    cu.name AS user_name,
    cu.email AS user_email,
    cupp.project_id,
    cupp.can_view_project,
    cupp.can_edit_project,
    cupp.can_delete_project,
    cupp.can_manage_tasks,
    cupp.can_view_financials,
    cupp.can_manage_members,
    cupp.permission_start_date,
    cupp.permission_end_date,
        CASE
            WHEN ((cupp.permission_end_date IS NULL) OR (cupp.permission_end_date > CURRENT_TIMESTAMP)) THEN true
            ELSE false
        END AS is_active
   FROM (public.company_user_project_permissions cupp
     JOIN public.company_users cu ON ((cupp.company_user_id = cu.id)))
  WHERE ((cu.status)::text = 'active'::text);


ALTER VIEW public.v_project_user_permissions OWNER TO dev_user;

--
-- Name: v_role_permission_summary; Type: VIEW; Schema: public; Owner: dev_user
--

CREATE VIEW public.v_role_permission_summary AS
 SELECT cr.id AS role_id,
    cr.role_code,
    cr.role_name,
    cr.role_description,
    count(p.id) AS total_permissions,
    count(
        CASE
            WHEN (rp.is_granted = true) THEN 1
            ELSE NULL::integer
        END) AS granted_permissions,
    count(
        CASE
            WHEN (rp.is_granted = false) THEN 1
            ELSE NULL::integer
        END) AS denied_permissions,
    array_agg(DISTINCT p.module ORDER BY p.module) AS modules,
    array_agg(p.permission_code ORDER BY p.permission_code) FILTER (WHERE (rp.is_granted = true)) AS granted_permission_codes
   FROM ((public.company_roles cr
     LEFT JOIN public.role_permissions rp ON ((cr.id = rp.role_id)))
     LEFT JOIN public.permissions p ON (((rp.permission_id = p.id) AND (p.is_active = true))))
  WHERE (cr.is_active = true)
  GROUP BY cr.id, cr.role_code, cr.role_name, cr.role_description;


ALTER VIEW public.v_role_permission_summary OWNER TO dev_user;

--
-- Name: v_system_role_permissions; Type: VIEW; Schema: public; Owner: dev_user
--

CREATE VIEW public.v_system_role_permissions AS
 SELECT r.id AS role_id,
    r.role_code,
    r.role_name,
    r.role_description,
    count(rp.permission_id) AS permission_count,
    r.is_system_role,
    r.is_active,
    r.created_at,
    r.updated_at
   FROM (public.company_roles r
     LEFT JOIN public.role_permissions rp ON (((r.id = rp.role_id) AND (rp.is_granted = true))))
  WHERE (r.is_system_role = true)
  GROUP BY r.id, r.role_code, r.role_name, r.role_description, r.is_system_role, r.is_active, r.created_at, r.updated_at
  ORDER BY r.role_code;


ALTER VIEW public.v_system_role_permissions OWNER TO dev_user;

--
-- Name: v_user_permissions; Type: VIEW; Schema: public; Owner: dev_user
--

CREATE VIEW public.v_user_permissions AS
 SELECT cu.id AS user_id,
    cu.name AS user_name,
    cu.email AS user_email,
    cu.status AS user_status,
    cr.role_code,
    cr.role_name,
    p.permission_code,
    p.permission_name,
    p.module,
    p.resource,
    p.action,
    rp.is_granted AS role_granted,
        CASE
            WHEN (cu.custom_permissions ? (p.permission_code)::text) THEN ((cu.custom_permissions ->> (p.permission_code)::text))::boolean
            ELSE NULL::boolean
        END AS custom_override,
        CASE
            WHEN (cu.custom_permissions ? (p.permission_code)::text) THEN ((cu.custom_permissions ->> (p.permission_code)::text))::boolean
            ELSE rp.is_granted
        END AS effective_permission
   FROM (((public.company_users cu
     LEFT JOIN public.company_roles cr ON ((cu.role_id = cr.id)))
     LEFT JOIN public.role_permissions rp ON (((cr.id = rp.role_id) AND (rp.is_granted = true))))
     LEFT JOIN public.permissions p ON ((rp.permission_id = p.id)))
  WHERE (((cu.status)::text = 'active'::text) AND (cr.is_active = true) AND (p.is_active = true));


ALTER VIEW public.v_user_permissions OWNER TO dev_user;

--
-- Name: work_note_folders; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.work_note_folders (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    parent_id integer,
    owner_id integer NOT NULL,
    project_id integer,
    visibility character varying(20) DEFAULT 'private'::character varying NOT NULL,
    color character varying(7),
    icon character varying(50),
    sort_order integer DEFAULT 0 NOT NULL,
    created_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT work_note_folders_name_not_empty CHECK ((length(TRIM(BOTH FROM name)) > 0)),
    CONSTRAINT work_note_folders_visibility_check CHECK (((visibility)::text = ANY ((ARRAY['private'::character varying, 'team'::character varying, 'public'::character varying])::text[]))),
    CONSTRAINT work_note_folders_visibility_valid CHECK (((visibility)::text = ANY ((ARRAY['private'::character varying, 'team'::character varying, 'public'::character varying])::text[])))
);


ALTER TABLE public.work_note_folders OWNER TO dev_user;

--
-- Name: work_note_folders_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.work_note_folders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.work_note_folders_id_seq OWNER TO dev_user;

--
-- Name: work_note_folders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.work_note_folders_id_seq OWNED BY public.work_note_folders.id;


--
-- Name: work_note_task_relations; Type: TABLE; Schema: public; Owner: dev_user
--

CREATE TABLE public.work_note_task_relations (
    id integer NOT NULL,
    work_note_id integer NOT NULL,
    task_id integer NOT NULL,
    relation_type character varying(50) DEFAULT 'reference'::character varying,
    created_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone
);


ALTER TABLE public.work_note_task_relations OWNER TO dev_user;

--
-- Name: TABLE work_note_task_relations; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON TABLE public.work_note_task_relations IS '工作笔记与任务关联关系表';


--
-- Name: COLUMN work_note_task_relations.work_note_id; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.work_note_task_relations.work_note_id IS '工作笔记ID（引用documents表）';


--
-- Name: COLUMN work_note_task_relations.task_id; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.work_note_task_relations.task_id IS '任务ID';


--
-- Name: COLUMN work_note_task_relations.relation_type; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.work_note_task_relations.relation_type IS '关联类型：reference(引用), attached(附加), mentioned(提及), related(相关)';


--
-- Name: COLUMN work_note_task_relations.created_by; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON COLUMN public.work_note_task_relations.created_by IS '创建关联的用户ID';


--
-- Name: work_note_task_relations_id_seq; Type: SEQUENCE; Schema: public; Owner: dev_user
--

CREATE SEQUENCE public.work_note_task_relations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.work_note_task_relations_id_seq OWNER TO dev_user;

--
-- Name: work_note_task_relations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: dev_user
--

ALTER SEQUENCE public.work_note_task_relations_id_seq OWNED BY public.work_note_task_relations.id;


--
-- Name: ai_configs id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.ai_configs ALTER COLUMN id SET DEFAULT nextval('public.ai_configs_id_seq'::regclass);


--
-- Name: ai_usage_stats id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.ai_usage_stats ALTER COLUMN id SET DEFAULT nextval('public.ai_usage_stats_id_seq'::regclass);


--
-- Name: api_keys id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.api_keys ALTER COLUMN id SET DEFAULT nextval('public.api_keys_id_seq'::regclass);


--
-- Name: api_quota_stats id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.api_quota_stats ALTER COLUMN id SET DEFAULT nextval('public.api_quota_stats_id_seq'::regclass);


--
-- Name: api_usage_logs id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.api_usage_logs ALTER COLUMN id SET DEFAULT nextval('public.api_usage_logs_id_seq'::regclass);


--
-- Name: audit_configs id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.audit_configs ALTER COLUMN id SET DEFAULT nextval('public.audit_configs_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: companies id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.companies ALTER COLUMN id SET DEFAULT nextval('public.companies_id_seq'::regclass);


--
-- Name: company_departments id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.company_departments ALTER COLUMN id SET DEFAULT nextval('public.company_departments_id_seq'::regclass);


--
-- Name: company_roles id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.company_roles ALTER COLUMN id SET DEFAULT nextval('public.company_roles_id_seq'::regclass);


--
-- Name: company_user_project_permissions id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.company_user_project_permissions ALTER COLUMN id SET DEFAULT nextval('public.company_user_project_permissions_id_seq'::regclass);


--
-- Name: company_users id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.company_users ALTER COLUMN id SET DEFAULT nextval('public.company_users_id_seq'::regclass);


--
-- Name: customer_contacts id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.customer_contacts ALTER COLUMN id SET DEFAULT nextval('public.customer_contacts_id_seq'::regclass);


--
-- Name: customer_users id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.customer_users ALTER COLUMN id SET DEFAULT nextval('public.customer_users_id_seq'::regclass);


--
-- Name: customers id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.customers ALTER COLUMN id SET DEFAULT nextval('public.customers_id_seq'::regclass);


--
-- Name: document_folders id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.document_folders ALTER COLUMN id SET DEFAULT nextval('public.document_folders_id_seq'::regclass);


--
-- Name: document_versions id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.document_versions ALTER COLUMN id SET DEFAULT nextval('public.document_versions_id_seq'::regclass);


--
-- Name: documents id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.documents ALTER COLUMN id SET DEFAULT nextval('public.documents_id_seq'::regclass);


--
-- Name: encryption_keys id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.encryption_keys ALTER COLUMN id SET DEFAULT nextval('public.encryption_keys_id_seq'::regclass);


--
-- Name: enterprise_departments id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.enterprise_departments ALTER COLUMN id SET DEFAULT nextval('public.enterprise_departments_id_seq'::regclass);


--
-- Name: enterprise_users id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.enterprise_users ALTER COLUMN id SET DEFAULT nextval('public.enterprise_users_id_seq'::regclass);


--
-- Name: enterprises id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.enterprises ALTER COLUMN id SET DEFAULT nextval('public.enterprises_id_seq'::regclass);


--
-- Name: permission_audit_logs id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.permission_audit_logs ALTER COLUMN id SET DEFAULT nextval('public.permission_audit_logs_id_seq'::regclass);


--
-- Name: permission_cache id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.permission_cache ALTER COLUMN id SET DEFAULT nextval('public.permission_cache_id_seq'::regclass);


--
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- Name: progress_config id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.progress_config ALTER COLUMN id SET DEFAULT nextval('public.progress_config_id_seq'::regclass);


--
-- Name: progress_snapshots id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.progress_snapshots ALTER COLUMN id SET DEFAULT nextval('public.progress_snapshots_id_seq'::regclass);


--
-- Name: project_companies id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.project_companies ALTER COLUMN id SET DEFAULT nextval('public.project_companies_id_seq'::regclass);


--
-- Name: project_users id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.project_users ALTER COLUMN id SET DEFAULT nextval('public.project_users_id_seq'::regclass);


--
-- Name: projects id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.projects ALTER COLUMN id SET DEFAULT nextval('public.projects_id_seq'::regclass);


--
-- Name: role_permissions id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.role_permissions ALTER COLUMN id SET DEFAULT nextval('public.role_permissions_id_seq'::regclass);


--
-- Name: schema_migrations id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.schema_migrations ALTER COLUMN id SET DEFAULT nextval('public.schema_migrations_id_seq'::regclass);


--
-- Name: system_audit_log id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.system_audit_log ALTER COLUMN id SET DEFAULT nextval('public.system_audit_log_id_seq'::regclass);


--
-- Name: system_users id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.system_users ALTER COLUMN id SET DEFAULT nextval('public.system_users_id_seq'::regclass);


--
-- Name: task_documents id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.task_documents ALTER COLUMN id SET DEFAULT nextval('public.task_documents_id_seq'::regclass);


--
-- Name: task_relationships id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.task_relationships ALTER COLUMN id SET DEFAULT nextval('public.task_relationships_id_seq'::regclass);


--
-- Name: task_status_history id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.task_status_history ALTER COLUMN id SET DEFAULT nextval('public.task_status_history_id_seq'::regclass);


--
-- Name: task_time_logs id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.task_time_logs ALTER COLUMN id SET DEFAULT nextval('public.task_time_logs_id_seq'::regclass);


--
-- Name: task_updates id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.task_updates ALTER COLUMN id SET DEFAULT nextval('public.task_updates_id_seq'::regclass);


--
-- Name: tasks id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.tasks ALTER COLUMN id SET DEFAULT nextval('public.tasks_id_seq'::regclass);


--
-- Name: time_estimation_history id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.time_estimation_history ALTER COLUMN id SET DEFAULT nextval('public.time_estimation_history_id_seq'::regclass);


--
-- Name: time_estimation_templates id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.time_estimation_templates ALTER COLUMN id SET DEFAULT nextval('public.time_estimation_templates_id_seq'::regclass);


--
-- Name: time_unit_configs id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.time_unit_configs ALTER COLUMN id SET DEFAULT nextval('public.time_unit_configs_id_seq'::regclass);


--
-- Name: timeline_events id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.timeline_events ALTER COLUMN id SET DEFAULT nextval('public.timeline_events_id_seq'::regclass);


--
-- Name: timer_templates id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.timer_templates ALTER COLUMN id SET DEFAULT nextval('public.timer_templates_id_seq'::regclass);


--
-- Name: unified_timer_logs id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.unified_timer_logs ALTER COLUMN id SET DEFAULT nextval('public.unified_timer_logs_id_seq'::regclass);


--
-- Name: user_timer_tasks id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.user_timer_tasks ALTER COLUMN id SET DEFAULT nextval('public.user_timer_tasks_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: work_note_folders id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.work_note_folders ALTER COLUMN id SET DEFAULT nextval('public.work_note_folders_id_seq'::regclass);


--
-- Name: work_note_task_relations id; Type: DEFAULT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.work_note_task_relations ALTER COLUMN id SET DEFAULT nextval('public.work_note_task_relations_id_seq'::regclass);


--
-- Name: ai_configs ai_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.ai_configs
    ADD CONSTRAINT ai_configs_pkey PRIMARY KEY (id);


--
-- Name: ai_configs ai_configs_provider_key; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.ai_configs
    ADD CONSTRAINT ai_configs_provider_key UNIQUE (provider);


--
-- Name: ai_usage_stats ai_usage_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.ai_usage_stats
    ADD CONSTRAINT ai_usage_stats_pkey PRIMARY KEY (id);


--
-- Name: api_keys api_keys_key_hash_key; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_key_hash_key UNIQUE (key_hash);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: api_quota_stats api_quota_stats_api_key_id_stat_date_stat_hour_key; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.api_quota_stats
    ADD CONSTRAINT api_quota_stats_api_key_id_stat_date_stat_hour_key UNIQUE (api_key_id, stat_date, stat_hour);


--
-- Name: api_quota_stats api_quota_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.api_quota_stats
    ADD CONSTRAINT api_quota_stats_pkey PRIMARY KEY (id);


--
-- Name: api_usage_logs api_usage_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.api_usage_logs
    ADD CONSTRAINT api_usage_logs_pkey PRIMARY KEY (id);


--
-- Name: audit_configs audit_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.audit_configs
    ADD CONSTRAINT audit_configs_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_event_id_key; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_event_id_key UNIQUE (event_id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: company_departments company_departments_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.company_departments
    ADD CONSTRAINT company_departments_pkey PRIMARY KEY (id);


--
-- Name: company_roles company_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.company_roles
    ADD CONSTRAINT company_roles_pkey PRIMARY KEY (id);


--
-- Name: company_roles company_roles_role_code_key; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.company_roles
    ADD CONSTRAINT company_roles_role_code_key UNIQUE (role_code);


--
-- Name: company_user_project_permissions company_user_project_permissions_company_user_id_project_id_key; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.company_user_project_permissions
    ADD CONSTRAINT company_user_project_permissions_company_user_id_project_id_key UNIQUE (company_user_id, project_id);


--
-- Name: company_user_project_permissions company_user_project_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.company_user_project_permissions
    ADD CONSTRAINT company_user_project_permissions_pkey PRIMARY KEY (id);


--
-- Name: company_users company_users_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.company_users
    ADD CONSTRAINT company_users_pkey PRIMARY KEY (id);


--
-- Name: customer_contacts customer_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.customer_contacts
    ADD CONSTRAINT customer_contacts_pkey PRIMARY KEY (id);


--
-- Name: customer_users customer_users_customer_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.customer_users
    ADD CONSTRAINT customer_users_customer_id_user_id_key UNIQUE (customer_id, user_id);


--
-- Name: customer_users customer_users_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.customer_users
    ADD CONSTRAINT customer_users_pkey PRIMARY KEY (id);


--
-- Name: customers customers_company_code_key; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_company_code_key UNIQUE (company_code);


--
-- Name: customers customers_company_name_key; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_company_name_key UNIQUE (company_name);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: document_folders document_folders_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.document_folders
    ADD CONSTRAINT document_folders_pkey PRIMARY KEY (id);


--
-- Name: document_versions document_versions_document_id_version_number_key; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_document_id_version_number_key UNIQUE (document_id, version_number);


--
-- Name: document_versions document_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


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
-- Name: enterprise_departments enterprise_departments_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.enterprise_departments
    ADD CONSTRAINT enterprise_departments_pkey PRIMARY KEY (id);


--
-- Name: enterprise_users enterprise_users_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.enterprise_users
    ADD CONSTRAINT enterprise_users_pkey PRIMARY KEY (id);


--
-- Name: enterprises enterprises_code_key; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.enterprises
    ADD CONSTRAINT enterprises_code_key UNIQUE (code);


--
-- Name: enterprises enterprises_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.enterprises
    ADD CONSTRAINT enterprises_pkey PRIMARY KEY (id);


--
-- Name: permission_audit_logs permission_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.permission_audit_logs
    ADD CONSTRAINT permission_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: permission_cache permission_cache_cache_key_key; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.permission_cache
    ADD CONSTRAINT permission_cache_cache_key_key UNIQUE (cache_key);


--
-- Name: permission_cache permission_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.permission_cache
    ADD CONSTRAINT permission_cache_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_permission_code_key; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_permission_code_key UNIQUE (permission_code);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


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
-- Name: project_companies project_companies_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.project_companies
    ADD CONSTRAINT project_companies_pkey PRIMARY KEY (id);


--
-- Name: project_companies project_companies_project_id_company_id_key; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.project_companies
    ADD CONSTRAINT project_companies_project_id_company_id_key UNIQUE (project_id, company_id);


--
-- Name: project_users project_users_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.project_users
    ADD CONSTRAINT project_users_pkey PRIMARY KEY (id);


--
-- Name: project_users project_users_project_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.project_users
    ADD CONSTRAINT project_users_project_id_user_id_key UNIQUE (project_id, user_id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_role_id_permission_id_key; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_permission_id_key UNIQUE (role_id, permission_id);


--
-- Name: schema_migrations schema_migrations_migration_name_key; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_migration_name_key UNIQUE (migration_name);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (id);


--
-- Name: system_audit_log system_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.system_audit_log
    ADD CONSTRAINT system_audit_log_pkey PRIMARY KEY (id);


--
-- Name: system_users system_users_api_key_key; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.system_users
    ADD CONSTRAINT system_users_api_key_key UNIQUE (api_key);


--
-- Name: system_users system_users_email_key; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.system_users
    ADD CONSTRAINT system_users_email_key UNIQUE (email);


--
-- Name: system_users system_users_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.system_users
    ADD CONSTRAINT system_users_pkey PRIMARY KEY (id);


--
-- Name: system_users system_users_username_key; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.system_users
    ADD CONSTRAINT system_users_username_key UNIQUE (username);


--
-- Name: task_documents task_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.task_documents
    ADD CONSTRAINT task_documents_pkey PRIMARY KEY (id);


--
-- Name: task_documents task_documents_task_id_document_id_key; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.task_documents
    ADD CONSTRAINT task_documents_task_id_document_id_key UNIQUE (task_id, document_id);


--
-- Name: task_relationships task_relationships_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.task_relationships
    ADD CONSTRAINT task_relationships_pkey PRIMARY KEY (id);


--
-- Name: task_status_config task_status_config_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.task_status_config
    ADD CONSTRAINT task_status_config_pkey PRIMARY KEY (status_code);


--
-- Name: task_status_history task_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.task_status_history
    ADD CONSTRAINT task_status_history_pkey PRIMARY KEY (id);


--
-- Name: task_time_logs task_time_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.task_time_logs
    ADD CONSTRAINT task_time_logs_pkey PRIMARY KEY (id);


--
-- Name: task_updates task_updates_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.task_updates
    ADD CONSTRAINT task_updates_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: time_estimation_history time_estimation_history_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.time_estimation_history
    ADD CONSTRAINT time_estimation_history_pkey PRIMARY KEY (id);


--
-- Name: time_estimation_templates time_estimation_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.time_estimation_templates
    ADD CONSTRAINT time_estimation_templates_pkey PRIMARY KEY (id);


--
-- Name: time_unit_configs time_unit_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.time_unit_configs
    ADD CONSTRAINT time_unit_configs_pkey PRIMARY KEY (id);


--
-- Name: time_unit_configs time_unit_configs_unit_code_key; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.time_unit_configs
    ADD CONSTRAINT time_unit_configs_unit_code_key UNIQUE (unit_code);


--
-- Name: timeline_events timeline_events_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.timeline_events
    ADD CONSTRAINT timeline_events_pkey PRIMARY KEY (id);


--
-- Name: timer_templates timer_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.timer_templates
    ADD CONSTRAINT timer_templates_pkey PRIMARY KEY (id);


--
-- Name: company_departments uk_company_departments_name; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.company_departments
    ADD CONSTRAINT uk_company_departments_name UNIQUE (company_id, name, parent_id);


--
-- Name: unified_timer_logs unified_timer_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.unified_timer_logs
    ADD CONSTRAINT unified_timer_logs_pkey PRIMARY KEY (id);


--
-- Name: task_relationships unique_task_relationship; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.task_relationships
    ADD CONSTRAINT unique_task_relationship UNIQUE (source_task_id, target_task_id, relationship_type);


--
-- Name: audit_configs uq_audit_configs_resource_action; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.audit_configs
    ADD CONSTRAINT uq_audit_configs_resource_action UNIQUE (resource_type, action);


--
-- Name: user_timer_preferences user_timer_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.user_timer_preferences
    ADD CONSTRAINT user_timer_preferences_pkey PRIMARY KEY (user_id);


--
-- Name: user_timer_tasks user_timer_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.user_timer_tasks
    ADD CONSTRAINT user_timer_tasks_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: work_note_folders work_note_folders_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.work_note_folders
    ADD CONSTRAINT work_note_folders_pkey PRIMARY KEY (id);


--
-- Name: work_note_task_relations work_note_task_relations_pkey; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.work_note_task_relations
    ADD CONSTRAINT work_note_task_relations_pkey PRIMARY KEY (id);


--
-- Name: work_note_task_relations work_note_task_relations_unique; Type: CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.work_note_task_relations
    ADD CONSTRAINT work_note_task_relations_unique UNIQUE (work_note_id, task_id, relation_type);


--
-- Name: idx_ai_configs_created_by; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_ai_configs_created_by ON public.ai_configs USING btree (created_by);


--
-- Name: idx_ai_configs_enabled; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_ai_configs_enabled ON public.ai_configs USING btree (enabled);


--
-- Name: idx_ai_configs_provider; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_ai_configs_provider ON public.ai_configs USING btree (provider);


--
-- Name: idx_ai_configs_updated_at; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_ai_configs_updated_at ON public.ai_configs USING btree (updated_at);


--
-- Name: idx_ai_usage_stats_config_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_ai_usage_stats_config_id ON public.ai_usage_stats USING btree (config_id);


--
-- Name: idx_ai_usage_stats_provider; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_ai_usage_stats_provider ON public.ai_usage_stats USING btree (provider);


--
-- Name: idx_ai_usage_stats_unique; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE UNIQUE INDEX idx_ai_usage_stats_unique ON public.ai_usage_stats USING btree (config_id, usage_date);


--
-- Name: idx_ai_usage_stats_usage_date; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_ai_usage_stats_usage_date ON public.ai_usage_stats USING btree (usage_date);


--
-- Name: idx_api_keys_active; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_api_keys_active ON public.api_keys USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_api_keys_created_by; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_api_keys_created_by ON public.api_keys USING btree (created_by);


--
-- Name: idx_api_keys_deleted_at; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_api_keys_deleted_at ON public.api_keys USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_api_keys_expires_at; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_api_keys_expires_at ON public.api_keys USING btree (expires_at) WHERE (expires_at IS NOT NULL);


--
-- Name: idx_api_keys_key_hash; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_api_keys_key_hash ON public.api_keys USING btree (key_hash);


--
-- Name: idx_api_keys_key_prefix; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_api_keys_key_prefix ON public.api_keys USING btree (key_prefix);


--
-- Name: idx_api_keys_last_used; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_api_keys_last_used ON public.api_keys USING btree (last_used_at DESC) WHERE (last_used_at IS NOT NULL);


--
-- Name: idx_api_keys_metadata; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_api_keys_metadata ON public.api_keys USING gin (metadata);


--
-- Name: idx_api_keys_permissions; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_api_keys_permissions ON public.api_keys USING gin (permissions);


--
-- Name: idx_api_keys_scope_projects; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_api_keys_scope_projects ON public.api_keys USING gin (scope_projects) WHERE (scope_projects IS NOT NULL);


--
-- Name: idx_api_keys_tags; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_api_keys_tags ON public.api_keys USING gin (tags);


--
-- Name: idx_api_keys_usage_count; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_api_keys_usage_count ON public.api_keys USING btree (usage_count DESC);


--
-- Name: idx_api_quota_stats_api_key_date; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_api_quota_stats_api_key_date ON public.api_quota_stats USING btree (api_key_id, stat_date DESC);


--
-- Name: idx_api_quota_stats_api_key_date_hour; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_api_quota_stats_api_key_date_hour ON public.api_quota_stats USING btree (api_key_id, stat_date, stat_hour);


--
-- Name: idx_api_quota_stats_date; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_api_quota_stats_date ON public.api_quota_stats USING btree (stat_date DESC);


--
-- Name: idx_api_usage_logs_api_key_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_api_usage_logs_api_key_id ON public.api_usage_logs USING btree (api_key_id);


--
-- Name: idx_api_usage_logs_correlation_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_api_usage_logs_correlation_id ON public.api_usage_logs USING btree (correlation_id) WHERE (correlation_id IS NOT NULL);


--
-- Name: idx_api_usage_logs_endpoint; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_api_usage_logs_endpoint ON public.api_usage_logs USING btree (endpoint);


--
-- Name: idx_api_usage_logs_endpoint_time; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_api_usage_logs_endpoint_time ON public.api_usage_logs USING btree (endpoint, request_timestamp DESC);


--
-- Name: idx_api_usage_logs_error_status; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_api_usage_logs_error_status ON public.api_usage_logs USING btree (response_status) WHERE (response_status >= 400);


--
-- Name: idx_api_usage_logs_ip_address; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_api_usage_logs_ip_address ON public.api_usage_logs USING btree (ip_address);


--
-- Name: idx_api_usage_logs_key_status; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_api_usage_logs_key_status ON public.api_usage_logs USING btree (api_key_id, response_status);


--
-- Name: idx_api_usage_logs_key_time; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_api_usage_logs_key_time ON public.api_usage_logs USING btree (api_key_id, request_timestamp DESC);


--
-- Name: idx_api_usage_logs_method; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_api_usage_logs_method ON public.api_usage_logs USING btree (method);


--
-- Name: idx_api_usage_logs_project_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_api_usage_logs_project_id ON public.api_usage_logs USING btree (project_id) WHERE (project_id IS NOT NULL);


--
-- Name: idx_api_usage_logs_rate_limited; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_api_usage_logs_rate_limited ON public.api_usage_logs USING btree (rate_limited) WHERE (rate_limited = true);


--
-- Name: idx_api_usage_logs_response_time; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_api_usage_logs_response_time ON public.api_usage_logs USING btree (response_time_ms) WHERE (response_time_ms IS NOT NULL);


--
-- Name: idx_api_usage_logs_status; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_api_usage_logs_status ON public.api_usage_logs USING btree (response_status);


--
-- Name: idx_api_usage_logs_timestamp; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_api_usage_logs_timestamp ON public.api_usage_logs USING btree (request_timestamp DESC);


--
-- Name: idx_api_usage_logs_trace_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_api_usage_logs_trace_id ON public.api_usage_logs USING btree (trace_id) WHERE (trace_id IS NOT NULL);


--
-- Name: idx_api_usage_logs_user_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_api_usage_logs_user_id ON public.api_usage_logs USING btree (user_id) WHERE (user_id IS NOT NULL);


--
-- Name: idx_api_usage_logs_user_time; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_api_usage_logs_user_time ON public.api_usage_logs USING btree (user_id, request_timestamp DESC) WHERE (user_id IS NOT NULL);


--
-- Name: idx_audit_log_action; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_audit_log_action ON public.system_audit_log USING btree (action);


--
-- Name: idx_audit_log_created_at; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_audit_log_created_at ON public.system_audit_log USING btree (created_at);


--
-- Name: idx_audit_log_entity; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_audit_log_entity ON public.system_audit_log USING btree (entity_type, entity_id);


--
-- Name: idx_audit_log_user_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_audit_log_user_id ON public.system_audit_log USING btree (user_id);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_correlation; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_audit_logs_correlation ON public.audit_logs USING btree (correlation_id);


--
-- Name: idx_audit_logs_event_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_audit_logs_event_id ON public.audit_logs USING btree (event_id);


--
-- Name: idx_audit_logs_parent_event; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_audit_logs_parent_event ON public.audit_logs USING btree (parent_event_id);


--
-- Name: idx_audit_logs_project; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_audit_logs_project ON public.audit_logs USING btree (project_id);


--
-- Name: idx_audit_logs_request; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_audit_logs_request ON public.audit_logs USING btree (request_id);


--
-- Name: idx_audit_logs_resource; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_audit_logs_resource ON public.audit_logs USING btree (resource_type, resource_id);


--
-- Name: idx_audit_logs_session; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_audit_logs_session ON public.audit_logs USING btree (session_id);


--
-- Name: idx_audit_logs_status; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_audit_logs_status ON public.audit_logs USING btree (status);


--
-- Name: idx_audit_logs_timestamp; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs USING btree ("timestamp" DESC);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: idx_companies_code; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_companies_code ON public.companies USING btree (company_code);


--
-- Name: idx_companies_created_by; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_companies_created_by ON public.companies USING btree (created_by);


--
-- Name: idx_companies_name; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_companies_name ON public.companies USING btree (company_name);


--
-- Name: idx_companies_status; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_companies_status ON public.companies USING btree (status);


--
-- Name: idx_company_departments_company_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_company_departments_company_id ON public.company_departments USING btree (company_id);


--
-- Name: idx_company_departments_deleted_at; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_company_departments_deleted_at ON public.company_departments USING btree (deleted_at);


--
-- Name: idx_company_departments_level_sort; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_company_departments_level_sort ON public.company_departments USING btree (company_id, level, sort_order);


--
-- Name: idx_company_departments_manager_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_company_departments_manager_id ON public.company_departments USING btree (manager_id);


--
-- Name: idx_company_departments_parent_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_company_departments_parent_id ON public.company_departments USING btree (parent_id);


--
-- Name: idx_company_departments_path; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_company_departments_path ON public.company_departments USING btree (path);


--
-- Name: idx_company_departments_status; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_company_departments_status ON public.company_departments USING btree (company_id, status);


--
-- Name: idx_company_roles_active; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_company_roles_active ON public.company_roles USING btree (role_code, is_active) WHERE (is_active = true);


--
-- Name: idx_company_user_project_permissions_project_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_company_user_project_permissions_project_id ON public.company_user_project_permissions USING btree (project_id);


--
-- Name: idx_company_user_project_permissions_user_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_company_user_project_permissions_user_id ON public.company_user_project_permissions USING btree (company_user_id);


--
-- Name: idx_company_users_customer_id_active; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_company_users_customer_id_active ON public.company_users USING btree (customer_id, status) WHERE ((status)::text = 'active'::text);


--
-- Name: idx_company_users_department_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_company_users_department_id ON public.company_users USING btree (department_id);


--
-- Name: idx_company_users_primary_contact; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE UNIQUE INDEX idx_company_users_primary_contact ON public.company_users USING btree (customer_id) WHERE (is_primary_contact = true);


--
-- Name: idx_company_users_role; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_company_users_role ON public.company_users USING btree (role_id, status) WHERE ((status)::text = 'active'::text);


--
-- Name: idx_company_users_role_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_company_users_role_id ON public.company_users USING btree (role_id);


--
-- Name: idx_customer_contacts_contact_date; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_customer_contacts_contact_date ON public.customer_contacts USING btree (contact_date);


--
-- Name: idx_customer_contacts_customer_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_customer_contacts_customer_id ON public.customer_contacts USING btree (customer_id);


--
-- Name: idx_customer_contacts_status; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_customer_contacts_status ON public.customer_contacts USING btree (status);


--
-- Name: idx_customer_users_customer_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_customer_users_customer_id ON public.customer_users USING btree (customer_id);


--
-- Name: idx_customer_users_user_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_customer_users_user_id ON public.customer_users USING btree (user_id);


--
-- Name: idx_document_folders_deleted_at; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_document_folders_deleted_at ON public.document_folders USING btree (deleted_at);


--
-- Name: idx_document_folders_owner_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_document_folders_owner_id ON public.document_folders USING btree (owner_id);


--
-- Name: idx_document_folders_parent_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_document_folders_parent_id ON public.document_folders USING btree (parent_folder_id);


--
-- Name: idx_document_folders_visibility; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_document_folders_visibility ON public.document_folders USING btree (visibility);


--
-- Name: idx_document_versions_created_at; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_document_versions_created_at ON public.document_versions USING btree (created_at DESC);


--
-- Name: idx_document_versions_document_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_document_versions_document_id ON public.document_versions USING btree (document_id);


--
-- Name: idx_document_versions_version_number; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_document_versions_version_number ON public.document_versions USING btree (version_number DESC);


--
-- Name: idx_documents_archived; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_documents_archived ON public.documents USING btree (archived);


--
-- Name: idx_documents_archived_at; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_documents_archived_at ON public.documents USING btree (archived_at);


--
-- Name: idx_documents_category; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_documents_category ON public.documents USING btree (category);


--
-- Name: idx_documents_created_by; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_documents_created_by ON public.documents USING btree (created_by);


--
-- Name: idx_documents_customer_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_documents_customer_id ON public.documents USING btree (customer_id);


--
-- Name: idx_documents_deleted_at; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_documents_deleted_at ON public.documents USING btree (deleted_at);


--
-- Name: idx_documents_owner_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_documents_owner_id ON public.documents USING btree (owner_id);


--
-- Name: idx_documents_owner_updated_active; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_documents_owner_updated_active ON public.documents USING btree (owner_id, updated_at DESC) WHERE (deleted_at IS NULL);


--
-- Name: idx_documents_project_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_documents_project_id ON public.documents USING btree (project_id);


--
-- Name: idx_documents_project_updated_active; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_documents_project_updated_active ON public.documents USING btree (project_id, updated_at DESC) WHERE (deleted_at IS NULL);


--
-- Name: idx_documents_status; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_documents_status ON public.documents USING btree (status);


--
-- Name: idx_documents_tags; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_documents_tags ON public.documents USING gin (tags);


--
-- Name: idx_documents_title; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_documents_title ON public.documents USING btree (title);


--
-- Name: idx_documents_type; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_documents_type ON public.documents USING btree (type);


--
-- Name: idx_documents_updated_at; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_documents_updated_at ON public.documents USING btree (updated_at DESC);


--
-- Name: idx_documents_visibility; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_documents_visibility ON public.documents USING btree (visibility);


--
-- Name: idx_enterprise_departments_created_at; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_enterprise_departments_created_at ON public.enterprise_departments USING btree (created_at);


--
-- Name: idx_enterprise_departments_deleted_at; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_enterprise_departments_deleted_at ON public.enterprise_departments USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_enterprise_departments_enterprise_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_enterprise_departments_enterprise_id ON public.enterprise_departments USING btree (enterprise_id);


--
-- Name: idx_enterprise_departments_level; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_enterprise_departments_level ON public.enterprise_departments USING btree (level);


--
-- Name: idx_enterprise_departments_manager_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_enterprise_departments_manager_id ON public.enterprise_departments USING btree (manager_id);


--
-- Name: idx_enterprise_departments_name; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_enterprise_departments_name ON public.enterprise_departments USING btree (name);


--
-- Name: idx_enterprise_departments_parent_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_enterprise_departments_parent_id ON public.enterprise_departments USING btree (parent_id);


--
-- Name: idx_enterprise_departments_path; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_enterprise_departments_path ON public.enterprise_departments USING btree (path);


--
-- Name: idx_enterprise_departments_sort_order; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_enterprise_departments_sort_order ON public.enterprise_departments USING btree (sort_order);


--
-- Name: idx_enterprise_departments_status; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_enterprise_departments_status ON public.enterprise_departments USING btree (status);


--
-- Name: idx_enterprise_departments_unique_name; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE UNIQUE INDEX idx_enterprise_departments_unique_name ON public.enterprise_departments USING btree (enterprise_id, parent_id, name) WHERE (deleted_at IS NULL);


--
-- Name: idx_enterprise_users_created_at; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_enterprise_users_created_at ON public.enterprise_users USING btree (created_at);


--
-- Name: idx_enterprise_users_deleted_at; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_enterprise_users_deleted_at ON public.enterprise_users USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_enterprise_users_department_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_enterprise_users_department_id ON public.enterprise_users USING btree (department_id);


--
-- Name: idx_enterprise_users_email; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_enterprise_users_email ON public.enterprise_users USING btree (email);


--
-- Name: idx_enterprise_users_email_unique; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE UNIQUE INDEX idx_enterprise_users_email_unique ON public.enterprise_users USING btree (email) WHERE (deleted_at IS NULL);


--
-- Name: idx_enterprise_users_enterprise_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_enterprise_users_enterprise_id ON public.enterprise_users USING btree (enterprise_id);


--
-- Name: idx_enterprise_users_enterprise_username; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE UNIQUE INDEX idx_enterprise_users_enterprise_username ON public.enterprise_users USING btree (enterprise_id, username) WHERE (deleted_at IS NULL);


--
-- Name: idx_enterprise_users_invitation_token; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_enterprise_users_invitation_token ON public.enterprise_users USING btree (invitation_token) WHERE (invitation_token IS NOT NULL);


--
-- Name: idx_enterprise_users_is_primary_contact; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_enterprise_users_is_primary_contact ON public.enterprise_users USING btree (is_primary_contact) WHERE (is_primary_contact = true);


--
-- Name: idx_enterprise_users_role_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_enterprise_users_role_id ON public.enterprise_users USING btree (role_id);


--
-- Name: idx_enterprise_users_status; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_enterprise_users_status ON public.enterprise_users USING btree (status);


--
-- Name: idx_enterprise_users_username; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_enterprise_users_username ON public.enterprise_users USING btree (username);


--
-- Name: idx_enterprises_business_type; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_enterprises_business_type ON public.enterprises USING btree (business_type);


--
-- Name: idx_enterprises_code; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_enterprises_code ON public.enterprises USING btree (code);


--
-- Name: idx_enterprises_created_at; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_enterprises_created_at ON public.enterprises USING btree (created_at);


--
-- Name: idx_enterprises_deleted_at; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_enterprises_deleted_at ON public.enterprises USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_enterprises_industry_type; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_enterprises_industry_type ON public.enterprises USING btree (industry_type);


--
-- Name: idx_enterprises_name; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_enterprises_name ON public.enterprises USING btree (name);


--
-- Name: idx_enterprises_status; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_enterprises_status ON public.enterprises USING btree (status);


--
-- Name: idx_mv_user_perms_module; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_mv_user_perms_module ON public.mv_user_effective_permissions USING btree (module);


--
-- Name: idx_mv_user_perms_permission; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_mv_user_perms_permission ON public.mv_user_effective_permissions USING btree (permission_code);


--
-- Name: idx_mv_user_perms_unique; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE UNIQUE INDEX idx_mv_user_perms_unique ON public.mv_user_effective_permissions USING btree (company_user_id, permission_code);


--
-- Name: idx_mv_user_perms_user; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_mv_user_perms_user ON public.mv_user_effective_permissions USING btree (company_user_id);


--
-- Name: idx_permission_audit_logs_performed_at; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_permission_audit_logs_performed_at ON public.permission_audit_logs USING btree (performed_at);


--
-- Name: idx_permission_audit_logs_user_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_permission_audit_logs_user_id ON public.permission_audit_logs USING btree (company_user_id);


--
-- Name: idx_permission_cache_expires; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_permission_cache_expires ON public.permission_cache USING btree (expires_at);


--
-- Name: idx_permission_cache_key; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_permission_cache_key ON public.permission_cache USING btree (cache_key);


--
-- Name: idx_permission_cache_user; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_permission_cache_user ON public.permission_cache USING btree (company_user_id);


--
-- Name: idx_permissions_active_code; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_permissions_active_code ON public.permissions USING btree (permission_code) WHERE (is_active = true);


--
-- Name: idx_permissions_module; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_permissions_module ON public.permissions USING btree (module, is_active);


--
-- Name: idx_progress_snapshots_entity; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_progress_snapshots_entity ON public.progress_snapshots USING btree (entity_type, entity_id, computed_at DESC);


--
-- Name: idx_project_companies_company_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_project_companies_company_id ON public.project_companies USING btree (company_id);


--
-- Name: idx_project_companies_project_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_project_companies_project_id ON public.project_companies USING btree (project_id);


--
-- Name: idx_project_users_project_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_project_users_project_id ON public.project_users USING btree (project_id);


--
-- Name: idx_project_users_user_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_project_users_user_id ON public.project_users USING btree (user_id);


--
-- Name: idx_projects_active_deleted; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_projects_active_deleted ON public.projects USING btree (owner_id, created_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_projects_deleted_at; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_projects_deleted_at ON public.projects USING btree (deleted_at);


--
-- Name: idx_projects_enterprise_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_projects_enterprise_id ON public.projects USING btree (enterprise_id);


--
-- Name: idx_projects_name; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_projects_name ON public.projects USING btree (name);


--
-- Name: idx_role_permissions_active; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_role_permissions_active ON public.role_permissions USING btree (role_id, permission_id) WHERE (is_granted = true);


--
-- Name: idx_role_permissions_permission_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_role_permissions_permission_id ON public.role_permissions USING btree (permission_id);


--
-- Name: idx_role_permissions_role_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_role_permissions_role_id ON public.role_permissions USING btree (role_id);


--
-- Name: idx_system_users_api_key; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_system_users_api_key ON public.system_users USING btree (api_key) WHERE (api_key IS NOT NULL);


--
-- Name: idx_system_users_created_at; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_system_users_created_at ON public.system_users USING btree (created_at);


--
-- Name: idx_system_users_deleted_at; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_system_users_deleted_at ON public.system_users USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_system_users_email; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_system_users_email ON public.system_users USING btree (email);


--
-- Name: idx_system_users_email_unique; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE UNIQUE INDEX idx_system_users_email_unique ON public.system_users USING btree (email) WHERE (deleted_at IS NULL);


--
-- Name: idx_system_users_is_active; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_system_users_is_active ON public.system_users USING btree (is_active);


--
-- Name: idx_system_users_last_login_at; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_system_users_last_login_at ON public.system_users USING btree (last_login_at);


--
-- Name: idx_system_users_role; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_system_users_role ON public.system_users USING btree (role);


--
-- Name: idx_system_users_session_token; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_system_users_session_token ON public.system_users USING btree (session_token) WHERE (session_token IS NOT NULL);


--
-- Name: idx_system_users_username; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_system_users_username ON public.system_users USING btree (username);


--
-- Name: idx_system_users_username_unique; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE UNIQUE INDEX idx_system_users_username_unique ON public.system_users USING btree (username) WHERE (deleted_at IS NULL);


--
-- Name: idx_task_documents_created_at; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_task_documents_created_at ON public.task_documents USING btree (created_at DESC);


--
-- Name: idx_task_documents_deleted_at; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_task_documents_deleted_at ON public.task_documents USING btree (deleted_at);


--
-- Name: idx_task_documents_document_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_task_documents_document_id ON public.task_documents USING btree (document_id);


--
-- Name: idx_task_documents_relationship_type; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_task_documents_relationship_type ON public.task_documents USING btree (relationship_type);


--
-- Name: idx_task_documents_task_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_task_documents_task_id ON public.task_documents USING btree (task_id);


--
-- Name: idx_task_documents_task_rel; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_task_documents_task_rel ON public.task_documents USING btree (task_id, relationship_type);


--
-- Name: idx_task_relationships_active; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_task_relationships_active ON public.task_relationships USING btree (relationship_status) WHERE (deleted_at IS NULL);


--
-- Name: idx_task_relationships_created_at; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_task_relationships_created_at ON public.task_relationships USING btree (created_at);


--
-- Name: idx_task_relationships_source; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_task_relationships_source ON public.task_relationships USING btree (source_task_id);


--
-- Name: idx_task_relationships_source_type; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_task_relationships_source_type ON public.task_relationships USING btree (source_task_id, relationship_type);


--
-- Name: idx_task_relationships_status; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_task_relationships_status ON public.task_relationships USING btree (relationship_status);


--
-- Name: idx_task_relationships_target; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_task_relationships_target ON public.task_relationships USING btree (target_task_id);


--
-- Name: idx_task_relationships_target_type; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_task_relationships_target_type ON public.task_relationships USING btree (target_task_id, relationship_type);


--
-- Name: idx_task_relationships_type; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_task_relationships_type ON public.task_relationships USING btree (relationship_type);


--
-- Name: idx_task_status_history_change_type; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_task_status_history_change_type ON public.task_status_history USING btree (change_type);


--
-- Name: idx_task_status_history_changed_by; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_task_status_history_changed_by ON public.task_status_history USING btree (changed_by);


--
-- Name: idx_task_status_history_metadata; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_task_status_history_metadata ON public.task_status_history USING gin (metadata);


--
-- Name: idx_task_status_history_new_status; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_task_status_history_new_status ON public.task_status_history USING btree (new_status);


--
-- Name: idx_task_status_history_parallel_group; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_task_status_history_parallel_group ON public.task_status_history USING btree (parallel_group_id) WHERE (parallel_group_id IS NOT NULL);


--
-- Name: idx_task_status_history_related_tasks; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_task_status_history_related_tasks ON public.task_status_history USING gin (related_task_ids);


--
-- Name: idx_task_status_history_task_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_task_status_history_task_id ON public.task_status_history USING btree (task_id);


--
-- Name: idx_task_status_history_task_timestamp; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_task_status_history_task_timestamp ON public.task_status_history USING btree (task_id, change_timestamp);


--
-- Name: idx_task_status_history_timestamp; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_task_status_history_timestamp ON public.task_status_history USING btree (change_timestamp);


--
-- Name: idx_task_status_history_workflow_stage; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_task_status_history_workflow_stage ON public.task_status_history USING btree (workflow_stage) WHERE (workflow_stage IS NOT NULL);


--
-- Name: idx_task_time_logs_created_by; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_task_time_logs_created_by ON public.task_time_logs USING btree (created_by);


--
-- Name: idx_task_time_logs_start_time; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_task_time_logs_start_time ON public.task_time_logs USING btree (start_time);


--
-- Name: idx_task_time_logs_task_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_task_time_logs_task_id ON public.task_time_logs USING btree (task_id);


--
-- Name: idx_task_time_logs_user_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_task_time_logs_user_id ON public.task_time_logs USING btree (user_id);


--
-- Name: idx_task_time_logs_user_start_time; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_task_time_logs_user_start_time ON public.task_time_logs USING btree (user_id, start_time) WHERE (user_id IS NOT NULL);


--
-- Name: idx_task_time_logs_user_task; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_task_time_logs_user_task ON public.task_time_logs USING btree (user_id, task_id);


--
-- Name: idx_task_updates_created_at; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_task_updates_created_at ON public.task_updates USING btree (created_at DESC);


--
-- Name: idx_task_updates_task_created; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_task_updates_task_created ON public.task_updates USING btree (task_id, created_at DESC);


--
-- Name: idx_task_updates_task_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_task_updates_task_id ON public.task_updates USING btree (task_id);


--
-- Name: idx_task_updates_type; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_task_updates_type ON public.task_updates USING btree (update_type);


--
-- Name: idx_task_updates_type_created; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_task_updates_type_created ON public.task_updates USING btree (update_type, created_at DESC);


--
-- Name: idx_task_updates_type_value; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_task_updates_type_value ON public.task_updates USING btree (update_type, new_value);


--
-- Name: idx_tasks_active_deleted; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_tasks_active_deleted ON public.tasks USING btree (project_id, status) WHERE (deleted_at IS NULL);


--
-- Name: idx_tasks_actual_minutes; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_tasks_actual_minutes ON public.tasks USING btree (actual_minutes) WHERE (actual_minutes > 0);


--
-- Name: idx_tasks_assignee_id_deleted_at; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_tasks_assignee_id_deleted_at ON public.tasks USING btree (assignee_id, deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_tasks_assignee_status; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_tasks_assignee_status ON public.tasks USING btree (assignee_id, status) WHERE ((assignee_id IS NOT NULL) AND (deleted_at IS NULL));


--
-- Name: idx_tasks_assignee_status_deleted; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_tasks_assignee_status_deleted ON public.tasks USING btree (assignee_id, status, deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_tasks_custom_fields_gin; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_tasks_custom_fields_gin ON public.tasks USING gin (custom_fields) WHERE (deleted_at IS NULL);


--
-- Name: INDEX idx_tasks_custom_fields_gin; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON INDEX public.idx_tasks_custom_fields_gin IS 'Enables efficient searches within JSONB custom fields';


--
-- Name: idx_tasks_deleted_at; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_tasks_deleted_at ON public.tasks USING btree (deleted_at);


--
-- Name: idx_tasks_deleted_at_created_at; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_tasks_deleted_at_created_at ON public.tasks USING btree (deleted_at, created_at DESC) WHERE (deleted_at IS NULL);


--
-- Name: INDEX idx_tasks_deleted_at_created_at; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON INDEX public.idx_tasks_deleted_at_created_at IS 'Optimizes global task listing ordered by creation date';


--
-- Name: idx_tasks_dependencies; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_tasks_dependencies ON public.tasks USING gin (dependencies);


--
-- Name: idx_tasks_due_date_deleted_at; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_tasks_due_date_deleted_at ON public.tasks USING btree (due_date, deleted_at) WHERE ((deleted_at IS NULL) AND (due_date IS NOT NULL));


--
-- Name: idx_tasks_due_datetime; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_tasks_due_datetime ON public.tasks USING btree (due_datetime) WHERE (due_datetime IS NOT NULL);


--
-- Name: idx_tasks_estimated_hours; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_tasks_estimated_hours ON public.tasks USING btree (estimated_hours);


--
-- Name: idx_tasks_estimated_minutes; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_tasks_estimated_minutes ON public.tasks USING btree (estimated_minutes) WHERE (estimated_minutes > 0);


--
-- Name: idx_tasks_global_query_covering; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_tasks_global_query_covering ON public.tasks USING btree (deleted_at, created_at, id, project_id, title, status, assignee_id, due_date, parent_id, task_level, sort_order) WHERE (deleted_at IS NULL);


--
-- Name: INDEX idx_tasks_global_query_covering; Type: COMMENT; Schema: public; Owner: dev_user
--

COMMENT ON INDEX public.idx_tasks_global_query_covering IS 'Covering index for global task queries to avoid table lookups';


--
-- Name: idx_tasks_level; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_tasks_level ON public.tasks USING btree (task_level);


--
-- Name: idx_tasks_parent_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_tasks_parent_id ON public.tasks USING btree (parent_id);


--
-- Name: idx_tasks_parent_level_sort; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_tasks_parent_level_sort ON public.tasks USING btree (parent_id, task_level, sort_order) WHERE (deleted_at IS NULL);


--
-- Name: idx_tasks_path_ancestors; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_tasks_path_ancestors ON public.tasks USING gist (path public.gist_ltree_ops (siglen='64'));


--
-- Name: idx_tasks_path_btree; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_tasks_path_btree ON public.tasks USING btree (path);


--
-- Name: idx_tasks_path_gist; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_tasks_path_gist ON public.tasks USING gist (path);


--
-- Name: idx_tasks_path_status; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_tasks_path_status ON public.tasks USING btree (path, status) WHERE (deleted_at IS NULL);


--
-- Name: idx_tasks_priority; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_tasks_priority ON public.tasks USING btree (priority);


--
-- Name: idx_tasks_project_id_deleted_at; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_tasks_project_id_deleted_at ON public.tasks USING btree (project_id, deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_tasks_project_parent; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_tasks_project_parent ON public.tasks USING btree (project_id, parent_id);


--
-- Name: idx_tasks_project_parent_deleted; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_tasks_project_parent_deleted ON public.tasks USING btree (project_id, parent_id, deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_tasks_project_path; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_tasks_project_path ON public.tasks USING btree (project_id, path) WHERE (deleted_at IS NULL);


--
-- Name: idx_tasks_sort_order; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_tasks_sort_order ON public.tasks USING btree (sort_order);


--
-- Name: idx_tasks_start_datetime; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_tasks_start_datetime ON public.tasks USING btree (start_datetime) WHERE (start_datetime IS NOT NULL);


--
-- Name: idx_tasks_status_deleted_at; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_tasks_status_deleted_at ON public.tasks USING btree (status, deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_tasks_tags; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_tasks_tags ON public.tasks USING gin (tags);


--
-- Name: idx_tasks_time_range; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_tasks_time_range ON public.tasks USING btree (start_datetime, due_datetime) WHERE ((start_datetime IS NOT NULL) AND (due_datetime IS NOT NULL));


--
-- Name: idx_tasks_total_time; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_tasks_total_time ON public.tasks USING btree (total_time_seconds);


--
-- Name: idx_time_estimation_history_accuracy; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_time_estimation_history_accuracy ON public.time_estimation_history USING btree (estimation_accuracy DESC) WHERE (estimation_accuracy IS NOT NULL);


--
-- Name: idx_time_estimation_history_task; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_time_estimation_history_task ON public.time_estimation_history USING btree (task_id, created_at DESC);


--
-- Name: idx_time_estimation_templates_global; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_time_estimation_templates_global ON public.time_estimation_templates USING btree (is_global, is_active);


--
-- Name: idx_time_estimation_templates_type; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_time_estimation_templates_type ON public.time_estimation_templates USING btree (task_type, complexity_level) WHERE (is_active = true);


--
-- Name: idx_time_unit_configs_active; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_time_unit_configs_active ON public.time_unit_configs USING btree (is_active, sort_order);


--
-- Name: idx_time_unit_configs_code; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_time_unit_configs_code ON public.time_unit_configs USING btree (unit_code) WHERE (is_active = true);


--
-- Name: idx_timeline_events_date; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_timeline_events_date ON public.timeline_events USING btree (event_date DESC);


--
-- Name: idx_timeline_events_task_date; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_timeline_events_task_date ON public.timeline_events USING btree (task_id, event_date DESC);


--
-- Name: idx_timeline_events_task_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_timeline_events_task_id ON public.timeline_events USING btree (task_id);


--
-- Name: idx_timeline_events_type; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_timeline_events_type ON public.timeline_events USING btree (event_type);


--
-- Name: idx_timeline_events_type_date; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_timeline_events_type_date ON public.timeline_events USING btree (event_type, event_date DESC);


--
-- Name: idx_timer_templates_usage; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_timer_templates_usage ON public.timer_templates USING btree (usage_count DESC, last_used_at DESC);


--
-- Name: idx_timer_templates_user; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_timer_templates_user ON public.timer_templates USING btree (user_id, target_type);


--
-- Name: idx_unified_timer_category; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_unified_timer_category ON public.unified_timer_logs USING btree (user_id, category);


--
-- Name: idx_unified_timer_metadata; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_unified_timer_metadata ON public.unified_timer_logs USING gin (target_metadata);


--
-- Name: idx_unified_timer_project; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_unified_timer_project ON public.unified_timer_logs USING btree (project_id) WHERE (project_id IS NOT NULL);


--
-- Name: idx_unified_timer_search; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_unified_timer_search ON public.unified_timer_logs USING gin (search_vector);


--
-- Name: idx_unified_timer_tags; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_unified_timer_tags ON public.unified_timer_logs USING gin (tags);


--
-- Name: idx_unified_timer_target; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_unified_timer_target ON public.unified_timer_logs USING btree (target_type, target_id);


--
-- Name: idx_unified_timer_time_range; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_unified_timer_time_range ON public.unified_timer_logs USING btree (user_id, start_time DESC, end_time DESC);


--
-- Name: idx_unified_timer_user_status; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_unified_timer_user_status ON public.unified_timer_logs USING btree (user_id, status);


--
-- Name: idx_user_timer_tasks_category; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_user_timer_tasks_category ON public.user_timer_tasks USING btree (category);


--
-- Name: idx_user_timer_tasks_created_at; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_user_timer_tasks_created_at ON public.user_timer_tasks USING btree (created_at);


--
-- Name: idx_user_timer_tasks_status; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_user_timer_tasks_status ON public.user_timer_tasks USING btree (status);


--
-- Name: idx_user_timer_tasks_user_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_user_timer_tasks_user_id ON public.user_timer_tasks USING btree (user_id);


--
-- Name: idx_users_account_expires; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_users_account_expires ON public.users USING btree (account_expires_at) WHERE (((user_type)::text = 'company'::text) AND (account_expires_at IS NOT NULL));


--
-- Name: idx_users_active_lookup; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_users_active_lookup ON public.users USING btree (id, deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_users_company_status; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_users_company_status ON public.users USING btree (company_id, status) WHERE ((user_type)::text = 'company'::text);


--
-- Name: idx_users_contact_person; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_users_contact_person ON public.users USING btree (contact_person_name) WHERE ((user_type)::text = 'company'::text);


--
-- Name: idx_users_creation_trend; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_users_creation_trend ON public.users USING btree (created_at DESC);


--
-- Name: idx_users_current_timing_task; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_users_current_timing_task ON public.users USING btree (current_timing_task_id);


--
-- Name: idx_users_deleted_at; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_users_deleted_at ON public.users USING btree (deleted_at);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_email_active; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE UNIQUE INDEX idx_users_email_active ON public.users USING btree (email) WHERE (deleted_at IS NULL);


--
-- Name: idx_users_last_login; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_users_last_login ON public.users USING btree (last_login_at);


--
-- Name: idx_users_last_login_activity; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_users_last_login_activity ON public.users USING btree (last_login_at DESC) WHERE (last_login_at IS NOT NULL);


--
-- Name: idx_users_primary_contact_unique; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE UNIQUE INDEX idx_users_primary_contact_unique ON public.users USING btree (company_id) WHERE (((user_type)::text = 'company'::text) AND (is_primary_contact = true));


--
-- Name: idx_users_profile_gin; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_users_profile_gin ON public.users USING gin (profile);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_users_status; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_users_status ON public.users USING btree (status);


--
-- Name: idx_users_status_type; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_users_status_type ON public.users USING btree (status, user_type) WHERE ((status)::text <> 'deleted'::text);


--
-- Name: idx_users_timing_accumulated_seconds; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_users_timing_accumulated_seconds ON public.users USING btree (timing_accumulated_seconds);


--
-- Name: idx_users_timing_paused_time; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_users_timing_paused_time ON public.users USING btree (timing_paused_time);


--
-- Name: idx_users_timing_status; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_users_timing_status ON public.users USING btree (timing_status);


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_users_username ON public.users USING btree (username);


--
-- Name: idx_users_username_active; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE UNIQUE INDEX idx_users_username_active ON public.users USING btree (username) WHERE (deleted_at IS NULL);


--
-- Name: idx_work_note_folders_deleted_at; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_work_note_folders_deleted_at ON public.work_note_folders USING btree (deleted_at);


--
-- Name: idx_work_note_folders_owner_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_work_note_folders_owner_id ON public.work_note_folders USING btree (owner_id);


--
-- Name: idx_work_note_folders_parent_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_work_note_folders_parent_id ON public.work_note_folders USING btree (parent_id);


--
-- Name: idx_work_note_folders_project_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_work_note_folders_project_id ON public.work_note_folders USING btree (project_id);


--
-- Name: idx_work_note_folders_sort_order; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_work_note_folders_sort_order ON public.work_note_folders USING btree (sort_order);


--
-- Name: idx_work_note_folders_visibility; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_work_note_folders_visibility ON public.work_note_folders USING btree (visibility);


--
-- Name: idx_work_note_task_relations_created_at; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_work_note_task_relations_created_at ON public.work_note_task_relations USING btree (created_at DESC);


--
-- Name: idx_work_note_task_relations_deleted_at; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_work_note_task_relations_deleted_at ON public.work_note_task_relations USING btree (deleted_at);


--
-- Name: idx_work_note_task_relations_task_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_work_note_task_relations_task_id ON public.work_note_task_relations USING btree (task_id);


--
-- Name: idx_work_note_task_relations_work_note_id; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE INDEX idx_work_note_task_relations_work_note_id ON public.work_note_task_relations USING btree (work_note_id);


--
-- Name: uniq_running_timer_family; Type: INDEX; Schema: public; Owner: dev_user
--

CREATE UNIQUE INDEX uniq_running_timer_family ON public.unified_timer_logs USING btree (user_id, family_key) WHERE (((status)::text = 'running'::text) AND ((target_type)::text = 'project_task'::text) AND (family_key IS NOT NULL));


--
-- Name: ai_configs ai_config_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: dev_user
--

CREATE TRIGGER ai_config_updated_at_trigger BEFORE UPDATE ON public.ai_configs FOR EACH ROW EXECUTE FUNCTION public.update_ai_config_updated_at();


--
-- Name: companies companies_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: dev_user
--

CREATE TRIGGER companies_updated_at_trigger BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_companies_updated_at();


--
-- Name: unified_timer_logs trig_update_timer_search_vector; Type: TRIGGER; Schema: public; Owner: dev_user
--

CREATE TRIGGER trig_update_timer_search_vector BEFORE INSERT OR UPDATE ON public.unified_timer_logs FOR EACH ROW EXECUTE FUNCTION public.update_timer_search_vector();


--
-- Name: timer_templates trig_update_timer_templates_updated_at; Type: TRIGGER; Schema: public; Owner: dev_user
--

CREATE TRIGGER trig_update_timer_templates_updated_at BEFORE UPDATE ON public.timer_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: unified_timer_logs trig_update_unified_timer_logs_updated_at; Type: TRIGGER; Schema: public; Owner: dev_user
--

CREATE TRIGGER trig_update_unified_timer_logs_updated_at BEFORE UPDATE ON public.unified_timer_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_timer_preferences trig_update_user_timer_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: dev_user
--

CREATE TRIGGER trig_update_user_timer_preferences_updated_at BEFORE UPDATE ON public.user_timer_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tasks trigger_check_task_dependencies; Type: TRIGGER; Schema: public; Owner: dev_user
--

CREATE TRIGGER trigger_check_task_dependencies BEFORE INSERT OR UPDATE ON public.tasks FOR EACH ROW WHEN ((new.dependencies IS NOT NULL)) EXECUTE FUNCTION public.check_task_dependencies();


--
-- Name: tasks trigger_check_task_hierarchy; Type: TRIGGER; Schema: public; Owner: dev_user
--

CREATE TRIGGER trigger_check_task_hierarchy BEFORE INSERT OR UPDATE OF parent_id ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.check_task_hierarchy();


--
-- Name: company_departments trigger_company_departments_updated_at; Type: TRIGGER; Schema: public; Owner: dev_user
--

CREATE TRIGGER trigger_company_departments_updated_at BEFORE UPDATE ON public.company_departments FOR EACH ROW EXECUTE FUNCTION public.update_company_departments_updated_at();


--
-- Name: documents trigger_create_document_version; Type: TRIGGER; Schema: public; Owner: dev_user
--

CREATE TRIGGER trigger_create_document_version AFTER UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.create_document_version();


--
-- Name: enterprise_departments trigger_department_level_path; Type: TRIGGER; Schema: public; Owner: dev_user
--

CREATE TRIGGER trigger_department_level_path BEFORE INSERT OR UPDATE OF parent_id ON public.enterprise_departments FOR EACH ROW EXECUTE FUNCTION public.update_department_level_and_path();


--
-- Name: documents trigger_documents_updated_at; Type: TRIGGER; Schema: public; Owner: dev_user
--

CREATE TRIGGER trigger_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_documents_updated_at();


--
-- Name: enterprise_departments trigger_enterprise_departments_updated_at; Type: TRIGGER; Schema: public; Owner: dev_user
--

CREATE TRIGGER trigger_enterprise_departments_updated_at BEFORE UPDATE ON public.enterprise_departments FOR EACH ROW EXECUTE FUNCTION public.update_enterprise_departments_updated_at();


--
-- Name: enterprise_users trigger_enterprise_users_updated_at; Type: TRIGGER; Schema: public; Owner: dev_user
--

CREATE TRIGGER trigger_enterprise_users_updated_at BEFORE UPDATE ON public.enterprise_users FOR EACH ROW EXECUTE FUNCTION public.update_enterprise_users_updated_at();


--
-- Name: enterprises trigger_enterprises_updated_at; Type: TRIGGER; Schema: public; Owner: dev_user
--

CREATE TRIGGER trigger_enterprises_updated_at BEFORE UPDATE ON public.enterprises FOR EACH ROW EXECUTE FUNCTION public.update_enterprises_updated_at();


--
-- Name: system_users trigger_failed_login_handler; Type: TRIGGER; Schema: public; Owner: dev_user
--

CREATE TRIGGER trigger_failed_login_handler BEFORE UPDATE ON public.system_users FOR EACH ROW EXECUTE FUNCTION public.reset_failed_login_attempts();


--
-- Name: tasks trigger_log_task_status_change; Type: TRIGGER; Schema: public; Owner: dev_user
--

CREATE TRIGGER trigger_log_task_status_change AFTER UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.log_task_status_change();


--
-- Name: tasks trigger_log_time_estimation_change; Type: TRIGGER; Schema: public; Owner: dev_user
--

CREATE TRIGGER trigger_log_time_estimation_change AFTER UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.log_time_estimation_change();


--
-- Name: tasks trigger_sync_time_fields; Type: TRIGGER; Schema: public; Owner: dev_user
--

CREATE TRIGGER trigger_sync_time_fields BEFORE INSERT OR UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.sync_time_fields();


--
-- Name: system_users trigger_system_users_updated_at; Type: TRIGGER; Schema: public; Owner: dev_user
--

CREATE TRIGGER trigger_system_users_updated_at BEFORE UPDATE ON public.system_users FOR EACH ROW EXECUTE FUNCTION public.update_system_users_updated_at();


--
-- Name: task_documents trigger_task_documents_updated_at; Type: TRIGGER; Schema: public; Owner: dev_user
--

CREATE TRIGGER trigger_task_documents_updated_at BEFORE UPDATE ON public.task_documents FOR EACH ROW EXECUTE FUNCTION public.update_task_documents_updated_at();


--
-- Name: tasks trigger_update_parent_progress; Type: TRIGGER; Schema: public; Owner: dev_user
--

CREATE TRIGGER trigger_update_parent_progress AFTER INSERT OR DELETE OR UPDATE OF status ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_parent_task_progress();


--
-- Name: tasks trigger_update_task_path; Type: TRIGGER; Schema: public; Owner: dev_user
--

CREATE TRIGGER trigger_update_task_path BEFORE INSERT OR UPDATE OF parent_id ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_task_path();


--
-- Name: task_relationships trigger_update_task_relationships_updated_at; Type: TRIGGER; Schema: public; Owner: dev_user
--

CREATE TRIGGER trigger_update_task_relationships_updated_at BEFORE UPDATE ON public.task_relationships FOR EACH ROW EXECUTE FUNCTION public.update_task_relationships_updated_at();


--
-- Name: work_note_folders trigger_work_note_folders_updated_at; Type: TRIGGER; Schema: public; Owner: dev_user
--

CREATE TRIGGER trigger_work_note_folders_updated_at BEFORE UPDATE ON public.work_note_folders FOR EACH ROW EXECUTE FUNCTION public.update_work_note_folders_updated_at();


--
-- Name: work_note_task_relations trigger_work_note_task_relations_updated_at; Type: TRIGGER; Schema: public; Owner: dev_user
--

CREATE TRIGGER trigger_work_note_task_relations_updated_at BEFORE UPDATE ON public.work_note_task_relations FOR EACH ROW EXECUTE FUNCTION public.update_work_note_task_relations_updated_at();


--
-- Name: api_keys update_api_keys_updated_at; Type: TRIGGER; Schema: public; Owner: dev_user
--

CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON public.api_keys FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: api_quota_stats update_api_quota_stats_updated_at; Type: TRIGGER; Schema: public; Owner: dev_user
--

CREATE TRIGGER update_api_quota_stats_updated_at BEFORE UPDATE ON public.api_quota_stats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: company_roles update_company_roles_updated_at; Type: TRIGGER; Schema: public; Owner: dev_user
--

CREATE TRIGGER update_company_roles_updated_at BEFORE UPDATE ON public.company_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: company_user_project_permissions update_company_user_project_permissions_updated_at; Type: TRIGGER; Schema: public; Owner: dev_user
--

CREATE TRIGGER update_company_user_project_permissions_updated_at BEFORE UPDATE ON public.company_user_project_permissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: company_users update_company_users_updated_at; Type: TRIGGER; Schema: public; Owner: dev_user
--

CREATE TRIGGER update_company_users_updated_at BEFORE UPDATE ON public.company_users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: customer_contacts update_customer_contacts_updated_at; Type: TRIGGER; Schema: public; Owner: dev_user
--

CREATE TRIGGER update_customer_contacts_updated_at BEFORE UPDATE ON public.customer_contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: customer_users update_customer_users_updated_at; Type: TRIGGER; Schema: public; Owner: dev_user
--

CREATE TRIGGER update_customer_users_updated_at BEFORE UPDATE ON public.customer_users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: task_time_logs update_task_time_logs_updated_at; Type: TRIGGER; Schema: public; Owner: dev_user
--

CREATE TRIGGER update_task_time_logs_updated_at BEFORE UPDATE ON public.task_time_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: dev_user
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ai_configs ai_configs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.ai_configs
    ADD CONSTRAINT ai_configs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: ai_configs ai_configs_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.ai_configs
    ADD CONSTRAINT ai_configs_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: ai_usage_stats ai_usage_stats_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.ai_usage_stats
    ADD CONSTRAINT ai_usage_stats_config_id_fkey FOREIGN KEY (config_id) REFERENCES public.ai_configs(id) ON DELETE CASCADE;


--
-- Name: api_keys api_keys_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: api_keys api_keys_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: api_quota_stats api_quota_stats_api_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.api_quota_stats
    ADD CONSTRAINT api_quota_stats_api_key_id_fkey FOREIGN KEY (api_key_id) REFERENCES public.api_keys(id) ON DELETE CASCADE;


--
-- Name: api_usage_logs api_usage_logs_api_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.api_usage_logs
    ADD CONSTRAINT api_usage_logs_api_key_id_fkey FOREIGN KEY (api_key_id) REFERENCES public.api_keys(id) ON DELETE CASCADE;


--
-- Name: api_usage_logs api_usage_logs_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.api_usage_logs
    ADD CONSTRAINT api_usage_logs_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: api_usage_logs api_usage_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.api_usage_logs
    ADD CONSTRAINT api_usage_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: companies companies_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: companies companies_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: company_user_project_permissions company_user_project_permissions_company_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.company_user_project_permissions
    ADD CONSTRAINT company_user_project_permissions_company_user_id_fkey FOREIGN KEY (company_user_id) REFERENCES public.company_users(id) ON DELETE CASCADE;


--
-- Name: company_user_project_permissions company_user_project_permissions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.company_user_project_permissions
    ADD CONSTRAINT company_user_project_permissions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: company_user_project_permissions company_user_project_permissions_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.company_user_project_permissions
    ADD CONSTRAINT company_user_project_permissions_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: company_users company_users_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.company_users
    ADD CONSTRAINT company_users_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: company_users company_users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.company_users
    ADD CONSTRAINT company_users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.company_roles(id);


--
-- Name: customer_contacts customer_contacts_contacted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.customer_contacts
    ADD CONSTRAINT customer_contacts_contacted_by_fkey FOREIGN KEY (contacted_by) REFERENCES public.users(id);


--
-- Name: customer_users customer_users_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.customer_users
    ADD CONSTRAINT customer_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: customers customers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: customers customers_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: document_folders document_folders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.document_folders
    ADD CONSTRAINT document_folders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: document_folders document_folders_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.document_folders
    ADD CONSTRAINT document_folders_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: document_folders document_folders_parent_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.document_folders
    ADD CONSTRAINT document_folders_parent_folder_id_fkey FOREIGN KEY (parent_folder_id) REFERENCES public.document_folders(id) ON DELETE CASCADE;


--
-- Name: document_versions document_versions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: document_versions document_versions_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: documents documents_archived_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_archived_by_fkey FOREIGN KEY (archived_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: documents documents_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: documents documents_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: documents documents_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.document_folders(id) ON DELETE SET NULL;


--
-- Name: documents documents_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: documents documents_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: documents documents_unarchived_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_unarchived_by_fkey FOREIGN KEY (unarchived_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: audit_logs fk_audit_logs_project; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT fk_audit_logs_project FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: audit_logs fk_audit_logs_user; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: company_departments fk_company_departments_company; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.company_departments
    ADD CONSTRAINT fk_company_departments_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: company_departments fk_company_departments_manager; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.company_departments
    ADD CONSTRAINT fk_company_departments_manager FOREIGN KEY (manager_id) REFERENCES public.company_users(id) ON DELETE SET NULL;


--
-- Name: company_departments fk_company_departments_parent; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.company_departments
    ADD CONSTRAINT fk_company_departments_parent FOREIGN KEY (parent_id) REFERENCES public.company_departments(id) ON DELETE CASCADE;


--
-- Name: company_users fk_company_users_enterprise_department; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.company_users
    ADD CONSTRAINT fk_company_users_enterprise_department FOREIGN KEY (department_id) REFERENCES public.enterprise_departments(id) ON DELETE SET NULL;


--
-- Name: enterprise_departments fk_enterprise_departments_enterprise_id; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.enterprise_departments
    ADD CONSTRAINT fk_enterprise_departments_enterprise_id FOREIGN KEY (enterprise_id) REFERENCES public.enterprises(id) ON DELETE CASCADE;


--
-- Name: enterprise_departments fk_enterprise_departments_parent_id; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.enterprise_departments
    ADD CONSTRAINT fk_enterprise_departments_parent_id FOREIGN KEY (parent_id) REFERENCES public.enterprise_departments(id) ON DELETE SET NULL;


--
-- Name: enterprise_users fk_enterprise_users_enterprise_id; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.enterprise_users
    ADD CONSTRAINT fk_enterprise_users_enterprise_id FOREIGN KEY (enterprise_id) REFERENCES public.enterprises(id) ON DELETE CASCADE;


--
-- Name: projects fk_projects_enterprise_id; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT fk_projects_enterprise_id FOREIGN KEY (enterprise_id) REFERENCES public.enterprises(id) ON DELETE SET NULL;


--
-- Name: task_time_logs fk_task_time_logs_task; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.task_time_logs
    ADD CONSTRAINT fk_task_time_logs_task FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_time_logs fk_task_time_logs_user; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.task_time_logs
    ADD CONSTRAINT fk_task_time_logs_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users fk_users_company_id; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_users_company_id FOREIGN KEY (company_id) REFERENCES public.customers(id) ON DELETE SET NULL;


--
-- Name: users fk_users_current_timing_task; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_users_current_timing_task FOREIGN KEY (current_timing_task_id) REFERENCES public.tasks(id) ON DELETE SET NULL;


--
-- Name: users fk_users_current_user_timer_task; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_users_current_user_timer_task FOREIGN KEY (current_user_timer_task_id) REFERENCES public.user_timer_tasks(id) ON DELETE SET NULL;


--
-- Name: permission_audit_logs permission_audit_logs_company_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.permission_audit_logs
    ADD CONSTRAINT permission_audit_logs_company_user_id_fkey FOREIGN KEY (company_user_id) REFERENCES public.company_users(id);


--
-- Name: permission_audit_logs permission_audit_logs_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.permission_audit_logs
    ADD CONSTRAINT permission_audit_logs_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(id);


--
-- Name: permission_audit_logs permission_audit_logs_target_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.permission_audit_logs
    ADD CONSTRAINT permission_audit_logs_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES public.company_users(id);


--
-- Name: permission_cache permission_cache_company_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.permission_cache
    ADD CONSTRAINT permission_cache_company_user_id_fkey FOREIGN KEY (company_user_id) REFERENCES public.company_users(id) ON DELETE CASCADE;


--
-- Name: progress_snapshots progress_snapshots_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.progress_snapshots
    ADD CONSTRAINT progress_snapshots_config_id_fkey FOREIGN KEY (config_id) REFERENCES public.progress_config(id);


--
-- Name: project_companies project_companies_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.project_companies
    ADD CONSTRAINT project_companies_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: project_companies project_companies_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.project_companies
    ADD CONSTRAINT project_companies_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_users project_users_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.project_users
    ADD CONSTRAINT project_users_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_users project_users_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.project_users
    ADD CONSTRAINT project_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: projects projects_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.company_roles(id) ON DELETE CASCADE;


--
-- Name: system_audit_log system_audit_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.system_audit_log
    ADD CONSTRAINT system_audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: task_documents task_documents_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.task_documents
    ADD CONSTRAINT task_documents_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: task_documents task_documents_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.task_documents
    ADD CONSTRAINT task_documents_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: task_documents task_documents_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.task_documents
    ADD CONSTRAINT task_documents_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_relationships task_relationships_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.task_relationships
    ADD CONSTRAINT task_relationships_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: task_relationships task_relationships_source_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.task_relationships
    ADD CONSTRAINT task_relationships_source_task_id_fkey FOREIGN KEY (source_task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_relationships task_relationships_target_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.task_relationships
    ADD CONSTRAINT task_relationships_target_task_id_fkey FOREIGN KEY (target_task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


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
-- Name: task_time_logs task_time_logs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.task_time_logs
    ADD CONSTRAINT task_time_logs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: task_time_logs task_time_logs_user_timer_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.task_time_logs
    ADD CONSTRAINT task_time_logs_user_timer_task_id_fkey FOREIGN KEY (user_timer_task_id) REFERENCES public.user_timer_tasks(id) ON DELETE CASCADE;


--
-- Name: task_updates task_updates_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.task_updates
    ADD CONSTRAINT task_updates_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_updates task_updates_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.task_updates
    ADD CONSTRAINT task_updates_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_assignee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: time_estimation_history time_estimation_history_estimated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.time_estimation_history
    ADD CONSTRAINT time_estimation_history_estimated_by_fkey FOREIGN KEY (estimated_by) REFERENCES public.users(id);


--
-- Name: time_estimation_history time_estimation_history_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.time_estimation_history
    ADD CONSTRAINT time_estimation_history_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: time_estimation_history time_estimation_history_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.time_estimation_history
    ADD CONSTRAINT time_estimation_history_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.time_estimation_templates(id);


--
-- Name: time_estimation_templates time_estimation_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.time_estimation_templates
    ADD CONSTRAINT time_estimation_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: timeline_events timeline_events_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.timeline_events
    ADD CONSTRAINT timeline_events_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: timeline_events timeline_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.timeline_events
    ADD CONSTRAINT timeline_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: timer_templates timer_templates_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.timer_templates
    ADD CONSTRAINT timer_templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: unified_timer_logs unified_timer_logs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.unified_timer_logs
    ADD CONSTRAINT unified_timer_logs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: unified_timer_logs unified_timer_logs_parent_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.unified_timer_logs
    ADD CONSTRAINT unified_timer_logs_parent_task_id_fkey FOREIGN KEY (parent_task_id) REFERENCES public.tasks(id) ON DELETE SET NULL;


--
-- Name: unified_timer_logs unified_timer_logs_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.unified_timer_logs
    ADD CONSTRAINT unified_timer_logs_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: unified_timer_logs unified_timer_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.unified_timer_logs
    ADD CONSTRAINT unified_timer_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_timer_preferences user_timer_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.user_timer_preferences
    ADD CONSTRAINT user_timer_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_timer_tasks user_timer_tasks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.user_timer_tasks
    ADD CONSTRAINT user_timer_tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_current_timer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_current_timer_id_fkey FOREIGN KEY (current_timer_id) REFERENCES public.unified_timer_logs(id) ON DELETE SET NULL;


--
-- Name: work_note_folders work_note_folders_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.work_note_folders
    ADD CONSTRAINT work_note_folders_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.work_note_folders(id) ON DELETE CASCADE;


--
-- Name: work_note_task_relations work_note_task_relations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.work_note_task_relations
    ADD CONSTRAINT work_note_task_relations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: work_note_task_relations work_note_task_relations_task_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.work_note_task_relations
    ADD CONSTRAINT work_note_task_relations_task_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: work_note_task_relations work_note_task_relations_work_note_fkey; Type: FK CONSTRAINT; Schema: public; Owner: dev_user
--

ALTER TABLE ONLY public.work_note_task_relations
    ADD CONSTRAINT work_note_task_relations_work_note_fkey FOREIGN KEY (work_note_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: TABLE pg_stat_replication; Type: ACL; Schema: pg_catalog; Owner: dev_user
--

GRANT SELECT ON TABLE pg_catalog.pg_stat_replication TO repl_user;


--
-- PostgreSQL database dump complete
--

