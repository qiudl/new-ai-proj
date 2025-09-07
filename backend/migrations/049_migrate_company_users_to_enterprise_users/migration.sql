-- 049_migrate_company_users_to_enterprise_users
-- 将company_users表中的数据迁移到enterprise_users表

-- 检查是否已经有迁移数据，如果有则跳过
DO $$ 
DECLARE 
    existing_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO existing_count 
    FROM enterprise_users 
    WHERE username LIKE 'company_user_%';
    
    IF existing_count > 0 THEN
        RAISE NOTICE '已检测到 % 条company_users迁移记录，跳过重复迁移', existing_count;
        RETURN;
    END IF;
    
    RAISE NOTICE '开始迁移company_users表数据到enterprise_users表...';
END $$;

-- 创建临时映射表来关联companies和enterprises的ID关系
CREATE TEMP TABLE company_enterprise_mapping AS
WITH company_mapping AS (
    SELECT 
        2 as company_id,
        9 as enterprise_id  -- 测试科技有限公司
    UNION ALL
    SELECT 
        3 as company_id,
        10 as enterprise_id -- 创新软件公司
)
SELECT * FROM company_mapping;

-- 迁移company_users表数据到enterprise_users表
INSERT INTO enterprise_users (
    enterprise_id,
    username,
    email,
    name,
    phone,
    position,
    department_id,
    is_primary_contact,
    can_make_decisions,
    access_level,
    status,
    created_by,
    updated_by,
    created_at,
    updated_at
)
SELECT 
    cem.enterprise_id,
    'company_user_' || cu.id::text as username,
    CASE 
        WHEN cu.email IS NOT NULL THEN 
            CASE 
                WHEN EXISTS (SELECT 1 FROM enterprise_users WHERE email = cu.email) THEN
                    'company_user_' || cu.id || '_' || SUBSTRING(cu.email FROM '^[^@]+') || '@migrated.local'
                ELSE 
                    cu.email
            END
        ELSE 
            'company_user_' || cu.id || '@migrated.local' 
    END as email,
    cu.name,
    COALESCE(cu.phone, cu.mobile, cu.work_phone) as phone,
    cu.position,
    cu.department_id, -- 保持原有的department_id，因为已经迁移到enterprise_departments
    cu.is_primary_contact,
    cu.can_make_decisions,
    cu.access_level,
    CASE 
        WHEN cu.status = 'active' THEN 'active'
        WHEN cu.status = 'inactive' THEN 'inactive'
        WHEN cu.status = 'left' THEN 'inactive'
        ELSE 'inactive'
    END as status,
    1 as created_by, -- 设置为管理员创建
    1 as updated_by,
    cu.created_at::timestamp with time zone,
    cu.updated_at::timestamp with time zone
FROM company_users cu
JOIN company_enterprise_mapping cem ON cu.customer_id = cem.company_id
WHERE NOT EXISTS (
    SELECT 1 FROM enterprise_users 
    WHERE username = 'company_user_' || cu.id::text
);

-- 显示迁移结果统计
SELECT 
    'Migration Summary' as info,
    COUNT(*) as total_migrated_records
FROM enterprise_users 
WHERE username LIKE 'company_user_%';

-- 显示迁移的详细数据
SELECT 
    'Migrated Company Users' as type,
    eu.id as enterprise_user_id,
    eu.enterprise_id,
    e.name as enterprise_name,
    eu.username,
    eu.name,
    eu.email,
    eu.position,
    eu.is_primary_contact,
    eu.access_level,
    eu.status,
    SUBSTRING(eu.username FROM 'company_user_(\d+)') as original_company_user_id
FROM enterprise_users eu
JOIN enterprises e ON eu.enterprise_id = e.id
WHERE eu.username LIKE 'company_user_%'
ORDER BY eu.enterprise_id, eu.id;