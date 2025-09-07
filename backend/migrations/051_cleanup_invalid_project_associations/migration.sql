-- 051_cleanup_invalid_project_associations  
-- 清理projects表中无效的company_id关联

-- 显示清理前的情况
SELECT 
    'Before Cleanup' as status,
    COUNT(*) as total_projects,
    COUNT(CASE WHEN company_id IS NOT NULL THEN 1 END) as projects_with_company_id,
    COUNT(CASE WHEN enterprise_id IS NOT NULL THEN 1 END) as projects_with_enterprise_id
FROM projects 
WHERE deleted_at IS NULL;

-- 显示无效关联的详情
SELECT 
    'Invalid Company Associations' as info,
    p.id as project_id,
    p.name as project_name,
    p.company_id,
    'Company不存在' as issue
FROM projects p
LEFT JOIN companies c ON p.company_id = c.id
WHERE p.company_id IS NOT NULL 
  AND c.id IS NULL 
  AND p.deleted_at IS NULL;

-- 清理无效的company_id关联
UPDATE projects 
SET company_id = NULL 
WHERE company_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM companies WHERE id = projects.company_id)
  AND deleted_at IS NULL;

-- 显示清理结果
SELECT 
    'Cleanup Results' as info,
    COUNT(*) as total_updated_projects
FROM projects 
WHERE company_id IS NULL 
  AND deleted_at IS NULL;

-- 显示清理后的情况  
SELECT 
    'After Cleanup' as status,
    COUNT(*) as total_projects,
    COUNT(CASE WHEN company_id IS NOT NULL THEN 1 END) as projects_with_valid_company_id,
    COUNT(CASE WHEN enterprise_id IS NOT NULL THEN 1 END) as projects_with_enterprise_id,
    COUNT(CASE WHEN company_id IS NULL AND enterprise_id IS NULL THEN 1 END) as projects_without_association
FROM projects 
WHERE deleted_at IS NULL;

-- 显示剩余的有效关联
SELECT 
    'Remaining Valid Associations' as info,
    p.id as project_id,
    p.name as project_name,
    p.company_id,
    c.company_name,
    p.enterprise_id
FROM projects p
LEFT JOIN companies c ON p.company_id = c.id
WHERE (p.company_id IS NOT NULL OR p.enterprise_id IS NOT NULL)
  AND p.deleted_at IS NULL
ORDER BY p.id;