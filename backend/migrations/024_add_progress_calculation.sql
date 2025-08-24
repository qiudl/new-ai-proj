-- Migration: Add progress calculation fields and tables
-- Date: 2025-08-23
-- Purpose: Support unified progress calculation for tasks/epics/projects

BEGIN;

-- ============================================
-- 1. Add progress-related fields to tasks table
-- ============================================

-- Add manual progress override fields
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS manual_progress_override BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS manual_progress_value NUMERIC(5,2) CHECK (manual_progress_value >= 0 AND manual_progress_value <= 100);

-- Add checklist tracking fields
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS checklist_total INTEGER DEFAULT 0 CHECK (checklist_total >= 0);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS checklist_done INTEGER DEFAULT 0 CHECK (checklist_done >= 0);

-- Add actual spent time in seconds (for progress based on time tracking)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_spent_seconds BIGINT DEFAULT 0 CHECK (actual_spent_seconds >= 0);

-- Add story points for weighted calculations
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS story_points NUMERIC(10,2) CHECK (story_points >= 0);

-- Add computed progress cache (optional, for performance)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS cached_progress NUMERIC(5,2) CHECK (cached_progress >= 0 AND cached_progress <= 100);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS cached_progress_updated_at TIMESTAMPTZ;

-- Add constraint to ensure checklist_done <= checklist_total
ALTER TABLE tasks ADD CONSTRAINT chk_checklist_done_lte_total 
    CHECK (checklist_done <= checklist_total);

-- ============================================
-- 2. Create progress_config table
-- ============================================

CREATE TABLE IF NOT EXISTS progress_config (
    id SERIAL PRIMARY KEY,
    config_name VARCHAR(100) NOT NULL UNIQUE,
    status_progress_map JSONB NOT NULL DEFAULT '{
        "draft": 0,
        "planning": 10,
        "todo": 0,
        "in_progress": 50,
        "testing": 75,
        "completed": 100,
        "cancelled": 0,
        "on_hold": null,
        "suspended": null,
        "blocked": 0,
        "archived": 100
    }'::jsonb,
    include_cancelled BOOLEAN DEFAULT FALSE,
    include_archived BOOLEAN DEFAULT FALSE,
    blocked_policy VARCHAR(20) DEFAULT 'zero' CHECK (blocked_policy IN ('zero', 'ignore', 'last_known')),
    default_weight_field VARCHAR(50) DEFAULT 'story_points' CHECK (default_weight_field IN ('story_points', 'estimated_hours', 'estimated_minutes', 'equal')),
    enable_caching BOOLEAN DEFAULT FALSE,
    cache_ttl_seconds INTEGER DEFAULT 300,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by INTEGER,
    updated_by INTEGER
);

-- Insert default configuration
INSERT INTO progress_config (config_name, created_by, updated_by) 
VALUES ('default', 1, 1)
ON CONFLICT (config_name) DO NOTHING;

-- ============================================
-- 3. Create progress_snapshots table
-- ============================================

CREATE TABLE IF NOT EXISTS progress_snapshots (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('task', 'epic', 'project', 'release')),
    entity_id INTEGER NOT NULL,
    progress NUMERIC(5,2) NOT NULL CHECK (progress >= 0 AND progress <= 100),
    method_used VARCHAR(100),
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Store calculation inputs for audit/debugging
    inputs JSONB DEFAULT '{}',
    
    -- Breakdown of child items (if applicable)
    breakdown JSONB DEFAULT '[]',
    
    -- Config version used
    config_id INTEGER REFERENCES progress_config(id),
    
    -- Optional fields
    total_weight NUMERIC(10,2),
    children_count INTEGER,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_progress_snapshots_entity 
    ON progress_snapshots(entity_type, entity_id, computed_at DESC);

CREATE INDEX IF NOT EXISTS idx_progress_snapshots_computed_at 
    ON progress_snapshots(computed_at DESC);

CREATE INDEX IF NOT EXISTS idx_progress_snapshots_entity_latest 
    ON progress_snapshots(entity_type, entity_id, computed_at DESC);

-- ============================================
-- 4. Create progress_cache table (for performance)
-- ============================================

