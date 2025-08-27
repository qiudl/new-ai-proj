#!/bin/bash

# 角色权限关联表初始化验证脚本
# 文件: verify_role_permission_initialization.sh
# 描述: 验证角色权限关联表初始化是否成功完成
# 作者: Claude AI
# 创建时间: 2025-08-27

echo "=== 角色权限关联表初始化验证 ==="
echo "开始验证时间: $(date)"
echo

# 数据库连接信息
DB_CONTAINER="ai_postgres_master"
DB_USER="dev_user"
DB_NAME="ai_project_db"

# 1. 验证基本表结构
echo "1. 验证RBAC核心表存在..."
TABLES=("permissions" "company_roles" "role_permissions" "company_users" "permission_audit_logs" "permission_cache")

for table in "${TABLES[@]}"; do
    exists=$(docker-compose -f docker-compose.dev.yml exec postgres-master psql -U $DB_USER -d $DB_NAME -tAc "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='$table');")
    if [[ "$exists" == "t" ]]; then
        echo "  ✅ $table 表存在"
    else
        echo "  ❌ $table 表不存在"
    fi
done
echo

# 2. 验证用户角色分配
echo "2. 验证用户角色分配..."
user_stats=$(docker-compose -f docker-compose.dev.yml exec postgres-master psql -U $DB_USER -d $DB_NAME -tAc "
SELECT 
    COUNT(*) as total_users,
    COUNT(role_id) as assigned_users,
    COUNT(*) - COUNT(role_id) as unassigned_users
FROM company_users 
WHERE status = 'active';
")

IFS='|' read -r total assigned unassigned <<< "$user_stats"
echo "  总活跃用户数: $total"
echo "  已分配角色用户数: $assigned"
echo "  未分配角色用户数: $unassigned"

if [[ "$unassigned" -eq 0 ]]; then
    echo "  ✅ 所有活跃用户都已分配角色"
else
    echo "  ⚠️  还有 $unassigned 个用户未分配角色"
fi
echo

# 3. 验证角色权限分配
echo "3. 验证角色权限分配..."
role_perm_stats=$(docker-compose -f docker-compose.dev.yml exec postgres-master psql -U $DB_USER -d $DB_NAME -tAc "
SELECT 
    COUNT(DISTINCT r.id) as roles_with_permissions,
    COUNT(*) as total_role_permissions,
    COUNT(CASE WHEN rp.is_granted = true THEN 1 END) as granted_permissions
FROM company_roles r
JOIN role_permissions rp ON r.id = rp.role_id;
")

IFS='|' read -r roles_with_perms total_perms granted_perms <<< "$role_perm_stats"
echo "  有权限的角色数: $roles_with_perms"
echo "  总权限分配记录: $total_perms"
echo "  已授予的权限数: $granted_perms"

if [[ "$granted_perms" -gt 0 ]]; then
    echo "  ✅ 角色权限分配正常"
else
    echo "  ❌ 角色权限分配异常"
fi
echo

# 4. 验证权限缓存
echo "4. 验证权限缓存..."
cache_count=$(docker-compose -f docker-compose.dev.yml exec postgres-master psql -U $DB_USER -d $DB_NAME -tAc "SELECT COUNT(*) FROM permission_cache WHERE expires_at > CURRENT_TIMESTAMP;")
echo "  有效权限缓存条目数: $cache_count"

if [[ "$cache_count" -gt 0 ]]; then
    echo "  ✅ 权限缓存已初始化"
else
    echo "  ⚠️  权限缓存为空"
fi
echo

# 5. 验证审计日志
echo "5. 验证审计日志..."
audit_count=$(docker-compose -f docker-compose.dev.yml exec postgres-master psql -U $DB_USER -d $DB_NAME -tAc "SELECT COUNT(*) FROM permission_audit_logs WHERE action_type = 'role_assigned';")
echo "  角色分配审计日志条目数: $audit_count"

if [[ "$audit_count" -gt 0 ]]; then
    echo "  ✅ 审计日志已记录"
else
    echo "  ⚠️  审计日志为空"
fi
echo

# 6. 验证权限检查函数
echo "6. 验证权限检查函数..."
function_test=$(docker-compose -f docker-compose.dev.yml exec postgres-master psql -U $DB_USER -d $DB_NAME -tAc "
SELECT check_user_permission(
    (SELECT id FROM company_users WHERE role_id = (SELECT id FROM company_roles WHERE role_code = 'super_admin') LIMIT 1), 
    'system.admin'
);")

if [[ "$function_test" == "t" ]]; then
    echo "  ✅ 权限检查函数正常工作"
else
    echo "  ❌ 权限检查函数异常"
fi
echo

# 7. 验证用户权限视图
echo "7. 验证用户权限视图..."
view_test=$(docker-compose -f docker-compose.dev.yml exec postgres-master psql -U $DB_USER -d $DB_NAME -tAc "SELECT COUNT(*) FROM user_effective_permissions;")
echo "  用户有效权限记录数: $view_test"

if [[ "$view_test" -gt 0 ]]; then
    echo "  ✅ 用户权限视图正常工作"
else
    echo "  ❌ 用户权限视图异常"
fi
echo

# 8. 生成角色权限分布报告
echo "8. 角色权限分布报告..."
echo "角色代码         | 角色名称     | 权限数量"
echo "---------------- | ------------ | --------"
docker-compose -f docker-compose.dev.yml exec postgres-master psql -U $DB_USER -d $DB_NAME -tAc "
SELECT 
    RPAD(r.role_code, 16) || ' | ' || 
    RPAD(r.role_name, 12) || ' | ' || 
    COUNT(rp.permission_id)::text
FROM company_roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id AND rp.is_granted = true
WHERE r.is_system_role = true
GROUP BY r.id, r.role_code, r.role_name
ORDER BY COUNT(rp.permission_id) DESC;
" | head -10
echo

# 总结
echo "=== 验证完成 ==="
echo "完成验证时间: $(date)"
echo

# 最终状态判断
if [[ "$unassigned" -eq 0 && "$granted_perms" -gt 0 && "$cache_count" -gt 0 ]]; then
    echo "🎉 角色权限关联表初始化成功完成！"
    exit 0
else
    echo "⚠️  角色权限关联表初始化可能存在问题，请检查上述详细信息。"
    exit 1
fi
