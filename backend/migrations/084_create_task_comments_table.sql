-- 084_create_task_comments_table.sql
-- 创建任务评论表
-- 作者: Claude AI
-- 日期: 2025-10-10

BEGIN;

-- ====================
-- 创建任务评论表
-- ====================
CREATE TABLE IF NOT EXISTS task_comments (
    -- 主键
    id SERIAL PRIMARY KEY,

    -- 关联字段
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 内容字段
    content TEXT NOT NULL,

    -- 状态管理
    status VARCHAR(20) NOT NULL DEFAULT 'active',

    -- 审计字段
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    deleted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,

    -- 约束
    CONSTRAINT check_task_comment_content_not_empty
        CHECK (LENGTH(TRIM(content)) > 0),
    CONSTRAINT check_task_comment_content_length
        CHECK (LENGTH(content) <= 2000),
    CONSTRAINT check_task_comment_status
        CHECK (status IN ('active', 'deleted'))
);

-- ====================
-- 创建索引
-- ====================

-- 任务评论查询索引（部分索引）
CREATE INDEX idx_task_comments_task_id ON task_comments(task_id)
    WHERE status = 'active';

-- 用户评论查询索引
CREATE INDEX idx_task_comments_user_id ON task_comments(user_id)
    WHERE status = 'active';

-- 时间排序索引
CREATE INDEX idx_task_comments_created_at ON task_comments(created_at DESC);

-- 复合索引：任务+时间（分页优化）
CREATE INDEX idx_task_comments_task_time ON task_comments(task_id, created_at DESC)
    WHERE status = 'active';

-- 删除状态索引
CREATE INDEX idx_task_comments_deleted ON task_comments(deleted_at)
    WHERE deleted_at IS NOT NULL;

-- ====================
-- 创建触发器
-- ====================

-- 自动更新 updated_at
CREATE TRIGGER trigger_task_comments_updated_at
    BEFORE UPDATE ON task_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ====================
-- 添加注释
-- ====================

COMMENT ON TABLE task_comments IS '任务评论表 - 存储任务的讨论和评论';

COMMENT ON COLUMN task_comments.id IS '评论ID（主键）';
COMMENT ON COLUMN task_comments.task_id IS '关联的任务ID';
COMMENT ON COLUMN task_comments.user_id IS '评论作者ID';
COMMENT ON COLUMN task_comments.content IS '评论内容（1-2000字符）';
COMMENT ON COLUMN task_comments.status IS '状态：active活跃, deleted已删除';
COMMENT ON COLUMN task_comments.created_at IS '创建时间';
COMMENT ON COLUMN task_comments.updated_at IS '最后更新时间';
COMMENT ON COLUMN task_comments.deleted_at IS '软删除时间戳';
COMMENT ON COLUMN task_comments.deleted_by IS '删除操作者ID';

COMMIT;
