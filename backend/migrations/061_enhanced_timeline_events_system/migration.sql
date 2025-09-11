-- Migration 061: Enhanced Timeline Events System
-- Purpose: Create comprehensive timeline events table with enhanced metadata support
-- Date: 2025-09-11

-- Create enhanced task timeline events table
CREATE TABLE IF NOT EXISTS task_timeline_events (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    description TEXT NOT NULL,
    user_id BIGINT,
    metadata JSONB DEFAULT '{}',
    username VARCHAR(100),
    task_title VARCHAR(500),
    
    -- Enhanced fields
    project_id BIGINT,
    correlation_id VARCHAR(100),
    parent_event_id BIGINT,
    severity VARCHAR(20) DEFAULT 'info',
    category VARCHAR(20) DEFAULT 'user',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_timeline_events_task_id FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_timeline_events_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_timeline_events_project_id FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    CONSTRAINT fk_timeline_events_parent_event_id FOREIGN KEY (parent_event_id) REFERENCES task_timeline_events(id) ON DELETE SET NULL,
    
    -- Check constraints
    CONSTRAINT chk_timeline_events_event_type CHECK (
        event_type IN (
            -- 基础操作
            'created', 'updated', 'deleted', 'restored',
            -- 状态变更
            'status_changed', 'completed', 'started', 'paused', 'cancelled',
            -- 分配和权限
            'assigned', 'unassigned', 'reassigned', 'permission_changed',
            -- 时间管理
            'deadline_changed', 'due_date_extended', 'schedule_updated', 'time_logged', 'estimate_updated',
            -- 内容变更
            'title_changed', 'description_updated', 'priority_changed', 'tags_updated', 'attachment_added', 'attachment_removed',
            -- 关系变更
            'dependency_added', 'dependency_removed', 'parent_changed', 'child_added', 'child_removed',
            -- 协作和沟通
            'comment_added', 'comment_updated', 'comment_deleted', 'mention_added', 'review_requested', 'approval_given',
            -- 系统操作
            'bulk_updated', 'imported', 'exported', 'archived', 'template_applied', 'automation_triggered'
        )
    ),
    CONSTRAINT chk_timeline_events_severity CHECK (
        severity IN ('info', 'warning', 'error', 'critical')
    ),
    CONSTRAINT chk_timeline_events_category CHECK (
        category IN ('system', 'user', 'automation', 'integration')
    )
);

-- Create comprehensive indexes for performance
CREATE INDEX idx_timeline_events_task_id ON task_timeline_events(task_id);
CREATE INDEX idx_timeline_events_event_date ON task_timeline_events(event_date DESC);
CREATE INDEX idx_timeline_events_event_type ON task_timeline_events(event_type);
CREATE INDEX idx_timeline_events_user_id ON task_timeline_events(user_id);
CREATE INDEX idx_timeline_events_project_id ON task_timeline_events(project_id);
CREATE INDEX idx_timeline_events_severity ON task_timeline_events(severity);
CREATE INDEX idx_timeline_events_category ON task_timeline_events(category);
CREATE INDEX idx_timeline_events_correlation_id ON task_timeline_events(correlation_id);
CREATE INDEX idx_timeline_events_parent_event_id ON task_timeline_events(parent_event_id);

-- Composite indexes for complex queries
CREATE INDEX idx_timeline_events_task_date_type ON task_timeline_events(task_id, event_date DESC, event_type);
CREATE INDEX idx_timeline_events_project_date ON task_timeline_events(project_id, event_date DESC);
CREATE INDEX idx_timeline_events_user_date ON task_timeline_events(user_id, event_date DESC);
CREATE INDEX idx_timeline_events_type_date ON task_timeline_events(event_type, event_date DESC);

-- GIN indexes for JSONB metadata and advanced search
CREATE INDEX idx_timeline_events_metadata ON task_timeline_events USING GIN(metadata);

-- Partial indexes for specific use cases
CREATE INDEX idx_timeline_events_system_events ON task_timeline_events(event_date DESC) 
WHERE category = 'system';
CREATE INDEX idx_timeline_events_critical_errors ON task_timeline_events(event_date DESC) 
WHERE severity IN ('error', 'critical');
CREATE INDEX idx_timeline_events_with_correlation ON task_timeline_events(correlation_id, event_date DESC) 
WHERE correlation_id IS NOT NULL;

