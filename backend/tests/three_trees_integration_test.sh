#!/bin/bash

# 三棵树功能集成测试脚本
# 测试所有三棵树相关的API端点和权限逻辑

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 测试统计
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# API基础URL
API_BASE_URL="http://localhost:8080/api/v1"

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
    ((PASSED_TESTS++))
    ((TOTAL_TESTS++))
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
    ((FAILED_TESTS++))
    ((TOTAL_TESTS++))
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# 获取Admin用户Token
get_admin_token() {
    log_info "获取Admin用户Token..."
    TOKEN=$(curl -s -X POST "${API_BASE_URL}/auth/dev-quick-login" \
        -H "Content-Type: application/json" \
        -d '{"username":"admin"}' \
        | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

    if [ -z "$TOKEN" ]; then
        log_error "无法获取Admin Token"
        exit 1
    fi
    log_success "Admin Token获取成功"
}

# 测试函数
test_api() {
    local test_name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local expected_status=$5

    log_info "测试: $test_name"

    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" "${API_BASE_URL}${endpoint}")
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "${API_BASE_URL}${endpoint}")
    else
        log_error "不支持的HTTP方法: $method"
        return 1
    fi

    # 分离响应体和状态码
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$status_code" -eq "$expected_status" ]; then
        log_success "$test_name - HTTP $status_code"
        echo "$body"
        return 0
    else
        log_error "$test_name - 期望 HTTP $expected_status, 实际 HTTP $status_code"
        echo "$body"
        return 1
    fi
}

# 主测试流程
main() {
    echo "=========================================="
    echo "      三棵树功能集成测试"
    echo "=========================================="
    echo ""

    # 1. 获取Token
    get_admin_token
    echo ""

    # 2. 测试三棵树概览API
    echo "=========================================="
    echo "测试组 1: 三棵树概览API"
    echo "=========================================="

    test_api "获取三棵树概览" "GET" "/work-note-folders/trees/overview" "" 200
    echo ""

    # 3. 测试Private树API
    echo "=========================================="
    echo "测试组 2: Private树API"
    echo "=========================================="

    test_api "获取Private树根文件夹" "GET" "/work-note-folders/trees/private?max_depth=2" "" 200
    echo ""

    test_api "获取Private树统计" "GET" "/work-note-folders/trees/private/stats" "" 200
    echo ""

    # 4. 测试Team树API
    echo "=========================================="
    echo "测试组 3: Team树API"
    echo "=========================================="

    test_api "获取Team树根文件夹" "GET" "/work-note-folders/trees/team?max_depth=2" "" 200
    echo ""

    test_api "获取Team树统计" "GET" "/work-note-folders/trees/team/stats" "" 200
    echo ""

    # 5. 测试Public树API
    echo "=========================================="
    echo "测试组 4: Public树API"
    echo "=========================================="

    test_api "获取Public树根文件夹" "GET" "/work-note-folders/trees/public?max_depth=2" "" 200
    echo ""

    test_api "获取Public树统计" "GET" "/work-note-folders/trees/public/stats" "" 200
    echo ""

    # 6. 测试创建文件夹API
    echo "=========================================="
    echo "测试组 5: 创建文件夹API"
    echo "=========================================="

    TIMESTAMP=$(date +%s)

    test_api "在Private树中创建文件夹" "POST" "/work-note-folders/trees/private/folders" \
        "{\"name\":\"测试私人文件夹_${TIMESTAMP}\",\"description\":\"测试用私人文件夹\"}" 201
    echo ""

    test_api "在Team树中创建文件夹" "POST" "/work-note-folders/trees/team/folders" \
        "{\"name\":\"测试团队文件夹_${TIMESTAMP}\",\"description\":\"测试用团队文件夹\"}" 201
    echo ""

    test_api "在Public树中创建文件夹" "POST" "/work-note-folders/trees/public/folders" \
        "{\"name\":\"测试公开文件夹_${TIMESTAMP}\",\"description\":\"测试用公开文件夹\"}" 201
    echo ""

    # 7. 测试懒加载
    echo "=========================================="
    echo "测试组 6: 懒加载测试"
    echo "=========================================="

    test_api "Private树懒加载(max_depth=1)" "GET" "/work-note-folders/trees/private?max_depth=1" "" 200
    echo ""

    test_api "Team树懒加载(max_depth=3)" "GET" "/work-note-folders/trees/team?max_depth=3" "" 200
    echo ""

    # 8. 测试边界情况
    echo "=========================================="
    echo "测试组 7: 边界情况测试"
    echo "=========================================="

    test_api "无效树类型" "GET" "/work-note-folders/trees/invalid?max_depth=2" "" 400
    echo ""

    test_api "max_depth为0" "GET" "/work-note-folders/trees/private?max_depth=0" "" 200
    echo ""

    test_api "max_depth超大值" "GET" "/work-note-folders/trees/private?max_depth=100" "" 200
    echo ""

    # 9. 测试概览统计准确性
    echo "=========================================="
    echo "测试组 8: 统计数据准确性"
    echo "=========================================="

    log_info "验证三棵树统计数据一致性..."

    overview=$(curl -s -H "Authorization: Bearer $TOKEN" "${API_BASE_URL}/work-note-folders/trees/overview")

    private_count=$(echo "$overview" | grep -o '"type":"private".*"folder_count":[0-9]*' | grep -o '[0-9]*$')
    team_count=$(echo "$overview" | grep -o '"type":"team".*"folder_count":[0-9]*' | grep -o '[0-9]*$')
    public_count=$(echo "$overview" | grep -o '"type":"public".*"folder_count":[0-9]*' | grep -o '[0-9]*$')

    log_info "Private树文件夹数: $private_count"
    log_info "Team树文件夹数: $team_count"
    log_info "Public树文件夹数: $public_count"

    # 验证概览数据与单树API返回一致
    private_tree=$(curl -s -H "Authorization: Bearer $TOKEN" "${API_BASE_URL}/work-note-folders/trees/private?max_depth=1")
    private_actual=$(echo "$private_tree" | grep -o '"total_count":[0-9]*' | grep -o '[0-9]*$')

    if [ "$private_count" = "$private_actual" ]; then
        log_success "Private树统计数据一致 ($private_count)"
    else
        log_error "Private树统计不一致: 概览=$private_count, 实际=$private_actual"
    fi

    echo ""

    # 10. 输出测试总结
    echo "=========================================="
    echo "           测试总结"
    echo "=========================================="
    echo -e "总测试数: ${BLUE}$TOTAL_TESTS${NC}"
    echo -e "通过: ${GREEN}$PASSED_TESTS${NC}"
    echo -e "失败: ${RED}$FAILED_TESTS${NC}"

    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "\n${GREEN}✓ 所有测试通过!${NC}"
        exit 0
    else
        echo -e "\n${RED}✗ 部分测试失败${NC}"
        exit 1
    fi
}

# 执行主测试
main
