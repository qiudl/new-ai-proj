-- 修复weier账户权限问题
-- 执行方式: psql -h 152.136.104.251 -U postgres -d ai_project_db -f fix_weier_permissions.sql

\echo '🔧 开始修复weier账户权限问题'
\echo '=================================='

BEGIN;

-- 1. 检查并创建weier用户(如果不存在)
\echo ''
\echo '1️⃣ 检查users表中是否存在weier账户...'

DO $$
DECLARE
    weier_user_id INT;
    weier_email VARCHAR;
BEGIN
    -- 查找weier用户
    SELECT id, email INTO weier_user_id, weier_email
    FROM users 
    WHERE username = 'weier'
    LIMIT 1;
    
    IF weier_user_id IS NULL THEN
        RAISE NOTICE '❌ weier用户不存在于users表，需要手动创建';
    ELSE
        RAISE NOTICE '✅ 找到weier用户: ID=%, Email=%', weier_user_id, weier_email;
    END IF;
END $$;

-- 2. 检查company_users表
\echo ''
\echo '2️⃣ 检查并创建company_users记录...'

DO $$
DECLARE
    weier_user_id INT;
    weier_company_user_id INT;
    default_company_id INT := 1; -- 默认公司ID
    developer_role_id INT;
BEGIN
    -- 获取weier的user_id
    SELECT id INTO weier_user_id
    FROM users 
    WHERE username = 'weier'
    LIMIT 1;
    
    IF weier_user_id IS NULL THEN
        RAISE EXCEPTION '❌ weier用户不存在，无法继续';
    END IF;
    
    -- 查找weier的company_user记录
    SELECT id INTO weier_company_user_id
    FROM company_users
    WHERE user_id = weier_user_id
    LIMIT 1;
    
    IF weier_company_user_id IS NULL THEN
        RAISE NOTICE '⚠️  weier没有company_user记录，开始创建...';
        
        -- 获取developer角色ID (如果存在)
        SELECT id INTO developer_role_id
        FROM company_roles
        WHERE role_code = 'DEVELOPER' AND is_active = true
        LIMIT 1;
        
        IF developer_role_id IS NULL THEN
            -- 如果没有DEVELOPER角色,查找其他合适的角色
            SELECT id INTO developer_role_id
            FROM company_roles
            WHERE is_active = true AND is_system_role = false
            ORDER BY id
            LIMIT 1;
        END IF;
        
        -- 创建company_user记录
        INSERT INTO company_users (
            user_id, company_id, role_id, is_active,
            employment_start_date, created_at, updated_at
        ) VALUES (
            weier_user_id, default_company_id, developer_role_id, true,
            CURRENT_DATE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        RETURNING id INTO weier_company_user_id;
        
        RAISE NOTICE '✅ 已创建company_user记录: company_user_id=%', weier_company_user_id;
    ELSE
        RAISE NOTICE '✅ weier已有company_user记录: company_user_id=%', weier_company_user_id;
    END IF;
END $$;

-- 3. 确保weier的角色有project_read权限
\echo ''
\echo '3️⃣ 检查并添加project_read权限到weier的角色...'

DO $$
DECLARE
    weier_user_id INT;
    weier_role_id INT;
    project_read_perm_id INT;
    perm_exists INT;
BEGIN
    -- 获取weier的user_id和role_id
    SELECT cu.user_id, cu.role_id
    INTO weier_user_id, weier_role_id
    FROM company_users cu
    INNER JOIN users u ON cu.user_id = u.id
    WHERE u.username = 'weier'
    LIMIT 1;
    
    IF weier_user_id IS NULL THEN
        RAISE EXCEPTION '❌ 找不到weier的company_user记录';
    END IF;
    
    IF weier_role_id IS NULL THEN
        RAISE NOTICE '⚠️  weier没有分配角色';
        RETURN;
    END IF;
    
    -- 获取project.read权限ID
    SELECT id INTO project_read_perm_id
    FROM permissions
    WHERE permission_code = 'project.read'
    LIMIT 1;
    
    IF project_read_perm_id IS NULL THEN
        RAISE NOTICE '⚠️  找不到project.read权限';
        RETURN;
    END IF;
    
    -- 检查角色是否已有该权限
    SELECT COUNT(*) INTO perm_exists
    FROM company_role_permissions
    WHERE role_id = weier_role_id AND permission_id = project_read_perm_id;
    
    IF perm_exists = 0 THEN
        RAISE NOTICE '⚠️  weier的角色(role_id=%)没有project.read权限，添加中...', weier_role_id;
        
        INSERT INTO company_role_permissions (role_id, permission_id, created_at)
        VALUES (weier_role_id, project_read_perm_id, CURRENT_TIMESTAMP)
        ON CONFLICT (role_id, permission_id) DO NOTHING;
        
        RAISE NOTICE '✅ 已添加project.read权限到weier的角色';
    ELSE
        RAISE NOTICE '✅ weier的角色已有project.read权限';
    END IF;
END $$;

-- 4. 添加task_read权限(同样的逻辑)
\echo ''
\echo '4️⃣ 检查并添加task_read权限到weier的角色...'

DO $$
DECLARE
    weier_role_id INT;
    task_read_perm_id INT;
    perm_exists INT;
BEGIN
    -- 获取weier的role_id
    SELECT cu.role_id INTO weier_role_id
    FROM company_users cu
    INNER JOIN users u ON cu.user_id = u.id
    WHERE u.username = 'weier'
    LIMIT 1;
    
    IF weier_role_id IS NULL THEN
        RAISE NOTICE '⚠️  weier没有分配角色';
        RETURN;
    END IF;
    
    -- 获取task.read权限ID
    SELECT id INTO task_read_perm_id
    FROM permissions
    WHERE permission_code = 'task.read'
    LIMIT 1;
    
    IF task_read_perm_id IS NULL THEN
        RAISE NOTICE '⚠️  找不到task.read权限';
        RETURN;
    END IF;
    
    -- 检查并添加权限
    SELECT COUNT(*) INTO perm_exists
    FROM company_role_permissions
    WHERE role_id = weier_role_id AND permission_id = task_read_perm_id;
    
    IF perm_exists = 0 THEN
        INSERT INTO company_role_permissions (role_id, permission_id, created_at)
        VALUES (weier_role_id, task_read_perm_id, CURRENT_TIMESTAMP)
        ON CONFLICT (role_id, permission_id) DO NOTHING;
        
        RAISE NOTICE '✅ 已添加task.read权限到weier的角色';
    ELSE
        RAISE NOTICE '✅ weier的角色已有task.read权限';
    END IF;
END $$;

-- 5. 或者,直接给weier添加自定义权限覆盖(更直接的方法)
\echo ''
\echo '5️⃣ 添加自定义权限覆盖(备用方案)...'

DO $$
DECLARE
    weier_company_user_id INT;
BEGIN
    -- 获取weier的company_user_id
    SELECT cu.id INTO weier_company_user_id
    FROM company_users cu
    INNER JOIN users u ON cu.user_id = u.id
    WHERE u.username = 'weier'
    LIMIT 1;
    
    IF weier_company_user_id IS NULL THEN
        RAISE NOTICE '❌ 找不到weier的company_user记录';
        RETURN;
    END IF;
    
    -- 添加project.read自定义权限
    INSERT INTO company_user_custom_permissions (
        company_user_id, permission_code, is_granted, created_at, updated_at
    ) VALUES (
        weier_company_user_id, 'project.read', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
    ON CONFLICT (company_user_id, permission_code) 
    DO UPDATE SET is_granted = true, updated_at = CURRENT_TIMESTAMP;
    
    -- 添加task.read自定义权限
    INSERT INTO company_user_custom_permissions (
        company_user_id, permission_code, is_granted, created_at, updated_at
    ) VALUES (
        weier_company_user_id, 'task.read', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
    ON CONFLICT (company_user_id, permission_code) 
    DO UPDATE SET is_granted = true, updated_at = CURRENT_TIMESTAMP;
    
    RAISE NOTICE '✅ 已添加自定义权限覆盖: project.read, task.read';
END $$;

-- 提交事务
COMMIT;

\echo ''
\echo '=================================='
\echo '✅ 修复完成！请重新运行check_weier_db.sql验证'
\echo ''
\echo '如果问题仍然存在,可能是后端CheckUserPermission handler的问题'
\echo '需要确保该handler对company_admin角色有绕过逻辑'
