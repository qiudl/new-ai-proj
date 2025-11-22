#!/bin/bash
# backup-db.sh - 数据库备份脚本
# 用法: ./backup-db.sh [--full|--schema-only]
# Cron: 0 2 * * * /opt/ai-project/scripts/backup-db.sh >> /opt/ai-project/logs/backup.log 2>&1

set -e

DEPLOY_DIR="/opt/ai-project"
BACKUP_DIR="$DEPLOY_DIR/backups/db"
RETENTION_DAYS=30

# 颜色
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"; }
log_success() { echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} ✅ $1"; }

# 加载环境变量
if [ -f "$DEPLOY_DIR/backend/.env.prod" ]; then
    set -a
    source "$DEPLOY_DIR/backend/.env.prod"
    set +a
fi

# 默认值
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-ai_prod_user}"
DB_NAME="${DB_NAME:-ai_project_prod}"

export PGPASSWORD="$DB_PASSWORD"

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 生成备份文件名
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

log "开始数据库备份..."
log "  数据库: $DB_NAME@$DB_HOST"
log "  备份文件: $BACKUP_FILE"

# 执行备份
BACKUP_TYPE="${1:---full}"

case "$BACKUP_TYPE" in
    --schema-only)
        pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
            --schema-only | gzip > "$BACKUP_FILE"
        ;;
    --full|*)
        pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
            --no-owner --no-acl | gzip > "$BACKUP_FILE"
        ;;
esac

# 验证备份
if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log_success "备份完成: $BACKUP_FILE ($BACKUP_SIZE)"
else
    log "❌ 备份失败"
    exit 1
fi

# 清理旧备份
log "清理 $RETENTION_DAYS 天前的备份..."
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete

# 显示当前备份列表
log "当前备份:"
ls -lh "$BACKUP_DIR"/*.sql.gz 2>/dev/null | tail -5 | while read line; do
    echo "  $line"
done

log_success "备份任务完成"
