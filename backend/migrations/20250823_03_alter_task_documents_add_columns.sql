-- 20250823_03_alter_task_documents_add_columns.sql
-- 为 task_documents 表补充代码用到的字段（若不存在则添加）

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'task_documents' AND column_name = 'relationship_type'
    ) THEN
        ALTER TABLE task_documents 
            ADD COLUMN relationship_type VARCHAR(50) NOT NULL DEFAULT 'attachment';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'task_documents' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE task_documents 
            ADD COLUMN created_by INTEGER;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'task_documents' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE task_documents 
            ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'task_documents' AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE task_documents 
            ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'task_documents' AND column_name = 'sort_order'
    ) THEN
        ALTER TABLE task_documents 
            ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
    END IF;
END$$;

-- 索引（存在即跳过）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE tablename='task_documents' AND indexname='idx_task_documents_task_id'
    ) THEN
        CREATE INDEX idx_task_documents_task_id ON task_documents(task_id);
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'task_documents' AND column_name = 'relationship_type'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes WHERE tablename='task_documents' AND indexname='idx_task_documents_task_rel'
        ) THEN
            CREATE INDEX idx_task_documents_task_rel ON task_documents(task_id, relationship_type);
        END IF;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE tablename='task_documents' AND indexname='idx_task_documents_document_id'
    ) THEN
        CREATE INDEX idx_task_documents_document_id ON task_documents(document_id);
    END IF;
END$$;

COMMIT;
