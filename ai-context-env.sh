#!/bin/bash

# AI Context Environment Manager
# AI项目管理平台专用环境管理器
# Version: 2.0.0 - Enhanced following best practices

set -e

# 项目配置
PROJECT_NAME="AI Context Management Platform"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.yml"
SCRIPTS_DIR="$PROJECT_DIR/scripts/env-management"

# 环境变量配置
DEV_FRONTEND_PORT=${AI_CONTEXT_DEV_FRONTEND_PORT:-3000}
DEV_BACKEND_PORT=${AI_CONTEXT_DEV_BACKEND_PORT:-8080}
DEV_DB_PORT=${AI_CONTEXT_DEV_DB_PORT:-5432}

PROD_FRONTEND_PORT=${AI_CONTEXT_PROD_FRONTEND_PORT:-80}
PROD_BACKEND_PORT=${AI_CONTEXT_PROD_BACKEND_PORT:-8080}
PROD_DB_PORT=${AI_CONTEXT_PROD_DB_PORT:-5432}

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# 检查依赖项
check_dependencies() {
    log_info "检查系统依赖项..."
    
    local missing_deps=()
    
    # 检查 Docker
    if ! command -v docker &> /dev/null; then
        missing_deps+=("docker")
    fi
    
    # 检查 Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        missing_deps+=("docker-compose")
    fi
    
    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        missing_deps+=("node")
    fi
    
    # 检查 Go
    if ! command -v go &> /dev/null; then
        missing_deps+=("go")
    fi
    
    if [ ${#missing_deps[@]} -eq 0 ]; then
        log_success "所有依赖项已满足"
        return 0
    else
        log_error "缺少以下依赖项: ${missing_deps[*]}"
        return 1
    fi
}

# 启动开发环境
start_dev() {
    log_info "启动AI项目管理平台开发环境..."
    
    if ! check_dependencies; then
        log_error "依赖项检查失败，请先安装必要的软件"
        return 1
    fi
    
    if [ -f "$SCRIPTS_DIR/start-dev.sh" ]; then
        chmod +x "$SCRIPTS_DIR/start-dev.sh"
        "$SCRIPTS_DIR/start-dev.sh"
    else
        log_info "使用Docker Compose启动开发环境..."
        cd "$PROJECT_DIR"
        docker-compose up -d
        
        log_info "等待服务启动..."
        sleep 5
        
        health_check
    fi
    
    log_success "开发环境启动完成"
    log_info "前端地址: http://localhost:${DEV_FRONTEND_PORT}"
    log_info "后端地址: http://localhost:${DEV_BACKEND_PORT}"
}

# 停止开发环境
stop_dev() {
    log_info "停止开发环境..."
    
    if [ -f "$SCRIPTS_DIR/stop-dev.sh" ]; then
        chmod +x "$SCRIPTS_DIR/stop-dev.sh"
        "$SCRIPTS_DIR/stop-dev.sh"
    else
        cd "$PROJECT_DIR"
        docker-compose down
    fi
    
    log_success "开发环境已停止"
}

# 启动生产环境
start_prod() {
    log_info "启动生产环境..."
    log_warning "请确保已正确配置生产环境变量"
    
    cd "$PROJECT_DIR"
    docker-compose -f docker-compose.prod.yml up -d
    
    log_success "生产环境启动完成"
}

# 停止生产环境  
stop_prod() {
    log_info "停止生产环境..."
    
    cd "$PROJECT_DIR"
    docker-compose -f docker-compose.prod.yml down
    
    log_success "生产环境已停止"
}

# 检查环境状态
check_status() {
    log_info "检查环境状态..."
    
    # 检查Docker容器状态
    if command -v docker-compose &> /dev/null; then
        echo -e "\n${BLUE}Docker容器状态:${NC}"
        cd "$PROJECT_DIR"
        docker-compose ps
    fi
    
    echo -e "\n${BLUE}端口占用情况:${NC}"
    
    # 检查开发环境端口
    if lsof -i :${DEV_FRONTEND_PORT} > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 前端开发服务器运行中 (端口: ${DEV_FRONTEND_PORT})${NC}"
    else
        echo -e "${RED}❌ 前端开发服务器未运行 (端口: ${DEV_FRONTEND_PORT})${NC}"
    fi
    
    if lsof -i :${DEV_BACKEND_PORT} > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 后端开发服务器运行中 (端口: ${DEV_BACKEND_PORT})${NC}"
    else
        echo -e "${RED}❌ 后端开发服务器未运行 (端口: ${DEV_BACKEND_PORT})${NC}"
    fi
    
    if lsof -i :${DEV_DB_PORT} > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 数据库服务运行中 (端口: ${DEV_DB_PORT})${NC}"
    else
        echo -e "${RED}❌ 数据库服务未运行 (端口: ${DEV_DB_PORT})${NC}"
    fi
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    # 检查后端健康状态
    local backend_health=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${DEV_BACKEND_PORT}/health 2>/dev/null)
    if [ "$backend_health" = "200" ]; then
        echo -e "${GREEN}✅ 后端服务健康${NC}"
    else
        echo -e "${RED}❌ 后端服务异常 (HTTP: $backend_health)${NC}"
    fi
    
    # 检查前端服务
    local frontend_health=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${DEV_FRONTEND_PORT} 2>/dev/null)
    if [ "$frontend_health" = "200" ]; then
        echo -e "${GREEN}✅ 前端服务健康${NC}"
    else
        echo -e "${RED}❌ 前端服务异常 (HTTP: $frontend_health)${NC}"
    fi
    
    # 检查数据库连接
    if command -v docker &> /dev/null; then
        local db_status=$(docker-compose exec -T db pg_isready -h localhost -p 5432 2>/dev/null)
        if [[ $db_status == *"accepting connections"* ]]; then
            echo -e "${GREEN}✅ 数据库连接正常${NC}"
        else
            echo -e "${RED}❌ 数据库连接异常${NC}"
        fi
    fi
}

