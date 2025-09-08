-- =====================================================
-- Migration 060: Deprecate Legacy Company Tables
-- =====================================================
-- Description: 标记legacy company和customers表为deprecated状态
-- Date: 2024-09-08
-- Risk Level: LOW (只添加注释，不修改数据)
-- =====================================================

-- 为legacy表添加deprecation注释
COMMENT ON TABLE companies IS 'DEPRECATED: This table is deprecated. Use enterprises table instead. Will be removed after complete migration to enterprise system.';
COMMENT ON TABLE customers IS 'DEPRECATED: This table is deprecated. Use enterprises table instead. Will be removed after complete migration to enterprise system.';
COMMENT ON TABLE company_users IS 'DEPRECATED: This table is deprecated. Use enterprise_users table instead. Will be removed after complete migration to enterprise system.';
COMMENT ON TABLE company_departments IS 'DEPRECATED: This table is deprecated. Use enterprise_departments table instead. Will be removed after complete migration to enterprise system.';
COMMENT ON TABLE customer_contacts IS 'DEPRECATED: This table is deprecated. Contact records are now managed through enterprise system.';
COMMENT ON TABLE customer_users IS 'DEPRECATED: This table is deprecated. Use enterprise_users table instead. Will be removed after complete migration to enterprise system.';

-- 删除已存在的视图
DROP VIEW IF EXISTS v_legacy_companies;
DROP VIEW IF EXISTS v_legacy_customers;

-- 添加视图以兼容现有代码（如果需要的话）
CREATE VIEW v_legacy_companies AS
SELECT 
    c.id,
    c.company_name,
    c.industry,
    c.status,
    c.priority,
    c.created_at,
    c.updated_at,
    'MIGRATED_FROM_COMPANIES' as migration_note
FROM companies c
WHERE c.deleted_at IS NULL;

CREATE VIEW v_legacy_customers AS
SELECT 
    c.id,
    c.company_name as name,
    c.company_name as company,
    c.industry,
    c.status,
    c.priority,
    c.created_at,
    c.updated_at,
    'MIGRATED_FROM_CUSTOMERS' as migration_note
FROM customers c
WHERE c.deleted_at IS NULL;

-- 记录迁移状态
INSERT INTO schema_migrations (migration_name, executed_at) 
VALUES ('060_deprecate_legacy_company_tables', NOW())
ON CONFLICT (migration_name) DO NOTHING;