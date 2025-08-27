-- ====================================================================================
-- 文件: 20250827_02_folder_unified_init_down.sql  
-- 描述: 统一文件夹系统初始化迁移回滚文件
-- 版本: v1.0.0
-- 创建时间: 2025-08-27
-- 说明: 此文件用于回滚 20250827_02_folder_unified_init.sql 的所有更改
-- ====================================================================================

BEGIN;

-- ====================
-- 删除视图
-- ====================

DROP VIEW IF EXISTS document_folder_tree CASCADE;
DROP VIEW IF EXISTS note_folder_tree CASCADE;

-- ====================
-- 删除触发器
-- ====================

DROP TRIGGER IF EXISTS trigger_update_document_folder_path ON document_folders;
DROP TRIGGER IF EXISTS trigger_document_folder_move ON document_folders;
DROP TRIGGER IF EXISTS trigger_update_note_folder_path ON note_folders;
DROP TRIGGER IF EXISTS trigger_note_folder_move ON note_folders;

-- ====================
-- 删除函数
-- ====================

DROP FUNCTION IF EXISTS update_document_folder_path() CASCADE;
DROP FUNCTION IF EXISTS update_note_folder_path() CASCADE;
DROP FUNCTION IF EXISTS update_document_folder_children_paths(INTEGER, ltree, ltree) CASCADE;
DROP FUNCTION IF EXISTS update_note_folder_children_paths(INTEGER, ltree, ltree) CASCADE;
DROP FUNCTION IF EXISTS document_folder_move_trigger() CASCADE;
DROP FUNCTION IF EXISTS note_folder_move_trigger() CASCADE;
DROP FUNCTION IF EXISTS update_document_folder_counts() CASCADE;
DROP FUNCTION IF EXISTS update_note_folder_counts() CASCADE;

-- ====================
-- 删除索引
-- ====================

DROP INDEX CONCURRENTLY IF EXISTS idx_document_folders_path;
DROP INDEX CONCURRENTLY IF EXISTS idx_document_folders_parent_id;
DROP INDEX CONCURRENTLY IF EXISTS idx_document_folders_owner_visibility;
DROP INDEX CONCURRENTLY IF EXISTS idx_document_folders_type_system;
DROP INDEX CONCURRENTLY IF EXISTS idx_document_folders_activity;
DROP INDEX CONCURRENTLY IF EXISTS idx_document_folders_path_depth;

DROP INDEX CONCURRENTLY IF EXISTS idx_note_folders_path;
DROP INDEX CONCURRENTLY IF EXISTS idx_note_folders_parent_id;
DROP INDEX CONCURRENTLY IF EXISTS idx_note_folders_owner_visibility;
DROP INDEX CONCURRENTLY IF EXISTS idx_note_folders_type_system;
DROP INDEX CONCURRENTLY IF EXISTS idx_note_folders_activity;
DROP INDEX CONCURRENTLY IF EXISTS idx_note_folders_path_depth;

-- ====================
-- 删除约束
-- ====================

ALTER TABLE document_folders DROP CONSTRAINT IF EXISTS document_folders_type_check;
ALTER TABLE document_folders DROP CONSTRAINT IF EXISTS document_folders_depth_check;
ALTER TABLE document_folders DROP CONSTRAINT IF EXISTS document_folders_visibility_check;

ALTER TABLE note_folders DROP CONSTRAINT IF EXISTS note_folders_depth_check;

-- ====================
-- 删除note_folders表
-- ====================

-- 注意: 这会删除整个note_folders表及其所有数据
-- 在生产环境中请谨慎执行

DROP TABLE IF EXISTS note_folders CASCADE;

-- ====================
-- 移除document_folders表的扩展字段
-- ====================

-- 注意: 这些操作会删除相应列的数据
-- 在生产环境中请先备份数据

DO $$
BEGIN
    -- 移除路径字段
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_folders' AND column_name = 'path'
    ) THEN
        ALTER TABLE document_folders DROP COLUMN path;
    END IF;
    
    -- 移除深度字段
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_folders' AND column_name = 'depth'
    ) THEN
        ALTER TABLE document_folders DROP COLUMN depth;
    END IF;
    
    -- 移除文档计数缓存字段
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_folders' AND column_name = 'document_count_cached'
    ) THEN
        ALTER TABLE document_folders DROP COLUMN document_count_cached;
    END IF;
    
    -- 移除计数更新时间字段
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_folders' AND column_name = 'count_updated_at'
    ) THEN
        ALTER TABLE document_folders DROP COLUMN count_updated_at;
    END IF;
    
    -- 移除最后活动时间字段
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_folders' AND column_name = 'last_activity_at'
    ) THEN
        ALTER TABLE document_folders DROP COLUMN last_activity_at;
    END IF;
    
    -- 移除系统文件夹标识
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_folders' AND column_name = 'is_system_folder'
    ) THEN
        ALTER TABLE document_folders DROP COLUMN is_system_folder;
    END IF;
    
    -- 移除文件夹类型字段
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_folders' AND column_name = 'folder_type'
    ) THEN
        ALTER TABLE document_folders DROP COLUMN folder_type;
    END IF;
END $$;

-- ====================
-- 注意事项
-- ====================

-- 此回滚脚本不会删除PostgreSQL扩展 (ltree, btree_gist, unaccent)
-- 因为其他功能可能依赖这些扩展
-- 如需完全清理，可手动执行：
-- DROP EXTENSION IF EXISTS ltree;
-- DROP EXTENSION IF EXISTS btree_gist;  
-- DROP EXTENSION IF EXISTS unaccent;

COMMIT;

-- ====================
-- 回滚完成提示
-- ====================

DO $$
BEGIN
    RAISE NOTICE '=== 文件夹系统初始化回滚完成 ===';
    RAISE NOTICE '已删除: note_folders表';
    RAISE NOTICE '已移除: document_folders扩展字段';
    RAISE NOTICE '已删除: 所有相关索引和触发器';
    RAISE NOTICE '已删除: 所有相关函数和视图';
    RAISE NOTICE '注意: PostgreSQL扩展 (ltree, btree_gist, unaccent) 保留';
    RAISE NOTICE '如需完全清理扩展，请手动执行相应的 DROP EXTENSION 命令';
END $$;
