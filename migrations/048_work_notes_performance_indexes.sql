-- Migration: Add performance indexes for work notes queries
-- Created: 2025-10-22
-- Purpose: Optimize common work notes query patterns

-- Index for filtering by owner and work note type
-- Improves: ListWorkNotes, GetRecentNotes, GetPinnedNotes, GetBookmarkedNotes
CREATE INDEX IF NOT EXISTS idx_documents_owner_work_note_type
ON documents(owner_id, (metadata->>'work_note_type'))
WHERE deleted_at IS NULL AND (metadata->>'work_note_type') IS NOT NULL;

-- Index for pinned notes queries
-- Improves: GetPinnedNotes, filtering by is_pinned
CREATE INDEX IF NOT EXISTS idx_documents_is_pinned
ON documents((metadata->>'is_pinned'))
WHERE deleted_at IS NULL AND (metadata->>'is_pinned')::boolean = true;

-- Index for bookmarked notes queries
-- Improves: GetBookmarkedNotes, filtering by is_bookmarked
CREATE INDEX IF NOT EXISTS idx_documents_is_bookmarked
ON documents((metadata->>'is_bookmarked'))
WHERE deleted_at IS NULL AND (metadata->>'is_bookmarked')::boolean = true;

-- Index for ordering by updated_at (DESC)
-- Improves: All list and recent queries
CREATE INDEX IF NOT EXISTS idx_documents_updated_at_desc
ON documents(updated_at DESC)
WHERE deleted_at IS NULL;

-- Index for work note type filtering
-- Improves: Category statistics and type-specific queries
CREATE INDEX IF NOT EXISTS idx_documents_work_note_type
ON documents((metadata->>'work_note_type'))
WHERE deleted_at IS NULL AND (metadata->>'work_note_type') IS NOT NULL;

-- Index for priority filtering
-- Improves: Filtering by priority
CREATE INDEX IF NOT EXISTS idx_documents_priority
ON documents((metadata->>'priority'))
WHERE deleted_at IS NULL AND (metadata->>'priority') IS NOT NULL;

-- Composite index for common filter combinations
-- Improves: Filtered list queries with multiple conditions
CREATE INDEX IF NOT EXISTS idx_documents_owner_updated_at
ON documents(owner_id, updated_at DESC)
WHERE deleted_at IS NULL;

-- Index for visibility-based access control
-- Improves: Permission checking and team/public note queries
CREATE INDEX IF NOT EXISTS idx_documents_visibility
ON documents(visibility)
WHERE deleted_at IS NULL;

-- Analyze tables to update query planner statistics
ANALYZE documents;

-- Migration notes:
-- These indexes are created with IF NOT EXISTS to be idempotent
-- Partial indexes (WITH WHERE clause) are used to reduce index size
-- Focus on columns frequently used in WHERE, JOIN, and ORDER BY clauses
