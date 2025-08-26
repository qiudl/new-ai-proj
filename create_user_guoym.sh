#!/bin/bash
"""
创建系统管理员用户 guoym 的脚本
使用curl调用项目的后端API
"""

set -e

# API配置
BASE_URL="http://localhost:8081"
API_V1="${BASE_URL}/api/v1"

echo "正在创建系统管理员用户 guoym..."

# 1. 获取admin token
echo "1. 获取admin用户登录token..."
token_response=$(curl -s -X POST "${API_V1}/auth/dev-quick-login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin"}')

echo "登录响应: $token_response"

# 提取token
token=$(echo "$token_response" | python3 -c "
import json
import sys
try:
    data = json.load(sys.stdin)
    if data.get('success'):
        print(data['data']['token'])
    else:
        print('ERROR: 登录失败', file=sys.stderr)
        sys.exit(1)
except Exception as e:
    print(f'ERROR: 解析响应失败: {e}', file=sys.stderr)
    sys.exit(1)
")

if [ -z "$token" ]; then
    echo "无法获取token，退出"
    exit 1
fi

echo "✓ 获得token: ${token:0:50}..."

# 2. 用户数据
user_data='{
    "username": "guoym",
    "email": "guoym@example.com", 
    "password": "gym123",
    "user_type": "system",
    "role": "admin",
    "profile": {
        "name": "郭咏明"
    }
}'

echo "2. 创建用户..."
echo "用户数据: $user_data"

# 3. 尝试创建用户 - 先尝试admin路由
echo "3. 调用API创建用户..."
create_response=$(curl -s -X POST "${API_V1}/admin/users" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $token" \
  -d "$user_data")

echo "创建用户响应: $create_response"

# 检查是否成功
success=$(echo "$create_response" | python3 -c "
import json
import sys
try:
    data = json.load(sys.stdin)
    if data.get('success'):
        print('true')
    else:
        print('false')
except:
    print('false')
")

if [ "$success" = "true" ]; then
    echo "✓ 用户创建成功!"
    echo "$create_response" | python3 -m json.tool
else
    echo "✗ 管理员路由创建失败，尝试系统路由..."
    
    # 尝试系统路由
    system_response=$(curl -s -X POST "${API_V1}/system/users" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $token" \
      -d "$user_data")
    
    echo "系统路由响应: $system_response"
    
    system_success=$(echo "$system_response" | python3 -c "
import json
import sys
try:
    data = json.load(sys.stdin)
    if data.get('success'):
        print('true')
    else:
        print('false')
except:
    print('false')
")
    
    if [ "$system_success" = "true" ]; then
        echo "✓ 用户创建成功!"
        echo "$system_response" | python3 -m json.tool
    else
        echo "✗ 用户创建失败"
        echo "管理员路由响应: $create_response"
        echo "系统路由响应: $system_response"
        exit 1
    fi
fi
