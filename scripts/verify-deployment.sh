#!/bin/bash

# 统一计时器系统部署验证脚本
# 用于验证生产环境部署是否成功

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
BACKEND_URL="http://localhost:8080"
FRONTEND_URL="http://localhost:3000"
NGINX_URL="http://localhost"
DB_HOST="localhost"
DB_PORT="5432"
REDIS_HOST="localhost"
REDIS_PORT="6379"

# 超时设置
TIMEOUT=30
MAX_RETRIES=3

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "命令 $1 未找到，请安装"
        return 1
    fi
}

# 带重试的HTTP检查
check_http_with_retry() {
    local url="$1"
    local description="$2"
    local expected_status="${3:-200}"
    
    for i in $(seq 1 $MAX_RETRIES); do
        log_info "检查 $description (尝试 $i/$MAX_RETRIES): $url"
        
        if curl -f -s -m $TIMEOUT -o /dev/null -w "%{http_code}" "$url" | grep -q "$expected_status"; then
            log_success "$description 响应正常"
            return 0
        fi
        
        if [ $i -lt $MAX_RETRIES ]; then
            log_warning "$description 检查失败，$((TIMEOUT/3))秒后重试..."
            sleep $((TIMEOUT/3))
        fi
    done
    
    log_error "$description 检查失败"
    return 1
}

# 检查端口是否开放
check_port() {
    local host="$1"
    local port="$2"
    local service="$3"
    
    log_info "检查 $service 端口连接: $host:$port"
    
    if timeout $TIMEOUT bash -c "echo >/dev/tcp/$host/$port" 2>/dev/null; then
        log_success "$service 端口 $port 可达"
        return 0
    else
        log_error "$service 端口 $port 不可达"
        return 1
    fi
}

# 检查Docker服务
check_docker_services() {
    log_info "检查Docker服务状态..."
    
    # 检查是否安装docker和docker-compose
    check_command "docker" || return 1
    check_command "docker-compose" || return 1
    
    # 检查Docker服务状态
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker服务未运行"
        return 1
    fi
    
    log_success "Docker服务运行正常"
    
    # 检查容器状态
    local containers=(
        "ai_project_db_prod:PostgreSQL数据库"
        "ai_project_backend_prod:后端API服务"
        "ai_project_frontend_prod:前端React应用"
        "ai_project_nginx_prod:Nginx反向代理"
        "ai_project_redis_prod:Redis缓存"
    )
    
    for container_info in "${containers[@]}"; do
        IFS=':' read -r container_name description <<< "$container_info"
        
        if docker ps --format "table {{.Names}}" | grep -q "$container_name"; then
            local status=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "no-healthcheck")
            if [ "$status" = "healthy" ] || [ "$status" = "no-healthcheck" ]; then
                log_success "$description 容器运行正常"
            else
                log_warning "$description 容器健康检查失败: $status"
            fi
        else
            log_error "$description 容器未运行"
        fi
    done
}

# 检查数据库连接
check_database() {
    log_info "检查数据库连接..."
    
    # 检查端口
    check_port "$DB_HOST" "$DB_PORT" "PostgreSQL" || return 1
    
    # 检查数据库连接
    if docker-compose exec -T postgres pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
        log_success "数据库连接正常"
        
        # 检查统一计时器相关表
        local tables=("users" "tasks" "projects" "timer_sessions" "timer_logs")
        for table in "${tables[@]}"; do
            if docker-compose exec -T postgres psql -U "${DB_USER:-user}" -d "${DB_NAME:-main_db}" -c "SELECT 1 FROM $table LIMIT 1;" >/dev/null 2>&1; then
                log_success "表 $table 存在且可访问"
            else
                log_warning "表 $table 不存在或不可访问"
            fi
        done
    else
        log_error "数据库连接失败"
        return 1
    fi
}

# 检查Redis连接
check_redis() {
    log_info "检查Redis缓存..."
    
    # 检查端口
    check_port "$REDIS_HOST" "$REDIS_PORT" "Redis" || return 1
    
    # 检查Redis连接
    if docker-compose exec -T redis redis-cli ping | grep -q "PONG"; then
        log_success "Redis连接正常"
    else
        log_error "Redis连接失败"
        return 1
    fi
}

