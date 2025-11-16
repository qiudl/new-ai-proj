-- Migration: Password Reset Tokens
-- Purpose: Implement secure password reset token system for forgot password functionality
-- Date: 2025-11-15

-- ============================================================================
-- Part 1: Create password_reset_tokens table
-- ============================================================================

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    token_hash TEXT NOT NULL,  -- SHA-256 hash for additional security
    email VARCHAR(255) NOT NULL,

    -- Token lifecycle
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,

    -- Security tracking
    ip_address VARCHAR(45),  -- IP that requested the reset
    user_agent TEXT,
    reset_ip_address VARCHAR(45),  -- IP that used the token
    reset_user_agent TEXT,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, used, expired, revoked

    -- Constraints
    CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX idx_password_reset_tokens_email ON password_reset_tokens(email);
CREATE INDEX idx_password_reset_tokens_status ON password_reset_tokens(status);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
CREATE INDEX idx_password_reset_tokens_created_at ON password_reset_tokens(created_at DESC);

-- Comments
COMMENT ON TABLE password_reset_tokens IS 'Stores password reset tokens for forgot password functionality';
COMMENT ON COLUMN password_reset_tokens.token IS 'URL-safe random token (sent to user)';
COMMENT ON COLUMN password_reset_tokens.token_hash IS 'SHA-256 hash of token for verification';
COMMENT ON COLUMN password_reset_tokens.status IS 'Token status: pending, used, expired, revoked';
COMMENT ON COLUMN password_reset_tokens.expires_at IS 'Token expiration time (default 1 hour from creation)';

-- ============================================================================
-- Part 2: Create function to auto-revoke old tokens
-- ============================================================================

CREATE OR REPLACE FUNCTION revoke_old_reset_tokens()
RETURNS TRIGGER AS $$
BEGIN
    -- When a new token is created, revoke all other pending tokens for the same user
    UPDATE password_reset_tokens
    SET status = 'revoked'
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND status = 'pending';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_revoke_old_reset_tokens ON password_reset_tokens;
CREATE TRIGGER trigger_revoke_old_reset_tokens
    AFTER INSERT ON password_reset_tokens
    FOR EACH ROW
    EXECUTE FUNCTION revoke_old_reset_tokens();

COMMENT ON FUNCTION revoke_old_reset_tokens() IS 'Automatically revokes old pending reset tokens when a new one is created';

-- ============================================================================
-- Part 3: Create function to check token validity
-- ============================================================================

CREATE OR REPLACE FUNCTION is_reset_token_valid(p_token_hash TEXT)
RETURNS TABLE (
    is_valid BOOLEAN,
    user_id INTEGER,
    token_id INTEGER,
    error_message TEXT
) AS $$
DECLARE
    v_token RECORD;
    v_now TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
    -- Find the token
    SELECT * INTO v_token
    FROM password_reset_tokens
    WHERE token_hash = p_token_hash;

    -- Token not found
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::INTEGER, NULL::INTEGER, '重置令牌无效'::TEXT;
        RETURN;
    END IF;

    -- Check if already used
    IF v_token.used_at IS NOT NULL THEN
        RETURN QUERY SELECT FALSE, NULL::INTEGER, NULL::INTEGER, '重置令牌已被使用'::TEXT;
        RETURN;
    END IF;

    -- Check if expired
    IF v_token.expires_at < v_now THEN
        RETURN QUERY SELECT FALSE, NULL::INTEGER, NULL::INTEGER, '重置令牌已过期'::TEXT;
        RETURN;
    END IF;

    -- Check status
    IF v_token.status != 'pending' THEN
        RETURN QUERY SELECT FALSE, NULL::INTEGER, NULL::INTEGER, '重置令牌已失效'::TEXT;
        RETURN;
    END IF;

    -- Token is valid
    RETURN QUERY SELECT TRUE, v_token.user_id, v_token.id, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION is_reset_token_valid(TEXT) IS 'Checks if a password reset token is valid and returns user_id if valid';

-- ============================================================================
-- Part 4: Create function to mark token as used
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_reset_token_used(
    p_token_id INTEGER,
    p_reset_ip VARCHAR(45),
    p_reset_user_agent TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE password_reset_tokens
    SET
        used_at = NOW(),
        status = 'used',
        reset_ip_address = p_reset_ip,
        reset_user_agent = p_reset_user_agent
    WHERE id = p_token_id
      AND status = 'pending'
      AND used_at IS NULL;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION mark_reset_token_used(INTEGER, VARCHAR, TEXT) IS 'Marks a reset token as used';

-- ============================================================================
-- Part 5: Create function to cleanup expired tokens
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_reset_tokens()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- Mark expired tokens
    UPDATE password_reset_tokens
    SET status = 'expired'
    WHERE status = 'pending'
      AND expires_at < NOW();

    -- Delete tokens older than 7 days
    DELETE FROM password_reset_tokens
    WHERE created_at < NOW() - INTERVAL '7 days';

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_reset_tokens() IS 'Cleans up expired and old password reset tokens';

-- ============================================================================
-- Part 6: Create view for reset token statistics
-- ============================================================================

CREATE OR REPLACE VIEW v_password_reset_stats AS
SELECT
    COUNT(*) FILTER (WHERE status = 'pending') AS pending_tokens,
    COUNT(*) FILTER (WHERE status = 'used') AS used_tokens,
    COUNT(*) FILTER (WHERE status = 'expired') AS expired_tokens,
    COUNT(*) FILTER (WHERE status = 'revoked') AS revoked_tokens,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') AS tokens_last_24h,
    COUNT(*) FILTER (WHERE used_at IS NOT NULL AND used_at > NOW() - INTERVAL '24 hours') AS successful_resets_24h,
    AVG(EXTRACT(EPOCH FROM (used_at - created_at)) / 60) FILTER (WHERE used_at IS NOT NULL) AS avg_reset_time_minutes
FROM password_reset_tokens;

COMMENT ON VIEW v_password_reset_stats IS 'Provides statistics about password reset token usage';

-- ============================================================================
-- Part 7: Grant permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON password_reset_tokens TO PUBLIC;
GRANT USAGE ON SEQUENCE password_reset_tokens_id_seq TO PUBLIC;

-- ============================================================================
-- Migration Complete
-- ============================================================================
