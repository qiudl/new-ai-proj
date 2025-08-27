-- 030_work_note_folder_enhancements.sql
-- 工作笔记分类管理功能数据模型扩展
-- 基于现有的document_folders表进行优化和扩展

BEGIN;

-- ====================
-- 启用必要的PostgreSQL扩展
-- ====================

-- 启用ltree扩展用于层级结构查询优化
CREATE EXTENSION IF NOT EXISTS ltree;

-- 启用btree_gist扩展用于复合索引优化  
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ====================
-- 扩展document_folders表
-- ====================

-- 添加路径字段用于ltree层级查询优化
ALTER TABLE document_folders 
ADD COLUMN IF NOT EXISTS path ltree,
ADD COLUMN IF NOT EXISTS depth INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS note_count_cached INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS note_count_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_system_folder BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS folder_type VARCHAR(50) DEFAULT 'regular';

-- 添加文件夹类型约束
ALTER TABLE document_folders 
ADD CONSTRAINT IF NOT EXISTS document_folders_type_check 
    CHECK (folder_type IN ('regular', 'system', 'template', 'archive', 'shared'));

-- 添加深度约束（限制最大20层嵌套）
ALTER TABLE document_folders 
ADD CONSTRAINT IF NOT EXISTS document_folders_depth_check 
    CHECK (depth >= 0 AND depth <= 20);

-- ====================
-- 创建ltree路径更新函数
-- ====================

-- 创建或更新ltree路径的函数
CREATE OR REPLACE FUNCTION update_folder_path() 
RETURNS TRIGGER AS $$
BEGIN
    -- 如果是根文件夹
    IF NEW.parent_folder_id IS NULL THEN
        NEW.path := text2ltree(NEW.id::text);
        NEW.depth := 0;
    ELSE
        -- 获取父文件夹的路径和深度
        SELECT path, depth + 1 
        INTO NEW.path, NEW.depth
        FROM document_folders 
        WHERE id = NEW.parent_folder_id;
        
        -- 构建新路径
        NEW.path := NEW.path || text2ltree(NEW.id::text);
        
        -- 检查深度限制
        IF NEW.depth > 20 THEN
            RAISE EXCEPTION 'Folder depth cannot exceed 20 levels';
        END IF;
    END IF;
    
    -- 更新最后活动时间
    NEW.last_activity_at := CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ====================
-- 创建笔记数量缓存更新函数
-- ====================

-- 更新文件夹笔记数量的函数
CREATE OR REPLACE FUNCTION update_folder_note_count()
RETURNS TRIGGER AS $$
DECLARE
    old_folder_id INTEGER;
    new_folder_id INTEGER;
BEGIN
    -- 获取旧的和新的文件夹ID
    old_folder_id := COALESCE(OLD.folder_id, TG_ARGV[0]::INTEGER);
    new_folder_id := COALESCE(NEW.folder_id, TG_ARGV[0]::INTEGER);
    
    -- 更新旧文件夹的计数
    IF old_folder_id IS NOT NULL THEN
        UPDATE document_folders 
        SET note_count_cached = (
            SELECT COUNT(*) FROM documents 
            WHERE folder_id = old_folder_id 
            AND deleted_at IS NULL
        ),
        note_count_updated_at = CURRENT_TIMESTAMP,
        last_activity_at = CURRENT_TIMESTAMP
        WHERE id = old_folder_id;
    END IF;
    
    -- 更新新文件夹的计数
    IF new_folder_id IS NOT NULL AND new_folder_id != old_folder_id THEN
        UPDATE document_folders 
        SET note_count_cached = (
            SELECT COUNT(*) FROM documents 
            WHERE folder_id = new_folder_id 
            AND deleted_at IS NULL
        ),
        note_count_updated_at = CURRENT_TIMESTAMP,
        last_activity_at = CURRENT_TIMESTAMP
        WHERE id = new_folder_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ====================
-- 创建触发器
-- ====================

-- 文件夹路径自动更新触发器
DROP TRIGGER IF EXISTS trigger_update_folder_path ON document_folders;
CREATE TRIGGER trigger_update_folder_path
    BEFORE INSERT OR UPDATE OF parent_folder_id ON document_folders
    FOR EACH ROW
    EXECUTE FUNCTION update_folder_path();

-- 文件夹笔记数量自动更新触发器
DROP TRIGGER IF EXISTS trigger_update_folder_note_count_on_document ON documents;
CREATE TRIGGER trigger_update_folder_note_count_on_document
    AFTER INSERT OR UPDATE OF folder_id OR DELETE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_folder_note_count();

-- ====================
-- 创建高性能索引
-- ====================

-- ltree路径索引 (GIST索引用于祖先查询)
DROP INDEX IF EXISTS idx_document_folders_path_gist;
CREATE INDEX idx_document_folders_path_gist ON document_folders USING GIST (path);

