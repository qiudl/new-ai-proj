-- Google Calendar Integration Migration
-- This migration adds tables for Google Calendar OAuth integration

-- Create OAuth states table for CSRF protection
CREATE TABLE IF NOT EXISTS oauth_states (
    id SERIAL PRIMARY KEY,
    state VARCHAR(255) NOT NULL UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_oauth_states_state (state),
    INDEX idx_oauth_states_user_id (user_id),
    INDEX idx_oauth_states_expires_at (expires_at)
);

-- Create Google tokens table for storing encrypted access tokens
CREATE TABLE IF NOT EXISTS google_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    access_token_encrypted TEXT NOT NULL,
    refresh_token_encrypted TEXT,
    token_type VARCHAR(50) DEFAULT 'Bearer',
    expires_at TIMESTAMP NOT NULL,
    scopes TEXT, -- JSON array of granted scopes
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_refresh_at TIMESTAMP,
    INDEX idx_google_tokens_user_id (user_id),
    INDEX idx_google_tokens_expires_at (expires_at)
);

-- Create Google calendar sync status table
CREATE TABLE IF NOT EXISTS google_calendar_sync (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    calendar_id VARCHAR(255) NOT NULL, -- Google Calendar ID
    calendar_name VARCHAR(255),
    is_primary BOOLEAN DEFAULT FALSE,
    sync_enabled BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMP,
    sync_direction VARCHAR(20) DEFAULT 'bidirectional', -- 'to_google', 'from_google', 'bidirectional'
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_google_calendar_sync_user_id (user_id),
    INDEX idx_google_calendar_sync_calendar_id (calendar_id),
    UNIQUE KEY unique_user_calendar (user_id, calendar_id)
);

-- Create Google event mapping table to track task-event relationships
CREATE TABLE IF NOT EXISTS google_event_mappings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    google_event_id VARCHAR(255) NOT NULL,
    google_calendar_id VARCHAR(255) NOT NULL,
    last_synced_at TIMESTAMP DEFAULT NOW(),
    sync_status VARCHAR(20) DEFAULT 'synced', -- 'synced', 'pending', 'error'
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_google_event_mappings_user_id (user_id),
    INDEX idx_google_event_mappings_task_id (task_id),
    INDEX idx_google_event_mappings_google_event_id (google_event_id),
    UNIQUE KEY unique_task_event (task_id, google_event_id)
);

-- Create Google sync logs table for debugging and monitoring
CREATE TABLE IF NOT EXISTS google_sync_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    operation VARCHAR(50) NOT NULL, -- 'sync_to_google', 'sync_from_google', 'create_event', 'update_event', 'delete_event'
    resource_type VARCHAR(20) NOT NULL, -- 'task', 'event'
    resource_id VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'success', 'error', 'warning'
    message TEXT,
    details JSONB, -- Store additional context data
    execution_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_google_sync_logs_user_id (user_id),
    INDEX idx_google_sync_logs_status (status),
    INDEX idx_google_sync_logs_operation (operation),
    INDEX idx_google_sync_logs_created_at (created_at)
);

-- Add Google Calendar integration flags to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS google_calendar_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS google_calendar_connected_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS google_sync_preferences JSONB DEFAULT '{}';

-- Create indexes on new user columns
CREATE INDEX IF NOT EXISTS idx_users_google_calendar_enabled ON users(google_calendar_enabled);
CREATE INDEX IF NOT EXISTS idx_users_google_calendar_connected_at ON users(google_calendar_connected_at);

-- Update trigger for google_tokens updated_at
CREATE OR REPLACE FUNCTION update_google_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_google_tokens_updated_at ON google_tokens;
CREATE TRIGGER trigger_google_tokens_updated_at
    BEFORE UPDATE ON google_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_google_tokens_updated_at();

-- Update trigger for google_calendar_sync updated_at
CREATE OR REPLACE FUNCTION update_google_calendar_sync_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_google_calendar_sync_updated_at ON google_calendar_sync;
CREATE TRIGGER trigger_google_calendar_sync_updated_at
    BEFORE UPDATE ON google_calendar_sync
    FOR EACH ROW
    EXECUTE FUNCTION update_google_calendar_sync_updated_at();

-- Update trigger for google_event_mappings updated_at
CREATE OR REPLACE FUNCTION update_google_event_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_google_event_mappings_updated_at ON google_event_mappings;
CREATE TRIGGER trigger_google_event_mappings_updated_at
    BEFORE UPDATE ON google_event_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_google_event_mappings_updated_at();

-- Create function to clean up expired OAuth states
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM oauth_states WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE oauth_states IS 'Stores OAuth state parameters for CSRF protection during Google authentication';
COMMENT ON TABLE google_tokens IS 'Stores encrypted Google OAuth tokens for each user';
COMMENT ON TABLE google_calendar_sync IS 'Tracks which Google calendars are synced for each user';
COMMENT ON TABLE google_event_mappings IS 'Maps tasks to Google Calendar events for bidirectional sync';
COMMENT ON TABLE google_sync_logs IS 'Logs all Google Calendar sync operations for monitoring and debugging';

COMMENT ON COLUMN google_tokens.access_token_encrypted IS 'Encrypted Google access token using AES-256';
COMMENT ON COLUMN google_tokens.refresh_token_encrypted IS 'Encrypted Google refresh token using AES-256';
COMMENT ON COLUMN google_tokens.scopes IS 'JSON array of OAuth scopes granted by user';

COMMENT ON COLUMN google_calendar_sync.sync_direction IS 'Direction of synchronization: to_google, from_google, or bidirectional';
COMMENT ON COLUMN google_event_mappings.sync_status IS 'Current sync status: synced, pending, or error';

COMMENT ON COLUMN users.google_sync_preferences IS 'JSON object storing user preferences for Google Calendar sync';