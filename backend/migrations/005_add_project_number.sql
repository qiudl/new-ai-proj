-- Add project_number field to projects table
-- Migration: 005_add_project_number.sql

BEGIN;

-- Add project_number column
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_number VARCHAR(50);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_project_number ON projects(project_number);

-- Add unique constraint to prevent duplicate project numbers
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'projects' AND constraint_name = 'projects_project_number_unique'
  ) THEN
    ALTER TABLE projects ADD CONSTRAINT projects_project_number_unique UNIQUE (project_number);
  END IF;
END $$;

-- Update existing projects with default project numbers
UPDATE projects 
SET project_number = 'P' || LPAD((100 + id)::text, 3, '0')
WHERE project_number IS NULL;

COMMIT;