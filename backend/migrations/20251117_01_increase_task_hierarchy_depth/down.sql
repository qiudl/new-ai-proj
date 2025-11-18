-- Migration Rollback: Revert task hierarchy depth from 5 back to 4 levels
-- Purpose: Restore the previous 4-level limit if needed
-- Date: 2025-11-17

BEGIN;

-- Drop the existing CHECK constraint
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS check_task_level;

-- Add back the old CHECK constraint allowing task_level up to 4
ALTER TABLE tasks ADD CONSTRAINT check_task_level CHECK (task_level >= 0 AND task_level <= 4);

-- Drop and recreate the check_task_hierarchy function with original limit
DROP FUNCTION IF EXISTS check_task_hierarchy() CASCADE;

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

    WHILE current_parent_id IS NOT NULL AND depth_count <= 5 LOOP
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

    -- Check depth limit (back to original 4)
    IF depth_count > 4 THEN
        RAISE EXCEPTION 'Task hierarchy depth cannot exceed 4 levels';
    END IF;

    -- Set the task level
    NEW.task_level := depth_count;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_check_task_hierarchy
    BEFORE INSERT OR UPDATE OF parent_id ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION check_task_hierarchy();

COMMIT;
