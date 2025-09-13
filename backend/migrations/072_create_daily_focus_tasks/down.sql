-- Migration Rollback: 072_create_daily_focus_tasks
-- Description: Drop all daily focus tasks tables and related objects

-- 删除触发器
DROP TRIGGER IF EXISTS trigger_daily_task_stats_updated_at ON daily_task_stats;
DROP TRIGGER IF EXISTS trigger_daily_task_templates_updated_at ON daily_task_templates;
DROP TRIGGER IF EXISTS trigger_daily_focus_tasks_updated_at ON daily_focus_tasks;

-- 删除触发器函数
DROP FUNCTION IF EXISTS update_daily_focus_updated_at();

-- 删除表（按依赖关系逆序删除）
DROP TABLE IF EXISTS daily_task_stats;
DROP TABLE IF EXISTS template_tasks;
DROP TABLE IF EXISTS daily_task_templates;
DROP TABLE IF EXISTS daily_focus_tasks;