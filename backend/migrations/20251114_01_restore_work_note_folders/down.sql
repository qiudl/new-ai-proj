-- 20251114_01_restore_work_note_folders/down.sql
-- 回滚: 删除 work_note_folders 表
-- 作者: Claude AI
-- 日期: 2025-11-14

BEGIN;

-- 删除外键约束
ALTER TABLE documents
DROP CONSTRAINT IF EXISTS documents_folder_id_fkey;

-- 删除触发器和函数
DROP TRIGGER IF EXISTS trigger_work_note_folders_updated_at ON work_note_folders;
DROP FUNCTION IF EXISTS update_work_note_folders_updated_at();

-- 删除表
DROP TABLE IF EXISTS work_note_folders CASCADE;

COMMIT;

\echo 'Rollback completed - work_note_folders table dropped';
