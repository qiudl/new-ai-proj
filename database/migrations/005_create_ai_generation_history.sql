-- AI任务生成历史记录表
CREATE TABLE IF NOT EXISTS ai_task_generation_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('openai', 'claude', 'deepseek')),
    input_text TEXT NOT NULL,
    generated_tasks JSONB NOT NULL DEFAULT '[]',
    token_usage JSONB DEFAULT '{}',
    quality_metrics JSONB DEFAULT '{}',
    processing_time_ms INTEGER DEFAULT 0,
    success BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    imported_task_ids JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 为AI任务生成历史表创建索引
CREATE INDEX IF NOT EXISTS idx_ai_generation_history_user_id ON ai_task_generation_history (user_id);
CREATE INDEX IF NOT EXISTS idx_ai_generation_history_project_id ON ai_task_generation_history (project_id);
CREATE INDEX IF NOT EXISTS idx_ai_generation_history_provider ON ai_task_generation_history (provider);
CREATE INDEX IF NOT EXISTS idx_ai_generation_history_created_at ON ai_task_generation_history (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_generation_history_success ON ai_task_generation_history (success);

-- AI使用统计表
CREATE TABLE IF NOT EXISTS ai_usage_stats (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('openai', 'claude', 'deepseek')),
    operation_type VARCHAR(50) NOT NULL DEFAULT 'generate',
    usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
    request_count INTEGER DEFAULT 0,
    token_count INTEGER DEFAULT 0,
    cost_amount DECIMAL(10,6) DEFAULT 0.0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 唯一约束：每个用户每天每个提供商每种操作类型只有一条记录
    UNIQUE(user_id, project_id, provider, operation_type, usage_date)
);

