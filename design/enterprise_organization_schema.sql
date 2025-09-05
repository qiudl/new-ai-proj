-- 企业组织架构管理模块数据库设计
-- 文件: enterprise_organization_schema.sql
-- 描述: 企业组织架构管理的完整数据库表结构设计
-- 作者: Claude AI
-- 创建时间: 2025-09-04
-- 任务: #1210 - 设计企业组织架构管理模块

BEGIN;

-- =============================================================================
-- 1. 企业部门表 (company_departments)
-- =============================================================================
CREATE TABLE company_departments (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    parent_department_id INTEGER REFERENCES company_departments(id) ON DELETE SET NULL,
    department_code VARCHAR(50) NOT NULL,
    department_name VARCHAR(100) NOT NULL,
    department_description TEXT,
    department_type VARCHAR(50) DEFAULT 'business', -- business, technical, support, management
    level INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    manager_user_id INTEGER, -- 部门经理
    deputy_manager_user_id INTEGER, -- 副部门经理
    contact_phone VARCHAR(50),
    contact_email VARCHAR(255),
    office_location VARCHAR(200),
    budget_limit DECIMAL(15,2),
    employee_count INTEGER DEFAULT 0, -- 冗余字段，便于统计
    created_by INTEGER REFERENCES company_users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- 约束
    UNIQUE (company_id, department_code),
    CONSTRAINT chk_dept_code_format CHECK (department_code ~ '^[A-Z0-9_]{2,20}$'),
    CONSTRAINT chk_dept_name_length CHECK (LENGTH(department_name) >= 2),
    CONSTRAINT chk_dept_level CHECK (level >= 1 AND level <= 10),
    CONSTRAINT chk_parent_not_self CHECK (id != parent_department_id)
);

-- 创建索引
CREATE INDEX idx_company_departments_company ON company_departments(company_id);
CREATE INDEX idx_company_departments_parent ON company_departments(parent_department_id);
CREATE INDEX idx_company_departments_active ON company_departments(is_active);
CREATE INDEX idx_company_departments_type ON company_departments(department_type);
CREATE INDEX idx_company_departments_level ON company_departments(level);
CREATE INDEX idx_company_departments_manager ON company_departments(manager_user_id);

-- =============================================================================
-- 2. 企业岗位表 (company_positions)
-- =============================================================================
CREATE TABLE company_positions (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    position_code VARCHAR(50) NOT NULL,
    position_name VARCHAR(100) NOT NULL,
    position_description TEXT,
    position_category VARCHAR(50), -- management, technical, sales, hr, finance, operation
    position_level INTEGER DEFAULT 1, -- 岗位级别 1-10
    salary_range_min DECIMAL(10,2),
    salary_range_max DECIMAL(10,2),
    required_skills TEXT[], -- 技能要求
    required_education VARCHAR(50), -- 学历要求
    required_experience INTEGER, -- 工作经验要求(年)
    reports_to_position_id INTEGER REFERENCES company_positions(id),
    is_management_position BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    employee_count INTEGER DEFAULT 0, -- 当前岗位人数
    max_employee_count INTEGER, -- 岗位人员上限
    created_by INTEGER REFERENCES company_users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- 约束
    UNIQUE (company_id, position_code),
    CONSTRAINT chk_position_code_format CHECK (position_code ~ '^[A-Z0-9_]{2,20}$'),
    CONSTRAINT chk_position_name_length CHECK (LENGTH(position_name) >= 2),
    CONSTRAINT chk_position_level CHECK (position_level >= 1 AND position_level <= 10),
    CONSTRAINT chk_salary_range CHECK (salary_range_max IS NULL OR salary_range_min IS NULL OR salary_range_max >= salary_range_min),
    CONSTRAINT chk_employee_limit CHECK (max_employee_count IS NULL OR max_employee_count > 0)
);

-- 创建索引
CREATE INDEX idx_company_positions_company ON company_positions(company_id);
CREATE INDEX idx_company_positions_category ON company_positions(position_category);
CREATE INDEX idx_company_positions_level ON company_positions(position_level);
CREATE INDEX idx_company_positions_active ON company_positions(is_active);
CREATE INDEX idx_company_positions_reports_to ON company_positions(reports_to_position_id);

