#!/bin/bash

# 生产环境健康检查脚本
# 用于监控腾讯云服务器上的AI项目服务状态

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[✅ OK]${NC} $1"; }
warning() { echo -e "${YELLOW}[⚠️  WARN]${NC} $1"; }
error() { echo -e "${RED}[❌ ERROR]${NC} $1"; }

# 配置变量
APP_DIR="/opt/ai-project"
COMPOSE_FILE="docker-compose.prod.yml"
LOG_FILE="/opt/ai-project/logs/health-check.log"

# 创建日志文件
mkdir -p "$(dirname "$LOG_FILE")"
touch "$LOG_FILE"

# 记录日志
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# 检查Docker服务
check_docker() {
    info "检查Docker服务状态..."
    
    if systemctl is-active --quiet docker; then
        success "Docker服务运行正常"
        log "Docker服务状态: 正常"
        return 0
    else
        error "Docker服务未运行"
        log "Docker服务状态: 异常"
        return 1
    fi
}

# 检查容器状态
check_containers() {
    info "检查容器状态..."
    
    cd "$APP_DIR"
    
    # 获取容器状态
    local containers=$(docker-compose -f "$COMPOSE_FILE" ps --format "table {{.Name}}\t{{.State}}\t{{.Status}}")
    
    if [ -z "$containers" ]; then
        error "没有找到运行的容器"
        log "容器状态: 没有容器运行"
        return 1
    fi
    
    # 检查每个容器
    local failed_containers=0
    
    while IFS= read -r line; do
        if [[ "$line" == *"Up"* ]]; then
            success "容器状态正常: $line"
        elif [[ "$line" != "NAME"* ]] && [[ "$line" != *"---"* ]]; then
            error "容器状态异常: $line"
            ((failed_containers++))
        fi
    done <<< "$containers"
    
    log "容器检查完成: $failed_containers 个容器异常"
    
    if [ "$failed_containers" -eq 0 ]; then
        return 0
    else
        return 1
    fi
}

# 检查网络连接
check_network() {
    info "检查网络连接..."
    
    # 检查前端
    if curl -f -s http://localhost:80 >/dev/null 2>&1; then
        success "前端服务 (端口80) 响应正常"
        log "前端服务状态: 正常"
    else
        error "前端服务 (端口80) 无响应"
        log "前端服务状态: 异常"
        return 1
    fi
    
    # 检查后端API
    if curl -f -s http://localhost:8080/health >/dev/null 2>&1; then
        success "后端API (端口8080) 响应正常"
        log "后端API状态: 正常"
    else
        error "后端API (端口8080) 无响应"
        log "后端API状态: 异常"
        return 1
    fi
    
    # 检查数据库连接
    if docker exec ai_postgres_prod pg_isready -U prod_user -d ai_project_prod_db >/dev/null 2>&1; then
        success "数据库连接正常"
        log "数据库状态: 正常"
    else
        error "数据库连接异常"
        log "数据库状态: 异常"
        return 1
    fi
    
    # 检查Redis连接
    if docker exec ai_redis_prod redis-cli ping >/dev/null 2>&1; then
        success "Redis连接正常"
        log "Redis状态: 正常"
    else
        error "Redis连接异常"
        log "Redis状态: 异常"
        return 1
    fi
    
    return 0
}

# 检查磁盘空间
check_disk_space() {
    info "检查磁盘空间..."
    
    local disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$disk_usage" -lt 80 ]; then
        success "磁盘空间充足 (${disk_usage}% 已使用)"
        log "磁盘使用率: ${disk_usage}%"
    elif [ "$disk_usage" -lt 90 ]; then
        warning "磁盘空间偏高 (${disk_usage}% 已使用)"
        log "磁盘使用率: ${disk_usage}% (警告)"
    else
        error "磁盘空间不足 (${disk_usage}% 已使用)"
        log "磁盘使用率: ${disk_usage}% (危险)"
        return 1
    fi
    
    return 0
}

