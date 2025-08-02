-- Migration: Add pause/resume fields to users table for Phase 3
-- Date: 2025-01-28
-- Description: Add timing_paused_time and timing_accumulated_seconds fields to support pause/resume functionality

-- Add pause/resume fields to users table
ALTER TABLE users 
ADD COLUMN timing_paused_time TIMESTAMP NULL DEFAULT NULL,
ADD COLUMN timing_accumulated_seconds INTEGER NOT NULL DEFAULT 0;

-- Add indexes for performance
CREATE INDEX idx_users_timing_paused_time ON users(timing_paused_time);
CREATE INDEX idx_users_timing_accumulated_seconds ON users(timing_accumulated_seconds);

-- Update timing_status enum to include 'paused' state (if not already present)
DO $$
BEGIN
    -- Check if 'paused' already exists in the enum
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_enum 
        WHERE enumlabel = 'paused' 
        AND enumtypid = (
            SELECT oid 
            FROM pg_type 
            WHERE typname = 'timing_status_type'
        )
    ) THEN
        -- Add 'paused' to the existing enum
        ALTER TYPE timing_status_type ADD VALUE 'paused';
    END IF;
END$$;

-- Add comments for documentation
COMMENT ON COLUMN users.timing_paused_time IS 'Timestamp when the timer was paused (NULL if not paused)';
COMMENT ON COLUMN users.timing_accumulated_seconds IS 'Accumulated seconds from previous timing sessions before current pause';

-- Migration completed