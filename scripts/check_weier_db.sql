-- 检查weier账户在数据库中的状态
-- 执行方式: psql -h 152.136.104.251 -U postgres -d ai_project_db -f check_weier_db.sql

\echo '🔍 检查weier账户在数据库中的状态'
\echo '=================================='

-- 1. 检查users表
\echo ''
\echo '1️⃣ 检查users表中的weier账户:'
SELECT id, username, email, role, is_active, created_at
FROM users 
WHERE username = 'weier' OR email LIKE '%weier%';

-- 2. 检查company_users表
\echo ''
\echo '2️⃣ 检查company_users表中的weier记录:'
SELECT cu.id as company_user_id, cu.user_id, cu.company_id, cu.role_id, cu.is_active,
       u.username, u.email, u.role as user_role,
       cr.role_code, cr.role_name
FROM company_users cu
LEFT JOIN users u ON cu.user_id = u.id
LEFT JOIN company_roles cr ON cu.role_id = cr.id
WHERE u.username = 'weier' OR u.email LIKE '%weier%';

-- 3. 如果找到company_user记录,检查其角色权限
\echo ''
\echo '3️⃣ 如果weier有company_user记录,检查角色权限:'
SELECT DISTINCT p.permission_code, p.permission_name, p.module, p.resource, p.action
FROM company_users cu
INNER JOIN users u ON cu.user_id = u.id
LEFT JOIN company_role_permissions crp ON cu.role_id = crp.role_id
LEFT JOIN permissions p ON crp.permission_id = p.id
WHERE u.username = 'weier' AND p.permission_code LIKE '%project%'
ORDER BY p.permission_code;

-- 4. 检查自定义权限
\echo ''
\echo '4️⃣ 检查weier的自定义权限覆盖:'
SELECT cucp.permission_code, cucp.is_granted, cucp.created_at
FROM company_user_custom_permissions cucp
INNER JOIN company_users cu ON cucp.company_user_id = cu.id
INNER JOIN users u ON cu.user_id = u.id
WHERE u.username = 'weier';

-- 5. 检查所有可用的角色
\echo ''
\echo '5️⃣ 所有可用的角色:'
SELECT id, role_code, role_name, role_description, is_system_role, is_active
FROM company_roles
WHERE is_active = true
ORDER BY is_system_role DESC, role_name;

-- 6. 检查project_read权限的ID
\echo ''
\echo '6️⃣ 检查project_read权限:'
SELECT id, permission_code, permission_name, module, resource, action
FROM permissions
WHERE permission_code = 'project.read' OR permission_code = 'project_read';

-- 7. 检查哪些角色有project_read权限
\echo ''
\echo '7️⃣ 哪些角色拥有project_read权限:'
SELECT cr.id, cr.role_code, cr.role_name, p.permission_code
FROM company_roles cr
INNER JOIN company_role_permissions crp ON cr.id = crp.role_id
INNER JOIN permissions p ON crp.permission_id = p.id
WHERE (p.permission_code = 'project.read' OR p.permission_code = 'project_read')
  AND cr.is_active = true;
