-- 041_create_enterprise_users_table/down.sql
-- 回滚enterprise_users表的创建
-- 作者: Claude Code AI
-- 创建时间: 2025-09-05

BEGIN;

-- 删除触发器
DROP TRIGGER IF EXISTS trigger_enterprise_users_updated_at ON enterprise_users;

-- 删除触发器函数
DROP FUNCTION IF EXISTS update_enterprise_users_updated_at();

-- 删除索引（如果存在）
DROP INDEX IF EXISTS idx_enterprise_users_enterprise_id;
DROP INDEX IF EXISTS idx_enterprise_users_username;
DROP INDEX IF EXISTS idx_enterprise_users_email;
DROP INDEX IF EXISTS idx_enterprise_users_status;
DROP INDEX IF EXISTS idx_enterprise_users_role_id;
DROP INDEX IF EXISTS idx_enterprise_users_department_id;
DROP INDEX IF EXISTS idx_enterprise_users_is_primary_contact;
DROP INDEX IF EXISTS idx_enterprise_users_created_at;
DROP INDEX IF EXISTS idx_enterprise_users_deleted_at;
DROP INDEX IF EXISTS idx_enterprise_users_invitation_token;
DROP INDEX IF EXISTS idx_enterprise_users_enterprise_username;
DROP INDEX IF EXISTS idx_enterprise_users_email_unique;

-- 删除外键约束
ALTER TABLE IF EXISTS enterprise_users 
DROP CONSTRAINT IF EXISTS fk_enterprise_users_enterprise_id;

-- 删除enterprise_users表
DROP TABLE IF EXISTS enterprise_users;

COMMIT;

-- 输出回滚信息
\echo '==========================================';
\echo 'Enterprise Users table migration rollback completed';
\echo 'Table dropped: enterprise_users';
\echo 'Indexes dropped: 12 indexes';
\echo 'Trigger dropped: update_enterprise_users_updated_at';
\echo 'Foreign key constraint dropped';
\echo '==========================================';