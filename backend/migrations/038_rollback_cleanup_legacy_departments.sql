-- 回滚清理departments表的操作
-- Rollback: 038_rollback_cleanup_legacy_departments.sql

-- 1. 重新创建departments表（如果需要）
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    parent_id INTEGER,
    manager_id INTEGER,
    description TEXT,
    level INTEGER NOT NULL DEFAULT 1,
    employee_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    sort_order INTEGER NOT NULL DEFAULT 0,
    path TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- 约束
    CONSTRAINT departments_status_check 
        CHECK (status IN ('active', 'inactive')),
    CONSTRAINT departments_name_unique 
        UNIQUE(name, parent_id)
);

-- 2. 重新创建索引
CREATE INDEX IF NOT EXISTS idx_departments_parent_id ON departments(parent_id);
CREATE INDEX IF NOT EXISTS idx_departments_manager_id ON departments(manager_id);
CREATE INDEX IF NOT EXISTS idx_departments_status ON departments(status);
CREATE INDEX IF NOT EXISTS idx_departments_path ON departments(path);
CREATE INDEX IF NOT EXISTS idx_departments_deleted_at ON departments(deleted_at);

-- 3. 重新创建外键约束
ALTER TABLE departments 
ADD CONSTRAINT departments_parent_id_fkey 
FOREIGN KEY (parent_id) REFERENCES departments(id) ON DELETE CASCADE;

ALTER TABLE departments 
ADD CONSTRAINT departments_manager_id_fkey 
FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL;

-- 4. 从备份恢复数据（如果备份存在）
INSERT INTO departments (
    id, name, parent_id, manager_id, description, level, 
    employee_count, status, sort_order, path, created_at, updated_at, deleted_at
)
SELECT 
    id, name, parent_id, manager_id, description, level, 
    employee_count, status, sort_order, path, created_at, updated_at, deleted_at
FROM departments_backup_20250905
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE departments.id = departments_backup_20250905.id);

-- 5. 重新创建触发器（如果需要）
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

-- 6. 更新序列值
SELECT setval('departments_id_seq', COALESCE((SELECT MAX(id) FROM departments), 1), false);

RAISE NOTICE '⚠️ 已回滚departments表清理操作';
RAISE NOTICE '⚠️ 注意：这会重新引入多租户数据安全问题';
RAISE NOTICE '⚠️ 建议：应该继续使用company_departments表以确保多租户安全';