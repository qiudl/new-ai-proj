-- 005a_add_tasks_parent_hierarchy.sql
-- Purpose: Ensure tasks table has hierarchical fields used by code and indexes
-- Date: 2025-08-23

BEGIN;

-- Add parent_id for hierarchical relationships
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL;

-- Add sort_order for ordering children under the same parent
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Optionally add task_level if not present (used by some queries)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS task_level INTEGER DEFAULT 0;

-- Soft delete column used by queries
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

COMMIT;
