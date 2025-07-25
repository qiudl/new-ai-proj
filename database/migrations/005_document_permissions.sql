-- Migration: Document permissions and collaboration system
-- Version: 005
-- Description: Adds document permissions, sharing, and comment system

BEGIN;

-- Document permissions table
CREATE TABLE IF NOT EXISTS document_permissions (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_type VARCHAR(20) NOT NULL CHECK (permission_type IN ('read', 'write', 'admin', 'comment')),
    granted_by INTEGER NOT NULL REFERENCES users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    
    UNIQUE(document_id, user_id), -- One permission per user per document
    INDEX idx_document_permissions_document_id (document_id),
    INDEX idx_document_permissions_user_id (user_id),
    INDEX idx_document_permissions_granted_by (granted_by),
    INDEX idx_document_permissions_expires_at (expires_at)
);

-- Document shares table for shareable links
CREATE TABLE IF NOT EXISTS document_shares (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    share_token VARCHAR(64) NOT NULL UNIQUE,
    share_type VARCHAR(20) NOT NULL CHECK (share_type IN ('link', 'email', 'team')),
    permission_type VARCHAR(20) NOT NULL CHECK (permission_type IN ('read', 'comment')),
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    access_count INTEGER DEFAULT 0,
    require_auth BOOLEAN DEFAULT false,
    allow_download BOOLEAN DEFAULT true,
    
    INDEX idx_document_shares_document_id (document_id),
    INDEX idx_document_shares_token (share_token),
    INDEX idx_document_shares_created_by (created_by),
    INDEX idx_document_shares_expires_at (expires_at)
);

-- Document comments table
CREATE TABLE IF NOT EXISTS document_comments (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    parent_id INTEGER REFERENCES document_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    position JSONB, -- Store position info for inline comments
    is_resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_document_comments_document_id (document_id),
    INDEX idx_document_comments_user_id (user_id),
    INDEX idx_document_comments_parent_id (parent_id),
    INDEX idx_document_comments_created_at (created_at),
    INDEX idx_document_comments_is_resolved (is_resolved)
);

-- Document collaboration logs
CREATE TABLE IF NOT EXISTS document_collaboration_logs (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_document_collaboration_logs_document_id (document_id),
    INDEX idx_document_collaboration_logs_user_id (user_id),
    INDEX idx_document_collaboration_logs_event_type (event_type),
    INDEX idx_document_collaboration_logs_created_at (created_at)
);

-- Add comments count trigger for documents
CREATE OR REPLACE FUNCTION update_document_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE documents 
        SET updated_at = NOW()
        WHERE id = NEW.document_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE documents 
        SET updated_at = NOW()
        WHERE id = OLD.document_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for comment changes
DROP TRIGGER IF EXISTS trigger_update_document_on_comment_change ON document_comments;
CREATE TRIGGER trigger_update_document_on_comment_change
    AFTER INSERT OR DELETE ON document_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_document_comments_count();

-- Add updated_at trigger for comments
CREATE OR REPLACE FUNCTION update_document_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_document_comments_updated_at ON document_comments;
CREATE TRIGGER trigger_update_document_comments_updated_at
    BEFORE UPDATE ON document_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_document_comments_updated_at();

-- Create views for permission management
CREATE OR REPLACE VIEW document_permissions_with_details AS
SELECT 
    dp.id,
    dp.document_id,
    dp.user_id,
    dp.permission_type,
    dp.granted_by,
    dp.granted_at,
    dp.expires_at,
    dp.is_active,
    d.title as document_title,
    d.type as document_type,
    u.username,
    u.email as user_email,
    gu.username as grantor_name,
    CASE 
        WHEN dp.expires_at IS NULL THEN true
        WHEN dp.expires_at > NOW() THEN true
        ELSE false
    END as is_valid
FROM document_permissions dp
LEFT JOIN documents d ON dp.document_id = d.id
LEFT JOIN users u ON dp.user_id = u.id
LEFT JOIN users gu ON dp.granted_by = gu.id
WHERE d.deleted_at IS NULL;

