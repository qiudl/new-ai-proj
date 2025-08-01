-- ===================================================================
-- 计时任务2.0系统数据库迁移脚本
-- 版本: 2.0
-- 日期: 2025-08-01
-- 目标: 实现用户隔离的个人计时任务系统
-- ===================================================================

BEGIN;

-- 1. 创建用户个人计时任务表
CREATE TABLE IF NOT EXISTS user_timer_tasks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'personal' CHECK (category IN ('personal', 'work', 'study', 'fitness', 'hobby')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
    color VARCHAR(7) DEFAULT '#1890ff', -- 十六进制颜色
    is_favorite BOOLEAN DEFAULT FALSE,
    total_time_seconds INTEGER DEFAULT 0,
    target_time_seconds INTEGER DEFAULT 0, -- 目标时间（可选）
    tags JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE NULL,
    
    -- 唯一性约束：同一用户下的任务标题不能重复（软删除除外）
    CONSTRAINT user_timer_tasks_user_title_unique UNIQUE(user_id, title)
);

-- 添加注释
COMMENT ON TABLE user_timer_tasks IS '用户个人计时任务表';
COMMENT ON COLUMN user_timer_tasks.user_id IS '用户ID';
COMMENT ON COLUMN user_timer_tasks.title IS '任务标题';
COMMENT ON COLUMN user_timer_tasks.description IS '任务描述';
COMMENT ON COLUMN user_timer_tasks.category IS '任务分类：personal, work, study, fitness, hobby';
COMMENT ON COLUMN user_timer_tasks.priority IS '优先级：low, medium, high';
COMMENT ON COLUMN user_timer_tasks.status IS '状态：active, paused, completed, archived';
COMMENT ON COLUMN user_timer_tasks.color IS '任务颜色（十六进制）';
COMMENT ON COLUMN user_timer_tasks.is_favorite IS '是否收藏';
COMMENT ON COLUMN user_timer_tasks.total_time_seconds IS '总计时时长（秒）';
COMMENT ON COLUMN user_timer_tasks.target_time_seconds IS '目标时长（秒，可选）';
COMMENT ON COLUMN user_timer_tasks.tags IS '标签数组（JSON）';
COMMENT ON COLUMN user_timer_tasks.metadata IS '扩展元数据（JSON）';

-- 2. 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_user_timer_tasks_user_id ON user_timer_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_timer_tasks_status ON user_timer_tasks(status);
CREATE INDEX IF NOT EXISTS idx_user_timer_tasks_category ON user_timer_tasks(category);
CREATE INDEX IF NOT EXISTS idx_user_timer_tasks_created_at ON user_timer_tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_timer_tasks_total_time ON user_timer_tasks(total_time_seconds DESC);
CREATE INDEX IF NOT EXISTS idx_user_timer_tasks_is_favorite ON user_timer_tasks(is_favorite) WHERE is_favorite = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_timer_tasks_deleted_at ON user_timer_tasks(deleted_at) WHERE deleted_at IS NOT NULL;

-- 3. 扩展task_time_logs表以支持个人计时任务
ALTER TABLE task_time_logs 
ADD COLUMN IF NOT EXISTS user_timer_task_id INTEGER REFERENCES user_timer_tasks(id) ON DELETE SET NULL;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_task_time_logs_user_timer_task_id ON task_time_logs(user_timer_task_id);

-- 4. 修改task_time_logs约束，允许关联项目任务或个人任务
-- 注意：需要先删除现有约束，然后添加新约束
DO $$
BEGIN
    -- 使task_id字段可为空
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'task_time_logs' 
        AND column_name = 'task_id' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE task_time_logs ALTER COLUMN task_id DROP NOT NULL;
    END IF;
    
    -- 添加检查约束：必须关联项目任务或个人任务之一
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_timer_task_association'
        AND table_name = 'task_time_logs'
    ) THEN
        ALTER TABLE task_time_logs ADD CONSTRAINT check_timer_task_association 
            CHECK ((task_id IS NOT NULL AND user_timer_task_id IS NULL) OR 
                   (task_id IS NULL AND user_timer_task_id IS NOT NULL));
    END IF;
