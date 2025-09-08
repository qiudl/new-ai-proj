-- 插入示例企业岗位和角色数据

-- 为企业 1 创建示例岗位
INSERT INTO enterprise_positions (
    enterprise_id, position_code, position_name, position_level,
    department_id, description, responsibilities, requirements,
    max_headcount, is_key_position, approval_required, status, created_by
) VALUES 
-- 高管层岗位
(1, 'CEO', '首席执行官', 1, NULL, 
 '企业最高决策者，负责企业整体战略和经营管理', 
 '制定企业发展战略；领导管理团队；对外代表企业', 
 '具备丰富的管理经验；优秀的领导能力；战略思维能力',
 1, true, true, 'active', 1),

(1, 'CTO', '首席技术官', 1, 4, 
 '企业技术负责人，负责技术战略和技术团队管理', 
 '制定技术发展战略；管理技术团队；推动技术创新', 
 '深厚的技术背景；丰富的技术管理经验；前瞻性技术视野',
 1, true, true, 'active', 1),

(1, 'CFO', '首席财务官', 1, NULL, 
 '企业财务负责人，负责财务战略和风险控制', 
 '制定财务战略；管理财务风险；监督财务运营', 
 '专业财务背景；丰富的财务管理经验；风险控制能力',
 1, true, true, 'active', 1),

-- 中层管理岗位
(1, 'DEPT_MGR_TECH', '技术部经理', 2, 4, 
 '技术部门管理者，负责技术团队日常管理和项目执行', 
 '管理技术团队；协调技术项目；保障技术质量', 
 '技术专业能力；管理经验；沟通协调能力',
 1, false, false, 'active', 1),

(1, 'DEPT_MGR_PRODUCT', '产品部经理', 2, NULL, 
 '产品部门管理者，负责产品规划和产品团队管理', 
 '制定产品策略；管理产品团队；推进产品开发', 
 '产品管理经验；市场敏感度；团队管理能力',
 1, false, false, 'active', 1),

(1, 'DEPT_MGR_SALES', '销售部经理', 2, NULL, 
 '销售部门管理者，负责销售团队管理和销售目标达成', 
 '管理销售团队；制定销售策略；完成销售目标', 
 '销售经验；客户关系管理能力；团队领导能力',
 1, false, false, 'active', 1),

-- 基层岗位
(1, 'SR_DEVELOPER', '高级开发工程师', 3, 4, 
 '负责核心技术开发和技术难题攻关', 
 '参与系统架构设计；开发核心功能；指导初级工程师', 
 '5年以上开发经验；精通主流技术栈；良好的技术功底',
 3, false, false, 'active', 1),

(1, 'DEVELOPER', '开发工程师', 4, 4, 
 '负责软件开发和功能实现', 
 '根据需求开发功能；编写单元测试；参与代码评审', 
 '2年以上开发经验；熟悉开发流程；良好的编程能力',
 5, false, false, 'active', 1),

(1, 'JR_DEVELOPER', '初级开发工程师', 5, 4, 
 '负责简单功能开发和维护工作', 
 '开发简单功能；修复bug；学习新技术', 
 '计算机相关专业；基本编程能力；学习能力强',
 3, false, false, 'active', 1),

(1, 'PRODUCT_MANAGER', '产品经理', 3, NULL, 
 '负责产品规划和需求管理', 
 '分析市场需求；制定产品规划；协调开发资源', 
 '产品管理经验；需求分析能力；项目协调能力',
 2, false, false, 'active', 1);

-- 为企业 2 创建示例岗位
INSERT INTO enterprise_positions (
    enterprise_id, position_code, position_name, position_level,
    description, max_headcount, is_key_position, status, created_by
) VALUES 
(2, 'GM', '总经理', 1, '分公司总经理，负责分公司整体运营', 1, true, 'active', 1),
(2, 'SALES_MGR', '销售经理', 2, '销售团队管理者', 1, false, 'active', 1),
(2, 'SALES_REP', '销售代表', 3, '负责客户开发和维护', 5, false, 'active', 1);

