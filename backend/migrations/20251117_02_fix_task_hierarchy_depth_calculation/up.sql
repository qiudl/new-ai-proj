-- Migration: Fix task hierarchy depth calculation
-- Purpose: Correct the depth counting logic in check_task_hierarchy function
-- Date: 2025-11-17

BEGIN;

-- Drop and recreate the check_task_hierarchy function with corrected logic
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
    depth_count := 1;  -- Start at 1 since we have a parent

    -- Traverse up the hierarchy to count depth and detect cycles
    LOOP
        -- Safety check: prevent infinite loops
        IF depth_count > 6 THEN
            RAISE EXCEPTION 'Task hierarchy is too deep or contains a cycle';
        END IF;

        -- Check if we've created a cycle
        IF current_parent_id = NEW.id THEN
            RAISE EXCEPTION 'Circular reference detected in task hierarchy';
        END IF;

        -- Get parent of current task
        SELECT parent_id INTO current_parent_id
        FROM tasks
        WHERE id = current_parent_id;

        -- If no more parents, we've reached the root
        EXIT WHEN current_parent_id IS NULL;

        -- Increment depth for the next level up
        depth_count := depth_count + 1;
    END LOOP;

    -- Check depth limit: allow levels 0-5 (6 total levels)
    -- depth_count represents how many levels below root
    IF depth_count > 5 THEN
        RAISE EXCEPTION 'Task hierarchy depth cannot exceed 5 levels (maximum level is 5, you are at level %)' , depth_count;
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
