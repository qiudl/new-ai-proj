-- 050_comprehensive_permissions_data.sql
-- 权限系统基础数据初始化
-- 任务 #623: 创建权限系统基础数据初始化
-- 执行时间：预计 30-60 秒（包含大量权限数据插入）

-- ==============================================================================
-- 1. 清空现有权限数据（如果需要重新初始化）
-- ==============================================================================

-- 暂时禁用外键约束检查
SET session_replication_role = replica;

-- 清空角色权限关联（保留数据完整性）
DELETE FROM role_permissions WHERE permission_id IN (
    SELECT id FROM permissions WHERE is_system = TRUE
);

-- 清空现有系统权限（保留自定义权限）
DELETE FROM permissions WHERE is_system = TRUE;

-- 恢复外键约束检查
SET session_replication_role = DEFAULT;

-- ==============================================================================
-- 2. 权限代码规范定义
-- ==============================================================================

-- 权限代码规范：{模块}_{资源}_{操作}_{范围(可选)}
-- 示例：
-- - SYSTEM_USER_CREATE：系统用户创建权限
-- - PROJECT_TASK_UPDATE_OWN：项目任务更新（仅限自己）
-- - FINANCE_BUDGET_READ_COMPANY：财务预算查看（公司级别）

-- ==============================================================================
-- 3. 核心模块权限数据初始化
-- ==============================================================================

-- 权限数据按模块组织，包含：
-- 1. 系统管理模块 (SYSTEM_*)
-- 2. 企业管理模块 (ENTERPRISE_*)
-- 3. 项目管理模块 (PROJECT_*)
-- 4. 任务管理模块 (TASK_*)
-- 5. 财务管理模块 (FINANCE_*)
-- 6. 用户管理模块 (USER_*)
-- 7. 角色管理模块 (ROLE_*)
-- 8. 数据管理模块 (DATA_*)
-- 9. API访问模块 (API_*)
-- 10. 界面访问模块 (UI_*)

INSERT INTO permissions (
    code, name, display_name, description, resource, action, 
    resource_type, category, risk_level, is_system, requires_approval, sort_order
) VALUES 

-- ==============================================================================
-- 系统管理模块权限 (SYSTEM_*)
-- ==============================================================================
('SYSTEM_CONFIG_READ', 'Read System Config', '系统配置查看', '查看系统全局配置信息', 'SYSTEM_CONFIG', 'READ', 'SYSTEM', 'SYSTEM_MANAGEMENT', 'MEDIUM', TRUE, FALSE, 100),
('SYSTEM_CONFIG_UPDATE', 'Update System Config', '系统配置修改', '修改系统全局配置', 'SYSTEM_CONFIG', 'UPDATE', 'SYSTEM', 'SYSTEM_MANAGEMENT', 'CRITICAL', TRUE, TRUE, 101),
('SYSTEM_BACKUP_CREATE', 'Create System Backup', '系统备份创建', '创建系统数据备份', 'SYSTEM', 'BACKUP_CREATE', 'SYSTEM', 'SYSTEM_MANAGEMENT', 'HIGH', TRUE, FALSE, 102),
('SYSTEM_BACKUP_RESTORE', 'Restore System Backup', '系统备份恢复', '从备份恢复系统数据', 'SYSTEM', 'BACKUP_RESTORE', 'SYSTEM', 'SYSTEM_MANAGEMENT', 'CRITICAL', TRUE, TRUE, 103),
('SYSTEM_MAINTENANCE_MODE', 'System Maintenance Mode', '系统维护模式', '启用/禁用系统维护模式', 'SYSTEM', 'MAINTENANCE', 'SYSTEM', 'SYSTEM_MANAGEMENT', 'HIGH', TRUE, TRUE, 104),
('SYSTEM_LOG_READ', 'Read System Logs', '系统日志查看', '查看系统操作日志', 'SYSTEM_LOG', 'READ', 'SYSTEM', 'SYSTEM_MANAGEMENT', 'MEDIUM', TRUE, FALSE, 105),
('SYSTEM_LOG_EXPORT', 'Export System Logs', '系统日志导出', '导出系统日志文件', 'SYSTEM_LOG', 'EXPORT', 'SYSTEM', 'SYSTEM_MANAGEMENT', 'HIGH', TRUE, TRUE, 106),
('SYSTEM_MONITOR_READ', 'Read System Monitoring', '系统监控查看', '查看系统性能监控信息', 'SYSTEM_MONITOR', 'READ', 'SYSTEM', 'SYSTEM_MANAGEMENT', 'LOW', TRUE, FALSE, 107),
('SYSTEM_ALERT_MANAGE', 'Manage System Alerts', '系统告警管理', '管理系统告警配置', 'SYSTEM_ALERT', 'MANAGE', 'SYSTEM', 'SYSTEM_MANAGEMENT', 'MEDIUM', TRUE, FALSE, 108),

