-- 043_create_system_users_table/down.sql
-- 回滚system_users表的创建
-- 作者: Claude Code AI
-- 创建时间: 2025-09-05

BEGIN;

-- 删除触发器
DROP TRIGGER IF EXISTS trigger_system_users_updated_at ON system_users;
DROP TRIGGER IF EXISTS trigger_failed_login_handler ON system_users;

-- 删除触发器函数
DROP FUNCTION IF EXISTS update_system_users_updated_at();
DROP FUNCTION IF EXISTS reset_failed_login_attempts();

-- 删除索引（如果存在）
DROP INDEX IF EXISTS idx_system_users_username;
DROP INDEX IF EXISTS idx_system_users_email;
DROP INDEX IF EXISTS idx_system_users_role;
DROP INDEX IF EXISTS idx_system_users_is_active;
DROP INDEX IF EXISTS idx_system_users_last_login_at;
DROP INDEX IF EXISTS idx_system_users_api_key;
DROP INDEX IF EXISTS idx_system_users_session_token;
DROP INDEX IF EXISTS idx_system_users_created_at;
DROP INDEX IF EXISTS idx_system_users_deleted_at;
DROP INDEX IF EXISTS idx_system_users_username_unique;
DROP INDEX IF EXISTS idx_system_users_email_unique;

-- 删除system_users表
DROP TABLE IF EXISTS system_users;

COMMIT;

-- 输出回滚信息
\echo '==========================================';
\echo 'System Users table migration rollback completed';
\echo 'Table dropped: system_users';
\echo 'Indexes dropped: 11 indexes';
\echo 'Triggers dropped: 2 triggers';
\echo '==========================================';