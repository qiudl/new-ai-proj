-- Rollback Migration 075: Remove archive metadata fields
-- Description: Remove archived_by and archive_reason fields from tasks table

-- Drop indexes first
DROP INDEX IF EXISTS idx_tasks_archive_metadata;
DROP INDEX IF EXISTS idx_tasks_archived_at;
DROP INDEX IF EXISTS idx_tasks_archived_by;

-- Remove the columns
ALTER TABLE tasks DROP COLUMN IF EXISTS archive_reason;
ALTER TABLE tasks DROP COLUMN IF EXISTS archived_by;