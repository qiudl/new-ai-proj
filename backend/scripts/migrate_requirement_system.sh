#!/bin/bash

# ================================================
# 需求管理系统数据库迁移执行脚本
# ================================================
# 版本: 1.0.0
# 作者: AI Project Team
# 日期: 2025-11-06
# 用途: 在生产环境执行需求管理系统的数据库迁移
# ================================================

set -e  # 遇到错误立即退出
set -u  # 使用未定义变量时报错

# ================================================
# 颜色定义
# ================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ================================================
# 配置变量
# ================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MIGRATIONS_DIR="$PROJECT_ROOT/migrations/production"
BACKUP_DIR="$PROJECT_ROOT/backups/migrations"
LOG_DIR="$PROJECT_ROOT/logs/migrations"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 数据库配置（可通过环境变量覆盖）
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-ai_project_db}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-}"

# 迁移脚本文件
MIGRATION_UP="$MIGRATIONS_DIR/001_requirement_system_migration_up.sql"
MIGRATION_DOWN="$MIGRATIONS_DIR/001_requirement_system_migration_down.sql"

# 日志文件
LOG_FILE="$LOG_DIR/migration_$TIMESTAMP.log"
ERROR_LOG="$LOG_DIR/migration_error_$TIMESTAMP.log"

# ================================================
# 辅助函数
# ================================================

# 打印信息
info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

# 打印成功信息
success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

# 打印警告信息
warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# 打印错误信息
error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE" "$ERROR_LOG"
}

# 检查命令是否存在
check_command() {
    if ! command -v "$1" &> /dev/null; then
        error "Required command '$1' not found. Please install it first."
        exit 1
    fi
}

# 检查文件是否存在
check_file() {
    if [ ! -f "$1" ]; then
        error "Required file not found: $1"
        exit 1
    fi
}

# 创建目录
ensure_dir() {
    if [ ! -d "$1" ]; then
        mkdir -p "$1"
        info "Created directory: $1"
    fi
}

# 测试数据库连接
test_db_connection() {
    info "Testing database connection..."

    if [ -n "$DB_PASSWORD" ]; then
        export PGPASSWORD="$DB_PASSWORD"
    fi

    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c '\q' 2>/dev/null; then
        success "Database connection successful"
        return 0
    else
        error "Failed to connect to database"
        error "Host: $DB_HOST, Port: $DB_PORT, Database: $DB_NAME, User: $DB_USER"
        return 1
    fi
}

# 检查表是否存在
check_table_exists() {
    local table_name=$1

    if [ -n "$DB_PASSWORD" ]; then
        export PGPASSWORD="$DB_PASSWORD"
    fi

    local result=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table_name');" 2>/dev/null | tr -d ' ')

    if [ "$result" = "t" ]; then
        return 0
    else
        return 1
    fi
}

# 创建备份
create_backup() {
    info "Creating database backup..."

    ensure_dir "$BACKUP_DIR"

    local backup_file="$BACKUP_DIR/pre_migration_backup_$TIMESTAMP.sql"

    if [ -n "$DB_PASSWORD" ]; then
        export PGPASSWORD="$DB_PASSWORD"
    fi

    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --no-owner --no-acl --format=plain > "$backup_file" 2>"$ERROR_LOG"; then
        success "Backup created: $backup_file"

        # 压缩备份
        gzip "$backup_file"
        success "Backup compressed: ${backup_file}.gz"

        echo "$backup_file.gz"
        return 0
    else
        error "Failed to create backup"
        cat "$ERROR_LOG"
        return 1
    fi
}

# 执行SQL文件
execute_sql_file() {
    local sql_file=$1
    local description=$2

    info "$description"
    info "Executing: $sql_file"

    if [ -n "$DB_PASSWORD" ]; then
        export PGPASSWORD="$DB_PASSWORD"
    fi

    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -f "$sql_file" >> "$LOG_FILE" 2>&1; then
        success "$description completed"
        return 0
    else
        error "$description failed"
        tail -20 "$LOG_FILE"
        return 1
    fi
}

# 验证迁移结果
verify_migration() {
    info "Verifying migration..."

    local tables=("requirements" "requirement_comments" "requirement_history" "requirement_tasks")
    local all_exists=true

    for table in "${tables[@]}"; do
        if check_table_exists "$table"; then
            success "✓ Table '$table' exists"
        else
            error "✗ Table '$table' does not exist"
            all_exists=false
        fi
    done

    if [ "$all_exists" = true ]; then
        success "All required tables exist"
        return 0
    else
        error "Some tables are missing"
        return 1
    fi
}

# 显示使用说明
show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Options:
    up              Execute migration (create tables)
    down            Rollback migration (drop tables)
    verify          Verify migration status
    backup          Create database backup only
    help            Show this help message

Environment Variables:
    DB_HOST         Database host (default: localhost)
    DB_PORT         Database port (default: 5432)
    DB_NAME         Database name (default: ai_project_db)
    DB_USER         Database user (default: postgres)
    DB_PASSWORD     Database password

