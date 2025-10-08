-- Migration: Add API key expiry and rotation fields
-- Author: Claude AI
-- Date: 2025-10-05
-- Description: 添加API密钥过期时间、轮换时间和历史版本字段,支持密钥轮换机制

-- ================================================
-- 1. 添加过期和轮换相关字段到 ai_configs 表
-- ================================================
ALTER TABLE ai_configs
ADD COLUMN IF NOT EXISTS api_key_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS api_key_created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS api_key_rotated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS api_key_rotation_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS api_key_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS expiry_warning_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS auto_rotate BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS rotation_interval_days INTEGER DEFAULT 90;

-- 添加注释
COMMENT ON COLUMN ai_configs.api_key_expires_at IS 'API密钥过期时间，NULL表示永不过期';
COMMENT ON COLUMN ai_configs.api_key_created_at IS 'API密钥创建时间';
COMMENT ON COLUMN ai_configs.api_key_rotated_at IS 'API密钥最后轮换时间';
COMMENT ON COLUMN ai_configs.api_key_rotation_count IS 'API密钥轮换次数';
COMMENT ON COLUMN ai_configs.api_key_version IS 'API密钥版本号，每次轮换递增';
COMMENT ON COLUMN ai_configs.expiry_warning_sent IS '是否已发送过期警告';
COMMENT ON COLUMN ai_configs.auto_rotate IS '是否启用自动轮换';
COMMENT ON COLUMN ai_configs.rotation_interval_days IS '轮换间隔天数(仅当auto_rotate=true时有效)';

