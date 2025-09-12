-- Migration: 修复项目与企业的关联关系
-- Date: 2025-09-11
-- Description: 根据项目名称匹配企业，为项目设置正确的enterprise_id

BEGIN;

-- 1. 李宁团购管理平台 → 李宁集团 (ID: 3)
UPDATE projects 
SET enterprise_id = 3 
WHERE name = '李宁团购管理平台' AND deleted_at IS NULL;

-- 2. 北京名风物流系统 → 北京名风新能源科技有限公司 (ID: 6)
UPDATE projects 
SET enterprise_id = 6 
WHERE name = '北京名风物流系统' AND deleted_at IS NULL;

-- 3. 对丝ERP → 北京对丝信息技术有限公司 (ID: 5)
UPDATE projects 
SET enterprise_id = 5 
WHERE name = '对丝ERP' AND deleted_at IS NULL;

-- 4. 金曼荣-对丝ERP → 温州金曼荣 (ID: 8)
UPDATE projects 
SET enterprise_id = 8 
WHERE name = '金曼荣-对丝ERP' AND deleted_at IS NULL;

-- 5. 其他项目关联到李宁集团作为默认企业（便于测试）
UPDATE projects 
SET enterprise_id = 3 
WHERE enterprise_id IS NULL 
  AND deleted_at IS NULL
  AND name NOT IN ('李宁团购管理平台', '北京名风物流系统', '对丝ERP', '金曼荣-对丝ERP');

-- 验证迁移结果
SELECT 
    '迁移结果验证' as check_type,
    COUNT(*) as total_projects,
    COUNT(CASE WHEN enterprise_id IS NOT NULL THEN 1 END) as projects_with_enterprise,
    COUNT(CASE WHEN enterprise_id IS NULL THEN 1 END) as projects_without_enterprise
FROM projects 
WHERE deleted_at IS NULL;

-- 显示各企业的项目分布
SELECT 
    e.name as enterprise_name,
    COUNT(p.id) as project_count,
    STRING_AGG(p.name, ', ') as project_names
FROM enterprises e
LEFT JOIN projects p ON e.id = p.enterprise_id AND p.deleted_at IS NULL
WHERE e.deleted_at IS NULL
GROUP BY e.id, e.name
ORDER BY project_count DESC, e.name;

COMMIT;