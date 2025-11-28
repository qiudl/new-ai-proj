-- Rollback: Remove NOT NULL constraint from updated_at
-- Note: This cannot restore NULL values that were replaced with created_at

BEGIN;

-- Remove NOT NULL constraint
ALTER TABLE documents ALTER COLUMN updated_at DROP NOT NULL;

COMMIT;
