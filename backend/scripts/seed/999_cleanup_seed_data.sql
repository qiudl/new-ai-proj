-- 种子数据清理和重置脚本 v2
-- 文件: 999_cleanup_seed_data.sql
-- 描述: 安全清理种子数据，支持选择性重建
-- 作者: Claude AI (任务#365)
-- 创建时间: 2025-08-27
-- 环境: development,test

BEGIN;

-- =============================================================================
-- 1. 安全检查
-- =============================================================================

DO $$
DECLARE
    app_env text := COALESCE(current_setting('app_environment', true), 'development');
    confirm_cleanup boolean := COALESCE(current_setting('app_cleanup_confirm', true), 'false')::boolean;
    recreate_basic boolean := COALESCE(current_setting('app_recreate_basic_seed', true), 'false')::boolean;
BEGIN
    -- 环境安全检查
    IF app_env = 'production' THEN
        RAISE EXCEPTION '禁止在生产环境执行清理操作！当前环境: %', app_env;
    END IF;
    
    -- 确认检查
    IF NOT confirm_cleanup THEN
        RAISE EXCEPTION '清理操作需要确认。请设置 app_cleanup_confirm=true 参数';
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '开始执行种子数据清理操作';
    RAISE NOTICE '环境: %', app_env;
    RAISE NOTICE '重建基础数据: %', CASE WHEN recreate_basic THEN '是' ELSE '否' END;
    RAISE NOTICE '========================================';
END $$;

-- =============================================================================
-- 2. 禁用外键约束 (加快删除速度)
-- =============================================================================

SET session_replication_role = replica;

-- =============================================================================
-- 3. 清理业务数据 (按依赖顺序)
-- =============================================================================

RAISE NOTICE '正在清理业务数据...';

-- 3.1 清理审计和日志数据
DELETE FROM audit_logs WHERE created_at >= CURRENT_DATE - INTERVAL '1 year';
DELETE FROM task_status_history WHERE changed_at >= CURRENT_DATE - INTERVAL '1 year';
DELETE FROM task_time_logs WHERE created_at >= CURRENT_DATE - INTERVAL '1 year';
DELETE FROM seed_execution_log WHERE executed_at >= CURRENT_DATE - INTERVAL '1 year';

RAISE NOTICE '已清理审计和日志数据';

-- 3.2 清理任务相关数据
DELETE FROM task_documents;
DELETE FROM task_relationships;
DELETE FROM task_updates WHERE created_at >= CURRENT_DATE - INTERVAL '1 year';

RAISE NOTICE '已清理任务关联数据';

-- 3.3 清理任务数据 (保留系统创建的基础任务)
DELETE FROM tasks WHERE created_at >= CURRENT_DATE - INTERVAL '1 year'
    AND title NOT LIKE '%系统%' 
    AND title NOT LIKE '%初始%'
    AND title NOT LIKE '%基础%';

RAISE NOTICE '已清理任务数据';

-- 3.4 清理文档数据
DELETE FROM document_versions WHERE created_at >= CURRENT_DATE - INTERVAL '1 year';
DELETE FROM documents WHERE created_at >= CURRENT_DATE - INTERVAL '1 year'
    AND title NOT LIKE '%系统%'
    AND title NOT LIKE '%模板%';

RAISE NOTICE '已清理文档数据';

-- 3.5 清理项目数据 (保留基础项目)
DELETE FROM project_users WHERE created_at >= CURRENT_DATE - INTERVAL '1 year';
DELETE FROM projects WHERE created_at >= CURRENT_DATE - INTERVAL '1 year'
    AND name NOT LIKE '%系统%'
    AND name NOT LIKE '%默认%'
    AND name NOT LIKE '%基础%';

RAISE NOTICE '已清理项目数据';

-- 3.6 清理客户数据 (保留基础客户)
DELETE FROM customer_contacts WHERE created_at >= CURRENT_DATE - INTERVAL '1 year';
DELETE FROM customer_users WHERE created_at >= CURRENT_DATE - INTERVAL '1 year';
DELETE FROM customers WHERE created_at >= CURRENT_DATE - INTERVAL '1 year'
    AND company_name NOT LIKE '%系统%'
    AND company_name NOT LIKE '%默认%'
    AND company_name NOT LIKE '%基础%';

RAISE NOTICE '已清理客户数据';

-- 3.7 清理测试用户数据 (保留admin和系统用户)
DELETE FROM company_user_project_permissions WHERE created_at >= CURRENT_DATE - INTERVAL '1 year';
DELETE FROM company_users WHERE created_at >= CURRENT_DATE - INTERVAL '1 year'
    AND user_id NOT IN (
        SELECT id FROM users 
        WHERE username IN ('admin', 'system') 
        OR email LIKE '%@system.%'
    );

DELETE FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '1 year'
    AND username NOT IN ('admin', 'system')
    AND email NOT LIKE '%@system.%'
    AND full_name NOT LIKE '%系统%'
    AND full_name NOT LIKE '%管理员%';

RAISE NOTICE '已清理测试用户数据';

-- 3.8 清理配置数据中的测试配置
DELETE FROM ai_configs WHERE config_key LIKE '%test%' OR config_key LIKE '%demo%';
DELETE FROM progress_config WHERE config_key LIKE '%test%' OR config_key LIKE '%demo%';

RAISE NOTICE '已清理测试配置数据';

-- =============================================================================
-- 4. 重新启用外键约束
-- =============================================================================

SET session_replication_role = DEFAULT;

-- =============================================================================
-- 5. 选择性重建基础种子数据
-- =============================================================================

DO $$
DECLARE
    recreate_basic boolean := COALESCE(current_setting('app_recreate_basic_seed', true), 'false')::boolean;
    admin_user_id INTEGER;
    basic_project_id INTEGER;
    basic_customer_id INTEGER;
BEGIN
    IF recreate_basic THEN
        RAISE NOTICE '开始重建基础种子数据...';
        
        -- 确保基础管理员用户存在
        SELECT id INTO admin_user_id FROM users WHERE username = 'admin';
        
        IF admin_user_id IS NULL THEN
            INSERT INTO users (
                username, email, full_name, password_hash,
                is_active, profile, created_at, updated_at
            ) VALUES (
                'admin',
                'admin@system.local',
                '系统管理员',
                '$2a$10$example_admin_hash',
                true,
                '{"role": "system_admin", "created_by": "seed_script"}',
                NOW(),
                NOW()
            ) RETURNING id INTO admin_user_id;
            
            RAISE NOTICE '已创建基础管理员用户';
        END IF;
        
        -- 创建基础客户
        INSERT INTO customers (
            company_name, company_code, industry, company_type,
            address, city, province, main_email, main_phone,
            status, priority, annual_contract_value,
            created_at, updated_at
        ) VALUES (
            '基础测试客户',
            'BASIC_TEST',
            '软件开发',
            '有限公司',
            '测试地址',
            '测试城市',
            '测试省份',
            'test@basic.local',
            '000-0000-0000',
            'active',
            'medium',
            100000.00,
            NOW(),
            NOW()
        ) RETURNING id INTO basic_customer_id;
        
        -- 创建基础项目
        INSERT INTO projects (
            name, code, description, status, priority,
            start_date, end_date, budget, estimated_hours,
            customer_id, project_manager_id,
            created_at, updated_at
        ) VALUES (
            '基础测试项目',
            'BASIC_TEST_PROJ',
            '用于系统测试的基础项目',
            'active',
            'low',
            CURRENT_DATE,
            CURRENT_DATE + INTERVAL '3 months',
            50000.00,
            100,
            basic_customer_id,
            admin_user_id,
            NOW(),
            NOW()
        ) RETURNING id INTO basic_project_id;
        
        -- 创建基础任务
        INSERT INTO tasks (
            title, description, status, priority,
            project_id, assignee_id,
            estimated_hours, due_datetime,
            created_at, updated_at
        ) VALUES (
            '基础测试任务',
            '系统测试用的基础任务',
            'todo',
            'low',
            basic_project_id,
            admin_user_id,
            8,
            CURRENT_DATE + INTERVAL '1 week',
            NOW(),
            NOW()
        );
        
        RAISE NOTICE '已重建基础种子数据';
    END IF;
END $$;

-- =============================================================================
-- 6. 清理统计和缓存
-- =============================================================================

-- 清理缓存表
DELETE FROM permission_cache;
DELETE FROM progress_snapshots WHERE created_at < CURRENT_DATE - INTERVAL '1 week';

-- 重置序列 (可选)
-- SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM users));
-- SELECT setval('projects_id_seq', (SELECT COALESCE(MAX(id), 1) FROM projects));
-- SELECT setval('tasks_id_seq', (SELECT COALESCE(MAX(id), 1) FROM tasks));

