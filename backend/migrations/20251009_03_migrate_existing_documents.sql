-- Migration: 20251009_03_migrate_existing_documents
-- Description: 为现有文档生成display_id
-- Date: 2025-10-09
-- Task: #2226 - Phase 1: 数据库结构调整和数据迁移

BEGIN;

-- =============================================================================
-- Step 1: 为现有文档生成 display_id
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '开始迁移现有文档...';
END $$;

-- 1.1 处理任务文档 (有task_documents关联的文档)
UPDATE documents d
SET
    doc_type_prefix = 'DOC',
    display_id = 'DOC-' || (10000 + d.id)
WHERE EXISTS (
    SELECT 1 FROM task_documents td WHERE td.document_id = d.id
)
AND (display_id IS NULL OR display_id = '');

DO $$
BEGIN
    RAISE NOTICE '✅ 任务文档迁移完成: % 条', (SELECT COUNT(*) FROM documents WHERE doc_type_prefix = 'DOC');
END $$;

-- 1.2 处理工作笔记 (通过type字段判断)
UPDATE documents d
SET
    doc_type_prefix = 'NOTE',
    display_id = 'NOTE-' || (20000 + d.id)
WHERE d.type IN ('work_note', 'note')
AND (display_id IS NULL OR display_id = '');

DO $$
BEGIN
    RAISE NOTICE '✅ 工作笔记迁移完成: % 条', (SELECT COUNT(*) FROM documents WHERE doc_type_prefix = 'NOTE');
END $$;

-- 1.3 处理API文档
UPDATE documents d
SET
    doc_type_prefix = 'API',
    display_id = 'API-' || (30000 + d.id)
WHERE (d.type = 'api_doc' OR LOWER(d.title) LIKE '%api%')
AND (display_id IS NULL OR display_id = '');

DO $$
BEGIN
    RAISE NOTICE '✅ API文档迁移完成: % 条', (SELECT COUNT(*) FROM documents WHERE doc_type_prefix = 'API');
END $$;

-- 1.4 处理设计规格文档
UPDATE documents d
SET
    doc_type_prefix = 'SPEC',
    display_id = 'SPEC-' || (40000 + d.id)
WHERE (
    d.type IN ('specification', 'design_doc')
    OR LOWER(d.title) LIKE '%spec%'
    OR LOWER(d.title) LIKE '%设计%'
)
AND (display_id IS NULL OR display_id = '');

DO $$
BEGIN
    RAISE NOTICE '✅ 设计规格文档迁移完成: % 条', (SELECT COUNT(*) FROM documents WHERE doc_type_prefix = 'SPEC');
END $$;

-- 1.5 处理其他文档 (通用文档)
UPDATE documents d
SET
    doc_type_prefix = 'FILE',
    display_id = 'FILE-' || (50000 + d.id)
WHERE (display_id IS NULL OR display_id = '');

DO $$
BEGIN
    RAISE NOTICE '✅ 通用文档迁移完成: % 条', (SELECT COUNT(*) FROM documents WHERE doc_type_prefix = 'FILE');
END $$;

-- =============================================================================
-- Step 2: 更新序列起始值(确保不冲突)
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '开始更新序列起始值...';
END $$;

-- 2.1 更新任务文档序列
DO $$
DECLARE
    max_doc_num INTEGER;
BEGIN
    SELECT COALESCE(
        MAX(CAST(REPLACE(display_id, 'DOC-', '') AS INTEGER)),
        10000
    ) INTO max_doc_num
    FROM documents
    WHERE doc_type_prefix = 'DOC';

    PERFORM setval('seq_doc_documents', max_doc_num + 1, false);
    RAISE NOTICE '✅ seq_doc_documents 起始值设置为: %', max_doc_num + 1;
END $$;

-- 2.2 更新工作笔记序列
DO $$
DECLARE
    max_note_num INTEGER;
