#!/bin/bash

echo "🧪 本地环境测试..."

cd /Users/johnqiu/coding/www/projects/new-ai-proj/frontend

# 清理缓存
echo "1. 清理npm缓存..."
npm cache clean --force

# 重新安装依赖
echo "2. 重新安装依赖..."
npm install

# 验证CSS文件
echo "3. 验证CSS文件..."
node test-css-resolution.js

# 尝试构建（不启动服务）
echo "4. 测试构建..."
npm run build

echo "✅ 如果构建成功，说明CSS问题已解决！"
