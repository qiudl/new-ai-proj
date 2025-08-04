#!/bin/bash

# 获取新的认证token的脚本
echo "🔐 获取AI项目管理平台认证token..."

# 从系统获取token
TOKEN_RESPONSE=$(curl -s -X POST "http://localhost:8080/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}')

# 提取token
TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ 获取token失败"
    echo "Response: $TOKEN_RESPONSE"
    exit 1
fi

echo "✅ Token获取成功"
echo "📋 您的认证token："
echo "$TOKEN"
echo ""
echo "📝 请将此token更新到claude-code-config.json中的AUTH_TOKEN字段"
echo ""
echo "🔄 Token有效期7天，过期后请重新运行此脚本"
