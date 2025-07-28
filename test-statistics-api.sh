#!/bin/bash

echo "=== 测试时间段任务统计API ==="
echo ""

# 设置API基础URL
API_BASE_URL="http://localhost:8080/api"

echo "1. 测试今日任务统计API..."
echo "请求URL: ${API_BASE_URL}/statistics/today-stats"
echo ""

# 测试今日统计API
response=$(curl -s -w "%{http_code}" "${API_BASE_URL}/statistics/today-stats")
http_code=${response: -3}
response_body=${response%???}

echo "HTTP状态码: $http_code"
echo ""

if [ "$http_code" = "200" ]; then
    echo "✅ API调用成功!"
    echo ""
    echo "响应数据:"
    echo "$response_body" | python3 -m json.tool 2>/dev/null || echo "$response_body"
    echo ""
    
    # 检查关键字段
    echo "检查关键统计字段:"
    echo "- totalTasks: $(echo "$response_body" | grep -o '"totalTasks":[0-9]*' | cut -d':' -f2)"
    echo "- completedTasks: $(echo "$response_body" | grep -o '"completedTasks":[0-9]*' | cut -d':' -f2)"
    echo "- completionRate: $(echo "$response_body" | grep -o '"completionRate":[0-9.]*' | cut -d':' -f2)"
    echo "- timeEfficiency: $(echo "$response_body" | grep -o '"timeEfficiency":[0-9.]*' | cut -d':' -f2)"
    echo ""
    
else
    echo "❌ API调用失败!"
    echo "错误信息:"
    echo "$response_body"
    echo ""
fi

echo "2. 测试前端页面访问..."
echo "请确保前端服务正在运行，然后访问: http://localhost:3000/time-management"
echo ""

echo "3. 检查数据库连接..."
# 这里可以添加数据库连接测试

echo "=== 测试完成 ==="
