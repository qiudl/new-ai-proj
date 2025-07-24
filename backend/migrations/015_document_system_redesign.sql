-- 015_document_system_redesign.sql
-- 重新设计文档管理系统
-- 文档独立存储 + 关联关系 + 文件夹管理

BEGIN;

-- ====================
-- 删除旧的约束和索引（如果存在）
-- ====================
ALTER TABLE documents DROP CONSTRAINT IF EXISTS check_single_association;

-- ====================
-- 创建文件夹管理表
-- ====================
CREATE TABLE IF NOT EXISTS document_folders (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_folder_id INTEGER REFERENCES document_folders(id) ON DELETE CASCADE,
    
    -- 所有者和权限
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    visibility VARCHAR(50) NOT NULL DEFAULT 'private' CHECK (
        visibility IN ('private', 'team', 'public')
    ),
    
    -- 显示设置
    color VARCHAR(7), -- HEX颜色
    icon VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    
    -- 时间戳
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    -- 约束：防止循环引用
    CONSTRAINT check_no_self_reference CHECK (id != parent_folder_id),
    CONSTRAINT folder_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
);

-- ====================
-- 增强documents表
-- ====================

-- 添加文件夹关联
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS folder_id INTEGER REFERENCES document_folders(id) ON DELETE SET NULL;

-- 添加其他字段（如果不存在）
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS type VARCHAR(50) NOT NULL DEFAULT 'markdown',
ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS file_size BIGINT,
ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS visibility VARCHAR(50) NOT NULL DEFAULT 'private',
ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS parent_document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_template BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- 更新类型约束
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'type') THEN
        ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_type_check;
        ALTER TABLE documents ADD CONSTRAINT documents_type_check 
            CHECK (type IN ('markdown', 'image', 'pdf', 'doc', 'xlsx', 'pptx', 'txt', 'html'));
    END IF;
END $$;

-- 更新状态约束
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'status') THEN
        ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_status_check;
        ALTER TABLE documents ADD CONSTRAINT documents_status_check 
            CHECK (status IN ('draft', 'published', 'archived', 'template'));
    END IF;
END $$;

-- 更新可见性约束
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'visibility') THEN
        ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_visibility_check;
        ALTER TABLE documents ADD CONSTRAINT documents_visibility_check 
            CHECK (visibility IN ('private', 'team', 'public'));
    END IF;
END $$;

-- 设置owner_id默认值（为已存在的记录）
UPDATE documents SET owner_id = created_by WHERE owner_id IS NULL;

-- 将owner_id设置为NOT NULL（如果还不是）
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'documents' 
               AND column_name = 'owner_id' 
               AND is_nullable = 'YES') THEN
        ALTER TABLE documents ALTER COLUMN owner_id SET NOT NULL;
    END IF;
END $$;

-- 添加标题检查约束
ALTER TABLE documents ADD CONSTRAINT IF NOT EXISTS documents_title_not_empty 
    CHECK (LENGTH(TRIM(title)) > 0);

-- ====================
-- 创建关联关系表
-- ====================

-- 文档-客户关联
CREATE TABLE IF NOT EXISTS document_customer_relations (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    relation_type VARCHAR(50) NOT NULL DEFAULT 'related' CHECK (
        relation_type IN ('contract', 'requirement', 'reference', 'deliverable', 'related')
    ),
    description TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(document_id, customer_id, relation_type)
);

-- 文档-项目关联
CREATE TABLE IF NOT EXISTS document_project_relations (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    relation_type VARCHAR(50) NOT NULL DEFAULT 'related' CHECK (
        relation_type IN (
            'requirement',    -- 需求文档
            'design',         -- 设计文档
            'technical',      -- 技术文档
            'plan',          -- 计划文档
            'report',        -- 报告文档
            'deliverable',   -- 交付物
            'reference',     -- 参考文档
            'template',      -- 模板
            'related'        -- 一般关联
        )
    ),
    description TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(document_id, project_id, relation_type)
);

