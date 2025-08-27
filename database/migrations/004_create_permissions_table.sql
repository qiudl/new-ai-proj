-- 004_create_permissions_table.sql
-- 创建权限表
-- 执行时间：预计 5-10秒（包含大量权限数据插入）

-- 删除表（如果存在）
DROP TABLE IF EXISTS permissions;

-- 创建权限表
CREATE TABLE permissions (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT COMMENT '权限ID',
    code VARCHAR(100) UNIQUE NOT NULL COMMENT '权限编码',
    name VARCHAR(200) NOT NULL COMMENT '权限名称',
    display_name VARCHAR(200) NOT NULL COMMENT '显示名称',
    description TEXT NULL COMMENT '权限描述',
    resource VARCHAR(100) NOT NULL COMMENT '资源标识',
    action VARCHAR(50) NOT NULL COMMENT '操作类型',
    resource_type ENUM('SYSTEM', 'BUSINESS', 'DATA', 'UI') NOT NULL COMMENT '资源类型',
    category VARCHAR(50) NULL COMMENT '权限分类',
    risk_level ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'LOW' COMMENT '风险级别',
    is_system BOOLEAN DEFAULT FALSE COMMENT '是否为系统内置权限',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
    requires_approval BOOLEAN DEFAULT FALSE COMMENT '是否需要审批',
    parent_permission_id BIGINT UNSIGNED NULL COMMENT '父权限ID',
    sort_order INT UNSIGNED DEFAULT 0 COMMENT '排序',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限表';

-- 创建索引
CREATE INDEX idx_permissions_code ON permissions(code);
CREATE INDEX idx_permissions_resource ON permissions(resource);
CREATE INDEX idx_permissions_action ON permissions(action);
CREATE INDEX idx_permissions_resource_type ON permissions(resource_type);
CREATE INDEX idx_permissions_category ON permissions(category);
CREATE INDEX idx_permissions_risk_level ON permissions(risk_level);
CREATE INDEX idx_permissions_is_active ON permissions(is_active);
CREATE INDEX idx_permissions_parent_permission_id ON permissions(parent_permission_id);

-- 创建唯一约束和外键
CREATE UNIQUE INDEX uk_permissions_resource_action ON permissions(resource, action);
ALTER TABLE permissions ADD CONSTRAINT fk_permissions_parent_permission_id 
    FOREIGN KEY (parent_permission_id) REFERENCES permissions(id);

-- 插入系统权限数据
INSERT INTO permissions (
    code, name, display_name, description, resource, action, 
    resource_type, category, risk_level, is_system, requires_approval
) VALUES 
-- 用户管理权限
('USER_CREATE', 'Create User', '创建用户', '创建新用户账户', 'USER', 'CREATE', 'SYSTEM', 'USER_MANAGEMENT', 'HIGH', TRUE, TRUE),
('USER_READ', 'Read User', '查看用户', '查看用户信息', 'USER', 'READ', 'SYSTEM', 'USER_MANAGEMENT', 'LOW', TRUE, FALSE),
('USER_UPDATE', 'Update User', '更新用户', '修改用户信息', 'USER', 'UPDATE', 'SYSTEM', 'USER_MANAGEMENT', 'MEDIUM', TRUE, FALSE),
('USER_DELETE', 'Delete User', '删除用户', '删除用户账户', 'USER', 'DELETE', 'SYSTEM', 'USER_MANAGEMENT', 'CRITICAL', TRUE, TRUE),
('USER_RESET_PASSWORD', 'Reset User Password', '重置用户密码', '重置用户登录密码', 'USER', 'RESET_PASSWORD', 'SYSTEM', 'USER_MANAGEMENT', 'HIGH', TRUE, TRUE),
('USER_LOCK', 'Lock User', '锁定用户', '锁定用户账户', 'USER', 'LOCK', 'SYSTEM', 'USER_MANAGEMENT', 'HIGH', TRUE, FALSE),
('USER_UNLOCK', 'Unlock User', '解锁用户', '解锁用户账户', 'USER', 'UNLOCK', 'SYSTEM', 'USER_MANAGEMENT', 'MEDIUM', TRUE, FALSE),

-- 角色管理权限
('ROLE_CREATE', 'Create Role', '创建角色', '创建新角色', 'ROLE', 'CREATE', 'SYSTEM', 'ROLE_MANAGEMENT', 'HIGH', TRUE, TRUE),
('ROLE_READ', 'Read Role', '查看角色', '查看角色信息', 'ROLE', 'READ', 'SYSTEM', 'ROLE_MANAGEMENT', 'LOW', TRUE, FALSE),
('ROLE_UPDATE', 'Update Role', '更新角色', '修改角色信息', 'ROLE', 'UPDATE', 'SYSTEM', 'ROLE_MANAGEMENT', 'HIGH', TRUE, TRUE),
('ROLE_DELETE', 'Delete Role', '删除角色', '删除角色', 'ROLE', 'DELETE', 'SYSTEM', 'ROLE_MANAGEMENT', 'CRITICAL', TRUE, TRUE),
('ROLE_ASSIGN', 'Assign Role', '分配角色', '为用户分配角色', 'ROLE', 'ASSIGN', 'SYSTEM', 'ROLE_MANAGEMENT', 'HIGH', TRUE, FALSE),
('ROLE_REVOKE', 'Revoke Role', '撤销角色', '撤销用户角色', 'ROLE', 'REVOKE', 'SYSTEM', 'ROLE_MANAGEMENT', 'HIGH', TRUE, FALSE),

-- 权限管理权限
('PERMISSION_CREATE', 'Create Permission', '创建权限', '创建新权限', 'PERMISSION', 'CREATE', 'SYSTEM', 'PERMISSION_MANAGEMENT', 'CRITICAL', TRUE, TRUE),
('PERMISSION_READ', 'Read Permission', '查看权限', '查看权限信息', 'PERMISSION', 'READ', 'SYSTEM', 'PERMISSION_MANAGEMENT', 'LOW', TRUE, FALSE),
('PERMISSION_UPDATE', 'Update Permission', '更新权限', '修改权限信息', 'PERMISSION', 'UPDATE', 'SYSTEM', 'PERMISSION_MANAGEMENT', 'CRITICAL', TRUE, TRUE),
('PERMISSION_DELETE', 'Delete Permission', '删除权限', '删除权限', 'PERMISSION', 'DELETE', 'SYSTEM', 'PERMISSION_MANAGEMENT', 'CRITICAL', TRUE, TRUE),
('PERMISSION_ASSIGN', 'Assign Permission', '分配权限', '为角色分配权限', 'PERMISSION', 'ASSIGN', 'SYSTEM', 'PERMISSION_MANAGEMENT', 'HIGH', TRUE, TRUE),
('PERMISSION_REVOKE', 'Revoke Permission', '撤销权限', '撤销角色权限', 'PERMISSION', 'REVOKE', 'SYSTEM', 'PERMISSION_MANAGEMENT', 'HIGH', TRUE, TRUE),

-- 系统配置权限
('SYSTEM_CONFIG_READ', 'Read System Config', '查看系统配置', '查看系统配置信息', 'SYSTEM_CONFIG', 'READ', 'SYSTEM', 'SYSTEM_MANAGEMENT', 'MEDIUM', TRUE, FALSE),
('SYSTEM_CONFIG_UPDATE', 'Update System Config', '更新系统配置', '修改系统配置', 'SYSTEM_CONFIG', 'UPDATE', 'SYSTEM', 'SYSTEM_MANAGEMENT', 'CRITICAL', TRUE, TRUE),
('SYSTEM_BACKUP', 'System Backup', '系统备份', '执行系统备份操作', 'SYSTEM', 'BACKUP', 'SYSTEM', 'SYSTEM_MANAGEMENT', 'HIGH', TRUE, FALSE),
('SYSTEM_RESTORE', 'System Restore', '系统恢复', '执行系统恢复操作', 'SYSTEM', 'RESTORE', 'SYSTEM', 'SYSTEM_MANAGEMENT', 'CRITICAL', TRUE, TRUE),
('SYSTEM_MAINTENANCE', 'System Maintenance', '系统维护', '执行系统维护操作', 'SYSTEM', 'MAINTENANCE', 'SYSTEM', 'SYSTEM_MANAGEMENT', 'HIGH', TRUE, TRUE),

-- 审计日志权限
('AUDIT_LOG_READ', 'Read Audit Log', '查看审计日志', '查看系统审计日志', 'AUDIT_LOG', 'READ', 'SYSTEM', 'AUDIT_MANAGEMENT', 'HIGH', TRUE, FALSE),
('AUDIT_LOG_EXPORT', 'Export Audit Log', '导出审计日志', '导出审计日志数据', 'AUDIT_LOG', 'EXPORT', 'SYSTEM', 'AUDIT_MANAGEMENT', 'HIGH', TRUE, TRUE),
('AUDIT_LOG_DELETE', 'Delete Audit Log', '删除审计日志', '删除历史审计日志', 'AUDIT_LOG', 'DELETE', 'SYSTEM', 'AUDIT_MANAGEMENT', 'CRITICAL', TRUE, TRUE),

-- 企业管理权限
('ENTERPRISE_CREATE', 'Create Enterprise', '创建企业', '创建新企业', 'ENTERPRISE', 'CREATE', 'SYSTEM', 'ENTERPRISE_MANAGEMENT', 'HIGH', TRUE, TRUE),
('ENTERPRISE_READ', 'Read Enterprise', '查看企业', '查看企业信息', 'ENTERPRISE', 'READ', 'SYSTEM', 'ENTERPRISE_MANAGEMENT', 'LOW', TRUE, FALSE),
('ENTERPRISE_UPDATE', 'Update Enterprise', '更新企业', '修改企业信息', 'ENTERPRISE', 'UPDATE', 'BUSINESS', 'ENTERPRISE_MANAGEMENT', 'MEDIUM', TRUE, FALSE),
('ENTERPRISE_DELETE', 'Delete Enterprise', '删除企业', '删除企业', 'ENTERPRISE', 'DELETE', 'SYSTEM', 'ENTERPRISE_MANAGEMENT', 'CRITICAL', TRUE, TRUE),
('ENTERPRISE_CONFIG', 'Enterprise Config', '企业配置', '管理企业配置信息', 'ENTERPRISE', 'CONFIG', 'BUSINESS', 'ENTERPRISE_MANAGEMENT', 'HIGH', TRUE, FALSE);
'DATA_ACCESS', 'HIGH', TRUE, TRUE),

