-- 046_migrate_company_departments_to_enterprise/up.sql
-- 迁移公司部门数据到企业部门表
-- 作者: Claude Code AI
-- 创建时间: 2025-09-06

BEGIN;

-- 输出迁移开始信息
DO $$
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Starting company departments migration to enterprise system';
    RAISE NOTICE '==========================================';
END $$;

-- 第一步：创建临时映射表用于记录公司到企业的映射关系
CREATE TEMP TABLE company_to_enterprise_mapping AS
SELECT 
    c.id as company_id,
    c.company_name,
    COALESCE(
        -- 优先使用名称完全匹配的企业
        (SELECT id FROM enterprises WHERE name = c.company_name AND deleted_at IS NULL LIMIT 1),
        -- 其次使用描述中包含公司信息的企业
        (SELECT id FROM enterprises WHERE description LIKE 'Migrated from companies%' AND name = c.company_name LIMIT 1)
    ) as enterprise_id
FROM companies c
WHERE EXISTS (
    SELECT 1 FROM company_departments cd 
    WHERE cd.company_id = c.id AND cd.deleted_at IS NULL
);

-- 显示映射关系
DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE 'Company to Enterprise mapping:';
    FOR r IN SELECT company_id, company_name, enterprise_id FROM company_to_enterprise_mapping
    LOOP
        RAISE NOTICE 'Company % (%) -> Enterprise %', r.company_name, r.company_id, r.enterprise_id;
    END LOOP;
END $$;

-- 第二步：创建部门ID映射表（用于处理父子关系）
CREATE TEMP TABLE department_id_mapping (
    old_department_id INTEGER,
    new_department_id INTEGER,
    company_id INTEGER,
    enterprise_id INTEGER
);

-- 第三步：迁移根部门（parent_id IS NULL 或 parent_id = 0）
INSERT INTO enterprise_departments (
    enterprise_id, name, parent_id, level, path,
    sort_order, manager_id, description, employee_count,
    status, created_by, updated_by, created_at, updated_at
)
SELECT 
    m.enterprise_id,
    cd.name,
    NULL as parent_id,  -- 根部门
    1 as level,  -- 将在触发器中自动计算
    NULL as path,  -- 将在触发器中自动计算
    cd.sort_order,
    NULL as manager_id,  -- 暂时不迁移manager_id，因为需要映射到enterprise_users
    COALESCE(cd.description, '') || 
        CASE 
            WHEN cd.description IS NOT NULL AND cd.description != '' 
            THEN ' [Migrated from company_departments id: ' || cd.id || ']'
            ELSE '[Migrated from company_departments id: ' || cd.id || ']'
        END as description,
    cd.employee_count,
    cd.status,
    1 as created_by,  -- 系统管理员
    1 as updated_by,
    cd.created_at,
    cd.updated_at
FROM company_departments cd
JOIN company_to_enterprise_mapping m ON m.company_id = cd.company_id
WHERE (cd.parent_id IS NULL OR cd.parent_id = 0)
  AND cd.deleted_at IS NULL
  AND m.enterprise_id IS NOT NULL
RETURNING id, description;

-- 记录根部门的ID映射
INSERT INTO department_id_mapping (old_department_id, new_department_id, company_id, enterprise_id)
SELECT 
    CAST(
        SUBSTRING(
            ed.description 
            FROM 'company_departments id: ([0-9]+)'
        ) AS INTEGER
    ) as old_department_id,
    ed.id as new_department_id,
    m.company_id,
    m.enterprise_id
FROM enterprise_departments ed
JOIN company_to_enterprise_mapping m ON m.enterprise_id = ed.enterprise_id
WHERE ed.description LIKE '%Migrated from company_departments id:%'
  AND ed.parent_id IS NULL;

-- 第四步：迁移二级部门
INSERT INTO enterprise_departments (
    enterprise_id, name, parent_id, level, path,
    sort_order, manager_id, description, employee_count,
    status, created_by, updated_by, created_at, updated_at
)
SELECT 
    m.enterprise_id,
    cd.name,
    dm.new_department_id as parent_id,  -- 使用映射后的父部门ID
    2 as level,  -- 将在触发器中自动计算
    NULL as path,  -- 将在触发器中自动计算
    cd.sort_order,
    NULL as manager_id,
    COALESCE(cd.description, '') || 
        CASE 
            WHEN cd.description IS NOT NULL AND cd.description != '' 
            THEN ' [Migrated from company_departments id: ' || cd.id || ']'
            ELSE '[Migrated from company_departments id: ' || cd.id || ']'
        END as description,
    cd.employee_count,
    cd.status,
    1 as created_by,
    1 as updated_by,
    cd.created_at,
    cd.updated_at
FROM company_departments cd
JOIN company_to_enterprise_mapping m ON m.company_id = cd.company_id
JOIN department_id_mapping dm ON dm.old_department_id = cd.parent_id AND dm.company_id = cd.company_id
WHERE cd.parent_id IS NOT NULL 
  AND cd.parent_id > 0
  AND cd.deleted_at IS NULL
  AND m.enterprise_id IS NOT NULL
  AND cd.level = 2;

-- 记录二级部门的ID映射
INSERT INTO department_id_mapping (old_department_id, new_department_id, company_id, enterprise_id)
SELECT 
    CAST(
        SUBSTRING(
            ed.description 
            FROM 'company_departments id: ([0-9]+)'
        ) AS INTEGER
    ) as old_department_id,
    ed.id as new_department_id,
    m.company_id,
    m.enterprise_id
