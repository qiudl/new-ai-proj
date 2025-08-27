#!/bin/bash

# 角色权限API接口测试脚本
# 用于测试角色管理API接口的功能

BASE_URL="http://localhost:8082/api/v1"
echo "=== 角色权限API接口测试 ==="

# 首先登录获取token (使用dev环境快速登录)
echo "1. 获取认证token..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/dev/quick-login" \
  -H "Content-Type: application/json" \
  -d '{"username": "guoym"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ 无法获取认证token，请检查后端服务是否运行"
    echo "响应: $LOGIN_RESPONSE"
    exit 1
fi

echo "✅ 成功获取token: ${TOKEN:0:20}..."

# 测试角色管理API
echo -e "\n2. 测试获取所有角色..."
ROLES_RESPONSE=$(curl -s -X GET "$BASE_URL/roles" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "响应: $ROLES_RESPONSE"

# 测试创建角色
echo -e "\n3. 测试创建新角色..."
CREATE_ROLE_RESPONSE=$(curl -s -X POST "$BASE_URL/roles" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role_code": "test_role_api_' $(date +%s) '",
    "role_name": "API测试角色",
    "role_description": "用于测试API接口功能的角色",
    "permission_codes": ["read_user", "create_task"]
  }')

echo "响应: $CREATE_ROLE_RESPONSE"

# 提取角色ID用于后续测试
ROLE_ID=$(echo $CREATE_ROLE_RESPONSE | grep -o '"id":[0-9]*' | cut -d':' -f2)

if [ ! -z "$ROLE_ID" ]; then
    echo -e "\n4. 测试获取单个角色 (ID: $ROLE_ID)..."
    GET_ROLE_RESPONSE=$(curl -s -X GET "$BASE_URL/roles/$ROLE_ID" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json")
    
    echo "响应: $GET_ROLE_RESPONSE"
    
    echo -e "\n5. 测试获取角色权限..."
    ROLE_PERMISSIONS_RESPONSE=$(curl -s -X GET "$BASE_URL/roles/$ROLE_ID/permissions" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json")
    
    echo "响应: $ROLE_PERMISSIONS_RESPONSE"
    
    echo -e "\n6. 测试更新角色状态..."
    UPDATE_STATUS_RESPONSE=$(curl -s -X PATCH "$BASE_URL/roles/$ROLE_ID/status" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"is_active": false}')
    
    echo "响应: $UPDATE_STATUS_RESPONSE"
    
    echo -e "\n7. 测试删除角色..."
    DELETE_RESPONSE=$(curl -s -X DELETE "$BASE_URL/roles/$ROLE_ID" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json")
    
    echo "响应: $DELETE_RESPONSE"
fi

echo -e "\n=== 角色权限API测试完成 ==="
