-- 041_create_enterprise_users_table/up.sql
-- 创建enterprise_users表，统一企业用户管理，替代原有的customer_users、company_users表
-- 作者: Claude Code AI
-- 创建时间: 2025-09-05

BEGIN;

-- 创建enterprise_users表
CREATE TABLE IF NOT EXISTS enterprise_users (
    -- 主键和基础信息
    id SERIAL PRIMARY KEY,
    enterprise_id INTEGER NOT NULL,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    
    -- 用户基本信息
    name VARCHAR(255),
    phone VARCHAR(50),
    position VARCHAR(255),
    department_id INTEGER,
    
    -- 权限和角色
    role_id INTEGER,
    is_primary_contact BOOLEAN DEFAULT FALSE,
    can_make_decisions BOOLEAN DEFAULT FALSE,
    access_level INTEGER DEFAULT 1 CHECK (access_level >= 1 AND access_level <= 5),
    
    -- 账户状态
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'pending', 'locked')),
    
    -- 邀请和激活信息
    invitation_token VARCHAR(255),
    invitation_sent_at TIMESTAMPTZ,
    invitation_accepted_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    
    -- 头像和个人信息
    avatar VARCHAR(255),
    bio TEXT,
    
    -- 元数据
    created_by INTEGER,
    updated_by INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 添加外键约束
ALTER TABLE enterprise_users 
ADD CONSTRAINT fk_enterprise_users_enterprise_id 
FOREIGN KEY (enterprise_id) REFERENCES enterprises(id) ON DELETE CASCADE;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_enterprise_users_enterprise_id ON enterprise_users(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_users_username ON enterprise_users(username);
CREATE INDEX IF NOT EXISTS idx_enterprise_users_email ON enterprise_users(email);
CREATE INDEX IF NOT EXISTS idx_enterprise_users_status ON enterprise_users(status);
CREATE INDEX IF NOT EXISTS idx_enterprise_users_role_id ON enterprise_users(role_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_users_department_id ON enterprise_users(department_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_users_is_primary_contact ON enterprise_users(is_primary_contact) WHERE is_primary_contact = TRUE;
CREATE INDEX IF NOT EXISTS idx_enterprise_users_created_at ON enterprise_users(created_at);
CREATE INDEX IF NOT EXISTS idx_enterprise_users_deleted_at ON enterprise_users(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_enterprise_users_invitation_token ON enterprise_users(invitation_token) WHERE invitation_token IS NOT NULL;

-- 创建唯一约束（同一企业内用户名唯一，邮箱全局唯一）
CREATE UNIQUE INDEX IF NOT EXISTS idx_enterprise_users_enterprise_username 
ON enterprise_users(enterprise_id, username) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_enterprise_users_email_unique 
ON enterprise_users(email) WHERE deleted_at IS NULL;

-- 创建触发器函数更新updated_at字段
CREATE OR REPLACE FUNCTION update_enterprise_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_enterprise_users_updated_at ON enterprise_users;
CREATE TRIGGER trigger_enterprise_users_updated_at
    BEFORE UPDATE ON enterprise_users
    FOR EACH ROW
    EXECUTE FUNCTION update_enterprise_users_updated_at();

-- 添加表和字段注释
COMMENT ON TABLE enterprise_users IS '企业用户表，统一管理所有企业用户信息，替代原有customer_users/company_users表';
COMMENT ON COLUMN enterprise_users.id IS '用户唯一标识';
COMMENT ON COLUMN enterprise_users.enterprise_id IS '所属企业ID，关联enterprises表';
COMMENT ON COLUMN enterprise_users.username IS '用户名，在同一企业内唯一';
COMMENT ON COLUMN enterprise_users.email IS '邮箱地址，全局唯一';
COMMENT ON COLUMN enterprise_users.name IS '用户真实姓名';
COMMENT ON COLUMN enterprise_users.phone IS '联系电话';
COMMENT ON COLUMN enterprise_users.position IS '职位';
COMMENT ON COLUMN enterprise_users.department_id IS '部门ID，关联enterprise_departments表';
COMMENT ON COLUMN enterprise_users.role_id IS '角色ID，关联enterprise_roles表';
COMMENT ON COLUMN enterprise_users.is_primary_contact IS '是否为主要联系人';
COMMENT ON COLUMN enterprise_users.can_make_decisions IS '是否可以做决策';
COMMENT ON COLUMN enterprise_users.access_level IS '访问级别，1-5级，5为最高权限';
COMMENT ON COLUMN enterprise_users.status IS '用户状态：active(活跃), inactive(非活跃), pending(待激活), locked(锁定)';
COMMENT ON COLUMN enterprise_users.invitation_token IS '邀请令牌，用于用户激活';
COMMENT ON COLUMN enterprise_users.invitation_sent_at IS '邀请发送时间';
COMMENT ON COLUMN enterprise_users.invitation_accepted_at IS '邀请接受时间';
COMMENT ON COLUMN enterprise_users.last_login_at IS '最后登录时间';
COMMENT ON COLUMN enterprise_users.avatar IS '用户头像URL';
COMMENT ON COLUMN enterprise_users.bio IS '用户简介';
COMMENT ON COLUMN enterprise_users.created_by IS '创建人用户ID';
COMMENT ON COLUMN enterprise_users.updated_by IS '最后更新人用户ID';
COMMENT ON COLUMN enterprise_users.created_at IS '创建时间';
COMMENT ON COLUMN enterprise_users.updated_at IS '更新时间';
COMMENT ON COLUMN enterprise_users.deleted_at IS '软删除时间';

-- 插入测试数据
INSERT INTO enterprise_users (
    enterprise_id, username, email, name, position, 
    is_primary_contact, can_make_decisions, access_level, status, created_by
) VALUES 
    (1, 'admin', 'admin@testtech.com', '系统管理员', '技术总监', TRUE, TRUE, 5, 'active', 1),
    (1, 'john_dev', 'john@testtech.com', '张三', '高级开发工程师', FALSE, FALSE, 3, 'active', 1),
    (2, 'finance_admin', 'admin@examplefin.com', '李四', '财务经理', TRUE, TRUE, 4, 'active', 1),
    (2, 'analyst', 'analyst@examplefin.com', '王五', '数据分析师', FALSE, FALSE, 2, 'active', 1)
ON CONFLICT DO NOTHING;

COMMIT;

-- 输出创建信息
\echo '==========================================';
\echo 'Enterprise Users table migration completed';
\echo 'Table created: enterprise_users';
\echo 'Indexes created: 10 indexes';
\echo 'Trigger created: update_enterprise_users_updated_at';
\echo 'Foreign key constraint created';
\echo 'Test data inserted: 4 enterprise users';
\echo '==========================================';