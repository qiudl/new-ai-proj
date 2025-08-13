-- Migration 019: Create task_status_history table for parallel development tracking
-- Purpose: Track task status changes and support parallel development workflow monitoring
-- Date: 2025-08-13

-- Create task_status_history table
CREATE TABLE IF NOT EXISTS task_status_history (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    change_reason VARCHAR(500),
    change_type VARCHAR(50) DEFAULT 'manual',
    changed_by INTEGER NOT NULL REFERENCES users(id),
    
    -- Parallel development specific fields
    related_task_ids INTEGER[] DEFAULT '{}',  -- Related tasks that influenced this change
    workflow_stage VARCHAR(100),              -- Which workflow stage triggered this change
    parallel_group_id VARCHAR(100),           -- Group ID for parallel tasks
    dependency_resolved BOOLEAN DEFAULT FALSE, -- Whether this change resolved a dependency
    
    -- Metadata and timestamps
    metadata JSONB DEFAULT '{}',
    change_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Validation constraints
    CONSTRAINT valid_old_status CHECK (
        old_status IS NULL OR old_status IN ('todo', 'in_progress', 'completed', 'cancelled')
    ),
    CONSTRAINT valid_new_status CHECK (
        new_status IN ('todo', 'in_progress', 'completed', 'cancelled')
    ),
    CONSTRAINT valid_change_type CHECK (
        change_type IN (
            'manual',               -- 手动更改
            'automatic',            -- 自动更改
            'dependency_resolved',  -- 依赖解决触发
            'parallel_sync',        -- 并行同步触发
            'workflow_transition',  -- 工作流转换
            'bulk_update',          -- 批量更新
            'system_migration'      -- 系统迁移
        )
    )
);

-- Create indexes for performance optimization
CREATE INDEX idx_task_status_history_task_id ON task_status_history(task_id);
CREATE INDEX idx_task_status_history_changed_by ON task_status_history(changed_by);
CREATE INDEX idx_task_status_history_timestamp ON task_status_history(change_timestamp);
CREATE INDEX idx_task_status_history_new_status ON task_status_history(new_status);
CREATE INDEX idx_task_status_history_change_type ON task_status_history(change_type);

-- Composite indexes for complex queries
CREATE INDEX idx_task_status_history_task_timestamp ON task_status_history(task_id, change_timestamp);
CREATE INDEX idx_task_status_history_parallel_group ON task_status_history(parallel_group_id) WHERE parallel_group_id IS NOT NULL;
CREATE INDEX idx_task_status_history_workflow_stage ON task_status_history(workflow_stage) WHERE workflow_stage IS NOT NULL;

-- GIN index for related_task_ids array and metadata JSONB
CREATE INDEX idx_task_status_history_related_tasks ON task_status_history USING GIN(related_task_ids);
CREATE INDEX idx_task_status_history_metadata ON task_status_history USING GIN(metadata);

-- Add comments for documentation
COMMENT ON TABLE task_status_history IS 'Task status change history with parallel development support';
COMMENT ON COLUMN task_status_history.task_id IS 'Reference to the task that changed status';
COMMENT ON COLUMN task_status_history.old_status IS 'Previous status (NULL for initial status)';
COMMENT ON COLUMN task_status_history.new_status IS 'New status after change';
COMMENT ON COLUMN task_status_history.change_reason IS 'Human-readable reason for the status change';
COMMENT ON COLUMN task_status_history.change_type IS 'Type of change: manual, automatic, dependency_resolved, parallel_sync, workflow_transition, bulk_update, system_migration';
COMMENT ON COLUMN task_status_history.related_task_ids IS 'Array of task IDs that influenced this status change';
COMMENT ON COLUMN task_status_history.workflow_stage IS 'Workflow stage that triggered this change';
COMMENT ON COLUMN task_status_history.parallel_group_id IS 'Group identifier for parallel tasks';
COMMENT ON COLUMN task_status_history.dependency_resolved IS 'Whether this change resolved a task dependency';
COMMENT ON COLUMN task_status_history.metadata IS 'Additional metadata about the status change';

-- Create helpful views for status tracking
CREATE OR REPLACE VIEW task_current_status_with_history AS
SELECT 
    t.id as task_id,
    t.title,
    t.status as current_status,
    t.project_id,
    tsh.change_timestamp as last_status_change,
    tsh.changed_by as last_changed_by,
    u.username as last_changed_by_username,
    tsh.change_reason as last_change_reason,
    tsh.parallel_group_id,
    tsh.workflow_stage
