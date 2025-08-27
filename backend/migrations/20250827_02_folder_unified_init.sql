-- ====================================================================================
-- 文件: 20250827_02_folder_unified_init.sql  
-- 描述: 统一文件夹系统初始化迁移 - 确保 document_folders 和 work_note_folders 的兼容性
-- 版本: v1.0.0
-- 创建时间: 2025-08-27
-- ====================================================================================

BEGIN;

-- ====================
-- 确保必要的PostgreSQL扩展已启用
-- ====================

-- ltree扩展 - 用于高效的层级结构查询
CREATE EXTENSION IF NOT EXISTS ltree;

-- btree_gist扩展 - 用于复合索引优化
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- unaccent扩展 - 用于搜索优化
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ====================
-- 验证document_folders表结构
-- ====================

-- 检查document_folders表是否存在必要字段，如不存在则添加
DO $$
BEGIN
    -- 添加ltree路径字段（如果不存在）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_folders' AND column_name = 'path'
    ) THEN
        ALTER TABLE document_folders ADD COLUMN path ltree;
    END IF;
    
    -- 添加深度字段（如果不存在）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_folders' AND column_name = 'depth'
    ) THEN
        ALTER TABLE document_folders ADD COLUMN depth INTEGER DEFAULT 0;
    END IF;
    
    -- 添加文档计数缓存字段（如果不存在）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_folders' AND column_name = 'document_count_cached'
    ) THEN
        ALTER TABLE document_folders ADD COLUMN document_count_cached INTEGER DEFAULT 0;
    END IF;
    
    -- 添加计数更新时间字段（如果不存在）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_folders' AND column_name = 'count_updated_at'
    ) THEN
        ALTER TABLE document_folders ADD COLUMN count_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
    
    -- 添加最后活动时间字段（如果不存在）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_folders' AND column_name = 'last_activity_at'
    ) THEN
        ALTER TABLE document_folders ADD COLUMN last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
    
    -- 添加系统文件夹标识（如果不存在）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_folders' AND column_name = 'is_system_folder'
    ) THEN
        ALTER TABLE document_folders ADD COLUMN is_system_folder BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- 添加文件夹类型字段（如果不存在）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_folders' AND column_name = 'folder_type'
    ) THEN
        ALTER TABLE document_folders ADD COLUMN folder_type VARCHAR(50) DEFAULT 'regular';
    END IF;
END $$;

-- ====================
-- 创建/验证note_folders表（兼容WorkNoteFolder）
-- ====================

-- 创建note_folders表（如果不存在）
-- 这个表将作为WorkNoteFolder的主表
CREATE TABLE IF NOT EXISTS note_folders (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_folder_id INTEGER REFERENCES note_folders(id) ON DELETE SET NULL,
    
    -- 层级结构字段
    path ltree NOT NULL,
    depth INTEGER DEFAULT 0,
    
    -- 权限和可见性
    owner_id INTEGER NOT NULL,
    visibility VARCHAR(20) DEFAULT 'team' CHECK (visibility IN ('private', 'team', 'public')),
    
    -- 显示属性
    color VARCHAR(20),
    icon VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    
    -- 类型和系统标识
    folder_type VARCHAR(50) DEFAULT 'regular' CHECK (folder_type IN ('regular', 'system', 'template', 'archive', 'shared')),
    is_system_folder BOOLEAN DEFAULT FALSE,
    
    -- 统计和缓存字段
    note_count_cached INTEGER DEFAULT 0,
    note_count_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 审计字段
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- ====================
-- 添加约束和索引
-- ====================

-- 为document_folders添加约束（如果不存在）
DO $$
BEGIN
    -- 文件夹类型约束
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'document_folders_type_check'
    ) THEN
        ALTER TABLE document_folders 
        ADD CONSTRAINT document_folders_type_check 
        CHECK (folder_type IN ('regular', 'system', 'template', 'archive', 'shared'));
    END IF;
    
    -- 深度约束
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'document_folders_depth_check'
    ) THEN
        ALTER TABLE document_folders 
        ADD CONSTRAINT document_folders_depth_check 
        CHECK (depth >= 0 AND depth <= 20);
    END IF;
    
    -- 可见性约束
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'document_folders_visibility_check'
    ) THEN
        ALTER TABLE document_folders 
        ADD CONSTRAINT document_folders_visibility_check 
        CHECK (visibility IN ('private', 'team', 'public'));
    END IF;
