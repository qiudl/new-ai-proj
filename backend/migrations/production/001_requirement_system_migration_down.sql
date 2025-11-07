-- ================================================
-- 生产环境回滚脚本: 需求管理系统
-- ================================================
-- 版本: 1.0.0
-- 作者: AI Project Team
-- 日期: 2025-11-06
-- 描述: 完全回滚需求管理系统的数据库结构
-- 警告: ⚠️  此操作将删除所有需求管理相关数据，不可恢复！
-- 预计执行时间: 约 5-10 秒
-- 前提条件: 必须已执行数据备份
-- ================================================

-- 设置客户端编码
SET client_encoding = 'UTF8';

-- 开始事务
BEGIN;

\echo '========================================';
\echo '⚠️  警告: 即将回滚需求管理系统';
\echo '========================================';
\echo '';
\echo '此操作将:';
\echo '  1. 删除所有需求数据';
\echo '  2. 删除所有评论数据';
\echo '  3. 删除所有历史记录';
\echo '  4. 删除所有需求-任务关联';
\echo '';
\echo '请确保:';
\echo '  ✓ 已创建数据备份';
\echo '  ✓ 已获得管理员批准';
\echo '  ✓ 已通知相关用户';
\echo '';
\echo '按 Ctrl+C 可立即取消...';
\echo '';

-- 等待3秒给用户取消的机会（生产环境可调整）
SELECT pg_sleep(3);

-- ================================================
-- 第一部分: 删除触发器
-- ================================================

\echo '========================================';
\echo '正在删除触发器...';
\echo '========================================';

-- 删除requirements表触发器
DROP TRIGGER IF EXISTS trigger_requirements_updated_at ON requirements CASCADE;
\echo '✓ 删除 requirements updated_at 触发器';

-- 删除requirement_comments表触发器
DROP TRIGGER IF EXISTS trigger_requirement_comments_updated_at ON requirement_comments CASCADE;
DROP TRIGGER IF EXISTS trigger_sync_mentioned_count ON requirement_comments CASCADE;
\echo '✓ 删除 requirement_comments 触发器';

-- 删除requirement_tasks表触发器
DROP TRIGGER IF EXISTS trigger_requirement_tasks_updated_at ON requirement_tasks CASCADE;
\echo '✓ 删除 requirement_tasks 触发器';

-- ================================================
-- 第二部分: 删除函数
-- ================================================

\echo '';
\echo '========================================';
\echo '正在删除函数...';
\echo '========================================';

DROP FUNCTION IF EXISTS update_requirements_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_requirement_comments_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_requirement_tasks_updated_at() CASCADE;
DROP FUNCTION IF EXISTS sync_requirement_comment_mentioned_count() CASCADE;

\echo '✓ 已删除 4 个数据库函数';

-- ================================================
-- 第三部分: 删除表（按依赖关系逆序删除）
-- ================================================

\echo '';
\echo '========================================';
\echo '正在删除表...';
\echo '========================================';

-- 先删除依赖表
\echo '删除 requirement_tasks 表...';
DROP TABLE IF EXISTS requirement_tasks CASCADE;
\echo '✓ requirement_tasks 表已删除';

\echo '删除 requirement_history 表...';
DROP TABLE IF EXISTS requirement_history CASCADE;
\echo '✓ requirement_history 表已删除';

\echo '删除 requirement_comments 表...';
DROP TABLE IF EXISTS requirement_comments CASCADE;
\echo '✓ requirement_comments 表已删除';

-- 最后删除主表
\echo '删除 requirements 表...';
DROP TABLE IF EXISTS requirements CASCADE;
\echo '✓ requirements 表已删除';

-- ================================================
-- 第四部分: 清理孤立数据（可选）
-- ================================================

\echo '';
\echo '========================================';
\echo '正在检查和清理孤立数据...';
\echo '========================================';

-- 检查tasks表中是否有指向已删除需求的引用
-- 注意: 由于使用了 ON DELETE SET NULL，这些字段应该已经被自动置空
-- 这里只是额外的安全检查

DO $$
DECLARE
    orphan_count INTEGER;
BEGIN
    -- 检查是否有任务的converted_from字段指向不存在的需求
    -- (如果你的tasks表有这样的字段)
    SELECT COUNT(*) INTO orphan_count
    FROM tasks t
    WHERE t.id IN (
        SELECT converted_task_id
        FROM requirements
        WHERE converted_task_id IS NOT NULL
    );

    IF orphan_count > 0 THEN
        RAISE NOTICE '发现 % 个任务曾经由需求转换而来', orphan_count;
        RAISE NOTICE '这些任务的需求信息已被清除';
    END IF;
END $$;

\echo '✓ 孤立数据检查完成';

-- 提交事务
COMMIT;

-- ================================================
-- 回滚完成总结
-- ================================================

\echo '';
\echo '========================================';
\echo '✓ 需求管理系统回滚完成！';
\echo '========================================';
\echo '';
\echo '已删除的表:';
\echo '  ✓ requirements';
\echo '  ✓ requirement_comments';
\echo '  ✓ requirement_history';
\echo '  ✓ requirement_tasks';
\echo '';
\echo '已删除的触发器:';
\echo '  ✓ 4 个触发器';
\echo '';
\echo '已删除的函数:';
\echo '  ✓ 4 个数据库函数';
\echo '';
\echo '已删除的索引:';
\echo '  ✓ 31 个索引 (随表自动删除)';
\echo '';
\echo '⚠️  重要提示:';
\echo '  - 所有需求管理数据已被删除';
\echo '  - 如需恢复，请使用备份文件';
\echo '  - 建议重新运行迁移脚本前先验证备份';
\echo '';
\echo '恢复命令示例:';
\echo '  pg_restore -d database_name backup_file.dump';
\echo '';
\echo '========================================';
\echo '';

-- ================================================
-- 验证回滚结果
-- ================================================

\echo '正在验证回滚结果...';

DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    -- 检查表是否仍然存在
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name IN ('requirements', 'requirement_comments', 'requirement_history', 'requirement_tasks')
    ) INTO table_exists;

    IF table_exists THEN
        RAISE WARNING '警告: 某些表可能未被完全删除，请手动检查';
    ELSE
        RAISE NOTICE '✓ 验证通过: 所有需求管理表已成功删除';
    END IF;
END $$;

\echo '';
\echo '回滚验证完成';
\echo '';
