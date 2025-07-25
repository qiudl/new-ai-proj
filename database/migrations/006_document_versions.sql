-- Document Version Management Migration
-- This migration adds comprehensive version control for documents

-- Document versions table
CREATE TABLE IF NOT EXISTS document_versions (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    file_url VARCHAR(500),
    file_size BIGINT DEFAULT 0,
    mime_type VARCHAR(100),
    change_summary TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_major_version BOOLEAN DEFAULT FALSE,
    tags JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    UNIQUE(document_id, version_number)
);

-- Document version comparisons table for tracking changes between versions
CREATE TABLE IF NOT EXISTS document_version_comparisons (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    from_version INTEGER NOT NULL,
    to_version INTEGER NOT NULL,
    diff_content TEXT, -- Stores diff in JSON format
    added_lines INTEGER DEFAULT 0,
    removed_lines INTEGER DEFAULT 0,
    modified_lines INTEGER DEFAULT 0,
    similarity_score DECIMAL(5,4) DEFAULT 0.0000, -- 0.0000 to 1.0000
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (document_id, from_version) REFERENCES document_versions(document_id, version_number),
    FOREIGN KEY (document_id, to_version) REFERENCES document_versions(document_id, version_number),
    UNIQUE(document_id, from_version, to_version)
);

-- Document version branches for advanced version control
CREATE TABLE IF NOT EXISTS document_version_branches (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    branch_name VARCHAR(100) NOT NULL,
    base_version INTEGER NOT NULL,
    current_version INTEGER NOT NULL,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    merged_at TIMESTAMP WITH TIME ZONE,
    merged_by INTEGER REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    description TEXT,
    
    FOREIGN KEY (document_id, base_version) REFERENCES document_versions(document_id, version_number),
    FOREIGN KEY (document_id, current_version) REFERENCES document_versions(document_id, version_number),
    UNIQUE(document_id, branch_name)
);

-- Document version labels/tags for marking important versions
CREATE TABLE IF NOT EXISTS document_version_labels (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    label VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#1890ff',
    description TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (document_id, version_number) REFERENCES document_versions(document_id, version_number),
    UNIQUE(document_id, version_number, label)
);

