#!/bin/bash

# 用户统计API测试脚本
# 测试新创建的用户统计API端点

set -e

echo "=== 用户统计API测试 ==="

# API基础URL
BASE_URL="http://localhost:8081/api/v1"

# JWT Token (需要先登录获取)
# 这里使用开发环境的快速登录
echo "获取JWT Token..."

# 首先尝试开发环境快速登录
TOKEN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/dev-quick-login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin"}')

if echo "$TOKEN_RESPONSE" | grep -q "token"; then
    TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "✅ 获取Token成功"
else
    echo "❌ 获取Token失败，响应: $TOKEN_RESPONSE"
    exit 1
fi

# 测试函数
test_endpoint() {
    local endpoint="$1"
    local description="$2"
    
    echo ""
    echo "测试: $description"
    echo "端点: GET $endpoint"
    
    response=$(curl -s -w "HTTP_CODE:%{http_code}" \
        -H "Authorization: Bearer $TOKEN" \
        "$BASE_URL$endpoint")
    
    http_code=$(echo "$response" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
    body=$(echo "$response" | sed 's/HTTP_CODE:[0-9]*$//')
    
    if [ "$http_code" = "200" ]; then
        echo "✅ 成功 (HTTP $http_code)"
        # 美化JSON输出
        if command -v jq >/dev/null 2>&1; then
            echo "$body" | jq '.' 2>/dev/null || echo "$body"
        else
            echo "$body"
        fi
    else
        echo "❌ 失败 (HTTP $http_code)"
        echo "响应: $body"
    fi
}

# 测试所有用户统计API端点
echo ""
echo "开始测试用户统计API端点..."

test_endpoint "/users/stats/basic" "基础用户统计"
test_endpoint "/users/stats/roles" "用户角色分布统计"
test_endpoint "/users/stats/activity?page=1&page_size=10" "用户活动统计"
test_endpoint "/users/stats/companies" "企业用户统计"
test_endpoint "/users/stats/trends" "用户注册趋势"
test_endpoint "/users/stats/performance?page=1&page_size=10" "用户绩效统计"
test_endpoint "/users/stats/top-performers?limit=5" "顶级绩效用户"
test_endpoint "/users/stats/dashboard" "Dashboard统计汇总"
test_endpoint "/users/stats/active-count?days=30" "活跃用户数量"

echo ""
echo "=== 测试完成 ==="
