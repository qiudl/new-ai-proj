-- Migration: Timer family mutex - add family_key and partial unique index
-- Date: 2025-08-23
-- Purpose: Ensure at most one running timer per user per task family (parent/child lineage)

BEGIN;

-- 1) Add family_key to unified_timer_logs to reference the root task id of the family
ALTER TABLE unified_timer_logs
ADD COLUMN IF NOT EXISTS family_key INTEGER;

-- 2) Optional: backfill existing rows where target_type = 'project_task'
--    We will set family_key to the root ancestor id of target_id when possible.
--    This is best-effort and safe to run multiple times.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT id, target_id
        FROM unified_timer_logs
        WHERE target_type = 'project_task' AND family_key IS NULL AND target_id IS NOT NULL
    LOOP
        UPDATE unified_timer_logs utl
        SET family_key = (
            WITH RECURSIVE anc AS (
                SELECT id, parent_id FROM tasks WHERE id = r.target_id
                UNION ALL
                SELECT t.id, t.parent_id FROM tasks t JOIN anc ON t.id = anc.parent_id
            )
            SELECT id FROM anc WHERE parent_id IS NULL LIMIT 1
        )
        WHERE utl.id = r.id;
    END LOOP;
END$$;

-- 3) Create a partial unique index to enforce one running timer per (user_id, family_key)
--    Only applies to project_task timers and when family_key is not null.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_running_timer_family
ON unified_timer_logs(user_id, family_key)
WHERE status = 'running' AND target_type = 'project_task' AND family_key IS NOT NULL;

COMMIT;

