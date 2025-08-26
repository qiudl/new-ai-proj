-- Add soft delete support to users table
-- This migration adds deleted_at field to users table to support soft delete functionality
-- as required by the architecture blueprint

BEGIN;

-- Add deleted_at column to users table
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ;

-- Add index for better performance on soft delete queries
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);

-- Add composite index for active user lookups
CREATE INDEX IF NOT EXISTS idx_users_active_lookup ON users(id, deleted_at) 
WHERE deleted_at IS NULL;

-- Add composite index for username/email uniqueness with soft delete
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_active 
ON users(username) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_active 
ON users(email) WHERE deleted_at IS NULL;

-- Drop existing unique constraints since we now need conditional uniqueness
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;

COMMIT;
