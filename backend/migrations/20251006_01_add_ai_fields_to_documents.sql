-- Migration: 20251006_01_add_ai_fields_to_documents
-- Description: 为documents表新增AI生成相关字段
-- Author: AI Assistant
-- Date: 2025-10-06

-- ==================== UP ====================

-- 1. 新增字段
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS generated_by_ai BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS ai_model VARCHAR(50) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS generation_time_ms INTEGER DEFAULT NULL;

-- 2. 添加字段注释
COMMENT ON COLUMN documents.generated_by_ai IS '标识文档是否由AI生成';
COMMENT ON COLUMN documents.ai_model IS 'AI模型名称，如gpt-4o、deepseek-r1';
COMMENT ON COLUMN documents.generation_time_ms IS 'AI生成耗时，单位毫秒';

-- 3. 创建索引
CREATE INDEX IF NOT EXISTS idx_documents_generated_by_ai ON documents(generated_by_ai);
CREATE INDEX IF NOT EXISTS idx_documents_ai_model ON documents(ai_model) WHERE ai_model IS NOT NULL;

-- 4. 更新统计信息
ANALYZE documents;

-- ==================== DOWN ====================
-- 注意: 如需回滚，请执行以下SQL

-- 1. 删除索引
-- DROP INDEX IF EXISTS idx_documents_ai_model;
-- DROP INDEX IF EXISTS idx_documents_generated_by_ai;

-- 2. 删除字段
-- ALTER TABLE documents
-- DROP COLUMN IF EXISTS generation_time_ms,
-- DROP COLUMN IF EXISTS ai_model,
-- DROP COLUMN IF EXISTS generated_by_ai;
