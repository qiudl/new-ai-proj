-- 创建企业部门表 - 支持多租户数据隔离
-- Migration: 037_create_company_departments_table.sql

-- 1. 创建企业部门表
CREATE TABLE IF NOT EXISTS company_departments (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    parent_id INTEGER,
    manager_id INTEGER,
    description TEXT,
    level INTEGER NOT NULL DEFAULT 1,
    employee_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    sort_order INTEGER NOT NULL DEFAULT 0,
    path TEXT, -- 存储层级路径，如 "1.2.3"
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- 外键约束
    CONSTRAINT fk_company_departments_company 
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_company_departments_parent 
        FOREIGN KEY (parent_id) REFERENCES company_departments(id) ON DELETE CASCADE,
    CONSTRAINT fk_company_departments_manager 
        FOREIGN KEY (manager_id) REFERENCES company_users(id) ON DELETE SET NULL,
    
    -- 唯一性约束 - 同一企业内同级部门名称不能重复
    CONSTRAINT uk_company_departments_name 
        UNIQUE(company_id, name, parent_id),
        
    -- 检查约束
    CONSTRAINT company_departments_status_check 
        CHECK (status IN ('active', 'inactive')),
    CONSTRAINT company_departments_level_check 
        CHECK (level >= 1 AND level <= 10)
);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_company_departments_company_id ON company_departments(company_id);
CREATE INDEX IF NOT EXISTS idx_company_departments_parent_id ON company_departments(parent_id);
CREATE INDEX IF NOT EXISTS idx_company_departments_manager_id ON company_departments(manager_id);
CREATE INDEX IF NOT EXISTS idx_company_departments_status ON company_departments(company_id, status);
CREATE INDEX IF NOT EXISTS idx_company_departments_path ON company_departments(path);
CREATE INDEX IF NOT EXISTS idx_company_departments_deleted_at ON company_departments(deleted_at);
CREATE INDEX IF NOT EXISTS idx_company_departments_level_sort ON company_departments(company_id, level, sort_order);

-- 3. 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_company_departments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_company_departments_updated_at
    BEFORE UPDATE ON company_departments
    FOR EACH ROW
    EXECUTE FUNCTION update_company_departments_updated_at();

-- 4. 修改company_users表，添加department_id字段
ALTER TABLE company_users 
    ADD COLUMN IF NOT EXISTS department_id INTEGER,
    ADD CONSTRAINT fk_company_users_department 
        FOREIGN KEY (department_id) REFERENCES company_departments(id) ON DELETE SET NULL;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_company_users_department_id ON company_users(department_id);

-- 5. 插入示例数据 (为现有企业创建默认部门结构)
DO $$
DECLARE 
    company_record RECORD;
    dept_id INTEGER;
    tech_dept_id INTEGER;
    market_dept_id INTEGER;
