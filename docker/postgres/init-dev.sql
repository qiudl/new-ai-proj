-- Development environment additional data
-- This script runs after the main init.sql

-- Insert additional development users with bcrypt hashed passwords
-- Note: In production, use proper password hashing
INSERT INTO users (username, password_hash, role) VALUES 
('testuser1', '$2a$10$rOhwZ8sZFCjltzNdQqSLg.6qF2vKKcnwz0JN5jzMQjBpYOJQcn7BS', 'user'),  -- password: test123
('testuser2', '$2a$10$rOhwZ8sZFCjltzNdQqSLg.6qF2vKKcnwz0JN5jzMQjBpYOJQcn7BS', 'user'),  -- password: test123
('projectmanager', '$2a$10$rOhwZ8sZFCjltzNdQqSLg.6qF2vKKcnwz0JN5jzMQjBpYOJQcn7BS', 'user'); -- password: test123

-- Insert sample projects for development
INSERT INTO projects (name, description, owner_id) VALUES 
('示例项目1', '这是一个用于测试的示例项目', 1),
('AI模型训练项目', '机器学习模型训练和部署项目', 1),
('前端开发项目', 'React前端应用开发项目', 2);

-- Insert sample tasks for development
INSERT INTO tasks (project_id, title, description, status, assignee_id, due_date, custom_fields) VALUES 
(1, '项目环境搭建', '搭建开发环境，包括Docker配置', 'completed', 1, '2025-07-20', '{"priority": "high", "estimated_hours": 8}'),
(1, '数据库设计', '设计项目数据库表结构', 'in_progress', 1, '2025-07-21', '{"priority": "high", "estimated_hours": 16}'),
(1, 'API接口开发', '开发后端RESTful API接口', 'todo', 2, '2025-07-25', '{"priority": "medium", "estimated_hours": 32}'),
(1, '前端页面开发', '开发React前端页面', 'todo', 2, '2025-07-28', '{"priority": "medium", "estimated_hours": 40}'),
(1, '测试用例编写', '编写单元测试和集成测试', 'todo', 1, '2025-07-30', '{"priority": "low", "estimated_hours": 16}'),

(2, '数据收集和预处理', '收集训练数据并进行预处理', 'in_progress', 1, '2025-07-22', '{"priority": "high", "estimated_hours": 24, "dataset_size": "10GB"}'),
(2, '模型架构设计', '设计深度学习模型架构', 'todo', 1, '2025-07-24', '{"priority": "high", "estimated_hours": 16, "model_type": "transformer"}'),
(2, '模型训练和调优', '训练模型并进行超参数调优', 'todo', 1, '2025-07-28', '{"priority": "high", "estimated_hours": 48, "gpu_required": true}'),

(3, '组件库搭建', '搭建React组件库', 'completed', 2, '2025-07-19', '{"priority": "medium", "estimated_hours": 12, "ui_framework": "antd"}'),
(3, '路由配置', '配置React Router路由', 'in_progress', 2, '2025-07-21', '{"priority": "medium", "estimated_hours": 8, "router_version": "v6"}'),
(3, '状态管理', '集成Redux或Context API进行状态管理', 'todo', 2, '2025-07-23', '{"priority": "medium", "estimated_hours": 16, "state_tool": "redux-toolkit"});

-- Create development-specific indexes for testing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_dev_custom_priority ON tasks USING GIN ((custom_fields->>'priority'));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_dev_estimated_hours ON tasks USING GIN ((custom_fields->>'estimated_hours'));

-- Development-specific database settings
-- Enable query logging for development
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_duration = on;
ALTER SYSTEM SET log_min_duration_statement = 0;

-- Select configuration reload
SELECT pg_reload_conf();