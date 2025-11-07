#!/bin/bash

# ================================================
# 需求管理系统数据备份和恢复脚本
# ================================================
# 版本: 1.0.0
# 作者: AI Project Team
# 日期: 2025-11-06
# 用途: 备份和恢复需求管理系统的数据
# ================================================

set -e
set -u

# ================================================
# 颜色定义
# ================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ================================================
# 配置变量
# ================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups/requirements}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 数据库配置
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-ai_project_db}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-}"

# 备份保留天数
RETENTION_DAYS=30

# 备份表列表
BACKUP_TABLES=(
    "requirements"
    "requirement_comments"
    "requirement_history"
    "requirement_tasks"
)

# ================================================
# 辅助函数
# ================================================

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 确保目录存在
ensure_dir() {
    if [ ! -d "$1" ]; then
        mkdir -p "$1"
        info "Created directory: $1"
    fi
}

# 设置PostgreSQL密码
set_pg_password() {
    if [ -n "$DB_PASSWORD" ]; then
        export PGPASSWORD="$DB_PASSWORD"
    fi
}

# 测试数据库连接
test_connection() {
    info "Testing database connection..."
    set_pg_password

    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c '\q' 2>/dev/null; then
        success "Database connection successful"
        return 0
    else
        error "Failed to connect to database"
        return 1
    fi
}

# 获取表的行数
get_table_count() {
    local table=$1
    set_pg_password
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT COUNT(*) FROM $table;" 2>/dev/null | tr -d ' '
}

# ================================================
# 备份功能
# ================================================

# 完整数据库备份
backup_full() {
    local backup_file="$BACKUP_DIR/full_backup_$TIMESTAMP.sql"

    info "Creating full database backup..."
    ensure_dir "$BACKUP_DIR"
    set_pg_password

    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --no-owner --no-acl --format=plain > "$backup_file" 2>/dev/null; then

        # 压缩备份
        gzip "$backup_file"
        local compressed_file="${backup_file}.gz"

        success "Full backup created: $compressed_file"

        # 显示文件大小
        local size=$(du -h "$compressed_file" | cut -f1)
        info "Backup size: $size"

        echo "$compressed_file"
        return 0
    else
        error "Full backup failed"
        return 1
    fi
}

# 仅备份需求管理表
backup_requirements_only() {
    local backup_file="$BACKUP_DIR/requirements_backup_$TIMESTAMP.sql"

    info "Creating requirements tables backup..."
    ensure_dir "$BACKUP_DIR"
    set_pg_password

    # 构建表列表参数
    local tables_args=""
    for table in "${BACKUP_TABLES[@]}"; do
        tables_args="$tables_args -t $table"
    done

    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        $tables_args --no-owner --no-acl --format=plain > "$backup_file" 2>/dev/null; then

        # 压缩备份
        gzip "$backup_file"
        local compressed_file="${backup_file}.gz"

        success "Requirements backup created: $compressed_file"

        # 显示各表的行数
        info "Backup statistics:"
        for table in "${BACKUP_TABLES[@]}"; do
            local count=$(get_table_count "$table")
            info "  - $table: $count rows"
        done

        local size=$(du -h "$compressed_file" | cut -f1)
        info "Backup size: $size"

        echo "$compressed_file"
        return 0
    else
        error "Requirements backup failed"
        return 1
    fi
}

# 数据备份（仅数据，不包括结构）
backup_data_only() {
    local backup_file="$BACKUP_DIR/requirements_data_$TIMESTAMP.sql"

    info "Creating data-only backup..."
    ensure_dir "$BACKUP_DIR"
    set_pg_password

    local tables_args=""
    for table in "${BACKUP_TABLES[@]}"; do
        tables_args="$tables_args -t $table"
    done

    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        $tables_args --data-only --no-owner --no-acl --format=plain > "$backup_file" 2>/dev/null; then

        gzip "$backup_file"
        local compressed_file="${backup_file}.gz"

        success "Data-only backup created: $compressed_file"

        local size=$(du -h "$compressed_file" | cut -f1)
        info "Backup size: $size"

        echo "$compressed_file"
        return 0
    else
        error "Data-only backup failed"
        return 1
    fi
}

