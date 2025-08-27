        2400000.00,
        '2023-03-20',
        85,
        'medium',
        NOW() - INTERVAL '6 months',
        NOW()
    ),
    (
        '绿色能源集团',
        'GREEN_ENERGY',
        '新能源',
        '集团公司',
        '91320100MA9876543C',
        '91320100MA9876543C',
        '王绿能',
        '南京市江宁区科学园弘景大道99号',
        '南京',
        '江苏',
        '211100',
        'https://www.greenenergy.demo',
        'service@greenenergy.demo',
        '025-87654321',
        'active',
        'medium',
        600000.00,
        1800000.00,
        '2023-06-01',
        200,
        'large',
        NOW() - INTERVAL '4 months',
        NOW()
    ),
    (
        '时尚零售连锁企业',
        'FASHION_RETAIL',
        '零售业',
        '连锁企业',
        '91310000MA1122334D',
        '91310000MA1122334D',
        '刘时尚',
        '上海市黄浦区南京东路步行街168号',
        '上海',
        '上海',
        '200001',
        'https://www.fashionretail.demo',
        'hello@fashionretail.demo',
        '021-12345678',
        'active',
        'medium',
        400000.00,
        1200000.00,
        '2023-08-15',
        120,
        'medium',
        NOW() - INTERVAL '2 months',
        NOW()
    )
ON CONFLICT (company_code) DO NOTHING;

-- =============================================================================
-- 3. 演示用户数据（更完整的用户画像）
-- =============================================================================

-- 3.1 系统演示用户
INSERT INTO users (
    username, email, password_hash, role, user_type, status,
    profile, created_at, updated_at
) VALUES
    (
        'demo_ceo',
        'ceo@company.demo',
        '$2a$10$CwTycUXWue0Thq9StjUM0urNu6Ny7WVU1n7wVE2bJBxJrNW1234567', -- demo123456
        'admin',
        'system',
        'active',
        '{"display_name": "演示CEO", "title": "首席执行官", "department": "高级管理层", "avatar": "/avatars/ceo.jpg", "bio": "拥有15年企业管理经验，专注于数字化转型和战略规划", "skills": ["战略规划", "团队管理", "商业分析"], "is_demo_user": true}',
        NOW() - INTERVAL '1 year',
        NOW()
    ),
    (
        'demo_cto',
        'cto@company.demo', 
        '$2a$10$CwTycUXWue0Thq9StjUM0urNu6Ny7WVU1n7wVE2bJBxJrNW1234567', -- demo123456
        'admin',
        'system',
        'active',
        '{"display_name": "演示CTO", "title": "首席技术官", "department": "技术部", "avatar": "/avatars/cto.jpg", "bio": "资深技术专家，负责技术架构和团队建设", "skills": ["系统架构", "技术管理", "云计算", "AI/ML"], "is_demo_user": true}',
        NOW() - INTERVAL '10 months',
        NOW()
    ),
    (
        'demo_pm_senior',
        'pm.senior@company.demo',
        '$2a$10$CwTycUXWue0Thq9StjUM0urNu6Ny7WVU1n7wVE2bJBxJrNW1234567', -- demo123456
        'project_manager',
        'system',
        'active',
        '{"display_name": "李高级项目经理", "title": "高级项目经理", "department": "项目管理办公室", "avatar": "/avatars/pm1.jpg", "bio": "PMP认证项目经理，擅长敏捷开发和大型项目管理", "skills": ["敏捷开发", "风险管理", "团队协作", "质量管理"], "certifications": ["PMP", "CSM"], "is_demo_user": true}',
        NOW() - INTERVAL '8 months',
        NOW()
    ),
    (
        'demo_pm_junior',
        'pm.junior@company.demo',
        '$2a$10$CwTycUXWue0Thq9StjUM0urNu6Ny7WVU1n7wVE2bJBxJrNW1234567', -- demo123456
        'project_manager', 
        'system',
        'active',
        '{"display_name": "王项目助理", "title": "项目助理", "department": "项目管理办公室", "avatar": "/avatars/pm2.jpg", "bio": "年轻有为的项目管理新人，学习能力强", "skills": ["项目跟踪", "文档管理", "沟通协调"], "is_demo_user": true}',
        NOW() - INTERVAL '3 months',
        NOW()
    ),
    (
        'demo_tech_lead',
        'techlead@company.demo',
        '$2a$10$CwTycUXWue0Thq9StjUM0urNu6Ny7WVU1n7wVE2bJBxJrNW1234567', -- demo123456
        'developer',
        'system',
        'active',
        '{"display_name": "张技术专家", "title": "技术负责人", "department": "研发中心", "avatar": "/avatars/tech1.jpg", "bio": "全栈技术专家，专注于系统架构和性能优化", "skills": ["Go", "React", "PostgreSQL", "Docker", "Kubernetes", "微服务"], "github": "demo_tech_lead", "is_demo_user": true}',
        NOW() - INTERVAL '6 months',
        NOW()
    ),
    (
        'demo_frontend_dev',
        'frontend@company.demo',
        '$2a$10$CwTycUXWue0Thq9StjUM0urNu6Ny7WVU1n7wVE2bJBxJrNW1234567', -- demo123456
        'developer',
        'system',
        'active',
        '{"display_name": "赵前端工程师", "title": "前端开发工程师", "department": "研发中心", "avatar": "/avatars/frontend.jpg", "bio": "专注于用户体验和前端技术的工程师", "skills": ["React", "Vue", "TypeScript", "CSS3", "WebPack", "移动端开发"], "portfolio": "https://demo-frontend.dev", "is_demo_user": true}',
        NOW() - INTERVAL '4 months',
        NOW()
    ),
    (
        'demo_backend_dev',
        'backend@company.demo',
        '$2a$10$CwTycUXWue0Thq9StjUM0urNu6Ny7WVU1n7wVE2bJBxJrNW1234567', -- demo123456
        'developer',
        'system',
        'active',
        '{"display_name": "陈后端工程师", "title": "后端开发工程师", "department": "研发中心", "avatar": "/avatars/backend.jpg", "bio": "专注于后端服务和数据库优化", "skills": ["Go", "Python", "Java", "PostgreSQL", "Redis", "消息队列"], "is_demo_user": true}',
        NOW() - INTERVAL '5 months',
        NOW()
    ),
    (
        'demo_qa_lead',
        'qa.lead@company.demo',
        '$2a$10$CwTycUXWue0Thq9StjUM0urNu6Ny7WVU1n7wVE2bJBxJrNW1234567', -- demo123456
        'developer',
        'system',
        'active',
        '{"display_name": "刘测试专家", "title": "QA负责人", "department": "质量保证部", "avatar": "/avatars/qa.jpg", "bio": "资深测试专家，负责测试流程和质量保证", "skills": ["自动化测试", "性能测试", "安全测试", "测试管理"], "is_demo_user": true}',
        NOW() - INTERVAL '7 months',
        NOW()
    ),
    (
        'demo_designer',
        'designer@company.demo',
        '$2a$10$CwTycUXWue0Thq9StjUM0urNu6Ny7WVU1n7wVE2bJBxJrNW1234567', -- demo123456
        'developer',
        'system',
        'active',
        '{"display_name": "孙UI设计师", "title": "UI/UX设计师", "department": "设计部", "avatar": "/avatars/designer.jpg", "bio": "创意丰富的UI/UX设计师，注重用户体验", "skills": ["UI设计", "UX设计", "原型设计", "Figma", "Sketch", "Adobe Creative Suite"], "behance": "demo_designer", "is_demo_user": true}',
        NOW() - INTERVAL '5 months',
        NOW()
    )
