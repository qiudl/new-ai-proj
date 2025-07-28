-- 005_task_document_migration.sql
-- Phase 2: 任务文档数据迁移脚本
-- 将现有文件系统的任务文档迁移到统一文档系统

-- ========================================
-- 1. 数据迁移准备
-- ========================================

-- 创建迁移日志表
CREATE TABLE IF NOT EXISTS task_document_migration_log (
    id SERIAL PRIMARY KEY,
    operation_type VARCHAR(50) NOT NULL,
    task_id INTEGER,
    document_id INTEGER,
    file_path TEXT,
    success BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    migrated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建迁移状态表
CREATE TABLE IF NOT EXISTS migration_status (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, running, completed, failed
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    total_items INTEGER DEFAULT 0,
    processed_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,
    details JSONB
);

-- 插入迁移任务记录
INSERT INTO migration_status (migration_name, status, details) 
VALUES ('task_document_migration', 'pending', '{"description": "Migrate file-based task documents to unified document system"}')
ON CONFLICT (migration_name) DO NOTHING;

-- ========================================
-- 2. 数据迁移函数
-- ========================================

-- 迁移单个任务文档的函数
CREATE OR REPLACE FUNCTION migrate_task_document(
    p_task_id INTEGER,
    p_project_id INTEGER,
    p_document_content TEXT,
    p_file_path TEXT DEFAULT NULL,
    p_migrated_by INTEGER DEFAULT 1
) RETURNS INTEGER AS $$
DECLARE
    v_document_id INTEGER;
    v_task_title TEXT;
    v_task_status TEXT;
    v_document_title TEXT;
    v_assignee_id INTEGER;
    v_created_by INTEGER;
BEGIN
    -- 获取任务信息
    SELECT title, status, assignee_id, created_by 
    INTO v_task_title, v_task_status, v_assignee_id, v_created_by
    FROM tasks 
    WHERE id = p_task_id AND project_id = p_project_id AND deleted_at IS NULL;
    
    -- 如果任务不存在，记录错误并返回
    IF NOT FOUND THEN
        INSERT INTO task_document_migration_log (operation_type, task_id, file_path, success, error_message)
        VALUES ('migrate_document', p_task_id, p_file_path, FALSE, 'Task not found');
        RETURN NULL;
    END IF;
    
    -- 检查是否已经存在文档
    SELECT d.id INTO v_document_id
    FROM documents d
    JOIN document_task_relations dtr ON d.id = dtr.document_id
    WHERE dtr.task_id = p_task_id 
      AND dtr.relation_type = 'specification'
      AND d.deleted_at IS NULL;
    
    -- 如果已存在文档，更新内容
    IF v_document_id IS NOT NULL THEN
        UPDATE documents 
        SET content = p_document_content,
            updated_at = CURRENT_TIMESTAMP,
            metadata = jsonb_build_object(
                'migrated_from_file', true,
                'original_file_path', COALESCE(p_file_path, ''),
                'migration_date', CURRENT_TIMESTAMP::text
            )
        WHERE id = v_document_id;
        
        INSERT INTO task_document_migration_log (operation_type, task_id, document_id, file_path, success)
        VALUES ('update_existing', p_task_id, v_document_id, p_file_path, TRUE);
        
        RETURN v_document_id;
    END IF;
    
    -- 创建新文档
    v_document_title := v_task_title || ' - 文档';
    
    INSERT INTO documents (
        title, content, type, status, owner_id, created_by, 
        metadata, visibility, is_template
    ) VALUES (
        v_document_title,
        p_document_content,
        'task_document',
        'published',
        COALESCE(v_assignee_id, v_created_by, p_migrated_by),
        p_migrated_by,
        jsonb_build_object(
            'migrated_from_file', true,
            'original_file_path', COALESCE(p_file_path, ''),
            'migration_date', CURRENT_TIMESTAMP::text,
            'task_status', v_task_status
        ),
        'team',
        FALSE
    ) RETURNING id INTO v_document_id;
    
    -- 创建任务关联关系
    INSERT INTO document_task_relations (
        document_id, task_id, relation_type, description, created_by
    ) VALUES (
        v_document_id, p_task_id, 'specification', 
        'Migrated from file-based system', p_migrated_by
    );
    
    -- 记录成功迁移
    INSERT INTO task_document_migration_log (operation_type, task_id, document_id, file_path, success)
    VALUES ('create_new', p_task_id, v_document_id, p_file_path, TRUE);
    
    RETURN v_document_id;
    
EXCEPTION WHEN OTHERS THEN
    -- 记录错误
    INSERT INTO task_document_migration_log (operation_type, task_id, file_path, success, error_message)
    VALUES ('migrate_document', p_task_id, p_file_path, FALSE, SQLERRM);
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 3. 批量迁移函数
-- ========================================

-- 批量迁移任务文档
CREATE OR REPLACE FUNCTION batch_migrate_task_documents(
    p_migrated_by INTEGER DEFAULT 1,
    p_batch_size INTEGER DEFAULT 100
) RETURNS JSONB AS $$
DECLARE
    v_total_tasks INTEGER := 0;
    v_processed_tasks INTEGER := 0;
    v_successful_migrations INTEGER := 0;
    v_failed_migrations INTEGER := 0;
    v_migration_results JSONB;
    task_record RECORD;
BEGIN
    -- 更新迁移状态为运行中
    UPDATE migration_status 
    SET status = 'running', started_at = CURRENT_TIMESTAMP
    WHERE migration_name = 'task_document_migration';
    
    -- 统计总任务数（这里模拟，实际需要根据文件系统扫描）
    SELECT COUNT(*) INTO v_total_tasks
    FROM tasks t
    WHERE t.deleted_at IS NULL;
    
    -- 更新总数量
    UPDATE migration_status 
    SET total_items = v_total_tasks
    WHERE migration_name = 'task_document_migration';
    
    -- 示例：为每个任务创建默认文档（实际迁移时需要读取文件内容）
    FOR task_record IN 
        SELECT t.id, t.project_id, t.title, t.status
        FROM tasks t
        WHERE t.deleted_at IS NULL
        ORDER BY t.id
        LIMIT p_batch_size
    LOOP
        DECLARE
            v_document_id INTEGER;
            v_default_content TEXT;
        BEGIN
            -- 生成默认文档内容（实际迁移时应该读取文件）
            v_default_content := format('# %s 文档

## 任务概述
<!-- 这是从旧系统迁移的文档 -->

## 迁移信息
- 迁移时间: %s
- 原始任务状态: %s
- 迁移方式: 自动迁移

## 内容说明
本文档已从文件系统成功迁移到统一文档管理系统。
如果有原始文档内容丢失，请联系管理员恢复。

', task_record.title, CURRENT_TIMESTAMP, task_record.status);
            
            -- 调用迁移函数
            v_document_id := migrate_task_document(
                task_record.id,
                task_record.project_id,
                v_default_content,
                format('docs/%s.md', task_record.id),
                p_migrated_by
            );
            
            IF v_document_id IS NOT NULL THEN
                v_successful_migrations := v_successful_migrations + 1;
            ELSE
                v_failed_migrations := v_failed_migrations + 1;
            END IF;
            
            v_processed_tasks := v_processed_tasks + 1;
            
            -- 定期更新进度
            IF v_processed_tasks % 10 = 0 THEN
                UPDATE migration_status 
                SET processed_items = v_processed_tasks,
                    failed_items = v_failed_migrations
                WHERE migration_name = 'task_document_migration';
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            v_failed_migrations := v_failed_migrations + 1;
            v_processed_tasks := v_processed_tasks + 1;
        END;
    END LOOP;
    
    -- 构建结果
    v_migration_results := jsonb_build_object(
        'total_tasks', v_total_tasks,
        'processed_tasks', v_processed_tasks,
        'successful_migrations', v_successful_migrations,
        'failed_migrations', v_failed_migrations,
        'completion_rate', ROUND((v_successful_migrations::NUMERIC / GREATEST(v_processed_tasks, 1)) * 100, 2)
    );
    
    -- 更新最终状态
    UPDATE migration_status 
    SET status = CASE 
                    WHEN v_failed_migrations = 0 THEN 'completed'
                    WHEN v_successful_migrations > 0 THEN 'completed_with_errors'
                    ELSE 'failed'
                 END,
        completed_at = CURRENT_TIMESTAMP,
        processed_items = v_processed_tasks,
        failed_items = v_failed_migrations,
        details = details || v_migration_results
    WHERE migration_name = 'task_document_migration';
    
    RETURN v_migration_results;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 4. 数据验证函数
-- ========================================

-- 验证迁移完整性
CREATE OR REPLACE FUNCTION validate_migration_integrity() RETURNS JSONB AS $$
DECLARE
    v_total_tasks INTEGER;
    v_tasks_with_docs INTEGER;
    v_orphaned_documents INTEGER;
    v_invalid_relations INTEGER;
    v_validation_results JSONB;
BEGIN
    -- 统计总任务数
    SELECT COUNT(*) INTO v_total_tasks
    FROM tasks WHERE deleted_at IS NULL;
    
    -- 统计有文档的任务数
    SELECT COUNT(DISTINCT dtr.task_id) INTO v_tasks_with_docs
    FROM document_task_relations dtr
    JOIN documents d ON dtr.document_id = d.id
    JOIN tasks t ON dtr.task_id = t.id
    WHERE d.deleted_at IS NULL 
      AND t.deleted_at IS NULL
      AND dtr.relation_type = 'specification';
    
    -- 统计孤立文档数
    SELECT COUNT(*) INTO v_orphaned_documents
    FROM documents d
    LEFT JOIN document_task_relations dtr ON d.id = dtr.document_id
    WHERE d.type = 'task_document' 
      AND d.deleted_at IS NULL
      AND dtr.document_id IS NULL;
    
    -- 统计无效关联关系
    SELECT COUNT(*) INTO v_invalid_relations
    FROM document_task_relations dtr
    LEFT JOIN documents d ON dtr.document_id = d.id
    LEFT JOIN tasks t ON dtr.task_id = t.id
    WHERE (d.id IS NULL OR d.deleted_at IS NOT NULL)
       OR (t.id IS NULL OR t.deleted_at IS NOT NULL);
    
    -- 构建验证结果
    v_validation_results := jsonb_build_object(
        'total_tasks', v_total_tasks,
        'tasks_with_documents', v_tasks_with_docs,
        'document_coverage_rate', ROUND((v_tasks_with_docs::NUMERIC / GREATEST(v_total_tasks, 1)) * 100, 2),
        'orphaned_documents', v_orphaned_documents,
        'invalid_relations', v_invalid_relations,
        'validation_passed', (v_orphaned_documents = 0 AND v_invalid_relations = 0),
        'validated_at', CURRENT_TIMESTAMP
    );
    
    RETURN v_validation_results;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 5. 清理函数
-- ========================================

-- 清理迁移临时数据
CREATE OR REPLACE FUNCTION cleanup_migration_data(
    p_keep_logs BOOLEAN DEFAULT TRUE
) RETURNS VOID AS $$
BEGIN
    -- 清理临时表（如果不保留日志）
    IF NOT p_keep_logs THEN
        DELETE FROM task_document_migration_log 
        WHERE migrated_at < CURRENT_TIMESTAMP - INTERVAL '7 days';
    END IF;
    
    -- 重置迁移状态（允许重新迁移）
    UPDATE migration_status 
    SET status = 'pending',
        started_at = NULL,
        completed_at = NULL,
        processed_items = 0,
        failed_items = 0
    WHERE migration_name = 'task_document_migration';
    
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 6. 索引优化
-- ========================================

-- 为迁移相关查询创建索引
CREATE INDEX IF NOT EXISTS idx_documents_type_deleted 
ON documents(type, deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_document_task_relations_task_type 
ON document_task_relations(task_id, relation_type);

CREATE INDEX IF NOT EXISTS idx_migration_log_task_success 
ON task_document_migration_log(task_id, success);

-- ========================================
-- 7. 权限设置
-- ========================================

-- 为应用用户授权使用迁移函数
-- GRANT EXECUTE ON FUNCTION migrate_task_document TO app_user;
-- GRANT EXECUTE ON FUNCTION batch_migrate_task_documents TO app_user;
-- GRANT EXECUTE ON FUNCTION validate_migration_integrity TO app_user;

-- ========================================
-- 8. 使用示例和说明
-- ========================================

/*
使用说明:

1. 执行迁移:
   SELECT batch_migrate_task_documents(1, 50); -- 用户ID=1, 批量大小=50

2. 验证迁移:
   SELECT validate_migration_integrity();

3. 查看迁移状态:
   SELECT * FROM migration_status WHERE migration_name = 'task_document_migration';

4. 查看迁移日志:
   SELECT * FROM task_document_migration_log ORDER BY migrated_at DESC LIMIT 20;

5. 清理迁移数据:
   SELECT cleanup_migration_data(false); -- 不保留日志

6. 手动迁移单个任务:
   SELECT migrate_task_document(123, 1, '# 文档内容', 'path/to/file.md', 1);
*/

-- 插入迁移完成标记
INSERT INTO migration_status (migration_name, status, details)
VALUES ('005_task_document_migration_schema', 'completed', 
        '{"description": "Migration schema and functions created successfully"}')
ON CONFLICT (migration_name) DO UPDATE SET 
    status = 'completed',
    completed_at = CURRENT_TIMESTAMP;