END $$;

-- 为note_folders添加约束
ALTER TABLE note_folders 
ADD CONSTRAINT IF NOT EXISTS note_folders_depth_check 
    CHECK (depth >= 0 AND depth <= 20);

-- ====================
-- 创建高性能索引
-- ====================

-- document_folders索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_folders_path 
    ON document_folders USING GIST (path);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_folders_parent_id 
    ON document_folders (parent_folder_id) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_folders_owner_visibility 
    ON document_folders (owner_id, visibility) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_folders_type_system 
    ON document_folders (folder_type, is_system_folder) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_folders_activity 
    ON document_folders (last_activity_at DESC) WHERE deleted_at IS NULL;

-- note_folders索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_note_folders_path 
    ON note_folders USING GIST (path);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_note_folders_parent_id 
    ON note_folders (parent_folder_id) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_note_folders_owner_visibility 
    ON note_folders (owner_id, visibility) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_note_folders_type_system 
    ON note_folders (folder_type, is_system_folder) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_note_folders_activity 
    ON note_folders (last_activity_at DESC) WHERE deleted_at IS NULL;

-- 复合索引用于层级查询优化
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_note_folders_path_depth 
    ON note_folders USING GIST (path, depth) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_folders_path_depth 
    ON document_folders USING GIST (path, depth) WHERE deleted_at IS NULL;

-- ====================
-- 创建ltree路径更新函数
-- ====================

-- 为document_folders创建路径更新函数
CREATE OR REPLACE FUNCTION update_document_folder_path() 
RETURNS TRIGGER AS $$
BEGIN
    -- 如果是根文件夹
    IF NEW.parent_folder_id IS NULL THEN
        NEW.path = NEW.id::text::ltree;
        NEW.depth = 0;
    ELSE
        -- 获取父文件夹的路径和深度
        SELECT (path::text || '.' || NEW.id::text)::ltree, depth + 1
        INTO NEW.path, NEW.depth
        FROM document_folders
        WHERE id = NEW.parent_folder_id AND deleted_at IS NULL;
        
        -- 如果父文件夹不存在，抛出异常
        IF NEW.path IS NULL THEN
            RAISE EXCEPTION 'Parent folder with id % does not exist or is deleted', NEW.parent_folder_id;
        END IF;
        
        -- 检查深度限制
        IF NEW.depth > 20 THEN
            RAISE EXCEPTION 'Folder nesting too deep (max 20 levels allowed)';
        END IF;
    END IF;
    
    -- 更新时间戳
    NEW.updated_at = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为note_folders创建路径更新函数
CREATE OR REPLACE FUNCTION update_note_folder_path() 
RETURNS TRIGGER AS $$
BEGIN
    -- 如果是根文件夹
    IF NEW.parent_folder_id IS NULL THEN
        NEW.path = NEW.id::text::ltree;
        NEW.depth = 0;
    ELSE
        -- 获取父文件夹的路径和深度
        SELECT (path::text || '.' || NEW.id::text)::ltree, depth + 1
        INTO NEW.path, NEW.depth
        FROM note_folders
        WHERE id = NEW.parent_folder_id AND deleted_at IS NULL;
        
        -- 如果父文件夹不存在，抛出异常
        IF NEW.path IS NULL THEN
            RAISE EXCEPTION 'Parent folder with id % does not exist or is deleted', NEW.parent_folder_id;
        END IF;
        
        -- 检查深度限制
        IF NEW.depth > 20 THEN
            RAISE EXCEPTION 'Folder nesting too deep (max 20 levels allowed)';
        END IF;
    END IF;
    
    -- 更新时间戳
    NEW.updated_at = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ====================
-- 创建子文件夹路径更新函数
-- ====================

