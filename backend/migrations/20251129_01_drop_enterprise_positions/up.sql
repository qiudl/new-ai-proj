-- Migration: Drop enterprise_positions table
-- Description: Remove position management feature from the system
-- Date: 2024-11-29

-- Drop the enterprise_positions table if it exists
DROP TABLE IF EXISTS enterprise_positions CASCADE;

-- Remove any related indexes (they will be dropped with the table, but just in case)
DROP INDEX IF EXISTS idx_enterprise_positions_enterprise_id;
DROP INDEX IF EXISTS idx_enterprise_positions_name;
DROP INDEX IF EXISTS idx_enterprise_positions_code;
