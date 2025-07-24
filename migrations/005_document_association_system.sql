-- Document Association System Migration
-- 迁移到新的文档关联体系

BEGIN;

-- 1. 添加新的列
ALTER TABLE documents 
ADD COLUMN customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
ADD COLUMN owner_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
ADD COLUMN type VARCHAR(50) NOT NULL DEFAULT 'markdown',
ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'draft',
ADD COLUMN category VARCHAR(100),
ADD COLUMN subcategory VARCHAR(100),
ADD COLUMN visibility VARCHAR(50) DEFAULT 'private',
ADD COLUMN shared_with INTEGER[],
ADD COLUMN file_url VARCHAR(500),
ADD COLUMN file_size BIGINT,
ADD COLUMN mime_type VARCHAR(100),
ADD COLUMN tags TEXT[],
ADD COLUMN description TEXT,
ADD COLUMN version INTEGER DEFAULT 1,
ADD COLUMN deleted_at TIMESTAMP;

-- 2. 更新现有数据：将created_by作为owner_id
UPDATE documents SET owner_id = created_by WHERE owner_id = 1;

-- 3. 添加约束：确保关联关系的唯一性
ALTER TABLE documents ADD CONSTRAINT check_single_association CHECK (
    (project_id IS NOT NULL AND customer_id IS NULL) OR
    (project_id IS NULL AND customer_id IS NOT NULL) OR  
    (project_id IS NULL AND customer_id IS NULL) -- 个人文档
);

-- 4. 添加类型和状态检查约束
ALTER TABLE documents ADD CONSTRAINT check_document_type 
CHECK (type IN ('markdown', 'image', 'pdf'));

ALTER TABLE documents ADD CONSTRAINT check_document_status 
CHECK (status IN ('draft', 'published', 'archived'));

ALTER TABLE documents ADD CONSTRAINT check_visibility 
CHECK (visibility IN ('private', 'team', 'public'));

-- 5. 创建新的索引
CREATE INDEX idx_documents_customer_id ON documents(customer_id);
CREATE INDEX idx_documents_owner_id ON documents(owner_id);
CREATE INDEX idx_documents_type ON documents(type);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_documents_visibility ON documents(visibility);
CREATE INDEX idx_documents_tags ON documents USING GIN(tags);
CREATE INDEX idx_documents_deleted_at ON documents(deleted_at);

-- 6. 更新触发器以支持软删除
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 触发器已存在，无需重复创建

-- 7. 创建文档统计视图
CREATE OR REPLACE VIEW document_stats AS
SELECT 
    COUNT(*) as total_documents,
    COUNT(CASE WHEN project_id IS NOT NULL THEN 1 END) as project_documents,
    COUNT(CASE WHEN customer_id IS NOT NULL THEN 1 END) as customer_documents,
    COUNT(CASE WHEN project_id IS NULL AND customer_id IS NULL THEN 1 END) as personal_documents,
    COUNT(CASE WHEN type = 'markdown' THEN 1 END) as markdown_documents,
    COUNT(CASE WHEN type = 'image' THEN 1 END) as image_documents,
    COUNT(CASE WHEN type = 'pdf' THEN 1 END) as pdf_documents,
    COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_documents,
    COUNT(CASE WHEN status = 'published' THEN 1 END) as published_documents,
    COUNT(CASE WHEN status = 'archived' THEN 1 END) as archived_documents,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as recent_documents
FROM documents 
WHERE deleted_at IS NULL;

-- 8. 创建用户文档权限视图
CREATE OR REPLACE VIEW user_document_access AS
SELECT 
    d.id as document_id,
    d.title,
    d.type,
    d.status,
    d.project_id,
    d.customer_id,
    d.owner_id,
    d.visibility,
    d.created_at,
    d.updated_at,
    u.id as user_id,
    u.username,
    u.role,
    -- 权限计算
    CASE 
        WHEN d.owner_id = u.id THEN 'owner'
        WHEN u.role = 'admin' THEN 'admin'
        WHEN d.project_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM project_users pu 
            WHERE pu.project_id = d.project_id AND pu.user_id = u.id
        ) THEN 'project_member'
        WHEN d.customer_id IS NOT NULL AND u.company_id = d.customer_id THEN 'customer_member'
        WHEN d.visibility = 'public' THEN 'public_reader'
        WHEN u.id = ANY(d.shared_with) THEN 'shared_reader'
        ELSE 'no_access'
    END as access_level
FROM documents d
CROSS JOIN users u
WHERE d.deleted_at IS NULL;

-- 9. 添加注释
COMMENT ON TABLE documents IS '文档表 - 支持项目、客户和个人文档关联';
COMMENT ON COLUMN documents.project_id IS '关联项目ID（可为空）';
COMMENT ON COLUMN documents.customer_id IS '关联客户ID（可为空）';
COMMENT ON COLUMN documents.owner_id IS '文档所有者ID（必填）';
COMMENT ON COLUMN documents.type IS '文档类型：markdown, image, pdf';
COMMENT ON COLUMN documents.status IS '文档状态：draft, published, archived';
COMMENT ON COLUMN documents.visibility IS '可见性：private, team, public';
COMMENT ON COLUMN documents.shared_with IS '共享给的用户ID数组';

COMMIT;