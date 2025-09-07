-- 043_create_system_users_table/up.sql
-- 创建system_users表，分离系统管理员账户，与enterprise_users区分
-- 作者: Claude Code AI
-- 创建时间: 2025-09-05

BEGIN;

-- 创建system_users表
CREATE TABLE IF NOT EXISTS system_users (
    -- 主键和基础信息
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    
    -- 用户基本信息
    name VARCHAR(255),
    phone VARCHAR(50),
    avatar VARCHAR(255),
    bio TEXT,
    
    -- 系统权限和角色
    role VARCHAR(50) NOT NULL DEFAULT 'admin'
        CHECK (role IN ('super_admin', 'admin', 'project_manager', 'developer', 'viewer')),
    permissions JSONB DEFAULT '[]'::jsonb,
    
    -- 安全相关
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMPTZ,
    last_login_ip VARCHAR(45),
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    
    -- 密码安全
    password_changed_at TIMESTAMPTZ,
    must_change_password BOOLEAN DEFAULT FALSE,
    
    -- API访问
    api_key VARCHAR(255) UNIQUE,
    api_key_expires_at TIMESTAMPTZ,
    
    -- 会话管理
    session_token VARCHAR(255),
    session_expires_at TIMESTAMPTZ,
    
    -- 多因素认证
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(255),
    mfa_backup_codes JSONB,
    
    -- 通知设置
    notification_preferences JSONB DEFAULT '{
        "email_notifications": true,
        "system_alerts": true,
        "security_alerts": true
    }'::jsonb,
    
    -- 元数据
    created_by INTEGER,
    updated_by INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_system_users_username ON system_users(username);
CREATE INDEX IF NOT EXISTS idx_system_users_email ON system_users(email);
CREATE INDEX IF NOT EXISTS idx_system_users_role ON system_users(role);
CREATE INDEX IF NOT EXISTS idx_system_users_is_active ON system_users(is_active);
CREATE INDEX IF NOT EXISTS idx_system_users_last_login_at ON system_users(last_login_at);
CREATE INDEX IF NOT EXISTS idx_system_users_api_key ON system_users(api_key) WHERE api_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_system_users_session_token ON system_users(session_token) WHERE session_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_system_users_created_at ON system_users(created_at);
CREATE INDEX IF NOT EXISTS idx_system_users_deleted_at ON system_users(deleted_at) WHERE deleted_at IS NULL;

-- 创建唯一约束（软删除情况下）
CREATE UNIQUE INDEX IF NOT EXISTS idx_system_users_username_unique 
ON system_users(username) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_system_users_email_unique 
ON system_users(email) WHERE deleted_at IS NULL;

-- 创建触发器函数更新updated_at字段
CREATE OR REPLACE FUNCTION update_system_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_system_users_updated_at ON system_users;
CREATE TRIGGER trigger_system_users_updated_at
    BEFORE UPDATE ON system_users
    FOR EACH ROW
    EXECUTE FUNCTION update_system_users_updated_at();

-- 创建触发器函数自动重置失败登录计数
CREATE OR REPLACE FUNCTION reset_failed_login_attempts()
RETURNS TRIGGER AS $$
BEGIN
    -- 成功登录时重置失败计数和解锁账户
    IF NEW.last_login_at IS NOT NULL AND 
       (OLD.last_login_at IS NULL OR NEW.last_login_at > OLD.last_login_at) THEN
        NEW.failed_login_attempts = 0;
        NEW.locked_until = NULL;
    END IF;
    
    -- 失败次数达到5次时锁定账户30分钟
    IF NEW.failed_login_attempts >= 5 AND OLD.failed_login_attempts < 5 THEN
        NEW.locked_until = NOW() + INTERVAL '30 minutes';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建失败登录处理触发器
DROP TRIGGER IF EXISTS trigger_failed_login_handler ON system_users;
CREATE TRIGGER trigger_failed_login_handler
    BEFORE UPDATE ON system_users
    FOR EACH ROW
    EXECUTE FUNCTION reset_failed_login_attempts();

