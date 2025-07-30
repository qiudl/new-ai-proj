#!/bin/bash

# 简化的测试，只发送最基本的请求

echo "测试AI任务生成（最简单的请求）..."

# 登录
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# 发送最简单的生成请求
curl -v -X POST http://localhost:8080/api/v1/system/ai-tasks/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "deepseek",
    "input_text": "创建一个任务",
    "options": {
      "max_tasks": 1
    }
  }' 2>&1