-- Create trigger function for updated_at timestamp
CREATE OR REPLACE FUNCTION update_timeline_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic updated_at updates
DROP TRIGGER IF EXISTS trigger_update_timeline_events_updated_at ON task_timeline_events;
CREATE TRIGGER trigger_update_timeline_events_updated_at
    BEFORE UPDATE ON task_timeline_events
    FOR EACH ROW
    EXECUTE FUNCTION update_timeline_events_updated_at();

-- Create view for enhanced timeline events with user and task information
CREATE OR REPLACE VIEW v_enhanced_timeline_events AS
SELECT 
    tte.id,
    tte.task_id,
    tte.event_type,
    tte.event_date,
    tte.description,
    tte.user_id,
    tte.metadata,
    tte.username,
    tte.task_title,
    tte.project_id,
    tte.correlation_id,
    tte.parent_event_id,
    tte.severity,
    tte.category,
    tte.created_at,
    tte.updated_at,
    
    -- Additional context information
    u.username as user_username,
    u.email as user_email,
    t.title as current_task_title,
    t.status as current_task_status,
    t.priority as current_task_priority,
    p.name as project_name,
    
    -- Parent event information
    parent_tte.event_type as parent_event_type,
    parent_tte.description as parent_event_description,
    
    -- Calculate time differences
    EXTRACT(EPOCH FROM (tte.event_date - LAG(tte.event_date) OVER (
        PARTITION BY tte.task_id 
        ORDER BY tte.event_date
    ))) as seconds_since_previous_event
    
FROM task_timeline_events tte
LEFT JOIN users u ON tte.user_id = u.id
LEFT JOIN tasks t ON tte.task_id = t.id
LEFT JOIN projects p ON tte.project_id = p.id
LEFT JOIN task_timeline_events parent_tte ON tte.parent_event_id = parent_tte.id;

-- Create view for timeline event statistics
CREATE OR REPLACE VIEW v_timeline_event_statistics AS
WITH daily_stats AS (
    SELECT 
        DATE(event_date) as event_date,
        event_type,
        category,
        severity,
        user_id,
        project_id,
        COUNT(*) as event_count
    FROM task_timeline_events
    WHERE event_date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY DATE(event_date), event_type, category, severity, user_id, project_id
),
user_activity AS (
    SELECT 
        user_id,
        username,
        COUNT(*) as total_events,
        COUNT(DISTINCT task_id) as tasks_touched,
        COUNT(DISTINCT DATE(event_date)) as active_days
    FROM task_timeline_events
    WHERE event_date >= CURRENT_DATE - INTERVAL '30 days'
    AND user_id IS NOT NULL
    GROUP BY user_id, username
)
SELECT 
    'summary' as stat_type,
    json_build_object(
        'total_events', (SELECT COUNT(*) FROM task_timeline_events WHERE event_date >= CURRENT_DATE - INTERVAL '30 days'),
        'total_users', (SELECT COUNT(DISTINCT user_id) FROM task_timeline_events WHERE event_date >= CURRENT_DATE - INTERVAL '30 days' AND user_id IS NOT NULL),
        'total_tasks', (SELECT COUNT(DISTINCT task_id) FROM task_timeline_events WHERE event_date >= CURRENT_DATE - INTERVAL '30 days'),
        'total_projects', (SELECT COUNT(DISTINCT project_id) FROM task_timeline_events WHERE event_date >= CURRENT_DATE - INTERVAL '30 days' AND project_id IS NOT NULL)
    ) as statistics;

