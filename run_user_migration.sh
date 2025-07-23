#!/bin/bash

# User Type Migration Execution Script
# 用户类型系统迁移执行脚本

set -e  # 遇到错误时停止执行

# 配置数据库连接信息
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-ai_project_management}"
DB_USER="${DB_USER:-postgres}"

# 迁移文件路径
MIGRATION_FILE="./migrations/008_user_type_system_migration.sql"
ROLLBACK_FILE="./migrations/008_rollback_user_type_system.sql"

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

# 检查数据库连接
check_database_connection() {
    log_info "检查数据库连接..."
    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &>/dev/null; then
        log_error "无法连接到数据库 $DB_NAME"
        log_error "请检查数据库配置: host=$DB_HOST, port=$DB_PORT, user=$DB_USER"
        exit 1
    fi
    log_success "数据库连接正常"
}

# 备份当前数据库结构
backup_database_schema() {
    log_info "备份数据库结构..."
    backup_file="./backups/schema_backup_$(date +%Y%m%d_%H%M%S).sql"
    mkdir -p ./backups
    
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --schema-only > "$backup_file"; then
        log_success "数据库结构已备份到: $backup_file"
    else
        log_error "数据库结构备份失败"
        exit 1
    fi
}

# 检查现有数据
check_existing_data() {
    log_info "检查现有用户数据..."
    
    # 检查用户总数
    user_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users;")
    log_info "现有用户总数: $user_count"
    
    # 检查角色分布
    log_info "现有角色分布:"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT role, COUNT(*) as count 
        FROM users 
        GROUP BY role 
        ORDER BY role;
    "
    
    # 检查是否已经有用户类型字段
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT COUNT(*) 
        FROM information_schema.columns 
        WHERE table_name='users' AND column_name='user_type';" | grep -q "1"; then
        log_warning "用户表中已存在 user_type 字段，可能已经执行过此迁移"
        read -p "是否继续执行？(y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "迁移已取消"
            exit 0
        fi
    fi
}

# 执行迁移
execute_migration() {
    log_info "开始执行用户类型系统迁移..."
    
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_FILE"; then
        log_success "迁移执行完成！"
        
        # 显示迁移结果
        log_info "迁移结果统计:"
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
            SELECT 
                user_type,
                role,
                COUNT(*) as count
            FROM users 
            GROUP BY user_type, role
            ORDER BY user_type, role;
        "
        
    else
        log_error "迁移执行失败！"
        exit 1
    fi
}

# 验证迁移结果
verify_migration() {
    log_info "验证迁移结果..."
    
    # 检查新字段是否存在
    log_info "检查新增字段..."
    fields_check=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT COUNT(*) 
        FROM information_schema.columns 
        WHERE table_name='users' AND column_name IN ('user_type', 'company_id', 'company_user_id');
    ")
    
    if [ "$fields_check" -eq "3" ]; then
        log_success "新字段添加成功"
    else
        log_error "新字段添加失败"
        exit 1
    fi
    
    # 检查约束是否存在
    log_info "检查约束创建..."
    constraints_check=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT COUNT(*) 
        FROM information_schema.table_constraints 
        WHERE table_name='users' AND constraint_name IN ('users_type_check', 'users_role_type_check');
    ")
    
    if [ "$constraints_check" -eq "2" ]; then
        log_success "约束创建成功"
    else
        log_warning "部分约束可能创建失败"
    fi
    
    # 检查权限函数是否存在
    log_info "检查权限函数..."
    functions_check=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT COUNT(*) 
        FROM information_schema.routines 
        WHERE routine_name IN ('check_user_company_access', 'check_user_project_access');
    ")
    
    if [ "$functions_check" -eq "2" ]; then
        log_success "权限函数创建成功"
    else
        log_warning "权限函数可能创建失败"
    fi
}

# 执行回滚
execute_rollback() {
    log_warning "开始执行回滚操作..."
    read -p "确定要回滚用户类型系统更改吗？这将删除所有相关的新字段和功能 (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "回滚已取消"
        exit 0
    fi
    
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$ROLLBACK_FILE"; then
        log_success "回滚执行完成！"
    else
        log_error "回滚执行失败！"
        exit 1
    fi
}

# 显示帮助信息
show_help() {
    echo "用户类型系统迁移脚本"
    echo
    echo "用法: $0 [选项]"
    echo
    echo "选项:"
    echo "  migrate     执行迁移"
    echo "  rollback    执行回滚"
    echo "  check       检查当前状态"
    echo "  backup      仅备份数据库"
    echo "  help        显示此帮助信息"
    echo
    echo "环境变量:"
    echo "  DB_HOST     数据库主机 (默认: localhost)"
    echo "  DB_PORT     数据库端口 (默认: 5432)"
    echo "  DB_NAME     数据库名称 (默认: ai_project_management)"
    echo "  DB_USER     数据库用户 (默认: postgres)"
    echo
    echo "示例:"
    echo "  $0 migrate              # 执行迁移"
    echo "  $0 rollback             # 执行回滚"
    echo "  DB_NAME=mydb $0 migrate # 使用指定数据库执行迁移"
}

# 主函数
main() {
    case "${1:-}" in
        "migrate")
            log_info "=== 开始用户类型系统迁移 ==="
            check_database_connection
            backup_database_schema
            check_existing_data
            execute_migration
            verify_migration
            log_success "=== 迁移流程完成 ==="
            ;;
        "rollback")
            log_info "=== 开始回滚用户类型系统 ==="
            check_database_connection
            execute_rollback
            log_success "=== 回滚流程完成 ==="
            ;;
        "check")
            log_info "=== 检查当前状态 ==="
            check_database_connection
            check_existing_data
            ;;
        "backup")
            log_info "=== 备份数据库结构 ==="
            check_database_connection
            backup_database_schema
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        "")
            log_error "请指定操作类型"
            show_help
            exit 1
            ;;
        *)
            log_error "未知操作: $1"
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
