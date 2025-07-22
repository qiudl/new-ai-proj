-- Migration: User Management Enhancement
-- Description: Add support for enhanced user management with new roles, status, and profile fields

-- Add new columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS profile JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Add unique constraint for email if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_email_key'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);
  END IF;
END $$;

-- Update role column to support new roles
ALTER TABLE users 
ALTER COLUMN role DROP DEFAULT;

-- Drop existing check constraint if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_role_check'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_role_check;
  END IF;
END $$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at);

-- Create GIN index for profile JSONB field
CREATE INDEX IF NOT EXISTS idx_users_profile_gin ON users USING GIN (profile);

-- Update existing users with default values
UPDATE users 
SET 
  email = COALESCE(email, username || '@example.com'),
  profile = COALESCE(profile, ('{"name": "' || username || '"}')::jsonb),
  updated_at = COALESCE(updated_at, created_at)
WHERE email IS NULL OR profile IS NULL OR updated_at IS NULL;

-- Update role values for existing users first, then add constraint
UPDATE users 
SET role = CASE 
  WHEN role = 'user' THEN 'developer'
  WHEN role NOT IN ('admin', 'project_manager', 'developer', 'client') THEN 'developer'
  ELSE role
END;

-- Now add constraints after data is updated
-- Add new check constraint for roles
ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'project_manager', 'developer', 'client'));

-- Add check constraint for status
ALTER TABLE users 
ADD CONSTRAINT users_status_check 
CHECK (status IN ('active', 'inactive', 'suspended'));

-- Set default role
ALTER TABLE users 
ALTER COLUMN role SET DEFAULT 'developer';

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Add sample users with new roles for testing
INSERT INTO users (username, email, password_hash, role, status, profile) 
VALUES 
  ('project_manager_1', 'pm1@example.com', '$2a$10$rOhwZ8sZFCjltzNdQqSLg.6qF2vKKcnwz0JN5jzMQjBpYOJQcn7BS', 'project_manager', 'active', '{"name": "项目经理1", "department": "技术部", "phone": "13800138001"}'),
  ('developer_1', 'dev1@example.com', '$2a$10$rOhwZ8sZFCjltzNdQqSLg.6qF2vKKcnwz0JN5jzMQjBpYOJQcn7BS', 'developer', 'active', '{"name": "开发工程师1", "department": "研发部", "phone": "13800138002"}'),
  ('client_1', 'client1@example.com', '$2a$10$rOhwZ8sZFCjltzNdQqSLg.6qF2vKKcnwz0JN5jzMQjBpYOJQcn7BS', 'client', 'active', '{"name": "客户1", "department": "甲方公司", "phone": "13800138003"}')
ON CONFLICT (username) DO NOTHING;

-- Create view for user statistics
CREATE OR REPLACE VIEW user_stats AS
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE status = 'active') as active_users,
  COUNT(*) FILTER (WHERE status = 'inactive') as inactive_users,
  COUNT(*) FILTER (WHERE status = 'suspended') as suspended_users,
  COUNT(*) FILTER (WHERE role = 'admin') as admin_count,
  COUNT(*) FILTER (WHERE role = 'project_manager') as project_manager_count,
  COUNT(*) FILTER (WHERE role = 'developer') as developer_count,
  COUNT(*) FILTER (WHERE role = 'client') as client_count,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as recent_registrations
FROM users;

-- Grant permissions (if using specific database users)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON users TO app_user;
-- GRANT SELECT ON user_stats TO app_user;