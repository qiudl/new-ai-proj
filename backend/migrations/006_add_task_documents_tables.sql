-- Migration 006: Add task documents tables
-- Created: 2025-01-08
-- Purpose: Support manual and API document upload/download for tasks

-- Create task_documents table
CREATE TABLE task_documents (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL UNIQUE,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    upload_type VARCHAR(20) NOT NULL CHECK (upload_type IN ('manual', 'api')),
    uploaded_by INTEGER NOT NULL REFERENCES users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    checksum VARCHAR(64), -- For file integrity verification
    metadata JSONB DEFAULT '{}' -- Additional metadata storage
);

-- Create document_versions table for version control
CREATE TABLE document_versions (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES task_documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    checksum VARCHAR(64),
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    change_notes TEXT,
    metadata JSONB DEFAULT '{}'
);

-- Create document_logs table for operation tracking
CREATE TABLE document_logs (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES task_documents(id) ON DELETE CASCADE,
    operation VARCHAR(50) NOT NULL, -- 'upload', 'download', 'delete', 'restore', 'convert'
    operation_by INTEGER NOT NULL REFERENCES users(id),
    operation_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    operation_details JSONB DEFAULT '{}',
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT
);

-- Create indexes for performance optimization
CREATE INDEX idx_task_documents_task_id ON task_documents(task_id);
CREATE INDEX idx_task_documents_uploaded_by ON task_documents(uploaded_by);
CREATE INDEX idx_task_documents_upload_type ON task_documents(upload_type);
CREATE INDEX idx_task_documents_active ON task_documents(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_task_documents_created_at ON task_documents(uploaded_at);
CREATE INDEX idx_task_documents_mime_type ON task_documents(mime_type);

CREATE INDEX idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX idx_document_versions_version ON document_versions(document_id, version_number);

CREATE INDEX idx_document_logs_document_id ON document_logs(document_id);
CREATE INDEX idx_document_logs_operation ON document_logs(operation);
CREATE INDEX idx_document_logs_operation_by ON document_logs(operation_by);
CREATE INDEX idx_document_logs_operation_at ON document_logs(operation_at);

-- Create trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_task_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_task_documents_updated_at
    BEFORE UPDATE ON task_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_task_documents_updated_at();

-- Create trigger for automatic version creation
CREATE OR REPLACE FUNCTION create_document_version()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert new version record when document is updated (except for soft deletes)
    IF TG_OP = 'UPDATE' AND OLD.file_path != NEW.file_path THEN
        INSERT INTO document_versions (
            document_id, version_number, file_path, file_size, 
            checksum, created_by, change_notes
        ) VALUES (
            NEW.id, NEW.version, NEW.file_path, NEW.file_size,
            NEW.checksum, NEW.uploaded_by, 'Automatic version created'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_document_version
    AFTER UPDATE ON task_documents
    FOR EACH ROW
    EXECUTE FUNCTION create_document_version();

-- Insert initial configuration data
INSERT INTO document_logs (document_id, operation, operation_by, operation_details, success) 
SELECT 0, 'system_init', 1, '{"message": "Document system initialized"}', TRUE
WHERE EXISTS (SELECT 1 FROM users WHERE id = 1);

-- Add comments for documentation
COMMENT ON TABLE task_documents IS 'Stores uploaded documents associated with tasks';
COMMENT ON TABLE document_versions IS 'Tracks version history of task documents';
COMMENT ON TABLE document_logs IS 'Logs all document operations for audit trail';

COMMENT ON COLUMN task_documents.upload_type IS 'manual: uploaded via web interface, api: uploaded via REST API';
COMMENT ON COLUMN task_documents.checksum IS 'SHA-256 hash for file integrity verification';
COMMENT ON COLUMN task_documents.metadata IS 'Additional metadata like conversion settings, tags, etc.';

-- Grant necessary permissions (adjust based on your user roles)
GRANT SELECT, INSERT, UPDATE, DELETE ON task_documents TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON document_versions TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON document_logs TO app_user;

GRANT USAGE, SELECT ON SEQUENCE task_documents_id_seq TO app_user;
GRANT USAGE, SELECT ON SEQUENCE document_versions_id_seq TO app_user;
GRANT USAGE, SELECT ON SEQUENCE document_logs_id_seq TO app_user;