-- 权限系统种子数据初始化
-- 文件: 002_seed_enhanced_permissions.sql
-- 描述: 为增强的权限系统创建测试和演示数据
-- 任务: #625 - 开发数据库迁移脚本和种子数据
-- 创建时间: 2025-08-27

BEGIN;

-- =============================================================================
-- 1. 权限分组和层级数据初始化
-- =============================================================================

-- 更新现有权限，添加分组信息
UPDATE permissions SET 
    permission_group = 'SYSTEM_ADMINISTRATION',
    level_order = 10,
    metadata = jsonb_build_object(
        'risk_level', 'HIGH',
        'is_critical', true,
        'requires_mfa', true,
        'audit_required', true
    )
WHERE permission_code LIKE 'system.%' AND permission_code LIKE '%.admin%';

UPDATE permissions SET 
    permission_group = 'PROJECT_MANAGEMENT',
    level_order = 20,
    metadata = jsonb_build_object(
        'risk_level', 'MEDIUM',
        'is_critical', false,
        'business_impact', 'HIGH'
    )
WHERE permission_code LIKE 'project.%';

UPDATE permissions SET 
    permission_group = 'TASK_OPERATIONS',
    level_order = 30,
    metadata = jsonb_build_object(
        'risk_level', 'LOW',
        'is_critical', false,
        'daily_usage', true
    )
WHERE permission_code LIKE 'task.%';

-- =============================================================================
-- 2. 权限上下文数据初始化
-- =============================================================================

-- 创建项目上下文
INSERT INTO permission_contexts (context_name, context_type, context_description, resource_id, context_data) VALUES
('Default Project Context', 'PROJECT', '默认项目权限上下文', 1, '{"project_type": "internal", "security_level": "standard"}'),
('High Security Project', 'PROJECT', '高安全级别项目上下文', NULL, '{"security_level": "high", "requires_approval": true}'),
('Client Project Context', 'PROJECT', '客户项目权限上下文', NULL, '{"project_type": "client", "external_access": true}'),
('Development Environment', 'ENVIRONMENT', '开发环境权限上下文', NULL, '{"environment": "development", "debugging_allowed": true}'),
('Production Environment', 'ENVIRONMENT', '生产环境权限上下文', NULL, '{"environment": "production", "strict_access": true}'),
('Financial Department', 'DEPARTMENT', '财务部门权限上下文', NULL, '{"department": "finance", "sensitive_data": true}'),
('HR Department', 'DEPARTMENT', '人力资源部门权限上下文', NULL, '{"department": "hr", "personal_data": true}'),
('Development Team', 'TEAM', '开发团队权限上下文', NULL, '{"team": "development", "technical_access": true}'),
('Management Level', 'LEVEL', '管理层权限上下文', NULL, '{"level": "management", "strategic_access": true}'),
('Temporary Access', 'TEMPORARY', '临时访问权限上下文', NULL, '{"temporary": true, "max_duration": "24h"}');

-- =============================================================================
-- 3. 权限层级关系数据
-- =============================================================================

-- 创建权限层级关系（父权限包含子权限）
WITH permission_pairs AS (
    SELECT 
        p1.id as parent_id, 
        p2.id as child_id,
        CASE 
            WHEN p1.permission_code LIKE '%.admin%' AND p2.permission_code LIKE REPLACE(p1.permission_code, '.admin', '.%') THEN 'FULL'
            WHEN p1.permission_code LIKE '%.manager%' AND p2.permission_code LIKE REPLACE(p1.permission_code, '.manager', '.%') THEN 'PARTIAL'
            ELSE 'CONDITIONAL'
        END as inheritance_type
    FROM permissions p1, permissions p2
    WHERE p1.permission_code != p2.permission_code
      AND (
        (p1.permission_code = 'system.admin' AND p2.permission_code LIKE 'system.%' AND p2.permission_code != 'system.admin') OR
        (p1.permission_code = 'project.admin' AND p2.permission_code LIKE 'project.%' AND p2.permission_code != 'project.admin') OR
        (p1.permission_code = 'task.manager' AND p2.permission_code LIKE 'task.%' AND p2.permission_code != 'task.manager') OR
        (p1.permission_code = 'company.admin' AND p2.permission_code LIKE 'company.%' AND p2.permission_code != 'company.admin')
      )
    LIMIT 50
)
INSERT INTO permission_hierarchy (parent_permission_id, child_permission_id, inheritance_type, conditions)
SELECT 
    parent_id, 
    child_id, 
    inheritance_type,
    jsonb_build_object(
        'auto_inherit', true,
        'requires_context', false,
        'created_by_seed', true
    )