END $$;

-- 5. 扩展users表支持个人计时任务状态
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS current_user_timer_task_id INTEGER REFERENCES user_timer_tasks(id) ON DELETE SET NULL;

-- 添加注释
COMMENT ON COLUMN users.current_user_timer_task_id IS '当前正在计时的个人任务ID';

-- 6. 创建自动更新个人任务总时间的触发器函数
CREATE OR REPLACE FUNCTION auto_update_user_timer_task_total_time()
RETURNS TRIGGER AS $$
DECLARE
    affected_task_id INTEGER;
BEGIN
    -- 确定受影响的个人任务ID
    affected_task_id := COALESCE(NEW.user_timer_task_id, OLD.user_timer_task_id);
    
    -- 如果关联的是个人任务，则更新总时间
    IF affected_task_id IS NOT NULL THEN
        UPDATE user_timer_tasks 
        SET 
            total_time_seconds = COALESCE((
                SELECT SUM(duration_seconds)
                FROM task_time_logs 
                WHERE user_timer_task_id = affected_task_id
            ), 0),
            updated_at = NOW()
        WHERE id = affected_task_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 7. 创建触发器（如果不存在）
DROP TRIGGER IF EXISTS trigger_auto_update_user_timer_task_total_time ON task_time_logs;
CREATE TRIGGER trigger_auto_update_user_timer_task_total_time
    AFTER INSERT OR UPDATE OR DELETE ON task_time_logs
    FOR EACH ROW
    EXECUTE FUNCTION auto_update_user_timer_task_total_time();

-- 8. 创建个人计时任务updated_at自动更新触发器
CREATE OR REPLACE FUNCTION update_user_timer_tasks_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_timer_tasks_update_updated_at ON user_timer_tasks;
CREATE TRIGGER trigger_user_timer_tasks_update_updated_at
    BEFORE UPDATE ON user_timer_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_user_timer_tasks_updated_at_column();

-- 9. 为现有用户创建默认个人计时任务
INSERT INTO user_timer_tasks (user_id, title, description, category, status, color)
SELECT DISTINCT 
    u.id,
    '我的默认任务',
    '系统自动创建的默认个人计时任务，您可以编辑或删除它',
    'personal',
    'active',
    '#52c41a'
FROM users u
WHERE u.id NOT IN (SELECT COALESCE(user_id, 0) FROM user_timer_tasks WHERE user_id IS NOT NULL);

