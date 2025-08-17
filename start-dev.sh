#!/bin/bash

# AI项目快速启动脚本
# 一键启动Docker开发环境

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 AI项目开发环境快速启动"
echo "========================================"

# 检查Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装，请先安装Docker"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo "❌ Docker服务未运行，请启动Docker"
    exit 1
fi

# 给脚本执行权限
echo "📝 设置脚本权限..."
chmod +x "$SCRIPT_DIR/scripts/dev-env.sh"
chmod +x "$SCRIPT_DIR/scripts/setup-replica-database.sh"

# 启动开发环境
echo "🐳 启动Docker开发环境..."
"$SCRIPT_DIR/scripts/dev-env.sh" start

echo ""
echo "✅ 开发环境启动完成！"
echo ""
echo "📋 访问地址:"
echo "   前端:     http://localhost:3001"
echo "   后端API:  http://localhost:8081"
echo "   MCP服务器: http://localhost:3100"
echo ""
echo "💡 常用命令:"
echo "   查看状态: ./scripts/dev-env.sh status"
echo "   查看日志: ./scripts/dev-env.sh logs [service]"
echo "   停止环境: ./scripts/dev-env.sh stop"
echo ""
echo "📖 详细文档: 查看 MIGRATION_TO_DOCKER_DEV.md"
echo "========================================"