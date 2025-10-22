-- Rollback migration: Remove work notes performance indexes
-- Created: 2025-10-22

DROP INDEX IF EXISTS idx_documents_owner_work_note_type;
DROP INDEX IF EXISTS idx_documents_is_pinned;
DROP INDEX IF EXISTS idx_documents_is_bookmarked;
DROP INDEX IF EXISTS idx_documents_updated_at_desc;
DROP INDEX IF EXISTS idx_documents_work_note_type;
DROP INDEX IF EXISTS idx_documents_priority;
DROP INDEX IF EXISTS idx_documents_owner_updated_at;
DROP INDEX IF EXISTS idx_documents_visibility;
