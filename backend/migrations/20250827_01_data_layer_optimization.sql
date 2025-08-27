-- 20250827_01_data_layer_optimization.sql
-- Batch 1 数据层优化：索引优化和性能提升
-- Created: 2025-08-27
-- Task: #640 - Batch 1 数据层与迁移

BEGIN;

-- =====================================
-- 1. JSONB字段GIN索引优化
-- =====================================
\echo '创建JSONB字段GIN索引...'

-- 任务自定义字段索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_custom_fields_gin 
ON tasks USING gin(custom_fields);

-- 用户档案信息索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_profile_gin 
ON users USING gin(profile);

-- 文档元数据索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_metadata_gin 
ON documents USING gin(metadata) 
WHERE metadata IS NOT NULL;

-- =====================================
-- 2. 核心业务查询复合索引
-- =====================================
\echo '创建核心业务查询索引...'

-- 任务状态和责任人复合索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_status_assignee 
ON tasks(status, assignee_id) 
WHERE deleted_at IS NULL;

-- 项目任务状态索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_project_status 
ON tasks(project_id, status) 
WHERE deleted_at IS NULL;

-- 任务到期时间和状态索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_due_date_status 
ON tasks(due_datetime, status) 
WHERE due_datetime IS NOT NULL AND deleted_at IS NULL;

-- 任务层级和排序索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_parent_sort 
ON tasks(parent_id, sort_order) 
WHERE deleted_at IS NULL;

-- 用户类型和状态索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_type_status 
ON users(user_type, status) 
WHERE deleted_at IS NULL;

-- 项目状态和优先级索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_status_priority 
ON projects(status, priority) 
WHERE deleted_at IS NULL;

-- =====================================
-- 3. 时间范围查询优化索引
-- =====================================
\echo '创建时间范围查询索引...'

-- 任务创建时间索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_created_at_desc 
ON tasks(created_at DESC) 
WHERE deleted_at IS NULL;

-- 任务更新时间索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_updated_at_desc 
ON tasks(updated_at DESC) 
WHERE deleted_at IS NULL;

-- 用户最后登录时间索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_login 
ON users(last_login_at DESC) 
WHERE last_login_at IS NOT NULL;

-- =====================================
-- 4. 文档系统优化索引
-- =====================================
\echo '创建文档系统优化索引...'

-- 文档类型和状态索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_type_status 
ON documents(type, status) 
WHERE deleted_at IS NULL;

-- 文档文件夹和可见性索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_folder_visibility 
ON documents(folder_id, visibility) 
WHERE deleted_at IS NULL;

-- 任务文档关联和类型索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_task_docs_task_type 
ON task_documents(task_id, relationship_type) 
WHERE deleted_at IS NULL;

-- =====================================
-- 5. 权限系统优化索引（如果表存在）
-- =====================================
\echo '创建权限系统优化索引...'

DO $$
BEGIN
    -- 检查并创建角色权限索引
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'role_permissions') THEN
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_role_perms_role_granted 
        ON role_permissions(role_id, is_granted) 
        WHERE is_granted = true;
        
        RAISE NOTICE '权限系统索引已创建';
    END IF;
    
    -- 检查并创建权限索引
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permissions') THEN
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_permissions_code_active 
        ON permissions(permission_code) 
        WHERE is_active = true;
        
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_permissions_module_active 
        ON permissions(module, is_active);
    END IF;
END$$;

-- =====================================
-- 6. 数据完整性检查函数
-- =====================================
\echo '创建数据完整性检查函数...'