FROM enterprise_departments ed
JOIN company_to_enterprise_mapping m ON m.enterprise_id = ed.enterprise_id
WHERE ed.description LIKE '%Migrated from company_departments id:%'
  AND ed.parent_id IS NOT NULL
  AND ed.level = 2
  AND NOT EXISTS (
      SELECT 1 FROM department_id_mapping dm 
      WHERE dm.new_department_id = ed.id
  );

-- 第五步：迁移三级及更深层级的部门（递归处理）
DO $$
DECLARE
    v_level INTEGER := 3;
    v_rows_inserted INTEGER;
BEGIN
    WHILE v_level <= 10 LOOP
        -- 插入当前层级的部门
        INSERT INTO enterprise_departments (
            enterprise_id, name, parent_id, level, path,
            sort_order, manager_id, description, employee_count,
            status, created_by, updated_by, created_at, updated_at
        )
        SELECT 
            m.enterprise_id,
            cd.name,
            dm.new_department_id as parent_id,
            v_level as level,
            NULL as path,
            cd.sort_order,
            NULL as manager_id,
            COALESCE(cd.description, '') || 
                CASE 
                    WHEN cd.description IS NOT NULL AND cd.description != '' 
                    THEN ' [Migrated from company_departments id: ' || cd.id || ']'
                    ELSE '[Migrated from company_departments id: ' || cd.id || ']'
                END as description,
            cd.employee_count,
            cd.status,
            1 as created_by,
            1 as updated_by,
            cd.created_at,
            cd.updated_at
        FROM company_departments cd
        JOIN company_to_enterprise_mapping m ON m.company_id = cd.company_id
        JOIN department_id_mapping dm ON dm.old_department_id = cd.parent_id AND dm.company_id = cd.company_id
        WHERE cd.deleted_at IS NULL
          AND m.enterprise_id IS NOT NULL
          AND cd.level = v_level
          AND NOT EXISTS (
              SELECT 1 FROM department_id_mapping existing 
              WHERE existing.old_department_id = cd.id AND existing.company_id = cd.company_id
          );
        
        GET DIAGNOSTICS v_rows_inserted = ROW_COUNT;
        
        -- 如果没有插入任何行，说明该层级没有部门了
        EXIT WHEN v_rows_inserted = 0;
        
        -- 记录新插入部门的ID映射
        INSERT INTO department_id_mapping (old_department_id, new_department_id, company_id, enterprise_id)
        SELECT 
            CAST(
                SUBSTRING(
                    ed.description 
                    FROM 'company_departments id: ([0-9]+)'
                ) AS INTEGER
            ) as old_department_id,
            ed.id as new_department_id,
            m.company_id,
            m.enterprise_id
        FROM enterprise_departments ed
        JOIN company_to_enterprise_mapping m ON m.enterprise_id = ed.enterprise_id
        WHERE ed.description LIKE '%Migrated from company_departments id:%'
          AND ed.level = v_level
          AND NOT EXISTS (
              SELECT 1 FROM department_id_mapping dm 
              WHERE dm.new_department_id = ed.id
          );
        
        v_level := v_level + 1;
        RAISE NOTICE 'Processed level % departments, inserted % rows', v_level - 1, v_rows_inserted;
    END LOOP;
END $$;

-- 第六步：验证迁移结果
DO $$
DECLARE
    v_source_count INTEGER;
    v_migrated_count INTEGER;
BEGIN
    -- 统计源数据
    SELECT COUNT(*) INTO v_source_count
    FROM company_departments cd
    JOIN company_to_enterprise_mapping m ON m.company_id = cd.company_id
    WHERE cd.deleted_at IS NULL AND m.enterprise_id IS NOT NULL;
    
    -- 统计迁移后的数据
    SELECT COUNT(*) INTO v_migrated_count
    FROM enterprise_departments
    WHERE description LIKE '%Migrated from company_departments%';
    
    RAISE NOTICE 'Migration Summary:';
    RAISE NOTICE '  Source departments: %', v_source_count;
    RAISE NOTICE '  Migrated departments: %', v_migrated_count;
    
    IF v_source_count != v_migrated_count THEN
        RAISE WARNING 'Department count mismatch! Source: %, Migrated: %', v_source_count, v_migrated_count;
    END IF;
END $$;

-- 第七步：显示迁移后的部门树结构
DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE 'Migrated Department Structure:';
    FOR r IN 
        SELECT 
            e.name as enterprise_name,
            COUNT(ed.id) as dept_count,
            MAX(ed.level) as max_level
        FROM enterprises e
        LEFT JOIN enterprise_departments ed ON e.id = ed.enterprise_id 
            AND ed.description LIKE '%Migrated from company_departments%'
            AND ed.deleted_at IS NULL
        GROUP BY e.id, e.name
        HAVING COUNT(ed.id) > 0
        ORDER BY e.name
    LOOP
        RAISE NOTICE '  Enterprise: % - Departments: %, Max Level: %', 
            r.enterprise_name, r.dept_count, r.max_level;
    END LOOP;
END $$;

-- 第八步：更新外键引用（如果有其他表引用company_departments）
-- 注意：这里需要根据实际情况更新其他表的引用

-- 检查company_users表是否有department_id引用
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'company_users' 
        AND column_name = 'department_id'
    ) THEN
        RAISE NOTICE 'Found company_users.department_id reference, will need to update in separate migration';
    END IF;
END $$;

COMMIT;

-- 输出完成信息
DO $$
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Company departments migration completed';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Update any foreign key references to company_departments';
    RAISE NOTICE '2. Update application code to use enterprise_departments';
    RAISE NOTICE '3. After verification, consider dropping company_departments table';
    RAISE NOTICE '==========================================';
END $$;