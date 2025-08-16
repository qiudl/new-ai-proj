-- Migration: Add soft delete support
-- This migration adds deleted_at columns to projects and tasks tables
-- and creates system audit log table

-- Add deleted_at columns for soft delete
ALTER TABLE projects ADD COLUMN deleted_at TIMESTAMPTZ NULL;
ALTER TABLE tasks ADD COLUMN deleted_at TIMESTAMPTZ NULL;

-- Create indexes for soft delete queries
CREATE INDEX idx_projects_deleted_at ON projects(deleted_at);
CREATE INDEX idx_tasks_deleted_at ON tasks(deleted_at);

-- Create partial indexes for active (non-deleted) records
CREATE INDEX idx_projects_active_deleted ON projects(owner_id, created_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_active_deleted ON tasks(project_id, status) WHERE deleted_at IS NULL;

-- Create system audit log table for tracking operations
CREATE TABLE system_audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE, RESTORE
    entity_type VARCHAR(50) NOT NULL, -- project, task, user
    entity_id INTEGER NOT NULL,
    entity_data JSONB, -- Store snapshot of entity data
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for audit log
CREATE INDEX idx_audit_log_user_id ON system_audit_log(user_id);
CREATE INDEX idx_audit_log_action ON system_audit_log(action);
CREATE INDEX idx_audit_log_entity ON system_audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created_at ON system_audit_log(created_at);

-- Add constraints
ALTER TABLE system_audit_log ADD CONSTRAINT chk_audit_action 
    CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'LOGIN', 'LOGOUT'));
ALTER TABLE system_audit_log ADD CONSTRAINT chk_audit_entity_type 
    CHECK (entity_type IN ('project', 'task', 'user', 'system'));

