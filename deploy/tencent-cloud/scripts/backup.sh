#!/bin/bash

# AI项目数据备份脚本
# 备份PostgreSQL数据库、Redis数据、用户上传文件和配置文件

set -e

# 配置变量
PROJECT_DIR="/opt/ai-project"
BACKUP_DIR="/opt/ai-project/backups"
BACKUP_RETENTION_DAYS=30
DATE_FORMAT=$(date +"%Y%m%d_%H%M%S")
BACKUP_PREFIX="ai_project_backup_$DATE_FORMAT"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# 检查环境
check_environment() {
    log_info "检查备份环境..."
    
    # 检查项目目录
    if [[ ! -d "$PROJECT_DIR" ]]; then
        log_error "项目目录不存在: $PROJECT_DIR"
        exit 1
    fi
    
    # 创建备份目录
    mkdir -p "$BACKUP_DIR"
    
    # 检查Docker容器
    if ! docker ps | grep -q "ai_postgres_prod"; then
        log_error "PostgreSQL容器未运行"
        exit 1
    fi
    
    if ! docker ps | grep -q "ai_redis_prod"; then
        log_warning "Redis容器未运行，跳过Redis备份"
    fi
    
    log_success "环境检查完成"
}

# 备份PostgreSQL数据库
backup_postgres() {
    log_info "备份PostgreSQL数据库..."
    
    # 获取数据库配置
    DB_NAME=$(grep "^POSTGRES_DB=" "$PROJECT_DIR/.env" | cut -d'=' -f2)
    DB_USER=$(grep "^POSTGRES_USER=" "$PROJECT_DIR/.env" | cut -d'=' -f2)
    
    # 备份数据库
    docker exec ai_postgres_prod pg_dump \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --no-password \
        --verbose \
        --clean \
        --if-exists \
        --create > "$BACKUP_DIR/${BACKUP_PREFIX}_postgres.sql"
    
    # 压缩备份文件
    gzip "$BACKUP_DIR/${BACKUP_PREFIX}_postgres.sql"
    
    log_success "PostgreSQL备份完成"
}

# 备份Redis数据
backup_redis() {
    log_info "备份Redis数据..."
    
    if docker ps | grep -q "ai_redis_prod"; then
        # 强制Redis保存当前数据到磁盘
        docker exec ai_redis_prod redis-cli -a "$(grep REDIS_PASSWORD "$PROJECT_DIR/.env" | cut -d'=' -f2)" BGSAVE
        
        # 等待备份完成
        while [ "$(docker exec ai_redis_prod redis-cli -a "$(grep REDIS_PASSWORD "$PROJECT_DIR/.env" | cut -d'=' -f2)" LASTSAVE)" = "$(docker exec ai_redis_prod redis-cli -a "$(grep REDIS_PASSWORD "$PROJECT_DIR/.env" | cut -d'=' -f2)" LASTSAVE)" ]; do
            sleep 1
        done
        
        # 复制Redis数据文件
        docker cp ai_redis_prod:/data/dump.rdb "$BACKUP_DIR/${BACKUP_PREFIX}_redis.rdb"
        
        log_success "Redis备份完成"
    else
        log_warning "Redis容器未运行，跳过Redis备份"
    fi
}

# 备份上传文件
backup_uploads() {
    log_info "备份用户上传文件..."
    
    if [[ -d "$PROJECT_DIR/uploads" ]] && [[ -n "$(ls -A "$PROJECT_DIR/uploads" 2>/dev/null)" ]]; then
        tar -czf "$BACKUP_DIR/${BACKUP_PREFIX}_uploads.tar.gz" -C "$PROJECT_DIR" uploads/
        log_success "上传文件备份完成"
    else
        log_warning "上传文件目录为空，跳过备份"
    fi
}

# 备份配置文件
backup_config() {
    log_info "备份配置文件..."
    
    # 创建配置备份目录
    mkdir -p "$BACKUP_DIR/config_$DATE_FORMAT"
    
    # 备份环境配置（去除敏感信息）
    if [[ -f "$PROJECT_DIR/.env" ]]; then
        # 复制配置文件但隐藏密码
        sed 's/PASSWORD=.*/PASSWORD=***HIDDEN***/g; s/SECRET=.*/SECRET=***HIDDEN***/g' "$PROJECT_DIR/.env" > "$BACKUP_DIR/config_$DATE_FORMAT/.env.backup"
    fi
    
    # 备份Docker配置
    if [[ -f "$PROJECT_DIR/docker-compose.yml" ]]; then
        cp "$PROJECT_DIR/docker-compose.yml" "$BACKUP_DIR/config_$DATE_FORMAT/"
    fi
    
    # 备份Nginx配置
    if [[ -d "$PROJECT_DIR/nginx" ]]; then
        cp -r "$PROJECT_DIR/nginx" "$BACKUP_DIR/config_$DATE_FORMAT/"
    fi
    
    # 压缩配置备份
    tar -czf "$BACKUP_DIR/${BACKUP_PREFIX}_config.tar.gz" -C "$BACKUP_DIR" "config_$DATE_FORMAT/"
    rm -rf "$BACKUP_DIR/config_$DATE_FORMAT"
    
    log_success "配置文件备份完成"
}