-- ltree路径祖先查询索引
DROP INDEX IF EXISTS idx_document_folders_path_ancestors;
CREATE INDEX idx_document_folders_path_ancestors ON document_folders (path);

-- 父文件夹查询索引
DROP INDEX IF EXISTS idx_document_folders_parent_id;
CREATE INDEX idx_document_folders_parent_id ON document_folders (parent_folder_id) WHERE parent_folder_id IS NOT NULL;

-- 所有者和可见性复合索引
DROP INDEX IF EXISTS idx_document_folders_owner_visibility;
CREATE INDEX idx_document_folders_owner_visibility ON document_folders (owner_id, visibility) WHERE deleted_at IS NULL;

-- 深度和排序复合索引
DROP INDEX IF EXISTS idx_document_folders_depth_sort;
CREATE INDEX idx_document_folders_depth_sort ON document_folders (depth, sort_order) WHERE deleted_at IS NULL;

-- 系统文件夹快速查询索引
DROP INDEX IF EXISTS idx_document_folders_system;
CREATE INDEX idx_document_folders_system ON document_folders (is_system_folder, folder_type) WHERE deleted_at IS NULL;

-- 最后活动时间索引（用于缓存失效）
DROP INDEX IF EXISTS idx_document_folders_last_activity;
CREATE INDEX idx_document_folders_last_activity ON document_folders (last_activity_at DESC) WHERE deleted_at IS NULL;

-- 笔记数量索引（用于统计查询）
DROP INDEX IF EXISTS idx_document_folders_note_count;
CREATE INDEX idx_document_folders_note_count ON document_folders (note_count_cached DESC) WHERE deleted_at IS NULL AND note_count_cached > 0;

-- ====================
-- 扩展documents表索引优化
-- ====================

-- 文件夹ID和更新时间复合索引（用于文件夹内笔记列表）
DROP INDEX IF EXISTS idx_documents_folder_updated;
CREATE INDEX idx_documents_folder_updated ON documents (folder_id, updated_at DESC) WHERE deleted_at IS NULL;

-- 文件夹ID和状态复合索引
DROP INDEX IF EXISTS idx_documents_folder_status;
CREATE INDEX idx_documents_folder_status ON documents (folder_id, status) WHERE deleted_at IS NULL;

-- 文件夹ID和类型复合索引
DROP INDEX IF EXISTS idx_documents_folder_type;
CREATE INDEX idx_documents_folder_type ON documents (folder_id, type) WHERE deleted_at IS NULL;

-- ====================
-- 创建工作笔记专用视图
-- ====================

-- 工作笔记文件夹树视图（包含统计信息）
CREATE OR REPLACE VIEW work_note_folder_tree AS
SELECT 
    df.id,
    df.name,
    df.description,
    df.parent_folder_id,
    df.path,
    df.depth,
    df.sort_order,
    df.color,
    df.icon,
    df.owner_id,
    df.visibility,
    df.folder_type,
    df.is_system_folder,
    df.note_count_cached,
    df.last_activity_at,
    df.created_by,
    df.created_at,
    df.updated_at,
    -- 计算子文件夹数量
    (SELECT COUNT(*) FROM document_folders child 
     WHERE child.parent_folder_id = df.id AND child.deleted_at IS NULL) as children_count,
    -- 获取祖先路径
    (SELECT array_agg(ancestor.id ORDER BY nlevel(ancestor.path))
     FROM document_folders ancestor 
     WHERE df.path ~ (ancestor.path::text || '.*')::lquery 
     AND ancestor.id != df.id) as ancestor_ids,
    -- 计算总深度的笔记数（包括子文件夹）
    (SELECT COUNT(*) FROM documents d 
     JOIN document_folders subf ON d.folder_id = subf.id 
     WHERE subf.path ~ (df.path::text || '.*')::lquery 
     AND d.deleted_at IS NULL) as total_notes_count
FROM document_folders df
WHERE df.deleted_at IS NULL;

-- 工作笔记文件夹权限视图
CREATE OR REPLACE VIEW work_note_folder_permissions AS
SELECT 
    df.id as folder_id,
    df.name as folder_name,
    df.path,
    df.owner_id,
    df.visibility,
    -- 所有者权限
    CASE WHEN df.owner_id = :user_id THEN 'admin' 
         ELSE NULL END as owner_permission,
    -- 协作者权限
    fc.permission_level as collaborator_permission,
    fc.granted_by as permission_granted_by,
    fc.granted_at as permission_granted_at,
    fc.expires_at as permission_expires_at,
    -- 继承的父文件夹权限
    (SELECT fc_parent.permission_level 
     FROM document_folders df_parent
     JOIN folder_collaborators fc_parent ON df_parent.id = fc_parent.folder_id
     WHERE df.path ~ (df_parent.path::text || '.*')::lquery 
     AND df_parent.id != df.id 
     AND fc_parent.user_id = :user_id
     AND (fc_parent.expires_at IS NULL OR fc_parent.expires_at > CURRENT_TIMESTAMP)
     ORDER BY nlevel(df_parent.path) DESC 
     LIMIT 1) as inherited_permission
