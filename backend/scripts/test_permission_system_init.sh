#!/bin/bash

# 权限系统基础数据初始化测试脚本
# 测试任务 #623: 创建权限系统基础数据初始化

echo "========================================"
echo "权限系统基础数据初始化测试"
echo "========================================"
echo "测试时间: $(date)"
echo

# 设置变量
API_BASE="http://localhost:8080/api/v1"
TOKEN=""  # 需要设置有效的管理员token

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查服务是否运行
check_service() {
    print_info "检查服务状态..."
    if curl -s "$API_BASE/health" > /dev/null; then
        print_success "服务运行正常"
        return 0
    else
        print_error "服务未运行，请先启动服务"
        return 1
    fi
}

# 测试获取权限系统状态
test_permission_system_status() {
    print_info "测试1: 获取权限系统状态"
    
    response=$(curl -s -w "%{http_code}" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        "$API_BASE/system/permissions/status")
    
    http_code="${response: -3}"
    response_body="${response%???}"
    
    if [ "$http_code" == "200" ]; then
        print_success "权限系统状态获取成功 (HTTP $http_code)"
        echo "$response_body" | jq '.' 2>/dev/null || echo "$response_body"
    else
        print_warning "权限系统状态获取失败 (HTTP $http_code)"
        echo "$response_body"
    fi
    echo
}

