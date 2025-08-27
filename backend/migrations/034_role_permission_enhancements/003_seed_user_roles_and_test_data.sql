-- 用户角色种子数据初始化
-- 文件: 003_seed_user_roles_and_test_data.sql
-- 描述: 创建测试用户、角色分配和演示数据
-- 任务: #625 - 开发数据库迁移脚本和种子数据
-- 创建时间: 2025-08-27

BEGIN;

-- =============================================================================
-- 1. 创建测试用户数据
-- =============================================================================

-- 插入测试用户（如果不存在）
INSERT INTO company_users (
    name, email, password_hash, status, role_id, 
    created_at, updated_at, last_login_at, metadata
) VALUES
-- 管理员用户
('系统管理员', 'admin@aiproj.com', 
 '$2a$10$dummy_hash_for_testing_admin', 'active',
 (SELECT id FROM company_roles WHERE role_code = 'system_admin' LIMIT 1),
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
 '{"user_type": "system", "department": "IT", "hire_date": "2024-01-01"}'),

-- 项目经理用户  
('项目经理张三', 'pm.zhang@aiproj.com',
 '$2a$10$dummy_hash_for_testing_pm', 'active',
 (SELECT id FROM company_roles WHERE role_code = 'project_manager' LIMIT 1),
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP - INTERVAL '2 days',
 '{"user_type": "employee", "department": "Project Management", "hire_date": "2024-02-15"}'),

-- 开发人员用户
('开发工程师李四', 'dev.li@aiproj.com',
 '$2a$10$dummy_hash_for_testing_dev', 'active',
 (SELECT id FROM company_roles WHERE role_code = 'developer' LIMIT 1),
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP - INTERVAL '1 day',
 '{"user_type": "employee", "department": "Development", "hire_date": "2024-03-01", "skills": ["Go", "React", "PostgreSQL"]}'),

-- 设计师用户
('UI设计师王五', 'designer.wang@aiproj.com',
 '$2a$10$dummy_hash_for_testing_designer', 'active',
 (SELECT id FROM company_roles WHERE role_code = 'designer' LIMIT 1),
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP - INTERVAL '3 hours',
 '{"user_type": "employee", "department": "Design", "hire_date": "2024-03-15", "speciality": "UI/UX"}'),

-- 测试人员用户
('测试工程师赵六', 'tester.zhao@aiproj.com',
 '$2a$10$dummy_hash_for_testing_tester', 'active',
 (SELECT id FROM company_roles WHERE role_code = 'tester' LIMIT 1),
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP - INTERVAL '1 hour',
 '{"user_type": "employee", "department": "QA", "hire_date": "2024-04-01"}'),

-- 财务人员用户
('财务专员孙七', 'finance.sun@aiproj.com',
 '$2a$10$dummy_hash_for_testing_finance', 'active',
 (SELECT id FROM company_roles WHERE role_code = 'finance_manager' LIMIT 1),
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP - INTERVAL '30 minutes',
 '{"user_type": "employee", "department": "Finance", "hire_date": "2024-04-15"}'),

-- 访客用户
('访客用户', 'guest@aiproj.com',
 '$2a$10$dummy_hash_for_testing_guest', 'active',
 (SELECT id FROM company_roles WHERE role_code = 'guest' LIMIT 1),
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL,
 '{"user_type": "guest", "department": "External", "access_level": "limited"}'),

-- 临时用户（测试权限过期）
('临时用户周八', 'temp.zhou@aiproj.com',
 '$2a$10$dummy_hash_for_testing_temp', 'active',
 (SELECT id FROM company_roles WHERE role_code = 'member' LIMIT 1),
 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP - INTERVAL '6 hours',
 '{"user_type": "temporary", "department": "External", "access_expires": "2025-12-31"}')

ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    status = EXCLUDED.status,
    updated_at = CURRENT_TIMESTAMP,
    metadata = EXCLUDED.metadata;

-- =============================================================================
-- 2. 创建项目演示数据
-- =============================================================================

