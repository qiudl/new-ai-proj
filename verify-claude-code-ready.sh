#!/bin/bash

echo "🎯 Claude Code 集成测试 - 系统验证"
echo "======================================"

# 检查后端API
echo "📡 检查后端 API..."
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health)
if [ "$BACKEND_STATUS" = "200" ]; then
    echo "✅ 后端 API 正常运行"
else
    echo "❌ 后端 API 异常 (状态码: $BACKEND_STATUS)"
    exit 1
fi

# 检查前端
echo "🌐 检查前端界面..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "✅ 前端界面正常运行"
else
    echo "❌ 前端界面异常 (状态码: $FRONTEND_STATUS)"
    exit 1
fi

# 检查数据库连接
echo "🗄️  检查数据库..."
TASK_COUNT=$(docker exec postgres_db psql -U user -d main_db -t -c "SELECT COUNT(*) FROM tasks;" 2>/dev/null | tr -d ' ')
if [ ! -z "$TASK_COUNT" ] && [ "$TASK_COUNT" -gt 0 ]; then
    echo "✅ 数据库连接正常，共有 $TASK_COUNT 个任务"
else
    echo "❌ 数据库连接异常"
    exit 1
fi

# 检查MCP Server进程
echo "⚡ 检查 MCP Server..."
if pgrep -f "mcp-task-bridge/index.js" > /dev/null; then
    echo "✅ MCP Server 正在运行"
else
    echo "❌ MCP Server 未运行"
    exit 1
fi

# 测试API认证
echo "🔑 测试 API 认证..."
TOKEN=$(cd /Users/johnqiu/coding/www/projects/new-ai-proj && node -e "
const { generateJWT } = require('./generate-jwt.js');
const now = Math.floor(Date.now() / 1000);
const payload = {
  user_id: 1,
  username: 'admin',
  role: 'admin',
  user_type: 'admin',
  exp: now + 3600,
  iat: now,
  nbf: now,
  sub: 'admin'
};
const secret = 'dev-secret-key-change-in-production';
function base64UrlEncode(str) {
  return Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
function sign(message, secret) {
  return require('crypto').createHmac('sha256', secret).update(message).digest('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
function generateJWT(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(\`\${encodedHeader}.\${encodedPayload}\`, secret);
  return \`\${encodedHeader}.\${encodedPayload}.\${signature}\`;
}
console.log(generateJWT(payload, secret));
")

API_TEST=$(curl -s "http://localhost:8080/api/v1/projects/1/tasks" -H "Authorization: Bearer $TOKEN" | jq -r '.success')
if [ "$API_TEST" = "true" ]; then
    echo "✅ API 认证测试通过"
else
    echo "❌ API 认证失败"
    exit 1
fi

echo ""
echo "🎉 所有系统检查通过！"
echo "📋 当前任务数量: $TASK_COUNT"
echo "🚀 准备进行 Claude Code 集成测试"
echo ""
echo "📝 测试指令示例："
echo "  - 创建任务：Claude Code 阶段二验证"
echo "  - 看看我的任务列表"
echo "  - 开始执行任务49"
echo "  - 为任务49创建子任务：集成测试验证"
echo ""
echo "🌐 前端界面: http://localhost:3000"
echo "⚡ MCP Server: 运行中，等待 Claude Code 连接"