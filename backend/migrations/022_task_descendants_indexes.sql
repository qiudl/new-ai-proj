-- 022_task_descendants_indexes.sql
-- Purpose: Improve hierarchical queries and children ordering performance
-- Note: Avoid CONCURRENTLY inside transactional migrations unless your runner supports it.

-- Up
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_sort ON tasks(parent_id, sort_order, id);

-- Down (safe no-op; keep indexes as they are beneficial)
-- To drop manually if needed:
-- DROP INDEX IF EXISTS idx_tasks_parent_sort;
-- DROP INDEX IF EXISTS idx_tasks_parent_id;

