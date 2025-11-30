-- 回滚 MCP API Keys 相关表

-- 删除触发器
DROP TRIGGER IF EXISTS trigger_mcp_api_keys_updated_at ON mcp_api_keys;

-- 删除触发器函数
DROP FUNCTION IF EXISTS update_mcp_api_keys_updated_at();

-- 删除表（按依赖顺序）
DROP TABLE IF EXISTS mcp_sse_sessions CASCADE;
DROP TABLE IF EXISTS mcp_api_key_logs CASCADE;
DROP TABLE IF EXISTS mcp_api_keys CASCADE;
