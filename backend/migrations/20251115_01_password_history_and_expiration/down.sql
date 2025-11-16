-- Rollback Migration: Password History and Expiration Policy
-- Purpose: Remove password history tracking and password expiration policy
-- Date: 2025-11-15

-- ============================================================================
-- Part 1: Drop view
-- ============================================================================

DROP VIEW IF EXISTS v_password_expiration_status;

-- ============================================================================
-- Part 2: Drop functions
-- ============================================================================

DROP FUNCTION IF EXISTS get_password_expiration_status(INTEGER);
DROP FUNCTION IF EXISTS update_password_expiry() CASCADE;

-- ============================================================================
-- Part 3: Drop triggers
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_update_password_expiry ON users;

-- ============================================================================
-- Part 4: Remove columns from users table
-- ============================================================================

DROP INDEX IF EXISTS idx_users_password_expires_at;
DROP INDEX IF EXISTS idx_users_must_change_password;

ALTER TABLE users DROP COLUMN IF EXISTS password_expiry_days;
ALTER TABLE users DROP COLUMN IF EXISTS must_change_password;
ALTER TABLE users DROP COLUMN IF EXISTS password_expires_at;
ALTER TABLE users DROP COLUMN IF EXISTS password_changed_at;

-- ============================================================================
-- Part 5: Drop password_history table
-- ============================================================================

DROP TABLE IF EXISTS password_history CASCADE;

-- ============================================================================
-- Rollback Complete
-- ============================================================================