-- =============================================================================
-- 3. 部门岗位关联表 (department_positions)
-- =============================================================================
CREATE TABLE department_positions (
    id SERIAL PRIMARY KEY,
    department_id INTEGER NOT NULL REFERENCES company_departments(id) ON DELETE CASCADE,
    position_id INTEGER NOT NULL REFERENCES company_positions(id) ON DELETE CASCADE,
    allocated_count INTEGER DEFAULT 1, -- 该部门分配的岗位数量
    is_primary_department BOOLEAN DEFAULT TRUE, -- 是否为该岗位的主要部门
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- 约束
    UNIQUE (department_id, position_id),
    CONSTRAINT chk_allocated_count CHECK (allocated_count > 0)
);

-- 创建索引
CREATE INDEX idx_department_positions_dept ON department_positions(department_id);
CREATE INDEX idx_department_positions_pos ON department_positions(position_id);
CREATE INDEX idx_department_positions_primary ON department_positions(is_primary_department);

-- =============================================================================
-- 4. 员工部门岗位关联表 (employee_assignments)
-- =============================================================================
CREATE TABLE employee_assignments (
    id SERIAL PRIMARY KEY,
    company_user_id INTEGER NOT NULL REFERENCES company_users(id) ON DELETE CASCADE,
    department_id INTEGER NOT NULL REFERENCES company_departments(id) ON DELETE CASCADE,
    position_id INTEGER NOT NULL REFERENCES company_positions(id) ON DELETE CASCADE,
    is_primary_assignment BOOLEAN DEFAULT TRUE, -- 是否为主要任职
    assignment_type VARCHAR(20) DEFAULT 'permanent', -- permanent, temporary, concurrent
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    reporting_manager_id INTEGER REFERENCES company_users(id), -- 直接上级
    work_location VARCHAR(200),
    work_schedule VARCHAR(100), -- 工作时间安排
    employment_status VARCHAR(20) DEFAULT 'active', -- active, inactive, on_leave, terminated
    salary DECIMAL(10,2),
    bonus_eligible BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_by INTEGER REFERENCES company_users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- 约束
    UNIQUE (company_user_id, department_id, position_id, assignment_type),
    CONSTRAINT chk_assignment_dates CHECK (end_date IS NULL OR end_date >= start_date),
    CONSTRAINT chk_assignment_type CHECK (assignment_type IN ('permanent', 'temporary', 'concurrent')),
    CONSTRAINT chk_employment_status CHECK (employment_status IN ('active', 'inactive', 'on_leave', 'terminated'))
);

-- 创建索引
CREATE INDEX idx_employee_assignments_user ON employee_assignments(company_user_id);
CREATE INDEX idx_employee_assignments_dept ON employee_assignments(department_id);
CREATE INDEX idx_employee_assignments_position ON employee_assignments(position_id);
CREATE INDEX idx_employee_assignments_primary ON employee_assignments(is_primary_assignment);
CREATE INDEX idx_employee_assignments_manager ON employee_assignments(reporting_manager_id);
CREATE INDEX idx_employee_assignments_status ON employee_assignments(employment_status);
CREATE INDEX idx_employee_assignments_dates ON employee_assignments(start_date, end_date);

-- =============================================================================
-- 5. 组织架构变更历史表 (organization_change_history)
-- =============================================================================
CREATE TABLE organization_change_history (
    id BIGSERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    change_type VARCHAR(50) NOT NULL, -- department_create, department_update, department_delete, position_create, etc.
    entity_type VARCHAR(50) NOT NULL, -- department, position, assignment
    entity_id INTEGER NOT NULL,
    old_data JSONB,
    new_data JSONB,
    change_description TEXT,
    changed_by INTEGER REFERENCES company_users(id),
    change_reason VARCHAR(200),
    effective_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- 约束
    CONSTRAINT chk_change_type CHECK (change_type IN (
        'department_create', 'department_update', 'department_delete', 'department_move',
        'position_create', 'position_update', 'position_delete',
        'assignment_create', 'assignment_update', 'assignment_delete', 'assignment_transfer'
    )),
    CONSTRAINT chk_entity_type CHECK (entity_type IN ('department', 'position', 'assignment'))
);