-- 文档-任务关联
CREATE TABLE IF NOT EXISTS document_task_relations (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    relation_type VARCHAR(50) NOT NULL DEFAULT 'attachment' CHECK (
        relation_type IN (
            'attachment',     -- 附件
            'reference',      -- 参考文档
            'requirement',    -- 需求说明
            'specification',  -- 规格说明
            'deliverable',    -- 交付物
            'test_case',      -- 测试用例
            'bug_report',     -- 问题报告
            'note',          -- 工作笔记
            'template'       -- 模板
        )
    ),
    description TEXT,
    display_order INTEGER DEFAULT 0,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(document_id, task_id, relation_type)
);

-- 文档-用户关联（收藏、关注等）
CREATE TABLE IF NOT EXISTS document_user_relations (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    relation_type VARCHAR(50) NOT NULL CHECK (
        relation_type IN ('favorite', 'bookmark', 'watch', 'recent')
    ),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(document_id, user_id, relation_type)
);

-- ====================
-- 协作和权限表
-- ====================

-- 文档协作者
CREATE TABLE IF NOT EXISTS document_collaborators (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_level VARCHAR(50) NOT NULL CHECK (
        permission_level IN ('read', 'comment', 'edit', 'admin')
    ),
    granted_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    
    UNIQUE(document_id, user_id)
);

-- 文件夹协作者
CREATE TABLE IF NOT EXISTS folder_collaborators (
    id SERIAL PRIMARY KEY,
    folder_id INTEGER NOT NULL REFERENCES document_folders(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_level VARCHAR(50) NOT NULL CHECK (
        permission_level IN ('read', 'edit', 'admin')
    ),
    granted_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    
    UNIQUE(folder_id, user_id)
);

-- ====================
-- 版本控制和评论（可选）
-- ====================

-- 文档版本历史
CREATE TABLE IF NOT EXISTS document_versions (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    change_summary TEXT,
    changed_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    file_url TEXT,
    file_size BIGINT,
    
    UNIQUE(document_id, version_number)
);

-- 文档评论
CREATE TABLE IF NOT EXISTS document_comments (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_comment_id INTEGER REFERENCES document_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    position_data JSONB, -- 存储评论在文档中的位置信息
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'deleted')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ====================
-- 创建索引
-- ====================

-- documents表索引
CREATE INDEX IF NOT EXISTS idx_documents_folder_id ON documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_documents_customer_id ON documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_documents_owner_id ON documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_visibility ON documents(visibility);
CREATE INDEX IF NOT EXISTS idx_documents_tags ON documents USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_documents_metadata ON documents USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_documents_deleted_at ON documents(deleted_at);
CREATE INDEX IF NOT EXISTS idx_documents_is_template ON documents(is_template);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at DESC);

-- 全文搜索索引
CREATE INDEX IF NOT EXISTS idx_documents_search 
ON documents USING GIN(to_tsvector('english', 
    title || ' ' || COALESCE(description, '') || ' ' || COALESCE(content, '')))
WHERE deleted_at IS NULL;

-- document_folders表索引
CREATE INDEX IF NOT EXISTS idx_document_folders_parent_id ON document_folders(parent_folder_id);
CREATE INDEX IF NOT EXISTS idx_document_folders_owner_id ON document_folders(owner_id);
CREATE INDEX IF NOT EXISTS idx_document_folders_created_by ON document_folders(created_by);
CREATE INDEX IF NOT EXISTS idx_document_folders_visibility ON document_folders(visibility);
CREATE INDEX IF NOT EXISTS idx_document_folders_deleted_at ON document_folders(deleted_at);

