-- Analytics schema and tables
CREATE SCHEMA IF NOT EXISTS analytics;

-- Base events table
CREATE TABLE IF NOT EXISTS analytics.events (
    id BIGSERIAL PRIMARY KEY,
    event TEXT NOT NULL,
    user_id TEXT,
    project_id BIGINT,
    task_id BIGINT,
    context JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_event ON analytics.events(event);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON analytics.events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_task_id ON analytics.events(task_id);

-- Dead letter table for invalid payloads
CREATE TABLE IF NOT EXISTS analytics.events_dead_letter (
    id BIGSERIAL PRIMARY KEY,
    payload JSONB NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