ON CONFLICT (username) DO NOTHING;

-- 3.2 企业演示用户
DO $$
DECLARE
    smart_logistics_id integer;
    innov_medical_id integer;
    green_energy_id integer;
    fashion_retail_id integer;
BEGIN
    -- 获取企业ID
    SELECT id INTO smart_logistics_id FROM customers WHERE company_code = 'SMART_LOGISTICS';
    SELECT id INTO innov_medical_id FROM customers WHERE company_code = 'INNOV_MEDICAL';
    SELECT id INTO green_energy_id FROM customers WHERE company_code = 'GREEN_ENERGY';
    SELECT id INTO fashion_retail_id FROM customers WHERE company_code = 'FASHION_RETAIL';
    
    -- 智慧物流企业用户
    IF smart_logistics_id IS NOT NULL THEN
        INSERT INTO users (
            username, email, password_hash, role, user_type, company_id, status,
            contact_person_name, contact_phone, department_title, is_primary_contact,
            profile, created_at, updated_at
        ) VALUES
            (
                'demo_logistics_admin',
                'admin@smartlogistics.demo',
                '$2a$10$CwTycUXWue0Thq9StjUM0urNu6Ny7WVU1n7wVE2bJBxJrNW1234567',
                'company_admin',
                'company',
                smart_logistics_id,
                'active',
                '李智慧',
                '13800000001',
                '总经理',
                true,
                '{"display_name": "李智慧", "title": "总经理", "department": "管理层", "company": "智慧物流科技股份有限公司", "bio": "物流行业专家，致力于智慧物流解决方案", "is_demo_user": true}',
                NOW() - INTERVAL '8 months',
                NOW()
            ),
            (
                'demo_logistics_pm',
                'pm@smartlogistics.demo',
                '$2a$10$CwTycUXWue0Thq9StjUM0urNu6Ny7WVU1n7wVE2bJBxJrNW1234567',
                'company_user',
                'company',
                smart_logistics_id,
                'active',
                '王项目经理',
                '13800000002',
                '项目部经理',
                false,
                '{"display_name": "王项目经理", "title": "项目部经理", "department": "项目部", "company": "智慧物流科技股份有限公司", "is_demo_user": true}',
                NOW() - INTERVAL '6 months',
                NOW()
            ),
            (
                'demo_logistics_tech',
                'tech@smartlogistics.demo',
                '$2a$10$CwTycUXWue0Thq9StjUM0urNu6Ny7WVU1n7wVE2bJBxJrNW1234567',
                'company_user',
                'company',
                smart_logistics_id,
                'active',
                '张技术总监',
                '13800000003',
                '技术总监',
                false,
                '{"display_name": "张技术总监", "title": "技术总监", "department": "技术部", "company": "智慧物流科技股份有限公司", "is_demo_user": true}',
                NOW() - INTERVAL '7 months',
                NOW()
            )
        ON CONFLICT (username) DO NOTHING;
    END IF;
    
    -- 创新医疗企业用户
    IF innov_medical_id IS NOT NULL THEN
        INSERT INTO users (
            username, email, password_hash, role, user_type, company_id, status,
            contact_person_name, contact_phone, department_title, is_primary_contact,
            profile, created_at, updated_at
        ) VALUES
            (
                'demo_medical_admin',
                'admin@innovmedical.demo',
                '$2a$10$CwTycUXWue0Thq9StjUM0urNu6Ny7WVU1n7wVE2bJBxJrNW1234567',
                'company_admin',
                'company',
                innov_medical_id,
                'active',
                '张医生',
                '13900000001',
                'CEO',
                true,
                '{"display_name": "张医生", "title": "CEO", "department": "管理层", "company": "创新医疗器械有限公司", "bio": "医疗行业资深专家", "is_demo_user": true}',
                NOW() - INTERVAL '6 months',
                NOW()
            ),
            (
                'demo_medical_rd',
                'rd@innovmedical.demo',
                '$2a$10$CwTycUXWue0Thq9StjUM0urNu6Ny7WVU1n7wVE2bJBxJrNW1234567',
                'company_user',
                'company',
                innov_medical_id,
                'active',
                '李研发经理',
                '13900000002',
                '研发部经理',
                false,
                '{"display_name": "李研发经理", "title": "研发部经理", "department": "研发部", "company": "创新医疗器械有限公司", "is_demo_user": true}',
                NOW() - INTERVAL '5 months',
                NOW()
            )
        ON CONFLICT (username) DO NOTHING;
    END IF;
