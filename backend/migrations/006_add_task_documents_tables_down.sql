-- Migration 006 DOWN: Remove task documents tables
-- Created: 2025-01-08
-- Purpose: Rollback task document system

-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_create_document_version ON task_documents;
DROP TRIGGER IF EXISTS trigger_update_task_documents_updated_at ON task_documents;

-- Drop functions
DROP FUNCTION IF EXISTS create_document_version();
DROP FUNCTION IF EXISTS update_task_documents_updated_at();

-- Drop indexes (they will be dropped automatically with tables, but explicit for clarity)
DROP INDEX IF EXISTS idx_document_logs_operation_at;
DROP INDEX IF EXISTS idx_document_logs_operation_by;
DROP INDEX IF EXISTS idx_document_logs_operation;
DROP INDEX IF EXISTS idx_document_logs_document_id;

DROP INDEX IF EXISTS idx_document_versions_version;
DROP INDEX IF EXISTS idx_document_versions_document_id;

DROP INDEX IF EXISTS idx_task_documents_mime_type;
DROP INDEX IF EXISTS idx_task_documents_created_at;
DROP INDEX IF EXISTS idx_task_documents_active;
DROP INDEX IF EXISTS idx_task_documents_upload_type;
DROP INDEX IF EXISTS idx_task_documents_uploaded_by;
DROP INDEX IF EXISTS idx_task_documents_task_id;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS document_logs;
DROP TABLE IF EXISTS document_versions;
DROP TABLE IF EXISTS task_documents;

-- Revoke permissions
REVOKE ALL ON SEQUENCE task_documents_id_seq FROM app_user;
REVOKE ALL ON SEQUENCE document_versions_id_seq FROM app_user;
REVOKE ALL ON SEQUENCE document_logs_id_seq FROM app_user;

REVOKE ALL ON task_documents FROM app_user;
REVOKE ALL ON document_versions FROM app_user;
REVOKE ALL ON document_logs FROM app_user;