-- Table: users
-- Stores user information, including credentials and roles.
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: projects
-- Stores project information, each linked to an owner user.
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: tasks
-- Stores task details, linked to a project and an optional assignee user.
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'todo',
    assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    due_date DATE,
    custom_fields JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---
-- Initial Data
-- ---

-- Insert three initial users.
-- Note: password_hash should be generated using a secure hashing algorithm (e.g., bcrypt) in a real application.
-- For development, we're using bcrypt hashed passwords (cost=10)
-- Default password for all users: "password123"
INSERT INTO users (username, password_hash, role) VALUES
('admin', '$2a$10$rOhwZ8sZFCjltzNdQqSLg.6qF2vKKcnwz0JN5jzMQjBpYOJQcn7BS', 'admin'),
('dev_user_1', '$2a$10$rOhwZ8sZFCjltzNdQqSLg.6qF2vKKcnwz0JN5jzMQjBpYOJQcn7BS', 'user'),
('dev_user_2', '$2a$10$rOhwZ8sZFCjltzNdQqSLg.6qF2vKKcnwz0JN5jzMQjBpYOJQcn7BS', 'user');

-- Insert sample projects for development and testing
INSERT INTO projects (name, description, owner_id) VALUES
('AI项目管理平台MVP', '智能项目管理平台的最小可行产品开发', 1),
('机器学习模型训练', '深度学习模型训练和部署项目', 1),
('前端界面优化', 'React前端界面设计和用户体验优化', 2);

-- Insert sample tasks for development and testing
INSERT INTO tasks (project_id, title, description, status, assignee_id, due_date, custom_fields) VALUES
-- Project 1 tasks (AI项目管理平台MVP)
(1, '环境配置与Docker化', '搭建完整的开发环境，包括Docker容器配置', 'completed', 1, '2025-07-20', 
 '{"priority": "high", "estimated_hours": 16, "category": "infrastructure", "tags": ["docker", "environment"]}'),

(1, '数据库设计与初始化', '设计PostgreSQL数据库表结构，创建初始化脚本', 'in_progress', 1, '2025-07-22', 
 '{"priority": "high", "estimated_hours": 12, "category": "database", "tags": ["postgresql", "schema"]}'),

(1, 'Go后端API开发', '开发RESTful API接口，包括认证、项目管理、任务管理', 'todo', 1, '2025-07-25', 
 '{"priority": "high", "estimated_hours": 32, "category": "backend", "tags": ["go", "api", "rest"]}'),

(1, 'React前端页面开发', '开发用户界面，包括登录、项目列表、任务管理页面', 'todo', 2, '2025-07-28', 
 '{"priority": "high", "estimated_hours": 40, "category": "frontend", "tags": ["react", "ui", "typescript"]}'),

(1, '批量导入功能实现', '实现AI辅助的任务批量导入功能', 'todo', 1, '2025-07-30', 
 '{"priority": "high", "estimated_hours": 24, "category": "feature", "tags": ["import", "ai", "claude"]}'),

(1, '单元测试与集成测试', '编写全面的测试用例，确保代码质量', 'todo', 3, '2025-08-02', 
 '{"priority": "medium", "estimated_hours": 20, "category": "testing", "tags": ["unit-test", "integration"]}'),

-- Project 2 tasks (机器学习模型训练)
(2, '数据收集与预处理', '收集训练数据，进行清洗和预处理', 'in_progress', 1, '2025-07-25', 
 '{"priority": "high", "estimated_hours": 24, "category": "data", "tags": ["preprocessing", "etl"], "dataset_size": "50GB"}'),

(2, '模型架构设计', '设计深度学习模型架构，选择合适的算法', 'todo', 1, '2025-07-28', 
 '{"priority": "high", "estimated_hours": 16, "category": "modeling", "tags": ["architecture", "deep-learning"], "model_type": "transformer"}'),

(2, '模型训练与优化', '训练模型并进行超参数调优', 'todo', 1, '2025-08-05', 
 '{"priority": "high", "estimated_hours": 48, "category": "training", "tags": ["training", "optimization"], "gpu_required": true}'),