-- ==============================================================================
-- 企业管理模块权限 (ENTERPRISE_*)
-- ==============================================================================
('ENTERPRISE_CREATE', 'Create Enterprise', '企业创建', '创建新企业/组织', 'ENTERPRISE', 'CREATE', 'BUSINESS', 'ENTERPRISE_MANAGEMENT', 'HIGH', TRUE, TRUE, 200),
('ENTERPRISE_READ', 'Read Enterprise', '企业信息查看', '查看企业基本信息', 'ENTERPRISE', 'READ', 'BUSINESS', 'ENTERPRISE_MANAGEMENT', 'LOW', TRUE, FALSE, 201),
('ENTERPRISE_UPDATE', 'Update Enterprise', '企业信息修改', '修改企业基本信息', 'ENTERPRISE', 'UPDATE', 'BUSINESS', 'ENTERPRISE_MANAGEMENT', 'MEDIUM', TRUE, FALSE, 202),
('ENTERPRISE_DELETE', 'Delete Enterprise', '企业删除', '删除企业/组织', 'ENTERPRISE', 'DELETE', 'BUSINESS', 'ENTERPRISE_MANAGEMENT', 'CRITICAL', TRUE, TRUE, 203),
('ENTERPRISE_CONFIG_MANAGE', 'Manage Enterprise Config', '企业配置管理', '管理企业级配置选项', 'ENTERPRISE_CONFIG', 'MANAGE', 'BUSINESS', 'ENTERPRISE_MANAGEMENT', 'HIGH', TRUE, FALSE, 204),
('ENTERPRISE_MEMBER_ADD', 'Add Enterprise Member', '企业成员添加', '添加新的企业成员', 'ENTERPRISE_MEMBER', 'ADD', 'BUSINESS', 'ENTERPRISE_MANAGEMENT', 'MEDIUM', TRUE, FALSE, 205),
('ENTERPRISE_MEMBER_REMOVE', 'Remove Enterprise Member', '企业成员移除', '移除企业成员', 'ENTERPRISE_MEMBER', 'REMOVE', 'BUSINESS', 'ENTERPRISE_MANAGEMENT', 'HIGH', TRUE, TRUE, 206),
('ENTERPRISE_MEMBER_READ', 'Read Enterprise Members', '企业成员查看', '查看企业成员列表', 'ENTERPRISE_MEMBER', 'READ', 'BUSINESS', 'ENTERPRISE_MANAGEMENT', 'LOW', TRUE, FALSE, 207),
('ENTERPRISE_STRUCTURE_MANAGE', 'Manage Enterprise Structure', '企业架构管理', '管理企业组织架构', 'ENTERPRISE_STRUCTURE', 'MANAGE', 'BUSINESS', 'ENTERPRISE_MANAGEMENT', 'MEDIUM', TRUE, FALSE, 208),

-- ==============================================================================
-- 项目管理模块权限 (PROJECT_*)
-- ==============================================================================
('PROJECT_CREATE', 'Create Project', '项目创建', '创建新项目', 'PROJECT', 'CREATE', 'BUSINESS', 'PROJECT_MANAGEMENT', 'MEDIUM', TRUE, FALSE, 300),
('PROJECT_READ', 'Read Project', '项目查看', '查看项目信息', 'PROJECT', 'READ', 'BUSINESS', 'PROJECT_MANAGEMENT', 'LOW', TRUE, FALSE, 301),
('PROJECT_UPDATE', 'Update Project', '项目修改', '修改项目基本信息', 'PROJECT', 'UPDATE', 'BUSINESS', 'PROJECT_MANAGEMENT', 'MEDIUM', TRUE, FALSE, 302),
('PROJECT_DELETE', 'Delete Project', '项目删除', '删除项目', 'PROJECT', 'DELETE', 'BUSINESS', 'PROJECT_MANAGEMENT', 'HIGH', TRUE, TRUE, 303),
('PROJECT_ARCHIVE', 'Archive Project', '项目归档', '归档已完成的项目', 'PROJECT', 'ARCHIVE', 'BUSINESS', 'PROJECT_MANAGEMENT', 'MEDIUM', TRUE, FALSE, 304),
('PROJECT_RESTORE', 'Restore Project', '项目恢复', '从归档状态恢复项目', 'PROJECT', 'RESTORE', 'BUSINESS', 'PROJECT_MANAGEMENT', 'MEDIUM', TRUE, FALSE, 305),
('PROJECT_MEMBER_ADD', 'Add Project Member', '项目成员添加', '添加项目成员', 'PROJECT_MEMBER', 'ADD', 'BUSINESS', 'PROJECT_MANAGEMENT', 'MEDIUM', TRUE, FALSE, 306),
('PROJECT_MEMBER_REMOVE', 'Remove Project Member', '项目成员移除', '移除项目成员', 'PROJECT_MEMBER', 'REMOVE', 'BUSINESS', 'PROJECT_MANAGEMENT', 'MEDIUM', TRUE, FALSE, 307),
('PROJECT_MEMBER_READ', 'Read Project Members', '项目成员查看', '查看项目成员列表', 'PROJECT_MEMBER', 'READ', 'BUSINESS', 'PROJECT_MANAGEMENT', 'LOW', TRUE, FALSE, 308),
('PROJECT_MILESTONE_MANAGE', 'Manage Project Milestones', '项目里程碑管理', '管理项目里程碑', 'PROJECT_MILESTONE', 'MANAGE', 'BUSINESS', 'PROJECT_MANAGEMENT', 'MEDIUM', TRUE, FALSE, 309),
('PROJECT_GANTT_READ', 'Read Project Gantt', '甘特图查看', '查看项目甘特图', 'PROJECT_GANTT', 'READ', 'BUSINESS', 'PROJECT_MANAGEMENT', 'LOW', TRUE, FALSE, 310),
('PROJECT_RESOURCE_MANAGE', 'Manage Project Resources', '项目资源管理', '管理项目资源分配', 'PROJECT_RESOURCE', 'MANAGE', 'BUSINESS', 'PROJECT_MANAGEMENT', 'MEDIUM', TRUE, FALSE, 311),

