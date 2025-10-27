#!/bin/bash

# 工作笔记权限手动测试脚本
# 用途：验证工作笔记的权限控制是否正确实施

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
BASE_URL="${BASE_URL:-http://localhost:8080}"
API_PREFIX="/api/v1"

# 测试计数器
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 测试结果存储
declare -a FAILED_TEST_NAMES=()

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}工作笔记权限手动测试${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# 打印测试结果
print_result() {
    local test_name=$1
    local expected=$2
    local actual=$3

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    if [ "$expected" == "$actual" ]; then
        echo -e "${GREEN}✓${NC} $test_name"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗${NC} $test_name"
        echo -e "  ${YELLOW}Expected: $expected, Got: $actual${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        FAILED_TEST_NAMES+=("$test_name")
    fi
}

# HTTP请求函数
http_get() {
    local url=$1
    local token=$2
    curl -s -w "\n%{http_code}" -X GET "${BASE_URL}${API_PREFIX}${url}" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json"
}

http_post() {
    local url=$1
    local token=$2
    local data=$3
    curl -s -w "\n%{http_code}" -X POST "${BASE_URL}${API_PREFIX}${url}" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json" \
        -d "$data"
}

http_put() {
    local url=$1
    local token=$2
    local data=$3
    curl -s -w "\n%{http_code}" -X PUT "${BASE_URL}${API_PREFIX}${url}" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json" \
        -d "$data"
}

http_delete() {
    local url=$1
    local token=$2
    curl -s -w "\n%{http_code}" -X DELETE "${BASE_URL}${API_PREFIX}${url}" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json"
}

# 获取HTTP状态码
get_status_code() {
    echo "$1" | tail -n 1
}

# 获取响应体
get_response_body() {
    echo "$1" | head -n -1
}

echo -e "${YELLOW}步骤 1: 准备测试环境${NC}"
echo "正在获取测试用户的认证token..."

# 获取用户1的token
echo -n "  获取用户1 token... "
RESPONSE_USER1=$(http_post "/auth/dev-quick-login" "" '{"username":"test_user1"}')
STATUS_USER1=$(get_status_code "$RESPONSE_USER1")
if [ "$STATUS_USER1" == "200" ]; then
    TOKEN_USER1=$(get_response_body "$RESPONSE_USER1" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    echo -e "${GREEN}✓${NC}"
else
    # 尝试标准登录
    TOKEN_USER1="test_token_user1"
    echo -e "${YELLOW}⚠ 使用默认token${NC}"
fi

# 获取用户2的token
echo -n "  获取用户2 token... "
RESPONSE_USER2=$(http_post "/auth/dev-quick-login" "" '{"username":"test_user2"}')
STATUS_USER2=$(get_status_code "$RESPONSE_USER2")
if [ "$STATUS_USER2" == "200" ]; then
    TOKEN_USER2=$(get_response_body "$RESPONSE_USER2" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    echo -e "${GREEN}✓${NC}"
else
    TOKEN_USER2="test_token_user2"
    echo -e "${YELLOW}⚠ 使用默认token${NC}"
fi

# 获取管理员的token
echo -n "  获取管理员 token... "
RESPONSE_ADMIN=$(http_post "/auth/dev-quick-login" "" '{"username":"admin"}')
STATUS_ADMIN=$(get_status_code "$RESPONSE_ADMIN")
if [ "$STATUS_ADMIN" == "200" ]; then
    TOKEN_ADMIN=$(get_response_body "$RESPONSE_ADMIN" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    echo -e "${GREEN}✓${NC}"
else
    TOKEN_ADMIN="test_token_admin"
    echo -e "${YELLOW}⚠ 使用默认token${NC}"
fi

echo ""
echo -e "${YELLOW}步骤 2: 测试私有笔记权限${NC}"

# 测试2.1: 用户1创建私有笔记
RESPONSE=$(http_post "/work-notes" "$TOKEN_USER1" '{
    "title": "测试私有笔记",
    "content": "这是私有内容",
    "visibility": "private"
}')
STATUS=$(get_status_code "$RESPONSE")
print_result "用户1创建私有笔记" "200" "$STATUS"

if [ "$STATUS" == "200" ] || [ "$STATUS" == "201" ]; then
    PRIVATE_NOTE_ID=$(get_response_body "$RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
    echo "  创建的私有笔记ID: $PRIVATE_NOTE_ID"

    # 测试2.2: 用户1查看自己的私有笔记
    RESPONSE=$(http_get "/work-notes/$PRIVATE_NOTE_ID" "$TOKEN_USER1")
    STATUS=$(get_status_code "$RESPONSE")
    print_result "用户1查看自己的私有笔记" "200" "$STATUS"

    # 测试2.3: 用户2尝试查看用户1的私有笔记
    RESPONSE=$(http_get "/work-notes/$PRIVATE_NOTE_ID" "$TOKEN_USER2")
    STATUS=$(get_status_code "$RESPONSE")
    print_result "用户2不能查看用户1的私有笔记" "403" "$STATUS"

    # 测试2.4: 用户2尝试编辑用户1的私有笔记
    RESPONSE=$(http_put "/work-notes/$PRIVATE_NOTE_ID" "$TOKEN_USER2" '{
        "title": "尝试修改",
        "content": "尝试修改内容"
    }')
    STATUS=$(get_status_code "$RESPONSE")
    print_result "用户2不能编辑用户1的私有笔记" "403" "$STATUS"

    # 测试2.5: 系统管理员尝试编辑用户1的私有笔记
    RESPONSE=$(http_put "/work-notes/$PRIVATE_NOTE_ID" "$TOKEN_ADMIN" '{
        "title": "管理员尝试修改"
    }')
    STATUS=$(get_status_code "$RESPONSE")
    print_result "系统管理员不能编辑他人的私有笔记" "403" "$STATUS"
fi

echo ""
echo -e "${YELLOW}步骤 3: 测试团队笔记权限${NC}"

# 测试3.1: 用户1创建团队笔记
RESPONSE=$(http_post "/work-notes" "$TOKEN_USER1" '{
    "title": "测试团队笔记",
    "content": "团队共享内容",
    "visibility": "team"
}')
STATUS=$(get_status_code "$RESPONSE")
print_result "用户1创建团队笔记" "200" "$STATUS"

if [ "$STATUS" == "200" ] || [ "$STATUS" == "201" ]; then
    TEAM_NOTE_ID=$(get_response_body "$RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
    echo "  创建的团队笔记ID: $TEAM_NOTE_ID"

    # 测试3.2: 用户2查看团队笔记
    RESPONSE=$(http_get "/work-notes/$TEAM_NOTE_ID" "$TOKEN_USER2")
    STATUS=$(get_status_code "$RESPONSE")
    print_result "用户2可以查看团队笔记" "200" "$STATUS"

    # 测试3.3: 用户2尝试编辑团队笔记
    RESPONSE=$(http_put "/work-notes/$TEAM_NOTE_ID" "$TOKEN_USER2" '{
        "title": "尝试修改团队笔记"
    }')
    STATUS=$(get_status_code "$RESPONSE")
    print_result "用户2不能编辑他人创建的团队笔记" "403" "$STATUS"

    # 测试3.4: 用户1编辑自己的团队笔记
    RESPONSE=$(http_put "/work-notes/$TEAM_NOTE_ID" "$TOKEN_USER1" '{
        "title": "更新团队笔记标题"
    }')
    STATUS=$(get_status_code "$RESPONSE")
    print_result "用户1可以编辑自己的团队笔记" "200" "$STATUS"
fi

echo ""
echo -e "${YELLOW}步骤 4: 测试公开笔记权限${NC}"

# 测试4.1: 普通用户尝试创建公开笔记
RESPONSE=$(http_post "/work-notes" "$TOKEN_USER1" '{
    "title": "尝试创建公开笔记",
    "content": "公开内容",
    "visibility": "public"
}')
STATUS=$(get_status_code "$RESPONSE")
print_result "普通用户不能创建公开笔记" "403" "$STATUS"

# 测试4.2: 系统管理员创建公开笔记
RESPONSE=$(http_post "/work-notes" "$TOKEN_ADMIN" '{
    "title": "官方公告",
    "content": "这是一条公开信息",
    "visibility": "public"
}')
STATUS=$(get_status_code "$RESPONSE")
print_result "系统管理员可以创建公开笔记" "200" "$STATUS"

if [ "$STATUS" == "200" ] || [ "$STATUS" == "201" ]; then
    PUBLIC_NOTE_ID=$(get_response_body "$RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
    echo "  创建的公开笔记ID: $PUBLIC_NOTE_ID"

    # 测试4.3: 普通用户查看公开笔记
    RESPONSE=$(http_get "/work-notes/$PUBLIC_NOTE_ID" "$TOKEN_USER1")
    STATUS=$(get_status_code "$RESPONSE")
    print_result "普通用户可以查看公开笔记" "200" "$STATUS"

    # 测试4.4: 普通用户尝试编辑公开笔记
    RESPONSE=$(http_put "/work-notes/$PUBLIC_NOTE_ID" "$TOKEN_USER1" '{
        "title": "尝试修改公告"
    }')
    STATUS=$(get_status_code "$RESPONSE")
    print_result "普通用户不能编辑公开笔记" "403" "$STATUS"

    # 测试4.5: 系统管理员编辑公开笔记
    RESPONSE=$(http_put "/work-notes/$PUBLIC_NOTE_ID" "$TOKEN_ADMIN" '{
        "title": "更新的官方公告"
    }')
    STATUS=$(get_status_code "$RESPONSE")
    print_result "系统管理员可以编辑公开笔记" "200" "$STATUS"
fi

echo ""
echo -e "${YELLOW}步骤 5: 测试文件夹权限${NC}"

# 测试5.1: 用户1在私有树创建文件夹
RESPONSE=$(http_post "/work-note-folders/trees/private/folders" "$TOKEN_USER1" '{
    "name": "私有文件夹测试"
}')
STATUS=$(get_status_code "$RESPONSE")
print_result "用户可以在私有树创建文件夹" "200" "$STATUS"

# 测试5.2: 普通用户尝试在公开树创建文件夹
RESPONSE=$(http_post "/work-note-folders/trees/public/folders" "$TOKEN_USER1" '{
    "name": "尝试创建公开文件夹"
}')
STATUS=$(get_status_code "$RESPONSE")
print_result "普通用户不能在公开树创建文件夹" "403" "$STATUS"

# 测试5.3: 系统管理员在公开树创建文件夹
RESPONSE=$(http_post "/work-note-folders/trees/public/folders" "$TOKEN_ADMIN" '{
    "name": "公开文件夹测试"
}')
STATUS=$(get_status_code "$RESPONSE")
print_result "系统管理员可以在公开树创建文件夹" "200" "$STATUS"

echo ""
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}测试结果总结${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
echo -e "总测试数: ${BLUE}$TOTAL_TESTS${NC}"
echo -e "通过: ${GREEN}$PASSED_TESTS${NC}"
echo -e "失败: ${RED}$FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -gt 0 ]; then
    echo -e "${RED}失败的测试:${NC}"
    for test_name in "${FAILED_TEST_NAMES[@]}"; do
        echo -e "  ${RED}✗${NC} $test_name"
    done
    echo ""
    exit 1
else
    echo -e "${GREEN}✓ 所有测试通过！${NC}"
    echo ""
    exit 0
fi
