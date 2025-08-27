-- 051_add_ltree_to_tasks.sql
-- Purpose: 实现任务层级结构的ltree方案，优化层级查询性能
-- Date: 2025-08-27
-- Task: #364 T1.2 ltree/层级结构方案实现与索引

-- 确保ltree扩展已安装
CREATE EXTENSION IF NOT EXISTS ltree;

-- 添加ltree字段到tasks表
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS path ltree;

-- 添加层级深度字段（可选，用于快速获取层级深度）
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS depth integer DEFAULT 0;

-- 创建ltree索引以优化层级查询性能（不使用CONCURRENTLY）
CREATE INDEX IF NOT EXISTS idx_tasks_path_gist ON tasks USING GIST (path);
CREATE INDEX IF NOT EXISTS idx_tasks_path_btree ON tasks USING BTREE (path);

-- 创建用于子节点查询的索引
CREATE INDEX IF NOT EXISTS idx_tasks_path_ancestors ON tasks USING GIST (path gist_ltree_ops(siglen=64));

-- 创建复合索引用于常见查询
CREATE INDEX IF NOT EXISTS idx_tasks_project_path ON tasks (project_id, path) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_path_status ON tasks (path, status) WHERE deleted_at IS NULL;

-- 创建函数：从parent_id计算ltree路径
CREATE OR REPLACE FUNCTION calculate_task_path(task_id INTEGER)
RETURNS ltree AS $$
DECLARE
    task_record RECORD;
    parent_path ltree;
    result_path ltree;
BEGIN
    -- 获取任务信息
    SELECT id, parent_id INTO task_record
    FROM tasks 
    WHERE id = task_id AND deleted_at IS NULL;
    
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    
    -- 如果没有父任务，返回任务ID作为路径
    IF task_record.parent_id IS NULL THEN
        RETURN task_id::text::ltree;
    END IF;
    
    -- 递归获取父任务路径
    SELECT path INTO parent_path
    FROM tasks 
    WHERE id = task_record.parent_id AND deleted_at IS NULL;
    
    -- 如果父任务路径不存在，递归计算
    IF parent_path IS NULL THEN
        parent_path := calculate_task_path(task_record.parent_id);
        -- 更新父任务路径
        UPDATE tasks SET path = parent_path WHERE id = task_record.parent_id;
    END IF;
    
    -- 构建当前任务路径
    result_path := parent_path || task_id::text::ltree;
    
    RETURN result_path;
END;
$$ LANGUAGE plpgsql;

-- 创建函数：更新任务路径
CREATE OR REPLACE FUNCTION update_task_path()
RETURNS TRIGGER AS $$
DECLARE
    new_path ltree;
    new_depth integer;
BEGIN
    -- 计算新路径
    new_path := calculate_task_path(NEW.id);
    
    -- 计算深度
    IF new_path IS NOT NULL THEN
        new_depth := nlevel(new_path) - 1;
    ELSE
        new_depth := 0;
    END IF;
    
    -- 更新路径和深度
    NEW.path := new_path;
    NEW.depth := new_depth;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器：在插入或更新parent_id时自动更新路径
DROP TRIGGER IF EXISTS trigger_update_task_path ON tasks;
CREATE TRIGGER trigger_update_task_path
    BEFORE INSERT OR UPDATE OF parent_id
    ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_task_path();

-- 创建函数：批量更新所有任务的路径（初始化使用）
CREATE OR REPLACE FUNCTION refresh_all_task_paths()
RETURNS void AS $$
DECLARE
    task_record RECORD;
    updated_count integer := 0;
BEGIN
    -- 按层级顺序处理（从根节点开始）
    FOR task_record IN 
        WITH RECURSIVE task_hierarchy AS (
            -- 根节点（没有父任务的任务）
            SELECT id, parent_id, 0 as level
            FROM tasks 
            WHERE parent_id IS NULL AND deleted_at IS NULL
            
            UNION ALL
            
            -- 子节点
            SELECT t.id, t.parent_id, th.level + 1
            FROM tasks t
            JOIN task_hierarchy th ON t.parent_id = th.id
            WHERE t.deleted_at IS NULL
        )
        SELECT id, parent_id, level
        FROM task_hierarchy
        ORDER BY level, id
    LOOP
        UPDATE tasks 
        SET path = calculate_task_path(task_record.id),
            depth = task_record.level
        WHERE id = task_record.id;
        
        updated_count := updated_count + 1;
    END LOOP;
    
    RAISE NOTICE 'Updated paths for % tasks', updated_count;
