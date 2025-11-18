#!/bin/bash
# GitHub Actions CI/CD - 健康检查脚本
# 用途：验证部署后的服务是否正常运行

set -e  # 遇到错误立即退出
set -o pipefail  # 管道命令失败时退出

# ============================================
# 配置变量
# ============================================
API_URL="${API_URL:-http://localhost:8080/health}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
MAX_RETRIES=30
RETRY_INTERVAL=2

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ============================================
# 辅助函数
# ============================================
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

# 检查HTTP端点
check_http_endpoint() {
    local url=$1
    local name=$2
    local max_retries=${3:-$MAX_RETRIES}

    log_info "检查 $name: $url"

    for i in $(seq 1 $max_retries); do
        log_info "尝试 $i/$max_retries..."

        # 执行 curl 请求
        response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")

        if [ "$response" = "200" ] || [ "$response" = "302" ]; then
            log_success "$name 检查通过 (HTTP $response)"
            return 0
        fi

        if [ $i -lt $max_retries ]; then
            sleep $RETRY_INTERVAL
        fi
    done

    log_error "$name 检查失败 (HTTP $response)"
    return 1
}

# 检查 Docker 容器状态
check_docker_containers() {
    log_info "检查 Docker 容器状态..."

    local containers=$(docker ps --filter "name=ai-" --format "{{.Names}}")

    if [ -z "$containers" ]; then
        log_error "没有找到运行中的容器"
        return 1
    fi

    local all_healthy=true

    for container in $containers; do
        local status=$(docker inspect --format='{{.State.Status}}' "$container")
        local health=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "no-health-check")

        if [ "$status" = "running" ]; then
            if [ "$health" = "healthy" ] || [ "$health" = "no-health-check" ]; then
                log_success "容器 $container: $status ($health)"
            else
                log_warning "容器 $container: $status (health: $health)"
                all_healthy=false
            fi
        else
            log_error "容器 $container: $status"
            all_healthy=false
        fi
    done

    if [ "$all_healthy" = true ]; then
        return 0
    else
        return 1
    fi
}

# 检查数据库连接
check_database() {
    log_info "检查数据库连接..."

    # 从环境变量读取数据库配置
    if [ -f "/opt/ai-project-cicd/shared/env/.env" ]; then
        source "/opt/ai-project-cicd/shared/env/.env"

        if [ -n "$DB_NAME" ] && [ -n "$DB_USER" ]; then
            if PGPASSWORD="$DB_PASSWORD" psql -h "${DB_HOST:-localhost}" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" &> /dev/null; then
                log_success "数据库连接正常"
                return 0
            else
                log_error "数据库连接失败"
                return 1
            fi
        else
            log_warning "数据库配置不完整，跳过数据库检查"
            return 0
        fi
    else
        log_warning "环境变量文件不存在，跳过数据库检查"
        return 0
    fi
}

# ============================================
# 主健康检查流程
# ============================================
main() {
    log_info "=========================================="
    log_info "开始健康检查"
    log_info "=========================================="

    local check_failed=false

    # 1. 检查 Docker 容器
    log_info "Step 1/4: 检查 Docker 容器..."
    if ! check_docker_containers; then
        check_failed=true
        log_error "Docker 容器检查失败"
    fi

    # 2. 检查后端 API
    log_info "Step 2/4: 检查后端 API..."
    if ! check_http_endpoint "$API_URL" "后端 API"; then
        check_failed=true
        log_error "后端 API 检查失败"
    fi

    # 3. 检查前端（可选）
    log_info "Step 3/4: 检查前端..."
    if ! check_http_endpoint "$FRONTEND_URL" "前端" 10; then
        log_warning "前端检查失败（非致命）"
        # 前端检查失败不标记为致命错误
    fi

    # 4. 检查数据库连接（可选）
    log_info "Step 4/4: 检查数据库连接..."
    if ! check_database; then
        log_warning "数据库检查失败（非致命）"
        # 数据库检查失败不标记为致命错误
    fi

    # 最终结果
    log_info "=========================================="
    if [ "$check_failed" = true ]; then
        log_error "❌ 健康检查失败！"
        log_error "请检查日志以获取更多信息"
        log_info "=========================================="

        # 显示最近的容器日志
        log_info "最近的容器日志："
        docker ps --filter "name=ai-" --format "{{.Names}}" | while read container; do
            echo "=== $container ==="
            docker logs --tail 20 "$container" 2>&1 | tail -10
            echo ""
        done

        exit 1
    else
        log_success "✅ 所有检查通过！"
        log_success "系统运行正常"
        log_info "=========================================="
        exit 0
    fi
}

# 执行主函数
main "$@"