-- Create function to get task timeline with enhanced filtering
CREATE OR REPLACE FUNCTION get_enhanced_task_timeline(
    p_task_id BIGINT,
    p_event_types TEXT[] DEFAULT NULL,
    p_user_ids BIGINT[] DEFAULT NULL,
    p_categories TEXT[] DEFAULT NULL,
    p_severities TEXT[] DEFAULT NULL,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_include_system BOOLEAN DEFAULT TRUE,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    id BIGINT,
    task_id BIGINT,
    event_type VARCHAR(50),
    event_date TIMESTAMP WITH TIME ZONE,
    description TEXT,
    user_id BIGINT,
    metadata JSONB,
    username VARCHAR(100),
    task_title VARCHAR(500),
    project_id BIGINT,
    correlation_id VARCHAR(100),
    parent_event_id BIGINT,
    severity VARCHAR(20),
    category VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    user_username VARCHAR(100),
    user_email VARCHAR(255),
    current_task_title VARCHAR(500),
    current_task_status VARCHAR(50),
    project_name VARCHAR(255),
    seconds_since_previous_event NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tte.id,
        tte.task_id,
        tte.event_type,
        tte.event_date,
        tte.description,
        tte.user_id,
        tte.metadata,
        tte.username,
        tte.task_title,
        tte.project_id,
        tte.correlation_id,
        tte.parent_event_id,
        tte.severity,
        tte.category,
        tte.created_at,
        tte.updated_at,
        tte.user_username,
        tte.user_email,
        tte.current_task_title,
        tte.current_task_status,
        tte.project_name,
        tte.seconds_since_previous_event
    FROM v_enhanced_timeline_events tte
    WHERE tte.task_id = p_task_id
        AND (p_event_types IS NULL OR tte.event_type = ANY(p_event_types))
        AND (p_user_ids IS NULL OR tte.user_id = ANY(p_user_ids))
        AND (p_categories IS NULL OR tte.category = ANY(p_categories))
        AND (p_severities IS NULL OR tte.severity = ANY(p_severities))
        AND (p_start_date IS NULL OR tte.event_date >= p_start_date)
        AND (p_end_date IS NULL OR tte.event_date <= p_end_date)
        AND (p_include_system = TRUE OR tte.category != 'system')
    ORDER BY tte.event_date DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Create function for bulk timeline event insertion
CREATE OR REPLACE FUNCTION create_timeline_events_batch(
    events JSONB
) RETURNS TABLE (
    id BIGINT,
    event_type VARCHAR(50),
    task_id BIGINT,
    success BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    event_record RECORD;
    inserted_id BIGINT;
    error_msg TEXT;
BEGIN
    FOR event_record IN 
        SELECT * FROM jsonb_to_recordset(events) AS x(
            task_id BIGINT,
            event_type VARCHAR(50),
            description TEXT,
            user_id BIGINT,
            metadata JSONB,
            username VARCHAR(100),
            task_title VARCHAR(500),
            project_id BIGINT,
            correlation_id VARCHAR(100),
            parent_event_id BIGINT,
            severity VARCHAR(20),
            category VARCHAR(20)
        )
    LOOP
        BEGIN
            INSERT INTO task_timeline_events (
                task_id, event_type, description, user_id, metadata,
                username, task_title, project_id, correlation_id,
                parent_event_id, severity, category
            ) VALUES (
                event_record.task_id,
                event_record.event_type,
                event_record.description,
                event_record.user_id,
                COALESCE(event_record.metadata, '{}'::JSONB),
                event_record.username,
                event_record.task_title,
                event_record.project_id,
                event_record.correlation_id,
                event_record.parent_event_id,
                COALESCE(event_record.severity, 'info'),
                COALESCE(event_record.category, 'user')
            ) RETURNING task_timeline_events.id INTO inserted_id;
            
            RETURN QUERY SELECT 
                inserted_id,
                event_record.event_type,
                event_record.task_id,
                TRUE as success,
                NULL::TEXT as error_message;
                
        EXCEPTION WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
            RETURN QUERY SELECT 
                NULL::BIGINT,
                event_record.event_type,
                event_record.task_id,
                FALSE as success,
                error_msg;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE task_timeline_events IS 'Enhanced timeline events for comprehensive task change tracking';
COMMENT ON COLUMN task_timeline_events.event_type IS 'Type of timeline event with support for 26+ event types';
COMMENT ON COLUMN task_timeline_events.metadata IS 'Enhanced JSONB metadata with structured change tracking';
COMMENT ON COLUMN task_timeline_events.correlation_id IS 'ID for grouping related events together';
COMMENT ON COLUMN task_timeline_events.parent_event_id IS 'Parent event for hierarchical event relationships';
COMMENT ON COLUMN task_timeline_events.severity IS 'Event severity: info, warning, error, critical';
COMMENT ON COLUMN task_timeline_events.category IS 'Event category: system, user, automation, integration';

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON task_timeline_events TO ai_app_user;
GRANT USAGE ON SEQUENCE task_timeline_events_id_seq TO ai_app_user;
GRANT SELECT ON v_enhanced_timeline_events TO ai_app_user;
GRANT SELECT ON v_timeline_event_statistics TO ai_app_user;