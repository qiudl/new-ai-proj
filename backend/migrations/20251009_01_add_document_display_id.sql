-- Migration: 20251009_01_add_document_display_id
-- Description: 为documents表添加display_id和doc_type_prefix字段，实现文档ID格式化展示
-- Date: 2025-10-09
-- Task: #2226 - Phase 1: 数据库结构调整和数据迁移

BEGIN;

-- =============================================================================
-- Step 1: 添加新字段
-- =============================================================================

-- 添加display_id字段（对外展示的格式化ID）
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS display_id VARCHAR(20) UNIQUE;

-- 添加doc_type_prefix字段（文档类型前缀）
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS doc_type_prefix VARCHAR(10) DEFAULT 'FILE';

-- 添加字段注释
COMMENT ON COLUMN documents.display_id IS '对外展示的文档ID,格式如 DOC-10001, NOTE-20001, API-30001等';
COMMENT ON COLUMN documents.doc_type_prefix IS '文档类型前缀: DOC(任务文档)/NOTE(工作笔记)/API(API文档)/SPEC(设计规格)/FILE(通用文档)';

-- =============================================================================
-- Step 2: 创建索引
-- =============================================================================

-- 为display_id创建索引（查询优化）
CREATE INDEX IF NOT EXISTS idx_documents_display_id ON documents(display_id)
WHERE display_id IS NOT NULL;

-- 为doc_type_prefix创建索引
CREATE INDEX IF NOT EXISTS idx_documents_doc_type_prefix ON documents(doc_type_prefix);

-- 创建复合索引（按类型和更新时间查询）
CREATE INDEX IF NOT EXISTS idx_documents_type_prefix_updated ON documents(doc_type_prefix, updated_at DESC)
WHERE deleted_at IS NULL;

COMMIT;

-- =============================================================================
-- 验证
-- =============================================================================
DO $$
BEGIN
    -- 验证字段是否创建成功
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'documents' AND column_name = 'display_id'
    ) THEN
        RAISE EXCEPTION '❌ display_id字段创建失败';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'documents' AND column_name = 'doc_type_prefix'
    ) THEN
        RAISE EXCEPTION '❌ doc_type_prefix字段创建失败';
    END IF;

    RAISE NOTICE '✅ Step 1: 字段添加完成';
END $$;
