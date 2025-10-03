-- =============================================================================
-- 回滚MCP服务账号和权限配置
-- 文件: 100_create_mcp_service_account/down.sql
-- 描述: 删除MCP服务账号、角色和权限配置
-- =============================================================================

BEGIN;

-- 1. 删除API Keys
DELETE FROM service_api_keys
WHERE user_id IN (SELECT id FROM users WHERE username = 'mcp-service');

-- 2. 删除company_users记录
DELETE FROM company_users
WHERE email = 'mcp-service@system.local';

-- 3. 删除users记录
DELETE FROM users
WHERE username = 'mcp-service';

-- 4. 删除角色权限关联
DELETE FROM role_permissions
WHERE role_id IN (SELECT id FROM company_roles WHERE role_code = 'mcp_service');

-- 5. 删除MCP服务角色
DELETE FROM company_roles
WHERE role_code = 'mcp_service';

-- 6. 删除MCP相关权限（可选 - 如果其他角色也使用这些权限则保留）
-- 注释掉以保留权限定义
-- DELETE FROM permissions WHERE permission_code LIKE 'task:%' OR permission_code LIKE 'document:%';

-- 7. 删除API Key管理表
DROP TABLE IF EXISTS service_api_keys CASCADE;

COMMIT;