-- 更新document_folders子文件夹路径的函数
CREATE OR REPLACE FUNCTION update_document_folder_children_paths(parent_id INTEGER, old_path ltree, new_path ltree)
RETURNS void AS $$
BEGIN
    -- 递归更新所有子文件夹的路径
    UPDATE document_folders 
    SET 
        path = (new_path::text || subpath(path, nlevel(old_path))::text)::ltree,
        depth = nlevel((new_path::text || subpath(path, nlevel(old_path))::text)::ltree) - 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE path <@ old_path AND id != parent_id AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- 更新note_folders子文件夹路径的函数
CREATE OR REPLACE FUNCTION update_note_folder_children_paths(parent_id INTEGER, old_path ltree, new_path ltree)
RETURNS void AS $$
BEGIN
    -- 递归更新所有子文件夹的路径
    UPDATE note_folders 
    SET 
        path = (new_path::text || subpath(path, nlevel(old_path))::text)::ltree,
        depth = nlevel((new_path::text || subpath(path, nlevel(old_path))::text)::ltree) - 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE path <@ old_path AND id != parent_id AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- ====================
-- 创建触发器
-- ====================

-- document_folders触发器
DROP TRIGGER IF EXISTS trigger_update_document_folder_path ON document_folders;
CREATE TRIGGER trigger_update_document_folder_path
    BEFORE INSERT OR UPDATE OF parent_folder_id ON document_folders
    FOR EACH ROW
    EXECUTE FUNCTION update_document_folder_path();

-- document_folders移动触发器（处理路径变更）
CREATE OR REPLACE FUNCTION document_folder_move_trigger()
RETURNS TRIGGER AS $$
DECLARE
    old_path ltree;
BEGIN
    -- 只在UPDATE且parent_folder_id发生变化时执行
    IF TG_OP = 'UPDATE' AND (OLD.parent_folder_id IS DISTINCT FROM NEW.parent_folder_id) THEN
        old_path := OLD.path;
        
        -- 更新所有子文件夹的路径
        PERFORM update_document_folder_children_paths(NEW.id, old_path, NEW.path);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_document_folder_move ON document_folders;
CREATE TRIGGER trigger_document_folder_move
    AFTER UPDATE OF parent_folder_id ON document_folders
    FOR EACH ROW
    EXECUTE FUNCTION document_folder_move_trigger();

-- note_folders触发器
DROP TRIGGER IF EXISTS trigger_update_note_folder_path ON note_folders;
CREATE TRIGGER trigger_update_note_folder_path
    BEFORE INSERT OR UPDATE OF parent_folder_id ON note_folders
    FOR EACH ROW
    EXECUTE FUNCTION update_note_folder_path();

-- note_folders移动触发器（处理路径变更）
CREATE OR REPLACE FUNCTION note_folder_move_trigger()
RETURNS TRIGGER AS $$
DECLARE
    old_path ltree;
BEGIN
    -- 只在UPDATE且parent_folder_id发生变化时执行
    IF TG_OP = 'UPDATE' AND (OLD.parent_folder_id IS DISTINCT FROM NEW.parent_folder_id) THEN
        old_path := OLD.path;
        
        -- 更新所有子文件夹的路径
        PERFORM update_note_folder_children_paths(NEW.id, old_path, NEW.path);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_note_folder_move ON note_folders;
CREATE TRIGGER trigger_note_folder_move
    AFTER UPDATE OF parent_folder_id ON note_folders
    FOR EACH ROW
    EXECUTE FUNCTION note_folder_move_trigger();

-- ====================
-- 创建计数更新触发器
-- ====================

-- document_folders计数更新函数
CREATE OR REPLACE FUNCTION update_document_folder_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- 更新文档计数缓存
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        IF NEW.parent_folder_id IS NOT NULL THEN
            UPDATE document_folders 
            SET 
                document_count_cached = (
                    SELECT COUNT(*) 
                    FROM documents d 
                    WHERE d.folder_id = NEW.parent_folder_id AND d.deleted_at IS NULL
                ),
                count_updated_at = CURRENT_TIMESTAMP,
                last_activity_at = CURRENT_TIMESTAMP
            WHERE id = NEW.parent_folder_id;
        END IF;
    END IF;
    
    IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
        IF OLD.parent_folder_id IS NOT NULL THEN
            UPDATE document_folders 
            SET 
                document_count_cached = (
                    SELECT COUNT(*) 
                    FROM documents d 
                    WHERE d.folder_id = OLD.parent_folder_id AND d.deleted_at IS NULL
                ),
                count_updated_at = CURRENT_TIMESTAMP
            WHERE id = OLD.parent_folder_id;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- note_folders计数更新函数
