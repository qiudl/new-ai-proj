-- Migration: 021_flexible_time_management.sql
-- Description: 完善任务时间管理系统，支持灵活的时间单位（天、小时、分钟）
-- Date: 2025-08-20
-- Author: Claude AI Assistant

BEGIN;

-- ========================================
-- 第一部分：扩展tasks表的时间字段
-- ========================================

-- 添加新的精确时间字段
ALTER TABLE tasks 
ADD COLUMN start_datetime TIMESTAMP WITH TIME ZONE,           -- 开始时间（精确到分钟）
ADD COLUMN due_datetime TIMESTAMP WITH TIME ZONE,             -- 截止时间（精确到分钟）
ADD COLUMN estimated_minutes INTEGER DEFAULT 0,               -- 预估用时（分钟）
ADD COLUMN actual_minutes INTEGER DEFAULT 0,                  -- 实际用时（分钟）
ADD COLUMN time_unit_preference VARCHAR(10) DEFAULT 'auto',   -- 显示单位偏好
ADD COLUMN work_hours_per_day NUMERIC(4,2) DEFAULT 8.0,      -- 每日工作小时数
ADD COLUMN time_tracking_mode VARCHAR(20) DEFAULT 'manual';   -- 时间追踪模式

-- 添加约束检查
ALTER TABLE tasks 
ADD CONSTRAINT check_estimated_minutes CHECK (estimated_minutes >= 0),
ADD CONSTRAINT check_actual_minutes CHECK (actual_minutes >= 0),
ADD CONSTRAINT check_time_unit_preference CHECK (time_unit_preference IN ('auto', 'minutes', 'hours', 'days')),
ADD CONSTRAINT check_work_hours_per_day CHECK (work_hours_per_day > 0 AND work_hours_per_day <= 24),
ADD CONSTRAINT check_time_tracking_mode CHECK (time_tracking_mode IN ('manual', 'automatic', 'hybrid')),
ADD CONSTRAINT check_datetime_order CHECK (start_datetime IS NULL OR due_datetime IS NULL OR start_datetime <= due_datetime);

-- ========================================
-- 第二部分：数据迁移和兼容性处理
-- ========================================

-- 迁移现有的due_date到due_datetime（设置为当天23:59）
UPDATE tasks 
SET due_datetime = due_date + INTERVAL '23 hours 59 minutes'
WHERE due_date IS NOT NULL AND due_datetime IS NULL;

-- 迁移现有的estimated_hours到estimated_minutes
UPDATE tasks 
SET estimated_minutes = ROUND(estimated_hours * 60)
WHERE estimated_hours IS NOT NULL AND estimated_hours > 0 AND estimated_minutes = 0;

-- 迁移现有的total_time_seconds到actual_minutes
UPDATE tasks 
SET actual_minutes = ROUND(total_time_seconds / 60.0)
WHERE total_time_seconds IS NOT NULL AND total_time_seconds > 0 AND actual_minutes = 0;

-- ========================================
-- 第三部分：创建时间管理配置表
-- ========================================

