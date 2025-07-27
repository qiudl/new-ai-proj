#!/bin/bash

echo "🔍 验证Docker中的CSS文件修复..."

# 检查本地文件
echo "1. 检查本地node_modules中的CSS文件："
ls -la /Users/johnqiu/coding/www/projects/new-ai-proj/frontend/node_modules/react-grid-layout/css/
ls -la /Users/johnqiu/coding/www/projects/new-ai-proj/frontend/node_modules/react-resizable/css/

echo "2. 检查CRACO配置："
cat /Users/johnqiu/coding/www/projects/new-ai-proj/frontend/craco.config.js | grep -A 5 -B 5 "react-grid-layout\|react-resizable"

echo "3. 检查package.json脚本："
cat /Users/johnqiu/coding/www/projects/new-ai-proj/frontend/package.json | grep -A 3 -B 1 '"start"'

echo "4. 检查DashboardPage.tsx的CSS导入："
head -20 /Users/johnqiu/coding/www/projects/new-ai-proj/frontend/src/pages/DashboardPage.tsx | grep -A 2 -B 2 "css\|import"

echo "✅ 验证完成！"
echo ""
echo "📋 下一步："
echo "1. 重新构建Docker容器："
echo "   cd /Users/johnqiu/coding/www/projects/new-ai-proj && docker-compose build frontend"
echo ""
echo "2. 启动服务："
echo "   docker-compose up frontend"
echo ""
echo "3. 检查编译日志是否还有CSS错误"