-- 插入演示项目（如果projects表存在）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
        INSERT INTO projects (
            name, description, status, created_by, 
            start_date, end_date, metadata, created_at, updated_at
        ) VALUES
        ('AI项目管理系统', '基于AI的项目管理系统开发', 'active',
         (SELECT id FROM company_users WHERE email = 'pm.zhang@aiproj.com' LIMIT 1),
         CURRENT_DATE, CURRENT_DATE + INTERVAL '6 months',
         '{"priority": "high", "budget": 500000, "team_size": 8}',
         CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        
        ('移动端APP开发', '公司官方移动应用开发项目', 'planning',
         (SELECT id FROM company_users WHERE email = 'pm.zhang@aiproj.com' LIMIT 1),
         CURRENT_DATE + INTERVAL '1 month', CURRENT_DATE + INTERVAL '4 months',
         '{"priority": "medium", "budget": 300000, "team_size": 5}',
         CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
         
        ('系统安全升级', '整体系统安全性能升级项目', 'completed',
         (SELECT id FROM company_users WHERE email = 'admin@aiproj.com' LIMIT 1),
         CURRENT_DATE - INTERVAL '3 months', CURRENT_DATE - INTERVAL '1 month',
         '{"priority": "critical", "budget": 200000, "team_size": 3}',
         CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE '✅ 演示项目数据已创建';
    ELSE
        RAISE NOTICE 'ℹ️  projects表不存在，跳过项目数据创建';
    END IF;
END $$;

-- =============================================================================
-- 3. 创建任务演示数据
-- =============================================================================

-- 插入演示任务（如果tasks表存在）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
        INSERT INTO tasks (
            title, description, status, priority, assignee_id, 
            project_id, created_by, estimated_hours, due_date,
            created_at, updated_at, metadata
        ) VALUES
        ('数据库设计', '设计权限系统数据库结构', 'completed', 'high',
         (SELECT id FROM company_users WHERE email = 'dev.li@aiproj.com' LIMIT 1),
         (SELECT id FROM projects WHERE name = 'AI项目管理系统' LIMIT 1),
         (SELECT id FROM company_users WHERE email = 'pm.zhang@aiproj.com' LIMIT 1),
         16, CURRENT_DATE + INTERVAL '3 days',
         CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
         '{"complexity": "high", "technologies": ["PostgreSQL", "RBAC"]}'),
         
        ('权限系统开发', '实现基于角色的权限控制系统', 'in_progress', 'high',
         (SELECT id FROM company_users WHERE email = 'dev.li@aiproj.com' LIMIT 1),
         (SELECT id FROM projects WHERE name = 'AI项目管理系统' LIMIT 1),
         (SELECT id FROM company_users WHERE email = 'pm.zhang@aiproj.com' LIMIT 1),
         40, CURRENT_DATE + INTERVAL '1 week',
         CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
         '{"complexity": "high", "technologies": ["Go", "Gin", "JWT"]}'),
         
        ('UI界面设计', '设计用户管理界面原型', 'in_progress', 'medium',
         (SELECT id FROM company_users WHERE email = 'designer.wang@aiproj.com' LIMIT 1),
         (SELECT id FROM projects WHERE name = 'AI项目管理系统' LIMIT 1),
         (SELECT id FROM company_users WHERE email = 'pm.zhang@aiproj.com' LIMIT 1),
         24, CURRENT_DATE + INTERVAL '5 days',
         CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
         '{"complexity": "medium", "tools": ["Figma", "Adobe XD"]}'),
         
        ('权限系统测试', '全面测试权限控制功能', 'todo', 'medium',
         (SELECT id FROM company_users WHERE email = 'tester.zhao@aiproj.com' LIMIT 1),
         (SELECT id FROM projects WHERE name = 'AI项目管理系统' LIMIT 1),
         (SELECT id FROM company_users WHERE email = 'pm.zhang@aiproj.com' LIMIT 1),
         20, CURRENT_DATE + INTERVAL '2 weeks',
         CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
         '{"complexity": "medium", "test_types": ["unit", "integration", "security"]}')
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE '✅ 演示任务数据已创建';
    ELSE
        RAISE NOTICE 'ℹ️  tasks表不存在，跳过任务数据创建';
    END IF;
END $$;

-- =============================================================================
-- 4. 创建时间日志演示数据
-- =============================================================================

-- 插入时间日志数据（如果task_time_logs表存在）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'task_time_logs') THEN
        INSERT INTO task_time_logs (
            task_id, user_id, start_time, end_time, 
            hours_logged, description, created_at
        )
        SELECT 
            t.id,
            t.assignee_id,
            CURRENT_TIMESTAMP - INTERVAL '2 hours',
            CURRENT_TIMESTAMP - INTERVAL '30 minutes',
            1.5,
            CASE 
                WHEN t.title LIKE '%数据库%' THEN '完成数据库表结构设计'
                WHEN t.title LIKE '%开发%' THEN '实现权限验证中间件'
                WHEN t.title LIKE '%设计%' THEN '完成用户界面原型设计'
                ELSE '完成任务相关工作'
            END,
            CURRENT_TIMESTAMP - INTERVAL '30 minutes'
        FROM tasks t
        WHERE t.status IN ('completed', 'in_progress')
        LIMIT 10;
        
        RAISE NOTICE '✅ 时间日志演示数据已创建';
    ELSE
        RAISE NOTICE 'ℹ️  task_time_logs表不存在，跳过时间日志数据创建';
    END IF;
END $$;

-- =============================================================================
-- 5. 创建权限审计日志演示数据
-- =============================================================================

-- 插入权限变更审计日志
INSERT INTO permission_audit_logs (
    company_user_id, target_user_id, action_type, 
    old_value, new_value, reason, performed_at, metadata
)
SELECT 
    admin_user.id,
    target_user.id,
    'role_assigned',
    NULL,
    jsonb_build_object(
        'role_id', target_user.role_id,
        'role_code', r.role_code,
        'role_name', r.role_name
    ),
    'Initial role assignment during system setup',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    jsonb_build_object(
        'source', 'seed_data',
        'automated', true,
        'batch_operation', true
    )
FROM company_users admin_user
CROSS JOIN company_users target_user
JOIN company_roles r ON target_user.role_id = r.id
WHERE admin_user.email = 'admin@aiproj.com'
  AND target_user.email != 'admin@aiproj.com'
  AND target_user.role_id IS NOT NULL
LIMIT 10;

-- 插入权限使用日志示例
INSERT INTO permission_audit_logs (
    company_user_id, target_user_id, action_type,
    old_value, new_value, reason, performed_at, metadata
) VALUES
((SELECT id FROM company_users WHERE email = 'dev.li@aiproj.com' LIMIT 1),
 (SELECT id FROM company_users WHERE email = 'dev.li@aiproj.com' LIMIT 1),
 'permission_used',
 NULL,
 '{"permission": "task.update", "resource_id": 1, "success": true}',
 'Updated task status to in_progress',
 CURRENT_TIMESTAMP - INTERVAL '30 minutes',
 '{"ip_address": "192.168.1.100", "user_agent": "Mozilla/5.0", "session_id": "demo_session"}'),

((SELECT id FROM company_users WHERE email = 'designer.wang@aiproj.com' LIMIT 1),
 (SELECT id FROM company_users WHERE email = 'designer.wang@aiproj.com' LIMIT 1),
 'permission_used',
 NULL,
 '{"permission": "task.read", "resource_id": 2, "success": true}',
 'Viewed task details for design work',
 CURRENT_TIMESTAMP - INTERVAL '15 minutes',
 '{"ip_address": "192.168.1.101", "user_agent": "Chrome/91.0", "session_id": "demo_session_2"}');

-- =============================================================================
-- 6. 更新用户统计信息
-- =============================================================================

-- 更新用户登录统计
UPDATE company_users SET
    login_count = FLOOR(RANDOM() * 50) + 1,
    last_activity_at = CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '7 days'),
    metadata = metadata || jsonb_build_object(
        'total_tasks_assigned', FLOOR(RANDOM() * 20),
        'total_tasks_completed', FLOOR(RANDOM() * 15),
        'average_task_completion_time', FLOOR(RANDOM() * 5) + 1 || ' days',
        'last_password_change', (CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '90 days'))::date
    )