-- 创建时间单位配置表
CREATE TABLE time_unit_configs (
    id SERIAL PRIMARY KEY,
    unit_code VARCHAR(15) NOT NULL UNIQUE,
    unit_name_en VARCHAR(20) NOT NULL,
    unit_name_zh VARCHAR(20) NOT NULL,
    minutes_per_unit INTEGER NOT NULL,
    display_precision INTEGER DEFAULT 1,
    is_work_time BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插入标准时间单位配置
INSERT INTO time_unit_configs (unit_code, unit_name_en, unit_name_zh, minutes_per_unit, display_precision, is_work_time, sort_order) VALUES
('minute', 'Minute', '分钟', 1, 0, true, 1),
('hour', 'Hour', '小时', 60, 1, true, 2),
('day', 'Day', '天', 480, 1, true, 3),
('week', 'Week', '周', 2400, 1, true, 4),
('calendar_day', 'Calendar Day', '自然天', 1440, 1, false, 5);

-- ========================================
-- 第四部分：创建时间估算模板表
-- ========================================

-- 创建时间估算模板表（用于AI辅助估时）
CREATE TABLE time_estimation_templates (
    id SERIAL PRIMARY KEY,
    template_name VARCHAR(100) NOT NULL,
    task_type VARCHAR(50),
    complexity_level VARCHAR(20) DEFAULT 'medium',
    base_minutes INTEGER NOT NULL,
    multiplier_factor NUMERIC(4,2) DEFAULT 1.0,
    min_minutes INTEGER,
    max_minutes INTEGER,
    description TEXT,
    tags JSONB DEFAULT '[]',
    usage_count INTEGER DEFAULT 0,
    accuracy_rating NUMERIC(3,2) DEFAULT 0.0,
    created_by INTEGER REFERENCES users(id),
    is_global BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加约束
ALTER TABLE time_estimation_templates
ADD CONSTRAINT check_complexity_level CHECK (complexity_level IN ('simple', 'medium', 'complex', 'expert')),
ADD CONSTRAINT check_time_bounds CHECK (min_minutes IS NULL OR max_minutes IS NULL OR min_minutes <= max_minutes),
ADD CONSTRAINT check_accuracy_rating CHECK (accuracy_rating >= 0.0 AND accuracy_rating <= 5.0);

-- ========================================
-- 第五部分：创建时间追踪历史表
-- ========================================

-- 创建时间估算历史表
CREATE TABLE time_estimation_history (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    estimated_minutes INTEGER NOT NULL,
    actual_minutes INTEGER,
    estimation_method VARCHAR(20) DEFAULT 'manual',
    estimation_accuracy NUMERIC(5,2),
    variance_percent NUMERIC(6,2),
    estimated_by INTEGER REFERENCES users(id),
    template_id INTEGER REFERENCES time_estimation_templates(id),
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加约束
ALTER TABLE time_estimation_history
ADD CONSTRAINT check_estimation_method CHECK (estimation_method IN ('manual', 'template', 'ai_assisted', 'historical'));

-- ========================================
-- 第六部分：创建辅助函数
-- ========================================

-- 创建时间单位转换函数
CREATE OR REPLACE FUNCTION convert_time_unit(
    minutes INTEGER,
    target_unit VARCHAR(10) DEFAULT 'auto',
    work_hours_per_day NUMERIC DEFAULT 8.0
) RETURNS TABLE(
    value NUMERIC,
    unit VARCHAR(10),
    display_text VARCHAR(50)
) AS $$
BEGIN
    -- 自动选择最佳单位
    IF target_unit = 'auto' THEN
        IF minutes < 60 THEN
            target_unit := 'minute';
        ELSIF minutes < (work_hours_per_day * 60) THEN
            target_unit := 'hour';
        ELSE
            target_unit := 'day';
        END IF;
    END IF;
    
    -- 执行转换
    CASE target_unit
        WHEN 'minute' THEN
            RETURN QUERY SELECT 
                minutes::NUMERIC,
                'minute'::VARCHAR(10),
                CASE 
                    WHEN minutes = 1 THEN '1分钟'
                    ELSE minutes || '分钟'
                END::VARCHAR(50);
                
        WHEN 'hour' THEN
            RETURN QUERY SELECT 
                ROUND((minutes / 60.0)::NUMERIC, 1),
                'hour'::VARCHAR(10),
                ROUND((minutes / 60.0)::NUMERIC, 1) || '小时'::VARCHAR(50);
                
        WHEN 'day' THEN
            RETURN QUERY SELECT 
                ROUND((minutes / (work_hours_per_day * 60))::NUMERIC, 1),
                'day'::VARCHAR(10),
                ROUND((minutes / (work_hours_per_day * 60))::NUMERIC, 1) || '天'::VARCHAR(50);
                
        WHEN 'week' THEN
            RETURN QUERY SELECT 
                ROUND((minutes / (work_hours_per_day * 60 * 5))::NUMERIC, 1),
                'week'::VARCHAR(10),
                ROUND((minutes / (work_hours_per_day * 60 * 5))::NUMERIC, 1) || '周'::VARCHAR(50);
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- 创建时间估算准确性计算函数
CREATE OR REPLACE FUNCTION calculate_estimation_accuracy(
    estimated_minutes INTEGER,
    actual_minutes INTEGER
) RETURNS NUMERIC AS $$
DECLARE
    variance NUMERIC;
    accuracy NUMERIC;
BEGIN
    IF estimated_minutes = 0 OR actual_minutes = 0 THEN
        RETURN 0.0;
    END IF;
    
    variance := ABS(estimated_minutes - actual_minutes)::NUMERIC / estimated_minutes::NUMERIC;
    accuracy := GREATEST(0.0, 1.0 - variance);
    
    RETURN ROUND(accuracy * 100, 2);
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 第七部分：创建更新触发器
-- ========================================

-- 创建自动更新兼容字段的触发器函数
CREATE OR REPLACE FUNCTION sync_time_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- 同步due_date字段（向后兼容）
    IF NEW.due_datetime IS NOT NULL THEN
        NEW.due_date := NEW.due_datetime::DATE;
    END IF;
    
    -- 同步estimated_hours字段（向后兼容）
    IF NEW.estimated_minutes IS NOT NULL AND NEW.estimated_minutes > 0 THEN
        NEW.estimated_hours := ROUND((NEW.estimated_minutes / 60.0)::NUMERIC, 2);
    END IF;
    
    -- 同步total_time_seconds字段（向后兼容）
    IF NEW.actual_minutes IS NOT NULL AND NEW.actual_minutes > 0 THEN
        NEW.total_time_seconds := NEW.actual_minutes * 60;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER trigger_sync_time_fields
    BEFORE INSERT OR UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION sync_time_fields();

-- 创建时间估算历史记录触发器
CREATE OR REPLACE FUNCTION log_time_estimation_change()
RETURNS TRIGGER AS $$
BEGIN
    -- 当估算时间或实际时间发生变化时，记录历史
    IF (OLD.estimated_minutes IS DISTINCT FROM NEW.estimated_minutes) OR 
       (OLD.actual_minutes IS DISTINCT FROM NEW.actual_minutes) THEN
        
        INSERT INTO time_estimation_history (
            task_id,
            estimated_minutes,
            actual_minutes,
            estimation_method,
            estimation_accuracy,
            variance_percent,
            notes
        ) VALUES (
            NEW.id,
            NEW.estimated_minutes,
            NEW.actual_minutes,
            'manual',
            CASE 
                WHEN NEW.actual_minutes > 0 AND NEW.estimated_minutes > 0 THEN
                    calculate_estimation_accuracy(NEW.estimated_minutes, NEW.actual_minutes)
                ELSE NULL
            END,
            CASE 
                WHEN NEW.actual_minutes > 0 AND NEW.estimated_minutes > 0 THEN
                    ROUND((ABS(NEW.estimated_minutes - NEW.actual_minutes)::NUMERIC / NEW.estimated_minutes::NUMERIC * 100), 2)
                ELSE NULL
            END,
            CASE 
                WHEN OLD.estimated_minutes IS DISTINCT FROM NEW.estimated_minutes THEN '估算时间更新'
                WHEN OLD.actual_minutes IS DISTINCT FROM NEW.actual_minutes THEN '实际时间更新'
                ELSE '时间字段更新'
            END
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER trigger_log_time_estimation_change
    AFTER UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION log_time_estimation_change();

-- ========================================
-- 第八部分：创建索引优化查询
-- ========================================

-- 时间字段索引
CREATE INDEX idx_tasks_start_datetime ON tasks(start_datetime) WHERE start_datetime IS NOT NULL;
CREATE INDEX idx_tasks_due_datetime ON tasks(due_datetime) WHERE due_datetime IS NOT NULL;
CREATE INDEX idx_tasks_estimated_minutes ON tasks(estimated_minutes) WHERE estimated_minutes > 0;
CREATE INDEX idx_tasks_actual_minutes ON tasks(actual_minutes) WHERE actual_minutes > 0;
CREATE INDEX idx_tasks_time_range ON tasks(start_datetime, due_datetime) WHERE start_datetime IS NOT NULL AND due_datetime IS NOT NULL;

-- 时间单位配置索引
CREATE INDEX idx_time_unit_configs_active ON time_unit_configs(is_active, sort_order);
CREATE INDEX idx_time_unit_configs_code ON time_unit_configs(unit_code) WHERE is_active = true;

-- 时间估算相关索引
CREATE INDEX idx_time_estimation_templates_type ON time_estimation_templates(task_type, complexity_level) WHERE is_active = true;
CREATE INDEX idx_time_estimation_templates_global ON time_estimation_templates(is_global, is_active);
CREATE INDEX idx_time_estimation_history_task ON time_estimation_history(task_id, created_at DESC);
CREATE INDEX idx_time_estimation_history_accuracy ON time_estimation_history(estimation_accuracy DESC) WHERE estimation_accuracy IS NOT NULL;

-- ========================================
-- 第九部分：插入默认估算模板
-- ========================================

-- 插入常用任务类型的时间估算模板
INSERT INTO time_estimation_templates (template_name, task_type, complexity_level, base_minutes, multiplier_factor, min_minutes, max_minutes, description, is_global) VALUES
-- 开发类任务
('简单功能开发', 'development', 'simple', 120, 1.0, 60, 240, '简单的功能开发，如表单页面、简单API等', true),
('中等功能开发', 'development', 'medium', 300, 1.2, 180, 600, '中等复杂度功能，如用户管理、权限系统等', true),
('复杂功能开发', 'development', 'complex', 720, 1.5, 480, 1440, '复杂功能开发，如报表系统、工作流引擎等', true),

-- Bug修复类任务
('简单Bug修复', 'bug_fix', 'simple', 30, 1.0, 15, 90, '简单的Bug修复，如样式调整、字段验证等', true),
('中等Bug修复', 'bug_fix', 'medium', 90, 1.2, 60, 180, '中等复杂度Bug修复，如逻辑错误、性能问题等', true),
('复杂Bug修复', 'bug_fix', 'complex', 240, 1.5, 120, 480, '复杂Bug修复，如架构问题、数据一致性等', true),

-- 测试类任务
('单元测试编写', 'testing', 'simple', 60, 1.0, 30, 120, '单个功能的单元测试编写', true),
('集成测试', 'testing', 'medium', 120, 1.2, 90, 240, '模块间的集成测试', true),
('系统测试', 'testing', 'complex', 240, 1.5, 180, 480, '完整系统的端到端测试', true),

-- 文档类任务
('技术文档编写', 'documentation', 'simple', 90, 1.0, 60, 180, '技术文档、API文档编写', true),
('用户手册编写', 'documentation', 'medium', 180, 1.2, 120, 360, '用户操作手册、培训文档编写', true),

-- 设计类任务
('UI设计', 'design', 'medium', 180, 1.2, 120, 360, 'UI界面设计、原型制作', true),
('架构设计', 'design', 'complex', 360, 1.5, 240, 720, '系统架构设计、技术方案设计', true),

-- 会议类任务
('技术讨论会议', 'meeting', 'simple', 60, 1.0, 30, 120, '技术方案讨论、问题分析会议', true),
('项目评审会议', 'meeting', 'medium', 90, 1.0, 60, 180, '项目评审、里程碑评估会议', true);

-- ========================================
-- 第十部分：创建视图简化查询
-- ========================================

-- 创建任务时间统计视图
CREATE VIEW task_time_summary AS
SELECT 
    t.id,
    t.project_id,
    t.title,
    t.status,
    t.estimated_minutes,
    t.actual_minutes,
    t.start_datetime,
    t.due_datetime,
    t.time_unit_preference,
    
    -- 计算时间差异
    CASE 
        WHEN t.actual_minutes > 0 AND t.estimated_minutes > 0 THEN
            t.actual_minutes - t.estimated_minutes
        ELSE NULL
    END AS variance_minutes,
    
    -- 计算准确性
    CASE 
        WHEN t.actual_minutes > 0 AND t.estimated_minutes > 0 THEN
            calculate_estimation_accuracy(t.estimated_minutes, t.actual_minutes)
        ELSE NULL
    END AS estimation_accuracy,
    
    -- 格式化显示
    (SELECT display_text FROM convert_time_unit(t.estimated_minutes, t.time_unit_preference, t.work_hours_per_day) LIMIT 1) AS estimated_display,
    (SELECT display_text FROM convert_time_unit(t.actual_minutes, t.time_unit_preference, t.work_hours_per_day) LIMIT 1) AS actual_display,
    
    -- 任务状态
    CASE 
        WHEN t.start_datetime IS NULL THEN 'not_started'
        WHEN t.due_datetime IS NULL THEN 'no_deadline'
        WHEN t.due_datetime < NOW() AND t.status NOT IN ('completed', 'cancelled') THEN 'overdue'
        WHEN t.due_datetime <= NOW() + INTERVAL '1 day' AND t.status NOT IN ('completed', 'cancelled') THEN 'due_soon'
        ELSE 'on_track'
    END AS time_status,
    
    t.created_at,
    t.updated_at
FROM tasks t
WHERE t.deleted_at IS NULL;

-- 创建项目时间统计视图
CREATE VIEW project_time_summary AS
SELECT 
    p.id AS project_id,
    p.name AS project_name,
    COUNT(t.id) AS total_tasks,
    COUNT(CASE WHEN t.estimated_minutes > 0 THEN 1 END) AS tasks_with_estimates,
    COUNT(CASE WHEN t.actual_minutes > 0 THEN 1 END) AS tasks_with_actuals,
    
    -- 时间汇总
    COALESCE(SUM(t.estimated_minutes), 0) AS total_estimated_minutes,
    COALESCE(SUM(t.actual_minutes), 0) AS total_actual_minutes,
    
    -- 平均准确性
    ROUND(AVG(
        CASE 
            WHEN t.actual_minutes > 0 AND t.estimated_minutes > 0 THEN
                calculate_estimation_accuracy(t.estimated_minutes, t.actual_minutes)
            ELSE NULL
        END
    ), 2) AS avg_estimation_accuracy,
    
    -- 任务状态统计
    COUNT(CASE WHEN t.status = 'completed' THEN 1 END) AS completed_tasks,
    COUNT(CASE WHEN t.status IN ('todo', 'in_progress') THEN 1 END) AS active_tasks,
    COUNT(CASE WHEN t.due_datetime < NOW() AND t.status NOT IN ('completed', 'cancelled') THEN 1 END) AS overdue_tasks,
    
    -- 时间状态
    CASE 
        WHEN SUM(t.actual_minutes) > SUM(t.estimated_minutes) THEN 'over_budget'
        WHEN COUNT(CASE WHEN t.due_datetime < NOW() AND t.status NOT IN ('completed', 'cancelled') THEN 1 END) > 0 THEN 'has_overdue'
        ELSE 'on_track'
    END AS project_time_status
    
FROM projects p
LEFT JOIN tasks t ON p.id = t.project_id AND t.deleted_at IS NULL
GROUP BY p.id, p.name;

-- 添加注释说明
COMMENT ON TABLE time_unit_configs IS '时间单位配置表，支持灵活的时间单位管理';
COMMENT ON TABLE time_estimation_templates IS '时间估算模板表，用于AI辅助时间估算';
COMMENT ON TABLE time_estimation_history IS '时间估算历史表，追踪估算准确性';
COMMENT ON VIEW task_time_summary IS '任务时间统计视图，提供完整的时间分析数据';
COMMENT ON VIEW project_time_summary IS '项目时间统计视图，提供项目级别的时间分析';

COMMENT ON COLUMN tasks.start_datetime IS '任务开始时间（精确到分钟）';
COMMENT ON COLUMN tasks.due_datetime IS '任务截止时间（精确到分钟）';
COMMENT ON COLUMN tasks.estimated_minutes IS '预估用时（分钟），支持分钟级精度';
COMMENT ON COLUMN tasks.actual_minutes IS '实际用时（分钟），从计时器或手动输入';
COMMENT ON COLUMN tasks.time_unit_preference IS '时间显示单位偏好：auto自动, minutes分钟, hours小时, days天';
COMMENT ON COLUMN tasks.work_hours_per_day IS '每日工作小时数，用于天数换算';
COMMENT ON COLUMN tasks.time_tracking_mode IS '时间追踪模式：manual手动, automatic自动, hybrid混合';

COMMIT;