-- 报表权限
('REPORT_CREATE', 'Create Report', '创建报表', '创建业务报表', 'REPORT', 'CREATE', 'BUSINESS', 'REPORT_MANAGEMENT', 'MEDIUM', TRUE, FALSE),
('REPORT_READ', 'Read Report', '查看报表', '查看业务报表', 'REPORT', 'READ', 'BUSINESS', 'REPORT_MANAGEMENT', 'LOW', TRUE, FALSE),
('REPORT_UPDATE', 'Update Report', '更新报表', '修改报表配置', 'REPORT', 'UPDATE', 'BUSINESS', 'REPORT_MANAGEMENT', 'MEDIUM', TRUE, FALSE),
('REPORT_DELETE', 'Delete Report', '删除报表', '删除报表', 'REPORT', 'DELETE', 'BUSINESS', 'REPORT_MANAGEMENT', 'HIGH', TRUE, FALSE),
('REPORT_EXPORT', 'Export Report', '导出报表', '导出报表数据', 'REPORT', 'EXPORT', 'BUSINESS', 'REPORT_MANAGEMENT', 'MEDIUM', TRUE, FALSE),

-- 部门管理权限
('DEPARTMENT_CREATE', 'Create Department', '创建部门', '创建新部门', 'DEPARTMENT', 'CREATE', 'BUSINESS', 'DEPARTMENT_MANAGEMENT', 'MEDIUM', TRUE, FALSE),
('DEPARTMENT_READ', 'Read Department', '查看部门', '查看部门信息', 'DEPARTMENT', 'READ', 'BUSINESS', 'DEPARTMENT_MANAGEMENT', 'LOW', TRUE, FALSE),
('DEPARTMENT_UPDATE', 'Update Department', '更新部门', '修改部门信息', 'DEPARTMENT', 'UPDATE', 'BUSINESS', 'DEPARTMENT_MANAGEMENT', 'MEDIUM', TRUE, FALSE),
('DEPARTMENT_DELETE', 'Delete Department', '删除部门', '删除部门', 'DEPARTMENT', 'DELETE', 'BUSINESS', 'DEPARTMENT_MANAGEMENT', 'HIGH', TRUE, TRUE),
('DEPARTMENT_ASSIGN_USER', 'Assign Department User', '分配部门用户', '为部门分配用户', 'DEPARTMENT', 'ASSIGN_USER', 'BUSINESS', 'DEPARTMENT_MANAGEMENT', 'MEDIUM', TRUE, FALSE),

