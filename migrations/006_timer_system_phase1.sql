-- Timer System Phase 1: Database Schema Extension
-- This migration adds the necessary database fields for task timing functionality

-- Create timing status enum type for PostgreSQL
CREATE TYPE timing_status_type AS ENUM ('stopped', 'running');

-- 任务1.1.1: 扩展users表添加计时状态字段
ALTER TABLE users ADD COLUMN current_timing_task_id INTEGER DEFAULT NULL;
ALTER TABLE users ADD COLUMN timing_start_time TIMESTAMP DEFAULT NULL;
ALTER TABLE users ADD COLUMN timing_status timing_status_type DEFAULT 'stopped';

-- Add foreign key constraint for current_timing_task_id
ALTER TABLE users ADD CONSTRAINT fk_users_current_timing_task 
    FOREIGN KEY (current_timing_task_id) REFERENCES tasks(id) ON DELETE SET NULL;

-- 任务1.1.2: 创建简化计时日志表 task_time_logs
CREATE TABLE task_time_logs (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NULL,
    duration_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_task_time_logs_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_task_time_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_task_time_logs_task_id ON task_time_logs(task_id);
CREATE INDEX idx_task_time_logs_user_id ON task_time_logs(user_id);
CREATE INDEX idx_task_time_logs_start_time ON task_time_logs(start_time);
CREATE INDEX idx_task_time_logs_user_task ON task_time_logs(user_id, task_id);

-- 任务1.1.3: 扩展tasks表添加总时长字段
ALTER TABLE tasks ADD COLUMN total_time_seconds INTEGER DEFAULT 0;

-- Add indexes for performance on new timing fields
CREATE INDEX idx_users_timing_status ON users(timing_status);
CREATE INDEX idx_users_current_timing_task ON users(current_timing_task_id);
CREATE INDEX idx_tasks_total_time ON tasks(total_time_seconds);

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for task_time_logs
CREATE TRIGGER update_task_time_logs_updated_at 
    BEFORE UPDATE ON task_time_logs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON COLUMN users.current_timing_task_id IS 'ID of the task currently being timed by this user';
COMMENT ON COLUMN users.timing_start_time IS 'Timestamp when current timing session started';
COMMENT ON COLUMN users.timing_status IS 'Current timing status: stopped or running';
COMMENT ON COLUMN tasks.total_time_seconds IS 'Total accumulated time spent on this task in seconds';
COMMENT ON TABLE task_time_logs IS 'Log of all timing sessions for tasks';
COMMENT ON COLUMN task_time_logs.duration_seconds IS 'Duration of timing session in seconds';