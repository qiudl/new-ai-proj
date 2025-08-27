-- 005_create_role_permissions_table.sql
-- 创建角色权限关联表
-- 执行时间：预计 < 1秒

-- 删除表（如果存在）
DROP TABLE IF EXISTS role_permissions;

-- 创建角色权限关联表
CREATE TABLE role_permissions (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '关联ID',
    role_id BIGINT UNSIGNED NOT NULL COMMENT '角色ID',
    permission_id BIGINT UNSIGNED NOT NULL COMMENT '权限ID',
    grant_type ENUM('ALLOW', 'DENY') DEFAULT 'ALLOW' COMMENT '授权类型',
    conditions JSON NULL COMMENT '条件限制',
    scope_data JSON NULL COMMENT '范围数据',
    created_by BIGINT UNSIGNED NULL COMMENT '创建人',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    expires_at TIMESTAMP NULL COMMENT '过期时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色权限关联表';

-- 创建索引和约束
CREATE UNIQUE INDEX uk_role_permissions_role_permission ON role_permissions(role_id, permission_id);
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX idx_role_permissions_grant_type ON role_permissions(grant_type);
CREATE INDEX idx_role_permissions_expires_at ON role_permissions(expires_at);

-- 创建外键约束
ALTER TABLE role_permissions ADD CONSTRAINT fk_role_permissions_role_id 
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;
ALTER TABLE role_permissions ADD CONSTRAINT fk_role_permissions_permission_id 
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE;
ALTER TABLE role_permissions ADD CONSTRAINT fk_role_permissions_created_by 
    FOREIGN KEY (created_by) REFERENCES users(id);
