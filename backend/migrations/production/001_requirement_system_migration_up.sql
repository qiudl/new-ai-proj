-- ================================================
-- 生产环境迁移脚本: 需求管理系统
-- ================================================
-- 版本: 1.0.0
-- 作者: AI Project Team
-- 日期: 2025-11-06
-- 描述: 部署需求管理系统的完整数据库结构
-- 预计执行时间: 约 10-15 秒
-- 依赖: enterprises, users, projects, tasks表必须存在
-- ================================================

-- 设置客户端编码和时区
SET client_encoding = 'UTF8';
SET timezone = 'Asia/Shanghai';

-- 开始事务
BEGIN;

-- ================================================
-- 第一部分: 创建需求管理核心表
-- ================================================

\echo '========================================';
\echo '正在创建需求管理系统核心表...';
\echo '========================================';

-- ====================
-- 1. 创建需求主表 (requirements)
-- ====================
\echo '创建 requirements 表...';

CREATE TABLE IF NOT EXISTS requirements (
    -- 主键和编号
    id SERIAL PRIMARY KEY,
    display_id VARCHAR(20) UNIQUE NOT NULL,

    -- 基础信息
    title VARCHAR(500) NOT NULL,
    description TEXT,

    -- 关联信息（复用现有表）
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    enterprise_id INTEGER NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    submitter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,

    -- 状态和优先级
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    priority VARCHAR(20) DEFAULT 'medium',
    category VARCHAR(50),

    -- 业务信息
    business_value TEXT,
    expected_outcome TEXT,
    acceptance_criteria TEXT,
    attachments JSONB DEFAULT '[]',

    -- 评审信息
    review_status VARCHAR(20),
    review_comment TEXT,
    review_score INTEGER CHECK (review_score >= 1 AND review_score <= 10),
    reviewed_at TIMESTAMP,

    -- 估算信息
    estimated_hours DECIMAL(10,2),
    estimated_cost DECIMAL(15,2),
    complexity VARCHAR(20),

    -- 转化信息（关联到tasks表）
    converted_task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    converted_at TIMESTAMP,
    converted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,

    -- 时间戳
    submitted_at TIMESTAMP,
    due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 约束
    CONSTRAINT check_req_status CHECK (status IN (
        'draft', 'pending', 'reviewing', 'need_more_info',
        'approved', 'rejected', 'converted', 'archived'
    )),
    CONSTRAINT check_req_priority CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT check_req_complexity CHECK (complexity IN ('simple', 'medium', 'complex', 'very_complex'))
);

\echo '✓ requirements 表创建完成';

-- ====================
-- 2. 创建需求评论表 (requirement_comments)
-- ====================
\echo '创建 requirement_comments 表...';

CREATE TABLE IF NOT EXISTS requirement_comments (
    -- 主键
    id SERIAL PRIMARY KEY,

    -- 关联字段
    requirement_id INTEGER NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_comment_id INTEGER REFERENCES requirement_comments(id) ON DELETE CASCADE,

    -- 内容字段
    content TEXT NOT NULL,
    comment_type VARCHAR(20) DEFAULT 'general',
    attachments JSONB DEFAULT '[]',

    -- @用户提及功能字段
    mentioned_user_ids JSONB DEFAULT '[]',
    mentioned_count INTEGER DEFAULT 0,

    -- 特殊标记
    is_internal BOOLEAN DEFAULT false,
    is_pinned BOOLEAN DEFAULT false,

    -- 状态管理
    status VARCHAR(20) NOT NULL DEFAULT 'active',

    -- 审计字段
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    deleted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,

    -- 约束
    CONSTRAINT check_req_comment_content CHECK (LENGTH(TRIM(content)) > 0 AND LENGTH(content) <= 2000),
    CONSTRAINT check_req_comment_type CHECK (comment_type IN ('general', 'question', 'suggestion', 'approval')),
    CONSTRAINT check_req_comment_status CHECK (status IN ('active', 'deleted'))
);

\echo '✓ requirement_comments 表创建完成';

-- ====================
-- 3. 创建需求历史记录表 (requirement_history)
-- ====================
\echo '创建 requirement_history 表...';

