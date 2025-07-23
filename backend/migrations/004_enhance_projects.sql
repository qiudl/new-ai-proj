-- Migration: 004_enhance_projects.sql
-- Description: Add project enhancement fields and tables
-- Date: 2024-07-22

-- Add new columns to projects table
ALTER TABLE projects
ADD COLUMN company_id INTEGER REFERENCES company_users(customer_id),
ADD COLUMN status VARCHAR(20) DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
ADD COLUMN priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
ADD COLUMN progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
ADD COLUMN start_date DATE,
ADD COLUMN end_date DATE,
ADD COLUMN budget DECIMAL(15,2);

-- Create project_companies table for project-company relationships
CREATE TABLE project_companies (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES company_users(customer_id) ON DELETE CASCADE,
    role VARCHAR(50),
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(project_id, company_id)
);

-- Create project_users table for project-user assignments
CREATE TABLE project_users (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'customer' CHECK (role IN ('manager', 'developer', 'designer', 'consultant', 'customer')),
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(project_id, user_id)
);

-- Add indexes for better performance
CREATE INDEX idx_projects_company_id ON projects(company_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_priority ON projects(priority);
CREATE INDEX idx_projects_dates ON projects(start_date, end_date);
CREATE INDEX idx_project_companies_project_id ON project_companies(project_id);
CREATE INDEX idx_project_companies_company_id ON project_companies(company_id);
CREATE INDEX idx_project_users_project_id ON project_users(project_id);
CREATE INDEX idx_project_users_user_id ON project_users(user_id);

-- Add triggers for updated_at columns
CREATE TRIGGER update_project_companies_updated_at
    BEFORE UPDATE ON project_companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_users_updated_at
    BEFORE UPDATE ON project_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
-- Update existing projects with default values
UPDATE projects SET 
    status = 'planning',
    priority = 'medium', 
    progress = 0
WHERE status IS NULL;

COMMIT;