#!/bin/bash
# 生产环境部署验证脚本
# 用途: 检查生产环境部署是否成功

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
PROD_DOMAIN="proj.joylodging.com"
DEPLOY_ROOT="/opt/ai-project-cicd"

# ============================================
# 辅助函数
# ============================================
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

check_command() {
    if command -v "$1" &> /dev/null; then
        log_success "$1 已安装"
        return 0
    else
        log_error "$1 未安装"
        return 1
    fi
}

# ============================================
# 检查函数
# ============================================

# 1. 检查Docker容器状态
check_containers() {
    log_info "检查Docker容器状态..."

    local containers=(
        "ai_backend_prod"
        "ai_frontend_prod"
        "ai_postgres_prod"
        "ai_redis_prod"
        "ai_nginx"
    )

    local all_running=true

    for container in "${containers[@]}"; do
        if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
            local status=$(docker inspect --format='{{.State.Status}}' "$container")
            local health=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "none")

            if [ "$status" = "running" ]; then
                if [ "$health" != "none" ]; then
                    if [ "$health" = "healthy" ]; then
                        log_success "$container: running (健康)"
                    else
                        log_warning "$container: running (健康状态: $health)"
                        all_running=false
                    fi
                else
                    log_success "$container: running (无健康检查)"
                fi
            else
                log_error "$container: $status"
                all_running=false
            fi
        else
            log_error "$container: 未运行"
            all_running=false
        fi
    done

    return $([ "$all_running" = true ] && echo 0 || echo 1)
}

# 2. 检查后端健康
check_backend_health() {
    log_info "检查后端健康状态..."

    # 内部健康检查
    if curl -f -s http://localhost:8080/health > /dev/null; then
        log_success "后端健康检查通过 (内部)"
    else
        log_error "后端健康检查失败 (内部)"
        return 1
    fi

    # 外部API检查
    if curl -f -s "https://${PROD_DOMAIN}/api/v1/health" > /dev/null; then
        log_success "后端API可访问 (外部)"
    else
        log_error "后端API不可访问 (外部)"
        return 1
    fi

    return 0
}

# 3. 检查前端访问
check_frontend() {
    log_info "检查前端访问..."

    # 内部检查
    if curl -f -s http://localhost:3000 > /dev/null; then
        log_success "前端可访问 (内部)"
    else
        log_error "前端不可访问 (内部)"
        return 1
    fi

    # 外部检查
    local response=$(curl -s -o /dev/null -w "%{http_code}" "https://${PROD_DOMAIN}/")
    if [ "$response" = "200" ]; then
        log_success "前端可访问 (外部, HTTP $response)"
    else
        log_warning "前端返回 HTTP $response (外部)"
    fi

    return 0
}

# 4. 检查数据库连接
check_database() {
    log_info "检查数据库连接..."

    if docker exec ai_postgres_prod pg_isready -U dev_user -d ai_project_db > /dev/null 2>&1; then
        log_success "数据库连接正常"
    else
        log_error "数据库连接失败"
        return 1
    fi

    return 0
}

# 5. 检查Redis
check_redis() {
    log_info "检查Redis连接..."

    if docker exec ai_redis_prod redis-cli ping > /dev/null 2>&1; then
        log_success "Redis连接正常"
    else
        log_error "Redis连接失败"
        return 1
    fi

    return 0
}

# 6. 检查Nginx配置
check_nginx() {
    log_info "检查Nginx配置..."

    if docker exec ai_nginx nginx -t > /dev/null 2>&1; then
        log_success "Nginx配置正确"
    else
        log_error "Nginx配置错误"
        docker exec ai_nginx nginx -t
        return 1
    fi

    return 0
}

# 7. 检查前端构建的API配置
check_frontend_api_config() {
    log_info "检查前端API配置..."

    local api_url=$(docker exec ai_frontend_prod grep -r "proj.joylodging.com" /usr/share/nginx/html/static/js/ 2>/dev/null | head -1 || echo "")

    if [ -n "$api_url" ]; then
        log_success "前端API URL配置: proj.joylodging.com"
        echo "  示例: ${api_url:0:100}..."
    else
        log_warning "未在前端构建文件中找到API URL配置"
    fi

    return 0
}

# 8. 检查容器日志错误
check_logs() {
    log_info "检查最近的容器日志错误..."

    local containers=("ai_backend_prod" "ai_frontend_prod" "ai_nginx")
    local has_errors=false

    for container in "${containers[@]}"; do
        local error_count=$(docker logs "$container" --since 5m 2>&1 | grep -i "error\|fatal\|panic" | wc -l)

        if [ "$error_count" -gt 0 ]; then
            log_warning "$container: 发现 $error_count 个错误"
            has_errors=true
        else
            log_success "$container: 无错误日志"
        fi
    done

    return $([ "$has_errors" = false ] && echo 0 || echo 1)
}

# 9. 检查磁盘空间
check_disk_space() {
    log_info "检查磁盘空间..."

    local usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')

    if [ "$usage" -lt 80 ]; then
        log_success "磁盘使用率: ${usage}%"
    elif [ "$usage" -lt 90 ]; then
        log_warning "磁盘使用率: ${usage}% (警告)"
    else
        log_error "磁盘使用率: ${usage}% (严重)"
        return 1
    fi

    return 0
}

# 10. 检查内存使用
check_memory() {
    log_info "检查内存使用..."

    local mem_usage=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100}')

    if (( $(echo "$mem_usage < 80" | bc -l) )); then
        log_success "内存使用率: ${mem_usage}%"
    elif (( $(echo "$mem_usage < 90" | bc -l) )); then
        log_warning "内存使用率: ${mem_usage}% (警告)"
    else
        log_error "内存使用率: ${mem_usage}% (严重)"
        return 1
    fi

    return 0
}

# ============================================
# 主函数
# ============================================
main() {
    echo "=================================================="
    echo "  生产环境部署验证"
    echo "  域名: ${PROD_DOMAIN}"
    echo "  时间: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "=================================================="
    echo ""

    local failed_checks=0
    local total_checks=0

    # 运行所有检查
    checks=(
        "check_containers"
        "check_database"
        "check_redis"
        "check_backend_health"
        "check_frontend"
        "check_nginx"
        "check_frontend_api_config"
        "check_logs"
        "check_disk_space"
        "check_memory"
    )

    for check in "${checks[@]}"; do
        total_checks=$((total_checks + 1))
        echo ""
        if ! $check; then
            failed_checks=$((failed_checks + 1))
        fi
    done

    # 汇总结果
    echo ""
    echo "=================================================="
    echo "  验证结果汇总"
    echo "=================================================="
    echo -e "总检查项: $total_checks"
    echo -e "通过: $((total_checks - failed_checks))"
    echo -e "失败: $failed_checks"
    echo ""

    if [ "$failed_checks" -eq 0 ]; then
        log_success "所有检查通过! 生产环境运行正常 ✓"
        echo "=================================================="
        return 0
    else
        log_error "有 $failed_checks 项检查失败! 需要修复 ✗"
        echo "=================================================="
        echo ""
        echo "建议操作:"
        echo "  1. 查看详细日志: docker logs <container_name>"
        echo "  2. 检查服务状态: docker ps -a"
        echo "  3. 重启服务: docker-compose restart <service_name>"
        echo "  4. 查看完整分析: cat ${DEPLOY_ROOT}/docs/PRODUCTION_ISSUE_ANALYSIS.md"
        echo ""
        return 1
    fi
}

# 执行主函数
main "$@"
