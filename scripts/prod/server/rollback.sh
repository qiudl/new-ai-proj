#!/bin/bash
# rollback.sh - 快速回滚到之前版本
# 用法: ./rollback.sh [备份时间戳]

set -e

DEPLOY_DIR="/opt/ai-project"
BACKUPS_DIR="$DEPLOY_DIR/backups"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "=========================================="
echo "🔄 AI Project 回滚工具"
echo "=========================================="
echo ""

# 列出可用备份
echo "可用备份:"
echo "----------------------------------------"
ls -lt "$BACKUPS_DIR/ai-backend."* 2>/dev/null | head -10 | awk '{print "  " NR". " $NF " (" $6 " " $7 " " $8 ")"}'
echo "----------------------------------------"
echo ""

# 确定要回滚的版本
if [ -z "$1" ]; then
    BACKUP_FILE=$(ls -t "$BACKUPS_DIR/ai-backend."* 2>/dev/null | head -1)
    if [ -z "$BACKUP_FILE" ]; then
        echo -e "${RED}❌ 未找到任何备份文件${NC}"
        exit 1
    fi
    echo "将回滚到最新备份: $BACKUP_FILE"
else
    BACKUP_FILE="$BACKUPS_DIR/ai-backend.$1"
    if [ ! -f "$BACKUP_FILE" ]; then
        echo -e "${RED}❌ 备份文件不存在: $BACKUP_FILE${NC}"
        exit 1
    fi
    echo "将回滚到: $BACKUP_FILE"
fi

echo ""
read -p "确认回滚? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "已取消"
    exit 0
fi

# 执行回滚
echo ""
echo "🔄 停止服务..."
sudo supervisorctl stop ai-backend || pkill -f ai-backend || true
sleep 2

echo "📦 备份当前版本..."
if [ -f "$DEPLOY_DIR/backend/ai-backend" ]; then
    cp "$DEPLOY_DIR/backend/ai-backend" "$BACKUPS_DIR/ai-backend.pre-rollback.$(date +%Y%m%d_%H%M%S)"
fi

echo "📥 恢复备份..."
cp "$BACKUP_FILE" "$DEPLOY_DIR/backend/ai-backend"
chmod +x "$DEPLOY_DIR/backend/ai-backend"

echo "🚀 启动服务..."
sudo supervisorctl start ai-backend || {
    cd "$DEPLOY_DIR/backend"
    nohup ./ai-backend > ../logs/backend.log 2>&1 &
}

# 健康检查
echo "🔍 执行健康检查..."
sleep 5
if curl -sf "http://localhost:8080/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 回滚成功，服务正常${NC}"
else
    echo -e "${YELLOW}⚠️ 服务可能未完全启动，请检查日志${NC}"
    echo "  查看日志: tail -f $DEPLOY_DIR/logs/backend.log"
fi

echo ""
echo "=========================================="
echo "回滚完成"
echo "=========================================="
