-- 047_update_company_users_department_references/up.sql
-- 更新company_users表的department_id外键引用到enterprise_departments
-- 作者: Claude Code AI
-- 创建时间: 2025-09-06

BEGIN;

DO $$
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Updating company_users department_id foreign key references';
    RAISE NOTICE '==========================================';
END $$;

-- 第一步：创建映射表，将old department_id映射到new enterprise_department_id
CREATE TEMP TABLE department_mapping AS
SELECT 
    cd.id as old_department_id,
    cd.name as old_department_name,
    cd.company_id,
    c.company_name,
    ed.id as new_department_id,
    ed.enterprise_id,
    e.name as enterprise_name
FROM company_departments cd
JOIN companies c ON cd.company_id = c.id
-- 通过description字段中的原始ID匹配
JOIN enterprise_departments ed ON ed.description LIKE '%company_departments id: ' || cd.id || '%'
JOIN enterprises e ON ed.enterprise_id = e.id
WHERE cd.deleted_at IS NULL
  AND ed.deleted_at IS NULL;

-- 显示映射关系
DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE 'Department ID mapping for company_users updates:';
    FOR r IN SELECT * FROM department_mapping
    LOOP
        RAISE NOTICE 'Old Dept ID % (%) in Company % -> New Dept ID % in Enterprise %', 
            r.old_department_id, r.old_department_name, r.company_name, 
            r.new_department_id, r.enterprise_name;
    END LOOP;
END $$;

-- 第二步：显示将要更新的用户
DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE 'Users to be updated:';
    FOR r IN 
        SELECT 
            cu.id,
            cu.name,
            cu.department_id as old_dept_id,
            dm.old_department_name,
            dm.new_department_id,
            dm.enterprise_name
        FROM company_users cu
        JOIN department_mapping dm ON cu.department_id = dm.old_department_id
    LOOP
        RAISE NOTICE 'User % (ID: %) from dept % (ID: %) -> new dept ID % in %', 
            r.name, r.id, r.old_department_name, r.old_dept_id, 
            r.new_department_id, r.enterprise_name;
    END LOOP;
END $$;

-- 第三步：备份当前的department_id关联
CREATE TEMP TABLE company_users_department_backup AS
SELECT 
    cu.id as user_id,
    cu.name as user_name,
    cu.department_id as old_department_id,
    cd.name as old_department_name,
    cd.company_id,
    c.company_name,
    now() as backup_timestamp
FROM company_users cu
JOIN company_departments cd ON cu.department_id = cd.id
JOIN companies c ON cd.company_id = c.id
WHERE cu.department_id IS NOT NULL;

DO $$
BEGIN
    RAISE NOTICE 'Created backup of % user department associations', 
        (SELECT COUNT(*) FROM company_users_department_backup);
END $$;

-- 第四步：删除现有的外键约束
ALTER TABLE company_users DROP CONSTRAINT IF EXISTS fk_company_users_department;

DO $$
BEGIN
    RAISE NOTICE 'Dropped old foreign key constraint fk_company_users_department';
END $$;

-- 第五步：更新department_id引用
UPDATE company_users 
SET department_id = dm.new_department_id
FROM department_mapping dm
WHERE company_users.department_id = dm.old_department_id;

-- 获取更新的行数
DO $$
DECLARE
    v_updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated department_id for % users', v_updated_count;
END $$;

-- 第六步：添加新的外键约束到enterprise_departments
ALTER TABLE company_users 
ADD CONSTRAINT fk_company_users_enterprise_department 
FOREIGN KEY (department_id) REFERENCES enterprise_departments(id) ON DELETE SET NULL;

DO $$
BEGIN
    RAISE NOTICE 'Added new foreign key constraint to enterprise_departments';
END $$;

-- 第七步：验证更新结果
DO $$
DECLARE
    v_total_users INTEGER;
    v_users_with_dept INTEGER;
    v_valid_references INTEGER;
BEGIN
    -- 统计结果
    SELECT COUNT(*) INTO v_total_users FROM company_users;
    SELECT COUNT(*) INTO v_users_with_dept FROM company_users WHERE department_id IS NOT NULL;
    SELECT COUNT(*) INTO v_valid_references 
    FROM company_users cu
    JOIN enterprise_departments ed ON cu.department_id = ed.id
    WHERE cu.department_id IS NOT NULL;
    
    RAISE NOTICE 'Verification Results:';
    RAISE NOTICE '  Total users: %', v_total_users;
    RAISE NOTICE '  Users with department: %', v_users_with_dept;
    RAISE NOTICE '  Valid department references: %', v_valid_references;
    
    IF v_users_with_dept != v_valid_references THEN
        RAISE WARNING 'Mismatch in department references! Users with dept: %, Valid refs: %', 
            v_users_with_dept, v_valid_references;
    ELSE
        RAISE NOTICE '✓ All department references are valid';
    END IF;
END $$;

-- 第八步：显示更新后的用户部门关联
DO $$
BEGIN
    RAISE NOTICE 'Updated user department associations:';
    FOR r IN 
        SELECT 
            cu.id,
            cu.name as user_name,
            cu.department_id,
            ed.name as department_name,
            e.name as enterprise_name
        FROM company_users cu
        JOIN enterprise_departments ed ON cu.department_id = ed.id
        JOIN enterprises e ON ed.enterprise_id = e.id
        ORDER BY cu.id
    LOOP
        RAISE NOTICE '  User % (ID: %) -> Dept: % in Enterprise: %', 
            r.user_name, r.id, r.department_name, r.enterprise_name;
    END LOOP;
END $$;

-- 第九步：更新相关索引（如果需要）
-- 索引会自动更新，但我们可以重新分析统计信息
ANALYZE company_users;

COMMIT;

-- 输出完成信息
DO $$
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Company users department_id foreign key update completed';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Test application functionality with updated references';
    RAISE NOTICE '2. Verify user-department associations are working correctly';
    RAISE NOTICE '3. Consider dropping company_departments table after full verification';
    RAISE NOTICE '==========================================';
END $$;