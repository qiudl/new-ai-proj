-- 基础种子数据脚本
-- 文件: 001_basic_seed_data.sql
-- 描述: 生产环境安全的基础种子数据，包含系统必需的角色、权限等
-- 作者: Claude AI (任务#621)
-- 创建时间: 2025-08-27
-- 环境: 所有环境安全执行

BEGIN;

-- =============================================================================
-- 1. 基础系统配置数据
-- =============================================================================

-- 1.1 确保基础角色存在（已在migration中创建，这里做补充验证）
INSERT INTO company_roles (role_code, role_name, role_description, is_system_role, is_active) VALUES
    ('superadmin', '超级管理员', '拥有系统所有权限的最高级别管理员', true, true),
    ('system_admin', '系统管理员', '系统管理员，负责系统配置和用户管理', true, true),
    ('project_manager', '项目经理', '项目管理权限，可管理分配的项目', true, true),
    ('developer', '开发人员', '开发人员角色，处理开发任务', true, true),
    ('client_user', '客户用户', '外部客户用户，有限访问权限', true, true)
ON CONFLICT (role_code) DO NOTHING;

-- 1.2 基础权限数据（确保核心权限存在）
INSERT INTO permissions (permission_code, permission_name, permission_description, module, resource, action, is_active) VALUES
    -- 系统管理权限
    ('system.admin', '系统管理', '系统管理员权限', 'system', 'system', 'admin', true),
    ('system.config', '系统配置', '系统配置管理', 'system', 'config', 'manage', true),
    ('system.audit', '审计查看', '系统审计日志查看', 'system', 'audit', 'read', true),
    
    -- 用户管理权限
    ('user.read', '用户查看', '查看用户信息', 'user', 'user', 'read', true),
    ('user.create', '用户创建', '创建新用户', 'user', 'user', 'create', true),
    ('user.update', '用户编辑', '编辑用户信息', 'user', 'user', 'update', true),
    ('user.delete', '用户删除', '删除用户', 'user', 'user', 'delete', true),
    
    -- 项目管理权限
    ('project.read', '项目查看', '查看项目信息', 'project', 'project', 'read', true),
    ('project.create', '项目创建', '创建新项目', 'project', 'project', 'create', true),
    ('project.update', '项目编辑', '编辑项目信息', 'project', 'project', 'update', true),
    ('project.delete', '项目删除', '删除项目', 'project', 'project', 'delete', true),
    
    -- 任务管理权限
    ('task.read', '任务查看', '查看任务信息', 'task', 'task', 'read', true),
    ('task.create', '任务创建', '创建新任务', 'task', 'task', 'create', true),
    ('task.update', '任务编辑', '编辑任务信息', 'task', 'task', 'update', true),
    ('task.delete', '任务删除', '删除任务', 'task', 'task', 'delete', true),
    ('task.assign', '任务分配', '分配任务给用户', 'task', 'task', 'assign', true)
ON CONFLICT (permission_code) DO NOTHING;

-- =============================================================================
-- 2. 默认管理员用户（仅在不存在时创建）
-- =============================================================================

-- 2.1 创建种子管理员用户（如果不存在）
-- 注意：密码是 "seed_admin_2024" 的bcrypt哈希值
DO $$
DECLARE
    seed_admin_exists boolean;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM users 
        WHERE username = 'seed_admin' AND user_type = 'system'
    ) INTO seed_admin_exists;
    
    IF NOT seed_admin_exists THEN
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
            '{"display_name": "种子管理员", "is_seed_user": true}',
            NOW(),
            NOW()
        );
        
        RAISE NOTICE '已创建种子管理员用户: seed_admin';
    ELSE
        RAISE NOTICE '种子管理员用户已存在，跳过创建';
    END IF;
END $$;

-- =============================================================================
-- 3. 默认项目类型和状态配置
-- =============================================================================

-- 3.1 项目状态元数据（存储在系统配置表中，如果存在的话）
-- 这里使用注释记录标准项目状态，供应用程序使用
-- 标准项目状态：planning, active, on_hold, completed, cancelled, archived

-- 3.2 任务状态元数据
-- 标准任务状态：draft, planning, todo, in_progress, testing, completed, cancelled, on_hold, suspended, blocked, archived

-- 3.3 优先级配置
-- 标准优先级：low, medium, high, urgent

-- =============================================================================
-- 4. 系统配置项
-- =============================================================================

-- 4.1 如果存在系统配置表，插入基础配置
-- 注意：这里需要根据实际的系统配置表结构调整
/*
INSERT INTO system_configs (config_key, config_value, config_type, description, is_system) VALUES
    ('system.default_role', 'developer', 'string', '新用户默认角色', true),
    ('system.password_policy', '{"min_length": 8, "require_numbers": true, "require_symbols": false}', 'json', '密码策略配置', true),
    ('project.default_status', 'planning', 'string', '新项目默认状态', true),
    ('task.default_status', 'todo', 'string', '新任务默认状态', true),
    ('task.auto_status_transition', 'true', 'boolean', '是否自动状态转换', true)
ON CONFLICT (config_key) DO NOTHING;
*/

-- =============================================================================
-- 5. 基础演示项目（可选，仅在development环境）
-- =============================================================================

-- 仅在开发环境创建演示项目
DO $$
DECLARE
    app_env text := current_setting('app_environment', true);
    seed_project_exists boolean;
    admin_user_id integer;
BEGIN
    -- 获取管理员用户ID
    SELECT id INTO admin_user_id FROM users WHERE username = 'seed_admin' OR username = 'admin' LIMIT 1;
    
    IF app_env IN ('development', 'dev') AND admin_user_id IS NOT NULL THEN
        SELECT EXISTS(
            SELECT 1 FROM projects WHERE name = '种子演示项目'
        ) INTO seed_project_exists;
        
        IF NOT seed_project_exists THEN
            INSERT INTO projects (name, description, owner_id, created_at, updated_at) VALUES
                ('种子演示项目', '系统初始化的演示项目，包含基础的项目结构和任务', admin_user_id, NOW(), NOW());
            
            RAISE NOTICE '已创建种子演示项目';
        END IF;
    END IF;
END $$;

-- =============================================================================
-- 6. 数据验证和完整性检查
-- =============================================================================

-- 6.1 验证基础数据创建情况
DO $$
DECLARE
    role_count integer;
    permission_count integer;
    admin_count integer;
BEGIN
    SELECT COUNT(*) INTO role_count FROM company_roles WHERE is_system_role = true;
    SELECT COUNT(*) INTO permission_count FROM permissions WHERE is_active = true;
    SELECT COUNT(*) INTO admin_count FROM users WHERE role = 'admin' AND user_type = 'system';
    
    RAISE NOTICE '系统角色数量: %', role_count;
    RAISE NOTICE '系统权限数量: %', permission_count;  
    RAISE NOTICE '系统管理员数量: %', admin_count;
    
    IF role_count < 5 THEN
        RAISE WARNING '系统角色数量不足，请检查角色创建是否成功';
    END IF;
    
    IF permission_count < 10 THEN
        RAISE WARNING '系统权限数量不足，请检查权限创建是否成功';
    END IF;
    
    IF admin_count < 1 THEN
        RAISE WARNING '没有系统管理员，请检查管理员创建是否成功';
    END IF;
END $$;

COMMIT;

-- =============================================================================
-- 7. 脚本执行日志
-- =============================================================================

-- 记录脚本执行（如果有日志表的话）
-- INSERT INTO seed_execution_logs (script_name, executed_at, status) VALUES 
-- ('001_basic_seed_data.sql', NOW(), 'success');

SELECT '基础种子数据脚本执行完成' as result;