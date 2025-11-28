-- Fix documents table: Set updated_at to created_at for records where updated_at is NULL
-- This is needed because when the updated_at column was added via migration,
-- existing rows didn't get the default value applied.

BEGIN;

-- Update documents where updated_at is NULL
UPDATE documents
SET updated_at = COALESCE(created_at, CURRENT_TIMESTAMP)
WHERE updated_at IS NULL;

-- Ensure updated_at has a NOT NULL constraint with default value going forward
ALTER TABLE documents
ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

-- If the column allows NULL, add NOT NULL constraint
-- (This may fail if there are still NULL values, but we just fixed them above)
DO $$
BEGIN
    ALTER TABLE documents ALTER COLUMN updated_at SET NOT NULL;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not set NOT NULL on updated_at: %', SQLERRM;
END
$$;

COMMIT;
