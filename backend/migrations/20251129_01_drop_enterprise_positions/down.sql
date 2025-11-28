-- Migration: Restore enterprise_positions table
-- Description: Recreate position management table (rollback)
-- Date: 2024-11-29

-- Recreate the enterprise_positions table
CREATE TABLE IF NOT EXISTS enterprise_positions (
    id SERIAL PRIMARY KEY,
    enterprise_id INTEGER NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50),
    description TEXT,
    level INTEGER DEFAULT 1,
    parent_id INTEGER REFERENCES enterprise_positions(id) ON DELETE SET NULL,
    sort_order INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_enterprise_positions_enterprise_id ON enterprise_positions(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_positions_name ON enterprise_positions(name);
CREATE INDEX IF NOT EXISTS idx_enterprise_positions_code ON enterprise_positions(code);
