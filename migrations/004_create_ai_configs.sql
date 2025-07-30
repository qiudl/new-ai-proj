-- Migration: 004_create_ai_configs.sql
-- Create AI configuration tables with encryption support

-- 加密密钥管理表
CREATE TABLE IF NOT EXISTS encryption_keys (
    id SERIAL PRIMARY KEY,
    key_name VARCHAR(50) NOT NULL UNIQUE,
    key_value TEXT NOT NULL,               -- Base64编码的加密密钥
    algorithm VARCHAR(50) NOT NULL DEFAULT 'AES-256-GCM',
    created_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    
    CONSTRAINT encryption_keys_key_name_check 
        CHECK (key_name ~ '^[a-zA-Z0-9_-]+$'),
    CONSTRAINT encryption_keys_algorithm_check 
        CHECK (algorithm IN ('AES-256-GCM', 'AES-256-CBC', 'ChaCha20-Poly1305'))
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_encryption_keys_active 
    ON encryption_keys(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_encryption_keys_name 
    ON encryption_keys(key_name);

-- AI配置表
CREATE TABLE IF NOT EXISTS ai_configs (
    id SERIAL PRIMARY KEY,
    provider VARCHAR(50) NOT NULL UNIQUE,  -- openai, claude, deepseek
    api_key_encrypted TEXT NOT NULL,       -- 加密后的API密钥
    api_key_hash VARCHAR(255) NOT NULL,    -- 密钥哈希值(用于验证)
    model VARCHAR(100) NOT NULL,
    base_url VARCHAR(255),
    temperature DECIMAL(3,2) DEFAULT 0.3,
    max_tokens INTEGER DEFAULT 2000,
    enabled BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',           -- 额外配置信息
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_tested_at TIMESTAMP,
    test_success_count INTEGER DEFAULT 0,
    test_failure_count INTEGER DEFAULT 0,
    
    -- 约束检查
    CONSTRAINT ai_configs_provider_check 
        CHECK (provider IN ('openai', 'claude', 'deepseek')),
    CONSTRAINT ai_configs_temperature_check 
        CHECK (temperature >= 0 AND temperature <= 2),
    CONSTRAINT ai_configs_max_tokens_check 
        CHECK (max_tokens >= 1 AND max_tokens <= 32000),
    CONSTRAINT ai_configs_test_counts_check 
        CHECK (test_success_count >= 0 AND test_failure_count >= 0)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_ai_configs_provider ON ai_configs(provider);
CREATE INDEX IF NOT EXISTS idx_ai_configs_enabled ON ai_configs(enabled);
CREATE INDEX IF NOT EXISTS idx_ai_configs_created_by ON ai_configs(created_by);
CREATE INDEX IF NOT EXISTS idx_ai_configs_updated_at ON ai_configs(updated_at);
CREATE INDEX IF NOT EXISTS idx_ai_configs_last_tested ON ai_configs(last_tested_at);

-- 为JSONB字段创建GIN索引
CREATE INDEX IF NOT EXISTS idx_ai_configs_metadata_gin ON ai_configs USING GIN(metadata);

-- AI配置测试日志表（用于审计和统计）
CREATE TABLE IF NOT EXISTS ai_config_test_logs (
    id SERIAL PRIMARY KEY,
    config_id INTEGER REFERENCES ai_configs(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    test_type VARCHAR(50) DEFAULT 'connection', -- connection, model_test, performance_test
    success BOOLEAN NOT NULL,
    response_time_ms INTEGER,
    error_message TEXT,
    test_data JSONB DEFAULT '{}',              -- 测试相关数据
    tested_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    tested_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT ai_test_logs_provider_check 
        CHECK (provider IN ('openai', 'claude', 'deepseek')),
    CONSTRAINT ai_test_logs_response_time_check 
        CHECK (response_time_ms >= 0),
    CONSTRAINT ai_test_logs_test_type_check 
        CHECK (test_type IN ('connection', 'model_test', 'performance_test', 'health_check'))
);

-- 测试日志索引
CREATE INDEX IF NOT EXISTS idx_ai_test_logs_config_id ON ai_config_test_logs(config_id);
CREATE INDEX IF NOT EXISTS idx_ai_test_logs_provider ON ai_config_test_logs(provider);
CREATE INDEX IF NOT EXISTS idx_ai_test_logs_success ON ai_config_test_logs(success);
CREATE INDEX IF NOT EXISTS idx_ai_test_logs_tested_at ON ai_config_test_logs(tested_at);
CREATE INDEX IF NOT EXISTS idx_ai_test_logs_test_type ON ai_config_test_logs(test_type);

-- AI使用统计表
CREATE TABLE IF NOT EXISTS ai_usage_stats (
    id SERIAL PRIMARY KEY,
    config_id INTEGER REFERENCES ai_configs(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    usage_date DATE DEFAULT CURRENT_DATE,
    request_count INTEGER DEFAULT 0,
    token_count INTEGER DEFAULT 0,
    cost_amount DECIMAL(10,4) DEFAULT 0,
    cost_currency VARCHAR(10) DEFAULT 'USD',
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- 唯一约束：每个配置每天一条记录
    UNIQUE(config_id, usage_date),
    
    CONSTRAINT ai_usage_stats_provider_check 
        CHECK (provider IN ('openai', 'claude', 'deepseek')),
    CONSTRAINT ai_usage_stats_counts_check 
        CHECK (request_count >= 0 AND token_count >= 0 AND success_count >= 0 AND error_count >= 0),
    CONSTRAINT ai_usage_stats_cost_check 
        CHECK (cost_amount >= 0)
);

-- 使用统计索引
CREATE INDEX IF NOT EXISTS idx_ai_usage_stats_config_date ON ai_usage_stats(config_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_ai_usage_stats_provider ON ai_usage_stats(provider);
CREATE INDEX IF NOT EXISTS idx_ai_usage_stats_date ON ai_usage_stats(usage_date);

-- 触发器：自动更新 updated_at
CREATE OR REPLACE FUNCTION update_ai_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ai_configs_updated_at
    BEFORE UPDATE ON ai_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_configs_updated_at();

-- 触发器：更新测试统计
CREATE OR REPLACE FUNCTION update_ai_config_test_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.success THEN
        UPDATE ai_configs 
        SET test_success_count = test_success_count + 1,
            last_tested_at = NEW.tested_at
        WHERE id = NEW.config_id;
    ELSE
        UPDATE ai_configs 
        SET test_failure_count = test_failure_count + 1,
            last_tested_at = NEW.tested_at
        WHERE id = NEW.config_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_test_stats
    AFTER INSERT ON ai_config_test_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_config_test_stats();

-- 视图：AI配置统计概览
CREATE OR REPLACE VIEW ai_config_stats AS
SELECT 
    provider,
    COUNT(*) as total_configs,
    COUNT(*) FILTER (WHERE enabled = true) as enabled_configs,
    COUNT(*) FILTER (WHERE last_tested_at IS NOT NULL) as tested_configs,
    AVG(test_success_count::DECIMAL / NULLIF(test_success_count + test_failure_count, 0)) as avg_success_rate,
    MAX(last_tested_at) as last_test_time,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as recent_configs
FROM ai_configs
GROUP BY provider;

-- 视图：AI使用情况统计
CREATE OR REPLACE VIEW ai_usage_summary AS
SELECT 
    c.provider,
    c.model,
    c.enabled,
    COALESCE(SUM(s.request_count), 0) as total_requests,
    COALESCE(SUM(s.token_count), 0) as total_tokens,
    COALESCE(SUM(s.cost_amount), 0) as total_cost,
    COALESCE(AVG(s.cost_amount), 0) as avg_daily_cost,
    COUNT(s.id) as active_days
FROM ai_configs c
LEFT JOIN ai_usage_stats s ON c.id = s.config_id
WHERE s.usage_date >= CURRENT_DATE - INTERVAL '30 days' OR s.usage_date IS NULL
GROUP BY c.id, c.provider, c.model, c.enabled;

-- 初始化默认加密密钥（生产环境中应该通过环境变量或密钥管理服务设置）
INSERT INTO encryption_keys (key_name, key_value, algorithm) 
VALUES (
    'ai_config_key_v1', 
    'aXNfdGhpc19hX3NhZmVfZGVmYXVsdF9rZXlfdGhhdF9zaG91bGRfYmVfcmVwbGFjZWQ=',  -- 这是一个示例密钥，生产环境必须替换
    'AES-256-GCM'
) ON CONFLICT (key_name) DO NOTHING;

-- 添加注释
COMMENT ON TABLE ai_configs IS 'AI服务提供商配置表，存储加密的API密钥和相关配置';
COMMENT ON COLUMN ai_configs.api_key_encrypted IS '使用AES-256-GCM加密的API密钥';
COMMENT ON COLUMN ai_configs.api_key_hash IS 'API密钥的SHA256哈希值，用于验证';
COMMENT ON COLUMN ai_configs.metadata IS '存储额外配置信息的JSONB字段';

COMMENT ON TABLE encryption_keys IS '加密密钥管理表，用于存储和轮换加密密钥';
COMMENT ON COLUMN encryption_keys.key_value IS 'Base64编码的AES-256密钥';

COMMENT ON TABLE ai_config_test_logs IS 'AI配置测试日志，记录所有测试操作';
COMMENT ON TABLE ai_usage_stats IS 'AI使用统计，按天记录使用情况和成本';

-- 权限设置（根据需要调整）
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ai_configs TO ai_service_role;
-- GRANT SELECT ON encryption_keys TO ai_service_role;
-- GRANT SELECT, INSERT ON ai_config_test_logs TO ai_service_role;
-- GRANT SELECT, INSERT, UPDATE ON ai_usage_stats TO ai_service_role;