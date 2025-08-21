-- 20250821_05_documents_indexes.sql
-- 目的：为 documents 增强常用组合与部分索引，优化列表与筛选

BEGIN;

-- 项目维度 + 更新时间（仅活跃文档）
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' AND column_name = 'deleted_at'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_documents_project_updated_active
        ON documents(project_id, updated_at DESC)
        WHERE deleted_at IS NULL;
    ELSE
        -- 回退：无 deleted_at 字段时，创建非部分索引
        CREATE INDEX IF NOT EXISTS idx_documents_project_updated
        ON documents(project_id, updated_at DESC);
    END IF;
END $$;

-- 所有者维度 + 更新时间（仅活跃文档）
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' AND column_name = 'owner_id'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'documents' AND column_name = 'deleted_at'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_documents_owner_updated_active
            ON documents(owner_id, updated_at DESC)
            WHERE deleted_at IS NULL;
        ELSE
            CREATE INDEX IF NOT EXISTS idx_documents_owner_updated
            ON documents(owner_id, updated_at DESC);
        END IF;
    END IF;
END $$;

COMMIT;
