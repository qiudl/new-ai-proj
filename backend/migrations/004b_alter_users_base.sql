-- Alter users table to add core columns required by application
BEGIN;

-- Core identity and auth fields
ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS password_hash TEXT,
    ADD COLUMN IF NOT EXISTS user_type VARCHAR(20) DEFAULT 'system',
    ADD COLUMN IF NOT EXISTS company_id INTEGER,
    ADD COLUMN IF NOT EXISTS company_user_id INTEGER,
    ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user',
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS profile JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Basic uniqueness where possible (email can be NULL here; add unique only when not NULL)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'users_email_unique_idx'
    ) THEN
        CREATE UNIQUE INDEX users_email_unique_idx ON users(lower(email)) WHERE email IS NOT NULL;
    END IF;
END $$;

COMMIT;
