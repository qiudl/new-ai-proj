#!/bin/bash

###############################################################################
# 生产环境API验证脚本
# 用途: 验证生产环境的API连接是否正常
###############################################################################

set -e

# 配置
PROD_HOST="152.136.104.251"
API_BASE="https://${PROD_HOST}/api/v1"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# 测试API端点
test_endpoint() {
    local endpoint=$1
    local description=$2
    local expected_status=${3:-200}

    log_info "测试: $description"

    local response=$(curl -s -k -w "\n%{http_code}" "$API_BASE$endpoint" 2>/dev/null)
    local body=$(echo "$response" | head -n -1)
    local status=$(echo "$response" | tail -n 1)

    if [ "$status" = "$expected_status" ]; then
        log_success "$description - 状态码: $status"
        return 0
    else
        log_error "$description - 期望: $expected_status, 实际: $status"
        echo "  响应: $body" | head -3
        return 1
    fi
}

# 主函数
main() {
    echo "=================================="
    echo "🔍 生产环境API验证工具"
    echo "=================================="
    echo ""
    echo "服务器: $PROD_HOST"
    echo "API基础URL: $API_BASE"
    echo ""

    local passed=0
    local failed=0

    # 测试健康检查
    if test_endpoint "/health" "健康检查端点" 200; then
        ((passed++))
    else
        ((failed++))
    fi

    echo ""

    # 测试认证端点(未登录应该返回401)
    log_info "测试: 认证保护端点"
    local auth_response=$(curl -s -k -w "\n%{http_code}" "$API_BASE/tasks" 2>/dev/null)
    local auth_status=$(echo "$auth_response" | tail -n 1)

    if [ "$auth_status" = "401" ] || [ "$auth_status" = "403" ]; then
        log_success "认证保护正常 - 状态码: $auth_status"
        ((passed++))
    else
        log_error "认证保护异常 - 状态码: $auth_status"
        ((failed++))
    fi

    echo ""

    # 测试Nginx配置
    log_info "检查Nginx配置..."
    local nginx_check=$(ssh -o ConnectTimeout=5 ubuntu@$PROD_HOST \
        "grep -o '172.[0-9]*.[0-9]*.[0-9]*:8080' /home/ubuntu/apps/new-ai-proj/nginx/sites/ai-project.conf | head -1" 2>/dev/null)

    if [ "$nginx_check" = "172.17.0.1:8080" ]; then
        log_success "Nginx后端代理配置正确 - 使用Docker网桥IP: $nginx_check"
        ((passed++))
    elif [ "$nginx_check" = "172.30.0.1:8080" ]; then
        log_error "Nginx后端代理配置错误 - 使用了错误的内部IP: $nginx_check"
        log_warning "需要运行: sed -i 's|172.30.0.1:8080|172.17.0.1:8080|g' /home/ubuntu/apps/new-ai-proj/nginx/sites/ai-project.conf"
        ((failed++))
    else
        log_warning "无法确定Nginx后端代理配置: $nginx_check"
    fi

    # 检查CSP配置
    log_info "检查CSP配置..."
    local csp_check=$(ssh -o ConnectTimeout=5 ubuntu@$PROD_HOST \
        "grep 'connect-src' /home/ubuntu/apps/new-ai-proj/nginx/sites/ai-project.conf" 2>/dev/null)

    if echo "$csp_check" | grep -q "connect-src 'self' wss: ws: https: http:"; then
        log_success "CSP配置正确 - 允许必要的连接"
        ((passed++))
    elif echo "$csp_check" | grep -q "connect-src 'self' wss: https:;"; then
        log_error "CSP配置过于严格 - 会阻止API访问"
        log_warning "需要更新CSP的connect-src指令"
        ((failed++))
    else
        log_warning "无法确定CSP配置"
    fi

    echo ""

    # 测试后端进程
    log_info "检查后端进程..."
    local backend_pid=$(ssh -o ConnectTimeout=5 ubuntu@$PROD_HOST \
        "pgrep -f '/opt/ai-project.*main' || pgrep -f './main'" 2>/dev/null)

    if [ -n "$backend_pid" ]; then
        log_success "后端进程运行中 - PID: $backend_pid"
        ((passed++))
    else
        log_error "后端进程未运行"
        ((failed++))
    fi

    echo ""

    # 测试Docker容器
    log_info "检查关键Docker容器..."
    local containers=$(ssh -o ConnectTimeout=5 ubuntu@$PROD_HOST \
        "docker ps --format '{{.Names}}:{{.Status}}' | grep -E '(nginx|frontend|postgres)'" 2>/dev/null)

    if echo "$containers" | grep -q "ai_nginx.*Up"; then
        log_success "Nginx容器运行正常"
        ((passed++))
    else
        log_error "Nginx容器状态异常"
        ((failed++))
    fi

    if echo "$containers" | grep -q "ai_frontend.*Up"; then
        log_success "前端容器运行正常"
        ((passed++))
    else
        log_error "前端容器状态异常"
        ((failed++))
    fi

    echo ""
    echo "=================================="
    echo "验证结果:"
    echo "  ✓ 通过: $passed"
    echo "  ✗ 失败: $failed"
    echo "=================================="
    echo ""

    if [ $failed -eq 0 ]; then
        log_success "🎉 所有检查通过！生产环境运行正常"
        return 0
    else
        log_error "⚠️  发现 $failed 个问题，请检查"
        return 1
    fi
}

# 执行主函数
main "$@"
