-- 010_insert_default_role_permissions.sql
-- 为默认角色分配权限
-- 执行时间：预计 10-15秒（大量数据插入）

-- 清空现有角色权限数据（如果需要重新初始化）
-- DELETE FROM role_permissions;

-- 为超级管理员分配所有权限
INSERT INTO role_permissions (role_id, permission_id, grant_type, created_by)
SELECT 1, p.id, 'ALLOW', 1
FROM permissions p
WHERE p.is_active = 1;

-- 为开发经理分配开发相关权限
INSERT INTO role_permissions (role_id, permission_id, grant_type, created_by)
SELECT 2, p.id, 'ALLOW', 1
FROM permissions p
WHERE p.is_active = 1
  AND (
    p.category IN ('USER_MANAGEMENT', 'ROLE_MANAGEMENT', 'PROJECT_MANAGEMENT', 'SYSTEM_MANAGEMENT', 'API_ACCESS')
    OR p.resource IN ('USER', 'ROLE', 'PROJECT', 'SYSTEM_CONFIG', 'API', 'DATA')
    OR p.code LIKE 'SYSTEM_%'
    OR p.code LIKE 'PROJECT_%'
    OR p.code LIKE 'API_%'
    OR p.code LIKE 'DATA_READ_%'
    OR p.code LIKE 'UI_%'
  )
  AND p.risk_level != 'CRITICAL'  -- 排除最高风险权限
  AND p.code NOT LIKE '%_DELETE';  -- 排除删除权限

-- 为项目经理分配项目管理相关权限
INSERT INTO role_permissions (role_id, permission_id, grant_type, created_by)
SELECT 3, p.id, 'ALLOW', 1
FROM permissions p
WHERE p.is_active = 1
  AND (
    p.category IN ('PROJECT_MANAGEMENT', 'REPORT_MANAGEMENT', 'UI_ACCESS')
    OR p.resource IN ('PROJECT', 'REPORT', 'DATA', 'UI')
    OR p.code LIKE 'PROJECT_%'
    OR p.code LIKE 'REPORT_%'
    OR p.code IN ('USER_READ', 'ROLE_READ', 'DATA_READ_PUBLIC', 'DATA_READ_INTERNAL')
    OR p.code LIKE 'UI_%'
  )
  AND p.risk_level IN ('LOW', 'MEDIUM')
  AND p.code NOT LIKE '%_DELETE'
  AND p.code NOT LIKE '%_CREATE'
  AND p.action != 'DELETE';

-- 为开发工程师分配开发权限
INSERT INTO role_permissions (role_id, permission_id, grant_type, created_by)
SELECT 4, p.id, 'ALLOW', 1
FROM permissions p
WHERE p.is_active = 1
  AND (
    p.code IN (
      'PROJECT_READ', 'PROJECT_UPDATE', 'DATA_READ_PUBLIC', 'DATA_READ_INTERNAL',
      'API_ACCESS_READ', 'API_ACCESS_WRITE', 'UI_DASHBOARD'
    )
    OR p.resource = 'REPORT' AND p.action = 'READ'
  )
  AND p.risk_level IN ('LOW', 'MEDIUM');

-- 为测试工程师分配测试权限  
INSERT INTO role_permissions (role_id, permission_id, grant_type, created_by)
SELECT 5, p.id, 'ALLOW', 1
FROM permissions p
WHERE p.is_active = 1
  AND (
    p.code IN (
      'PROJECT_READ', 'DATA_READ_PUBLIC', 'DATA_READ_INTERNAL',
      'REPORT_READ', 'REPORT_CREATE', 'API_ACCESS_READ', 'UI_DASHBOARD'
    )
  )
  AND p.risk_level IN ('LOW', 'MEDIUM');

-- 为企业管理员分配企业管理权限
INSERT INTO role_permissions (role_id, permission_id, grant_type, created_by)
SELECT 6, p.id, 'ALLOW', 1
FROM permissions p
WHERE p.is_active = 1
  AND (
    p.category IN ('USER_MANAGEMENT', 'ROLE_MANAGEMENT', 'ENTERPRISE_MANAGEMENT', 
                   'DEPARTMENT_MANAGEMENT', 'REPORT_MANAGEMENT', 'UI_ACCESS', 'AUDIT_MANAGEMENT')
    OR p.resource IN ('USER', 'ROLE', 'ENTERPRISE', 'DEPARTMENT', 'REPORT', 'DATA', 'UI')
    OR p.code LIKE 'ENTERPRISE_%'
    OR p.code LIKE 'DEPARTMENT_%'
    OR p.code LIKE 'DATA_READ_%'
    OR p.code LIKE 'UI_%'
  )
  AND p.code NOT LIKE 'SYSTEM_%'  -- 排除系统级权限
  AND p.risk_level != 'CRITICAL';

