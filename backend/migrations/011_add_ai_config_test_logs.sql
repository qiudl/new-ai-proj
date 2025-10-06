-- Migration: Add AI Config Test Logs Table
-- Author: Claude AI
-- Date: 2025-10-06
-- Description: 创建AI配置测试日志表，用于记录API密钥验证测试的历史对话和结果

-- ================================================
-- 1. 创建 AI配置测试日志表
-- ================================================
CREATE TABLE IF NOT EXISTS ai_config_test_logs (
    id SERIAL PRIMARY KEY,
    config_id INTEGER NOT NULL,
    provider VARCHAR(50) NOT NULL,

    -- 测试信息
    test_prompt TEXT NOT NULL,                      -- 测试使用的提示词
    test_response TEXT,                              -- AI返回的响应
    test_status VARCHAR(20) NOT NULL,                -- 测试状态: success, failed, timeout, error

    -- 性能指标
    response_time_ms INTEGER,                        -- 响应时间(毫秒)
    tokens_used INTEGER,                             -- 使用的token数量

    -- 错误信息
    error_message TEXT,                              -- 错误消息
    error_code VARCHAR(50),                          -- 错误代码
    http_status_code INTEGER,                        -- HTTP状态码

    -- 测试配置快照
    model_used VARCHAR(100),                         -- 使用的模型
    max_tokens INTEGER,                              -- 最大token数
    temperature DECIMAL(3,2),                        -- 温度参数

    -- 元数据
    tested_by INTEGER,                               -- 测试用户ID
    test_ip VARCHAR(45),                             -- 测试IP地址
    user_agent TEXT,                                 -- 用户代理
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- 外键约束
    CONSTRAINT fk_ai_config_test_config FOREIGN KEY (config_id)
        REFERENCES ai_configs(id) ON DELETE CASCADE,
    CONSTRAINT fk_ai_config_test_user FOREIGN KEY (tested_by)
        REFERENCES users(id) ON DELETE SET NULL,

    -- 检查约束
    CONSTRAINT chk_test_status CHECK (test_status IN ('success', 'failed', 'timeout', 'error')),
    CONSTRAINT chk_response_time CHECK (response_time_ms >= 0),
    CONSTRAINT chk_tokens_used CHECK (tokens_used >= 0),
    CONSTRAINT chk_temperature CHECK (temperature >= 0 AND temperature <= 2)
);

-- ================================================
-- 2. 添加索引
-- ================================================
CREATE INDEX IF NOT EXISTS idx_test_logs_config_id ON ai_config_test_logs(config_id);
CREATE INDEX IF NOT EXISTS idx_test_logs_provider ON ai_config_test_logs(provider);
CREATE INDEX IF NOT EXISTS idx_test_logs_status ON ai_config_test_logs(test_status);
CREATE INDEX IF NOT EXISTS idx_test_logs_created_at ON ai_config_test_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_logs_tested_by ON ai_config_test_logs(tested_by);

-- 复合索引：用于查询特定配置的测试历史
CREATE INDEX IF NOT EXISTS idx_test_logs_config_created
    ON ai_config_test_logs(config_id, created_at DESC);

-- 复合索引：用于查询特定用户的测试历史
CREATE INDEX IF NOT EXISTS idx_test_logs_user_created
    ON ai_config_test_logs(tested_by, created_at DESC);

-- ================================================
-- 3. 添加表和列注释
-- ================================================
COMMENT ON TABLE ai_config_test_logs IS 'AI配置测试日志表 - 记录API密钥验证测试的历史对话和结果';

COMMENT ON COLUMN ai_config_test_logs.config_id IS 'AI配置ID，关联ai_configs表';
COMMENT ON COLUMN ai_config_test_logs.provider IS 'AI提供商: openai, claude, deepseek等';
COMMENT ON COLUMN ai_config_test_logs.test_prompt IS '测试使用的提示词';
COMMENT ON COLUMN ai_config_test_logs.test_response IS 'AI返回的响应内容';
COMMENT ON COLUMN ai_config_test_logs.test_status IS '测试状态: success(成功), failed(失败), timeout(超时), error(错误)';
COMMENT ON COLUMN ai_config_test_logs.response_time_ms IS '响应时间(毫秒)';
COMMENT ON COLUMN ai_config_test_logs.tokens_used IS '本次请求使用的token数量';
COMMENT ON COLUMN ai_config_test_logs.error_message IS '错误消息详情';
COMMENT ON COLUMN ai_config_test_logs.error_code IS 'API返回的错误代码';
COMMENT ON COLUMN ai_config_test_logs.http_status_code IS 'HTTP响应状态码';
COMMENT ON COLUMN ai_config_test_logs.model_used IS '使用的AI模型名称';
COMMENT ON COLUMN ai_config_test_logs.max_tokens IS '最大token限制';
COMMENT ON COLUMN ai_config_test_logs.temperature IS '温度参数(0-2)';
COMMENT ON COLUMN ai_config_test_logs.tested_by IS '执行测试的用户ID';
COMMENT ON COLUMN ai_config_test_logs.test_ip IS '测试请求的IP地址';
COMMENT ON COLUMN ai_config_test_logs.user_agent IS '用户代理字符串';

