-- MCP API Keys 表
-- 用于存储公共 MCP 服务的 API Key

CREATE TABLE IF NOT EXISTS mcp_api_keys (
    id              SERIAL PRIMARY KEY,

    -- Key 标识
    key_id          VARCHAR(32) NOT NULL,               -- 公开标识，如 'aiproj_pk_abc123'
    key_hash        VARCHAR(64) NOT NULL,               -- SHA-256 哈希存储，不存明文
    key_prefix      VARCHAR(24) NOT NULL,               -- 前缀用于显示，如 'aiproj_pk_abc1...'

    -- 用户绑定
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enterprise_id   INTEGER REFERENCES enterprises(id) ON DELETE SET NULL,

    -- 元信息
    name            VARCHAR(128) NOT NULL,              -- Key 名称/描述
    description     TEXT,                               -- 详细说明

    -- 生命周期
    status          VARCHAR(20) NOT NULL DEFAULT 'active', -- active, revoked, expired
    expires_at      TIMESTAMP WITH TIME ZONE,           -- NULL 表示永不过期
    last_used_at    TIMESTAMP WITH TIME ZONE,           -- 最后使用时间

    -- 统计
    total_requests  BIGINT NOT NULL DEFAULT 0,          -- 总请求数
    total_errors    BIGINT NOT NULL DEFAULT 0,          -- 错误请求数

    -- 审计
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    revoked_at      TIMESTAMP WITH TIME ZONE,           -- 撤销时间
    revoked_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,

    -- 唯一约束
    CONSTRAINT mcp_api_keys_key_id_unique UNIQUE (key_id),
    CONSTRAINT mcp_api_keys_key_hash_unique UNIQUE (key_hash)
);

-- 索引
CREATE INDEX idx_mcp_api_keys_user_id ON mcp_api_keys(user_id);
CREATE INDEX idx_mcp_api_keys_enterprise_id ON mcp_api_keys(enterprise_id) WHERE enterprise_id IS NOT NULL;
CREATE INDEX idx_mcp_api_keys_status ON mcp_api_keys(status);
CREATE INDEX idx_mcp_api_keys_expires_at ON mcp_api_keys(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_mcp_api_keys_created_at ON mcp_api_keys(created_at);

-- 注释
COMMENT ON TABLE mcp_api_keys IS '公共 MCP 服务 API Key 管理表';
COMMENT ON COLUMN mcp_api_keys.key_id IS '公开的 Key 标识符，格式：aiproj_pk_xxx';
COMMENT ON COLUMN mcp_api_keys.key_hash IS 'API Key 的 SHA-256 哈希值，用于验证';
COMMENT ON COLUMN mcp_api_keys.key_prefix IS 'Key 前缀用于界面显示';
COMMENT ON COLUMN mcp_api_keys.user_id IS '绑定的用户ID，Key 将继承该用户的权限';
COMMENT ON COLUMN mcp_api_keys.status IS 'Key 状态：active-活跃，revoked-已撤销，expired-已过期';


-- MCP API Key 调用日志表
CREATE TABLE IF NOT EXISTS mcp_api_key_logs (
    id              BIGSERIAL PRIMARY KEY,

    -- 关联
    api_key_id      INTEGER NOT NULL REFERENCES mcp_api_keys(id) ON DELETE CASCADE,
    user_id         INTEGER NOT NULL,                   -- 冗余存储，便于查询

    -- 请求信息
    request_id      VARCHAR(36) NOT NULL,               -- 请求唯一ID (UUID)
    tool_name       VARCHAR(64) NOT NULL,               -- 调用的工具名称
    tool_arguments  JSONB,                              -- 请求参数（脱敏后）

    -- 响应信息
    response_status VARCHAR(20) NOT NULL,               -- success, error, timeout
    response_error  TEXT,                               -- 错误信息

    -- 性能指标
    duration_ms     INTEGER NOT NULL DEFAULT 0,         -- 耗时（毫秒）

    -- 客户端信息
    client_ip       INET,                               -- 客户端IP
    user_agent      VARCHAR(512),                       -- User-Agent

    -- 时间
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 索引（针对常见查询优化）
CREATE INDEX idx_mcp_api_key_logs_api_key_id ON mcp_api_key_logs(api_key_id);
CREATE INDEX idx_mcp_api_key_logs_user_id ON mcp_api_key_logs(user_id);
CREATE INDEX idx_mcp_api_key_logs_tool_name ON mcp_api_key_logs(tool_name);
CREATE INDEX idx_mcp_api_key_logs_created_at ON mcp_api_key_logs(created_at);
CREATE INDEX idx_mcp_api_key_logs_response_status ON mcp_api_key_logs(response_status);
-- 复合索引：按 Key 和时间查询
CREATE INDEX idx_mcp_api_key_logs_key_time ON mcp_api_key_logs(api_key_id, created_at DESC);

-- 注释
COMMENT ON TABLE mcp_api_key_logs IS 'MCP API Key 调用日志表，记录每次工具调用的详细信息';
COMMENT ON COLUMN mcp_api_key_logs.tool_arguments IS '工具调用参数（敏感信息已脱敏）';
COMMENT ON COLUMN mcp_api_key_logs.response_status IS '响应状态：success-成功，error-错误，timeout-超时';


-- MCP SSE 连接会话表
CREATE TABLE IF NOT EXISTS mcp_sse_sessions (
    id              SERIAL PRIMARY KEY,

    -- 关联
    api_key_id      INTEGER NOT NULL REFERENCES mcp_api_keys(id) ON DELETE CASCADE,
    user_id         INTEGER NOT NULL,

    -- 会话信息
    session_id      VARCHAR(36) NOT NULL,               -- UUID
    client_ip       INET,
    user_agent      VARCHAR(512),

    -- 状态
    status          VARCHAR(20) NOT NULL DEFAULT 'active', -- active, closed
    connected_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    disconnected_at TIMESTAMP WITH TIME ZONE,
    last_activity   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- 统计
    messages_sent   INTEGER NOT NULL DEFAULT 0,
    messages_received INTEGER NOT NULL DEFAULT 0,

    -- 唯一约束
    CONSTRAINT mcp_sse_sessions_session_id_unique UNIQUE (session_id)
);

-- 索引
CREATE INDEX idx_mcp_sse_sessions_api_key_id ON mcp_sse_sessions(api_key_id);
CREATE INDEX idx_mcp_sse_sessions_user_id ON mcp_sse_sessions(user_id);
CREATE INDEX idx_mcp_sse_sessions_status ON mcp_sse_sessions(status);
CREATE INDEX idx_mcp_sse_sessions_connected_at ON mcp_sse_sessions(connected_at);

-- 注释
COMMENT ON TABLE mcp_sse_sessions IS 'MCP SSE 连接会话表，跟踪活跃的客户端连接';
COMMENT ON COLUMN mcp_sse_sessions.session_id IS '会话唯一标识符（UUID）';
COMMENT ON COLUMN mcp_sse_sessions.status IS '会话状态：active-活跃，closed-已关闭';


-- 创建更新 updated_at 的触发器函数（如果不存在）
CREATE OR REPLACE FUNCTION update_mcp_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_mcp_api_keys_updated_at ON mcp_api_keys;
CREATE TRIGGER trigger_mcp_api_keys_updated_at
    BEFORE UPDATE ON mcp_api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_mcp_api_keys_updated_at();