-- 添加表和字段注释
COMMENT ON TABLE system_users IS '系统用户表，管理系统管理员账户，与企业用户分离';
COMMENT ON COLUMN system_users.id IS '用户唯一标识';
COMMENT ON COLUMN system_users.username IS '用户名，全局唯一';
COMMENT ON COLUMN system_users.email IS '邮箱地址，全局唯一';
COMMENT ON COLUMN system_users.password_hash IS '密码哈希值';
COMMENT ON COLUMN system_users.name IS '用户真实姓名';
COMMENT ON COLUMN system_users.phone IS '联系电话';
COMMENT ON COLUMN system_users.avatar IS '用户头像URL';
COMMENT ON COLUMN system_users.bio IS '用户简介';
COMMENT ON COLUMN system_users.role IS '系统角色：super_admin(超级管理员), admin(管理员), project_manager(项目经理), developer(开发者), viewer(查看者)';
COMMENT ON COLUMN system_users.permissions IS '权限列表JSON数组';
COMMENT ON COLUMN system_users.is_active IS '是否激活';
COMMENT ON COLUMN system_users.is_verified IS '是否已验证邮箱';
COMMENT ON COLUMN system_users.last_login_at IS '最后登录时间';
COMMENT ON COLUMN system_users.last_login_ip IS '最后登录IP地址';
COMMENT ON COLUMN system_users.failed_login_attempts IS '失败登录次数';
COMMENT ON COLUMN system_users.locked_until IS '账户锁定到期时间';
COMMENT ON COLUMN system_users.password_changed_at IS '密码最后修改时间';
COMMENT ON COLUMN system_users.must_change_password IS '是否必须修改密码';
COMMENT ON COLUMN system_users.api_key IS 'API访问密钥';
COMMENT ON COLUMN system_users.api_key_expires_at IS 'API密钥过期时间';
COMMENT ON COLUMN system_users.session_token IS '会话令牌';
COMMENT ON COLUMN system_users.session_expires_at IS '会话过期时间';
COMMENT ON COLUMN system_users.mfa_enabled IS '是否启用多因素认证';
COMMENT ON COLUMN system_users.mfa_secret IS '多因素认证密钥';
COMMENT ON COLUMN system_users.mfa_backup_codes IS '多因素认证备用代码';
COMMENT ON COLUMN system_users.notification_preferences IS '通知偏好设置JSON';
COMMENT ON COLUMN system_users.created_by IS '创建人用户ID';
COMMENT ON COLUMN system_users.updated_by IS '最后更新人用户ID';
COMMENT ON COLUMN system_users.created_at IS '创建时间';
COMMENT ON COLUMN system_users.updated_at IS '更新时间';
COMMENT ON COLUMN system_users.deleted_at IS '软删除时间';

-- 插入测试数据（使用简单密码哈希，生产环境应使用bcrypt等）
INSERT INTO system_users (
    username, email, password_hash, name, role, 
    is_active, is_verified, permissions, created_by
) VALUES 
    ('system_admin', 'admin@system.com', 'hashed_password_admin', '系统超级管理员', 'super_admin', TRUE, TRUE, 
     '["user_management", "enterprise_management", "system_settings", "security_management"]'::jsonb, 1),
    ('project_manager', 'pm@system.com', 'hashed_password_pm', '项目经理', 'project_manager', TRUE, TRUE,
     '["project_management", "task_management", "report_viewing"]'::jsonb, 1),
    ('developer', 'dev@system.com', 'hashed_password_dev', '系统开发者', 'developer', TRUE, TRUE,
     '["code_deployment", "debug_access", "log_viewing"]'::jsonb, 1),
    ('viewer', 'viewer@system.com', 'hashed_password_viewer', '系统查看者', 'viewer', TRUE, TRUE,
     '["read_only_access"]'::jsonb, 1)
ON CONFLICT (username) DO NOTHING;

COMMIT;

-- 输出创建信息
\echo '==========================================';
\echo 'System Users table migration completed';
\echo 'Table created: system_users';
\echo 'Indexes created: 11 indexes';
\echo 'Triggers created: 2 triggers';
\echo 'Security features: login attempts, account locking, MFA support';
\echo 'Test data inserted: 4 system users';
\echo '==========================================';