-- ==============================================================================
-- 任务管理模块权限 (TASK_*)
-- ==============================================================================
('TASK_CREATE', 'Create Task', '任务创建', '创建新任务', 'TASK', 'CREATE', 'BUSINESS', 'TASK_MANAGEMENT', 'LOW', TRUE, FALSE, 400),
('TASK_READ', 'Read Task', '任务查看', '查看任务详细信息', 'TASK', 'READ', 'BUSINESS', 'TASK_MANAGEMENT', 'LOW', TRUE, FALSE, 401),
('TASK_UPDATE', 'Update Task', '任务修改', '修改任务信息', 'TASK', 'UPDATE', 'BUSINESS', 'TASK_MANAGEMENT', 'LOW', TRUE, FALSE, 402),
('TASK_DELETE', 'Delete Task', '任务删除', '删除任务', 'TASK', 'DELETE', 'BUSINESS', 'TASK_MANAGEMENT', 'MEDIUM', TRUE, FALSE, 403),
('TASK_ASSIGN', 'Assign Task', '任务分配', '分配任务给用户', 'TASK', 'ASSIGN', 'BUSINESS', 'TASK_MANAGEMENT', 'LOW', TRUE, FALSE, 404),
('TASK_STATUS_UPDATE', 'Update Task Status', '任务状态更新', '更新任务状态', 'TASK_STATUS', 'UPDATE', 'BUSINESS', 'TASK_MANAGEMENT', 'LOW', TRUE, FALSE, 405),
('TASK_PRIORITY_UPDATE', 'Update Task Priority', '任务优先级设置', '设置任务优先级', 'TASK_PRIORITY', 'UPDATE', 'BUSINESS', 'TASK_MANAGEMENT', 'LOW', TRUE, FALSE, 406),
('TASK_COMMENT_CREATE', 'Create Task Comment', '任务评论添加', '为任务添加评论', 'TASK_COMMENT', 'CREATE', 'BUSINESS', 'TASK_MANAGEMENT', 'LOW', TRUE, FALSE, 407),
('TASK_COMMENT_READ', 'Read Task Comments', '任务评论查看', '查看任务评论', 'TASK_COMMENT', 'READ', 'BUSINESS', 'TASK_MANAGEMENT', 'LOW', TRUE, FALSE, 408),
('TASK_ATTACHMENT_UPLOAD', 'Upload Task Attachment', '任务附件上传', '上传任务附件', 'TASK_ATTACHMENT', 'UPLOAD', 'BUSINESS', 'TASK_MANAGEMENT', 'LOW', TRUE, FALSE, 409),
('TASK_TIME_LOG', 'Log Task Time', '任务工时记录', '记录任务工作时间', 'TASK_TIME', 'LOG', 'BUSINESS', 'TASK_MANAGEMENT', 'LOW', TRUE, FALSE, 410),
('TASK_SUBTASK_CREATE', 'Create Subtask', '子任务创建', '创建子任务', 'SUBTASK', 'CREATE', 'BUSINESS', 'TASK_MANAGEMENT', 'LOW', TRUE, FALSE, 411),
('TASK_BATCH_OPERATION', 'Task Batch Operations', '任务批量操作', '执行任务批量操作', 'TASK', 'BATCH_OPERATION', 'BUSINESS', 'TASK_MANAGEMENT', 'MEDIUM', TRUE, FALSE, 412),

-- ==============================================================================
-- 财务管理模块权限 (FINANCE_*)
-- ==============================================================================
('FINANCE_BUDGET_READ', 'Read Budget', '预算查看', '查看项目/企业预算信息', 'BUDGET', 'READ', 'BUSINESS', 'FINANCE_MANAGEMENT', 'MEDIUM', TRUE, FALSE, 500),
('FINANCE_BUDGET_CREATE', 'Create Budget', '预算创建', '创建预算计划', 'BUDGET', 'CREATE', 'BUSINESS', 'FINANCE_MANAGEMENT', 'HIGH', TRUE, TRUE, 501),
('FINANCE_BUDGET_UPDATE', 'Update Budget', '预算修改', '修改预算信息', 'BUDGET', 'UPDATE', 'BUSINESS', 'FINANCE_MANAGEMENT', 'HIGH', TRUE, TRUE, 502),
('FINANCE_BUDGET_DELETE', 'Delete Budget', '预算删除', '删除预算记录', 'BUDGET', 'DELETE', 'BUSINESS', 'FINANCE_MANAGEMENT', 'HIGH', TRUE, TRUE, 503),
('FINANCE_EXPENSE_READ', 'Read Expenses', '费用查看', '查看费用记录', 'EXPENSE', 'READ', 'BUSINESS', 'FINANCE_MANAGEMENT', 'MEDIUM', TRUE, FALSE, 504),
('FINANCE_EXPENSE_CREATE', 'Create Expense', '费用创建', '创建费用记录', 'EXPENSE', 'CREATE', 'BUSINESS', 'FINANCE_MANAGEMENT', 'MEDIUM', TRUE, FALSE, 505),
('FINANCE_EXPENSE_APPROVE', 'Approve Expense', '费用审批', '审批费用申请', 'EXPENSE', 'APPROVE', 'BUSINESS', 'FINANCE_MANAGEMENT', 'HIGH', TRUE, TRUE, 506),
('FINANCE_INVOICE_READ', 'Read Invoices', '发票查看', '查看发票信息', 'INVOICE', 'READ', 'BUSINESS', 'FINANCE_MANAGEMENT', 'MEDIUM', TRUE, FALSE, 507),
('FINANCE_INVOICE_CREATE', 'Create Invoice', '发票创建', '创建发票', 'INVOICE', 'CREATE', 'BUSINESS', 'FINANCE_MANAGEMENT', 'MEDIUM', TRUE, FALSE, 508),
('FINANCE_PAYMENT_READ', 'Read Payments', '付款查看', '查看付款记录', 'PAYMENT', 'READ', 'BUSINESS', 'FINANCE_MANAGEMENT', 'MEDIUM', TRUE, FALSE, 509),
('FINANCE_PAYMENT_CREATE', 'Create Payment', '付款创建', '创建付款记录', 'PAYMENT', 'CREATE', 'BUSINESS', 'FINANCE_MANAGEMENT', 'HIGH', TRUE, TRUE, 510),
('FINANCE_REPORT_READ', 'Read Financial Reports', '财务报表查看', '查看财务报表', 'FINANCE_REPORT', 'READ', 'BUSINESS', 'FINANCE_MANAGEMENT', 'HIGH', TRUE, FALSE, 511),
('FINANCE_REPORT_EXPORT', 'Export Financial Reports', '财务报表导出', '导出财务报表', 'FINANCE_REPORT', 'EXPORT', 'BUSINESS', 'FINANCE_MANAGEMENT', 'HIGH', TRUE, TRUE, 512),
('FINANCE_AUDIT_READ', 'Read Financial Audit', '财务审计查看', '查看财务审计信息', 'FINANCE_AUDIT', 'READ', 'BUSINESS', 'FINANCE_MANAGEMENT', 'HIGH', TRUE, FALSE, 513),

