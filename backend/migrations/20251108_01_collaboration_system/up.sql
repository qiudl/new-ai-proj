-- ============================================================================
-- 实时协作编辑系统 - 数据库Schema
-- 迁移版本: 20251108_01
-- 创建时间: 2025-11-08
-- 描述: 为Yjs协作编辑创建3个核心表
-- ============================================================================

-- 1. collaboration_documents 表
-- 存储每个需求文档字段的Yjs CRDT状态
CREATE TABLE IF NOT EXISTS collaboration_documents (
    id SERIAL PRIMARY KEY,
    requirement_id INTEGER NOT NULL,
    field_name VARCHAR(50) NOT NULL,
    yjs_document BYTEA,
    state_vector BYTEA,
    version INTEGER DEFAULT 0,
    last_modified_by INTEGER,
    last_modified_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,

    -- 约束
    UNIQUE(requirement_id, field_name),

    -- 外键
    FOREIGN KEY (requirement_id) REFERENCES requirements(id) ON DELETE CASCADE,
    FOREIGN KEY (last_modified_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 索引优化
CREATE INDEX idx_collab_docs_requirement ON collaboration_documents(requirement_id);
CREATE INDEX idx_collab_docs_field ON collaboration_documents(field_name);
CREATE INDEX idx_collab_docs_modified ON collaboration_documents(last_modified_at DESC);

-- 注释
COMMENT ON TABLE collaboration_documents IS '协作文档表 - 存储Yjs CRDT文档状态';
COMMENT ON COLUMN collaboration_documents.requirement_id IS '需求ID';
COMMENT ON COLUMN collaboration_documents.field_name IS '字段名称: description/business_value/expected_outcome/acceptance_criteria';
COMMENT ON COLUMN collaboration_documents.yjs_document IS 'Yjs文档完整状态（二进制）';
COMMENT ON COLUMN collaboration_documents.state_vector IS 'Yjs状态向量（用于同步）';
COMMENT ON COLUMN collaboration_documents.version IS '文档版本号（每次更新递增）';

-- ============================================================================

-- 2. collaboration_updates 表
-- 存储Yjs增量更新历史，用于历史回溯和审计
CREATE TABLE IF NOT EXISTS collaboration_updates (
    id BIGSERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL,
    update_data BYTEA NOT NULL,
    user_id INTEGER,
    timestamp TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,

    -- 外键
    FOREIGN KEY (document_id) REFERENCES collaboration_documents(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 索引优化
CREATE INDEX idx_collab_updates_doc ON collaboration_updates(document_id);
CREATE INDEX idx_collab_updates_timestamp ON collaboration_updates(timestamp DESC);
CREATE INDEX idx_collab_updates_user ON collaboration_updates(user_id);

-- 注释
COMMENT ON TABLE collaboration_updates IS '协作更新表 - 存储Yjs增量更新历史';
COMMENT ON COLUMN collaboration_updates.document_id IS '关联的协作文档ID';
COMMENT ON COLUMN collaboration_updates.update_data IS 'Yjs增量更新数据（二进制）';
COMMENT ON COLUMN collaboration_updates.user_id IS '执行更新的用户ID';

-- ============================================================================

-- 3. collaboration_sessions 表
-- 存储活跃的协作会话，用于用户presence和awareness
CREATE TABLE IF NOT EXISTS collaboration_sessions (
    id BIGSERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    session_id VARCHAR(100) NOT NULL,
    user_name VARCHAR(255),
    user_color VARCHAR(20),
    cursor_position JSONB,
    selection_range JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    last_heartbeat TIMESTAMP DEFAULT NOW(),
    joined_at TIMESTAMP DEFAULT NOW(),
    left_at TIMESTAMP,
    deleted_at TIMESTAMP,

    -- 外键
    FOREIGN KEY (document_id) REFERENCES collaboration_documents(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 索引优化
CREATE INDEX idx_collab_sessions_doc ON collaboration_sessions(document_id);
CREATE INDEX idx_collab_sessions_user ON collaboration_sessions(user_id);
CREATE INDEX idx_collab_sessions_active ON collaboration_sessions(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_collab_sessions_heartbeat ON collaboration_sessions(last_heartbeat DESC);
CREATE UNIQUE INDEX idx_collab_sessions_unique ON collaboration_sessions(document_id, user_id, session_id) WHERE deleted_at IS NULL;

-- 注释
COMMENT ON TABLE collaboration_sessions IS '协作会话表 - 存储活跃用户会话信息';
COMMENT ON COLUMN collaboration_sessions.document_id IS '关联的协作文档ID';
COMMENT ON COLUMN collaboration_sessions.user_id IS '用户ID';
COMMENT ON COLUMN collaboration_sessions.session_id IS 'WebSocket会话ID（唯一标识）';
COMMENT ON COLUMN collaboration_sessions.user_color IS '用户显示颜色（hex）';
COMMENT ON COLUMN collaboration_sessions.cursor_position IS '光标位置（JSON）';
COMMENT ON COLUMN collaboration_sessions.selection_range IS '选中范围（JSON）';
COMMENT ON COLUMN collaboration_sessions.is_active IS '会话是否活跃';
COMMENT ON COLUMN collaboration_sessions.last_heartbeat IS '最后心跳时间';

-- ============================================================================

-- 清理过期会话的函数（可选，用于定时任务）
CREATE OR REPLACE FUNCTION cleanup_inactive_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- 将超过5分钟无心跳的会话标记为不活跃
    UPDATE collaboration_sessions
    SET is_active = FALSE, left_at = NOW()
    WHERE is_active = TRUE
      AND last_heartbeat < NOW() - INTERVAL '5 minutes'
      AND left_at IS NULL;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_inactive_sessions() IS '清理不活跃的协作会话（超过5分钟无心跳）';

-- ============================================================================
-- 迁移完成
-- ============================================================================
