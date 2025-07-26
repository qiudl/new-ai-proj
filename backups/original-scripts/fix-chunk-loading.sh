#!/bin/bash

# Webpack Chunk 加载问题修复脚本
# 解决 ChunkLoadError: Loading chunk vendors-node_modules_ant-design_icons failed

echo "🔧 开始修复 Webpack Chunk 加载问题..."

PROJECT_DIR="/Users/johnqiu/coding/www/projects/new-ai-proj"
cd "$PROJECT_DIR"

echo "📋 问题分析："
echo "   - 开发环境 chunk 文件名与构建产物不匹配"
echo "   - 浏览器缓存了过期的 chunk 引用"
echo "   - RGL 模式触发动态导入时出错"

echo ""
echo "🚀 执行修复步骤..."

# 步骤1: 清理前端构建缓存和容器
echo "1️⃣ 清理构建缓存和容器..."
docker-compose stop frontend
docker-compose rm -f frontend
docker volume prune -f

# 步骤2: 清理 node_modules 和构建产物
echo "2️⃣ 清理前端依赖和构建产物..."
docker run --rm -v "$PROJECT_DIR/frontend:/app" -w /app node:18-alpine sh -c "
    rm -rf node_modules package-lock.json build
    echo '清理完成'
"

# 步骤3: 重新安装依赖
echo "3️⃣ 重新安装前端依赖..."
docker run --rm -v "$PROJECT_DIR/frontend:/app" -w /app node:18-alpine sh -c "
    npm cache clean --force
    npm install
    echo '依赖安装完成'
"

echo "✅ 修复完成！"
echo ""
echo "📋 接下来的步骤："
echo "1. 清除浏览器缓存（Ctrl+Shift+R 或 Cmd+Shift+R）"
echo "2. 在浏览器开发者工具中：Application -> Storage -> Clear storage"
echo "3. 重新访问应用并测试 RGL 模式"