FROM tasks t
LEFT JOIN task_status_history tsh ON t.id = tsh.task_id 
LEFT JOIN users u ON tsh.changed_by = u.id
WHERE tsh.id = (
    SELECT MAX(id) 
    FROM task_status_history tsh2 
    WHERE tsh2.task_id = t.id
)
AND t.deleted_at IS NULL;

CREATE OR REPLACE VIEW parallel_task_status_overview AS
SELECT 
    tsh.parallel_group_id,
    COUNT(*) as total_tasks,
    COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
    COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_tasks,
    COUNT(CASE WHEN t.status = 'todo' THEN 1 END) as todo_tasks,
    MAX(tsh.change_timestamp) as last_update,
    ROUND(
        (COUNT(CASE WHEN t.status = 'completed' THEN 1 END) * 100.0 / COUNT(*)), 2
    ) as completion_percentage
FROM task_status_history tsh
JOIN tasks t ON tsh.task_id = t.id
WHERE tsh.parallel_group_id IS NOT NULL
AND t.deleted_at IS NULL
AND tsh.id = (
    SELECT MAX(id) 
    FROM task_status_history tsh2 
    WHERE tsh2.task_id = tsh.task_id
)
GROUP BY tsh.parallel_group_id;

-- Create function to automatically log status changes
CREATE OR REPLACE FUNCTION log_task_status_change()
RETURNS TRIGGER AS $$
DECLARE
    parallel_group VARCHAR(100);
    related_tasks INTEGER[];
BEGIN
    -- Only log if status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        -- Generate parallel group ID if this task has parallel relationships
        SELECT COALESCE(
            'parallel_group_' || MIN(tr.id),
            NULL
        ) INTO parallel_group
        FROM task_relationships tr
        WHERE (tr.source_task_id = NEW.id OR tr.target_task_id = NEW.id)
        AND tr.relationship_type = 'parallel_with'
        AND tr.deleted_at IS NULL;
        
        -- Get related task IDs
        SELECT ARRAY_AGG(DISTINCT 
            CASE 
                WHEN tr.source_task_id = NEW.id THEN tr.target_task_id
                ELSE tr.source_task_id
            END
        ) INTO related_tasks
        FROM task_relationships tr
        WHERE (tr.source_task_id = NEW.id OR tr.target_task_id = NEW.id)
        AND tr.deleted_at IS NULL;
        
        -- Insert status history record
        INSERT INTO task_status_history (
            task_id,
            old_status,
            new_status,
            change_type,
            changed_by,
            related_task_ids,
            parallel_group_id,
            dependency_resolved,
            metadata
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            'automatic',
            COALESCE(NEW.updated_by, 1), -- Default to user 1 if no updated_by
            COALESCE(related_tasks, '{}'),
            parallel_group,
            (NEW.status = 'completed' AND EXISTS(
                SELECT 1 FROM task_relationships tr
                WHERE tr.target_task_id = NEW.id 
                AND tr.relationship_type = 'depends_on'
                AND tr.deleted_at IS NULL
            )),
            jsonb_build_object(
                'auto_logged', true,
                'trigger_source', 'task_update'
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically log status changes
DROP TRIGGER IF EXISTS trigger_log_task_status_change ON tasks;
CREATE TRIGGER trigger_log_task_status_change
    AFTER UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION log_task_status_change();

-- Create function to get task status history
CREATE OR REPLACE FUNCTION get_task_status_timeline(p_task_id INTEGER)
RETURNS TABLE (
    change_id INTEGER,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    change_reason VARCHAR(500),
    change_type VARCHAR(50),
    changed_by_username VARCHAR(100),
    change_timestamp TIMESTAMP,
    related_task_count INTEGER,
    parallel_group_id VARCHAR(100)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tsh.id as change_id,
        tsh.old_status,
        tsh.new_status,
        tsh.change_reason,
        tsh.change_type,
        u.username as changed_by_username,
        tsh.change_timestamp,
        COALESCE(array_length(tsh.related_task_ids, 1), 0) as related_task_count,
        tsh.parallel_group_id
    FROM task_status_history tsh
    LEFT JOIN users u ON tsh.changed_by = u.id
    WHERE tsh.task_id = p_task_id
    ORDER BY tsh.change_timestamp DESC;
END;
$$ LANGUAGE plpgsql;

-- Sample data for testing (commented out for production)
/*
-- Insert sample status history
INSERT INTO task_status_history (task_id, old_status, new_status, change_reason, change_type, changed_by) VALUES
(212, NULL, 'todo', 'Task created', 'automatic', 1),
(212, 'todo', 'in_progress', 'Started database design', 'manual', 1),
(213, NULL, 'todo', 'Task created', 'automatic', 1),
(214, NULL, 'todo', 'Task created', 'automatic', 1);
*/