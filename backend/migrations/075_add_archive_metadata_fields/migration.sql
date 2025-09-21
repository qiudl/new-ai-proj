-- Migration 075: Add archive metadata fields
-- Description: Add archived_by and archive_reason fields to tasks table for complete archive tracking

-- Add archived_by field (foreign key to users table)
ALTER TABLE tasks 
ADD COLUMN archived_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Add archive_reason field (text field for storing reason)
ALTER TABLE tasks 
ADD COLUMN archive_reason TEXT;

-- Create index for archive queries
CREATE INDEX idx_tasks_archived_by ON tasks(archived_by) WHERE archived_by IS NOT NULL;
CREATE INDEX idx_tasks_archived_at ON tasks(archived_at) WHERE archived_at IS NOT NULL;

-- Add composite index for archived tasks queries
CREATE INDEX idx_tasks_archive_metadata 
ON tasks(archived_at, archived_by, status) 
WHERE archived_at IS NOT NULL;

-- Comment on new fields
COMMENT ON COLUMN tasks.archived_by IS 'ID of user who archived the task';
COMMENT ON COLUMN tasks.archive_reason IS 'Reason provided for archiving the task';