-- 创建企业角色
INSERT INTO enterprise_roles (
    enterprise_id, role_code, role_name, role_description, role_type,
    permissions, role_level, is_default, auto_assign, max_users, created_by
) VALUES 
-- 企业 1 的角色
(1, 'ADMIN', '系统管理员', '拥有系统所有权限的管理员角色', 'system',
 '["user.create", "user.read", "user.update", "user.delete", "role.create", "role.read", "role.update", "role.delete", "project.create", "project.read", "project.update", "project.delete"]'::jsonb,
 1, false, false, 5, 1),

(1, 'EXECUTIVE', '高级管理层', '企业高级管理人员角色', 'custom',
 '["user.read", "role.read", "project.create", "project.read", "project.update", "report.read", "report.export"]'::jsonb,
 2, false, false, 10, 1),

(1, 'MANAGER', '部门经理', '部门管理人员角色', 'custom',
 '["user.read", "project.create", "project.read", "project.update", "task.create", "task.read", "task.update", "task.assign"]'::jsonb,
 3, false, false, 20, 1),

(1, 'DEVELOPER', '开发人员', '软件开发人员角色', 'custom',
 '["project.read", "task.read", "task.update", "code.read", "code.write", "test.run"]'::jsonb,
 4, true, false, 50, 1),

(1, 'EMPLOYEE', '普通员工', '企业普通员工角色', 'custom',
 '["project.read", "task.read", "profile.read", "profile.update"]'::jsonb,
 5, false, true, 100, 1),

-- 企业 2 的角色
(2, 'BRANCH_ADMIN', '分公司管理员', '分公司管理员角色', 'custom',
 '["user.create", "user.read", "user.update", "project.create", "project.read", "project.update", "report.read"]'::jsonb,
 1, false, false, 3, 1),

(2, 'SALES_MANAGER', '销售经理', '销售管理人员角色', 'custom',
 '["user.read", "customer.create", "customer.read", "customer.update", "order.create", "order.read", "order.update"]'::jsonb,
 2, false, false, 5, 1),

(2, 'SALES_REP', '销售代表', '销售人员角色', 'custom',
 '["customer.read", "customer.update", "order.create", "order.read", "order.update", "product.read"]'::jsonb,
 3, true, false, 20, 1);

-- 示例用户岗位分配（假设已有企业用户）
-- 注意：这里的 enterprise_user_id 需要根据实际的企业用户数据调整
INSERT INTO enterprise_user_positions (
    enterprise_user_id, position_id, appointment_type, start_date, appointed_by
)
SELECT 
    eu.id as enterprise_user_id,
    ep.id as position_id,
    'primary' as appointment_type,
    CURRENT_DATE as start_date,
    1 as appointed_by
FROM enterprise_users eu
JOIN enterprise_positions ep ON eu.enterprise_id = ep.enterprise_id
WHERE eu.enterprise_id = 1 
AND eu.is_primary_contact = true
AND ep.position_code = 'CEO'
LIMIT 1;

-- 示例用户角色分配
INSERT INTO enterprise_user_roles (
    enterprise_user_id, role_id, assigned_date, assigned_by
)
SELECT 
    eu.id as enterprise_user_id,
    er.id as role_id,
    CURRENT_DATE as assigned_date,
    1 as assigned_by
FROM enterprise_users eu
JOIN enterprise_roles er ON eu.enterprise_id = er.enterprise_id
WHERE eu.enterprise_id = 1 
AND eu.is_primary_contact = true
AND er.role_code = 'ADMIN'
LIMIT 1;

-- 更新岗位当前人数统计
UPDATE enterprise_positions 
SET current_headcount = (
    SELECT COUNT(*) 
    FROM enterprise_user_positions eup 
    WHERE eup.position_id = enterprise_positions.id 
    AND eup.is_active = true
);

-- 添加注释
COMMENT ON TABLE enterprise_positions IS '企业岗位表 - 包含示例数据';
COMMENT ON TABLE enterprise_roles IS '企业角色表 - 包含示例数据';