-- 090_create_requirements_system.sql
-- 创建需求管理系统表（复用enterprises、users、projects、tasks表）
-- 作者: Claude AI
-- 日期: 2025-10-13
-- 预计执行时间: <5秒

BEGIN;

-- ====================
-- 1. 创建需求主表 (requirements)
-- ====================
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
        'draft', 'pending', 'reviewing', 'need_more',
        'approved', 'rejected', 'converted', 'archived'
    )),
    CONSTRAINT check_req_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    CONSTRAINT check_req_complexity CHECK (complexity IN ('simple', 'medium', 'complex', 'very_complex'))
);

-- 索引优化
CREATE INDEX idx_requirements_enterprise ON requirements(enterprise_id);
CREATE INDEX idx_requirements_project ON requirements(project_id);
CREATE INDEX idx_requirements_submitter ON requirements(submitter_id);
CREATE INDEX idx_requirements_reviewer ON requirements(reviewer_id);
CREATE INDEX idx_requirements_status ON requirements(status);
CREATE INDEX idx_requirements_priority ON requirements(priority);
CREATE INDEX idx_requirements_display_id ON requirements(display_id);
CREATE INDEX idx_requirements_created ON requirements(created_at DESC);
CREATE INDEX idx_requirements_converted_task ON requirements(converted_task_id);

-- 全文搜索索引
CREATE INDEX idx_requirements_search ON requirements
    USING gin(to_tsvector('simple', title || ' ' || COALESCE(description, '')));

-- 复合索引（常用查询优化）
CREATE INDEX idx_requirements_enterprise_status ON requirements(enterprise_id, status);
CREATE INDEX idx_requirements_status_created ON requirements(status, created_at DESC);

-- ====================
-- 2. 创建需求评论表 (requirement_comments)
-- ====================
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

    -- 特殊标记
    is_internal BOOLEAN DEFAULT false,  -- 内部评论（客户不可见）
    is_pinned BOOLEAN DEFAULT false,    -- 置顶评论

    -- 状态管理（参考task_comments）
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

-- 索引（参考task_comments的索引设计）
CREATE INDEX idx_req_comments_req ON requirement_comments(requirement_id)
    WHERE status = 'active';
CREATE INDEX idx_req_comments_user ON requirement_comments(user_id)
    WHERE status = 'active';
CREATE INDEX idx_req_comments_created ON requirement_comments(created_at DESC);
CREATE INDEX idx_req_comments_req_time ON requirement_comments(requirement_id, created_at DESC)
    WHERE status = 'active';
CREATE INDEX idx_req_comments_parent ON requirement_comments(parent_comment_id);
CREATE INDEX idx_req_comments_deleted ON requirement_comments(deleted_at)
    WHERE deleted_at IS NOT NULL;

-- ====================
-- 3. 创建需求历史记录表 (requirement_history)
-- ====================
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

-- 索引
CREATE INDEX idx_req_history_req ON requirement_history(requirement_id);
CREATE INDEX idx_req_history_user ON requirement_history(user_id);
CREATE INDEX idx_req_history_created ON requirement_history(created_at DESC);
CREATE INDEX idx_req_history_action ON requirement_history(action);
CREATE INDEX idx_req_history_req_created ON requirement_history(requirement_id, created_at DESC);

-- ====================
-- 4. 创建触发器
-- ====================

-- 自动更新requirements的updated_at字段
CREATE OR REPLACE FUNCTION update_requirements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_requirements_updated_at
    BEFORE UPDATE ON requirements
    FOR EACH ROW
    EXECUTE FUNCTION update_requirements_updated_at();

-- 自动更新requirement_comments的updated_at字段
CREATE OR REPLACE FUNCTION update_requirement_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_requirement_comments_updated_at
    BEFORE UPDATE ON requirement_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_requirement_comments_updated_at();

-- ====================
-- 5. 添加表注释
-- ====================
COMMENT ON TABLE requirements IS '需求管理表 - 复用enterprises、users、projects、tasks表';
COMMENT ON TABLE requirement_comments IS '需求评论表 - 参考task_comments设计';
COMMENT ON TABLE requirement_history IS '需求历史记录表 - 审计追踪';