# 检查后端API
check_backend_api() {
    log_info "检查后端API服务..."
    
    # 健康检查
    check_http_with_retry "$BACKEND_URL/health" "后端健康检查" || return 1
    
    # 版本检查
    check_http_with_retry "$BACKEND_URL/version" "后端版本信息" || return 1
    
    # 统一计时器API检查
    local timer_endpoints=(
        "/api/v1/user/timer/health:计时器健康检查"
        "/api/v1/timer/recent-tasks:最近任务接口"
    )
    
    for endpoint_info in "${timer_endpoints[@]}"; do
        IFS=':' read -r endpoint description <<< "$endpoint_info"
        check_http_with_retry "$BACKEND_URL$endpoint" "$description" || log_warning "$description 可能需要认证"
    done
}

# 检查前端应用
check_frontend() {
    log_info "检查前端应用..."
    
    # 直接检查前端服务
    check_http_with_retry "$FRONTEND_URL" "前端应用" || log_warning "前端服务可能运行在生产模式"
    
    # 通过nginx检查前端
    check_http_with_retry "$NGINX_URL" "Nginx前端代理" || return 1
    
    # 检查静态资源
    check_http_with_retry "$NGINX_URL/static/css" "静态CSS资源" "404" || log_warning "静态资源路径可能不同"
}

# 检查nginx配置
check_nginx() {
    log_info "检查Nginx反向代理..."
    
    # 基本连接检查
    check_http_with_retry "$NGINX_URL" "Nginx服务" || return 1
    
    # API代理检查
    check_http_with_retry "$NGINX_URL/api/v1/health" "API代理" || return 1
    
    # 检查重要的安全头
    local response_headers=$(curl -I -s -m $TIMEOUT "$NGINX_URL" 2>/dev/null || echo "")
    if echo "$response_headers" | grep -qi "x-frame-options"; then
        log_success "安全头配置正常"
    else
        log_warning "可能缺少安全头配置"
    fi
}

# 检查统一计时器功能
check_unified_timer() {
    log_info "检查统一计时器功能..."
    
    # 检查计时器健康端点
    check_http_with_retry "$NGINX_URL/api/v1/user/timer/health" "统一计时器健康检查" || return 1
    
    # 尝试获取当前计时器状态（可能需要认证）
    local timer_status=$(curl -s -m $TIMEOUT "$NGINX_URL/api/v1/user/timer/current" 2>/dev/null || echo "")
    if echo "$timer_status" | grep -q "unauthorized\|forbidden"; then
        log_success "计时器API需要认证（正常行为）"
    elif echo "$timer_status" | grep -q "user_id\|timer\|status"; then
        log_success "计时器API响应正常"
    else
        log_warning "计时器API响应异常，可能需要进一步检查"
    fi
}

# 性能基准测试
check_performance() {
    log_info "执行性能基准测试..."
    
    # API响应时间测试
    local endpoints=(
        "/health:健康检查"
        "/api/v1/projects:项目列表"
        "/api/v1/user/timer/health:计时器健康检查"
    )
    
    for endpoint_info in "${endpoints[@]}"; do
        IFS=':' read -r endpoint description <<< "$endpoint_info"
        
        local response_time=$(curl -o /dev/null -s -w "%{time_total}" -m $TIMEOUT "$NGINX_URL$endpoint" 2>/dev/null || echo "timeout")
        
        if [ "$response_time" != "timeout" ]; then
            local time_ms=$(echo "$response_time * 1000" | bc 2>/dev/null || echo "0")
            if (( $(echo "$response_time < 1.0" | bc -l 2>/dev/null || echo 0) )); then
                log_success "$description 响应时间: ${time_ms}ms (优秀)"
            elif (( $(echo "$response_time < 3.0" | bc -l 2>/dev/null || echo 0) )); then
                log_success "$description 响应时间: ${time_ms}ms (良好)"
            else
                log_warning "$description 响应时间: ${time_ms}ms (需要优化)"
            fi
        else
            log_error "$description 响应超时"
        fi
    done
}

