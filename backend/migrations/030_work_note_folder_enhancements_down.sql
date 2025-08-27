-- 030_work_note_folder_enhancements_down.sql
-- 工作笔记分类管理功能数据模型扩展回滚脚本

BEGIN;

-- ====================
-- 删除维护函数
-- ====================
DROP FUNCTION IF EXISTS get_folder_subtree(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS refresh_all_folder_note_counts();
DROP FUNCTION IF EXISTS rebuild_folder_paths();
DROP FUNCTION IF EXISTS check_folder_tree_integrity();

-- ====================
-- 删除视图
-- ====================
DROP VIEW IF EXISTS work_note_folder_permissions;
DROP VIEW IF EXISTS work_note_folder_tree;

-- ====================
-- 删除索引
-- ====================
DROP INDEX IF EXISTS idx_documents_folder_type;
DROP INDEX IF EXISTS idx_documents_folder_status;
DROP INDEX IF EXISTS idx_documents_folder_updated;
DROP INDEX IF EXISTS idx_document_folders_note_count;
DROP INDEX IF EXISTS idx_document_folders_last_activity;
DROP INDEX IF EXISTS idx_document_folders_system;
DROP INDEX IF EXISTS idx_document_folders_depth_sort;
DROP INDEX IF EXISTS idx_document_folders_owner_visibility;
DROP INDEX IF EXISTS idx_document_folders_parent_id;
DROP INDEX IF EXISTS idx_document_folders_path_ancestors;
DROP INDEX IF EXISTS idx_document_folders_path_gist;

-- ====================
-- 删除触发器
-- ====================
DROP TRIGGER IF EXISTS trigger_update_folder_note_count_on_document ON documents;
DROP TRIGGER IF EXISTS trigger_update_folder_path ON document_folders;

-- ====================
-- 删除函数
-- ====================
DROP FUNCTION IF EXISTS update_folder_note_count();
DROP FUNCTION IF EXISTS update_folder_path();

-- ====================
-- 移除表字段约束
-- ====================
ALTER TABLE document_folders 
DROP CONSTRAINT IF EXISTS document_folders_depth_check;

ALTER TABLE document_folders 
DROP CONSTRAINT IF EXISTS document_folders_type_check;

-- ====================
-- 移除扩展字段
-- ====================
ALTER TABLE document_folders 
DROP COLUMN IF EXISTS folder_type,
DROP COLUMN IF EXISTS is_system_folder,
DROP COLUMN IF EXISTS last_activity_at,
DROP COLUMN IF EXISTS note_count_updated_at,
DROP COLUMN IF EXISTS note_count_cached,
DROP COLUMN IF EXISTS depth,
DROP COLUMN IF EXISTS path;

-- ====================
-- 可选：移除扩展（谨慎操作）
-- ====================
-- 注意：这些扩展可能被其他功能使用，请谨慎执行
-- DROP EXTENSION IF EXISTS btree_gist;
-- DROP EXTENSION IF EXISTS ltree;

COMMIT;

-- ====================
-- 回滚验证
-- ====================
DO $$
BEGIN
    -- 验证字段是否已删除
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_folders' 
        AND column_name = 'path'
    ) THEN
        RAISE WARNING 'path column was not removed from document_folders';
    ELSE
        RAISE NOTICE 'Successfully removed extended columns from document_folders';
    END IF;
    
    -- 验证索引是否已删除
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'document_folders' 
        AND indexname = 'idx_document_folders_path_gist'
    ) THEN
        RAISE WARNING 'Some indexes were not removed';
    ELSE
        RAISE NOTICE 'Successfully removed all extended indexes';
    END IF;
END $$;