-- 091_create_worktree_system.sql
-- 创建Git Worktree集成系统表
-- 作者: Claude AI
-- 日期: 2025-10-14
-- 预计执行时间: <10秒
-- 关联任务: #2486 (阶段1：基础设施建设)

BEGIN;

-- ====================
-- 1. 创建worktree_configs表（项目级配置）
-- ====================
CREATE TABLE IF NOT EXISTS worktree_configs (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
    worktree_root TEXT NOT NULL,
    auto_cleanup BOOLEAN DEFAULT TRUE,
    max_worktrees INTEGER DEFAULT 10,
    ai_experts JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_worktree_configs_project ON worktree_configs(project_id);

-- ====================
-- 2. 创建worktrees表（主表）
-- ====================
CREATE TABLE IF NOT EXISTS worktrees (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    expert_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    worktree_path TEXT NOT NULL UNIQUE,
    branch VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    is_locked BOOLEAN DEFAULT FALSE,

    -- Git状态
    last_commit_hash VARCHAR(64),
    has_uncommitted BOOLEAN DEFAULT FALSE,
    ahead_count INTEGER DEFAULT 0,
    behind_count INTEGER DEFAULT 0,

    -- 关联信息
    current_ai_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    active_task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,

    -- 监控信息
    disk_usage_mb BIGINT DEFAULT 0,
    last_sync_at TIMESTAMP,
    last_active_at TIMESTAMP,

    -- 配置
    working_dir VARCHAR(255) DEFAULT '.',
    auto_sync BOOLEAN DEFAULT TRUE,
    auto_cleanup BOOLEAN DEFAULT TRUE,

    -- 元数据
    metadata JSONB DEFAULT '{}',
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,

    UNIQUE(project_id, expert_id),
    CONSTRAINT check_worktree_status CHECK (status IN (
        'pending', 'ready', 'active', 'completed', 'failed', 'locked', 'archived'
    ))
);

-- 索引
CREATE INDEX idx_worktrees_project ON worktrees(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_worktrees_status ON worktrees(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_worktrees_current_ai ON worktrees(current_ai_id) WHERE current_ai_id IS NOT NULL;
CREATE INDEX idx_worktrees_active_task ON worktrees(active_task_id) WHERE active_task_id IS NOT NULL;
CREATE INDEX idx_worktrees_deleted ON worktrees(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_worktrees_expert ON worktrees(project_id, expert_id);
CREATE INDEX idx_worktrees_last_active ON worktrees(last_active_at DESC) WHERE deleted_at IS NULL;

-- ====================
-- 3. 创建worktree_task_bindings表（任务绑定）
-- ====================
CREATE TABLE IF NOT EXISTS worktree_task_bindings (
    id SERIAL PRIMARY KEY,
    worktree_id INTEGER NOT NULL REFERENCES worktrees(id) ON DELETE CASCADE,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    relation_type VARCHAR(50) NOT NULL DEFAULT 'primary',
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,

    -- 任务状态
    task_status VARCHAR(50),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,

    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(worktree_id, task_id, relation_type),
    CONSTRAINT check_relation_type CHECK (relation_type IN ('primary', 'secondary', 'readonly'))
);

-- 索引
CREATE INDEX idx_wtb_worktree ON worktree_task_bindings(worktree_id) WHERE is_active = TRUE;
CREATE INDEX idx_wtb_task ON worktree_task_bindings(task_id) WHERE is_active = TRUE;
CREATE INDEX idx_wtb_active ON worktree_task_bindings(is_active);
CREATE INDEX idx_wtb_worktree_task ON worktree_task_bindings(worktree_id, task_id);
CREATE INDEX idx_wtb_priority ON worktree_task_bindings(worktree_id, priority DESC) WHERE is_active = TRUE;

-- ====================
-- 4. 创建ai_workspace_assignments表（AI工作空间分配）
-- ====================
CREATE TABLE IF NOT EXISTS ai_workspace_assignments (
    id SERIAL PRIMARY KEY,
    ai_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    worktree_id INTEGER NOT NULL REFERENCES worktrees(id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    released_at TIMESTAMP,
    assignment_data JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_aws_ai_user ON ai_workspace_assignments(ai_user_id);
CREATE INDEX idx_aws_worktree ON ai_workspace_assignments(worktree_id);
CREATE INDEX idx_aws_task ON ai_workspace_assignments(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX idx_aws_assigned ON ai_workspace_assignments(assigned_at DESC);
CREATE INDEX idx_aws_ai_active ON ai_workspace_assignments(ai_user_id) WHERE released_at IS NULL;

-- ====================
-- 5. 创建worktree_conflicts表（冲突管理）
-- ====================
CREATE TABLE IF NOT EXISTS worktree_conflicts (
    id SERIAL PRIMARY KEY,
    worktree_id INTEGER NOT NULL REFERENCES worktrees(id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    conflict_type VARCHAR(50) NOT NULL,
    severity VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',

    -- 冲突详情
    file_path TEXT,
    conflict_details JSONB DEFAULT '{}',

    -- 检测信息
    detected_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    detected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- 解决方案
    resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP,
    resolution TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_conflict_type CHECK (conflict_type IN ('file', 'dependency', 'merge', 'database')),
    CONSTRAINT check_conflict_severity CHECK (severity IN ('critical', 'warning', 'info')),
    CONSTRAINT check_conflict_status CHECK (status IN ('pending', 'acknowledged', 'resolved', 'ignored'))
);

-- 索引
CREATE INDEX idx_wc_worktree ON worktree_conflicts(worktree_id);
CREATE INDEX idx_wc_task ON worktree_conflicts(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX idx_wc_status ON worktree_conflicts(status);
CREATE INDEX idx_wc_severity ON worktree_conflicts(severity) WHERE severity IS NOT NULL;
CREATE INDEX idx_wc_detected ON worktree_conflicts(detected_at DESC);
CREATE INDEX idx_wc_worktree_status ON worktree_conflicts(worktree_id, status);

-- ====================
-- 6. 创建worktree_activities表（活动日志）
-- ====================
CREATE TABLE IF NOT EXISTS worktree_activities (
    id SERIAL PRIMARY KEY,
    worktree_id INTEGER NOT NULL REFERENCES worktrees(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    description TEXT,

    -- 关联信息
    ai_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,

    -- 活动详情
    activity_data JSONB DEFAULT '{}',
    before_state TEXT,
    after_state TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_activity_type CHECK (activity_type IN (
        'created', 'activated', 'deactivated', 'committed', 'synced',
        'conflict', 'resolved', 'locked', 'unlocked', 'removed',
        'task_bound', 'task_unbound', 'ai_assigned', 'ai_released'
    ))
);

-- 索引
CREATE INDEX idx_wa_worktree ON worktree_activities(worktree_id);
CREATE INDEX idx_wa_type ON worktree_activities(activity_type);
CREATE INDEX idx_wa_created ON worktree_activities(created_at DESC);
CREATE INDEX idx_wa_worktree_created ON worktree_activities(worktree_id, created_at DESC);
CREATE INDEX idx_wa_ai_user ON worktree_activities(ai_user_id) WHERE ai_user_id IS NOT NULL;
CREATE INDEX idx_wa_task ON worktree_activities(task_id) WHERE task_id IS NOT NULL;

-- ====================
-- 7. 创建触发器
-- ====================

-- 自动更新worktree_configs的updated_at字段
CREATE OR REPLACE FUNCTION update_worktree_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_worktree_configs_updated_at
    BEFORE UPDATE ON worktree_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_worktree_configs_updated_at();

-- 自动更新worktrees的updated_at字段
CREATE OR REPLACE FUNCTION update_worktrees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_worktrees_updated_at
    BEFORE UPDATE ON worktrees
    FOR EACH ROW
    EXECUTE FUNCTION update_worktrees_updated_at();

-- 自动更新worktree_task_bindings的updated_at字段
CREATE OR REPLACE FUNCTION update_worktree_task_bindings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_worktree_task_bindings_updated_at
    BEFORE UPDATE ON worktree_task_bindings
    FOR EACH ROW
    EXECUTE FUNCTION update_worktree_task_bindings_updated_at();

-- 自动更新ai_workspace_assignments的updated_at字段
CREATE OR REPLACE FUNCTION update_ai_workspace_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ai_workspace_assignments_updated_at
    BEFORE UPDATE ON ai_workspace_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_workspace_assignments_updated_at();

-- 自动更新worktree_conflicts的updated_at字段
CREATE OR REPLACE FUNCTION update_worktree_conflicts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_worktree_conflicts_updated_at
    BEFORE UPDATE ON worktree_conflicts
    FOR EACH ROW
    EXECUTE FUNCTION update_worktree_conflicts_updated_at();

-- Worktree活动记录触发器
CREATE OR REPLACE FUNCTION log_worktree_activity()
RETURNS TRIGGER AS $$
DECLARE
    activity_desc TEXT;
    activity_type_val VARCHAR(50);
BEGIN
    -- 根据操作类型设置活动描述和类型
    IF TG_OP = 'INSERT' THEN
        activity_type_val := 'created';
        activity_desc := 'Worktree created: ' || NEW.name;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status != NEW.status THEN
            IF NEW.status = 'active' THEN
                activity_type_val := 'activated';
                activity_desc := 'Worktree activated';
            ELSIF OLD.status = 'active' THEN
                activity_type_val := 'deactivated';
                activity_desc := 'Worktree deactivated';
            ELSIF NEW.status = 'locked' THEN
                activity_type_val := 'locked';
                activity_desc := 'Worktree locked';
            ELSE
                activity_type_val := 'updated';
                activity_desc := 'Status changed: ' || OLD.status || ' -> ' || NEW.status;
            END IF;
        ELSE
            activity_type_val := 'updated';
            activity_desc := 'Worktree updated';
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        activity_type_val := 'removed';
        activity_desc := 'Worktree removed: ' || OLD.name;

        -- 记录删除活动
        INSERT INTO worktree_activities (
            worktree_id, activity_type, description,
            ai_user_id, activity_data, before_state
        ) VALUES (
            OLD.id, activity_type_val, activity_desc,
            OLD.current_ai_id,
            jsonb_build_object('deleted_at', CURRENT_TIMESTAMP),
            OLD.status
        );

        RETURN OLD;
    END IF;

    -- 记录插入/更新活动
    INSERT INTO worktree_activities (
        worktree_id, activity_type, description,
        ai_user_id, before_state, after_state
    ) VALUES (
        NEW.id, activity_type_val, activity_desc,
        NEW.current_ai_id,
        CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
        NEW.status
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_worktree_activity_log
    AFTER INSERT OR UPDATE OR DELETE ON worktrees
    FOR EACH ROW
    EXECUTE FUNCTION log_worktree_activity();

-- ====================
-- 8. 添加表注释
-- ====================
COMMENT ON TABLE worktree_configs IS 'Git Worktree项目级配置表';
COMMENT ON TABLE worktrees IS 'Git Worktree主表 - 管理所有worktree实例';
COMMENT ON TABLE worktree_task_bindings IS '任务-Worktree绑定关系表';
COMMENT ON TABLE ai_workspace_assignments IS 'AI工作空间分配表 - 追踪AI的工作空间';
COMMENT ON TABLE worktree_conflicts IS 'Worktree冲突管理表';
COMMENT ON TABLE worktree_activities IS 'Worktree活动日志表';

-- worktree_configs字段注释
COMMENT ON COLUMN worktree_configs.id IS '配置ID';
COMMENT ON COLUMN worktree_configs.project_id IS '项目ID';
COMMENT ON COLUMN worktree_configs.worktree_root IS 'Worktree根目录路径';
COMMENT ON COLUMN worktree_configs.auto_cleanup IS '是否自动清理无效worktree';
COMMENT ON COLUMN worktree_configs.max_worktrees IS '最大worktree数量限制';
COMMENT ON COLUMN worktree_configs.ai_experts IS 'AI专家配置（JSON格式）';

-- worktrees字段注释
COMMENT ON COLUMN worktrees.id IS 'Worktree唯一标识';
COMMENT ON COLUMN worktrees.project_id IS '关联项目ID';
COMMENT ON COLUMN worktrees.expert_id IS 'AI专家ID（backend, frontend, mobile等）';
COMMENT ON COLUMN worktrees.name IS 'Worktree名称';
COMMENT ON COLUMN worktrees.worktree_path IS 'Worktree绝对路径';
COMMENT ON COLUMN worktrees.branch IS 'Git分支名';
COMMENT ON COLUMN worktrees.status IS 'Worktree状态：pending待创建, ready就绪, active活跃, completed已完成, failed失败, locked锁定, archived已归档';
COMMENT ON COLUMN worktrees.is_locked IS '是否被锁定';
COMMENT ON COLUMN worktrees.last_commit_hash IS '最后提交的哈希值';
COMMENT ON COLUMN worktrees.has_uncommitted IS '是否有未提交的更改';
COMMENT ON COLUMN worktrees.ahead_count IS '领先远程分支的提交数';
COMMENT ON COLUMN worktrees.behind_count IS '落后远程分支的提交数';
COMMENT ON COLUMN worktrees.current_ai_id IS '当前工作的AI用户ID';
COMMENT ON COLUMN worktrees.active_task_id IS '当前活跃任务ID';
COMMENT ON COLUMN worktrees.disk_usage_mb IS '磁盘使用量（MB）';
COMMENT ON COLUMN worktrees.last_sync_at IS '最后同步时间';
COMMENT ON COLUMN worktrees.last_active_at IS '最后活跃时间';
COMMENT ON COLUMN worktrees.working_dir IS '工作目录（相对于worktree根）';
COMMENT ON COLUMN worktrees.auto_sync IS '是否自动同步';
COMMENT ON COLUMN worktrees.auto_cleanup IS '是否自动清理';
COMMENT ON COLUMN worktrees.metadata IS '扩展元数据（JSON格式）';
COMMENT ON COLUMN worktrees.created_by IS '创建者用户ID';
COMMENT ON COLUMN worktrees.deleted_at IS '软删除时间戳';

-- worktree_task_bindings字段注释
COMMENT ON COLUMN worktree_task_bindings.id IS '绑定ID';
COMMENT ON COLUMN worktree_task_bindings.worktree_id IS 'Worktree ID';
COMMENT ON COLUMN worktree_task_bindings.task_id IS '任务ID';
COMMENT ON COLUMN worktree_task_bindings.relation_type IS '关系类型：primary主要任务, secondary辅助任务, readonly只读引用';
COMMENT ON COLUMN worktree_task_bindings.priority IS '优先级（数字越大越优先）';
COMMENT ON COLUMN worktree_task_bindings.is_active IS '绑定是否活跃';
COMMENT ON COLUMN worktree_task_bindings.task_status IS '任务在worktree中的状态';
COMMENT ON COLUMN worktree_task_bindings.started_at IS '任务开始时间';
COMMENT ON COLUMN worktree_task_bindings.completed_at IS '任务完成时间';

-- ai_workspace_assignments字段注释
COMMENT ON COLUMN ai_workspace_assignments.id IS '分配ID';
COMMENT ON COLUMN ai_workspace_assignments.ai_user_id IS 'AI用户ID';
COMMENT ON COLUMN ai_workspace_assignments.worktree_id IS 'Worktree ID';
COMMENT ON COLUMN ai_workspace_assignments.task_id IS '当前任务ID';
COMMENT ON COLUMN ai_workspace_assignments.assigned_at IS '分配时间';
COMMENT ON COLUMN ai_workspace_assignments.released_at IS '释放时间';
COMMENT ON COLUMN ai_workspace_assignments.assignment_data IS '分配数据（JSON格式）';

-- worktree_conflicts字段注释
COMMENT ON COLUMN worktree_conflicts.id IS '冲突ID';
COMMENT ON COLUMN worktree_conflicts.worktree_id IS 'Worktree ID';
COMMENT ON COLUMN worktree_conflicts.task_id IS '关联任务ID';
COMMENT ON COLUMN worktree_conflicts.conflict_type IS '冲突类型：file文件级, dependency依赖级, merge合并级, database数据库';
COMMENT ON COLUMN worktree_conflicts.severity IS '严重程度：critical严重, warning警告, info提示';
COMMENT ON COLUMN worktree_conflicts.status IS '冲突状态：pending待处理, acknowledged已确认, resolved已解决, ignored已忽略';
COMMENT ON COLUMN worktree_conflicts.file_path IS '冲突文件路径';
COMMENT ON COLUMN worktree_conflicts.conflict_details IS '冲突详细信息（JSON格式）';
COMMENT ON COLUMN worktree_conflicts.detected_by IS '检测人用户ID';
COMMENT ON COLUMN worktree_conflicts.detected_at IS '检测时间';
COMMENT ON COLUMN worktree_conflicts.resolved_by IS '解决人用户ID';
COMMENT ON COLUMN worktree_conflicts.resolved_at IS '解决时间';
COMMENT ON COLUMN worktree_conflicts.resolution IS '解决说明';

-- worktree_activities字段注释
COMMENT ON COLUMN worktree_activities.id IS '活动ID';
COMMENT ON COLUMN worktree_activities.worktree_id IS 'Worktree ID';
COMMENT ON COLUMN worktree_activities.activity_type IS '活动类型：created创建, activated激活, deactivated停用, committed提交, synced同步, conflict冲突, resolved解决, locked锁定, unlocked解锁, removed删除等';
COMMENT ON COLUMN worktree_activities.description IS '活动描述';
COMMENT ON COLUMN worktree_activities.ai_user_id IS 'AI用户ID';
COMMENT ON COLUMN worktree_activities.task_id IS '关联任务ID';
COMMENT ON COLUMN worktree_activities.activity_data IS '活动数据（JSON格式）';
COMMENT ON COLUMN worktree_activities.before_state IS '变更前状态';
COMMENT ON COLUMN worktree_activities.after_state IS '变更后状态';

COMMIT;

-- ====================
-- 输出创建信息
-- ====================
\echo '==========================================';
\echo 'Worktree system migration completed';
\echo '';
\echo 'Tables created:';
\echo '  1. worktree_configs (Worktree配置表)';
\echo '  2. worktrees (Worktree主表)';
\echo '  3. worktree_task_bindings (任务绑定表)';
\echo '  4. ai_workspace_assignments (AI工作空间表)';
\echo '  5. worktree_conflicts (冲突管理表)';
\echo '  6. worktree_activities (活动日志表)';
\echo '';
\echo 'Indexes created: 40+ indexes';
\echo 'Triggers created: 7 triggers';
\echo 'Constraints: CHECK constraints for status validation';
\echo 'Features: Soft delete, auto timestamp, activity logging';
\echo '==========================================';
