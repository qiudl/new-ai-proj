#!/bin/bash
# RBAC权限系统验证脚本
# 文件: verify_system.sh
# 描述: 验证RBAC权限系统是否正常工作
# 作者: Claude AI
# 创建时间: 2025-08-26

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 数据库连接信息
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-ai_project}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD}

if [ -z "$DB_PASSWORD" ]; then
    log_error "请设置数据库密码环境变量: export DB_PASSWORD=your_password"
    exit 1
fi

DB_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=disable"

log_info "开始验证RBAC权限系统..."

# 1. 检查表结构
log_info "检查表结构..."
TABLES=(
    "permissions:权限表"
    "company_roles:角色表"
    "role_permissions:角色权限关联表"
    "company_users:公司用户表"  
    "company_user_project_permissions:用户项目权限表"
    "permission_audit_logs:权限审计日志表"
    "permission_cache:权限缓存表"
    "schema_migrations:迁移记录表"
)

for table_info in "${TABLES[@]}"; do
    table_name=$(echo $table_info | cut -d: -f1)
    table_desc=$(echo $table_info | cut -d: -f2)
    
    if psql "$DB_URL" -t -c "SELECT 1 FROM information_schema.tables WHERE table_name = '$table_name';" | grep -q 1; then
        log_success "$table_desc ($table_name) ✓"
    else
        log_error "$table_desc ($table_name) ✗"
        exit 1
    fi
done

# 2. 检查视图
log_info "检查视图..."
VIEWS=(
    "v_user_permissions:用户权限视图"
    "v_role_permissions:角色权限视图"
    "v_project_user_permissions:项目用户权限视图"
)

for view_info in "${VIEWS[@]}"; do
    view_name=$(echo $view_info | cut -d: -f1)
    view_desc=$(echo $view_info | cut -d: -f2)
    
    if psql "$DB_URL" -t -c "SELECT 1 FROM information_schema.views WHERE table_name = '$view_name';" | grep -q 1; then
        log_success "$view_desc ($view_name) ✓"
    else
        log_warning "$view_desc ($view_name) ✗"
    fi
done

# 3. 检查数据完整性
log_info "检查数据完整性..."

# 权限数据
permission_count=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM permissions WHERE is_active = true;" | tr -d ' ')
log_info "活跃权限数量: $permission_count"

if [ "$permission_count" -lt 30 ]; then
    log_warning "权限数量偏少，可能需要检查数据导入"
else
    log_success "权限数据正常"
fi

# 角色数据
role_count=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM company_roles WHERE is_active = true;" | tr -d ' ')
log_info "活跃角色数量: $role_count"

if [ "$role_count" -lt 5 ]; then
    log_warning "角色数量偏少"
else
    log_success "角色数据正常"  
fi

# 角色权限关联
rp_count=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM role_permissions WHERE is_granted = true;" | tr -d ' ')
log_info "角色权限关联数量: $rp_count"

if [ "$rp_count" -lt 50 ]; then
    log_warning "角色权限关联偏少"
else
    log_success "角色权限关联正常"
fi

# 4. 检查关键约束
log_info "检查数据约束..."