-- 字段注释 - requirements表
COMMENT ON COLUMN requirements.id IS '需求唯一标识';
COMMENT ON COLUMN requirements.display_id IS '需求编号（REQ-YYYY-NNNN格式）';
COMMENT ON COLUMN requirements.title IS '需求标题';
COMMENT ON COLUMN requirements.description IS '需求详细描述';
COMMENT ON COLUMN requirements.project_id IS '关联项目ID（复用projects表）';
COMMENT ON COLUMN requirements.enterprise_id IS '关联企业ID（复用enterprises表）';
COMMENT ON COLUMN requirements.submitter_id IS '提交人用户ID（复用users表）';
COMMENT ON COLUMN requirements.reviewer_id IS '评审人用户ID（复用users表）';
COMMENT ON COLUMN requirements.status IS '需求状态：draft草稿, pending待评审, reviewing评审中, need_more待补充, approved已通过, rejected已拒绝, converted已转任务, archived已归档';
COMMENT ON COLUMN requirements.priority IS '优先级：low低, medium中, high高, urgent紧急';
COMMENT ON COLUMN requirements.category IS '需求类别：feature功能, bug_fix缺陷修复, enhancement增强, optimization优化';
COMMENT ON COLUMN requirements.business_value IS '商业价值描述';
COMMENT ON COLUMN requirements.expected_outcome IS '期望成果';
COMMENT ON COLUMN requirements.acceptance_criteria IS '验收标准';
COMMENT ON COLUMN requirements.attachments IS '附件列表（JSON格式）';
COMMENT ON COLUMN requirements.review_status IS '评审状态';
COMMENT ON COLUMN requirements.review_comment IS '评审意见';
COMMENT ON COLUMN requirements.review_score IS '评审评分（1-10分）';
COMMENT ON COLUMN requirements.reviewed_at IS '评审时间';
COMMENT ON COLUMN requirements.estimated_hours IS '预估工时';
COMMENT ON COLUMN requirements.estimated_cost IS '预估成本';
COMMENT ON COLUMN requirements.complexity IS '复杂度：simple简单, medium中等, complex复杂, very_complex非常复杂';
COMMENT ON COLUMN requirements.converted_task_id IS '转化后的任务ID（关联tasks表）';
COMMENT ON COLUMN requirements.converted_at IS '转化时间';
COMMENT ON COLUMN requirements.converted_by IS '转化操作人ID';
COMMENT ON COLUMN requirements.submitted_at IS '提交评审时间';
COMMENT ON COLUMN requirements.due_date IS '截止日期';
COMMENT ON COLUMN requirements.created_at IS '创建时间';
COMMENT ON COLUMN requirements.updated_at IS '最后更新时间';

-- 字段注释 - requirement_comments表
COMMENT ON COLUMN requirement_comments.id IS '评论ID（主键）';
COMMENT ON COLUMN requirement_comments.requirement_id IS '关联的需求ID';
COMMENT ON COLUMN requirement_comments.user_id IS '评论作者ID';
COMMENT ON COLUMN requirement_comments.parent_comment_id IS '父评论ID（支持评论回复）';
COMMENT ON COLUMN requirement_comments.content IS '评论内容（1-2000字符）';
COMMENT ON COLUMN requirement_comments.comment_type IS '评论类型：general一般评论, question提问, suggestion建议, approval批准';
COMMENT ON COLUMN requirement_comments.attachments IS '附件列表（JSON格式）';
COMMENT ON COLUMN requirement_comments.is_internal IS '是否内部评论（对客户不可见）';
COMMENT ON COLUMN requirement_comments.is_pinned IS '是否置顶';
COMMENT ON COLUMN requirement_comments.status IS '状态：active活跃, deleted已删除';
COMMENT ON COLUMN requirement_comments.created_at IS '创建时间';
COMMENT ON COLUMN requirement_comments.updated_at IS '最后更新时间';
COMMENT ON COLUMN requirement_comments.deleted_at IS '软删除时间戳';
COMMENT ON COLUMN requirement_comments.deleted_by IS '删除操作者ID';

-- 字段注释 - requirement_history表
COMMENT ON COLUMN requirement_history.id IS '历史记录ID';
COMMENT ON COLUMN requirement_history.requirement_id IS '关联的需求ID';
COMMENT ON COLUMN requirement_history.user_id IS '操作用户ID';
COMMENT ON COLUMN requirement_history.action IS '操作类型：created, updated, status_changed, reviewed, converted, commented等';
COMMENT ON COLUMN requirement_history.field_name IS '变更字段名称';
COMMENT ON COLUMN requirement_history.old_value IS '旧值';
COMMENT ON COLUMN requirement_history.new_value IS '新值';
COMMENT ON COLUMN requirement_history.comment IS '操作备注';
COMMENT ON COLUMN requirement_history.created_at IS '操作时间';

COMMIT;

-- ====================
-- 输出创建信息
-- ====================
\echo '==========================================';
\echo 'Requirements system migration completed';
\echo '';
\echo 'Tables created:';
\echo '  - requirements (需求主表)';
\echo '  - requirement_comments (评论表)';
\echo '  - requirement_history (历史记录表)';
\echo '';
\echo 'Reusing existing tables:';
\echo '  - enterprises (企业/客户组织)';
\echo '  - users (用户体系)';
\echo '  - projects (项目)';
\echo '  - tasks (任务-需求转化目标)';
\echo '';
\echo 'Indexes created: 23 indexes';
\echo 'Triggers created: 2 triggers';
\echo 'Full-text search: enabled';
\echo '==========================================';
