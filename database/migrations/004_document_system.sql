-- ==================== 
-- 文档管理系统数据库结构
-- 支持文档独立存储和灵活的关联关系
-- ====================

-- 文档文件夹表：支持嵌套结构
CREATE TABLE document_folders (
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
    color VARCHAR(7) DEFAULT '#1890ff', -- HEX颜色
    icon VARCHAR(50) DEFAULT 'folder',
    sort_order INTEGER DEFAULT 0,
    
    -- 时间戳
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    -- 约束：防止循环引用
    CONSTRAINT check_no_self_reference CHECK (id != parent_folder_id),
    CONSTRAINT documents_folders_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
);

-- 文档表：独立存储，不直接关联业务实体
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    
    -- 文件夹管理
    folder_id INTEGER REFERENCES document_folders(id) ON DELETE SET NULL,
    
    -- 基础信息
    title VARCHAR(255) NOT NULL,
    content TEXT,
    type VARCHAR(50) NOT NULL DEFAULT 'markdown' CHECK (
        type IN ('markdown', 'image', 'pdf', 'doc', 'xlsx', 'pptx', 'txt', 'html')
    ),
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (
        status IN ('draft', 'published', 'archived', 'template')
    ),
    
    -- 文件信息
    file_url TEXT,
    file_size BIGINT,
    mime_type VARCHAR(100),
    
    -- 元数据
    description TEXT,
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    
    -- 权限和可见性
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    visibility VARCHAR(50) NOT NULL DEFAULT 'private' CHECK (
        visibility IN ('private', 'team', 'public')
    ),
    
    -- 版本管理
    version INTEGER NOT NULL DEFAULT 1,
    parent_document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
    is_template BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- 时间戳
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    -- 约束
    CONSTRAINT documents_title_not_empty CHECK (LENGTH(TRIM(title)) > 0)
);

-- 文档-客户关联表
CREATE TABLE document_customer_relations (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    customer_id INTEGER NOT NULL, -- 引用customers表，但暂时不强制外键
    relation_type VARCHAR(50) NOT NULL DEFAULT 'related' CHECK (
        relation_type IN ('contract', 'requirement', 'reference', 'deliverable', 'related')
    ),
    description TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(document_id, customer_id, relation_type)
);

