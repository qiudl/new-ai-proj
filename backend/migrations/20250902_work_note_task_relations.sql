-- 创建工作笔记与任务关联表
-- Migration: 20250902_work_note_task_relations

-- 创建工作笔记任务关联表
CREATE TABLE IF NOT EXISTS work_note_task_relations (
    id SERIAL PRIMARY KEY,
    work_note_id INTEGER NOT NULL,
    task_id INTEGER NOT NULL,
    relation_type VARCHAR(50) DEFAULT 'reference',  -- reference, attached, mentioned, related
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    -- 约束
    CONSTRAINT work_note_task_relations_work_note_fkey 
        FOREIGN KEY (work_note_id) REFERENCES documents(id) ON DELETE CASCADE,
    CONSTRAINT work_note_task_relations_task_fkey 
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT work_note_task_relations_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    
    -- 防止重复关联
    CONSTRAINT work_note_task_relations_unique 
        UNIQUE (work_note_id, task_id, relation_type)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_work_note_task_relations_work_note_id 
    ON work_note_task_relations(work_note_id);
CREATE INDEX IF NOT EXISTS idx_work_note_task_relations_task_id 
    ON work_note_task_relations(task_id);
CREATE INDEX IF NOT EXISTS idx_work_note_task_relations_created_at 
    ON work_note_task_relations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_work_note_task_relations_deleted_at 
    ON work_note_task_relations(deleted_at);

-- 创建更新时间触发器函数（如果不存在）
CREATE OR REPLACE FUNCTION update_work_note_task_relations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_work_note_task_relations_updated_at ON work_note_task_relations;
CREATE TRIGGER trigger_work_note_task_relations_updated_at
    BEFORE UPDATE ON work_note_task_relations
    FOR EACH ROW EXECUTE FUNCTION update_work_note_task_relations_updated_at();

-- 添加注释
COMMENT ON TABLE work_note_task_relations IS '工作笔记与任务关联关系表';
COMMENT ON COLUMN work_note_task_relations.work_note_id IS '工作笔记ID（引用documents表）';
COMMENT ON COLUMN work_note_task_relations.task_id IS '任务ID';
COMMENT ON COLUMN work_note_task_relations.relation_type IS '关联类型：reference(引用), attached(附加), mentioned(提及), related(相关)';
COMMENT ON COLUMN work_note_task_relations.created_by IS '创建关联的用户ID';
