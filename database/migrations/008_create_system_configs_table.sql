-- 008_create_system_configs_table.sql
-- 创建系统配置表
-- 执行时间：预计 < 1秒

-- 删除表（如果存在）
DROP TABLE IF EXISTS system_configs;

-- 创建系统配置表
CREATE TABLE system_configs (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '配置ID',
    category VARCHAR(50) NOT NULL COMMENT '配置分类',
    key_name VARCHAR(100) NOT NULL COMMENT '配置键',
    value_text TEXT NULL COMMENT '配置值',
    value_type ENUM('STRING', 'INTEGER', 'BOOLEAN', 'JSON', 'ENCRYPTED') DEFAULT 'STRING' COMMENT '值类型',
    description TEXT NULL COMMENT '配置描述',
    is_public BOOLEAN DEFAULT FALSE COMMENT '是否公开',
    is_encrypted BOOLEAN DEFAULT FALSE COMMENT '是否加密',
    enterprise_id BIGINT UNSIGNED NULL COMMENT '企业ID（企业级配置）',
    created_by BIGINT UNSIGNED NULL COMMENT '创建人',
    updated_by BIGINT UNSIGNED NULL COMMENT '更新人',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';

-- 创建索引和约束
CREATE UNIQUE INDEX uk_configs_category_key_enterprise ON system_configs(category, key_name, enterprise_id);
CREATE INDEX idx_configs_category ON system_configs(category);
CREATE INDEX idx_configs_key_name ON system_configs(key_name);
CREATE INDEX idx_configs_enterprise_id ON system_configs(enterprise_id);
CREATE INDEX idx_configs_is_public ON system_configs(is_public);

-- 创建外键约束
ALTER TABLE system_configs ADD CONSTRAINT fk_configs_enterprise_id 
    FOREIGN KEY (enterprise_id) REFERENCES enterprises(id);
ALTER TABLE system_configs ADD CONSTRAINT fk_configs_created_by 
    FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE system_configs ADD CONSTRAINT fk_configs_updated_by 
    FOREIGN KEY (updated_by) REFERENCES users(id);

-- 插入默认系统配置
INSERT INTO system_configs (
    category, key_name, value_text, value_type, description, is_public
) VALUES 
('SECURITY', 'password_min_length', '8', 'INTEGER', '密码最小长度', TRUE),
('SECURITY', 'password_require_uppercase', 'true', 'BOOLEAN', '密码需要大写字母', TRUE),
('SECURITY', 'password_require_lowercase', 'true', 'BOOLEAN', '密码需要小写字母', TRUE),
('SECURITY', 'password_require_numbers', 'true', 'BOOLEAN', '密码需要数字', TRUE),
('SECURITY', 'password_require_symbols', 'false', 'BOOLEAN', '密码需要特殊字符', TRUE),
('SECURITY', 'login_max_attempts', '5', 'INTEGER', '最大登录尝试次数', TRUE),
('SECURITY', 'account_lock_duration', '30', 'INTEGER', '账户锁定时长（分钟）', TRUE),
('SESSION', 'session_timeout', '7200', 'INTEGER', '会话超时时间（秒）', TRUE),
('SESSION', 'max_concurrent_sessions', '3', 'INTEGER', '最大并发会话数', TRUE),
('AUDIT', 'log_retention_days', '90', 'INTEGER', '日志保留天数', FALSE),
('AUDIT', 'enable_detailed_logging', 'true', 'BOOLEAN', '启用详细日志记录', FALSE),
('SYSTEM', 'maintenance_mode', 'false', 'BOOLEAN', '维护模式', FALSE),
('SYSTEM', 'system_name', 'AI Project Management System', 'STRING', '系统名称', TRUE),
('SYSTEM', 'system_version', '1.0.0', 'STRING', '系统版本', TRUE);
