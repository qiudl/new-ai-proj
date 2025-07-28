-- 004_add_archive_functionality.sql
-- 为任务表添加归档功能

-- 添加归档相关字段
ALTER TABLE tasks 
ADD COLUMN archived_at TIMESTAMPTZ NULL,
ADD COLUMN archived_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN archive_reason TEXT NULL;

-- 创建归档状态索引
CREATE INDEX CONCURRENTLY idx_tasks_archived_at ON tasks(archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX CONCURRENTLY idx_tasks_active ON tasks(project_id, status) WHERE archived_at IS NULL;

-- 创建归档任务视图
CREATE VIEW archived_tasks AS
SELECT 
    t.*,
    u.username as archived_by_username,
    p.name as project_name
FROM tasks t
JOIN users u ON t.archived_by = u.id
JOIN projects p ON t.project_id = p.id
WHERE t.archived_at IS NOT NULL
ORDER BY t.archived_at DESC;

-- 创建活跃任务视图
CREATE VIEW active_tasks AS
SELECT t.*, p.name as project_name
FROM tasks t
JOIN projects p ON t.project_id = p.id
WHERE t.archived_at IS NULL;

-- 添加归档操作的存储过程
CREATE OR REPLACE FUNCTION archive_task(
    task_id INTEGER,
    user_id INTEGER,
    reason TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    task_exists BOOLEAN;
BEGIN
    -- 检查任务是否存在且未归档
    SELECT EXISTS(
        SELECT 1 FROM tasks 
        WHERE id = task_id AND archived_at IS NULL
    ) INTO task_exists;
    
    IF NOT task_exists THEN
        RETURN FALSE;
    END IF;
    
    -- 归档任务
    UPDATE tasks 
    SET 
        archived_at = NOW(),
        archived_by = user_id,
        archive_reason = reason
    WHERE id = task_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 添加取消归档的存储过程
CREATE OR REPLACE FUNCTION unarchive_task(
    task_id INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    task_exists BOOLEAN;
BEGIN
    -- 检查任务是否存在且已归档
    SELECT EXISTS(
        SELECT 1 FROM tasks 
        WHERE id = task_id AND archived_at IS NOT NULL
    ) INTO task_exists;
    
    IF NOT task_exists THEN
        RETURN FALSE;
    END IF;
    
    -- 取消归档
    UPDATE tasks 
    SET 
        archived_at = NULL,
        archived_by = NULL,
        archive_reason = NULL
    WHERE id = task_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 批量归档函数
CREATE OR REPLACE FUNCTION archive_tasks_batch(
    task_ids INTEGER[],
    user_id INTEGER,
    reason TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    affected_count INTEGER;
BEGIN
    UPDATE tasks 
    SET 
        archived_at = NOW(),
        archived_by = user_id,
        archive_reason = reason
    WHERE id = ANY(task_ids) AND archived_at IS NULL;
    
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    RETURN affected_count;
END;
$$ LANGUAGE plpgsql;

-- 自动归档已完成任务的函数（可选）
CREATE OR REPLACE FUNCTION auto_archive_completed_tasks(
    days_old INTEGER DEFAULT 30
) RETURNS INTEGER AS $$
DECLARE
    affected_count INTEGER;
BEGIN
    UPDATE tasks 
    SET 
        archived_at = NOW(),
        archived_by = NULL,
        archive_reason = 'Auto-archived after ' || days_old || ' days'
    WHERE 
        status = 'completed' 
        AND archived_at IS NULL
        AND created_at < NOW() - INTERVAL '1 day' * days_old;
    
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    RETURN affected_count;
END;
$$ LANGUAGE plpgsql;

-- 创建归档统计视图
CREATE VIEW archive_statistics AS
SELECT 
    p.id as project_id,
    p.name as project_name,
    COUNT(CASE WHEN t.archived_at IS NULL THEN 1 END) as active_tasks,
    COUNT(CASE WHEN t.archived_at IS NOT NULL THEN 1 END) as archived_tasks,
    COUNT(*) as total_tasks
FROM projects p
LEFT JOIN tasks t ON p.id = t.project_id
GROUP BY p.id, p.name;

-- 添加注释
COMMENT ON COLUMN tasks.archived_at IS '任务归档时间';
COMMENT ON COLUMN tasks.archived_by IS '归档操作者ID';
COMMENT ON COLUMN tasks.archive_reason IS '归档原因';
COMMENT ON VIEW archived_tasks IS '已归档任务视图';
COMMENT ON VIEW active_tasks IS '活跃任务视图';
COMMENT ON FUNCTION archive_task IS '归档单个任务';
COMMENT ON FUNCTION unarchive_task IS '取消归档单个任务';
COMMENT ON FUNCTION archive_tasks_batch IS '批量归档任务';
COMMENT ON FUNCTION auto_archive_completed_tasks IS '自动归档已完成任务';