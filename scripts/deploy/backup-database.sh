#!/bin/bash

# 生产环境数据库备份脚本
# 用于腾讯云服务器的PostgreSQL数据库自动备份

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 配置变量
BACKUP_DIR="/opt/ai-project/backups"
CONTAINER_NAME="ai_postgres_prod"
DB_NAME="ai_project_prod_db"
DB_USER="prod_user"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/db_backup_$TIMESTAMP.sql"
LOG_FILE="/opt/ai-project/logs/backup.log"

# 备份保留天数
RETENTION_DAYS=30

# 创建必要目录
create_directories() {
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE"
}

# 记录日志
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# 检查容器状态
check_container() {
    info "检查PostgreSQL容器状态..."
    
    if ! docker ps | grep -q "$CONTAINER_NAME"; then
        error "PostgreSQL容器 $CONTAINER_NAME 未运行"
        log "ERROR: PostgreSQL容器未运行"
        exit 1
    fi
    
    success "PostgreSQL容器运行正常"
    log "PostgreSQL容器状态检查: 正常"
}

# 执行数据库备份
backup_database() {
    info "开始备份数据库..."
    log "开始数据库备份: $DB_NAME"
    
    # 使用pg_dump进行备份
    if docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" --verbose --clean --if-exists --create > "$BACKUP_FILE"; then
        success "数据库备份完成: $BACKUP_FILE"
        log "数据库备份成功: $BACKUP_FILE"
    else
        error "数据库备份失败"
        log "ERROR: 数据库备份失败"
        exit 1
    fi
}

# 压缩备份文件
compress_backup() {
    info "压缩备份文件..."
    
    if gzip "$BACKUP_FILE"; then
        local compressed_file="${BACKUP_FILE}.gz"
        local file_size=$(du -h "$compressed_file" | cut -f1)
        success "备份文件压缩完成: $compressed_file (大小: $file_size)"
        log "备份文件压缩成功: $compressed_file, 大小: $file_size"
    else
        warning "备份文件压缩失败，保留原文件"
        log "WARNING: 备份文件压缩失败"
    fi
}

# 清理旧备份
cleanup_old_backups() {
    info "清理 $RETENTION_DAYS 天前的旧备份..."
    
    local deleted_count=0
    
    # 删除旧的备份文件
    find "$BACKUP_DIR" -name "db_backup_*.sql*" -mtime +$RETENTION_DAYS -type f | while read -r file; do
        rm -f "$file"
        ((deleted_count++))
        log "删除旧备份: $file"
    done
    
    if [ "$deleted_count" -gt 0 ]; then
        success "清理了 $deleted_count 个旧备份文件"
        log "清理旧备份完成: 删除了 $deleted_count 个文件"
    else
        info "没有需要清理的旧备份"
        log "没有需要清理的旧备份"
    fi
}

# 验证备份完整性
verify_backup() {
    local backup_file="$1"
    
    info "验证备份文件完整性..."
    
    # 检查文件是否存在且不为空
    if [ ! -f "$backup_file" ] || [ ! -s "$backup_file" ]; then
        error "备份文件不存在或为空"
        log "ERROR: 备份文件验证失败 - 文件不存在或为空"
        return 1
    fi
    
    # 检查文件是否为有效的SQL或压缩文件
    if [[ "$backup_file" == *.gz ]]; then
        if gzip -t "$backup_file" 2>/dev/null; then
            success "压缩备份文件完整性验证通过"
            log "压缩备份文件验证: 通过"
        else
            error "压缩备份文件损坏"
            log "ERROR: 压缩备份文件验证失败"
            return 1
        fi
    else
        # 简单检查SQL文件是否包含必要的结构
        if grep -q "CREATE DATABASE\|CREATE TABLE\|INSERT INTO" "$backup_file"; then
            success "SQL备份文件完整性验证通过"
            log "SQL备份文件验证: 通过"
        else
            warning "SQL备份文件可能不完整"
            log "WARNING: SQL备份文件验证警告"
        fi
    fi
    
    return 0
}

# 发送备份状态通知（可选）
send_notification() {
    local status="$1"
    local message="$2"
    
    # 如果配置了通知URL，发送通知
    if [ -n "${WEBHOOK_URL:-}" ]; then
        local payload="{\"text\":\"AI项目数据库备份 - $status: $message\"}"
        curl -X POST -H "Content-Type: application/json" -d "$payload" "$WEBHOOK_URL" >/dev/null 2>&1 || true
    fi
    
    # 记录通知尝试
    log "通知发送: $status - $message"
}

