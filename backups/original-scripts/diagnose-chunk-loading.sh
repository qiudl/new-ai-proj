#!/bin/bash

# Webpack Chunk 加载问题诊断脚本
# 使用方法: ./diagnose-chunk-loading.sh

echo "🔍 Webpack Chunk 加载问题诊断"
echo "================================="

PROJECT_DIR="/Users/johnqiu/coding/www/projects/new-ai-proj"
cd "$PROJECT_DIR"

echo ""
echo "📋 基本信息检查..."
echo "项目目录: $PROJECT_DIR"
echo "当前时间: $(date)"

# 检查容器状态
echo ""
echo "🐳 Docker 容器状态:"
docker-compose ps

# 检查前端服务健康状态
echo ""
echo "🌐 前端服务检查:"
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
echo "前端直连状态码: $FRONTEND_STATUS"

NGINX_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost)
echo "Nginx 代理状态码: $NGINX_STATUS"

# 检查 JavaScript 文件 MIME 类型
echo ""
echo "📄 静态资源 MIME 类型检查:"
BUNDLE_CONTENT_TYPE=$(curl -s -I http://localhost/static/js/bundle.js | grep -i "content-type" | head -1)
echo "bundle.js: $BUNDLE_CONTENT_TYPE"

# 检查构建产物
echo ""
echo "📦 构建产物检查:"
if docker exec react_frontend test -d /app/build; then
    echo "✅ build 目录存在"
    CHUNK_COUNT=$(docker exec react_frontend find /app/build/static/js -name "*.chunk.js" | wc -l)
    echo "Chunk 文件数量: $CHUNK_COUNT"
    
    echo "最近的 chunk 文件:"
    docker exec react_frontend ls -lt /app/build/static/js/*.chunk.js | head -5
else
    echo "❌ build 目录不存在"
fi

# 检查前端日志中的错误
echo ""
echo "📝 前端容器日志检查 (最近50行):"
docker-compose logs --tail=50 frontend | grep -E "(error|Error|ERROR|failed|Failed|FAILED|chunk|Chunk)" || echo "无相关错误日志"

# 检查 Nginx 日志
echo ""
echo "🌐 Nginx 日志检查 (最近20行):"
docker-compose logs --tail=20 nginx | grep -E "(error|Error|ERROR|404|500)" || echo "无错误日志"

# 网络测试
echo ""
echo "🔗 网络连通性测试:"
echo "测试前端服务直连:"
timeout 3 curl -s http://localhost:3000 > /dev/null && echo "✅ 前端服务连通" || echo "❌ 前端服务不可达"

echo "测试 Nginx 代理:"
timeout 3 curl -s http://localhost > /dev/null && echo "✅ Nginx 代理连通" || echo "❌ Nginx 代理不可达"

echo "测试后端 API:"
timeout 3 curl -s http://localhost/api/v1/health > /dev/null && echo "✅ 后端 API 连通" || echo "❌ 后端 API 不可达"

# 检查端口占用
echo ""
echo "🚪 端口占用检查:"
echo "端口 80 (Nginx):"
lsof -i :80 | head -2 || echo "端口 80 未被占用"

echo "端口 3000 (前端):"
lsof -i :3000 | head -2 || echo "端口 3000 未被占用"

echo "端口 8080 (后端):"
lsof -i :8080 | head -2 || echo "端口 8080 未被占用"

# 性能检查
echo ""
echo "⚡ 系统资源检查:"
echo "Docker 磁盘使用:"
docker system df

echo "容器资源使用:"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" || echo "无法获取资源使用情况"

# 建议修复步骤
echo ""
echo "🛠️ 修复建议:"
echo "================================="

if [ "$NGINX_STATUS" != "200" ]; then
    echo "❌ Nginx 服务异常，建议执行: docker-compose restart nginx"
fi

if [ "$FRONTEND_STATUS" != "200" ]; then
    echo "❌ 前端服务异常，建议执行: docker-compose restart frontend"
fi

if [[ "$BUNDLE_CONTENT_TYPE" != *"application/javascript"* ]]; then
    echo "❌ JavaScript MIME 类型错误，建议检查 Nginx 配置"
fi

echo ""
echo "🔧 快速修复命令:"
echo "1. 重启服务: docker-compose restart frontend nginx"
echo "2. 重建前端: docker-compose up frontend --build -d"
echo "3. 完全重置: docker-compose down -v && docker-compose up --build"
echo ""
echo "🌐 手动测试步骤:"
echo "1. 访问 http://localhost"
echo "2. 打开开发者工具 (F12)"
echo "3. 进入工作台 -> 切换到 RGL 模式"
echo "4. 观察控制台错误信息"
echo ""
echo "📱 浏览器缓存清理:"
echo "1. 硬刷新: Ctrl+Shift+R (Windows) 或 Cmd+Shift+R (Mac)"
echo "2. 开发者工具 -> Application -> Storage -> Clear site data"

echo ""
echo "诊断完成 ✅"
