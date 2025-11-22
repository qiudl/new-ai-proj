#!/bin/bash
# verify-deploy.sh - 部署后验证脚本
# 用法: ./verify-deploy.sh [域名或IP]

set -e

DEPLOY_DIR="/opt/ai-project"
HOST="${1:-localhost}"
PROTOCOL="http"

# 如果是域名且有 SSL，使用 https
if [[ ! "$HOST" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] && [ -f "$DEPLOY_DIR/ssl/fullchain.pem" ]; then
    PROTOCOL="https"
fi

BASE_URL="$PROTOCOL://$HOST"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASSED=0
FAILED=0

check() {
    local name="$1"
    local url="$2"
    local expected="$3"

    echo -n "  检查 $name... "

    RESPONSE=$(curl -sf -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")

    if [ "$RESPONSE" = "$expected" ]; then
        echo -e "${GREEN}✓${NC} ($RESPONSE)"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗${NC} (期望 $expected, 实际 $RESPONSE)"
        FAILED=$((FAILED + 1))
    fi
}

check_content() {
    local name="$1"
    local url="$2"
    local pattern="$3"

    echo -n "  检查 $name... "

    if curl -sf "$url" 2>/dev/null | grep -q "$pattern"; then
        echo -e "${GREEN}✓${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗${NC} (未找到预期内容)"
        FAILED=$((FAILED + 1))
    fi
}

echo ""
echo "=========================================="
echo "🔍 部署验证"
echo "=========================================="
echo "  目标: $BASE_URL"
echo "=========================================="
echo ""

# 1. 基础连接测试
echo -e "${BLUE}[1/4] 基础连接${NC}"
check "首页" "$BASE_URL/" "200"
check "健康检查" "$BASE_URL/health" "200"
echo ""

# 2. API 测试
echo -e "${BLUE}[2/4] API 接口${NC}"
check "API 健康检查" "$BASE_URL/api/v1/health" "200"
check "API 根路径" "$BASE_URL/api/v1/" "200"
echo ""

# 3. 静态资源测试
echo -e "${BLUE}[3/4] 静态资源${NC}"
check_content "React 应用" "$BASE_URL/" "<div id=\"root\">"
check "静态资源目录" "$BASE_URL/static/js/" "200"
echo ""

# 4. 服务状态
echo -e "${BLUE}[4/4] 服务状态${NC}"

echo -n "  检查 Backend 进程... "
if pgrep -f "ai-backend" > /dev/null; then
    echo -e "${GREEN}✓${NC} (运行中)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗${NC} (未运行)"
    FAILED=$((FAILED + 1))
fi

echo -n "  检查 Nginx 服务... "
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✓${NC} (运行中)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗${NC} (未运行)"
    FAILED=$((FAILED + 1))
fi

echo -n "  检查 PostgreSQL... "
if systemctl is-active --quiet postgresql; then
    echo -e "${GREEN}✓${NC} (运行中)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗${NC} (未运行)"
    FAILED=$((FAILED + 1))
fi

echo -n "  检查 Redis... "
if systemctl is-active --quiet redis-server; then
    echo -e "${GREEN}✓${NC} (运行中)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗${NC} (未运行)"
    FAILED=$((FAILED + 1))
fi

echo ""
echo "=========================================="
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ 所有验证通过 ($PASSED/$((PASSED + FAILED)))${NC}"
else
    echo -e "${RED}❌ 验证失败: $FAILED 项${NC}"
    echo -e "${GREEN}   通过: $PASSED 项${NC}"
fi
echo "=========================================="

exit $FAILED
