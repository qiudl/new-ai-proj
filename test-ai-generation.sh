#!/bin/bash

# 测试AI任务生成API

# 使用默认的admin用户登录
echo "正在登录..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "登录失败:"
  echo $LOGIN_RESPONSE | python3 -m json.tool
  exit 1
fi

echo "登录成功，获取到token"

# 先检查AI配置
echo -e "\n检查AI配置..."
curl -s -X GET http://localhost:8080/api/v1/system/ai-configs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | python3 -m json.tool

# 获取已启用的AI配置
echo -e "\n获取已启用的AI配置..."
curl -s -X GET http://localhost:8080/api/v1/system/ai-configs/enabled \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | python3 -m json.tool

# 测试AI任务生成
echo -e "\n测试AI任务生成..."
curl -s -X POST http://localhost:8080/api/v1/system/ai-tasks/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "deepseek",
    "input_text": "为一个电商网站开发购物车功能",
    "project_id": 1,
    "parent_task_id": null,
    "options": {
      "max_tasks": 5,
      "enable_duplicate_check": true,
      "enable_dependency_analysis": true,
      "enable_priority_assignment": true,
      "enable_time_estimation": true,
      "enable_skill_tagging": true
    }
  }' | python3 -m json.tool