END $$;

-- =============================================================================
-- 4. 复杂演示项目数据
-- =============================================================================

DO $$
DECLARE
    ceo_id integer;
    cto_id integer;
    pm_senior_id integer;
    pm_junior_id integer;
    tech_lead_id integer;
    frontend_dev_id integer;
    backend_dev_id integer;
    qa_lead_id integer;
    designer_id integer;
    
    project_id integer;
    parent_task_id integer;
    task_id integer;
    
    smart_logistics_id integer;
    logistics_admin_id integer;
    logistics_pm_id integer;
BEGIN
    -- 获取用户ID
    SELECT id INTO ceo_id FROM users WHERE username = 'demo_ceo';
    SELECT id INTO cto_id FROM users WHERE username = 'demo_cto';
    SELECT id INTO pm_senior_id FROM users WHERE username = 'demo_pm_senior';
    SELECT id INTO pm_junior_id FROM users WHERE username = 'demo_pm_junior';
    SELECT id INTO tech_lead_id FROM users WHERE username = 'demo_tech_lead';
    SELECT id INTO frontend_dev_id FROM users WHERE username = 'demo_frontend_dev';
    SELECT id INTO backend_dev_id FROM users WHERE username = 'demo_backend_dev';
    SELECT id INTO qa_lead_id FROM users WHERE username = 'demo_qa_lead';
    SELECT id INTO designer_id FROM users WHERE username = 'demo_designer';
    
    SELECT id INTO smart_logistics_id FROM customers WHERE company_code = 'SMART_LOGISTICS';
    SELECT id INTO logistics_admin_id FROM users WHERE username = 'demo_logistics_admin';
    SELECT id INTO logistics_pm_id FROM users WHERE username = 'demo_logistics_pm';
    
    -- 项目1：企业级智慧物流平台
    IF cto_id IS NOT NULL AND pm_senior_id IS NOT NULL THEN
        INSERT INTO projects (name, description, owner_id, created_at, updated_at)
        VALUES (
            '智慧物流平台3.0',
            '为智慧物流科技股份有限公司开发的新一代智能物流管理平台。包含运输管理系统(TMS)、仓库管理系统(WMS)、订单管理系统(OMS)以及数据分析平台。采用微服务架构，支持高并发和大数据处理。',
            cto_id,
            NOW() - INTERVAL '6 months',
            NOW()
        ) RETURNING id INTO project_id;
        
        -- 第一层：主要系统模块
        INSERT INTO tasks (project_id, title, description, status, created_by, assignee_id, priority, estimated_hours, due_date, created_at, updated_at)
        VALUES
            (project_id, '项目启动与需求分析', '项目启动会议、需求收集、可行性分析、项目计划制定', 'completed', cto_id, pm_senior_id, 'high', 80, NOW() - INTERVAL '5 months + 15 days', NOW() - INTERVAL '6 months', NOW() - INTERVAL '5 months'),
            (project_id, '系统架构设计', '微服务架构设计、技术选型、数据库设计、接口规范制定', 'completed', pm_senior_id, tech_lead_id, 'high', 120, NOW() - INTERVAL '5 months', NOW() - INTERVAL '5 months + 10 days', NOW() - INTERVAL '4 months + 20 days'),
            (project_id, '运输管理系统(TMS)', '运输订单管理、路线优化、车辆调度、运费结算', 'in_progress', tech_lead_id, backend_dev_id, 'high', 200, NOW() + INTERVAL '1 month', NOW() - INTERVAL '4 months', NOW()),
            (project_id, '仓库管理系统(WMS)', '入库出库管理、库存管理、货位管理、盘点管理', 'in_progress', tech_lead_id, backend_dev_id, 'high', 180, NOW() + INTERVAL '2 months', NOW() - INTERVAL '3 months + 15 days', NOW()),
            (project_id, '订单管理系统(OMS)', '订单创建、订单跟踪、订单状态管理、客户服务', 'todo', pm_senior_id, backend_dev_id, 'high', 150, NOW() + INTERVAL '3 months', NOW(), NOW()),
            (project_id, '数据分析平台', '业务指标分析、报表生成、数据可视化、决策支持', 'todo', tech_lead_id, backend_dev_id, 'medium', 100, NOW() + INTERVAL '4 months', NOW(), NOW()),
            (project_id, '前端用户界面', '管理后台、移动端App、客户门户、数据大屏', 'in_progress', designer_id, frontend_dev_id, 'high', 160, NOW() + INTERVAL '2.5 months', NOW() - INTERVAL '2 months', NOW()),
            (project_id, '系统集成与测试', '模块集成、接口测试、性能测试、安全测试', 'todo', qa_lead_id, qa_lead_id, 'high', 80, NOW() + INTERVAL '5 months', NOW(), NOW()),
            (project_id, '部署与上线', '环境配置、数据迁移、用户培训、系统上线', 'todo', cto_id, tech_lead_id, 'high', 60, NOW() + INTERVAL '6 months', NOW(), NOW())
        RETURNING id INTO parent_task_id;
        
        -- TMS子任务
        SELECT id INTO parent_task_id FROM tasks WHERE project_id = project_id AND title = '运输管理系统(TMS)';
        IF parent_task_id IS NOT NULL THEN
            INSERT INTO tasks (project_id, parent_id, title, description, status, created_by, assignee_id, priority, estimated_hours, due_date, created_at, updated_at)
            VALUES
                (project_id, parent_task_id, 'TMS-订单管理模块', '运输订单的创建、编辑、查询、状态管理', 'completed', tech_lead_id, backend_dev_id, 'high', 40, NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '3 months', NOW() - INTERVAL '2 months + 10 days'),
                (project_id, parent_task_id, 'TMS-路线优化算法', '基于AI的最优路线规划算法', 'in_progress', tech_lead_id, backend_dev_id, 'high', 60, NOW() + INTERVAL '2 weeks', NOW() - INTERVAL '2 months', NOW()),
                (project_id, parent_task_id, 'TMS-车辆调度系统', '车辆资源管理和智能调度', 'in_progress', tech_lead_id, backend_dev_id, 'medium', 50, NOW() + INTERVAL '3 weeks', NOW() - INTERVAL '1.5 months', NOW()),
                (project_id, parent_task_id, 'TMS-运费结算', '运费计算、对账、结算管理', 'todo', pm_senior_id, backend_dev_id, 'medium', 35, NOW() + INTERVAL '1 month', NOW(), NOW()),
                (project_id, parent_task_id, 'TMS-GPS跟踪集成', '与GPS设备集成，实时位置跟踪', 'todo', tech_lead_id, backend_dev_id, 'low', 25, NOW() + INTERVAL '1.5 months', NOW(), NOW());
        END IF;
        
        -- WMS子任务
        SELECT id INTO parent_task_id FROM tasks WHERE project_id = project_id AND title = '仓库管理系统(WMS)';
        IF parent_task_id IS NOT NULL THEN
            INSERT INTO tasks (project_id, parent_id, title, description, status, created_by, assignee_id, priority, estimated_hours, due_date, created_at, updated_at)
            VALUES
                (project_id, parent_task_id, 'WMS-入库管理', '货物入库登记、质检、上架管理', 'completed', tech_lead_id, backend_dev_id, 'high', 30, NOW() - INTERVAL '1 month', NOW() - INTERVAL '3 months', NOW() - INTERVAL '2 months'),
                (project_id, parent_task_id, 'WMS-出库管理', '订单拣货、包装、发货管理', 'in_progress', tech_lead_id, backend_dev_id, 'high', 35, NOW() + INTERVAL '1 week', NOW() - INTERVAL '1.5 months', NOW()),
                (project_id, parent_task_id, 'WMS-库存管理', '实时库存、安全库存、库存预警', 'in_progress', pm_senior_id, backend_dev_id, 'high', 40, NOW() + INTERVAL '2 weeks', NOW() - INTERVAL '1 month', NOW()),
                (project_id, parent_task_id, 'WMS-货位管理', '货位分配、货位优化、货位查询', 'todo', tech_lead_id, backend_dev_id, 'medium', 30, NOW() + INTERVAL '3 weeks', NOW(), NOW()),
                (project_id, parent_task_id, 'WMS-盘点管理', '周期盘点、循环盘点、差异处理', 'todo', pm_senior_id, backend_dev_id, 'medium', 25, NOW() + INTERVAL '1 month', NOW(), NOW()),
                (project_id, parent_task_id, 'WMS-条码扫描集成', '条码/二维码扫描功能集成', 'todo', tech_lead_id, backend_dev_id, 'low', 20, NOW() + INTERVAL '1.5 months', NOW(), NOW());
        END IF;
        
        -- 前端界面子任务
        SELECT id INTO parent_task_id FROM tasks WHERE project_id = project_id AND title = '前端用户界面';
        IF parent_task_id IS NOT NULL THEN
            INSERT INTO tasks (project_id, parent_id, title, description, status, created_by, assignee_id, priority, estimated_hours, due_date, created_at, updated_at)
            VALUES
                (project_id, parent_task_id, 'UI-设计系统建立', '建立统一的设计系统和组件库', 'completed', designer_id, designer_id, 'high', 25, NOW() - INTERVAL '1 month + 10 days', NOW() - INTERVAL '2 months', NOW() - INTERVAL '1 month + 15 days'),
                (project_id, parent_task_id, 'UI-管理后台开发', 'Web端管理后台界面开发', 'in_progress', designer_id, frontend_dev_id, 'high', 50, NOW() + INTERVAL '3 weeks', NOW() - INTERVAL '1.5 months', NOW()),
                (project_id, parent_task_id, 'UI-移动端App开发', '司机端和操作员移动App', 'in_progress', frontend_dev_id, frontend_dev_id, 'high', 40, NOW() + INTERVAL '1 month', NOW() - INTERVAL '1 month', NOW()),
                (project_id, parent_task_id, 'UI-客户门户', '客户查询订单状态的门户网站', 'todo', designer_id, frontend_dev_id, 'medium', 25, NOW() + INTERVAL '2 months', NOW(), NOW()),
                (project_id, parent_task_id, 'UI-数据大屏', '管理层数据展示大屏', 'todo', frontend_dev_id, frontend_dev_id, 'low', 20, NOW() + INTERVAL '2.5 months', NOW(), NOW());
        END IF;
        
        RAISE NOTICE '已创建演示项目 "智慧物流平台3.0" 及其完整任务结构';
    END IF;
    
    -- 项目2：医疗器械监管系统
    IF ceo_id IS NOT NULL AND pm_junior_id IS NOT NULL THEN
        INSERT INTO projects (name, description, owner_id, created_at, updated_at)
        VALUES (
            '医疗器械全生命周期监管系统',
            '为创新医疗器械有限公司开发的医疗器械从研发、生产到销售的全生命周期监管系统。符合FDA和NMPA法规要求，包含质量管理、追溯管理、风险管理等模块。',
            ceo_id,
            NOW() - INTERVAL '4 months',
            NOW()
        ) RETURNING id INTO project_id;
        
        INSERT INTO tasks (project_id, title, description, status, created_by, assignee_id, priority, estimated_hours, due_date, created_at, updated_at)
        VALUES
            (project_id, '法规需求分析', '分析FDA、NMPA等法规要求，制定系统功能规范', 'completed', ceo_id, pm_junior_id, 'high', 60, NOW() - INTERVAL '3 months', NOW() - INTERVAL '4 months', NOW() - INTERVAL '3 months + 10 days'),
            (project_id, '质量管理系统', '质量体系文档管理、质量控制流程', 'in_progress', pm_junior_id, backend_dev_id, 'high', 80, NOW() + INTERVAL '6 weeks', NOW() - INTERVAL '2.5 months', NOW()),
            (project_id, '产品追溯系统', '产品从原材料到终端用户的全程追溯', 'in_progress', pm_junior_id, backend_dev_id, 'high', 70, NOW() + INTERVAL '2 months', NOW() - INTERVAL '2 months', NOW()),
            (project_id, '风险管理模块', '风险识别、评估、控制和监控', 'todo', pm_junior_id, backend_dev_id, 'medium', 50, NOW() + INTERVAL '3 months', NOW(), NOW()),
            (project_id, '法规报告系统', '自动生成各类法规要求的报告', 'todo', pm_junior_id, backend_dev_id, 'medium', 40, NOW() + INTERVAL '4 months', NOW(), NOW()),
            (project_id, '用户培训与上线', '用户培训、系统上线、维护支持', 'todo', ceo_id, pm_junior_id, 'low', 30, NOW() + INTERVAL '5 months', NOW(), NOW());
            
        RAISE NOTICE '已创建演示项目 "医疗器械全生命周期监管系统"';
    END IF;
    
    -- 项目3：内部工具优化项目  
    IF tech_lead_id IS NOT NULL THEN
        INSERT INTO projects (name, description, owner_id, created_at, updated_at)
        VALUES (
            '开发工具链优化项目',
            '优化公司内部开发工具链，提升开发效率和代码质量。包含CI/CD优化、代码审查工具、自动化测试框架等。',
            tech_lead_id,
            NOW() - INTERVAL '2 months',
            NOW()
        ) RETURNING id INTO project_id;
        
        INSERT INTO tasks (project_id, title, description, status, created_by, assignee_id, priority, estimated_hours, due_date, created_at, updated_at)
        VALUES
            (project_id, 'CI/CD流水线优化', '优化现有CI/CD流程，减少构建时间', 'completed', tech_lead_id, tech_lead_id, 'high', 20, NOW() - INTERVAL '3 weeks', NOW() - INTERVAL '2 months', NOW() - INTERVAL '1 month + 10 days'),
            (project_id, '代码质量检查工具', '集成SonarQube等代码质量检查工具', 'completed', tech_lead_id, backend_dev_id, 'medium', 15, NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '1.5 months', NOW() - INTERVAL '1 month'),
            (project_id, '自动化测试框架', '建立完整的自动化测试框架', 'in_progress', qa_lead_id, qa_lead_id, 'high', 30, NOW() + INTERVAL '2 weeks', NOW() - INTERVAL '1 month', NOW()),
            (project_id, '开发环境标准化', '统一开发环境配置和工具', 'in_progress', tech_lead_id, tech_lead_id, 'medium', 18, NOW() + INTERVAL '3 weeks', NOW() - INTERVAL '3 weeks', NOW()),
            (project_id, '性能监控系统', '应用性能监控和告警系统', 'todo', tech_lead_id, backend_dev_id, 'medium', 25, NOW() + INTERVAL '1 month', NOW(), NOW()),
            (project_id, '文档自动化', 'API文档和开发文档自动生成', 'todo', tech_lead_id, frontend_dev_id, 'low', 12, NOW() + INTERVAL '1.5 months', NOW(), NOW());
            
        RAISE NOTICE '已创建演示项目 "开发工具链优化项目"';
    END IF;