-- 为业务经理分配业务管理权限
INSERT INTO role_permissions (role_id, permission_id, grant_type, created_by)
SELECT 7, p.id, 'ALLOW', 1
FROM permissions p
WHERE p.is_active = 1
  AND (
    p.category IN ('PROJECT_MANAGEMENT', 'REPORT_MANAGEMENT', 'DEPARTMENT_MANAGEMENT', 'UI_ACCESS')
    OR p.resource IN ('PROJECT', 'REPORT', 'DEPARTMENT', 'DATA', 'UI')
    OR p.code IN ('USER_READ', 'ROLE_READ', 'ENTERPRISE_READ', 'ENTERPRISE_UPDATE')
    OR p.code LIKE 'DATA_READ_%'
    OR p.code LIKE 'REPORT_%'
    OR p.code LIKE 'PROJECT_%'
    OR p.code LIKE 'DEPARTMENT_%'
    OR p.code LIKE 'UI_%'
  )
  AND p.risk_level IN ('LOW', 'MEDIUM', 'HIGH')
  AND p.code NOT LIKE 'SYSTEM_%';

-- 为IT经理分配技术管理权限
INSERT INTO role_permissions (role_id, permission_id, grant_type, created_by)
SELECT 8, p.id, 'ALLOW', 1
FROM permissions p
WHERE p.is_active = 1
  AND (
    p.category IN ('USER_MANAGEMENT', 'ROLE_MANAGEMENT', 'ENTERPRISE_MANAGEMENT', 
                   'API_ACCESS', 'AUDIT_MANAGEMENT', 'UI_ACCESS')
    OR p.resource IN ('USER', 'ROLE', 'ENTERPRISE', 'API', 'AUDIT_LOG', 'UI')
    OR p.code LIKE 'API_%'
    OR p.code LIKE 'DATA_READ_%'
    OR p.code LIKE 'AUDIT_%'
    OR p.code LIKE 'UI_%'
  )
  AND p.code NOT LIKE 'SYSTEM_%'
  AND p.risk_level != 'CRITICAL';

-- 为部门经理分配部门管理权限
INSERT INTO role_permissions (role_id, permission_id, grant_type, created_by)
SELECT 9, p.id, 'ALLOW', 1
FROM permissions p
WHERE p.is_active = 1
  AND (
    p.category IN ('DEPARTMENT_MANAGEMENT', 'PROJECT_MANAGEMENT', 'REPORT_MANAGEMENT', 'UI_ACCESS')
    OR p.code IN (
      'USER_READ', 'ROLE_READ', 'ENTERPRISE_READ',
      'DEPARTMENT_READ', 'DEPARTMENT_UPDATE', 'DEPARTMENT_ASSIGN_USER',
      'PROJECT_READ', 'PROJECT_CREATE', 'PROJECT_UPDATE', 'PROJECT_ASSIGN',
      'REPORT_READ', 'REPORT_CREATE', 'REPORT_EXPORT',
      'DATA_READ_PUBLIC', 'DATA_READ_INTERNAL',
      'UI_DASHBOARD', 'UI_USER_MANAGEMENT'
    )
  )
  AND p.risk_level IN ('LOW', 'MEDIUM');

-- 为普通用户分配基础权限
INSERT INTO role_permissions (role_id, permission_id, grant_type, created_by)
SELECT 10, p.id, 'ALLOW', 1
FROM permissions p
WHERE p.is_active = 1
  AND p.code IN (
    'PROJECT_READ', 'REPORT_READ', 'DATA_READ_PUBLIC',
    'UI_DASHBOARD', 'ENTERPRISE_READ', 'USER_READ'
  )
  AND p.risk_level = 'LOW';

-- 为访客用户分配最基础权限
INSERT INTO role_permissions (role_id, permission_id, grant_type, created_by)
SELECT 11, p.id, 'ALLOW', 1
FROM permissions p
WHERE p.is_active = 1
  AND p.code IN ('DATA_READ_PUBLIC', 'UI_DASHBOARD')
  AND p.risk_level = 'LOW';

-- 验证权限分配结果
SELECT 
    r.name as role_name,
    COUNT(rp.permission_id) as permission_count,
    GROUP_CONCAT(DISTINCT p.risk_level) as risk_levels
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
WHERE r.is_system = 1
GROUP BY r.id, r.name
ORDER BY r.level;