CREATE OR REPLACE FUNCTION check_data_integrity_batch1()
RETURNS TABLE(
    check_category text,
    table_name text,
    issue_type text,
    issue_count bigint,
    description text,
    recommended_action text
) AS $$
BEGIN
    -- 检查1: 孤立的任务（项目被删除但任务还在）
    RETURN QUERY
    SELECT 
        'orphan_data'::text,
        'tasks'::text,
        'missing_project'::text,
        COUNT(*)::bigint,
        '任务引用了不存在的项目'::text,
        '检查项目是否意外删除，或清理孤立任务'::text
    FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    WHERE p.id IS NULL AND t.deleted_at IS NULL
    HAVING COUNT(*) > 0;
    
    -- 检查2: 孤立的任务文档关联
    RETURN QUERY
    SELECT 
        'orphan_data'::text,
        'task_documents'::text,
        'missing_task'::text,
        COUNT(*)::bigint,
        '任务文档关联中的任务不存在'::text,
        '清理孤立的任务文档关联记录'::text
    FROM task_documents td
    LEFT JOIN tasks t ON td.task_id = t.id
    WHERE t.id IS NULL AND td.deleted_at IS NULL
    HAVING COUNT(*) > 0;
    
    -- 检查3: 孤立的任务文档关联（文档侧）
    RETURN QUERY
    SELECT 
        'orphan_data'::text,
        'task_documents'::text,
        'missing_document'::text,
        COUNT(*)::bigint,
        '任务文档关联中的文档不存在'::text,
        '清理孤立的任务文档关联记录'::text
    FROM task_documents td
    LEFT JOIN documents d ON td.document_id = d.id
    WHERE d.id IS NULL AND td.deleted_at IS NULL
    HAVING COUNT(*) > 0;
    
    -- 检查4: 用户分配但不存在的任务
    RETURN QUERY
    SELECT 
        'orphan_data'::text,
        'tasks'::text,
        'missing_assignee'::text,
        COUNT(*)::bigint,
        '任务分配给了不存在的用户'::text,
        '检查用户是否被删除，重新分配任务'::text
    FROM tasks t
    LEFT JOIN users u ON t.assignee_id = u.id
    WHERE t.assignee_id IS NOT NULL AND u.id IS NULL AND t.deleted_at IS NULL
    HAVING COUNT(*) > 0;
    
    -- 检查5: 循环依赖的任务层级
    RETURN QUERY
    SELECT 
        'data_consistency'::text,
        'tasks'::text,
        'circular_hierarchy'::text,
        COUNT(*)::bigint,
        '检测到可能的任务层级循环依赖'::text,
        '检查任务层级设置，避免循环引用'::text
    FROM tasks t1
    JOIN tasks t2 ON t1.parent_id = t2.id
    WHERE t2.parent_id = t1.id AND t1.deleted_at IS NULL AND t2.deleted_at IS NULL
    HAVING COUNT(*) > 0;
    
    -- 如果没有任何问题，返回健康状态
    IF NOT EXISTS (
        SELECT 1 FROM tasks t LEFT JOIN projects p ON t.project_id = p.id WHERE p.id IS NULL AND t.deleted_at IS NULL
    ) AND NOT EXISTS (
        SELECT 1 FROM task_documents td LEFT JOIN tasks t ON td.task_id = t.id WHERE t.id IS NULL AND td.deleted_at IS NULL
    ) AND NOT EXISTS (
        SELECT 1 FROM task_documents td LEFT JOIN documents d ON td.document_id = d.id WHERE d.id IS NULL AND td.deleted_at IS NULL
    ) AND NOT EXISTS (
        SELECT 1 FROM tasks t LEFT JOIN users u ON t.assignee_id = u.id WHERE t.assignee_id IS NOT NULL AND u.id IS NULL AND t.deleted_at IS NULL
    ) THEN
        RETURN QUERY
        SELECT 
            'health_check'::text,
            'all_tables'::text,
            'integrity_passed'::text,
            0::bigint,
            '数据完整性检查通过，未发现问题'::text,
            '继续保持良好的数据质量'::text;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================
-- 7. 性能监控视图
-- =====================================
\echo '创建性能监控视图...'

-- 查询性能统计视图
CREATE OR REPLACE VIEW v_query_performance_stats AS
SELECT 
    schemaname,
    tablename,
    attname as column_name,
    n_distinct,
    correlation,
    null_frac,
    avg_width,
    CASE 
        WHEN n_distinct < 0 THEN 'High Cardinality'
        WHEN n_distinct < 10 THEN 'Low Cardinality'
        WHEN n_distinct < 100 THEN 'Medium Cardinality'
        ELSE 'High Cardinality'
    END as cardinality_level
FROM pg_stats 
WHERE schemaname = 'public'
AND tablename IN ('tasks', 'projects', 'users', 'documents', 'task_documents')
ORDER BY tablename, attname;

-- 表大小和索引使用统计
CREATE OR REPLACE VIEW v_table_index_stats AS
SELECT 
    t.schemaname,
    t.tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_total_relation_size(schemaname||'.'||tablename) as table_size_bytes,
    (SELECT count(*) FROM pg_indexes WHERE tablename = t.tablename) as index_count,
    s.n_tup_ins as inserts,
    s.n_tup_upd as updates,
    s.n_tup_del as deletes,
    s.n_live_tup as live_tuples,
    s.n_dead_tup as dead_tuples,
    ROUND(s.n_dead_tup * 100.0 / GREATEST(s.n_live_tup, 1), 2) as dead_tuple_percent
FROM pg_tables t
LEFT JOIN pg_stat_user_tables s ON t.tablename = s.relname
WHERE t.schemaname = 'public'
ORDER BY table_size_bytes DESC;

-- 慢查询监控（需要启用pg_stat_statements扩展）
CREATE OR REPLACE VIEW v_slow_queries AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
WHERE pg_stat_statements.query NOT LIKE '%pg_stat_statements%'
ORDER BY mean_time DESC
LIMIT 20;

-- =====================================
-- 8. 自动维护函数
-- =====================================
\echo '创建自动维护函数...'

