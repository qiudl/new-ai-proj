#!/bin/bash
# AI项目管理系统 - 备份脚本
# 自动备份数据库和重要文件

set -e

# 配置变量
PROJECT_DIR="/opt/ai-project"
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# 数据库配置
DB_CONTAINER="ai_postgres_prod"
DB_USER="ai_prod_user"
DB_NAME="ai_project_prod"

# 日志函数
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2
}

# 创建备份目录
mkdir -p $BACKUP_DIR

log "🔄 开始备份 AI项目管理系统..."

# 1. 数据库备份
if docker ps | grep -q $DB_CONTAINER; then
    log "📊 备份数据库..."
    
    DB_BACKUP_FILE="$BACKUP_DIR/db_backup_$DATE.sql"
    
    # 导出数据库
    docker exec $DB_CONTAINER pg_dump -U $DB_USER $DB_NAME > $DB_BACKUP_FILE
    
    # 压缩备份文件
    gzip $DB_BACKUP_FILE
    
    log "✅ 数据库备份完成: ${DB_BACKUP_FILE}.gz"
else
    error "数据库容器未运行，跳过数据库备份"
fi

# 2. 文件备份
log "📁 备份应用文件..."

FILES_BACKUP_FILE="$BACKUP_DIR/files_backup_$DATE.tar.gz"

# 备份重要文件和目录
tar -czf $FILES_BACKUP_FILE -C $PROJECT_DIR \
    --exclude='logs/*.log' \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='backend/ai-project-backend' \
    --exclude='frontend/build' \
    --exclude='frontend/dist' \
    .env \
    uploads/ \
    config/ \
    ssl/ \
    nginx/ \
    scripts/ \
    docker-compose.yml \
    docker-compose.prod.yml 2>/dev/null || log "部分文件备份失败，继续..."

log "✅ 文件备份完成: $FILES_BACKUP_FILE"

# 3. 配置备份
log "⚙️  备份配置文件..."

CONFIG_BACKUP_FILE="$BACKUP_DIR/config_backup_$DATE.tar.gz"

tar -czf $CONFIG_BACKUP_FILE \
    $PROJECT_DIR/.env \
    $PROJECT_DIR/nginx/ \
    $PROJECT_DIR/ssl/ \
    /etc/nginx/sites-available/ai-project 2>/dev/null || log "部分配置文件不存在，跳过"

log "✅ 配置备份完成: $CONFIG_BACKUP_FILE"

# 4. Docker镜像备份（可选）
if [[ "$1" == "--include-images" ]]; then
    log "🐳 备份Docker镜像..."
    
    IMAGES_BACKUP_FILE="$BACKUP_DIR/images_backup_$DATE.tar"
    
    # 导出自定义镜像
    docker save $(docker images --filter "reference=new-ai-proj*" --format "{{.Repository}}:{{.Tag}}") > $IMAGES_BACKUP_FILE
    gzip $IMAGES_BACKUP_FILE
    
    log "✅ Docker镜像备份完成: ${IMAGES_BACKUP_FILE}.gz"
fi

# 5. 系统信息备份
log "💻 备份系统信息..."

SYSTEM_INFO_FILE="$BACKUP_DIR/system_info_$DATE.txt"

cat > $SYSTEM_INFO_FILE << EOF
=== AI项目管理系统备份信息 ===
备份时间: $(date)
服务器: $(hostname)
操作系统: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)
内核版本: $(uname -r)
Docker版本: $(docker --version)
Docker Compose版本: $(docker-compose --version)

=== 磁盘使用情况 ===
$(df -h)

=== 内存使用情况 ===
$(free -h)

=== Docker容器状态 ===
$(docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}")

=== Docker镜像信息 ===
$(docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}")

=== 网络配置 ===
$(ip addr show)

=== 环境变量（脱敏） ===
$(env | grep -E '^(PATH|HOME|USER|HOSTNAME)=' | sort)

=== 备份文件列表 ===
EOF

# 添加备份文件列表
ls -la $BACKUP_DIR/*_$DATE* >> $SYSTEM_INFO_FILE 2>/dev/null || true

log "✅ 系统信息备份完成: $SYSTEM_INFO_FILE"

# 6. 验证备份完整性
log "🔍 验证备份完整性..."

# 验证数据库备份
if [[ -f "${DB_BACKUP_FILE}.gz" ]]; then
    if gunzip -t "${DB_BACKUP_FILE}.gz" 2>/dev/null; then
        log "✅ 数据库备份文件完整性验证通过"
    else
        error "数据库备份文件损坏"
    fi
fi

# 验证文件备份
if tar -tzf $FILES_BACKUP_FILE > /dev/null 2>&1; then
    log "✅ 文件备份完整性验证通过"
else
    error "文件备份损坏"
fi

# 7. 清理旧备份
log "🧹 清理旧备份文件..."

# 删除超过保留期的备份
find $BACKUP_DIR -type f -name "*backup_*" -mtime +$RETENTION_DAYS -delete

# 显示剩余备份
REMAINING_BACKUPS=$(find $BACKUP_DIR -type f -name "*backup_*" | wc -l)
log "📦 当前保留备份数量: $REMAINING_BACKUPS"

# 8. 备份统计
log "📊 备份统计信息..."

TOTAL_SIZE=$(du -sh $BACKUP_DIR/*_$DATE* 2>/dev/null | awk '{sum+=$1} END {print sum}' || echo "0")
AVAILABLE_SPACE=$(df -h $BACKUP_DIR | awk 'NR==2 {print $4}')

echo "备份完成统计:"
echo "- 备份文件总大小: $(du -sh $BACKUP_DIR/*_$DATE* 2>/dev/null | awk '{total+=$1} END {print total "B"}' || echo "未知")"
echo "- 剩余磁盘空间: $AVAILABLE_SPACE"
echo "- 备份文件数量: $(ls $BACKUP_DIR/*_$DATE* 2>/dev/null | wc -l)"

# 9. 可选：上传到云存储
if [[ -f "$PROJECT_DIR/scripts/upload-backup.sh" ]]; then
    log "☁️  上传备份到云存储..."
    $PROJECT_DIR/scripts/upload-backup.sh $BACKUP_DIR/*_$DATE*
fi

# 10. 发送通知（可选）
if command -v mail &> /dev/null && [[ -n "$BACKUP_EMAIL" ]]; then
    log "📧 发送备份通知邮件..."
    echo "AI项目管理系统备份完成 - $(date)" | mail -s "备份完成通知" $BACKUP_EMAIL
fi

log "🎉 备份完成！"
log "备份位置: $BACKUP_DIR"
log "备份文件:"
ls -la $BACKUP_DIR/*_$DATE* 2>/dev/null || log "备份文件列表为空"

# 返回备份状态
if [[ -f "${DB_BACKUP_FILE}.gz" ]] && [[ -f "$FILES_BACKUP_FILE" ]]; then
    log "✅ 所有备份任务成功完成"
    exit 0
else
    error "部分备份任务失败"
    exit 1
fi