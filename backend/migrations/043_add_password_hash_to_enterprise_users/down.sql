-- 043_add_password_hash_to_enterprise_users/down.sql
-- 回滚：移除enterprise_users表的password_hash字段

BEGIN;

-- 移除password_hash字段
ALTER TABLE enterprise_users
DROP COLUMN IF EXISTS password_hash;

COMMIT;

\echo '==========================================';
\echo 'Migration 042 rolled back';
\echo 'Removed password_hash column from enterprise_users table';
\echo '==========================================';
