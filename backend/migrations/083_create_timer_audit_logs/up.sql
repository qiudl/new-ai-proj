-- Migration: Create timer audit logs table
-- Purpose: Track automatic timer cleanup operations and manual timer actions

CREATE TABLE IF NOT EXISTS timer_audit_logs (
    id SERIAL PRIMARY KEY,
    timer_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    target_type VARCHAR(50) NOT NULL, -- 'project_task', 'personal_task', etc.
    target_id INTEGER,
    action VARCHAR(20) NOT NULL, -- 'pause', 'stop', 'resume', 'manual_cleanup'
    elapsed_seconds INTEGER DEFAULT 0,
    reason TEXT, -- Description of why action was taken
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Indexes for performance
    INDEX idx_timer_audit_logs_timer_id (timer_id),
    INDEX idx_timer_audit_logs_user_id (user_id),
    INDEX idx_timer_audit_logs_action (action),
    INDEX idx_timer_audit_logs_created_at (created_at),
    INDEX idx_timer_audit_logs_target (target_type, target_id)
);

-- Add comments for documentation
COMMENT ON TABLE timer_audit_logs IS 'Audit log for timer operations including automatic cleanup';
COMMENT ON COLUMN timer_audit_logs.timer_id IS 'ID of the timer that was acted upon';
COMMENT ON COLUMN timer_audit_logs.user_id IS 'User who owns the timer';
COMMENT ON COLUMN timer_audit_logs.target_type IS 'Type of target: project_task, personal_task, etc.';
COMMENT ON COLUMN timer_audit_logs.target_id IS 'ID of the target task/item being timed';
COMMENT ON COLUMN timer_audit_logs.action IS 'Action taken: pause, stop, resume, manual_cleanup';
COMMENT ON COLUMN timer_audit_logs.elapsed_seconds IS 'How long the timer had been running when action was taken';
COMMENT ON COLUMN timer_audit_logs.reason IS 'Human-readable reason for the action';
COMMENT ON COLUMN timer_audit_logs.metadata IS 'Additional metadata about the action';

-- Create function to automatically clean up old audit logs (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_timer_audit_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM timer_audit_logs 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup operation
    INSERT INTO timer_audit_logs (
        timer_id, user_id, target_type, target_id, action, reason, created_at
    ) VALUES (
        0, 0, 'system', 0, 'cleanup', 
        'Automatic cleanup of old audit logs: ' || deleted_count || ' records removed',
        NOW()
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT SELECT, INSERT, DELETE ON timer_audit_logs TO ai_user;
GRANT USAGE, SELECT ON SEQUENCE timer_audit_logs_id_seq TO ai_user;