-- 种子数据验证脚本
-- 文件: 990_validate_seed_data.sql
-- 描述: 验证种子数据的完整性和一致性
-- 作者: Claude AI (任务#365)
-- 创建时间: 2025-08-27
-- 环境: all

BEGIN;

-- =============================================================================
-- 1. 数据完整性验证
-- =============================================================================

DO $$
DECLARE
    validation_errors TEXT[] := ARRAY[]::TEXT[];
    error_count INTEGER := 0;
    
    -- 统计变量
    role_count INTEGER;
    permission_count INTEGER;
    user_count INTEGER;
    project_count INTEGER;
    task_count INTEGER;
    customer_count INTEGER;
    
    -- 数据一致性检查变量
    orphaned_tasks INTEGER;
    orphaned_users INTEGER;
    invalid_assignments INTEGER;
    missing_permissions INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '开始种子数据验证';
    RAISE NOTICE '验证时间: %', NOW();
    RAISE NOTICE '========================================';
    
    -- =============================================================================
    -- 2. 基础数据存在性检查
    -- =============================================================================
    
    RAISE NOTICE '1. 检查基础数据存在性...';
    
    -- 检查系统角色
    SELECT COUNT(*) INTO role_count FROM company_roles WHERE is_system_role = true;
    IF role_count < 3 THEN
        validation_errors := array_append(validation_errors, 
            '缺少基础系统角色，当前数量: ' || role_count || '，期望至少: 3');
        error_count := error_count + 1;
    END IF;
    
    -- 检查基础权限
    SELECT COUNT(*) INTO permission_count FROM permissions WHERE is_active = true;
    IF permission_count < 10 THEN
        validation_errors := array_append(validation_errors,
            '缺少基础权限配置，当前数量: ' || permission_count || '，期望至少: 10');
        error_count := error_count + 1;
    END IF;
    
    -- 检查管理员用户
    SELECT COUNT(*) INTO user_count FROM users WHERE username = 'admin' AND is_active = true;
    IF user_count = 0 THEN
        validation_errors := array_append(validation_errors, '缺少管理员用户 (admin)');
        error_count := error_count + 1;
    END IF;
    
    RAISE NOTICE '   ✓ 系统角色数量: %', role_count;
    RAISE NOTICE '   ✓ 活跃权限数量: %', permission_count;
    RAISE NOTICE '   ✓ 管理员用户: %', CASE WHEN user_count > 0 THEN '存在' ELSE '缺失' END;
    
    -- =============================================================================
    -- 3. 数据一致性检查
    -- =============================================================================
    
    RAISE NOTICE '2. 检查数据一致性...';
    
    -- 检查孤立任务 (项目不存在或被删除)
    SELECT COUNT(*) INTO orphaned_tasks 
    FROM tasks t 
    LEFT JOIN projects p ON t.project_id = p.id 
    WHERE p.id IS NULL OR p.deleted_at IS NOT NULL;
    
    IF orphaned_tasks > 0 THEN
        validation_errors := array_append(validation_errors,
            '发现 ' || orphaned_tasks || ' 个孤立任务 (关联的项目不存在)');
        error_count := error_count + 1;
    END IF;
    
    -- 检查无效任务分配 (分配给不存在的用户)
    SELECT COUNT(*) INTO invalid_assignments
    FROM tasks t
    LEFT JOIN users u ON t.assignee_id = u.id
    WHERE t.assignee_id IS NOT NULL 
      AND (u.id IS NULL OR u.is_active = false OR u.deleted_at IS NOT NULL);
    
    IF invalid_assignments > 0 THEN
        validation_errors := array_append(validation_errors,
            '发现 ' || invalid_assignments || ' 个无效任务分配 (分配给不存在或已删除的用户)');
        error_count := error_count + 1;
    END IF;
    
    -- 检查孤立用户角色 (用户不存在)
    SELECT COUNT(*) INTO orphaned_users
    FROM company_users cu
    LEFT JOIN users u ON cu.user_id = u.id
    WHERE u.id IS NULL OR u.deleted_at IS NOT NULL;
    
    IF orphaned_users > 0 THEN
        validation_errors := array_append(validation_errors,
            '发现 ' || orphaned_users || ' 个孤立的用户角色关联');
        error_count := error_count + 1;
    END IF;
    
    -- 检查角色权限完整性
    SELECT COUNT(*) INTO missing_permissions
    FROM company_roles cr
    LEFT JOIN role_permissions rp ON cr.id = rp.role_id
    WHERE cr.is_system_role = true AND cr.is_active = true AND rp.role_id IS NULL;
    
    IF missing_permissions > 0 THEN
        validation_errors := array_append(validation_errors,
            '发现 ' || missing_permissions || ' 个系统角色缺少权限配置');
        error_count := error_count + 1;
    END IF;
    
    RAISE NOTICE '   ✓ 孤立任务数量: %', orphaned_tasks;
    RAISE NOTICE '   ✓ 无效任务分配: %', invalid_assignments;
    RAISE NOTICE '   ✓ 孤立用户角色: %', orphaned_users;
    RAISE NOTICE '   ✓ 缺少权限的系统角色: %', missing_permissions;
    
    -- =============================================================================
    -- 4. 业务逻辑验证
    -- =============================================================================
    
    RAISE NOTICE '3. 检查业务逻辑...';
    
    -- 检查任务层级关系
    DECLARE
        circular_tasks INTEGER;
        invalid_hierarchy INTEGER;
    BEGIN
        -- 检查循环依赖 (简化检查)
        SELECT COUNT(*) INTO circular_tasks
        FROM tasks t1
        JOIN tasks t2 ON t1.parent_id = t2.id
        WHERE t2.parent_id = t1.id;
        
        IF circular_tasks > 0 THEN
            validation_errors := array_append(validation_errors,
                '发现 ' || circular_tasks || ' 个任务存在循环依赖关系');
            error_count := error_count + 1;
        END IF;
        
        -- 检查无效的父任务关系
        SELECT COUNT(*) INTO invalid_hierarchy
        FROM tasks t1
        LEFT JOIN tasks t2 ON t1.parent_id = t2.id
        WHERE t1.parent_id IS NOT NULL 
          AND (t2.id IS NULL OR t2.project_id != t1.project_id);
        
        IF invalid_hierarchy > 0 THEN
            validation_errors := array_append(validation_errors,
                '发现 ' || invalid_hierarchy || ' 个任务的父任务关系无效');
            error_count := error_count + 1;
        END IF;
        
        RAISE NOTICE '   ✓ 循环依赖任务: %', circular_tasks;
        RAISE NOTICE '   ✓ 无效层级关系: %', invalid_hierarchy;
    END;
    
    -- 检查时间逻辑
    DECLARE
        invalid_time_ranges INTEGER;
        future_logs INTEGER;
    BEGIN
        -- 检查项目时间范围
        SELECT COUNT(*) INTO invalid_time_ranges
        FROM projects
        WHERE start_date IS NOT NULL 
          AND end_date IS NOT NULL 
          AND start_date > end_date;
        
        IF invalid_time_ranges > 0 THEN
            validation_errors := array_append(validation_errors,
                '发现 ' || invalid_time_ranges || ' 个项目的时间范围无效 (开始时间晚于结束时间)');
            error_count := error_count + 1;
        END IF;
        
        -- 检查未来的时间日志
        SELECT COUNT(*) INTO future_logs
        FROM task_time_logs
        WHERE start_time > NOW() + INTERVAL '1 day';
        
        IF future_logs > 0 THEN
            validation_errors := array_append(validation_errors,
                '发现 ' || future_logs || ' 条时间日志记录在未来时间');
            error_count := error_count + 1;
        END IF;
        
        RAISE NOTICE '   ✓ 无效时间范围项目: %', invalid_time_ranges;
        RAISE NOTICE '   ✓ 未来时间日志: %', future_logs;
    END;
    
    -- =============================================================================
    -- 5. 性能相关验证
    -- =============================================================================
    
    RAISE NOTICE '4. 检查性能相关配置...';
    
    DECLARE
        missing_indexes INTEGER;
        large_tables INTEGER;
    BEGIN
        -- 检查关键索引是否存在
        SELECT COUNT(*) INTO missing_indexes
        FROM (
            SELECT 'idx_tasks_project_id' as index_name
            UNION SELECT 'idx_tasks_assignee_id'
            UNION SELECT 'idx_users_username'  
            UNION SELECT 'idx_users_email'
        ) expected
        LEFT JOIN pg_indexes pi ON pi.indexname = expected.index_name
        WHERE pi.indexname IS NULL;
        
        IF missing_indexes > 0 THEN
            validation_errors := array_append(validation_errors,
                '缺少 ' || missing_indexes || ' 个关键索引');
            error_count := error_count + 1;
        END IF;
        
        -- 检查大表 (超过10000行的表)
        SELECT COUNT(*) INTO large_tables
        FROM (
            SELECT relname, n_tup_ins + n_tup_upd + n_tup_del as total_ops
            FROM pg_stat_user_tables 
            WHERE schemaname = 'public'
            AND n_tup_ins > 10000
        ) large_table_stats;
        
        RAISE NOTICE '   ✓ 缺少关键索引: %', missing_indexes;
        RAISE NOTICE '   ✓ 大数据量表数量: %', large_tables;
    END;
    
    -- =============================================================================
    -- 6. 数据质量检查
    -- =============================================================================
    
    RAISE NOTICE '5. 检查数据质量...';
    
    DECLARE
        empty_required_fields INTEGER;
        invalid_emails INTEGER;
        duplicate_data INTEGER;
    BEGIN
        -- 检查必填字段为空
        SELECT COUNT(*) INTO empty_required_fields
        FROM (
            SELECT id FROM users WHERE username IS NULL OR username = '' OR email IS NULL OR email = ''
            UNION
            SELECT id FROM projects WHERE name IS NULL OR name = '' OR code IS NULL OR code = ''
            UNION  
            SELECT id FROM tasks WHERE title IS NULL OR title = ''
        ) empty_fields;
        
        IF empty_required_fields > 0 THEN
            validation_errors := array_append(validation_errors,
                '发现 ' || empty_required_fields || ' 条记录的必填字段为空');
            error_count := error_count + 1;
        END IF;
        
        -- 检查邮箱格式
        SELECT COUNT(*) INTO invalid_emails
        FROM users 
        WHERE email IS NOT NULL 
          AND email != ''
          AND email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
        
        IF invalid_emails > 0 THEN
            validation_errors := array_append(validation_errors,
                '发现 ' || invalid_emails || ' 个无效的邮箱地址');
            error_count := error_count + 1;
        END IF;
        
        -- 检查重复数据
        SELECT COUNT(*) INTO duplicate_data
        FROM (
            SELECT username, COUNT(*) 
            FROM users 
            WHERE deleted_at IS NULL
            GROUP BY username 
            HAVING COUNT(*) > 1
        ) duplicates;
        
        IF duplicate_data > 0 THEN
            validation_errors := array_append(validation_errors,
                '发现 ' || duplicate_data || ' 个重复的用户名');
            error_count := error_count + 1;
        END IF;
        
        RAISE NOTICE '   ✓ 必填字段为空: %', empty_required_fields;
        RAISE NOTICE '   ✓ 无效邮箱地址: %', invalid_emails;
        RAISE NOTICE '   ✓ 重复用户名: %', duplicate_data;
    END;
    
    -- =============================================================================
    -- 7. 生成验证报告
    -- =============================================================================
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '种子数据验证报告';
    RAISE NOTICE '========================================';
    
    -- 统计信息
    SELECT COUNT(*) INTO user_count FROM users WHERE deleted_at IS NULL;
    SELECT COUNT(*) INTO project_count FROM projects WHERE deleted_at IS NULL;
    SELECT COUNT(*) INTO task_count FROM tasks WHERE deleted_at IS NULL;
    SELECT COUNT(*) INTO customer_count FROM customers WHERE deleted_at IS NULL;
    
    RAISE NOTICE '数据统计:';
    RAISE NOTICE '- 活跃用户: %', user_count;
    RAISE NOTICE '- 活跃项目: %', project_count;
    RAISE NOTICE '- 活跃任务: %', task_count;
    RAISE NOTICE '- 活跃客户: %', customer_count;
    RAISE NOTICE '';
    
    IF error_count = 0 THEN
        RAISE NOTICE '验证结果: ✅ 通过';
        RAISE NOTICE '所有检查项目都通过，种子数据完整且一致。';
    ELSE
        RAISE NOTICE '验证结果: ❌ 失败';
        RAISE NOTICE '发现 % 个问题:', error_count;
        
        FOR i IN 1..array_length(validation_errors, 1) LOOP
            RAISE NOTICE '  %、%', i, validation_errors[i];
        END LOOP;
        
        RAISE NOTICE '';
        RAISE NOTICE '建议: 请根据上述问题进行数据修复或重新运行种子脚本。';
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '验证完成时间: %', NOW();
    RAISE NOTICE '========================================';
    
    -- 如果有严重错误，可以选择抛出异常
    -- IF error_count > 0 THEN
    --     RAISE EXCEPTION '种子数据验证失败，发现 % 个问题', error_count;
    -- END IF;
    
END $$;

COMMIT;