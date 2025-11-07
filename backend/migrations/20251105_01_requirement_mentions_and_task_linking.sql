-- 20251105_01_requirement_mentions_and_task_linking.sql
-- 为需求评论添加@用户提及功能，并创建需求-任务多对多关联表
-- 作者: Claude AI
-- 日期: 2025-11-05
-- 预计执行时间: <3秒

BEGIN;

-- ====================
-- 1. 扩展requirement_comments表 - 添加@用户提及功能
-- ====================

-- 添加mentioned_user_ids字段 - 存储被@提及的用户ID列表
ALTER TABLE requirement_comments
ADD COLUMN IF NOT EXISTS mentioned_user_ids JSONB DEFAULT '[]';

-- 添加mentioned_count字段 - 性能优化（避免每次解析JSONB）
ALTER TABLE requirement_comments
ADD COLUMN IF NOT EXISTS mentioned_count INTEGER DEFAULT 0;

-- 添加索引 - 优化查询提及了某用户的所有评论
CREATE INDEX IF NOT EXISTS idx_req_comments_mentioned_users
ON requirement_comments
USING gin(mentioned_user_ids);

-- 添加索引 - 优化查询有@提及的评论
CREATE INDEX IF NOT EXISTS idx_req_comments_mentioned_count
ON requirement_comments(mentioned_count)
WHERE mentioned_count > 0;

-- 添加字段注释
COMMENT ON COLUMN requirement_comments.mentioned_user_ids IS
'@提及的用户ID列表 - JSONB数组格式，例如: [1, 5, 10]';

COMMENT ON COLUMN requirement_comments.mentioned_count IS
'@提及的用户数量 - 性能优化字段，避免每次解析JSONB数组';

-- ====================
-- 2. 创建需求-任务多对多关联表 (requirement_tasks)
-- ====================

CREATE TABLE IF NOT EXISTS requirement_tasks (
    -- 主键
    id SERIAL PRIMARY KEY,

    -- 关联字段
    requirement_id INTEGER NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,

    -- 关联类型
    link_type VARCHAR(20) NOT NULL DEFAULT 'manual',

    -- 关联元数据
    linked_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    link_comment TEXT,

    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 唯一约束 - 防止重复关联
    CONSTRAINT unique_requirement_task_link UNIQUE (requirement_id, task_id),

    -- 检查约束 - 关联类型
    CONSTRAINT check_link_type CHECK (link_type IN ('manual', 'converted', 'related'))
);

-- 索引 - 通过需求查找任务
CREATE INDEX IF NOT EXISTS idx_requirement_tasks_requirement
ON requirement_tasks(requirement_id);

-- 索引 - 通过任务查找需求
CREATE INDEX IF NOT EXISTS idx_requirement_tasks_task
ON requirement_tasks(task_id);

-- 索引 - 关联类型过滤
CREATE INDEX IF NOT EXISTS idx_requirement_tasks_type
ON requirement_tasks(link_type);

-- 索引 - 关联人查询
CREATE INDEX IF NOT EXISTS idx_requirement_tasks_linked_by
ON requirement_tasks(linked_by);

-- 复合索引 - 常用查询优化
CREATE INDEX IF NOT EXISTS idx_requirement_tasks_req_type
ON requirement_tasks(requirement_id, link_type);

CREATE INDEX IF NOT EXISTS idx_requirement_tasks_task_type
ON requirement_tasks(task_id, link_type);

-- ====================
-- 3. 创建触发器
-- ====================

-- 自动更新requirement_tasks的updated_at字段
CREATE OR REPLACE FUNCTION update_requirement_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_requirement_tasks_updated_at
    BEFORE UPDATE ON requirement_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_requirement_tasks_updated_at();

-- 自动维护mentioned_count字段（在插入/更新时同步）
CREATE OR REPLACE FUNCTION sync_requirement_comment_mentioned_count()
RETURNS TRIGGER AS $$
BEGIN
    -- 如果mentioned_user_ids是有效的JSONB数组，更新count
    IF NEW.mentioned_user_ids IS NOT NULL THEN
        NEW.mentioned_count = jsonb_array_length(NEW.mentioned_user_ids);
    ELSE
        NEW.mentioned_count = 0;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_mentioned_count
    BEFORE INSERT OR UPDATE ON requirement_comments
    FOR EACH ROW
    WHEN (NEW.mentioned_user_ids IS DISTINCT FROM OLD.mentioned_user_ids OR TG_OP = 'INSERT')
    EXECUTE FUNCTION sync_requirement_comment_mentioned_count();

-- ====================
-- 4. 添加表和字段注释
-- ====================

COMMENT ON TABLE requirement_tasks IS
'需求-任务多对多关联表 - 支持一个需求关联多个任务，一个任务关联多个需求';

COMMENT ON COLUMN requirement_tasks.id IS '关联记录ID（主键）';
COMMENT ON COLUMN requirement_tasks.requirement_id IS '关联的需求ID';
COMMENT ON COLUMN requirement_tasks.task_id IS '关联的任务ID';
COMMENT ON COLUMN requirement_tasks.link_type IS '关联类型：manual手动关联, converted需求转任务, related相关联';
COMMENT ON COLUMN requirement_tasks.linked_by IS '创建关联的用户ID';
COMMENT ON COLUMN requirement_tasks.link_comment IS '关联说明/备注';
COMMENT ON COLUMN requirement_tasks.created_at IS '关联创建时间';
COMMENT ON COLUMN requirement_tasks.updated_at IS '关联更新时间';

-- ====================
-- 5. 数据迁移 - 将现有的converted_task_id迁移到新表
-- ====================

-- 迁移已转换的需求到requirement_tasks表（link_type='converted'）
INSERT INTO requirement_tasks (requirement_id, task_id, link_type, linked_by, link_comment, created_at)
SELECT
    r.id AS requirement_id,
    r.converted_task_id AS task_id,
    'converted' AS link_type,
    COALESCE(r.converted_by, r.submitter_id) AS linked_by,
    '从需求转换而来' AS link_comment,
    COALESCE(r.converted_at, r.created_at) AS created_at
FROM requirements r
WHERE r.converted_task_id IS NOT NULL
ON CONFLICT (requirement_id, task_id) DO NOTHING;

-- ====================
-- 6. 性能优化 - 更新统计信息
-- ====================

ANALYZE requirement_comments;
ANALYZE requirement_tasks;

COMMIT;

-- ====================
-- 输出迁移信息
-- ====================
\echo '==========================================';
\echo 'Requirement mentions and task linking migration completed';
\echo '';
\echo 'requirement_comments table enhanced:';
\echo '  ✓ mentioned_user_ids JSONB - 存储@提及的用户ID';
\echo '  ✓ mentioned_count INTEGER - 提及用户数量缓存';
\echo '  ✓ 2 new indexes for mentions';
\echo '';
\echo 'requirement_tasks table created:';
\echo '  ✓ Many-to-many relationship';
\echo '  ✓ Support link types: manual, converted, related';
\echo '  ✓ 6 indexes for query optimization';
\echo '';
\echo 'Triggers created:';
\echo '  ✓ auto-update updated_at for requirement_tasks';
\echo '  ✓ auto-sync mentioned_count from mentioned_user_ids';
\echo '';
\echo 'Data migration:';
\echo '  ✓ Existing converted_task_id migrated to requirement_tasks';
\echo '';
\echo 'Total new indexes: 8';
\echo 'Total new triggers: 2';
\echo '==========================================';
