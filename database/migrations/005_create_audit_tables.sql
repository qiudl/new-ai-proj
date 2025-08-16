-- Create audit logs and audit configs tables
-- Migration: 005_create_audit_tables.sql

BEGIN;

-- Create extension for UUID if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    event_id VARCHAR(36) NOT NULL UNIQUE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- User information
    user_id INTEGER,
    user_email VARCHAR(255),
    user_name VARCHAR(255),
    user_role VARCHAR(50),
    
    -- Operation information
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(50),
    resource_name VARCHAR(255),
    
    -- Request information
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(128),
    request_id VARCHAR(36),
    
    -- Operation details
    description TEXT,
    before_data JSONB,
    after_data JSONB,
    changes JSONB,
    
    -- Status information
    status VARCHAR(20) NOT NULL DEFAULT 'success',
    error_message TEXT,
    
    -- Context information
    project_id INTEGER,
    parent_event_id VARCHAR(36),
    correlation_id VARCHAR(36),
    
    -- Metadata
    metadata JSONB,
    tags TEXT[],
    
    -- Constraints
    CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_audit_logs_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    CONSTRAINT chk_status CHECK (status IN ('success', 'failed', 'pending'))
);

-- Create audit_configs table
CREATE TABLE IF NOT EXISTS audit_configs (
    id SERIAL PRIMARY KEY,
    resource_type VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    enabled BOOLEAN DEFAULT true NOT NULL,
    log_before_data BOOLEAN DEFAULT false NOT NULL,
    log_after_data BOOLEAN DEFAULT true NOT NULL,
    log_changes BOOLEAN DEFAULT true NOT NULL,
    retention_days INTEGER DEFAULT 365 NOT NULL,
    sensitive_fields TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT uq_audit_configs_resource_action UNIQUE(resource_type, action),
    CONSTRAINT chk_retention_days CHECK (retention_days > 0)
);

-- Create indexes for audit_logs
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_project ON audit_logs(project_id);
CREATE INDEX idx_audit_logs_status ON audit_logs(status);
CREATE INDEX idx_audit_logs_event_id ON audit_logs(event_id);
CREATE INDEX idx_audit_logs_session ON audit_logs(session_id);
CREATE INDEX idx_audit_logs_request ON audit_logs(request_id);
CREATE INDEX idx_audit_logs_correlation ON audit_logs(correlation_id);
CREATE INDEX idx_audit_logs_parent_event ON audit_logs(parent_event_id);

-- Create GIN indexes for JSONB fields
CREATE INDEX idx_audit_logs_metadata_gin ON audit_logs USING GIN (metadata);
CREATE INDEX idx_audit_logs_before_data_gin ON audit_logs USING GIN (before_data);
CREATE INDEX idx_audit_logs_after_data_gin ON audit_logs USING GIN (after_data);
CREATE INDEX idx_audit_logs_changes_gin ON audit_logs USING GIN (changes);

-- Create GIN index for tags array
CREATE INDEX idx_audit_logs_tags_gin ON audit_logs USING GIN (tags);

-- Create indexes for audit_configs
CREATE INDEX idx_audit_configs_resource_type ON audit_configs(resource_type);
CREATE INDEX idx_audit_configs_action ON audit_configs(action);
CREATE INDEX idx_audit_configs_enabled ON audit_configs(enabled);

-- Insert default audit configurations
INSERT INTO audit_configs (resource_type, action, enabled, log_before_data, log_after_data, log_changes, retention_days, sensitive_fields) VALUES
-- Task operations
('task', 'task.create', true, false, true, true, 365, '{}'),
('task', 'task.update', true, true, true, true, 365, '{}'),
('task', 'task.delete', true, true, false, false, 2555, '{}'),
('task', 'task.status_change', true, true, true, true, 365, '{}'),
('task', 'task.assign', true, true, true, true, 365, '{}'),
('task', 'task.unassign', true, true, true, true, 365, '{}'),
('task', 'task.move', true, true, true, true, 365, '{}'),
('task', 'task.duplicate', true, false, true, false, 365, '{}'),
('task', 'task.bulk_update', true, false, false, true, 365, '{}'),
('task', 'task.bulk_delete', true, true, false, false, 2555, '{}'),
('task', 'task.restore', true, true, true, true, 365, '{}'),

-- Project operations
('project', 'project.create', true, false, true, true, 365, '{}'),
('project', 'project.update', true, true, true, true, 365, '{}'),
('project', 'project.delete', true, true, false, false, 2555, '{}'),
('project', 'project.archive', true, true, true, true, 365, '{}'),
('project', 'project.restore', true, true, true, true, 365, '{}'),
('project', 'project.add_member', true, false, true, true, 365, '{}'),
('project', 'project.remove_member', true, true, false, true, 365, '{}'),
('project', 'project.update_permissions', true, true, true, true, 365, '{}'),

-- User operations
('user', 'user.login', true, false, false, false, 90, '{"password", "token"}'),
('user', 'user.logout', true, false, false, false, 90, '{}'),
('user', 'user.register', true, false, true, false, 2555, '{"password", "password_hash"}'),
('user', 'user.update_profile', true, true, true, true, 365, '{}'),
('user', 'user.change_password', true, false, false, false, 365, '{"password", "password_hash", "current_password", "new_password"}'),
('user', 'user.reset_password', true, false, false, false, 365, '{"password", "password_hash", "token", "reset_token"}'),

-- System operations
('system', 'system.config_change', true, true, true, true, 2555, '{}'),
('system', 'system.backup', true, false, false, false, 365, '{}'),
('system', 'system.restore', true, false, false, false, 365, '{}'),
('system', 'system.maintenance', true, false, false, false, 365, '{}')

ON CONFLICT (resource_type, action) DO NOTHING;

-- Create a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_audit_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_audit_configs_updated_at
    BEFORE UPDATE ON audit_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_audit_configs_updated_at();

-- Create a function to cleanup expired audit logs
CREATE OR REPLACE FUNCTION cleanup_expired_audit_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM audit_logs 
    WHERE id IN (
        SELECT al.id 
        FROM audit_logs al
        LEFT JOIN audit_configs ac ON al.resource_type = ac.resource_type AND al.action = ac.action
        WHERE al.timestamp < NOW() - INTERVAL '1 day' * COALESCE(ac.retention_days, 365)
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create a view for audit log statistics
CREATE OR REPLACE VIEW audit_log_stats AS
SELECT 
    DATE_TRUNC('day', timestamp) as date,
    resource_type,
    action,
    status,
    COUNT(*) as count
FROM audit_logs
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', timestamp), resource_type, action, status
ORDER BY date DESC, count DESC;

-- Create a view for recent audit activities
CREATE OR REPLACE VIEW recent_audit_activities AS
SELECT 
    al.id,
    al.timestamp,
    al.user_name,
    al.action,
    al.resource_type,
    al.resource_name,
    al.status,
    al.ip_address,
    p.name as project_name
FROM audit_logs al
LEFT JOIN projects p ON al.project_id = p.id
WHERE al.timestamp >= NOW() - INTERVAL '24 hours'
ORDER BY al.timestamp DESC
LIMIT 100;

COMMIT;
