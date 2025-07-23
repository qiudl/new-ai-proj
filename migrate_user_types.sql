-- 用户类型系统数据迁移脚本
-- 为现有用户设置正确的用户类型

-- 开始事务
BEGIN;

-- 1. 首先检查当前用户数据
SELECT 
    id, username, role, 
    COALESCE(user_type, 'NOT_SET') as current_user_type
FROM users 
ORDER BY id;

-- 2. 设置系统用户类型
-- 将admin, project_manager, developer角色的用户设为system类型
UPDATE users 
SET user_type = 'system' 
WHERE role IN ('admin', 'project_manager', 'developer') 
  AND (user_type IS NULL OR user_type = '');

-- 3. 设置企业用户类型  
-- 将client角色的用户设为company类型
UPDATE users 
SET user_type = 'company' 
WHERE role IN ('client') 
  AND (user_type IS NULL OR user_type = '');

-- 4. 处理可能存在的其他角色
-- 如果有其他角色，设为系统用户（可根据需要调整）
UPDATE users 
SET user_type = 'system' 
WHERE user_type IS NULL OR user_type = '';

-- 5. 验证更新结果
SELECT 
    user_type,
    role,
    COUNT(*) as user_count
FROM users 
GROUP BY user_type, role
ORDER BY user_type, role;

-- 6. 检查是否还有未设置用户类型的用户
SELECT COUNT(*) as unset_users
FROM users 
WHERE user_type IS NULL OR user_type = '';

-- 如果一切正常，提交事务
-- 如果有问题，可以运行 ROLLBACK; 来回滚
COMMIT;

-- 验证最终结果
SELECT 
    'Migration completed successfully' as status,
    COUNT(*) as total_users,
    COUNT(CASE WHEN user_type = 'system' THEN 1 END) as system_users,
    COUNT(CASE WHEN user_type = 'company' THEN 1 END) as company_users
FROM users;