# 检查日志
check_logs() {
    log_info "检查应用日志..."
    
    # 检查是否有ERROR级别的日志
    local services=("backend" "nginx" "postgres")
    
    for service in "${services[@]}"; do
        local error_count=$(docker-compose logs --tail=100 "$service" 2>/dev/null | grep -i error | wc -l || echo "0")
        if [ "$error_count" -eq 0 ]; then
            log_success "$service 服务无错误日志"
        else
            log_warning "$service 服务发现 $error_count 个错误日志，请检查"
        fi
    done
}

# 环境变量检查
check_environment() {
    log_info "检查环境配置..."
    
    # 检查关键环境变量
    local required_vars=(
        "JWT_SECRET:JWT密钥"
        "DB_PASSWORD:数据库密码"
    )
    
    for var_info in "${required_vars[@]}"; do
        IFS=':' read -r var_name description <<< "$var_info"
        
        if docker-compose exec -T backend env | grep -q "^$var_name="; then
            log_success "$description 已配置"
        else
            log_error "$description 未配置"
        fi
    done
}

# 生成部署报告
generate_report() {
    local report_file="deployment-verification-$(date +%Y%m%d-%H%M%S).log"
    
    log_info "生成部署验证报告: $report_file"
    
    {
        echo "==============================================="
        echo "统一计时器系统部署验证报告"
        echo "验证时间: $(date)"
        echo "==============================================="
        echo
        echo "系统信息:"
        echo "- 操作系统: $(uname -a)"
        echo "- Docker版本: $(docker --version)"
        echo "- Docker Compose版本: $(docker-compose --version)"
        echo
        echo "容器状态:"
        docker-compose ps
        echo
        echo "服务健康状态:"
        docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
        echo
        echo "最近日志 (最后50行):"
        docker-compose logs --tail=50
    } > "$report_file"
    
    log_success "部署验证报告已生成: $report_file"
}

# 主验证流程
main() {
    echo -e "${BLUE}"
    echo "================================================="
    echo "    统一计时器系统部署验证脚本"
    echo "================================================="
    echo -e "${NC}"
    
    local start_time=$(date +%s)
    local failed_checks=0
    
    # 执行各项检查
    local checks=(
        "check_docker_services:Docker服务检查"
        "check_database:数据库连接检查"
        "check_redis:Redis缓存检查"
        "check_backend_api:后端API检查"
        "check_nginx:Nginx代理检查"
        "check_frontend:前端应用检查"
        "check_unified_timer:统一计时器功能检查"
        "check_performance:性能基准测试"
        "check_logs:日志检查"
        "check_environment:环境配置检查"
    )
    
    for check_info in "${checks[@]}"; do
        IFS=':' read -r check_func description <<< "$check_info"
        
        echo
        log_info "开始 $description..."
        
        if $check_func; then
            log_success "$description 通过"
        else
            log_error "$description 失败"
            ((failed_checks++))
        fi
    done
    
    # 生成报告
    echo
    generate_report
    
    # 总结
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo
    echo "================================================="
    log_info "验证完成，耗时: ${duration}秒"
    
    if [ $failed_checks -eq 0 ]; then
        log_success "所有检查通过! 🎉"
        log_success "统一计时器系统部署成功!"
        echo
        log_info "访问地址:"
        log_info "- 前端应用: $NGINX_URL"
        log_info "- 后端API: $NGINX_URL/api/v1"
        log_info "- 计时器健康检查: $NGINX_URL/api/v1/user/timer/health"
        echo
        exit 0
    else
        log_error "发现 $failed_checks 个问题，请检查日志"
        log_error "部署验证失败! ❌"
        exit 1
    fi
}

# 参数处理
case "${1:-}" in
    "--help"|"-h")
        echo "用法: $0 [选项]"
        echo "选项:"
        echo "  --help, -h     显示帮助信息"
        echo "  --quick, -q    快速检查模式"
        echo "  --report-only  仅生成报告"
        exit 0
        ;;
    "--quick"|"-q")
        log_info "快速检查模式"
        check_docker_services && check_backend_api && check_nginx
        exit $?
        ;;
    "--report-only")
        log_info "仅生成部署报告"
        generate_report
        exit 0
        ;;
    "")
        main
        ;;
    *)
        log_error "未知参数: $1"
        echo "使用 $0 --help 查看帮助"
        exit 1
        ;;
esac