-- ==============================================================================
-- 用户管理模块权限 (USER_*)
-- ==============================================================================
('USER_CREATE', 'Create User', '用户创建', '创建新用户账户', 'USER', 'CREATE', 'SYSTEM', 'USER_MANAGEMENT', 'HIGH', TRUE, TRUE, 600),
('USER_READ', 'Read User', '用户查看', '查看用户基本信息', 'USER', 'READ', 'SYSTEM', 'USER_MANAGEMENT', 'LOW', TRUE, FALSE, 601),
('USER_UPDATE', 'Update User', '用户修改', '修改用户信息', 'USER', 'UPDATE', 'SYSTEM', 'USER_MANAGEMENT', 'MEDIUM', TRUE, FALSE, 602),
('USER_DELETE', 'Delete User', '用户删除', '删除用户账户', 'USER', 'DELETE', 'SYSTEM', 'USER_MANAGEMENT', 'CRITICAL', TRUE, TRUE, 603),
('USER_PASSWORD_RESET', 'Reset User Password', '密码重置', '重置用户密码', 'USER_PASSWORD', 'RESET', 'SYSTEM', 'USER_MANAGEMENT', 'HIGH', TRUE, TRUE, 604),
('USER_LOCK', 'Lock User Account', '用户锁定', '锁定用户账户', 'USER_ACCOUNT', 'LOCK', 'SYSTEM', 'USER_MANAGEMENT', 'HIGH', TRUE, FALSE, 605),
('USER_UNLOCK', 'Unlock User Account', '用户解锁', '解锁用户账户', 'USER_ACCOUNT', 'UNLOCK', 'SYSTEM', 'USER_MANAGEMENT', 'MEDIUM', TRUE, FALSE, 606),
('USER_PROFILE_READ', 'Read User Profile', '用户资料查看', '查看用户详细资料', 'USER_PROFILE', 'READ', 'SYSTEM', 'USER_MANAGEMENT', 'LOW', TRUE, FALSE, 607),
('USER_PROFILE_UPDATE', 'Update User Profile', '用户资料修改', '修改用户详细资料', 'USER_PROFILE', 'UPDATE', 'SYSTEM', 'USER_MANAGEMENT', 'MEDIUM', TRUE, FALSE, 608),
('USER_SESSION_MANAGE', 'Manage User Sessions', '用户会话管理', '管理用户登录会话', 'USER_SESSION', 'MANAGE', 'SYSTEM', 'USER_MANAGEMENT', 'MEDIUM', TRUE, FALSE, 609),

-- ==============================================================================
-- 角色管理模块权限 (ROLE_*)
-- ==============================================================================
('ROLE_CREATE', 'Create Role', '角色创建', '创建新角色', 'ROLE', 'CREATE', 'SYSTEM', 'ROLE_MANAGEMENT', 'HIGH', TRUE, TRUE, 700),
('ROLE_READ', 'Read Role', '角色查看', '查看角色信息', 'ROLE', 'READ', 'SYSTEM', 'ROLE_MANAGEMENT', 'LOW', TRUE, FALSE, 701),
('ROLE_UPDATE', 'Update Role', '角色修改', '修改角色信息', 'ROLE', 'UPDATE', 'SYSTEM', 'ROLE_MANAGEMENT', 'HIGH', TRUE, TRUE, 702),
('ROLE_DELETE', 'Delete Role', '角色删除', '删除角色', 'ROLE', 'DELETE', 'SYSTEM', 'ROLE_MANAGEMENT', 'CRITICAL', TRUE, TRUE, 703),
('ROLE_PERMISSION_ASSIGN', 'Assign Role Permissions', '角色权限分配', '为角色分配权限', 'ROLE_PERMISSION', 'ASSIGN', 'SYSTEM', 'ROLE_MANAGEMENT', 'HIGH', TRUE, TRUE, 704),
('ROLE_PERMISSION_REVOKE', 'Revoke Role Permissions', '角色权限撤销', '撤销角色权限', 'ROLE_PERMISSION', 'REVOKE', 'SYSTEM', 'ROLE_MANAGEMENT', 'HIGH', TRUE, TRUE, 705),
('ROLE_USER_ASSIGN', 'Assign User Role', '用户角色分配', '为用户分配角色', 'USER_ROLE', 'ASSIGN', 'SYSTEM', 'ROLE_MANAGEMENT', 'HIGH', TRUE, FALSE, 706),
('ROLE_USER_REVOKE', 'Revoke User Role', '用户角色撤销', '撤销用户角色', 'USER_ROLE', 'REVOKE', 'SYSTEM', 'ROLE_MANAGEMENT', 'HIGH', TRUE, FALSE, 707),
('ROLE_HIERARCHY_MANAGE', 'Manage Role Hierarchy', '角色层级管理', '管理角色继承关系', 'ROLE_HIERARCHY', 'MANAGE', 'SYSTEM', 'ROLE_MANAGEMENT', 'CRITICAL', TRUE, TRUE, 708),

-- ==============================================================================
-- 权限管理模块权限 (PERMISSION_*)
-- ==============================================================================
('PERMISSION_CREATE', 'Create Permission', '权限创建', '创建新权限', 'PERMISSION', 'CREATE', 'SYSTEM', 'PERMISSION_MANAGEMENT', 'CRITICAL', TRUE, TRUE, 800),
('PERMISSION_READ', 'Read Permission', '权限查看', '查看权限信息', 'PERMISSION', 'READ', 'SYSTEM', 'PERMISSION_MANAGEMENT', 'LOW', TRUE, FALSE, 801),
('PERMISSION_UPDATE', 'Update Permission', '权限修改', '修改权限信息', 'PERMISSION', 'UPDATE', 'SYSTEM', 'PERMISSION_MANAGEMENT', 'CRITICAL', TRUE, TRUE, 802),
('PERMISSION_DELETE', 'Delete Permission', '权限删除', '删除权限', 'PERMISSION', 'DELETE', 'SYSTEM', 'PERMISSION_MANAGEMENT', 'CRITICAL', TRUE, TRUE, 803),