# 测试权限系统初始化
test_permission_system_init() {
    print_info "测试2: 权限系统基础数据初始化"
    
    response=$(curl -s -w "%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d '{"force_reinit": false}' \
        "$API_BASE/system/permissions/initialize")
    
    http_code="${response: -3}"
    response_body="${response%???}"
    
    if [ "$http_code" == "200" ]; then
        print_success "权限系统初始化成功 (HTTP $http_code)"
        echo "$response_body" | jq '.' 2>/dev/null || echo "$response_body"
    else
        print_error "权限系统初始化失败 (HTTP $http_code)"
        echo "$response_body"
    fi
    echo
}

# 测试获取权限模块列表
test_permission_modules() {
    print_info "测试3: 获取权限模块列表"
    
    response=$(curl -s -w "%{http_code}" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        "$API_BASE/system/permissions/modules")
    
    http_code="${response: -3}"
    response_body="${response%???}"
    
    if [ "$http_code" == "200" ]; then
        print_success "权限模块列表获取成功 (HTTP $http_code)"
        echo "$response_body" | jq '.data.modules | length' 2>/dev/null && echo "模块数量统计完成" || echo "$response_body"
    else
        print_warning "权限模块列表获取失败 (HTTP $http_code)"
        echo "$response_body"
    fi
    echo
}

# 测试获取权限操作类型
test_permission_operation_types() {
    print_info "测试4: 获取权限操作类型列表"
    
    response=$(curl -s -w "%{http_code}" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        "$API_BASE/system/permissions/operation-types")
    
    http_code="${response: -3}"
    response_body="${response%???}"
    
    if [ "$http_code" == "200" ]; then
        print_success "权限操作类型获取成功 (HTTP $http_code)"
        echo "$response_body" | jq '.data.operation_types | length' 2>/dev/null && echo "操作类型统计完成" || echo "$response_body"
    else
        print_warning "权限操作类型获取失败 (HTTP $http_code)"
        echo "$response_body"
    fi
    echo
}

# 测试获取权限编码规范
test_permission_code_rules() {
    print_info "测试5: 获取权限编码规范"
    
    response=$(curl -s -w "%{http_code}" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        "$API_BASE/system/permissions/code-rules")
    
    http_code="${response: -3}"
    response_body="${response%???}"
    
    if [ "$http_code" == "200" ]; then
        print_success "权限编码规范获取成功 (HTTP $http_code)"
        echo "$response_body" | jq '.data.code_rules[0].pattern' 2>/dev/null || echo "$response_body"
    else
        print_warning "权限编码规范获取失败 (HTTP $http_code)"
        echo "$response_body"
    fi
    echo
}

# 测试权限编码验证
test_permission_code_validation() {
    print_info "测试6: 权限编码验证"
    
    # 测试有效编码
    print_info "6.1 测试有效编码: USER_CREATE"
    response=$(curl -s -w "%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d '{"code": "USER_CREATE"}' \
        "$API_BASE/system/permissions/validate-code")
    
    http_code="${response: -3}"
    response_body="${response%???}"
    
    if [ "$http_code" == "200" ]; then
        is_valid=$(echo "$response_body" | jq '.data.valid' 2>/dev/null || echo "false")
        if [ "$is_valid" == "true" ]; then
            print_success "有效权限编码验证通过"
        else
            print_warning "有效权限编码验证失败"
        fi
    else
        print_warning "权限编码验证接口调用失败 (HTTP $http_code)"
    fi
    
    # 测试无效编码
    print_info "6.2 测试无效编码: INVALID_CODE"
    response=$(curl -s -w "%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d '{"code": "INVALID_CODE"}' \
        "$API_BASE/system/permissions/validate-code")
    
    http_code="${response: -3}"
    response_body="${response%???}"
    
    if [ "$http_code" == "200" ]; then
        is_valid=$(echo "$response_body" | jq '.data.valid' 2>/dev/null || echo "true")
        if [ "$is_valid" == "false" ]; then
            print_success "无效权限编码验证通过"
        else
            print_warning "无效权限编码验证失败"
        fi
    else
        print_warning "权限编码验证接口调用失败 (HTTP $http_code)"
    fi
    echo
}

# 测试获取权限统计信息
test_permission_statistics() {
    print_info "测试7: 获取权限统计信息"
    
    response=$(curl -s -w "%{http_code}" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        "$API_BASE/system/permissions/statistics")
    
    http_code="${response: -3}"
    response_body="${response%???}"
    
    if [ "$http_code" == "200" ]; then
        print_success "权限统计信息获取成功 (HTTP $http_code)"
        total_permissions=$(echo "$response_body" | jq '.data.statistics.total_permissions' 2>/dev/null || echo "0")
        system_permissions=$(echo "$response_body" | jq '.data.statistics.system_permissions' 2>/dev/null || echo "0")
        print_info "总权限数: $total_permissions, 系统权限数: $system_permissions"
    else
        print_warning "权限统计信息获取失败 (HTTP $http_code)"
        echo "$response_body"
    fi
    echo
}

# 测试按分类获取权限
test_permissions_by_category() {
    print_info "测试8: 按分类获取权限 (USER_MANAGEMENT)"
    
    response=$(curl -s -w "%{http_code}" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        "$API_BASE/system/permissions/category/USER_MANAGEMENT")
    
    http_code="${response: -3}"
    response_body="${response%???}"
    
    if [ "$http_code" == "200" ]; then
        print_success "分类权限获取成功 (HTTP $http_code)"
        permission_count=$(echo "$response_body" | jq '.data.total_count' 2>/dev/null || echo "0")
        print_info "用户管理权限数量: $permission_count"
    else
        print_warning "分类权限获取失败 (HTTP $http_code)"
        echo "$response_body"
    fi
    echo
}

# 主测试流程
main() {
    echo "开始权限系统基础数据初始化测试..."
    echo
    
    # 检查服务状态
    if ! check_service; then
        exit 1
    fi
    echo
    
    # 检查是否设置了Token
    if [ -z "$TOKEN" ]; then
        print_warning "未设置管理员Token，某些测试可能失败"
        print_info "请设置 TOKEN 变量或使用开发环境的自动Token"
        echo
    fi
    
    # 执行各项测试
    test_permission_system_status
    test_permission_system_init
    test_permission_modules
    test_permission_operation_types
    test_permission_code_rules
    test_permission_code_validation
    test_permission_statistics
    test_permissions_by_category
    
    echo "========================================"
    print_success "权限系统基础数据初始化测试完成"
    echo "========================================"
    echo
    print_info "如果所有测试通过，说明权限系统初始化功能正常工作"
    print_info "如果有测试失败，请检查服务状态和权限配置"
    echo
}

# 运行主程序
main "$@"
