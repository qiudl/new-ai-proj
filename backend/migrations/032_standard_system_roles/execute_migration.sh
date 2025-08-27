#!/bin/bash

# 标准系统角色迁移执行脚本
# 文件: execute_migration.sh
# 作者: Claude AI (任务#622)
# 创建时间: 2025-08-27

set -e

echo "=== 标准系统角色数据初始化 ==="
echo "开始执行任务#622：创建默认系统角色数据初始化"
echo ""

# 数据库连接配置
DB_HOST="localhost"
DB_PORT="5433"
DB_USER="dev_user"
DB_PASSWORD="dev_password_2024"
DB_NAME="ai_project_db"
DB_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"

echo "数据库连接: $DB_HOST:$DB_PORT/$DB_NAME"
echo ""

# 检查数据库连接
echo "1. 检查数据库连接..."
if ! psql "$DB_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "❌ 数据库连接失败！请检查数据库服务是否正在运行。"
    exit 1
fi
echo "✅ 数据库连接正常"
echo ""

# 检查依赖表是否存在
echo "2. 检查依赖表结构..."
REQUIRED_TABLES=("company_roles" "permissions" "role_permissions")
for table in "${REQUIRED_TABLES[@]}"; do
    if ! psql "$DB_URL" -c "SELECT 1 FROM $table LIMIT 1;" > /dev/null 2>&1; then
        echo "❌ 表 $table 不存在或无法访问！"
        exit 1
    fi
    echo "✅ 表 $table 存在"
done
echo ""

# 备份当前角色数据
echo "3. 备份当前角色数据..."
BACKUP_FILE="system_roles_backup_$(date +%Y%m%d_%H%M%S).sql"
psql "$DB_URL" -c "COPY (SELECT * FROM company_roles WHERE is_system_role = true) TO STDOUT" > "$BACKUP_FILE"
echo "✅ 角色数据已备份到: $BACKUP_FILE"
echo ""

# 执行迁移
echo "4. 执行标准系统角色创建..."
if psql "$DB_URL" -f "001_create_standard_system_roles.sql"; then
    echo "✅ 标准系统角色创建成功！"
else
    echo "❌ 标准系统角色创建失败！"
    echo "可以使用备份文件恢复: $BACKUP_FILE"
    exit 1
fi
echo ""

# 验证结果
echo "5. 验证创建结果..."
./verify_roles.sh

echo ""
echo "=== 任务#622 执行完成 ==="
echo "✅ 标准系统角色数据初始化成功完成！"
echo ""
echo "创建的角色："
echo "- superadmin: 超级管理员 (拥有所有权限)"
echo "- system_admin: 系统管理员 (系统管理权限)"
echo "- system_operator: 系统操作员 (操作和监控权限)"
echo "- system_auditor: 系统审计员 (审计和查看权限)"
echo "- system_support: 系统支持员 (技术支持权限)"  
echo "- system_guest: 系统访客 (基础查看权限)"
echo ""
