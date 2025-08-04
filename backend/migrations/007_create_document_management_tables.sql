-- Migration 007: Create Document Management Tables
-- Task: 307-01 (Database table structure design for task document management)
-- Purpose: Support manual and API upload, md and pdf format download
-- Created: 2025-08-04

-- ======================================================================
-- Table 1: documents - Store basic document information
-- ======================================================================

CREATE TABLE IF NOT EXISTS documents (
    -- Primary key
    id SERIAL PRIMARY KEY,
    
    -- Task relationship
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Document metadata
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_name VARCHAR(255) NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    mime_type VARCHAR(100) NOT NULL,
    file_extension VARCHAR(10) NOT NULL,
    
    -- Storage information
    storage_path TEXT NOT NULL,
    storage_type VARCHAR(50) NOT NULL DEFAULT 'local', -- 'local', 's3', 'azure', etc.
    checksum VARCHAR(64), -- MD5 or SHA256 hash for integrity verification
    
    -- Document properties
    format VARCHAR(20) NOT NULL CHECK (format IN ('markdown', 'pdf', 'txt', 'docx', 'html')),
    content_type VARCHAR(50) NOT NULL DEFAULT 'document', -- 'document', 'image', 'report', etc.
    
    -- Status and visibility
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived', 'deleted')),
    visibility VARCHAR(20) NOT NULL DEFAULT 'team' CHECK (visibility IN ('private', 'team', 'project', 'public')),
    
    -- Version tracking
    current_version INTEGER NOT NULL DEFAULT 1,
    is_latest_version BOOLEAN NOT NULL DEFAULT true,
    
    -- User tracking
    created_by INTEGER NOT NULL REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    
    -- Soft delete support
    deleted_at TIMESTAMP NULL,
    deleted_by INTEGER REFERENCES users(id),
    
    -- Metadata and custom fields
    metadata JSONB DEFAULT '{}', -- Additional metadata like tags, categories, etc.
    custom_fields JSONB DEFAULT '{}', -- Extensible custom fields
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ======================================================================
-- Table 2: document_versions - Manage document versions
-- ======================================================================

CREATE TABLE IF NOT EXISTS document_versions (
    -- Primary key
    id SERIAL PRIMARY KEY,
    
    -- Document relationship
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    
    -- Version information
    version_number INTEGER NOT NULL,
    version_name VARCHAR(100),
    change_description TEXT,
    
    -- File information for this version
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    storage_path TEXT NOT NULL,
    checksum VARCHAR(64),
    
    -- Content snapshot
    content_preview TEXT, -- First 500 chars for quick preview
    
    -- Version properties
    is_major_version BOOLEAN NOT NULL DEFAULT false,
    is_current_version BOOLEAN NOT NULL DEFAULT false,
    
    -- User tracking
    created_by INTEGER NOT NULL REFERENCES users(id),
    
    -- Soft delete support
    deleted_at TIMESTAMP NULL,
    deleted_by INTEGER REFERENCES users(id),
    
    -- Version metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ======================================================================
-- Table 3: document_operations - Record operation logs
-- ======================================================================

CREATE TABLE IF NOT EXISTS document_operations (
    -- Primary key
    id SERIAL PRIMARY KEY,
    
    -- Document relationship
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    document_version_id INTEGER REFERENCES document_versions(id) ON DELETE SET NULL,
    
    -- Operation details
    operation_type VARCHAR(50) NOT NULL CHECK (operation_type IN (
        'create', 'upload', 'update', 'delete', 'restore', 
        'download', 'preview', 'share', 'convert', 'move', 'copy'
    )),
    operation_method VARCHAR(20) NOT NULL CHECK (operation_method IN ('manual', 'api', 'system', 'batch')),
    
    -- Operation metadata
    operation_details JSONB DEFAULT '{}', -- Additional operation-specific data
    source_ip INET,
    user_agent TEXT,
    
    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'success' CHECK (status IN ('pending', 'success', 'failed', 'cancelled')),
    error_message TEXT,
    
    -- User tracking
    performed_by INTEGER NOT NULL REFERENCES users(id),
    
    -- File changes (for tracking what changed)
    old_values JSONB DEFAULT '{}',
    new_values JSONB DEFAULT '{}',
    
    -- Performance metrics
    processing_time_ms INTEGER,
    file_size_before BIGINT,
    file_size_after BIGINT,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ======================================================================
-- Indexes for Performance Optimization
-- ======================================================================

-- Documents table indexes
CREATE INDEX IF NOT EXISTS idx_documents_task_id ON documents(task_id);
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents(created_by);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_format ON documents(format);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at);
CREATE INDEX IF NOT EXISTS idx_documents_deleted_at ON documents(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_latest ON documents(is_latest_version) WHERE is_latest_version = true;

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_documents_task_status ON documents(task_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_project_format ON documents(project_id, format) WHERE deleted_at IS NULL;

-- Document versions table indexes
CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_version_number ON document_versions(document_id, version_number);
CREATE INDEX IF NOT EXISTS idx_document_versions_current ON document_versions(document_id, is_current_version) WHERE is_current_version = true;
CREATE INDEX IF NOT EXISTS idx_document_versions_created_by ON document_versions(created_by);
CREATE INDEX IF NOT EXISTS idx_document_versions_created_at ON document_versions(created_at);
CREATE INDEX IF NOT EXISTS idx_document_versions_deleted_at ON document_versions(deleted_at) WHERE deleted_at IS NULL;

-- Document operations table indexes
CREATE INDEX IF NOT EXISTS idx_document_operations_document_id ON document_operations(document_id);
CREATE INDEX IF NOT EXISTS idx_document_operations_type ON document_operations(operation_type);
CREATE INDEX IF NOT EXISTS idx_document_operations_method ON document_operations(operation_method);
CREATE INDEX IF NOT EXISTS idx_document_operations_performed_by ON document_operations(performed_by);
CREATE INDEX IF NOT EXISTS idx_document_operations_created_at ON document_operations(created_at);
CREATE INDEX IF NOT EXISTS idx_document_operations_status ON document_operations(status);

-- Composite indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_document_operations_doc_type ON document_operations(document_id, operation_type);
CREATE INDEX IF NOT EXISTS idx_document_operations_user_date ON document_operations(performed_by, created_at);

-- ======================================================================
-- Constraints and Rules
-- ======================================================================

-- Ensure unique latest version per document
CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_unique_latest 
ON documents(task_id) 
WHERE is_latest_version = true AND deleted_at IS NULL;

-- Ensure unique current version per document
CREATE UNIQUE INDEX IF NOT EXISTS idx_document_versions_unique_current 
ON document_versions(document_id) 
WHERE is_current_version = true AND deleted_at IS NULL;

-- Ensure version numbers are sequential per document
CREATE UNIQUE INDEX IF NOT EXISTS idx_document_versions_unique_version 
ON document_versions(document_id, version_number) 
WHERE deleted_at IS NULL;

-- ======================================================================
-- Triggers for Automatic Updates
-- ======================================================================

-- Trigger to update updated_at timestamp on documents table
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_documents_updated_at();

-- Trigger to ensure only one current version per document
CREATE OR REPLACE FUNCTION ensure_single_current_version()
RETURNS TRIGGER AS $$
BEGIN
    -- If this version is being set as current, unset all others for the same document
    IF NEW.is_current_version = true THEN
        UPDATE document_versions 
        SET is_current_version = false 
        WHERE document_id = NEW.document_id 
        AND id != NEW.id 
        AND is_current_version = true;
        
        -- Update the current_version in the documents table
        UPDATE documents 
        SET current_version = NEW.version_number,
            updated_at = NOW()
        WHERE id = NEW.document_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_current_version
    AFTER INSERT OR UPDATE ON document_versions
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_current_version();

-- ======================================================================
-- Views for Common Queries
-- ======================================================================

-- View for active documents with latest version information
CREATE OR REPLACE VIEW active_documents_with_versions AS
SELECT 
    d.id,
    d.task_id,
    d.project_id,
    d.title,
    d.description,
    d.file_name,
    d.original_file_name,
    d.file_size,
    d.mime_type,
    d.file_extension,
    d.format,
    d.content_type,
    d.status,
    d.visibility,
    d.current_version,
    d.created_by,
    d.updated_by,
    d.metadata,
    d.custom_fields,
    d.created_at,
    d.updated_at,
    -- Latest version info
    dv.id as version_id,
    dv.version_name,
    dv.change_description,
    dv.content_preview,
    dv.is_major_version,
    -- Creator info
    u1.username as created_by_username,
    u2.username as updated_by_username,
    -- Project and task info
    p.name as project_name,
    t.title as task_title,
    t.status as task_status
FROM documents d
LEFT JOIN document_versions dv ON d.id = dv.document_id AND dv.is_current_version = true
LEFT JOIN users u1 ON d.created_by = u1.id
LEFT JOIN users u2 ON d.updated_by = u2.id
LEFT JOIN projects p ON d.project_id = p.id
LEFT JOIN tasks t ON d.task_id = t.id
WHERE d.deleted_at IS NULL
AND d.status != 'deleted';

-- View for document operation statistics
CREATE OR REPLACE VIEW document_operation_stats AS
SELECT 
    d.id as document_id,
    d.title as document_title,
    d.task_id,
    d.project_id,
    COUNT(do.id) as total_operations,
    COUNT(CASE WHEN do.operation_type = 'download' THEN 1 END) as download_count,
    COUNT(CASE WHEN do.operation_type = 'preview' THEN 1 END) as preview_count,
    COUNT(CASE WHEN do.operation_type = 'update' THEN 1 END) as update_count,
    COUNT(DISTINCT do.performed_by) as unique_users,
    MAX(do.created_at) as last_operation_at,
    AVG(do.processing_time_ms) as avg_processing_time_ms
FROM documents d
LEFT JOIN document_operations do ON d.id = do.document_id
WHERE d.deleted_at IS NULL
GROUP BY d.id, d.title, d.task_id, d.project_id;

-- ======================================================================
-- Data Integrity Functions
-- ======================================================================

-- Function to get document with version info
CREATE OR REPLACE FUNCTION get_document_with_version(doc_id INTEGER)
RETURNS TABLE (
    document_id INTEGER,
    title VARCHAR(255),
    current_version INTEGER,
    version_count BIGINT,
    total_size BIGINT,
    last_modified TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.title,
        d.current_version,
        COUNT(dv.id) as version_count,
        SUM(dv.file_size) as total_size,
        MAX(dv.created_at) as last_modified
    FROM documents d
    LEFT JOIN document_versions dv ON d.id = dv.document_id AND dv.deleted_at IS NULL
    WHERE d.id = doc_id AND d.deleted_at IS NULL
    GROUP BY d.id, d.title, d.current_version;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old versions (keep last N versions)
CREATE OR REPLACE FUNCTION cleanup_old_document_versions(doc_id INTEGER, keep_versions INTEGER DEFAULT 10)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Soft delete old versions, keeping the specified number of latest versions
    UPDATE document_versions 
    SET deleted_at = NOW(),
        deleted_by = 1 -- System user
    WHERE document_id = doc_id
    AND deleted_at IS NULL
    AND is_current_version = false
    AND id NOT IN (
        SELECT id 
        FROM document_versions 
        WHERE document_id = doc_id 
        AND deleted_at IS NULL
        ORDER BY version_number DESC 
        LIMIT keep_versions
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup operation
    INSERT INTO document_operations (
        document_id, 
        operation_type, 
        operation_method,
        operation_details,
        performed_by,
        status
    ) VALUES (
        doc_id,
        'cleanup',
        'system',
        jsonb_build_object('deleted_versions', deleted_count, 'keep_versions', keep_versions),
        1, -- System user
        'success'
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ======================================================================
-- Sample Data for Testing (commented out for production)
-- ======================================================================

/*
-- Insert sample data for testing
INSERT INTO documents (task_id, project_id, title, description, file_name, original_file_name, file_size, mime_type, file_extension, storage_path, format, created_by) VALUES
(1, 1, 'Project Requirements', 'Initial project requirements document', 'req_001.md', 'requirements.md', 2048, 'text/markdown', 'md', '/documents/req_001.md', 'markdown', 1),
(2, 1, 'Technical Specification', 'Technical specification for the project', 'spec_001.pdf', 'tech_spec.pdf', 5120, 'application/pdf', 'pdf', '/documents/spec_001.pdf', 'pdf', 1);

-- Insert sample versions
INSERT INTO document_versions (document_id, version_number, version_name, change_description, file_name, file_size, storage_path, checksum, is_current_version, created_by) VALUES
(1, 1, 'Initial Version', 'First version of requirements', 'req_001_v1.md', 2048, '/documents/versions/req_001_v1.md', 'abc123', true, 1),
(2, 1, 'Initial Version', 'First version of technical spec', 'spec_001_v1.pdf', 5120, '/documents/versions/spec_001_v1.pdf', 'def456', true, 1);

-- Insert sample operations
INSERT INTO document_operations (document_id, operation_type, operation_method, operation_details, performed_by, status) VALUES
(1, 'create', 'manual', '{"upload_method": "drag_drop"}', 1, 'success'),
(1, 'download', 'manual', '{"format": "markdown"}', 1, 'success'),
(2, 'create', 'api', '{"api_endpoint": "/api/documents/upload"}', 1, 'success');
*/

-- ======================================================================
-- Migration Complete
-- ======================================================================

COMMENT ON TABLE documents IS 'Stores basic document information for task document management';
COMMENT ON TABLE document_versions IS 'Manages document versions and revision history';
COMMENT ON TABLE document_operations IS 'Records all document operations for audit and analytics';

-- End of Migration 007