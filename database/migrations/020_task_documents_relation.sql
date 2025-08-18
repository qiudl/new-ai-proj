-- 020_task_documents_relation.sql
-- 创建任务-文档关联表

BEGIN;

-- 创建任务文档关联表
CREATE TABLE task_documents (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) DEFAULT 'attachment', -- attachment, reference, requirement, output
    sort_order INTEGER DEFAULT 0,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    -- 确保同一任务的同一文档只能关联一次
    UNIQUE(task_id, document_id)
);

-- 创建索引提升查询性能
CREATE INDEX idx_task_documents_task_id ON task_documents(task_id);
CREATE INDEX idx_task_documents_document_id ON task_documents(document_id);
CREATE INDEX idx_task_documents_relationship_type ON task_documents(relationship_type);
CREATE INDEX idx_task_documents_created_at ON task_documents(created_at DESC);
CREATE INDEX idx_task_documents_deleted_at ON task_documents(deleted_at);

-- 创建文档版本表
CREATE TABLE document_versions (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    title VARCHAR(255),
    content TEXT,
    changes_summary TEXT,
    metadata JSONB,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 确保同一文档的版本号唯一
    UNIQUE(document_id, version_number)
);

-- 版本表索引
CREATE INDEX idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX idx_document_versions_version_number ON document_versions(version_number DESC);
CREATE INDEX idx_document_versions_created_at ON document_versions(created_at DESC);

-- 自动更新updated_at触发器
CREATE OR REPLACE FUNCTION update_task_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_task_documents_updated_at
    BEFORE UPDATE ON task_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_task_documents_updated_at();

-- 自动创建文档版本的触发器
CREATE OR REPLACE FUNCTION create_document_version()
RETURNS TRIGGER AS $$
BEGIN
    -- 当文档内容发生变化时，自动创建新版本
    IF OLD.content IS DISTINCT FROM NEW.content OR OLD.title IS DISTINCT FROM NEW.title THEN
        INSERT INTO document_versions (
            document_id, 
            version_number, 
            title, 
            content, 
            changes_summary, 
            metadata,
            created_by
        )
        VALUES (
            NEW.id,
            NEW.version,
            NEW.title,
            NEW.content,
            CASE 
                WHEN OLD.title IS DISTINCT FROM NEW.title THEN '标题更新'
                WHEN OLD.content IS DISTINCT FROM NEW.content THEN '内容更新'
                ELSE '文档更新'
            END,
            NEW.metadata,
            NEW.owner_id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_document_version
    AFTER UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION create_document_version();

-- 添加表注释
COMMENT ON TABLE task_documents IS '任务文档关联表 - 管理任务与文档的关联关系';
COMMENT ON TABLE document_versions IS '文档版本表 - 记录文档的历史版本';

COMMENT ON COLUMN task_documents.relationship_type IS '关联类型：attachment(附件)、reference(参考)、requirement(需求)、output(输出)';
COMMENT ON COLUMN task_documents.sort_order IS '排序顺序，用于控制文档在任务中的显示顺序';

COMMENT ON COLUMN document_versions.version_number IS '版本号，与documents表的version字段对应';
COMMENT ON COLUMN document_versions.changes_summary IS '变更摘要，描述本次版本的主要变化';

COMMIT;