RAISE NOTICE '已清理统计和缓存数据';

-- =============================================================================
-- 7. 数据库维护操作
-- =============================================================================

-- 更新表统计信息
ANALYZE;

-- 重建索引 (如果需要)
-- REINDEX DATABASE ai_project_db;

RAISE NOTICE '已完成数据库维护操作';

-- =============================================================================
-- 8. 生成清理报告
-- =============================================================================

DO $$
DECLARE
    user_count INTEGER;
    project_count INTEGER;  
    task_count INTEGER;
    customer_count INTEGER;
    document_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO project_count FROM projects;
    SELECT COUNT(*) INTO task_count FROM tasks;
    SELECT COUNT(*) INTO customer_count FROM customers;
    SELECT COUNT(*) INTO document_count FROM documents;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '种子数据清理完成报告';
    RAISE NOTICE '========================================';
    RAISE NOTICE '清理完成时间: %', NOW();
    RAISE NOTICE '剩余数据统计:';
    RAISE NOTICE '- 用户数量: %', user_count;
    RAISE NOTICE '- 项目数量: %', project_count;
    RAISE NOTICE '- 任务数量: %', task_count;
    RAISE NOTICE '- 客户数量: %', customer_count;
    RAISE NOTICE '- 文档数量: %', document_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE '清理操作已安全完成！';
    RAISE NOTICE '========================================';
END $$;

COMMIT;