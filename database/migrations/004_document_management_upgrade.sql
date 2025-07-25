-- ====================================================================
-- 文档管理系统升级脚本
-- 版本：004_document_management_upgrade.sql
-- 日期：2025-07-24
-- 描述：升级现有documents表以支持新的文档管理功能
-- ====================================================================

-- ====================
-- 升级documents表
-- ====================

-- 添加缺失的字段
ALTER TABLE documents ADD COLUMN IF NOT EXISTS folder_id INTEGER REFERENCES document_folders(id) ON DELETE SET NULL;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS parent_document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_template BOOLEAN NOT NULL DEFAULT FALSE;

-- 更新类型约束
ALTER TABLE documents DROP CONSTRAINT IF EXISTS check_document_type;
ALTER TABLE documents ADD CONSTRAINT check_document_type CHECK (
    type IN ('markdown', 'image', 'pdf', 'doc', 'docx', 'xlsx', 'pptx', 'txt', 'html')
);

-- 更新状态约束
ALTER TABLE documents DROP CONSTRAINT IF EXISTS check_document_status;
ALTER TABLE documents ADD CONSTRAINT check_document_status CHECK (
    status IN ('draft', 'published', 'archived', 'template')
);

-- 添加新的索引
CREATE INDEX IF NOT EXISTS idx_documents_folder_id ON documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_documents_is_template ON documents(is_template);
CREATE INDEX IF NOT EXISTS idx_documents_parent_document_id ON documents(parent_document_id);

-- 删除旧的约束（如果存在）
ALTER TABLE documents DROP CONSTRAINT IF EXISTS check_single_association;

-- ====================
-- 更新现有数据
-- ====================

-- 将现有项目关联文档移到"项目文档"文件夹
UPDATE documents 
SET folder_id = (SELECT id FROM document_folders WHERE name = '项目文档' LIMIT 1)
WHERE project_id IS NOT NULL AND folder_id IS NULL;

-- 将现有客户关联文档移到"客户资料"文件夹  
UPDATE documents 
SET folder_id = (SELECT id FROM document_folders WHERE name = '客户资料' LIMIT 1)
WHERE customer_id IS NOT NULL AND folder_id IS NULL;

-- 将其他文档移到根目录（folder_id = NULL）

-- ====================
-- 创建数据迁移函数
-- ====================

-- 从旧的直接关联迁移到新的关联表
CREATE OR REPLACE FUNCTION migrate_document_relations() 
RETURNS void AS $$
DECLARE
    doc_record RECORD;
BEGIN
    -- 迁移项目关联
    FOR doc_record IN 
        SELECT id, project_id FROM documents WHERE project_id IS NOT NULL
    LOOP
        INSERT INTO document_project_relations (document_id, project_id, relation_type, created_by)
        VALUES (doc_record.id, doc_record.project_id, 'related', 1)
        ON CONFLICT (document_id, project_id, relation_type) DO NOTHING;
    END LOOP;
    
    -- 迁移客户关联
    FOR doc_record IN 
        SELECT id, customer_id FROM documents WHERE customer_id IS NOT NULL
    LOOP
        INSERT INTO document_customer_relations (document_id, customer_id, relation_type, created_by)
        VALUES (doc_record.id, doc_record.customer_id, 'related', 1)
        ON CONFLICT (document_id, customer_id, relation_type) DO NOTHING;
    END LOOP;
    
    RAISE NOTICE 'Document relations migrated successfully';
END;
$$ LANGUAGE plpgsql;

-- 执行数据迁移
SELECT migrate_document_relations();

-- 删除迁移函数
DROP FUNCTION migrate_document_relations();

-- ====================
-- 更新视图
-- ====================

-- 删除旧视图（如果存在）
DROP VIEW IF EXISTS document_details;
DROP VIEW IF EXISTS folder_stats;

-- 重新创建文档详情视图
CREATE VIEW document_details AS
SELECT 
    d.id,
    d.title,
    d.content,
    d.type,
    d.status,
    d.file_url,
    d.file_size,
    d.mime_type,
    d.description,
    d.tags,
    d.metadata,
    d.visibility,
    d.version,
    d.is_template,
    d.created_at,
    d.updated_at,
    d.deleted_at,
    
    -- 所有者信息
    u1.username as owner_name,
    u1.email as owner_email,
    
    -- 创建者信息
    u2.username as creator_name,
    
    -- 文件夹信息
    f.name as folder_name,
    f.color as folder_color,
    
    -- 统计信息
    (SELECT COUNT(*) FROM document_project_relations WHERE document_id = d.id) as project_relations_count,
    (SELECT COUNT(*) FROM document_task_relations WHERE document_id = d.id) as task_relations_count,
    (SELECT COUNT(*) FROM document_collaborators WHERE document_id = d.id) as collaborators_count
    
