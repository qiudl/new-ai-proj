#!/bin/bash
# 从远端数据库备份到本地

set -e

BACKUP_DIR="backups/database"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/ai_project_prod_$TIMESTAMP.sql"

mkdir -p $BACKUP_DIR

echo "📦 开始备份远端数据库..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 检查SSH隧道是否运行
if ! lsof -i:5433 > /dev/null 2>&1; then
    echo "⚠️  SSH隧道未运行，正在启动..."
    nohup ./scripts/db-tunnel.sh > logs/db-tunnel-backup.log 2>&1 &
    sleep 3

    if ! lsof -i:5433 > /dev/null 2>&1; then
        echo "❌ SSH隧道启动失败"
        exit 1
    fi
    echo "✅ SSH隧道已启动"
fi

# 通过SSH隧道导出
echo "📥 正在导出数据库..."
PGPASSWORD='SecureAI2024!@#$%^' pg_dump \
    -h localhost \
    -p 5433 \
    -U ai_prod_user \
    -d ai_project_prod \
    --no-owner \
    --no-acl \
    > "$BACKUP_FILE"

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "✅ 备份完成: $BACKUP_FILE ($BACKUP_SIZE)"

# 压缩备份
echo "🗜️  正在压缩备份..."
gzip "$BACKUP_FILE"
COMPRESSED_SIZE=$(du -h "${BACKUP_FILE}.gz" | cut -f1)
echo "✅ 压缩完成: ${BACKUP_FILE}.gz ($COMPRESSED_SIZE)"

# 可选：同步到本地备份数据库
echo ""
read -p "是否同步到本地备份数据库 (new_ai_proj_prod)? (y/n): " sync_local
if [ "$sync_local" = "y" ]; then
    echo "🔄 同步到本地数据库..."

    # 检查本地数据库是否存在
    if PGPASSWORD='SecureAI2024!@#$%^' psql -h localhost -p 5432 -U ai_prod_user -lqt | cut -d \| -f 1 | grep -qw new_ai_proj_prod; then
        echo "✅ 本地数据库存在"

        # 先备份本地数据库
        echo "📦 备份本地数据库..."
        LOCAL_BACKUP="$BACKUP_DIR/local_new_ai_proj_prod_$TIMESTAMP.sql.gz"
        PGPASSWORD='SecureAI2024!@#$%^' pg_dump \
            -h localhost \
            -p 5432 \
            -U ai_prod_user \
            -d new_ai_proj_prod \
            --no-owner \
            --no-acl \
            | gzip > "$LOCAL_BACKUP"
        echo "✅ 本地数据库已备份到: $LOCAL_BACKUP"

        # 删除并重建数据库
        echo "🔄 重建本地数据库..."
        PGPASSWORD='SecureAI2024!@#$%^' psql -h localhost -p 5432 -U ai_prod_user -d postgres -c "DROP DATABASE IF EXISTS new_ai_proj_prod;"
        PGPASSWORD='SecureAI2024!@#$%^' psql -h localhost -p 5432 -U ai_prod_user -d postgres -c "CREATE DATABASE new_ai_proj_prod;"

        # 导入远端数据
        gunzip -c "${BACKUP_FILE}.gz" | \
            PGPASSWORD='SecureAI2024!@#$%^' psql \
            -h localhost \
            -p 5432 \
            -U ai_prod_user \
            -d new_ai_proj_prod \
            > /dev/null 2>&1

        echo "✅ 同步完成"

        # 验证任务数
        REMOTE_COUNT=$(PGPASSWORD='SecureAI2024!@#$%^' psql -h localhost -p 5433 -U ai_prod_user -d ai_project_prod -t -c "SELECT COUNT(*) FROM tasks;" | xargs)
        LOCAL_COUNT=$(PGPASSWORD='SecureAI2024!@#$%^' psql -h localhost -p 5432 -U ai_prod_user -d new_ai_proj_prod -t -c "SELECT COUNT(*) FROM tasks;" | xargs)

        echo "📊 数据验证:"
        echo "   远端任务数: $REMOTE_COUNT"
        echo "   本地任务数: $LOCAL_COUNT"

        if [ "$REMOTE_COUNT" = "$LOCAL_COUNT" ]; then
            echo "✅ 数据一致"
        else
            echo "⚠️  数据不一致，请检查"
        fi
    else
        echo "❌ 本地数据库不存在: new_ai_proj_prod"
    fi
fi

# 清理7天前的备份
echo ""
echo "🗑️  清理旧备份..."
OLD_BACKUPS=$(find $BACKUP_DIR -name "*.gz" -mtime +7 | wc -l | xargs)
if [ "$OLD_BACKUPS" -gt 0 ]; then
    find $BACKUP_DIR -name "*.gz" -mtime +7 -delete
    echo "✅ 已清理 $OLD_BACKUPS 个7天前的备份"
else
    echo "✅ 没有需要清理的旧备份"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 备份完成！"
echo "备份文件: ${BACKUP_FILE}.gz"
echo "备份大小: $COMPRESSED_SIZE"
