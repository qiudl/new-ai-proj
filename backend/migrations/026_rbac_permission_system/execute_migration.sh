#!/bin/bash
# RBAC权限系统数据库迁移执行脚本
# 文件: execute_migration.sh
# 描述: 按顺序执行RBAC权限管理系统的数据库迁移
# 作者: Claude AI
# 创建时间: 2025-08-26

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 获取数据库连接信息
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-ai_project}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD}

# 检查是否提供了数据库密码
if [ -z "$DB_PASSWORD" ]; then
    log_error "请设置数据库密码环境变量: export DB_PASSWORD=your_password"
    exit 1
fi

# 数据库连接字符串
DB_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=disable"

# 迁移文件目录
MIGRATION_DIR="./026_rbac_permission_system"

# 检查迁移目录是否存在
if [ ! -d "$MIGRATION_DIR" ]; then
    log_error "迁移目录不存在: $MIGRATION_DIR"
    exit 1
fi

# 迁移文件列表（按执行顺序）
MIGRATION_FILES=(
    "001_create_tables.sql"
    "002_seed_data.sql"
    "003_create_roles.sql"
    "004_remaining_roles.sql"
)

log_info "开始执行RBAC权限系统数据库迁移..."
log_info "数据库: $DB_HOST:$DB_PORT/$DB_NAME"
log_info "用户: $DB_USER"

# 检查数据库连接
log_info "检查数据库连接..."
if ! psql "$DB_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    log_error "无法连接到数据库，请检查连接配置"
    exit 1
fi
log_success "数据库连接正常"

# 创建迁移记录表（如果不存在）
log_info "创建迁移记录表..."
psql "$DB_URL" -c "
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL UNIQUE,
    executed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(64),
    execution_time_ms INTEGER
);" > /dev/null 2>&1
log_success "迁移记录表已准备"

# 执行迁移文件
for migration_file in "${MIGRATION_FILES[@]}"; do
    migration_path="$MIGRATION_DIR/$migration_file"
    
    # 检查文件是否存在
    if [ ! -f "$migration_path" ]; then
        log_error "迁移文件不存在: $migration_path"
        exit 1
    fi
    
    # 检查迁移是否已执行
    if psql "$DB_URL" -t -c "SELECT 1 FROM schema_migrations WHERE migration_name = '$migration_file';" | grep -q 1; then
        log_warning "迁移 $migration_file 已执行，跳过"
        continue
    fi
    
    log_info "执行迁移: $migration_file"
    
    # 计算文件校验和
    if command -v md5sum > /dev/null 2>&1; then
        checksum=$(md5sum "$migration_path" | cut -d' ' -f1)
    elif command -v md5 > /dev/null 2>&1; then
        checksum=$(md5 -q "$migration_path")
    else
        checksum="unknown"
    fi
    
    # 记录开始时间
    start_time=$(date +%s%3N)
    
    # 执行迁移
    if psql "$DB_URL" -f "$migration_path" > /dev/null 2>&1; then
        # 记录结束时间
        end_time=$(date +%s%3N)
        execution_time=$((end_time - start_time))
        
        # 记录迁移执行信息
        psql "$DB_URL" -c "
        INSERT INTO schema_migrations (migration_name, checksum, execution_time_ms) 
        VALUES ('$migration_file', '$checksum', $execution_time);" > /dev/null 2>&1
        
        log_success "迁移 $migration_file 执行成功 (${execution_time}ms)"
    else
        log_error "迁移 $migration_file 执行失败"
        exit 1
    fi
done

# 验证迁移结果
log_info "验证迁移结果..."

# 检查表是否创建成功
EXPECTED_TABLES=(
    "permissions"
    "company_roles" 
    "role_permissions"
    "company_users"
    "company_user_project_permissions"
    "permission_audit_logs"
    "permission_cache"
)

for table in "${EXPECTED_TABLES[@]}"; do
    if psql "$DB_URL" -t -c "SELECT 1 FROM information_schema.tables WHERE table_name = '$table';" | grep -q 1; then
        log_success "表 $table 创建成功"
    else
        log_error "表 $table 未找到"
        exit 1
    fi
done

# 检查数据是否插入成功
log_info "检查基础数据..."

# 检查权限数量
permission_count=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM permissions;" | tr -d ' ')
log_info "权限数量: $permission_count"

# 检查角色数量
role_count=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM company_roles;" | tr -d ' ')
log_info "角色数量: $role_count"

# 检查角色权限关联数量
role_permission_count=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM role_permissions;" | tr -d ' ')
log_info "角色权限关联数量: $role_permission_count"

# 显示超级管理员信息
log_info "超级管理员角色信息:"
psql "$DB_URL" -c "
SELECT 
    r.role_code, 
    r.role_name, 
    COUNT(rp.permission_id) as permission_count
FROM company_roles r 
LEFT JOIN role_permissions rp ON r.id = rp.role_id 
WHERE r.role_code = 'super_admin' 
GROUP BY r.id, r.role_code, r.role_name;"

# 检查视图是否创建成功
EXPECTED_VIEWS=(
    "v_user_permissions"
    "v_role_permissions" 
    "v_project_user_permissions"
)

log_info "检查视图创建..."
for view in "${EXPECTED_VIEWS[@]}"; do
    if psql "$DB_URL" -t -c "SELECT 1 FROM information_schema.views WHERE table_name = '$view';" | grep -q 1; then
        log_success "视图 $view 创建成功"
    else
        log_warning "视图 $view 未找到"
    fi
done

log_success "RBAC权限系统数据库迁移完成！"
log_info "迁移摘要:"
log_info "- 权限数量: $permission_count"
log_info "- 角色数量: $role_count" 
log_info "- 权限关联: $role_permission_count"
log_info ""
log_info "下一步操作："
log_info "1. 更新应用程序代码以使用新的权限系统"
log_info "2. 配置Redis缓存以优化权限查询性能"
log_info "3. 测试权限验证功能"
log_info "4. 根据实际业务需求调整角色和权限配置"