# 备份数据库
backup_db() {
    log_info "备份数据库..."
    
    local backup_dir="$PROJECT_DIR/backups"
    local backup_file="$backup_dir/db_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    mkdir -p "$backup_dir"
    
    if docker-compose exec -T db pg_dump -h localhost -U user -d main_db > "$backup_file" 2>/dev/null; then
        log_success "数据库备份完成: $backup_file"
    else
        log_error "数据库备份失败"
        return 1
    fi
}

# 查看日志
show_logs() {
    local service="$1"
    
    log_info "查看服务日志..."
    
    if [ -n "$service" ]; then
        case "$service" in
            backend|前端|frontend)
                docker-compose logs -f frontend
                ;;
            backend|后端)
                docker-compose logs -f backend
                ;;
            db|database|数据库)
                docker-compose logs -f db
                ;;
            *)
                log_warning "未知服务: $service"
                log_info "可用服务: frontend, backend, db"
                ;;
        esac
    else
        echo -e "${YELLOW}选择要查看的日志:${NC}"
        echo "1) 前端日志"
        echo "2) 后端日志" 
        echo "3) 数据库日志"
        echo "4) 所有日志"
        read -p "请选择 (1-4): " choice
        
        case $choice in
            1)
                docker-compose logs -f frontend
                ;;
            2)
                docker-compose logs -f backend
                ;;
            3)
                docker-compose logs -f db
                ;;
            4)
                docker-compose logs -f
                ;;
            *)
                log_error "无效选择"
                ;;
        esac
    fi
}

