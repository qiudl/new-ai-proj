-- =====================================================
-- 工作笔记索引优化脚本
-- 用途：优化工作笔记和文件夹相关查询的性能
-- 执行方式：psql -d database_name -f optimize_work_notes_indexes.sql
-- =====================================================

\echo '=== 工作笔记索引优化脚本 ==='
\echo ''

-- 1. 为documents表的folder_id添加索引（如果不存在）
\echo '创建 documents.folder_id 索引...'
CREATE INDEX IF NOT EXISTS idx_documents_folder_id
ON documents(folder_id)
WHERE deleted_at IS NULL;

\echo '✅ documents.folder_id 索引创建完成'
\echo ''

-- 2. 为documents表的metadata->work_note_type添加GIN索引
\echo '创建 documents.metadata GIN 索引...'
CREATE INDEX IF NOT EXISTS idx_documents_metadata_gin
ON documents USING GIN (metadata);

\echo '✅ documents.metadata GIN 索引创建完成'
\echo ''

-- 3. 复合索引优化笔记数量查询
\echo '创建 documents 复合索引（folder_id, deleted_at, work_note_type）...'
CREATE INDEX IF NOT EXISTS idx_documents_folder_worknote
ON documents(folder_id, deleted_at)
WHERE metadata->>'work_note_type' IS NOT NULL;

\echo '✅ documents 复合索引创建完成'
\echo ''

-- 4. work_note_folders表的parent_id索引（如果不存在）
\echo '创建 work_note_folders.parent_id 索引...'
CREATE INDEX IF NOT EXISTS idx_work_note_folders_parent_id
ON work_note_folders(parent_id)
WHERE deleted_at IS NULL;

\echo '✅ work_note_folders.parent_id 索引创建完成'
\echo ''

-- 5. work_note_folders表的owner_id索引（优化权限查询）
\echo '创建 work_note_folders.owner_id 索引...'
CREATE INDEX IF NOT EXISTS idx_work_note_folders_owner_id
ON work_note_folders(owner_id)
WHERE deleted_at IS NULL;

\echo '✅ work_note_folders.owner_id 索引创建完成'
\echo ''

-- 6. documents表的owner_id和metadata复合索引（优化工作笔记列表查询）
\echo '创建 documents 复合索引（owner_id, deleted_at, work_note_type）...'
CREATE INDEX IF NOT EXISTS idx_documents_owner_worknote
ON documents(owner_id, deleted_at)
WHERE metadata->>'work_note_type' IS NOT NULL;

\echo '✅ documents owner_id 复合索引创建完成'
\echo ''

-- 查看创建的索引
\echo '=== 已创建的工作笔记相关索引 ==='
\echo ''

SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE (tablename = 'documents' AND indexname LIKE '%folder%' OR indexname LIKE '%metadata%' OR indexname LIKE '%owner%')
   OR (tablename = 'work_note_folders')
ORDER BY tablename, indexname;

\echo ''
\echo '=== 索引统计信息 ==='
\echo ''

-- 显示索引大小
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
FROM pg_indexes
WHERE (tablename = 'documents' AND (indexname LIKE '%folder%' OR indexname LIKE '%metadata%' OR indexname LIKE '%owner%'))
   OR (tablename = 'work_note_folders' AND (indexname LIKE '%parent%' OR indexname LIKE '%owner%'))
ORDER BY pg_relation_size(indexname::regclass) DESC;

\echo ''
\echo '✅ 所有索引优化完成！'
