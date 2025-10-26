-- =====================================================
-- 工作笔记孤立数据修复脚本
-- 用途：修复folder_id指向不存在文件夹的工作笔记
-- 执行方式：psql -d database_name -f fix_orphan_work_notes.sql
-- =====================================================

\echo '=== 工作笔记孤立数据修复脚本 ==='
\echo ''
\echo '⚠️  警告：此脚本将修改数据，请确保已备份数据库！'
\echo ''
\echo '按 Ctrl+C 取消，或按回车继续...'
\prompt 'Press Enter to continue: ' _confirmation

-- 开始事务
BEGIN;

\echo ''
\echo '=== 修复前数据统计 ==='
\echo ''

-- 1. 统计孤立笔记数量
SELECT
    '孤立笔记数量' as metric,
    COUNT(*) as count
FROM documents d
WHERE d.metadata->>'work_note_type' IS NOT NULL
  AND d.folder_id IS NOT NULL
  AND d.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM work_note_folders wnf
    WHERE wnf.id = d.folder_id AND wnf.deleted_at IS NULL
  );

\echo ''
\echo '=== 开始修复孤立笔记 ==='
\echo ''

-- 2. 修复孤立笔记（将folder_id设置为NULL）
WITH orphan_notes AS (
    SELECT d.id
    FROM documents d
    WHERE d.metadata->>'work_note_type' IS NOT NULL
      AND d.folder_id IS NOT NULL
      AND d.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM work_note_folders wnf
        WHERE wnf.id = d.folder_id AND wnf.deleted_at IS NULL
      )
),
updated_notes AS (
    UPDATE documents
    SET
        folder_id = NULL,
        updated_at = NOW()
    WHERE id IN (SELECT id FROM orphan_notes)
    RETURNING id, title
)
SELECT
    id as document_id,
    title,
    '✅ 已修复（folder_id设置为NULL）' as status
FROM updated_notes;

\echo ''
\echo '=== 修复后数据统计 ==='
\echo ''

-- 3. 验证修复结果
SELECT
    '剩余孤立笔记' as metric,
    COUNT(*) as count
FROM documents d
WHERE d.metadata->>'work_note_type' IS NOT NULL
  AND d.folder_id IS NOT NULL
  AND d.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM work_note_folders wnf
    WHERE wnf.id = d.folder_id AND wnf.deleted_at IS NULL
  );

\echo ''
\echo '=== 整体数据统计 ==='
\echo ''

SELECT
    '总工作笔记数' as metric,
    COUNT(*) as count
FROM documents
WHERE metadata->>'work_note_type' IS NOT NULL
  AND deleted_at IS NULL

UNION ALL

SELECT
    '在文件夹中的笔记',
    COUNT(*)
FROM documents
WHERE metadata->>'work_note_type' IS NOT NULL
  AND deleted_at IS NULL
  AND folder_id IS NOT NULL

UNION ALL

SELECT
    '未分类笔记（folder_id为NULL）',
    COUNT(*)
FROM documents
WHERE metadata->>'work_note_type' IS NOT NULL
  AND deleted_at IS NULL
  AND folder_id IS NULL;

\echo ''
\echo '=== 提交或回滚? ==='
\echo ''
\echo '请检查以上修复结果。'
\echo '如果正确，输入 COMMIT; 提交修改'
\echo '如果需要回滚，输入 ROLLBACK; 取消修改'
\echo ''

-- 等待用户确认
-- 用户需要手动输入 COMMIT; 或 ROLLBACK;
