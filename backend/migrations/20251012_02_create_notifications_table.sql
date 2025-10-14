-- 创建通知表
-- Created: 2025-10-12
-- Purpose: 修复移动端 API 500 错误 - notifications 表不存在

BEGIN;

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,  -- 'task_assigned', 'task_completed', 'task_overdue', 'comment_added', 'project_update', etc.
    title VARCHAR(255) NOT NULL,
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    related_task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    related_project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,  -- 额外的元数据信息
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_related_task ON notifications(related_task_id) WHERE related_task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_related_project ON notifications(related_project_id) WHERE related_project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- Add comment
COMMENT ON TABLE notifications IS '用户通知表，存储各类系统通知';
COMMENT ON COLUMN notifications.type IS '通知类型：task_assigned, task_completed, task_overdue, comment_added, project_update 等';
COMMENT ON COLUMN notifications.metadata IS '额外的元数据信息，JSON 格式';

COMMIT;
