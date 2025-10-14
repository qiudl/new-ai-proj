-- Migration: 20251012_01_task_title_uniqueness_index.sql
-- Purpose: 优化任务标题唯一性检查性能
-- Date: 2025-10-12
-- Description: 为任务标题唯一性检查创建专门的部分索引，提升实时验证性能

-- 创建针对标题唯一性检查的部分索引
-- 这个索引专门用于 CheckTaskTitleUnique 查询，包含 project_id, title 和 deleted_at 条件
-- 使用部分索引只索引未删除的任务，减小索引大小，提高查询速度
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_title_uniqueness
ON tasks (project_id, title)
WHERE deleted_at IS NULL;

-- 添加注释说明索引用途
COMMENT ON INDEX idx_tasks_title_uniqueness IS '任务标题唯一性检查专用索引，用于实时验证任务标题是否重复';

-- 说明：
-- 1. 使用 CONCURRENTLY 避免锁表，允许在生产环境安全执行
-- 2. 部分索引 (WHERE deleted_at IS NULL) 只索引有效任务，减小索引大小
-- 3. 索引列顺序 (project_id, title) 完美匹配查询条件
-- 4. 这个索引将显著提升标题唯一性检查的性能，特别是在大量任务的项目中

-- Rollback:
-- DROP INDEX CONCURRENTLY IF EXISTS idx_tasks_title_uniqueness;
