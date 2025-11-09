-- 20251109_01_add_deleted_at_to_requirements/down.sql
-- 回滚软删除字段
-- 作者: Claude AI
-- 日期: 2025-11-09

BEGIN;

-- ====================
-- 1. 删除索引
-- ====================

DROP INDEX IF EXISTS idx_requirements_deleted_at;
DROP INDEX IF EXISTS idx_requirements_active;
DROP INDEX IF EXISTS idx_requirements_enterprise_status_active;

-- 恢复原索引
CREATE INDEX IF NOT EXISTS idx_requirements_enterprise_status
ON requirements(enterprise_id, status);

-- ====================
-- 2. 删除外键约束
-- ====================

ALTER TABLE requirements
DROP CONSTRAINT IF EXISTS fk_requirements_deleted_by;

-- ====================
-- 3. 删除字段
-- ====================

ALTER TABLE requirements DROP COLUMN IF EXISTS deleted_by;
ALTER TABLE requirements DROP COLUMN IF EXISTS deleted_at;

COMMIT;

\echo '==========================================';
\echo 'Migration 20251109_01 rolled back';
\echo 'Soft delete fields removed from requirements';
\echo '==========================================';
