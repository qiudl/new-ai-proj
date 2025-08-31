-- 创建文档文件夹表
CREATE TABLE IF NOT EXISTS document_folders (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id INTEGER REFERENCES document_folders(id) ON DELETE CASCADE,
    color VARCHAR(7),
    icon VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    created_by INTEGER NOT NULL,
    updated_by INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_document_folders_parent_id ON document_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_document_folders_created_by ON document_folders(created_by);
CREATE INDEX IF NOT EXISTS idx_document_folders_deleted_at ON document_folders(deleted_at);

-- 确保documents表有folder_id字段
ALTER TABLE documents ADD COLUMN IF NOT EXISTS folder_id INTEGER REFERENCES document_folders(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_documents_folder_id ON documents(folder_id);