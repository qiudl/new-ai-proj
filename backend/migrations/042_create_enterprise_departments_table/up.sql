-- 042_create_enterprise_departments_table/up.sql
-- 创建enterprise_departments表，支持部门层级结构，替代原有的company_departments表
-- 作者: Claude Code AI
-- 创建时间: 2025-09-05

BEGIN;

-- 创建enterprise_departments表
CREATE TABLE IF NOT EXISTS enterprise_departments (
    -- 主键和基础信息
    id SERIAL PRIMARY KEY,
    enterprise_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    
    -- 层级结构
    parent_id INTEGER,
    level INTEGER NOT NULL DEFAULT 1,
    path TEXT, -- 路径信息，如 "1/3/5" 便于层级查询
    sort_order INTEGER DEFAULT 0,
    
    -- 管理信息
    manager_id INTEGER, -- 关联enterprise_users表
    description TEXT,
    
    -- 统计信息
    employee_count INTEGER DEFAULT 0,
    
    -- 状态管理
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'archived')),
    
    -- 元数据
    created_by INTEGER,
    updated_by INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 添加外键约束
ALTER TABLE enterprise_departments 
ADD CONSTRAINT fk_enterprise_departments_enterprise_id 
FOREIGN KEY (enterprise_id) REFERENCES enterprises(id) ON DELETE CASCADE;

-- 添加自引用外键约束（父部门）
ALTER TABLE enterprise_departments 
ADD CONSTRAINT fk_enterprise_departments_parent_id 
FOREIGN KEY (parent_id) REFERENCES enterprise_departments(id) ON DELETE SET NULL;

