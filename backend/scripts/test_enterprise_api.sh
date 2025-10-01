#!/bin/bash

# Enterprise API 综合测试脚本
# 测试所有Enterprise相关的API端点

set -e

# 配置
BASE_URL="http://localhost:8080/api/v1"
ADMIN_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwidXNlcl90eXBlIjoic3lzdGVtIiwic3ViIjoiYWRtaW4iLCJleHAiOjE3NTc4MDk1OTgsIm5iZiI6MTc1NzIwNDc5OCwiaWF0IjoxNzU3MjA0Nzk4LCJqdGkiOiIyOTk0MDIxYjcxYWIxMDU0YjAwMTY4MjE0NzlkMGY2MiJ9.VORnkUrNxuVrgACEk-tQ6pVbqvIAdPgErNtWdhlhk_o"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 测试计数器
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 测试结果记录
TEST_RESULTS=""

# 函数：打印测试标题
print_section() {
    echo -e "\n${BLUE}══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
}

# 函数：打印测试项
print_test() {
    echo -e "\n${YELLOW}► $1${NC}"
}

# 函数：检查响应并记录结果
check_response() {
    local test_name="$1"
    local response="$2"
    local expected_status="${3:-200}"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    # 获取HTTP状态码（最后3个字符）
    http_status=$(echo "$response" | tail -c 4 | tr -d '\n')
    # 获取响应体（去掉最后的状态码）
    body=$(echo "$response" | sed 's/...$//')
    
    if [ "$http_status" = "$expected_status" ]; then
        echo -e "${GREEN}✓ $test_name - 状态码: $http_status${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        TEST_RESULTS="${TEST_RESULTS}\n${GREEN}✓${NC} $test_name"
        
        # 尝试格式化JSON输出
        if command -v jq &> /dev/null && [ -n "$body" ]; then
            echo "$body" | jq '.' 2>/dev/null || echo "$body"
        else
            echo "$body"
        fi
        return 0
    else
        echo -e "${RED}✗ $test_name - 期望状态码: $expected_status, 实际: $http_status${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        TEST_RESULTS="${TEST_RESULTS}\n${RED}✗${NC} $test_name (期望: $expected_status, 实际: $http_status)"
        echo "响应内容: $body"
        return 1
    fi
}

# 函数：执行API请求
api_request() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    local token="${4:-$ADMIN_TOKEN}"
    
    if [ -z "$data" ]; then
        curl -s -X "$method" \
            "${BASE_URL}${endpoint}" \
            -H "Authorization: Bearer $token" \
            -H "Content-Type: application/json" \
            -w "%{http_code}"
    else
        curl -s -X "$method" \
            "${BASE_URL}${endpoint}" \
            -H "Authorization: Bearer $token" \
            -H "Content-Type: application/json" \
            -d "$data" \
            -w "%{http_code}"
    fi
}

# ═══════════════════════════════════════════════════════════════
# 主测试流程开始
# ═══════════════════════════════════════════════════════════════

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           Enterprise API 综合测试套件                        ║"
echo "║                                                              ║"
echo "║  测试环境: $BASE_URL                                         ║"
echo "║  开始时间: $(date '+%Y-%m-%d %H:%M:%S')                     ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ═══════════════════════════════════════════════════════════════
# 1. 企业CRUD操作测试
# ═══════════════════════════════════════════════════════════════

print_section "1. 企业CRUD操作测试"

# 1.1 创建企业
print_test "创建新企业"
CREATE_DATA='{
  "name": "测试科技有限公司",
  "code": "TEST_TECH_'$(date +%s)'",
  "industry_type": "technology",
  "business_type": "corporation",
  "contact_email": "contact@testtech.com",
  "contact_phone": "13800138000",
  "address": "北京市海淀区中关村",
  "description": "API测试用企业",
  "status": "active"
}'

CREATE_RESPONSE=$(api_request "POST" "/enterprises" "$CREATE_DATA")
if check_response "创建企业" "$CREATE_RESPONSE" "201"; then
    # 提取企业ID
    ENTERPRISE_ID=$(echo "$CREATE_RESPONSE" | sed 's/...$//' | jq -r '.data.id' 2>/dev/null || echo "")
    echo "创建的企业ID: $ENTERPRISE_ID"
fi

# 1.2 获取企业列表
print_test "获取企业列表"
LIST_RESPONSE=$(api_request "GET" "/enterprises")
check_response "获取企业列表" "$LIST_RESPONSE" "200"

# 1.3 获取企业详情
if [ -n "$ENTERPRISE_ID" ]; then
    print_test "获取企业详情 (ID: $ENTERPRISE_ID)"
    DETAIL_RESPONSE=$(api_request "GET" "/enterprises/$ENTERPRISE_ID")
    check_response "获取企业详情" "$DETAIL_RESPONSE" "200"
