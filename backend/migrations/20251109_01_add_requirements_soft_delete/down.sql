-- 20251109_01_add_requirements_soft_delete rollback

BEGIN;

-- 删除索引
DROP INDEX IF EXISTS idx_requirements_deleted_at;

-- 删除字段
ALTER TABLE requirements DROP COLUMN IF EXISTS deleted_by;
ALTER TABLE requirements DROP COLUMN IF EXISTS deleted_at;

COMMIT;
