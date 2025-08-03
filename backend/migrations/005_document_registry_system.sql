-- 005_document_registry_system.sql
-- 基于文件系统的轻量级文档注册和关联系统
-- 任务253: MD文档统一管理系统

-- 文档注册表（仅存储路径和元数据，不存储内容）
CREATE TABLE document_registry (
    id SERIAL PRIMARY KEY,
    file_path VARCHAR(1000) NOT NULL UNIQUE, -- 相对于项目根目录的路径
    filename VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    title VARCHAR(500), -- 从文档中提取的标题
    description TEXT, -- 文档描述或摘要
    file_size INTEGER DEFAULT 0,
    content_hash VARCHAR(64), -- 用于检测文件变更
    last_modified TIMESTAMP, -- 文件系统的最后修改时间
    is_active BOOLEAN DEFAULT true, -- 文件是否存在
    quality_score INTEGER DEFAULT 50 CHECK (quality_score >= 0 AND quality_score <= 100),
    technologies JSONB DEFAULT '[]', -- 相关技术栈
    keywords JSONB DEFAULT '[]', -- 关键词
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 文档-任务关联表
CREATE TABLE document_task_associations (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES document_registry(id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    association_type VARCHAR(50) DEFAULT 'reference' CHECK (association_type IN ('primary', 'reference', 'output', 'dependency', 'related')),
    confidence_score FLOAT DEFAULT 1.0 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(document_id, task_id, association_type)
);

-- 文档标签表
CREATE TABLE document_tags (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES document_registry(id) ON DELETE CASCADE,
    tag_name VARCHAR(50) NOT NULL,
    tag_type VARCHAR(20) DEFAULT 'manual' CHECK (tag_type IN ('manual', 'auto', 'system')),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(document_id, tag_name)
);

-- 文档分类定义表
CREATE TABLE document_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    directory_path VARCHAR(200), -- 对应的目录路径
    color VARCHAR(7), -- 显示颜色
    icon VARCHAR(50), -- 图标
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 文档访问历史表（轻量级）
CREATE TABLE document_access_history (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES document_registry(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    access_type VARCHAR(20) DEFAULT 'view' CHECK (access_type IN ('view', 'edit', 'download')),
    accessed_at TIMESTAMP DEFAULT NOW()
);

-- 索引创建
CREATE INDEX idx_document_registry_path ON document_registry(file_path);
CREATE INDEX idx_document_registry_category ON document_registry(category);
CREATE INDEX idx_document_registry_active ON document_registry(is_active);
CREATE INDEX idx_document_registry_modified ON document_registry(last_modified DESC);
CREATE INDEX idx_document_registry_hash ON document_registry(content_hash);

-- JSONB字段索引
CREATE INDEX idx_document_registry_technologies ON document_registry USING GIN(technologies);
CREATE INDEX idx_document_registry_keywords ON document_registry USING GIN(keywords);

-- 关联表索引
CREATE INDEX idx_document_task_assoc_document ON document_task_associations(document_id);
CREATE INDEX idx_document_task_assoc_task ON document_task_associations(task_id);
CREATE INDEX idx_document_task_assoc_type ON document_task_associations(association_type);
CREATE INDEX idx_document_task_assoc_confidence ON document_task_associations(confidence_score DESC);

-- 标签索引
CREATE INDEX idx_document_tags_document ON document_tags(document_id);
CREATE INDEX idx_document_tags_name ON document_tags(tag_name);
CREATE INDEX idx_document_tags_type ON document_tags(tag_type);

-- 分类索引
CREATE INDEX idx_document_categories_name ON document_categories(name);
CREATE INDEX idx_document_categories_active ON document_categories(is_active, sort_order);

-- 访问历史索引
CREATE INDEX idx_document_access_document ON document_access_history(document_id);
CREATE INDEX idx_document_access_user ON document_access_history(user_id);
CREATE INDEX idx_document_access_time ON document_access_history(accessed_at DESC);

-- 全文搜索索引（搜索标题和描述）
CREATE INDEX idx_document_registry_title_search ON document_registry USING GIN(to_tsvector('english', COALESCE(title, '')));
CREATE INDEX idx_document_registry_desc_search ON document_registry USING GIN(to_tsvector('english', COALESCE(description, '')));

-- 更新时间戳触发器
CREATE OR REPLACE FUNCTION update_document_registry_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_document_registry_updated_at
    BEFORE UPDATE ON document_registry
    FOR EACH ROW
    EXECUTE FUNCTION update_document_registry_timestamp();

-- 插入默认分类数据
INSERT INTO document_categories (name, display_name, description, directory_path, color, icon, sort_order) VALUES
('tasks', '任务文档', '与具体任务相关的文档', 'docs/tasks', '#1890ff', 'FileText', 10),
('designs', '设计文档', '系统架构和设计相关文档', 'docs/designs', '#722ed1', 'Design', 20),
('guides', '使用指南', '用户手册和使用指南', 'docs/guides', '#52c41a', 'Book', 30),
('apis', 'API文档', 'API接口和技术文档', 'docs/apis', '#fa8c16', 'Api', 40),
('development', '开发日志', '开发过程和变更记录', 'docs/development', '#13c2c2', 'History', 50),
('configurations', '配置文档', '配置和部署相关文档', 'docs/configurations', '#eb2f96', 'Setting', 60),
('templates', '文档模板', '各类文档模板', 'docs/templates', '#f759ab', 'FileProtect', 70),
('archived', '归档文档', '已归档的历史文档', 'docs/archived', '#8c8c8c', 'Folder', 80);

-- 创建视图：文档统计
CREATE VIEW document_statistics AS
SELECT 
    dc.name as category_name,
    dc.display_name,
    dc.directory_path,
    COUNT(dr.id) as document_count,
    COALESCE(SUM(dr.file_size), 0) as total_size_bytes,
    ROUND(COALESCE(SUM(dr.file_size), 0) / 1024.0 / 1024.0, 2) as total_size_mb,
    ROUND(AVG(dr.quality_score), 2) as avg_quality_score,
    COUNT(CASE WHEN dr.is_active = true THEN 1 END) as active_count,
    COUNT(CASE WHEN dr.is_active = false THEN 1 END) as inactive_count
FROM document_categories dc
LEFT JOIN document_registry dr ON dc.name = dr.category
WHERE dc.is_active = true
GROUP BY dc.id, dc.name, dc.display_name, dc.directory_path, dc.sort_order
ORDER BY dc.sort_order;

-- 创建视图：任务文档关联统计
CREATE VIEW task_document_statistics AS
SELECT 
    t.id as task_id,
    t.title as task_title,
    t.status as task_status,
    COUNT(dta.id) as total_documents,
    COUNT(CASE WHEN dta.association_type = 'primary' THEN 1 END) as primary_docs,
    COUNT(CASE WHEN dta.association_type = 'reference' THEN 1 END) as reference_docs,
    COUNT(CASE WHEN dta.association_type = 'output' THEN 1 END) as output_docs,
    COUNT(CASE WHEN dta.association_type = 'related' THEN 1 END) as related_docs,
    ROUND(AVG(dta.confidence_score), 2) as avg_confidence_score,
    MAX(dr.last_modified) as latest_doc_modified
FROM tasks t
LEFT JOIN document_task_associations dta ON t.id = dta.task_id
LEFT JOIN document_registry dr ON dta.document_id = dr.id AND dr.is_active = true
GROUP BY t.id, t.title, t.status
ORDER BY total_documents DESC, t.id;

-- 创建视图：最近访问的文档
CREATE VIEW recent_document_access AS
SELECT 
    dr.id as document_id,
    dr.file_path,
    dr.filename,
    dr.title,
    dr.category,
    dah.user_id,
    u.username,
    dah.access_type,
    dah.accessed_at,
    ROW_NUMBER() OVER (PARTITION BY dah.user_id ORDER BY dah.accessed_at DESC) as access_rank
FROM document_registry dr
JOIN document_access_history dah ON dr.id = dah.document_id
JOIN users u ON dah.user_id = u.id
WHERE dr.is_active = true
ORDER BY dah.accessed_at DESC;

-- 存储过程：扫描并注册文档目录
CREATE OR REPLACE FUNCTION scan_and_register_documents(
    base_path TEXT,
    category_name TEXT DEFAULT 'general',
    user_id INTEGER DEFAULT 1
) RETURNS TABLE(
    registered_count INTEGER,
    updated_count INTEGER,
    error_count INTEGER,
    errors JSONB
) AS $$
DECLARE
    result_registered INTEGER := 0;
    result_updated INTEGER := 0;
    result_errors INTEGER := 0;
    error_list JSONB := '[]'::JSONB;
BEGIN
    -- 此函数的实际实现需要配合后端代码
    -- 这里只是定义接口，具体扫描逻辑在Go代码中实现
    
    RAISE NOTICE '文档扫描注册功能需要配合后端代码实现';
    RAISE NOTICE '参数: base_path=%, category=%, user_id=%', base_path, category_name, user_id;
    
    RETURN QUERY SELECT 0, 0, 0, '[]'::JSONB;
END;
$$ LANGUAGE plpgsql;

-- 存储过程：建立文档-任务关联
CREATE OR REPLACE FUNCTION associate_document_with_task(
    doc_file_path TEXT,
    task_id_param INTEGER,
    association_type_param VARCHAR(50) DEFAULT 'reference',
    confidence_param FLOAT DEFAULT 1.0,
    notes_param TEXT DEFAULT NULL,
    user_id_param INTEGER DEFAULT 1
) RETURNS BOOLEAN AS $$
DECLARE
    doc_id INTEGER;
    existing_count INTEGER;
BEGIN
    -- 查找文档ID
    SELECT id INTO doc_id 
    FROM document_registry 
    WHERE file_path = doc_file_path AND is_active = true;
    
    IF doc_id IS NULL THEN
        RAISE EXCEPTION '文档未找到: %', doc_file_path;
    END IF;
    
    -- 检查是否已存在相同类型的关联
    SELECT COUNT(*) INTO existing_count
    FROM document_task_associations
    WHERE document_id = doc_id 
    AND task_id = task_id_param 
    AND association_type = association_type_param;
    
    IF existing_count > 0 THEN
        -- 更新现有关联
        UPDATE document_task_associations 
        SET confidence_score = confidence_param,
            notes = COALESCE(notes_param, notes),
            created_by = user_id_param,
            created_at = NOW()
        WHERE document_id = doc_id 
        AND task_id = task_id_param 
        AND association_type = association_type_param;
    ELSE
        -- 创建新关联
        INSERT INTO document_task_associations (
            document_id, task_id, association_type, 
            confidence_score, notes, created_by
        ) VALUES (
            doc_id, task_id_param, association_type_param,
            confidence_param, notes_param, user_id_param
        );
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 存储过程：获取任务相关文档
CREATE OR REPLACE FUNCTION get_task_documents(task_id_param INTEGER)
RETURNS TABLE(
    document_id INTEGER,
    file_path VARCHAR(1000),
    filename VARCHAR(255),
    title VARCHAR(500),
    category VARCHAR(50),
    association_type VARCHAR(50),
    confidence_score FLOAT,
    last_modified TIMESTAMP,
    file_size INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dr.id,
        dr.file_path,
        dr.filename,
        dr.title,
        dr.category,
        dta.association_type,
        dta.confidence_score,
        dr.last_modified,
        dr.file_size
    FROM document_registry dr
    JOIN document_task_associations dta ON dr.id = dta.document_id
    WHERE dta.task_id = task_id_param 
    AND dr.is_active = true
    ORDER BY dta.association_type, dta.confidence_score DESC, dr.filename;
END;
$$ LANGUAGE plpgsql;

-- 存储过程：搜索文档
CREATE OR REPLACE FUNCTION search_documents(
    search_query TEXT,
    category_filter TEXT DEFAULT NULL,
    limit_count INTEGER DEFAULT 50
) RETURNS TABLE(
    document_id INTEGER,
    file_path VARCHAR(1000),
    filename VARCHAR(255),
    title VARCHAR(500),
    category VARCHAR(50),
    quality_score INTEGER,
    relevance_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dr.id,
        dr.file_path,
        dr.filename,
        dr.title,
        dr.category,
        dr.quality_score,
        (
            ts_rank(to_tsvector('english', COALESCE(dr.title, '')), plainto_tsquery('english', search_query)) +
            ts_rank(to_tsvector('english', COALESCE(dr.description, '')), plainto_tsquery('english', search_query)) +
            ts_rank(to_tsvector('english', dr.filename), plainto_tsquery('english', search_query))
        ) as relevance_score
    FROM document_registry dr
    WHERE dr.is_active = true
    AND (category_filter IS NULL OR dr.category = category_filter)
    AND (
        to_tsvector('english', COALESCE(dr.title, '')) @@ plainto_tsquery('english', search_query) OR
        to_tsvector('english', COALESCE(dr.description, '')) @@ plainto_tsquery('english', search_query) OR
        to_tsvector('english', dr.filename) @@ plainto_tsquery('english', search_query) OR
        dr.filename ILIKE '%' || search_query || '%'
    )
    ORDER BY relevance_score DESC, dr.quality_score DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- 创建表注释
COMMENT ON TABLE document_registry IS '文档注册表：存储文档路径和元数据，不存储文档内容';
COMMENT ON TABLE document_task_associations IS '文档-任务关联表：建立文档与任务的关联关系';
COMMENT ON TABLE document_tags IS '文档标签表：为文档添加标签';
COMMENT ON TABLE document_categories IS '文档分类定义表：定义文档分类和对应目录';
COMMENT ON TABLE document_access_history IS '文档访问历史表：记录文档访问历史';

COMMENT ON COLUMN document_registry.file_path IS '相对于项目根目录的文件路径';
COMMENT ON COLUMN document_registry.content_hash IS '文件内容的MD5哈希，用于检测文件变更';
COMMENT ON COLUMN document_registry.is_active IS '文件是否存在于文件系统中';

-- 创建完成提示
DO $$
BEGIN
    RAISE NOTICE '✅ 文档注册系统数据库初始化完成!';
    RAISE NOTICE '📊 已创建 5 个轻量级数据表';
    RAISE NOTICE '🔍 已创建 15+ 个优化索引';
    RAISE NOTICE '📈 已创建 3 个统计视图';
    RAISE NOTICE '⚙️ 已创建 4 个核心存储过程';
    RAISE NOTICE '🏷️ 已插入 8 个默认分类';
    RAISE NOTICE '📁 基于文件系统的文档管理架构就绪';
END $$;