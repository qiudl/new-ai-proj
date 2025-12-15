-- ============================================
-- Rollback: Remove UUID from Core Entities
-- Date: 2025-12-15
-- ============================================

-- 1. Tasks
DROP INDEX IF EXISTS idx_tasks_uuid;
ALTER TABLE tasks DROP COLUMN IF EXISTS uuid;
ALTER TABLE tasks DROP COLUMN IF EXISTS sync_source;
ALTER TABLE tasks DROP COLUMN IF EXISTS sync_remote_id;
ALTER TABLE tasks DROP COLUMN IF EXISTS synced_at;
ALTER TABLE tasks DROP COLUMN IF EXISTS sync_version;

-- 2. Projects
DROP INDEX IF EXISTS idx_projects_uuid;
ALTER TABLE projects DROP COLUMN IF EXISTS uuid;
ALTER TABLE projects DROP COLUMN IF EXISTS sync_source;
ALTER TABLE projects DROP COLUMN IF EXISTS sync_remote_id;
ALTER TABLE projects DROP COLUMN IF EXISTS synced_at;
ALTER TABLE projects DROP COLUMN IF EXISTS sync_version;

-- 3. Enterprises
DROP INDEX IF EXISTS idx_enterprises_uuid;
ALTER TABLE enterprises DROP COLUMN IF EXISTS uuid;
ALTER TABLE enterprises DROP COLUMN IF EXISTS sync_source;
ALTER TABLE enterprises DROP COLUMN IF EXISTS sync_remote_id;
ALTER TABLE enterprises DROP COLUMN IF EXISTS synced_at;
ALTER TABLE enterprises DROP COLUMN IF EXISTS sync_version;

-- 4. Users
DROP INDEX IF EXISTS idx_users_uuid;
ALTER TABLE users DROP COLUMN IF EXISTS uuid;
ALTER TABLE users DROP COLUMN IF EXISTS sync_source;
ALTER TABLE users DROP COLUMN IF EXISTS sync_remote_id;
ALTER TABLE users DROP COLUMN IF EXISTS synced_at;
ALTER TABLE users DROP COLUMN IF EXISTS sync_version;

-- 5. Documents
DROP INDEX IF EXISTS idx_documents_uuid;
ALTER TABLE documents DROP COLUMN IF EXISTS uuid;
ALTER TABLE documents DROP COLUMN IF EXISTS sync_source;
ALTER TABLE documents DROP COLUMN IF EXISTS sync_remote_id;
ALTER TABLE documents DROP COLUMN IF EXISTS synced_at;
ALTER TABLE documents DROP COLUMN IF EXISTS sync_version;

-- 6. Requirements
DROP INDEX IF EXISTS idx_requirements_uuid;
ALTER TABLE requirements DROP COLUMN IF EXISTS uuid;
ALTER TABLE requirements DROP COLUMN IF EXISTS sync_source;
ALTER TABLE requirements DROP COLUMN IF EXISTS sync_remote_id;
ALTER TABLE requirements DROP COLUMN IF EXISTS synced_at;
ALTER TABLE requirements DROP COLUMN IF EXISTS sync_version;
