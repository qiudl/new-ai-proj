-- 权限系统性能优化SQL脚本
-- 文件: performance_optimization.sql
-- 描述: 优化权限系统的查询性能和索引
-- 作者: Claude AI
-- 创建时间: 2025-08-26

BEGIN;

-- 1. 创建高性能索引
\echo '创建权限系统性能优化索引...'

-- 权限缓存表索引（如果表存在）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permission_cache') THEN
        CREATE INDEX IF NOT EXISTS idx_permission_cache_key ON permission_cache(cache_key);
        CREATE INDEX IF NOT EXISTS idx_permission_cache_user ON permission_cache(company_user_id);
        CREATE INDEX IF NOT EXISTS idx_permission_cache_expires ON permission_cache(expires_at);
        RAISE NOTICE '权限缓存表索引已创建';
    ELSE
        RAISE NOTICE '权限缓存表不存在，跳过缓存索引创建';
    END IF;
END$$;

-- 角色权限关联表复合索引
CREATE INDEX IF NOT EXISTS idx_role_permissions_active 
ON role_permissions(role_id, permission_id) 
WHERE is_granted = true;

-- 权限表按代码查询索引
CREATE INDEX IF NOT EXISTS idx_permissions_active_code 
ON permissions(permission_code) 
WHERE is_active = true;

-- 权限表按模块查询索引
CREATE INDEX IF NOT EXISTS idx_permissions_module 
ON permissions(module, is_active);

-- 公司用户表复合索引
CREATE INDEX IF NOT EXISTS idx_company_users_role 
ON company_users(role_id, status) 
WHERE status = 'active';

-- 角色表激活状态索引
CREATE INDEX IF NOT EXISTS idx_company_roles_active 
ON company_roles(role_code, is_active) 
WHERE is_active = true;

-- 2. 创建用户有效权限物化视图
\echo '创建用户权限物化视图...'

DROP MATERIALIZED VIEW IF EXISTS mv_user_effective_permissions;

CREATE MATERIALIZED VIEW mv_user_effective_permissions AS
SELECT 
    cu.id as company_user_id,
    cu.name as user_name,
    cu.email as user_email,
    cr.id as role_id,
    cr.role_code,
    cr.role_name,
    p.id as permission_id,
    p.permission_code,
    p.permission_name,
    p.module,
    p.resource,
    p.action,
    rp.is_granted,
    NOW() as last_updated
FROM company_users cu
JOIN company_roles cr ON cu.role_id = cr.id AND cr.is_active = true
JOIN role_permissions rp ON cr.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id AND p.is_active = true
WHERE cu.status = 'active' AND rp.is_granted = true;

-- 创建物化视图索引
CREATE UNIQUE INDEX idx_mv_user_perms_unique 
ON mv_user_effective_permissions(company_user_id, permission_code);

CREATE INDEX idx_mv_user_perms_user 
ON mv_user_effective_permissions(company_user_id);

CREATE INDEX idx_mv_user_perms_permission 
ON mv_user_effective_permissions(permission_code);

CREATE INDEX idx_mv_user_perms_module 
ON mv_user_effective_permissions(module);

-- 3. 创建角色权限汇总视图
\echo '创建角色权限汇总视图...'

CREATE OR REPLACE VIEW v_role_permission_summary AS
SELECT 
    cr.id as role_id,
    cr.role_code,
    cr.role_name,
    cr.role_description,
    COUNT(p.id) as total_permissions,
    COUNT(CASE WHEN rp.is_granted = true THEN 1 END) as granted_permissions,
    COUNT(CASE WHEN rp.is_granted = false THEN 1 END) as denied_permissions,
    array_agg(DISTINCT p.module ORDER BY p.module) as modules,
    array_agg(p.permission_code ORDER BY p.permission_code) FILTER (WHERE rp.is_granted = true) as granted_permission_codes
FROM company_roles cr
LEFT JOIN role_permissions rp ON cr.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id AND p.is_active = true
WHERE cr.is_active = true
GROUP BY cr.id, cr.role_code, cr.role_name, cr.role_description;

-- 4. 创建用户权限检查函数（高性能版本）
\echo '创建高性能权限检查函数...'

CREATE OR REPLACE FUNCTION check_user_permission_fast(
    p_user_id INTEGER,
    p_permission_code VARCHAR(100)
) RETURNS TABLE(
    has_permission BOOLEAN,
    source VARCHAR(20),
    reason TEXT
) AS $$
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
$$ LANGUAGE plpgsql;

-- 5. 创建批量权限检查函数
\echo '创建批量权限检查函数...'