-- Create view for document shares with details
CREATE OR REPLACE VIEW document_shares_with_details AS
SELECT 
    ds.id,
    ds.document_id,
    ds.share_token,
    ds.share_type,
    ds.permission_type,
    ds.created_by,
    ds.created_at,
    ds.expires_at,
    ds.is_active,
    ds.access_count,
    ds.require_auth,
    ds.allow_download,
    d.title as document_title,
    d.type as document_type,
    u.username as creator_name,
    CASE 
        WHEN ds.expires_at IS NULL THEN true
        WHEN ds.expires_at > NOW() THEN true
        ELSE false
    END as is_valid
FROM document_shares ds
LEFT JOIN documents d ON ds.document_id = d.id
LEFT JOIN users u ON ds.created_by = u.id
WHERE d.deleted_at IS NULL;

-- Create view for comment threads
CREATE OR REPLACE VIEW document_comment_threads AS
WITH RECURSIVE comment_tree AS (
    -- Root comments
    SELECT 
        dc.id,
        dc.document_id,
        dc.user_id,
        dc.parent_id,
        dc.content,
        dc.position,
        dc.is_resolved,
        dc.created_at,
        dc.updated_at,
        u.username,
        u.email as user_email,
        0 as depth,
        ARRAY[dc.id] as path
    FROM document_comments dc
    JOIN users u ON dc.user_id = u.id
    WHERE dc.parent_id IS NULL
    
    UNION ALL
    
    -- Child comments
    SELECT 
        dc.id,
        dc.document_id,
        dc.user_id,
        dc.parent_id,
        dc.content,
        dc.position,
        dc.is_resolved,
        dc.created_at,
        dc.updated_at,
        u.username,
        u.email as user_email,
        ct.depth + 1,
        ct.path || dc.id
    FROM document_comments dc
    JOIN users u ON dc.user_id = u.id
    JOIN comment_tree ct ON dc.parent_id = ct.id
    WHERE ct.depth < 10 -- Prevent infinite recursion
)
SELECT * FROM comment_tree ORDER BY path;

-- Function to check document permission
CREATE OR REPLACE FUNCTION check_document_permission(
    p_document_id INTEGER,
    p_user_id INTEGER,
    p_permission_type VARCHAR(20)
) RETURNS BOOLEAN AS $$
DECLARE
    v_owner_id INTEGER;
    v_permission_count INTEGER;
BEGIN
    -- Check if user is document owner
    SELECT owner_id INTO v_owner_id 
    FROM documents 
    WHERE id = p_document_id AND deleted_at IS NULL;
    
    IF v_owner_id = p_user_id THEN
        RETURN true;
    END IF;
    
    -- Check explicit permissions
    SELECT COUNT(*) INTO v_permission_count
    FROM document_permissions dp
    WHERE dp.document_id = p_document_id 
      AND dp.user_id = p_user_id
      AND dp.is_active = true
      AND (dp.expires_at IS NULL OR dp.expires_at > NOW())
      AND (
          dp.permission_type = 'admin' OR
          (dp.permission_type = 'write' AND p_permission_type IN ('read', 'write', 'comment')) OR
          (dp.permission_type = 'comment' AND p_permission_type IN ('read', 'comment')) OR
          (dp.permission_type = 'read' AND p_permission_type = 'read')
      );
    
    RETURN v_permission_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to get effective user permissions for a document
CREATE OR REPLACE FUNCTION get_user_document_permissions(
    p_document_id INTEGER,
    p_user_id INTEGER
) RETURNS JSONB AS $$
DECLARE
    v_owner_id INTEGER;
    v_permissions JSONB := '{"can_read": false, "can_write": false, "can_admin": false, "can_comment": false, "can_share": false, "is_owner": false}'::jsonb;
    v_permission_type VARCHAR(20);
