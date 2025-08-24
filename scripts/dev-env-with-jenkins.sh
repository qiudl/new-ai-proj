#!/bin/bash

# AI项目开发环境管理脚本 - Jenkins集成版本
# 增强原有开发环境，支持AI Jenkins无缝集成

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.dev.yml"
JENKINS_ADDON_FILE="$PROJECT_DIR/jenkins-ai/docker-compose.jenkins-addon.yml"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

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

log_jenkins() {
    echo -e "${CYAN}[JENKINS]${NC} $1"
}

# 检查Docker环境
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker未安装，请先安装Docker"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker服务未运行，请启动Docker"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose未安装，请先安装"
        exit 1
    fi
}

# 检查必要文件
check_files() {
    if [[ ! -f "$COMPOSE_FILE" ]]; then
        log_error "Docker Compose配置文件不存在: $COMPOSE_FILE"
        exit 1
    fi
    
    if [[ ! -f "$JENKINS_ADDON_FILE" ]]; then
        log_error "Jenkins插件配置文件不存在: $JENKINS_ADDON_FILE"
        log_info "请先运行: cp jenkins-ai/docker-compose.jenkins-addon.yml.example jenkins-ai/docker-compose.jenkins-addon.yml"
        exit 1
    fi
}

# 启动基础开发环境
start_base_env() {
    log_info "启动基础开发环境..."
    cd "$PROJECT_DIR"
    
    # 启动基础服务
    docker-compose -f "$COMPOSE_FILE" up -d postgres-master redis
    
    # 等待数据库健康检查
    log_info "等待PostgreSQL启动..."
    timeout 60s bash -c 'until docker-compose -f '"$COMPOSE_FILE"' exec postgres-master pg_isready -U dev_user -d ai_project_db; do sleep 2; done'
    
    # 启动应用服务
    docker-compose -f "$COMPOSE_FILE" up -d backend frontend mcp-server
    
    log_success "基础开发环境启动完成"
}

# 启动Jenkins插件
start_jenkins() {
    log_jenkins "启动AI Jenkins服务..."
    cd "$PROJECT_DIR"
    
    # 确保Jenkins配置目录存在
    mkdir -p jenkins-ai/casc jenkins-ai/jobs jenkins-ai/ai-scripts
    
    # 启动Jenkins
    docker-compose -f "$JENKINS_ADDON_FILE" up -d ai-jenkins
    
    log_jenkins "等待Jenkins启动..."
    timeout 120s bash -c 'until curl -f -s http://localhost:8080/login > /dev/null 2>&1; do sleep 5; done'
    
    log_success "AI Jenkins启动完成"
}

# 启动完整环境（基础+Jenkins）
start_full() {
    log_info "启动完整AI开发环境（基础服务 + Jenkins）..."
    
    start_base_env
    sleep 10  # 给基础服务一些启动时间
    start_jenkins
    
    show_status
    show_urls
}

# 只启动基础环境
start_base() {
    log_info "启动基础开发环境（不含Jenkins）..."
    start_base_env
    show_base_urls
}

# 停止所有服务
stop() {
    log_info "停止所有服务..."
    cd "$PROJECT_DIR"
    
    # 停止Jenkins
    if docker-compose -f "$JENKINS_ADDON_FILE" ps --services | grep -q ai-jenkins; then
        log_jenkins "停止Jenkins服务..."
        docker-compose -f "$JENKINS_ADDON_FILE" down
    fi
    
    # 停止基础服务
    docker-compose -f "$COMPOSE_FILE" down
    
    log_success "所有服务已停止"
}

# 重启Jenkins
restart_jenkins() {
    log_jenkins "重启AI Jenkins..."
    cd "$PROJECT_DIR"
    
    docker-compose -f "$JENKINS_ADDON_FILE" restart ai-jenkins
    
    log_jenkins "等待Jenkins重启..."
    timeout 60s bash -c 'until curl -f -s http://localhost:8080/login > /dev/null 2>&1; do sleep 3; done'
    
    log_success "Jenkins重启完成"
}

# 查看服务状态
show_status() {
    log_info "服务状态检查..."
    
    echo
    echo "=== 基础开发环境 ==="
    docker-compose -f "$COMPOSE_FILE" ps
    
    echo
    echo "=== AI Jenkins ==="
    docker-compose -f "$JENKINS_ADDON_FILE" ps
    
    echo
    echo "=== 服务健康状态 ==="
    
    # 检查后端API
    if curl -f -s http://localhost:8081/health > /dev/null 2>&1; then
        log_success "后端API (8081) - 正常"
    else
        log_error "后端API (8081) - 异常"
    fi
    
    # 检查前端
    if curl -f -s http://localhost:3001 > /dev/null 2>&1; then
        log_success "前端服务 (3001) - 正常"
    else
        log_error "前端服务 (3001) - 异常"
    fi
    
    # 检查Jenkins
    if curl -f -s http://localhost:8080/login > /dev/null 2>&1; then
        log_success "Jenkins服务 (8080) - 正常"
    else
        log_warning "Jenkins服务 (8080) - 异常或未启动"
    fi
    
    # 检查数据库
    if docker-compose -f "$COMPOSE_FILE" exec -T postgres-master pg_isready -U dev_user -d ai_project_db > /dev/null 2>&1; then
        log_success "PostgreSQL - 正常"
    else
        log_error "PostgreSQL - 异常"
    fi
}

