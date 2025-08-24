-- PostgreSQL 生产环境初始化脚本
-- 用于腾讯云生产环境部署

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 创建生产环境用户(如果需要额外用户)
-- CREATE USER api_user WITH PASSWORD 'secure_api_password';
-- GRANT CONNECT ON DATABASE ai_project_prod_db TO api_user;

-- 创建schema
CREATE SCHEMA IF NOT EXISTS public;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS analytics;

-- 设置搜索路径
ALTER DATABASE ai_project_prod_db SET search_path TO public, audit, analytics;

-- 创建基础表（示例，实际表结构应该通过migration处理）
-- 这里只创建必要的系统表

-- 审计日志表
CREATE TABLE IF NOT EXISTS audit.audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    request_body JSONB,
    response_status INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX (created_at),
    INDEX (user_id),
    INDEX (action)
);

-- 系统配置表
CREATE TABLE IF NOT EXISTS public.system_configs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插入默认系统配置
INSERT INTO public.system_configs (config_key, config_value, description, is_public) VALUES
('app_version', '"1.0.0"', '应用版本号', true),
('maintenance_mode', 'false', '维护模式开关', true),
('max_upload_size', '52428800', '最大上传文件大小(字节)', true),
('session_timeout', '3600', '会话超时时间(秒)', false)
ON CONFLICT (config_key) DO NOTHING;

-- 性能优化设置
-- 创建索引
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON audit.audit_logs(user_id, action);

-- 设置表空间和分区（如果需要）
-- 这部分需要根据实际数据量和性能需求调整

-- 创建清理函数（清理旧的审计日志）
CREATE OR REPLACE FUNCTION audit.cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM audit.audit_logs 
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- 授权设置
GRANT USAGE ON SCHEMA public TO PUBLIC;
GRANT USAGE ON SCHEMA audit TO PUBLIC;
GRANT USAGE ON SCHEMA analytics TO PUBLIC;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO PUBLIC;
GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA audit TO PUBLIC;
GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO PUBLIC;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO PUBLIC;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA audit TO PUBLIC;

-- 设置默认权限
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA audit GRANT SELECT, INSERT ON TABLES TO PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA analytics GRANT SELECT ON TABLES TO PUBLIC;

-- 创建监控视图
CREATE OR REPLACE VIEW analytics.daily_stats AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_requests,
    COUNT(DISTINCT user_id) as unique_users,
    AVG(CASE WHEN response_status BETWEEN 200 AND 299 THEN 1 ELSE 0 END) as success_rate
FROM audit.audit_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 输出初始化完成信息
DO $$
BEGIN
    RAISE NOTICE '生产环境数据库初始化完成';
    RAISE NOTICE '数据库: %', current_database();
    RAISE NOTICE '用户: %', current_user;
    RAISE NOTICE '时间: %', NOW();
END $$;