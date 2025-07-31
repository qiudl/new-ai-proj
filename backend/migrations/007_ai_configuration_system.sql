-- AI Configuration System Migration
-- Adds tables for AI provider configuration management

-- Create encryption keys table
CREATE TABLE IF NOT EXISTS encryption_keys (
    id SERIAL PRIMARY KEY,
    key_name VARCHAR(255) NOT NULL UNIQUE,
    key_value TEXT NOT NULL, -- Base64 encoded encryption key
    algorithm VARCHAR(50) NOT NULL DEFAULT 'AES-256-GCM',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create AI configurations table
CREATE TABLE IF NOT EXISTS ai_configs (
    id SERIAL PRIMARY KEY,
    provider VARCHAR(50) NOT NULL UNIQUE CHECK (provider IN ('openai', 'claude', 'deepseek')),
    api_key_encrypted TEXT NOT NULL, -- Encrypted API key
    api_key_hash VARCHAR(255) NOT NULL, -- Hash for integrity check
    model VARCHAR(255) NOT NULL,
    base_url TEXT, -- Optional custom base URL
    temperature DECIMAL(3,2) NOT NULL DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
    max_tokens INTEGER NOT NULL DEFAULT 4000 CHECK (max_tokens >= 1 AND max_tokens <= 32000),
    enabled BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB, -- Additional configuration metadata
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_tested_at TIMESTAMP WITH TIME ZONE,
    test_success_count INTEGER NOT NULL DEFAULT 0,
    test_failure_count INTEGER NOT NULL DEFAULT 0
);

-- Create AI test logs table
CREATE TABLE IF NOT EXISTS ai_test_logs (
    id SERIAL PRIMARY KEY,
    config_id INTEGER REFERENCES ai_configs(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    success BOOLEAN NOT NULL,
    response_time_ms INTEGER, -- Response time in milliseconds
    error_message TEXT,
    tested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tested_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Create AI usage statistics table
CREATE TABLE IF NOT EXISTS ai_usage_stats (
    id SERIAL PRIMARY KEY,
    config_id INTEGER REFERENCES ai_configs(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    usage_date DATE NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 0,
    token_count INTEGER NOT NULL DEFAULT 0,
    cost_amount DECIMAL(10,4) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_configs_provider ON ai_configs(provider);
CREATE INDEX IF NOT EXISTS idx_ai_configs_enabled ON ai_configs(enabled);
CREATE INDEX IF NOT EXISTS idx_ai_configs_created_by ON ai_configs(created_by);
CREATE INDEX IF NOT EXISTS idx_ai_configs_updated_at ON ai_configs(updated_at);

CREATE INDEX IF NOT EXISTS idx_ai_test_logs_config_id ON ai_test_logs(config_id);
CREATE INDEX IF NOT EXISTS idx_ai_test_logs_provider ON ai_test_logs(provider);
CREATE INDEX IF NOT EXISTS idx_ai_test_logs_tested_at ON ai_test_logs(tested_at);
CREATE INDEX IF NOT EXISTS idx_ai_test_logs_success ON ai_test_logs(success);

CREATE INDEX IF NOT EXISTS idx_ai_usage_stats_config_id ON ai_usage_stats(config_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_stats_provider ON ai_usage_stats(provider);
CREATE INDEX IF NOT EXISTS idx_ai_usage_stats_usage_date ON ai_usage_stats(usage_date);

-- Create unique index for usage stats (one record per config per day)
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_usage_stats_unique 
ON ai_usage_stats(config_id, usage_date);

-- Add updated_at trigger for ai_configs
CREATE OR REPLACE FUNCTION update_ai_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_config_updated_at_trigger
    BEFORE UPDATE ON ai_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_config_updated_at();

-- Insert default encryption key if not exists
INSERT INTO encryption_keys (key_name, key_value, algorithm, is_active)
SELECT 'default_ai_key', encode(gen_random_bytes(32), 'base64'), 'AES-256-GCM', true
WHERE NOT EXISTS (SELECT 1 FROM encryption_keys WHERE key_name = 'default_ai_key');

-- Add comments for documentation
COMMENT ON TABLE ai_configs IS 'AI provider configurations with encrypted API keys';
COMMENT ON COLUMN ai_configs.api_key_encrypted IS 'Encrypted API key using AES-256-GCM';
COMMENT ON COLUMN ai_configs.api_key_hash IS 'SHA-256 hash of the API key for integrity verification';
COMMENT ON COLUMN ai_configs.metadata IS 'JSON metadata including rate limits, cost tracking, and security settings';
COMMENT ON COLUMN ai_configs.provider IS 'AI provider: openai, claude, or deepseek';

COMMENT ON TABLE ai_test_logs IS 'Log of AI configuration connection tests';
COMMENT ON TABLE ai_usage_stats IS 'Daily usage statistics for AI configurations';
COMMENT ON TABLE encryption_keys IS 'Encryption keys for securing sensitive data';