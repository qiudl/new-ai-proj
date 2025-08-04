-- Migration: 008_create_task_documents_tables.sql
-- Description: Create task document management tables for file upload/download functionality
-- Related Task: 307-04 - Database Migration Implementation
-- Dependencies: Requires existing users, projects, and tasks tables
-- Date: 2025-08-04
-- Author: Claude Code Assistant

-- =============================================================================
-- MIGRATION UP: Create task document management tables
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Create ENUM types for document management
-- -----------------------------------------------------------------------------

-- Document type enumeration
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_type') THEN
        CREATE TYPE document_type AS ENUM (
            'markdown',
            'pdf', 
            'text',
            'docx',
            'html',
            'image',
            'other'
        );
    END IF;
END$$;

-- Document status enumeration
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_status') THEN
        CREATE TYPE document_status AS ENUM (
            'draft',
            'published',
            'archived',
            'deleted'
        );
    END IF;
END$$;

-- Document visibility enumeration
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_visibility') THEN
        CREATE TYPE document_visibility AS ENUM (
            'private',
            'team',
            'public'
        );
    END IF;
END$$;

-- Document operation type enumeration
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_operation_type') THEN
        CREATE TYPE document_operation_type AS ENUM (
            'create',
            'update',
            'delete',
            'restore',
            'download',
            'share',
            'version_create'
        );
    END IF;
END$$;

-- -----------------------------------------------------------------------------
-- 2. Create main documents table
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS documents (
    id BIGSERIAL PRIMARY KEY,
    
    -- Basic document information
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    
    -- Document metadata
    file_type document_type NOT NULL DEFAULT 'markdown',
    mime_type VARCHAR(100),
    file_size BIGINT NOT NULL DEFAULT 0,
    encoding VARCHAR(20) DEFAULT 'utf-8',
    checksum VARCHAR(64) NOT NULL, -- SHA-256 hash
    
    -- Document relationships
    project_id BIGINT NOT NULL,
    task_id BIGINT NOT NULL,
    folder_id BIGINT, -- For organization
    
    -- Version control
    current_version INTEGER NOT NULL DEFAULT 1,
    total_versions INTEGER NOT NULL DEFAULT 1,
    
    -- Document settings
    status document_status NOT NULL DEFAULT 'draft',
    visibility document_visibility NOT NULL DEFAULT 'team',
    
    -- Storage information
    storage_path TEXT NOT NULL,
    storage_backend VARCHAR(50) DEFAULT 'local',
    
    -- User tracking
    uploaded_by BIGINT NOT NULL,
    updated_by BIGINT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Additional metadata as JSON
    metadata JSONB DEFAULT '{}',
    tags TEXT[],
    
    -- Constraints
    CONSTRAINT documents_project_id_fk FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT documents_task_id_fk FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT documents_uploaded_by_fk FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT documents_updated_by_fk FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT documents_file_size_positive CHECK (file_size >= 0),
    CONSTRAINT documents_version_positive CHECK (current_version > 0 AND total_versions > 0),
    CONSTRAINT documents_version_consistency CHECK (current_version <= total_versions),
    CONSTRAINT documents_checksum_format CHECK (LENGTH(checksum) = 64 AND checksum ~ '^[a-f0-9]+$')
);

-- Comments for documentation
COMMENT ON TABLE documents IS 'Main table storing document metadata and information';
COMMENT ON COLUMN documents.id IS 'Primary key for document identification';
COMMENT ON COLUMN documents.title IS 'Display title of the document';
COMMENT ON COLUMN documents.file_name IS 'Actual file name in storage';
COMMENT ON COLUMN documents.original_name IS 'Original uploaded file name';
COMMENT ON COLUMN documents.checksum IS 'SHA-256 hash for file integrity verification';
COMMENT ON COLUMN documents.metadata IS 'Additional document metadata as JSON';
COMMENT ON COLUMN documents.tags IS 'Array of tags for document categorization';

-- -----------------------------------------------------------------------------
-- 3. Create document versions table
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS document_versions (
    id BIGSERIAL PRIMARY KEY,
    
    -- Version identification
    document_id BIGINT NOT NULL,
    version_number INTEGER NOT NULL,
    
    -- Version metadata
    title VARCHAR(255) NOT NULL,
    description TEXT,
    changes_summary TEXT,
    
    -- File information for this version
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    checksum VARCHAR(64) NOT NULL,
    storage_path TEXT NOT NULL,
    
    -- Version relationships
    parent_version INTEGER, -- For branching (future feature)
    
    -- User tracking
    created_by BIGINT NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Additional version metadata
    metadata JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT document_versions_document_id_fk FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    CONSTRAINT document_versions_created_by_fk FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT document_versions_version_positive CHECK (version_number > 0),
    CONSTRAINT document_versions_file_size_positive CHECK (file_size >= 0),
    CONSTRAINT document_versions_checksum_format CHECK (LENGTH(checksum) = 64 AND checksum ~ '^[a-f0-9]+$'),
    CONSTRAINT document_versions_unique UNIQUE (document_id, version_number)
);