-- 关联关系表索引
CREATE INDEX IF NOT EXISTS idx_doc_customer_relations_document_id ON document_customer_relations(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_customer_relations_customer_id ON document_customer_relations(customer_id);
CREATE INDEX IF NOT EXISTS idx_doc_customer_relations_type ON document_customer_relations(relation_type);

CREATE INDEX IF NOT EXISTS idx_doc_project_relations_document_id ON document_project_relations(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_project_relations_project_id ON document_project_relations(project_id);
CREATE INDEX IF NOT EXISTS idx_doc_project_relations_type ON document_project_relations(relation_type);

CREATE INDEX IF NOT EXISTS idx_doc_task_relations_document_id ON document_task_relations(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_task_relations_task_id ON document_task_relations(task_id);
CREATE INDEX IF NOT EXISTS idx_doc_task_relations_type ON document_task_relations(relation_type);
CREATE INDEX IF NOT EXISTS idx_doc_task_relations_order ON document_task_relations(task_id, display_order);

CREATE INDEX IF NOT EXISTS idx_doc_user_relations_document_id ON document_user_relations(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_user_relations_user_id ON document_user_relations(user_id);
CREATE INDEX IF NOT EXISTS idx_doc_user_relations_type ON document_user_relations(relation_type);

-- 协作表索引
CREATE INDEX IF NOT EXISTS idx_document_collaborators_document_id ON document_collaborators(document_id);
CREATE INDEX IF NOT EXISTS idx_document_collaborators_user_id ON document_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_document_collaborators_permission ON document_collaborators(permission_level);

CREATE INDEX IF NOT EXISTS idx_folder_collaborators_folder_id ON folder_collaborators(folder_id);
CREATE INDEX IF NOT EXISTS idx_folder_collaborators_user_id ON folder_collaborators(user_id);

-- 版本和评论表索引
CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_number ON document_versions(version_number);
CREATE INDEX IF NOT EXISTS idx_document_versions_changed_by ON document_versions(changed_by);

CREATE INDEX IF NOT EXISTS idx_document_comments_document_id ON document_comments(document_id);
CREATE INDEX IF NOT EXISTS idx_document_comments_user_id ON document_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_document_comments_parent_id ON document_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_document_comments_status ON document_comments(status);

-- ====================
-- 创建触发器
-- ====================

-- 更新updated_at字段的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为相关表添加触发器
CREATE TRIGGER trigger_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_document_folders_updated_at
    BEFORE UPDATE ON document_folders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_document_comments_updated_at
    BEFORE UPDATE ON document_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ====================
-- 添加表注释
-- ====================

COMMENT ON TABLE documents IS '文档表 - 独立存储文档信息';
COMMENT ON TABLE document_folders IS '文档文件夹表 - 支持嵌套的文件夹结构';
COMMENT ON TABLE document_customer_relations IS '文档-客户关联关系表';
COMMENT ON TABLE document_project_relations IS '文档-项目关联关系表';
COMMENT ON TABLE document_task_relations IS '文档-任务关联关系表';
COMMENT ON TABLE document_user_relations IS '文档-用户关联关系表（收藏、关注等）';
COMMENT ON TABLE document_collaborators IS '文档协作者权限表';
COMMENT ON TABLE folder_collaborators IS '文件夹协作者权限表';
COMMENT ON TABLE document_versions IS '文档版本历史表';
COMMENT ON TABLE document_comments IS '文档评论表';

-- 列注释
COMMENT ON COLUMN documents.folder_id IS '所属文件夹ID';
COMMENT ON COLUMN documents.owner_id IS '文档所有者ID';
COMMENT ON COLUMN documents.visibility IS '文档可见性：private私有，team团队，public公开';
COMMENT ON COLUMN documents.metadata IS '文档元数据（JSON格式）';
COMMENT ON COLUMN documents.version IS '文档版本号';
COMMENT ON COLUMN documents.is_template IS '是否为模板文档';

COMMENT ON COLUMN document_folders.parent_folder_id IS '父文件夹ID，NULL表示根文件夹';
COMMENT ON COLUMN document_folders.color IS '文件夹颜色（HEX格式）';
COMMENT ON COLUMN document_folders.sort_order IS '排序顺序';

COMMIT;