# 创建备份清单
create_manifest() {
    log_info "创建备份清单..."
    
    cat > "$BACKUP_DIR/${BACKUP_PREFIX}_manifest.txt" << EOF
AI项目管理系统备份清单
====================
备份时间: $(date)
备份版本: $BACKUP_PREFIX
服务器IP: $(curl -s ifconfig.me || echo "未知")

备份内容:
$(ls -la "$BACKUP_DIR"/${BACKUP_PREFIX}_* | grep -v manifest.txt)

系统信息:
操作系统: $(lsb_release -d 2>/dev/null | cut -f2 || echo "未知")
内核版本: $(uname -r)
Docker版本: $(docker --version)
磁盘使用情况:
$(df -h)

容器状态:
$(docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}")

备份大小:
$(du -sh "$BACKUP_DIR"/${BACKUP_PREFIX}_* | grep -v manifest.txt)
EOF
    
    log_success "备份清单创建完成"
}

# 清理旧备份
cleanup_old_backups() {
    log_info "清理旧备份文件..."
    
    # 删除超过保留期的备份文件
    find "$BACKUP_DIR" -name "ai_project_backup_*" -mtime +$BACKUP_RETENTION_DAYS -delete
    
    # 统计当前备份数量
    BACKUP_COUNT=$(find "$BACKUP_DIR" -name "ai_project_backup_*.sql.gz" | wc -l)
    
    log_success "清理完成，当前保留备份数量: $BACKUP_COUNT"
}

# 验证备份完整性
verify_backup() {
    log_info "验证备份完整性..."
    
    # 检查PostgreSQL备份
    if [[ -f "$BACKUP_DIR/${BACKUP_PREFIX}_postgres.sql.gz" ]]; then
        if gzip -t "$BACKUP_DIR/${BACKUP_PREFIX}_postgres.sql.gz"; then
            log_success "PostgreSQL备份文件完整"
        else
            log_error "PostgreSQL备份文件损坏"
            exit 1
        fi
    fi
    
    # 检查其他备份文件
    for file in "$BACKUP_DIR"/${BACKUP_PREFIX}_*; do
        if [[ -f "$file" && "$file" != *".txt" ]]; then
            FILE_SIZE=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file" 2>/dev/null || echo "0")
            if [[ $FILE_SIZE -gt 0 ]]; then
                log_success "备份文件完整: $(basename "$file") ($(du -h "$file" | cut -f1))"
            else
                log_error "备份文件为空: $(basename "$file")"
            fi
        fi
    done
}

# 发送备份通知（可选）
send_notification() {
    if [[ -n "${BACKUP_WEBHOOK_URL:-}" ]]; then
        log_info "发送备份通知..."
        
        BACKUP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
        MESSAGE="✅ AI项目备份完成\n时间: $(date)\n大小: $BACKUP_SIZE\n服务器: $(hostname)"
        
        curl -s -X POST "$BACKUP_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"text\":\"$MESSAGE\"}" || log_warning "通知发送失败"
    fi
}

# 显示备份信息
show_backup_info() {
    log_info "=== 备份完成 ==="
    echo ""
    echo "备份信息:"
    echo "  备份时间: $(date)"
    echo "  备份前缀: $BACKUP_PREFIX"
    echo "  备份目录: $BACKUP_DIR"
    echo ""
    echo "备份文件:"
    ls -la "$BACKUP_DIR"/${BACKUP_PREFIX}_* | while read line; do
        echo "  $line"
    done
    echo ""
    echo "总备份大小: $(du -sh "$BACKUP_DIR" | cut -f1)"
    echo "可用磁盘空间: $(df -h "$BACKUP_DIR" | tail -1 | awk '{print $4}')"
    echo ""
    log_success "备份任务完成！"
}

# 主函数
main() {
    log_info "=== AI项目数据备份脚本 ==="
    
    cd "$PROJECT_DIR"
    
    check_environment
    backup_postgres
    backup_redis
    backup_uploads
    backup_config
    create_manifest
    verify_backup
    cleanup_old_backups
    send_notification
    show_backup_info
}

# 运行主函数
main "$@"