BEGIN
    -- 为每个现有企业创建默认部门结构
    FOR company_record IN SELECT id, company_name FROM companies WHERE status = 'active' LOOP
        -- 创建总部
        INSERT INTO company_departments (company_id, name, level, path, sort_order, description)
        VALUES (company_record.id, '总部', 1, '', 0, company_record.company_name || ' 总部')
        RETURNING id INTO dept_id;
        
        -- 更新路径
        UPDATE company_departments SET path = id::text WHERE id = dept_id;
        
        -- 创建技术部
        INSERT INTO company_departments (company_id, name, parent_id, level, path, sort_order, description)
        VALUES (company_record.id, '技术部', dept_id, 2, dept_id::text || '.' || currval('company_departments_id_seq')::text, 1, '技术开发部门')
        RETURNING id INTO tech_dept_id;
        
        UPDATE company_departments SET path = dept_id::text || '.' || tech_dept_id::text WHERE id = tech_dept_id;
        
        -- 创建市场部
        INSERT INTO company_departments (company_id, name, parent_id, level, path, sort_order, description)
        VALUES (company_record.id, '市场部', dept_id, 2, dept_id::text || '.' || currval('company_departments_id_seq')::text, 2, '市场营销部门')
        RETURNING id INTO market_dept_id;
        
        UPDATE company_departments SET path = dept_id::text || '.' || market_dept_id::text WHERE id = market_dept_id;
        
        -- 创建人事部
        INSERT INTO company_departments (company_id, name, parent_id, level, path, sort_order, description)
        VALUES (company_record.id, '人事部', dept_id, 2, dept_id::text || '.' || currval('company_departments_id_seq')::text, 3, '人力资源部门');
        
        UPDATE company_departments 
        SET path = dept_id::text || '.' || currval('company_departments_id_seq')::text 
        WHERE id = currval('company_departments_id_seq');
        
        -- 在技术部下创建子部门
        INSERT INTO company_departments (company_id, name, parent_id, level, path, sort_order, description)
        VALUES 
            (company_record.id, '前端组', tech_dept_id, 3, dept_id::text || '.' || tech_dept_id::text || '.' || (currval('company_departments_id_seq') + 1)::text, 1, '前端开发组'),
            (company_record.id, '后端组', tech_dept_id, 3, dept_id::text || '.' || tech_dept_id::text || '.' || (currval('company_departments_id_seq') + 2)::text, 2, '后端开发组');
            
        -- 更新子部门路径
        UPDATE company_departments 
        SET path = dept_id::text || '.' || tech_dept_id::text || '.' || id::text 
        WHERE parent_id = tech_dept_id;
        
        RAISE NOTICE '已为企业 % (ID: %) 创建默认部门结构', company_record.company_name, company_record.id;
    END LOOP;
END $$;

-- 6. 数据迁移：将company_users表中的department字符串迁移到department_id
DO $$
DECLARE 
    user_record RECORD;
    dept_id INTEGER;
BEGIN
    -- 遍历所有有department信息的用户
    FOR user_record IN 
        SELECT id, customer_id, department 
        FROM company_users 
        WHERE department IS NOT NULL AND department != '' AND department_id IS NULL 
    LOOP
        -- 查找对应的部门ID
        SELECT cd.id INTO dept_id
        FROM company_departments cd
        INNER JOIN companies c ON cd.company_id = c.id
        WHERE c.id = user_record.customer_id 
        AND cd.name = user_record.department
        AND cd.deleted_at IS NULL
        LIMIT 1;
        
        -- 如果找到匹配的部门，更新用户记录
        IF dept_id IS NOT NULL THEN
            UPDATE company_users 
            SET department_id = dept_id 
            WHERE id = user_record.id;
            
            RAISE NOTICE '已迁移用户 % 的部门信息: % -> %', user_record.id, user_record.department, dept_id;
        ELSE
            RAISE NOTICE '未找到用户 % 的部门匹配: %', user_record.id, user_record.department;
        END IF;
        
        dept_id := NULL; -- 重置变量
    END LOOP;
END $$;

-- 7. 更新部门员工数统计
UPDATE company_departments 
SET employee_count = (
    SELECT COUNT(*) 
    FROM company_users cu 
    WHERE cu.department_id = company_departments.id 
    AND cu.status = 'active'
)
WHERE deleted_at IS NULL;

-- 8. 添加注释
COMMENT ON TABLE company_departments IS '企业部门表 - 支持多租户数据隔离';
COMMENT ON COLUMN company_departments.company_id IS '所属企业ID，关联companies表';
COMMENT ON COLUMN company_departments.parent_id IS '父部门ID，实现部门层级结构';
COMMENT ON COLUMN company_departments.manager_id IS '部门经理ID，关联company_users表';
COMMENT ON COLUMN company_departments.path IS '部门层级路径，用于快速查询子树';
COMMENT ON COLUMN company_departments.level IS '部门层级深度，根部门为1';
COMMENT ON COLUMN company_departments.employee_count IS '部门员工数统计';

-- 9. 验证数据
SELECT 
    c.company_name,
    COUNT(cd.id) as department_count,
    COUNT(cu.id) as user_count
FROM companies c
LEFT JOIN company_departments cd ON c.id = cd.company_id AND cd.deleted_at IS NULL
LEFT JOIN company_users cu ON c.id = cu.customer_id AND cu.status = 'active'
GROUP BY c.id, c.company_name
ORDER BY c.company_name;