-- 添加管理员外键约束（稍后当enterprise_users表存在时启用）
-- ALTER TABLE enterprise_departments 
-- ADD CONSTRAINT fk_enterprise_departments_manager_id 
-- FOREIGN KEY (manager_id) REFERENCES enterprise_users(id) ON DELETE SET NULL;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_enterprise_departments_enterprise_id ON enterprise_departments(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_departments_parent_id ON enterprise_departments(parent_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_departments_manager_id ON enterprise_departments(manager_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_departments_name ON enterprise_departments(name);
CREATE INDEX IF NOT EXISTS idx_enterprise_departments_status ON enterprise_departments(status);
CREATE INDEX IF NOT EXISTS idx_enterprise_departments_level ON enterprise_departments(level);
CREATE INDEX IF NOT EXISTS idx_enterprise_departments_path ON enterprise_departments(path);
CREATE INDEX IF NOT EXISTS idx_enterprise_departments_sort_order ON enterprise_departments(sort_order);
CREATE INDEX IF NOT EXISTS idx_enterprise_departments_created_at ON enterprise_departments(created_at);
CREATE INDEX IF NOT EXISTS idx_enterprise_departments_deleted_at ON enterprise_departments(deleted_at) WHERE deleted_at IS NULL;

-- 创建唯一约束（同一企业内同级部门名称唯一）
CREATE UNIQUE INDEX IF NOT EXISTS idx_enterprise_departments_unique_name 
ON enterprise_departments(enterprise_id, parent_id, name) WHERE deleted_at IS NULL;

-- 创建触发器函数更新updated_at字段
CREATE OR REPLACE FUNCTION update_enterprise_departments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_enterprise_departments_updated_at ON enterprise_departments;
CREATE TRIGGER trigger_enterprise_departments_updated_at
    BEFORE UPDATE ON enterprise_departments
    FOR EACH ROW
    EXECUTE FUNCTION update_enterprise_departments_updated_at();

-- 创建触发器函数自动计算level和path
CREATE OR REPLACE FUNCTION update_department_level_and_path()
RETURNS TRIGGER AS $$
DECLARE
    parent_level INTEGER := 0;
    parent_path TEXT := '';
BEGIN
    -- 如果有父部门，获取父部门的level和path
    IF NEW.parent_id IS NOT NULL THEN
        SELECT level, COALESCE(path, '') 
        INTO parent_level, parent_path
        FROM enterprise_departments 
        WHERE id = NEW.parent_id AND enterprise_id = NEW.enterprise_id;
        
        NEW.level = parent_level + 1;
        NEW.path = CASE 
            WHEN parent_path = '' THEN NEW.parent_id::TEXT
            ELSE parent_path || '/' || NEW.parent_id::TEXT
        END;
    ELSE
        NEW.level = 1;
        NEW.path = '';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建level和path自动计算触发器
DROP TRIGGER IF EXISTS trigger_department_level_path ON enterprise_departments;
CREATE TRIGGER trigger_department_level_path
    BEFORE INSERT OR UPDATE OF parent_id ON enterprise_departments
    FOR EACH ROW
    EXECUTE FUNCTION update_department_level_and_path();

-- 添加表和字段注释
COMMENT ON TABLE enterprise_departments IS '企业部门表，支持层级结构，替代原有company_departments表';
COMMENT ON COLUMN enterprise_departments.id IS '部门唯一标识';
COMMENT ON COLUMN enterprise_departments.enterprise_id IS '所属企业ID，关联enterprises表';
COMMENT ON COLUMN enterprise_departments.name IS '部门名称';
COMMENT ON COLUMN enterprise_departments.parent_id IS '父部门ID，自引用关系';
COMMENT ON COLUMN enterprise_departments.level IS '部门层级，从1开始';
COMMENT ON COLUMN enterprise_departments.path IS '部门路径，存储从根到父级的完整路径';
COMMENT ON COLUMN enterprise_departments.sort_order IS '同级部门排序权重';
COMMENT ON COLUMN enterprise_departments.manager_id IS '部门经理ID，关联enterprise_users表';
COMMENT ON COLUMN enterprise_departments.description IS '部门描述';
COMMENT ON COLUMN enterprise_departments.employee_count IS '员工数量统计';
COMMENT ON COLUMN enterprise_departments.status IS '部门状态：active(活跃), inactive(非活跃), archived(已归档)';
COMMENT ON COLUMN enterprise_departments.created_by IS '创建人用户ID';
COMMENT ON COLUMN enterprise_departments.updated_by IS '最后更新人用户ID';
COMMENT ON COLUMN enterprise_departments.created_at IS '创建时间';
COMMENT ON COLUMN enterprise_departments.updated_at IS '更新时间';
COMMENT ON COLUMN enterprise_departments.deleted_at IS '软删除时间';

-- 插入测试数据
-- 测试科技有限公司的部门结构
INSERT INTO enterprise_departments (
    enterprise_id, name, parent_id, sort_order, description, created_by
) VALUES 
    -- 一级部门
    (1, '技术部', NULL, 1, '负责产品研发和技术创新', 1),
    (1, '市场部', NULL, 2, '负责市场推广和销售', 1),
    (1, '人事部', NULL, 3, '负责人力资源管理', 1),
    
    -- 技术部下的二级部门 (parent_id会被自动计算)
    (1, '前端开发组', 1, 1, '负责前端界面开发', 1),
    (1, '后端开发组', 1, 2, '负责后端接口开发', 1),
    (1, '测试组', 1, 3, '负责产品质量测试', 1),
    
    -- 市场部下的二级部门
    (1, '销售组', 2, 1, '负责产品销售', 1),
    (1, '运营组', 2, 2, '负责产品运营', 1);

-- 示例金融服务公司的部门结构
INSERT INTO enterprise_departments (
    enterprise_id, name, parent_id, sort_order, description, created_by
) VALUES 
    -- 一级部门
    (2, '业务部', NULL, 1, '负责金融业务开展', 1),
    (2, '风控部', NULL, 2, '负责风险控制管理', 1),
    (2, '财务部', NULL, 3, '负责财务管理', 1),
    
    -- 业务部下的二级部门
    (2, '信贷组', 9, 1, '负责信贷业务', 1),
    (2, '理财组', 9, 2, '负责理财产品', 1);

COMMIT;

-- 输出创建信息
\echo '==========================================';
\echo 'Enterprise Departments table migration completed';
\echo 'Table created: enterprise_departments';
\echo 'Indexes created: 10 indexes';
\echo 'Triggers created: 2 triggers';
\echo 'Foreign key constraints created: 2';
\echo 'Test data inserted: 13 departments';
\echo 'Hierarchical structure established';
\echo '==========================================';