-- 为AI使用统计表创建索引
CREATE INDEX IF NOT EXISTS idx_ai_usage_stats_user_id ON ai_usage_stats (user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_stats_project_id ON ai_usage_stats (project_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_stats_provider ON ai_usage_stats (provider);
CREATE INDEX IF NOT EXISTS idx_ai_usage_stats_usage_date ON ai_usage_stats (usage_date DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_stats_composite ON ai_usage_stats (user_id, provider, usage_date);

-- AI成本预算表
CREATE TABLE IF NOT EXISTS ai_cost_budgets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    provider VARCHAR(20) CHECK (provider IN ('openai', 'claude', 'deepseek')), -- NULL 表示所有提供商
    budget_type VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (budget_type IN ('daily', 'weekly', 'monthly', 'yearly')),
    budget_amount DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    current_usage DECIMAL(10,6) DEFAULT 0.0,
    alert_threshold DECIMAL(3,2) DEFAULT 0.8, -- 80% 时警告
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 唯一约束
    UNIQUE(user_id, project_id, provider, budget_type)
);

-- 为AI成本预算表创建索引
CREATE INDEX IF NOT EXISTS idx_ai_cost_budgets_user_id ON ai_cost_budgets (user_id);
CREATE INDEX IF NOT EXISTS idx_ai_cost_budgets_project_id ON ai_cost_budgets (project_id);
CREATE INDEX IF NOT EXISTS idx_ai_cost_budgets_enabled ON ai_cost_budgets (is_enabled);

-- 更新时间戳触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为表添加触发器
CREATE TRIGGER update_ai_task_generation_history_updated_at 
    BEFORE UPDATE ON ai_task_generation_history 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_usage_stats_updated_at 
    BEFORE UPDATE ON ai_usage_stats 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_cost_budgets_updated_at 
    BEFORE UPDATE ON ai_cost_budgets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 创建视图：用户AI使用概览
CREATE OR REPLACE VIEW user_ai_usage_overview AS
SELECT 
    u.id AS user_id,
    u.username,
    COUNT(DISTINCT h.id) AS total_generations,
    COUNT(DISTINCT CASE WHEN h.success = true THEN h.id END) AS successful_generations,
    SUM(COALESCE((h.token_usage->>'total_tokens')::integer, 0)) AS total_tokens_used,
    SUM(s.cost_amount) AS total_cost,
    COUNT(DISTINCT h.project_id) AS projects_used,
    h.provider,
    MAX(h.created_at) AS last_generation_at
FROM users u
LEFT JOIN ai_task_generation_history h ON u.id = h.user_id
LEFT JOIN ai_usage_stats s ON u.id = s.user_id AND h.provider = s.provider::text
GROUP BY u.id, u.username, h.provider;

-- 创建视图：项目AI使用统计
CREATE OR REPLACE VIEW project_ai_usage_stats AS
SELECT 
    p.id AS project_id,
    p.name AS project_name,
    h.provider,
    COUNT(h.id) AS generation_count,
    COUNT(CASE WHEN h.success = true THEN 1 END) AS success_count,
    AVG(h.processing_time_ms) AS avg_processing_time,
    SUM(COALESCE((h.token_usage->>'total_tokens')::integer, 0)) AS total_tokens,
    SUM(COALESCE(s.cost_amount, 0)) AS total_cost,
    MAX(h.created_at) AS last_generation_at,
    MIN(h.created_at) AS first_generation_at
FROM projects p
LEFT JOIN ai_task_generation_history h ON p.id = h.project_id
LEFT JOIN ai_usage_stats s ON p.id = s.project_id AND h.provider = s.provider::text
WHERE h.id IS NOT NULL
GROUP BY p.id, p.name, h.provider;

-- 插入默认预算配置
INSERT INTO ai_cost_budgets (user_id, budget_type, budget_amount, alert_threshold, is_enabled)
SELECT 
    id, 
    'monthly', 
    100.00, 
    0.8, 
    true
FROM users 
WHERE role = 'admin'
ON CONFLICT (user_id, project_id, provider, budget_type) DO NOTHING;

-- 创建存储过程：记录AI使用统计
CREATE OR REPLACE FUNCTION record_ai_usage(
    p_user_id INTEGER,
    p_project_id INTEGER,
    p_provider VARCHAR(20),
    p_operation_type VARCHAR(50),
    p_token_count INTEGER DEFAULT 0,
    p_cost_amount DECIMAL(10,6) DEFAULT 0.0,
    p_success BOOLEAN DEFAULT TRUE
) RETURNS VOID AS $$
BEGIN
    INSERT INTO ai_usage_stats (
        user_id, project_id, provider, operation_type, usage_date,
        request_count, token_count, cost_amount, success_count, failure_count
    ) VALUES (
        p_user_id, p_project_id, p_provider, p_operation_type, CURRENT_DATE,
        1, p_token_count, p_cost_amount,
        CASE WHEN p_success THEN 1 ELSE 0 END,
        CASE WHEN p_success THEN 0 ELSE 1 END
    )
    ON CONFLICT (user_id, project_id, provider, operation_type, usage_date)
    DO UPDATE SET
        request_count = ai_usage_stats.request_count + 1,
        token_count = ai_usage_stats.token_count + p_token_count,
        cost_amount = ai_usage_stats.cost_amount + p_cost_amount,
        success_count = ai_usage_stats.success_count + CASE WHEN p_success THEN 1 ELSE 0 END,
        failure_count = ai_usage_stats.failure_count + CASE WHEN p_success THEN 0 ELSE 1 END,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- 创建存储过程：检查预算限制
CREATE OR REPLACE FUNCTION check_budget_limit(
    p_user_id INTEGER,
    p_project_id INTEGER DEFAULT NULL,
    p_provider VARCHAR(20) DEFAULT NULL,
    p_budget_type VARCHAR(20) DEFAULT 'monthly'
) RETURNS TABLE (
    exceeded BOOLEAN,
    current_usage DECIMAL(10,6),
    budget_amount DECIMAL(10,2),
    usage_percentage DECIMAL(5,2)
) AS $$
DECLARE
    v_current_usage DECIMAL(10,6) := 0;
    v_budget_amount DECIMAL(10,2) := 0;
    v_usage_percentage DECIMAL(5,2) := 0;
    v_exceeded BOOLEAN := FALSE;
    v_date_filter DATE;
BEGIN
    -- 计算日期过滤条件
    CASE p_budget_type
        WHEN 'daily' THEN v_date_filter := CURRENT_DATE;
        WHEN 'weekly' THEN v_date_filter := CURRENT_DATE - INTERVAL '7 days';
        WHEN 'monthly' THEN v_date_filter := CURRENT_DATE - INTERVAL '1 month';
        WHEN 'yearly' THEN v_date_filter := CURRENT_DATE - INTERVAL '1 year';
    END CASE;
    
    -- 获取当前使用量
    SELECT COALESCE(SUM(s.cost_amount), 0)
    INTO v_current_usage
    FROM ai_usage_stats s
    WHERE s.user_id = p_user_id
      AND (p_project_id IS NULL OR s.project_id = p_project_id)
      AND (p_provider IS NULL OR s.provider = p_provider)
      AND s.usage_date >= v_date_filter;
    
    -- 获取预算限制
    SELECT COALESCE(b.budget_amount, 0)
    INTO v_budget_amount
    FROM ai_cost_budgets b
    WHERE b.user_id = p_user_id
      AND (p_project_id IS NULL OR b.project_id = p_project_id OR b.project_id IS NULL)
      AND (p_provider IS NULL OR b.provider = p_provider OR b.provider IS NULL)
      AND b.budget_type = p_budget_type
      AND b.is_enabled = TRUE
    ORDER BY 
        CASE WHEN b.project_id IS NOT NULL THEN 1 ELSE 2 END,
        CASE WHEN b.provider IS NOT NULL THEN 1 ELSE 2 END
    LIMIT 1;
    
    -- 计算使用百分比
    IF v_budget_amount > 0 THEN
        v_usage_percentage := (v_current_usage / v_budget_amount * 100);
        v_exceeded := v_current_usage >= v_budget_amount;
    END IF;
    
    RETURN QUERY SELECT v_exceeded, v_current_usage, v_budget_amount, v_usage_percentage;
END;
$$ LANGUAGE plpgsql;