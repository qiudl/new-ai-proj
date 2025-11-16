-- Rollback Migration: Password Reset Tokens
-- Purpose: Remove password reset token system
-- Date: 2025-11-15

-- ============================================================================
-- Part 1: Drop view
-- ============================================================================

DROP VIEW IF EXISTS v_password_reset_stats;

-- ============================================================================
-- Part 2: Drop functions
-- ============================================================================

DROP FUNCTION IF EXISTS cleanup_expired_reset_tokens();
DROP FUNCTION IF EXISTS mark_reset_token_used(INTEGER, VARCHAR, TEXT);
DROP FUNCTION IF EXISTS is_reset_token_valid(TEXT);
DROP FUNCTION IF EXISTS revoke_old_reset_tokens() CASCADE;

-- ============================================================================
-- Part 3: Drop triggers
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_revoke_old_reset_tokens ON password_reset_tokens;

-- ============================================================================
-- Part 4: Drop table
-- ============================================================================

DROP TABLE IF EXISTS password_reset_tokens CASCADE;

-- ============================================================================
-- Rollback Complete
-- ============================================================================
