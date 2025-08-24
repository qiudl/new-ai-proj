#!/bin/bash

# MCP服务器模式切换脚本
# 用于在独立模式和后端连接模式之间切换

MODE=${1:-backend}

echo "🔧 MCP服务器模式切换工具"
echo "========================="

case $MODE in
  "independent"|"indie")
    echo "切换到: 独立模式（不连接后端）"
    cp index.js index.active.js
    echo "✅ 已切换到独立模式"
    echo "   - 使用内存存储"
    echo "   - 不依赖后端API"
    echo "   - 适合离线开发"
    ;;
    
  "backend"|"connected")
    echo "切换到: 后端连接模式（修复版）"
    cp index-fixed.js index.active.js
    echo "✅ 已切换到后端连接模式"
    echo "   - 连接到 http://localhost:8081/api/v1"
    echo "   - 使用真实数据库"
    echo "   - 支持任务查找和文档关联"
    ;;
    
  "original")
    echo "切换到: 原始后端模式"
    cp index-original.js index.active.js
    echo "✅ 已切换到原始后端模式"
    ;;
    
  *)
    echo "❌ 未知模式: $MODE"
    echo ""
    echo "使用方法:"
    echo "  ./switch-mcp-mode.sh [模式]"
    echo ""
    echo "可用模式:"
    echo "  backend    - 后端连接模式（推荐）"
    echo "  indie      - 独立模式"
    echo "  original   - 原始模式"
    exit 1
    ;;
esac

echo ""
echo "当前配置:"
echo "----------"
cat .env | grep -E "TASK_API_BASE|USE_BACKEND_MODE|USE_LOCAL_MCP_BRIDGE"

echo ""
echo "📌 提示: 切换后需要重启MCP服务器才能生效"