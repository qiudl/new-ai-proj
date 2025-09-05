-- Migration: Create recycle bin views
-- Version: 038
-- Description: Create views for recycled projects and tasks to support recycle bin functionality

-- Create recycled_projects view
CREATE OR REPLACE VIEW recycled_projects AS
SELECT 
    p.id,
    p.name,
    p.description,
    p.owner_id,
    COALESCE(u.username, 'Unknown User') as owner_username,
    p.created_at,
    p.updated_at,
    p.deleted_at,
    COALESCE(
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.deleted_at IS NOT NULL),
        0
    ) as deleted_tasks_count
FROM projects p
LEFT JOIN users u ON p.owner_id = u.id
WHERE p.deleted_at IS NOT NULL
ORDER BY p.deleted_at DESC;

-- Create recycled_tasks view
CREATE OR REPLACE VIEW recycled_tasks AS
SELECT 
    t.id,
    t.project_id,
    t.title,
    t.description,
    t.status,
    t.assignee_id,
    t.due_date,
    t.custom_fields,
    t.created_at,
    t.deleted_at,
    COALESCE(p.name, 'Unknown Project') as project_name,
    COALESCE(u.username, '') as assignee_username
FROM tasks t
LEFT JOIN projects p ON t.project_id = p.id
LEFT JOIN users u ON t.assignee_id = u.id
WHERE t.deleted_at IS NOT NULL
ORDER BY t.deleted_at DESC;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON projects(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at) WHERE deleted_at IS NOT NULL;

-- Add comments
COMMENT ON VIEW recycled_projects IS 'View for projects in the recycle bin';
COMMENT ON VIEW recycled_tasks IS 'View for tasks in the recycle bin';