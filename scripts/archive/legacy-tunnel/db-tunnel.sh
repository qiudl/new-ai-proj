#!/bin/bash
# SSH隧道连接到远端PostgreSQL数据库
# 使用方法: ./scripts/db-tunnel.sh

set -e

REMOTE_HOST="152.136.104.251"
REMOTE_USER="ubuntu"
REMOTE_DB_PORT="5432"
LOCAL_TUNNEL_PORT="5433"

echo "📡 AI项目数据库SSH隧道"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "远端服务器: $REMOTE_HOST"
echo "本地端口:   $LOCAL_TUNNEL_PORT -> 远端:$REMOTE_DB_PORT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ SSH隧道已建立，可以使用以下配置连接数据库："
echo "   Host: localhost"
echo "   Port: $LOCAL_TUNNEL_PORT"
echo "   Database: ai_project_prod"
echo "   User: ai_prod_user"
echo ""
echo "💡 保持此终端打开以维持隧道连接"
echo "⌨️  按 Ctrl+C 断开隧道"
echo ""

# 建立SSH隧道
ssh -N -L ${LOCAL_TUNNEL_PORT}:127.0.0.1:${REMOTE_DB_PORT} ${REMOTE_USER}@${REMOTE_HOST} \
    -o ServerAliveInterval=60 \
    -o ServerAliveCountMax=3 \
    -o ExitOnForwardFailure=yes