CREATE OR REPLACE FUNCTION update_note_folder_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- 更新笔记计数缓存 (假设有work_notes表)
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        IF NEW.folder_id IS NOT NULL THEN
            UPDATE note_folders 
            SET 
                note_count_cached = (
                    SELECT COUNT(*) 
                    FROM work_notes wn 
                    WHERE wn.folder_id = NEW.folder_id AND wn.deleted_at IS NULL
                ),
                note_count_updated_at = CURRENT_TIMESTAMP,
                last_activity_at = CURRENT_TIMESTAMP
            WHERE id = NEW.folder_id;
        END IF;
    END IF;
    
    IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
        IF OLD.folder_id IS NOT NULL THEN
            UPDATE note_folders 
            SET 
                note_count_cached = (
                    SELECT COUNT(*) 
                    FROM work_notes wn 
                    WHERE wn.folder_id = OLD.folder_id AND wn.deleted_at IS NULL
                ),
                note_count_updated_at = CURRENT_TIMESTAMP
            WHERE id = OLD.folder_id;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ====================
-- 创建实用视图
-- ====================

-- document_folders树形结构视图
CREATE OR REPLACE VIEW document_folder_tree AS
WITH RECURSIVE folder_tree AS (
    -- 根文件夹
    SELECT 
        id,
        name,
        description,
        parent_folder_id,
        owner_id,
        visibility,
        path,
        depth,
        folder_type,
        is_system_folder,
        document_count_cached,
        created_at,
        updated_at,
        0 as level,
        ARRAY[id] as path_array
    FROM document_folders
    WHERE parent_folder_id IS NULL AND deleted_at IS NULL
    
    UNION ALL
    
    -- 子文件夹
    SELECT 
        df.id,
        df.name,
        df.description,
        df.parent_folder_id,
        df.owner_id,
        df.visibility,
        df.path,
        df.depth,
        df.folder_type,
        df.is_system_folder,
        df.document_count_cached,
        df.created_at,
        df.updated_at,
        ft.level + 1,
        ft.path_array || df.id
    FROM document_folders df
    JOIN folder_tree ft ON df.parent_folder_id = ft.id
    WHERE df.deleted_at IS NULL
)
SELECT * FROM folder_tree;

-- note_folders树形结构视图
CREATE OR REPLACE VIEW note_folder_tree AS
WITH RECURSIVE folder_tree AS (
    -- 根文件夹
    SELECT 
        id,
        name,
        description,
        parent_folder_id,
        owner_id,
        visibility,
        path,
        depth,
        folder_type,
        is_system_folder,
        note_count_cached,
        created_at,
        updated_at,
        0 as level,
        ARRAY[id] as path_array
    FROM note_folders
    WHERE parent_folder_id IS NULL AND deleted_at IS NULL
    
    UNION ALL
    
    -- 子文件夹
    SELECT 
        nf.id,
        nf.name,
        nf.description,
        nf.parent_folder_id,
        nf.owner_id,
        nf.visibility,
        nf.path,
        nf.depth,
        nf.folder_type,
        nf.is_system_folder,
        nf.note_count_cached,
        nf.created_at,
        nf.updated_at,
        ft.level + 1,
        ft.path_array || nf.id
    FROM note_folders nf
    JOIN folder_tree ft ON nf.parent_folder_id = ft.id
    WHERE nf.deleted_at IS NULL
)
SELECT * FROM folder_tree;

-- ====================
-- 数据完整性修复
-- ====================

-- 修复document_folders中缺失的路径数据
DO $$
DECLARE
    folder_record RECORD;