FROM permission_pairs
ON CONFLICT (parent_permission_id, child_permission_id) DO NOTHING;

-- =============================================================================
-- 4. 动态权限规则数据
-- =============================================================================

-- 创建基于时间的动态权限规则
INSERT INTO dynamic_permission_rules (
    rule_name, 
    rule_description, 
    permission_id, 
    role_id, 
    rule_conditions, 
    rule_expression, 
    priority_order,
    valid_from,
    valid_until
) VALUES
(
    'Business Hours Task Access',
    '工作时间内任务访问权限',
    (SELECT id FROM permissions WHERE permission_code = 'task.update' LIMIT 1),
    (SELECT id FROM company_roles WHERE role_code = 'developer' LIMIT 1),
    '{"time_range": {"start": "09:00", "end": "18:00"}, "days": ["mon", "tue", "wed", "thu", "fri"]}',
    'EXTRACT(hour FROM CURRENT_TIME) BETWEEN 9 AND 18 AND EXTRACT(dow FROM CURRENT_DATE) BETWEEN 1 AND 5',
    10,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP + INTERVAL '1 year'
),
(
    'Weekend Admin Access',
    '周末管理员访问限制',
    (SELECT id FROM permissions WHERE permission_code = 'system.config.update' LIMIT 1),
    (SELECT id FROM company_roles WHERE role_code = 'system_admin' LIMIT 1),
    '{"weekend_restriction": true, "requires_approval": true}',
    'EXTRACT(dow FROM CURRENT_DATE) NOT IN (0, 6) OR EXISTS (SELECT 1 FROM weekend_approvals WHERE user_id = $user_id AND date = CURRENT_DATE)',
    5,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP + INTERVAL '6 months'
),
(
    'High Risk Permission Alert',
    '高风险权限使用告警',
    (SELECT id FROM permissions WHERE permission_code = 'system.users.delete' LIMIT 1),
    NULL, -- 适用于所有角色
    '{"alert_required": true, "log_level": "critical"}',
    'TRUE', -- 始终触发，但需要额外验证
    1,
    CURRENT_TIMESTAMP,
    NULL
);

-- =============================================================================
-- 5. 用户上下文权限数据（示例）
-- =============================================================================

-- 为特定用户在特定上下文中分配权限
INSERT INTO user_context_permissions (
    user_id, 
    permission_id, 
    context_id, 
    is_granted, 
    expires_at,
    granted_by,
    conditions,
    metadata
)
SELECT 
    cu.id,
    p.id,
    pc.id,
    true,
    CURRENT_TIMESTAMP + INTERVAL '3 months',
    1, -- 假设ID为1的用户是系统管理员
    jsonb_build_object(
        'temporary', true,
        'reason', 'Project specific access',
        'approval_required', false
    ),
    jsonb_build_object(
        'granted_for', 'seed_data_demo',
        'auto_revoke', true
    )
FROM company_users cu
CROSS JOIN permissions p
CROSS JOIN permission_contexts pc
WHERE cu.email LIKE '%@example.com'
  AND p.permission_code IN ('task.create', 'task.update', 'task.read')
  AND pc.context_type = 'PROJECT'
  AND pc.context_name = 'Default Project Context'
LIMIT 5; -- 限制数量，避免创建过多测试数据

-- =============================================================================
-- 6. 更新权限缓存（基于新的权限系统）
-- =============================================================================

-- 清空现有缓存
TRUNCATE TABLE permission_cache;