WHERE email LIKE '%@aiproj.com';

-- =============================================================================
-- 7. 创建演示数据验证和报告
-- =============================================================================

-- 创建种子数据验证视图
CREATE OR REPLACE VIEW user_role_seed_verification AS
SELECT 
    'Test Users Created' as category,
    COUNT(*) as count,
    'users with @aiproj.com domain' as description
FROM company_users 
WHERE email LIKE '%@aiproj.com'
UNION ALL
SELECT 
    'Users with Roles' as category,
    COUNT(*) as count,
    'users assigned to roles' as description
FROM company_users 
WHERE role_id IS NOT NULL AND status = 'active'
UNION ALL
SELECT 
    'Permission Audit Logs' as category,
    COUNT(*) as count,
    'audit log entries created' as description
FROM permission_audit_logs
WHERE metadata->>'source' = 'seed_data'
UNION ALL
SELECT 
    'Active User Sessions' as category,
    COUNT(*) as count,
    'users with recent activity' as description
FROM company_users 
WHERE last_activity_at > CURRENT_TIMESTAMP - INTERVAL '24 hours';

-- 生成用户角色种子数据报告
DO $$
DECLARE
    test_users INTEGER;
    assigned_roles INTEGER;
    audit_entries INTEGER;
    active_users INTEGER;
    projects_created INTEGER := 0;
    tasks_created INTEGER := 0;