# 显示访问URLs
show_urls() {
    echo
    echo "=== 🌐 服务访问地址 ==="
    echo -e "${GREEN}前端应用:${NC}     http://localhost:3001"
    echo -e "${GREEN}后端API:${NC}      http://localhost:8081"
    echo -e "${CYAN}AI Jenkins:${NC}   http://localhost:8080"
    echo -e "${BLUE}数据库:${NC}       localhost:5433 (dev_user/dev_password_2024)"
    echo
}

# 显示基础URLs
show_base_urls() {
    echo
    echo "=== 🌐 基础服务访问地址 ==="
    echo -e "${GREEN}前端应用:${NC}     http://localhost:3001"
    echo -e "${GREEN}后端API:${NC}      http://localhost:8081"
    echo -e "${BLUE}数据库:${NC}       localhost:5433 (dev_user/dev_password_2024)"
    echo
}

# 显示Jenkins日志
show_jenkins_logs() {
    log_jenkins "显示Jenkins日志..."
    cd "$PROJECT_DIR"
    docker-compose -f "$JENKINS_ADDON_FILE" logs -f ai-jenkins
}

# 进入Jenkins容器
jenkins_shell() {
    log_jenkins "进入Jenkins容器..."
    cd "$PROJECT_DIR"
    docker-compose -f "$JENKINS_ADDON_FILE" exec ai-jenkins bash
}

# 检查Jenkins与后端连接
test_jenkins_integration() {
    log_jenkins "测试Jenkins与后端API连接..."
    
    if docker-compose -f "$JENKINS_ADDON_FILE" exec -T ai-jenkins curl -f -s http://backend:8080/api/v1/health > /dev/null 2>&1; then
        log_success "Jenkins -> 后端API: 连接正常"
    else
        log_error "Jenkins -> 后端API: 连接失败"
    fi
    
    if docker-compose -f "$JENKINS_ADDON_FILE" exec -T ai-jenkins curl -f -s http://backend:8080/api/v1/projects > /dev/null 2>&1; then
        log_success "Jenkins -> 项目API: 连接正常"
    else
        log_warning "Jenkins -> 项目API: 需要认证或连接失败"
    fi
}

# 显示帮助信息
show_help() {
    echo "AI项目开发环境管理脚本 - Jenkins集成版本"
    echo
    echo "用法: $0 <命令> [选项]"
    echo
    echo "命令:"
    echo "  start           启动完整环境（基础服务 + AI Jenkins）"
    echo "  start-base      启动基础开发环境（不含Jenkins）"
    echo "  start-jenkins   只启动AI Jenkins（需要基础环境已运行）"
    echo "  stop            停止所有服务"
    echo "  restart-jenkins 重启AI Jenkins服务"
    echo "  status          显示所有服务状态"
    echo "  logs-jenkins    显示Jenkins日志"
    echo "  shell-jenkins   进入Jenkins容器"
    echo "  test-integration 测试Jenkins集成连接"
    echo "  help            显示此帮助信息"
    echo
    echo "示例:"
    echo "  $0 start                # 启动完整环境"
    echo "  $0 start-base           # 只启动基础开发环境"
    echo "  $0 logs-jenkins         # 查看Jenkins日志"
    echo "  $0 test-integration     # 测试集成连接"
    echo
}

# 主逻辑
main() {
    check_docker
    check_files
    
    case "${1:-help}" in
        "start" | "full")
            start_full
            ;;
        "start-base" | "base")
            start_base
            ;;
        "start-jenkins" | "jenkins")
            start_jenkins
            show_urls
            ;;
        "stop")
            stop
            ;;
        "restart-jenkins")
            restart_jenkins
            ;;
        "status")
            show_status
            ;;
        "logs-jenkins" | "jenkins-logs")
            show_jenkins_logs
            ;;
        "shell-jenkins" | "jenkins-shell")
            jenkins_shell
            ;;
        "test-integration" | "test")
            test_jenkins_integration
            ;;
        "help" | "--help" | "-h")
            show_help
            ;;
        *)
            log_error "未知命令: $1"
            echo
            show_help
            exit 1
            ;;
    esac
}

main "$@"