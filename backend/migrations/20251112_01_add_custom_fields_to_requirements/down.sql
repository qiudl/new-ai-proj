-- Rollback migration: Remove custom_fields column from requirements table
-- Migration: 20251112_01_add_custom_fields_to_requirements

-- Drop the GIN index
DROP INDEX IF EXISTS idx_requirements_custom_fields;

-- Remove the custom_fields column
ALTER TABLE requirements DROP COLUMN IF EXISTS custom_fields;

-- Verify the column was removed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'requirements'
        AND column_name = 'custom_fields'
    ) THEN
        RAISE NOTICE '✅ custom_fields column removed successfully';
    ELSE
        RAISE EXCEPTION '❌ Failed to remove custom_fields column';
    END IF;
END $$;
