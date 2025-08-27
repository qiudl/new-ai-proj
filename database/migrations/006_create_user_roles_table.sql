-- 006_create_user_roles_table.sql
-- 创建用户角色关联表
-- 执行时间：预计 < 1秒

-- 删除表（如果存在）
DROP TABLE IF EXISTS user_roles;

-- 创建用户角色关联表
CREATE TABLE user_roles (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '关联ID',
    user_id BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
    role_id BIGINT UNSIGNED NOT NULL COMMENT '角色ID',
    scope_type ENUM('GLOBAL', 'ENTERPRISE', 'DEPARTMENT', 'PROJECT') DEFAULT 'GLOBAL' COMMENT '授权范围',
    scope_id BIGINT UNSIGNED NULL COMMENT '范围ID',
    conditions JSON NULL COMMENT '条件限制',
    assigned_by BIGINT UNSIGNED NULL COMMENT '分配人',
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '分配时间',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
    expires_at TIMESTAMP NULL COMMENT '过期时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户角色关联表';

-- 创建索引和约束
CREATE UNIQUE INDEX uk_user_roles_user_role_scope ON user_roles(user_id, role_id, scope_type, scope_id);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX idx_user_roles_scope_type ON user_roles(scope_type);
CREATE INDEX idx_user_roles_scope_id ON user_roles(scope_id);
CREATE INDEX idx_user_roles_is_active ON user_roles(is_active);
CREATE INDEX idx_user_roles_expires_at ON user_roles(expires_at);
CREATE INDEX idx_user_roles_assigned_at ON user_roles(assigned_at);

-- 创建外键约束
ALTER TABLE user_roles ADD CONSTRAINT fk_user_roles_user_id 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE user_roles ADD CONSTRAINT fk_user_roles_role_id 
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;
ALTER TABLE user_roles ADD CONSTRAINT fk_user_roles_assigned_by 
    FOREIGN KEY (assigned_by) REFERENCES users(id);

-- 为默认admin用户分配超级管理员角色
INSERT INTO user_roles (user_id, role_id, scope_type, assigned_by) VALUES 
(1, 1, 'GLOBAL', 1);  -- admin用户获得超级管理员角色
