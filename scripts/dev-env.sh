#!/bin/bash

# AI项目开发环境管理脚本
# 专为Docker主导的开发环境设计

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.dev.yml"

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
    
    log_success "Docker环境检查通过"
}

# 启动开发环境
start_dev() {
    log_info "启动AI项目开发环境..."
    
    check_docker
    
    cd "$PROJECT_DIR"
    
    # 创建必要的目录
    mkdir -p backend/logs
    mkdir -p docker/postgres
    mkdir -p docker/redis
    
    # 启动服务
    log_info "启动Docker服务..."
    docker-compose -f "$COMPOSE_FILE" up -d
    
    log_info "等待服务启动..."
    sleep 20
    
    # 检查服务状态
    check_services
    
    log_success "开发环境启动完成！"
    display_info
}

# 停止开发环境
stop_dev() {
    log_info "停止AI项目开发环境..."
    
    cd "$PROJECT_DIR"
    docker-compose -f "$COMPOSE_FILE" down
    
    log_success "开发环境已停止"
}

# 重启开发环境
restart_dev() {
    log_info "重启AI项目开发环境..."
    stop_dev
    sleep 5
    start_dev
}

# 检查服务状态
check_services() {
    log_info "检查服务状态..."
    
    cd "$PROJECT_DIR"
    
    # 检查数据库
    if docker-compose -f "$COMPOSE_FILE" exec -T postgres-master pg_isready -U dev_user -d ai_project_db; then
        log_success "PostgreSQL主库运行正常"
    else
        log_error "PostgreSQL主库启动失败"
    fi
    
    # 检查后端API
    if curl -f -s http://localhost:8081/health > /dev/null; then
        log_success "后端API运行正常"
    else
        log_warning "后端API未就绪，可能仍在启动中"
    fi
    
    # 检查前端
    if curl -f -s http://localhost:3001 > /dev/null; then
        log_success "前端服务运行正常"
    else
        log_warning "前端服务未就绪，可能仍在启动中"
    fi
    
    # 检查Redis
    if docker-compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping | grep -q PONG; then
        log_success "Redis服务运行正常"
    else
        log_warning "Redis服务未就绪"
    fi
}

# 查看日志
view_logs() {
    local service=$1
    cd "$PROJECT_DIR"
    
    if [ -z "$service" ]; then
        log_info "显示所有服务日志..."
        docker-compose -f "$COMPOSE_FILE" logs -f
    else
        log_info "显示 $service 服务日志..."
        docker-compose -f "$COMPOSE_FILE" logs -f "$service"
    fi
}

# 执行命令
exec_command() {
    local service=$1
    shift
    local command="$@"
    
    cd "$PROJECT_DIR"
    
    log_info "在 $service 中执行: $command"
    docker-compose -f "$COMPOSE_FILE" exec "$service" $command
}

# 进入容器shell
shell() {
    local service=$1
    cd "$PROJECT_DIR"
    
    log_info "进入 $service 容器shell..."
    docker-compose -f "$COMPOSE_FILE" exec "$service" /bin/sh
}

# 清理环境
clean() {
    log_warning "清理开发环境数据..."
    
    cd "$PROJECT_DIR"
    
    docker-compose -f "$COMPOSE_FILE" down -v
    docker volume prune -f
    
    log_success "环境清理完成"
}

# 设置从库
setup_replica() {
    log_info "设置PostgreSQL从库..."
    
    if [ ! -f "$SCRIPT_DIR/setup-replica-database.sh" ]; then
        log_error "从库设置脚本不存在"
        exit 1
    fi
    
    chmod +x "$SCRIPT_DIR/setup-replica-database.sh"
    "$SCRIPT_DIR/setup-replica-database.sh"
}

# 显示环境信息
display_info() {
    echo ""
    echo "=========================================="
    echo "AI项目开发环境信息"
    echo "=========================================="
    echo "前端地址:     http://localhost:3001"
    echo "后端API:      http://localhost:8081"
    echo "API文档:      http://localhost:8081/docs"
    echo ""
    echo "数据库连接:"
    echo "  主库(Docker): localhost:5433"
    echo "  从库(本机):   localhost:5432"
    echo "  用户:         dev_user"
    echo "  密码:         dev_password_2024"
    echo "  数据库:       ai_project_db"
    echo ""
    echo "Redis:        localhost:6379"
    echo "MCP服务器:    localhost:3100"
    echo ""
    echo "常用命令:"
    echo "  查看状态:     $0 status"
    echo "  查看日志:     $0 logs [service]"
    echo "  进入容器:     $0 shell <service>"
    echo "  重启服务:     $0 restart"
    echo "  停止环境:     $0 stop"
    echo "=========================================="
}

# 主函数
main() {
    case "${1:-start}" in
        start)
            start_dev
            ;;
        stop)
            stop_dev
            ;;
        restart)
            restart_dev
            ;;
        status)
            check_services
            ;;
        logs)
            view_logs "${2:-}"
            ;;
        exec)
            if [ $# -lt 3 ]; then
                log_error "用法: $0 exec <service> <command>"
                exit 1
            fi
            exec_command "${2}" "${@:3}"
            ;;
        shell)
            if [ $# -lt 2 ]; then
                log_error "用法: $0 shell <service>"
                exit 1
            fi
            shell "${2}"
            ;;
        clean)
            clean
            ;;
        replica)
            setup_replica
            ;;
        info)
            display_info
            ;;
        help|--help|-h)
            echo "AI项目开发环境管理脚本"
            echo ""
            echo "用法: $0 [命令]"
            echo ""
            echo "命令:"
            echo "  start          启动开发环境 (默认)"
            echo "  stop           停止开发环境"
            echo "  restart        重启开发环境"
            echo "  status         检查服务状态"
            echo "  logs [service] 查看日志"
            echo "  exec <service> <cmd> 在容器中执行命令"
            echo "  shell <service> 进入容器shell"
            echo "  clean          清理环境数据"
            echo "  replica        设置PostgreSQL从库"
            echo "  info           显示环境信息"
            echo "  help           显示帮助信息"
            echo ""
            echo "服务名称:"
            echo "  postgres-master  PostgreSQL主库"
            echo "  backend          Go后端服务"
            echo "  frontend         React前端服务"
            echo "  redis            Redis缓存"
            echo "  mcp-server       MCP服务器"
            ;;
        *)
            log_error "未知命令: $1"
            echo "使用 '$0 help' 查看帮助信息"
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"