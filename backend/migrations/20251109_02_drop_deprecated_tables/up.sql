-- 20251109_02_drop_deprecated_tables/up.sql
-- 删除已弃用的旧表
-- 作者: Claude AI
-- 日期: 2025-11-09
-- 预计执行时间: <2秒

BEGIN;

-- ====================
-- 数据备份说明
-- ====================
-- 在删除前，这些表的数据情况：
-- - document_folders: 0行数据
-- - work_note_folders: 21行数据（已有新系统替代）
-- - enterprise_permissions_old: 18行数据（已迁移到新RBAC系统）
-- - enterprise_role_permissions_old: 0行数据
-- - enterprise_roles_old: 0行数据
-- - enterprise_user_roles_old: 0行数据

-- ====================
-- 1. 删除依赖表的外键约束
-- ====================

-- 删除documents表对document_folders的外键
ALTER TABLE documents
DROP CONSTRAINT IF EXISTS documents_folder_id_fkey;

-- 删除enterprise_user_custom_permissions对enterprise_permissions_old的外键
ALTER TABLE enterprise_user_custom_permissions
DROP CONSTRAINT IF EXISTS enterprise_user_custom_permissions_permission_id_fkey;

-- ====================
-- 2. 删除deprecated表（按依赖顺序）
-- ====================

-- 删除企业角色权限系统旧表
DROP TABLE IF EXISTS enterprise_user_roles_old CASCADE;
DROP TABLE IF EXISTS enterprise_role_permissions_old CASCADE;
DROP TABLE IF EXISTS enterprise_roles_old CASCADE;
DROP TABLE IF EXISTS enterprise_permissions_old CASCADE;

-- 删除文件夹管理旧表
DROP TABLE IF EXISTS document_folders CASCADE;
DROP TABLE IF EXISTS work_note_folders CASCADE;

COMMIT;

-- ====================
-- 输出执行信息
-- ====================
\echo '==========================================';
\echo 'Migration 20251109_02 completed';
\echo '';
\echo 'Dropped tables:';
\echo '  ✓ enterprise_user_roles_old';
\echo '  ✓ enterprise_role_permissions_old';
\echo '  ✓ enterprise_roles_old';
\echo '  ✓ enterprise_permissions_old';
\echo '  ✓ document_folders';
\echo '  ✓ work_note_folders';
\echo '';
\echo 'Removed foreign key constraints:';
\echo '  ✓ documents.folder_id -> document_folders';
\echo '  ✓ enterprise_user_custom_permissions.permission_id -> enterprise_permissions_old';
\echo '';
\echo 'Note: Old RBAC data has been migrated to new system';
\echo 'Note: Folder functionality replaced by new document management';
\echo '==========================================';
