-- Migration: 008 - User Type System Implementation
-- Description: Add user type distinction (system vs company users) and proper permission control
-- Created: 2025-01-22

BEGIN;

-- ===========================================
-- 阶段1: 备份现有数据
-- ===========================================

-- 备份现有用户数据以防迁移出错
CREATE TABLE users_backup_008 AS SELECT * FROM users;

-- ===========================================
-- 阶段2: 添加用户类型相关字段
-- ===========================================

-- 添加用户类型和企业关联字段
ALTER TABLE users 
ADD COLUMN user_type VARCHAR(20) DEFAULT 'system',
ADD COLUMN company_id INTEGER,
ADD COLUMN company_user_id INTEGER,
ADD COLUMN is_company_admin BOOLEAN DEFAULT FALSE,
ADD COLUMN company_permissions JSONB DEFAULT '{}';

-- 添加外键约束
ALTER TABLE users 
ADD CONSTRAINT fk_users_company_id 
    FOREIGN KEY (company_id) REFERENCES customers(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_users_company_user_id 
    FOREIGN KEY (company_user_id) REFERENCES company_users(id) ON DELETE SET NULL;

-- ===========================================
-- 阶段3: 更新角色定义和约束
-- ===========================================

-- 删除旧的角色约束
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- 添加用户类型约束
ALTER TABLE users ADD CONSTRAINT users_type_check 
CHECK (user_type IN ('system', 'company'));

-- 添加新的角色约束（基于用户类型）
ALTER TABLE users ADD CONSTRAINT users_role_type_check 
CHECK (
    (user_type = 'system' AND role IN ('admin', 'project_manager', 'developer')) OR
    (user_type = 'company' AND role IN ('client', 'company_admin', 'company_user'))
);

-- 添加企业用户必须关联企业的约束
ALTER TABLE users ADD CONSTRAINT users_company_association_check 
CHECK (
    (user_type = 'system' AND company_id IS NULL) OR
    (user_type = 'company' AND company_id IS NOT NULL)
);

-- ===========================================
-- 阶段4: 创建企业用户权限表
-- ===========================================

-- 创建企业用户权限模板表
CREATE TABLE company_user_permission_templates (
    id SERIAL PRIMARY KEY,
    role_code VARCHAR(50) NOT NULL UNIQUE,
    role_name VARCHAR(100) NOT NULL,
    role_description TEXT,
    permissions JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入企业用户角色模板
INSERT INTO company_user_permission_templates (role_code, role_name, role_description, permissions) VALUES
('client', '甲方客户', '企业客户，只能查看项目进展', '{
    "project": {"view": true, "edit": false, "delete": false, "create": false},
    "task": {"view": true, "edit": false, "delete": false, "create": false, "assign": false},
    "company": {"view": true, "edit": false},
    "finance": {"view": false},
    "reports": {"view": true}
}'),
('company_admin', '企业管理员', '企业内部管理员，管理企业用户和项目', '{
    "project": {"view": true, "edit": true, "delete": false, "create": true},
    "task": {"view": true, "edit": true, "delete": true, "create": true, "assign": true},
    "company": {"view": true, "edit": true},
    "company_users": {"view": true, "edit": true, "create": true, "delete": false},
    "finance": {"view": true},
    "reports": {"view": true}
}'),
('company_user', '企业普通用户', '企业内部用户，查看分配的任务和项目', '{
    "project": {"view": true, "edit": false, "delete": false, "create": false},
    "task": {"view": true, "edit": true, "delete": false, "create": false, "assign": false},
    "company": {"view": true, "edit": false},
    "finance": {"view": false},
    "reports": {"view": false}
}');

-- ===========================================
-- 阶段5: 数据迁移逻辑
-- ===========================================

-- 将现有的 'client' 角色用户标记为企业用户
UPDATE users 
SET user_type = 'company',
    role = 'client'
WHERE role = 'client';

-- 尝试为企业用户关联公司（基于用户名或邮箱匹配）
-- 这个逻辑可能需要根据实际数据情况调整
WITH user_company_mapping AS (
    SELECT DISTINCT 
        u.id as user_id,
        c.id as company_id,
        cu.id as company_user_id
    FROM users u
    LEFT JOIN company_users cu ON (
        u.email = cu.email OR 
        u.username = cu.name OR
        u.profile->>'name' = cu.name
    )
    LEFT JOIN customers c ON cu.customer_id = c.id
    WHERE u.user_type = 'company'
    AND cu.id IS NOT NULL
)
UPDATE users 
SET 
    company_id = ucm.company_id,
    company_user_id = ucm.company_user_id
FROM user_company_mapping ucm
WHERE users.id = ucm.user_id;

-- 为没有匹配到企业的用户创建默认企业关联
-- 这里创建一个"待分配"的虚拟企业
INSERT INTO customers (company_name, status, priority, created_by) 
VALUES ('待分配企业', 'inactive', 'low', 1)
ON CONFLICT (company_name) DO NOTHING;

-- 将未匹配的企业用户关联到"待分配企业"
UPDATE users 
SET company_id = (SELECT id FROM customers WHERE company_name = '待分配企业')
WHERE user_type = 'company' AND company_id IS NULL;

-- ===========================================
-- 阶段6: 创建访问控制视图和函数
-- ===========================================

-- 创建用户权限检查函数
CREATE OR REPLACE FUNCTION check_user_company_access(
    p_user_id INTEGER,
    p_company_id INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    v_user_type VARCHAR(20);
    v_user_company_id INTEGER;
BEGIN
    SELECT user_type, company_id 
    INTO v_user_type, v_user_company_id
    FROM users 
    WHERE id = p_user_id;
    
    -- 系统用户可以访问所有企业
    IF v_user_type = 'system' THEN
        RETURN TRUE;
    END IF;
    
    -- 企业用户只能访问自己的企业
    IF v_user_type = 'company' AND v_user_company_id = p_company_id THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- 创建项目访问权限检查函数
CREATE OR REPLACE FUNCTION check_user_project_access(
    p_user_id INTEGER,
    p_project_id INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    v_user_type VARCHAR(20);
    v_user_company_id INTEGER;
    v_project_company_count INTEGER;
BEGIN
    SELECT user_type, company_id 
    INTO v_user_type, v_user_company_id
    FROM users 
    WHERE id = p_user_id;
    
    -- 系统用户可以访问所有项目
    IF v_user_type = 'system' THEN
        RETURN TRUE;
    END IF;
    
    -- 企业用户只能访问关联的项目
    IF v_user_type = 'company' THEN
        SELECT COUNT(*) 
        INTO v_project_company_count
        FROM project_companies pc
        WHERE pc.project_id = p_project_id 
        AND pc.customer_id = v_user_company_id;
        
        RETURN v_project_company_count > 0;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- 阶段7: 创建用户统计视图
-- ===========================================

-- 创建增强的用户统计视图
CREATE OR REPLACE VIEW user_stats_enhanced AS
SELECT 
    COUNT(*) as total_users,
    -- 按用户类型统计
    COUNT(*) FILTER (WHERE user_type = 'system') as system_users,
    COUNT(*) FILTER (WHERE user_type = 'company') as company_users,
    -- 按状态统计
    COUNT(*) FILTER (WHERE status = 'active') as active_users,
    COUNT(*) FILTER (WHERE status = 'inactive') as inactive_users,
    COUNT(*) FILTER (WHERE status = 'suspended') as suspended_users,
    -- 按系统用户角色统计
    COUNT(*) FILTER (WHERE user_type = 'system' AND role = 'admin') as admin_count,
    COUNT(*) FILTER (WHERE user_type = 'system' AND role = 'project_manager') as project_manager_count,
    COUNT(*) FILTER (WHERE user_type = 'system' AND role = 'developer') as developer_count,
    -- 按企业用户角色统计
    COUNT(*) FILTER (WHERE user_type = 'company' AND role = 'client') as client_count,
    COUNT(*) FILTER (WHERE user_type = 'company' AND role = 'company_admin') as company_admin_count,
    COUNT(*) FILTER (WHERE user_type = 'company' AND role = 'company_user') as company_user_count,
    -- 其他统计
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as recent_registrations,
    COUNT(DISTINCT company_id) FILTER (WHERE user_type = 'company') as companies_with_users
FROM users
WHERE deleted_at IS NULL;

-- ===========================================
-- 阶段8: 创建索引优化查询
-- ===========================================

-- 创建用户类型相关索引
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id) WHERE user_type = 'company';
CREATE INDEX IF NOT EXISTS idx_users_type_status ON users(user_type, status);
CREATE INDEX IF NOT EXISTS idx_users_type_role ON users(user_type, role);
CREATE INDEX IF NOT EXISTS idx_users_company_role ON users(company_id, role) WHERE user_type = 'company';

-- 创建复合索引优化常见查询
CREATE INDEX IF NOT EXISTS idx_users_active_company ON users(company_id, status) 
WHERE user_type = 'company' AND status = 'active';

-- ===========================================
-- 阶段9: 更新触发器
-- ===========================================

-- 创建用户类型变更审计触发器
CREATE OR REPLACE FUNCTION audit_user_type_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- 记录用户类型变更
    IF OLD.user_type != NEW.user_type THEN
        INSERT INTO permission_audit_logs (
            company_user_id, 
            action_type, 
            old_value, 
            new_value, 
            performed_at
        ) VALUES (
            NEW.id,
            'user_type_change',
            jsonb_build_object('old_type', OLD.user_type, 'old_company', OLD.company_id),
            jsonb_build_object('new_type', NEW.user_type, 'new_company', NEW.company_id),
            NOW()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 应用触发器
DROP TRIGGER IF EXISTS trigger_audit_user_type_changes ON users;
CREATE TRIGGER trigger_audit_user_type_changes
    AFTER UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION audit_user_type_changes();

-- ===========================================
-- 阶段10: 数据验证和清理
-- ===========================================

-- 验证数据一致性
DO $$
DECLARE
    v_inconsistent_users INTEGER;
BEGIN
    -- 检查企业用户是否都有关联的企业
    SELECT COUNT(*) INTO v_inconsistent_users
    FROM users 
    WHERE user_type = 'company' AND company_id IS NULL;
    
    IF v_inconsistent_users > 0 THEN
        RAISE NOTICE '警告: 有 % 个企业用户没有关联企业', v_inconsistent_users;
    END IF;
    
    -- 检查系统用户是否错误关联了企业
    SELECT COUNT(*) INTO v_inconsistent_users
    FROM users 
    WHERE user_type = 'system' AND company_id IS NOT NULL;
    
    IF v_inconsistent_users > 0 THEN
        RAISE NOTICE '警告: 有 % 个系统用户错误关联了企业', v_inconsistent_users;
        -- 清理系统用户的企业关联
        UPDATE users 
        SET company_id = NULL, company_user_id = NULL 
        WHERE user_type = 'system';
    END IF;
END $$;

-- ===========================================
-- 阶段11: 创建示例数据
-- ===========================================

-- 创建示例企业用户账号（与现有企业用户关联）
INSERT INTO users (username, email, password_hash, user_type, role, company_id, status, profile, created_by)
SELECT 
    cu.name,
    COALESCE(cu.email, cu.name || '@' || c.company_name || '.com'),
    '$2a$10$rOhwZ8sZFCjltzNdQqSLg.6qF2vKKcnwz0JN5jzMQjBpYOJQcn7BS', -- 默认密码: password123
    'company',
    CASE 
        WHEN cu.is_primary_contact THEN 'company_admin'
        WHEN cu.can_make_decisions THEN 'company_admin'
        ELSE 'company_user'
    END,
    cu.customer_id,
    'active',
    jsonb_build_object(
        'name', cu.name,
        'phone', cu.mobile,
        'department', cu.department
    ),
    1
FROM company_users cu
JOIN customers c ON cu.customer_id = c.id
WHERE cu.status = 'active'
AND NOT EXISTS (
    SELECT 1 FROM users u 
    WHERE u.email = cu.email OR u.username = cu.name
)
ON CONFLICT (username) DO NOTHING;

-- 更新关联关系
UPDATE users 
SET company_user_id = cu.id
FROM company_users cu
WHERE users.user_type = 'company' 
AND users.company_id = cu.customer_id
AND (users.email = cu.email OR users.username = cu.name);

COMMIT;

-- ===========================================
-- 验证脚本
-- ===========================================

-- 显示迁移结果统计
SELECT 
    '=== 用户类型统计 ===' as info,
    user_type,
    role,
    COUNT(*) as count
FROM users 
GROUP BY user_type, role
ORDER BY user_type, role;

SELECT 
    '=== 企业用户关联统计 ===' as info,
    COUNT(*) as total_company_users,
    COUNT(company_id) as users_with_company,
    COUNT(company_user_id) as users_with_company_user_link
FROM users 
WHERE user_type = 'company';

SELECT 
    '=== 权限函数测试 ===' as info,
    check_user_company_access(1, 1) as admin_can_access_company1,
    check_user_project_access(1, 1) as admin_can_access_project1;