FROM documents d
LEFT JOIN users u1 ON d.owner_id = u1.id
LEFT JOIN users u2 ON d.created_by = u2.id
LEFT JOIN document_folders f ON d.folder_id = f.id
WHERE d.deleted_at IS NULL;

-- 重新创建文件夹统计视图
CREATE VIEW folder_stats AS
SELECT 
    f.id,
    f.name,
    f.description,
    f.color,
    f.icon,
    f.visibility,
    f.created_at,
    f.updated_at,
    
    -- 所有者信息
    u.username as owner_name,
    
    -- 统计信息
    (SELECT COUNT(*) FROM documents WHERE folder_id = f.id AND deleted_at IS NULL) as documents_count,
    (SELECT COUNT(*) FROM document_folders WHERE parent_folder_id = f.id AND deleted_at IS NULL) as subfolders_count,
    
    -- 最近更新的文档
    (SELECT MAX(updated_at) FROM documents WHERE folder_id = f.id AND deleted_at IS NULL) as last_document_updated
    
FROM document_folders f
LEFT JOIN users u ON f.owner_id = u.id
WHERE f.deleted_at IS NULL;

-- ====================
-- 添加示例数据到升级后的结构
-- ====================

-- 更新现有示例文档到新的文件夹结构
UPDATE documents 
SET 
    folder_id = CASE 
        WHEN title LIKE '%模板%' THEN (SELECT id FROM document_folders WHERE name = '模板库' LIMIT 1)
        WHEN title LIKE '%API%' OR title LIKE '%技术%' OR title LIKE '%开发%' THEN (SELECT id FROM document_folders WHERE name = '技术文档' LIMIT 1)
        WHEN title LIKE '%合同%' THEN (SELECT id FROM document_folders WHERE name = '客户资料' LIMIT 1)
        WHEN title LIKE '%项目%' OR title LIKE '%移动端%' THEN (SELECT id FROM document_folders WHERE name = '项目文档' LIMIT 1)
        ELSE NULL
    END,
    is_template = CASE WHEN title LIKE '%模板%' THEN TRUE ELSE FALSE END,
    metadata = jsonb_build_object(
        'keywords', CASE 
            WHEN title LIKE '%API%' THEN '["API", "接口", "技术"]'::jsonb
            WHEN title LIKE '%移动端%' THEN '["移动端", "开发", "指南"]'::jsonb
            WHEN title LIKE '%数据库%' THEN '["数据库", "设计", "架构"]'::jsonb
            ELSE '[]'::jsonb
        END,
        'difficulty', CASE 
            WHEN title LIKE '%模板%' THEN '"beginner"'
            WHEN title LIKE '%API%' OR title LIKE '%数据库%' THEN '"advanced"'
            ELSE '"intermediate"'
        END,
        'estimated_read_time', '10分钟'
    )
WHERE id IN (SELECT id FROM documents LIMIT 10);

-- ====================
-- 验证升级结果
-- ====================

-- 检查表结构
DO $$
DECLARE
    folder_count INTEGER;
    doc_count INTEGER;
    relation_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO folder_count FROM document_folders;
    SELECT COUNT(*) INTO doc_count FROM documents;
    SELECT COUNT(*) INTO relation_count FROM document_project_relations;
    
    RAISE NOTICE 'Upgrade completed:';
    RAISE NOTICE '- Document folders: %', folder_count;
    RAISE NOTICE '- Documents: %', doc_count;
    RAISE NOTICE '- Project relations: %', relation_count;
    
    IF folder_count = 0 THEN
        RAISE WARNING 'No document folders found - check if migration ran correctly';
    END IF;
END $$;

-- ====================
-- 完成升级
-- ====================

COMMENT ON COLUMN documents.folder_id IS '文档所属文件夹ID，NULL表示根目录';
COMMENT ON COLUMN documents.metadata IS '文档元数据，存储额外的结构化信息';
COMMENT ON COLUMN documents.parent_document_id IS '父文档ID，用于文档版本管理';
COMMENT ON COLUMN documents.is_template IS '是否为模板文档';

-- 记录升级完成
-- (此处可以添加版本控制逻辑)