END;
$$ LANGUAGE plpgsql;

-- 创建常用的查询函数
-- 获取任务的所有祖先（包括自己）
CREATE OR REPLACE FUNCTION get_task_ancestors(task_id INTEGER)
RETURNS TABLE(id INTEGER, title VARCHAR, level INTEGER) AS $$
BEGIN
    RETURN QUERY
    WITH task_path AS (
        SELECT path FROM tasks WHERE tasks.id = task_id AND deleted_at IS NULL
    )
    SELECT t.id, t.title, nlevel(tp.path) - nlevel(t.path) as level
    FROM tasks t, task_path tp
    WHERE t.path @> tp.path
    AND t.deleted_at IS NULL
    ORDER BY nlevel(t.path);
END;
$$ LANGUAGE plpgsql;

-- 获取任务的所有后代（不包括自己）
CREATE OR REPLACE FUNCTION get_task_descendants(task_id INTEGER)
RETURNS TABLE(id INTEGER, title VARCHAR, level INTEGER) AS $$
BEGIN
    RETURN QUERY
    WITH task_path AS (
        SELECT path FROM tasks WHERE tasks.id = task_id AND deleted_at IS NULL
    )
    SELECT t.id, t.title, nlevel(t.path) - nlevel(tp.path) as level
    FROM tasks t, task_path tp
    WHERE tp.path @> t.path
    AND t.path != tp.path  -- 排除自己
    AND t.deleted_at IS NULL
    ORDER BY t.path;
END;
$$ LANGUAGE plpgsql;

-- 获取任务的直接子任务
CREATE OR REPLACE FUNCTION get_task_children(task_id INTEGER)
RETURNS TABLE(id INTEGER, title VARCHAR, sort_order INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, t.title, t.sort_order
    FROM tasks t
    WHERE t.parent_id = task_id
    AND t.deleted_at IS NULL
    ORDER BY t.sort_order, t.id;
END;
$$ LANGUAGE plpgsql;

-- 检查任务是否为另一个任务的祖先
CREATE OR REPLACE FUNCTION is_task_ancestor(ancestor_id INTEGER, descendant_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    ancestor_path ltree;
    descendant_path ltree;
BEGIN
    -- 获取祖先任务路径
    SELECT path INTO ancestor_path
    FROM tasks 
    WHERE id = ancestor_id AND deleted_at IS NULL;
    
    -- 获取后代任务路径
    SELECT path INTO descendant_path
    FROM tasks 
    WHERE id = descendant_id AND deleted_at IS NULL;
    
    -- 检查路径关系
    IF ancestor_path IS NULL OR descendant_path IS NULL THEN
        RETURN FALSE;
    END IF;
    
    RETURN ancestor_path @> descendant_path AND ancestor_path != descendant_path;
END;
$$ LANGUAGE plpgsql;

-- 创建视图：任务层级结构视图
CREATE OR REPLACE VIEW task_hierarchy_view AS
WITH RECURSIVE task_tree AS (
    -- 根节点
    SELECT 
        id,
        title,
        parent_id,
        path,
        depth,
        ARRAY[id] as path_array,
        title as path_string
    FROM tasks 
    WHERE parent_id IS NULL AND deleted_at IS NULL
    
    UNION ALL
    
    -- 子节点
    SELECT 
        t.id,
        t.title,
        t.parent_id,
        t.path,
        t.depth,
        tt.path_array || t.id,
        tt.path_string || ' > ' || t.title
    FROM tasks t
    JOIN task_tree tt ON t.parent_id = tt.id
    WHERE t.deleted_at IS NULL
)
SELECT 
    id,
    title,
    parent_id,
    path,
    depth,
    path_array,
    path_string,
    array_length(path_array, 1) as hierarchy_level
FROM task_tree
ORDER BY path;

-- 注意：运行完迁移后，需要执行以下命令来初始化现有数据的路径：
-- SELECT refresh_all_task_paths();
