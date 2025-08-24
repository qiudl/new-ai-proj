-- 002_ai_config.sql
-- Creates pgcrypto extension, encryption_keys table, and inserts a default key

BEGIN;

-- Ensure pgcrypto for gen_random_bytes
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encryption keys table
CREATE TABLE IF NOT EXISTS encryption_keys (
    id SERIAL PRIMARY KEY,
    key_name VARCHAR(255) NOT NULL UNIQUE,
    key_value TEXT NOT NULL, -- Base64 encoded encryption key
    algorithm VARCHAR(50) NOT NULL DEFAULT 'AES-256-GCM',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Insert default key if missing
INSERT INTO encryption_keys (key_name, key_value, algorithm, is_active)
SELECT 'default_ai_key', encode(gen_random_bytes(32), 'base64'), 'AES-256-GCM', true
WHERE NOT EXISTS (
    SELECT 1 FROM encryption_keys WHERE key_name = 'default_ai_key'
);

COMMIT;

