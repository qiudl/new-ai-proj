-- 048_migrate_companies_to_enterprises
-- 将companies表中的数据迁移到enterprises表

-- 检查是否已经有迁移数据，如果有则跳过
DO $$ 
DECLARE 
    existing_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO existing_count 
    FROM enterprises 
    WHERE description LIKE 'Migrated from companies table%';
    
    IF existing_count > 0 THEN
        RAISE NOTICE '已检测到 % 条迁移记录，跳过重复迁移', existing_count;
        RETURN;
    END IF;
    
    RAISE NOTICE '开始迁移companies表数据到enterprises表...';
END $$;

-- 只有在没有现有迁移数据时才执行迁移
INSERT INTO enterprises (
    name,
    code,
    industry_type,
    business_type,
    registration_number,
    tax_id,
    legal_representative,
    contact_email,
    contact_phone,
    address,
    city,
    province,
    postal_code,
    website,
    description,
    status,
    created_by,
    updated_by,
    created_at,
    updated_at
)
SELECT 
    company_name as name,
    COALESCE(company_code, 'COMP_' || id::text) as code, -- 如果没有code，使用ID生成
    industry as industry_type,
    CASE 
        WHEN company_type = 'client' THEN 'corporation'
        ELSE 'corporation' 
    END as business_type,
    business_license as registration_number,
    tax_number as tax_id,
    legal_representative,
    main_email as contact_email,
    main_phone as contact_phone,
    address,
    city,
    province,
    postal_code,
    website,
    'Migrated from company ' || id::text as description,
    CASE 
        WHEN status = 'active' THEN 'active'
        WHEN status = 'inactive' THEN 'inactive'
        WHEN status = 'suspended' THEN 'suspended'
        ELSE 'inactive'
    END as status,
    created_by,
    updated_by,
    created_at,
    updated_at
FROM companies
WHERE deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM enterprises 
    WHERE description LIKE 'Migrated from companies table%'
  );

-- 显示迁移结果
SELECT 
    'Migration Summary' as info,
    COUNT(*) as total_migrated_records
FROM enterprises 
WHERE description LIKE 'Migrated from companies table%';

-- 显示迁移的详细数据对比
SELECT 
    'Migrated Data' as type,
    e.id as enterprise_id,
    e.name,
    e.code,
    e.industry_type,
    e.business_type,
    e.status,
    e.description as migration_info
FROM enterprises e
WHERE e.description LIKE 'Migrated from companies table%'
ORDER BY e.id;