-- Migration: Add created_by field to task_time_logs table
-- Bug Fix #1: task_time_logs表缺少created_by字段

-- Add created_by column
ALTER TABLE task_time_logs 
ADD COLUMN created_by INTEGER REFERENCES users(id);

-- Set default value for existing records (admin user)
UPDATE task_time_logs 
SET created_by = 1 
WHERE created_by IS NULL;

-- Make the field NOT NULL to ensure data integrity
ALTER TABLE task_time_logs 
ALTER COLUMN created_by SET NOT NULL;

-- Add index for better query performance
CREATE INDEX idx_task_time_logs_created_by ON task_time_logs(created_by);

-- Add comment for documentation
COMMENT ON COLUMN task_time_logs.created_by IS 'User ID who created this time log entry';