# 显示帮助信息
show_help() {
    echo -e "${BLUE}${PROJECT_NAME} 环境管理器 v2.0${NC}"
    echo ""
    echo "用法: $0 <command> [options]"
    echo ""
    echo "🚀 环境管理:"
    echo "  start-dev          启动开发环境"
    echo "  stop-dev           停止开发环境"
    echo "  restart-dev        重启开发环境"
    echo "  start-prod         启动生产环境"
    echo "  stop-prod          停止生产环境"
    echo "  restart-prod       重启生产环境"
    echo ""
    echo "📊 监控与诊断:"
    echo "  status             查看环境状态"
    echo "  health             健康检查"
    echo "  logs [service]     查看服务日志"
    echo ""
    echo "🔧 维护操作:"
    echo "  backup             备份数据库" 
    echo "  cleanup            清理环境"
    echo "  deps               检查依赖项"
    echo ""
    echo "❓ 帮助:"
    echo "  help               显示此帮助信息"
    echo ""
    echo "📖 示例:"
    echo "  $0 start-dev       # 启动开发环境"
    echo "  $0 logs backend    # 查看后端日志"
    echo "  $0 health          # 执行健康检查"
    echo "  $0 backup          # 备份数据库"
    echo ""
    echo "🔗 服务地址:"
    echo "  前端: http://localhost:${DEV_FRONTEND_PORT}"
    echo "  后端: http://localhost:${DEV_BACKEND_PORT}" 
    echo "  数据库: localhost:${DEV_DB_PORT}"
    echo ""
}

# 清理环境
cleanup() {
    log_info "清理开发环境..."
    
    cd "$PROJECT_DIR"
    
    # 停止所有容器
    docker-compose down --volumes --remove-orphans
    
    # 清理Docker镜像和卷
    log_info "清理Docker资源..."
    docker system prune -f
    docker volume prune -f
    
    # 清理日志文件
    if [ -d "$PROJECT_DIR/logs" ]; then
        rm -rf "$PROJECT_DIR/logs/*"
        log_info "已清理日志文件"
    fi
    
    log_success "环境清理完成"
}

# 显示环境变量
show_env() {
    echo -e "${BLUE}当前环境变量配置:${NC}"
    echo ""
    echo "开发环境:"
    echo "  AI_CONTEXT_DEV_FRONTEND_PORT: ${DEV_FRONTEND_PORT}"
    echo "  AI_CONTEXT_DEV_BACKEND_PORT: ${DEV_BACKEND_PORT}"
    echo "  AI_CONTEXT_DEV_DB_PORT: ${DEV_DB_PORT}"
    echo ""
    echo "生产环境:"
    echo "  AI_CONTEXT_PROD_FRONTEND_PORT: ${PROD_FRONTEND_PORT}"
    echo "  AI_CONTEXT_PROD_BACKEND_PORT: ${PROD_BACKEND_PORT}"
    echo "  AI_CONTEXT_PROD_DB_PORT: ${PROD_DB_PORT}"
    echo ""
    echo "项目路径:"
    echo "  PROJECT_DIR: ${PROJECT_DIR}"
    echo "  SCRIPTS_DIR: ${SCRIPTS_DIR}"
    echo "  COMPOSE_FILE: ${COMPOSE_FILE}"
}

# 主逻辑
case "$1" in
    start-dev)
        start_dev
        ;;
    stop-dev)
        stop_dev
        ;;
    restart-dev)
        log_info "重启开发环境..."
        stop_dev
        sleep 2
        start_dev
        ;;
    start-prod)
        start_prod
        ;;
    stop-prod)
        stop_prod
        ;;
    restart-prod)
        log_info "重启生产环境..."
        stop_prod
        sleep 2
        start_prod
        ;;
    status)
        check_status
        ;;
    health)
        health_check
        ;;
    logs)
        show_logs "$2"
        ;;
    backup)
        backup_db
        ;;
    cleanup)
        cleanup
        ;;
    deps)
        check_dependencies
        ;;
    env)
        show_env
        ;;
    help|--help|-h|"")
        show_help
        ;;
    *)
        log_error "未知命令: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
