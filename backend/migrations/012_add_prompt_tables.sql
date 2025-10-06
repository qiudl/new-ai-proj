-- Migration: 012_add_prompt_tables.sql
-- Description: 创建提示词模板表和用户提示词历史表
-- Created: 2025-10-06

BEGIN;

-- 1. 创建 prompt_templates 表
CREATE TABLE IF NOT EXISTS prompt_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    content TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'general',
    tags TEXT[],
    usage_count INT DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0.00,
    recommended_models TEXT[],
    is_system BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_prompt_templates_category ON prompt_templates(category);
CREATE INDEX idx_prompt_templates_active ON prompt_templates(is_active);
CREATE INDEX idx_prompt_templates_usage ON prompt_templates(usage_count DESC);
CREATE INDEX idx_prompt_templates_tags ON prompt_templates USING GIN(tags);

-- 2. 创建 user_prompt_history 表
CREATE TABLE IF NOT EXISTS user_prompt_history (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id),
    parent_task_id INT NOT NULL REFERENCES tasks(id),
    prompt_text TEXT NOT NULL,
    template_id INT REFERENCES prompt_templates(id),
    ai_provider VARCHAR(50) NOT NULL,
    ai_model VARCHAR(100) NOT NULL,
    subtasks_generated INT DEFAULT 0,
    subtasks_accepted INT DEFAULT 0,
    total_estimated_hours DECIMAL(10,2),
    is_successful BOOLEAN,
    user_rating INT CHECK (user_rating >= 1 AND user_rating <= 5),
    user_feedback TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_parent_task FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_prompt_history_user ON user_prompt_history(user_id);
CREATE INDEX idx_user_prompt_history_task ON user_prompt_history(parent_task_id);
CREATE INDEX idx_user_prompt_history_provider ON user_prompt_history(ai_provider);
CREATE INDEX idx_user_prompt_history_created ON user_prompt_history(created_at DESC);
CREATE INDEX idx_user_prompt_history_success ON user_prompt_history(is_successful);
CREATE INDEX idx_user_prompt_recommendation ON user_prompt_history(user_id, is_successful, created_at DESC);

-- 3. 插入系统预设模板
INSERT INTO prompt_templates (name, description, content, category, tags, recommended_models) VALUES
('技术任务分解', '适用于技术开发任务的详细分解', '请将这个任务分解为具体的开发子任务，包括：前端开发、后端API、数据库设计、测试等环节。每个子任务需要明确技术栈和预估工时（以AI的开发效率评估，单位：小时）。', 'technical', ARRAY['开发', '技术', '编程'], ARRAY['openai', 'claude']),
('功能设计规划', '适用于产品功能的设计和规划', '请帮我设计这个功能的实现方案，包括：用户交互流程、数据模型、API接口设计、前后端分工等。需要考虑可扩展性和用户体验。', 'technical', ARRAY['设计', '产品', '规划'], ARRAY['claude']),
('问题排查任务', '适用于Bug修复和问题排查', '请将这个问题的排查过程分解为多个步骤：问题复现、日志分析、代码审查、修复方案、测试验证等。每个步骤需要明确目标和验收标准。', 'technical', ARRAY['调试', 'Bug', '排查'], ARRAY['openai', 'claude']),
('文档编写计划', '适用于技术文档和用户文档编写', '请规划这个文档的编写任务，包括：大纲设计、内容编写、示例代码、图表制作、审校发布等环节。需要考虑目标读者和文档结构。', 'general', ARRAY['文档', '写作'], ARRAY['claude']),
('测试用例设计', '适用于测试任务的规划', '请设计这个功能的测试计划，包括：单元测试、集成测试、UI测试、性能测试等。每个测试类型需要明确测试场景和验证点。', 'technical', ARRAY['测试', '质量'], ARRAY['openai', 'claude']);

COMMIT;
