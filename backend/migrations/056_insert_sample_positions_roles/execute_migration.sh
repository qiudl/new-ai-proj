#!/bin/bash

# 插入示例岗位和角色数据迁移脚本
# 使用方法: ./execute_migration.sh [up|down]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATION_NAME="056_insert_sample_positions_roles"

# 数据库连接参数
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-ai_project_db}"
DB_USER="${DB_USER:-dev_user}"
DB_PASSWORD="${DB_PASSWORD:-dev_password_2024}"

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 执行SQL文件
execute_sql() {
    local sql_file="$1"
    local description="$2"
    
    if [ ! -f "$sql_file" ]; then
        log_error "SQL文件不存在: $sql_file"
        exit 1
    fi
    
    log_info "执行 $description..."
    
    if PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -f "$sql_file"; then
        log_info "$description 执行成功"
        return 0
    else
        log_error "$description 执行失败"
        return 1
    fi
}

# 检查数据库连接
check_db_connection() {
    log_info "检查数据库连接..."
    if ! PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -c "SELECT 1" >/dev/null 2>&1; then
        log_error "无法连接到数据库"
        exit 1
    fi
    log_info "数据库连接正常"
}

# 执行向上迁移
migrate_up() {
    log_info "开始插入示例数据: $MIGRATION_NAME"
    
    # 检查依赖表是否存在
    local missing_tables=()
    
    log_info "检查依赖表..."
    for table in "enterprise_positions" "enterprise_roles" "enterprise_user_positions" "enterprise_user_roles" "enterprise_users"; do
        if ! PGPASSWORD="$DB_PASSWORD" psql \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            -c "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table'" | grep -q "1"; then
            missing_tables+=("$table")
        fi
    done
    
    if [ ${#missing_tables[@]} -gt 0 ]; then
        log_error "缺少依赖表: ${missing_tables[*]}"
        log_error "请先执行企业岗位和角色管理表的迁移"
        exit 1
    fi
    
    # 检查是否已存在示例数据
    local existing_count
    existing_count=$(PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -t -c "SELECT COUNT(*) FROM enterprise_positions WHERE enterprise_id IN (1, 2);" | xargs)
    
    if [ "$existing_count" -gt 0 ]; then
        log_warn "检测到已存在 $existing_count 条示例数据"
        read -p "是否要清除现有数据并重新插入? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            migrate_down
        else
            log_info "跳过数据插入"
            exit 0
        fi
    fi
    
    execute_sql "$SCRIPT_DIR/up.sql" "示例岗位和角色数据插入"
    
    log_info "示例数据插入完成!"
    
    # 显示插入的数据统计
    log_info "数据统计:"
    PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -c "
        SELECT '企业岗位' as 数据类型, COUNT(*) as 数量 FROM enterprise_positions WHERE enterprise_id IN (1, 2)
        UNION ALL
        SELECT '企业角色' as 数据类型, COUNT(*) as 数量 FROM enterprise_roles WHERE enterprise_id IN (1, 2)
        UNION ALL
        SELECT '岗位分配' as 数据类型, COUNT(*) as 数量 FROM enterprise_user_positions WHERE position_id IN (SELECT id FROM enterprise_positions WHERE enterprise_id IN (1, 2))
        UNION ALL
        SELECT '角色分配' as 数据类型, COUNT(*) as 数量 FROM enterprise_user_roles WHERE role_id IN (SELECT id FROM enterprise_roles WHERE enterprise_id IN (1, 2));
        "
}

# 执行向下迁移
migrate_down() {
    log_warn "开始清除示例数据: $MIGRATION_NAME"
    log_warn "这将删除所有企业1和企业2的岗位角色示例数据!"
    
    if [ "$1" != "auto" ]; then
        read -p "确定要继续吗? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "操作已取消"
            exit 0
        fi
    fi
    
    execute_sql "$SCRIPT_DIR/down.sql" "示例岗位和角色数据清除"
    
    log_warn "示例数据清除完成!"
}

# 显示帮助信息
show_help() {
    cat << EOF
示例岗位和角色数据迁移脚本

使用方法:
    $0 [up|down]

选项:
    up      插入示例数据
    down    清除示例数据

环境变量:
    DB_HOST         数据库主机 (默认: localhost)
    DB_PORT         数据库端口 (默认: 5432)
    DB_NAME         数据库名称 (默认: ai_project_db)
    DB_USER         数据库用户 (默认: dev_user)
    DB_PASSWORD     数据库密码 (默认: dev_password_2024)

示例:
    # 插入示例数据
    $0 up
    
    # 清除示例数据
    $0 down
    
    # 使用自定义数据库参数
    DB_HOST=localhost DB_PORT=5433 $0 up

EOF
}

# 主函数
main() {
    case "${1:-}" in
        "up")
            check_db_connection
            migrate_up
            ;;
        "down")
            check_db_connection
            migrate_down
            ;;
        "help"|"-h"|"--help"|"")
            show_help
            ;;
        *)
            log_error "无效的操作: $1"
            echo
            show_help
            exit 1
            ;;
    esac
}

main "$@"