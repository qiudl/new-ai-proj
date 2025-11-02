-- =============================================================================
-- 修复现有角色数据，为初始化做准备
-- =============================================================================

BEGIN;

-- 步骤1: 添加 enterprise_id 字段（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'company_roles' AND column_name = 'enterprise_id'
    ) THEN
        ALTER TABLE company_roles
        ADD COLUMN enterprise_id INTEGER REFERENCES enterprises(id);

        CREATE INDEX IF NOT EXISTS idx_company_roles_enterprise_id
        ON company_roles(enterprise_id);

        RAISE NOTICE '已添加 enterprise_id 字段';
    ELSE
        RAISE NOTICE 'enterprise_id 字段已存在';
    END IF;
END $$;

-- 步骤2: 修复现有数据 - 标记旧的系统角色为非活跃
UPDATE company_roles
SET is_active = false,
    updated_at = NOW()
WHERE role_code IN (
    'super_admin', 'admin', 'superadmin', 'system_admin', 'system_operator',
    'system_auditor', 'system_support', 'system_guest',
    'company_admin', 'project_manager', 'developer', 'member', 'guest',
    'tech_lead', 'team_lead', 'designer', 'tester', 'business_analyst',
    'hr_manager', 'finance_manager', 'business_contact', 'client_user', 'mcp_service'
)
AND is_system_role = true;

-- 步骤3: 处理 is_system_role = false 但没有 enterprise_id 的角色
-- 选项A: 标记为测试角色并停用
UPDATE company_roles
SET is_active = false,
    role_description = COALESCE(role_description, '') || ' [已停用-迁移前测试数据]',
    updated_at = NOW()
WHERE is_system_role = false
  AND enterprise_id IS NULL
  AND id IN (41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61);

COMMIT;

-- 验证结果
SELECT
    '修复后的角色统计' as 说明,
    is_system_role,
    COUNT(*) as 总数,
    SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as 活跃数,
    SUM(CASE WHEN enterprise_id IS NULL THEN 1 ELSE 0 END) as 无企业ID数
FROM company_roles
GROUP BY is_system_role
ORDER BY is_system_role DESC;