-- 更新表统计信息
CREATE OR REPLACE FUNCTION refresh_table_statistics()
RETURNS TEXT AS $$
DECLARE
    table_record RECORD;
    result_text TEXT := '';
BEGIN
    result_text := 'Table statistics refresh started at ' || NOW() || E'\n';
    
    FOR table_record IN 
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
        AND tablename IN ('tasks', 'projects', 'users', 'documents', 'task_documents')
    LOOP
        EXECUTE 'ANALYZE ' || table_record.tablename;
        result_text := result_text || 'Analyzed table: ' || table_record.tablename || E'\n';
    END LOOP;
    
    result_text := result_text || 'Table statistics refresh completed at ' || NOW();
    RETURN result_text;
END;
$$ LANGUAGE plpgsql;

-- 清理软删除记录（30天前的）
CREATE OR REPLACE FUNCTION cleanup_old_soft_deleted_records(days_old INTEGER DEFAULT 30)
RETURNS TABLE(
    table_name text,
    deleted_count bigint
) AS $$
BEGIN
    -- 清理任务软删除记录
    RETURN QUERY
    WITH deleted_tasks AS (
        DELETE FROM tasks 
        WHERE deleted_at IS NOT NULL 
        AND deleted_at < NOW() - (days_old || ' days')::INTERVAL
        RETURNING 1
    )
    SELECT 'tasks'::text, COUNT(*)::bigint FROM deleted_tasks;
    
    -- 清理文档软删除记录
    RETURN QUERY
    WITH deleted_docs AS (
        DELETE FROM documents 
        WHERE deleted_at IS NOT NULL 
        AND deleted_at < NOW() - (days_old || ' days')::INTERVAL
        RETURNING 1
    )
    SELECT 'documents'::text, COUNT(*)::bigint FROM deleted_docs;
    
    -- 清理用户软删除记录
    RETURN QUERY
    WITH deleted_users AS (
        DELETE FROM users 
        WHERE deleted_at IS NOT NULL 
        AND deleted_at < NOW() - (days_old || ' days')::INTERVAL
        RETURNING 1
    )
    SELECT 'users'::text, COUNT(*)::bigint FROM deleted_users;
END;
$$ LANGUAGE plpgsql;

-- =====================================
-- 9. 创建数据层健康检查报告
-- =====================================
\echo '创建数据层健康检查报告函数...'

CREATE OR REPLACE FUNCTION generate_data_layer_health_report()
RETURNS TABLE(
    report_section text,
    metric_name text,
    metric_value text,
    status text,
    recommendation text
) AS $$
BEGIN
    -- 表大小统计
    RETURN QUERY
    SELECT 
        'table_sizes'::text,
        'total_database_size'::text,
        pg_size_pretty(pg_database_size(current_database()))::text,
        CASE 
            WHEN pg_database_size(current_database()) > 10737418240 THEN 'WARNING'  -- 10GB
            WHEN pg_database_size(current_database()) > 1073741824 THEN 'INFO'     -- 1GB
            ELSE 'GOOD'
        END::text,
        CASE 
            WHEN pg_database_size(current_database()) > 10737418240 THEN '考虑数据清理或分区策略'
            WHEN pg_database_size(current_database()) > 1073741824 THEN '监控数据增长趋势'
            ELSE '数据库大小正常'
        END::text;
    
    -- 索引使用情况
    RETURN QUERY
    SELECT 
        'index_usage'::text,
        'total_indexes'::text,
        COUNT(*)::text,
        'INFO'::text,
        '监控索引使用效率'::text
    FROM pg_indexes 
    WHERE schemaname = 'public';
    
    -- 数据完整性状态
    RETURN QUERY
    SELECT 
        'data_integrity'::text,
        issue_type::text,
        issue_count::text,
        CASE 
            WHEN issue_count > 0 THEN 'ERROR'
            ELSE 'GOOD'
        END::text,
        recommended_action::text
    FROM check_data_integrity_batch1();
    
END;
$$ LANGUAGE plpgsql;

-- =====================================
-- 提交并输出结果
-- =====================================

COMMIT;

-- 运行健康检查
\echo '==========================================';
\echo '数据层优化完成！正在运行健康检查...';
\echo '==========================================';

SELECT * FROM check_data_integrity_batch1();

\echo '';
\echo '==========================================';
\echo '表大小和索引统计:';
\echo '==========================================';

SELECT * FROM v_table_index_stats LIMIT 10;

\echo '';
\echo '==========================================';
\echo '优化建议:';
\echo '1. 定期运行 SELECT refresh_table_statistics(); 更新统计信息';
\echo '2. 定期运行 SELECT * FROM check_data_integrity_batch1(); 检查数据完整性';
\echo '3. 监控 v_table_index_stats 视图了解表增长情况';
\echo '4. 考虑设置定时任务清理软删除记录';
\echo '5. 启用 pg_stat_statements 扩展监控慢查询';
\echo '==========================================';
