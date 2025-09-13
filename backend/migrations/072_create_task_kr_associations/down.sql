-- 回滚脚本：删除任务与关键结果关联表

-- 删除触发器
DROP TRIGGER IF EXISTS trigger_update_task_kr_associations_updated_at ON task_key_result_associations;

-- 删除触发器函数
DROP FUNCTION IF EXISTS update_task_kr_associations_updated_at();

-- 删除索引
DROP INDEX IF EXISTS idx_task_kr_task_id;
DROP INDEX IF EXISTS idx_task_kr_key_result_id;
DROP INDEX IF EXISTS idx_task_kr_sync_mode;

-- 删除表
DROP TABLE IF EXISTS task_key_result_associations;