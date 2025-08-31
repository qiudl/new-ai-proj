#!/bin/bash

echo "========================================="
echo "    测试 dev_quick_login 功能"  
echo "========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}正在调用 dev_quick_login API...${NC}"
echo ""

# 调用 API
RESPONSE=$(curl -s -X POST http://localhost:8081/api/v1/auth/dev/quick-login \
    -H "Content-Type: application/json" \
    -d '{"username": "admin"}' 2>/dev/null)

# 检查响应
if echo "$RESPONSE" | grep -q "access_token"; then
    echo -e "${GREEN}✅ 登录成功！${NC}"
    echo ""
    
    # 提取信息
    USERNAME=$(echo "$RESPONSE" | grep -o '"username":"[^"]*' | sed 's/"username":"//')
    ROLE=$(echo "$RESPONSE" | grep -o '"role":"[^"]*' | sed 's/"role":"//')
    TOKEN=$(echo "$RESPONSE" | grep -o '"access_token":"[^"]*' | sed 's/"access_token":"//')
    
    echo "用户信息："
    echo "  用户名: $USERNAME"
    echo "  角色: $ROLE"
    echo ""
    echo "JWT Token (前60字符):"
    echo "  ${TOKEN:0:60}..."
    echo ""
    
    # 保存 token 到文件
    echo "$TOKEN" > ~/.new-ai-proj-token
    echo -e "${GREEN}Token 已保存到 ~/.new-ai-proj-token${NC}"
    
    echo ""
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}    dev_quick_login 功能测试成功！${NC}"
    echo -e "${GREEN}=========================================${NC}"
    echo ""
    echo "后端 API 路径正确："
    echo "  POST http://localhost:8081/api/v1/auth/dev/quick-login"
    echo ""
    echo "MCP 配置已修复："
    echo "  文件: ~/coding/www/projects/new-ai-proj/mcp-task-bridge/task-mcp.ts"
    echo "  路径: /auth/dev/quick-login"
    echo ""
    echo -e "${YELLOW}注意：${NC}"
    echo "如果 Claude 中仍无法使用 dev_quick_login，请："
    echo "1. 重启 Claude 应用程序"
    echo "2. 等待 MCP 服务自动重新加载"
    echo "3. 再次尝试调用 dev_quick_login"
else
    echo -e "${RED}❌ 登录失败${NC}"
    echo "响应内容："
    echo "$RESPONSE"
    exit 1
fi