-- Document version comments for collaborative review
CREATE TABLE IF NOT EXISTS document_version_comments (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    line_number INTEGER, -- For line-specific comments
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_resolved BOOLEAN DEFAULT FALSE,
    parent_id INTEGER REFERENCES document_version_comments(id),
    
    FOREIGN KEY (document_id, version_number) REFERENCES document_versions(document_id, version_number)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_created_at ON document_versions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_versions_version_number ON document_versions(version_number DESC);
CREATE INDEX IF NOT EXISTS idx_document_versions_created_by ON document_versions(created_by);
CREATE INDEX IF NOT EXISTS idx_document_versions_major ON document_versions(document_id, is_major_version) WHERE is_major_version = TRUE;

CREATE INDEX IF NOT EXISTS idx_version_comparisons_document ON document_version_comparisons(document_id);
CREATE INDEX IF NOT EXISTS idx_version_comparisons_versions ON document_version_comparisons(from_version, to_version);

CREATE INDEX IF NOT EXISTS idx_version_branches_document ON document_version_branches(document_id);
CREATE INDEX IF NOT EXISTS idx_version_branches_active ON document_version_branches(document_id, is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_version_labels_document ON document_version_labels(document_id);
CREATE INDEX IF NOT EXISTS idx_version_labels_version ON document_version_labels(document_id, version_number);

CREATE INDEX IF NOT EXISTS idx_version_comments_document ON document_version_comments(document_id);
CREATE INDEX IF NOT EXISTS idx_version_comments_version ON document_version_comments(document_id, version_number);
CREATE INDEX IF NOT EXISTS idx_version_comments_user ON document_version_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_version_comments_parent ON document_version_comments(parent_id);

-- GIN indexes for JSONB fields
CREATE INDEX IF NOT EXISTS idx_document_versions_tags_gin ON document_versions USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_document_versions_metadata_gin ON document_versions USING GIN(metadata);

-- Functions for version management
CREATE OR REPLACE FUNCTION get_document_latest_version(doc_id INTEGER)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COALESCE(MAX(version_number), 0)
        FROM document_versions 
        WHERE document_id = doc_id
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_next_version_number(doc_id INTEGER)
RETURNS INTEGER AS $$
BEGIN
    RETURN get_document_latest_version(doc_id) + 1;
END;
$$ LANGUAGE plpgsql;

-- Function to create a new document version
CREATE OR REPLACE FUNCTION create_document_version(
    p_document_id INTEGER,
    p_title VARCHAR(255),
    p_content TEXT DEFAULT NULL,
    p_file_url VARCHAR(500) DEFAULT NULL,
    p_file_size BIGINT DEFAULT 0,
    p_mime_type VARCHAR(100) DEFAULT NULL,
    p_change_summary TEXT DEFAULT NULL,
    p_created_by INTEGER,
    p_is_major_version BOOLEAN DEFAULT FALSE,
    p_tags JSONB DEFAULT '[]'::jsonb,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS INTEGER AS $$
DECLARE
    v_version_number INTEGER;
    v_version_id INTEGER;
BEGIN
    -- Get next version number
    v_version_number := get_next_version_number(p_document_id);
    
    -- Insert new version
    INSERT INTO document_versions (
        document_id, version_number, title, content, file_url, file_size,
        mime_type, change_summary, created_by, is_major_version, tags, metadata
    ) VALUES (
        p_document_id, v_version_number, p_title, p_content, p_file_url, p_file_size,
        p_mime_type, p_change_summary, p_created_by, p_is_major_version, p_tags, p_metadata
    ) RETURNING id INTO v_version_id;
    
    -- Update main document's version
    UPDATE documents 
    SET version = v_version_number, updated_at = CURRENT_TIMESTAMP
    WHERE id = p_document_id;
    
    RETURN v_version_id;
END;
$$ LANGUAGE plpgsql;

-- Function to restore document to a specific version
CREATE OR REPLACE FUNCTION restore_document_version(
    p_document_id INTEGER,
    p_target_version INTEGER,
    p_restored_by INTEGER,
    p_change_summary TEXT DEFAULT 'Restored from version'
) RETURNS INTEGER AS $$
DECLARE
    v_version_data RECORD;
    v_new_version_id INTEGER;
BEGIN
    -- Get version data
    SELECT * INTO v_version_data
    FROM document_versions
    WHERE document_id = p_document_id AND version_number = p_target_version;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Version % not found for document %', p_target_version, p_document_id;
    END IF;
    
    -- Create new version with restored content
    SELECT create_document_version(
        p_document_id,
        v_version_data.title,
        v_version_data.content,
        v_version_data.file_url,
        v_version_data.file_size,
        v_version_data.mime_type,
        p_change_summary || ' ' || p_target_version,
        p_restored_by,
        FALSE,
        v_version_data.tags,
        v_version_data.metadata
    ) INTO v_new_version_id;
    
    RETURN v_new_version_id;
END;
$$ LANGUAGE plpgsql;

-- View for document version history with user information
CREATE OR REPLACE VIEW document_version_history AS
SELECT 
    dv.id,
    dv.document_id,
    dv.version_number,
    dv.title,
    dv.change_summary,
    dv.created_at,
    dv.is_major_version,
    dv.file_size,
    dv.mime_type,
    dv.tags,
    u.username as created_by_name,
    u.email as created_by_email,
    d.title as document_title,
    -- Count labels for this version
    (SELECT COUNT(*) FROM document_version_labels dvl 
     WHERE dvl.document_id = dv.document_id AND dvl.version_number = dv.version_number) as label_count,
    -- Count comments for this version
    (SELECT COUNT(*) FROM document_version_comments dvc 
     WHERE dvc.document_id = dv.document_id AND dvc.version_number = dv.version_number) as comment_count
FROM document_versions dv
JOIN users u ON dv.created_by = u.id
JOIN documents d ON dv.document_id = d.id
ORDER BY dv.document_id, dv.version_number DESC;

-- View for document statistics
CREATE OR REPLACE VIEW document_version_stats AS
SELECT 
    d.id as document_id,
    d.title as document_title,
    COUNT(dv.id) as total_versions,
    COUNT(CASE WHEN dv.is_major_version THEN 1 END) as major_versions,
    MIN(dv.created_at) as first_version_date,
    MAX(dv.created_at) as latest_version_date,
    MAX(dv.version_number) as current_version,
    SUM(dv.file_size) as total_size_all_versions,
    COUNT(DISTINCT dv.created_by) as contributors_count
FROM documents d
LEFT JOIN document_versions dv ON d.id = dv.document_id
GROUP BY d.id, d.title;

-- Trigger to automatically create version when document is updated
CREATE OR REPLACE FUNCTION auto_create_document_version()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create version if content actually changed
    IF OLD.content IS DISTINCT FROM NEW.content OR 
       OLD.title IS DISTINCT FROM NEW.title OR
       OLD.file_url IS DISTINCT FROM NEW.file_url THEN
        
        PERFORM create_document_version(
            NEW.id,
            NEW.title,
            NEW.content,
            NEW.file_url,
            NEW.file_size,
            NEW.type::VARCHAR,
            'Auto-generated version',
            NEW.updated_by,
            FALSE,
            NEW.tags::jsonb,
            '{}'::jsonb
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (commented out by default to avoid auto-versioning)
-- Uncomment if you want automatic versioning on document updates
-- CREATE TRIGGER trigger_auto_version_document
--     AFTER UPDATE ON documents
--     FOR EACH ROW
--     EXECUTE FUNCTION auto_create_document_version();

-- Insert sample data for testing
INSERT INTO document_versions (document_id, version_number, title, content, change_summary, created_by, is_major_version, tags)
SELECT 
    d.id,
    1,
    d.title,
    d.content,
    'Initial version',
    d.created_by,
    TRUE,
    d.tags::jsonb
FROM documents d
WHERE NOT EXISTS (
    SELECT 1 FROM document_versions dv WHERE dv.document_id = d.id
);

-- Add version labels for major releases
INSERT INTO document_version_labels (document_id, version_number, label, color, description, created_by)
SELECT 
    dv.document_id,
    dv.version_number,
    'v1.0',
    '#52c41a',
    'Initial release',
    dv.created_by
FROM document_versions dv
WHERE dv.version_number = 1 AND dv.is_major_version = TRUE
ON CONFLICT (document_id, version_number, label) DO NOTHING;

COMMIT;