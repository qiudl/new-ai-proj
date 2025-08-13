-- API密钥管理系统 - 数据库基础设施
-- 任务#216: 管道A - 数据库基础设施开发

-- 创建权限枚举类型
DO $$ BEGIN
    CREATE TYPE api_permission_type AS ENUM (
        'api.read',           -- 只读API访问
        'api.write',          -- 读写API访问
        'api.admin',          -- 管理员API访问
        'tasks.read',         -- 任务只读
        'tasks.write',        -- 任务读写
        'projects.read',      -- 项目只读
        'projects.write',     -- 项目读写
        'users.read',         -- 用户只读
        'users.write',        -- 用户读写
        'analytics.read',     -- 分析数据只读
        'analytics.write',    -- 分析数据读写
        'system.monitor'      -- 系统监控
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 创建速率限制类型
DO $$ BEGIN
    CREATE TYPE rate_limit_type AS ENUM (
        'per_minute',         -- 每分钟限制
        'per_hour',           -- 每小时限制
        'per_day',            -- 每日限制
        'per_month'           -- 每月限制
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- API密钥表
CREATE TABLE IF NOT EXISTS api_keys (
    id BIGSERIAL PRIMARY KEY,
    
    -- 基本信息
    name VARCHAR(255) NOT NULL,                               -- API密钥名称（用户友好）
    description TEXT,                                         -- 密钥用途描述
    
    -- 密钥数据（哈希存储，安全性考虑）
    key_hash VARCHAR(255) NOT NULL UNIQUE,                    -- API密钥哈希值
    key_prefix VARCHAR(20) NOT NULL,                          -- 密钥前缀（用于快速识别，如"ak_"）
    secret_hash VARCHAR(255),                                 -- 可选的secret哈希值（用于双重验证）
    
    -- 权限控制
    permissions api_permission_type[] NOT NULL DEFAULT '{}',  -- 权限数组
    scope_projects INTEGER[],                                 -- 允许访问的项目ID列表（空表示全部）
    scope_users INTEGER[],                                    -- 允许访问的用户ID列表（空表示全部）
    
    -- 速率限制
    rate_limit_count INTEGER DEFAULT 1000,                   -- 速率限制次数
    rate_limit_window rate_limit_type DEFAULT 'per_hour',    -- 速率限制时间窗口
    daily_quota INTEGER,                                      -- 每日配额限制
    monthly_quota INTEGER,                                    -- 每月配额限制
    
    -- 状态管理
    is_active BOOLEAN NOT NULL DEFAULT true,                 -- 是否激活
    expires_at TIMESTAMP WITH TIME ZONE,                     -- 过期时间（空表示永不过期）
    last_used_at TIMESTAMP WITH TIME ZONE,                   -- 最后使用时间
    usage_count BIGINT NOT NULL DEFAULT 0,                   -- 使用次数统计
    
    -- 安全信息
    allowed_ips INET[],                                       -- 允许的IP地址列表（空表示不限制）
    allowed_domains VARCHAR(255)[],                          -- 允许的域名列表
    user_agent_pattern VARCHAR(500),                         -- 允许的User-Agent模式
    
    -- 审计信息
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,                     -- 软删除时间戳
    
    -- 元数据
    metadata JSONB DEFAULT '{}',                              -- 扩展元数据
    tags VARCHAR(50)[] DEFAULT '{}'                           -- 标签数组
);

-- API使用日志表
CREATE TABLE IF NOT EXISTS api_usage_logs (
    id BIGSERIAL PRIMARY KEY,
    
    -- 关联信息
    api_key_id BIGINT NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- 关联用户（如果通过密钥识别）
    
    -- 请求信息
    endpoint VARCHAR(500) NOT NULL,                           -- API端点路径
    method VARCHAR(10) NOT NULL,                              -- HTTP方法
    request_size INTEGER,                                     -- 请求体大小（字节）
    response_size INTEGER,                                    -- 响应体大小（字节）
    
    -- 网络信息
    ip_address INET NOT NULL,                                 -- 客户端IP地址
    user_agent TEXT,                                          -- User-Agent字符串
    referer TEXT,                                             -- HTTP Referer
    x_forwarded_for INET[],                                   -- X-Forwarded-For头信息
    
    -- 时间信息
    request_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    response_timestamp TIMESTAMP WITH TIME ZONE,
    response_time_ms INTEGER,                                 -- 响应时间（毫秒）
    
    -- 响应信息
    response_status INTEGER NOT NULL,                         -- HTTP状态码
    response_type VARCHAR(100),                               -- 响应Content-Type
    error_message TEXT,                                       -- 错误信息（如果有）
    error_code VARCHAR(50),                                   -- 错误代码
    
    -- 业务信息
    action_type VARCHAR(100),                                 -- 业务操作类型
    resource_type VARCHAR(100),                               -- 操作的资源类型
    resource_id VARCHAR(100),                                 -- 操作的资源ID
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    
    -- 安全信息
    rate_limited BOOLEAN DEFAULT false,                       -- 是否被速率限制
    blocked_reason VARCHAR(255),                              -- 阻止原因（如果被阻止）
    security_flags VARCHAR(50)[] DEFAULT '{}',               -- 安全标记
    
    -- 统计信息
    quota_remaining INTEGER,                                  -- 剩余配额
    request_sequence BIGINT,                                  -- 请求序列号（用于排序）
    
    -- 元数据
    request_headers JSONB,                                    -- 请求头信息（敏感信息已过滤）
    request_params JSONB,                                     -- 请求参数（敏感信息已过滤）
    response_metadata JSONB,                                  -- 响应元数据
    correlation_id VARCHAR(36),                               -- 关联ID（用于追踪相关请求）
    trace_id VARCHAR(36)                                      -- 分布式追踪ID
);

-- API配额统计表（用于快速查询和限制）
CREATE TABLE IF NOT EXISTS api_quota_stats (
    id BIGSERIAL PRIMARY KEY,
    api_key_id BIGINT NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    
    -- 时间维度
    stat_date DATE NOT NULL,                                  -- 统计日期
    stat_hour INTEGER,                                        -- 统计小时（0-23，用于小时级统计）
    
    -- 统计数据
    request_count INTEGER NOT NULL DEFAULT 0,                -- 请求次数
    success_count INTEGER NOT NULL DEFAULT 0,                -- 成功请求次数
    error_count INTEGER NOT NULL DEFAULT 0,                  -- 错误请求次数
    rate_limit_count INTEGER NOT NULL DEFAULT 0,             -- 被限流次数
    total_response_time_ms BIGINT NOT NULL DEFAULT 0,        -- 总响应时间
    avg_response_time_ms INTEGER NOT NULL DEFAULT 0,         -- 平均响应时间
    
    -- 数据量统计
    total_request_size BIGINT NOT NULL DEFAULT 0,            -- 总请求大小
    total_response_size BIGINT NOT NULL DEFAULT 0,           -- 总响应大小
    
    -- 更新时间
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- 唯一约束
    UNIQUE(api_key_id, stat_date, stat_hour)
);

-- 创建性能优化索引

-- API密钥表索引
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_api_keys_expires_at ON api_keys(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_api_keys_created_by ON api_keys(created_by);
CREATE INDEX IF NOT EXISTS idx_api_keys_last_used ON api_keys(last_used_at DESC) WHERE last_used_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_api_keys_usage_count ON api_keys(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_api_keys_permissions ON api_keys USING GIN(permissions);
CREATE INDEX IF NOT EXISTS idx_api_keys_scope_projects ON api_keys USING GIN(scope_projects) WHERE scope_projects IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_api_keys_tags ON api_keys USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_api_keys_metadata ON api_keys USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_api_keys_deleted_at ON api_keys(deleted_at) WHERE deleted_at IS NULL;

-- API使用日志表索引
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_api_key_id ON api_usage_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user_id ON api_usage_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_timestamp ON api_usage_logs(request_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_endpoint ON api_usage_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_method ON api_usage_logs(method);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_status ON api_usage_logs(response_status);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_ip_address ON api_usage_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_project_id ON api_usage_logs(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_error_status ON api_usage_logs(response_status) WHERE response_status >= 400;
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_response_time ON api_usage_logs(response_time_ms) WHERE response_time_ms IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_rate_limited ON api_usage_logs(rate_limited) WHERE rate_limited = true;
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_correlation_id ON api_usage_logs(correlation_id) WHERE correlation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_trace_id ON api_usage_logs(trace_id) WHERE trace_id IS NOT NULL;

-- 复合索引用于常见查询模式
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_key_time ON api_usage_logs(api_key_id, request_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_key_status ON api_usage_logs(api_key_id, response_status);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_endpoint_time ON api_usage_logs(endpoint, request_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user_time ON api_usage_logs(user_id, request_timestamp DESC) WHERE user_id IS NOT NULL;

-- API配额统计表索引
CREATE INDEX IF NOT EXISTS idx_api_quota_stats_api_key_date ON api_quota_stats(api_key_id, stat_date DESC);
CREATE INDEX IF NOT EXISTS idx_api_quota_stats_api_key_date_hour ON api_quota_stats(api_key_id, stat_date, stat_hour);
CREATE INDEX IF NOT EXISTS idx_api_quota_stats_date ON api_quota_stats(stat_date DESC);

-- 创建更新触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为API密钥表添加更新时间触发器
DROP TRIGGER IF EXISTS update_api_keys_updated_at ON api_keys;
CREATE TRIGGER update_api_keys_updated_at
    BEFORE UPDATE ON api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 为API配额统计表添加更新时间触发器
DROP TRIGGER IF EXISTS update_api_quota_stats_updated_at ON api_quota_stats;
CREATE TRIGGER update_api_quota_stats_updated_at
    BEFORE UPDATE ON api_quota_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 创建分区表（用于大量日志数据的性能优化）
-- 注意：分区功能留作将来扩展
-- 当前创建普通表，在数据量增长后可以转换为分区表
-- 
-- 分区转换脚本示例：
-- ALTER TABLE api_usage_logs RENAME TO api_usage_logs_old;
-- CREATE TABLE api_usage_logs (...) PARTITION BY RANGE (request_timestamp);
-- 然后创建分区并迁移数据

-- 创建视图用于常见查询

-- API密钥活跃状态视图
CREATE OR REPLACE VIEW active_api_keys AS
SELECT 
    ak.*,
    u.username as created_by_username,
    u.email as created_by_email
FROM api_keys ak
JOIN users u ON ak.created_by = u.id
WHERE ak.is_active = true 
  AND (ak.expires_at IS NULL OR ak.expires_at > NOW())
  AND ak.deleted_at IS NULL;

-- API使用统计视图（最近30天）
CREATE OR REPLACE VIEW api_usage_summary AS
SELECT 
    ak.id,
    ak.name,
    ak.key_prefix,
    COUNT(aul.id) as total_requests,
    COUNT(CASE WHEN aul.response_status < 400 THEN 1 END) as successful_requests,
    COUNT(CASE WHEN aul.response_status >= 400 THEN 1 END) as failed_requests,
    AVG(aul.response_time_ms) as avg_response_time,
    MAX(aul.request_timestamp) as last_used_at,
    SUM(CASE WHEN aul.rate_limited THEN 1 ELSE 0 END) as rate_limited_count
FROM api_keys ak
LEFT JOIN api_usage_logs aul ON ak.id = aul.api_key_id 
    AND aul.request_timestamp >= CURRENT_DATE - INTERVAL '30 days'
WHERE ak.deleted_at IS NULL
GROUP BY ak.id, ak.name, ak.key_prefix;

-- 错误率高的API端点视图
CREATE OR REPLACE VIEW high_error_endpoints AS
SELECT 
    endpoint,
    method,
    COUNT(*) as total_requests,
    COUNT(CASE WHEN response_status >= 400 THEN 1 END) as error_requests,
    ROUND(
        COUNT(CASE WHEN response_status >= 400 THEN 1 END)::numeric / 
        COUNT(*)::numeric * 100, 2
    ) as error_rate_percent,
    AVG(response_time_ms) as avg_response_time
FROM api_usage_logs
WHERE request_timestamp >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY endpoint, method
HAVING COUNT(*) >= 10  -- 至少10个请求
   AND COUNT(CASE WHEN response_status >= 400 THEN 1 END)::numeric / COUNT(*)::numeric > 0.1  -- 错误率超过10%
ORDER BY error_rate_percent DESC;

-- 插入默认的系统API权限数据（适应现有表结构）
INSERT INTO permissions (permission_code, permission_name, permission_description, module, resource, action) VALUES
    ('api.keys.read', 'Read API Keys', 'Read API keys', 'api', 'keys', 'read'),
    ('api.keys.create', 'Create API Keys', 'Create API keys', 'api', 'keys', 'create'),
    ('api.keys.update', 'Update API Keys', 'Update API keys', 'api', 'keys', 'update'),
    ('api.keys.delete', 'Delete API Keys', 'Delete API keys', 'api', 'keys', 'delete'),
    ('api.logs.read', 'Read API Logs', 'Read API usage logs', 'api', 'logs', 'read'),
    ('api.quota.read', 'Read API Quota', 'Read API quota statistics', 'api', 'quota', 'read'),
    ('api.admin', 'API Admin', 'Full API management access', 'api', 'system', 'admin')
ON CONFLICT (permission_code) DO NOTHING;

-- 为管理员角色添加API管理权限（使用现有的company_roles表）
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM company_roles r, permissions p
WHERE r.role_code = 'admin' AND p.permission_code LIKE 'api.%'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 为管理者角色添加基础API权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM company_roles r, permissions p
WHERE r.role_code = 'manager' AND p.permission_code IN ('api.keys.read', 'api.logs.read', 'api.quota.read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 添加注释说明
COMMENT ON TABLE api_keys IS 'API密钥管理表 - 存储所有API访问密钥的配置和权限信息';
COMMENT ON TABLE api_usage_logs IS 'API使用日志表 - 记录所有API请求的详细信息，支持按月分区';
COMMENT ON TABLE api_quota_stats IS 'API配额统计表 - 预聚合的配额使用统计，用于快速查询和限制检查';

COMMENT ON COLUMN api_keys.key_hash IS '密钥哈希值，使用安全哈希算法存储，不存储明文';
COMMENT ON COLUMN api_keys.permissions IS '权限数组，定义此密钥可以访问的API功能';
COMMENT ON COLUMN api_keys.scope_projects IS '项目范围限制，空数组表示可访问所有项目';
COMMENT ON COLUMN api_keys.rate_limit_count IS '速率限制次数，配合rate_limit_window使用';
COMMENT ON COLUMN api_keys.allowed_ips IS 'IP白名单，空数组表示不限制来源IP';

COMMENT ON COLUMN api_usage_logs.response_time_ms IS '请求响应时间（毫秒），用于性能监控';
COMMENT ON COLUMN api_usage_logs.rate_limited IS '是否触发速率限制，用于限流分析';
COMMENT ON COLUMN api_usage_logs.correlation_id IS '关联ID，用于追踪相关的多个API请求';
COMMENT ON COLUMN api_usage_logs.security_flags IS '安全标记数组，如suspicious_ip, high_frequency等';

-- 创建数据清理函数（用于定期清理旧日志）
CREATE OR REPLACE FUNCTION cleanup_old_api_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- 删除超过保留期的API使用日志
    DELETE FROM api_usage_logs 
    WHERE request_timestamp < NOW() - (retention_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- 记录清理操作到审计日志
    INSERT INTO audit_logs (
        event_id, 
        action, 
        resource_type, 
        description,
        metadata
    ) VALUES (
        gen_random_uuid()::text,
        'cleanup',
        'api_usage_logs',
        format('Cleaned up %s old API usage logs older than %s days', deleted_count, retention_days),
        jsonb_build_object('deleted_count', deleted_count, 'retention_days', retention_days)
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 创建密钥生成辅助函数
CREATE OR REPLACE FUNCTION generate_api_key_prefix(key_type TEXT DEFAULT 'general')
RETURNS TEXT AS $$
BEGIN
    CASE key_type
        WHEN 'admin' THEN RETURN 'ak_admin_';
        WHEN 'user' THEN RETURN 'ak_user_';
        WHEN 'service' THEN RETURN 'ak_svc_';
        WHEN 'readonly' THEN RETURN 'ak_ro_';
        ELSE RETURN 'ak_';
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- 创建配额检查函数
CREATE OR REPLACE FUNCTION check_api_quota(
    p_api_key_id BIGINT,
    p_rate_limit_window rate_limit_type DEFAULT 'per_hour'
) RETURNS BOOLEAN AS $$
DECLARE
    key_record api_keys%ROWTYPE;
    current_usage INTEGER;
    window_start TIMESTAMP WITH TIME ZONE;
BEGIN
    -- 获取API密钥信息
    SELECT * INTO key_record FROM api_keys WHERE id = p_api_key_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- 计算时间窗口起始时间
    CASE p_rate_limit_window
        WHEN 'per_minute' THEN
            window_start := date_trunc('minute', NOW());
        WHEN 'per_hour' THEN
            window_start := date_trunc('hour', NOW());
        WHEN 'per_day' THEN
            window_start := date_trunc('day', NOW());
        WHEN 'per_month' THEN
            window_start := date_trunc('month', NOW());
    END CASE;
    
    -- 计算当前窗口内的使用量
    SELECT COUNT(*) INTO current_usage
    FROM api_usage_logs
    WHERE api_key_id = p_api_key_id
      AND request_timestamp >= window_start;
    
    -- 检查是否超过限制
    RETURN current_usage < key_record.rate_limit_count;
END;
$$ LANGUAGE plpgsql;