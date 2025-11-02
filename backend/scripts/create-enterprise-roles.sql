-- =============================================================================
-- 为现有企业创建默认角色
-- =============================================================================
-- 功能: 为每个企业从系统角色模板创建企业角色
-- 版本: v1.0
-- 日期: 2025-11-02
-- 作者: Claude Code AI
-- =============================================================================

BEGIN;

-- =============================================================================
-- 步骤 1: 为每个企业创建默认角色
-- =============================================================================

-- 为每个企业创建角色的函数
CREATE OR REPLACE FUNCTION create_enterprise_default_roles(p_enterprise_id INTEGER)
RETURNS TABLE(
    created_role_code VARCHAR,
    created_role_name VARCHAR,
    permission_count INTEGER
) AS $$
DECLARE
    v_template_role RECORD;
    v_new_role_id INTEGER;
    v_permissions_copied INTEGER;
BEGIN
    -- 遍历所有企业角色模板
    FOR v_template_role IN
        SELECT id, role_code, role_name, role_description
        FROM company_roles
        WHERE is_system_role = true
          AND role_code IN (
              'ENTERPRISE_ADMIN',
              'ENTERPRISE_PM',
              'ENTERPRISE_DEVELOPER',
              'ENTERPRISE_USER',
              'ENTERPRISE_GUEST'
          )
          AND is_active = true
    LOOP
        -- 检查企业是否已有此角色
        SELECT id INTO v_new_role_id
        FROM company_roles
        WHERE enterprise_id = p_enterprise_id
          AND role_code = v_template_role.role_code
          AND is_system_role = false;

        -- 如果不存在,创建新角色
        IF v_new_role_id IS NULL THEN
            INSERT INTO company_roles (
                role_code,
                role_name,
                role_description,
                is_system_role,
                is_active,
                enterprise_id,
                created_at,
                updated_at
            )
            VALUES (
                v_template_role.role_code,
                v_template_role.role_name,
                v_template_role.role_description,
                false,  -- 企业角色
                true,
                p_enterprise_id,
                NOW(),
                NOW()
            )
            RETURNING id INTO v_new_role_id;

            -- 复制权限
            INSERT INTO role_permissions (role_id, permission_id, is_granted, created_at)
            SELECT
                v_new_role_id,
                permission_id,
                is_granted,
                NOW()
            FROM role_permissions
            WHERE role_id = v_template_role.id;

            GET DIAGNOSTICS v_permissions_copied = ROW_COUNT;

            -- 返回创建的角色信息
            created_role_code := v_template_role.role_code;
            created_role_name := v_template_role.role_name;
            permission_count := v_permissions_copied;
            RETURN NEXT;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 步骤 2: 为所有现有企业创建默认角色
-- =============================================================================

DO $$
DECLARE
    v_enterprise RECORD;
    v_result RECORD;
    v_total_roles INTEGER := 0;
BEGIN
    RAISE NOTICE '开始为现有企业创建默认角色...';

    FOR v_enterprise IN
        SELECT id, name, code
        FROM enterprises
        WHERE deleted_at IS NULL
        ORDER BY id
    LOOP
        RAISE NOTICE '处理企业: % (ID: %, CODE: %)', v_enterprise.name, v_enterprise.id, v_enterprise.code;

        -- 为企业创建角色
        FOR v_result IN
            SELECT * FROM create_enterprise_default_roles(v_enterprise.id)
        LOOP
            RAISE NOTICE '  创建角色: % (%) - % 个权限',
                v_result.created_role_code,
                v_result.created_role_name,
                v_result.permission_count;
            v_total_roles := v_total_roles + 1;
        END LOOP;
    END LOOP;

    RAISE NOTICE '完成! 共为企业创建了 % 个角色', v_total_roles;
END $$;

-- =============================================================================
-- 步骤 3: 创建企业角色查看视图
-- =============================================================================

CREATE OR REPLACE VIEW v_enterprise_roles_summary AS
SELECT
    e.id as enterprise_id,
    e.name as enterprise_name,
    e.code as enterprise_code,
    r.id as role_id,
    r.role_code,
    r.role_name,
    r.is_active,
    COUNT(rp.permission_id) as permission_count,
    COUNT(DISTINCT eu.id) as user_count
FROM enterprises e
LEFT JOIN company_roles r ON r.enterprise_id = e.id
LEFT JOIN role_permissions rp ON r.id = rp.role_id AND rp.is_granted = true
LEFT JOIN enterprise_users eu ON eu.role_id = r.id AND eu.deleted_at IS NULL
WHERE e.deleted_at IS NULL
  AND r.is_system_role = false
GROUP BY e.id, e.name, e.code, r.id, r.role_code, r.role_name, r.is_active
ORDER BY e.id, r.role_code;