# 检查内存使用
check_memory() {
    info "检查内存使用..."
    
    local mem_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    
    if [ "$mem_usage" -lt 80 ]; then
        success "内存使用正常 (${mem_usage}% 已使用)"
        log "内存使用率: ${mem_usage}%"
    elif [ "$mem_usage" -lt 90 ]; then
        warning "内存使用偏高 (${mem_usage}% 已使用)"
        log "内存使用率: ${mem_usage}% (警告)"
    else
        error "内存使用过高 (${mem_usage}% 已使用)"
        log "内存使用率: ${mem_usage}% (危险)"
        return 1
    fi
    
    return 0
}

# 检查应用响应时间
check_response_time() {
    info "检查应用响应时间..."
    
    # 检查前端响应时间
    local frontend_time=$(curl -o /dev/null -s -w "%{time_total}" http://localhost:80)
    if (( $(echo "$frontend_time < 2.0" | bc -l) )); then
        success "前端响应时间正常 (${frontend_time}s)"
        log "前端响应时间: ${frontend_time}s"
    else
        warning "前端响应时间较慢 (${frontend_time}s)"
        log "前端响应时间: ${frontend_time}s (慢)"
    fi
    
    # 检查API响应时间
    local api_time=$(curl -o /dev/null -s -w "%{time_total}" http://localhost:8080/health)
    if (( $(echo "$api_time < 1.0" | bc -l) )); then
        success "API响应时间正常 (${api_time}s)"
        log "API响应时间: ${api_time}s"
    else
        warning "API响应时间较慢 (${api_time}s)"
        log "API响应时间: ${api_time}s (慢)"
    fi
}

# 生成健康报告
generate_report() {
    local total_checks=$1
    local failed_checks=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo ""
    info "健康检查报告 - $timestamp"
    info "========================================"
    info "总检查项: $total_checks"
    info "失败项目: $failed_checks"
    info "成功率: $(( (total_checks - failed_checks) * 100 / total_checks ))%"
    
    if [ "$failed_checks" -eq 0 ]; then
        success "🎉 所有检查项目都通过了！"
        log "健康检查结果: 全部通过"
    else
        error "⚠️  有 $failed_checks 个检查项目失败"
        log "健康检查结果: $failed_checks 项失败"
    fi
    
    info "========================================"
    info "详细日志: $LOG_FILE"
}

# 自动修复函数
auto_fix() {
    info "尝试自动修复问题..."
    
    cd "$APP_DIR"
    
    # 重启异常的容器
    info "重启Docker服务..."
    docker-compose -f "$COMPOSE_FILE" restart
    
    # 等待服务启动
    sleep 30
    
    success "自动修复完成，请重新运行健康检查"
    log "执行了自动修复操作"
}

# 主函数
main() {
    local total_checks=0
    local failed_checks=0
    
    info "开始AI项目健康检查..."
    log "开始健康检查"
    
    # 执行各项检查
    checks=(
        "check_docker"
        "check_containers" 
        "check_network"
        "check_disk_space"
        "check_memory"
        "check_response_time"
    )
    
    for check in "${checks[@]}"; do
        ((total_checks++))
        if ! $check; then
            ((failed_checks++))
        fi
        echo ""
    done
    
    # 生成报告
    generate_report $total_checks $failed_checks
    
    # 如果有失败项且用户同意，执行自动修复
    if [ "$failed_checks" -gt 0 ]; then
        if [ "${AUTO_FIX:-false}" = "true" ]; then
            auto_fix
        else
            warning "发现问题，建议运行: $0 --fix"
        fi
        exit 1
    fi
    
    exit 0
}

# 显示帮助
show_help() {
    echo "AI项目健康检查脚本"
    echo ""
    echo "使用方法:"
    echo "  $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help     显示此帮助信息"
    echo "  --fix          自动修复发现的问题"
    echo "  --log          显示最近的健康检查日志"
    echo ""
    echo "环境变量:"
    echo "  AUTO_FIX=true 自动执行修复操作"
}

# 显示日志
show_logs() {
    if [ -f "$LOG_FILE" ]; then
        info "最近的健康检查日志:"
        tail -n 20 "$LOG_FILE"
    else
        warning "没有找到日志文件"
    fi
}

# 解析命令行参数
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    --fix)
        export AUTO_FIX=true
        main
        ;;
    --log)
        show_logs
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac