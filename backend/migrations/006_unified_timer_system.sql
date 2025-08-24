-- 统一计时器系统数据库迁移脚本
-- 任务#242: 后端统一服务实现 - 数据库结构
-- 文件: 006_unified_timer_system.sql

-- ====================================================================
-- 1. 创建统一计时记录表 unified_timer_logs
-- ====================================================================

CREATE TABLE IF NOT EXISTS unified_timer_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 计时目标 (统一字段)
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('project_task', 'personal_task', 'quick_timer', 'pomodoro')),
    target_id INTEGER, -- 可为NULL (用于快速计时)
    target_title VARCHAR(500) NOT NULL,
    target_metadata JSONB DEFAULT '{}',
    
    -- 计时数据
    start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    actual_work_seconds INTEGER, -- 扣除暂停时间的实际工作时长
    
    -- 计时状态和控制
    status VARCHAR(20) NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'paused', 'completed', 'cancelled')),
    pause_count INTEGER DEFAULT 0,
    pause_total_seconds INTEGER DEFAULT 0,
    pause_events JSONB DEFAULT '[]', -- 暂停事件记录 [{"paused_at": "2025-01-01T10:00:00Z", "resumed_at": "2025-01-01T10:05:00Z", "duration": 300}]
    
    -- 分类和标签
    category VARCHAR(100),
    tags TEXT[] DEFAULT '{}',
    priority VARCHAR(10) CHECK (priority IN ('low', 'medium', 'high')),
    
    -- 上下文和环境
    description TEXT,
    work_location VARCHAR(200),
    mood VARCHAR(20) CHECK (mood IN ('focused', 'distracted', 'tired', 'energetic', 'neutral')),
    interruption_count INTEGER DEFAULT 0,
    
    -- 关联信息
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    parent_task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    template_id INTEGER, -- 引用计时模板 (稍后创建)
    
    -- 智能推断结果
    inference_confidence DECIMAL(3,2), -- 0.00-1.00
    inference_reasoning JSONB DEFAULT '[]', -- 推断依据 ["基于工作时间推断", "包含项目相关关键词"]
    user_feedback INTEGER CHECK (user_feedback IN (1, 2, 3, 4, 5)), -- 用户对推断结果的评分
    
    -- 元数据
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by INTEGER NOT NULL REFERENCES users(id),
    
    -- 数据来源和兼容性
    source_type VARCHAR(20) DEFAULT 'unified' CHECK (source_type IN ('unified', 'migrated_task', 'migrated_personal', 'imported')),
    legacy_task_time_log_id INTEGER, -- 迁移时的原始task_time_logs记录ID
    legacy_personal_timer_id INTEGER, -- 迁移时的原始个人计时器ID
    
    -- 性能字段
    search_vector tsvector -- 全文搜索向量
);

-- 添加表注释
COMMENT ON TABLE unified_timer_logs IS '统一计时记录表 - 整合项目任务计时和个人计时';
COMMENT ON COLUMN unified_timer_logs.target_type IS '计时目标类型: project_task(项目任务), personal_task(个人任务), quick_timer(快速计时), pomodoro(番茄钟)';
COMMENT ON COLUMN unified_timer_logs.target_metadata IS '目标元数据，存储额外的上下文信息';
COMMENT ON COLUMN unified_timer_logs.actual_work_seconds IS '实际工作时长(秒)，扣除暂停时间';
COMMENT ON COLUMN unified_timer_logs.pause_events IS '暂停事件记录，JSON数组格式';
COMMENT ON COLUMN unified_timer_logs.inference_confidence IS '智能推断置信度 0.00-1.00';
COMMENT ON COLUMN unified_timer_logs.user_feedback IS '用户对推断结果的评分 1-5分';

-- ====================================================================
-- 2. 创建计时模板表 timer_templates
-- ====================================================================

CREATE TABLE IF NOT EXISTS timer_templates (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 模板基本信息
    name VARCHAR(200) NOT NULL,
    description TEXT,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('project_task', 'personal_task', 'quick_timer', 'pomodoro')),
    
    -- 模板默认值
    default_title VARCHAR(500),
    default_category VARCHAR(100),
    default_duration_minutes INTEGER,
    default_tags TEXT[] DEFAULT '{}',
    default_metadata JSONB DEFAULT '{}',
    
    -- 模板行为设置
    auto_start BOOLEAN DEFAULT false,
    auto_break_reminder BOOLEAN DEFAULT false,
    break_duration_minutes INTEGER DEFAULT 5,
    daily_limit_hours INTEGER,
    
    -- 使用统计
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- 元数据
    is_system_template BOOLEAN DEFAULT false, -- 系统预设模板
    is_shared BOOLEAN DEFAULT false, -- 是否可被其他用户使用
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE timer_templates IS '计时模板表 - 用户自定义和系统预设的计时模板';

-- ====================================================================
-- 3. 创建用户计时偏好设置表 user_timer_preferences
-- ====================================================================

CREATE TABLE IF NOT EXISTS user_timer_preferences (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    
    -- 计时行为偏好
    default_category VARCHAR(100) DEFAULT '工作',
    auto_pause_on_idle BOOLEAN DEFAULT true,
    idle_threshold_minutes INTEGER DEFAULT 5,
    auto_stop_on_completion BOOLEAN DEFAULT false,
    
    -- 番茄钟设置
    pomodoro_work_minutes INTEGER DEFAULT 25,
    pomodoro_short_break_minutes INTEGER DEFAULT 5,
    pomodoro_long_break_minutes INTEGER DEFAULT 15,
    pomodoro_cycles_before_long_break INTEGER DEFAULT 4,
    
    -- 通知设置
    notification_enabled BOOLEAN DEFAULT true,
    sound_enabled BOOLEAN DEFAULT true,
    notification_minutes_before_end INTEGER DEFAULT 5,
    daily_goal_hours DECIMAL(4,2) DEFAULT 8.0,
    weekly_goal_hours DECIMAL(5,2) DEFAULT 40.0,
    
    -- UI偏好
    preferred_timer_view VARCHAR(20) DEFAULT 'normal' CHECK (preferred_timer_view IN ('compact', 'normal', 'expanded')),
    preferred_theme VARCHAR(10) DEFAULT 'auto' CHECK (preferred_theme IN ('light', 'dark', 'auto')),
    show_seconds BOOLEAN DEFAULT true,
    show_progress_bar BOOLEAN DEFAULT true,
    
    -- 智能推断设置
    enable_auto_inference BOOLEAN DEFAULT true,
    inference_feedback_frequency VARCHAR(20) DEFAULT 'sometimes' CHECK (inference_feedback_frequency IN ('always', 'sometimes', 'never')),
    learning_mode BOOLEAN DEFAULT true,
    
    -- 数据和隐私
    share_anonymous_data BOOLEAN DEFAULT false,
    backup_enabled BOOLEAN DEFAULT true,
    data_retention_days INTEGER DEFAULT 365,
    
    -- 元数据
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE user_timer_preferences IS '用户计时偏好设置表';

-- ====================================================================
-- 4. 扩展用户表，添加当前计时器字段
-- ====================================================================

DO $$ 
BEGIN
    -- 检查字段是否存在，如果不存在则添加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'current_timer_id'
    ) THEN
        ALTER TABLE users ADD COLUMN current_timer_id INTEGER REFERENCES unified_timer_logs(id) ON DELETE SET NULL;
        COMMENT ON COLUMN users.current_timer_id IS '当前活动的计时器ID';
    END IF;
END $$;

-- ====================================================================
-- 5. 创建性能优化索引
-- ====================================================================

-- 基础查询索引
CREATE INDEX IF NOT EXISTS idx_unified_timer_user_status ON unified_timer_logs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_unified_timer_target ON unified_timer_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_unified_timer_time_range ON unified_timer_logs(user_id, start_time DESC, end_time DESC);
CREATE INDEX IF NOT EXISTS idx_unified_timer_category ON unified_timer_logs(user_id, category);
CREATE INDEX IF NOT EXISTS idx_unified_timer_project ON unified_timer_logs(project_id) WHERE project_id IS NOT NULL;

-- JSONB字段索引
CREATE INDEX IF NOT EXISTS idx_unified_timer_tags ON unified_timer_logs USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_unified_timer_metadata ON unified_timer_logs USING GIN(target_metadata);
CREATE INDEX IF NOT EXISTS idx_unified_timer_search ON unified_timer_logs USING GIN(search_vector);

-- 时间模式分析索引（注意：在某些环境下，基于 timestamptz 的 EXTRACT 被标记为 STABLE，无法用于表达式索引）
-- 为兼容性，将创建包裹在 DO 块中，若数据库拒绝（如函数非 IMMUTABLE），则跳过并给出 NOTICE。
DO $$
BEGIN
  BEGIN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_unified_timer_time_analysis ON unified_timer_logs(
      user_id,
      EXTRACT(HOUR FROM start_time),
      EXTRACT(DOW FROM start_time),
      target_type
    ) WHERE status IN (''completed'',''cancelled'')';
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'Skip idx_unified_timer_time_analysis due to immutability constraints: %', SQLERRM;
  END;
END $$;

-- 模板相关索引
CREATE INDEX IF NOT EXISTS idx_timer_templates_user ON timer_templates(user_id, target_type);
CREATE INDEX IF NOT EXISTS idx_timer_templates_usage ON timer_templates(usage_count DESC, last_used_at DESC);

-- ====================================================================
-- 6. 创建触发器和存储函数
-- ====================================================================

-- 更新搜索向量的触发器函数
CREATE OR REPLACE FUNCTION update_timer_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('simple', COALESCE(NEW.target_title, '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('simple', COALESCE(NEW.category, '')), 'C') ||
        setweight(to_tsvector('simple', array_to_string(NEW.tags, ' ')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建搜索向量更新触发器
DROP TRIGGER IF EXISTS trig_update_timer_search_vector ON unified_timer_logs;
CREATE TRIGGER trig_update_timer_search_vector 
    BEFORE INSERT OR UPDATE ON unified_timer_logs
    FOR EACH ROW EXECUTE FUNCTION update_timer_search_vector();

-- 自动更新 updated_at 字段的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为相关表创建 updated_at 自动更新触发器
DROP TRIGGER IF EXISTS trig_update_unified_timer_logs_updated_at ON unified_timer_logs;
CREATE TRIGGER trig_update_unified_timer_logs_updated_at
    BEFORE UPDATE ON unified_timer_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trig_update_timer_templates_updated_at ON timer_templates;
CREATE TRIGGER trig_update_timer_templates_updated_at
    BEFORE UPDATE ON timer_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trig_update_user_timer_preferences_updated_at ON user_timer_preferences;
CREATE TRIGGER trig_update_user_timer_preferences_updated_at
    BEFORE UPDATE ON user_timer_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- 7. 创建数据分析视图
-- ====================================================================

-- 用户计时统计视图
CREATE OR REPLACE VIEW user_timer_stats AS
SELECT 
    utl.user_id,
    DATE_TRUNC('day', utl.start_time) as date,
    utl.target_type,
    utl.category,
    COUNT(*) as session_count,
    SUM(utl.duration_seconds) as total_seconds,
    SUM(utl.actual_work_seconds) as actual_work_seconds,
    AVG(utl.duration_seconds) as avg_duration_seconds,
    AVG(utl.actual_work_seconds) as avg_work_seconds,
    SUM(CASE WHEN utl.status = 'completed' THEN 1 ELSE 0 END) as completed_sessions,
    SUM(CASE WHEN utl.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_sessions,
    AVG(utl.pause_count) as avg_pause_count,
    AVG(CASE WHEN utl.duration_seconds > 0 THEN 
        CAST(utl.actual_work_seconds AS DECIMAL) / utl.duration_seconds * 100 
        ELSE 0 END) as efficiency_percentage
FROM unified_timer_logs utl
WHERE utl.start_time >= CURRENT_DATE - INTERVAL '90 days'
    AND utl.duration_seconds IS NOT NULL
GROUP BY utl.user_id, DATE_TRUNC('day', utl.start_time), utl.target_type, utl.category;

COMMENT ON VIEW user_timer_stats IS '用户计时统计视图 - 按日期、类型、分类聚合的统计数据';

-- 智能推断准确率视图
CREATE OR REPLACE VIEW inference_accuracy_stats AS
SELECT 
    utl.user_id,
    utl.target_type,
    COUNT(*) as total_inferences,
    COUNT(utl.user_feedback) as feedback_count,
    AVG(utl.inference_confidence) as avg_confidence,
    AVG(CASE WHEN utl.user_feedback >= 3 THEN 1.0 ELSE 0.0 END) as accuracy_rate,
    SUM(CASE WHEN utl.user_feedback = 5 THEN 1 ELSE 0 END) as excellent_count,
    SUM(CASE WHEN utl.user_feedback <= 2 THEN 1 ELSE 0 END) as poor_count
FROM unified_timer_logs utl
WHERE utl.inference_confidence IS NOT NULL
    AND utl.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY utl.user_id, utl.target_type
HAVING COUNT(*) >= 5; -- 至少5个样本

COMMENT ON VIEW inference_accuracy_stats IS '智能推断准确率统计视图';

-- ====================================================================
-- 8. 插入系统预设模板数据
-- ====================================================================

-- 首先确保有一个系统用户（ID=1），如果没有则创建
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = 1) THEN
    INSERT INTO users (id, username, password_hash, email, role, user_type)
    VALUES (1, 'system', '$2a$10$dummy.hash', 'system@internal', 'admin', 'system');
  END IF;
END $$;

-- 插入系统预设模板
DO $$
BEGIN
  PERFORM 1 FROM timer_templates WHERE user_id=1 AND name='番茄工作法';
  IF NOT FOUND THEN
    INSERT INTO timer_templates (user_id, name, description, target_type, default_title, default_category, default_duration_minutes, is_system_template, is_shared)
    VALUES (1, '番茄工作法', '25分钟专注工作，5分钟休息的经典时间管理方法', 'pomodoro', '番茄钟工作', '专注', 25, true, true);
  END IF;

  PERFORM 1 FROM timer_templates WHERE user_id=1 AND name='深度工作';
  IF NOT FOUND THEN
    INSERT INTO timer_templates (user_id, name, description, target_type, default_title, default_category, default_duration_minutes, is_system_template, is_shared)
    VALUES (1, '深度工作', '90分钟深度专注工作时间，适合复杂任务', 'personal_task', '深度工作时间', '专注', 90, true, true);
  END IF;

  PERFORM 1 FROM timer_templates WHERE user_id=1 AND name='快速任务';
  IF NOT FOUND THEN
    INSERT INTO timer_templates (user_id, name, description, target_type, default_title, default_category, default_duration_minutes, is_system_template, is_shared)
    VALUES (1, '快速任务', '15分钟内完成的小任务或临时工作', 'quick_timer', '快速任务', '日常', 15, true, true);
  END IF;

  PERFORM 1 FROM timer_templates WHERE user_id=1 AND name='学习时间';
  IF NOT FOUND THEN
    INSERT INTO timer_templates (user_id, name, description, target_type, default_title, default_category, default_duration_minutes, is_system_template, is_shared)
    VALUES (1, '学习时间', '专门的学习和技能提升时间', 'personal_task', '学习时间', '学习', 60, true, true);
  END IF;

  PERFORM 1 FROM timer_templates WHERE user_id=1 AND name='会议时间';
  IF NOT FOUND THEN
    INSERT INTO timer_templates (user_id, name, description, target_type, default_title, default_category, default_duration_minutes, is_system_template, is_shared)
    VALUES (1, '会议时间', '各类会议和沟通协调时间', 'personal_task', '会议', '沟通', 30, true, true);
  END IF;

  PERFORM 1 FROM timer_templates WHERE user_id=1 AND name='代码开发';
  IF NOT FOUND THEN
    INSERT INTO timer_templates (user_id, name, description, target_type, default_title, default_category, default_duration_minutes, is_system_template, is_shared)
    VALUES (1, '代码开发', '软件开发和编程相关的工作时间', 'project_task', '代码开发', '开发', 120, true, true);
  END IF;

  PERFORM 1 FROM timer_templates WHERE user_id=1 AND name='文档编写';
  IF NOT FOUND THEN
    INSERT INTO timer_templates (user_id, name, description, target_type, default_title, default_category, default_duration_minutes, is_system_template, is_shared)
    VALUES (1, '文档编写', '文档、报告、方案等写作时间', 'personal_task', '文档编写', '写作', 45, true, true);
  END IF;

  PERFORM 1 FROM timer_templates WHERE user_id=1 AND name='测试调试';
  IF NOT FOUND THEN
    INSERT INTO timer_templates (user_id, name, description, target_type, default_title, default_category, default_duration_minutes, is_system_template, is_shared)
    VALUES (1, '测试调试', '软件测试、调试和质量保证时间', 'project_task', '测试调试', '测试', 60, true, true);
  END IF;

  PERFORM 1 FROM timer_templates WHERE user_id=1 AND name='休息放松';
  IF NOT FOUND THEN
    INSERT INTO timer_templates (user_id, name, description, target_type, default_title, default_category, default_duration_minutes, is_system_template, is_shared)
    VALUES (1, '休息放松', '短暂休息和放松时间', 'quick_timer', '休息时间', '休息', 10, true, true);
  END IF;

  PERFORM 1 FROM timer_templates WHERE user_id=1 AND name='邮件处理';
  IF NOT FOUND THEN
    INSERT INTO timer_templates (user_id, name, description, target_type, default_title, default_category, default_duration_minutes, is_system_template, is_shared)
    VALUES (1, '邮件处理', '处理邮件和消息的专门时间', 'personal_task', '邮件处理', '沟通', 20, true, true);
  END IF;
END $$;

-- ====================================================================
-- 9. 创建数据完整性约束
-- ====================================================================

-- 确保计时器有结束时间时必须有时长（如已存在则跳过）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_timer_duration' AND conrelid = 'unified_timer_logs'::regclass
  ) THEN
    ALTER TABLE unified_timer_logs 
    ADD CONSTRAINT chk_timer_duration 
    CHECK (
        (end_time IS NULL AND duration_seconds IS NULL) OR
        (end_time IS NOT NULL AND duration_seconds IS NOT NULL AND duration_seconds >= 0)
    );
  END IF;
END $$;

-- 确保实际工作时长不超过总时长（如已存在则跳过）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_actual_work_duration' AND conrelid = 'unified_timer_logs'::regclass
  ) THEN
    ALTER TABLE unified_timer_logs 
    ADD CONSTRAINT chk_actual_work_duration 
    CHECK (
        actual_work_seconds IS NULL OR 
        duration_seconds IS NULL OR 
        actual_work_seconds <= duration_seconds
    );
  END IF;
END $$;

-- 确保暂停总时长不超过总时长（如已存在则跳过）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_pause_total_duration' AND conrelid = 'unified_timer_logs'::regclass
  ) THEN
    ALTER TABLE unified_timer_logs 
    ADD CONSTRAINT chk_pause_total_duration 
    CHECK (
        pause_total_seconds IS NULL OR 
        duration_seconds IS NULL OR 
        pause_total_seconds <= duration_seconds
    );
  END IF;
END $$;

-- 确保推断置信度在有效范围内（如已存在则跳过）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_inference_confidence' AND conrelid = 'unified_timer_logs'::regclass
  ) THEN
    ALTER TABLE unified_timer_logs 
    ADD CONSTRAINT chk_inference_confidence 
    CHECK (
        inference_confidence IS NULL OR 
        (inference_confidence >= 0.0 AND inference_confidence <= 1.0)
    );
  END IF;