fi

# 1.4 更新企业
if [ -n "$ENTERPRISE_ID" ]; then
    print_test "更新企业信息"
    UPDATE_DATA='{
      "description": "更新后的企业描述",
      "address": "上海市浦东新区陆家嘴"
    }'
    UPDATE_RESPONSE=$(api_request "PUT" "/enterprises/$ENTERPRISE_ID" "$UPDATE_DATA")
    check_response "更新企业" "$UPDATE_RESPONSE" "200"
fi

# ═══════════════════════════════════════════════════════════════
# 2. 企业用户管理测试
# ═══════════════════════════════════════════════════════════════

if [ -n "$ENTERPRISE_ID" ]; then
    print_section "2. 企业用户管理测试"
    
    # 2.1 创建企业用户
    print_test "创建企业用户"
    USER_DATA='{
      "username": "testuser_'$(date +%s)'",
      "name": "测试用户",
      "email": "testuser@testtech.com",
      "password": "Test123456!",
      "position": "技术经理",
      "department": "研发部",
      "is_primary_contact": false,
      "access_level": 3,
      "status": "active"
    }'
    
    USER_RESPONSE=$(api_request "POST" "/enterprises/$ENTERPRISE_ID/users" "$USER_DATA")
    if check_response "创建企业用户" "$USER_RESPONSE" "201"; then
        USER_ID=$(echo "$USER_RESPONSE" | sed 's/...$//' | jq -r '.data.user.id' 2>/dev/null || echo "")
        echo "创建的用户ID: $USER_ID"
    fi
    
    # 2.2 获取企业用户列表
    print_test "获取企业用户列表"
    USERS_LIST=$(api_request "GET" "/enterprises/$ENTERPRISE_ID/users")
    check_response "获取企业用户列表" "$USERS_LIST" "200"
    
    # 2.3 获取用户详情
    if [ -n "$USER_ID" ]; then
        print_test "获取用户详情"
        USER_DETAIL=$(api_request "GET" "/enterprises/$ENTERPRISE_ID/users/$USER_ID")
        check_response "获取用户详情" "$USER_DETAIL" "200"
        
        # 2.4 更新用户
        print_test "更新用户信息"
        UPDATE_USER='{
          "position": "高级技术经理",
          "access_level": 4
        }'
        UPDATE_USER_RESPONSE=$(api_request "PUT" "/enterprises/$ENTERPRISE_ID/users/$USER_ID" "$UPDATE_USER")
        check_response "更新用户" "$UPDATE_USER_RESPONSE" "200"
    fi
fi

# ═══════════════════════════════════════════════════════════════
# 3. 部门管理测试
# ═══════════════════════════════════════════════════════════════

if [ -n "$ENTERPRISE_ID" ]; then
    print_section "3. 部门管理测试"
    
    # 3.1 创建部门
    print_test "创建部门"
    DEPT_DATA='{
      "name": "研发部",
      "description": "负责产品研发",
      "parent_id": null,
      "status": "active"
    }'
    
    DEPT_RESPONSE=$(api_request "POST" "/enterprises/$ENTERPRISE_ID/departments" "$DEPT_DATA")
    if check_response "创建部门" "$DEPT_RESPONSE" "201"; then
        DEPT_ID=$(echo "$DEPT_RESPONSE" | sed 's/...$//' | jq -r '.data.id' 2>/dev/null || echo "")
        echo "创建的部门ID: $DEPT_ID"
    fi
    
    # 3.2 获取部门列表
    print_test "获取部门列表"
    DEPT_LIST=$(api_request "GET" "/enterprises/$ENTERPRISE_ID/departments")
    check_response "获取部门列表" "$DEPT_LIST" "200"
    
    # 3.3 创建子部门
    if [ -n "$DEPT_ID" ]; then
        print_test "创建子部门"
        SUB_DEPT_DATA='{
          "name": "前端组",
          "description": "负责前端开发",
          "parent_id": '$DEPT_ID',
          "status": "active"
        }'
        
        SUB_DEPT_RESPONSE=$(api_request "POST" "/enterprises/$ENTERPRISE_ID/departments" "$SUB_DEPT_DATA")
        check_response "创建子部门" "$SUB_DEPT_RESPONSE" "201"
    fi
fi

# ═══════════════════════════════════════════════════════════════
# 4. 权限控制测试
# ═══════════════════════════════════════════════════════════════

print_section "4. 权限控制和数据隔离测试"

# 4.1 未认证访问测试
print_test "未认证访问（应返回401）"
UNAUTH_RESPONSE=$(api_request "GET" "/enterprises" "" "")
check_response "未认证访问" "$UNAUTH_RESPONSE" "401"

