-- 创建部门表
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    parent_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
    manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    description TEXT,
    level INTEGER NOT NULL DEFAULT 1,
    employee_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    sort_order INTEGER NOT NULL DEFAULT 0,
    path TEXT, -- 存储层级路径，如 "1.2.3"
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- 约束
    CONSTRAINT departments_name_unique UNIQUE(name, parent_id),
    CONSTRAINT departments_status_check CHECK (status IN ('active', 'inactive'))
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_departments_parent_id ON departments(parent_id);
CREATE INDEX IF NOT EXISTS idx_departments_manager_id ON departments(manager_id);
CREATE INDEX IF NOT EXISTS idx_departments_status ON departments(status);
CREATE INDEX IF NOT EXISTS idx_departments_path ON departments(path);
CREATE INDEX IF NOT EXISTS idx_departments_deleted_at ON departments(deleted_at);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_departments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_departments_updated_at
    BEFORE UPDATE ON departments
    FOR EACH ROW
    EXECUTE FUNCTION update_departments_updated_at();

-- 插入默认部门数据
INSERT INTO departments (id, name, parent_id, level, employee_count, status, path, sort_order) VALUES
    (1, '总部', NULL, 1, 0, 'active', '1', 0),
    (2, '技术部', 1, 2, 0, 'active', '1.2', 1),
    (3, '市场部', 1, 2, 0, 'active', '1.3', 2),
    (4, '人事部', 1, 2, 0, 'active', '1.4', 3),
    (5, '财务部', 1, 2, 0, 'active', '1.5', 4),
    (6, '前端组', 2, 3, 0, 'active', '1.2.6', 1),
    (7, '后端组', 2, 3, 0, 'active', '1.2.7', 2),
    (8, '测试组', 2, 3, 0, 'active', '1.2.8', 3)
ON CONFLICT DO NOTHING;

-- 更新序列
SELECT setval('departments_id_seq', COALESCE((SELECT MAX(id) FROM departments), 0) + 1, false);