(2, '模型评估与验证', '评估模型性能，进行交叉验证', 'todo', 1, '2025-08-08', 
 '{"priority": "medium", "estimated_hours": 16, "category": "evaluation", "tags": ["validation", "metrics"]}'),

-- Project 3 tasks (前端界面优化)
(3, 'UI/UX设计规范', '制定统一的设计规范和组件库', 'completed', 2, '2025-07-18', 
 '{"priority": "medium", "estimated_hours": 12, "category": "design", "tags": ["ui", "ux", "design-system"]}'),

(3, '响应式布局优化', '优化移动端和桌面端的响应式布局', 'in_progress', 2, '2025-07-22', 
 '{"priority": "medium", "estimated_hours": 18, "category": "frontend", "tags": ["responsive", "mobile", "css"]}'),

(3, '性能优化', '优化页面加载速度和交互性能', 'todo', 2, '2025-07-26', 
 '{"priority": "medium", "estimated_hours": 14, "category": "optimization", "tags": ["performance", "loading", "bundle"]}'),

(3, '无障碍访问改进', '提高应用的无障碍访问性', 'todo', 2, '2025-07-29', 
 '{"priority": "low", "estimated_hours": 10, "category": "accessibility", "tags": ["a11y", "accessibility"]});

-- ---
-- Indexes
-- ---

-- Indexes are automatically created for PRIMARY KEY and UNIQUE constraints.
-- The following indexes are recommended to improve query performance on foreign keys and frequently filtered columns.

-- Index on users.username for faster login lookups.
CREATE INDEX idx_users_username ON users(username);

-- Index on projects.owner_id for faster queries of projects by owner.
CREATE INDEX idx_projects_owner_id ON projects(owner_id);

-- Index on tasks.project_id for faster retrieval of tasks within a project.
CREATE INDEX idx_tasks_project_id ON tasks(project_id);

-- Index on tasks.assignee_id for faster lookup of tasks assigned to a user.
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);

-- Index on tasks.status for filtering tasks by their status.
CREATE INDEX idx_tasks_status ON tasks(status);

-- GIN index on tasks.custom_fields for efficient querying of data within the JSONB field.
CREATE INDEX idx_tasks_custom_fields ON tasks USING GIN(custom_fields);

-- Additional indexes for better performance
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);
CREATE INDEX idx_projects_created_at ON projects(created_at);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Partial indexes for active tasks and projects
CREATE INDEX idx_tasks_active ON tasks(project_id, status) WHERE status IN ('todo', 'in_progress');
CREATE INDEX idx_projects_active ON projects(owner_id, created_at) WHERE created_at >= NOW() - INTERVAL '30 days';

-- ---
-- Constraints and Triggers
-- ---

-- Add check constraints for data validation
ALTER TABLE users ADD CONSTRAINT chk_users_username_length CHECK (LENGTH(username) >= 3);
ALTER TABLE users ADD CONSTRAINT chk_users_role CHECK (role IN ('admin', 'user'));

ALTER TABLE projects ADD CONSTRAINT chk_projects_name_length CHECK (LENGTH(name) >= 1);

ALTER TABLE tasks ADD CONSTRAINT chk_tasks_title_length CHECK (LENGTH(title) >= 1);
ALTER TABLE tasks ADD CONSTRAINT chk_tasks_status CHECK (status IN ('todo', 'in_progress', 'completed', 'cancelled'));
ALTER TABLE tasks ADD CONSTRAINT chk_tasks_due_date CHECK (due_date >= CURRENT_DATE - INTERVAL '1 year');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at column to tables
ALTER TABLE users ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE projects ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE tasks ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---
-- Views for Common Queries
-- ---

-- View for task statistics by project
CREATE VIEW project_task_stats AS
SELECT 
    p.id as project_id,
    p.name as project_name,
    p.owner_id,
    u.username as owner_username,
    COUNT(t.id) as total_tasks,
    COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
    COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_tasks,
    COUNT(CASE WHEN t.status = 'todo' THEN 1 END) as todo_tasks,
    ROUND(
        COUNT(CASE WHEN t.status = 'completed' THEN 1 END) * 100.0 / 
        NULLIF(COUNT(t.id), 0), 2
    ) as completion_percentage
