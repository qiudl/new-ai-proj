-- Migration 002: Add hierarchical task support
-- Add fields to support parent-child task relationships

-- Add hierarchical fields to tasks table
ALTER TABLE tasks ADD COLUMN parent_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN task_level INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

-- Add indexes for performance
CREATE INDEX idx_tasks_parent_id ON tasks(parent_id);
CREATE INDEX idx_tasks_level ON tasks(task_level);
CREATE INDEX idx_tasks_sort_order ON tasks(sort_order);
CREATE INDEX idx_tasks_project_parent ON tasks(project_id, parent_id);

-- Add constraint to prevent cycles and limit depth
ALTER TABLE tasks ADD CONSTRAINT check_task_level CHECK (task_level >= 0 AND task_level <= 3);

-- Create task_updates table for tracking changes
CREATE TABLE task_updates (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    update_type VARCHAR(50) NOT NULL CHECK (update_type IN ('status', 'progress', 'notes', 'parent')),
    old_value TEXT,
    new_value TEXT,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for task_updates
CREATE INDEX idx_task_updates_task_id ON task_updates(task_id);
CREATE INDEX idx_task_updates_created_at ON task_updates(created_at DESC);
CREATE INDEX idx_task_updates_type ON task_updates(update_type);

-- Create timeline_events table for activity tracking
CREATE TABLE timeline_events (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('created', 'updated', 'completed', 'deleted', 'restored')),
    event_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    description TEXT NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB
);

-- Add indexes for timeline_events
CREATE INDEX idx_timeline_events_task_id ON timeline_events(task_id);
CREATE INDEX idx_timeline_events_date ON timeline_events(event_date DESC);
CREATE INDEX idx_timeline_events_type ON timeline_events(event_type);

-- Function to validate parent-child relationships (prevent cycles)
CREATE OR REPLACE FUNCTION check_task_hierarchy()
RETURNS TRIGGER AS $$
DECLARE
    current_parent_id INTEGER;
    depth_count INTEGER := 0;
BEGIN
    -- If no parent_id, it's a root task
    IF NEW.parent_id IS NULL THEN
        NEW.task_level := 0;
        RETURN NEW;
    END IF;

    -- Check if parent exists and is in same project
    IF NOT EXISTS (
        SELECT 1 FROM tasks 
        WHERE id = NEW.parent_id 
        AND project_id = NEW.project_id 
        AND deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Parent task must exist and be in the same project';
    END IF;

    -- Prevent self-reference
    IF NEW.parent_id = NEW.id THEN
        RAISE EXCEPTION 'Task cannot be its own parent';
    END IF;

    -- Check for cycles and calculate level
    current_parent_id := NEW.parent_id;
    depth_count := 1;
    
    WHILE current_parent_id IS NOT NULL AND depth_count <= 4 LOOP
        -- Check if we've created a cycle
        IF current_parent_id = NEW.id THEN
            RAISE EXCEPTION 'Circular reference detected in task hierarchy';
        END IF;
        
        -- Get next parent
        SELECT parent_id INTO current_parent_id 
        FROM tasks 
        WHERE id = current_parent_id;
        
        depth_count := depth_count + 1;
    END LOOP;

    -- Check depth limit
    IF depth_count > 3 THEN
        RAISE EXCEPTION 'Task hierarchy depth cannot exceed 3 levels';
    END IF;

    -- Set the task level
    NEW.task_level := depth_count;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for hierarchy validation
CREATE TRIGGER trigger_check_task_hierarchy
    BEFORE INSERT OR UPDATE OF parent_id ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION check_task_hierarchy();

-- Function to automatically update parent task progress
CREATE OR REPLACE FUNCTION update_parent_task_progress()
RETURNS TRIGGER AS $$
DECLARE
    parent_task_id INTEGER;
    total_children INTEGER;
    completed_children INTEGER;
    new_progress INTEGER;
    new_status VARCHAR(20);
BEGIN
    -- Get parent task ID from the affected task
    IF TG_OP = 'DELETE' THEN
        parent_task_id := OLD.parent_id;
    ELSE
        parent_task_id := NEW.parent_id;
    END IF;

    -- If no parent, nothing to update
    IF parent_task_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Calculate children statistics
    SELECT 
        COUNT(*),
        COUNT(CASE WHEN status = 'completed' THEN 1 END)
    INTO total_children, completed_children
    FROM tasks 
    WHERE parent_id = parent_task_id 
    AND deleted_at IS NULL;

    -- Calculate new progress
    IF total_children = 0 THEN
        new_progress := 0;
        new_status := 'todo';
    ELSE
        new_progress := (completed_children * 100) / total_children;
        
        -- Determine new status
        IF completed_children = 0 THEN
            new_status := 'todo';
        ELSIF completed_children = total_children THEN
            new_status := 'completed';
        ELSE
            new_status := 'in_progress';
        END IF;
    END IF;

    -- Update parent task
    UPDATE tasks 
    SET 
        custom_fields = COALESCE(custom_fields, '{}') || jsonb_build_object('progress', new_progress),
        status = new_status,
        updated_at = NOW()
    WHERE id = parent_task_id;

    -- Create timeline event for parent update
    INSERT INTO timeline_events (task_id, event_type, description, user_id)
    VALUES (
        parent_task_id,
        'updated',
        'Progress updated automatically based on subtask completion',
        NULL
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic parent progress updates
CREATE TRIGGER trigger_update_parent_progress
    AFTER INSERT OR UPDATE OF status OR DELETE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_parent_task_progress();

-- Update recycled_tasks view to include hierarchical information
DROP VIEW IF EXISTS recycled_tasks;
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
    t.parent_id,
    t.task_level,
    p.name as project_name,
    u.username as assignee_username,
    pt.title as parent_task_title
FROM tasks t
LEFT JOIN projects p ON t.project_id = p.id
LEFT JOIN users u ON t.assignee_id = u.id
LEFT JOIN tasks pt ON t.parent_id = pt.id
WHERE t.deleted_at IS NOT NULL;

-- Insert sample hierarchical data
INSERT INTO timeline_events (task_id, event_type, description, user_id)
SELECT 
    id,
    'created',
    'Task created',
    (SELECT id FROM users WHERE username = 'admin' LIMIT 1)
FROM tasks 
WHERE deleted_at IS NULL;