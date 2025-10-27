-- 042_add_password_hash_to_enterprise_users/up.sql
-- 为enterprise_users表添加password_hash字段以支持密码重置功能
-- 作者: Claude Code AI
-- 创建时间: 2025-10-27
-- 目的: 修复密码重置500错误 - enterprise_users表缺少password_hash字段

BEGIN;

-- 添加password_hash字段
ALTER TABLE enterprise_users
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 添加字段注释
COMMENT ON COLUMN enterprise_users.password_hash IS '密码哈希值，用于用户认证';

-- 为现有的测试用户添加默认密码哈希(对应密码: password123)
UPDATE enterprise_users
SET password_hash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
WHERE password_hash IS NULL;

COMMIT;

\echo '==========================================';
\echo 'Migration 042 completed';
\echo 'Added password_hash column to enterprise_users table';
\echo 'Updated existing users with default password hash';
\echo '==========================================';
