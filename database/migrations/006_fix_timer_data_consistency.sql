-- ===================================================================
-- 计时系统数据一致性修复脚本
-- 版本: 1.0
-- 日期: 2025-08-01
-- 目标: 修复tasks.total_time_seconds与task_time_logs数据不一致问题
-- ===================================================================

BEGIN;

-- 1. 备份当前不一致的数据用于审计
CREATE TABLE IF NOT EXISTS timer_data_audit (
    audit_id SERIAL PRIMARY KEY,
    task_id INTEGER,
    task_title TEXT,
    old_total_time_seconds INTEGER,
    actual_logged_seconds INTEGER,
    difference_seconds INTEGER,
    audit_timestamp TIMESTAMP DEFAULT NOW(),
    fix_applied BOOLEAN DEFAULT FALSE
);

-- 记录修复前的不一致数据
INSERT INTO timer_data_audit (
    task_id, 
    task_title, 
    old_total_time_seconds, 
    actual_logged_seconds, 
    difference_seconds
)
SELECT 
    t.id,
    t.title,
    t.total_time_seconds,
    COALESCE(SUM(ttl.duration_seconds), 0) as actual_logged_seconds,
    t.total_time_seconds - COALESCE(SUM(ttl.duration_seconds), 0) as difference
FROM tasks t
LEFT JOIN task_time_logs ttl ON t.id = ttl.task_id
GROUP BY t.id, t.title, t.total_time_seconds
HAVING t.total_time_seconds != COALESCE(SUM(ttl.duration_seconds), 0);

-- 2. 创建数据一致性修复函数
CREATE OR REPLACE FUNCTION fix_task_total_time_consistency()
RETURNS TABLE(
    task_id INTEGER,
    old_time INTEGER,
    new_time INTEGER,
    difference INTEGER
) AS $$
DECLARE
    task_record RECORD;
    actual_time INTEGER;
BEGIN
    -- 遍历所有有时间记录不一致的任务
    FOR task_record IN 
        SELECT 
            t.id,
            t.title,
            t.total_time_seconds as current_total,
            COALESCE(SUM(ttl.duration_seconds), 0) as logged_total
        FROM tasks t
        LEFT JOIN task_time_logs ttl ON t.id = ttl.task_id
        GROUP BY t.id, t.title, t.total_time_seconds
        HAVING t.total_time_seconds != COALESCE(SUM(ttl.duration_seconds), 0)
    LOOP
        -- 更新任务的总时间
        UPDATE tasks 
        SET 
            total_time_seconds = task_record.logged_total,
            updated_at = NOW()
        WHERE id = task_record.id;
        
        -- 标记审计记录为已修复
        UPDATE timer_data_audit 
        SET fix_applied = TRUE 
        WHERE task_id = task_record.id 
        AND fix_applied = FALSE;
        
        -- 返回修复信息
        task_id := task_record.id;
        old_time := task_record.current_total;
        new_time := task_record.logged_total;
        difference := task_record.current_total - task_record.logged_total;
        
        RETURN NEXT;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- 3. 创建自动维护总时间的触发器函数
CREATE OR REPLACE FUNCTION auto_update_task_total_time()
RETURNS TRIGGER AS $$
DECLARE
    affected_task_id INTEGER;
BEGIN
    -- 确定受影响的任务ID
    affected_task_id := COALESCE(NEW.task_id, OLD.task_id);
    
    -- 重新计算并更新任务总时间
    UPDATE tasks 
    SET 
        total_time_seconds = COALESCE((
            SELECT SUM(duration_seconds)
            FROM task_time_logs 
            WHERE task_id = affected_task_id
        ), 0),
        updated_at = NOW()
    WHERE id = affected_task_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 4. 创建触发器（如果不存在）
DROP TRIGGER IF EXISTS trigger_auto_update_task_total_time ON task_time_logs;
CREATE TRIGGER trigger_auto_update_task_total_time
    AFTER INSERT OR UPDATE OR DELETE ON task_time_logs
    FOR EACH ROW
    EXECUTE FUNCTION auto_update_task_total_time();

-- 5. 创建数据一致性检查函数
CREATE OR REPLACE FUNCTION check_timer_data_consistency()
RETURNS TABLE(
    status TEXT,
    task_count INTEGER,
    total_inconsistencies INTEGER,
    max_difference_seconds INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'Data Consistency Check' as status,
        COUNT(*)::INTEGER as task_count,
        COUNT(CASE WHEN t.total_time_seconds != COALESCE(SUM(ttl.duration_seconds), 0) THEN 1 END)::INTEGER as total_inconsistencies,
        MAX(ABS(t.total_time_seconds - COALESCE(SUM(ttl.duration_seconds), 0)))::INTEGER as max_difference_seconds
    FROM tasks t
    LEFT JOIN task_time_logs ttl ON t.id = ttl.task_id
    WHERE t.total_time_seconds > 0 OR ttl.task_id IS NOT NULL
    GROUP BY ()
    HAVING COUNT(*) > 0;
END;
$$ LANGUAGE plpgsql;

-- 6. 创建用户计时状态标准化函数
CREATE OR REPLACE FUNCTION standardize_user_timing_status()
RETURNS TABLE(
    user_id INTEGER,
    old_status TEXT,
    new_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    UPDATE users 
    SET timing_status = CASE 
        WHEN timing_status = 'idle' OR timing_status IS NULL THEN 'stopped'
        WHEN timing_status = 'running' THEN 'running'
        ELSE 'stopped'
    END
    WHERE timing_status != 'running' AND timing_status != 'stopped'
    RETURNING id, timing_status, 'stopped';
END;
$$ LANGUAGE plpgsql;

-- 执行数据修复前的状态检查
SELECT 'BEFORE FIX:' as phase, * FROM check_timer_data_consistency();

-- 显示即将修复的数据
SELECT 
    'TASKS TO BE FIXED:' as info,
    COUNT(*) as task_count,
    SUM(ABS(difference_seconds)) as total_difference_seconds
FROM timer_data_audit 
WHERE fix_applied = FALSE;

COMMIT;

-- 使用说明：
-- 1. 运行此脚本创建修复函数和触发器
-- 2. 执行 SELECT * FROM fix_task_total_time_consistency(); 来修复数据
-- 3. 执行 SELECT * FROM check_timer_data_consistency(); 来验证修复结果
-- 4. 执行 SELECT * FROM standardize_user_timing_status(); 来标准化用户状态