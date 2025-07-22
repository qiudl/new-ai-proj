-- 修复企业客户管理页面数据问题的SQL脚本

-- 1. 修复空的企业名称
UPDATE customers 
SET company_name = COALESCE(NULLIF(TRIM(company_name), ''), '未命名企业' || id)
WHERE company_name IS NULL OR TRIM(company_name) = '';

-- 2. 确保状态字段有正确的文本显示值
UPDATE customers 
SET status = COALESCE(status, 'potential')
WHERE status IS NULL;

UPDATE customers 
SET priority = COALESCE(priority, 'medium')
WHERE priority IS NULL;

-- 3. 添加数据库约束防止再次出现空企业名称
ALTER TABLE customers 
ADD CONSTRAINT IF NOT EXISTS check_company_name_not_empty 
CHECK (company_name IS NOT NULL AND company_name != '');

-- 4. 添加索引提升查询性能
CREATE INDEX IF NOT EXISTS idx_customers_company_name ON customers(company_name);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);
CREATE INDEX IF NOT EXISTS idx_customers_updated_at ON customers(updated_at);

-- 5. 更新统计信息
ANALYZE customers;

-- 6. 验证数据完整性
SELECT 
    COUNT(*) as total_companies,
    COUNT(CASE WHEN company_name IS NULL OR company_name = '' THEN 1 END) as empty_names,
    COUNT(CASE WHEN status IS NULL THEN 1 END) as null_status,
    COUNT(CASE WHEN priority IS NULL THEN 1 END) as null_priority
FROM customers
WHERE deleted_at IS NULL;