# 显示备份统计
show_backup_stats() {
    info "备份统计信息:"
    info "======================================"
    info "备份目录: $BACKUP_DIR"
    info "备份文件数量: $(find "$BACKUP_DIR" -name "db_backup_*.sql*" | wc -l)"
    info "总备份大小: $(du -sh "$BACKUP_DIR" | cut -f1)"
    info "最新备份: $(ls -t "$BACKUP_DIR"/db_backup_*.sql* 2>/dev/null | head -1 || echo '无')"
    info "======================================"
}

# 主函数
main() {
    info "开始AI项目数据库备份流程..."
    log "======== 开始数据库备份 ========"
    
    create_directories
    check_container
    backup_database
    
    # 确定最终的备份文件
    local final_backup_file="$BACKUP_FILE"
    
    # 压缩备份
    compress_backup
    if [ -f "${BACKUP_FILE}.gz" ]; then
        final_backup_file="${BACKUP_FILE}.gz"
    fi
    
    # 验证备份
    if verify_backup "$final_backup_file"; then
        success "✅ 数据库备份流程完成"
        log "数据库备份流程成功完成"
        send_notification "成功" "数据库备份完成 - $final_backup_file"
    else
        error "❌ 备份验证失败"
        log "ERROR: 备份验证失败"
        send_notification "失败" "数据库备份验证失败"
        exit 1
    fi
    
    # 清理旧备份
    cleanup_old_backups
    
    # 显示统计信息
    show_backup_stats
    
    log "======== 数据库备份完成 ========"
    success "🎉 备份任务全部完成！"
}

# 恢复数据库函数
restore_database() {
    local restore_file="$1"
    
    if [ -z "$restore_file" ]; then
        error "请指定要恢复的备份文件"
        exit 1
    fi
    
    if [ ! -f "$restore_file" ]; then
        error "备份文件不存在: $restore_file"
        exit 1
    fi
    
    warning "⚠️  数据库恢复将覆盖现有数据！"
    read -p "确认继续？(yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        info "恢复操作已取消"
        exit 0
    fi
    
    info "开始恢复数据库: $restore_file"
    log "开始数据库恢复: $restore_file"
    
    # 如果是压缩文件，先解压
    if [[ "$restore_file" == *.gz ]]; then
        info "解压备份文件..."
        gunzip -c "$restore_file" | docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres
    else
        docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres < "$restore_file"
    fi
    
    success "数据库恢复完成"
    log "数据库恢复成功: $restore_file"
}

# 列出可用备份
list_backups() {
    info "可用的备份文件:"
    ls -lh "$BACKUP_DIR"/db_backup_*.sql* 2>/dev/null || echo "没有找到备份文件"
}

# 显示帮助
show_help() {
    echo "AI项目数据库备份脚本"
    echo ""
    echo "使用方法:"
    echo "  $0 [选项] [参数]"
    echo ""
    echo "选项:"
    echo "  -h, --help              显示此帮助信息"
    echo "  --backup                执行数据库备份（默认操作）"
    echo "  --restore <file>        恢复指定的备份文件"
    echo "  --list                  列出所有可用备份"
    echo "  --stats                 显示备份统计信息"
    echo ""
    echo "环境变量:"
    echo "  WEBHOOK_URL             通知webhook地址（可选）"
    echo "  RETENTION_DAYS          备份保留天数（默认30天）"
    echo ""
    echo "示例:"
    echo "  $0                      # 执行备份"
    echo "  $0 --restore /opt/ai-project/backups/db_backup_20241208_120000.sql.gz"
    echo "  $0 --list               # 列出备份"
}

# 解析命令行参数
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    --restore)
        if [ -z "$2" ]; then
            error "请指定要恢复的备份文件"
            show_help
            exit 1
        fi
        restore_database "$2"
        ;;
    --list)
        list_backups
        exit 0
        ;;
    --stats)
        show_backup_stats
        exit 0
        ;;
    --backup|"")
        main
        ;;
    *)
        error "未知选项: $1"
        show_help
        exit 1
        ;;
esac