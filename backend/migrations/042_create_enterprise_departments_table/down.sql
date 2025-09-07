-- 042_create_enterprise_departments_table/down.sql
-- 回滚enterprise_departments表的创建
-- 作者: Claude Code AI
-- 创建时间: 2025-09-05

BEGIN;

-- 删除触发器
DROP TRIGGER IF EXISTS trigger_enterprise_departments_updated_at ON enterprise_departments;
DROP TRIGGER IF EXISTS trigger_department_level_path ON enterprise_departments;

-- 删除触发器函数
DROP FUNCTION IF EXISTS update_enterprise_departments_updated_at();
DROP FUNCTION IF EXISTS update_department_level_and_path();

-- 删除索引（如果存在）
DROP INDEX IF EXISTS idx_enterprise_departments_enterprise_id;
DROP INDEX IF EXISTS idx_enterprise_departments_parent_id;
DROP INDEX IF EXISTS idx_enterprise_departments_manager_id;
DROP INDEX IF EXISTS idx_enterprise_departments_name;
DROP INDEX IF EXISTS idx_enterprise_departments_status;
DROP INDEX IF EXISTS idx_enterprise_departments_level;
DROP INDEX IF EXISTS idx_enterprise_departments_path;
DROP INDEX IF EXISTS idx_enterprise_departments_sort_order;
DROP INDEX IF EXISTS idx_enterprise_departments_created_at;
DROP INDEX IF EXISTS idx_enterprise_departments_deleted_at;
DROP INDEX IF EXISTS idx_enterprise_departments_unique_name;

-- 删除外键约束
ALTER TABLE IF EXISTS enterprise_departments 
DROP CONSTRAINT IF EXISTS fk_enterprise_departments_enterprise_id;

ALTER TABLE IF EXISTS enterprise_departments 
DROP CONSTRAINT IF EXISTS fk_enterprise_departments_parent_id;

-- ALTER TABLE IF EXISTS enterprise_departments 
-- DROP CONSTRAINT IF EXISTS fk_enterprise_departments_manager_id;

-- 删除enterprise_departments表
DROP TABLE IF EXISTS enterprise_departments;

COMMIT;

-- 输出回滚信息
\echo '==========================================';
\echo 'Enterprise Departments table migration rollback completed';
\echo 'Table dropped: enterprise_departments';
\echo 'Indexes dropped: 11 indexes';
\echo 'Triggers dropped: 2 triggers';
\echo 'Foreign key constraints dropped: 2';
\echo '==========================================';