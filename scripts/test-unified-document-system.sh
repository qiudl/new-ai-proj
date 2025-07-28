#!/bin/bash

# Phase 1 统一文档系统测试脚本
# 测试新的任务文档功能集成

set -e

echo "🚀 开始测试Phase 1: 统一文档系统"
echo "=================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
BASE_URL="${BASE_URL:-http://localhost:8080}"
API_BASE="${BASE_URL}/api/v1"

# 测试用户认证信息（临时使用，实际应该从环境变量获取）
USER_ID=1
PROJECT_ID=1
TASK_ID=1

# 辅助函数
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 测试API端点可用性
test_api_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    local expected_status=${4:-200}
    
    log_info "测试 $method $endpoint - $description"
    
    # 添加用户ID头部用于认证（临时方案）
    local response=$(curl -s -w "%{http_code}" -X $method \
        -H "Content-Type: application/json" \
        -H "X-User-ID: $USER_ID" \
        "${API_BASE}${endpoint}" -o /tmp/curl_response 2>/dev/null)
    
    local status_code=${response: -3}
    local body=$(cat /tmp/curl_response 2>/dev/null || echo "")
    
    if [[ "$status_code" == "$expected_status" ]]; then
        log_success "$description - 状态码: $status_code"
        return 0
    else
        log_error "$description - 期望状态码: $expected_status, 实际: $status_code"
        if [[ -n "$body" ]]; then
            echo "响应内容: $body"
        fi
        return 1
    fi
}

# 测试兼容版API
test_legacy_api() {
    echo ""
    log_info "=== 测试兼容版API ==="
    
    # 1. 检查任务文档是否存在
    test_api_endpoint "HEAD" "/projects/$PROJECT_ID/tasks/$TASK_ID/document" "检查任务文档存在性" "404"
    
    # 2. 获取任务文档（可能返回默认模板）
    test_api_endpoint "GET" "/projects/$PROJECT_ID/tasks/$TASK_ID/document" "获取任务文档内容"
    
    # 3. 保存任务文档
    log_info "测试保存任务文档"
    local test_content="# 测试文档\\n\\n这是一个测试文档内容。\\n\\n## 测试时间\\n$(date)"
    
    local save_response=$(curl -s -w "%{http_code}" -X PUT \
        -H "Content-Type: application/json" \
        -H "X-User-ID: $USER_ID" \
        -d "{\"content\": \"$(echo -e "$test_content")\"}" \
        "${API_BASE}/projects/$PROJECT_ID/tasks/$TASK_ID/document" -o /tmp/save_response 2>/dev/null)
    
    local save_status=${save_response: -3}
    if [[ "$save_status" == "200" ]]; then
        log_success "保存任务文档 - 状态码: $save_status"
    else
        log_error "保存任务文档失败 - 状态码: $save_status"
        cat /tmp/save_response 2>/dev/null || true
    fi
    
    # 4. 再次检查文档是否存在
    test_api_endpoint "HEAD" "/projects/$PROJECT_ID/tasks/$TASK_ID/document" "验证文档已创建" "200"
}

# 测试增强版API（如果实现了）
test_advanced_api() {
    echo ""
    log_info "=== 测试增强版API ==="
    
    # 1. 获取任务文档详细信息
    test_api_endpoint "GET" "/projects/$PROJECT_ID/tasks/$TASK_ID/document/advanced" "获取任务文档详细信息"
    
    # 2. 更新任务文档
    log_info "测试更新任务文档（增强版）"
    local update_content="# 更新测试文档\\n\\n这是更新后的文档内容。\\n\\n## 更新时间\\n$(date)"
    
    local update_response=$(curl -s -w "%{http_code}" -X PATCH \
        -H "Content-Type: application/json" \
        -H "X-User-ID: $USER_ID" \
        -d "{\"content\": \"$(echo -e "$update_content")\", \"status\": \"published\"}" \
        "${API_BASE}/projects/$PROJECT_ID/tasks/$TASK_ID/document/advanced" -o /tmp/update_response 2>/dev/null)
    
    local update_status=${update_response: -3}
    if [[ "$update_status" == "200" ]]; then
        log_success "更新任务文档（增强版）- 状态码: $update_status"
    else
        log_warning "更新任务文档（增强版）- 状态码: $update_status（可能尚未实现）"
    fi
}

# 测试任务文档列表API
test_document_list_api() {
    echo ""
    log_info "=== 测试任务文档列表API ==="
    
    # 1. 获取任务文档列表
    test_api_endpoint "GET" "/task-documents" "获取任务文档列表"
    
    # 2. 获取任务文档统计
    test_api_endpoint "GET" "/task-documents/stats" "获取任务文档统计"
    
    # 3. 按项目筛选
    test_api_endpoint "GET" "/task-documents?project_id=$PROJECT_ID" "按项目筛选任务文档"
}

