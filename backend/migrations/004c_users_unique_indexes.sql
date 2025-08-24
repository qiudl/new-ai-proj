-- Ensure unique constraints on users for username and lower(email) when present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'users_username_unique_idx'
    ) THEN
        CREATE UNIQUE INDEX users_username_unique_idx ON users(username) WHERE username IS NOT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'users_email_unique_idx'
    ) THEN
        CREATE UNIQUE INDEX users_email_unique_idx ON users(lower(email)) WHERE email IS NOT NULL;
    END IF;
END $$;
