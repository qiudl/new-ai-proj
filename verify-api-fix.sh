#!/bin/bash

echo "🎯 项目详情页API错误修复验证"
echo "=================================="

echo ""
echo "1. 检查容器状态..."
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "2. 检查前端环境变量..."
REACT_API_URL=$(docker exec react_frontend env | grep REACT_APP_API_URL)
echo "前端API配置: $REACT_API_URL"

if [[ "$REACT_API_URL" == *"/api/v1"* ]]; then
    echo "✅ 前端API URL配置正确"
else
    echo "❌ 前端API URL配置错误"
fi

echo ""
echo "3. 测试API连通性..."
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidXNlcl90eXBlIjoiYWRtaW4iLCJleHAiOjE3NTM2Mzc3NDAsImlhdCI6MTc1MzYzNDE0MCwibmJmIjoxNzUzNjM0MTQwLCJzdWIiOiJhZG1pbiJ9.qsqAth_OZSQxWW7Vseu5RUK8YJU-6LF-Iv0NdzdUo3o"

# 测试用户API
echo "测试用户API..."
USER_API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" http://localhost/api/v1/users/profile)
if [ "$USER_API_STATUS" = "200" ]; then
    echo "✅ 用户API正常 (状态码: $USER_API_STATUS)"
else
    echo "❌ 用户API异常 (状态码: $USER_API_STATUS)"
fi

# 测试项目API
echo "测试项目API..."
PROJECT_API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" http://localhost/api/v1/projects/39)
if [ "$PROJECT_API_STATUS" = "200" ]; then
    echo "✅ 项目API正常 (状态码: $PROJECT_API_STATUS)"
else
    echo "❌ 项目API异常 (状态码: $PROJECT_API_STATUS)"
fi

# 测试任务更新API
echo "测试任务更新API..."
TASK_API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -X PUT -d '{"title":"修复验证测试"}' http://localhost/api/v1/projects/39/tasks/46)
if [ "$TASK_API_STATUS" = "200" ]; then
    echo "✅ 任务API正常 (状态码: $TASK_API_STATUS)"
else
    echo "❌ 任务API异常 (状态码: $TASK_API_STATUS)"
fi

echo ""
echo "4. 检查企业信息API..."
COMPANY_API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" http://localhost/api/v1/companies/2)
if [ "$COMPANY_API_STATUS" = "200" ]; then
    echo "✅ 企业API正常 (状态码: $COMPANY_API_STATUS)"
else
    echo "❌ 企业API异常 (状态码: $COMPANY_API_STATUS)"
fi

echo ""
echo "🎯 修复验证总结："
echo "=================="

if [[ "$REACT_API_URL" == *"/api/v1"* ]] && 
   [ "$USER_API_STATUS" = "200" ] && 
   [ "$PROJECT_API_STATUS" = "200" ] && 
   [ "$TASK_API_STATUS" = "200" ] && 
   [ "$COMPANY_API_STATUS" = "200" ]; then
    echo "🎉 所有API测试通过！修复成功！"
    echo ""
    echo "✅ 可以正常使用的功能："
    echo "   - 项目详情页加载和显示"
    echo "   - 企业信息正确显示"
    echo "   - 任务更新和保存"
    echo "   - 项目信息保存"
    echo "   - 用户认证和授权"
    echo ""
    echo "📱 现在可以访问以下页面进行验证："
    echo "   - 项目详情页: http://localhost/projects/39"
    echo "   - 前端API调试: http://localhost/debug-frontend-api.html"
    echo "   - Token调试: http://localhost/debug-token.html"
else
    echo "❌ 部分测试失败，需要进一步检查"
    echo ""
    echo "🔍 建议检查："
    echo "   - 浏览器控制台错误信息"
    echo "   - 网络面板中的实际API请求"
    echo "   - localStorage中的JWT token"
fi

echo ""
echo "📋 相关调试工具："
echo "   - 后端API测试: node debug-api-issues.js"
echo "   - 前端API调试: http://localhost/debug-frontend-api.html"
echo "   - 修复验证脚本: ./fix-verification.sh"