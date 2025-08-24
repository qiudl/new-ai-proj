-- Seed base roles and create a platform SystemAdmin from env vars if provided
BEGIN;

-- Ensure roles table has basic roles
INSERT INTO roles (name, description, is_system)
VALUES
  ('admin', 'System administrator with full access', true),
  ('manager', 'Project manager', true),
  ('user', 'Regular user', true)
ON CONFLICT (name) DO NOTHING;

-- Optionally create a platform admin user if env-provided
-- Use psql variables passed by env: ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD_HASH
DO $$
DECLARE
  v_username text := current_setting('app.admin_username', true);
  v_email    text := current_setting('app.admin_email', true);
  v_hash     text := current_setting('app.admin_password_hash', true);
  v_user_id  integer;
BEGIN
  IF v_username IS NOT NULL AND v_email IS NOT NULL AND v_hash IS NOT NULL THEN
    INSERT INTO users (username, email, password_hash, user_type, role, status, created_at, updated_at)
    VALUES (v_username, v_email, v_hash, 'system', 'admin', 'active', NOW(), NOW())
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

COMMIT;
