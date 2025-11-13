-- Add custom_fields JSONB column to requirements table for storing extended CSV import data
-- Migration: 20251112_01_add_custom_fields_to_requirements

-- Add custom_fields column (JSONB type for flexible field storage)
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;

-- Create GIN index for efficient JSONB querying
CREATE INDEX IF NOT EXISTS idx_requirements_custom_fields ON requirements USING gin(custom_fields);

-- Add comment for documentation
COMMENT ON COLUMN requirements.custom_fields IS '扩展字段，用于CSV导入等场景存储自定义数据，如serial_number, system_name, progress_points等';

-- Verify the column was added
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'requirements'
        AND column_name = 'custom_fields'
    ) THEN
        RAISE NOTICE '✅ custom_fields column added successfully';
    ELSE
        RAISE EXCEPTION '❌ Failed to add custom_fields column';
    END IF;
END $$;
