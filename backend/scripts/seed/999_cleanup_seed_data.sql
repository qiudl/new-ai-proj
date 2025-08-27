        RAISE EXCEPTION '禁止在生产环境执行数据清理脚本！当前环境: %', app_env;
    END IF;
    
    -- 需要明确确认
    IF user_confirm != 'true' THEN
        RAISE EXCEPTION '请设置 app_cleanup_confirm=true 来确认要执行数据清理';
    END IF;
    
    RAISE NOTICE '开始清理种子数据，环境: %', app_env;
    RAISE WARNING '此操作将删除所有种子和测试数据，不可撤销！';
END $$;

-- =============================================================================
-- 2. 清理时间记录（最先清理，避免外键约束）
-- =============================================================================

DO $$
DECLARE
    deleted_count integer;
BEGIN
    -- 清理种子项目相关的时间记录
    DELETE FROM task_time_logs 
    WHERE task_id IN (
        SELECT t.id FROM tasks t 
        JOIN projects p ON t.project_id = p.id 
        WHERE p.name LIKE '%种子%' 
        OR p.name LIKE '%智慧物流%'
        OR p.name LIKE '%医疗器械%' 
        OR p.name LIKE '%开发工具%'
        OR p.name LIKE '%演示%'
        OR p.name LIKE '%测试%'
        OR p.name LIKE '%Demo%'
        OR p.name LIKE '%Seed%'
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '已清理时间记录: % 条', deleted_count;
    
    -- 清理种子用户的所有时间记录
    DELETE FROM task_time_logs
    WHERE user_id IN (
        SELECT id FROM users 
        WHERE profile::text LIKE '%is_seed_user%'
        OR profile::text LIKE '%is_demo_user%'
        OR username LIKE 'seed_%'
        OR username LIKE 'demo_%'
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '已清理种子用户时间记录: % 条', deleted_count;
END $$;

-- =============================================================================
-- 3. 清理统一计时器记录
-- =============================================================================

DO $$
DECLARE
    deleted_count integer;
BEGIN
    -- 清理种子用户的计时器记录
    DELETE FROM unified_timer_logs
    WHERE user_id IN (
        SELECT id FROM users 
        WHERE profile::text LIKE '%is_seed_user%'
        OR profile::text LIKE '%is_demo_user%'
        OR username LIKE 'seed_%'
        OR username LIKE 'demo_%'
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '已清理计时器记录: % 条', deleted_count;
END $$;

-- =============================================================================
-- 4. 清理任务关系
-- =============================================================================

DO $$
DECLARE
    deleted_count integer;
BEGIN
    -- 清理种子项目的任务关系
    DELETE FROM task_relationships
    WHERE from_task_id IN (
        SELECT t.id FROM tasks t 
        JOIN projects p ON t.project_id = p.id 
        WHERE p.name LIKE '%种子%' 
        OR p.name LIKE '%智慧物流%'
        OR p.name LIKE '%医疗器械%' 
        OR p.name LIKE '%开发工具%'
        OR p.name LIKE '%演示%'
        OR p.name LIKE '%测试%'
        OR p.name LIKE '%Demo%'
        OR p.name LIKE '%Seed%'
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '已清理任务关系: % 条', deleted_count;
END $$;

-- =============================================================================
-- 5. 清理任务文档关联
-- =============================================================================

DO $$
DECLARE
    deleted_count integer;
BEGIN
    -- 清理任务文档关联
    DELETE FROM task_documents
    WHERE task_id IN (
        SELECT t.id FROM tasks t 
        JOIN projects p ON t.project_id = p.id 
        WHERE p.name LIKE '%种子%' 
        OR p.name LIKE '%智慧物流%'
        OR p.name LIKE '%医疗器械%' 
        OR p.name LIKE '%开发工具%'
        OR p.name LIKE '%演示%'
        OR p.name LIKE '%测试%'
        OR p.name LIKE '%Demo%'
        OR p.name LIKE '%Seed%'
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '已清理任务文档关联: % 条', deleted_count;
END $$;

-- =============================================================================
-- 6. 清理任务状态历史
-- =============================================================================

DO $$
DECLARE
    deleted_count integer;
BEGIN
    -- 清理任务状态变更历史
    DELETE FROM task_status_history
    WHERE task_id IN (
        SELECT t.id FROM tasks t 
        JOIN projects p ON t.project_id = p.id 
        WHERE p.name LIKE '%种子%' 
        OR p.name LIKE '%智慧物流%'
        OR p.name LIKE '%医疗器械%' 
        OR p.name LIKE '%开发工具%'
        OR p.name LIKE '%演示%'
        OR p.name LIKE '%测试%'
        OR p.name LIKE '%Demo%'
        OR p.name LIKE '%Seed%'
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '已清理任务状态历史: % 条', deleted_count;
END $$;

-- =============================================================================
-- 7. 清理任务数据
-- =============================================================================

DO $$
DECLARE
    deleted_count integer;
BEGIN
    -- 清理种子项目的所有任务
    DELETE FROM tasks 
    WHERE project_id IN (
        SELECT id FROM projects 
        WHERE name LIKE '%种子%' 
        OR name LIKE '%智慧物流%'
        OR name LIKE '%医疗器械%' 
        OR name LIKE '%开发工具%'
        OR name LIKE '%演示%'
        OR name LIKE '%测试%'
        OR name LIKE '%Demo%'
        OR name LIKE '%Seed%'
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '已清理任务数据: % 条', deleted_count;
END $$;

-- =============================================================================
-- 8. 清理项目用户关联
-- =============================================================================

DO $$
DECLARE
    deleted_count integer;
BEGIN
    -- 清理项目用户关联
    DELETE FROM project_users
    WHERE project_id IN (
        SELECT id FROM projects 
        WHERE name LIKE '%种子%' 
        OR name LIKE '%智慧物流%'
        OR name LIKE '%医疗器械%' 
        OR name LIKE '%开发工具%'
        OR name LIKE '%演示%'
        OR name LIKE '%测试%'
        OR name LIKE '%Demo%'
        OR name LIKE '%Seed%'
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '已清理项目用户关联: % 条', deleted_count;
END $$;

-- =============================================================================
-- 9. 清理项目数据
-- =============================================================================

DO $$
DECLARE
    deleted_count integer;
BEGIN
    -- 清理种子项目
    DELETE FROM projects 
    WHERE name LIKE '%种子%' 
    OR name LIKE '%智慧物流%'
    OR name LIKE '%医疗器械%' 
    OR name LIKE '%开发工具%'
    OR name LIKE '%演示%'
    OR name LIKE '%测试%'
    OR name LIKE '%Demo%'
    OR name LIKE '%Seed%';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '已清理项目数据: % 条', deleted_count;
END $$;

-- =============================================================================
-- 10. 清理文档数据
-- =============================================================================

DO $$
DECLARE
    deleted_count integer;
BEGIN
    -- 清理种子用户创建的文档
    DELETE FROM documents
    WHERE created_by IN (
        SELECT id FROM users 
        WHERE profile::text LIKE '%is_seed_user%'
        OR profile::text LIKE '%is_demo_user%'
        OR username LIKE 'seed_%'
        OR username LIKE 'demo_%'
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '已清理文档数据: % 条', deleted_count;
    
    -- 清理标题中包含种子/测试关键词的文档
    DELETE FROM documents
    WHERE title LIKE '%种子%'
    OR title LIKE '%测试%'
    OR title LIKE '%演示%'
    OR title LIKE '%Demo%'
    OR title LIKE '%Seed%'
    OR title LIKE '%智慧物流%'
    OR title LIKE '%医疗器械%';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '已清理种子文档: % 条', deleted_count;
END $$;

-- =============================================================================
-- 11. 清理企业用户关联
-- =============================================================================

DO $$
DECLARE
    deleted_count integer;
BEGIN
    -- 清理企业用户关联（在删除用户前）
    DELETE FROM customer_users
    WHERE user_id IN (
        SELECT id FROM users 
        WHERE user_type = 'company'
        AND (
            profile::text LIKE '%is_seed_user%'
            OR profile::text LIKE '%is_demo_user%'
            OR username LIKE 'seed_%'
            OR username LIKE 'demo_%'
        )
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '已清理企业用户关联: % 条', deleted_count;
END $$;

-- =============================================================================
-- 12. 清理用户数据
-- =============================================================================

DO $$
DECLARE
    deleted_count integer;
    protected_users text[] := ARRAY['admin', 'qiudl', 'johnqiu', 'weier', 'guoym'];
BEGIN
    -- 清理种子和演示用户（保护重要的管理员用户）
    DELETE FROM users 
    WHERE (
        profile::text LIKE '%is_seed_user%'
        OR profile::text LIKE '%is_demo_user%'
        OR username LIKE 'seed_%'
        OR username LIKE 'demo_%'
    )
    AND username != ALL(protected_users);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '已清理种子用户数据: % 条', deleted_count;
END $$;

-- =============================================================================
-- 13. 清理企业数据
-- =============================================================================

DO $$
DECLARE
    deleted_count integer;
BEGIN
    -- 清理测试企业
    DELETE FROM customers 
    WHERE company_code IN ('SEED_TECH', 'DEMO_GROUP', 'TEST_CLIENT', 'SMART_LOGISTICS', 'INNOV_MEDICAL', 'GREEN_ENERGY', 'FASHION_RETAIL')
    OR company_name LIKE '%种子%'
    OR company_name LIKE '%测试%'
    OR company_name LIKE '%演示%'
    OR company_name LIKE '%Demo%'
    OR company_name LIKE '%Test%'
    OR company_name LIKE '%智慧物流%'
    OR company_name LIKE '%创新医疗%'
    OR company_name LIKE '%绿色能源%'
    OR company_name LIKE '%时尚零售%';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '已清理测试企业数据: % 条', deleted_count;
END $$;

-- =============================================================================
-- 14. 清理审计日志（可选）
-- =============================================================================

DO $$
DECLARE
    deleted_count integer;
BEGIN
    -- 清理种子用户的审计日志
    DELETE FROM audit_logs
    WHERE user_id IN (
        SELECT id FROM users 
        WHERE profile::text LIKE '%is_seed_user%'
        OR profile::text LIKE '%is_demo_user%'
        OR username LIKE 'seed_%'
        OR username LIKE 'demo_%'
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '已清理审计日志: % 条', deleted_count;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE '审计日志表不存在，跳过清理';
END $$;

-- =============================================================================
-- 15. 重置序列（可选）
-- =============================================================================

DO $$
DECLARE
    max_id integer;
BEGIN
    -- 重置项目ID序列
    SELECT COALESCE(MAX(id), 0) INTO max_id FROM projects;
    PERFORM setval('projects_id_seq', max_id + 1, false);
    RAISE NOTICE '已重置projects序列，下一个ID: %', max_id + 1;
    
    -- 重置任务ID序列
    SELECT COALESCE(MAX(id), 0) INTO max_id FROM tasks;
    PERFORM setval('tasks_id_seq', max_id + 1, false);
    RAISE NOTICE '已重置tasks序列，下一个ID: %', max_id + 1;
    
    -- 重置用户ID序列
    SELECT COALESCE(MAX(id), 0) INTO max_id FROM users;
    PERFORM setval('users_id_seq', max_id + 1, false);
    RAISE NOTICE '已重置users序列，下一个ID: %', max_id + 1;
    
    -- 重置企业ID序列
    SELECT COALESCE(MAX(id), 0) INTO max_id FROM customers;
    PERFORM setval('customers_id_seq', max_id + 1, false);
    RAISE NOTICE '已重置customers序列，下一个ID: %', max_id + 1;
    
EXCEPTION
    WHEN others THEN
        RAISE WARNING '重置序列时出现错误: %', SQLERRM;
END $$;

-- =============================================================================
-- 16. 数据验证和清理确认
-- =============================================================================

DO $$
DECLARE
    remaining_seed_users integer;
    remaining_seed_projects integer;
    remaining_seed_tasks integer;
    remaining_seed_companies integer;
    remaining_time_logs integer;
    total_users integer;
    total_projects integer;
    total_tasks integer;
BEGIN
    -- 统计剩余的种子数据
    SELECT COUNT(*) INTO remaining_seed_users FROM users 
    WHERE profile::text LIKE '%is_seed_user%' OR profile::text LIKE '%is_demo_user%'
    OR username LIKE 'seed_%' OR username LIKE 'demo_%';
    
    SELECT COUNT(*) INTO remaining_seed_projects FROM projects
    WHERE name LIKE '%种子%' OR name LIKE '%智慧物流%' OR name LIKE '%医疗器械%' 
    OR name LIKE '%开发工具%' OR name LIKE '%演示%' OR name LIKE '%测试%'
    OR name LIKE '%Demo%' OR name LIKE '%Seed%';
    
    SELECT COUNT(*) INTO remaining_seed_tasks FROM tasks t
    JOIN projects p ON t.project_id = p.id
    WHERE p.name LIKE '%种子%' OR p.name LIKE '%智慧物流%' OR p.name LIKE '%医疗器械%' 
    OR p.name LIKE '%开发工具%' OR p.name LIKE '%演示%' OR p.name LIKE '%测试%'
    OR p.name LIKE '%Demo%' OR p.name LIKE '%Seed%';
    
    SELECT COUNT(*) INTO remaining_seed_companies FROM customers
    WHERE company_code IN ('SEED_TECH', 'DEMO_GROUP', 'TEST_CLIENT', 'SMART_LOGISTICS', 'INNOV_MEDICAL', 'GREEN_ENERGY', 'FASHION_RETAIL')
    OR company_name LIKE '%种子%' OR company_name LIKE '%测试%' OR company_name LIKE '%演示%'
    OR company_name LIKE '%Demo%' OR company_name LIKE '%Test%' OR company_name LIKE '%智慧物流%'
    OR company_name LIKE '%创新医疗%' OR company_name LIKE '%绿色能源%' OR company_name LIKE '%时尚零售%';
    
    SELECT COUNT(*) INTO remaining_time_logs FROM task_time_logs ttl
    JOIN tasks t ON ttl.task_id = t.id
    JOIN projects p ON t.project_id = p.id
    WHERE p.name LIKE '%种子%' OR p.name LIKE '%智慧物流%' OR p.name LIKE '%医疗器械%' 
    OR p.name LIKE '%开发工具%' OR p.name LIKE '%演示%' OR p.name LIKE '%测试%';
    
    -- 统计系统总数据
    SELECT COUNT(*) INTO total_users FROM users WHERE deleted_at IS NULL;
    SELECT COUNT(*) INTO total_projects FROM projects;
    SELECT COUNT(*) INTO total_tasks FROM tasks;
    
    RAISE NOTICE '=== 种子数据清理完成 ===';
    RAISE NOTICE '剩余种子用户: %', remaining_seed_users;
    RAISE NOTICE '剩余种子项目: %', remaining_seed_projects;
    RAISE NOTICE '剩余种子任务: %', remaining_seed_tasks;
    RAISE NOTICE '剩余种子企业: %', remaining_seed_companies;
    RAISE NOTICE '剩余种子时间记录: %', remaining_time_logs;
    RAISE NOTICE '========================';
    RAISE NOTICE '系统总用户数: %', total_users;
    RAISE NOTICE '系统总项目数: %', total_projects;
    RAISE NOTICE '系统总任务数: %', total_tasks;
    RAISE NOTICE '========================';
    
    -- 如果还有剩余种子数据，发出警告
    IF remaining_seed_users > 0 OR remaining_seed_projects > 0 OR remaining_seed_tasks > 0 OR remaining_seed_companies > 0 THEN
        RAISE WARNING '仍有种子数据未被清理，可能需要手动处理';
    ELSE
        RAISE NOTICE '所有种子数据已成功清理';
    END IF;
END $$;

-- =============================================================================
-- 17. 可选：重新创建基础种子数据
-- =============================================================================

DO $$
DECLARE
    recreate_basic boolean := COALESCE(current_setting('app_recreate_basic_seed', true)::boolean, false);
BEGIN
    IF recreate_basic THEN
        RAISE NOTICE '重新创建基础种子数据...';
        
        -- 重新创建基础管理员用户（如果不存在）
        INSERT INTO users (
            username, email, password_hash, role, user_type, status,
            profile, created_at, updated_at
        ) VALUES (
            'seed_admin',
            'seed_admin@system.local',
            '$2a$10$rQ8K/7.OhGJB5vXmXFVw0.QqwE1WGJxV8z4DjZ9Z5fxPmF1mJ8J8K', -- seed_admin_2024
            'admin',
            'system',
            'active',
            '{"display_name": "种子管理员", "is_seed_user": true, "created_by": "cleanup_script"}',
            NOW(),
            NOW()
        ) ON CONFLICT (username) DO NOTHING;
        
        RAISE NOTICE '基础种子数据重建完成';
    ELSE
        RAISE NOTICE '跳过基础种子数据重建（设置 app_recreate_basic_seed=true 来启用）';
    END IF;
END $$;

COMMIT;

-- =============================================================================
-- 18. 清理操作记录和建议
-- =============================================================================

DO $$
DECLARE
    cleanup_summary text;
BEGIN
    cleanup_summary := format(
        E'种子数据清理操作完成于: %s\n' ||
        E'执行环境: %s\n' ||
        E'清理范围: 所有标记为种子/测试/演示的数据\n' ||
        E'影响范围: 用户、项目、任务、企业、文档、时间记录等\n' ||
        E'建议操作:\n' ||
        E'  1. 检查系统功能是否正常\n' ||
        E'  2. 如需重新生成测试数据，执行相应的种子脚本\n' ||
        E'  3. 重启应用服务以清除缓存\n' ||
        E'  4. 检查相关的索引和统计信息',
        NOW(),
        COALESCE(current_setting('app_environment', true), 'unknown')
    );
    
    RAISE NOTICE E'%', cleanup_summary;
END $$;

-- 插入清理记录（如果有日志表）
-- INSERT INTO seed_execution_logs (script_name, executed_at, status, notes) VALUES 
-- ('999_cleanup_seed_data.sql', NOW(), 'success', '完整清理所有种子数据');

SELECT '种子数据清理脚本执行完成 - 所有测试数据已清理' as result;