CREATE TABLE IF NOT EXISTS progress_cache (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('task', 'epic', 'project', 'release')),
    entity_id INTEGER NOT NULL,
    progress NUMERIC(5,2) NOT NULL CHECK (progress >= 0 AND progress <= 100),
    method_used VARCHAR(100),
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    breakdown JSONB DEFAULT '[]',
    inputs JSONB DEFAULT '{}',
    is_stale BOOLEAN DEFAULT FALSE,
    
    UNIQUE(entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_progress_cache_expires 
    ON progress_cache(expires_at) 
    WHERE is_stale = FALSE;

-- ============================================
-- 5. Add indexes to tasks table for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_tasks_progress_fields 
    ON tasks(project_id, parent_id, status);

CREATE INDEX IF NOT EXISTS idx_tasks_manual_override 
    ON tasks(manual_progress_override) 
    WHERE manual_progress_override = TRUE;

CREATE INDEX IF NOT EXISTS idx_tasks_cached_progress 
    ON tasks(cached_progress_updated_at) 
    WHERE cached_progress IS NOT NULL;

-- ============================================
-- 6. Create update trigger for progress_config
-- ============================================

CREATE OR REPLACE FUNCTION update_progress_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    -- Mark all cache entries as stale when config changes
    UPDATE progress_cache SET is_stale = TRUE WHERE is_stale = FALSE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_progress_config_timestamp ON progress_config;
CREATE TRIGGER update_progress_config_timestamp
    BEFORE UPDATE ON progress_config
    FOR EACH ROW
    EXECUTE FUNCTION update_progress_config_timestamp();

-- ============================================
-- 7. Create helper functions
-- ============================================

-- Function to get status progress mapping
CREATE OR REPLACE FUNCTION get_status_progress(p_status VARCHAR, p_config_id INTEGER DEFAULT 1)
RETURNS NUMERIC AS $$
DECLARE
    v_progress NUMERIC;
    v_status_map JSONB;
BEGIN
    SELECT status_progress_map INTO v_status_map
    FROM progress_config 
    WHERE id = p_config_id;
    
    IF v_status_map IS NULL THEN
        SELECT status_progress_map INTO v_status_map
        FROM progress_config 
        WHERE config_name = 'default';
    END IF;
    
    v_progress := (v_status_map->p_status)::NUMERIC;
    
    -- Default to 0 if status not found
    RETURN COALESCE(v_progress, 0);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to invalidate progress cache for a task and its parents
CREATE OR REPLACE FUNCTION invalidate_progress_cache(p_task_id INTEGER)
RETURNS VOID AS $$
DECLARE
    v_parent_id INTEGER;
    v_project_id INTEGER;
BEGIN
    -- Get parent and project IDs
    SELECT parent_id, project_id INTO v_parent_id, v_project_id
    FROM tasks WHERE id = p_task_id;
    
    -- Mark task cache as stale
    UPDATE progress_cache 
    SET is_stale = TRUE 
    WHERE entity_type = 'task' AND entity_id = p_task_id;
    
    -- Mark parent cache as stale if exists
    IF v_parent_id IS NOT NULL THEN
        UPDATE progress_cache 
        SET is_stale = TRUE 
        WHERE entity_type = 'task' AND entity_id = v_parent_id;
        
        -- Recursively invalidate parent's parent
        PERFORM invalidate_progress_cache(v_parent_id);
    END IF;
    
    -- Mark project cache as stale
    IF v_project_id IS NOT NULL THEN
        UPDATE progress_cache 
        SET is_stale = TRUE 
        WHERE entity_type = 'project' AND entity_id = v_project_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. Add comments for documentation
-- ============================================

COMMENT ON TABLE progress_config IS 'Configuration for progress calculation algorithm';
COMMENT ON TABLE progress_snapshots IS 'Historical snapshots of progress calculations';
COMMENT ON TABLE progress_cache IS 'Cache for expensive progress calculations';

COMMENT ON COLUMN tasks.manual_progress_override IS 'If true, use manual_progress_value instead of calculated';
COMMENT ON COLUMN tasks.manual_progress_value IS 'Manual progress percentage (0-100)';
COMMENT ON COLUMN tasks.checklist_total IS 'Total number of checklist items';
COMMENT ON COLUMN tasks.checklist_done IS 'Number of completed checklist items';
COMMENT ON COLUMN tasks.actual_spent_seconds IS 'Total actual time spent in seconds';
COMMENT ON COLUMN tasks.story_points IS 'Story points for weighted calculations';

COMMIT;