FROM document_folders df
LEFT JOIN folder_collaborators fc ON df.id = fc.folder_id AND fc.user_id = :user_id
WHERE df.deleted_at IS NULL;

-- ====================
-- 创建数据完整性检查函数
-- ====================

-- 检查文件夹树完整性的函数
CREATE OR REPLACE FUNCTION check_folder_tree_integrity()
RETURNS TABLE(
    issue_type TEXT,
    folder_id INTEGER,
    folder_name TEXT,
    description TEXT
) AS $$
BEGIN
    -- 检查孤儿文件夹（父文件夹不存在）
    RETURN QUERY
    SELECT 
        'orphaned_folder'::TEXT,
        df.id,
        df.name,
        'Folder has non-existent parent folder'::TEXT
    FROM document_folders df
    WHERE df.parent_folder_id IS NOT NULL
    AND df.deleted_at IS NULL
    AND NOT EXISTS (
        SELECT 1 FROM document_folders parent 
        WHERE parent.id = df.parent_folder_id 
        AND parent.deleted_at IS NULL
    );
    
    -- 检查路径不一致
    RETURN QUERY
    SELECT 
        'inconsistent_path'::TEXT,
        df.id,
        df.name,
        'Folder path does not match parent-child relationship'::TEXT
    FROM document_folders df
    WHERE df.deleted_at IS NULL
    AND df.parent_folder_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM document_folders parent
        WHERE parent.id = df.parent_folder_id
        AND df.path ~ (parent.path::text || '.*')::lquery
    );
    
    -- 检查循环引用
    RETURN QUERY
    WITH RECURSIVE folder_cycle_check AS (
        SELECT id, parent_folder_id, ARRAY[id] as path_array
        FROM document_folders
        WHERE deleted_at IS NULL
        
        UNION ALL
        
        SELECT df.id, df.parent_folder_id, fcc.path_array || df.id
        FROM document_folders df
        JOIN folder_cycle_check fcc ON df.parent_folder_id = fcc.id
        WHERE df.id = ANY(fcc.path_array)
        AND df.deleted_at IS NULL
    )
    SELECT 
        'circular_reference'::TEXT,
        fcc.id,
        df.name,
        'Folder has circular parent-child reference'::TEXT
    FROM folder_cycle_check fcc
    JOIN document_folders df ON fcc.id = df.id
    WHERE array_length(fcc.path_array, 1) > 1;
    
    -- 检查笔记数量缓存不一致
    RETURN QUERY
    SELECT 
        'incorrect_note_count'::TEXT,
        df.id,
        df.name,
        format('Cached count: %s, Actual count: %s', df.note_count_cached, actual_count.count)
    FROM document_folders df
    CROSS JOIN LATERAL (
        SELECT COUNT(*) as count 
        FROM documents d 
        WHERE d.folder_id = df.id 
        AND d.deleted_at IS NULL
    ) actual_count
    WHERE df.deleted_at IS NULL
    AND df.note_count_cached != actual_count.count;
END;
$$ LANGUAGE plpgsql;

-- ====================
-- 创建维护函数
-- ====================

-- 重建所有文件夹路径的维护函数
CREATE OR REPLACE FUNCTION rebuild_folder_paths()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER := 0;
    folder_record RECORD;
BEGIN
    -- 按深度顺序更新所有文件夹路径
    FOR folder_record IN 
        SELECT id, parent_folder_id 
        FROM document_folders 
        WHERE deleted_at IS NULL 
        ORDER BY COALESCE(depth, 0), id
    LOOP
        -- 触发路径更新
        UPDATE document_folders 
        SET updated_at = CURRENT_TIMESTAMP 
        WHERE id = folder_record.id;
        
        updated_count := updated_count + 1;
    END LOOP;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- 刷新所有文件夹笔记数量缓存的函数
CREATE OR REPLACE FUNCTION refresh_all_folder_note_counts()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER := 0;
BEGIN
    UPDATE document_folders 
    SET note_count_cached = subquery.note_count,
        note_count_updated_at = CURRENT_TIMESTAMP
    FROM (
        SELECT 
            df.id,
            COUNT(d.id) as note_count
        FROM document_folders df
        LEFT JOIN documents d ON df.id = d.folder_id AND d.deleted_at IS NULL
        WHERE df.deleted_at IS NULL
        GROUP BY df.id
    ) subquery
    WHERE document_folders.id = subquery.id
    AND document_folders.note_count_cached != subquery.note_count;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- ====================
