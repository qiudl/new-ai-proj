-- 005_document_management_system.sql
-- MD文档统一管理系统数据库设计
-- 任务255-256: MD文件分析与后端API开发

-- 文档导入表
CREATE TABLE document_imports (
    id SERIAL PRIMARY KEY,
    original_path VARCHAR(1000) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL DEFAULT 0,
    content_hash VARCHAR(64) NOT NULL,
    content TEXT,
    preview TEXT,
    import_status VARCHAR(20) DEFAULT 'pending' CHECK (import_status IN ('pending', 'processing', 'completed', 'failed', 'archived')),
    category_id INTEGER,
    quality_score INTEGER DEFAULT 50 CHECK (quality_score >= 0 AND quality_score <= 100),
    quality_level VARCHAR(20) DEFAULT 'fair' CHECK (quality_level IN ('poor', 'fair', 'good', 'excellent')),
    technologies JSONB DEFAULT '[]',
    keywords JSONB DEFAULT '[]',
    import_notes TEXT,
    imported_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(content_hash, original_path)
);

-- 文档分类表
CREATE TABLE document_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id INTEGER REFERENCES document_categories(id),
    sort_order INTEGER DEFAULT 0,
    color VARCHAR(7), -- hex color code
    icon VARCHAR(50), -- icon name
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 文档-任务关联表
CREATE TABLE document_task_relations (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES document_imports(id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    relation_type VARCHAR(50) DEFAULT 'reference' CHECK (relation_type IN ('primary', 'reference', 'output', 'dependency')),
    confidence_score FLOAT DEFAULT 1.0 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(document_id, task_id, relation_type)
);

-- 文档版本表
CREATE TABLE document_versions (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES document_imports(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL DEFAULT 1,
    content TEXT NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    change_summary TEXT,
    file_size INTEGER DEFAULT 0,
    quality_score INTEGER DEFAULT 50,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(document_id, version_number)
);

-- 文档重复关系表
CREATE TABLE document_duplicates (
    id SERIAL PRIMARY KEY,
    master_document_id INTEGER REFERENCES document_imports(id) ON DELETE CASCADE,
    duplicate_document_id INTEGER REFERENCES document_imports(id) ON DELETE CASCADE,
    similarity_score FLOAT DEFAULT 1.0 CHECK (similarity_score >= 0.0 AND similarity_score <= 1.0),
    duplicate_type VARCHAR(50) DEFAULT 'exact' CHECK (duplicate_type IN ('exact', 'near', 'partial')),
    resolution_status VARCHAR(20) DEFAULT 'pending' CHECK (resolution_status IN ('pending', 'merged', 'archived', 'ignored')),
    resolved_by INTEGER REFERENCES users(id),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(master_document_id, duplicate_document_id)
);

-- 文档访问日志表
CREATE TABLE document_access_logs (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES document_imports(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    access_type VARCHAR(20) DEFAULT 'view' CHECK (access_type IN ('view', 'edit', 'download', 'share')),
    ip_address INET,
    user_agent TEXT,
    access_time TIMESTAMP DEFAULT NOW()
);

-- 文档标签表
CREATE TABLE document_tags (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES document_imports(id) ON DELETE CASCADE,
    tag_name VARCHAR(50) NOT NULL,
    tag_type VARCHAR(20) DEFAULT 'manual' CHECK (tag_type IN ('manual', 'auto', 'system')),
    confidence_score FLOAT DEFAULT 1.0,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(document_id, tag_name)
);

-- 索引创建
-- 主要查询索引
CREATE INDEX idx_document_imports_status ON document_imports(import_status);
CREATE INDEX idx_document_imports_category ON document_imports(category_id);
CREATE INDEX idx_document_imports_quality ON document_imports(quality_level, quality_score);
CREATE INDEX idx_document_imports_hash ON document_imports(content_hash);
CREATE INDEX idx_document_imports_created ON document_imports(created_at DESC);

-- 全文搜索索引
CREATE INDEX idx_document_imports_content_search ON document_imports USING GIN(to_tsvector('english', content));
CREATE INDEX idx_document_imports_filename_search ON document_imports USING GIN(to_tsvector('english', filename));

-- JSONB索引
CREATE INDEX idx_document_imports_technologies ON document_imports USING GIN(technologies);
CREATE INDEX idx_document_imports_keywords ON document_imports USING GIN(keywords);

-- 关联关系索引
CREATE INDEX idx_document_task_relations_document ON document_task_relations(document_id);
CREATE INDEX idx_document_task_relations_task ON document_task_relations(task_id);
CREATE INDEX idx_document_task_relations_type ON document_task_relations(relation_type, confidence_score DESC);
CREATE INDEX idx_document_task_relations_composite ON document_task_relations(task_id, relation_type, confidence_score DESC);

-- 版本控制索引
CREATE INDEX idx_document_versions_document ON document_versions(document_id, version_number DESC);
CREATE INDEX idx_document_versions_created ON document_versions(created_at DESC);

-- 重复关系索引
CREATE INDEX idx_document_duplicates_master ON document_duplicates(master_document_id);
CREATE INDEX idx_document_duplicates_duplicate ON document_duplicates(duplicate_document_id);
CREATE INDEX idx_document_duplicates_status ON document_duplicates(resolution_status);

-- 访问日志索引
CREATE INDEX idx_document_access_logs_document ON document_access_logs(document_id);
CREATE INDEX idx_document_access_logs_user ON document_access_logs(user_id);
CREATE INDEX idx_document_access_logs_time ON document_access_logs(access_time DESC);

-- 标签索引
CREATE INDEX idx_document_tags_document ON document_tags(document_id);
CREATE INDEX idx_document_tags_name ON document_tags(tag_name);
CREATE INDEX idx_document_tags_type ON document_tags(tag_type);

-- 分类层次索引
CREATE INDEX idx_document_categories_parent ON document_categories(parent_id);
CREATE INDEX idx_document_categories_active ON document_categories(is_active, sort_order);

-- 触发器：自动更新时间戳
CREATE OR REPLACE FUNCTION update_document_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_document_imports_updated_at
    BEFORE UPDATE ON document_imports
    FOR EACH ROW
    EXECUTE FUNCTION update_document_timestamp();

CREATE TRIGGER trigger_document_categories_updated_at
    BEFORE UPDATE ON document_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_document_timestamp();

-- 插入默认分类数据
INSERT INTO document_categories (name, display_name, description, sort_order, color, icon) VALUES
('task_document', '任务文档', '与具体任务相关的文档', 10, '#1890ff', 'FileText'),
('design_document', '设计文档', '系统架构和设计相关文档', 20, '#722ed1', 'Design'),
('bug_fix', 'Bug修复', 'Bug修复和问题解决文档', 30, '#f5222d', 'Bug'),
('user_guide', '使用指南', '用户手册和使用指南', 40, '#52c41a', 'Book'),
('api_document', 'API文档', 'API接口和技术文档', 50, '#fa8c16', 'Api'),
('development_log', '开发日志', '开发过程和变更记录', 60, '#13c2c2', 'History'),
('configuration', '配置文档', '配置和部署相关文档', 70, '#eb2f96', 'Setting'),
('general', '通用文档', '其他未分类文档', 80, '#8c8c8c', 'File');

-- 创建视图：文档统计
CREATE VIEW document_statistics AS
SELECT 
    dc.name as category_name,
    dc.display_name,
    COUNT(di.id) as document_count,
    COALESCE(SUM(di.file_size), 0) as total_size,
    ROUND(AVG(di.quality_score), 2) as avg_quality_score,
    COUNT(CASE WHEN di.import_status = 'completed' THEN 1 END) as completed_count,
    COUNT(CASE WHEN di.import_status = 'failed' THEN 1 END) as failed_count
FROM document_categories dc
LEFT JOIN document_imports di ON dc.id = di.category_id
WHERE dc.is_active = true
GROUP BY dc.id, dc.name, dc.display_name, dc.sort_order
ORDER BY dc.sort_order;

-- 创建视图：任务文档关联统计
CREATE VIEW task_document_relations AS
SELECT 
    t.id as task_id,
    t.title as task_title,
    COUNT(dtr.id) as document_count,
    COUNT(CASE WHEN dtr.relation_type = 'primary' THEN 1 END) as primary_docs,
    COUNT(CASE WHEN dtr.relation_type = 'reference' THEN 1 END) as reference_docs,
    COUNT(CASE WHEN dtr.relation_type = 'output' THEN 1 END) as output_docs,
    ROUND(AVG(dtr.confidence_score), 2) as avg_confidence
FROM tasks t
LEFT JOIN document_task_relations dtr ON t.id = dtr.task_id
LEFT JOIN document_imports di ON dtr.document_id = di.id
WHERE di.import_status = 'completed' OR di.import_status IS NULL
GROUP BY t.id, t.title
ORDER BY document_count DESC;

-- 创建视图：重复文档清理建议
CREATE VIEW duplicate_cleanup_suggestions AS
SELECT 
    dd.id as duplicate_group_id,
    di_master.filename as master_filename,
    di_master.original_path as master_path,
    di_master.file_size as master_size,
    di_duplicate.filename as duplicate_filename,
    di_duplicate.original_path as duplicate_path,
    di_duplicate.file_size as duplicate_size,
    dd.similarity_score,
    dd.duplicate_type,
    dd.resolution_status,
    (di_master.file_size + di_duplicate.file_size) as space_saved_potential
FROM document_duplicates dd
JOIN document_imports di_master ON dd.master_document_id = di_master.id
JOIN document_imports di_duplicate ON dd.duplicate_document_id = di_duplicate.id
WHERE dd.resolution_status = 'pending'
ORDER BY dd.similarity_score DESC, space_saved_potential DESC;

-- 存储过程：批量导入文档
CREATE OR REPLACE FUNCTION batch_import_documents(
    documents JSONB,
    imported_by_user_id INTEGER
) RETURNS TABLE(
    success_count INTEGER,
    error_count INTEGER,
    duplicate_count INTEGER,
    errors JSONB
) AS $$
DECLARE
    doc JSONB;
    success_cnt INTEGER := 0;
    error_cnt INTEGER := 0;
    duplicate_cnt INTEGER := 0;
    errors_array JSONB := '[]'::JSONB;
    category_id_val INTEGER;
BEGIN
    -- 遍历文档数组
    FOR doc IN SELECT * FROM jsonb_array_elements(documents)
    LOOP
        BEGIN
            -- 检查是否已存在
            IF EXISTS (
                SELECT 1 FROM document_imports 
                WHERE content_hash = doc->>'content_hash' 
                AND original_path = doc->>'original_path'
            ) THEN
                duplicate_cnt := duplicate_cnt + 1;
                CONTINUE;
            END IF;
            
            -- 获取分类ID
            SELECT id INTO category_id_val 
            FROM document_categories 
            WHERE name = doc->>'category' 
            LIMIT 1;
            
            -- 插入文档
            INSERT INTO document_imports (
                original_path,
                filename,
                file_size,
                content_hash,
                content,
                preview,
                category_id,
                quality_score,
                quality_level,
                technologies,
                keywords,
                import_status,
                imported_by
            ) VALUES (
                doc->>'original_path',
                doc->>'filename',
                (doc->>'file_size')::INTEGER,
                doc->>'content_hash',
                doc->>'content',
                doc->>'preview',
                category_id_val,
                COALESCE((doc->>'quality_score')::INTEGER, 50),
                COALESCE(doc->>'quality_level', 'fair'),
                COALESCE(doc->'technologies', '[]'::JSONB),
                COALESCE(doc->'keywords', '[]'::JSONB),
                'completed',
                imported_by_user_id
            );
            
            success_cnt := success_cnt + 1;
            
        EXCEPTION WHEN OTHERS THEN
            error_cnt := error_cnt + 1;
            errors_array := errors_array || jsonb_build_object(
                'file', doc->>'original_path',
                'error', SQLERRM
            );
        END;
    END LOOP;
    
    RETURN QUERY SELECT success_cnt, error_cnt, duplicate_cnt, errors_array;
END;
$$ LANGUAGE plpgsql;

-- 存储过程：智能文档分类
CREATE OR REPLACE FUNCTION classify_document(
    document_content TEXT,
    document_filename TEXT
) RETURNS TABLE(
    suggested_category VARCHAR(100),
    confidence_score FLOAT,
    reasons JSONB
) AS $$
DECLARE
    category_scores JSONB := '{}'::JSONB;
    max_score FLOAT := 0;
    best_category VARCHAR(100);
    content_lower TEXT;
    filename_lower TEXT;
    reasons_array JSONB := '[]'::JSONB;
BEGIN
    content_lower := LOWER(document_content);
    filename_lower := LOWER(document_filename);
    
    -- 任务文档检测
    IF filename_lower LIKE '%task%' OR content_lower LIKE '%任务%' OR content_lower LIKE '%task%' THEN
        category_scores := category_scores || '{"task_document": 0.8}';
        reasons_array := reasons_array || '"文件名或内容包含任务相关关键词"';
    END IF;
    
    -- 设计文档检测
    IF content_lower LIKE '%设计%' OR content_lower LIKE '%design%' OR content_lower LIKE '%架构%' OR content_lower LIKE '%architecture%' THEN
        category_scores := category_scores || '{"design_document": 0.7}';
        reasons_array := reasons_array || '"包含设计或架构相关内容"';
    END IF;
    
    -- Bug修复检测
    IF content_lower LIKE '%fix%' OR content_lower LIKE '%bug%' OR content_lower LIKE '%修复%' OR content_lower LIKE '%问题%' THEN
        category_scores := category_scores || '{"bug_fix": 0.9}';
        reasons_array := reasons_array || '"包含修复或问题相关内容"';
    END IF;
    
    -- API文档检测
    IF content_lower LIKE '%api%' OR content_lower LIKE '%接口%' OR content_lower LIKE '%endpoint%' THEN
        category_scores := category_scores || '{"api_document": 0.8}';
        reasons_array := reasons_array || '"包含API或接口相关内容"';
    END IF;
    
    -- 配置文档检测
    IF content_lower LIKE '%config%' OR content_lower LIKE '%配置%' OR content_lower LIKE '%setup%' OR content_lower LIKE '%install%' THEN
        category_scores := category_scores || '{"configuration": 0.7}';
        reasons_array := reasons_array || '"包含配置或安装相关内容"';
    END IF;
    
    -- 找到最高分的分类
    SELECT key, value::TEXT::FLOAT INTO best_category, max_score
    FROM jsonb_each_text(category_scores)
    ORDER BY value::TEXT::FLOAT DESC
    LIMIT 1;
    
    -- 如果没有明确分类，使用general
    IF best_category IS NULL THEN
        best_category := 'general';
        max_score := 0.5;
        reasons_array := reasons_array || '"未找到明确的分类特征"';
    END IF;
    
    RETURN QUERY SELECT best_category, max_score, reasons_array;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE document_imports IS 'MD文档导入表，存储从项目中导入的所有MD文件';
COMMENT ON TABLE document_categories IS '文档分类表，定义文档的分类体系';
COMMENT ON TABLE document_task_relations IS '文档-任务关联表，建立文档与任务的关联关系';
COMMENT ON TABLE document_versions IS '文档版本表，跟踪文档的历史版本';
COMMENT ON TABLE document_duplicates IS '文档重复关系表，管理重复文档的处理';
COMMENT ON TABLE document_access_logs IS '文档访问日志表，记录文档的访问历史';
COMMENT ON TABLE document_tags IS '文档标签表，为文档添加标签';

-- 创建完成提示
DO $$
BEGIN
    RAISE NOTICE '✅ MD文档管理系统数据库初始化完成!';
    RAISE NOTICE '📊 已创建 7 个数据表';
    RAISE NOTICE '🔍 已创建 20+ 个索引';
    RAISE NOTICE '📈 已创建 3 个统计视图';
    RAISE NOTICE '⚙️ 已创建 3 个存储过程';
    RAISE NOTICE '🏷️ 已插入 8 个默认分类';
END $$;