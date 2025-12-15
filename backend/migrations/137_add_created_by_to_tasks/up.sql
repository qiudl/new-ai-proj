-- 添加 created_by 字段到 tasks 表
-- 用于记录任务的创建人

BEGIN;

-- 添加 created_by 字段
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);

-- 用 assignee_id 填充历史数据
UPDATE tasks SET created_by = assignee_id WHERE created_by IS NULL AND assignee_id IS NOT NULL;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);

-- 添加注释
COMMENT ON COLUMN tasks.created_by IS '任务创建人ID';

COMMIT;
