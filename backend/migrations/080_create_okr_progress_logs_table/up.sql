-- 创建 OKR 进度日志表 (审计跟踪)
CREATE TABLE IF NOT EXISTS okr_progress_logs (
    id SERIAL PRIMARY KEY,
    objective_id INTEGER,
    key_result_id INTEGER,
    user_id INTEGER NOT NULL,
    change_type VARCHAR(20) NOT NULL DEFAULT 'manual',
    field_name VARCHAR(50) NOT NULL,
    previous_value TEXT,
    new_value TEXT,
    reason TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 外键约束
    CONSTRAINT fk_progress_log_objective FOREIGN KEY (objective_id) REFERENCES okr_objectives(id) ON DELETE CASCADE,
    CONSTRAINT fk_progress_log_key_result FOREIGN KEY (key_result_id) REFERENCES okr_key_results(id) ON DELETE CASCADE,
    CONSTRAINT fk_progress_log_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- 检查约束：必须关联到目标或关键结果之一
    CONSTRAINT chk_progress_log_target CHECK (
        (objective_id IS NOT NULL AND key_result_id IS NULL) OR
        (objective_id IS NULL AND key_result_id IS NOT NULL)
    ),
    
    -- 检查约束：变更类型限制
    CONSTRAINT chk_change_type CHECK (change_type IN ('manual', 'auto', 'sync', 'system', 'import'))
);

-- 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_progress_logs_objective_id ON okr_progress_logs(objective_id, created_at DESC) WHERE objective_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_progress_logs_key_result_id ON okr_progress_logs(key_result_id, created_at DESC) WHERE key_result_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_progress_logs_user_id ON okr_progress_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_progress_logs_change_type ON okr_progress_logs(change_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_progress_logs_field_name ON okr_progress_logs(field_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_progress_logs_created_at ON okr_progress_logs(created_at DESC);

-- 创建复合索引用于常见查询
CREATE INDEX IF NOT EXISTS idx_progress_logs_target_date ON okr_progress_logs(
    COALESCE(objective_id, key_result_id), created_at DESC
);

-- 插入测试数据 (基于现有 OKR 数据)
INSERT INTO okr_progress_logs (objective_id, user_id, change_type, field_name, previous_value, new_value, reason)
SELECT 
    id as objective_id,
    COALESCE(assignee_id, created_by, 1) as user_id,
    'system' as change_type,
    'status' as field_name,
    'draft' as previous_value,
    status as new_value,
    '系统初始化日志 - 目标创建' as reason
FROM okr_objectives 
WHERE deleted_at IS NULL
LIMIT 10;

INSERT INTO okr_progress_logs (key_result_id, user_id, change_type, field_name, previous_value, new_value, reason)
SELECT 
    kr.id as key_result_id,
    COALESCE(obj.assignee_id, obj.created_by, 1) as user_id,
    'system' as change_type,
    'current_value' as field_name,
    '0' as previous_value,
    COALESCE(kr.current_value::text, '0') as new_value,
    '系统初始化日志 - 关键结果创建' as reason
FROM okr_key_results kr
LEFT JOIN okr_objectives obj ON kr.objective_id = obj.id
WHERE kr.deleted_at IS NULL
LIMIT 15;

-- 添加表和字段注释
COMMENT ON TABLE okr_progress_logs IS 'OKR进度变更审计日志表 - 记录所有目标和关键结果的变更历史';
COMMENT ON COLUMN okr_progress_logs.objective_id IS '关联的目标ID (与key_result_id二选一)';
COMMENT ON COLUMN okr_progress_logs.key_result_id IS '关联的关键结果ID (与objective_id二选一)';
COMMENT ON COLUMN okr_progress_logs.user_id IS '执行变更的用户ID';
COMMENT ON COLUMN okr_progress_logs.change_type IS '变更类型: manual(手动), auto(自动), sync(同步), system(系统), import(导入)';
COMMENT ON COLUMN okr_progress_logs.field_name IS '变更的字段名称';
COMMENT ON COLUMN okr_progress_logs.previous_value IS '变更前的值 (JSON格式存储复杂数据)';
COMMENT ON COLUMN okr_progress_logs.new_value IS '变更后的值 (JSON格式存储复杂数据)';
COMMENT ON COLUMN okr_progress_logs.reason IS '变更原因或备注';
COMMENT ON COLUMN okr_progress_logs.ip_address IS '操作者IP地址';
COMMENT ON COLUMN okr_progress_logs.user_agent IS '操作者浏览器信息';

-- 创建用于记录变更的函数
CREATE OR REPLACE FUNCTION log_okr_change(
    p_objective_id INTEGER,
    p_key_result_id INTEGER,
    p_user_id INTEGER,
    p_change_type VARCHAR(20),
    p_field_name VARCHAR(50),
    p_previous_value TEXT,
    p_new_value TEXT,
    p_reason TEXT,
    p_ip_address INET,
    p_user_agent TEXT
) RETURNS INTEGER AS $$
DECLARE
    log_id INTEGER;
BEGIN
    INSERT INTO okr_progress_logs (
        objective_id, key_result_id, user_id, change_type, 
        field_name, previous_value, new_value, reason,
        ip_address, user_agent
    ) VALUES (
        p_objective_id, p_key_result_id, p_user_id, p_change_type,
        p_field_name, p_previous_value, p_new_value, p_reason,
        p_ip_address, p_user_agent
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION log_okr_change IS '记录OKR变更日志的便捷函数';