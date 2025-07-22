#!/bin/bash

# 企业客户管理功能演示脚本
# 演示主要的企业管理功能

echo "🏢 企业客户管理系统功能演示"
echo "================================"

BASE_URL="http://localhost:8080/api/v1"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的标题
print_title() {
    echo -e "\n${BLUE}📋 $1${NC}"
    echo "----------------------------------------"
}

# 打印成功消息
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# 打印信息
print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# 检查API响应
check_api() {
    if echo "$1" | jq -e '.success' > /dev/null 2>&1; then
        print_success "API调用成功"
        return 0
    else
        echo -e "${RED}❌ API调用失败${NC}"
        return 1
    fi
}

# 1. 获取企业统计数据
print_title "1. 企业统计数据"
stats_response=$(curl -s "$BASE_URL/companies/stats")
if check_api "$stats_response"; then
    echo "$stats_response" | jq -r '
        .data as $data |
        "总企业数: " + ($data.total_companies | tostring) + 
        "\n活跃企业: " + ($data.active_companies | tostring) + 
        "\n潜在企业: " + ($data.potential_companies | tostring) + 
        "\n高优先级企业: " + ($data.high_priority_companies | tostring) + 
        "\n年度合同总额: ¥" + ($data.total_annual_contract_value | tostring) + 
        "\n平均合同金额: ¥" + ($data.average_annual_contract_value | floor | tostring)
    '
fi

# 2. 获取企业列表
print_title "2. 企业列表 (前3家)"
list_response=$(curl -s "$BASE_URL/companies?page=1&page_size=3")
if check_api "$list_response"; then
    echo "$list_response" | jq -r '
        .data.data[] | 
        "• " + .company_name + 
        " (" + .status_text + ", " + .priority_text + ")" + 
        if .annual_contract_value then " - ¥" + (.annual_contract_value | tostring) else "" end
    '
fi

# 3. 搜索企业
print_title "3. 搜索企业 (搜索关键词: '腾讯')"
search_response=$(curl -s "$BASE_URL/companies?search=腾讯")
if check_api "$search_response"; then
    found_count=$(echo "$search_response" | jq '.data.data | length')
    print_info "找到 $found_count 家匹配的企业:"
    echo "$search_response" | jq -r '
        .data.data[] | 
        "• " + .company_name + " - " + .industry + " (" + .status_text + ")"
    '
fi

# 4. 创建新企业
print_title "4. 创建新企业演示"
demo_company='{
    "company_name": "演示企业_'$(date +%s)'",
    "company_code": "DEMO'$(date +%s)'",
    "industry": "软件开发",
    "company_type": "limited_company",
    "status": "potential",
    "priority": "medium",
    "main_email": "demo@example.com",
    "main_phone": "010-12345678",
    "address": "北京市朝阳区演示大厦",
    "city": "北京",
    "province": "北京",
    "annual_contract_value": 200000
}'

create_response=$(curl -s -X POST "$BASE_URL/companies" \
    -H "Content-Type: application/json" \
    -d "$demo_company")

