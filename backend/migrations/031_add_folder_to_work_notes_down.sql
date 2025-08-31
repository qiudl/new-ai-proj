-- 031_add_folder_to_work_notes_down.sql
-- 回滚工作笔记文件夹支持

BEGIN;

-- 删除触发器
DROP TRIGGER IF EXISTS work_notes_folder_count_trigger ON work_notes;

-- 删除函数
DROP FUNCTION IF EXISTS update_folder_note_count_on_work_note_change();

-- 删除索引
DROP INDEX IF EXISTS idx_work_notes_folder_updated;
DROP INDEX IF EXISTS idx_work_notes_folder_id;

-- 删除外键约束和字段
ALTER TABLE work_notes 
DROP CONSTRAINT IF EXISTS work_notes_folder_fk,
DROP COLUMN IF EXISTS folder_id;

-- 删除系统文件夹（可选，需谨慎）
-- DELETE FROM document_folders WHERE name = '未分类笔记' AND is_system_folder = true;

COMMIT;
