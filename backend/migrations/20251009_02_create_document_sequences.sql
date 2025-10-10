-- Migration: 20251009_02_create_document_sequences
-- Description: 创建文档ID序列和生成函数
-- Date: 2025-10-09
-- Task: #2226 - Phase 1: 数据库结构调整和数据迁移

BEGIN;

-- =============================================================================
-- Step 1: 创建序列
-- =============================================================================

-- 任务文档序列: 从 10000 开始
CREATE SEQUENCE IF NOT EXISTS seq_doc_documents
START WITH 10000
INCREMENT BY 1
NO MAXVALUE
NO CYCLE;

-- 工作笔记序列: 从 20000 开始
CREATE SEQUENCE IF NOT EXISTS seq_doc_notes
START WITH 20000
INCREMENT BY 1
NO MAXVALUE
NO CYCLE;

-- API文档序列: 从 30000 开始
CREATE SEQUENCE IF NOT EXISTS seq_doc_api
START WITH 30000
INCREMENT BY 1
NO MAXVALUE
NO CYCLE;

-- 设计规格序列: 从 40000 开始
CREATE SEQUENCE IF NOT EXISTS seq_doc_spec
START WITH 40000
INCREMENT BY 1
NO MAXVALUE
NO CYCLE;

-- 通用文档序列: 从 50000 开始
CREATE SEQUENCE IF NOT EXISTS seq_doc_file
START WITH 50000
INCREMENT BY 1
NO MAXVALUE
NO CYCLE;

-- 添加序列注释
COMMENT ON SEQUENCE seq_doc_documents IS '任务文档ID序列 (DOC-xxxxx)';
COMMENT ON SEQUENCE seq_doc_notes IS '工作笔记ID序列 (NOTE-xxxxx)';
COMMENT ON SEQUENCE seq_doc_api IS 'API文档ID序列 (API-xxxxx)';
COMMENT ON SEQUENCE seq_doc_spec IS '设计规格ID序列 (SPEC-xxxxx)';
COMMENT ON SEQUENCE seq_doc_file IS '通用文档ID序列 (FILE-xxxxx)';

-- =============================================================================
-- Step 2: 创建生成函数
-- =============================================================================

-- 辅助函数: 根据文档类型前缀生成格式化的display_id
CREATE OR REPLACE FUNCTION generate_document_display_id(doc_prefix VARCHAR)
RETURNS VARCHAR
LANGUAGE plpgsql
AS $$
DECLARE
    seq_name TEXT;
    next_num BIGINT;
BEGIN
    -- 根据前缀选择对应序列
    seq_name := CASE doc_prefix
        WHEN 'DOC' THEN 'seq_doc_documents'
        WHEN 'NOTE' THEN 'seq_doc_notes'
        WHEN 'API' THEN 'seq_doc_api'
        WHEN 'SPEC' THEN 'seq_doc_spec'
        WHEN 'FILE' THEN 'seq_doc_file'
        ELSE 'seq_doc_file'  -- 默认使用通用文档序列
    END;

    -- 获取下一个序列值
    EXECUTE format('SELECT nextval(%L)', seq_name) INTO next_num;

    -- 返回格式化的ID: 前缀-数字 (如: DOC-10001)
    RETURN doc_prefix || '-' || next_num;
END;
$$;

COMMENT ON FUNCTION generate_document_display_id(VARCHAR) IS '根据文档类型前缀生成格式化的display_id';

-- =============================================================================
-- Step 3: 创建触发器函数
-- =============================================================================

-- 触发器函数: 自动生成display_id
CREATE OR REPLACE FUNCTION auto_generate_display_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- 如果display_id为空,自动生成
    IF NEW.display_id IS NULL OR NEW.display_id = '' THEN
        -- 如果doc_type_prefix为空,自动判断文档类型
        IF NEW.doc_type_prefix IS NULL OR NEW.doc_type_prefix = '' THEN
            -- 根据文档的其他属性判断类型
            -- 优先级: 任务文档 > 工作笔记 > API文档 > 设计规格 > 通用文档

            -- 检查是否是任务文档（通过task_documents关联表判断）
            IF EXISTS (
                SELECT 1 FROM task_documents
                WHERE document_id = NEW.id
            ) THEN
                NEW.doc_type_prefix := 'DOC';

            -- 检查是否是工作笔记（通过type字段判断）
            ELSIF NEW.type IN ('work_note', 'note') THEN
                NEW.doc_type_prefix := 'NOTE';

            -- 检查是否是API文档
            ELSIF NEW.type = 'api_doc' OR LOWER(NEW.title) LIKE '%api%' THEN
                NEW.doc_type_prefix := 'API';

            -- 检查是否是设计规格文档
            ELSIF NEW.type IN ('specification', 'design_doc') OR LOWER(NEW.title) LIKE '%spec%' OR LOWER(NEW.title) LIKE '%设计%' THEN
                NEW.doc_type_prefix := 'SPEC';

            -- 默认为通用文档
            ELSE
                NEW.doc_type_prefix := 'FILE';
            END IF;
        END IF;

        -- 生成display_id
        NEW.display_id := generate_document_display_id(NEW.doc_type_prefix);
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION auto_generate_display_id() IS '触发器函数: 在插入文档时自动生成display_id';

-- =============================================================================
-- Step 4: 创建触发器
-- =============================================================================

-- 删除旧触发器（如果存在）
DROP TRIGGER IF EXISTS trigger_auto_generate_display_id ON documents;

-- 创建新触发器
CREATE TRIGGER trigger_auto_generate_display_id
    BEFORE INSERT ON documents
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_display_id();

COMMIT;

-- =============================================================================
-- 验证
-- =============================================================================
DO $$
BEGIN
    -- 验证序列创建成功
    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'seq_doc_documents') THEN
        RAISE EXCEPTION '❌ seq_doc_documents序列创建失败';
    END IF;

    -- 验证函数创建成功
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_document_display_id') THEN
        RAISE EXCEPTION '❌ generate_document_display_id函数创建失败';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'auto_generate_display_id') THEN
        RAISE EXCEPTION '❌ auto_generate_display_id函数创建失败';
    END IF;

    -- 验证触发器创建成功
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_auto_generate_display_id') THEN
        RAISE EXCEPTION '❌ trigger_auto_generate_display_id触发器创建失败';
    END IF;

    RAISE NOTICE '✅ Step 2: 序列和函数创建完成';
END $$;
