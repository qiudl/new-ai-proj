-- 010_documents_table.sql
-- 创建文档管理表
-- 用于项目文档管理功能

-- 创建documents表
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT DEFAULT '',
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 添加索引以提升查询性能
CREATE INDEX idx_documents_project_id ON documents(project_id);
CREATE INDEX idx_documents_created_by ON documents(created_by);
CREATE INDEX idx_documents_updated_at ON documents(updated_at DESC);
CREATE INDEX idx_documents_title ON documents(title);

-- 添加触发器自动更新updated_at字段
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_documents_updated_at();

-- 添加表注释
COMMENT ON TABLE documents IS '项目文档表 - 存储项目相关的文档信息';
COMMENT ON COLUMN documents.id IS '文档唯一标识';
COMMENT ON COLUMN documents.project_id IS '所属项目ID';
COMMENT ON COLUMN documents.title IS '文档标题';
COMMENT ON COLUMN documents.content IS '文档内容（纯文本）';
COMMENT ON COLUMN documents.created_by IS '创建者用户ID';
COMMENT ON COLUMN documents.created_at IS '创建时间';
COMMENT ON COLUMN documents.updated_at IS '最后更新时间';