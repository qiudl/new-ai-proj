-- Migration 007: Add calendar sync fields to tasks table
-- Created: 2025-08-05
-- Purpose: Support bidirectional sync between tasks and Google Calendar events

-- Add calendar sync fields to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sync_to_calendar BOOLEAN DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS calendar_sync_status VARCHAR(20) DEFAULT 'disabled';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS last_calendar_sync TIMESTAMP;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS calendar_event_url TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sync_direction VARCHAR(20) DEFAULT 'bidirectional';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS calendar_reminder_minutes INTEGER DEFAULT 15;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS google_calendar_event_id VARCHAR(255);

-- Create calendar sync status enum constraint
ALTER TABLE tasks ADD CONSTRAINT calendar_sync_status_check 
CHECK (calendar_sync_status IN ('pending', 'synced', 'failed', 'disabled', 'syncing'));

-- Create sync direction enum constraint  
ALTER TABLE tasks ADD CONSTRAINT sync_direction_check
CHECK (sync_direction IN ('task_to_calendar', 'calendar_to_task', 'bidirectional'));

-- Create calendar sync logs table for tracking sync operations
CREATE TABLE IF NOT EXISTS calendar_sync_logs (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    sync_direction VARCHAR(20) NOT NULL,
    operation_type VARCHAR(20) NOT NULL, -- 'create', 'update', 'delete'
    sync_status VARCHAR(20) NOT NULL,    -- 'success', 'failed', 'pending'
    google_event_id VARCHAR(255),
    error_message TEXT,
    sync_data JSONB,                     -- Store sync payload for debugging
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_sync_to_calendar ON tasks(sync_to_calendar) WHERE sync_to_calendar = true;
CREATE INDEX IF NOT EXISTS idx_tasks_calendar_sync_status ON tasks(calendar_sync_status);
CREATE INDEX IF NOT EXISTS idx_tasks_google_calendar_event_id ON tasks(google_calendar_event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_logs_task_id ON calendar_sync_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_logs_created_at ON calendar_sync_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_logs_sync_status ON calendar_sync_logs(sync_status);

-- Create calendar sync queue table for async processing
CREATE TABLE IF NOT EXISTS calendar_sync_queue (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    operation_type VARCHAR(20) NOT NULL, -- 'sync_task_to_calendar', 'sync_calendar_to_task'
    priority INTEGER DEFAULT 1,          -- 1=high, 2=medium, 3=low
    payload JSONB NOT NULL,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    CONSTRAINT sync_queue_status_check CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Add indexes for sync queue
CREATE INDEX IF NOT EXISTS idx_sync_queue_status_scheduled ON calendar_sync_queue(status, scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_sync_queue_task_id ON calendar_sync_queue(task_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_priority ON calendar_sync_queue(priority, created_at);

COMMENT ON COLUMN tasks.sync_to_calendar IS 'Whether this task should be synced to Google Calendar';
COMMENT ON COLUMN tasks.calendar_sync_status IS 'Current sync status: pending, synced, failed, disabled, syncing';
COMMENT ON COLUMN tasks.last_calendar_sync IS 'Timestamp of last successful sync';
COMMENT ON COLUMN tasks.calendar_event_url IS 'URL to the Google Calendar event';
COMMENT ON COLUMN tasks.sync_direction IS 'Sync direction: task_to_calendar, calendar_to_task, bidirectional';
COMMENT ON COLUMN tasks.calendar_reminder_minutes IS 'Calendar reminder time in minutes';
COMMENT ON COLUMN tasks.google_calendar_event_id IS 'Google Calendar event ID for linking';

COMMENT ON TABLE calendar_sync_logs IS 'Log table for tracking all calendar sync operations';
COMMENT ON TABLE calendar_sync_queue IS 'Queue table for async calendar sync processing';