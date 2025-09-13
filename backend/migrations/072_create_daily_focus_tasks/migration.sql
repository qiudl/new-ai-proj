-- 072_create_daily_focus_tasks: 创建今日主要任务功能
-- 目标：为Dashboard添加今日主要任务功能，支持用户标记和管理每日重点任务

-- 创建today日主要任务表
CREATE TABLE daily_focus_tasks (
    id SERIAL PRIMARY KEY,
    
    -- 关联字段
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- 焦点任务属性
    focus_date DATE NOT NULL DEFAULT CURRENT_DATE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    priority_level VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority_level IN ('low', 'medium', 'high')),
    
    -- 智能推荐相关
    is_auto_suggested BOOLEAN NOT NULL DEFAULT FALSE,
    suggestion_reason VARCHAR(100), -- 推荐原因: 'deadline_approaching', 'high_priority', 'overdue', 'manual'
    suggestion_score NUMERIC(3,2) DEFAULT 0.0, -- 推荐分数 0.0-1.0
    
    -- 状态跟踪
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'removed', 'carried_over')),
    completed_at TIMESTAMP WITH TIME ZONE,
    carried_from_date DATE, -- 从哪个日期延续过来的
    
    -- 用户偏好
    user_notes TEXT, -- 用户标注
    estimated_duration_minutes INTEGER DEFAULT 0, -- 预估完成时间(分钟)
    
    -- 审计字段
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    -- 约束条件
    CONSTRAINT unique_task_user_date UNIQUE (task_id, user_id, focus_date),
    CONSTRAINT valid_estimated_duration CHECK (estimated_duration_minutes >= 0),
    CONSTRAINT valid_suggestion_score CHECK (suggestion_score >= 0.0 AND suggestion_score <= 1.0)
);

-- 创建索引
CREATE INDEX idx_daily_focus_tasks_user_date ON daily_focus_tasks(user_id, focus_date) WHERE status = 'active';
CREATE INDEX idx_daily_focus_tasks_task_id ON daily_focus_tasks(task_id);
CREATE INDEX idx_daily_focus_tasks_project_date ON daily_focus_tasks(project_id, focus_date);
CREATE INDEX idx_daily_focus_tasks_suggestion ON daily_focus_tasks(is_auto_suggested, suggestion_score DESC);
CREATE INDEX idx_daily_focus_tasks_sort_order ON daily_focus_tasks(user_id, focus_date, sort_order);
CREATE INDEX idx_daily_focus_tasks_status_date ON daily_focus_tasks(status, focus_date);

-- 创建触发器函数：自动更新updated_at
CREATE OR REPLACE FUNCTION update_daily_focus_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER trigger_update_daily_focus_tasks_updated_at
    BEFORE UPDATE ON daily_focus_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_focus_tasks_updated_at();

-- 创建触发器函数：任务完成时自动更新状态
CREATE OR REPLACE FUNCTION sync_daily_focus_task_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- 当任务状态变为completed时，更新daily_focus_tasks状态
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE daily_focus_tasks 
        SET status = 'completed', 
            completed_at = NOW(),
            updated_at = NOW()
        WHERE task_id = NEW.id 
          AND status = 'active'
          AND focus_date = CURRENT_DATE;
    END IF;
    
    -- 当任务从completed变为其他状态时，恢复active状态
    IF OLD.status = 'completed' AND NEW.status != 'completed' THEN
        UPDATE daily_focus_tasks 
        SET status = 'active', 
            completed_at = NULL,
            updated_at = NOW()
        WHERE task_id = NEW.id 
          AND status = 'completed'
          AND focus_date = CURRENT_DATE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建任务状态同步触发器
CREATE TRIGGER trigger_sync_daily_focus_task_completion
    AFTER UPDATE OF status ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION sync_daily_focus_task_completion();

-- 创建清理过期数据的函数
CREATE OR REPLACE FUNCTION cleanup_old_daily_focus_tasks()
RETURNS void AS $$
BEGIN
    -- 删除30天前的已完成或已移除的记录
    DELETE FROM daily_focus_tasks 
    WHERE focus_date < CURRENT_DATE - INTERVAL '30 days'
      AND status IN ('completed', 'removed');
    
    -- 记录清理日志
    INSERT INTO system_audit_log (action, details, created_at)
    VALUES ('cleanup_daily_focus_tasks', 
            json_build_object('cleanup_date', CURRENT_DATE, 'records_deleted', ROW_COUNT),
            NOW());
END;
$$ LANGUAGE plpgsql;

-- 添加注释
COMMENT ON TABLE daily_focus_tasks IS '今日主要任务表：用户可以标记每日重点关注的任务';
COMMENT ON COLUMN daily_focus_tasks.task_id IS '关联的任务ID';
COMMENT ON COLUMN daily_focus_tasks.user_id IS '用户ID，支持个人化的今日任务';
COMMENT ON COLUMN daily_focus_tasks.focus_date IS '焦点日期，默认当天';
COMMENT ON COLUMN daily_focus_tasks.sort_order IS '排序顺序，数字越小越靠前';
COMMENT ON COLUMN daily_focus_tasks.priority_level IS '优先级：low/medium/high';
COMMENT ON COLUMN daily_focus_tasks.is_auto_suggested IS '是否为系统智能推荐';
COMMENT ON COLUMN daily_focus_tasks.suggestion_reason IS '推荐理由';
COMMENT ON COLUMN daily_focus_tasks.suggestion_score IS '推荐分数，用于排序';
COMMENT ON COLUMN daily_focus_tasks.status IS '状态：active/completed/removed/carried_over';
COMMENT ON COLUMN daily_focus_tasks.carried_from_date IS '延续任务的原始日期';
COMMENT ON COLUMN daily_focus_tasks.estimated_duration_minutes IS '预估完成时间(分钟)';

-- 创建视图：今日活跃任务
CREATE VIEW v_today_focus_tasks AS
SELECT 
    dft.id,
    dft.task_id,
    dft.user_id,
    dft.project_id,
    dft.focus_date,
    dft.sort_order,
    dft.priority_level,
    dft.is_auto_suggested,
    dft.suggestion_reason,
    dft.status,
    dft.estimated_duration_minutes,
    dft.user_notes,
    dft.created_at,
    dft.updated_at,
    -- 关联任务信息
    t.title as task_title,
    t.description as task_description,
    t.status as task_status,
    t.priority as task_priority,
    t.due_date as task_due_date,
    t.assignee_id as task_assignee_id,
    -- 关联项目信息
    p.name as project_name,
    p.code as project_code
FROM daily_focus_tasks dft
JOIN tasks t ON dft.task_id = t.id
JOIN projects p ON dft.project_id = p.id
WHERE dft.focus_date = CURRENT_DATE 
  AND dft.status = 'active'
  AND t.deleted_at IS NULL;

COMMENT ON VIEW v_today_focus_tasks IS '今日活跃焦点任务视图，包含任务和项目的详细信息';