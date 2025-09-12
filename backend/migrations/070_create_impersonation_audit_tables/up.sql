-- 创建模拟会话表
CREATE TABLE IF NOT EXISTS impersonation_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    username VARCHAR(100) NOT NULL,
    enterprise_id INTEGER NOT NULL,
    enterprise_name VARCHAR(255) NOT NULL,
    enterprise_code VARCHAR(50) NOT NULL,
    reason TEXT NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 约束
    CONSTRAINT chk_impersonation_status CHECK (status IN ('active', 'expired', 'ended')),
    CONSTRAINT chk_impersonation_dates CHECK (started_at < expires_at),
    CONSTRAINT chk_impersonation_ended CHECK (ended_at IS NULL OR ended_at >= started_at)
);

-- 创建模拟审计日志表
CREATE TABLE IF NOT EXISTS impersonation_audit_logs (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL,
    user_id INTEGER NOT NULL,
    username VARCHAR(100) NOT NULL,
    enterprise_id INTEGER NOT NULL,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(100),
    resource_id INTEGER,
    method VARCHAR(10),
    path VARCHAR(500),
    ip_address VARCHAR(45),
    user_agent TEXT,
    details JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'success',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 约束
    CONSTRAINT chk_audit_action CHECK (action IN ('start', 'access', 'modify', 'end', 'error')),
    CONSTRAINT chk_audit_status CHECK (status IN ('success', 'error', 'warning'))
);

-- 创建索引以优化查询性能
CREATE INDEX idx_impersonation_sessions_user_id ON impersonation_sessions(user_id);
CREATE INDEX idx_impersonation_sessions_enterprise_id ON impersonation_sessions(enterprise_id);
CREATE INDEX idx_impersonation_sessions_session_id ON impersonation_sessions(session_id);
CREATE INDEX idx_impersonation_sessions_status ON impersonation_sessions(status);
CREATE INDEX idx_impersonation_sessions_started_at ON impersonation_sessions(started_at DESC);
CREATE INDEX idx_impersonation_sessions_active ON impersonation_sessions(status, expires_at) WHERE status = 'active';

CREATE INDEX idx_impersonation_audit_session_id ON impersonation_audit_logs(session_id);
CREATE INDEX idx_impersonation_audit_user_id ON impersonation_audit_logs(user_id);
CREATE INDEX idx_impersonation_audit_enterprise_id ON impersonation_audit_logs(enterprise_id);
CREATE INDEX idx_impersonation_audit_action ON impersonation_audit_logs(action);
CREATE INDEX idx_impersonation_audit_created_at ON impersonation_audit_logs(created_at DESC);
CREATE INDEX idx_impersonation_audit_compound ON impersonation_audit_logs(user_id, enterprise_id, created_at DESC);

-- 创建GIN索引用于JSONB字段的快速搜索
CREATE INDEX idx_impersonation_audit_details_gin ON impersonation_audit_logs USING GIN (details);

-- 添加表注释
COMMENT ON TABLE impersonation_sessions IS '系统管理员模拟企业会话记录表';
COMMENT ON TABLE impersonation_audit_logs IS '系统管理员模拟操作审计日志表';

-- 添加列注释
COMMENT ON COLUMN impersonation_sessions.session_id IS '唯一会话标识符';
COMMENT ON COLUMN impersonation_sessions.user_id IS '发起模拟的系统管理员用户ID';
COMMENT ON COLUMN impersonation_sessions.enterprise_id IS '被模拟的企业ID';
COMMENT ON COLUMN impersonation_sessions.reason IS '模拟原因说明';
COMMENT ON COLUMN impersonation_sessions.status IS '会话状态: active(活跃), expired(过期), ended(已结束)';

COMMENT ON COLUMN impersonation_audit_logs.session_id IS '关联的模拟会话ID';
COMMENT ON COLUMN impersonation_audit_logs.action IS '操作类型: start(开始), access(访问), modify(修改), end(结束), error(错误)';
COMMENT ON COLUMN impersonation_audit_logs.resource_type IS '资源类型: enterprise, user, project等';
COMMENT ON COLUMN impersonation_audit_logs.path IS '访问的API端点路径';
COMMENT ON COLUMN impersonation_audit_logs.details IS '操作详细信息(JSONB格式)';

-- 创建用于自动更新 updated_at 的函数和触发器
CREATE OR REPLACE FUNCTION update_impersonation_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_impersonation_sessions_updated_at
    BEFORE UPDATE ON impersonation_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_impersonation_sessions_updated_at();

-- 创建用于自动管理会话状态的函数
CREATE OR REPLACE FUNCTION update_expired_impersonation_sessions()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE impersonation_sessions 
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'active' 
      AND expires_at < NOW();
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- 创建清理旧审计日志的函数（可选，用于定期清理）
CREATE OR REPLACE FUNCTION cleanup_old_impersonation_audit_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM impersonation_audit_logs 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep
      AND action IN ('access', 'modify'); -- 保留关键操作记录（start, end）
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 插入一些示例数据用于测试（开发环境）
-- 注意：在生产环境中应该删除这部分
INSERT INTO impersonation_sessions (
    session_id, user_id, username, enterprise_id, enterprise_name, enterprise_code,
    reason, started_at, expires_at, ip_address, user_agent, status
) VALUES (
    'demo_session_001',
    1, 
    'admin',
    1,
    '示例企业',
    'DEMO001',
    '系统测试和功能验证',
    NOW() - INTERVAL '30 minutes',
    NOW() + INTERVAL '90 minutes',
    '127.0.0.1',
    'Mozilla/5.0 (Test Browser)',
    'active'
) ON CONFLICT (session_id) DO NOTHING;

INSERT INTO impersonation_audit_logs (
    session_id, user_id, username, enterprise_id, action, 
    resource_type, path, method, ip_address, details, status
) VALUES (
    'demo_session_001',
    1,
    'admin',
    1,
    'start',
    'enterprise',
    '/api/v1/admin/impersonate/enterprise/1',
    'POST',
    '127.0.0.1',
    '{"enterprise_name": "示例企业", "reason": "系统测试和功能验证"}',
    'success'
) ON CONFLICT DO NOTHING;