# 自定义格式备份（支持并行恢复）
backup_custom_format() {
    local backup_file="$BACKUP_DIR/requirements_custom_$TIMESTAMP.dump"

    info "Creating custom format backup..."
    ensure_dir "$BACKUP_DIR"
    set_pg_password

    local tables_args=""
    for table in "${BACKUP_TABLES[@]}"; do
        tables_args="$tables_args -t $table"
    done

    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        $tables_args --format=custom --compress=9 > "$backup_file" 2>/dev/null; then

        success "Custom format backup created: $backup_file"

        local size=$(du -h "$backup_file" | cut -f1)
        info "Backup size: $size"

        echo "$backup_file"
        return 0
    else
        error "Custom format backup failed"
        return 1
    fi
}

# ================================================
# 恢复功能
# ================================================

# 从完整备份恢复
restore_full() {
    local backup_file=$1

    if [ ! -f "$backup_file" ]; then
        error "Backup file not found: $backup_file"
        return 1
    fi

    warning "This will restore the ENTIRE database from backup!"
    warning "All current data will be replaced!"
    read -p "Continue? (yes/no): " confirm

    if [ "$confirm" != "yes" ]; then
        info "Restore cancelled"
        return 0
    fi

    info "Restoring from full backup..."
    set_pg_password

    # 解压备份文件（如果是压缩的）
    local restore_file="$backup_file"
    if [[ "$backup_file" == *.gz ]]; then
        restore_file="${backup_file%.gz}"
        gunzip -c "$backup_file" > "$restore_file"
        info "Decompressed backup file"
    fi

    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        < "$restore_file" 2>/dev/null; then
        success "Full database restored successfully"

        # 清理临时解压文件
        if [[ "$backup_file" == *.gz ]]; then
            rm -f "$restore_file"
        fi

        return 0
    else
        error "Full restore failed"
        return 1
    fi
}

# 从需求表备份恢复
restore_requirements() {
    local backup_file=$1

    if [ ! -f "$backup_file" ]; then
        error "Backup file not found: $backup_file"
        return 1
    fi

    warning "This will restore requirement tables from backup!"
    warning "Current requirement data will be replaced!"
    read -p "Continue? (yes/no): " confirm

    if [ "$confirm" != "yes" ]; then
        info "Restore cancelled"
        return 0
    fi

    info "Restoring requirement tables..."
    set_pg_password

    # 解压备份文件
    local restore_file="$backup_file"
    if [[ "$backup_file" == *.gz ]]; then
        restore_file="${backup_file%.gz}"
        gunzip -c "$backup_file" > "$restore_file"
        info "Decompressed backup file"
    fi

    # 在恢复前创建当前数据的备份
    info "Creating safety backup of current data..."
    local safety_backup=$(backup_requirements_only)
    info "Safety backup created: $safety_backup"

    # 开始恢复
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        < "$restore_file" 2>/dev/null; then
        success "Requirements restored successfully"

        # 验证恢复后的数据
        info "Verifying restored data:"
        for table in "${BACKUP_TABLES[@]}"; do
            local count=$(get_table_count "$table")
            info "  - $table: $count rows"
        done

        # 清理临时文件
        if [[ "$backup_file" == *.gz ]]; then
            rm -f "$restore_file"
        fi

        return 0
    else
        error "Restore failed"
        warning "Your data is still safe. Original backup preserved."
        return 1
    fi
}

# 从自定义格式恢复
restore_custom() {
    local backup_file=$1

    if [ ! -f "$backup_file" ]; then
        error "Backup file not found: $backup_file"
        return 1
    fi

    warning "This will restore requirement tables from custom format backup!"
    read -p "Continue? (yes/no): " confirm

    if [ "$confirm" != "yes" ]; then
        info "Restore cancelled"
        return 0
    fi

    info "Restoring from custom format backup..."
    set_pg_password

    # 使用pg_restore恢复自定义格式备份
    if pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --clean --if-exists --no-owner --no-acl "$backup_file" 2>/dev/null; then
        success "Custom format restore successful"
        return 0
    else
        error "Custom format restore failed"
        return 1
    fi
}

# ================================================
# 维护功能
# ================================================

# 清理旧备份
cleanup_old_backups() {
    info "Cleaning up old backups (older than $RETENTION_DAYS days)..."

    if [ ! -d "$BACKUP_DIR" ]; then
        warning "Backup directory does not exist: $BACKUP_DIR"
        return 0
    fi

    local deleted_count=0

    # 查找并删除旧备份
    while IFS= read -r file; do
        rm -f "$file"
        info "Deleted: $(basename "$file")"
        deleted_count=$((deleted_count + 1))
    done < <(find "$BACKUP_DIR" -name "*.sql.gz" -o -name "*.dump" -mtime "+$RETENTION_DAYS")

    if [ $deleted_count -eq 0 ]; then
        info "No old backups to clean up"
    else
        success "Deleted $deleted_count old backup(s)"
    fi
}

