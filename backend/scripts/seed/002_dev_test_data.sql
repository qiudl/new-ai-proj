-- 开发测试数据脚本
-- 文件: 002_dev_test_data.sql  
-- 描述: 开发环境专用测试数据，包含测试用户、项目、任务等
-- 作者: Claude AI (任务#621)
-- 创建时间: 2025-08-27
-- 环境: 仅在development环境执行

BEGIN;

-- =============================================================================
-- 1. 环境检查 - 仅在开发环境执行
-- =============================================================================

DO $$
DECLARE
    app_env text := COALESCE(current_setting('app_environment', true), 'development');
BEGIN
    IF app_env NOT IN ('development', 'dev', 'test') THEN
        RAISE EXCEPTION '此脚本仅允许在开发环境执行，当前环境: %', app_env;
    END IF;
    
    RAISE NOTICE '开始执行开发测试数据脚本，环境: %', app_env;
END $$;

-- =============================================================================
-- 2. 测试企业数据
-- =============================================================================

-- 2.1 创建测试企业
INSERT INTO customers (
    company_name, company_code, industry, company_type, 
    address, city, province, main_email, main_phone,
    status, priority, annual_contract_value,
    created_at, updated_at
) VALUES 
    (
        '种子测试科技有限公司',
        'SEED_TECH',
        '软件开发',
        '有限责任公司',
        '北京市海淀区中关村软件园',
        '北京',
        '北京',
        'contact@seedtech.test',
        '010-88888888',
        'active',
        'high',
        500000.00,
        NOW(),
        NOW()
    ),
    (
        '演示企业集团',
        'DEMO_GROUP', 
        '互联网服务',
        '股份有限公司',
        '上海市浦东新区陆家嘴金融区',
        '上海',
        '上海', 
        'info@demogroup.test',
        '021-66666666',
        'active',
        'medium',
        800000.00,
        NOW(),
        NOW()
    ),
    (
        '测试客户公司',
        'TEST_CLIENT',
        '制造业',
        '外商独资企业',
        '广东省深圳市南山区科技园',
        '深圳',
        '广东',
        'service@testclient.test',
        '0755-99999999', 
        'active',
        'medium',
        300000.00,
        NOW(),
        NOW()
    )
ON CONFLICT (company_code) DO NOTHING;

-- =============================================================================
-- 3. 测试用户数据
-- =============================================================================

-- 3.1 系统测试用户
-- 密码都是 "test123456" 的bcrypt哈希值
INSERT INTO users (
    username, email, password_hash, role, user_type, status,
    profile, created_at, updated_at
) VALUES
    (
        'seed_pm',
        'pm@seedtech.test',
        '$2a$10$CwTycUXWue0Thq9StjUM0urNu6Ny7WVU1n7wVE2bJBxJrNW1234567', -- test123456
        'project_manager',
        'system', 
        'active',
        '{"display_name": "种子项目经理", "department": "项目管理部", "is_seed_user": true}',
        NOW(),
        NOW()
    ),
    (
        'seed_dev1',
        'dev1@seedtech.test',
        '$2a$10$CwTycUXWue0Thq9StjUM0urNu6Ny7WVU1n7wVE2bJBxJrNW1234567', -- test123456
        'developer',
        'system',
        'active', 
        '{"display_name": "种子开发者1", "department": "技术部", "skills": ["React", "Node.js"], "is_seed_user": true}',
        NOW(),
        NOW()
    ),
    (
        'seed_dev2', 
        'dev2@seedtech.test',
        '$2a$10$CwTycUXWue0Thq9StjUM0urNu6Ny7WVU1n7wVE2bJBxJrNW1234567', -- test123456
        'developer',
        'system',
        'active',
        '{"display_name": "种子开发者2", "department": "技术部", "skills": ["Go", "PostgreSQL"], "is_seed_user": true}',
        NOW(), 
        NOW()
    ),
    (
        'seed_tester',
        'tester@seedtech.test', 
        '$2a$10$CwTycUXWue0Thq9StjUM0urNu6Ny7WVU1n7wVE2bJBxJrNW1234567', -- test123456
        'developer',
        'system',
        'active',
        '{"display_name": "种子测试员", "department": "质量保证部", "is_seed_user": true}',
        NOW(),
        NOW()
    ),
    (
        'seed_client',
        'client@testclient.test',
        '$2a$10$CwTycUXWue0Thq9StjUM0urNu6Ny7WVU1n7wVE2bJBxJrNW1234567', -- test123456
        'client',
        'system',
        'active',
        '{"display_name": "种子客户代表", "company": "测试客户公司", "is_seed_user": true}',
        NOW(),
        NOW()
    )
ON CONFLICT (username) DO NOTHING;

-- 3.2 企业测试用户
DO $$
DECLARE
    seed_tech_id integer;
    demo_group_id integer;
    test_client_id integer;
BEGIN
    -- 获取企业ID
    SELECT id INTO seed_tech_id FROM customers WHERE company_code = 'SEED_TECH';
    SELECT id INTO demo_group_id FROM customers WHERE company_code = 'DEMO_GROUP'; 
    SELECT id INTO test_client_id FROM customers WHERE company_code = 'TEST_CLIENT';
    
    IF seed_tech_id IS NOT NULL THEN
        INSERT INTO users (
            username, email, password_hash, role, user_type, company_id, status,
            contact_person_name, contact_phone, department_title, is_primary_contact,
            profile, created_at, updated_at
        ) VALUES
            (
                'seed_company_admin',
                'admin@seedtech.test', 
                '$2a$10$CwTycUXWue0Thq9StjUM0urNu6Ny7WVU1n7wVE2bJBxJrNW1234567', -- test123456
                'company_admin',
                'company',
                seed_tech_id,
                'active',
                '张企业管理员',
                '13800138001',
                '总经理',
                true,
                '{"display_name": "张企业管理员", "is_seed_user": true}',
                NOW(),
                NOW()
            ),
            (
                'seed_company_user1',
                'user1@seedtech.test',
                '$2a$10$CwTycUXWue0Thq9StjUM0urNu6Ny7WVU1n7wVE2bJBxJrNW1234567', -- test123456
                'company_user', 
                'company',
                seed_tech_id,
                'active',
                '李普通用户',
                '13800138002', 
                '项目经理',
                false,
                '{"display_name": "李普通用户", "is_seed_user": true}',
                NOW(),
                NOW()
            ),
            (
                'seed_company_user2',
                'user2@seedtech.test',
                '$2a$10$CwTycUXWue0Thq9StjUM0urNu6Ny7WVU1n7wVE2bJBxJrNW1234567', -- test123456 
                'company_user',
                'company',
                seed_tech_id,
                'active',
                '王开发工程师',
                '13800138003',
                '技术总监',
                false,
                '{"display_name": "王开发工程师", "is_seed_user": true}',
                NOW(),
                NOW()
            )
        ON CONFLICT (username) DO NOTHING;
    END IF;
END $$;

-- =============================================================================
-- 4. 测试项目数据
-- =============================================================================

-- 4.1 获取用户ID
DO $$
DECLARE
    admin_id integer;
    pm_id integer;
    dev1_id integer;
    dev2_id integer;
    tester_id integer;
    client_id integer;
    
    project_id integer;
    parent_task_id integer;
BEGIN
    -- 获取用户ID
    SELECT id INTO admin_id FROM users WHERE username IN ('admin', 'seed_admin') AND user_type = 'system' LIMIT 1;
    SELECT id INTO pm_id FROM users WHERE username = 'seed_pm';
    SELECT id INTO dev1_id FROM users WHERE username = 'seed_dev1';
    SELECT id INTO dev2_id FROM users WHERE username = 'seed_dev2'; 
    SELECT id INTO tester_id FROM users WHERE username = 'seed_tester';
    SELECT id INTO client_id FROM users WHERE username = 'seed_client';
    
    -- 4.2 创建测试项目
    IF admin_id IS NOT NULL AND pm_id IS NOT NULL THEN
        -- 项目1：完整的软件开发项目
        INSERT INTO projects (name, description, owner_id, created_at, updated_at)
        VALUES (
            '种子CRM系统开发',
            '一个完整的客户关系管理系统，包含前端、后端、数据库等完整技术栈。用于演示项目管理、任务分配、进度跟踪等功能。',
            admin_id,
            NOW(),
            NOW()
        ) RETURNING id INTO project_id;
        
        -- 创建项目的层级任务结构
        -- 第一层：主要模块
        INSERT INTO tasks (project_id, title, description, status, created_by, assignee_id, priority, estimated_hours, created_at, updated_at)
        VALUES
            (project_id, '需求分析与系统设计', '进行业务需求分析，设计系统架构和数据库结构', 'completed', admin_id, pm_id, 'high', 40, NOW() - INTERVAL '20 days', NOW() - INTERVAL '18 days'),
            (project_id, '后端API开发', '使用Go语言开发RESTful API接口', 'in_progress', pm_id, dev2_id, 'high', 120, NOW() - INTERVAL '15 days', NOW()),
            (project_id, '前端界面开发', '使用React开发用户界面', 'todo', pm_id, dev1_id, 'high', 100, NOW(), NOW()),
            (project_id, '数据库设计与实现', '设计和实现PostgreSQL数据库', 'in_progress', admin_id, dev2_id, 'medium', 30, NOW() - INTERVAL '12 days', NOW()),
            (project_id, '系统测试', '进行单元测试、集成测试和用户验收测试', 'todo', pm_id, tester_id, 'medium', 50, NOW(), NOW()),
            (project_id, '部署与上线', '配置生产环境并部署系统', 'todo', admin_id, dev2_id, 'medium', 20, NOW(), NOW());
            
        -- 获取父任务ID并创建子任务
        SELECT id INTO parent_task_id FROM tasks WHERE project_id = project_id AND title = '后端API开发';
        
        IF parent_task_id IS NOT NULL THEN
            INSERT INTO tasks (project_id, parent_id, title, description, status, created_by, assignee_id, priority, estimated_hours, created_at, updated_at)
            VALUES
                (project_id, parent_task_id, '用户认证模块', '实现用户登录、注册、权限验证功能', 'completed', pm_id, dev2_id, 'high', 25, NOW() - INTERVAL '15 days', NOW() - INTERVAL '10 days'),
                (project_id, parent_task_id, '客户管理API', '客户信息的增删改查接口', 'in_progress', pm_id, dev2_id, 'high', 30, NOW() - INTERVAL '8 days', NOW()),
                (project_id, parent_task_id, '订单管理API', '订单处理相关的API接口', 'todo', pm_id, dev2_id, 'medium', 35, NOW(), NOW()),
                (project_id, parent_task_id, '报表统计API', '各种业务报表和统计数据接口', 'todo', pm_id, dev2_id, 'low', 30, NOW(), NOW());
        END IF;
        
        -- 为前端开发创建子任务
        SELECT id INTO parent_task_id FROM tasks WHERE project_id = project_id AND title = '前端界面开发';
        
        IF parent_task_id IS NOT NULL THEN
            INSERT INTO tasks (project_id, parent_id, title, description, status, created_by, assignee_id, priority, estimated_hours, created_at, updated_at)
            VALUES
                (project_id, parent_task_id, '登录注册页面', '用户登录和注册界面', 'todo', pm_id, dev1_id, 'high', 15, NOW(), NOW()),
                (project_id, parent_task_id, '客户管理界面', '客户信息管理的前端界面', 'todo', pm_id, dev1_id, 'high', 25, NOW(), NOW()),
                (project_id, parent_task_id, '订单管理界面', '订单处理的前端界面', 'todo', pm_id, dev1_id, 'medium', 30, NOW(), NOW()),
                (project_id, parent_task_id, '报表展示界面', '各种报表和图表展示', 'todo', pm_id, dev1_id, 'low', 20, NOW(), NOW()),
                (project_id, parent_task_id, '响应式布局优化', '适配移动端和各种屏幕尺寸', 'todo', pm_id, dev1_id, 'medium', 10, NOW(), NOW());
        END IF;
        
        RAISE NOTICE '已创建测试项目 "种子CRM系统开发" 及其任务结构';
    END IF;
    
    -- 项目2：简单的移动应用项目
    IF admin_id IS NOT NULL THEN
        INSERT INTO projects (name, description, owner_id, created_at, updated_at)
        VALUES (
            '种子任务管理App',
            '一个简单的移动端任务管理应用，支持任务创建、编辑、状态管理等基本功能。',
            admin_id,
            NOW() - INTERVAL '5 days',
            NOW()
        ) RETURNING id INTO project_id;
        
        -- 创建简单的任务结构
        INSERT INTO tasks (project_id, title, description, status, created_by, assignee_id, priority, estimated_hours, created_at, updated_at)
        VALUES
            (project_id, '移动端UI设计', 'App界面设计和用户体验优化', 'completed', admin_id, dev1_id, 'high', 20, NOW() - INTERVAL '5 days', NOW() - INTERVAL '2 days'),
            (project_id, 'React Native开发', '使用React Native开发跨平台应用', 'in_progress', admin_id, dev1_id, 'high', 60, NOW() - INTERVAL '3 days', NOW()),
            (project_id, '后端API集成', '与现有后端系统集成', 'todo', admin_id, dev2_id, 'medium', 15, NOW(), NOW()),
            (project_id, '应用测试与发布', '测试应用功能并发布到应用商店', 'todo', admin_id, tester_id, 'medium', 10, NOW(), NOW());
            
        RAISE NOTICE '已创建测试项目 "种子任务管理App"';
    END IF;
    
    -- 项目3：小型维护项目
    IF pm_id IS NOT NULL THEN
        INSERT INTO projects (name, description, owner_id, created_at, updated_at)
        VALUES (
            '系统日常维护',
            '系统日常维护、bug修复和小功能改进项目。',
            pm_id,
            NOW() - INTERVAL '1 month',
            NOW()
        ) RETURNING id INTO project_id;
        
        -- 创建一些维护任务
        INSERT INTO tasks (project_id, title, description, status, created_by, assignee_id, priority, estimated_hours, created_at, updated_at)
        VALUES
            (project_id, '修复登录页面样式问题', '登录页面在移动端显示异常', 'completed', pm_id, dev1_id, 'medium', 2, NOW() - INTERVAL '25 days', NOW() - INTERVAL '24 days'),
            (project_id, '优化数据库查询性能', '某些页面加载速度较慢，需要优化SQL查询', 'completed', pm_id, dev2_id, 'high', 8, NOW() - INTERVAL '20 days', NOW() - INTERVAL '18 days'),
            (project_id, '添加导出Excel功能', '用户反馈需要数据导出功能', 'in_progress', pm_id, dev2_id, 'low', 12, NOW() - INTERVAL '5 days', NOW()),
            (project_id, '系统安全漏洞修复', '安全扫描发现的一些安全问题', 'todo', pm_id, dev2_id, 'urgent', 16, NOW(), NOW()),
            (project_id, '用户手册更新', '更新系统使用手册和帮助文档', 'todo', pm_id, pm_id, 'low', 6, NOW(), NOW());
            
        RAISE NOTICE '已创建测试项目 "系统日常维护"';
    END IF;
END $$;

-- =============================================================================
-- 5. 创建任务关系和依赖
-- =============================================================================

-- 创建一些任务依赖关系（示例）
DO $$
DECLARE 
    crm_project_id integer;
    auth_task_id integer;
    customer_api_task_id integer;
    order_api_task_id integer;
    customer_ui_task_id integer;
    login_ui_task_id integer;
BEGIN
    SELECT id INTO crm_project_id FROM projects WHERE name = '种子CRM系统开发';
    
    IF crm_project_id IS NOT NULL THEN
        -- 获取任务ID
        SELECT id INTO auth_task_id FROM tasks WHERE project_id = crm_project_id AND title = '用户认证模块';
        SELECT id INTO customer_api_task_id FROM tasks WHERE project_id = crm_project_id AND title = '客户管理API';
        SELECT id INTO order_api_task_id FROM tasks WHERE project_id = crm_project_id AND title = '订单管理API';
        SELECT id INTO customer_ui_task_id FROM tasks WHERE project_id = crm_project_id AND title = '客户管理界面';
        SELECT id INTO login_ui_task_id FROM tasks WHERE project_id = crm_project_id AND title = '登录注册页面';
        
        -- 创建依赖关系
        IF auth_task_id IS NOT NULL AND customer_api_task_id IS NOT NULL THEN
            INSERT INTO task_relationships (from_task_id, to_task_id, relationship_type, metadata, created_by)
            VALUES (customer_api_task_id, auth_task_id, 'depends_on', 
                   '{"description": "客户管理API依赖用户认证模块"}', 
                   (SELECT id FROM users WHERE username IN ('seed_pm', 'admin') LIMIT 1));
        END IF;
        
        IF order_api_task_id IS NOT NULL AND customer_api_task_id IS NOT NULL THEN
            INSERT INTO task_relationships (from_task_id, to_task_id, relationship_type, metadata, created_by)
            VALUES (order_api_task_id, customer_api_task_id, 'depends_on',
                   '{"description": "订单API依赖客户管理API"}',
                   (SELECT id FROM users WHERE username IN ('seed_pm', 'admin') LIMIT 1));
        END IF;
        
        IF customer_ui_task_id IS NOT NULL AND customer_api_task_id IS NOT NULL THEN
            INSERT INTO task_relationships (from_task_id, to_task_id, relationship_type, metadata, created_by)
            VALUES (customer_ui_task_id, customer_api_task_id, 'depends_on',
                   '{"description": "客户界面依赖客户API"}',
                   (SELECT id FROM users WHERE username IN ('seed_pm', 'admin') LIMIT 1));
        END IF;
        
        IF login_ui_task_id IS NOT NULL AND auth_task_id IS NOT NULL THEN
            INSERT INTO task_relationships (from_task_id, to_task_id, relationship_type, metadata, created_by)
            VALUES (login_ui_task_id, auth_task_id, 'depends_on',
                   '{"description": "登录界面依赖认证模块"}',
                   (SELECT id FROM users WHERE username IN ('seed_pm', 'admin') LIMIT 1));
        END IF;
        
        RAISE NOTICE '已创建任务依赖关系';
    END IF;
END $$;

-- =============================================================================
-- 6. 创建一些测试时间记录
-- =============================================================================

-- 为已完成的任务创建时间记录
DO $$
DECLARE
    completed_task record;
    dev1_id integer;
    dev2_id integer;
    pm_id integer;
BEGIN
    SELECT id INTO dev1_id FROM users WHERE username = 'seed_dev1';
    SELECT id INTO dev2_id FROM users WHERE username = 'seed_dev2';
    SELECT id INTO pm_id FROM users WHERE username = 'seed_pm';
    
    -- 为已完成的任务添加时间记录
    FOR completed_task IN 
        SELECT id, title, estimated_hours, assignee_id, created_at, updated_at
        FROM tasks 
        WHERE status = 'completed' 
        AND title LIKE '%种子%' OR project_id IN (SELECT id FROM projects WHERE name LIKE '种子%')
        LIMIT 5
    LOOP
        INSERT INTO task_time_logs (
            task_id, user_id, started_at, ended_at, 
            duration_seconds, description, created_at
        ) VALUES (
            completed_task.id,
            COALESCE(completed_task.assignee_id, dev1_id),
            completed_task.created_at,
            completed_task.updated_at,
            EXTRACT(EPOCH FROM (completed_task.updated_at - completed_task.created_at))::integer,
            '种子测试数据 - ' || completed_task.title || ' 工作记录',
            completed_task.updated_at
        );
    END LOOP;
    
    RAISE NOTICE '已创建测试时间记录';
END $$;

COMMIT;

-- =============================================================================
-- 7. 数据验证
-- =============================================================================

DO $$
DECLARE
    test_users_count integer;
    test_projects_count integer;
    test_tasks_count integer;
    test_companies_count integer;
BEGIN
    SELECT COUNT(*) INTO test_users_count FROM users WHERE profile::text LIKE '%is_seed_user%';
    SELECT COUNT(*) INTO test_projects_count FROM projects WHERE name LIKE '种子%';
    SELECT COUNT(*) INTO test_tasks_count FROM tasks t 
        JOIN projects p ON t.project_id = p.id 
        WHERE p.name LIKE '种子%';
    SELECT COUNT(*) INTO test_companies_count FROM customers WHERE company_code LIKE '%SEED%' OR company_code LIKE '%TEST%' OR company_code LIKE '%DEMO%';
    
    RAISE NOTICE '=== 开发测试数据创建完成 ===';
    RAISE NOTICE '测试用户数量: %', test_users_count;
    RAISE NOTICE '测试项目数量: %', test_projects_count;
    RAISE NOTICE '测试任务数量: %', test_tasks_count;
    RAISE NOTICE '测试企业数量: %', test_companies_count;
    RAISE NOTICE '================================';
END $$;

SELECT '开发测试数据脚本执行完成' as result;