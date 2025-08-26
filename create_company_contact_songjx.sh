#!/bin/bash
# 为北京欢乐宿公司创建企业用户 songjx 的脚本
# 使用已存在的公司ID 46

set -e

# API配置
BASE_URL="http://localhost:8081"
API_V1="${BASE_URL}/api/v1"

echo "正在为北京欢乐宿公司(ID: 46)创建企业用户 songjx..."

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

# 2. 使用已存在的公司ID
company_id=46

# 3. 用户数据
user_data='{
    "customer_id": '$company_id',
    "name": "宋佳香",
    "position": "实施顾问",
    "department": "技术部",
    "email": "songjx@joylodging.com",
    "phone": "",
    "mobile": "",
    "work_phone": "",
    "role": "technical_contact",
    "is_primary_contact": false,
    "can_make_decisions": true,
    "access_level": 3,
    "status": "active",
    "notes": "北京欢乐宿公司实施顾问"
}'

echo "2. 创建企业用户..."
echo "用户数据: $user_data"

# 4. 创建公司用户
echo "3. 调用API创建公司用户..."
user_response=$(curl -s -X POST "${API_V1}/companies/${company_id}/users" \
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
    echo "✓ 企业用户创建成功!"
    echo "$user_response" | python3 -m json.tool
    echo ""
    echo "=== 创建完成 ==="
    echo "公司: 北京欢乐宿公司 (ID: $company_id)"
    echo "姓名: 宋佳香"
    echo "职位: 实施顾问"
    echo "部门: 技术部"
else
    echo "✗ 企业用户创建失败"
    echo "响应: $user_response"
    exit 1
fi
