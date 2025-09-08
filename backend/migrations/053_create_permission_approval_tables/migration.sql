-- Migration 053: Create Permission Approval System Tables
-- This migration creates the complete permission approval system infrastructure

BEGIN;

-- Create enum types for approval system
DO $$ 
BEGIN
    -- Approval status enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_status') THEN
        CREATE TYPE approval_status AS ENUM (
            'pending',
            'in_review', 
            'approved',
            'rejected',
            'cancelled',
            'expired',
            'delegated'
        );
    END IF;

    -- Approval priority enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_priority') THEN
        CREATE TYPE approval_priority AS ENUM (
            'low',
            'medium',
            'high',
            'urgent'
        );
    END IF;

    -- Workflow type enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_workflow_type') THEN
        CREATE TYPE approval_workflow_type AS ENUM (
            'sequential',
            'parallel',
            'majority',
            'conditional'
        );
    END IF;

    -- Escalation type enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'escalation_type') THEN
        CREATE TYPE escalation_type AS ENUM (
            'time_based',
            'priority_based',
            'manual'
        );
    END IF;

    -- Notification status enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_status') THEN
        CREATE TYPE notification_status AS ENUM (
            'pending',
            'sent',
            'failed',
            'read'
        );
    END IF;
END $$;

-- 1. Permission Approval Requests table
CREATE TABLE IF NOT EXISTS permission_approval_requests (
    id SERIAL PRIMARY KEY,
    request_id VARCHAR(50) UNIQUE NOT NULL,
    requester_id INTEGER NOT NULL,
    requester_role VARCHAR(50),
    permission_code VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id INTEGER,
    reason TEXT,
    justification TEXT,
    status approval_status NOT NULL DEFAULT 'pending',
    priority approval_priority NOT NULL DEFAULT 'medium',
    workflow_type approval_workflow_type NOT NULL DEFAULT 'sequential',
    current_step_index INTEGER DEFAULT 0,
    total_steps INTEGER DEFAULT 1,
    metadata JSONB,
    custom_fields JSONB,
    expires_at TIMESTAMP WITH TIME ZONE,
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Add indexes
    CONSTRAINT fk_permission_approval_requests_requester 
        FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2. Permission Approval Steps table
CREATE TABLE IF NOT EXISTS permission_approval_steps (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL,
    step_index INTEGER NOT NULL,
    step_name VARCHAR(100),
    approver_id INTEGER NOT NULL,
    backup_approver_id INTEGER,
    status approval_status NOT NULL DEFAULT 'pending',
    decision VARCHAR(20),
    comments TEXT,
    auto_approve_rules JSONB,
    escalation_rules JSONB,
    timeout_hours INTEGER DEFAULT 72,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT fk_permission_approval_steps_request 
        FOREIGN KEY (request_id) REFERENCES permission_approval_requests(id) ON DELETE CASCADE,
    CONSTRAINT fk_permission_approval_steps_approver 
        FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_permission_approval_steps_backup 
        FOREIGN KEY (backup_approver_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT uq_permission_approval_steps_request_step 
        UNIQUE (request_id, step_index)
);

-- 3. Approval Workflows table
CREATE TABLE IF NOT EXISTS approval_workflows (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    workflow_type approval_workflow_type NOT NULL DEFAULT 'sequential',
    permission_code_pattern VARCHAR(100),
    resource_type_pattern VARCHAR(50),
    priority_threshold approval_priority DEFAULT 'medium',
    conditions JSONB,
    steps_template JSONB NOT NULL,
    auto_start BOOLEAN DEFAULT true,
    timeout_hours INTEGER DEFAULT 72,
    escalation_enabled BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    version INTEGER DEFAULT 1,
    created_by INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_approval_workflows_created_by 
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 4. Approval Delegations table
CREATE TABLE IF NOT EXISTS approval_delegations (
    id SERIAL PRIMARY KEY,
    delegator_id INTEGER NOT NULL,
    delegate_id INTEGER NOT NULL,
    permission_patterns TEXT[],
    resource_types TEXT[],
    priority_threshold approval_priority DEFAULT 'medium',
    start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    reason TEXT,
    conditions JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_approval_delegations_delegator 
        FOREIGN KEY (delegator_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_approval_delegations_delegate 
        FOREIGN KEY (delegate_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_approval_delegations_dates 
        CHECK (end_date IS NULL OR end_date > start_date)
);

-- 5. Approval Escalations table
CREATE TABLE IF NOT EXISTS approval_escalations (
    id SERIAL PRIMARY KEY,
    step_id INTEGER NOT NULL,
    escalation_type escalation_type NOT NULL,
    trigger_condition JSONB,
    escalated_to_id INTEGER,
    escalated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution VARCHAR(20),
    resolution_comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_approval_escalations_step 
        FOREIGN KEY (step_id) REFERENCES permission_approval_steps(id) ON DELETE CASCADE,
    CONSTRAINT fk_approval_escalations_escalated_to 
        FOREIGN KEY (escalated_to_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 6. Approval Notifications table
CREATE TABLE IF NOT EXISTS approval_notifications (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL,
    step_id INTEGER,
    recipient_id INTEGER NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    status notification_status NOT NULL DEFAULT 'pending',
    channel VARCHAR(20) DEFAULT 'email',
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_approval_notifications_request 
        FOREIGN KEY (request_id) REFERENCES permission_approval_requests(id) ON DELETE CASCADE,
    CONSTRAINT fk_approval_notifications_step 
        FOREIGN KEY (step_id) REFERENCES permission_approval_steps(id) ON DELETE CASCADE,
    CONSTRAINT fk_approval_notifications_recipient 
        FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 7. Approval Audit Logs table
CREATE TABLE IF NOT EXISTS approval_audit_logs (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL,
    step_id INTEGER,
    user_id INTEGER,
    action VARCHAR(50) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(100),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_approval_audit_logs_request 
        FOREIGN KEY (request_id) REFERENCES permission_approval_requests(id) ON DELETE CASCADE,
    CONSTRAINT fk_approval_audit_logs_step 
        FOREIGN KEY (step_id) REFERENCES permission_approval_steps(id) ON DELETE CASCADE,
    CONSTRAINT fk_approval_audit_logs_user 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_permission_approval_requests_requester 
    ON permission_approval_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_permission_approval_requests_status 
    ON permission_approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_permission_approval_requests_priority 
    ON permission_approval_requests(priority);
CREATE INDEX IF NOT EXISTS idx_permission_approval_requests_permission_code 
    ON permission_approval_requests(permission_code);
CREATE INDEX IF NOT EXISTS idx_permission_approval_requests_resource 
    ON permission_approval_requests(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_permission_approval_requests_created_at 
    ON permission_approval_requests(created_at);

CREATE INDEX IF NOT EXISTS idx_permission_approval_steps_request 
    ON permission_approval_steps(request_id);
CREATE INDEX IF NOT EXISTS idx_permission_approval_steps_approver 
    ON permission_approval_steps(approver_id);
CREATE INDEX IF NOT EXISTS idx_permission_approval_steps_status 
    ON permission_approval_steps(status);
CREATE INDEX IF NOT EXISTS idx_permission_approval_steps_expires 
    ON permission_approval_steps(expires_at);

CREATE INDEX IF NOT EXISTS idx_approval_workflows_permission_pattern 
    ON approval_workflows(permission_code_pattern);
CREATE INDEX IF NOT EXISTS idx_approval_workflows_resource_pattern 
    ON approval_workflows(resource_type_pattern);
CREATE INDEX IF NOT EXISTS idx_approval_workflows_active 
    ON approval_workflows(is_active);

CREATE INDEX IF NOT EXISTS idx_approval_delegations_delegator 
    ON approval_delegations(delegator_id);
CREATE INDEX IF NOT EXISTS idx_approval_delegations_delegate 
    ON approval_delegations(delegate_id);
CREATE INDEX IF NOT EXISTS idx_approval_delegations_active_dates 
    ON approval_delegations(is_active, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_approval_escalations_step 
    ON approval_escalations(step_id);
CREATE INDEX IF NOT EXISTS idx_approval_escalations_escalated_to 
    ON approval_escalations(escalated_to_id);

CREATE INDEX IF NOT EXISTS idx_approval_notifications_recipient 
    ON approval_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_approval_notifications_status 
    ON approval_notifications(status);
CREATE INDEX IF NOT EXISTS idx_approval_notifications_scheduled 
    ON approval_notifications(scheduled_at);

CREATE INDEX IF NOT EXISTS idx_approval_audit_logs_request 
    ON approval_audit_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_approval_audit_logs_user 
    ON approval_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_approval_audit_logs_timestamp 
    ON approval_audit_logs(timestamp);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_approval_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_permission_approval_requests_updated_at 
    BEFORE UPDATE ON permission_approval_requests 
    FOR EACH ROW EXECUTE FUNCTION update_approval_updated_at_column();

CREATE TRIGGER update_permission_approval_steps_updated_at 
    BEFORE UPDATE ON permission_approval_steps 
    FOR EACH ROW EXECUTE FUNCTION update_approval_updated_at_column();

CREATE TRIGGER update_approval_workflows_updated_at 
    BEFORE UPDATE ON approval_workflows 
    FOR EACH ROW EXECUTE FUNCTION update_approval_updated_at_column();

CREATE TRIGGER update_approval_delegations_updated_at 
    BEFORE UPDATE ON approval_delegations 
    FOR EACH ROW EXECUTE FUNCTION update_approval_updated_at_column();

CREATE TRIGGER update_approval_escalations_updated_at 
    BEFORE UPDATE ON approval_escalations 
    FOR EACH ROW EXECUTE FUNCTION update_approval_updated_at_column();

CREATE TRIGGER update_approval_notifications_updated_at 
    BEFORE UPDATE ON approval_notifications 
    FOR EACH ROW EXECUTE FUNCTION update_approval_updated_at_column();

-- Insert sample approval workflows
INSERT INTO approval_workflows (
    name, 
    description, 
    workflow_type, 
    permission_code_pattern,
    resource_type_pattern,
    priority_threshold,
    steps_template,
    created_by
) VALUES 
(
    'Standard Permission Request',
    'Default workflow for standard permission requests',
    'sequential',
    '%',
    '%',
    'medium',
    '[
        {
            "step_index": 1,
            "step_name": "Manager Approval",
            "approver_role": "manager",
            "auto_approve_rules": {
                "allowed_requester_roles": ["admin"],
                "max_auto_approve_level": "read"
            },
            "timeout_hours": 48
        }
    ]'::jsonb,
    1
),
(
    'High Priority Workflow', 
    'Escalated workflow for high priority requests',
    'parallel',
    '%admin%',
    '%',
    'high',
    '[
        {
            "step_index": 1,
            "step_name": "Senior Manager Approval",
            "approver_role": "senior_manager",
            "timeout_hours": 24
        },
        {
            "step_index": 2,
            "step_name": "Security Review",
            "approver_role": "security_officer",
            "timeout_hours": 24
        }
    ]'::jsonb,
    1
);

COMMIT;