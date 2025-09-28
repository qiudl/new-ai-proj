-- Create alerts table for data validation monitoring
-- Migration: 070_create_alerts_table

CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Alert classification
    alert_type VARCHAR(50) NOT NULL, -- 'data_quality_warning', 'low_activity', etc.
    level VARCHAR(20) NOT NULL CHECK (level IN ('info', 'warning', 'critical')),
    
    -- Alert content
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    
    -- Alert lifecycle
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_level ON alerts(level);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_user_resolved ON alerts(user_id, resolved, created_at DESC);

-- Add table comment
COMMENT ON TABLE alerts IS '数据验证和监控告警表';
COMMENT ON COLUMN alerts.alert_type IS '告警类型：data_quality_warning, low_activity, inactive_user等';
COMMENT ON COLUMN alerts.level IS '告警级别：info, warning, critical';
COMMENT ON COLUMN alerts.details IS '告警详细信息，JSON格式存储';

-- Create trigger for updating updated_at
CREATE OR REPLACE FUNCTION update_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_update_alerts_updated_at ON alerts;
CREATE TRIGGER trig_update_alerts_updated_at
    BEFORE UPDATE ON alerts
    FOR EACH ROW EXECUTE FUNCTION update_alerts_updated_at();