END $$;

-- =============================================================================
-- 5. 创建复杂的任务关系网络
-- =============================================================================

DO $$
DECLARE
    logistics_project_id integer;
    medical_project_id integer;
    devtools_project_id integer;
    
    task_record record;
    dependency_record record;
    
    tms_order_id integer;
    tms_route_id integer;
    tms_dispatch_id integer;
    wms_inbound_id integer;
    wms_outbound_id integer;
    ui_system_id integer;
    ui_admin_id integer;
    ui_mobile_id integer;
BEGIN
    SELECT id INTO logistics_project_id FROM projects WHERE name = '智慧物流平台3.0';
    SELECT id INTO medical_project_id FROM projects WHERE name = '医疗器械全生命周期监管系统';
    SELECT id INTO devtools_project_id FROM projects WHERE name = '开发工具链优化项目';
    
    -- 为智慧物流项目创建复杂依赖关系
    IF logistics_project_id IS NOT NULL THEN
        -- 获取关键任务ID
        SELECT id INTO tms_order_id FROM tasks WHERE project_id = logistics_project_id AND title = 'TMS-订单管理模块';
        SELECT id INTO tms_route_id FROM tasks WHERE project_id = logistics_project_id AND title = 'TMS-路线优化算法';
        SELECT id INTO tms_dispatch_id FROM tasks WHERE project_id = logistics_project_id AND title = 'TMS-车辆调度系统';
        SELECT id INTO wms_inbound_id FROM tasks WHERE project_id = logistics_project_id AND title = 'WMS-入库管理';
        SELECT id INTO wms_outbound_id FROM tasks WHERE project_id = logistics_project_id AND title = 'WMS-出库管理';
        SELECT id INTO ui_system_id FROM tasks WHERE project_id = logistics_project_id AND title = 'UI-设计系统建立';
        SELECT id INTO ui_admin_id FROM tasks WHERE project_id = logistics_project_id AND title = 'UI-管理后台开发';
        SELECT id INTO ui_mobile_id FROM tasks WHERE project_id = logistics_project_id AND title = 'UI-移动端App开发';
        
        -- 创建依赖关系
        INSERT INTO task_relationships (from_task_id, to_task_id, relationship_type, metadata, created_by)
        VALUES 
            -- 路线优化依赖订单管理
            (tms_route_id, tms_order_id, 'depends_on', 
             '{"description": "路线优化算法需要订单数据", "weight": 1.0}', 
             (SELECT id FROM users WHERE username = 'demo_tech_lead')),
            -- 车辆调度依赖路线优化
            (tms_dispatch_id, tms_route_id, 'depends_on',
             '{"description": "车辆调度需要路线规划结果", "weight": 0.8}',
             (SELECT id FROM users WHERE username = 'demo_tech_lead')),
            -- 出库依赖入库
            (wms_outbound_id, wms_inbound_id, 'depends_on',
             '{"description": "出库管理依赖入库管理的库存数据", "weight": 1.0}',
             (SELECT id FROM users WHERE username = 'demo_backend_dev')),
            -- 管理后台依赖设计系统
            (ui_admin_id, ui_system_id, 'depends_on',
             '{"description": "管理后台开发需要设计系统", "weight": 1.0}',
             (SELECT id FROM users WHERE username = 'demo_designer')),
            -- 移动端依赖设计系统
            (ui_mobile_id, ui_system_id, 'depends_on',
             '{"description": "移动端开发需要设计系统", "weight": 1.0}',
             (SELECT id FROM users WHERE username = 'demo_designer')),
            -- 订单管理和入库管理可以并行
            (tms_order_id, wms_inbound_id, 'parallel_with',
             '{"group": "data_foundation", "description": "订单管理和入库管理可并行开发"}',
             (SELECT id FROM users WHERE username = 'demo_pm_senior'));
    END IF;
    
    RAISE NOTICE '已创建复杂任务依赖关系网络';
