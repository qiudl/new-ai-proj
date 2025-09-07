-- 044_data_migration_to_enterprises/up.sql
-- 数据迁移：从customers和companies表迁移数据到enterprises表
-- 作者: Claude Code AI
-- 创建时间: 2025-09-06

BEGIN;

-- 输出迁移开始信息
\echo '=========================================='
\echo 'Starting data migration to enterprises table'
\echo '=========================================='

-- 第一步：从customers表迁移数据到enterprises表
\echo 'Step 1: Migrating data from customers table...'

INSERT INTO enterprises (
    name, code, industry_type, business_type,
    registration_number, tax_id, legal_representative,
    address, city, province, postal_code, 
    website, contact_phone, contact_email,
    status, description,
    created_by, updated_by, created_at, updated_at, deleted_at
)
SELECT 
    company_name as name,
    COALESCE(company_code, 'CUST_' || id::text) as code,
    COALESCE(industry, 'technology') as industry_type,
    CASE 
        WHEN company_type = 'limited_company' THEN 'corporation'
        WHEN company_type = 'partnership' THEN 'partnership'
        WHEN company_type = 'sole_proprietorship' THEN 'individual'
        ELSE 'corporation'
    END as business_type,
    business_license as registration_number,
    tax_number as tax_id,
    legal_representative,
    address,
    city,
    province,
    postal_code,
    website,
    main_phone as contact_phone,
    main_email as contact_email,
    CASE 
        WHEN status = 'potential' THEN 'inactive'
        WHEN status = 'active' THEN 'active'
        WHEN status = 'inactive' THEN 'inactive'
        WHEN status = 'suspended' THEN 'suspended'
        ELSE 'active'
    END as status,
    CONCAT('Migrated from customers table. Original company_type: ', COALESCE(company_type, 'unknown'), 
           ', priority: ', COALESCE(priority, 'medium'), 
           ', employee_count: ', COALESCE(employee_count::text, 'unknown'),
           ', company_size: ', COALESCE(company_size, 'unknown')) as description,
    created_by,
    updated_by,
    created_at,
    updated_at,
    deleted_at
FROM customers
WHERE deleted_at IS NULL -- 只迁移未删除的记录
ON CONFLICT (code) DO NOTHING; -- 避免代码冲突

-- 获取插入记录数量
\echo 'Customers migration completed'

-- 第二步：从companies表迁移数据到enterprises表
\echo 'Step 2: Migrating data from companies table...'

INSERT INTO enterprises (
    name, code, industry_type, business_type,
    registration_number, tax_id, legal_representative,
    address, city, province, postal_code,
    website, contact_phone, contact_email,
    status, description,
    created_by, updated_by, created_at, updated_at, deleted_at
)
SELECT 
    company_name as name,
    COALESCE(company_code, 'COMP_' || id::text) as code,
    COALESCE(industry, 'technology') as industry_type,
    CASE 
        WHEN company_type = 'client' THEN 'corporation'
        WHEN company_type = 'partner' THEN 'partnership'
        WHEN company_type = 'vendor' THEN 'corporation'
        ELSE 'corporation'
    END as business_type,
    business_license as registration_number,
    tax_number as tax_id,
    legal_representative,
    address,
    city,
    province,
    postal_code,
    website,
    main_phone as contact_phone,
    main_email as contact_email,
    CASE 
        WHEN status = 'potential' THEN 'inactive'
        WHEN status = 'active' THEN 'active'
        WHEN status = 'inactive' THEN 'inactive'
        WHEN status = 'suspended' THEN 'suspended'
        ELSE 'active'
    END as status,
    CONCAT('Migrated from companies table. Original company_type: ', COALESCE(company_type, 'unknown'), 
           ', priority: ', COALESCE(priority, 'medium'), 
           ', employee_count: ', COALESCE(employee_count::text, 'unknown'),
           ', company_size: ', COALESCE(company_size, 'unknown')) as description,
    created_by,
    updated_by,
    created_at,
    updated_at,
    deleted_at
FROM companies
WHERE deleted_at IS NULL -- 只迁移未删除的记录
ON CONFLICT (code) DO UPDATE SET 
    -- 如果代码冲突，更新为组合代码
    code = EXCLUDED.code || '_COMP',
    description = EXCLUDED.description || ' [Code conflict resolved]';

\echo 'Companies migration completed'

-- 第三步：验证迁移结果
\echo 'Step 3: Validating migration results...'

-- 统计迁移结果
SELECT 
    'Migration Summary' as info,
    (SELECT COUNT(*) FROM customers WHERE deleted_at IS NULL) as customers_count,
    (SELECT COUNT(*) FROM companies WHERE deleted_at IS NULL) as companies_count,
    (SELECT COUNT(*) FROM enterprises WHERE description LIKE 'Migrated from %') as migrated_count,
    (SELECT COUNT(*) FROM enterprises) as total_enterprises;

-- 检查重复代码
SELECT 
    'Code Conflicts' as info,
    COUNT(*) as conflict_count
FROM enterprises 
WHERE code LIKE '%_COMP';

-- 检查数据完整性
SELECT 
    'Data Integrity Check' as info,
    COUNT(CASE WHEN name IS NULL OR name = '' THEN 1 END) as empty_names,
    COUNT(CASE WHEN code IS NULL OR code = '' THEN 1 END) as empty_codes,
    COUNT(CASE WHEN industry_type IS NULL THEN 1 END) as null_industry,
    COUNT(CASE WHEN business_type IS NULL THEN 1 END) as null_business_type
FROM enterprises 
WHERE description LIKE 'Migrated from %';

COMMIT;

-- 输出完成信息
\echo '=========================================='
\echo 'Data migration to enterprises completed'
\echo 'Next steps:'
\echo '1. Update foreign key references in related tables'
\echo '2. Migrate user data to new user system'
\echo '3. Migrate department data'
\echo '=========================================='