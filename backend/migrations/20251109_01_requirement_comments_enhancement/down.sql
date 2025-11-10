-- Rollback Migration: 增强需求评论功能
-- Date: 2025-11-09
-- Description: 回滚@提及功能和审核功能的字段

-- 1. 删除触发器和函数
DROP TRIGGER IF EXISTS trigger_update_mentioned_count ON requirement_comments;
DROP FUNCTION IF EXISTS update_mentioned_count();

-- 2. 恢复原有的status检查约束
ALTER TABLE requirement_comments DROP CONSTRAINT IF EXISTS check_req_comment_status;

ALTER TABLE requirement_comments
ADD CONSTRAINT check_req_comment_status
CHECK (status::text = ANY (ARRAY[
  'active'::text,
  'deleted'::text
]));

-- 3. 删除外键约束
ALTER TABLE requirement_comments DROP CONSTRAINT IF EXISTS requirement_comments_reviewed_by_fkey;

-- 4. 删除索引
DROP INDEX IF EXISTS idx_req_comments_mentioned;
DROP INDEX IF EXISTS idx_req_comments_reviewed;
DROP INDEX IF EXISTS idx_req_comments_moderation;

-- 5. 删除添加的字段
ALTER TABLE requirement_comments DROP COLUMN IF EXISTS moderation_flag;
ALTER TABLE requirement_comments DROP COLUMN IF EXISTS rejection_note;
ALTER TABLE requirement_comments DROP COLUMN IF EXISTS reviewed_by;
ALTER TABLE requirement_comments DROP COLUMN IF EXISTS reviewed_at;
ALTER TABLE requirement_comments DROP COLUMN IF EXISTS mentioned_count;
ALTER TABLE requirement_comments DROP COLUMN IF EXISTS mentioned_user_ids;