-- API访问权限
('API_ACCESS_READ', 'API Read Access', 'API读取访问', '通过API读取数据', 'API', 'ACCESS_READ', 'SYSTEM', 'API_ACCESS', 'LOW', TRUE, FALSE),
('API_ACCESS_WRITE', 'API Write Access', 'API写入访问', '通过API写入数据', 'API', 'ACCESS_WRITE', 'SYSTEM', 'API_ACCESS', 'MEDIUM', TRUE, FALSE),
('API_ACCESS_DELETE', 'API Delete Access', 'API删除访问', '通过API删除数据', 'API', 'ACCESS_DELETE', 'SYSTEM', 'API_ACCESS', 'HIGH', TRUE, TRUE),
('API_KEY_MANAGE', 'Manage API Keys', '管理API密钥', '创建和管理API访问密钥', 'API', 'KEY_MANAGE', 'SYSTEM', 'API_ACCESS', 'HIGH', TRUE, TRUE),

-- UI界面权限
('UI_DASHBOARD', 'Dashboard Access', '仪表盘访问', '访问系统仪表盘', 'UI', 'DASHBOARD', 'UI', 'UI_ACCESS', 'LOW', TRUE, FALSE),
('UI_USER_MANAGEMENT', 'User Management UI', '用户管理界面', '访问用户管理界面', 'UI', 'USER_MANAGEMENT', 'UI', 'UI_ACCESS', 'MEDIUM', TRUE, FALSE),
('UI_ROLE_MANAGEMENT', 'Role Management UI', '角色管理界面', '访问角色管理界面', 'UI', 'ROLE_MANAGEMENT', 'UI', 'UI_ACCESS', 'HIGH', TRUE, FALSE),
('UI_SYSTEM_SETTINGS', 'System Settings UI', '系统设置界面', '访问系统设置界面', 'UI', 'SYSTEM_SETTINGS', 'UI', 'UI_ACCESS', 'HIGH', TRUE, FALSE),
('UI_AUDIT_LOGS', 'Audit Logs UI', '审计日志界面', '访问审计日志界面', 'UI', 'AUDIT_LOGS', 'UI', 'UI_ACCESS', 'MEDIUM', TRUE, FALSE);
