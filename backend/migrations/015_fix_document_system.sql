-- 015_fix_document_system.sql
-- Purpose: Safely create document_folders and add documents.folder_id with FK, idempotently
-- Env: Development/Production-safe (no IF NOT EXISTS on constraints; guarded via metadata checks)

BEGIN;

-- 1) Create document_folders table if not exists (minimal columns required by handlers)
CREATE TABLE IF NOT EXISTS document_folders (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_folder_id INTEGER REFERENCES document_folders(id) ON DELETE CASCADE,
    owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    visibility VARCHAR(50) NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','team','public')),
    color VARCHAR(7),
    icon VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Helpful indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_document_folders_parent_id ON document_folders(parent_folder_id);
CREATE INDEX IF NOT EXISTS idx_document_folders_owner_id ON document_folders(owner_id);
CREATE INDEX IF NOT EXISTS idx_document_folders_visibility ON document_folders(visibility);
CREATE INDEX IF NOT EXISTS idx_document_folders_deleted_at ON document_folders(deleted_at);

-- 2) Add documents.folder_id column if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' AND column_name = 'folder_id'
    ) THEN
        ALTER TABLE documents ADD COLUMN folder_id INTEGER;
    END IF;
END$$;

-- 3) Add FK constraint from documents.folder_id to document_folders(id) if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
        WHERE tc.table_name = 'documents'
          AND tc.constraint_type = 'FOREIGN KEY'
          AND kcu.column_name = 'folder_id'
    ) THEN
        ALTER TABLE documents
            ADD CONSTRAINT documents_folder_id_fkey
            FOREIGN KEY (folder_id) REFERENCES document_folders(id) ON DELETE SET NULL;
    END IF;
END$$;

-- 4) Ensure updated_at exists on documents (for ORDER BY in handlers)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE documents ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END$$;

-- 5) Ensure created_at exists on documents
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE documents ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END$$;

COMMIT;

