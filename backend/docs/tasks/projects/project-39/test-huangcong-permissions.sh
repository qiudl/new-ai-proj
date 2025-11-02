#!/bin/bash

# ================================================================
# huangcong 企业管理员权限功能测试脚本
# ================================================================
#
# 用途：测试 huangcong 账号的企业管理员权限
# 使用方法：
#   1. 确保后端服务运行在 localhost:8080
#   2. 执行： bash test-huangcong-permissions.sh <huangcong密码>
#
# ================================================================

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
API_BASE="http://localhost:8080/api/v1"
USERNAME="huangcong"
PASSWORD="$1"

# 统计变量
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 检查参数
if [ -z "$PASSWORD" ]; then
    echo -e "${RED}错误：请提供 huangcong 的密码${NC}"
    echo "用法: $0 <password>"
    exit 1
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  huangcong 企业管理员权限测试${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "用户名: $USERNAME"
echo "API地址: $API_BASE"
echo ""

# 辅助函数：测试API
test_api() {
    local test_name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local expected_status="${5:-200}"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "测试 #${TOTAL_TESTS}: ${test_name}... "

    if [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$API_BASE/$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Authorization: Bearer $TOKEN" \
            "$API_BASE/$endpoint")
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" = "$expected_status" ] || [ "$http_code" = "201" ] || [ "$http_code" = "204" ]; then
        echo -e "${GREEN}✓ 通过${NC} (HTTP $http_code)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}✗ 失败${NC} (HTTP $http_code)"
        echo -e "${RED}  响应: $body${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# ================================================================
# 阶段 1: 登录测试
# ================================================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}阶段 1: 登录测试${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 测试1: 登录获取token
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo -n "测试 #${TOTAL_TESTS}: 登录获取Token... "
login_response=$(curl -s -X POST "$API_BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$login_response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('access_token', ''))" 2>/dev/null)

if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
    echo -e "${GREEN}✓ 通过${NC}"
    echo -e "${GREEN}  Token已获取${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}✗ 失败${NC}"
    echo -e "${RED}  登录失败或无法获取Token${NC}"
    echo -e "${RED}  响应: $login_response${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    exit 1
fi

echo ""

# ================================================================
# 阶段 2: 企业管理权限测试
# ================================================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}阶段 2: 企业管理权限测试${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_api "查看企业列表" "GET" "enterprises"
test_api "查看企业详情" "GET" "enterprises/17"  # 企业ID 17

echo ""

# ================================================================
# 阶段 3: 项目管理权限测试
# ================================================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}阶段 3: 项目管理权限测试${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_api "查看企业项目列表" "GET" "enterprises/17/projects?page=1&page_size=10"
test_api "查看项目详情" "GET" "projects/39"

echo ""

# ================================================================
# 阶段 4: 任务管理权限测试
# ================================================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}阶段 4: 任务管理权限测试${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_api "查看项目任务列表" "GET" "enterprises/17/projects/39/tasks?page=1&page_size=10"
test_api "查看任务详情" "GET" "tasks/3240"

echo ""

# ================================================================
# 阶段 5: 成员管理权限测试
# ================================================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}阶段 5: 成员管理权限测试${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_api "查看企业成员列表" "GET" "enterprises/17/users?page=1&page_size=10"
test_api "查看用户详情" "GET" "users/115"

echo ""

# ================================================================
# 阶段 6: 文档管理权限测试
# ================================================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}阶段 6: 文档管理权限测试${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_api "查看企业文档列表" "GET" "enterprises/17/documents?page=1&page_size=10"

echo ""

# ================================================================
# 测试总结
# ================================================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  测试总结${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "总测试数: $TOTAL_TESTS"
echo -e "通过数: ${GREEN}$PASSED_TESTS${NC}"
echo -e "失败数: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ 所有测试通过！${NC}"
    echo -e "${GREEN}  huangcong 拥有完整的企业管理员权限${NC}"
    exit 0
else
    echo ""
    echo -e "${YELLOW}⚠ 部分测试失败${NC}"
    echo -e "${YELLOW}  请查看上面的错误信息${NC}"
    exit 1
fi
