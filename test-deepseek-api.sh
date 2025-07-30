#!/bin/bash

# 直接测试DeepSeek API

echo "测试DeepSeek API..."

# 测试基本对话
curl -s -X POST https://api.deepseek.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-b6c8b9260bdb4cd4bb7252e010540277" \
  -d '{
    "model": "deepseek-chat",
    "messages": [
      {
        "role": "user",
        "content": "请返回一个JSON对象，格式如下：{\"tasks\": [{\"title\": \"任务标题\", \"description\": \"任务描述\", \"priority\": \"high\", \"estimated_hours\": 4}]}。只返回JSON，不要其他解释。"
      }
    ],
    "temperature": 0.7,
    "max_tokens": 1000
  }' | python3 -m json.tool

echo -e "\n\n测试任务生成..."

# 测试任务生成的完整提示词
curl -s -X POST https://api.deepseek.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-b6c8b9260bdb4cd4bb7252e010540277" \
  -d '{
    "model": "deepseek-chat",
    "messages": [
      {
        "role": "user",
        "content": "你是一个专业的项目管理助手。请将以下需求分解为具体任务：\n\n需求：为电商网站开发购物车功能\n\n请严格按照以下JSON格式返回，不要包含任何其他文字或解释：\n```json\n{\n  \"tasks\": [\n    {\n      \"title\": \"任务标题\",\n      \"description\": \"详细描述\",\n      \"priority\": \"high|medium|low\",\n      \"estimated_hours\": 数字,\n      \"tags\": [\"标签1\", \"标签2\"],\n      \"dependencies\": [],\n      \"confidence\": 0.95\n    }\n  ]\n}\n```"
      }
    ],
    "temperature": 0.3,
    "max_tokens": 2000
  }' | python3 -m json.tool
