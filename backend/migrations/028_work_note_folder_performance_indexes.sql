-- Migration: Add performance indexes for work note folders
-- Date: 2025-09-01
-- Description: Add database indexes to optimize work note folder queries

-- Drop existing indexes if they exist (to avoid conflicts)
DROP INDEX IF EXISTS idx_work_note_folders_owner_deleted;
DROP INDEX IF EXISTS idx_work_note_folders_parent_deleted;
DROP INDEX IF EXISTS idx_work_note_folders_project_deleted;
DROP INDEX IF EXISTS idx_work_note_folders_visibility_deleted;
DROP INDEX IF EXISTS idx_work_note_folders_search_name;
DROP INDEX IF EXISTS idx_work_note_folders_search_desc;
DROP INDEX IF EXISTS idx_work_note_folders_sort_order;

-- Core performance indexes for work_note_folders

-- Owner-based queries (most common pattern)
CREATE INDEX idx_work_note_folders_owner_deleted 
ON work_note_folders(owner_id, deleted_at) 
WHERE deleted_at IS NULL;

-- Parent-child relationship queries (for tree operations)
CREATE INDEX idx_work_note_folders_parent_deleted 
ON work_note_folders(parent_id, deleted_at, sort_order, name)
WHERE deleted_at IS NULL;

-- Project filtering
CREATE INDEX idx_work_note_folders_project_deleted 
ON work_note_folders(project_id, deleted_at, owner_id)
WHERE deleted_at IS NULL;

-- Visibility-based access control
CREATE INDEX idx_work_note_folders_visibility_deleted 
ON work_note_folders(visibility, deleted_at, owner_id)
WHERE deleted_at IS NULL;

-- Search optimization - name searches
CREATE INDEX idx_work_note_folders_search_name 
ON work_note_folders USING gin(to_tsvector('english', name))
WHERE deleted_at IS NULL;

-- Search optimization - description searches  
CREATE INDEX idx_work_note_folders_search_desc 
ON work_note_folders USING gin(to_tsvector('english', COALESCE(description, '')))
WHERE deleted_at IS NULL;

-- Sorting optimization
CREATE INDEX idx_work_note_folders_sort_order 
ON work_note_folders(sort_order, name, id)
WHERE deleted_at IS NULL;

-- Compound index for permission-based queries
CREATE INDEX idx_work_note_folders_permission_query
ON work_note_folders(deleted_at, owner_id, visibility, project_id, parent_id)
WHERE deleted_at IS NULL;

-- Index for counting subfolders efficiently
CREATE INDEX idx_work_note_folders_parent_count
ON work_note_folders(parent_id)
WHERE deleted_at IS NULL;

-- Index for updated_at based queries (for caching)
CREATE INDEX idx_work_note_folders_updated_at
ON work_note_folders(updated_at DESC, id)
WHERE deleted_at IS NULL;

-- Performance optimization for recursive tree queries
CREATE INDEX idx_work_note_folders_tree_recursive
ON work_note_folders(parent_id, id, deleted_at, owner_id, visibility)
WHERE deleted_at IS NULL;

-- Analyze tables to update statistics
ANALYZE work_note_folders;

-- Add comments for documentation
COMMENT ON INDEX idx_work_note_folders_owner_deleted IS 
'Optimizes owner-based folder queries, most common access pattern';

COMMENT ON INDEX idx_work_note_folders_parent_deleted IS 
'Optimizes parent-child relationship queries for tree operations and lazy loading';

COMMENT ON INDEX idx_work_note_folders_search_name IS 
'Full-text search optimization for folder name searches';

COMMENT ON INDEX idx_work_note_folders_permission_query IS 
'Compound index for complex permission-based folder access queries';

-- Create statistics for query planner
CREATE STATISTICS work_note_folders_multicolumn_stats (dependencies)
ON owner_id, visibility, project_id, parent_id
FROM work_note_folders;

ANALYZE work_note_folders;