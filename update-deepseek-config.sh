#!/bin/bash

# 更新DeepSeek API密钥

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

# 更新DeepSeek配置
echo -e "\n更新DeepSeek配置..."
curl -s -X PUT http://localhost:8080/api/v1/system/ai-configs/deepseek \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "sk-b6c8b9260bdb4cd4bb7252e010540277",
    "model": "deepseek-chat",
    "base_url": "https://api.deepseek.com/v1",
    "temperature": 0.3,
    "max_tokens": 4000,
    "enabled": true
  }' | python3 -m json.tool

# 测试配置
echo -e "\n测试DeepSeek连接..."
curl -s -X POST http://localhost:8080/api/v1/system/ai-configs/test \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "deepseek",
    "model": "deepseek-chat",
    "question": "你好"
  }' | python3 -m json.tool