END $$;

-- =============================================================================
-- 6. 生成丰富的时间记录数据
-- =============================================================================

DO $$
DECLARE
    task_record record;
    user_record record;
    log_date date;
    start_time timestamp;
    end_time timestamp;
    work_duration integer;
    break_duration integer;
BEGIN
    -- 为已完成和进行中的任务生成时间记录
    FOR task_record IN 
        SELECT t.id, t.title, t.assignee_id, t.estimated_hours, t.created_at, t.updated_at, t.status,
               u.username, u.profile
        FROM tasks t
        LEFT JOIN users u ON t.assignee_id = u.id
        WHERE t.status IN ('completed', 'in_progress')
        AND t.project_id IN (SELECT id FROM projects WHERE name LIKE '%智慧物流%' OR name LIKE '%医疗器械%' OR name LIKE '%开发工具%')
        AND t.assignee_id IS NOT NULL
        LIMIT 30
    LOOP
        -- 为每个任务生成多天的工作记录
        log_date := task_record.created_at::date;
        
        WHILE log_date <= LEAST(task_record.updated_at::date, CURRENT_DATE) LOOP
            -- 排除周末
            IF EXTRACT(DOW FROM log_date) NOT IN (0, 6) THEN
                -- 生成随机的工作时间 (8:00-18:00)
                start_time := log_date + INTERVAL '8 hours' + (INTERVAL '1 hour' * (random() * 2));
                work_duration := 2 + (random() * 6)::integer; -- 2-8小时工作时间
                break_duration := 15 + (random() * 45)::integer; -- 15-60分钟休息时间
                end_time := start_time + (INTERVAL '1 hour' * work_duration) + (INTERVAL '1 minute' * break_duration);
                
                -- 插入时间记录
                INSERT INTO task_time_logs (
                    task_id, user_id, started_at, ended_at,
                    duration_seconds, description, created_at
                ) VALUES (
                    task_record.id,
                    task_record.assignee_id,
                    start_time,
                    end_time,
                    work_duration * 3600, -- 不计算休息时间
                    CASE 
                        WHEN task_record.status = 'completed' THEN '完成 - ' || task_record.title || ' 相关工作'
                        ELSE '进行中 - ' || task_record.title || ' 开发工作'
                    END,
                    end_time
                );
                
                -- 随机决定是否在这一天工作 (80%概率)
                IF random() < 0.8 THEN
                    log_date := log_date + 1;
                ELSE
                    log_date := log_date + (1 + (random() * 2)::integer); -- 跳过1-3天
                END IF;
            ELSE
                log_date := log_date + 1;
            END IF;
            
            -- 如果任务已完成，在完成日期前几天停止
            IF task_record.status = 'completed' AND log_date > (task_record.updated_at::date - 2) THEN
                EXIT;
            END IF;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE '已生成丰富的时间记录数据';