if check_api "$create_response"; then
    company_id=$(echo "$create_response" | jq -r '.data.id')
    company_name=$(echo "$create_response" | jq -r '.data.company_name')
    print_success "成功创建企业: $company_name (ID: $company_id)"
    
    # 5. 获取新创建企业的详情
    print_title "5. 查看新创建企业详情"
    detail_response=$(curl -s "$BASE_URL/companies/$company_id")
    if check_api "$detail_response"; then
        echo "$detail_response" | jq -r '
            .data as $company |
            "企业名称: " + $company.company_name +
            "\n企业代码: " + ($company.company_code // "无") +
            "\n所属行业: " + ($company.industry // "无") +
            "\n企业类型: " + $company.company_type_text +
            "\n当前状态: " + $company.status_text +
            "\n优先级别: " + $company.priority_text +
            "\n联系邮箱: " + ($company.main_email // "无") +
            "\n联系电话: " + ($company.main_phone // "无") +
            "\n注册地址: " + ($company.address // "无") +
            "\n合同金额: ¥" + (if $company.annual_contract_value then ($company.annual_contract_value | tostring) else "0" end) +
            "\n创建时间: " + ($company.created_at | split("T")[0])
        '
    fi
    
    # 6. 更新企业信息
    print_title "6. 更新企业信息演示"
    update_data='{
        "company_name": "'$company_name' (已更新)",
        "company_code": "DEMO'$(date +%s)'",
        "industry": "软件开发",
        "company_type": "limited_company",
        "status": "active",
        "priority": "high",
        "main_email": "updated@example.com",
        "main_phone": "010-87654321",
        "address": "北京市海淀区更新大厦",
        "city": "北京",
        "province": "北京",
        "annual_contract_value": 500000
    }'
    
    update_response=$(curl -s -X PUT "$BASE_URL/companies/$company_id" \
        -H "Content-Type: application/json" \
        -d "$update_data")
    
    if check_api "$update_response"; then
        print_success "企业信息更新成功"
        echo "$update_response" | jq -r '
            .data as $company |
            "更新后状态: " + $company.status_text +
            "\n更新后优先级: " + $company.priority_text +
            "\n新的合同金额: ¥" + ($company.annual_contract_value | tostring)
        '
    fi
    
    # 7. 为企业创建用户
    print_title "7. 企业用户管理演示"
    user_data='{
        "name": "张经理",
        "position": "产品经理",
        "department": "产品部",
        "email": "zhang.manager@example.com",
        "phone": "138-0000-0001",
        "mobile": "138-0000-0001",
        "role": "primary_contact",
        "is_primary_contact": true,
        "can_make_decisions": true,
        "access_level": 4,
        "status": "active",
        "notes": "主要联系人，负责产品决策"
    }'
    
    user_response=$(curl -s -X POST "$BASE_URL/companies/$company_id/users" \
        -H "Content-Type: application/json" \
        -d "$user_data")
    
    if check_api "$user_response"; then
        print_success "成功为企业创建用户"
        echo "$user_response" | jq -r '
            .data as $user |
            "用户姓名: " + $user.name +
            "\n职位部门: " + ($user.position // "无") + " / " + ($user.department // "无") +
            "\n角色类型: " + $user.role_text +
            "\n联系邮箱: " + ($user.email // "无") +
            "\n权限级别: " + $user.access_level_text +
            "\n用户状态: " + $user.status_text
        '
    fi
    
    # 8. 获取企业用户列表
    print_title "8. 查看企业用户列表"
    users_response=$(curl -s "$BASE_URL/companies/$company_id/users")
    if check_api "$users_response"; then
        user_count=$(echo "$users_response" | jq '. | length')
        print_info "该企业共有 $user_count 个用户:"
        echo "$users_response" | jq -r '
            .data[] | 
            "• " + .name + " (" + .role_text + ") - " + (.email // "无邮箱")
        '
    fi
fi

# 9. 按状态筛选企业
print_title "9. 筛选功能演示 - 查看活跃企业"
active_response=$(curl -s "$BASE_URL/companies?status=active")
if check_api "$active_response"; then
    active_count=$(echo "$active_response" | jq '.data.data | length')
    print_info "当前有 $active_count 家活跃企业:"
    echo "$active_response" | jq -r '
        .data.data[] | 
        "• " + .company_name + " - " + .priority_text
    '
fi

# 10. 按优先级筛选企业
print_title "10. 筛选功能演示 - 查看高优先级企业"
high_priority_response=$(curl -s "$BASE_URL/companies?priority=high")
if check_api "$high_priority_response"; then
    high_count=$(echo "$high_priority_response" | jq '.data.data | length')
    print_info "当前有 $high_count 家高优先级企业:"
    echo "$high_priority_response" | jq -r '
        .data.data[] | 
        "• " + .company_name + " (" + .status_text + ")" + 
        if .annual_contract_value then " - ¥" + (.annual_contract_value | tostring) else "" end
    '
fi

# 演示总结
print_title "🎉 演示完成"
echo -e "${GREEN}企业客户管理系统主要功能演示已完成！${NC}"
echo ""
echo "✅ 已演示的功能包括:"
echo "   • 企业统计数据查询"
echo "   • 企业列表展示和分页"
echo "   • 企业搜索功能"
echo "   • 企业信息创建"
echo "   • 企业详情查询"
echo "   • 企业信息更新"
echo "   • 企业用户管理"
echo "   • 按状态和优先级筛选"
echo ""
echo -e "${BLUE}🌐 前端访问地址: http://localhost:3000/companies${NC}"
echo -e "${BLUE}📡 API接口地址: http://localhost:8080/api/v1/companies${NC}"