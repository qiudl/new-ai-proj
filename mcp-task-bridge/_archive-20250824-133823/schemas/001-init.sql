-- Multi-AI Coordination Database Schema
-- Automatically executed when PostgreSQL container starts

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- AI Agents table
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('planner', 'coder', 'tester', 'runner', 'observer')),
    status VARCHAR(20) NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'busy', 'offline', 'error')),
    tmux_target VARCHAR(100), -- e.g., "ai-dev:coder.1"
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    capabilities JSONB DEFAULT '{}',
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tasks table (integration with MCP Task Bridge)
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    external_id INTEGER, -- Reference to MCP task bridge task ID
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'failed', 'cancelled')),
    priority VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    assigned_agent_id UUID REFERENCES agents(id),
    parent_task_id INTEGER REFERENCES tasks(id),
    estimated_minutes INTEGER DEFAULT 0,
    actual_minutes INTEGER DEFAULT 0,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    context JSONB DEFAULT '{}',
    result JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- Messages table for inter-agent communication
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(100) NOT NULL,
    from_agent_id UUID REFERENCES agents(id),
    to_agent_id UUID REFERENCES agents(id), -- NULL for broadcasts
    message_type VARCHAR(50) NOT NULL CHECK (message_type IN ('command', 'response', 'notification', 'broadcast', 'status', 'error')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    task_id INTEGER REFERENCES tasks(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    acknowledged_at TIMESTAMP
);

-- Execution runs table for tracking multi-agent sessions
CREATE TABLE IF NOT EXISTS runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(100) NOT NULL,
    title VARCHAR(200),
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'aborted')),
    tmux_session VARCHAR(100),
    participating_agents UUID[] DEFAULT '{}',
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    metrics JSONB DEFAULT '{}',
    logs TEXT[]
);

-- Workflow templates table
CREATE TABLE IF NOT EXISTS workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    template JSONB NOT NULL, -- Workflow definition
    version INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agents_role ON agents(role);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_last_activity ON agents(last_activity);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_agent ON tasks(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_external_id ON tasks(external_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);

CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_from_agent ON messages(from_agent_id);
CREATE INDEX IF NOT EXISTS idx_messages_to_agent ON messages(to_agent_id);
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_task ON messages(task_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

CREATE INDEX IF NOT EXISTS idx_runs_session ON runs(session_id);
CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status);
CREATE INDEX IF NOT EXISTS idx_runs_start_time ON runs(start_time);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default agents
INSERT INTO agents (name, role, tmux_target, capabilities) VALUES
    ('planner-1', 'planner', 'ai-dev:planner.0', '{"planning": true, "task_breakdown": true, "coordination": true}'),
    ('coder-1', 'coder', 'ai-dev:coder.0', '{"implementation": true, "code_review": true, "debugging": true}'),
    ('coder-2', 'coder', 'ai-dev:coder.1', '{"implementation": true, "refactoring": true, "optimization": true}'),
    ('tester-1', 'tester', 'ai-dev:tester.0', '{"unit_testing": true, "api_testing": true, "coverage": true}'),
    ('tester-2', 'tester', 'ai-dev:tester.1', '{"integration_testing": true, "e2e_testing": true, "performance": true}'),
    ('runner-1', 'runner', 'ai-dev:runner.0', '{"execution": true, "deployment": true, "monitoring": true}'),
    ('observer-1', 'observer', 'ai-dev:observer.0', '{"monitoring": true, "analysis": true, "reporting": true}')
ON CONFLICT (name) DO NOTHING;

-- Insert default workflow templates
INSERT INTO workflows (name, description, template) VALUES
    ('feature-development', 'Standard feature development workflow', '{
        "steps": [
            {"agent": "planner", "action": "analyze_requirements", "timeout": 300},
            {"agent": "planner", "action": "create_tasks", "timeout": 180},
            {"agent": "coder", "action": "implement_feature", "timeout": 1800},
            {"agent": "tester", "action": "write_tests", "timeout": 900},
            {"agent": "tester", "action": "run_tests", "timeout": 300},
            {"agent": "runner", "action": "deploy_staging", "timeout": 600},
            {"agent": "observer", "action": "validate_deployment", "timeout": 300}
        ],
        "success_criteria": ["all_tests_pass", "deployment_healthy", "requirements_met"],
        "rollback_strategy": "automated"
    }'),
    ('bug-fix', 'Bug fixing workflow', '{
        "steps": [
            {"agent": "planner", "action": "analyze_bug", "timeout": 180},
            {"agent": "coder", "action": "implement_fix", "timeout": 900},
            {"agent": "tester", "action": "test_fix", "timeout": 300},
            {"agent": "tester", "action": "regression_test", "timeout": 600},
            {"agent": "runner", "action": "deploy_fix", "timeout": 300},
            {"agent": "observer", "action": "monitor_fix", "timeout": 300}
        ],
        "success_criteria": ["bug_resolved", "no_regression", "deployment_stable"],
        "rollback_strategy": "immediate"
    }')
ON CONFLICT (name) DO NOTHING;

-- Create views for common queries
CREATE OR REPLACE VIEW active_agents AS
SELECT a.*, 
       COUNT(t.id) as active_tasks,
       EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - a.last_activity)) as seconds_since_activity
FROM agents a
LEFT JOIN tasks t ON a.id = t.assigned_agent_id AND t.status IN ('assigned', 'in_progress')
WHERE a.status != 'offline'
GROUP BY a.id;

CREATE OR REPLACE VIEW task_summary AS
SELECT 
    status,
    COUNT(*) as count,
    AVG(progress) as avg_progress,
    SUM(estimated_minutes) as total_estimated_minutes,
    SUM(actual_minutes) as total_actual_minutes
FROM tasks
GROUP BY status;

COMMENT ON TABLE agents IS 'AI agents participating in multi-agent development';
COMMENT ON TABLE tasks IS 'Tasks managed by the multi-AI system, integrated with MCP Task Bridge';
COMMENT ON TABLE messages IS 'Inter-agent communication messages';
COMMENT ON TABLE runs IS 'Multi-agent execution sessions';
COMMENT ON TABLE workflows IS 'Reusable workflow templates for common development patterns';
