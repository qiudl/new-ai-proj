-- 核心数据库初始化和迁移脚本
-- 在数据库初始化时应用必要的迁移

-- 创建extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 创建基础表结构（从核心迁移合并）

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    full_name VARCHAR(255),
    avatar_url VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 项目表
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 任务表
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'todo',
    priority VARCHAR(20) DEFAULT 'medium',
    project_id INTEGER REFERENCES projects(id),
    parent_id INTEGER REFERENCES tasks(id),
    assignee_id INTEGER REFERENCES users(id),
    created_by INTEGER REFERENCES users(id),
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 进度相关字段
    manual_progress_override BOOLEAN DEFAULT FALSE,
    manual_progress_value NUMERIC(5,2) CHECK (manual_progress_value >= 0 AND manual_progress_value <= 100),
    checklist_total INTEGER DEFAULT 0 CHECK (checklist_total >= 0),
    checklist_done INTEGER DEFAULT 0 CHECK (checklist_done >= 0),
    actual_spent_seconds BIGINT DEFAULT 0 CHECK (actual_spent_seconds >= 0),
    story_points NUMERIC(10,2) CHECK (story_points >= 0),
    cached_progress NUMERIC(5,2) CHECK (cached_progress >= 0 AND cached_progress <= 100),
    cached_progress_updated_at TIMESTAMPTZ,
    
    CONSTRAINT chk_checklist_done_lte_total CHECK (checklist_done <= checklist_total)
);

-- 进度配置表
CREATE TABLE IF NOT EXISTS progress_config (
    id SERIAL PRIMARY KEY,
    config_name VARCHAR(100) NOT NULL UNIQUE,
    status_progress_map JSONB NOT NULL DEFAULT '{
        "draft": 0,
        "planning": 10,
        "todo": 0,
        "in_progress": 50,
        "testing": 75,
        "completed": 100,
        "cancelled": 0,
        "on_hold": null,
        "suspended": null,
        "blocked": 0,
        "archived": 100
    }'::jsonb,
    include_cancelled BOOLEAN DEFAULT FALSE,
    include_archived BOOLEAN DEFAULT FALSE,
    blocked_policy VARCHAR(20) DEFAULT 'zero' CHECK (blocked_policy IN ('zero', 'ignore', 'last_known')),
    default_weight_field VARCHAR(50) DEFAULT 'story_points' CHECK (default_weight_field IN ('story_points', 'estimated_hours', 'estimated_minutes', 'equal')),
    enable_caching BOOLEAN DEFAULT FALSE,
    cache_ttl_seconds INTEGER DEFAULT 300,
    default_calculation_method VARCHAR(50) DEFAULT 'status_based',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER,
    updated_by INTEGER
);

-- 进度快照表
CREATE TABLE IF NOT EXISTS progress_snapshots (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('task', 'epic', 'project', 'release')),
    entity_id INTEGER NOT NULL,
    progress NUMERIC(5,2) NOT NULL CHECK (progress >= 0 AND progress <= 100),
    method_used VARCHAR(100),
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    inputs JSONB DEFAULT '{}',
    breakdown JSONB DEFAULT '[]',
    config_id INTEGER REFERENCES progress_config(id),
    total_weight NUMERIC(10,2),
    children_count INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 任务时间记录表
CREATE TABLE IF NOT EXISTS task_time_logs (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_seconds INTEGER,
    description TEXT,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 加密密钥表
CREATE TABLE IF NOT EXISTS encryption_keys (
    id SERIAL PRIMARY KEY,
    key_name VARCHAR(100) NOT NULL UNIQUE,
    key_value TEXT NOT NULL,
    algorithm VARCHAR(50) DEFAULT 'AES-256-GCM',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- AI配置表
CREATE TABLE IF NOT EXISTS ai_configs (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_task_time_logs_task_id ON task_time_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_time_logs_user_id ON task_time_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_encryption_keys_active ON encryption_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_configs_active ON ai_configs(is_active);
CREATE INDEX IF NOT EXISTS idx_progress_snapshots_entity ON progress_snapshots(entity_type, entity_id, computed_at DESC);

-- 插入默认数据
INSERT INTO users (username, email, full_name) VALUES 
    ('admin', 'admin@example.com', 'Administrator')
ON CONFLICT (username) DO NOTHING;

INSERT INTO projects (name, description, created_by) VALUES 
    ('Default Project', 'Default project for tasks', 1)
ON CONFLICT DO NOTHING;

INSERT INTO progress_config (config_name, created_by, updated_by, status_progress_map) VALUES
    ('default', 1, 1, '{
        "draft": 0,
        "planning": 10,
        "todo": 0,
        "in_progress": 50,
        "testing": 75,
        "completed": 100,
        "cancelled": 0,
        "on_hold": null,
        "suspended": null,
        "blocked": 0,
        "archived": 100
    }')
ON CONFLICT (config_name) DO NOTHING;

-- 插入默认加密密钥
INSERT INTO encryption_keys (key_name, key_value, algorithm, is_active) VALUES
    ('default', encode(gen_random_bytes(32), 'base64'), 'AES-256-GCM', TRUE)
ON CONFLICT (key_name) DO NOTHING;

-- 输出初始化完成信息
\echo '==========================================';
\echo 'Database initialization completed';
\echo 'Tables created: users, projects, tasks, progress_config, task_time_logs';
\echo 'Default data inserted';
\echo '==========================================';
