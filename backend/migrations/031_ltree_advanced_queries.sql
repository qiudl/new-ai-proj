-- 批量移动文件夹到新的父文件夹
CREATE OR REPLACE FUNCTION batch_move_folders(
    folder_ids INTEGER[],
    target_parent_id INTEGER DEFAULT NULL,
    update_sort_order BOOLEAN DEFAULT TRUE
)
RETURNS TABLE(
    moved_id INTEGER,
    success BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    folder_id INTEGER;
    target_path ltree;
    target_depth INTEGER;
    current_folder RECORD;
    new_path ltree;
    sort_order_counter INTEGER := 0;
BEGIN
    -- 获取目标父文件夹信息
    IF target_parent_id IS NOT NULL THEN
        SELECT df.path, df.depth INTO target_path, target_depth
        FROM document_folders df 
        WHERE df.id = target_parent_id AND df.deleted_at IS NULL;
        
        IF target_path IS NULL THEN
            -- 目标父文件夹不存在
            FOREACH folder_id IN ARRAY folder_ids LOOP
                RETURN QUERY SELECT folder_id, FALSE, 'Target parent folder not found'::TEXT;
            END LOOP;
            RETURN;
        END IF;
    ELSE
        target_path := '';
        target_depth := -1;
    END IF;
    
    -- 获取当前最大排序顺序
    IF update_sort_order THEN
        SELECT COALESCE(MAX(sort_order), 0) INTO sort_order_counter
        FROM document_folders 
        WHERE parent_folder_id = target_parent_id
        AND deleted_at IS NULL;
    END IF;
    
    -- 处理每个文件夹
    FOREACH folder_id IN ARRAY folder_ids LOOP
        BEGIN
            -- 获取当前文件夹信息
            SELECT * INTO current_folder
            FROM document_folders 
            WHERE id = folder_id AND deleted_at IS NULL;
            
            IF NOT FOUND THEN
                RETURN QUERY SELECT folder_id, FALSE, 'Folder not found'::TEXT;
                CONTINUE;
            END IF;
            
            -- 检查循环引用
            IF target_parent_id IS NOT NULL AND target_path ~ (current_folder.path::text || '.*')::lquery THEN
                RETURN QUERY SELECT folder_id, FALSE, 'Cannot move folder to its descendant'::TEXT;
                CONTINUE;
            END IF;
            
            -- 更新文件夹的父ID和排序
            IF update_sort_order THEN
                sort_order_counter := sort_order_counter + 1;
                UPDATE document_folders 
                SET parent_folder_id = target_parent_id,
                    sort_order = sort_order_counter,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = folder_id;
            ELSE
                UPDATE document_folders 
                SET parent_folder_id = target_parent_id,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = folder_id;
            END IF;
            
            -- 路径会通过触发器自动更新
            RETURN QUERY SELECT folder_id, TRUE, NULL::TEXT;
            
        EXCEPTION WHEN OTHERS THEN
            RETURN QUERY SELECT folder_id, FALSE, SQLERRM::TEXT;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 计算文件夹的磁盘使用统计
CREATE OR REPLACE FUNCTION calculate_folder_usage(folder_id INTEGER)
RETURNS TABLE(
    folder_id INTEGER,
    direct_notes_count INTEGER,
    direct_notes_size BIGINT,
    total_notes_count INTEGER,
    total_notes_size BIGINT,
    total_folders_count INTEGER,
    last_activity TIMESTAMP
) AS $$
DECLARE
    folder_path ltree;
BEGIN
    -- 获取文件夹路径
    SELECT df.path INTO folder_path
    FROM document_folders df 
    WHERE df.id = folder_id AND df.deleted_at IS NULL;
    
    IF folder_path IS NULL THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    WITH folder_stats AS (
        -- 直接笔记统计
        SELECT 
            COUNT(d.id)::INTEGER as direct_count,
            COALESCE(SUM(d.file_size), 0)::BIGINT as direct_size
        FROM documents d
        WHERE d.folder_id = folder_id 
        AND d.deleted_at IS NULL
    ),
    descendant_stats AS (
        -- 包含所有后代的统计
        SELECT 
            COUNT(d.id)::INTEGER as total_count,
            COALESCE(SUM(d.file_size), 0)::BIGINT as total_size
        FROM documents d
        JOIN document_folders df ON d.folder_id = df.id
        WHERE df.path ~ (folder_path::text || '.*')::lquery
        AND d.deleted_at IS NULL
        AND df.deleted_at IS NULL
    ),
    folder_count AS (
        -- 后代文件夹数量
        SELECT COUNT(*)::INTEGER as descendant_folders
        FROM document_folders df
        WHERE df.path ~ (folder_path::text || '.*')::lquery
        AND df.id != folder_id
        AND df.deleted_at IS NULL
    ),
    activity_stats AS (
        -- 最后活动时间
        SELECT MAX(GREATEST(d.created_at, d.updated_at)) as last_doc_activity
        FROM documents d
        JOIN document_folders df ON d.folder_id = df.id
        WHERE df.path ~ (folder_path::text || '.*')::lquery
        AND d.deleted_at IS NULL
        AND df.deleted_at IS NULL
    )
    SELECT 
        calculate_folder_usage.folder_id,
        fs.direct_count,
        fs.direct_size,
        ds.total_count,
        ds.total_size,
        fc.descendant_folders,
        GREATEST(
            activity_stats.last_doc_activity,
            (SELECT MAX(updated_at) FROM document_folders WHERE id = calculate_folder_usage.folder_id)
        ) as last_activity
    FROM folder_stats fs, descendant_stats ds, folder_count fc, activity_stats;
END;
$$ LANGUAGE plpgsql;

-- ====================
-- 性能优化索引
-- ====================

-- 为ltree路径创建专门的操作符索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_folders_path_ops 
ON document_folders USING GIST (path gist_ltree_ops(siglen=32)) 
WHERE deleted_at IS NULL;

-- 为常用的祖先查询创建表达式索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_folders_path_ancestors_expr
ON document_folders USING BTREE (path, nlevel(path))
WHERE deleted_at IS NULL;

-- 为搜索查询创建全文搜索索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_folders_fulltext_search
ON document_folders USING GIN (
    to_tsvector('english', 
        COALESCE(name, '') || ' ' || 
        COALESCE(description, '') || ' ' || 
        path::text
    )
) WHERE deleted_at IS NULL;

-- 为parent_folder_id的NULL值创建专门的索引（根文件夹查询）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_folders_roots
ON document_folders (sort_order, name) 
WHERE parent_folder_id IS NULL AND deleted_at IS NULL;

-- 为深度查询创建索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_folders_depth_range
ON document_folders (depth, path) 
WHERE deleted_at IS NULL;

-- 为活跃文件夹查询创建复合索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_folders_active_usage
ON document_folders (last_activity_at DESC, note_count_cached DESC, depth) 
WHERE deleted_at IS NULL AND note_count_cached > 0;

-- ====================
-- 批量操作优化函数
-- ====================

-- 批量更新文件夹排序
CREATE OR REPLACE FUNCTION batch_update_folder_sort_order(
    folder_orders JSONB  -- [{"id": 1, "sort_order": 1}, ...]
)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER := 0;
    folder_order RECORD;
BEGIN
    -- 遍历排序数据
    FOR folder_order IN 
        SELECT (item->>'id')::INTEGER as folder_id, 
               (item->>'sort_order')::INTEGER as new_sort_order
        FROM jsonb_array_elements(folder_orders) as item
    LOOP
        UPDATE document_folders 
        SET sort_order = folder_order.new_sort_order,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = folder_order.folder_id
        AND deleted_at IS NULL;
        
        IF FOUND THEN
            updated_count := updated_count + 1;
        END IF;
    END LOOP;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- 批量设置文件夹可见性
CREATE OR REPLACE FUNCTION batch_update_folder_visibility(
    folder_ids INTEGER[],
    new_visibility VARCHAR(50),
    apply_to_descendants BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
    folder_id INTEGER,
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    target_folder_id INTEGER;
    folder_path ltree;
    updated_count INTEGER;
BEGIN
    -- 验证可见性值
    IF new_visibility NOT IN ('private', 'team', 'public') THEN
        FOREACH target_folder_id IN ARRAY folder_ids LOOP
            RETURN QUERY SELECT target_folder_id, FALSE, 'Invalid visibility value'::TEXT;
        END LOOP;
        RETURN;
    END IF;
    
    FOREACH target_folder_id IN ARRAY folder_ids LOOP
        BEGIN
            -- 更新目标文件夹
            UPDATE document_folders 
            SET visibility = new_visibility::visibility,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = target_folder_id
            AND deleted_at IS NULL;
            
            IF NOT FOUND THEN
                RETURN QUERY SELECT target_folder_id, FALSE, 'Folder not found'::TEXT;
                CONTINUE;
            END IF;
            
            updated_count := 1;
            
            -- 如果需要应用到后代
            IF apply_to_descendants THEN
                SELECT df.path INTO folder_path
                FROM document_folders df 
                WHERE df.id = target_folder_id;
                
                UPDATE document_folders 
                SET visibility = new_visibility::visibility,
                    updated_at = CURRENT_TIMESTAMP
                WHERE path ~ (folder_path::text || '.*')::lquery
                AND id != target_folder_id
                AND deleted_at IS NULL;
                
                GET DIAGNOSTICS updated_count = ROW_COUNT;
                updated_count := updated_count + 1; -- 包含目标文件夹
            END IF;
            
            RETURN QUERY SELECT target_folder_id, TRUE, 
                format('Updated %s folders', updated_count)::TEXT;
                
        EXCEPTION WHEN OTHERS THEN
            RETURN QUERY SELECT target_folder_id, FALSE, SQLERRM::TEXT;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ====================
-- 缓存管理函数
-- ====================

-- 智能刷新文件夹缓存（仅更新过期的）
CREATE OR REPLACE FUNCTION smart_refresh_folder_caches(
    max_age_minutes INTEGER DEFAULT 60
)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER := 0;
    cutoff_time TIMESTAMP;
BEGIN
    cutoff_time := CURRENT_TIMESTAMP - INTERVAL '1 minute' * max_age_minutes;
    
    -- 更新过期的缓存
    UPDATE document_folders 
    SET note_count_cached = subquery.actual_count,
        note_count_updated_at = CURRENT_TIMESTAMP
    FROM (
        SELECT 
            df.id,
            COUNT(d.id) as actual_count
        FROM document_folders df
        LEFT JOIN documents d ON df.id = d.folder_id AND d.deleted_at IS NULL
        WHERE df.deleted_at IS NULL
        AND (df.note_count_updated_at < cutoff_time OR df.note_count_updated_at IS NULL)
        GROUP BY df.id
    ) subquery
    WHERE document_folders.id = subquery.id
    AND document_folders.note_count_cached != subquery.actual_count;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- 预热文件夹路径缓存
CREATE OR REPLACE FUNCTION warmup_folder_path_cache()
RETURNS INTEGER AS $$
DECLARE
    processed_count INTEGER := 0;
BEGIN
    -- 执行一些常用的路径查询来预热缓存
    PERFORM COUNT(*)
    FROM document_folders df1
    JOIN document_folders df2 ON df2.path ~ (df1.path::text || '.*')::lquery
    WHERE df1.deleted_at IS NULL 
    AND df2.deleted_at IS NULL
    AND df1.depth = 0; -- 从根文件夹开始
    
    -- 预热祖先查询
    PERFORM COUNT(*)
    FROM document_folders df
    WHERE df.path ~ '*.1.*'::lquery -- 示例路径模式
    AND df.deleted_at IS NULL;
    
    SELECT COUNT(*) INTO processed_count
    FROM document_folders
    WHERE deleted_at IS NULL;
    
    RETURN processed_count;
END;
$$ LANGUAGE plpgsql;

-- ====================
-- 统计和监控函数
-- ====================

-- 获取文件夹树的统计摘要
CREATE OR REPLACE FUNCTION get_folder_tree_stats()
RETURNS TABLE(
    total_folders INTEGER,
    root_folders INTEGER,
    max_depth INTEGER,
    avg_children_per_folder FLOAT,
    total_notes INTEGER,
    folders_with_notes INTEGER,
    largest_folder_id INTEGER,
    largest_folder_notes INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH folder_stats AS (
        SELECT 
            COUNT(*) as total_count,
            COUNT(*) FILTER (WHERE parent_folder_id IS NULL) as root_count,
            MAX(depth) as max_depth_value,
            AVG(note_count_cached) as avg_notes
        FROM document_folders 
        WHERE deleted_at IS NULL
    ),
    children_stats AS (
        SELECT AVG(child_count) as avg_children
        FROM (
            SELECT parent_folder_id, COUNT(*) as child_count
            FROM document_folders 
            WHERE deleted_at IS NULL AND parent_folder_id IS NOT NULL
            GROUP BY parent_folder_id
        ) child_counts
    ),
    note_stats AS (
        SELECT 
            SUM(note_count_cached) as total_note_count,
            COUNT(*) FILTER (WHERE note_count_cached > 0) as folders_with_notes_count
        FROM document_folders 
        WHERE deleted_at IS NULL
    ),
    largest_folder AS (
        SELECT id, note_count_cached
        FROM document_folders 
        WHERE deleted_at IS NULL
        ORDER BY note_count_cached DESC 
        LIMIT 1
    )
    SELECT 
        fs.total_count::INTEGER,
        fs.root_count::INTEGER,
        fs.max_depth_value::INTEGER,
        COALESCE(cs.avg_children, 0)::FLOAT,
        COALESCE(ns.total_note_count, 0)::INTEGER,
        COALESCE(ns.folders_with_notes_count, 0)::INTEGER,
        lf.id::INTEGER,
        lf.note_count_cached::INTEGER
    FROM folder_stats fs, children_stats cs, note_stats ns, largest_folder lf;
END;
$$ LANGUAGE plpgsql;

-- 检测性能问题的文件夹
CREATE OR REPLACE FUNCTION detect_folder_performance_issues()
RETURNS TABLE(
    issue_type TEXT,
    folder_id INTEGER,
    folder_name VARCHAR(255),
    issue_details TEXT,
    suggested_action TEXT
) AS $$
BEGIN
    -- 深度过深的文件夹
    RETURN QUERY
    SELECT 
        'excessive_depth'::TEXT,
        df.id,
        df.name,
        format('Folder depth: %s (max recommended: 10)', df.depth)::TEXT,
        'Consider reorganizing folder structure'::TEXT
    FROM document_folders df
    WHERE df.depth > 10 
    AND df.deleted_at IS NULL;
    
    -- 子文件夹过多的文件夹
    RETURN QUERY
    SELECT 
        'too_many_children'::TEXT,
        parent.id,
        parent.name,
        format('Child folders: %s (max recommended: 50)', child_counts.count)::TEXT,
        'Consider grouping folders or using different organization'::TEXT
    FROM document_folders parent
    JOIN (
        SELECT parent_folder_id, COUNT(*) as count
        FROM document_folders 
        WHERE deleted_at IS NULL
        GROUP BY parent_folder_id
        HAVING COUNT(*) > 50
    ) child_counts ON parent.id = child_counts.parent_folder_id
    WHERE parent.deleted_at IS NULL;
    
    -- 笔记数量过多的文件夹
    RETURN QUERY
    SELECT 
        'too_many_notes'::TEXT,
        df.id,
        df.name,
        format('Notes count: %s (max recommended: 1000)', df.note_count_cached)::TEXT,
        'Consider creating subfolders to organize notes'::TEXT
    FROM document_folders df
    WHERE df.note_count_cached > 1000 
    AND df.deleted_at IS NULL;
    
    -- 缓存更新过期的文件夹
    RETURN QUERY
    SELECT 
        'stale_cache'::TEXT,
        df.id,
        df.name,
        format('Cache age: %s hours', 
            EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - df.note_count_updated_at))/3600)::TEXT,
        'Refresh folder cache'::TEXT
    FROM document_folders df
    WHERE df.note_count_updated_at < CURRENT_TIMESTAMP - INTERVAL '24 hours'
    AND df.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- ====================
-- 创建定期维护任务
-- ====================

-- 每日维护任务
CREATE OR REPLACE FUNCTION daily_folder_maintenance()
RETURNS TEXT AS $$
DECLARE
    result_text TEXT := '';
    cache_updates INTEGER;
    integrity_issues INTEGER;
BEGIN
    -- 刷新过期缓存
    SELECT smart_refresh_folder_caches(60) INTO cache_updates;
    result_text := result_text || format('Refreshed %s folder caches. ', cache_updates);
    
    -- 检查数据完整性
    SELECT COUNT(*) INTO integrity_issues
    FROM check_folder_tree_integrity();
    
    IF integrity_issues > 0 THEN
        result_text := result_text || format('Found %s integrity issues (check check_folder_tree_integrity()). ', integrity_issues);
    ELSE
        result_text := result_text || 'No integrity issues found. ';
    END IF;
    
    -- 更新统计信息
    ANALYZE document_folders;
    result_text := result_text || 'Updated table statistics. ';
    
    RETURN result_text;
END;
$$ LANGUAGE plpgsql;

-- ====================
-- 添加函数注释
-- ====================

COMMENT ON FUNCTION get_folder_ancestors(INTEGER) IS '获取文件夹的所有祖先，按层级排序';
COMMENT ON FUNCTION get_folder_descendants(INTEGER, INTEGER, BOOLEAN) IS '获取文件夹的所有后代，支持深度限制和笔记统计';
COMMENT ON FUNCTION search_folders_in_tree(TEXT, INTEGER, INTEGER) IS '在文件夹树中搜索，支持模糊匹配和相关性评分';
COMMENT ON FUNCTION batch_move_folders(INTEGER[], INTEGER, BOOLEAN) IS '批量移动文件夹到新父文件夹，支持自动排序';
COMMENT ON FUNCTION calculate_folder_usage(INTEGER) IS '计算文件夹的详细使用统计，包括磁盘空间和笔记数量';
COMMENT ON FUNCTION batch_update_folder_sort_order(JSONB) IS '批量更新文件夹排序顺序';
COMMENT ON FUNCTION batch_update_folder_visibility(INTEGER[], VARCHAR(50), BOOLEAN) IS '批量更新文件夹可见性，支持应用到后代';
COMMENT ON FUNCTION smart_refresh_folder_caches(INTEGER) IS '智能刷新过期的文件夹缓存';
COMMENT ON FUNCTION get_folder_tree_stats() IS '获取整个文件夹树的统计摘要';
COMMENT ON FUNCTION detect_folder_performance_issues() IS '检测可能影响性能的文件夹配置问题';
COMMENT ON FUNCTION daily_folder_maintenance() IS '执行日常文件夹维护任务';

COMMIT;

-- ====================
-- 性能测试查询示例
-- ====================

-- 注意：以下查询仅用于测试，在生产环境中会被注释掉

/*
-- 测试祖先查询性能
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM get_folder_ancestors(100);

-- 测试后代查询性能
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM get_folder_descendants(1, 5, true);

-- 测试搜索性能
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM search_folders_in_tree('project', 1, 20);

-- 测试批量移动性能
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM batch_move_folders(ARRAY[101,102,103], 50, true);

-- 检查索引使用情况
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE tablename = 'document_folders'
ORDER BY idx_scan DESC;
*/