-- ==============================================================================
-- 数据管理模块权限 (DATA_*)
-- ==============================================================================
('DATA_READ_PUBLIC', 'Read Public Data', '公共数据查看', '查看公共数据', 'PUBLIC_DATA', 'READ', 'DATA', 'DATA_MANAGEMENT', 'LOW', TRUE, FALSE, 900),
('DATA_READ_INTERNAL', 'Read Internal Data', '内部数据查看', '查看内部数据', 'INTERNAL_DATA', 'READ', 'DATA', 'DATA_MANAGEMENT', 'MEDIUM', TRUE, FALSE, 901),
('DATA_READ_CONFIDENTIAL', 'Read Confidential Data', '机密数据查看', '查看机密级数据', 'CONFIDENTIAL_DATA', 'READ', 'DATA', 'DATA_MANAGEMENT', 'HIGH', TRUE, TRUE, 902),
('DATA_EXPORT', 'Export Data', '数据导出', '导出系统数据', 'DATA', 'EXPORT', 'DATA', 'DATA_MANAGEMENT', 'HIGH', TRUE, TRUE, 903),
('DATA_IMPORT', 'Import Data', '数据导入', '导入外部数据', 'DATA', 'IMPORT', 'DATA', 'DATA_MANAGEMENT', 'HIGH', TRUE, TRUE, 904),
('DATA_BACKUP', 'Backup Data', '数据备份', '创建数据备份', 'DATA', 'BACKUP', 'DATA', 'DATA_MANAGEMENT', 'MEDIUM', TRUE, FALSE, 905),
('DATA_RESTORE', 'Restore Data', '数据恢复', '从备份恢复数据', 'DATA', 'RESTORE', 'DATA', 'DATA_MANAGEMENT', 'CRITICAL', TRUE, TRUE, 906),

-- ==============================================================================
-- API访问模块权限 (API_*)
-- ==============================================================================
('API_READ', 'API Read Access', 'API读取访问', '通过API读取数据', 'API', 'READ', 'SYSTEM', 'API_ACCESS', 'LOW', TRUE, FALSE, 1000),
('API_WRITE', 'API Write Access', 'API写入访问', '通过API写入数据', 'API', 'WRITE', 'SYSTEM', 'API_ACCESS', 'MEDIUM', TRUE, FALSE, 1001),
('API_DELETE', 'API Delete Access', 'API删除访问', '通过API删除数据', 'API', 'DELETE', 'SYSTEM', 'API_ACCESS', 'HIGH', TRUE, TRUE, 1002),
('API_ADMIN', 'API Admin Access', 'API管理员访问', '完整API管理权限', 'API', 'ADMIN', 'SYSTEM', 'API_ACCESS', 'CRITICAL', TRUE, TRUE, 1003),
('API_KEY_CREATE', 'Create API Key', 'API密钥创建', '创建API访问密钥', 'API_KEY', 'CREATE', 'SYSTEM', 'API_ACCESS', 'HIGH', TRUE, TRUE, 1004),
('API_KEY_READ', 'Read API Keys', 'API密钥查看', '查看API密钥信息', 'API_KEY', 'READ', 'SYSTEM', 'API_ACCESS', 'MEDIUM', TRUE, FALSE, 1005),
('API_KEY_UPDATE', 'Update API Key', 'API密钥更新', '更新API密钥信息', 'API_KEY', 'UPDATE', 'SYSTEM', 'API_ACCESS', 'HIGH', TRUE, FALSE, 1006),
('API_KEY_DELETE', 'Delete API Key', 'API密钥删除', '删除API密钥', 'API_KEY', 'DELETE', 'SYSTEM', 'API_ACCESS', 'HIGH', TRUE, TRUE, 1007),

-- ==============================================================================
-- 界面访问模块权限 (UI_*)
-- ==============================================================================
('UI_DASHBOARD', 'Dashboard Access', '仪表盘访问', '访问系统仪表盘', 'UI_DASHBOARD', 'ACCESS', 'UI', 'UI_ACCESS', 'LOW', TRUE, FALSE, 1100),
('UI_USER_MANAGEMENT', 'User Management UI', '用户管理界面', '访问用户管理界面', 'UI_USER_MGMT', 'ACCESS', 'UI', 'UI_ACCESS', 'MEDIUM', TRUE, FALSE, 1101),
('UI_ROLE_MANAGEMENT', 'Role Management UI', '角色管理界面', '访问角色管理界面', 'UI_ROLE_MGMT', 'ACCESS', 'UI', 'UI_ACCESS', 'HIGH', TRUE, FALSE, 1102),
('UI_PROJECT_MANAGEMENT', 'Project Management UI', '项目管理界面', '访问项目管理界面', 'UI_PROJECT_MGMT', 'ACCESS', 'UI', 'UI_ACCESS', 'LOW', TRUE, FALSE, 1103),
('UI_TASK_MANAGEMENT', 'Task Management UI', '任务管理界面', '访问任务管理界面', 'UI_TASK_MGMT', 'ACCESS', 'UI', 'UI_ACCESS', 'LOW', TRUE, FALSE, 1104),
('UI_FINANCE_MANAGEMENT', 'Finance Management UI', '财务管理界面', '访问财务管理界面', 'UI_FINANCE_MGMT', 'ACCESS', 'UI', 'UI_ACCESS', 'MEDIUM', TRUE, FALSE, 1105),
('UI_SYSTEM_SETTINGS', 'System Settings UI', '系统设置界面', '访问系统设置界面', 'UI_SYSTEM_SETTINGS', 'ACCESS', 'UI', 'UI_ACCESS', 'HIGH', TRUE, FALSE, 1106),
('UI_REPORTS', 'Reports UI', '报表界面', '访问报表界面', 'UI_REPORTS', 'ACCESS', 'UI', 'UI_ACCESS', 'LOW', TRUE, FALSE, 1107),
('UI_ANALYTICS', 'Analytics UI', '数据分析界面', '访问数据分析界面', 'UI_ANALYTICS', 'ACCESS', 'UI', 'UI_ACCESS', 'MEDIUM', TRUE, FALSE, 1108),