Examples:
    # Execute migration
    $ ./migrate_requirement_system.sh up

    # Rollback migration
    $ ./migrate_requirement_system.sh down

    # With custom database
    $ DB_HOST=prod-db.example.com DB_NAME=prod_db ./migrate_requirement_system.sh up

    # Create backup only
    $ ./migrate_requirement_system.sh backup

EOF
}

# ================================================
# 主要功能函数
# ================================================

# 执行迁移（向上）
migrate_up() {
    echo ""
    echo "========================================"
    echo "  Requirement System Migration UP"
    echo "========================================"
    echo ""

    # 检查依赖
    check_command psql
    check_command pg_dump
    check_command gzip
    check_file "$MIGRATION_UP"

    # 创建必要的目录
    ensure_dir "$BACKUP_DIR"
    ensure_dir "$LOG_DIR"

    # 测试数据库连接
    if ! test_db_connection; then
        exit 1
    fi

    # 检查是否已经迁移
    if check_table_exists "requirements"; then
        warning "Requirements table already exists!"
        read -p "Do you want to continue anyway? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            info "Migration cancelled by user"
            exit 0
        fi
    fi

    # 创建备份
    if ! backup_file=$(create_backup); then
        error "Backup failed. Migration aborted."
        exit 1
    fi

    # 确认执行
    warning "This will modify the production database: $DB_NAME@$DB_HOST"
    warning "Backup created at: $backup_file"
    read -p "Proceed with migration? (yes/no): " confirm

    if [ "$confirm" != "yes" ]; then
        info "Migration cancelled by user"
        exit 0
    fi

    # 执行迁移
    if execute_sql_file "$MIGRATION_UP" "Executing migration"; then
        success "Migration completed successfully!"

        # 验证迁移
        if verify_migration; then
            success "Migration verification passed"
        else
            error "Migration verification failed"
            exit 1
        fi
    else
        error "Migration failed. Please check logs: $LOG_FILE"
        warning "You can restore from backup: $backup_file"
        exit 1
    fi

    echo ""
    success "========================================
    success "All operations completed successfully!
    success "========================================"
    echo ""
    info "Log file: $LOG_FILE"
    info "Backup file: $backup_file"
}

# 执行回滚（向下）
migrate_down() {
    echo ""
    echo "========================================"
    echo "  Requirement System Migration DOWN"
    echo "========================================"
    echo ""

    # 检查依赖
    check_command psql
    check_command pg_dump
    check_file "$MIGRATION_DOWN"

    # 创建必要的目录
    ensure_dir "$BACKUP_DIR"
    ensure_dir "$LOG_DIR"

    # 测试数据库连接
    if ! test_db_connection; then
        exit 1
    fi

    # 检查表是否存在
    if ! check_table_exists "requirements"; then
        warning "Requirements table does not exist. Nothing to rollback."
        exit 0
    fi

    # 严重警告
    echo ""
    error "⚠️  WARNING: THIS WILL DELETE ALL REQUIREMENT DATA! ⚠️"
    error "This action CANNOT be undone without a backup!"
    echo ""

    # 创建备份
    if ! backup_file=$(create_backup); then
        error "Backup failed. Rollback aborted."
        exit 1
    fi

    # 多次确认
    warning "Backup created at: $backup_file"
    read -p "Type 'DELETE ALL DATA' to confirm rollback: " confirm

    if [ "$confirm" != "DELETE ALL DATA" ]; then
        info "Rollback cancelled by user"
        exit 0
    fi

    # 再次确认
    read -p "Are you absolutely sure? (yes/no): " confirm2
    if [ "$confirm2" != "yes" ]; then
        info "Rollback cancelled by user"
        exit 0
    fi

    # 执行回滚
    if execute_sql_file "$MIGRATION_DOWN" "Executing rollback"; then
        success "Rollback completed successfully!"

        # 验证回滚
        if check_table_exists "requirements"; then
            warning "Requirements table still exists after rollback"
        else
            success "All tables removed successfully"
        fi
    else
        error "Rollback failed. Please check logs: $LOG_FILE"
        exit 1
    fi

    echo ""
    success "========================================"
    success "Rollback completed successfully!"
    success "========================================"
    echo ""
    info "Log file: $LOG_FILE"
    info "Backup file: $backup_file"
}

# 仅创建备份
backup_only() {
    echo ""
    info "Creating backup only..."

    ensure_dir "$BACKUP_DIR"
    ensure_dir "$LOG_DIR"

    if ! test_db_connection; then
        exit 1
    fi

    if backup_file=$(create_backup); then
        success "Backup completed: $backup_file"
    else
        error "Backup failed"
        exit 1
    fi
}

# ================================================
# 主程序
# ================================================

main() {
    # 解析命令行参数
    case "${1:-}" in
        up)
            migrate_up
            ;;
        down)
            migrate_down
            ;;
        verify)
            ensure_dir "$LOG_DIR"
            test_db_connection && verify_migration
            ;;
        backup)
            backup_only
            ;;
        help|--help|-h)
            show_usage
            ;;
        *)
            error "Invalid option: ${1:-}"
            echo ""
            show_usage
            exit 1
            ;;
    esac
}

# 执行主程序
main "$@"