END $$;

-- =============================================================================
-- 7. 创建一些文档和附件记录
-- =============================================================================

DO $$
DECLARE
    logistics_project_id integer;
    medical_project_id integer;
    admin_id integer;
    pm_id integer;
    tech_lead_id integer;
BEGIN
    SELECT id INTO logistics_project_id FROM projects WHERE name = '智慧物流平台3.0';
    SELECT id INTO medical_project_id FROM projects WHERE name = '医疗器械全生命周期监管系统';
    SELECT id INTO admin_id FROM users WHERE username IN ('demo_ceo', 'admin') LIMIT 1;
    SELECT id INTO pm_id FROM users WHERE username = 'demo_pm_senior';
    SELECT id INTO tech_lead_id FROM users WHERE username = 'demo_tech_lead';
    
    -- 创建项目文档记录（如果有文档表的话）
    /*
    IF logistics_project_id IS NOT NULL AND admin_id IS NOT NULL THEN
        INSERT INTO documents (title, content, type, project_id, created_by, status, created_at)
        VALUES
            ('智慧物流平台3.0需求规格说明书', '# 智慧物流平台3.0需求规格说明书\n\n## 项目背景\n...\n## 功能需求\n...', 'markdown', logistics_project_id, admin_id, 'published', NOW() - INTERVAL '5 months'),
            ('系统架构设计文档', '# 智慧物流平台系统架构\n\n## 整体架构\n微服务架构...\n## 技术栈\n...', 'markdown', logistics_project_id, tech_lead_id, 'published', NOW() - INTERVAL '4 months'),
            ('数据库设计文档', '# 数据库设计文档\n\n## ER图\n...\n## 表结构\n...', 'markdown', logistics_project_id, tech_lead_id, 'published', NOW() - INTERVAL '4 months'),
            ('API接口文档', '# API接口文档\n\n## 认证接口\n...\n## 业务接口\n...', 'markdown', logistics_project_id, tech_lead_id, 'draft', NOW() - INTERVAL '2 months');
    END IF;
    */
    
    RAISE NOTICE '演示项目相关文档已准备';
