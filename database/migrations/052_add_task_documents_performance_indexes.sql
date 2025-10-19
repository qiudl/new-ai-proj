-- Migration: 052_add_task_documents_performance_indexes.sql
-- Purpose: 为task_documents和documents表添加性能优化索引
-- Related Task: #2682 - 实施任务文档Tab性能优化P0方案
-- Created: 2025-10-19

-- ============================================
-- Task Documents Performance Indexes
-- ============================================

-- 1. task_documents表的复合索引（最关键的优化）
-- 用于加速 WHERE task_id = ? AND deleted_at IS NULL 查询
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_task_documents_task_id_deleted
    ON task_documents(task_id)
    WHERE deleted_at IS NULL;

-- 2. task_documents表的document_id索引
-- 用于加速JOIN操作
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_task_documents_document_id
    ON task_documents(document_id)
    WHERE deleted_at IS NULL;

-- 3. task_documents表的复合索引（用于排序）
-- 用于加速 ORDER BY sort_order, created_at
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_task_documents_task_sort
    ON task_documents(task_id, sort_order, created_at)
    WHERE deleted_at IS NULL;

-- ============================================
-- Documents Performance Indexes
-- ============================================

-- 4. documents表的project_id索引
-- 用于加速 WHERE project_id = ? 查询
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_project_id_deleted
    ON documents(project_id)
    WHERE deleted_at IS NULL;

-- 5. documents表的id索引（用于快速查找）
-- 虽然id是主键，但添加部分索引可以加速 deleted_at IS NULL 过滤
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_id_deleted
    ON documents(id)
    WHERE deleted_at IS NULL;

-- 6. documents表的owner_id索引（用于JOIN users表）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_owner_id
    ON documents(owner_id)
    WHERE deleted_at IS NULL;

-- ============================================
-- Work Note Task Relations Performance Indexes
-- ============================================

-- 7. work_note_task_relations表的task_id索引
-- 用于加速工作笔记查询
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wntr_task_id_deleted
    ON work_note_task_relations(task_id)
    WHERE deleted_at IS NULL;

-- 8. work_note_task_relations表的work_note_id索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wntr_work_note_id_deleted
    ON work_note_task_relations(work_note_id)
    WHERE deleted_at IS NULL;

-- ============================================
-- 性能分析和验证
-- ============================================

-- 查看索引创建情况
DO $$
BEGIN
    RAISE NOTICE '索引创建完成。以下是新创建的索引：';
    RAISE NOTICE '1. idx_task_documents_task_id_deleted - task_documents(task_id) WHERE deleted_at IS NULL';
    RAISE NOTICE '2. idx_task_documents_document_id - task_documents(document_id) WHERE deleted_at IS NULL';
    RAISE NOTICE '3. idx_task_documents_task_sort - task_documents(task_id, sort_order, created_at)';
    RAISE NOTICE '4. idx_documents_project_id_deleted - documents(project_id) WHERE deleted_at IS NULL';
    RAISE NOTICE '5. idx_documents_id_deleted - documents(id) WHERE deleted_at IS NULL';
    RAISE NOTICE '6. idx_documents_owner_id - documents(owner_id) WHERE deleted_at IS NULL';
    RAISE NOTICE '7. idx_wntr_task_id_deleted - work_note_task_relations(task_id)';
    RAISE NOTICE '8. idx_wntr_work_note_id_deleted - work_note_task_relations(work_note_id)';
END $$;

-- ============================================
-- 回滚脚本（如需回滚，执行以下命令）
-- ============================================

-- DROP INDEX CONCURRENTLY IF EXISTS idx_task_documents_task_id_deleted;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_task_documents_document_id;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_task_documents_task_sort;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_documents_project_id_deleted;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_documents_id_deleted;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_documents_owner_id;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_wntr_task_id_deleted;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_wntr_work_note_id_deleted;

-- ============================================
-- 预期性能提升
-- ============================================

-- 优化前: GetTaskDocuments查询耗时 100-300ms
-- 优化后: 预计减少到 20-80ms
-- 提升幅度: 约70-80%

-- 使用EXPLAIN ANALYZE验证查询性能:
-- EXPLAIN ANALYZE
-- SELECT d.id, d.project_id, d.title, d.type, d.status
-- FROM documents d
-- INNER JOIN task_documents td ON d.id = td.document_id
-- WHERE td.task_id = 2681 AND d.deleted_at IS NULL AND td.deleted_at IS NULL
-- ORDER BY td.sort_order, td.created_at;