-- 重新生成权限缓存（包含增强的权限数据）
INSERT INTO permission_cache (
    cache_key, 
    company_user_id, 
    permission_code, 
    has_permission, 
    source, 
    context_data,
    expires_at
)
SELECT 
    CONCAT('user:', uep.user_id, ':perm:', uep.permission_code, 
           CASE WHEN uep.context_id IS NOT NULL THEN CONCAT(':ctx:', uep.context_id) ELSE '' END
    ) as cache_key,
    uep.user_id,
    uep.permission_code,
    true,
    uep.permission_source,
    CASE 
        WHEN uep.context_id IS NOT NULL THEN 
            jsonb_build_object('context_id', uep.context_id, 'context_type', 'specific')
        ELSE 
            jsonb_build_object('context_type', 'global')
    END,
    COALESCE(uep.expires_at, CURRENT_TIMESTAMP + INTERVAL '24 hours')
FROM user_effective_permissions uep
WHERE uep.expires_at IS NULL OR uep.expires_at > CURRENT_TIMESTAMP;

-- =============================================================================
-- 7. 创建演示数据的验证和清理脚本
-- =============================================================================

-- 创建种子数据验证视图
CREATE OR REPLACE VIEW seed_data_verification AS
SELECT 
    'Permission Groups' as category,
    COUNT(*) as count,
    'permissions with groups assigned' as description
FROM permissions 
WHERE permission_group IS NOT NULL
UNION ALL
SELECT 
    'Permission Contexts' as category,
    COUNT(*) as count,
    'permission contexts created' as description
FROM permission_contexts
UNION ALL
SELECT 
    'Permission Hierarchies' as category,
    COUNT(*) as count,
    'parent-child permission relationships' as description
FROM permission_hierarchy
UNION ALL
SELECT 
    'Dynamic Rules' as category,
    COUNT(*) as count,
    'dynamic permission rules' as description
FROM dynamic_permission_rules
UNION ALL
SELECT 
    'User Context Permissions' as category,
    COUNT(*) as count,
    'user-specific context permissions' as description
FROM user_context_permissions
UNION ALL
SELECT 
    'Enhanced Cache Entries' as category,
    COUNT(*) as count,
    'permission cache entries with context' as description
FROM permission_cache
WHERE context_data IS NOT NULL;

-- =============================================================================
-- 8. 权限统计和报告数据
-- =============================================================================

-- 生成权限系统增强报告
DO $$
DECLARE
    total_permissions INTEGER;
    grouped_permissions INTEGER;
    hierarchy_count INTEGER;
    dynamic_rules_count INTEGER;
    context_permissions_count INTEGER;
    cache_entries INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_permissions FROM permissions WHERE is_active = true;
    SELECT COUNT(*) INTO grouped_permissions FROM permissions WHERE permission_group IS NOT NULL;
    SELECT COUNT(*) INTO hierarchy_count FROM permission_hierarchy WHERE is_active = true;
    SELECT COUNT(*) INTO dynamic_rules_count FROM dynamic_permission_rules WHERE is_active = true;
    SELECT COUNT(*) INTO context_permissions_count FROM user_context_permissions;
    SELECT COUNT(*) INTO cache_entries FROM permission_cache;
    
    RAISE NOTICE '=== 权限系统增强种子数据初始化完成 ===';
    RAISE NOTICE '权限总数: %', total_permissions;
    RAISE NOTICE '已分组权限数: %', grouped_permissions;
    RAISE NOTICE '权限层级关系数: %', hierarchy_count;
    RAISE NOTICE '动态权限规则数: %', dynamic_rules_count;
    RAISE NOTICE '用户上下文权限数: %', context_permissions_count;
    RAISE NOTICE '增强缓存条目数: %', cache_entries;
    
    IF grouped_permissions > 0 AND hierarchy_count > 0 THEN
        RAISE NOTICE '✅ 权限系统增强功能初始化成功';
    ELSE
        RAISE NOTICE '⚠️  权限系统增强功能可能未完全初始化';
    END IF;
END $$;

COMMIT;