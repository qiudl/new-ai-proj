-- 创建工作笔记文件夹表
-- Create work_note_folders table

CREATE TABLE IF NOT EXISTS work_note_folders (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id INTEGER REFERENCES work_note_folders(id) ON DELETE CASCADE,
    owner_id INTEGER NOT NULL,
    project_id INTEGER,
    visibility VARCHAR(20) NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'team', 'public')),
    color VARCHAR(7), -- 十六进制颜色值，如 #FF0000
    icon VARCHAR(50), -- 图标名称或emoji
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- 创建索引
    CONSTRAINT work_note_folders_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT work_note_folders_visibility_valid CHECK (visibility IN ('private', 'team', 'public'))
);

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_work_note_folders_owner_id ON work_note_folders(owner_id);
CREATE INDEX IF NOT EXISTS idx_work_note_folders_parent_id ON work_note_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_work_note_folders_project_id ON work_note_folders(project_id);
CREATE INDEX IF NOT EXISTS idx_work_note_folders_visibility ON work_note_folders(visibility);
CREATE INDEX IF NOT EXISTS idx_work_note_folders_deleted_at ON work_note_folders(deleted_at);
CREATE INDEX IF NOT EXISTS idx_work_note_folders_sort_order ON work_note_folders(sort_order);

-- 创建触发器以自动更新 updated_at 字段
CREATE OR REPLACE FUNCTION update_work_note_folders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_work_note_folders_updated_at
    BEFORE UPDATE ON work_note_folders
    FOR EACH ROW
    EXECUTE FUNCTION update_work_note_folders_updated_at();

-- 添加注释
COMMENT ON TABLE work_note_folders IS '工作笔记文件夹表';
COMMENT ON COLUMN work_note_folders.id IS '文件夹ID';
COMMENT ON COLUMN work_note_folders.name IS '文件夹名称';
COMMENT ON COLUMN work_note_folders.description IS '文件夹描述';
COMMENT ON COLUMN work_note_folders.parent_id IS '父文件夹ID';
COMMENT ON COLUMN work_note_folders.owner_id IS '所有者用户ID';
COMMENT ON COLUMN work_note_folders.project_id IS '关联项目ID';
COMMENT ON COLUMN work_note_folders.visibility IS '可见性：private, team, public';
COMMENT ON COLUMN work_note_folders.color IS '文件夹颜色（十六进制）';
COMMENT ON COLUMN work_note_folders.icon IS '文件夹图标';
COMMENT ON COLUMN work_note_folders.sort_order IS '排序字段';
COMMENT ON COLUMN work_note_folders.created_by IS '创建者用户ID';
COMMENT ON COLUMN work_note_folders.created_at IS '创建时间';
COMMENT ON COLUMN work_note_folders.updated_at IS '更新时间';
COMMENT ON COLUMN work_note_folders.deleted_at IS '删除时间（软删除）';