-- 创建索引
CREATE INDEX idx_org_change_history_company ON organization_change_history(company_id);
CREATE INDEX idx_org_change_history_entity ON organization_change_history(entity_type, entity_id);
CREATE INDEX idx_org_change_history_changed_by ON organization_change_history(changed_by);
CREATE INDEX idx_org_change_history_date ON organization_change_history(effective_date);
CREATE INDEX idx_org_change_history_type ON organization_change_history(change_type);

-- =============================================================================
-- 6. 组织架构权限表 (organization_permissions)
-- =============================================================================
CREATE TABLE organization_permissions (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES company_users(id) ON DELETE CASCADE,
    permission_scope VARCHAR(50) NOT NULL, -- company, department, position
    scope_id INTEGER, -- department_id 或 position_id，NULL表示公司级权限
    permissions TEXT[] NOT NULL, -- ['create', 'read', 'update', 'delete', 'manage']
    granted_by INTEGER REFERENCES company_users(id),
    granted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- 约束
    UNIQUE (user_id, permission_scope, scope_id),
    CONSTRAINT chk_permission_scope CHECK (permission_scope IN ('company', 'department', 'position')),
    CONSTRAINT chk_permissions_not_empty CHECK (array_length(permissions, 1) > 0)
);

-- 创建索引
CREATE INDEX idx_org_permissions_company ON organization_permissions(company_id);
CREATE INDEX idx_org_permissions_user ON organization_permissions(user_id);
CREATE INDEX idx_org_permissions_scope ON organization_permissions(permission_scope, scope_id);
CREATE INDEX idx_org_permissions_active ON organization_permissions(is_active);
CREATE INDEX idx_org_permissions_expires ON organization_permissions(expires_at);

-- =============================================================================
-- 7. 组织架构统计视图
-- =============================================================================

-- 部门统计视图
CREATE OR REPLACE VIEW department_statistics AS
SELECT 
    d.id,
    d.company_id,
    d.department_name,
    d.department_code,
    d.level,
    COUNT(DISTINCT ea.company_user_id) as employee_count,
    COUNT(DISTINCT CASE WHEN ea.is_primary_assignment THEN ea.company_user_id END) as primary_employee_count,
    COUNT(DISTINCT dp.position_id) as position_count,
    COUNT(DISTINCT child.id) as child_department_count,
    d.is_active
FROM company_departments d
LEFT JOIN employee_assignments ea ON d.id = ea.department_id AND ea.employment_status = 'active'
LEFT JOIN department_positions dp ON d.id = dp.department_id
LEFT JOIN company_departments child ON d.id = child.parent_department_id
GROUP BY d.id, d.company_id, d.department_name, d.department_code, d.level, d.is_active;

-- 岗位统计视图
CREATE OR REPLACE VIEW position_statistics AS
SELECT 
    p.id,
    p.company_id,
    p.position_name,
    p.position_code,
    p.position_level,
    p.position_category,
    COUNT(DISTINCT ea.company_user_id) as employee_count,
    p.max_employee_count,
    COUNT(DISTINCT dp.department_id) as department_count,
    COALESCE(AVG(ea.salary), 0) as average_salary,
    p.is_active
FROM company_positions p
LEFT JOIN employee_assignments ea ON p.id = ea.position_id AND ea.employment_status = 'active'
LEFT JOIN department_positions dp ON p.id = dp.position_id
GROUP BY p.id, p.company_id, p.position_name, p.position_code, p.position_level, 
         p.position_category, p.max_employee_count, p.is_active;

-- 员工组织关系视图
CREATE OR REPLACE VIEW employee_organization_view AS
SELECT 
    cu.id as user_id,
    cu.name as user_name,
    cu.email,
    ea.company_user_id,
    d.id as department_id,
    d.department_name,
    d.department_code,
    p.id as position_id,
    p.position_name,
    p.position_code,
    p.position_level,
    ea.is_primary_assignment,
    ea.assignment_type,
    ea.employment_status,
    ea.start_date,
    ea.end_date,
    manager.name as manager_name,
    ea.salary
