-- 003_create_roles_table.sql
-- 创建角色表
-- 执行时间：预计 < 1秒

-- 删除表（如果存在）
DROP TABLE IF EXISTS roles;

-- 创建角色表
CREATE TABLE roles (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '角色ID',
    code VARCHAR(50) UNIQUE NOT NULL COMMENT '角色编码',
    name VARCHAR(100) NOT NULL COMMENT '角色名称',
    display_name VARCHAR(100) NOT NULL COMMENT '显示名称',
    description TEXT NULL COMMENT '角色描述',
    user_type ENUM('SYSTEM', 'ENTERPRISE') NOT NULL COMMENT '适用用户类型',
    level INT UNSIGNED NOT NULL DEFAULT 5 COMMENT '角色级别（1-5，1为最高）',
    scope ENUM('GLOBAL', 'ENTERPRISE', 'DEPARTMENT') DEFAULT 'GLOBAL' COMMENT '权限范围',
    parent_role_id BIGINT UNSIGNED NULL COMMENT '父角色ID',
    is_default BOOLEAN DEFAULT FALSE COMMENT '是否为默认角色',
    is_system BOOLEAN DEFAULT FALSE COMMENT '是否为系统内置角色',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
    enterprise_id BIGINT UNSIGNED NULL COMMENT '所属企业ID（企业角色）',
    max_users INT UNSIGNED NULL COMMENT '最大用户数限制',
    permissions_cache JSON NULL COMMENT '权限缓存',
    created_by BIGINT UNSIGNED NULL COMMENT '创建人',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted_at TIMESTAMP NULL COMMENT '删除时间（软删除）'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色表';

-- 创建索引
CREATE INDEX idx_roles_code ON roles(code);
CREATE INDEX idx_roles_user_type ON roles(user_type);
CREATE INDEX idx_roles_level ON roles(level);
CREATE INDEX idx_roles_parent_role_id ON roles(parent_role_id);
CREATE INDEX idx_roles_enterprise_id ON roles(enterprise_id);
CREATE INDEX idx_roles_is_active ON roles(is_active);
CREATE INDEX idx_roles_is_default ON roles(is_default);

-- 创建外键约束
ALTER TABLE roles ADD CONSTRAINT fk_roles_parent_role_id 
    FOREIGN KEY (parent_role_id) REFERENCES roles(id);
ALTER TABLE roles ADD CONSTRAINT fk_roles_enterprise_id 
    FOREIGN KEY (enterprise_id) REFERENCES enterprises(id);
ALTER TABLE roles ADD CONSTRAINT fk_roles_created_by 
    FOREIGN KEY (created_by) REFERENCES users(id);

-- 插入系统默认角色数据
INSERT INTO roles (
    code, name, display_name, description, user_type, level, 
    scope, is_default, is_system, is_active
) VALUES 
-- 系统用户角色
(
    'SYSTEM_SUPER_ADMIN', 
    'Super Administrator', 
    '超级管理员',
    '系统最高权限管理员，拥有所有系统管理权限',
    'SYSTEM', 1, 'GLOBAL', TRUE, TRUE, TRUE
),
(
    'SYSTEM_DEV_MANAGER', 
    'Development Manager', 
    '开发经理',
    '负责产品功能规划和技术架构管理',
    'SYSTEM', 2, 'GLOBAL', TRUE, TRUE, TRUE
),
(
    'SYSTEM_PROJECT_MANAGER', 
    'Project Manager', 
    '项目经理',
    '负责项目进度协调和资源分配管理',
    'SYSTEM', 3, 'GLOBAL', TRUE, TRUE, TRUE
),
(
    'SYSTEM_DEVELOPER', 
    'Developer', 
    '开发工程师',
    '负责系统开发和代码维护',
    'SYSTEM', 4, 'GLOBAL', TRUE, TRUE, TRUE
),
(
    'SYSTEM_TESTER', 
    'Tester', 
    '测试工程师',
    '负责系统测试和质量保证',
    'SYSTEM', 4, 'GLOBAL', TRUE, TRUE, TRUE
),
-- 企业用户角色
(
    'ENTERPRISE_ADMIN', 
    'Enterprise Administrator', 
    '企业管理员',
    '企业内最高权限管理员，管理企业所有用户和配置',
    'ENTERPRISE', 1, 'ENTERPRISE', TRUE, TRUE, TRUE
),
(
    'ENTERPRISE_BUSINESS_MANAGER', 
    'Business Manager', 
    '业务经理',
    '负责企业业务流程管理和决策',
    'ENTERPRISE', 2, 'ENTERPRISE', TRUE, TRUE, TRUE
),
(
    'ENTERPRISE_IT_MANAGER', 
    'IT Manager', 
    'IT经理',
    '负责企业IT基础设施和技术管理',
    'ENTERPRISE', 2, 'ENTERPRISE', TRUE, TRUE, TRUE
),
(
    'ENTERPRISE_DEPT_MANAGER', 
    'Department Manager', 
    '部门经理',
    '负责部门内用户和资源管理',
    'ENTERPRISE', 3, 'DEPARTMENT', TRUE, TRUE, TRUE
),
(
    'ENTERPRISE_USER', 
    'Regular User', 
    '普通用户',
    '企业普通用户，使用系统基础功能',
    'ENTERPRISE', 4, 'ENTERPRISE', TRUE, TRUE, TRUE
),
(
    'ENTERPRISE_GUEST', 
    'Guest User', 
    '访客用户',
    '临时访问用户，权限受限',
    'ENTERPRISE', 5, 'ENTERPRISE', TRUE, TRUE, TRUE
);
