-- Migration: 增强需求评论功能
-- Date: 2025-11-09
-- Description: 添加@提及功能和审核功能所需的字段

-- 1. 添加 mentioned_user_ids 字段（@提及用户列表）
ALTER TABLE requirement_comments
ADD COLUMN IF NOT EXISTS mentioned_user_ids INTEGER[] DEFAULT '{}';

-- 2. 添加 mentioned_count 字段（提及用户数量）
ALTER TABLE requirement_comments
ADD COLUMN IF NOT EXISTS mentioned_count INTEGER DEFAULT 0;

-- 3. 添加审核相关字段
ALTER TABLE requirement_comments
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;

ALTER TABLE requirement_comments
ADD COLUMN IF NOT EXISTS reviewed_by INTEGER;

ALTER TABLE requirement_comments
ADD COLUMN IF NOT EXISTS rejection_note TEXT;

ALTER TABLE requirement_comments
ADD COLUMN IF NOT EXISTS moderation_flag VARCHAR(50);

-- 4. 添加索引以优化查询
CREATE INDEX IF NOT EXISTS idx_req_comments_mentioned
ON requirement_comments USING GIN (mentioned_user_ids)
WHERE mentioned_user_ids IS NOT NULL AND array_length(mentioned_user_ids, 1) > 0;

CREATE INDEX IF NOT EXISTS idx_req_comments_reviewed
ON requirement_comments (reviewed_at)
WHERE reviewed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_req_comments_moderation
ON requirement_comments (moderation_flag)
WHERE moderation_flag IS NOT NULL;

-- 5. 添加外键约束
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'requirement_comments_reviewed_by_fkey'
    ) THEN
        ALTER TABLE requirement_comments
        ADD CONSTRAINT requirement_comments_reviewed_by_fkey
        FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 6. 更新status字段的CHECK约束（支持审核状态）
ALTER TABLE requirement_comments DROP CONSTRAINT IF EXISTS check_req_comment_status;

ALTER TABLE requirement_comments
ADD CONSTRAINT check_req_comment_status
CHECK (status::text = ANY (ARRAY[
  'active'::text,
  'deleted'::text,
  'pending_review'::text,
  'rejected'::text
]));

-- 7. 添加字段注释
COMMENT ON COLUMN requirement_comments.mentioned_user_ids IS '@提及的用户ID列表';
COMMENT ON COLUMN requirement_comments.mentioned_count IS '提及用户数量';
COMMENT ON COLUMN requirement_comments.reviewed_at IS '审核时间';
COMMENT ON COLUMN requirement_comments.reviewed_by IS '审核人ID';
COMMENT ON COLUMN requirement_comments.rejection_note IS '拒绝原因';
COMMENT ON COLUMN requirement_comments.moderation_flag IS '审核标记(spam, offensive, etc.)';

-- 8. 更新现有记录的 mentioned_count
UPDATE requirement_comments
SET mentioned_count = COALESCE(array_length(mentioned_user_ids, 1), 0)
WHERE mentioned_user_ids IS NOT NULL;

-- 9. 创建触发器自动更新 mentioned_count
CREATE OR REPLACE FUNCTION update_mentioned_count()
RETURNS TRIGGER AS $$
BEGIN
    NEW.mentioned_count := COALESCE(array_length(NEW.mentioned_user_ids, 1), 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_mentioned_count ON requirement_comments;

CREATE TRIGGER trigger_update_mentioned_count
    BEFORE INSERT OR UPDATE OF mentioned_user_ids ON requirement_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_mentioned_count();
