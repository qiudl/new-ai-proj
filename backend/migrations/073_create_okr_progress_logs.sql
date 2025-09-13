-- Migration: Create OKR progress logs tables (top-level for compose core mode)
-- Description: Tracks key result progress updates with audit info

CREATE TABLE IF NOT EXISTS okr_progress_logs (
    id SERIAL PRIMARY KEY,
    objective_id INTEGER NOT NULL REFERENCES okr_objectives(id) ON DELETE CASCADE,
    key_result_id INTEGER NOT NULL REFERENCES okr_key_results(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    previous_value DECIMAL(12,4),
    new_value DECIMAL(12,4),
    previous_progress INTEGER CHECK (previous_progress >= 0 AND previous_progress <= 100),
    new_progress INTEGER CHECK (new_progress >= 0 AND new_progress <= 100),
    method VARCHAR(20) DEFAULT 'manual' CHECK (method IN ('manual','auto')),
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_okr_progress_logs_objective ON okr_progress_logs(objective_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_okr_progress_logs_key_result ON okr_progress_logs(key_result_id, created_at DESC);
