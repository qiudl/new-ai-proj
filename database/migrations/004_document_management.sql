-- ====================================================================
-- 文档管理系统 - 数据库迁移脚本
-- 版本：004_document_management.sql
-- 日期：2025-07-24
-- 描述：创建灵活的文档管理系统，支持文件夹组织和关联关系
-- ====================================================================

-- ====================
-- 文件夹表：支持嵌套结构
-- ====================
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
    CONSTRAINT document_folders_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
);

-- ====================
-- 文档表：独立存储，不直接关联业务实体
-- ====================
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    
    -- 文件夹管理
    folder_id INTEGER REFERENCES document_folders(id) ON DELETE SET NULL,
    
    -- 基础信息
    title VARCHAR(255) NOT NULL,
    content TEXT,
    type VARCHAR(50) NOT NULL DEFAULT 'markdown' CHECK (
        type IN ('markdown', 'image', 'pdf', 'doc', 'docx', 'xlsx', 'pptx', 'txt', 'html')
    ),
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (
        status IN ('draft', 'published', 'archived', 'template')
    ),
    
    -- 文件信息
    file_url TEXT,
    file_size BIGINT DEFAULT 0,
    mime_type VARCHAR(100),
    
    -- 元数据
    description TEXT,
    tags TEXT[] DEFAULT '{}',
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
    CONSTRAINT documents_title_not_empty CHECK (LENGTH(TRIM(title)) > 0),
    CONSTRAINT documents_file_size_positive CHECK (file_size >= 0),
    CONSTRAINT documents_version_positive CHECK (version > 0)
);

-- ====================
-- 文档关联表：多对多关系
-- ====================

-- 文档-客户关联
CREATE TABLE document_customer_relations (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    customer_id INTEGER NOT NULL, -- 暂时不设外键，因为customers表可能不存在
    relation_type VARCHAR(50) NOT NULL DEFAULT 'related' CHECK (
        relation_type IN ('contract', 'requirement', 'reference', 'deliverable', 'related')
    ),
    description TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(document_id, customer_id, relation_type)
);

-- 文档-项目关联
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

-- 文档-任务关联
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

-- 文档-用户关联（收藏、关注等）
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

-- ====================
-- 文档协作和权限
-- ====================

-- 文档协作者
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

-- 文件夹协作者
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

-- 文件夹索引
CREATE INDEX idx_document_folders_owner_id ON document_folders(owner_id);
CREATE INDEX idx_document_folders_parent_id ON document_folders(parent_folder_id);
CREATE INDEX idx_document_folders_visibility ON document_folders(visibility);
CREATE INDEX idx_document_folders_deleted_at ON document_folders(deleted_at);

-- 文档索引
CREATE INDEX idx_documents_folder_id ON documents(folder_id);
CREATE INDEX idx_documents_owner_id ON documents(owner_id);
CREATE INDEX idx_documents_type ON documents(type);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_visibility ON documents(visibility);
CREATE INDEX idx_documents_created_at ON documents(created_at);
CREATE INDEX idx_documents_updated_at ON documents(updated_at);
CREATE INDEX idx_documents_deleted_at ON documents(deleted_at);
CREATE INDEX idx_documents_is_template ON documents(is_template);

-- 关联关系索引
CREATE INDEX idx_document_customer_relations_document_id ON document_customer_relations(document_id);
CREATE INDEX idx_document_customer_relations_customer_id ON document_customer_relations(customer_id);
CREATE INDEX idx_document_customer_relations_type ON document_customer_relations(relation_type);

CREATE INDEX idx_document_project_relations_document_id ON document_project_relations(document_id);
CREATE INDEX idx_document_project_relations_project_id ON document_project_relations(project_id);
CREATE INDEX idx_document_project_relations_type ON document_project_relations(relation_type);

CREATE INDEX idx_document_task_relations_document_id ON document_task_relations(document_id);
CREATE INDEX idx_document_task_relations_task_id ON document_task_relations(task_id);
CREATE INDEX idx_document_task_relations_type ON document_task_relations(relation_type);
CREATE INDEX idx_document_task_relations_order ON document_task_relations(display_order);

CREATE INDEX idx_document_user_relations_document_id ON document_user_relations(document_id);
CREATE INDEX idx_document_user_relations_user_id ON document_user_relations(user_id);
CREATE INDEX idx_document_user_relations_type ON document_user_relations(relation_type);

-- 协作者索引
CREATE INDEX idx_document_collaborators_document_id ON document_collaborators(document_id);
CREATE INDEX idx_document_collaborators_user_id ON document_collaborators(user_id);
CREATE INDEX idx_document_collaborators_permission ON document_collaborators(permission_level);

CREATE INDEX idx_folder_collaborators_folder_id ON folder_collaborators(folder_id);
CREATE INDEX idx_folder_collaborators_user_id ON folder_collaborators(user_id);

-- ====================
-- 触发器：自动更新时间戳
-- ====================

-- 文件夹更新时间戳触发器
CREATE OR REPLACE FUNCTION update_document_folders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_document_folders_updated_at
    BEFORE UPDATE ON document_folders
    FOR EACH ROW
    EXECUTE FUNCTION update_document_folders_updated_at();

