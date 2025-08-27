-- 002_create_users_table.sql
-- 创建用户表
-- 执行时间：预计 < 1秒

-- 删除表（如果存在）
DROP TABLE IF EXISTS users;

-- 创建用户表
CREATE TABLE users (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '用户ID',
    username VARCHAR(50) UNIQUE NOT NULL COMMENT '用户名',
    email VARCHAR(100) UNIQUE NOT NULL COMMENT '邮箱地址',
    password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希',
    salt VARCHAR(32) NOT NULL COMMENT '密码盐值',
    user_type ENUM('SYSTEM', 'ENTERPRISE') NOT NULL COMMENT '用户类型',
    enterprise_id BIGINT UNSIGNED NULL COMMENT '所属企业ID',
    department VARCHAR(100) NULL COMMENT '部门',
    position VARCHAR(100) NULL COMMENT '职位',
    phone VARCHAR(20) NULL COMMENT '手机号',
    avatar_url VARCHAR(500) NULL COMMENT '头像URL',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
    is_verified BOOLEAN DEFAULT FALSE COMMENT '是否已验证',
    last_login_at TIMESTAMP NULL COMMENT '最后登录时间',
    last_login_ip VARCHAR(45) NULL COMMENT '最后登录IP',
    password_changed_at TIMESTAMP NULL COMMENT '密码修改时间',
    failed_login_attempts INT DEFAULT 0 COMMENT '登录失败次数',
    locked_until TIMESTAMP NULL COMMENT '锁定截止时间',
    created_by BIGINT UNSIGNED NULL COMMENT '创建人',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted_at TIMESTAMP NULL COMMENT '删除时间（软删除）'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 创建索引
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_users_enterprise_id ON users(enterprise_id);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);

-- 创建外键约束
ALTER TABLE users ADD CONSTRAINT fk_users_enterprise_id 
    FOREIGN KEY (enterprise_id) REFERENCES enterprises(id);

-- 插入默认用户数据
INSERT INTO users (
    username, email, password_hash, salt, user_type, 
    enterprise_id, department, position, is_active, is_verified
) VALUES 
(
    'admin', 
    'admin@system.local', 
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeilvczOpe1mEJb2C', -- password: admin123
    'system_salt_2025',
    'SYSTEM',
    1,
    'System Administration',
    'Super Administrator',
    TRUE,
    TRUE
);