# 列出所有备份
list_backups() {
    info "Available backups in $BACKUP_DIR:"
    echo ""

    if [ ! -d "$BACKUP_DIR" ]; then
        warning "Backup directory does not exist"
        return 0
    fi

    local backups=$(find "$BACKUP_DIR" \( -name "*.sql.gz" -o -name "*.dump" \) -type f | sort -r)

    if [ -z "$backups" ]; then
        info "No backups found"
        return 0
    fi

    echo "Timestamp          Type        Size    Filename"
    echo "----------------   ---------   ------  ---------"

    while IFS= read -r file; do
        local filename=$(basename "$file")
        local size=$(du -h "$file" | cut -f1)
        local type="unknown"

        if [[ "$filename" == full_backup_* ]]; then
            type="full"
        elif [[ "$filename" == requirements_backup_* ]]; then
            type="tables"
        elif [[ "$filename" == requirements_data_* ]]; then
            type="data-only"
        elif [[ "$filename" == requirements_custom_* ]]; then
            type="custom"
        fi

        # 提取时间戳
        local timestamp=$(echo "$filename" | grep -o '[0-9]\{8\}_[0-9]\{6\}' || echo "unknown")

        printf "%-18s %-11s %-7s %s\n" "$timestamp" "$type" "$size" "$filename"
    done <<< "$backups"

    echo ""
}

# ================================================
# 使用说明
# ================================================

show_usage() {
    cat << EOF
Usage: $0 [COMMAND] [OPTIONS]

Backup Commands:
    backup full             Create full database backup
    backup requirements     Create requirements tables backup
    backup data             Create data-only backup
    backup custom           Create custom format backup

Restore Commands:
    restore full <file>     Restore from full database backup
    restore requirements <file>    Restore requirements tables
    restore custom <file>   Restore from custom format backup

Maintenance Commands:
    list                    List all available backups
    cleanup                 Remove old backups (default: 30 days)
    help                    Show this help message

Environment Variables:
    DB_HOST          Database host (default: localhost)
    DB_PORT          Database port (default: 5432)
    DB_NAME          Database name (default: ai_project_db)
    DB_USER          Database user (default: postgres)
    DB_PASSWORD      Database password
    BACKUP_DIR       Backup directory (default: ./backups/requirements)
    RETENTION_DAYS   Days to keep backups (default: 30)

Examples:
    # Create requirements backup
    $ ./backup_restore_requirements.sh backup requirements

    # Restore from backup
    $ ./backup_restore_requirements.sh restore requirements backups/requirements/requirements_backup_20251106_120000.sql.gz

    # List all backups
    $ ./backup_restore_requirements.sh list

    # Clean up old backups
    $ RETENTION_DAYS=7 ./backup_restore_requirements.sh cleanup

EOF
}

# ================================================
# 主程序
# ================================================

main() {
    case "${1:-}" in
        backup)
            if ! test_connection; then
                exit 1
            fi

            case "${2:-}" in
                full)
                    backup_full
                    ;;
                requirements)
                    backup_requirements_only
                    ;;
                data)
                    backup_data_only
                    ;;
                custom)
                    backup_custom_format
                    ;;
                *)
                    error "Invalid backup type: ${2:-}"
                    echo ""
                    show_usage
                    exit 1
                    ;;
            esac
            ;;

        restore)
            if ! test_connection; then
                exit 1
            fi

            case "${2:-}" in
                full)
                    if [ -z "${3:-}" ]; then
                        error "Please specify backup file"
                        exit 1
                    fi
                    restore_full "$3"
                    ;;
                requirements)
                    if [ -z "${3:-}" ]; then
                        error "Please specify backup file"
                        exit 1
                    fi
                    restore_requirements "$3"
                    ;;
                custom)
                    if [ -z "${3:-}" ]; then
                        error "Please specify backup file"
                        exit 1
                    fi
                    restore_custom "$3"
                    ;;
                *)
                    error "Invalid restore type: ${2:-}"
                    show_usage
                    exit 1
                    ;;
            esac
            ;;

        list)
            list_backups
            ;;

        cleanup)
            cleanup_old_backups
            ;;

        help|--help|-h)
            show_usage
            ;;

        *)
            error "Invalid command: ${1:-}"
            echo ""
            show_usage
            exit 1
            ;;
    esac
}

# 执行主程序
main "$@"