-- Comments for documentation
COMMENT ON TABLE document_versions IS 'Document version history and management';
COMMENT ON COLUMN document_versions.version_number IS 'Version number, starting from 1';
COMMENT ON COLUMN document_versions.changes_summary IS 'Summary of changes in this version';
COMMENT ON COLUMN document_versions.parent_version IS 'Parent version for branching (future feature)';

-- -----------------------------------------------------------------------------
-- 4. Create document operations log table
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS document_operations (
    id BIGSERIAL PRIMARY KEY,
    
    -- Operation identification
    document_id BIGINT NOT NULL,
    operation_type document_operation_type NOT NULL,
    
    -- Operation details
    description TEXT,
    details JSONB DEFAULT '{}',
    
    -- User and context information
    user_id BIGINT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    
    -- Result information
    success BOOLEAN NOT NULL DEFAULT TRUE,
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT document_operations_document_id_fk FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    CONSTRAINT document_operations_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- Comments for documentation
COMMENT ON TABLE document_operations IS 'Audit log for all document operations';
COMMENT ON COLUMN document_operations.operation_type IS 'Type of operation performed';
COMMENT ON COLUMN document_operations.details IS 'Additional operation details as JSON';
COMMENT ON COLUMN document_operations.success IS 'Whether the operation was successful';

-- -----------------------------------------------------------------------------
-- 5. Create performance indexes
-- -----------------------------------------------------------------------------

-- Documents table indexes
CREATE INDEX IF NOT EXISTS idx_documents_project_task ON documents(project_id, task_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status) WHERE status != 'deleted';
CREATE INDEX IF NOT EXISTS idx_documents_visibility ON documents(visibility);
CREATE INDEX IF NOT EXISTS idx_documents_file_type ON documents(file_type);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at);
CREATE INDEX IF NOT EXISTS idx_documents_deleted_at ON documents(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_checksum ON documents(checksum);
CREATE INDEX IF NOT EXISTS idx_documents_metadata ON documents USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_documents_tags ON documents USING GIN(tags);

-- Document versions table indexes
CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_created_by ON document_versions(created_by);
CREATE INDEX IF NOT EXISTS idx_document_versions_created_at ON document_versions(created_at);
CREATE INDEX IF NOT EXISTS idx_document_versions_version_number ON document_versions(document_id, version_number);

-- Document operations table indexes
CREATE INDEX IF NOT EXISTS idx_document_operations_document_id ON document_operations(document_id);
CREATE INDEX IF NOT EXISTS idx_document_operations_user_id ON document_operations(user_id);
CREATE INDEX IF NOT EXISTS idx_document_operations_operation_type ON document_operations(operation_type);
CREATE INDEX IF NOT EXISTS idx_document_operations_created_at ON document_operations(created_at);
CREATE INDEX IF NOT EXISTS idx_document_operations_success ON document_operations(success);

-- -----------------------------------------------------------------------------
-- 6. Create triggers for automatic updates
-- -----------------------------------------------------------------------------

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_document_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    
    -- Update published_at when status changes to published
    IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN
        NEW.published_at = CURRENT_TIMESTAMP;
    END IF;
    
    -- Set deleted_at when status changes to deleted
    IF NEW.status = 'deleted' AND (OLD.status IS NULL OR OLD.status != 'deleted') THEN
        NEW.deleted_at = CURRENT_TIMESTAMP;
    ELSIF NEW.status != 'deleted' AND OLD.status = 'deleted' THEN
        NEW.deleted_at = NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp trigger to documents table
DROP TRIGGER IF EXISTS trigger_documents_update_timestamp ON documents;
CREATE TRIGGER trigger_documents_update_timestamp
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_document_timestamp();

-- Function to manage document versions
CREATE OR REPLACE FUNCTION manage_document_versions()
RETURNS TRIGGER AS $$
BEGIN
    -- When a new document is created, create the first version
    IF TG_OP = 'INSERT' THEN
        INSERT INTO document_versions (
            document_id, version_number, title, description,
            file_name, file_size, checksum, storage_path,
            created_by, metadata
        ) VALUES (
            NEW.id, 1, NEW.title, NEW.description,
            NEW.file_name, NEW.file_size, NEW.checksum, NEW.storage_path,
            NEW.uploaded_by, NEW.metadata
        );
        RETURN NEW;
    END IF;
    
    -- When document content is updated, create a new version
    IF TG_OP = 'UPDATE' AND (
        OLD.checksum != NEW.checksum OR 
        OLD.file_size != NEW.file_size OR
        OLD.file_name != NEW.file_name
    ) THEN
        -- Update version counts
        NEW.total_versions = OLD.total_versions + 1;
        NEW.current_version = NEW.total_versions;
        
        -- Create new version record
        INSERT INTO document_versions (
            document_id, version_number, title, description,
            file_name, file_size, checksum, storage_path,
            created_by, metadata
        ) VALUES (
            NEW.id, NEW.current_version, NEW.title, NEW.description,
            NEW.file_name, NEW.file_size, NEW.checksum, NEW.storage_path,
            NEW.updated_by, NEW.metadata
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply version management trigger to documents table
DROP TRIGGER IF EXISTS trigger_documents_version_management ON documents;
CREATE TRIGGER trigger_documents_version_management
    AFTER INSERT OR UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION manage_document_versions();

-- Function to log document operations
CREATE OR REPLACE FUNCTION log_document_operation()
RETURNS TRIGGER AS $$
DECLARE
    op_type document_operation_type;
    op_description TEXT;
BEGIN
    -- Determine operation type
    IF TG_OP = 'INSERT' THEN
        op_type = 'create';
        op_description = 'Document created: ' || NEW.title;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status != 'deleted' AND NEW.status = 'deleted' THEN
            op_type = 'delete';
            op_description = 'Document deleted: ' || NEW.title;
        ELSIF OLD.status = 'deleted' AND NEW.status != 'deleted' THEN
            op_type = 'restore';
            op_description = 'Document restored: ' || NEW.title;
        ELSE
            op_type = 'update';
            op_description = 'Document updated: ' || NEW.title;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        op_type = 'delete';
        op_description = 'Document permanently deleted: ' || OLD.title;
    END IF;
    
    -- Log the operation
    INSERT INTO document_operations (
        document_id, operation_type, description,
        user_id, success, details
    ) VALUES (
        COALESCE(NEW.id, OLD.id),
        op_type,
        op_description,
        COALESCE(NEW.updated_by, NEW.uploaded_by, OLD.uploaded_by),
        TRUE,
        jsonb_build_object(
            'operation', TG_OP,
            'table', TG_TABLE_NAME,
            'timestamp', CURRENT_TIMESTAMP
        )
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply operation logging trigger to documents table
DROP TRIGGER IF EXISTS trigger_documents_operation_log ON documents;
CREATE TRIGGER trigger_documents_operation_log
    AFTER INSERT OR UPDATE OR DELETE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION log_document_operation();

-- -----------------------------------------------------------------------------
-- 7. Create useful views for common queries
-- -----------------------------------------------------------------------------

-- View for active documents with latest version info
CREATE OR REPLACE VIEW active_documents AS
SELECT 
    d.id,
    d.title,
    d.description,
    d.file_name,
    d.file_type,
    d.file_size,
    d.project_id,
    d.task_id,
    d.current_version,
    d.total_versions,
    d.status,
    d.visibility,
    d.uploaded_by,
    u.username as uploaded_by_name,
    d.created_at,
    d.updated_at,
    d.tags,
    -- Latest version info
    v.changes_summary as latest_changes,
    v.created_at as latest_version_date
FROM documents d
LEFT JOIN users u ON d.uploaded_by = u.id
LEFT JOIN document_versions v ON d.id = v.document_id AND d.current_version = v.version_number
WHERE d.deleted_at IS NULL
ORDER BY d.updated_at DESC;

-- View for document statistics by project
CREATE OR REPLACE VIEW document_stats_by_project AS
SELECT 
    p.id as project_id,
    p.name as project_name,
    COUNT(d.id) as total_documents,
    COUNT(CASE WHEN d.status = 'published' THEN 1 END) as published_documents,
    COUNT(CASE WHEN d.status = 'draft' THEN 1 END) as draft_documents,
    SUM(d.file_size) as total_size,
    AVG(d.total_versions) as avg_versions_per_document,
    MAX(d.updated_at) as last_document_update
FROM projects p
LEFT JOIN documents d ON p.id = d.project_id AND d.deleted_at IS NULL
GROUP BY p.id, p.name
ORDER BY total_documents DESC;

-- View for recent document activities
CREATE OR REPLACE VIEW recent_document_activities AS
SELECT 
    do.id,
    do.operation_type,
    do.description,
    d.title as document_title,
    d.file_type,
    p.name as project_name,
    t.title as task_title,
    u.username,
    do.created_at,
    do.success
FROM document_operations do
LEFT JOIN documents d ON do.document_id = d.id
LEFT JOIN users u ON do.user_id = u.id
LEFT JOIN projects p ON d.project_id = p.id
LEFT JOIN tasks t ON d.task_id = t.id
ORDER BY do.created_at DESC
LIMIT 100;

-- -----------------------------------------------------------------------------
-- 8. Create helper functions
-- -----------------------------------------------------------------------------

-- Function to get document version history
CREATE OR REPLACE FUNCTION get_document_versions(doc_id BIGINT)
RETURNS TABLE(
    version_number INTEGER,
    title VARCHAR(255),
    changes_summary TEXT,
    file_size BIGINT,
    created_by_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.version_number,
        v.title,
        v.changes_summary,
        v.file_size,
        u.username,
        v.created_at
    FROM document_versions v
    LEFT JOIN users u ON v.created_by = u.id
    WHERE v.document_id = doc_id
    ORDER BY v.version_number DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate storage usage by project
CREATE OR REPLACE FUNCTION get_project_storage_usage(proj_id BIGINT)
RETURNS TABLE(
    total_documents BIGINT,
    total_size BIGINT,
    avg_document_size NUMERIC,
    largest_document_size BIGINT,
    storage_by_type JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(d.id) as total_documents,
        COALESCE(SUM(d.file_size), 0) as total_size,
        COALESCE(AVG(d.file_size), 0) as avg_document_size,
        COALESCE(MAX(d.file_size), 0) as largest_document_size,
        COALESCE(
            jsonb_object_agg(
                d.file_type, 
                jsonb_build_object(
                    'count', COUNT(*),
                    'total_size', SUM(d.file_size)
                )
            ), 
            '{}'::jsonb
        ) as storage_by_type
    FROM documents d
    WHERE d.project_id = proj_id AND d.deleted_at IS NULL
    GROUP BY d.project_id;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 9. Set appropriate permissions
-- -----------------------------------------------------------------------------

-- Grant permissions to application user (assuming 'app_user' role exists)
DO $$
BEGIN
    -- Check if app_user role exists, create if not
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
        CREATE ROLE app_user;
    END IF;
END$$;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON documents TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON document_versions TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON document_operations TO app_user;

-- Grant sequence permissions
GRANT USAGE, SELECT ON SEQUENCE documents_id_seq TO app_user;
GRANT USAGE, SELECT ON SEQUENCE document_versions_id_seq TO app_user;
GRANT USAGE, SELECT ON SEQUENCE document_operations_id_seq TO app_user;

-- Grant view permissions
GRANT SELECT ON active_documents TO app_user;
GRANT SELECT ON document_stats_by_project TO app_user;
GRANT SELECT ON recent_document_activities TO app_user;

-- Grant function execution permissions
GRANT EXECUTE ON FUNCTION get_document_versions(BIGINT) TO app_user;
GRANT EXECUTE ON FUNCTION get_project_storage_usage(BIGINT) TO app_user;

-- -----------------------------------------------------------------------------
-- 10. Add migration metadata
-- -----------------------------------------------------------------------------

-- Create or update migration tracking
INSERT INTO schema_migrations (version, applied_at) 
VALUES ('008_create_task_documents_tables', CURRENT_TIMESTAMP)
ON CONFLICT (version) DO UPDATE SET applied_at = CURRENT_TIMESTAMP;

COMMIT;

-- =============================================================================
-- Migration completed successfully
-- =============================================================================

-- Post-migration verification queries (for testing)
-- SELECT 'Documents table created' as status WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents');
-- SELECT 'Document versions table created' as status WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'document_versions');  
-- SELECT 'Document operations table created' as status WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'document_operations');
-- SELECT 'Active documents view created' as status WHERE EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'active_documents');

-- Performance check queries (for monitoring)
-- SELECT COUNT(*) as total_documents FROM documents;
-- SELECT COUNT(*) as total_versions FROM document_versions;
-- SELECT COUNT(*) as total_operations FROM document_operations;