BEGIN
    -- 首先处理根文件夹
    UPDATE document_folders 
    SET 
        path = id::text::ltree,
        depth = 0
    WHERE parent_folder_id IS NULL AND (path IS NULL OR path = '') AND deleted_at IS NULL;
    
    -- 然后逐级处理子文件夹
    FOR i IN 1..20 LOOP
        UPDATE document_folders 
        SET 
            path = (p.path::text || '.' || document_folders.id::text)::ltree,
            depth = p.depth + 1
        FROM document_folders p
        WHERE document_folders.parent_folder_id = p.id 
            AND p.path IS NOT NULL 
            AND p.path != ''
            AND (document_folders.path IS NULL OR document_folders.path = '')
            AND document_folders.deleted_at IS NULL
            AND p.deleted_at IS NULL;
        
        -- 如果没有更新任何记录，退出循环
        IF NOT FOUND THEN
            EXIT;
        END IF;
    END LOOP;
END $$;

-- 修复note_folders中缺失的路径数据（类似逻辑）
DO $$
DECLARE
    folder_record RECORD;
BEGIN
    -- 首先处理根文件夹
    UPDATE note_folders 
    SET 
        path = id::text::ltree,
        depth = 0
    WHERE parent_folder_id IS NULL AND (path IS NULL OR path = '') AND deleted_at IS NULL;
    
    -- 然后逐级处理子文件夹
    FOR i IN 1..20 LOOP
        UPDATE note_folders 
        SET 
            path = (p.path::text || '.' || note_folders.id::text)::ltree,
            depth = p.depth + 1
        FROM note_folders p
        WHERE note_folders.parent_folder_id = p.id 
            AND p.path IS NOT NULL 
            AND p.path != ''
            AND (note_folders.path IS NULL OR note_folders.path = '')
            AND note_folders.deleted_at IS NULL
            AND p.deleted_at IS NULL;
        
        -- 如果没有更新任何记录，退出循环
        IF NOT FOUND THEN
            EXIT;
        END IF;
    END LOOP;
END $$;

-- ====================
-- 创建初始系统文件夹
-- ====================

-- 为note_folders创建默认系统文件夹（如果不存在）
INSERT INTO note_folders (name, description, owner_id, visibility, folder_type, is_system_folder, created_by, path, depth)
SELECT 
    'Default Notes',
    'Default folder for work notes',
    1, -- 假设admin用户ID为1
    'team',
    'system',
    TRUE,
    1,
    '1'::ltree,
    0
WHERE NOT EXISTS (
    SELECT 1 FROM note_folders WHERE name = 'Default Notes' AND is_system_folder = TRUE AND deleted_at IS NULL
);

-- ====================
-- 提交事务
-- ====================

COMMIT;

-- ====================
-- 验证脚本执行结果
-- ====================

-- 输出执行结果统计
DO $$
DECLARE
    doc_folder_count INTEGER;
    note_folder_count INTEGER;
    doc_folder_with_path INTEGER;
    note_folder_with_path INTEGER;
BEGIN
    SELECT COUNT(*) INTO doc_folder_count FROM document_folders WHERE deleted_at IS NULL;
    SELECT COUNT(*) INTO note_folder_count FROM note_folders WHERE deleted_at IS NULL;
    SELECT COUNT(*) INTO doc_folder_with_path FROM document_folders WHERE path IS NOT NULL AND path != '' AND deleted_at IS NULL;
    SELECT COUNT(*) INTO note_folder_with_path FROM note_folders WHERE path IS NOT NULL AND path != '' AND deleted_at IS NULL;
    
    RAISE NOTICE '=== 文件夹系统初始化完成 ===';
    RAISE NOTICE 'Document Folders: % (% with path)', doc_folder_count, doc_folder_with_path;
    RAISE NOTICE 'Note Folders: % (% with path)', note_folder_count, note_folder_with_path;
    RAISE NOTICE '扩展已启用: ltree, btree_gist, unaccent';
    RAISE NOTICE '索引已创建: 路径索引, 复合索引, 性能索引';
    RAISE NOTICE '触发器已激活: 路径自动更新, 计数缓存更新';
    RAISE NOTICE '视图已创建: 树形结构视图';
END $$;
