#!/bin/bash

echo "🌐 测试任务周报页面访问..."

# 检查页面是否可以访问
echo "📡 检查页面访问性..."

# 使用curl检查页面响应
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/task-dashboard)

if [ "$RESPONSE" = "200" ]; then
    echo "✅ 页面访问成功 (HTTP 200)"
else
    echo "⚠️  页面响应码: $RESPONSE"
fi

# 检查页面内容
echo "🔍 检查页面内容..."

PAGE_CONTENT=$(curl -s http://localhost/task-dashboard)

if echo "$PAGE_CONTENT" | grep -q "任务周报"; then
    echo "✅ 页面包含预期内容"
else
    echo "⚠️  页面内容可能有问题"
fi

# 检查是否有JavaScript错误的迹象
if echo "$PAGE_CONTENT" | grep -q "Cannot access"; then
    echo "❌ 页面可能存在JavaScript错误"
else
    echo "✅ 没有发现明显的JavaScript错误"
fi

echo "🎯 任务周报页面测试完成"
echo "📍 访问地址: http://localhost/task-dashboard"