-- Migration: Password History and Expiration Policy
-- Purpose: Implement password history tracking and password expiration policy
-- Date: 2025-11-15

-- ============================================================================
-- Part 1: Create password_history table
-- ============================================================================

CREATE TABLE IF NOT EXISTS password_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,

    -- Metadata
    ip_address VARCHAR(45),  -- Support both IPv4 and IPv6
    user_agent TEXT,
    change_reason VARCHAR(50), -- 'user_initiated', 'admin_reset', 'forced_expiry', 'security_policy'

    -- Indexes for performance
    CONSTRAINT password_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for password history
CREATE INDEX idx_password_history_user_id ON password_history(user_id);
CREATE INDEX idx_password_history_created_at ON password_history(created_at DESC);
CREATE INDEX idx_password_history_user_created ON password_history(user_id, created_at DESC);

-- Comment on table
COMMENT ON TABLE password_history IS 'Stores historical passwords for users to prevent password reuse';
COMMENT ON COLUMN password_history.user_id IS 'User who owns this password history entry';
COMMENT ON COLUMN password_history.password_hash IS 'Bcrypt hash of the historical password';
COMMENT ON COLUMN password_history.change_reason IS 'Reason for password change: user_initiated, admin_reset, forced_expiry, security_policy';

-- ============================================================================
-- Part 2: Add password expiration fields to users table
-- ============================================================================

-- Add password_changed_at field
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE;

-- Add password_expires_at field
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_expires_at TIMESTAMP WITH TIME ZONE;

-- Add must_change_password field (for forced password changes)
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

-- Add password_expiry_days field (customizable per user, default 90 days)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_expiry_days INTEGER DEFAULT 90;

-- Set password_changed_at for existing users (assume current time if NULL)
UPDATE users
SET password_changed_at = COALESCE(updated_at, created_at, NOW())
WHERE password_changed_at IS NULL;

-- Set password_expires_at for existing users (90 days from password_changed_at)
UPDATE users
SET password_expires_at = password_changed_at + INTERVAL '90 days'
WHERE password_expires_at IS NULL AND password_changed_at IS NOT NULL;

-- Create indexes for password expiration
CREATE INDEX idx_users_password_expires_at ON users(password_expires_at) WHERE password_expires_at IS NOT NULL;
CREATE INDEX idx_users_must_change_password ON users(must_change_password) WHERE must_change_password = TRUE;

-- Comments on new columns
COMMENT ON COLUMN users.password_changed_at IS 'Timestamp of last password change';
COMMENT ON COLUMN users.password_expires_at IS 'Timestamp when password will expire and user must change it';
COMMENT ON COLUMN users.must_change_password IS 'Flag indicating user must change password on next login';
COMMENT ON COLUMN users.password_expiry_days IS 'Number of days until password expires (default 90, customizable per user)';

-- ============================================================================
-- Part 3: Create function to automatically update password_expires_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_password_expiry()
RETURNS TRIGGER AS $$
BEGIN
    -- When password is changed, automatically update password_expires_at
    IF NEW.password_hash IS DISTINCT FROM OLD.password_hash THEN
        NEW.password_changed_at := NOW();
        NEW.password_expires_at := NOW() + INTERVAL '1 day' * COALESCE(NEW.password_expiry_days, 90);
        NEW.must_change_password := FALSE;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_password_expiry ON users;
CREATE TRIGGER trigger_update_password_expiry
    BEFORE UPDATE ON users
    FOR EACH ROW
    WHEN (NEW.password_hash IS DISTINCT FROM OLD.password_hash)
    EXECUTE FUNCTION update_password_expiry();

COMMENT ON FUNCTION update_password_expiry() IS 'Automatically updates password expiration date when password is changed';

-- ============================================================================
-- Part 4: Create helper function to check password expiration status
-- ============================================================================

CREATE OR REPLACE FUNCTION get_password_expiration_status(p_user_id INTEGER)
RETURNS TABLE (
    is_expired BOOLEAN,
    days_until_expiry INTEGER,
    must_change BOOLEAN,
    warning_threshold_reached BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        CASE
            WHEN u.password_expires_at IS NULL THEN FALSE
            WHEN u.password_expires_at <= NOW() THEN TRUE
            ELSE FALSE
        END AS is_expired,
        CASE
            WHEN u.password_expires_at IS NULL THEN NULL
            ELSE EXTRACT(DAY FROM u.password_expires_at - NOW())::INTEGER
        END AS days_until_expiry,
        u.must_change_password AS must_change,
        CASE
            WHEN u.password_expires_at IS NULL THEN FALSE
            WHEN u.password_expires_at - NOW() <= INTERVAL '7 days' THEN TRUE
            ELSE FALSE
        END AS warning_threshold_reached
    FROM users u
    WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_password_expiration_status(INTEGER) IS 'Returns password expiration status for a user';

-- ============================================================================
-- Part 5: Create view for password expiration monitoring
-- ============================================================================

CREATE OR REPLACE VIEW v_password_expiration_status AS
SELECT
    u.id AS user_id,
    u.username,
    u.email,
    u.password_changed_at,
    u.password_expires_at,
    u.must_change_password,
    u.password_expiry_days,
    CASE
        WHEN u.password_expires_at IS NULL THEN 'no_expiry'
        WHEN u.password_expires_at <= NOW() THEN 'expired'
        WHEN u.password_expires_at - NOW() <= INTERVAL '7 days' THEN 'expiring_soon'
        ELSE 'active'
    END AS expiry_status,
    CASE
        WHEN u.password_expires_at IS NULL THEN NULL
        ELSE EXTRACT(DAY FROM u.password_expires_at - NOW())::INTEGER
    END AS days_until_expiry,
    (
        SELECT COUNT(*)
        FROM password_history ph
        WHERE ph.user_id = u.id
    ) AS password_history_count
FROM users u;

COMMENT ON VIEW v_password_expiration_status IS 'Provides overview of password expiration status for all users';

-- ============================================================================
-- Part 6: Grant permissions
-- ============================================================================

-- Grant permissions on password_history table
GRANT SELECT, INSERT ON password_history TO PUBLIC;
GRANT USAGE ON SEQUENCE password_history_id_seq TO PUBLIC;

-- ============================================================================
-- Part 7: Insert initial password history for existing users
-- ============================================================================

-- Insert current passwords into password_history for all existing users
INSERT INTO password_history (user_id, password_hash, created_at, change_reason)
SELECT
    id,
    password_hash,
    COALESCE(password_changed_at, updated_at, created_at),
    'initial_migration'
FROM users
WHERE password_hash IS NOT NULL
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Migration Complete
-- ============================================================================
