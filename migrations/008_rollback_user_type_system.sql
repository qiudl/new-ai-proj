-- Migration Rollback: 008 - User Type System Implementation
-- Description: Rollback user type distinction changes
-- Created: 2025-01-22

BEGIN;

-- ===========================================
-- 回滚步骤1: 删除新增的约束
-- ===========================================

-- 删除新增的约束
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_type_check;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_type_check;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_company_association_check;
ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_company_id;
ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_company_user_id;

-- ===========================================
-- 回滚步骤2: 恢复原始角色约束
-- ===========================================

-- 恢复原始的角色约束
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'project_manager', 'developer', 'client'));

-- ===========================================
-- 回滚步骤3: 删除新增的列
-- ===========================================

-- 删除新增的列
ALTER TABLE users DROP COLUMN IF EXISTS user_type;
ALTER TABLE users DROP COLUMN IF EXISTS company_id;
ALTER TABLE users DROP COLUMN IF EXISTS company_user_id;
ALTER TABLE users DROP COLUMN IF EXISTS is_company_admin;
ALTER TABLE users DROP COLUMN IF EXISTS company_permissions;

-- ===========================================
-- 回滚步骤4: 删除新增的表
-- ===========================================

-- 删除权限模板表
DROP TABLE IF EXISTS company_user_permission_templates;

-- ===========================================
-- 回滚步骤5: 删除新增的函数和视图
-- ===========================================

-- 删除权限检查函数
DROP FUNCTION IF EXISTS check_user_company_access(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS check_user_project_access(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS audit_user_type_changes();

-- 删除增强统计视图
DROP VIEW IF EXISTS user_stats_enhanced;

-- ===========================================
-- 回滚步骤6: 删除新增的触发器
-- ===========================================

-- 删除审计触发器
DROP TRIGGER IF EXISTS trigger_audit_user_type_changes ON users;

-- ===========================================
-- 回滚步骤7: 删除新增的索引
-- ===========================================

-- 删除新增的索引
DROP INDEX IF EXISTS idx_users_user_type;
DROP INDEX IF EXISTS idx_users_company_id;
DROP INDEX IF EXISTS idx_users_type_status;
DROP INDEX IF EXISTS idx_users_type_role;
DROP INDEX IF EXISTS idx_users_company_role;
DROP INDEX IF EXISTS idx_users_active_company;

-- ===========================================
-- 回滚步骤8: 从备份恢复数据（可选）
-- ===========================================

-- 注意：这将完全恢复到迁移前的状态，会丢失迁移后的所有用户数据更改
-- 取消注释以下代码来完全恢复数据：

/*
-- 清空当前users表
TRUNCATE TABLE users RESTART IDENTITY CASCADE;

-- 从备份恢复数据
INSERT INTO users SELECT * FROM users_backup_008;

-- 删除备份表
DROP TABLE IF EXISTS users_backup_008;
*/

-- ===========================================
-- 回滚步骤9: 清理备份表（如果不需要完全恢复数据）
-- ===========================================

-- 如果选择保留迁移后的数据更改，只删除备份表
DROP TABLE IF EXISTS users_backup_008;

-- ===========================================
-- 回滚步骤10: 恢复原始统计视图
-- ===========================================

-- 恢复原始的用户统计视图
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE status = 'active') as active_users,
    COUNT(*) FILTER (WHERE status = 'inactive') as inactive_users,
    COUNT(*) FILTER (WHERE status = 'suspended') as suspended_users,
    COUNT(*) FILTER (WHERE role = 'admin') as admin_count,
    COUNT(*) FILTER (WHERE role = 'project_manager') as project_manager_count,
    COUNT(*) FILTER (WHERE role = 'developer') as developer_count,
    COUNT(*) FILTER (WHERE role = 'client') as client_count,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as recent_registrations
FROM users;

COMMIT;

-- 显示回滚结果
SELECT 
    '=== 回滚完成统计 ===' as info,
    role,
    COUNT(*) as count
FROM users 
GROUP BY role
ORDER BY role;
