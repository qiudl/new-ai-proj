#!/bin/bash

# 测试新的 GenerateCompletion API 端点

API_URL="http://localhost:8080/api/ai-config/generate"
AUTH_TOKEN="your_auth_token_here"

echo "=== 测试 AI GenerateCompletion API ==="
echo ""

# 1. 测试基础生成功能
echo "1. 测试基础生成功能"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "provider": "deepseek",
    "prompt": "生成一个简单的任务列表，包含3个任务，返回JSON格式",
    "temperature": 0.3,
    "max_tokens": 500
  }' | jq .

echo ""
echo "---"
echo ""

# 2. 测试带系统提示词的生成
echo "2. 测试带系统提示词的生成"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "provider": "openai",
    "prompt": "为一个电商网站的购物车功能设计测试用例",
    "system_prompt": "你是一个专业的QA工程师，擅长设计全面的测试用例。",
    "model": "gpt-3.5-turbo",
    "temperature": 0.5,
    "max_tokens": 1000
  }' | jq .

echo ""
echo "---"
echo ""

# 3. 测试带上下文的生成
echo "3. 测试带上下文的生成"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "provider": "claude",
    "prompt": "基于项目当前状态，推荐下一步的行动计划",
    "context": {
      "project": "移动应用开发",
      "current_sprint": 3,
      "completed_features": ["用户认证", "首页设计", "数据同步"],
      "pending_issues": ["性能优化", "推送通知"],
      "team_velocity": 25
    },
    "temperature": 0.4,
    "max_tokens": 1200
  }' | jq .

echo ""
echo "---"
echo ""

# 4. 测试错误处理 - 无效的provider
echo "4. 测试错误处理 - 无效的provider"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "provider": "invalid_provider",
    "prompt": "测试错误处理"
  }' | jq .

echo ""
echo "---"
echo ""

# 5. 测试错误处理 - 缺少必需字段
echo "5. 测试错误处理 - 缺少必需字段"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "provider": "deepseek"
  }' | jq .

echo ""
echo "=== 测试完成 ==="