-- ================================================
-- 2. 创建 API密钥轮换历史记录表
-- ================================================
CREATE TABLE IF NOT EXISTS ai_config_key_history (
    id SERIAL PRIMARY KEY,
    config_id INTEGER NOT NULL,
    provider VARCHAR(50) NOT NULL,
    api_key_hash VARCHAR(255) NOT NULL,
    api_key_version INTEGER NOT NULL,
    rotated_by INTEGER,
    rotation_reason VARCHAR(255),
    rotation_type VARCHAR(50) DEFAULT 'manual', -- manual, auto, expired, compromised
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_ai_config FOREIGN KEY (config_id)
        REFERENCES ai_configs(id) ON DELETE CASCADE,
    CONSTRAINT fk_rotated_by FOREIGN KEY (rotated_by)
        REFERENCES users(id) ON DELETE SET NULL
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_key_history_config_id ON ai_config_key_history(config_id);
CREATE INDEX IF NOT EXISTS idx_key_history_provider ON ai_config_key_history(provider);
CREATE INDEX IF NOT EXISTS idx_key_history_valid_from ON ai_config_key_history(valid_from);
CREATE INDEX IF NOT EXISTS idx_key_history_valid_until ON ai_config_key_history(valid_until);

-- 添加表注释
COMMENT ON TABLE ai_config_key_history IS 'AI配置API密钥轮换历史记录';
COMMENT ON COLUMN ai_config_key_history.rotation_type IS '轮换类型: manual(手动), auto(自动), expired(过期), compromised(泄露)';

-- ================================================
-- 3. 创建 API密钥过期提醒表
-- ================================================
CREATE TABLE IF NOT EXISTS ai_config_expiry_notifications (
    id SERIAL PRIMARY KEY,
    config_id INTEGER NOT NULL,
    provider VARCHAR(50) NOT NULL,
    notification_type VARCHAR(50) NOT NULL, -- warning, expired, rotated
    notification_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    days_until_expiry INTEGER,
    notified_users INTEGER[],
    notification_sent BOOLEAN DEFAULT FALSE,
    notification_error TEXT,

    CONSTRAINT fk_ai_config_notification FOREIGN KEY (config_id)
        REFERENCES ai_configs(id) ON DELETE CASCADE
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_expiry_notif_config_id ON ai_config_expiry_notifications(config_id);
CREATE INDEX IF NOT EXISTS idx_expiry_notif_type ON ai_config_expiry_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_expiry_notif_time ON ai_config_expiry_notifications(notification_time);

-- 添加表注释
COMMENT ON TABLE ai_config_expiry_notifications IS 'API密钥过期通知记录';
COMMENT ON COLUMN ai_config_expiry_notifications.notification_type IS '通知类型: warning(即将过期), expired(已过期), rotated(已轮换)';

-- ================================================
-- 4. 创建触发器：记录密钥轮换历史
-- ================================================
CREATE OR REPLACE FUNCTION record_api_key_rotation()
RETURNS TRIGGER AS $$
BEGIN
    -- 检测密钥是否发生变化
    IF OLD.api_key_hash IS DISTINCT FROM NEW.api_key_hash THEN
        -- 记录旧密钥到历史表
        INSERT INTO ai_config_key_history (
            config_id,
            provider,
            api_key_hash,
            api_key_version,
            rotated_by,
            rotation_type,
            valid_from,
            valid_until
        ) VALUES (
            OLD.id,
            OLD.provider,
            OLD.api_key_hash,
            OLD.api_key_version,
            NEW.updated_by,
            CASE
                WHEN NEW.api_key_expires_at IS NOT NULL AND NEW.api_key_expires_at < CURRENT_TIMESTAMP THEN 'expired'
                WHEN NEW.auto_rotate THEN 'auto'
                ELSE 'manual'
            END,
            COALESCE(OLD.api_key_created_at, OLD.created_at),
            CURRENT_TIMESTAMP
        );

        -- 更新轮换统计
        NEW.api_key_rotated_at := CURRENT_TIMESTAMP;
        NEW.api_key_rotation_count := COALESCE(OLD.api_key_rotation_count, 0) + 1;
        NEW.api_key_version := COALESCE(OLD.api_key_version, 1) + 1;
        NEW.api_key_created_at := CURRENT_TIMESTAMP;
        NEW.expiry_warning_sent := FALSE;

        -- 如果启用自动轮换，设置下次过期时间
        IF NEW.auto_rotate AND NEW.rotation_interval_days > 0 THEN
            NEW.api_key_expires_at := CURRENT_TIMESTAMP + (NEW.rotation_interval_days || ' days')::INTERVAL;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS ai_config_key_rotation_trigger ON ai_configs;
CREATE TRIGGER ai_config_key_rotation_trigger
    BEFORE UPDATE ON ai_configs
    FOR EACH ROW
    EXECUTE FUNCTION record_api_key_rotation();

-- ================================================
-- 5. 创建函数：检查过期的密钥
-- ================================================
CREATE OR REPLACE FUNCTION check_expired_api_keys()
RETURNS TABLE(
    config_id INTEGER,
    provider VARCHAR(50),
    days_until_expiry INTEGER,
    status VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        id,
        provider::VARCHAR(50),
        CASE
            WHEN api_key_expires_at IS NULL THEN NULL
            ELSE EXTRACT(DAY FROM (api_key_expires_at - CURRENT_TIMESTAMP))::INTEGER
        END AS days_until_expiry,
        CASE
            WHEN api_key_expires_at IS NULL THEN 'never_expires'
            WHEN api_key_expires_at < CURRENT_TIMESTAMP THEN 'expired'
            WHEN api_key_expires_at < CURRENT_TIMESTAMP + INTERVAL '7 days' THEN 'expiring_soon'
            WHEN api_key_expires_at < CURRENT_TIMESTAMP + INTERVAL '30 days' THEN 'expiring_later'
            ELSE 'valid'
        END AS status
    FROM ai_configs
    WHERE enabled = TRUE
    ORDER BY api_key_expires_at NULLS LAST;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_expired_api_keys() IS '检查所有API密钥的过期状态';

-- ================================================
-- 6. 创建函数：自动禁用过期的密钥
-- ================================================
CREATE OR REPLACE FUNCTION auto_disable_expired_keys()
RETURNS TABLE(
    disabled_count INTEGER
) AS $$
DECLARE
    affected_rows INTEGER;
BEGIN
    -- 禁用所有过期的配置
    UPDATE ai_configs
    SET
        enabled = FALSE,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = 1 -- 系统用户
    WHERE
        enabled = TRUE
        AND api_key_expires_at IS NOT NULL
        AND api_key_expires_at < CURRENT_TIMESTAMP;

    GET DIAGNOSTICS affected_rows = ROW_COUNT;

    -- 记录禁用通知
    INSERT INTO ai_config_expiry_notifications (
        config_id,
        provider,
        notification_type,
        days_until_expiry
    )
    SELECT
        id,
        provider,
        'expired',
        EXTRACT(DAY FROM (CURRENT_TIMESTAMP - api_key_expires_at))::INTEGER
    FROM ai_configs
    WHERE
        enabled = FALSE
        AND api_key_expires_at IS NOT NULL
        AND api_key_expires_at < CURRENT_TIMESTAMP
        AND NOT EXISTS (
            SELECT 1 FROM ai_config_expiry_notifications
            WHERE config_id = ai_configs.id
            AND notification_type = 'expired'
            AND notification_time > CURRENT_TIMESTAMP - INTERVAL '1 day'
        );

    RETURN QUERY SELECT affected_rows;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_disable_expired_keys() IS '自动禁用所有过期的API密钥';

-- ================================================
-- 7. 数据初始化：为现有记录设置默认值
-- ================================================
UPDATE ai_configs
SET
    api_key_created_at = COALESCE(api_key_created_at, created_at),
    api_key_version = COALESCE(api_key_version, 1),
    api_key_rotation_count = COALESCE(api_key_rotation_count, 0)
WHERE
    api_key_created_at IS NULL
    OR api_key_version IS NULL
    OR api_key_rotation_count IS NULL;

-- ================================================
-- 8. 创建视图：密钥状态概览
-- ================================================
CREATE OR REPLACE VIEW v_api_key_status AS
SELECT
    ac.id,
    ac.provider,
    ac.enabled,
    ac.api_key_created_at,
    ac.api_key_expires_at,
    ac.api_key_rotated_at,
    ac.api_key_rotation_count,
    ac.api_key_version,
    ac.auto_rotate,
    ac.rotation_interval_days,
    CASE
        WHEN ac.api_key_expires_at IS NULL THEN 'never_expires'
        WHEN ac.api_key_expires_at < CURRENT_TIMESTAMP THEN 'expired'
        WHEN ac.api_key_expires_at < CURRENT_TIMESTAMP + INTERVAL '7 days' THEN 'expiring_soon'
        WHEN ac.api_key_expires_at < CURRENT_TIMESTAMP + INTERVAL '30 days' THEN 'expiring_later'
        ELSE 'valid'
    END AS expiry_status,
    CASE
        WHEN ac.api_key_expires_at IS NULL THEN NULL
        ELSE EXTRACT(DAY FROM (ac.api_key_expires_at - CURRENT_TIMESTAMP))::INTEGER
    END AS days_until_expiry,
    (SELECT COUNT(*) FROM ai_config_key_history WHERE config_id = ac.id) AS total_rotations,
    (SELECT MAX(valid_until) FROM ai_config_key_history WHERE config_id = ac.id) AS last_rotation_time
FROM ai_configs ac;

COMMENT ON VIEW v_api_key_status IS 'API密钥状态概览视图';

-- ================================================
-- 9. 授权
-- ================================================
GRANT SELECT ON v_api_key_status TO app_user;
GRANT ALL ON ai_config_key_history TO app_user;
GRANT ALL ON ai_config_expiry_notifications TO app_user;
GRANT ALL ON ai_config_key_history_id_seq TO app_user;
GRANT ALL ON ai_config_expiry_notifications_id_seq TO app_user;

-- ================================================
-- Migration Complete
-- ================================================
-- 说明:
-- 1. 添加了密钥过期和轮换相关字段
-- 2. 创建了密钥轮换历史记录表
-- 3. 创建了过期通知表
-- 4. 添加了自动记录轮换历史的触发器
-- 5. 提供了检查过期密钥和自动禁用的函数
-- 6. 创建了密钥状态概览视图
--
-- 使用示例:
-- - 检查过期状态: SELECT * FROM check_expired_api_keys();
-- - 自动禁用过期: SELECT auto_disable_expired_keys();
-- - 查看密钥状态: SELECT * FROM v_api_key_status;
-- - 查看轮换历史: SELECT * FROM ai_config_key_history WHERE config_id = ?;
