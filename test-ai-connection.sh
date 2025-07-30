#!/bin/bash

# 测试AI配置是否正常工作

# 登录
echo "正在登录..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "登录失败"
  exit 1
fi

echo "登录成功"

# 测试AI连接
echo -e "\n测试DeepSeek AI连接..."
curl -s -X POST http://localhost:8080/api/v1/system/ai-configs/test \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "deepseek",
    "model": "deepseek-chat",
    "question": "你好，请简单介绍一下你自己"
  }' | python3 -m json.tool

# 再次测试，但要求返回JSON格式
echo -e "\n测试DeepSeek返回JSON格式..."
curl -s -X POST http://localhost:8080/api/v1/system/ai-configs/test \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "deepseek",
    "model": "deepseek-chat",
    "question": "请返回一个JSON对象，包含tasks数组，数组中有2个任务对象，每个任务包含title(字符串)、description(字符串)、priority(字符串，值为high/medium/low之一)、estimated_hours(数字)字段。只返回JSON，不要其他文字。"
  }' | python3 -m json.tool
