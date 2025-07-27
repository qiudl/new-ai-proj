#!/bin/bash

echo "🐳 测试Docker CSS修复..."

cd /Users/johnqiu/coding/www/projects/new-ai-proj

echo "1. 停止现有容器..."
docker-compose down

echo "2. 清理Docker缓存..."
docker system prune -f

echo "3. 重新构建frontend容器..."
docker-compose build --no-cache frontend

echo "4. 启动frontend服务并检查日志..."
docker-compose up frontend 2>&1 | tee docker-test.log &

# 等待一段时间让容器启动
echo "5. 等待30秒让容器完全启动..."
sleep 30

echo "6. 检查是否有CSS错误..."
if grep -q "Module not found.*react-grid-layout.*css" docker-test.log; then
    echo "❌ 仍然存在CSS模块错误"
    cat docker-test.log | grep -A3 -B3 "Module not found"
else
    echo "✅ 没有发现CSS模块错误"
fi

if grep -q "Compiled successfully" docker-test.log; then
    echo "✅ 编译成功"
else
    echo "❌ 编译失败"
fi

echo "7. 停止测试容器..."
docker-compose down

echo "✅ 测试完成"
