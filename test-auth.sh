#!/bin/bash

# 登录并获取token，然后测试项目更新

API_URL="http://localhost:8081/api/v1"

echo "1. 尝试登录获取token..."
LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }')

echo "登录响应："
echo $LOGIN_RESPONSE | jq '.'

# 尝试从响应中提取token
TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.token // .token // empty')

if [ -z "$TOKEN" ]; then
  echo "无法获取token，尝试使用API Key..."
  
  # 尝试获取API key
  API_KEY_RESPONSE=$(curl -s -X GET "${API_URL}/api-keys" \
    -H "Authorization: Bearer test")
  
  echo "API Key响应："
  echo $API_KEY_RESPONSE | jq '.'
else
  echo "获取到token: $TOKEN"
  
  # 使用token测试项目API
  echo -e "\n2. 使用token获取项目列表..."
  PROJECTS=$(curl -s -X GET "${API_URL}/projects" \
    -H "Authorization: Bearer $TOKEN")
  
  echo "项目列表："
  echo $PROJECTS | jq '.'
fi
