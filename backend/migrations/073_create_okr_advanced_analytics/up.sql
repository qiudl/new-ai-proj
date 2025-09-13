-- Migration: 073_create_okr_advanced_analytics
-- Description: Create tables for OKR Phase 3 advanced analytics and performance tracking
-- Date: 2025-09-13

-- 1. OKR Performance Metrics Table
CREATE TABLE okr_performance_metrics (
    id SERIAL PRIMARY KEY,
    objective_id INTEGER NOT NULL,
    quarter VARCHAR(10) NOT NULL,
    user_id INTEGER NOT NULL,
    enterprise_id INTEGER,
    
    -- Performance metrics
    completion_rate DECIMAL(5,2) DEFAULT 0,
    average_kr_progress DECIMAL(5,2) DEFAULT 0,
    time_to_completion INTEGER, -- days
    consistency_score DECIMAL(5,2) DEFAULT 0, -- How consistent progress updates are
    quality_score DECIMAL(5,2) DEFAULT 0, -- Based on KR achievement vs target
    
    -- Behavioral metrics
    updates_frequency INTEGER DEFAULT 0, -- Number of updates made
    collaboration_score DECIMAL(5,2) DEFAULT 0, -- Team interaction level
    alignment_score DECIMAL(5,2) DEFAULT 0, -- How well aligned with company OKRs
    
    -- Calculated at end of quarter
    final_score DECIMAL(5,2) DEFAULT 0,
    grade VARCHAR(2) DEFAULT 'N/A', -- A, B, C, D, F grading
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_performance_objective FOREIGN KEY (objective_id) REFERENCES okr_objectives(id) ON DELETE CASCADE,
    CONSTRAINT fk_performance_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uk_performance_objective_quarter UNIQUE (objective_id, quarter)
);

-- 2. OKR Analytics Dashboard Data Table
CREATE TABLE okr_analytics_snapshots (
    id SERIAL PRIMARY KEY,
    enterprise_id INTEGER,
    user_id INTEGER,
    quarter VARCHAR(10) NOT NULL,
    snapshot_date DATE NOT NULL,
    
    -- Aggregate statistics
    total_objectives INTEGER DEFAULT 0,
    completed_objectives INTEGER DEFAULT 0,
    at_risk_objectives INTEGER DEFAULT 0,
    total_key_results INTEGER DEFAULT 0,
    completed_key_results INTEGER DEFAULT 0,
    
    -- Performance indicators
    overall_completion_rate DECIMAL(5,2) DEFAULT 0,
    average_quality_score DECIMAL(5,2) DEFAULT 0,
    team_alignment_score DECIMAL(5,2) DEFAULT 0,
    quarter_progress_rate DECIMAL(5,2) DEFAULT 0, -- Based on time elapsed
    
    -- Predictive metrics
    projected_completion_rate DECIMAL(5,2) DEFAULT 0,
    risk_assessment VARCHAR(20) DEFAULT 'low', -- low, medium, high
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_analytics_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uk_analytics_user_date UNIQUE (user_id, snapshot_date, quarter)
);

-- 3. OKR Team Collaboration Table
CREATE TABLE okr_team_collaboration (
    id SERIAL PRIMARY KEY,
    objective_id INTEGER NOT NULL,
    collaborator_user_id INTEGER NOT NULL,
    collaboration_type VARCHAR(20) NOT NULL, -- 'contributor', 'stakeholder', 'reviewer', 'mentor'
    permission_level VARCHAR(20) DEFAULT 'read', -- 'read', 'comment', 'edit'
    
    -- Collaboration metrics
    contribution_score DECIMAL(5,2) DEFAULT 0,
    feedback_count INTEGER DEFAULT 0,
    last_interaction_at TIMESTAMP,
    
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'removed'
    invited_by INTEGER,
    invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_collaboration_objective FOREIGN KEY (objective_id) REFERENCES okr_objectives(id) ON DELETE CASCADE,
    CONSTRAINT fk_collaboration_user FOREIGN KEY (collaborator_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_collaboration_inviter FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT uk_collaboration_objective_user UNIQUE (objective_id, collaborator_user_id)
);

-- 4. OKR Comments and Feedback Table
CREATE TABLE okr_comments (
    id SERIAL PRIMARY KEY,
    objective_id INTEGER,
    key_result_id INTEGER,
    user_id INTEGER NOT NULL,
    
    comment_text TEXT NOT NULL,
    comment_type VARCHAR(20) DEFAULT 'general', -- 'general', 'feedback', 'question', 'suggestion', 'blocker'
    visibility VARCHAR(20) DEFAULT 'team', -- 'private', 'team', 'company'
    
    -- Thread support
    parent_comment_id INTEGER,
    thread_level INTEGER DEFAULT 0,
    
    -- Engagement metrics
    likes_count INTEGER DEFAULT 0,
    replies_count INTEGER DEFAULT 0,
    
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_by INTEGER,
    resolved_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    CONSTRAINT fk_comment_objective FOREIGN KEY (objective_id) REFERENCES okr_objectives(id) ON DELETE CASCADE,
    CONSTRAINT fk_comment_key_result FOREIGN KEY (key_result_id) REFERENCES okr_key_results(id) ON DELETE CASCADE,
    CONSTRAINT fk_comment_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_comment_parent FOREIGN KEY (parent_comment_id) REFERENCES okr_comments(id) ON DELETE CASCADE,
    CONSTRAINT fk_comment_resolver FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
    
    -- At least one of objective_id or key_result_id must be present
    CONSTRAINT chk_comment_target CHECK (objective_id IS NOT NULL OR key_result_id IS NOT NULL)
);

-- 5. OKR Export Templates Table
CREATE TABLE okr_export_templates (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    template_name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Export configuration
    export_format VARCHAR(20) NOT NULL, -- 'pdf', 'excel', 'powerpoint', 'json'
    include_metrics BOOLEAN DEFAULT TRUE,
    include_comments BOOLEAN DEFAULT FALSE,
    include_timeline BOOLEAN DEFAULT TRUE,
    include_analytics BOOLEAN DEFAULT TRUE,
    
    -- Template settings (JSON)
    template_config TEXT, -- JSON configuration for styling, filters, etc.
    
    is_default BOOLEAN DEFAULT FALSE,
    is_shared BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    CONSTRAINT fk_export_template_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for performance optimization
CREATE INDEX idx_performance_metrics_quarter ON okr_performance_metrics(quarter, enterprise_id);
CREATE INDEX idx_performance_metrics_user ON okr_performance_metrics(user_id, quarter);
CREATE INDEX idx_analytics_snapshots_date ON okr_analytics_snapshots(snapshot_date DESC, enterprise_id);
CREATE INDEX idx_collaboration_objective ON okr_team_collaboration(objective_id, status);
CREATE INDEX idx_collaboration_user ON okr_team_collaboration(collaborator_user_id, status);
CREATE INDEX idx_comments_objective ON okr_comments(objective_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_key_result ON okr_comments(key_result_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_thread ON okr_comments(parent_comment_id, thread_level) WHERE deleted_at IS NULL;
CREATE INDEX idx_export_templates_user ON okr_export_templates(user_id, is_default) WHERE deleted_at IS NULL;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER trigger_okr_performance_metrics_updated_at
    BEFORE UPDATE ON okr_performance_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_okr_team_collaboration_updated_at
    BEFORE UPDATE ON okr_team_collaboration
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_okr_comments_updated_at
    BEFORE UPDATE ON okr_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_okr_export_templates_updated_at
    BEFORE UPDATE ON okr_export_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- Create or update the timestamp function if it doesn't exist
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';