#!/bin/bash

# MCP SSE连接测试脚本
# 用于验证MCP服务器的SSE连接是否正常工作

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
API_KEY="${MCP_API_KEY:-mcpsk_prod_832138dbb8a001c681e1fb73d56a0d06}"
SERVER_URL="${MCP_SERVER_URL:-https://152.136.104.251}"
HTTP_SERVER_URL="${MCP_HTTP_SERVER_URL:-http://152.136.104.251}"

echo -e "${BLUE}=== MCP SSE连接测试 ===${NC}\n"

# 函数：测试健康检查
test_health() {
    local url=$1
    local name=$2

    echo -e "${YELLOW}测试 $name 健康检查...${NC}"

    response=$(curl -k -s -w "\n%{http_code}" \
        -H "X-API-Key: $API_KEY" \
        "$url/mcp/health" 2>&1 || echo "000")

    http_code=$(echo "$response" | tail -1)
    body=$(echo "$response" | head -n -1)

    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✓ 健康检查成功 (HTTP $http_code)${NC}"
        echo -e "响应: $body\n"
        return 0
    else
        echo -e "${RED}✗ 健康检查失败 (HTTP $http_code)${NC}"
        echo -e "响应: $body\n"
        return 1
    fi
}

# 函数：测试SSE连接
test_sse() {
    local url=$1
    local name=$2

    echo -e "${YELLOW}测试 $name SSE连接...${NC}"

    # 启动SSE连接并在3秒后超时
    timeout 3s curl -k -N -s \
        -H "Accept: text/event-stream" \
        -H "X-API-Key: $API_KEY" \
        "$url/mcp/sse" 2>&1 | head -10 || true

    echo -e "\n${GREEN}✓ SSE连接测试完成${NC}\n"
}

# 函数：测试消息端点
test_message() {
    local url=$1
    local name=$2

    echo -e "${YELLOW}测试 $name 消息端点...${NC}"

    # 注意：实际测试需要有效的sessionId
    response=$(curl -k -s -w "\n%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -H "X-API-Key: $API_KEY" \
        "$url/mcp/message?sessionId=test-session" \
        -d '{"method":"tools/list"}' 2>&1 || echo "000")

    http_code=$(echo "$response" | tail -1)
    body=$(echo "$response" | head -n -1)

    echo -e "HTTP状态码: $http_code"
    echo -e "响应: $body\n"
}

# 主测试流程
main() {
    echo -e "${BLUE}配置信息:${NC}"
    echo -e "  API Key: ${API_KEY:0:20}..."
    echo -e "  HTTPS服务器: $SERVER_URL"
    echo -e "  HTTP服务器: $HTTP_SERVER_URL\n"

    # 测试HTTPS端点
    echo -e "${BLUE}--- 测试HTTPS端点 ---${NC}"
    test_health "$SERVER_URL" "HTTPS" || true
    test_sse "$SERVER_URL" "HTTPS" || true

    echo ""

    # 测试HTTP端点
    echo -e "${BLUE}--- 测试HTTP端点 ---${NC}"
    test_health "$HTTP_SERVER_URL" "HTTP" || true
    test_sse "$HTTP_SERVER_URL" "HTTP" || true

    echo ""

    # 显示诊断信息
    echo -e "${BLUE}--- 诊断信息 ---${NC}"

    # 检查SSL证书
    echo -e "${YELLOW}SSL证书信息:${NC}"
    timeout 3s openssl s_client -connect 152.136.104.251:443 -servername 152.136.104.251 < /dev/null 2>&1 | \
        grep -E '(subject|issuer|Verify return code)' || \
        echo -e "${RED}无法获取SSL证书信息${NC}"

    echo ""

    # 检查网络连接
    echo -e "${YELLOW}网络连接测试:${NC}"
    if ping -c 1 152.136.104.251 >/dev/null 2>&1; then
        echo -e "${GREEN}✓ 可以ping通服务器${NC}"
    else
        echo -e "${RED}✗ 无法ping通服务器${NC}"
    fi

    # 检查端口连通性
    echo -e "\n${YELLOW}端口连通性测试:${NC}"
    for port in 80 443 3100; do
        if timeout 2s bash -c "echo >/dev/tcp/152.136.104.251/$port" 2>/dev/null; then
            echo -e "${GREEN}✓ 端口 $port 开放${NC}"
        else
            echo -e "${RED}✗ 端口 $port 无法连接${NC}"
        fi
    done

    echo ""
    echo -e "${BLUE}=== 测试完成 ===${NC}"
    echo ""
    echo -e "${YELLOW}如果遇到问题，请检查:${NC}"
    echo "  1. 防火墙是否允许访问443端口"
    echo "  2. SSL证书是否正确配置"
    echo "  3. MCP服务容器是否正常运行"
    echo "  4. Nginx配置是否正确"
    echo "  5. API Key是否有效"
    echo ""
    echo -e "${BLUE}查看服务日志:${NC}"
    echo "  docker-compose -f docker-compose.prod.yml logs -f mcp-server-prod"
    echo "  docker-compose -f docker-compose.prod.yml logs -f nginx"
}

# 运行主函数
main