BEGIN
    SELECT COALESCE(
        MAX(CAST(REPLACE(display_id, 'NOTE-', '') AS INTEGER)),
        20000
    ) INTO max_note_num
    FROM documents
    WHERE doc_type_prefix = 'NOTE';

    PERFORM setval('seq_doc_notes', max_note_num + 1, false);
    RAISE NOTICE '✅ seq_doc_notes 起始值设置为: %', max_note_num + 1;
END $$;

-- 2.3 更新API文档序列
DO $$
DECLARE
    max_api_num INTEGER;
BEGIN
    SELECT COALESCE(
        MAX(CAST(REPLACE(display_id, 'API-', '') AS INTEGER)),
        30000
    ) INTO max_api_num
    FROM documents
    WHERE doc_type_prefix = 'API';

    PERFORM setval('seq_doc_api', max_api_num + 1, false);
    RAISE NOTICE '✅ seq_doc_api 起始值设置为: %', max_api_num + 1;
END $$;

-- 2.4 更新设计规格序列
DO $$
DECLARE
    max_spec_num INTEGER;
BEGIN
    SELECT COALESCE(
        MAX(CAST(REPLACE(display_id, 'SPEC-', '') AS INTEGER)),
        40000
    ) INTO max_spec_num
    FROM documents
    WHERE doc_type_prefix = 'SPEC';

    PERFORM setval('seq_doc_spec', max_spec_num + 1, false);
    RAISE NOTICE '✅ seq_doc_spec 起始值设置为: %', max_spec_num + 1;
END $$;

-- 2.5 更新通用文档序列
DO $$
DECLARE
    max_file_num INTEGER;
BEGIN
    SELECT COALESCE(
        MAX(CAST(REPLACE(display_id, 'FILE-', '') AS INTEGER)),
        50000
    ) INTO max_file_num
    FROM documents
    WHERE doc_type_prefix = 'FILE';

    PERFORM setval('seq_doc_file', max_file_num + 1, false);
    RAISE NOTICE '✅ seq_doc_file 起始值设置为: %', max_file_num + 1;
END $$;

COMMIT;

-- =============================================================================
-- Step 3: 验证数据完整性
-- =============================================================================

DO $$
DECLARE
    missing_count INTEGER;
    duplicate_count INTEGER;
    invalid_format_count INTEGER;
BEGIN
    -- 检查是否所有文档都有display_id
    SELECT COUNT(*) INTO missing_count
    FROM documents
    WHERE display_id IS NULL OR display_id = '';

    IF missing_count > 0 THEN
        RAISE WARNING '⚠️  还有 % 个文档缺少display_id', missing_count;
    ELSE
        RAISE NOTICE '✅ 所有文档都已生成display_id';
    END IF;

    -- 检查是否有重复的display_id
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT display_id, COUNT(*) as cnt
        FROM documents
        WHERE display_id IS NOT NULL
        GROUP BY display_id
        HAVING COUNT(*) > 1
    ) duplicates;

    IF duplicate_count > 0 THEN
        RAISE WARNING '⚠️  发现 % 个重复的display_id', duplicate_count;
    ELSE
        RAISE NOTICE '✅ 没有重复的display_id';
    END IF;

    -- 检查display_id格式是否正确
    SELECT COUNT(*) INTO invalid_format_count
    FROM documents
    WHERE display_id IS NOT NULL
    AND display_id !~ '^(DOC|NOTE|API|SPEC|FILE)-[0-9]+$';

    IF invalid_format_count > 0 THEN
        RAISE WARNING '⚠️  发现 % 个格式不正确的display_id', invalid_format_count;
    ELSE
        RAISE NOTICE '✅ 所有display_id格式正确';
    END IF;

    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Step 3: 数据迁移完成!';
    RAISE NOTICE '========================================';
END $$;

-- =============================================================================
-- 统计信息
-- =============================================================================

SELECT
    doc_type_prefix as "文档类型",
    COUNT(*) as "数量",
    MIN(display_id) as "最小ID",
    MAX(display_id) as "最大ID"
FROM documents
WHERE display_id IS NOT NULL
GROUP BY doc_type_prefix
ORDER BY doc_type_prefix;
