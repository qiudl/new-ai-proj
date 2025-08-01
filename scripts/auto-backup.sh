#!/bin/bash

# 自动数据库备份脚本
# 每天6点、12点、18点执行

set -e

# 配置
PROJECT_DIR="/Users/johnqiu/coding/www/projects/new-ai-proj"
BACKUP_DIR="$PROJECT_DIR/backups"
DB_CONTAINER="postgres_db"
DB_USER="user"
DB_NAME="main_db"
RETENTION_DAYS=7  # 保留7天的备份

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 生成备份文件名 (格式: YYYYMMDD_HHMM_dbbackup.sql)
TIMESTAMP=$(date +"%Y%m%d_%H%M")
BACKUP_FILE="$BACKUP_DIR/${TIMESTAMP}_dbbackup.sql"

echo "🚀 开始数据库备份 - $(date)"
echo "备份文件: $BACKUP_FILE"

cd "$PROJECT_DIR"

# 检查Docker Compose是否运行
if ! docker-compose ps | grep -q "postgres_db.*Up"; then
    echo "❌ 数据库容器未运行，启动服务..."
    docker-compose up -d db
    sleep 10
fi

# 执行备份
echo "📦 正在备份数据库..."
if docker-compose exec -T db pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --no-privileges > "$BACKUP_FILE"; then
    echo "✅ 备份成功: $BACKUP_FILE"
    
    # 显示备份文件大小
    BACKUP_SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
    echo "📊 备份文件大小: $BACKUP_SIZE"
    
    # 验证备份文件内容
    if grep -q "PostgreSQL database dump" "$BACKUP_FILE"; then
        echo "✅ 备份文件验证通过"
    else
        echo "⚠️  备份文件可能有问题，请检查"
    fi
else
    echo "❌ 备份失败"
    exit 1
fi

# 清理旧备份 (保留最近7天)
echo "🧹 清理旧备份文件..."
find "$BACKUP_DIR" -name "*_dbbackup.sql" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true

# 显示当前备份文件列表
echo "📋 当前备份文件:"
ls -la "$BACKUP_DIR"/*_dbbackup.sql 2>/dev/null | tail -10 || echo "暂无备份文件"

# 备份统计
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/*_dbbackup.sql 2>/dev/null | wc -l)
echo "📈 总备份文件数: $BACKUP_COUNT"

echo "🎉 备份完成 - $(date)"

# 可选：发送备份状态通知（预留接口）
# curl -X POST "webhook_url" -d "数据库备份完成: $BACKUP_FILE" 2>/dev/null || true