CREATE OR REPLACE FUNCTION check_user_permissions_batch(
    p_user_id INTEGER,
    p_permission_codes VARCHAR(100)[]
) RETURNS TABLE(
    permission_code VARCHAR(100),
    has_permission BOOLEAN,
    source VARCHAR(20),
    reason TEXT
) AS $$
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
                WHEN EXISTS (SELECT 1 FROM permissions WHERE permission_code = pc.perm_code AND is_active = true) THEN 'denied'
                ELSE 'invalid'
            END as source,
            CASE 
                WHEN mv.permission_code IS NOT NULL THEN format('Permission granted through role: %s', mv.role_name)
                WHEN EXISTS (SELECT 1 FROM permissions WHERE permission_code = pc.perm_code AND is_active = true) THEN 'Permission not granted to user role'
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
$$ LANGUAGE plpgsql;

-- 6. 创建权限统计视图
\echo '创建权限统计分析视图...'

CREATE OR REPLACE VIEW v_permission_analytics AS
SELECT 
    p.module,
    COUNT(*) as total_permissions,
    COUNT(CASE WHEN rp.is_granted = true THEN 1 END) as granted_count,
    COUNT(DISTINCT rp.role_id) as roles_with_permission,
    COUNT(DISTINCT mv.company_user_id) as users_with_permission,
    ROUND(
        (COUNT(CASE WHEN rp.is_granted = true THEN 1 END) * 100.0) / NULLIF(COUNT(*), 0), 
        2
    ) as grant_percentage
FROM permissions p
LEFT JOIN role_permissions rp ON p.id = rp.permission_id
LEFT JOIN mv_user_effective_permissions mv ON p.permission_code = mv.permission_code
WHERE p.is_active = true
GROUP BY p.module
ORDER BY total_permissions DESC;

-- 7. 创建定时刷新物化视图的函数
\echo '创建物化视图刷新函数...'

CREATE OR REPLACE FUNCTION refresh_permission_materialized_views()
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql;

-- 8. 创建权限缓存清理函数
\echo '创建权限缓存清理函数...'

CREATE OR REPLACE FUNCTION cleanup_expired_permission_cache()
RETURNS INTEGER AS $$
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
$$ LANGUAGE plpgsql;

-- 9. 创建权限系统健康检查函数
\echo '创建权限系统健康检查函数...'

CREATE OR REPLACE FUNCTION permission_system_health_check()
RETURNS TABLE(
    check_name VARCHAR(50),
    status VARCHAR(20),
    details TEXT,
    recommendation TEXT
) AS $$
BEGIN
    -- 检查1: 孤立的角色权限
    RETURN QUERY
    SELECT 
        'orphan_role_permissions'::VARCHAR(50),
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'WARN' END::VARCHAR(20),
        format('Found %s orphan role permissions', COUNT(*))::TEXT,
        CASE WHEN COUNT(*) > 0 THEN 'Run data cleanup to remove orphan records' ELSE 'No action needed' END::TEXT
    FROM role_permissions rp
    LEFT JOIN company_roles cr ON rp.role_id = cr.id
    LEFT JOIN permissions p ON rp.permission_id = p.id
    WHERE cr.id IS NULL OR p.id IS NULL;
    
    -- 检查2: 无权限的角色
    RETURN QUERY
    SELECT 
        'roles_without_permissions'::VARCHAR(50),
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'INFO' END::VARCHAR(20),
        format('Found %s roles without any permissions', COUNT(*))::TEXT,
        CASE WHEN COUNT(*) > 0 THEN 'Review role configurations and assign appropriate permissions' ELSE 'All roles have permissions' END::TEXT
    FROM company_roles cr
    LEFT JOIN role_permissions rp ON cr.id = rp.role_id AND rp.is_granted = true
    WHERE cr.is_active = true AND rp.role_id IS NULL;
    
    -- 检查3: 物化视图数据新鲜度
    RETURN QUERY
    SELECT 
        'materialized_view_freshness'::VARCHAR(50),
        CASE 
            WHEN mv_age.age_hours < 24 THEN 'PASS'
            WHEN mv_age.age_hours < 72 THEN 'WARN'
            ELSE 'FAIL'
        END::VARCHAR(20),
        format('Materialized view is %s hours old', ROUND(mv_age.age_hours, 1))::TEXT,
        CASE 
            WHEN mv_age.age_hours >= 72 THEN 'Refresh materialized view immediately'
            WHEN mv_age.age_hours >= 24 THEN 'Consider refreshing materialized view'
            ELSE 'Materialized view is fresh'
        END::TEXT
    FROM (
        SELECT EXTRACT(EPOCH FROM (NOW() - MAX(last_updated))) / 3600 as age_hours
        FROM mv_user_effective_permissions
    ) mv_age;
    
    -- 检查4: 权限分布统计
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
            (SELECT COUNT(*) FROM company_users WHERE status = 'active') as user_count
    ) counts;
END;
$$ LANGUAGE plpgsql;

-- 提交事务
COMMIT;

\echo '权限系统性能优化完成！'
\echo '建议：'
\echo '1. 设置定时任务每小时刷新物化视图'
\echo '2. 设置定时任务每日清理过期缓存'
\echo '3. 定期运行健康检查函数'
\echo '4. 考虑启用Redis缓存以进一步提升性能'