FROM projects p
LEFT JOIN tasks t ON p.id = t.project_id
LEFT JOIN users u ON p.owner_id = u.id
GROUP BY p.id, p.name, p.owner_id, u.username;

-- View for user task assignments
CREATE VIEW user_task_assignments AS
SELECT 
    u.id as user_id,
    u.username,
    u.role,
    COUNT(t.id) as assigned_tasks,
    COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
    COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_tasks,
    COUNT(CASE WHEN t.status = 'todo' THEN 1 END) as todo_tasks
FROM users u
LEFT JOIN tasks t ON u.id = t.assignee_id
GROUP BY u.id, u.username, u.role;

-- View for overdue tasks
CREATE VIEW overdue_tasks AS
SELECT 
    t.id,
    t.title,
    t.description,
    t.status,
    t.due_date,
    t.created_at,
    p.name as project_name,
    u.username as assignee_username,
    CURRENT_DATE - t.due_date as days_overdue
FROM tasks t
JOIN projects p ON t.project_id = p.id
LEFT JOIN users u ON t.assignee_id = u.id
WHERE t.due_date < CURRENT_DATE 
  AND t.status IN ('todo', 'in_progress')
ORDER BY t.due_date ASC;

-- ---
-- Functions for Business Logic
-- ---

-- Function to get project progress
CREATE OR REPLACE FUNCTION get_project_progress(project_id_param INTEGER)
RETURNS TABLE(
    total_tasks INTEGER,
    completed_tasks INTEGER,
    progress_percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_tasks,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::INTEGER as completed_tasks,
        ROUND(
            COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / 
            NULLIF(COUNT(*), 0), 2
        ) as progress_percentage
    FROM tasks 
    WHERE project_id = project_id_param;
END;
$$ LANGUAGE plpgsql;

-- Function to get user task summary
CREATE OR REPLACE FUNCTION get_user_task_summary(user_id_param INTEGER)
RETURNS TABLE(
    total_assigned INTEGER,
    completed INTEGER,
    in_progress INTEGER,
    todo INTEGER,
    overdue INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_assigned,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::INTEGER as completed,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END)::INTEGER as in_progress,
        COUNT(CASE WHEN status = 'todo' THEN 1 END)::INTEGER as todo,
        COUNT(CASE WHEN due_date < CURRENT_DATE AND status IN ('todo', 'in_progress') THEN 1 END)::INTEGER as overdue
    FROM tasks 
    WHERE assignee_id = user_id_param;
END;
$$ LANGUAGE plpgsql;

-- ---
-- Database Settings and Optimizations
-- ---

-- Set some PostgreSQL configuration for better performance
-- Note: These are session-level settings for development
SET shared_preload_libraries = 'pg_stat_statements';
SET log_statement = 'all';
SET log_min_duration_statement = 1000;  -- Log slow queries (>1s)
SET work_mem = '4MB';
SET maintenance_work_mem = '64MB';
SET effective_cache_size = '128MB';

-- ---
-- Final Data Validation
-- ---

-- Verify that all foreign key relationships are intact
DO $$
BEGIN
    -- Check that all projects have valid owners
    IF EXISTS (SELECT 1 FROM projects WHERE owner_id NOT IN (SELECT id FROM users)) THEN
        RAISE EXCEPTION 'Invalid project owner references found';
    END IF;
    
    -- Check that all tasks have valid projects
    IF EXISTS (SELECT 1 FROM tasks WHERE project_id NOT IN (SELECT id FROM projects)) THEN
        RAISE EXCEPTION 'Invalid task project references found';
    END IF;
    
    -- Check that all tasks with assignees have valid user references
    IF EXISTS (SELECT 1 FROM tasks WHERE assignee_id IS NOT NULL AND assignee_id NOT IN (SELECT id FROM users)) THEN
        RAISE EXCEPTION 'Invalid task assignee references found';
    END IF;
    
    RAISE NOTICE 'Database initialization completed successfully!';
    RAISE NOTICE 'Created % users, % projects, % tasks', 
        (SELECT COUNT(*) FROM users),
        (SELECT COUNT(*) FROM projects),
        (SELECT COUNT(*) FROM tasks);
END $$;

