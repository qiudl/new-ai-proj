-- 删除示例企业岗位和角色数据

-- 删除用户角色分配
DELETE FROM enterprise_user_roles WHERE role_id IN (
    SELECT id FROM enterprise_roles WHERE enterprise_id IN (1, 2)
);

-- 删除用户岗位分配
DELETE FROM enterprise_user_positions WHERE position_id IN (
    SELECT id FROM enterprise_positions WHERE enterprise_id IN (1, 2)
);

-- 删除企业角色
DELETE FROM enterprise_roles WHERE enterprise_id IN (1, 2);

-- 删除企业岗位
DELETE FROM enterprise_positions WHERE enterprise_id IN (1, 2);