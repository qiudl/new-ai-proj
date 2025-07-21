#!/bin/bash

# Customer API健康检查测试脚本
echo "🚀 开始Customer API健康检查..."

BASE_URL="http://localhost"
# Test both external and internal access
BACKEND_URL="http://backend:8080"
TOKEN=""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试计数器
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 测试函数
test_api() {
    local test_name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local expected_status="$5"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "\n📝 测试: ${test_name}"
    echo "   请求: ${method} ${endpoint}"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "${BASE_URL}${endpoint}")
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}${endpoint}" \
            -H "Content-Type: application/json" \
            -d "$data")
    elif [ "$method" = "PUT" ]; then
        response=$(curl -s -w "\n%{http_code}" -X PUT "${BASE_URL}${endpoint}" \
            -H "Content-Type: application/json" \
            -d "$data")
    else
        response=$(curl -s -w "\n%{http_code}" -X "${method}" "${BASE_URL}${endpoint}")
    fi
    
    status_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | head -n -1)
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "   ✅ ${GREEN}通过${NC} (状态码: $status_code)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        
        # 显示响应数据（只显示前200字符）
        if [ ${#response_body} -gt 200 ]; then
            echo "   📄 响应: $(echo "$response_body" | cut -c1-200)..."
        else
            echo "   📄 响应: $response_body"
        fi
    else
        echo -e "   ❌ ${RED}失败${NC} (期望: $expected_status, 实际: $status_code)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo "   📄 错误响应: $response_body"
    fi
}

# 测试健康检查
echo -e "\n🔍 步骤1: 基础健康检查"
test_api "后端健康检查" "GET" "/health" "" "200"
test_api "API版本信息" "GET" "/version" "" "200"

# 测试Customer API端点
echo -e "\n👥 步骤2: Customer API基础测试"
test_api "获取客户列表(无分页参数)" "GET" "/api/v1/customers" "" "400"
test_api "获取客户列表(带分页参数)" "GET" "/api/v1/customers?page=1&page_size=10" "" "200"
test_api "获取客户统计信息" "GET" "/api/v1/customers/stats" "" "200"

# 测试单个客户操作
echo -e "\n🔍 步骤3: 单个客户操作测试"
test_api "获取不存在的客户" "GET" "/api/v1/customers/999999" "" "404"
test_api "获取现有客户(ID=1)" "GET" "/api/v1/customers/1" "" "200"

# 测试客户CRUD操作
echo -e "\n📝 步骤4: 客户CRUD操作测试"

# 创建客户测试数据
create_customer_data='{
  "name": "测试客户",
  "company": "测试公司",
  "industry": "软件",
  "contact_person": "张测试",
  "email": "test@example.com",
  "phone": "13800000000",
  "address": "测试地址",
  "status": "potential",
  "priority": "medium"
}'

test_api "创建新客户" "POST" "/api/v1/customers" "$create_customer_data" "201"

# 测试客户联系记录
echo -e "\n📞 步骤5: 客户联系记录测试"
test_api "获取客户联系记录" "GET" "/api/v1/customers/1/contacts?page=1&page_size=10" "" "200"

# 创建联系记录测试数据
create_contact_data='{
  "contact_type": "email",
  "subject": "测试联系",
  "content": "这是一个测试联系记录",
  "status": "planned"
}'

test_api "创建客户联系记录" "POST" "/api/v1/customers/1/contacts" "$create_contact_data" "201"

# 测试过滤和搜索
echo -e "\n🔍 步骤6: 过滤和搜索测试"
test_api "按状态过滤客户" "GET" "/api/v1/customers?page=1&page_size=10&status=active" "" "200"
test_api "按优先级过滤客户" "GET" "/api/v1/customers?page=1&page_size=10&priority=high" "" "200"
test_api "搜索客户" "GET" "/api/v1/customers?page=1&page_size=10&search=阿里" "" "200"

# 测试错误处理
echo -e "\n🚫 步骤7: 错误处理测试"
test_api "无效的分页参数" "GET" "/api/v1/customers?page=0&page_size=0" "" "400"
test_api "超大分页参数" "GET" "/api/v1/customers?page=1&page_size=1000" "" "400"

# 测试前端相关端点
echo -e "\n🌐 步骤8: 前端页面测试"
test_api "前端根页面" "GET" "/" "" "200"

# 汇总结果
echo -e "\n" 
echo "===================="
echo "🏁 测试汇总结果"
echo "===================="
echo -e "总测试数: ${TOTAL_TESTS}"
echo -e "${GREEN}通过: ${PASSED_TESTS}${NC}"
echo -e "${RED}失败: ${FAILED_TESTS}${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n🎉 ${GREEN}所有测试通过！Customer API健康状况良好。${NC}"
    exit 0
else
    echo -e "\n⚠️  ${YELLOW}发现 ${FAILED_TESTS} 个问题需要修复。${NC}"
    exit 1
fi