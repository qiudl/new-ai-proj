-- Migration: 004_enhance_projects_fixed.sql
-- Description: Add project enhancement fields and tables (corrected)
-- Date: 2024-07-22

BEGIN;

-- Add new columns to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES customers(id),
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS budget DECIMAL(15,2);

-- Create project_companies table for project-company relationships (if not exists)
CREATE TABLE IF NOT EXISTS project_companies (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    role VARCHAR(50),
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(project_id, company_id)
);

-- Create project_users table for project-user assignments (if not exists)
CREATE TABLE IF NOT EXISTS project_users (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'customer' CHECK (role IN ('manager', 'developer', 'designer', 'consultant', 'customer')),
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(project_id, user_id)
);

-- Add indexes for better performance (only if they don't exist)
DO $$
BEGIN
    -- Check and create indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_projects_company_id') THEN
        CREATE INDEX idx_projects_company_id ON projects(company_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_projects_status') THEN
        CREATE INDEX idx_projects_status ON projects(status);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_projects_priority') THEN
        CREATE INDEX idx_projects_priority ON projects(priority);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_projects_dates') THEN
        CREATE INDEX idx_projects_dates ON projects(start_date, end_date);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_project_companies_project_id') THEN
        CREATE INDEX idx_project_companies_project_id ON project_companies(project_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_project_companies_company_id') THEN
        CREATE INDEX idx_project_companies_company_id ON project_companies(company_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_project_users_project_id') THEN
        CREATE INDEX idx_project_users_project_id ON project_users(project_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_project_users_user_id') THEN
        CREATE INDEX idx_project_users_user_id ON project_users(user_id);
    END IF;
END
$$;

-- Add triggers for updated_at columns (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_project_companies_updated_at') THEN
        CREATE TRIGGER update_project_companies_updated_at
            BEFORE UPDATE ON project_companies
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_project_users_updated_at') THEN
        CREATE TRIGGER update_project_users_updated_at
            BEFORE UPDATE ON project_users
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;

-- Update existing projects with default values (only for NULL values)
UPDATE projects SET 
    status = 'planning'
WHERE status IS NULL;

UPDATE projects SET 
    priority = 'medium'
WHERE priority IS NULL;

UPDATE projects SET 
    progress = 0
WHERE progress IS NULL;

COMMIT;