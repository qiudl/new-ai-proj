-- 创建任务与关键结果关联表
CREATE TABLE IF NOT EXISTS task_key_result_associations (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL,
    key_result_id INTEGER NOT NULL,
    weight DECIMAL(5,2) DEFAULT 100.00 CHECK (weight >= 0 AND weight <= 100),
    sync_mode VARCHAR(20) DEFAULT 'auto' CHECK (sync_mode IN ('auto', 'manual')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    -- 外键约束
    CONSTRAINT fk_task_kr_task_id FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_task_kr_key_result_id FOREIGN KEY (key_result_id) REFERENCES okr_key_results(id) ON DELETE CASCADE,
    
    -- 唯一约束：同一个任务不能重复关联同一个关键结果
    CONSTRAINT uk_task_key_result UNIQUE (task_id, key_result_id, deleted_at)
);

-- 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_task_kr_task_id ON task_key_result_associations(task_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_task_kr_key_result_id ON task_key_result_associations(key_result_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_task_kr_sync_mode ON task_key_result_associations(sync_mode) WHERE deleted_at IS NULL;

-- 创建触发器函数：自动更新 updated_at
CREATE OR REPLACE FUNCTION update_task_kr_associations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_update_task_kr_associations_updated_at ON task_key_result_associations;
CREATE TRIGGER trigger_update_task_kr_associations_updated_at
    BEFORE UPDATE ON task_key_result_associations
    FOR EACH ROW
    EXECUTE FUNCTION update_task_kr_associations_updated_at();

-- 插入示例数据
INSERT INTO task_key_result_associations (task_id, key_result_id, weight, sync_mode) VALUES
-- 假设任务1关联到关键结果1，权重70%
(1, 1, 70.00, 'auto'),
-- 假设任务2关联到关键结果1，权重30%
(2, 1, 30.00, 'auto'),
-- 假设任务3关联到关键结果2，权重100%
(3, 2, 100.00, 'auto')
ON CONFLICT (task_id, key_result_id, deleted_at) DO NOTHING;

-- 添加注释
COMMENT ON TABLE task_key_result_associations IS '任务与OKR关键结果关联表';
COMMENT ON COLUMN task_key_result_associations.task_id IS '关联的任务ID';
COMMENT ON COLUMN task_key_result_associations.key_result_id IS '关联的关键结果ID';
COMMENT ON COLUMN task_key_result_associations.weight IS '任务在关键结果中的权重百分比(0-100)';
COMMENT ON COLUMN task_key_result_associations.sync_mode IS '同步模式：auto(自动同步)、manual(手动同步)';