END $$;

-- ====================================================================
-- 10. 创建数据迁移辅助函数 (为下一步数据迁移做准备)
-- ====================================================================

-- 检查旧计时系统表是否存在
CREATE OR REPLACE FUNCTION check_legacy_timer_tables()
RETURNS TABLE(
    has_task_time_logs BOOLEAN,
    task_logs_count INTEGER,
    has_personal_timers BOOLEAN,
    personal_timers_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'task_time_logs') as has_task_time_logs,
        COALESCE((SELECT COUNT(*) FROM task_time_logs), 0)::INTEGER as task_logs_count,
        EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'personal_timer_tasks') as has_personal_timers,
        COALESCE((SELECT COUNT(*) FROM personal_timer_tasks), 0)::INTEGER as personal_timers_count;
END;
$$ LANGUAGE plpgsql;

-- 预览数据迁移统计
CREATE OR REPLACE FUNCTION preview_migration_stats()
RETURNS TABLE(
    table_name TEXT,
    record_count INTEGER,
    latest_record TIMESTAMP WITH TIME ZONE,
    migration_ready BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'task_time_logs'::TEXT,
        COALESCE((SELECT COUNT(*) FROM task_time_logs), 0)::INTEGER,
        COALESCE((SELECT MAX(created_at) FROM task_time_logs), NULL),
        EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'task_time_logs')
    UNION ALL
    SELECT 
        'personal_timer_tasks'::TEXT,
        COALESCE((SELECT COUNT(*) FROM personal_timer_tasks), 0)::INTEGER,
        COALESCE((SELECT MAX(created_at) FROM personal_timer_tasks), NULL),
        EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'personal_timer_tasks');
END;
$$ LANGUAGE plpgsql;

-- ====================================================================
-- 迁移脚本完成
-- ====================================================================

-- 输出迁移完成信息
DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE '统一计时器系统数据库迁移完成';
    RAISE NOTICE '============================================';
    RAISE NOTICE '创建的表:';
    RAISE NOTICE '  - unified_timer_logs (统一计时记录表)';
    RAISE NOTICE '  - timer_templates (计时模板表)';
    RAISE NOTICE '  - user_timer_preferences (用户偏好设置表)';
    RAISE NOTICE '创建的视图:';
    RAISE NOTICE '  - user_timer_stats (用户计时统计)';
    RAISE NOTICE '  - inference_accuracy_stats (推断准确率统计)';
    RAISE NOTICE '插入的数据:';
    RAISE NOTICE '  - 10个系统预设计时模板';
    RAISE NOTICE '创建的索引: 8个高性能查询索引';
    RAISE NOTICE '创建的约束: 5个数据完整性约束';
    RAISE NOTICE '============================================';
    RAISE NOTICE '下一步: 执行数据迁移脚本';
    RAISE NOTICE '============================================';
END $$;