# 测试前端集成
test_frontend_integration() {
    echo ""
    log_info "=== 测试前端集成 ==="
    
    # 检查前端文件是否存在
    local frontend_path="/Users/johnqiu/coding/www/projects/new-ai-proj/frontend/src"
    
    if [[ -f "$frontend_path/components/TaskDocumentEditor.tsx" ]]; then
        log_success "TaskDocumentEditor组件已启用"
    else
        log_error "TaskDocumentEditor组件不存在"
    fi
    
    # 检查任务详情页是否已集成
    if grep -q "import TaskDocumentEditor" "$frontend_path/pages/TaskDetailPageNew.tsx" 2>/dev/null; then
        log_success "TaskDetailPageNew已集成TaskDocumentEditor"
    else
        log_error "TaskDetailPageNew未集成TaskDocumentEditor"
    fi
    
    # 检查文档编辑器是否已启用
    if grep -q "TaskDocumentEditor" "$frontend_path/pages/TaskDetailPageNew.tsx" 2>/dev/null && \
       ! grep -q "{/\* <TaskDocumentEditor" "$frontend_path/pages/TaskDetailPageNew.tsx" 2>/dev/null; then
        log_success "TaskDocumentEditor在任务详情页已启用"
    else
        log_warning "TaskDocumentEditor在任务详情页可能仍被注释"
    fi
}

# 数据库检查
test_database_structure() {
    echo ""
    log_info "=== 检查数据库结构 ==="
    
    # 检查必要的表是否存在（这需要数据库连接，暂时跳过）
    log_info "数据库结构检查需要直接数据库连接，暂时跳过"
    log_info "请手动验证以下表存在："
    echo "  - documents"
    echo "  - document_task_relations"
    echo "  - tasks"
    echo "  - projects"
}

# 主测试流程
main() {
    echo "开始Phase 1统一文档系统测试..."
    echo "测试目标URL: $BASE_URL"
    echo "项目ID: $PROJECT_ID, 任务ID: $TASK_ID"
    echo ""
    
    # 检查后端服务是否运行
    if ! curl -s "$BASE_URL/health" > /dev/null 2>&1; then
        log_error "后端服务未运行或无法访问: $BASE_URL"
        log_info "请确保后端服务已启动: docker-compose up -d 或 go run main.go"
        exit 1
    fi
    
    log_success "后端服务运行正常"
    
    # 执行测试
    local failed_tests=0
    
    # 测试兼容版API
    if ! test_legacy_api; then
        ((failed_tests++))
    fi
    
    # 测试增强版API
    if ! test_advanced_api; then
        log_warning "增强版API测试未通过（可能尚未完全实现）"
    fi
    
    # 测试文档列表API
    if ! test_document_list_api; then
        log_warning "文档列表API测试未通过（可能尚未实现）"
    fi
    
    # 测试前端集成
    test_frontend_integration
    
    # 数据库结构检查
    test_database_structure
    
    # 总结
    echo ""
    echo "=================================="
    if [[ $failed_tests -eq 0 ]]; then
        log_success "🎉 Phase 1核心功能测试通过！"
        log_info "✨ 统一文档系统基础功能可用"
    else
        log_warning "⚠️  部分测试未通过，需要进一步调试"
        log_info "失败的测试数量: $failed_tests"
    fi
    
    echo ""
    log_info "🔧 后续建议："
    echo "1. 检查后端服务日志: docker-compose logs -f backend"
    echo "2. 访问前端测试: http://localhost:3000/projects/$PROJECT_ID/tasks/$TASK_ID?tab=document"
    echo "3. 查看数据库状态: docker-compose exec db psql -U user -d main_db"
    echo "4. 如有问题，查看完整日志: docker-compose logs -f"
}

# 清理临时文件
cleanup() {
    rm -f /tmp/curl_response /tmp/save_response /tmp/update_response 2>/dev/null || true
}

# 捕获退出信号并清理
trap cleanup EXIT

# 检查是否提供了帮助参数
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    echo "Phase 1 统一文档系统测试脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "环境变量:"
    echo "  BASE_URL      后端服务地址 (默认: http://localhost:8080)"
    echo ""
    echo "示例:"
    echo "  $0                                    # 使用默认配置测试"
    echo "  BASE_URL=http://localhost:8080 $0    # 指定后端地址"
    echo ""
    exit 0
fi

# 执行主函数
main "$@"