# 4.2 访问不存在的企业
print_test "访问不存在的企业（应返回404）"
NOTFOUND_RESPONSE=$(api_request "GET" "/enterprises/999999")
check_response "访问不存在的企业" "$NOTFOUND_RESPONSE" "404"

# 4.3 创建企业用户作为测试
if [ -n "$ENTERPRISE_ID" ]; then
    print_test "创建测试企业用户用于权限测试"
    TEST_USER_DATA='{
      "username": "company_user_'$(date +%s)'",
      "name": "企业测试用户",
      "email": "company@testtech.com",
      "password": "Test123456!",
      "position": "管理员",
      "is_primary_contact": true,
      "access_level": 5,
      "status": "active"
    }'
    
    TEST_USER_RESPONSE=$(api_request "POST" "/enterprises/$ENTERPRISE_ID/users" "$TEST_USER_DATA")
    if check_response "创建测试企业用户" "$TEST_USER_RESPONSE" "201"; then
        # 获取企业用户的token
        COMPANY_USERNAME=$(echo "$TEST_USER_RESPONSE" | sed 's/...$//' | jq -r '.data.username' 2>/dev/null || echo "")
        
        # 企业用户登录
        print_test "企业用户登录"
        LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/dev/quick-login" \
            -H "Content-Type: application/json" \
            -d "{\"username\": \"$COMPANY_USERNAME\"}" \
            -w "%{http_code}")
        
        if [ "$(echo "$LOGIN_RESPONSE" | tail -c 4)" = "200" ]; then
            COMPANY_TOKEN=$(echo "$LOGIN_RESPONSE" | sed 's/...$//' | jq -r '.data.access_token' 2>/dev/null || echo "")
            
            if [ -n "$COMPANY_TOKEN" ]; then
                # 4.4 企业用户访问自己的企业
                print_test "企业用户访问自己的企业数据"
                OWN_ENTERPRISE=$(api_request "GET" "/enterprises/$ENTERPRISE_ID" "" "$COMPANY_TOKEN")
                check_response "企业用户访问自己企业" "$OWN_ENTERPRISE" "200"
                
                # 4.5 企业用户访问其他企业（应该失败）
                print_test "企业用户访问其他企业（应返回403）"
                OTHER_ENTERPRISE=$(api_request "GET" "/enterprises/1" "" "$COMPANY_TOKEN")
                check_response "企业用户访问其他企业" "$OTHER_ENTERPRISE" "403"
            fi
        fi
    fi
fi

# ═══════════════════════════════════════════════════════════════
# 5. 数据验证测试
# ═══════════════════════════════════════════════════════════════

print_section "5. 数据验证和错误处理测试"

# 5.1 空数据测试
print_test "创建企业 - 空数据（应返回400）"
EMPTY_DATA='{}'
EMPTY_RESPONSE=$(api_request "POST" "/enterprises" "$EMPTY_DATA")
check_response "空数据创建" "$EMPTY_RESPONSE" "400"

# 5.2 无效数据测试
print_test "创建企业 - 无效数据（应返回400）"
INVALID_DATA='{
  "name": "",
  "code": "",
  "industry_type": "invalid_type"
}'
INVALID_RESPONSE=$(api_request "POST" "/enterprises" "$INVALID_DATA")
check_response "无效数据创建" "$INVALID_RESPONSE" "400"

# 5.3 重复企业代码测试
print_test "创建企业 - 重复代码（应返回409）"
if [ -n "$ENTERPRISE_ID" ]; then
    # 获取已存在的企业代码
    EXISTING_CODE=$(api_request "GET" "/enterprises/$ENTERPRISE_ID" | sed 's/...$//' | jq -r '.data.code' 2>/dev/null || echo "")
    if [ -n "$EXISTING_CODE" ]; then
        DUPLICATE_DATA='{
          "name": "另一个企业",
          "code": "'$EXISTING_CODE'",
          "industry_type": "technology",
          "business_type": "corporation"
        }'
        DUPLICATE_RESPONSE=$(api_request "POST" "/enterprises" "$DUPLICATE_DATA")
        check_response "重复代码创建" "$DUPLICATE_RESPONSE" "409"
    fi
fi

# 5.4 超长字段测试
print_test "创建企业 - 超长字段（应返回400）"
LONG_NAME=$(python3 -c "print('A' * 300)")
LONG_DATA='{
  "name": "'$LONG_NAME'",
  "code": "LONG_TEST",
  "industry_type": "technology",
  "business_type": "corporation"
}'
LONG_RESPONSE=$(api_request "POST" "/enterprises" "$LONG_DATA")
check_response "超长字段创建" "$LONG_RESPONSE" "400"

# 5.5 格式错误的JSON
print_test "创建企业 - 格式错误的JSON（应返回400）"
BAD_JSON_RESPONSE=$(curl -s -X POST \
    "${BASE_URL}/enterprises" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d 'invalid json}' \
    -w "%{http_code}")
