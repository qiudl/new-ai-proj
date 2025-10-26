-- =====================================================
-- 工作笔记数据验证脚本
-- 用途：验证工作笔记数据完整性，检查孤立数据
-- 执行方式：psql -d database_name -f validate_work_notes.sql
-- =====================================================

\echo '=== 工作笔记数据验证脚本 ==='
\echo ''

-- 1. 检查孤立的工作笔记（folder_id指向不存在的文件夹）
\echo '===  1. 检查孤立的工作笔记 ==='
\echo ''

SELECT
    d.id as document_id,
    d.title,
    d.folder_id,
    d.owner_id,
    d.created_at,
    '❌ 文件夹不存在' as status
FROM documents d
WHERE d.metadata->>'work_note_type' IS NOT NULL
  AND d.folder_id IS NOT NULL
  AND d.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM work_note_folders wnf
    WHERE wnf.id = d.folder_id
    AND wnf.deleted_at IS NULL
  )
ORDER BY d.created_at DESC
LIMIT 20;

\echo ''

-- 2. 统计每个文件夹的实际笔记数量
\echo '=== 2. 文件夹笔记数量统计 ==='
\echo ''

SELECT
    wnf.id as folder_id,
    wnf.name as folder_name,
    wnf.owner_id,
    COUNT(d.id) as actual_notes_count,
    CASE
        WHEN COUNT(d.id) = 0 THEN '✅ 空文件夹'
        WHEN COUNT(d.id) < 10 THEN '✅ 少量笔记'
        WHEN COUNT(d.id) < 50 THEN '⚠️  中等数量'
        ELSE '⚠️  大量笔记'
    END as status
FROM work_note_folders wnf
LEFT JOIN documents d ON d.folder_id = wnf.id
  AND d.deleted_at IS NULL
  AND d.metadata->>'work_note_type' IS NOT NULL
WHERE wnf.deleted_at IS NULL
GROUP BY wnf.id, wnf.name, wnf.owner_id
ORDER BY actual_notes_count DESC
LIMIT 50;

\echo ''

-- 3. 检查metadata字段缺失或无效的工作笔记
\echo '=== 3. 检查metadata字段问题 ==='
\echo ''

-- 3.1 metadata为NULL的文档
SELECT
    'metadata为NULL' as issue_type,
    COUNT(*) as count
FROM documents d
WHERE d.deleted_at IS NULL
  AND d.metadata IS NULL
  AND d.type = 'markdown';

\echo ''

-- 3.2 缺少work_note_type的markdown文档
SELECT
    'markdown但缺少work_note_type' as issue_type,
    COUNT(*) as count
FROM documents d
WHERE d.deleted_at IS NULL
  AND d.type = 'markdown'
  AND d.metadata->>'work_note_type' IS NULL;

\echo ''

-- 4. 检查文件夹树的循环引用（理论上不应该有）
\echo '=== 4. 检查文件夹树循环引用 ==='
\echo ''

WITH RECURSIVE folder_path AS (
    SELECT
        id,
        parent_id,
        name,
        ARRAY[id] as path,
        1 as depth
    FROM work_note_folders
    WHERE deleted_at IS NULL

    UNION ALL

    SELECT
        wnf.id,
        wnf.parent_id,
        wnf.name,
        fp.path || wnf.id,
        fp.depth + 1
    FROM work_note_folders wnf
    INNER JOIN folder_path fp ON wnf.parent_id = fp.id
    WHERE wnf.deleted_at IS NULL
      AND wnf.id != ALL(fp.path)  -- 检测循环
      AND fp.depth < 20
)
SELECT
    id as folder_id,
    name as folder_name,
    parent_id,
    path,
    depth,
    CASE
        WHEN depth > 10 THEN '❌ 嵌套过深'
        ELSE '✅ 正常'
    END as status
FROM folder_path
WHERE depth > 5  -- 只显示深度大于5的（可能有问题）
ORDER BY depth DESC
LIMIT 20;

\echo ''

-- 5. 统计工作笔记整体数据
\echo '=== 5. 工作笔记整体统计 ==='
\echo ''

SELECT
    'documents表' as source,
    COUNT(*) as total_work_notes,
    COUNT(CASE WHEN folder_id IS NOT NULL THEN 1 END) as in_folder,
    COUNT(CASE WHEN folder_id IS NULL THEN 1 END) as not_in_folder,
    COUNT(DISTINCT owner_id) as unique_owners
FROM documents d
WHERE d.deleted_at IS NULL
  AND d.metadata->>'work_note_type' IS NOT NULL;

\echo ''

-- 6. 按类型统计工作笔记
\echo '=== 6. 按类型统计工作笔记 ==='
\echo ''

SELECT
    d.metadata->>'work_note_type' as work_note_type,
    COUNT(*) as count,
    COUNT(CASE WHEN d.folder_id IS NOT NULL THEN 1 END) as in_folder_count,
    ROUND(AVG(LENGTH(d.content::text))) as avg_content_length
FROM documents d
WHERE d.deleted_at IS NULL
  AND d.metadata->>'work_note_type' IS NOT NULL
GROUP BY d.metadata->>'work_note_type'
ORDER BY count DESC;

\echo ''

-- 7. 检查文件夹所有权
\echo '=== 7. 文件夹所有权统计 ==='
\echo ''

SELECT
    u.id as user_id,
    u.username,
    COUNT(DISTINCT wnf.id) as folder_count,
    COUNT(DISTINCT d.id) as note_count
FROM users u
LEFT JOIN work_note_folders wnf ON wnf.owner_id = u.id AND wnf.deleted_at IS NULL
LEFT JOIN documents d ON d.folder_id = wnf.id
  AND d.deleted_at IS NULL
  AND d.metadata->>'work_note_type' IS NOT NULL
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.username
HAVING COUNT(DISTINCT wnf.id) > 0 OR COUNT(DISTINCT d.id) > 0
ORDER BY note_count DESC
LIMIT 20;

\echo ''

-- 8. 数据完整性总结
\echo '=== 8. 数据完整性总结 ==='
\echo ''

WITH
orphan_notes AS (
    SELECT COUNT(*) as cnt
    FROM documents d
    WHERE d.metadata->>'work_note_type' IS NOT NULL
      AND d.folder_id IS NOT NULL
      AND d.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM work_note_folders wnf
        WHERE wnf.id = d.folder_id AND wnf.deleted_at IS NULL
      )
),
total_notes AS (
    SELECT COUNT(*) as cnt
    FROM documents d
    WHERE d.metadata->>'work_note_type' IS NOT NULL
      AND d.deleted_at IS NULL
),
total_folders AS (
    SELECT COUNT(*) as cnt
    FROM work_note_folders
    WHERE deleted_at IS NULL
)
SELECT
    '孤立笔记数量' as check_item,
    (SELECT cnt FROM orphan_notes) as count,
    CASE
        WHEN (SELECT cnt FROM orphan_notes) = 0 THEN '✅ 通过'
        ELSE '❌ 需要修复'
    END as status
UNION ALL
SELECT
    '总笔记数量',
    (SELECT cnt FROM total_notes),
    '✅ 信息'
UNION ALL
SELECT
    '总文件夹数量',
    (SELECT cnt FROM total_folders),
    '✅ 信息';

\echo ''
\echo '✅ 数据验证完成！'
\echo ''
\echo '如果发现孤立笔记，请运行 fix_orphan_work_notes.sql 进行修复'
