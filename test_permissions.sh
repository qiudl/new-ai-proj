#!/bin/bash
# 简单的权限测试脚本

echo "=== 权限调试测试 ==="

# 获取token
echo "1. 获取admin token..."
TOKEN=$(curl -s -X POST http://localhost:8081/api/v1/auth/dev-quick-login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin"}' | python3 -c "
import json
import sys
data = json.load(sys.stdin)
if data.get('success'):
    print(data['data']['token'])
")

if [ -z "$TOKEN" ]; then
    echo "❌ 无法获取token"
    exit 1
fi

echo "✅ 获得token: ${TOKEN:0:50}..."

# 测试不同的端点
echo ""
echo "2. 测试各种admin端点的权限..."

endpoints=(
    "/api/v1/admin/users"
    "/api/v1/system/audit/logs"
    "/api/v1/users/profile"
)

for endpoint in "${endpoints[@]}"; do
    echo ""
    echo "测试端点: $endpoint"
    
    response=$(curl -s -w "HTTP_CODE:%{http_code}" \
      -X GET "http://localhost:8081${endpoint}" \
      -H "Authorization: Bearer $TOKEN")
    
    http_code=$(echo "$response" | grep -o 'HTTP_CODE:[0-9]*' | cut -d':' -f2)
    body=$(echo "$response" | sed 's/HTTP_CODE:[0-9]*$//')
    
    echo "HTTP状态: $http_code"
    if [ "$http_code" = "200" ]; then
        echo "✅ 成功访问"
    elif [ "$http_code" = "403" ]; then
        echo "❌ 权限被拒绝"
        echo "响应: $body" | head -1
    else
        echo "⚠️ 其他状态: $http_code"
        echo "响应: $body" | head -1
    fi
done

echo ""
echo "=== 测试完成 ==="
