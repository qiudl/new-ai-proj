#!/bin/bash

echo "=== 中间件功能测试 ==="

API_BASE="http://localhost:8080/api/v1"
ADMIN_TOKEN=""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

test_api() {
    local method=$1
    local endpoint=$2
    local data=$3
    local headers=$4
    local description=$5
    
    echo -e "${BLUE}测试: $description${NC}"
    echo "请求: $method $endpoint"
    
    if [ -n "$headers" ]; then
        if [ -n "$data" ]; then
            curl -s -X $method "$API_BASE$endpoint" \
                -H "Content-Type: application/json" \
                -H "$headers" \
                -d "$data" | jq .
        else
            curl -s -X $method "$API_BASE$endpoint" \
                -H "$headers" | jq .
        fi
    else
        if [ -n "$data" ]; then
            curl -s -X $method "$API_BASE$endpoint" \
                -H "Content-Type: application/json" \
                -d "$data" | jq .
        else
            curl -s -X $method "$API_BASE$endpoint" | jq .
        fi
    fi
    echo "---"
}

echo "1. 测试审计中间件 - 所有请求都会被记录"
test_api "GET" "/health" "" "" "健康检查（应该记录审计日志）"

echo "2. 测试认证中间件 - 登录限流"
echo "测试多次失败登录..."
for i in {1..3}; do
    echo "尝试 $i:"
    test_api "POST" "/auth/login" '{"username":"invalid","password":"wrong"}' "" "失败登录尝试 $i"
done

echo "3. 测试权限中间件 - 未认证访问受保护资源"
test_api "GET" "/tasks" "" "" "未认证访问任务列表（应该被拒绝）"

echo "4. 测试成功登录"
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}')

if echo "$LOGIN_RESPONSE" | jq -e '.success' > /dev/null; then
    ADMIN_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token')
    echo -e "${GREEN}登录成功，获取到token${NC}"
    
    echo "5. 测试认证访问"
    test_api "GET" "/tasks" "" "Authorization: Bearer $ADMIN_TOKEN" "认证用户访问任务列表"
    
    echo "6. 测试权限控制"
    test_api "GET" "/system/audit/logs" "" "Authorization: Bearer $ADMIN_TOKEN" "管理员访问审计日志"
    
    echo "7. 测试会话管理"
    test_api "GET" "/users/sessions" "" "Authorization: Bearer $ADMIN_TOKEN" "查看用户会话"
    
    echo "8. 测试审计日志查询"
    test_api "GET" "/system/audit/logs?limit=5" "" "Authorization: Bearer $ADMIN_TOKEN" "查询最近5条审计日志"
    
else
    echo -e "${RED}登录失败，请检查用户名密码${NC}"
fi

echo -e "${GREEN}中间件功能测试完成${NC}"
