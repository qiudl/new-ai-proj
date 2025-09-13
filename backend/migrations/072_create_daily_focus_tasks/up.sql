-- Migration: 072_create_daily_focus_tasks
-- Description: Create tables for Dashboard daily focus tasks functionality
-- Date: 2025-09-13

-- 1. 今日焦点任务表 (daily_focus_tasks)
CREATE TABLE daily_focus_tasks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    task_id INTEGER NOT NULL,
    focus_date DATE NOT NULL,
    priority_level INTEGER DEFAULT 1 CHECK (priority_level BETWEEN 1 AND 5),
    estimated_minutes INTEGER DEFAULT 60,
    actual_minutes INTEGER DEFAULT 0,
    focus_reason TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'deferred', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    -- 外键约束
    CONSTRAINT fk_daily_focus_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_daily_focus_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    
    -- 唯一约束：同一用户同一天不能重复添加相同任务
    CONSTRAINT uk_user_task_date UNIQUE (user_id, task_id, focus_date)
);

-- 索引优化
CREATE INDEX idx_daily_focus_user_date ON daily_focus_tasks(user_id, focus_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_daily_focus_status ON daily_focus_tasks(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_daily_focus_priority ON daily_focus_tasks(priority_level DESC) WHERE deleted_at IS NULL;

-- 2. 今日任务模板表 (daily_task_templates)
CREATE TABLE daily_task_templates (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    template_name VARCHAR(255) NOT NULL,
    description TEXT,
    auto_apply BOOLEAN DEFAULT FALSE,
    apply_days VARCHAR(20) DEFAULT 'workdays', -- workdays, weekends, daily, custom
    custom_days INTEGER[] DEFAULT NULL, -- 自定义星期几 [1,2,3,4,5] (周一到周五)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    CONSTRAINT fk_template_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX idx_templates_user_active ON daily_task_templates(user_id, is_active) WHERE deleted_at IS NULL;

-- 3. 模板任务关联表 (template_tasks)
CREATE TABLE template_tasks (
    id SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL,
    task_title VARCHAR(255) NOT NULL,
    task_description TEXT,
    estimated_minutes INTEGER DEFAULT 30,
    priority_level INTEGER DEFAULT 3,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_template_tasks_template FOREIGN KEY (template_id) REFERENCES daily_task_templates(id) ON DELETE CASCADE
);

-- 4. 今日任务统计表 (daily_task_stats)
CREATE TABLE daily_task_stats (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    stats_date DATE NOT NULL,
    total_tasks INTEGER DEFAULT 0,
    completed_tasks INTEGER DEFAULT 0,
    in_progress_tasks INTEGER DEFAULT 0,
    deferred_tasks INTEGER DEFAULT 0,
    total_estimated_minutes INTEGER DEFAULT 0,
    total_actual_minutes INTEGER DEFAULT 0,
    productivity_score DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_stats_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uk_user_stats_date UNIQUE (user_id, stats_date)
);

-- 索引
CREATE INDEX idx_stats_user_date ON daily_task_stats(user_id, stats_date DESC);

-- 创建触发器函数来自动更新 updated_at 字段
CREATE OR REPLACE FUNCTION update_daily_focus_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为相关表创建触发器
CREATE TRIGGER trigger_daily_focus_tasks_updated_at
    BEFORE UPDATE ON daily_focus_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_focus_updated_at();

CREATE TRIGGER trigger_daily_task_templates_updated_at
    BEFORE UPDATE ON daily_task_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_focus_updated_at();

CREATE TRIGGER trigger_daily_task_stats_updated_at
    BEFORE UPDATE ON daily_task_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_focus_updated_at();