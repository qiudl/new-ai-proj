-- 045_migrate_users_to_enterprise_system/down.sql
-- 回滚用户迁移：恢复用户数据到原始状态
-- 作者: Claude Code AI
-- 创建时间: 2025-09-06

BEGIN;

-- 输出回滚开始信息
\echo '=========================================='
\echo 'Starting rollback of user migration to enterprise system'
\echo '=========================================='

-- 第一步：删除迁移到enterprise_users表的用户数据
\echo 'Step 1: Removing migrated users from enterprise_users table...'

-- 统计要删除的记录数
SELECT 
    'Records to be removed' as info,
    COUNT(*) as count
FROM enterprise_users 
WHERE profile_data->>'migration_source' = 'users_table_company_type';

-- 删除迁移的enterprise_users数据
DELETE FROM enterprise_users 
WHERE profile_data->>'migration_source' = 'users_table_company_type';

\echo 'Migrated enterprise users removed'

-- 第二步：恢复system用户的company关联（如果有备份信息）
\echo 'Step 2: Restoring system users company references...'

-- 移除迁移时添加的notes标记
UPDATE users 
SET notes = REPLACE(notes, ' [Company reference cleared during enterprise migration]', '')
WHERE user_type = 'system' 
  AND notes LIKE '% [Company reference cleared during enterprise migration]%'
  AND deleted_at IS NULL;

\echo 'System users notes cleaned'

-- 第三步：验证回滚结果
\echo 'Step 3: Validating rollback results...'

-- 检查enterprise_users表中是否还有迁移数据
SELECT 
    'Rollback Verification' as info,
    COUNT(*) as remaining_migrated_users
FROM enterprise_users 
WHERE bio LIKE 'Migrated from users table%';

-- 统计当前用户分布
SELECT 
    'Current User Distribution' as info,
    user_type,
    role,
    COUNT(*) as count
FROM users 
WHERE deleted_at IS NULL
GROUP BY user_type, role
ORDER BY user_type, role;

-- 检查enterprise_users表状态
SELECT 
    'Enterprise Users Status' as info,
    COUNT(*) as total_enterprise_users,
    COUNT(CASE WHEN profile_data ? 'migration_source' THEN 1 END) as migration_related_users
FROM enterprise_users;

COMMIT;

-- 输出完成信息
\echo '=========================================='
\echo 'User migration rollback completed'
\echo 'Original users table restored to pre-migration state'
\echo 'Enterprise users migration data removed'
\echo '=========================================='