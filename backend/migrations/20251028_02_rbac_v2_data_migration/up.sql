-- ============================================================================
-- RBAC v2.0 数据迁移脚本
-- Migration: 20251028_02_rbac_v2_data_migration
-- Description: 将旧系统的用户角色数据迁移到新的双域RBAC表
-- Author: AI Backend Team
-- Date: 2025-10-28
-- ============================================================================

BEGIN;

-- ============================================================================
-- 第一部分: 系统域数据迁移
-- 将users表中的system类型用户分配系统角色
-- ============================================================================

DO $$
DECLARE
    migrated_count INT := 0;
    super_admin_role_id INT;
    admin_role_id INT;
    enterprise_manager_role_id INT;
    system_user_role_id INT;
BEGIN
    RAISE NOTICE '=== 开始系统域数据迁移 ===';

    -- 获取系统角色ID
    SELECT id INTO super_admin_role_id FROM system_roles WHERE code = 'super_admin';
    SELECT id INTO admin_role_id FROM system_roles WHERE code = 'admin';
    SELECT id INTO enterprise_manager_role_id FROM system_roles WHERE code = 'enterprise_manager';
    SELECT id INTO system_user_role_id FROM system_roles WHERE code = 'system_user';

    -- 迁移super_admin用户 (根据CLAUDE.md中指定的用户名)
    UPDATE users
    SET system_role_id = super_admin_role_id
    WHERE username IN ('admin', 'guoym', 'weier', 'fuxing')
      AND user_type = 'system'
      AND deleted_at IS NULL;

    GET DIAGNOSTICS migrated_count = ROW_COUNT;
    RAISE NOTICE '✅ 已迁移 % 个super_admin用户', migrated_count;

    -- 迁移admin用户 (role='admin'但不在super_admin列表中)
    UPDATE users
    SET system_role_id = admin_role_id
    WHERE role = 'admin'
      AND user_type = 'system'
      AND username NOT IN ('admin', 'guoym', 'weier', 'fuxing')
      AND system_role_id IS NULL
      AND deleted_at IS NULL;

    GET DIAGNOSTICS migrated_count = ROW_COUNT;
    RAISE NOTICE '✅ 已迁移 % 个admin用户', migrated_count;

    -- 迁移其他系统用户为system_user
    UPDATE users
    SET system_role_id = system_user_role_id
    WHERE user_type = 'system'
      AND system_role_id IS NULL
      AND deleted_at IS NULL;

    GET DIAGNOSTICS migrated_count = ROW_COUNT;
    RAISE NOTICE '✅ 已迁移 % 个system_user用户', migrated_count;

    -- 验证迁移结果
    SELECT COUNT(*) INTO migrated_count
    FROM users
    WHERE user_type = 'system'
      AND system_role_id IS NOT NULL
      AND deleted_at IS NULL;

    RAISE NOTICE '✅ 系统域迁移完成，总计 % 个系统用户已分配角色', migrated_count;
END $$;

-- ============================================================================
-- 第二部分: 企业域数据迁移
-- 为每个企业创建预设角色，并迁移用户角色分配
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2.1 为每个企业创建预设角色
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    enterprise_record RECORD;
    role_count INT := 0;
    total_enterprises INT := 0;
    admin_perm_ids INT[];
    manager_perm_ids INT[];
    member_perm_ids INT[];
