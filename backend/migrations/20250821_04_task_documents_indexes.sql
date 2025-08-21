-- 20250821_04_task_documents_indexes.sql
-- 目的：为任务-文档关联表增加热点查询索引，优化 has/list/attach 等路径

BEGIN;

-- task_id 单列索引（按任务获取文档列表、has 查询）
CREATE INDEX IF NOT EXISTS idx_task_documents_task_id ON task_documents(task_id);

-- 组合索引：task_id + relationship_type（按关系类型过滤时更快）
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'task_documents' AND column_name = 'relationship_type'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_task_documents_task_rel ON task_documents(task_id, relationship_type);
    END IF;
END $$;

-- document_id 单列索引（反向查询任务列表）
CREATE INDEX IF NOT EXISTS idx_task_documents_document_id ON task_documents(document_id);

COMMIT;