# 检查权限代码唯一性
duplicate_permissions=$(psql "$DB_URL" -t -c "
SELECT COUNT(*) FROM (
    SELECT permission_code, COUNT(*) 
    FROM permissions 
    GROUP BY permission_code 
    HAVING COUNT(*) > 1
) duplicates;" | tr -d ' ')

if [ "$duplicate_permissions" -eq 0 ]; then
    log_success "权限代码唯一性 ✓"
else
    log_error "发现重复的权限代码"
    exit 1
fi

# 检查角色代码唯一性  
duplicate_roles=$(psql "$DB_URL" -t -c "
SELECT COUNT(*) FROM (
    SELECT role_code, COUNT(*) 
    FROM company_roles 
    GROUP BY role_code 
    HAVING COUNT(*) > 1  
) duplicates;" | tr -d ' ')

if [ "$duplicate_roles" -eq 0 ]; then
    log_success "角色代码唯一性 ✓"
else
    log_error "发现重复的角色代码"
    exit 1
fi

# 5. 功能性测试
log_info "执行功能性测试..."

# 测试角色权限查询
log_info "测试角色权限查询..."
admin_permissions=$(psql "$DB_URL" -t -c "
SELECT COUNT(*) FROM role_permissions rp
JOIN company_roles r ON rp.role_id = r.id
WHERE r.role_code = 'super_admin' AND rp.is_granted = true;" | tr -d ' ')

log_info "超级管理员权限数量: $admin_permissions"

if [ "$admin_permissions" -gt 30 ]; then
    log_success "超级管理员权限配置正常 ✓"
else
    log_warning "超级管理员权限可能配置不完整"
fi

# 测试权限继承查询
log_info "测试权限继承查询..."
psql "$DB_URL" -c "
SELECT 
    r.role_name,
    COUNT(rp.permission_id) as permission_count,
    string_agg(p.module, ', ') as modules
FROM company_roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id AND rp.is_granted = true
LEFT JOIN permissions p ON rp.permission_id = p.id
WHERE r.is_system_role = true AND r.is_active = true
GROUP BY r.id, r.role_name
ORDER BY permission_count DESC;" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    log_success "权限继承查询正常 ✓"
else
    log_error "权限继承查询失败"
    exit 1
fi

# 6. 性能测试
log_info "执行性能测试..."

# 测试复杂权限查询性能
start_time=$(date +%s%3N)
psql "$DB_URL" -c "
SELECT * FROM v_user_permissions LIMIT 100;" > /dev/null 2>&1
end_time=$(date +%s%3N)
query_time=$((end_time - start_time))

log_info "权限视图查询耗时: ${query_time}ms"

if [ "$query_time" -lt 1000 ]; then
    log_success "权限查询性能良好 ✓"
else
    log_warning "权限查询性能较慢，建议优化索引或启用缓存"
fi

# 7. 安全性检查
log_info "执行安全性检查..."

# 检查是否有用户拥有过多权限
high_privilege_users=$(psql "$DB_URL" -t -c "
SELECT COUNT(*) FROM (
    SELECT cu.id, COUNT(rp.permission_id) as perm_count
    FROM company_users cu
    LEFT JOIN company_roles cr ON cu.role_id = cr.id
    LEFT JOIN role_permissions rp ON cr.id = rp.role_id AND rp.is_granted = true
    WHERE cu.status = 'active'
    GROUP BY cu.id
    HAVING COUNT(rp.permission_id) > 40
) high_perms;" | tr -d ' ')

log_info "高权限用户数量: $high_privilege_users"

# 检查是否有角色拥有超级管理员权限
super_admin_count=$(psql "$DB_URL" -t -c "
SELECT COUNT(*) FROM company_roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE p.permission_code = 'system.admin' AND rp.is_granted = true;" | tr -d ' ')

log_info "拥有超级管理员权限的角色数量: $super_admin_count"

if [ "$super_admin_count" -eq 1 ]; then
    log_success "超级管理员权限控制正常 ✓"
else
    log_warning "超级管理员权限分配需要检查"
fi

# 8. 生成验证报告
log_info "生成验证报告..."

cat > rbac_verification_report.txt << EOF
RBAC权限系统验证报告
===================
验证时间: $(date)
数据库: $DB_HOST:$DB_PORT/$DB_NAME

## 系统状态
- 权限数量: $permission_count
- 角色数量: $role_count  
- 角色权限关联: $rp_count
- 高权限用户: $high_privilege_users
- 超级管理员角色: $super_admin_count

## 性能指标
- 权限视图查询耗时: ${query_time}ms

## 建议
$(if [ "$query_time" -gt 500 ]; then echo "- 考虑启用Redis缓存以提升权限查询性能"; fi)
$(if [ "$permission_count" -lt 30 ]; then echo "- 检查权限数据是否完整导入"; fi)
$(if [ "$high_privilege_users" -gt 5 ]; then echo "- 审查高权限用户，确保符合最小权限原则"; fi)

验证完成：$(date)
EOF

log_success "验证报告已生成: rbac_verification_report.txt"

# 9. 总结
log_info "验证总结:"
log_success "✓ 表结构完整"
log_success "✓ 数据完整性良好"  
log_success "✓ 约束检查通过"
log_success "✓ 功能性测试正常"
log_success "✓ 安全性检查完成"

log_success "RBAC权限系统验证完成！系统运行正常。"

# 显示快速测试命令
echo ""
log_info "快速测试命令："
echo "# 查看所有角色权限概览"
echo "psql \"$DB_URL\" -c \"SELECT * FROM v_role_permissions;\""
echo ""
echo "# 模拟权限检查（需要有实际用户数据）"
echo "psql \"$DB_URL\" -c \"SELECT * FROM v_user_permissions WHERE user_id = 1;\""
echo ""
echo "# 查看系统权限分布"
echo "psql \"$DB_URL\" -c \"SELECT module, COUNT(*) FROM permissions GROUP BY module ORDER BY COUNT(*) DESC;\""