-- 文档更新时间戳触发器
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_documents_updated_at();

-- ====================
-- 视图：方便查询
-- ====================

-- 文档详情视图（包含关联信息）
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

-- 文件夹统计视图
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
-- 示例数据
-- ====================

-- 创建一些示例文件夹
INSERT INTO document_folders (name, description, owner_id, created_by, color, icon) VALUES
('客户资料', '存放客户相关文档', 1, 1, '#52c41a', 'folder-user'),
('项目文档', '存放项目相关文档', 1, 1, '#1890ff', 'folder-project'),
('技术文档', '存放技术相关文档', 1, 1, '#722ed1', 'folder-code'),
('模板库', '存放文档模板', 1, 1, '#fa8c16', 'folder-template'),
('个人笔记', '个人工作笔记', 1, 1, '#13c2c2', 'folder-note');

-- 创建子文件夹
INSERT INTO document_folders (name, description, parent_folder_id, owner_id, created_by, color) VALUES
('合同文档', '客户合同文档', 1, 1, 1, '#52c41a'),
('需求文档', '客户需求文档', 1, 1, 1, '#52c41a'),
('设计文档', '项目设计文档', 2, 1, 1, '#1890ff'),
('开发文档', '项目开发文档', 2, 1, 1, '#1890ff'),
('API文档', '技术API文档', 3, 1, 1, '#722ed1'),
('部署文档', '部署相关文档', 3, 1, 1, '#722ed1');

-- 创建一些示例文档
INSERT INTO documents (title, content, type, status, folder_id, owner_id, created_by, description, tags) VALUES
('项目需求文档模板', '# 项目需求文档模板\n\n## 1. 项目概述\n\n## 2. 功能需求\n\n## 3. 非功能需求', 'markdown', 'template', 4, 1, 1, '用于创建项目需求文档的标准模板', ARRAY['模板', '需求']),
('API接口设计规范', '# API接口设计规范\n\n## RESTful API设计原则\n\n## 响应格式规范', 'markdown', 'published', 3, 1, 1, 'API接口设计和开发规范', ARRAY['API', '规范', '技术']),
('客户ABC合同', '客户ABC公司的服务合同内容...', 'markdown', 'published', 1, 1, 1, 'ABC公司的项目服务合同', ARRAY['合同', '客户']),
('移动端开发指南', '# 移动端开发指南\n\n## 环境搭建\n\n## 开发规范', 'markdown', 'published', 2, 1, 1, '移动端应用开发的指导文档', ARRAY['移动端', '开发', '指南']),
('数据库设计文档', '# 数据库设计文档\n\n## 表结构设计\n\n## 索引优化', 'markdown', 'draft', 3, 1, 1, '项目数据库的设计文档', ARRAY['数据库', '设计']);

-- 创建一些文档关联关系（假设项目ID和任务ID存在）
-- 注意：这里使用已知存在的项目和任务ID
INSERT INTO document_project_relations (document_id, project_id, relation_type, description, created_by) VALUES
(1, 34, 'template', '李宁团购项目的需求文档模板', 1),
(2, 34, 'technical', '李宁团购项目的API设计文档', 1),
(4, 39, 'plan', 'AI项目的移动端开发指南', 1);

INSERT INTO document_task_relations (document_id, task_id, relation_type, description, created_by) VALUES
(1, 47, 'template', '定时器功能的需求模板', 1),
(5, 47, 'specification', '定时器功能的数据库设计', 1);

-- 创建一些用户收藏关系
INSERT INTO document_user_relations (document_id, user_id, relation_type) VALUES
(1, 1, 'favorite'),
(2, 1, 'favorite'),
(3, 1, 'bookmark'),
(4, 1, 'watch');

-- 创建一些协作关系
INSERT INTO document_collaborators (document_id, user_id, permission_level, granted_by) VALUES
(1, 1, 'admin', 1),
(2, 1, 'edit', 1),
(3, 1, 'read', 1);

INSERT INTO folder_collaborators (folder_id, user_id, permission_level, granted_by) VALUES
(2, 1, 'admin', 1),
(3, 1, 'edit', 1);

-- ====================
-- 完成迁移
-- ====================

-- 记录迁移完成
-- (此处可以添加版本控制逻辑)

COMMENT ON TABLE document_folders IS '文档文件夹表 - 支持嵌套结构的文件夹管理';
COMMENT ON TABLE documents IS '文档主表 - 独立存储，通过关联表连接业务实体';
COMMENT ON TABLE document_project_relations IS '文档-项目关联表 - 多对多关系';
COMMENT ON TABLE document_task_relations IS '文档-任务关联表 - 多对多关系';
COMMENT ON TABLE document_user_relations IS '文档-用户关联表 - 收藏、关注等';
COMMENT ON TABLE document_collaborators IS '文档协作者表 - 文档级别的权限管理';
COMMENT ON TABLE folder_collaborators IS '文件夹协作者表 - 文件夹级别的权限管理';