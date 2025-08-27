-- 001_create_enterprises_table.sql
-- 创建企业表
-- 执行时间：预计 < 1秒

-- 删除表（如果存在）
DROP TABLE IF EXISTS enterprises;

-- 创建企业表
CREATE TABLE enterprises (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '企业ID',
    name VARCHAR(200) NOT NULL COMMENT '企业名称',
    code VARCHAR(50) UNIQUE NOT NULL COMMENT '企业编码',
    domain VARCHAR(100) UNIQUE NULL COMMENT '企业域名',
    industry VARCHAR(100) NULL COMMENT '所属行业',
    scale ENUM('STARTUP', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE') NULL COMMENT '企业规模',
    contact_person VARCHAR(100) NULL COMMENT '联系人',
    contact_phone VARCHAR(20) NULL COMMENT '联系电话',
    contact_email VARCHAR(100) NULL COMMENT '联系邮箱',
    address TEXT NULL COMMENT '企业地址',
    logo_url VARCHAR(500) NULL COMMENT 'Logo URL',
    website VARCHAR(200) NULL COMMENT '官网地址',
    description TEXT NULL COMMENT '企业描述',
    settings JSON NULL COMMENT '企业配置信息',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted_at TIMESTAMP NULL COMMENT '删除时间（软删除）'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企业表';

-- 创建索引
CREATE INDEX idx_enterprises_code ON enterprises(code);
CREATE INDEX idx_enterprises_domain ON enterprises(domain);
CREATE INDEX idx_enterprises_is_active ON enterprises(is_active);
CREATE INDEX idx_enterprises_created_at ON enterprises(created_at);

-- 插入默认企业数据
INSERT INTO enterprises (
    name, code, domain, industry, scale, 
    contact_person, contact_email, description, is_active
) VALUES 
(
    '系统默认企业', 
    'SYSTEM_DEFAULT', 
    'system.local', 
    'Technology', 
    'ENTERPRISE',
    'System Administrator',
    'admin@system.local',
    '系统默认企业，用于管理系统级用户',
    TRUE
);