-- =============================================================================
-- 步骤 4: 迁移现有用户的角色
-- =============================================================================

-- 将旧角色映射到新角色
DO $$
DECLARE
    v_old_to_new_map JSONB := '{
        "super_admin": "ENTERPRISE_ADMIN",
        "admin": "ENTERPRISE_ADMIN",
        "company_admin": "ENTERPRISE_ADMIN",
        "project_manager": "ENTERPRISE_PM",
        "tech_lead": "ENTERPRISE_PM",
        "team_lead": "ENTERPRISE_PM",
        "developer": "ENTERPRISE_DEVELOPER",
        "designer": "ENTERPRISE_DEVELOPER",
        "tester": "ENTERPRISE_DEVELOPER",
        "member": "ENTERPRISE_USER",
        "guest": "ENTERPRISE_GUEST",
        "business_contact": "ENTERPRISE_GUEST",
        "client_user": "ENTERPRISE_GUEST"
    }';
    v_user RECORD;
    v_old_role_code VARCHAR;
    v_new_role_code VARCHAR;
    v_new_role_id INTEGER;
    v_updated_count INTEGER := 0;
BEGIN
    RAISE NOTICE '开始迁移用户角色...';

    FOR v_user IN
        SELECT
            eu.id as user_id,
            eu.enterprise_id,
            eu.role_id as old_role_id,
            r.role_code as old_role_code
        FROM enterprise_users eu
        LEFT JOIN company_roles r ON eu.role_id = r.id
        WHERE eu.deleted_at IS NULL
          AND eu.role_id IS NOT NULL
    LOOP
        v_old_role_code := v_user.old_role_code;

        -- 查找映射的新角色代码
        v_new_role_code := v_old_to_new_map->>v_old_role_code;

        IF v_new_role_code IS NOT NULL THEN
            -- 查找企业的新角色ID
            SELECT id INTO v_new_role_id
            FROM company_roles
            WHERE enterprise_id = v_user.enterprise_id
              AND role_code = v_new_role_code
              AND is_system_role = false;

            IF v_new_role_id IS NOT NULL THEN
                -- 更新用户角色
                UPDATE enterprise_users
                SET role_id = v_new_role_id,
                    updated_at = NOW()
                WHERE id = v_user.user_id;

                v_updated_count := v_updated_count + 1;
            ELSE
                RAISE NOTICE '  用户 % 的企业 % 未找到角色 %',
                    v_user.user_id, v_user.enterprise_id, v_new_role_code;
            END IF;
        ELSE
            -- 如果没有映射,设置为默认用户角色
            SELECT id INTO v_new_role_id
            FROM company_roles
            WHERE enterprise_id = v_user.enterprise_id
              AND role_code = 'ENTERPRISE_USER'
              AND is_system_role = false;

            IF v_new_role_id IS NOT NULL THEN
                UPDATE enterprise_users
                SET role_id = v_new_role_id,
                    updated_at = NOW()
                WHERE id = v_user.user_id;

                v_updated_count := v_updated_count + 1;
                RAISE NOTICE '  用户 % 的旧角色 % 无映射,设置为 ENTERPRISE_USER',
                    v_user.user_id, v_old_role_code;
            END IF;
        END IF;
    END LOOP;

    RAISE NOTICE '完成! 共更新了 % 个用户的角色', v_updated_count;
END $$;

COMMIT;

-- =============================================================================
-- 验证结果
-- =============================================================================

SELECT
    '========================================' as separator,
    '企业角色创建完成' as message,
    '========================================' as separator2;

-- 显示每个企业的角色统计
SELECT
    enterprise_name,
    enterprise_code,
    COUNT(DISTINCT role_id) as total_roles,
    SUM(permission_count) as total_permissions,
    SUM(user_count) as total_users
FROM v_enterprise_roles_summary
GROUP BY enterprise_id, enterprise_name, enterprise_code
ORDER BY enterprise_id;

-- 显示详细的企业角色列表
SELECT
    '========================================' as separator,
    '企业角色详情' as title,
    '========================================' as separator2;

SELECT
    enterprise_name,
    role_code,
    role_name,
    permission_count,
    user_count,
    is_active
FROM v_enterprise_roles_summary
ORDER BY enterprise_id, role_code
LIMIT 50;

-- 显示用户角色迁移统计
SELECT
    '========================================' as separator,
    '用户角色分布' as title,
    '========================================' as separator2;

SELECT
    r.role_code,
    r.role_name,
    COUNT(DISTINCT eu.id) as user_count
FROM enterprise_users eu
JOIN company_roles r ON eu.role_id = r.id
WHERE eu.deleted_at IS NULL
  AND r.is_system_role = false
GROUP BY r.role_code, r.role_name
ORDER BY user_count DESC;