check_response "格式错误的JSON" "$BAD_JSON_RESPONSE" "400"

# ═══════════════════════════════════════════════════════════════
# 6. 分页和查询测试
# ═══════════════════════════════════════════════════════════════

print_section "6. 分页和查询功能测试"

# 6.1 分页测试
print_test "分页查询 - 第1页，每页5条"
PAGE_RESPONSE=$(api_request "GET" "/enterprises?page=1&pageSize=5")
check_response "分页查询" "$PAGE_RESPONSE" "200"

# 6.2 搜索测试
print_test "搜索企业 - 按名称"
SEARCH_RESPONSE=$(api_request "GET" "/enterprises?search=测试")
check_response "搜索企业" "$SEARCH_RESPONSE" "200"

# 6.3 状态筛选
print_test "筛选企业 - 按状态"
STATUS_RESPONSE=$(api_request "GET" "/enterprises?status=active")
check_response "状态筛选" "$STATUS_RESPONSE" "200"

# 6.4 排序测试
print_test "排序企业 - 按创建时间倒序"
SORT_RESPONSE=$(api_request "GET" "/enterprises?sortBy=created_at&sortOrder=desc")
check_response "排序查询" "$SORT_RESPONSE" "200"

# ═══════════════════════════════════════════════════════════════
# 7. 性能测试
# ═══════════════════════════════════════════════════════════════

print_section "7. 性能测试"

# 7.1 并发请求测试
print_test "并发请求测试 - 10个并发请求"
echo "发送10个并发请求..."

for i in {1..10}; do
    (
        START_TIME=$(date +%s%N)
        RESPONSE=$(api_request "GET" "/enterprises?page=$i&pageSize=5")
        END_TIME=$(date +%s%N)
        ELAPSED=$((($END_TIME - $START_TIME) / 1000000))
        
        if [ "$(echo "$RESPONSE" | tail -c 4)" = "200" ]; then
            echo "  请求 #$i: ${GREEN}成功${NC} - 响应时间: ${ELAPSED}ms"
        else
            echo "  请求 #$i: ${RED}失败${NC} - 响应时间: ${ELAPSED}ms"
        fi
    ) &
done
wait

# 7.2 大数据量查询测试
print_test "大数据量查询测试 - 查询100条记录"
START_TIME=$(date +%s%N)
LARGE_RESPONSE=$(api_request "GET" "/enterprises?pageSize=100")
END_TIME=$(date +%s%N)
ELAPSED=$((($END_TIME - $START_TIME) / 1000000))

if check_response "大数据量查询" "$LARGE_RESPONSE" "200"; then
    echo "查询100条记录耗时: ${ELAPSED}ms"
fi

# ═══════════════════════════════════════════════════════════════
# 8. 清理测试数据
# ═══════════════════════════════════════════════════════════════

print_section "8. 清理测试数据"

if [ -n "$ENTERPRISE_ID" ]; then
    # 8.1 删除测试用户
    if [ -n "$USER_ID" ]; then
        print_test "删除测试用户"
        DELETE_USER=$(api_request "DELETE" "/enterprises/$ENTERPRISE_ID/users/$USER_ID")
        check_response "删除用户" "$DELETE_USER" "204"
    fi
    
    # 8.2 删除测试企业
    print_test "删除测试企业"
    DELETE_ENTERPRISE=$(api_request "DELETE" "/enterprises/$ENTERPRISE_ID")
    check_response "删除企业" "$DELETE_ENTERPRISE" "204"
    
    # 8.3 验证删除
    print_test "验证企业已删除（应返回404）"
    VERIFY_DELETE=$(api_request "GET" "/enterprises/$ENTERPRISE_ID")
    check_response "验证删除" "$VERIFY_DELETE" "404"
fi

# ═══════════════════════════════════════════════════════════════
# 测试报告
# ═══════════════════════════════════════════════════════════════

print_section "测试报告"

echo -e "\n${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}测试结果汇总:${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "总测试数: ${YELLOW}$TOTAL_TESTS${NC}"
echo -e "成功: ${GREEN}$PASSED_TESTS${NC}"
echo -e "失败: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    SUCCESS_RATE=100
else
    SUCCESS_RATE=$(echo "scale=2; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)
fi

echo -e "成功率: ${YELLOW}${SUCCESS_RATE}%${NC}"

echo -e "\n${BLUE}详细测试结果:${NC}"
echo -e "$TEST_RESULTS"

echo -e "\n${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}测试完成时间: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"

# 根据测试结果设置退出码
if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}✅ 所有测试通过！${NC}"
    exit 0
else
    echo -e "\n${RED}❌ 有 $FAILED_TESTS 个测试失败${NC}"
    exit 1
fi