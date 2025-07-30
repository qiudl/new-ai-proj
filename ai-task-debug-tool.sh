#!/bin/bash

# AI任务生成调试工具
# 用于快速测试AI任务生成功能

set -e

# 配置
BASE_URL="http://localhost:8080"
USERNAME="admin"
PASSWORD="password123"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 输出函数
log_info() {
    echo -e "${BLUE}ℹ ${1}${NC}"
}

log_success() {
    echo -e "${GREEN}✓ ${1}${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠ ${1}${NC}"
}

log_error() {
    echo -e "${RED}✗ ${1}${NC}"
}

# 检查服务状态
check_services() {
    log_info "检查服务状态..."
    
    if ! docker-compose ps | grep -q "Up"; then
        log_error "服务未启动，正在启动服务..."
        docker-compose up -d
        sleep 10
    fi
    
    # 检查后端健康状态
    if docker-compose exec backend wget -q -O - http://localhost:8080/health > /dev/null 2>&1; then
        log_success "后端服务正常"
    else
        log_error "后端服务异常"
        exit 1
    fi
}

# 获取认证token
get_auth_token() {
    log_info "获取认证token..."
    
    local response=$(docker-compose exec backend wget -q -O - \
        --post-data='{"username":"'$USERNAME'","password":"'$PASSWORD'"}' \
        --header="Content-Type: application/json" \
        http://localhost:8080/api/v1/auth/login 2>/dev/null || echo "")
    
    if [ -z "$response" ]; then
        log_error "登录失败"
        exit 1
    fi
    
    # 提取token (简单的JSON解析)
    TOKEN=$(echo "$response" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    
    if [ -z "$TOKEN" ]; then
        log_error "无法获取token"
        exit 1
    fi
    
    log_success "获取token成功"
}

# 获取项目列表
get_projects() {
    log_info "获取项目列表..."
    
    local response=$(docker-compose exec backend wget -q -O - \
        --header="Authorization: Bearer $TOKEN" \
        --header="Content-Type: application/json" \
        http://localhost:8080/api/v1/projects 2>/dev/null || echo "")
    
    if [ -z "$response" ]; then
        log_error "获取项目列表失败"
        exit 1
    fi
    
    # 提取第一个项目ID
    PROJECT_ID=$(echo "$response" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
    PROJECT_NAME=$(echo "$response" | grep -o '"name":"[^"]*' | head -1 | cut -d'"' -f4)
    
    if [ -z "$PROJECT_ID" ]; then
        log_error "没有找到可用项目"
        exit 1
    fi
    
    log_success "找到项目: $PROJECT_NAME (ID: $PROJECT_ID)"
}

# 测试AI任务生成
test_ai_task_generation() {
    local input_text="$1"
    local max_tasks="${2:-3}"
    
    log_info "测试AI任务生成..."
    log_info "输入内容: $input_text"
    log_info "最大任务数: $max_tasks"
    
    # 构建请求JSON
    local request_json='{
        "project_id": '$PROJECT_ID',
        "provider": "deepseek",
        "input_text": "'$input_text'",
        "options": {
            "max_tasks": '$max_tasks',
            "enable_duplicate_check": true,
            "enable_dependency_analysis": true,
            "enable_skill_tagging": true
        }
    }'
    
    # 发送请求
    local response=$(docker-compose exec backend wget -q -O - \
        --post-data="$request_json" \
        --header="Authorization: Bearer $TOKEN" \
        --header="Content-Type: application/json" \
        http://localhost:8080/api/v1/system/ai-tasks/generate 2>/dev/null || echo "")
    
    if [ -z "$response" ]; then
        log_error "AI任务生成请求失败"
        return 1
    fi
    
    # 检查响应是否成功
    if echo "$response" | grep -q '"success":true'; then
        log_success "AI任务生成成功!"
        
        # 解析并显示结果
        echo "$response" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    result = data['data']['generation_result']
    print(f'生成任务数: {result[\"total_tasks\"]}')
    print(f'处理时间: {result[\"processing_time_ms\"]}ms')
    print(f'Token使用: {result[\"token_usage\"][\"total_tokens\"]}')
    print(f'质量评分: {result[\"quality_metrics\"][\"overall_score\"]}')
    print()
    for i, task in enumerate(result['generated_tasks'], 1):
        print(f'{i}. {task[\"title\"]}')
        print(f'   描述: {task[\"description\"][:100]}...')
        print(f'   优先级: {task[\"priority\"]}, 预估: {task[\"estimated_hours\"]}小时')
        print()
except Exception as e:
    print(f'解析响应失败: {e}')
" 2>/dev/null || {
            log_warning "无法解析响应详情，原始响应:"
            echo "$response" | head -20
        }
    else
        log_error "AI任务生成失败"
        echo "$response" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print('错误信息:', data.get('error', {}).get('message', '未知错误'))
except:
    print('原始错误响应:', sys.stdin.read()[:500])
" 2>/dev/null || echo "$response"
        return 1
    fi
}

# 主函数
main() {
    echo -e "${BLUE}=== AI任务生成调试工具 ===${NC}"
    echo
    
    check_services
    get_auth_token
    get_projects
    
    # 如果提供了参数，使用参数作为输入
    if [ $# -gt 0 ]; then
        test_ai_task_generation "$1" "$2"
    else
        # 交互式模式
        echo
        log_info "进入交互式模式，输入任务描述（回车结束）:"
        read -r input_text
        
        if [ -n "$input_text" ]; then
            echo
            log_info "输入最大任务数（默认3）:"
            read -r max_tasks
            max_tasks=${max_tasks:-3}
            
            echo
            test_ai_task_generation "$input_text" "$max_tasks"
        else
            log_warning "未输入任务描述，使用默认测试"
            test_ai_task_generation "开发一个用户登录功能，包括表单验证和错误处理" 3
        fi
    fi
}

# 显示帮助信息
show_help() {
    echo "用法: $0 [任务描述] [最大任务数]"
    echo
    echo "示例:"
    echo "  $0                                           # 交互式模式"
    echo "  $0 \"开发用户注册功能\" 5                        # 直接指定任务"
    echo "  $0 \"实现文件上传和处理\" 4                      # 指定任务和数量"
    echo
    echo "环境变量:"
    echo "  BASE_URL    - API基础URL (默认: http://localhost:8080)"
    echo "  USERNAME    - 登录用户名 (默认: admin)"
    echo "  PASSWORD    - 登录密码 (默认: password123)"
}

# 检查参数
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_help
    exit 0
fi

# 运行主函数
main "$@"