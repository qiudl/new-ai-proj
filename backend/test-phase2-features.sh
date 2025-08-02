#!/bin/bash

# Phase 2统一文档处理器功能测试脚本
# 测试版本管理、高级搜索、批量操作、协作功能

set -e

echo "🚀 ==================================="
echo "   Phase 2统一文档处理器功能测试"
echo "==================================="

# 测试配置
BASE_URL="http://localhost:8080/api/v1"
PROJECT_ID=1
TASK_ID=1
USER_ID=1

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印函数
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# 检查服务状态
check_service() {
    print_info "检查服务状态..."
    
    # 禁用代理
    export NO_PROXY=localhost,127.0.0.1
    
    # 检查后端服务
    HEALTH_STATUS=$(curl -s -w "%{http_code}" -o /dev/null http://localhost:8080/health)
    if [ "$HEALTH_STATUS" -eq 200 ]; then
        print_success "后端服务运行正常"
    else
        print_error "后端服务未响应 (HTTP $HEALTH_STATUS)"
        exit 1
    fi
    
    # 检查文档服务健康状态
    DOC_HEALTH=$(curl -s -w "%{http_code}" -o /dev/null http://localhost:8080/documents/health)
    if [ "$DOC_HEALTH" -eq 200 ]; then
        print_success "文档服务运行正常"
    else
        print_error "文档服务未响应 (HTTP $DOC_HEALTH)"
        exit 1
    fi
}

# 获取认证token
get_token() {
    print_info "获取认证token..."
    
    LOGIN_RESPONSE=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d '{"username":"admin","password":"password123"}' \
        "$BASE_URL/auth/login")
    
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    
    if [ -z "$TOKEN" ]; then
        print_error "登录失败"
        echo "Response: $LOGIN_RESPONSE"
        exit 1
    fi
    
    print_success "认证token获取成功"
    export AUTH_TOKEN="$TOKEN"
}

# 测试基础文档CRUD功能
test_basic_crud() {
    echo
    echo "📋 测试基础CRUD功能"
    echo "========================"
    
    # 创建测试文档
    print_info "创建测试文档..."
    
    CREATE_RESPONSE=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{
            "content": "# Phase 2测试文档\n\n这是Phase 2功能测试的基础文档。\n\n## 版本测试\n\n- 版本1: 初始内容\n- 后续会有更多版本\n\n## 搜索测试关键词\n\n- 文档管理\n- 版本控制\n- 搜索功能",
            "format": "markdown"
        }' \
        "$BASE_URL/projects/$PROJECT_ID/tasks/$TASK_ID/documents")
    
    if echo "$CREATE_RESPONSE" | grep -q "success.*true"; then
        print_success "文档创建成功"
    else
        print_error "文档创建失败"
        echo "Response: $CREATE_RESPONSE"
        return 1
    fi
    
    # 读取文档
    print_info "读取文档内容..."
    
    READ_RESPONSE=$(curl -s -X GET \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        "$BASE_URL/projects/$PROJECT_ID/tasks/$TASK_ID/documents")
    
    if echo "$READ_RESPONSE" | grep -q "Phase 2测试文档"; then
        print_success "文档读取成功"
    else
        print_error "文档读取失败"
        echo "Response: $READ_RESPONSE"
        return 1
    fi
    
    # 更新文档 (创建新版本)
    print_info "更新文档内容..."
    
    UPDATE_RESPONSE=$(curl -s -X PUT \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{
            "content": "# Phase 2测试文档 - 版本2\n\n这是Phase 2功能测试的文档，已更新到版本2。\n\n## 版本测试\n\n- 版本1: 初始内容\n- 版本2: 更新内容，添加更多测试关键词\n\n## 搜索测试关键词\n\n- 文档管理\n- 版本控制\n- 搜索功能\n- 批量操作\n- 协作功能\n\n## 新增内容\n\n测试版本比较和搜索功能的关键词。",
            "message": "Phase 2测试: 更新文档到版本2"
        }' \
        "$BASE_URL/projects/$PROJECT_ID/tasks/$TASK_ID/documents")
    
    if echo "$UPDATE_RESPONSE" | grep -q "success.*true"; then
        print_success "文档更新成功"
    else
        print_error "文档更新失败"
        echo "Response: $UPDATE_RESPONSE"
        return 1
    fi
}

# 测试版本管理功能
test_version_management() {
    echo
    echo "🔄 测试版本管理功能"
    echo "========================"
    
    # 获取文档历史
    print_info "获取文档历史..."
    
    HISTORY_RESPONSE=$(curl -s -X GET \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        "$BASE_URL/projects/$PROJECT_ID/tasks/$TASK_ID/documents/history")
    
    if echo "$HISTORY_RESPONSE" | grep -q "hash"; then
        print_success "文档历史获取成功"
        
        # 提取第一个和第二个版本的哈希 (简化版本)
        VERSIONS=$(echo "$HISTORY_RESPONSE" | grep -o '"hash":"[^"]*"' | cut -d'"' -f4 | head -2)
        
        if [ $(echo "$VERSIONS" | wc -l) -ge 2 ]; then
            VERSION1=$(echo "$VERSIONS" | head -1)
            VERSION2=$(echo "$VERSIONS" | tail -1)
            
            print_info "比较版本: $VERSION2 -> $VERSION1"
            
            # 测试版本比较
            COMPARE_RESPONSE=$(curl -s -X GET \
                -H "Authorization: Bearer $AUTH_TOKEN" \
                "$BASE_URL/projects/$PROJECT_ID/tasks/$TASK_ID/documents/compare?from_version=$VERSION2&to_version=$VERSION1")
            
            if echo "$COMPARE_RESPONSE" | grep -q "changes"; then
                print_success "版本比较功能正常"
            else
                print_error "版本比较功能失败"
                echo "Response: $COMPARE_RESPONSE"
            fi
            
            # 测试获取特定版本
            print_info "获取特定版本内容..."
            
            VERSION_RESPONSE=$(curl -s -X GET \
                -H "Authorization: Bearer $AUTH_TOKEN" \
                "$BASE_URL/projects/$PROJECT_ID/tasks/$TASK_ID/documents/version/$VERSION1")
            
            if echo "$VERSION_RESPONSE" | grep -q "content"; then
                print_success "特定版本获取成功"
            else
                print_error "特定版本获取失败"
                echo "Response: $VERSION_RESPONSE"
            fi
        else
            print_error "版本数量不足，无法测试版本比较"
        fi
    else
        print_error "文档历史获取失败"
        echo "Response: $HISTORY_RESPONSE"
    fi
}

# 测试高级搜索功能
test_search_functionality() {
    echo
    echo "🔍 测试高级搜索功能"
    echo "========================"
    
    # 建立文档索引
    print_info "建立文档索引..."
    
    INDEX_RESPONSE=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{}' \
        "$BASE_URL/documents/index")
    
    if echo "$INDEX_RESPONSE" | grep -q "success.*true"; then
        print_success "文档索引建立成功"
    else
        print_info "文档索引建立响应: $INDEX_RESPONSE"
    fi
    
    # 搜索文档
    print_info "搜索关键词: 版本控制..."
    
    SEARCH_RESPONSE=$(curl -s -X GET \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        "$BASE_URL/documents/search?query=版本控制&project_ids=$PROJECT_ID&limit=10")
    
    if echo "$SEARCH_RESPONSE" | grep -q "results"; then
        print_success "文档搜索功能正常"
        
        # 检查是否找到我们的测试文档
        if echo "$SEARCH_RESPONSE" | grep -q "Phase 2"; then
            print_success "搜索结果包含测试文档"
        else
            print_info "搜索结果未包含测试文档，可能需要更多时间建立索引"
        fi
    else
        print_error "文档搜索功能失败"
        echo "Response: $SEARCH_RESPONSE"
    fi
    
    # 测试不同搜索参数
    print_info "测试排序搜索..."
    
    SORT_SEARCH_RESPONSE=$(curl -s -X GET \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        "$BASE_URL/documents/search?query=测试&sort_by=score&sort_order=desc&limit=5")
    
    if echo "$SORT_SEARCH_RESPONSE" | grep -q "results"; then
        print_success "排序搜索功能正常"
    else
        print_error "排序搜索功能失败"
        echo "Response: $SORT_SEARCH_RESPONSE"
    fi
}

# 测试协作功能
test_collaboration_features() {
    echo
    echo "🤝 测试协作功能"
    echo "========================"
    
    # 测试文档锁定
    print_info "锁定文档..."
    
    LOCK_RESPONSE=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{
            "lock_type": "write",
            "ttl": 300
        }' \
        "$BASE_URL/projects/$PROJECT_ID/tasks/$TASK_ID/documents/lock")
    
    if echo "$LOCK_RESPONSE" | grep -q "success.*true"; then
        print_success "文档锁定成功"
        
        # 检查锁定状态
        print_info "检查锁定状态..."
        
        LOCK_STATUS_RESPONSE=$(curl -s -X GET \
            -H "Authorization: Bearer $AUTH_TOKEN" \
            "$BASE_URL/projects/$PROJECT_ID/tasks/$TASK_ID/documents/lock/status")
        
        if echo "$LOCK_STATUS_RESPONSE" | grep -q "is_locked.*true"; then
            print_success "锁定状态检查正常"
            
            # 解锁文档
            print_info "解锁文档..."
            
            UNLOCK_RESPONSE=$(curl -s -X DELETE \
                -H "Authorization: Bearer $AUTH_TOKEN" \
                "$BASE_URL/projects/$PROJECT_ID/tasks/$TASK_ID/documents/lock")
            
            if echo "$UNLOCK_RESPONSE" | grep -q "success.*true"; then
                print_success "文档解锁成功"
            else
                print_error "文档解锁失败"
                echo "Response: $UNLOCK_RESPONSE"
            fi
        else
            print_error "锁定状态检查失败"
            echo "Response: $LOCK_STATUS_RESPONSE"
        fi
    else
        print_error "文档锁定失败"
        echo "Response: $LOCK_RESPONSE"
    fi
}

# 测试批量操作功能
test_batch_operations() {
    echo
    echo "📦 测试批量操作功能"
    echo "========================"
    
    # 批量创建文档
    print_info "批量创建文档..."
    
    BATCH_CREATE_RESPONSE=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{
            "documents": [
                {
                    "project_id": '$PROJECT_ID',
                    "task_id": 2,
                    "content": "# 批量测试文档1\n\n这是批量创建的第一个文档。",
                    "format": "markdown",
                    "user_id": '$USER_ID'
                },
                {
                    "project_id": '$PROJECT_ID',
                    "task_id": 3,
                    "content": "# 批量测试文档2\n\n这是批量创建的第二个文档。",
                    "format": "markdown",
                    "user_id": '$USER_ID'
                }
            ]
        }' \
        "$BASE_URL/documents/batch/create")
    
    if echo "$BATCH_CREATE_RESPONSE" | grep -q "success"; then
        print_success "批量创建文档功能正常"
        
        # 检查创建结果
        SUCCESS_COUNT=$(echo "$BATCH_CREATE_RESPONSE" | grep -o '"success":[0-9]*' | cut -d':' -f2)
        print_info "成功创建 $SUCCESS_COUNT 个文档"
    else
        print_error "批量创建文档失败"
        echo "Response: $BATCH_CREATE_RESPONSE"
    fi
    
    # 测试导出功能
    print_info "测试文档导出..."
    
    EXPORT_RESPONSE=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{
            "project_ids": ['$PROJECT_ID'],
            "format": "json",
            "include_meta": true
        }' \
        "$BASE_URL/documents/export")
    
    if echo "$EXPORT_RESPONSE" | grep -q "file_name"; then
        print_success "文档导出功能正常"
        
        # 获取导出文件信息
        FILE_NAME=$(echo "$EXPORT_RESPONSE" | grep -o '"file_name":"[^"]*"' | cut -d'"' -f4)
        FILE_SIZE=$(echo "$EXPORT_RESPONSE" | grep -o '"size":[0-9]*' | cut -d':' -f2)
        print_info "导出文件: $FILE_NAME (大小: $FILE_SIZE 字节)"
    else
        print_error "文档导出功能失败"
        echo "Response: $EXPORT_RESPONSE"
    fi
}

# 运行所有测试
run_all_tests() {
    echo
    echo "🎯 开始运行所有Phase 2功能测试"
    echo "================================"
    
    # 检查服务
    check_service
    
    # 获取认证
    get_token
    
    # 运行测试
    test_basic_crud
    test_version_management  
    test_search_functionality
    test_collaboration_features
    test_batch_operations
    
    echo
    echo "🎉 ================================"
    echo "   Phase 2功能测试完成"
    echo "================================"
    print_success "所有测试完成，请查看上面的结果"
    echo
    print_info "如果有任何失败的测试，请检查："
    echo "  - 后端服务是否正常运行"
    echo "  - 数据库连接是否正常"
    echo "  - 文件系统权限是否正确"
    echo "  - Git是否已配置"
    echo
}

# 清理测试数据 (可选)
cleanup_test_data() {
    echo
    echo "🧹 清理测试数据..."
    
    # 删除主测试文档
    DELETE_RESPONSE=$(curl -s -X DELETE \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        "$BASE_URL/projects/$PROJECT_ID/tasks/$TASK_ID/documents")
    
    if echo "$DELETE_RESPONSE" | grep -q "success.*true"; then
        print_success "测试数据清理完成"
    else
        print_info "测试数据清理响应: $DELETE_RESPONSE"
    fi
}

# 主程序
main() {
    case "${1:-all}" in
        "basic")
            check_service && get_token && test_basic_crud
            ;;
        "version")
            check_service && get_token && test_version_management
            ;;
        "search")
            check_service && get_token && test_search_functionality
            ;;
        "collaboration")
            check_service && get_token && test_collaboration_features
            ;;
        "batch")
            check_service && get_token && test_batch_operations
            ;;
        "cleanup")
            get_token && cleanup_test_data
            ;;
        "all"|*)
            run_all_tests
            ;;
    esac
}

# 显示使用说明
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Phase 2统一文档处理器功能测试脚本"
    echo
    echo "用法: $0 [选项]"
    echo
    echo "选项:"
    echo "  all           运行所有测试 (默认)"
    echo "  basic         只测试基础CRUD功能"
    echo "  version       只测试版本管理功能"
    echo "  search        只测试搜索功能"
    echo "  collaboration 只测试协作功能"
    echo "  batch         只测试批量操作功能"
    echo "  cleanup       清理测试数据"
    echo "  --help, -h    显示此帮助信息"
    echo
    echo "示例:"
    echo "  $0                # 运行所有测试"
    echo "  $0 basic          # 只测试基础功能"
    echo "  $0 version        # 只测试版本管理"
    echo
    exit 0
fi

# 执行主程序
main "$1"