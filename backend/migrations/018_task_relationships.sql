-- Migration 018: Create task_relationships table for parallel development support
-- Purpose: Enable sibling task and parent-child task parallel development workflow
-- Date: 2025-08-13

-- Create task_relationships table
CREATE TABLE IF NOT EXISTS task_relationships (
    id SERIAL PRIMARY KEY,
    source_task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    target_task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL,
    relationship_status VARCHAR(50) DEFAULT 'active',
    created_by INTEGER NOT NULL REFERENCES users(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    -- Ensure unique relationship pairs
    CONSTRAINT unique_task_relationship UNIQUE(source_task_id, target_task_id, relationship_type),
    
    -- Prevent self-reference
    CONSTRAINT no_self_reference CHECK (source_task_id != target_task_id),
    
    -- Validate relationship types
    CONSTRAINT valid_relationship_type CHECK (
        relationship_type IN (
            'depends_on',           -- 依赖关系（A依赖于B）
            'blocks',               -- 阻塞关系（A阻塞B）  
            'parallel_with',        -- 并行关系（A与B并行）
            'follows',              -- 顺序关系（A跟随B）
            'related_to',           -- 相关关系（A与B相关）
            'child_of',             -- 子任务关系（A是B的子任务）
            'parent_of',            -- 父任务关系（A是B的父任务）
            'sibling_of'            -- 兄弟关系（A与B是兄弟任务）
        )
    ),
    
    -- Validate relationship status
    CONSTRAINT valid_relationship_status CHECK (
        relationship_status IN ('active', 'inactive', 'completed', 'cancelled')
    )
);

-- Create indexes for performance optimization
CREATE INDEX idx_task_relationships_source ON task_relationships(source_task_id);
CREATE INDEX idx_task_relationships_target ON task_relationships(target_task_id);
CREATE INDEX idx_task_relationships_type ON task_relationships(relationship_type);
CREATE INDEX idx_task_relationships_status ON task_relationships(relationship_status);
CREATE INDEX idx_task_relationships_created_at ON task_relationships(created_at);

-- Composite indexes for common queries
CREATE INDEX idx_task_relationships_source_type ON task_relationships(source_task_id, relationship_type);
CREATE INDEX idx_task_relationships_target_type ON task_relationships(target_task_id, relationship_type);
CREATE INDEX idx_task_relationships_active ON task_relationships(relationship_status) WHERE deleted_at IS NULL;

-- Create trigger to update updated_at automatically
CREATE OR REPLACE FUNCTION update_task_relationships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_task_relationships_updated_at
    BEFORE UPDATE ON task_relationships
    FOR EACH ROW
    EXECUTE FUNCTION update_task_relationships_updated_at();

-- Add comments for documentation
COMMENT ON TABLE task_relationships IS 'Task relationships table for supporting parallel development workflows';
COMMENT ON COLUMN task_relationships.source_task_id IS 'The source task in the relationship';
COMMENT ON COLUMN task_relationships.target_task_id IS 'The target task in the relationship';
COMMENT ON COLUMN task_relationships.relationship_type IS 'Type of relationship: depends_on, blocks, parallel_with, follows, related_to, child_of, parent_of, sibling_of';
COMMENT ON COLUMN task_relationships.relationship_status IS 'Status of the relationship: active, inactive, completed, cancelled';
COMMENT ON COLUMN task_relationships.metadata IS 'Additional metadata for the relationship (e.g., dependency conditions, parallel constraints)';

-- Create helpful views for common queries
CREATE OR REPLACE VIEW task_dependencies AS
SELECT 
    tr.source_task_id as task_id,
    tr.target_task_id as depends_on_task_id,
    t1.title as task_title,
    t2.title as depends_on_task_title,
    t2.status as dependency_status,
    tr.relationship_status,
    tr.metadata,
    tr.created_at as relationship_created_at
FROM task_relationships tr
JOIN tasks t1 ON tr.source_task_id = t1.id
JOIN tasks t2 ON tr.target_task_id = t2.id
WHERE tr.relationship_type = 'depends_on'
AND tr.deleted_at IS NULL
AND t1.deleted_at IS NULL 
AND t2.deleted_at IS NULL;

CREATE OR REPLACE VIEW task_parallel_groups AS
SELECT 
    tr.source_task_id as task_id,
    tr.target_task_id as parallel_task_id,
    t1.title as task_title,
    t2.title as parallel_task_title,
    t1.status as task_status,
    t2.status as parallel_task_status,
    tr.metadata,
    tr.created_at as relationship_created_at
FROM task_relationships tr
JOIN tasks t1 ON tr.source_task_id = t1.id
JOIN tasks t2 ON tr.target_task_id = t2.id
WHERE tr.relationship_type = 'parallel_with'
AND tr.deleted_at IS NULL
AND t1.deleted_at IS NULL 
AND t2.deleted_at IS NULL;

-- Sample data for testing (commented out for production)
/*
-- Insert sample relationships
INSERT INTO task_relationships (source_task_id, target_task_id, relationship_type, created_by, metadata) VALUES
(212, 213, 'follows', 1, '{"description": "Database model must be completed before backend development"}'),
(213, 214, 'parallel_with', 1, '{"description": "Backend and frontend can be developed in parallel"}'),
(214, 215, 'follows', 1, '{"description": "Testing requires both backend and frontend to be completed"}');
*/