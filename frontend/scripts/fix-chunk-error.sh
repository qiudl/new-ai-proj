#!/bin/zsh
# Chunk 加载错误修复脚本
# 用于解决前端开发中的 ChunkLoadError 问题

set -e

echo "🔧 开始修复 Chunk 加载错误..."
echo ""

# 1. 停止所有相关进程
echo "1️⃣ 停止所有开发服务器进程..."
pkill -f "react-scripts" 2>/dev/null || true
pkill -f "webpack" 2>/dev/null || true
sleep 2

# 2. 清理缓存
echo ""
echo "2️⃣ 清理构建缓存..."
cd /Users/johnqiu/coding/www/projects/new-ai-proj/frontend

# 清理 node_modules 缓存
rm -rf node_modules/.cache 2>/dev/null || true

# 清理 build 目录
rm -rf build 2>/dev/null || true

# 清理浏览器缓存需要的临时文件
rm -rf .eslintcache 2>/dev/null || true

echo "✅ 缓存清理完成"

# 3. 重新安装依赖(可选,如果问题持续)
read -q "REPLY?3️⃣ 是否需要重新安装依赖? (y/N): "
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "正在重新安装依赖..."
    rm -rf node_modules package-lock.json
    npm install
    echo "✅ 依赖重新安装完成"
fi

# 4. 提供启动建议
echo ""
echo "🎯 修复完成! 请按照以下步骤操作:"
echo ""
echo "  1. 在浏览器中清除缓存和 Cookie"
echo "     - Chrome: Cmd+Shift+Delete"
echo "     - 或使用无痕模式: Cmd+Shift+N"
echo ""
echo "  2. 重新启动开发服务器:"
echo "     cd frontend && npm start"
echo ""
echo "  3. 如果问题依然存在,尝试:"
echo "     - 使用不同的端口: PORT=3001 npm start"
echo "     - 禁用代理: unset http_proxy https_proxy"
echo ""