BEGIN
    SELECT COUNT(*) INTO test_users FROM company_users WHERE email LIKE '%@aiproj.com';
    SELECT COUNT(*) INTO assigned_roles FROM company_users WHERE role_id IS NOT NULL AND status = 'active';
    SELECT COUNT(*) INTO audit_entries FROM permission_audit_logs WHERE metadata->>'source' = 'seed_data';
    SELECT COUNT(*) INTO active_users FROM company_users WHERE last_activity_at > CURRENT_TIMESTAMP - INTERVAL '24 hours';
    
    -- 检查可选表
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
        SELECT COUNT(*) INTO projects_created FROM projects WHERE metadata->>'priority' IS NOT NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
        SELECT COUNT(*) INTO tasks_created FROM tasks WHERE metadata->>'complexity' IS NOT NULL;
    END IF;
    
    RAISE NOTICE '=== 用户角色种子数据初始化完成 ===';
    RAISE NOTICE '测试用户数量: %', test_users;
    RAISE NOTICE '已分配角色用户数: %', assigned_roles;
    RAISE NOTICE '权限审计日志条目: %', audit_entries;
    RAISE NOTICE '活跃用户数: %', active_users;
    
    IF projects_created > 0 THEN
        RAISE NOTICE '演示项目数量: %', projects_created;
    END IF;
    
    IF tasks_created > 0 THEN
        RAISE NOTICE '演示任务数量: %', tasks_created;
    END IF;
    
    IF test_users > 0 AND assigned_roles > 0 THEN
        RAISE NOTICE '✅ 用户角色种子数据初始化成功';
        RAISE NOTICE 'ℹ️  测试登录信息：';
        RAISE NOTICE '   - 系统管理员: admin@aiproj.com';
        RAISE NOTICE '   - 项目经理: pm.zhang@aiproj.com';
        RAISE NOTICE '   - 开发人员: dev.li@aiproj.com';
        RAISE NOTICE '   - 设计师: designer.wang@aiproj.com';
        RAISE NOTICE '   - 测试人员: tester.zhao@aiproj.com';
        RAISE NOTICE '   (密码均为演示hash，需要重置)';
    ELSE
        RAISE NOTICE '⚠️  用户角色种子数据可能未完全初始化';
    END IF;
END $$;

COMMIT;