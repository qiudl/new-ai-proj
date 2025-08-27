-- 007_create_audit_tables.sql
-- 创建审计相关表
-- 执行时间：预计 < 1秒

-- 删除表（如果存在）
DROP TABLE IF EXISTS permission_audit_logs;
DROP TABLE IF EXISTS role_change_history;
DROP TABLE IF EXISTS user_sessions;

-- 创建权限审计日志表
CREATE TABLE permission_audit_logs (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '日志ID',
    user_id BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
    session_id VARCHAR(255) NULL COMMENT '会话ID',
    action VARCHAR(100) NOT NULL COMMENT '操作动作',
    resource VARCHAR(100) NOT NULL COMMENT '资源标识',
    resource_id VARCHAR(100) NULL COMMENT '资源ID',
    permission_code VARCHAR(100) NULL COMMENT '权限编码',
    result ENUM('GRANTED', 'DENIED', 'ERROR') NOT NULL COMMENT '验证结果',
    reason TEXT NULL COMMENT '结果原因',
    risk_score INT UNSIGNED DEFAULT 0 COMMENT '风险评分',
    context_data JSON NULL COMMENT '上下文数据',
    ip_address VARCHAR(45) NULL COMMENT 'IP地址',
    user_agent TEXT NULL COMMENT '用户代理',
    device_info JSON NULL COMMENT '设备信息',
    location_info JSON NULL COMMENT '位置信息',
    execution_time_ms INT UNSIGNED DEFAULT 0 COMMENT '执行时间（毫秒）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限审计日志表';

-- 创建角色变更历史表
CREATE TABLE role_change_history (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '历史ID',
    user_id BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
    role_id BIGINT UNSIGNED NOT NULL COMMENT '角色ID',
    operation ENUM('ASSIGN', 'REVOKE', 'MODIFY', 'EXPIRE') NOT NULL COMMENT '操作类型',
    old_data JSON NULL COMMENT '变更前数据',
    new_data JSON NULL COMMENT '变更后数据',
    changed_by BIGINT UNSIGNED NULL COMMENT '变更人',
    reason TEXT NULL COMMENT '变更原因',
    approval_status ENUM('PENDING', 'APPROVED', 'REJECTED') NULL COMMENT '审批状态',
    approved_by BIGINT UNSIGNED NULL COMMENT '审批人',
    approved_at TIMESTAMP NULL COMMENT '审批时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色变更历史表';

-- 创建用户会话表
CREATE TABLE user_sessions (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '会话ID',
    session_id VARCHAR(255) UNIQUE NOT NULL COMMENT '会话标识',
    user_id BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
    device_id VARCHAR(255) NULL COMMENT '设备ID',
    device_type ENUM('WEB', 'MOBILE', 'TABLET', 'DESKTOP') NULL COMMENT '设备类型',
    ip_address VARCHAR(45) NULL COMMENT 'IP地址',
    user_agent TEXT NULL COMMENT '用户代理',
    location_info JSON NULL COMMENT '位置信息',
    permissions_cache JSON NULL COMMENT '权限缓存',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否活跃',
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '最后活动时间',
    expires_at TIMESTAMP NOT NULL COMMENT '过期时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户会话表';

-- 为审计日志表创建索引
CREATE INDEX idx_audit_logs_user_id ON permission_audit_logs(user_id);
CREATE INDEX idx_audit_logs_session_id ON permission_audit_logs(session_id);
CREATE INDEX idx_audit_logs_action ON permission_audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON permission_audit_logs(resource);
CREATE INDEX idx_audit_logs_result ON permission_audit_logs(result);
CREATE INDEX idx_audit_logs_created_at ON permission_audit_logs(created_at);
CREATE INDEX idx_audit_logs_user_time ON permission_audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_resource_time ON permission_audit_logs(resource, created_at DESC);

-- 为角色变更历史表创建索引
CREATE INDEX idx_role_history_user_id ON role_change_history(user_id);
CREATE INDEX idx_role_history_role_id ON role_change_history(role_id);
CREATE INDEX idx_role_history_operation ON role_change_history(operation);
CREATE INDEX idx_role_history_changed_by ON role_change_history(changed_by);
CREATE INDEX idx_role_history_created_at ON role_change_history(created_at);
CREATE INDEX idx_role_history_approval_status ON role_change_history(approval_status);

-- 为用户会话表创建索引
CREATE INDEX idx_sessions_session_id ON user_sessions(session_id);
CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_device_id ON user_sessions(device_id);
CREATE INDEX idx_sessions_is_active ON user_sessions(is_active);
CREATE INDEX idx_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_sessions_last_activity ON user_sessions(last_activity_at);

-- 创建外键约束
ALTER TABLE permission_audit_logs ADD CONSTRAINT fk_audit_logs_user_id 
    FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE role_change_history ADD CONSTRAINT fk_role_history_user_id 
    FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE role_change_history ADD CONSTRAINT fk_role_history_role_id 
    FOREIGN KEY (role_id) REFERENCES roles(id);
ALTER TABLE role_change_history ADD CONSTRAINT fk_role_history_changed_by 
    FOREIGN KEY (changed_by) REFERENCES users(id);
ALTER TABLE role_change_history ADD CONSTRAINT fk_role_history_approved_by 
    FOREIGN KEY (approved_by) REFERENCES users(id);

ALTER TABLE user_sessions ADD CONSTRAINT fk_sessions_user_id 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
