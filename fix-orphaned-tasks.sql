-- Fix tasks that reference deleted parent tasks
-- This script identifies and fixes tasks with parent_id pointing to deleted tasks

-- First, identify the problematic tasks
SELECT 
    'Before fix:' as status,
    child.id as task_id,
    child.title as task_title,
    child.parent_id,
    parent.title as parent_title,
    parent.deleted_at as parent_deleted
FROM tasks child
LEFT JOIN tasks parent ON child.parent_id = parent.id
WHERE child.parent_id IS NOT NULL 
  AND parent.deleted_at IS NOT NULL
  AND child.deleted_at IS NULL;

-- Fix the orphaned tasks by removing parent reference and setting task_level to 0
UPDATE tasks 
SET parent_id = NULL, 
    task_level = 0,
    updated_at = NOW()
WHERE id IN (
    SELECT child.id
    FROM tasks child
    LEFT JOIN tasks parent ON child.parent_id = parent.id
    WHERE child.parent_id IS NOT NULL 
      AND parent.deleted_at IS NOT NULL
      AND child.deleted_at IS NULL
);

-- Show the results after fix
SELECT 
    'After fix:' as status,
    COUNT(*) as orphaned_tasks_fixed
FROM tasks 
WHERE parent_id IS NULL 
  AND task_level = 0 
  AND updated_at >= NOW() - INTERVAL '1 minute';

-- Verify no more orphaned tasks exist
SELECT 
    'Verification:' as status,
    COUNT(*) as remaining_orphaned_tasks
FROM tasks child
LEFT JOIN tasks parent ON child.parent_id = parent.id
WHERE child.parent_id IS NOT NULL 
  AND parent.deleted_at IS NOT NULL
  AND child.deleted_at IS NULL;