CREATE TABLE IF NOT EXISTS requirement_history (
    -- 主键
    id SERIAL PRIMARY KEY,

    -- 关联字段
    requirement_id INTEGER NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 变更信息
    action VARCHAR(50) NOT NULL,
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    comment TEXT,

    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

\echo '✓ requirement_history 表创建完成';

-- ====================
-- 4. 创建需求-任务多对多关联表 (requirement_tasks)
-- ====================
\echo '创建 requirement_tasks 表...';

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

\echo '✓ requirement_tasks 表创建完成';

-- ================================================
-- 第二部分: 创建索引
-- ================================================

\echo '';
\echo '========================================';
\echo '正在创建索引以优化查询性能...';
\echo '========================================';

-- requirements表索引
\echo '创建 requirements 表索引...';

CREATE INDEX IF NOT EXISTS idx_requirements_enterprise ON requirements(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_requirements_project ON requirements(project_id);
CREATE INDEX IF NOT EXISTS idx_requirements_submitter ON requirements(submitter_id);
CREATE INDEX IF NOT EXISTS idx_requirements_reviewer ON requirements(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_requirements_status ON requirements(status);
CREATE INDEX IF NOT EXISTS idx_requirements_priority ON requirements(priority);
CREATE INDEX IF NOT EXISTS idx_requirements_display_id ON requirements(display_id);
CREATE INDEX IF NOT EXISTS idx_requirements_created ON requirements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requirements_converted_task ON requirements(converted_task_id);

-- 全文搜索索引
CREATE INDEX IF NOT EXISTS idx_requirements_search ON requirements
    USING gin(to_tsvector('simple', title || ' ' || COALESCE(description, '')));

-- 复合索引（常用查询优化）
CREATE INDEX IF NOT EXISTS idx_requirements_enterprise_status ON requirements(enterprise_id, status);
CREATE INDEX IF NOT EXISTS idx_requirements_status_created ON requirements(status, created_at DESC);

\echo '✓ requirements 索引创建完成 (12个)';

-- requirement_comments表索引
\echo '创建 requirement_comments 表索引...';

CREATE INDEX IF NOT EXISTS idx_req_comments_req ON requirement_comments(requirement_id)
    WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_req_comments_user ON requirement_comments(user_id)
    WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_req_comments_created ON requirement_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_req_comments_req_time ON requirement_comments(requirement_id, created_at DESC)
    WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_req_comments_parent ON requirement_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_req_comments_deleted ON requirement_comments(deleted_at)
    WHERE deleted_at IS NOT NULL;

-- @用户提及索引
CREATE INDEX IF NOT EXISTS idx_req_comments_mentioned_users
    ON requirement_comments USING gin(mentioned_user_ids);
CREATE INDEX IF NOT EXISTS idx_req_comments_mentioned_count
    ON requirement_comments(mentioned_count) WHERE mentioned_count > 0;

\echo '✓ requirement_comments 索引创建完成 (8个)';

-- requirement_history表索引
\echo '创建 requirement_history 表索引...';

CREATE INDEX IF NOT EXISTS idx_req_history_req ON requirement_history(requirement_id);
CREATE INDEX IF NOT EXISTS idx_req_history_user ON requirement_history(user_id);
CREATE INDEX IF NOT EXISTS idx_req_history_created ON requirement_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_req_history_action ON requirement_history(action);
CREATE INDEX IF NOT EXISTS idx_req_history_req_created ON requirement_history(requirement_id, created_at DESC);

\echo '✓ requirement_history 索引创建完成 (5个)';

-- requirement_tasks表索引
\echo '创建 requirement_tasks 表索引...';

CREATE INDEX IF NOT EXISTS idx_requirement_tasks_requirement ON requirement_tasks(requirement_id);
CREATE INDEX IF NOT EXISTS idx_requirement_tasks_task ON requirement_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_requirement_tasks_type ON requirement_tasks(link_type);
CREATE INDEX IF NOT EXISTS idx_requirement_tasks_linked_by ON requirement_tasks(linked_by);
CREATE INDEX IF NOT EXISTS idx_requirement_tasks_req_type ON requirement_tasks(requirement_id, link_type);
CREATE INDEX IF NOT EXISTS idx_requirement_tasks_task_type ON requirement_tasks(task_id, link_type);

\echo '✓ requirement_tasks 索引创建完成 (6个)';

-- ================================================
-- 第三部分: 创建触发器和函数
-- ================================================

\echo '';
\echo '========================================';
\echo '正在创建触发器和函数...';
\echo '========================================';

-- 自动更新requirements的updated_at字段
\echo '创建 requirements updated_at 触发器...';

CREATE OR REPLACE FUNCTION update_requirements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS trigger_requirements_updated_at
    BEFORE UPDATE ON requirements
    FOR EACH ROW
    EXECUTE FUNCTION update_requirements_updated_at();

\echo '✓ requirements 触发器创建完成';

-- 自动更新requirement_comments的updated_at字段
\echo '创建 requirement_comments updated_at 触发器...';

CREATE OR REPLACE FUNCTION update_requirement_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS trigger_requirement_comments_updated_at
    BEFORE UPDATE ON requirement_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_requirement_comments_updated_at();

\echo '✓ requirement_comments 触发器创建完成';

-- 自动更新requirement_tasks的updated_at字段
\echo '创建 requirement_tasks updated_at 触发器...';

CREATE OR REPLACE FUNCTION update_requirement_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS trigger_requirement_tasks_updated_at
    BEFORE UPDATE ON requirement_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_requirement_tasks_updated_at();

\echo '✓ requirement_tasks 触发器创建完成';

-- 自动维护mentioned_count字段
\echo '创建 mentioned_count 同步触发器...';

CREATE OR REPLACE FUNCTION sync_requirement_comment_mentioned_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.mentioned_user_ids IS NOT NULL THEN
        NEW.mentioned_count = jsonb_array_length(NEW.mentioned_user_ids);
    ELSE
        NEW.mentioned_count = 0;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS trigger_sync_mentioned_count
    BEFORE INSERT OR UPDATE ON requirement_comments
    FOR EACH ROW
    WHEN (NEW.mentioned_user_ids IS DISTINCT FROM OLD.mentioned_user_ids OR TG_OP = 'INSERT')
    EXECUTE FUNCTION sync_requirement_comment_mentioned_count();

\echo '✓ mentioned_count 同步触发器创建完成';

-- ================================================
-- 第四部分: 添加注释
-- ================================================

\echo '';
\echo '========================================';
\echo '正在添加表和字段注释...';
\echo '========================================';

-- 表注释
COMMENT ON TABLE requirements IS '需求管理表 - 复用enterprises、users、projects、tasks表';
COMMENT ON TABLE requirement_comments IS '需求评论表 - 支持@用户提及功能';
COMMENT ON TABLE requirement_history IS '需求历史记录表 - 审计追踪';
COMMENT ON TABLE requirement_tasks IS '需求-任务多对多关联表';

-- requirements表字段注释
COMMENT ON COLUMN requirements.id IS '需求唯一标识';
COMMENT ON COLUMN requirements.display_id IS '需求编号（REQ-YYYY-NNNN格式）';
COMMENT ON COLUMN requirements.status IS '需求状态：draft草稿, pending待评审, reviewing评审中, need_more_info待补充, approved已通过, rejected已拒绝, converted已转任务, archived已归档';
COMMENT ON COLUMN requirements.priority IS '优先级：low低, medium中, high高, critical紧急';
COMMENT ON COLUMN requirements.mentioned_user_ids IS '@提及的用户ID列表 - JSONB数组';
COMMENT ON COLUMN requirements.mentioned_count IS '@提及的用户数量 - 性能优化字段';

-- requirement_comments表字段注释
COMMENT ON COLUMN requirement_comments.mentioned_user_ids IS '@提及的用户ID列表 - JSONB数组格式';
COMMENT ON COLUMN requirement_comments.mentioned_count IS '@提及的用户数量 - 避免每次解析JSONB';

-- requirement_tasks表字段注释
COMMENT ON COLUMN requirement_tasks.link_type IS '关联类型：manual手动关联, converted需求转任务, related相关联';

\echo '✓ 表和字段注释添加完成';

-- ================================================
-- 第五部分: 更新数据库统计信息
-- ================================================

\echo '';
\echo '========================================';
\echo '正在更新数据库统计信息...';
\echo '========================================';

ANALYZE requirements;
ANALYZE requirement_comments;
ANALYZE requirement_history;
ANALYZE requirement_tasks;

\echo '✓ 数据库统计信息更新完成';

-- 提交事务
COMMIT;

-- ================================================
-- 迁移完成总结
-- ================================================

\echo '';
\echo '========================================';
\echo '✓ 需求管理系统迁移完成！';
\echo '========================================';
\echo '';
\echo '创建的表:';
\echo '  ✓ requirements (需求主表)';
\echo '  ✓ requirement_comments (评论表，含@提及)';
\echo '  ✓ requirement_history (历史记录表)';
\echo '  ✓ requirement_tasks (需求-任务关联表)';
\echo '';
\echo '创建的索引:';
\echo '  ✓ 31 个索引 (包括全文搜索和GIN索引)';
\echo '';
\echo '创建的触发器:';
\echo '  ✓ 4 个触发器 (自动更新时间戳和同步计数)';
\echo '';
\echo '创建的函数:';
\echo '  ✓ 4 个数据库函数';
\echo '';
\echo '执行时间: 约 10-15 秒';
\echo '========================================';
\echo '';
