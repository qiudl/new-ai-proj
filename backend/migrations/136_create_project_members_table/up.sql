-- 创建项目成员表
CREATE TABLE IF NOT EXISTS project_members (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role_id INTEGER REFERENCES roles(id),
    added_by INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_role_id ON project_members(role_id);

-- 添加注释
COMMENT ON TABLE project_members IS '项目成员表';
COMMENT ON COLUMN project_members.project_id IS '项目ID';
COMMENT ON COLUMN project_members.user_id IS '用户ID';
COMMENT ON COLUMN project_members.role_id IS '角色ID';
COMMENT ON COLUMN project_members.added_by IS '添加人ID';
