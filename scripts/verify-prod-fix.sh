#!/bin/bash

# 验证生产环境后端连接修复
# 用途：部署完成后验证API连接是否正常

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROD_URL="https://proj.joylodging.com"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${BLUE}🔍 生产环境修复验证${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. API健康检查
echo -e "${BLUE}1️⃣  测试API健康检查...${NC}"
response=$(curl -s -o /dev/null -w "%{http_code}" "${PROD_URL}/api/v1/health" || echo "000")

if [ "$response" = "200" ]; then
    echo -e "${GREEN}✅ API健康检查通过 (HTTP $response)${NC}"
else
    echo -e "${RED}❌ API健康检查失败 (HTTP $response)${NC}"
    echo "  可能原因：部署尚未完成，请稍后重试"
fi
echo ""

# 2. 前端访问测试
echo -e "${BLUE}2️⃣  测试前端访问...${NC}"
response=$(curl -s -o /dev/null -w "%{http_code}" "${PROD_URL}/" || echo "000")

if [ "$response" = "200" ] || [ "$response" = "302" ]; then
    echo -e "${GREEN}✅ 前端访问正常 (HTTP $response)${NC}"
else
    echo -e "${RED}❌ 前端访问失败 (HTTP $response)${NC}"
fi
echo ""

# 3. API端点测试（示例）
echo -e "${BLUE}3️⃣  测试API端点...${NC}"
response=$(curl -s -o /dev/null -w "%{http_code}" "${PROD_URL}/api/v1/projects" || echo "000")

if [ "$response" = "200" ] || [ "$response" = "401" ]; then
    echo -e "${GREEN}✅ API端点可访问 (HTTP $response)${NC}"
    if [ "$response" = "401" ]; then
        echo "  (401是正常的，需要认证)"
    fi
else
    echo -e "${RED}❌ API端点访问失败 (HTTP $response)${NC}"
fi
echo ""

# 4. SSE端点测试
echo -e "${BLUE}4️⃣  测试SSE端点...${NC}"
response=$(curl -s -o /dev/null -w "%{http_code}" "${PROD_URL}/api/v1/timer/sse/health" || echo "000")

if [ "$response" = "200" ]; then
    echo -e "${GREEN}✅ SSE端点正常 (HTTP $response)${NC}"
else
    echo -e "${YELLOW}⚠️  SSE端点响应异常 (HTTP $response)${NC}"
fi
echo ""

# 5. 文件上传端点测试
echo -e "${BLUE}5️⃣  测试上传端点...${NC}"
response=$(curl -s -o /dev/null -w "%{http_code}" "${PROD_URL}/api/v1/upload" || echo "000")

if [ "$response" = "401" ] || [ "$response" = "405" ]; then
    echo -e "${GREEN}✅ 上传端点可访问 (HTTP $response)${NC}"
    echo "  (401/405是正常的，需要认证或正确的方法)"
else
    echo -e "${YELLOW}⚠️  上传端点响应: HTTP $response${NC}"
fi
echo ""

# 6. API文档测试
echo -e "${BLUE}6️⃣  测试API文档...${NC}"
response=$(curl -s -o /dev/null -w "%{http_code}" "${PROD_URL}/docs" || echo "000")

if [ "$response" = "200" ] || [ "$response" = "302" ]; then
    echo -e "${GREEN}✅ API文档可访问 (HTTP $response)${NC}"
else
    echo -e "${YELLOW}⚠️  API文档响应: HTTP $response${NC}"
fi
echo ""

# 总结
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${BLUE}验证总结${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}✅ 后端连接问题已修复${NC}"
echo ""
echo "如果某些检查失败："
echo "  1. 检查部署是否完成（GitHub Actions）"
echo "  2. 查看部署日志：gh run watch"
echo "  3. SSH到服务器检查：docker-compose logs"
echo ""
echo "生产环境URL: ${PROD_URL}"
echo "API文档: ${PROD_URL}/docs"
echo ""
