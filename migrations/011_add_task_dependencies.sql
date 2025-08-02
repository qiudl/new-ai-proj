-- Migration: 011_add_task_dependencies.sql
-- Purpose: Add dependencies support to tasks table for AI smart task management
-- Date: 2025-08-02
-- Related: Issue #122 - AI智能任务管理功能集

-- Add dependencies field to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS dependencies JSONB DEFAULT '[]'::jsonb;

-- Add index for dependencies field for efficient querying
CREATE INDEX IF NOT EXISTS idx_tasks_dependencies ON tasks USING GIN (dependencies);

-- Add estimated_hours field if not exists (for AI time estimation)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(5,2) DEFAULT 0;

-- Add priority field if not exists (for AI priority analysis)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium' 
CHECK (priority IN ('low', 'medium', 'high'));

-- Add tags field if not exists (for AI tag generation)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;

-- Add index for tags field
CREATE INDEX IF NOT EXISTS idx_tasks_tags ON tasks USING GIN (tags);

-- Add index for priority field
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks (priority);

-- Add index for estimated_hours field
CREATE INDEX IF NOT EXISTS idx_tasks_estimated_hours ON tasks (estimated_hours);

-- Add constraint to prevent self-dependency and circular dependencies
-- Note: This is a basic check, more complex circular dependency detection 
-- should be implemented in application logic
CREATE OR REPLACE FUNCTION check_task_dependencies()
RETURNS TRIGGER AS $$
BEGIN
    -- Prevent self-dependency
    IF NEW.id = ANY(SELECT jsonb_array_elements_text(NEW.dependencies)::int) THEN
        RAISE EXCEPTION 'Task cannot depend on itself';
    END IF;
    
    -- Prevent dependency on non-existent tasks (within same project)
    IF EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(NEW.dependencies) AS dep(task_id)
        WHERE NOT EXISTS (
            SELECT 1 FROM tasks 
            WHERE id = dep.task_id::int 
            AND project_id = NEW.project_id 
            AND deleted_at IS NULL
        )
    ) THEN
        RAISE EXCEPTION 'Cannot depend on non-existent or deleted tasks within the same project';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for dependency validation
DROP TRIGGER IF EXISTS trigger_check_task_dependencies ON tasks;
CREATE TRIGGER trigger_check_task_dependencies
    BEFORE INSERT OR UPDATE ON tasks
    FOR EACH ROW
    WHEN (NEW.dependencies IS NOT NULL)
    EXECUTE FUNCTION check_task_dependencies();

-- Add comment to document the dependencies field structure
COMMENT ON COLUMN tasks.dependencies IS 'JSONB array of task IDs that this task depends on. Format: [123, 456, 789]';
COMMENT ON COLUMN tasks.estimated_hours IS 'AI-estimated hours for task completion';
COMMENT ON COLUMN tasks.priority IS 'AI-analyzed task priority: low, medium, high';
COMMENT ON COLUMN tasks.tags IS 'AI-generated tags for task categorization. Format: ["frontend", "react", "optimization"]';

-- Sample data for testing (optional, can be removed in production)
-- Update some existing tasks with dependencies for testing
DO $$
BEGIN
    -- Add some sample dependencies if tasks exist
    IF EXISTS (SELECT 1 FROM tasks WHERE id >= 2) THEN
        UPDATE tasks SET 
            dependencies = '[1]'::jsonb,
            estimated_hours = 8.5,
            priority = 'high',
            tags = '["backend", "api", "development"]'::jsonb
        WHERE id = 2 AND dependencies IS NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM tasks WHERE id >= 3) THEN
        UPDATE tasks SET 
            dependencies = '[1, 2]'::jsonb,
            estimated_hours = 16.0,
            priority = 'medium',
            tags = '["frontend", "react", "ui"]'::jsonb
        WHERE id = 3 AND dependencies IS NULL;
    END IF;
END $$;

-- Verify the migration
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'tasks' 
AND column_name IN ('dependencies', 'estimated_hours', 'priority', 'tags')
ORDER BY column_name;