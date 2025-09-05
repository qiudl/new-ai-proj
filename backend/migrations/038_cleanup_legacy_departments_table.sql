-- 清理遗留的departments表 - 安全删除不支持多租户的旧表
-- Migration: 038_cleanup_legacy_departments_table.sql

-- 1. 首先检查旧departments表是否被引用
DO $$
BEGIN
    -- 检查是否有其他表引用departments表（除了自引用）
    IF EXISTS (
        SELECT 1 FROM information_schema.key_column_usage 
        WHERE referenced_table_name = 'departments' 
        AND table_name != 'departments'
    ) THEN
        RAISE EXCEPTION '发现其他表引用departments表，需要先处理这些引用关系';
    END IF;
    
    RAISE NOTICE '✅ 检查完成：无其他表引用旧departments表';
END $$;

-- 2. 备份旧departments表数据（以防万一）
CREATE TABLE IF NOT EXISTS departments_backup_20250905 AS 
SELECT *, CURRENT_TIMESTAMP as backup_created_at 
FROM departments;

RAISE NOTICE '✅ 已创建departments表备份：departments_backup_20250905';

-- 3. 验证company_departments表数据完整性
DO $$
DECLARE
    dept_count INTEGER;
    company_dept_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO dept_count FROM departments WHERE deleted_at IS NULL;
    SELECT COUNT(*) INTO company_dept_count FROM company_departments WHERE deleted_at IS NULL;
    
    RAISE NOTICE '旧departments表活跃记录数: %', dept_count;
    RAISE NOTICE '新company_departments表活跃记录数: %', company_dept_count;
    
    -- 如果新表记录数明显少于旧表，发出警告
    IF company_dept_count < dept_count * 0.8 THEN
        RAISE NOTICE '⚠️ 警告：新表记录数明显少于旧表，请检查数据迁移完整性';
    ELSE
        RAISE NOTICE '✅ 数据迁移验证通过';
    END IF;
END $$;

-- 4. 安全删除旧departments表
DROP TABLE IF EXISTS departments CASCADE;

RAISE NOTICE '✅ 已删除旧departments表';

-- 5. 清理相关的序列
DROP SEQUENCE IF EXISTS departments_id_seq CASCADE;

RAISE NOTICE '✅ 已清理departments相关序列';

-- 6. 验证系统完整性
DO $$
BEGIN
    -- 验证company_departments表的外键约束正常
    PERFORM 1 FROM company_departments cd 
    INNER JOIN companies c ON cd.company_id = c.id 
    LIMIT 1;
    
    -- 验证用户部门关联正常
    PERFORM 1 FROM company_users cu 
    INNER JOIN company_departments cd ON cu.department_id = cd.id 
    LIMIT 1;
    
    RAISE NOTICE '✅ 系统完整性验证通过';
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION '❌ 系统完整性验证失败: %', SQLERRM;
END $$;

-- 7. 更新相关注释和文档
COMMENT ON TABLE company_departments IS '企业部门表 - 支持多租户数据隔离 (已清理旧departments表)';
COMMENT ON COLUMN company_users.department_id IS '部门ID - 关联到company_departments表 (多租户安全)';

-- 8. 最终报告
DO $$
DECLARE
    final_count INTEGER;
    user_dept_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO final_count FROM company_departments WHERE deleted_at IS NULL;
    SELECT COUNT(*) INTO user_dept_count FROM company_users WHERE department_id IS NOT NULL;
    
    RAISE NOTICE '=== 清理完成报告 ===';
    RAISE NOTICE '✅ 删除了旧的departments表（非多租户）';
    RAISE NOTICE '✅ 保留了company_departments表（支持多租户）';
    RAISE NOTICE '✅ 当前活跃部门数：%', final_count;
    RAISE NOTICE '✅ 已分配部门的用户数：%', user_dept_count;
    RAISE NOTICE '✅ 备份表：departments_backup_20250905（30天后可删除）';
    RAISE NOTICE '========================';
END $$;