-- 创建性能优化函数
-- ====================

-- 获取文件夹子树（带性能优化）
CREATE OR REPLACE FUNCTION get_folder_subtree(root_folder_id INTEGER, max_depth INTEGER DEFAULT 10)
RETURNS TABLE(
    id INTEGER,
    name VARCHAR(255),
    parent_folder_id INTEGER,
    path ltree,
    depth INTEGER,
    note_count INTEGER,
    children_count INTEGER,
    level INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE folder_tree AS (
        -- 起始节点
        SELECT 
            df.id,
            df.name,
            df.parent_folder_id,
            df.path,
            df.depth,
            df.note_count_cached as note_count,
            0::INTEGER as children_count,
            0 as level
        FROM document_folders df
        WHERE df.id = root_folder_id
        AND df.deleted_at IS NULL
        
        UNION ALL
        
        -- 递归查找子节点
        SELECT 
            df.id,
            df.name,
            df.parent_folder_id,
            df.path,
            df.depth,
            df.note_count_cached as note_count,
            0::INTEGER as children_count,
            ft.level + 1
        FROM document_folders df
        JOIN folder_tree ft ON df.parent_folder_id = ft.id
        WHERE df.deleted_at IS NULL
        AND ft.level < max_depth
    )
    SELECT 
        ft.*,
        COALESCE(child_counts.count, 0)::INTEGER as children_count
    FROM folder_tree ft
    LEFT JOIN (
        SELECT 
            parent_folder_id,
            COUNT(*) as count
        FROM document_folders 
        WHERE deleted_at IS NULL
        GROUP BY parent_folder_id
    ) child_counts ON ft.id = child_counts.parent_folder_id
    ORDER BY ft.level, ft.name;
END;
$$ LANGUAGE plpgsql;

-- ====================
-- 初始化现有数据
-- ====================

-- 更新现有文件夹的路径和深度
DO $$
DECLARE
    folder_record RECORD;
BEGIN
    -- 为根文件夹设置路径
    UPDATE document_folders 
    SET path = text2ltree(id::text),
        depth = 0
    WHERE parent_folder_id IS NULL 
    AND deleted_at IS NULL
    AND path IS NULL;
    
    -- 为子文件夹递归设置路径（最多处理20层）
    FOR i IN 1..20 LOOP
        UPDATE document_folders child
        SET path = parent.path || text2ltree(child.id::text),
            depth = parent.depth + 1
        FROM document_folders parent
        WHERE child.parent_folder_id = parent.id
        AND child.deleted_at IS NULL
        AND parent.deleted_at IS NULL
        AND child.path IS NULL
        AND parent.path IS NOT NULL;
        
        -- 如果没有更新任何行，则退出循环
        EXIT WHEN NOT FOUND;
    END LOOP;
    
    RAISE NOTICE 'Folder paths initialization completed';
END $$;

-- 初始化文件夹笔记数量缓存
SELECT refresh_all_folder_note_counts();

-- ====================
-- 添加表注释
-- ====================

COMMENT ON COLUMN document_folders.path IS 'ltree路径，用于高效的层级查询';
COMMENT ON COLUMN document_folders.depth IS '文件夹深度，0为根文件夹';
COMMENT ON COLUMN document_folders.note_count_cached IS '文件夹内笔记数量的缓存值';
COMMENT ON COLUMN document_folders.note_count_updated_at IS '笔记数量缓存的最后更新时间';
COMMENT ON COLUMN document_folders.last_activity_at IS '文件夹最后活动时间';
COMMENT ON COLUMN document_folders.is_system_folder IS '是否为系统文件夹';
COMMENT ON COLUMN document_folders.folder_type IS '文件夹类型：regular普通，system系统，template模板，archive归档，shared共享';

COMMIT;

-- ====================
-- 迁移验证
-- ====================

-- 验证ltree扩展是否正确安装
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'ltree') THEN
        RAISE EXCEPTION 'ltree extension is not installed';
    END IF;
    RAISE NOTICE 'ltree extension verified';
END $$;

-- 验证索引是否创建成功
DO $$
DECLARE
    index_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes 
    WHERE tablename = 'document_folders' 
    AND indexname LIKE 'idx_document_folders_%';
    
    IF index_count < 7 THEN
        RAISE WARNING 'Expected at least 7 indexes on document_folders, found %', index_count;
    ELSE
        RAISE NOTICE 'All expected indexes created successfully, found % indexes', index_count;
    END IF;
END $$;

-- 验证数据完整性
DO $$
DECLARE
    issue_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO issue_count
    FROM check_folder_tree_integrity();
    
    IF issue_count > 0 THEN
        RAISE WARNING 'Found % data integrity issues', issue_count;
    ELSE
        RAISE NOTICE 'All data integrity checks passed';
    END IF;
END $$;