-- 文档-项目关联表
CREATE TABLE document_project_relations (
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

-- 文档-任务关联表
CREATE TABLE document_task_relations (
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

-- 文档-用户关联表（收藏、关注等）
CREATE TABLE document_user_relations (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    relation_type VARCHAR(50) NOT NULL CHECK (
        relation_type IN ('favorite', 'bookmark', 'watch', 'recent')
    ),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(document_id, user_id, relation_type)
);

-- 文档协作者表
CREATE TABLE document_collaborators (
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

-- 文件夹协作者表  
CREATE TABLE folder_collaborators (
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
-- 索引优化
-- ====================

-- 文档索引
CREATE INDEX idx_documents_folder_id ON documents(folder_id);
CREATE INDEX idx_documents_owner_id ON documents(owner_id);
CREATE INDEX idx_documents_type ON documents(type);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_created_at ON documents(created_at);
CREATE INDEX idx_documents_updated_at ON documents(updated_at);
CREATE INDEX idx_documents_deleted_at ON documents(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_tags ON documents USING GIN(tags);
CREATE INDEX idx_documents_metadata ON documents USING GIN(metadata);

-- 文件夹索引
CREATE INDEX idx_document_folders_parent_id ON document_folders(parent_folder_id);
CREATE INDEX idx_document_folders_owner_id ON document_folders(owner_id);
CREATE INDEX idx_document_folders_deleted_at ON document_folders(deleted_at) WHERE deleted_at IS NULL;

-- 关联关系索引
CREATE INDEX idx_doc_customer_relations_doc_id ON document_customer_relations(document_id);
CREATE INDEX idx_doc_customer_relations_customer_id ON document_customer_relations(customer_id);
CREATE INDEX idx_doc_project_relations_doc_id ON document_project_relations(document_id);
CREATE INDEX idx_doc_project_relations_project_id ON document_project_relations(project_id);
CREATE INDEX idx_doc_task_relations_doc_id ON document_task_relations(document_id);
CREATE INDEX idx_doc_task_relations_task_id ON document_task_relations(task_id);
CREATE INDEX idx_doc_user_relations_doc_id ON document_user_relations(document_id);
CREATE INDEX idx_doc_user_relations_user_id ON document_user_relations(user_id);

-- ====================
-- 触发器：自动更新时间戳
-- ====================

-- 更新文档时间戳
CREATE OR REPLACE FUNCTION update_document_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_document_timestamp
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_document_timestamp();

-- 更新文件夹时间戳
CREATE OR REPLACE FUNCTION update_folder_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_folder_timestamp
    BEFORE UPDATE ON document_folders
    FOR EACH ROW
    EXECUTE FUNCTION update_folder_timestamp();

-- ====================
-- 初始化示例数据
-- ====================

-- 插入示例文件夹
INSERT INTO document_folders (name, description, owner_id, created_by, color, icon) VALUES
('客户资料', '存放客户相关文档', 1, 1, '#52c41a', 'users'),
('项目文档', '项目相关的所有文档', 1, 1, '#1890ff', 'project'),
('技术文档', '技术规范和开发文档', 1, 1, '#722ed1', 'code'),
('模板库', '文档模板和样式', 1, 1, '#fa8c16', 'template'),
('个人笔记', '个人工作笔记', 1, 1, '#eb2f96', 'note');

-- 插入示例文档
INSERT INTO documents (title, content, type, status, folder_id, owner_id, created_by, description, tags, metadata) VALUES
('项目需求文档', '# AI项目管理平台需求\n\n## 功能需求\n1. 用户管理\n2. 项目管理\n3. 任务管理', 'markdown', 'published', 2, 1, 1, 'AI项目管理平台的详细需求文档', ARRAY['需求', '项目', 'AI'], '{"priority": "high", "version": "1.0"}'),
('技术架构设计', '# 系统架构\n\n## 后端架构\n- Go + Gin\n- PostgreSQL\n\r## 前端架构\n- React + TypeScript\n- Ant Design', 'markdown', 'published', 3, 1, 1, '系统技术架构设计文档', ARRAY['架构', '技术', '设计'], '{"reviewers": ["dev_user_1"], "status": "approved"}'),
('用户手册模板', '# 用户手册\n\n## 快速开始\n\n## 功能介绍\n\n## 常见问题', 'markdown', 'template', 4, 1, 1, '通用用户手册模板', ARRAY['模板', '用户手册'], '{"template_version": "1.0"}'),
('会议纪要 - 2024年1月', '# 项目启动会议\n\n**时间**：2024-01-15\n**参与者**：团队成员\n\n## 讨论内容\n1. 项目目标\n2. 时间安排', 'markdown', 'published', 5, 1, 1, '项目启动会议纪要', ARRAY['会议', '纪要'], '{"meeting_date": "2024-01-15", "attendees": 5}'),
('客户合同模板', '# 软件开发合同\n\n## 甲方信息\n\n## 乙方信息\n\n## 项目描述\n\n## 交付标准', 'markdown', 'template', 1, 1, 1, '标准软件开发合同模板', ARRAY['合同', '模板', '法务'], '{"template_type": "contract", "legal_review": true}');

-- 插入文档关联关系示例
INSERT INTO document_project_relations (document_id, project_id, relation_type, description, created_by) VALUES
(1, 1, 'requirement', '项目的需求文档', 1),
(2, 1, 'technical', '项目的技术架构文档', 1);

INSERT INTO document_task_relations (document_id, task_id, relation_type, description, created_by) VALUES
(1, 1, 'reference', '任务相关的需求参考', 1),
(2, 2, 'specification', '开发任务的技术规范', 1);

-- 插入用户关联关系（收藏等）
INSERT INTO document_user_relations (document_id, user_id, relation_type) VALUES
(1, 1, 'favorite'),
(2, 1, 'bookmark'),
(3, 2, 'favorite');

-- 插入协作者示例
INSERT INTO document_collaborators (document_id, user_id, permission_level, granted_by) VALUES
(1, 2, 'edit', 1),
(2, 2, 'comment', 1),
(2, 3, 'read', 1);