-- ==============================================================================
-- 审计管理模块权限 (AUDIT_*)
-- ==============================================================================
('AUDIT_LOG_READ', 'Read Audit Logs', '审计日志查看', '查看系统审计日志', 'AUDIT_LOG', 'READ', 'SYSTEM', 'AUDIT_MANAGEMENT', 'HIGH', TRUE, FALSE, 1200),
('AUDIT_LOG_EXPORT', 'Export Audit Logs', '审计日志导出', '导出审计日志数据', 'AUDIT_LOG', 'EXPORT', 'SYSTEM', 'AUDIT_MANAGEMENT', 'HIGH', TRUE, TRUE, 1201),
('AUDIT_LOG_DELETE', 'Delete Audit Logs', '审计日志删除', '删除历史审计日志', 'AUDIT_LOG', 'DELETE', 'SYSTEM', 'AUDIT_MANAGEMENT', 'CRITICAL', TRUE, TRUE, 1202),
('AUDIT_CONFIG_MANAGE', 'Manage Audit Configuration', '审计配置管理', '管理审计规则配置', 'AUDIT_CONFIG', 'MANAGE', 'SYSTEM', 'AUDIT_MANAGEMENT', 'HIGH', TRUE, TRUE, 1203),

-- ==============================================================================
-- 文档管理模块权限 (DOCUMENT_*)
-- ==============================================================================
('DOCUMENT_CREATE', 'Create Document', '文档创建', '创建新文档', 'DOCUMENT', 'CREATE', 'BUSINESS', 'DOCUMENT_MANAGEMENT', 'LOW', TRUE, FALSE, 1300),
('DOCUMENT_READ', 'Read Document', '文档查看', '查看文档内容', 'DOCUMENT', 'READ', 'BUSINESS', 'DOCUMENT_MANAGEMENT', 'LOW', TRUE, FALSE, 1301),
('DOCUMENT_UPDATE', 'Update Document', '文档修改', '修改文档内容', 'DOCUMENT', 'UPDATE', 'BUSINESS', 'DOCUMENT_MANAGEMENT', 'LOW', TRUE, FALSE, 1302),
('DOCUMENT_DELETE', 'Delete Document', '文档删除', '删除文档', 'DOCUMENT', 'DELETE', 'BUSINESS', 'DOCUMENT_MANAGEMENT', 'MEDIUM', TRUE, FALSE, 1303),
('DOCUMENT_SHARE', 'Share Document', '文档分享', '分享文档给其他用户', 'DOCUMENT', 'SHARE', 'BUSINESS', 'DOCUMENT_MANAGEMENT', 'MEDIUM', TRUE, FALSE, 1304),
('DOCUMENT_VERSION_MANAGE', 'Manage Document Versions', '文档版本管理', '管理文档版本控制', 'DOCUMENT_VERSION', 'MANAGE', 'BUSINESS', 'DOCUMENT_MANAGEMENT', 'MEDIUM', TRUE, FALSE, 1305);

-- ==============================================================================
-- 4. 创建权限操作类型映射表
-- ==============================================================================

