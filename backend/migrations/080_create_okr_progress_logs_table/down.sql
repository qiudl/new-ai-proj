-- 删除 OKR 进度日志表的回滚脚本

-- 删除函数
DROP FUNCTION IF EXISTS log_okr_change(
    INTEGER, INTEGER, INTEGER, VARCHAR(20), VARCHAR(50), 
    TEXT, TEXT, TEXT, INET, TEXT
);

-- 删除索引
DROP INDEX IF EXISTS idx_progress_logs_target_date;
DROP INDEX IF EXISTS idx_progress_logs_created_at;
DROP INDEX IF EXISTS idx_progress_logs_field_name;
DROP INDEX IF EXISTS idx_progress_logs_change_type;
DROP INDEX IF EXISTS idx_progress_logs_user_id;
DROP INDEX IF EXISTS idx_progress_logs_key_result_id;
DROP INDEX IF EXISTS idx_progress_logs_objective_id;

-- 删除表
DROP TABLE IF EXISTS okr_progress_logs;