-- 10. 创建个人计时数据统计函数
CREATE OR REPLACE FUNCTION get_user_timer_dashboard_stats(p_user_id INTEGER)
RETURNS TABLE (
    today_total_seconds INTEGER,
    today_sessions_count INTEGER,
    today_tasks_count INTEGER,
    week_total_seconds INTEGER,
    month_total_seconds INTEGER,
    favorite_tasks_count INTEGER,
    active_tasks_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        -- 今日统计
        COALESCE(SUM(CASE WHEN DATE(ttl.created_at) = CURRENT_DATE THEN ttl.duration_seconds END), 0)::INTEGER as today_total_seconds,
        COUNT(CASE WHEN DATE(ttl.created_at) = CURRENT_DATE THEN ttl.id END)::INTEGER as today_sessions_count,
        COUNT(DISTINCT CASE WHEN DATE(ttl.created_at) = CURRENT_DATE THEN ttl.user_timer_task_id END)::INTEGER as today_tasks_count,
        
        -- 本周统计
        COALESCE(SUM(CASE WHEN ttl.created_at >= date_trunc('week', CURRENT_DATE) THEN ttl.duration_seconds END), 0)::INTEGER as week_total_seconds,
        
        -- 本月统计
        COALESCE(SUM(CASE WHEN ttl.created_at >= date_trunc('month', CURRENT_DATE) THEN ttl.duration_seconds END), 0)::INTEGER as month_total_seconds,
        
        -- 收藏任务数
        COUNT(DISTINCT CASE WHEN utt.is_favorite = TRUE AND utt.status = 'active' THEN utt.id END)::INTEGER as favorite_tasks_count,
        
        -- 活跃任务数
        COUNT(DISTINCT CASE WHEN utt.status = 'active' THEN utt.id END)::INTEGER as active_tasks_count
        
    FROM user_timer_tasks utt
    LEFT JOIN task_time_logs ttl ON utt.id = ttl.user_timer_task_id
    WHERE utt.user_id = p_user_id 
      AND utt.deleted_at IS NULL
    GROUP BY utt.user_id;
END;
$$ LANGUAGE plpgsql;

-- 11. 创建获取个人计时历史的函数
CREATE OR REPLACE FUNCTION get_user_timer_sessions(
    p_user_id INTEGER,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    session_id INTEGER,
    task_type VARCHAR(10),
    task_id INTEGER,
    task_title VARCHAR(255),
    task_color VARCHAR(7),
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    session_date DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ttl.id as session_id,
        CASE 
            WHEN ttl.user_timer_task_id IS NOT NULL THEN 'personal'::VARCHAR(10)
            ELSE 'project'::VARCHAR(10)
        END as task_type,
        COALESCE(ttl.user_timer_task_id, ttl.task_id) as task_id,
        COALESCE(utt.title, t.title) as task_title,
        COALESCE(utt.color, '#1890ff'::VARCHAR(7)) as task_color,
        ttl.start_time,
        ttl.end_time,
        ttl.duration_seconds,
        DATE(ttl.start_time) as session_date
    FROM task_time_logs ttl
    LEFT JOIN user_timer_tasks utt ON ttl.user_timer_task_id = utt.id
    LEFT JOIN tasks t ON ttl.task_id = t.id
    WHERE ttl.user_id = p_user_id
      AND ttl.end_time IS NOT NULL
    ORDER BY ttl.start_time DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- 12. 创建数据一致性检查函数
CREATE OR REPLACE FUNCTION check_user_timer_tasks_consistency()
RETURNS TABLE (
    status TEXT,
    user_timer_task_count INTEGER,
    total_inconsistencies INTEGER,
    max_difference_seconds INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH task_consistency AS (
        SELECT 
            utt.id,
            utt.total_time_seconds,
            COALESCE(SUM(ttl.duration_seconds), 0) as logged_total,
            ABS(utt.total_time_seconds - COALESCE(SUM(ttl.duration_seconds), 0)) as difference
        FROM user_timer_tasks utt
        LEFT JOIN task_time_logs ttl ON utt.id = ttl.user_timer_task_id
        WHERE utt.deleted_at IS NULL
        GROUP BY utt.id, utt.total_time_seconds
    )
    SELECT 
        'User Timer Tasks Consistency Check'::TEXT as status,
        COUNT(*)::INTEGER as user_timer_task_count,
        COUNT(CASE WHEN total_time_seconds != logged_total THEN 1 END)::INTEGER as total_inconsistencies,
        MAX(difference)::INTEGER as max_difference_seconds
    FROM task_consistency;
END;
$$ LANGUAGE plpgsql;

-- 13. 创建用于向后兼容的视图
CREATE OR REPLACE VIEW v_user_timer_dashboard AS
SELECT 
    u.id as user_id,
    u.username,
    -- 当前计时状态
    CASE 
        WHEN u.timing_status = 'running' AND u.current_user_timer_task_id IS NOT NULL THEN 'personal'
        WHEN u.timing_status = 'running' AND u.current_timing_task_id IS NOT NULL THEN 'project'
        ELSE 'stopped'
    END as current_timer_type,
    
    -- 今日总计时时长（项目任务 + 个人任务）
    COALESCE(project_today.total_seconds, 0) + COALESCE(personal_today.total_seconds, 0) as today_total_seconds,
    
    -- 活跃的个人任务数量
    COALESCE(active_tasks.task_count, 0) as active_personal_tasks_count,
    
    -- 收藏任务数量
    COALESCE(favorite_tasks.task_count, 0) as favorite_tasks_count

FROM users u

-- 今日项目任务计时统计
LEFT JOIN (
    SELECT 
        ttl.user_id, 
        SUM(ttl.duration_seconds) as total_seconds
    FROM task_time_logs ttl
    WHERE ttl.task_id IS NOT NULL 
      AND DATE(ttl.created_at) = CURRENT_DATE
    GROUP BY ttl.user_id
) project_today ON u.id = project_today.user_id

-- 今日个人任务计时统计  
LEFT JOIN (
    SELECT 
        ttl.user_id, 
        SUM(ttl.duration_seconds) as total_seconds
    FROM task_time_logs ttl
    WHERE ttl.user_timer_task_id IS NOT NULL 
      AND DATE(ttl.created_at) = CURRENT_DATE
    GROUP BY ttl.user_id
) personal_today ON u.id = personal_today.user_id

-- 活跃个人任务统计
LEFT JOIN (
    SELECT 
        user_id, 
        COUNT(*) as task_count
    FROM user_timer_tasks 
    WHERE status = 'active' 
      AND deleted_at IS NULL
    GROUP BY user_id
) active_tasks ON u.id = active_tasks.user_id

-- 收藏任务统计
LEFT JOIN (
    SELECT 
        user_id, 
        COUNT(*) as task_count
    FROM user_timer_tasks 
    WHERE is_favorite = TRUE 
      AND status = 'active' 
      AND deleted_at IS NULL
    GROUP BY user_id
) favorite_tasks ON u.id = favorite_tasks.user_id;

-- 14. 插入示例数据（可选，用于开发测试）
DO $$
DECLARE
    sample_user_id INTEGER;
BEGIN
    -- 获取第一个用户ID作为示例
    SELECT id INTO sample_user_id FROM users LIMIT 1;
    
    IF sample_user_id IS NOT NULL THEN
        -- 插入示例个人计时任务
        INSERT INTO user_timer_tasks (user_id, title, description, category, priority, color, is_favorite, target_time_seconds, tags)
        SELECT sample_user_id, title, description, category, priority, color, is_favorite, target_time_seconds, tags::jsonb
        FROM (VALUES 
            ('深度学习研究', '学习深度学习相关理论和实践', 'study', 'high', '#1890ff', true, 180000, '["AI", "机器学习", "Python"]'),
            ('英语学习', '提升英语听说读写能力', 'study', 'medium', '#52c41a', true, 108000, '["英语", "学习"]'),
            ('晨跑锻炼', '每日晨跑健身', 'fitness', 'medium', '#faad14', false, 36000, '["健身", "跑步"]')
        ) AS t(title, description, category, priority, color, is_favorite, target_time_seconds, tags)
        WHERE NOT EXISTS (
            SELECT 1 FROM user_timer_tasks 
            WHERE user_id = sample_user_id AND user_timer_tasks.title = t.title
        );
    END IF;
END $$;

-- 15. 执行数据一致性检查
SELECT 'MIGRATION VALIDATION:' as phase, * FROM check_user_timer_tasks_consistency();

-- 显示迁移统计信息
SELECT 
    'MIGRATION SUMMARY:' as info,
    (SELECT COUNT(*) FROM user_timer_tasks) as total_user_timer_tasks,
    (SELECT COUNT(*) FROM user_timer_tasks WHERE status = 'active') as active_tasks,
    (SELECT COUNT(*) FROM user_timer_tasks WHERE is_favorite = true) as favorite_tasks,
    (SELECT COUNT(DISTINCT user_id) FROM user_timer_tasks) as users_with_tasks;

COMMIT;

-- 使用说明：
-- 1. 运行此脚本将创建个人计时任务系统的数据结构
-- 2. 现有的项目任务计时功能将继续正常工作  
-- 3. 每个用户将获得一个默认的个人计时任务
-- 4. 新的API可以管理个人计时任务和混合计时历史
-- 5. 所有触发器将自动维护数据一致性