-- 为了更好地组织权限，创建操作类型分类
CREATE TABLE IF NOT EXISTS permission_action_types (
    id SERIAL PRIMARY KEY,
    action_code VARCHAR(50) UNIQUE NOT NULL COMMENT '操作代码',
    action_name VARCHAR(100) NOT NULL COMMENT '操作名称',
    action_category VARCHAR(50) NOT NULL COMMENT '操作分类',
    risk_level ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM' COMMENT '风险级别',
    description TEXT COMMENT '操作描述',
    requires_approval BOOLEAN DEFAULT FALSE COMMENT '是否需要审批',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限操作类型表';

-- 插入标准操作类型
INSERT INTO permission_action_types (action_code, action_name, action_category, risk_level, description, requires_approval) VALUES
('CREATE', '创建', 'CRUD', 'MEDIUM', '创建新的资源或记录', FALSE),
('READ', '读取', 'CRUD', 'LOW', '查看和读取资源信息', FALSE),
('UPDATE', '更新', 'CRUD', 'MEDIUM', '修改现有资源', FALSE),
('DELETE', '删除', 'CRUD', 'HIGH', '删除资源或记录', TRUE),
('MANAGE', '管理', 'ADMIN', 'HIGH', '完整管理权限，包含多种操作', TRUE),
('ASSIGN', '分配', 'ADMIN', 'MEDIUM', '分配资源或权限给用户', FALSE),
('REVOKE', '撤销', 'ADMIN', 'MEDIUM', '撤销资源或权限', FALSE),
('APPROVE', '审批', 'WORKFLOW', 'HIGH', '审批业务流程', TRUE),
('EXPORT', '导出', 'DATA', 'MEDIUM', '导出数据到外部系统', TRUE),
('IMPORT', '导入', 'DATA', 'HIGH', '从外部导入数据', TRUE),
('BACKUP', '备份', 'MAINTENANCE', 'MEDIUM', '创建数据备份', FALSE),
('RESTORE', '恢复', 'MAINTENANCE', 'CRITICAL', '从备份恢复数据', TRUE),
('ACCESS', '访问', 'UI', 'LOW', '访问界面或功能', FALSE),
('LOG', '记录', 'TRACKING', 'LOW', '记录操作日志', FALSE),
('UPLOAD', '上传', 'FILE', 'LOW', '上传文件', FALSE),
('DOWNLOAD', '下载', 'FILE', 'LOW', '下载文件', FALSE),
('SHARE', '分享', 'COLLABORATION', 'MEDIUM', '分享资源给其他用户', FALSE),
('LOCK', '锁定', 'SECURITY', 'HIGH', '锁定账户或资源', FALSE),
('UNLOCK', '解锁', 'SECURITY', 'MEDIUM', '解锁账户或资源', FALSE),
('ARCHIVE', '归档', 'LIFECYCLE', 'MEDIUM', '归档资源', FALSE)
ON DUPLICATE KEY UPDATE action_name = VALUES(action_name);

-- ==============================================================================
-- 5. 创建权限资源类型映射表
-- ==============================================================================

CREATE TABLE IF NOT EXISTS permission_resource_types (
    id SERIAL PRIMARY KEY,
    resource_code VARCHAR(50) UNIQUE NOT NULL COMMENT '资源代码',
    resource_name VARCHAR(100) NOT NULL COMMENT '资源名称',
    resource_category VARCHAR(50) NOT NULL COMMENT '资源分类',
    module VARCHAR(50) NOT NULL COMMENT '所属模块',
    description TEXT COMMENT '资源描述',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限资源类型表';

-- 插入标准资源类型
INSERT INTO permission_resource_types (resource_code, resource_name, resource_category, module, description) VALUES
-- 系统资源
('SYSTEM', '系统', 'SYSTEM', 'SYSTEM', '系统级资源'),
('SYSTEM_CONFIG', '系统配置', 'SYSTEM', 'SYSTEM', '系统配置信息'),
('SYSTEM_LOG', '系统日志', 'SYSTEM', 'SYSTEM', '系统操作日志'),
('SYSTEM_MONITOR', '系统监控', 'SYSTEM', 'SYSTEM', '系统监控数据'),
('SYSTEM_ALERT', '系统告警', 'SYSTEM', 'SYSTEM', '系统告警信息'),

-- 用户资源
('USER', '用户', 'USER', 'USER', '用户账户'),
('USER_PROFILE', '用户资料', 'USER', 'USER', '用户详细资料'),
('USER_PASSWORD', '用户密码', 'USER', 'USER', '用户登录密码'),
('USER_ACCOUNT', '用户账户', 'USER', 'USER', '用户账户状态'),
('USER_SESSION', '用户会话', 'USER', 'USER', '用户登录会话'),

-- 角色和权限资源
('ROLE', '角色', 'RBAC', 'ROLE', '用户角色'),
('PERMISSION', '权限', 'RBAC', 'PERMISSION', '系统权限'),
('ROLE_PERMISSION', '角色权限', 'RBAC', 'ROLE', '角色权限关联'),
('USER_ROLE', '用户角色', 'RBAC', 'ROLE', '用户角色关联'),
('ROLE_HIERARCHY', '角色层级', 'RBAC', 'ROLE', '角色继承关系'),

-- 企业资源
('ENTERPRISE', '企业', 'BUSINESS', 'ENTERPRISE', '企业/组织'),
('ENTERPRISE_CONFIG', '企业配置', 'BUSINESS', 'ENTERPRISE', '企业配置信息'),
('ENTERPRISE_MEMBER', '企业成员', 'BUSINESS', 'ENTERPRISE', '企业成员'),
('ENTERPRISE_STRUCTURE', '企业架构', 'BUSINESS', 'ENTERPRISE', '企业组织架构'),

-- 项目资源
('PROJECT', '项目', 'BUSINESS', 'PROJECT', '项目'),
('PROJECT_MEMBER', '项目成员', 'BUSINESS', 'PROJECT', '项目成员'),
('PROJECT_MILESTONE', '项目里程碑', 'BUSINESS', 'PROJECT', '项目里程碑'),
('PROJECT_GANTT', '甘特图', 'BUSINESS', 'PROJECT', '项目甘特图'),
('PROJECT_RESOURCE', '项目资源', 'BUSINESS', 'PROJECT', '项目资源'),

-- 任务资源
('TASK', '任务', 'BUSINESS', 'TASK', '任务'),
('TASK_STATUS', '任务状态', 'BUSINESS', 'TASK', '任务状态'),
('TASK_PRIORITY', '任务优先级', 'BUSINESS', 'TASK', '任务优先级'),
('TASK_COMMENT', '任务评论', 'BUSINESS', 'TASK', '任务评论'),
('TASK_ATTACHMENT', '任务附件', 'BUSINESS', 'TASK', '任务附件'),
('TASK_TIME', '任务工时', 'BUSINESS', 'TASK', '任务工作时间'),
('SUBTASK', '子任务', 'BUSINESS', 'TASK', '子任务'),

-- 财务资源
('BUDGET', '预算', 'FINANCE', 'FINANCE', '预算'),
('EXPENSE', '费用', 'FINANCE', 'FINANCE', '费用'),
('INVOICE', '发票', 'FINANCE', 'FINANCE', '发票'),
('PAYMENT', '付款', 'FINANCE', 'FINANCE', '付款'),
('FINANCE_REPORT', '财务报表', 'FINANCE', 'FINANCE', '财务报表'),
('FINANCE_AUDIT', '财务审计', 'FINANCE', 'FINANCE', '财务审计'),

-- 数据资源
('PUBLIC_DATA', '公共数据', 'DATA', 'DATA', '公共数据'),
('INTERNAL_DATA', '内部数据', 'DATA', 'DATA', '内部数据'),
('CONFIDENTIAL_DATA', '机密数据', 'DATA', 'DATA', '机密数据'),
('DATA', '数据', 'DATA', 'DATA', '通用数据'),

-- API资源
('API', 'API', 'API', 'API', 'API接口'),
('API_KEY', 'API密钥', 'API', 'API', 'API访问密钥'),

-- 界面资源
('UI_DASHBOARD', '仪表盘界面', 'UI', 'UI', '系统仪表盘'),
('UI_USER_MGMT', '用户管理界面', 'UI', 'UI', '用户管理界面'),
('UI_ROLE_MGMT', '角色管理界面', 'UI', 'UI', '角色管理界面'),
('UI_PROJECT_MGMT', '项目管理界面', 'UI', 'UI', '项目管理界面'),
('UI_TASK_MGMT', '任务管理界面', 'UI', 'UI', '任务管理界面'),
('UI_FINANCE_MGMT', '财务管理界面', 'UI', 'UI', '财务管理界面'),
('UI_SYSTEM_SETTINGS', '系统设置界面', 'UI', 'UI', '系统设置界面'),
('UI_REPORTS', '报表界面', 'UI', 'UI', '报表界面'),
('UI_ANALYTICS', '分析界面', 'UI', 'UI', '数据分析界面'),

-- 审计资源
('AUDIT_LOG', '审计日志', 'AUDIT', 'AUDIT', '系统审计日志'),
('AUDIT_CONFIG', '审计配置', 'AUDIT', 'AUDIT', '审计配置'),

-- 文档资源
('DOCUMENT', '文档', 'DOCUMENT', 'DOCUMENT', '文档'),
('DOCUMENT_VERSION', '文档版本', 'DOCUMENT', 'DOCUMENT', '文档版本')
ON DUPLICATE KEY UPDATE resource_name = VALUES(resource_name);

-- ==============================================================================
-- 6. 创建权限统计和监控视图
-- ==============================================================================

-- 权限统计视图
CREATE OR REPLACE VIEW permission_statistics AS
SELECT 
    category,
    resource_type,
    COUNT(*) as permission_count,
    COUNT(CASE WHEN risk_level = 'LOW' THEN 1 END) as low_risk_count,
    COUNT(CASE WHEN risk_level = 'MEDIUM' THEN 1 END) as medium_risk_count,
    COUNT(CASE WHEN risk_level = 'HIGH' THEN 1 END) as high_risk_count,
    COUNT(CASE WHEN risk_level = 'CRITICAL' THEN 1 END) as critical_risk_count,
    COUNT(CASE WHEN requires_approval = TRUE THEN 1 END) as approval_required_count,
    COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_count,
    COUNT(CASE WHEN is_active = FALSE THEN 1 END) as inactive_count
FROM permissions
WHERE is_system = TRUE
GROUP BY category, resource_type
ORDER BY category, resource_type;

-- 角色权限分配统计视图
CREATE OR REPLACE VIEW role_permission_statistics AS
SELECT 
    r.name as role_name,
    r.description as role_description,
    COUNT(rp.permission_id) as assigned_permissions,
    COUNT(CASE WHEN p.risk_level = 'CRITICAL' THEN 1 END) as critical_permissions,
    COUNT(CASE WHEN p.requires_approval = TRUE THEN 1 END) as approval_permissions,
    GROUP_CONCAT(DISTINCT p.category) as permission_categories
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id AND p.is_active = TRUE
GROUP BY r.id, r.name, r.description
ORDER BY assigned_permissions DESC;

-- ==============================================================================
-- 7. 创建权限验证帮助函数
-- ==============================================================================

-- 创建权限检查函数（存储过程）
DELIMITER $$

CREATE FUNCTION check_user_permission(
    p_user_id INT,
    p_permission_code VARCHAR(100)
) RETURNS BOOLEAN
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE permission_exists INT DEFAULT 0;
    
    SELECT COUNT(*) INTO permission_exists
    FROM users u
    JOIN user_roles ur ON u.id = ur.user_id
    JOIN roles r ON ur.role_id = r.id
    JOIN role_permissions rp ON r.id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE u.id = p_user_id
      AND p.code = p_permission_code
      AND p.is_active = TRUE
      AND r.is_active = TRUE
      AND rp.grant_type = 'ALLOW'
      AND (rp.expires_at IS NULL OR rp.expires_at > NOW());
    
    RETURN permission_exists > 0;
END$$

DELIMITER ;

-- ==============================================================================
-- 8. 权限数据完整性检查和验证
-- ==============================================================================

-- 检查权限数据创建情况
DO $$
DECLARE
    permission_count integer;
    category_count integer;
    resource_type_count integer;
BEGIN
    SELECT COUNT(*) INTO permission_count FROM permissions WHERE is_system = TRUE;
    SELECT COUNT(DISTINCT category) INTO category_count FROM permissions WHERE is_system = TRUE;
    SELECT COUNT(DISTINCT resource_type) INTO resource_type_count FROM permissions WHERE is_system = TRUE;
    
    RAISE NOTICE '=== 权限系统基础数据初始化完成 ===';
    RAISE NOTICE '系统权限总数: %', permission_count;
    RAISE NOTICE '权限分类数量: %', category_count;
    RAISE NOTICE '资源类型数量: %', resource_type_count;
    
    IF permission_count < 100 THEN
        RAISE WARNING '权限数量可能不足，请检查权限创建是否成功';
    END IF;
    
    -- 显示各模块权限分布
    FOR rec IN SELECT category, COUNT(*) as count FROM permissions WHERE is_system = TRUE GROUP BY category ORDER BY category
    LOOP
        RAISE NOTICE '% 模块权限数量: %', rec.category, rec.count;
    END LOOP;
END$$;

-- ==============================================================================
-- 9. 创建权限索引优化
-- ==============================================================================

-- 优化权限查询性能的索引
CREATE INDEX IF NOT EXISTS idx_permissions_module_resource ON permissions(category, resource);
CREATE INDEX IF NOT EXISTS idx_permissions_risk_approval ON permissions(risk_level, requires_approval);
CREATE INDEX IF NOT EXISTS idx_permissions_system_active ON permissions(is_system, is_active);

-- 角色权限关联表优化索引
CREATE INDEX IF NOT EXISTS idx_role_permissions_expires ON role_permissions(expires_at);
CREATE INDEX IF NOT EXISTS idx_role_permissions_grant_type ON role_permissions(grant_type);

-- ==============================================================================
-- 执行完成标记
-- ==============================================================================

-- 更新权限表的更新时间戳，标记初始化完成
UPDATE permissions SET updated_at = CURRENT_TIMESTAMP WHERE is_system = TRUE;

-- 记录权限系统初始化完成
INSERT INTO audit_logs (
    action_type, resource_type, resource_id, user_id,
    description, ip_address, user_agent, performed_at
) VALUES (
    'PERMISSION_SYSTEM_INIT',
    'SYSTEM',
    NULL,
    1,
    '权限系统基础数据初始化完成',
    '127.0.0.1',
    'System-Migration',
    CURRENT_TIMESTAMP
);

-- 提交事务
COMMIT;