BEGIN
    RAISE NOTICE '=== 开始为企业创建预设角色 ===';

    -- 获取企业管理员所需的权限ID（所有企业权限）
    SELECT ARRAY_AGG(id) INTO admin_perm_ids
    FROM enterprise_permissions
    WHERE deleted_at IS NULL;

    -- 获取项目经理所需的权限ID（项目、任务、文档相关）
    SELECT ARRAY_AGG(id) INTO manager_perm_ids
    FROM enterprise_permissions
    WHERE resource IN ('project', 'task', 'document')
      AND deleted_at IS NULL;

    -- 获取普通成员所需的权限ID（基础读权限）
    SELECT ARRAY_AGG(id) INTO member_perm_ids
    FROM enterprise_permissions
    WHERE action = 'read'
      AND deleted_at IS NULL;

    -- 为每个企业创建3个预设角色
    FOR enterprise_record IN
        SELECT id, name FROM enterprises WHERE deleted_at IS NULL
    LOOP
        total_enterprises := total_enterprises + 1;

        -- 创建 enterprise_admin 角色
        INSERT INTO enterprise_roles (
            enterprise_id, code, name, description,
            is_preset, is_custom, is_active
        ) VALUES (
            enterprise_record.id,
            'enterprise_admin',
            '企业管理员',
            '企业的最高管理员，拥有所有企业权限',
            TRUE, FALSE, TRUE
        )
        ON CONFLICT (enterprise_id, code) DO NOTHING;

        -- 创建 project_manager 角色
        INSERT INTO enterprise_roles (
            enterprise_id, code, name, description,
            is_preset, is_custom, is_active
        ) VALUES (
            enterprise_record.id,
            'project_manager',
            '项目经理',
            '管理项目和任务，负责项目执行',
            TRUE, FALSE, TRUE
        )
        ON CONFLICT (enterprise_id, code) DO NOTHING;

        -- 创建 member 角色
        INSERT INTO enterprise_roles (
            enterprise_id, code, name, description,
            is_preset, is_custom, is_active
        ) VALUES (
            enterprise_record.id,
            'member',
            '普通成员',
            '企业的普通成员，具有基础查看权限',
            TRUE, FALSE, TRUE
        )
        ON CONFLICT (enterprise_id, code) DO NOTHING;

        role_count := role_count + 3;
    END LOOP;

    RAISE NOTICE '✅ 已为 % 个企业创建 % 个预设角色', total_enterprises, role_count;
END $$;

-- ----------------------------------------------------------------------------
-- 2.2 为企业角色分配权限
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    role_record RECORD;
    perm_record RECORD;
    mapping_count INT := 0;
BEGIN
    RAISE NOTICE '=== 开始为企业角色分配权限 ===';

    -- 为所有enterprise_admin角色分配所有权限
    FOR role_record IN
        SELECT id FROM enterprise_roles WHERE code = 'enterprise_admin'
    LOOP
        FOR perm_record IN
            SELECT id FROM enterprise_permissions WHERE deleted_at IS NULL
        LOOP
            INSERT INTO enterprise_role_permissions (role_id, permission_id)
            VALUES (role_record.id, perm_record.id)
            ON CONFLICT (role_id, permission_id) DO NOTHING;
            mapping_count := mapping_count + 1;
        END LOOP;
    END LOOP;

    RAISE NOTICE '✅ enterprise_admin: 已分配 % 个权限映射', mapping_count;
    mapping_count := 0;

    -- 为project_manager角色分配项目、任务、文档权限
    FOR role_record IN
        SELECT id FROM enterprise_roles WHERE code = 'project_manager'
    LOOP
        FOR perm_record IN
            SELECT id FROM enterprise_permissions
            WHERE resource IN ('project', 'task', 'document')
              AND deleted_at IS NULL
        LOOP
            INSERT INTO enterprise_role_permissions (role_id, permission_id)
            VALUES (role_record.id, perm_record.id)
            ON CONFLICT (role_id, permission_id) DO NOTHING;
            mapping_count := mapping_count + 1;
        END LOOP;
    END LOOP;

    RAISE NOTICE '✅ project_manager: 已分配 % 个权限映射', mapping_count;
    mapping_count := 0;

    -- 为member角色分配基础读权限
    FOR role_record IN
        SELECT id FROM enterprise_roles WHERE code = 'member'
    LOOP
        FOR perm_record IN
            SELECT id FROM enterprise_permissions
            WHERE action = 'read'
              AND deleted_at IS NULL
        LOOP
            INSERT INTO enterprise_role_permissions (role_id, permission_id)
            VALUES (role_record.id, perm_record.id)
            ON CONFLICT (role_id, permission_id) DO NOTHING;
            mapping_count := mapping_count + 1;
        END LOOP;
    END LOOP;

    RAISE NOTICE '✅ member: 已分配 % 个权限映射', mapping_count;
END $$;

-- ----------------------------------------------------------------------------
-- 2.3 迁移企业用户角色（支持多角色）
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    migrated_count INT := 0;
    eu_record RECORD;
    assigned_role_id INT;
