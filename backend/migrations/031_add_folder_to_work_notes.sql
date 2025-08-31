-- 031_add_folder_to_work_notes.sql
-- 为工作笔记添加文件夹支持

BEGIN;

-- 为work_notes表添加folder_id字段
ALTER TABLE work_notes 
ADD COLUMN IF NOT EXISTS folder_id INTEGER,
ADD CONSTRAINT work_notes_folder_fk 
    FOREIGN KEY (folder_id) 
    REFERENCES document_folders(id) 
    ON DELETE SET NULL;

-- 创建索引以优化按文件夹查询
CREATE INDEX IF NOT EXISTS idx_work_notes_folder_id 
ON work_notes(folder_id) 
WHERE folder_id IS NOT NULL;

-- 创建复合索引优化文件夹内排序查询
CREATE INDEX IF NOT EXISTS idx_work_notes_folder_updated 
ON work_notes(folder_id, updated_at DESC) 
WHERE folder_id IS NOT NULL AND deleted_at IS NULL;

-- 更新文件夹笔记计数的触发器
CREATE OR REPLACE FUNCTION update_folder_note_count_on_work_note_change()
RETURNS TRIGGER AS $$
BEGIN
    -- 处理INSERT或UPDATE时的新文件夹
    IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.folder_id IS NOT NULL THEN
        UPDATE document_folders 
        SET note_count_cached = (
            SELECT COUNT(*) 
            FROM work_notes 
            WHERE folder_id = NEW.folder_id 
            AND deleted_at IS NULL
        ),
        note_count_updated_at = CURRENT_TIMESTAMP,
        last_activity_at = CURRENT_TIMESTAMP
        WHERE id = NEW.folder_id;
    END IF;
    
    -- 处理UPDATE或DELETE时的旧文件夹
    IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.folder_id IS NOT NULL 
       AND (TG_OP = 'DELETE' OR OLD.folder_id != COALESCE(NEW.folder_id, -1)) THEN
        UPDATE document_folders 
        SET note_count_cached = (
            SELECT COUNT(*) 
            FROM work_notes 
            WHERE folder_id = OLD.folder_id 
            AND deleted_at IS NULL
        ),
        note_count_updated_at = CURRENT_TIMESTAMP,
        last_activity_at = CURRENT_TIMESTAMP
        WHERE id = OLD.folder_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS work_notes_folder_count_trigger ON work_notes;
CREATE TRIGGER work_notes_folder_count_trigger
AFTER INSERT OR UPDATE OF folder_id OR DELETE ON work_notes
FOR EACH ROW
EXECUTE FUNCTION update_folder_note_count_on_work_note_change();

-- 创建默认系统文件夹（如果不存在）
INSERT INTO document_folders (
    name, 
    description, 
    owner_id, 
    visibility, 
    is_system_folder, 
    folder_type,
    created_by,
    created_at,
    updated_at
) 
SELECT 
    '未分类笔记',
    '系统默认文件夹，用于存放未分类的工作笔记',
    1, -- 默认管理员用户
    'private',
    true,
    'system',
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM document_folders 
    WHERE name = '未分类笔记' 
    AND is_system_folder = true
);

-- 添加注释
COMMENT ON COLUMN work_notes.folder_id IS '所属文件夹ID，关联到document_folders表';

COMMIT;
