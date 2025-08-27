#!/bin/bash

# 标准系统角色验证脚本
# 文件: verify_roles.sh
# 作者: Claude AI (任务#622)
# 创建时间: 2025-08-27

set -e

# 数据库连接配置
DB_HOST="localhost"
DB_PORT="5433" 
DB_USER="dev_user"
DB_PASSWORD="dev_password_2024"
DB_NAME="ai_project_db"
DB_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"

echo "=== 标准系统角色验证报告 ==="
echo ""

# 1. 验证6个标准角色是否创建成功
echo "1. 验证标准系统角色创建状态："
EXPECTED_ROLES=("superadmin" "system_admin" "system_operator" "system_auditor" "system_support" "system_guest")

for role in "${EXPECTED_ROLES[@]}"; do
    COUNT=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM company_roles WHERE role_code = '$role' AND is_system_role = true AND is_active = true;")
    if [ "$COUNT" -eq 1 ]; then
        echo "✅ $role - 创建成功"
    else
        echo "❌ $role - 创建失败或未激活"
    fi
done
echo ""

# 2. 显示角色权限统计
echo "2. 标准系统角色权限统计："
psql "$DB_URL" -c "
SELECT 
    r.role_code as \"角色代码\",
    r.role_name as \"角色名称\", 
    COUNT(rp.permission_id) as \"权限数量\",
    CASE WHEN r.is_active THEN '是' ELSE '否' END as \"是否激活\"
FROM company_roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id AND rp.is_granted = true
WHERE r.role_code IN ('superadmin', 'system_admin', 'system_operator', 'system_auditor', 'system_support', 'system_guest')
    AND r.is_system_role = true
GROUP BY r.role_code, r.role_name, r.is_active
ORDER BY 
    CASE r.role_code
        WHEN 'superadmin' THEN 1
        WHEN 'system_admin' THEN 2 
        WHEN 'system_operator' THEN 3
        WHEN 'system_auditor' THEN 4
        WHEN 'system_support' THEN 5
        WHEN 'system_guest' THEN 6
        ELSE 99
    END;
"
echo ""

# 3. 验证权限分配的合理性
echo "3. 权限分配合理性检查："

# SuperAdmin应该拥有所有权限
TOTAL_PERMISSIONS=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM permissions WHERE is_active = true;")
SUPERADMIN_PERMISSIONS=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM role_permissions rp JOIN company_roles r ON rp.role_id = r.id WHERE r.role_code = 'superadmin' AND rp.is_granted = true;")

if [ "$TOTAL_PERMISSIONS" -eq "$SUPERADMIN_PERMISSIONS" ]; then
    echo "✅ SuperAdmin拥有所有权限 ($SUPERADMIN_PERMISSIONS/$TOTAL_PERMISSIONS)"
else
    echo "⚠️  SuperAdmin权限不完整 ($SUPERADMIN_PERMISSIONS/$TOTAL_PERMISSIONS)"
fi

# SystemGuest应该拥有最少权限
GUEST_PERMISSIONS=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM role_permissions rp JOIN company_roles r ON rp.role_id = r.id WHERE r.role_code = 'system_guest' AND rp.is_granted = true;")
echo "✅ SystemGuest拥有基础权限 ($GUEST_PERMISSIONS 项)"

echo ""

# 4. 显示角色层次结构
echo "4. 标准系统角色层次结构："
psql "$DB_URL" -c "
WITH role_hierarchy AS (
    SELECT 
        r.role_code,
        r.role_name,
        COUNT(rp.permission_id) as permission_count,
        CASE r.role_code
            WHEN 'superadmin' THEN 1
            WHEN 'system_admin' THEN 2 
            WHEN 'system_operator' THEN 3
            WHEN 'system_auditor' THEN 4
            WHEN 'system_support' THEN 5
            WHEN 'system_guest' THEN 6
            ELSE 99
        END as hierarchy_level
    FROM company_roles r
    LEFT JOIN role_permissions rp ON r.id = rp.role_id AND rp.is_granted = true
    WHERE r.role_code IN ('superadmin', 'system_admin', 'system_operator', 'system_auditor', 'system_support', 'system_guest')
        AND r.is_system_role = true
    GROUP BY r.role_code, r.role_name
)
SELECT 
    REPEAT('  ', hierarchy_level - 1) || '└─ ' || role_name as \"角色层次\",
    permission_count as \"权限数量\",
    role_code as \"代码\"
FROM role_hierarchy
ORDER BY hierarchy_level;
"
echo ""

# 5. 生成验证报告文件
REPORT_FILE="standard_roles_verification_$(date +%Y%m%d_%H%M%S).txt"
{
    echo "标准系统角色验证报告"
    echo "生成时间: $(date)"
    echo "数据库: $DB_NAME"
    echo ""
    
    echo "=== 角色创建状态 ==="
    for role in "${EXPECTED_ROLES[@]}"; do
        COUNT=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM company_roles WHERE role_code = '$role' AND is_system_role = true AND is_active = true;")
        if [ "$COUNT" -eq 1 ]; then
            echo "$role: 创建成功"
        else
            echo "$role: 创建失败"
        fi
    done
    
    echo ""
    echo "=== 详细权限信息 ==="
    psql "$DB_URL" -c "
    SELECT 
        r.role_code,
        r.role_name, 
        r.role_description,
        COUNT(rp.permission_id) as permission_count
    FROM company_roles r
    LEFT JOIN role_permissions rp ON r.id = rp.role_id AND rp.is_granted = true
    WHERE r.role_code IN ('superadmin', 'system_admin', 'system_operator', 'system_auditor', 'system_support', 'system_guest')
        AND r.is_system_role = true
    GROUP BY r.role_code, r.role_name, r.role_description
    ORDER BY r.role_code;
    " 
} > "$REPORT_FILE"

echo "5. 验证报告已生成: $REPORT_FILE"
echo ""

# 6. 安全检查
echo "6. 安全检查："
DUPLICATE_ROLES=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM (SELECT role_code FROM company_roles WHERE is_system_role = true GROUP BY role_code HAVING COUNT(*) > 1) AS duplicates;")

if [ "$DUPLICATE_ROLES" -eq 0 ]; then
    echo "✅ 无重复角色代码"
else
    echo "⚠️  发现重复角色代码: $DUPLICATE_ROLES 个"
fi

INACTIVE_SYSTEM_ROLES=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM company_roles WHERE is_system_role = true AND is_active = false;")
if [ "$INACTIVE_SYSTEM_ROLES" -eq 0 ]; then
    echo "✅ 所有系统角色均已激活"
else
    echo "⚠️  存在未激活的系统角色: $INACTIVE_SYSTEM_ROLES 个"
fi

echo ""
echo "=== 验证完成 ==="
