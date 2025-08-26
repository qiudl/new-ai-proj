#!/bin/bash
"""
为北京欢乐宿公司联系人宋建新创建登录用户账户
使用管理员API创建具有登录功能的用户账户
"""

set -e

# API配置
BASE_URL="http://localhost:8081"
API_V1="${BASE_URL}/api/v1"

echo "正在为北京欢乐宿公司联系人宋建新创建登录用户账户..."

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
    "username": "songjx",
    "email": "songjx@bjhls.com", 
    "password": "123456",
    "user_type": "company",
    "role": "user",
    "company_id": 46,
    "profile": {
        "name": "宋建新",
        "department": "技术部",
        "phone": ""
    }
}'

echo "2. 创建登录用户账户..."
echo "用户数据: $user_data"

# 3. 调用系统API创建用户
echo "3. 调用系统API创建用户账户..."
user_response=$(curl -s -X POST "${API_V1}/system/users" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $token" \
  -d "$user_data")

echo "用户创建响应: $user_response"

# 检查是否成功
success=$(echo "$user_response" | python3 -c "
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
    echo "✓ 登录用户账户创建成功!"
    echo "$user_response" | python3 -m json.tool
    echo ""
    echo "=== 完整创建信息 ==="
    echo "公司: 北京欢乐宿公司 (ID: 46)"
    echo "联系人: 宋建新 (已创建, ID: 16)"
    echo "登录账户: songjx"
    echo "邮箱: songjx@bjhls.com"
    echo "密码: 123456"
    echo "用户类型: 企业用户"
else
    echo "✗ 登录用户账户创建失败"
    echo "响应: $user_response"
    exit 1
fi