END $$;

COMMIT;

-- =============================================================================
-- 8. 最终数据验证和统计
-- =============================================================================

DO $$
DECLARE
    demo_users_count integer;
    demo_companies_count integer;
    demo_projects_count integer;
    demo_tasks_count integer;
    demo_relationships_count integer;
    demo_time_logs_count integer;
BEGIN
    SELECT COUNT(*) INTO demo_users_count FROM users WHERE profile::text LIKE '%is_demo_user%';
    SELECT COUNT(*) INTO demo_companies_count FROM customers WHERE company_code IN ('SMART_LOGISTICS', 'INNOV_MEDICAL', 'GREEN_ENERGY', 'FASHION_RETAIL');
    SELECT COUNT(*) INTO demo_projects_count FROM projects WHERE name LIKE '%智慧物流%' OR name LIKE '%医疗器械%' OR name LIKE '%开发工具%';
    SELECT COUNT(*) INTO demo_tasks_count FROM tasks t 
        JOIN projects p ON t.project_id = p.id 
        WHERE p.name LIKE '%智慧物流%' OR p.name LIKE '%医疗器械%' OR p.name LIKE '%开发工具%';
    SELECT COUNT(*) INTO demo_relationships_count FROM task_relationships tr
        JOIN tasks t ON tr.from_task_id = t.id
        JOIN projects p ON t.project_id = p.id
        WHERE p.name LIKE '%智慧物流%' OR p.name LIKE '%医疗器械%' OR p.name LIKE '%开发工具%';
    SELECT COUNT(*) INTO demo_time_logs_count FROM task_time_logs ttl
        JOIN tasks t ON ttl.task_id = t.id  
        JOIN projects p ON t.project_id = p.id
        WHERE p.name LIKE '%智慧物流%' OR p.name LIKE '%医疗器械%' OR p.name LIKE '%开发工具%';
    
    RAISE NOTICE '=== 演示数据创建完成 ===';
    RAISE NOTICE '演示用户数量: %', demo_users_count;
    RAISE NOTICE '演示企业数量: %', demo_companies_count;
    RAISE NOTICE '演示项目数量: %', demo_projects_count;  
    RAISE NOTICE '演示任务数量: %', demo_tasks_count;
    RAISE NOTICE '任务关系数量: %', demo_relationships_count;
    RAISE NOTICE '时间记录数量: %', demo_time_logs_count;
    RAISE NOTICE '============================';
END $$;

SELECT '演示数据脚本执行完成 - 已创建完整的业务场景演示数据' as result;