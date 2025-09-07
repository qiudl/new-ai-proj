-- 052_migrate_permission_system
-- 迁移权限系统相关数据：缓存和审计日志

-- 显示迁移前的统计信息
SELECT 
    'Pre-migration Statistics' as info,
    'Permission Cache' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN EXISTS(
        SELECT 1 FROM company_users cu 
        JOIN enterprise_users eu ON eu.username = 'company_user_' || cu.id::text
        WHERE cu.id = permission_cache.company_user_id
    ) THEN 1 END) as records_with_migrated_users,
    COUNT(CASE WHEN NOT EXISTS(
        SELECT 1 FROM company_users cu 
        JOIN enterprise_users eu ON eu.username = 'company_user_' || cu.id::text
        WHERE cu.id = permission_cache.company_user_id
    ) THEN 1 END) as records_with_unmigrated_users
FROM permission_cache

UNION ALL

SELECT 
    'Pre-migration Statistics' as info,
    'Permission Audit Logs' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN EXISTS(
        SELECT 1 FROM company_users cu 
        JOIN enterprise_users eu ON eu.username = 'company_user_' || cu.id::text
        WHERE cu.id = permission_audit_logs.company_user_id
    ) THEN 1 END) as records_with_migrated_users,
    COUNT(CASE WHEN NOT EXISTS(
        SELECT 1 FROM company_users cu 
        JOIN enterprise_users eu ON eu.username = 'company_user_' || cu.id::text
        WHERE cu.id = permission_audit_logs.company_user_id
    ) THEN 1 END) as records_with_unmigrated_users
FROM permission_audit_logs;

-- 显示将要保留的权限缓存记录
SELECT 
    'Will Keep - Permission Cache' as info,
    pc.id,
    pc.company_user_id,
    cu.name as user_name,
    pc.permission_code,
    pc.has_permission,
    pc.expires_at,
    eu.id as enterprise_user_id,
    eu.username as enterprise_username
FROM permission_cache pc
JOIN company_users cu ON pc.company_user_id = cu.id
JOIN enterprise_users eu ON eu.username = 'company_user_' || cu.id::text
ORDER BY pc.company_user_id, pc.id;

-- 显示将要保留的审计日志记录
SELECT 
    'Will Keep - Permission Audit Logs' as info,
    pal.id,
    pal.company_user_id,
    cu.name as user_name,
    pal.action_type,
    pal.permission_code,
    pal.performed_at,
    eu.id as enterprise_user_id,
    eu.username as enterprise_username
FROM permission_audit_logs pal
JOIN company_users cu ON pal.company_user_id = cu.id
JOIN enterprise_users eu ON eu.username = 'company_user_' || cu.id::text
ORDER BY pal.company_user_id, pal.id;

-- 清理未迁移用户的权限缓存记录
DELETE FROM permission_cache 
WHERE company_user_id NOT IN (
    SELECT cu.id 
    FROM company_users cu 
    JOIN enterprise_users eu ON eu.username = 'company_user_' || cu.id::text
);

-- 清理未迁移用户的审计日志记录（company_user_id字段）
DELETE FROM permission_audit_logs 
WHERE company_user_id IS NOT NULL 
  AND company_user_id NOT IN (
    SELECT cu.id 
    FROM company_users cu 
    JOIN enterprise_users eu ON eu.username = 'company_user_' || cu.id::text
);

-- 清理未迁移用户的审计日志记录（target_user_id字段）
DELETE FROM permission_audit_logs 
WHERE target_user_id IS NOT NULL 
  AND target_user_id NOT IN (
    SELECT cu.id 
    FROM company_users cu 
    JOIN enterprise_users eu ON eu.username = 'company_user_' || cu.id::text
);

-- 显示清理后的统计信息
SELECT 
    'Post-migration Statistics' as info,
    'Permission Cache' as table_name,
    COUNT(*) as remaining_records
FROM permission_cache

UNION ALL

SELECT 
    'Post-migration Statistics' as info,
    'Permission Audit Logs' as table_name,
    COUNT(*) as remaining_records
FROM permission_audit_logs;

-- 显示保留的记录详情
SELECT 
    'Remaining Records Summary' as info,
    'Permission Cache' as source_table,
    pc.company_user_id,
    cu.name as user_name,
    cu.customer_id,
    c.company_name,
    COUNT(pc.id) as cache_entries
FROM permission_cache pc
JOIN company_users cu ON pc.company_user_id = cu.id
LEFT JOIN companies c ON cu.customer_id = c.id
GROUP BY pc.company_user_id, cu.name, cu.customer_id, c.company_name
ORDER BY pc.company_user_id

UNION ALL

SELECT 
    'Remaining Records Summary' as info,
    'Permission Audit Logs' as source_table,
    pal.company_user_id,
    cu.name as user_name,
    cu.customer_id,
    c.company_name,
    COUNT(pal.id) as audit_entries
FROM permission_audit_logs pal
JOIN company_users cu ON pal.company_user_id = cu.id
LEFT JOIN companies c ON cu.customer_id = c.id
WHERE pal.company_user_id IS NOT NULL
GROUP BY pal.company_user_id, cu.name, cu.customer_id, c.company_name
ORDER BY pal.company_user_id;