BEGIN
    RAISE NOTICE '=== 开始迁移企业用户角色 ===';

    -- 从enterprise_users表迁移（如果存在）
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'enterprise_users') THEN
        -- 迁移admin角色用户
        FOR eu_record IN
            SELECT eu.user_id, eu.enterprise_id, u.role as user_role, u.status
            FROM enterprise_users eu
            JOIN users u ON eu.user_id = u.id
            WHERE u.user_type = 'enterprise'
              AND u.deleted_at IS NULL
              AND eu.deleted_at IS NULL
        LOOP
            -- 根据用户的role字段确定企业角色
            IF eu_record.user_role IN ('admin', 'enterprise_admin') THEN
                -- 分配enterprise_admin角色
                SELECT id INTO assigned_role_id
                FROM enterprise_roles
                WHERE enterprise_id = eu_record.enterprise_id
                  AND code = 'enterprise_admin'
                LIMIT 1;

            ELSIF eu_record.user_role = 'project_manager' THEN
                -- 分配project_manager角色
                SELECT id INTO assigned_role_id
                FROM enterprise_roles
                WHERE enterprise_id = eu_record.enterprise_id
                  AND code = 'project_manager'
                LIMIT 1;

            ELSE
                -- 默认分配member角色
                SELECT id INTO assigned_role_id
                FROM enterprise_roles
                WHERE enterprise_id = eu_record.enterprise_id
                  AND code = 'member'
                LIMIT 1;
            END IF;

            -- 插入角色分配
            IF assigned_role_id IS NOT NULL THEN
                INSERT INTO enterprise_user_roles (
                    user_id, enterprise_id, role_id, is_active
                ) VALUES (
                    eu_record.user_id,
                    eu_record.enterprise_id,
                    assigned_role_id,
                    CASE WHEN eu_record.status = 'active' THEN TRUE ELSE FALSE END
                )
                ON CONFLICT (user_id, enterprise_id, role_id) DO NOTHING;

                migrated_count := migrated_count + 1;
            END IF;
        END LOOP;

        RAISE NOTICE '✅ 从enterprise_users迁移了 % 个用户角色', migrated_count;
    END IF;

    -- 注意: enterprise_user_roles_old表结构不匹配，跳过迁移
    -- 已从enterprise_users成功迁移用户角色

    RAISE NOTICE '=== 企业用户角色迁移完成 ===';
END $$;

-- ============================================================================
-- 第三部分: 数据验证
-- ============================================================================

DO $$
DECLARE
    system_users_count INT;
    enterprise_roles_count INT;
    enterprise_user_roles_count INT;
    role_permissions_count INT;
BEGIN
    RAISE NOTICE '=== 开始数据验证 ===';

    -- 验证系统用户角色分配
    SELECT COUNT(*) INTO system_users_count
    FROM users
    WHERE user_type = 'system'
      AND system_role_id IS NOT NULL
      AND deleted_at IS NULL;

    RAISE NOTICE '✅ 系统用户角色分配: % 个用户', system_users_count;

    -- 验证企业角色创建
    SELECT COUNT(*) INTO enterprise_roles_count
    FROM enterprise_roles
    WHERE deleted_at IS NULL;

    RAISE NOTICE '✅ 企业角色总数: % 个角色', enterprise_roles_count;

    -- 验证企业用户角色分配
    SELECT COUNT(*) INTO enterprise_user_roles_count
    FROM enterprise_user_roles
    WHERE deleted_at IS NULL;

    RAISE NOTICE '✅ 企业用户角色分配: % 个分配', enterprise_user_roles_count;

    -- 验证角色权限映射
    SELECT COUNT(*) INTO role_permissions_count
    FROM enterprise_role_permissions;

    RAISE NOTICE '✅ 企业角色权限映射: % 个映射', role_permissions_count;

    -- 数据一致性检查
    IF system_users_count = 0 THEN
        RAISE WARNING '⚠️  没有系统用户被分配角色';
    END IF;

    IF enterprise_roles_count = 0 THEN
        RAISE EXCEPTION '❌ 企业角色创建失败';
    END IF;

    IF role_permissions_count = 0 THEN
        RAISE WARNING '⚠️  没有企业角色权限映射';
    END IF;

    RAISE NOTICE '=== 数据验证完成 ===';
END $$;

COMMIT;

-- ============================================================================
-- Migration 完成
-- ============================================================================
-- 数据迁移总结:
-- 1. 系统用户已分配系统角色
-- 2. 每个企业已创建3个预设角色
-- 3. 企业角色已分配对应权限
-- 4. 企业用户已分配企业角色
--
-- 下一步: 运行性能优化脚本 (20251028_03_rbac_v2_performance)
-- ============================================================================