FROM employee_assignments ea
JOIN company_users cu ON ea.company_user_id = cu.id
JOIN company_departments d ON ea.department_id = d.id
JOIN company_positions p ON ea.position_id = p.id
LEFT JOIN company_users manager ON ea.reporting_manager_id = manager.id
WHERE ea.employment_status = 'active';

-- =============================================================================
-- 8. 更新触发器
-- =============================================================================

-- 自动更新updated_at字段的触发器
CREATE OR REPLACE FUNCTION update_organization_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为需要的表创建触发器
DO $$
DECLARE
    table_name TEXT;
    tables_to_update TEXT[] := ARRAY[
        'company_departments', 'company_positions', 'employee_assignments'
    ];
BEGIN
    FOREACH table_name IN ARRAY tables_to_update
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS trg_update_%s_updated_at ON %s;
            CREATE TRIGGER trg_update_%s_updated_at
                BEFORE UPDATE ON %s
                FOR EACH ROW EXECUTE FUNCTION update_organization_updated_at();
        ', table_name, table_name, table_name, table_name);
    END LOOP;
END $$;

-- 自动更新员工数量统计的触发器
CREATE OR REPLACE FUNCTION update_employee_count()
RETURNS TRIGGER AS $$
BEGIN
    -- 更新部门员工数量
    UPDATE company_departments 
    SET employee_count = (
        SELECT COUNT(*) 
        FROM employee_assignments 
        WHERE department_id = COALESCE(NEW.department_id, OLD.department_id)
        AND employment_status = 'active'
    )
    WHERE id = COALESCE(NEW.department_id, OLD.department_id);
    
    -- 更新岗位员工数量
    UPDATE company_positions 
    SET employee_count = (
        SELECT COUNT(*) 
        FROM employee_assignments 
        WHERE position_id = COALESCE(NEW.position_id, OLD.position_id)
        AND employment_status = 'active'
    )
    WHERE id = COALESCE(NEW.position_id, OLD.position_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_employee_count
    AFTER INSERT OR UPDATE OR DELETE ON employee_assignments
    FOR EACH ROW EXECUTE FUNCTION update_employee_count();

-- =============================================================================
-- 9. 组织架构管理函数
-- =============================================================================

-- 获取部门完整层级路径
CREATE OR REPLACE FUNCTION get_department_path(dept_id INTEGER)
RETURNS TEXT AS $$
DECLARE
    path TEXT := '';
    current_dept RECORD;
BEGIN
    WITH RECURSIVE dept_path AS (
        SELECT id, department_name, parent_department_id, 1 as level
        FROM company_departments
        WHERE id = dept_id
        
        UNION ALL
        
        SELECT d.id, d.department_name, d.parent_department_id, dp.level + 1
        FROM company_departments d
        JOIN dept_path dp ON d.id = dp.parent_department_id
    )
    SELECT string_agg(department_name, ' > ' ORDER BY level DESC)
    INTO path
    FROM dept_path;
    
    RETURN COALESCE(path, '');
END;
$$ LANGUAGE plpgsql;

-- 检查部门循环引用
CREATE OR REPLACE FUNCTION check_department_cycle(dept_id INTEGER, parent_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    -- 如果父部门为空，不存在循环
    IF parent_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- 检查是否会形成循环
    RETURN EXISTS (
        WITH RECURSIVE dept_hierarchy AS (
            SELECT id, parent_department_id
            FROM company_departments
            WHERE id = parent_id
            
            UNION ALL
            
            SELECT d.id, d.parent_department_id
            FROM company_departments d
            JOIN dept_hierarchy dh ON d.id = dh.parent_department_id
        )
        SELECT 1 FROM dept_hierarchy WHERE id = dept_id
    );
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- 添加表注释
COMMENT ON TABLE company_departments IS '企业部门管理表';
COMMENT ON TABLE company_positions IS '企业岗位管理表';
COMMENT ON TABLE department_positions IS '部门岗位关联表';
COMMENT ON TABLE employee_assignments IS '员工部门岗位分配表';
COMMENT ON TABLE organization_change_history IS '组织架构变更历史表';
COMMENT ON TABLE organization_permissions IS '组织架构管理权限表';