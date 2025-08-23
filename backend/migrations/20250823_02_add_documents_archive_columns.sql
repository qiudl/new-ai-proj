-- 20250823_02_add_documents_archive_columns.sql
-- 为 documents 表添加归档相关字段

BEGIN;

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS archived_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unarchived_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS unarchived_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- 辅助索引
CREATE INDEX IF NOT EXISTS idx_documents_archived ON documents(archived);
CREATE INDEX IF NOT EXISTS idx_documents_archived_at ON documents(archived_at);

COMMIT;