-- ================================================
-- 4. 创建视图：测试日志统计
-- ================================================
CREATE OR REPLACE VIEW v_ai_config_test_stats AS
SELECT
    config_id,
    provider,
    COUNT(*) AS total_tests,
    SUM(CASE WHEN test_status = 'success' THEN 1 ELSE 0 END) AS successful_tests,
    SUM(CASE WHEN test_status = 'failed' THEN 1 ELSE 0 END) AS failed_tests,
    SUM(CASE WHEN test_status = 'error' THEN 1 ELSE 0 END) AS error_tests,
    SUM(CASE WHEN test_status = 'timeout' THEN 1 ELSE 0 END) AS timeout_tests,
    ROUND(AVG(response_time_ms), 2) AS avg_response_time_ms,
    MIN(response_time_ms) AS min_response_time_ms,
    MAX(response_time_ms) AS max_response_time_ms,
    SUM(tokens_used) AS total_tokens_used,
    ROUND(AVG(tokens_used), 2) AS avg_tokens_used,
    MAX(created_at) AS last_test_time,
    MIN(created_at) AS first_test_time
FROM ai_config_test_logs
GROUP BY config_id, provider;

COMMENT ON VIEW v_ai_config_test_stats IS 'AI配置测试统计视图 - 按配置聚合测试结果';

-- ================================================
-- 5. 创建函数：获取最近N次测试记录
-- ================================================
CREATE OR REPLACE FUNCTION get_recent_test_logs(
    p_config_id INTEGER,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
    id INTEGER,
    test_prompt TEXT,
    test_response TEXT,
    test_status VARCHAR(20),
    response_time_ms INTEGER,
    tokens_used INTEGER,
    error_message TEXT,
    model_used VARCHAR(100),
    tested_by INTEGER,
    tester_username VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        tl.id,
        tl.test_prompt,
        tl.test_response,
        tl.test_status,
        tl.response_time_ms,
        tl.tokens_used,
        tl.error_message,
        tl.model_used,
        tl.tested_by,
        u.username,
        tl.created_at
    FROM ai_config_test_logs tl
    LEFT JOIN users u ON tl.tested_by = u.id
    WHERE tl.config_id = p_config_id
    ORDER BY tl.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_recent_test_logs(INTEGER, INTEGER) IS '获取指定AI配置的最近N次测试记录';

-- ================================================
-- 6. 创建函数：清理旧的测试日志
-- ================================================
CREATE OR REPLACE FUNCTION cleanup_old_test_logs(
    p_days_to_keep INTEGER DEFAULT 90
)
RETURNS TABLE(
    deleted_count INTEGER
) AS $$
DECLARE
    affected_rows INTEGER;
BEGIN
    -- 删除超过指定天数的测试日志
    DELETE FROM ai_config_test_logs
    WHERE created_at < CURRENT_TIMESTAMP - (p_days_to_keep || ' days')::INTERVAL;

    GET DIAGNOSTICS affected_rows = ROW_COUNT;

    RETURN QUERY SELECT affected_rows;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_test_logs(INTEGER) IS '清理超过指定天数的测试日志记录';

-- ================================================
-- 7. 创建触发器：自动更新ai_configs的last_tested_at
-- ================================================
-- 首先添加last_tested_at字段到ai_configs表
ALTER TABLE ai_configs
ADD COLUMN IF NOT EXISTS last_tested_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_test_status VARCHAR(20);

COMMENT ON COLUMN ai_configs.last_tested_at IS '最后一次测试时间';
COMMENT ON COLUMN ai_configs.last_test_status IS '最后一次测试状态';

-- 创建触发器函数
CREATE OR REPLACE FUNCTION update_ai_config_last_tested()
RETURNS TRIGGER AS $$
BEGIN
    -- 更新ai_configs表的最后测试时间和状态
    UPDATE ai_configs
    SET
        last_tested_at = NEW.created_at,
        last_test_status = NEW.test_status,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.config_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS ai_config_test_log_trigger ON ai_config_test_logs;
CREATE TRIGGER ai_config_test_log_trigger
    AFTER INSERT ON ai_config_test_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_config_last_tested();

COMMENT ON FUNCTION update_ai_config_last_tested() IS '自动更新AI配置的最后测试时间和状态';

-- ================================================
-- 8. 授权
-- ================================================
GRANT ALL ON ai_config_test_logs TO app_user;
GRANT ALL ON ai_config_test_logs_id_seq TO app_user;
GRANT SELECT ON v_ai_config_test_stats TO app_user;

-- ================================================
-- Migration Complete
-- ================================================
-- 说明:
-- 1. 创建了ai_config_test_logs表用于存储测试日志
-- 2. 添加了相关索引优化查询性能
-- 3. 创建了测试统计视图
-- 4. 提供了获取最近测试记录的函数
-- 5. 提供了清理旧日志的函数
-- 6. 添加了自动更新最后测试时间的触发器
-- 7. ai_configs表新增了last_tested_at和last_test_status字段
--
-- 使用示例:
-- - 查看测试统计: SELECT * FROM v_ai_config_test_stats WHERE config_id = ?;
-- - 获取最近10条测试: SELECT * FROM get_recent_test_logs(?, 10);
-- - 清理90天前的日志: SELECT cleanup_old_test_logs(90);
--