BEGIN
    -- Check if user is document owner
    SELECT owner_id INTO v_owner_id 
    FROM documents 
    WHERE id = p_document_id AND deleted_at IS NULL;
    
    IF v_owner_id = p_user_id THEN
        RETURN '{"can_read": true, "can_write": true, "can_admin": true, "can_comment": true, "can_share": true, "is_owner": true}'::jsonb;
    END IF;
    
    -- Get the highest permission level
    SELECT permission_type INTO v_permission_type
    FROM document_permissions dp
    WHERE dp.document_id = p_document_id 
      AND dp.user_id = p_user_id
      AND dp.is_active = true
      AND (dp.expires_at IS NULL OR dp.expires_at > NOW())
    ORDER BY 
        CASE permission_type
            WHEN 'admin' THEN 4
            WHEN 'write' THEN 3
            WHEN 'comment' THEN 2
            WHEN 'read' THEN 1
            ELSE 0
        END DESC
    LIMIT 1;
    
    -- Set permissions based on the highest level found
    IF v_permission_type IS NOT NULL THEN
        CASE v_permission_type
            WHEN 'admin' THEN
                v_permissions := '{"can_read": true, "can_write": true, "can_admin": true, "can_comment": true, "can_share": true, "is_owner": false}'::jsonb;
            WHEN 'write' THEN
                v_permissions := '{"can_read": true, "can_write": true, "can_admin": false, "can_comment": true, "can_share": false, "is_owner": false}'::jsonb;
            WHEN 'comment' THEN
                v_permissions := '{"can_read": true, "can_write": false, "can_admin": false, "can_comment": true, "can_share": false, "is_owner": false}'::jsonb;
            WHEN 'read' THEN
                v_permissions := '{"can_read": true, "can_write": false, "can_admin": false, "can_comment": false, "can_share": false, "is_owner": false}'::jsonb;
        END CASE;
    END IF;
    
    RETURN v_permissions;
END;
$$ LANGUAGE plpgsql;

-- Insert sample permission data
INSERT INTO document_permissions (document_id, user_id, permission_type, granted_by) 
SELECT 
    d.id,
    2, -- dev_user_1
    'write',
    1  -- admin
FROM documents d 
WHERE d.title LIKE '%API%' 
AND NOT EXISTS (
    SELECT 1 FROM document_permissions dp 
    WHERE dp.document_id = d.id AND dp.user_id = 2
)
LIMIT 3;

INSERT INTO document_permissions (document_id, user_id, permission_type, granted_by) 
SELECT 
    d.id,
    3, -- dev_user_2
    'read',
    1  -- admin
FROM documents d 
WHERE d.title LIKE '%设计%'
AND NOT EXISTS (
    SELECT 1 FROM document_permissions dp 
    WHERE dp.document_id = d.id AND dp.user_id = 3
)
LIMIT 2;

-- Insert sample share data
INSERT INTO document_shares (document_id, share_token, share_type, permission_type, created_by)
SELECT 
    d.id,
    'share_' || d.id || '_public',
    'link',
    'read',
    1
FROM documents d 
WHERE d.visibility = 'public'
AND NOT EXISTS (
    SELECT 1 FROM document_shares ds 
    WHERE ds.document_id = d.id
)
LIMIT 2;

-- Insert sample comments
INSERT INTO document_comments (document_id, user_id, content)
SELECT 
    d.id,
    2,
    'This document looks great! Very comprehensive and well-structured.'
FROM documents d 
WHERE d.title LIKE '%需求%'
LIMIT 1;

INSERT INTO document_comments (document_id, user_id, content)
SELECT 
    d.id,
    3,
    'Could we add more details about the implementation timeline?'
FROM documents d 
WHERE d.title LIKE '%API%'
LIMIT 1;

COMMIT;

-- Create indexes for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_permissions_active_expires 
ON document_permissions (document_id, user_id) 
WHERE is_active = true AND (expires_at IS NULL OR expires_at > NOW());

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_shares_active_expires 
ON document_shares (share_token) 
WHERE is_active = true AND (expires_at IS NULL OR expires_at > NOW());

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_comments_document_resolved 
ON document_comments (document_id, is_resolved, created_at DESC);

-- Update table statistics
ANALYZE document_permissions;
ANALYZE document_shares;
ANALYZE document_comments;
ANALYZE document_collaboration_logs;