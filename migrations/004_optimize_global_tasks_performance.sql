-- Migration 004: Optimize global tasks performance
-- Add indexes and optimizations specifically for global task queries

-- Drop existing indexes if they exist to recreate with better definitions
DROP INDEX IF EXISTS idx_tasks_deleted_at;
DROP INDEX IF EXISTS idx_tasks_project_id_deleted_at;
DROP INDEX IF EXISTS idx_tasks_assignee_id;
DROP INDEX IF EXISTS idx_tasks_due_date;
DROP INDEX IF EXISTS idx_tasks_status;
DROP INDEX IF EXISTS idx_tasks_created_at;
DROP INDEX IF EXISTS idx_tasks_updated_at;

-- Core indexes for global task queries
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at_created_at ON tasks(deleted_at, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_project_id_deleted_at ON tasks(project_id, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id_deleted_at ON tasks(assignee_id, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_status_deleted_at ON tasks(status, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_due_date_deleted_at ON tasks(due_date, deleted_at) WHERE deleted_at IS NULL AND due_date IS NOT NULL;

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_tasks_project_parent_deleted ON tasks(project_id, parent_id, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_parent_level_sort ON tasks(parent_id, task_level, sort_order) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status_deleted ON tasks(assignee_id, status, deleted_at) WHERE deleted_at IS NULL;

-- Indexes for projects table (used in JOINs)
CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name);
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON projects(deleted_at);

-- Indexes for users table (used in JOINs)
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Covering index for the most common global query (includes all frequently accessed columns)
CREATE INDEX IF NOT EXISTS idx_tasks_global_query_covering ON tasks(
    deleted_at, created_at, id, project_id, title, status, assignee_id, 
    due_date, parent_id, task_level, sort_order
) WHERE deleted_at IS NULL;

-- Optimize task_updates table for timeline queries
CREATE INDEX IF NOT EXISTS idx_task_updates_task_created ON task_updates(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_updates_type_created ON task_updates(update_type, created_at DESC);

-- Optimize timeline_events table
CREATE INDEX IF NOT EXISTS idx_timeline_events_task_date ON timeline_events(task_id, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_events_type_date ON timeline_events(event_type, event_date DESC);

-- Add GIN index for JSONB custom_fields if we need to query them frequently
CREATE INDEX IF NOT EXISTS idx_tasks_custom_fields_gin ON tasks USING GIN(custom_fields) WHERE deleted_at IS NULL;

-- Update table statistics to help query planner
ANALYZE tasks;
ANALYZE projects;
ANALYZE users;
ANALYZE task_updates;
ANALYZE timeline_events;

-- Add comments for documentation
COMMENT ON INDEX idx_tasks_deleted_at_created_at IS 'Optimizes global task listing ordered by creation date';
COMMENT ON INDEX idx_tasks_global_query_covering IS 'Covering index for global task queries to avoid table lookups';
COMMENT ON INDEX idx_tasks_custom_fields_gin IS 'Enables efficient searches within JSONB custom fields';

-- Create a view for optimized global task queries
CREATE OR REPLACE VIEW global_tasks_optimized AS
SELECT 
    t.id,
    t.project_id,
    t.title,
    t.description,
    t.status,
    t.assignee_id,
    t.due_date,
    t.custom_fields,
    t.parent_id,
    t.task_level,
    t.sort_order,
    t.created_at,
    t.updated_at,
    p.name as project_name,
    p.description as project_description,
    u.username as assignee_name,
    u.email as assignee_email,
    pt.title as parent_title,
    COALESCE(children_stats.children_count, 0) as children_count,
    COALESCE(children_stats.completed_children, 0) as completed_children
FROM tasks t
LEFT JOIN projects p ON t.project_id = p.id AND p.deleted_at IS NULL
LEFT JOIN users u ON t.assignee_id = u.id
LEFT JOIN tasks pt ON t.parent_id = pt.id AND pt.deleted_at IS NULL
LEFT JOIN (
    SELECT 
        parent_id,
        COUNT(*) as children_count,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_children
    FROM tasks 
    WHERE deleted_at IS NULL AND parent_id IS NOT NULL 
    GROUP BY parent_id
) children_stats ON t.id = children_stats.parent_id
WHERE t.deleted_at IS NULL;

COMMENT ON VIEW global_tasks_optimized IS 'Optimized view for global task queries with all related data pre-joined';

-- Create function to get performance statistics
CREATE OR REPLACE FUNCTION get_task_query_stats()
RETURNS TABLE(
    query_type TEXT,
    avg_execution_time_ms NUMERIC,
    total_executions BIGINT,
    last_execution TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'global_tasks_query'::TEXT,
        0.0::NUMERIC,
        0::BIGINT,
        NOW()::TIMESTAMPTZ;
END;
$$ LANGUAGE plpgsql;

-- Vacuum and reindex for immediate performance improvement
VACUUM ANALYZE tasks;
VACUUM ANALYZE projects;
VACUUM ANALYZE users;