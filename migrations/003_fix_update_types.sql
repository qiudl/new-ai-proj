-- Migration 003: Fix task update types to match backend implementation
-- Update the check constraint to allow all update types used by the backend

-- Drop the existing constraint
ALTER TABLE task_updates DROP CONSTRAINT task_updates_update_type_check;

-- Add the updated constraint with all required types
ALTER TABLE task_updates ADD CONSTRAINT task_updates_update_type_check 
    CHECK (update_type IN ('status', 'progress', 'notes', 'parent', 'title', 'description', 'assignee', 'due_date', 'custom_fields'));

-- Add index on update_type for better query performance
CREATE INDEX IF NOT EXISTS idx_task_updates_type_value ON task_updates(update_type, new_value);