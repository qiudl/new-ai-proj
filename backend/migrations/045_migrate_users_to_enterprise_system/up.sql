-- 045_migrate_users_to_enterprise_system/up.sql
-- 用户数据迁移：从现有users表迁移到新的企业用户体系
-- 作者: Claude Code AI
-- 创建时间: 2025-09-06

BEGIN;

-- 输出迁移开始信息
\echo '=========================================='
\echo 'Starting user migration to enterprise system'
\echo '=========================================='

-- 第一步：迁移company类型用户到enterprise_users表
\echo 'Step 1: Migrating company users to enterprise_users table...'

INSERT INTO enterprise_users (
    enterprise_id, username, email,
    name, phone, position, is_primary_contact,
    access_level, status, last_login_at, bio,
    created_by, updated_by, created_at, updated_at, deleted_at
)
SELECT 
    -- 通过enterprises表的描述字段关联找到对应的enterprise_id
    e.id as enterprise_id,
    u.username,
    u.email,
    COALESCE(u.contact_person_name, u.username) as name,
    u.contact_phone as phone,
    COALESCE(u.department_title, 'Unknown Position') as position,
    u.is_primary_contact,
    -- 根据角色设置访问级别
    CASE 
        WHEN u.role = 'company_admin' THEN 4
        WHEN u.role = 'company_user' THEN 2
        ELSE 2
    END as access_level,
    -- 状态映射
    CASE 
        WHEN u.status = 'active' THEN 'active'
        WHEN u.status = 'inactive' THEN 'inactive'
        WHEN u.status = 'suspended' THEN 'inactive'
        ELSE 'inactive'
    END as status,
    u.last_login_at,
    -- 将迁移信息存储在bio字段中
    CONCAT('Migrated from users table. Original ID: ', u.id, 
           ', Role: ', u.role, ', User Type: ', u.user_type,
           CASE WHEN u.notes IS NOT NULL THEN ', Notes: ' || u.notes ELSE '' END) as bio,
    1 as created_by, -- 系统管理员
    1 as updated_by,
    u.created_at,
    u.updated_at,
    u.deleted_at
FROM users u
JOIN customers c ON c.id = u.company_id
JOIN enterprises e ON (
    -- 通过匹配客户名称来关联企业
    e.name = c.company_name AND e.description LIKE 'Migrated from customers %'
)
WHERE u.user_type = 'company' 
  AND u.deleted_at IS NULL
; -- Note: Removing ON CONFLICT clause as it depends on specific unique constraints

\echo 'Company users migration completed'

-- 第二步：保留system类型用户在原users表中，但更新其关联
\echo 'Step 2: Updating system users to remove company references...'

-- 清除system用户的company关联，因为现在使用enterprise体系
UPDATE users 
SET company_id = NULL,
    company_user_id = NULL,
    notes = COALESCE(notes, '') || ' [Company reference cleared during enterprise migration]'
WHERE user_type = 'system' 
  AND (company_id IS NOT NULL OR company_user_id IS NOT NULL)
  AND deleted_at IS NULL;

\echo 'System users updated'

-- 第三步：创建映射表记录用户迁移关系
\echo 'Step 3: Creating user mapping for reference updates...'

CREATE TEMP TABLE user_migration_mapping AS
SELECT 
    u.id as original_user_id,
    u.username as original_username,
    u.user_type as original_user_type,
    u.role as original_role,
    eu.id as enterprise_user_id,
    eu.enterprise_id,
    e.name as enterprise_name,
    'migrated_to_enterprise_users' as migration_status
FROM users u
JOIN enterprise_users eu ON (
    eu.bio LIKE 'Migrated from users table. Original ID: ' || u.id || ',%'
)
JOIN enterprises e ON e.id = eu.enterprise_id
WHERE u.user_type = 'company' AND u.deleted_at IS NULL

UNION ALL

SELECT 
    u.id as original_user_id,
    u.username as original_username,
    u.user_type as original_user_type,
    u.role as original_role,
    NULL as enterprise_user_id,
    NULL as enterprise_id,
    'System User' as enterprise_name,
    'remains_in_users_table' as migration_status
FROM users u
WHERE u.user_type = 'system' AND u.deleted_at IS NULL;

\echo 'User mapping created'

-- 第四步：验证迁移结果
\echo 'Step 4: Validating user migration results...'

-- 统计迁移结果
SELECT 
    'User Migration Summary' as info,
    (SELECT COUNT(*) FROM users WHERE user_type = 'company' AND deleted_at IS NULL) as company_users_source,
    (SELECT COUNT(*) FROM users WHERE user_type = 'system' AND deleted_at IS NULL) as system_users_remaining,
    (SELECT COUNT(*) FROM enterprise_users WHERE bio LIKE 'Migrated from users table%') as migrated_to_enterprise_users,
    (SELECT COUNT(*) FROM enterprise_users) as total_enterprise_users;

-- 检查权限分配
SELECT 
    'Access Level Distribution' as info,
    access_level,
    COUNT(*) as user_count
FROM enterprise_users 
WHERE bio LIKE 'Migrated from users table%'
GROUP BY access_level
ORDER BY access_level DESC;

-- 检查企业用户分布
SELECT 
    'Enterprise User Distribution' as info,
    e.name as enterprise_name,
    COUNT(eu.id) as user_count,
    COUNT(CASE WHEN eu.is_primary_contact THEN 1 END) as primary_contacts,
    STRING_AGG(DISTINCT eu.position, ', ') as positions
FROM enterprises e
LEFT JOIN enterprise_users eu ON e.id = eu.enterprise_id 
    AND eu.bio LIKE 'Migrated from users table%'
    AND eu.deleted_at IS NULL
WHERE e.description LIKE 'Migrated from %'
GROUP BY e.id, e.name
ORDER BY user_count DESC;

-- 检查数据完整性
SELECT 
    'Data Integrity Check' as info,
    COUNT(CASE WHEN username IS NULL OR username = '' THEN 1 END) as empty_usernames,
    COUNT(CASE WHEN email IS NULL OR email = '' THEN 1 END) as empty_emails,
    COUNT(CASE WHEN name IS NULL OR name = '' THEN 1 END) as empty_names,
    COUNT(CASE WHEN position IS NULL OR position = '' THEN 1 END) as empty_positions,
    COUNT(CASE WHEN enterprise_id IS NULL THEN 1 END) as missing_enterprise_id
FROM enterprise_users 
WHERE bio LIKE 'Migrated from users table%';

COMMIT;

-- 输出完成信息
\echo '=========================================='
\echo 'User migration to enterprise system completed'
\echo 'Summary:'
\echo '- Company users migrated to enterprise_users table'
\echo '- System users remain in users table (company refs cleared)'
\echo '- Migration mapping created for reference updates'
\echo 'Next steps:'
\echo '1. Update foreign key references in related tables'
\echo '2. Migrate department data'
\echo '3. Test user authentication with new system'
\echo '=========================================='