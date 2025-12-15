-- 回滚: 删除 created_by 字段

BEGIN;

DROP INDEX IF EXISTS idx_tasks_created_by;
ALTER TABLE tasks DROP COLUMN IF EXISTS created_by;

COMMIT;