-- Function to create audit log entries
CREATE OR REPLACE FUNCTION create_audit_log(
    p_user_id INTEGER,
    p_action VARCHAR(50),
    p_entity_type VARCHAR(50),
    p_entity_id INTEGER,
    p_entity_data JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    audit_id INTEGER;
BEGIN
    INSERT INTO system_audit_log (
        user_id, action, entity_type, entity_id, entity_data, ip_address, user_agent
    ) VALUES (
        p_user_id, p_action, p_entity_type, p_entity_id, p_entity_data, p_ip_address, p_user_agent
    ) RETURNING id INTO audit_id;
    
    RETURN audit_id;
END;
$$ LANGUAGE plpgsql;

-- Updated views to exclude deleted records
DROP VIEW IF EXISTS project_task_stats;
CREATE VIEW project_task_stats AS
SELECT 
    p.id as project_id,
    p.name as project_name,
    p.owner_id,
    u.username as owner_username,
    COUNT(t.id) as total_tasks,
    COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
    COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_tasks,
    COUNT(CASE WHEN t.status = 'todo' THEN 1 END) as todo_tasks,
    ROUND(
        COUNT(CASE WHEN t.status = 'completed' THEN 1 END) * 100.0 / 
        NULLIF(COUNT(t.id), 0), 2
    ) as completion_percentage
FROM projects p
LEFT JOIN tasks t ON p.id = t.project_id AND t.deleted_at IS NULL
LEFT JOIN users u ON p.owner_id = u.id
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.name, p.owner_id, u.username;

-- Updated user task assignments view
DROP VIEW IF EXISTS user_task_assignments;
CREATE VIEW user_task_assignments AS
SELECT 
    u.id as user_id,
    u.username,
    u.role,
    COUNT(t.id) as assigned_tasks,
    COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
    COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_tasks,
    COUNT(CASE WHEN t.status = 'todo' THEN 1 END) as todo_tasks
FROM users u
LEFT JOIN tasks t ON u.id = t.assignee_id AND t.deleted_at IS NULL
GROUP BY u.id, u.username, u.role;

-- Updated overdue tasks view
DROP VIEW IF EXISTS overdue_tasks;
CREATE VIEW overdue_tasks AS
SELECT 
    t.id,
    t.title,
    t.description,
    t.status,
    t.due_date,
    t.created_at,
    p.name as project_name,
    u.username as assignee_username,
    CURRENT_DATE - t.due_date as days_overdue
FROM tasks t
JOIN projects p ON t.project_id = p.id AND p.deleted_at IS NULL
LEFT JOIN users u ON t.assignee_id = u.id
WHERE t.due_date < CURRENT_DATE 
  AND t.status IN ('todo', 'in_progress')
  AND t.deleted_at IS NULL
ORDER BY t.due_date ASC;

-- View for deleted (recycled) projects
CREATE VIEW recycled_projects AS
SELECT 
    p.id,
    p.name,
    p.description,
    p.owner_id,
    u.username as owner_username,
    p.created_at,
    p.updated_at,
    p.deleted_at,
    COUNT(t.id) as deleted_tasks_count
FROM projects p
LEFT JOIN users u ON p.owner_id = u.id
LEFT JOIN tasks t ON p.id = t.project_id AND t.deleted_at IS NOT NULL
WHERE p.deleted_at IS NOT NULL
GROUP BY p.id, p.name, p.description, p.owner_id, u.username, p.created_at, p.updated_at, p.deleted_at
ORDER BY p.deleted_at DESC;

-- View for deleted (recycled) tasks
CREATE VIEW recycled_tasks AS
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
    p.name as project_name,
    u.username as assignee_username
FROM tasks t
LEFT JOIN projects p ON t.project_id = p.id
LEFT JOIN users u ON t.assignee_id = u.id
WHERE t.deleted_at IS NOT NULL
ORDER BY t.deleted_at DESC;

-- Function to soft delete project
CREATE OR REPLACE FUNCTION soft_delete_project(
    p_project_id INTEGER,
    p_user_id INTEGER DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    project_record RECORD;
BEGIN
    -- Get project data for audit log
    SELECT p.*, u.username as owner_username 
    INTO project_record
    FROM projects p
    LEFT JOIN users u ON p.owner_id = u.id
    WHERE p.id = p_project_id AND p.deleted_at IS NULL;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Soft delete the project
    UPDATE projects 
    SET deleted_at = NOW() 
    WHERE id = p_project_id AND deleted_at IS NULL;
    
    -- Also soft delete all tasks in the project
    UPDATE tasks 
    SET deleted_at = NOW() 
    WHERE project_id = p_project_id AND deleted_at IS NULL;
    
    -- Create audit log
    PERFORM create_audit_log(
        p_user_id,
        'DELETE',
        'project',
        p_project_id,
        row_to_json(project_record)::jsonb
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to soft delete task
CREATE OR REPLACE FUNCTION soft_delete_task(
    p_task_id INTEGER,
    p_user_id INTEGER DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    task_record RECORD;
BEGIN
    -- Get task data for audit log
    SELECT t.*, p.name as project_name, u.username as assignee_username
    INTO task_record
    FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    LEFT JOIN users u ON t.assignee_id = u.id
    WHERE t.id = p_task_id AND t.deleted_at IS NULL;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Soft delete the task
    UPDATE tasks 
    SET deleted_at = NOW() 
    WHERE id = p_task_id AND deleted_at IS NULL;
    
    -- Create audit log
    PERFORM create_audit_log(
        p_user_id,
        'DELETE',
        'task',
        p_task_id,
        row_to_json(task_record)::jsonb
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to restore project
CREATE OR REPLACE FUNCTION restore_project(
    p_project_id INTEGER,
    p_user_id INTEGER DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    project_record RECORD;
BEGIN
    -- Get project data
    SELECT * INTO project_record FROM projects WHERE id = p_project_id AND deleted_at IS NOT NULL;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Restore the project
    UPDATE projects 
    SET deleted_at = NULL 
    WHERE id = p_project_id;
    
    -- Create audit log
    PERFORM create_audit_log(
        p_user_id,
        'RESTORE',
        'project',
        p_project_id,
        row_to_json(project_record)::jsonb
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to restore task
CREATE OR REPLACE FUNCTION restore_task(
    p_task_id INTEGER,
    p_user_id INTEGER DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    task_record RECORD;
    project_deleted BOOLEAN;
BEGIN
    -- Get task data
    SELECT t.*, p.deleted_at IS NOT NULL as project_is_deleted
    INTO task_record
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    WHERE t.id = p_task_id AND t.deleted_at IS NOT NULL;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check if parent project is deleted
    IF task_record.project_is_deleted THEN
        RAISE EXCEPTION 'Cannot restore task: parent project is deleted';
    END IF;
    
    -- Restore the task
    UPDATE tasks 
    SET deleted_at = NULL 
    WHERE id = p_task_id;
    
    -- Create audit log
    PERFORM create_audit_log(
        p_user_id,
        'RESTORE',
        'task',
        p_task_id,
        row_to_json(task_record)::jsonb
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to permanently delete old recycled items (cleanup)
CREATE OR REPLACE FUNCTION cleanup_recycled_items(older_than_days INTEGER DEFAULT 30)
RETURNS TABLE(deleted_projects INTEGER, deleted_tasks INTEGER) AS $$
DECLARE
    cutoff_date TIMESTAMPTZ;
    proj_count INTEGER;
    task_count INTEGER;
BEGIN
    cutoff_date := NOW() - INTERVAL '1 day' * older_than_days;
    
    -- Delete old recycled tasks
    DELETE FROM tasks 
    WHERE deleted_at IS NOT NULL AND deleted_at < cutoff_date;
    GET DIAGNOSTICS task_count = ROW_COUNT;
    
    -- Delete old recycled projects
    DELETE FROM projects 
    WHERE deleted_at IS NOT NULL AND deleted_at < cutoff_date;
    GET DIAGNOSTICS proj_count = ROW_COUNT;
    
    deleted_projects := proj_count;
    deleted_tasks := task_count;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;