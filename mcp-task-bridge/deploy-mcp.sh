#!/bin/bash

# MCP服务部署脚本
# 用于自动化部署和更新MCP服务

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
PROJECT_ROOT="${PROJECT_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
SERVICE_NAME="mcp-server-prod"
CONTAINER_NAME="ai_mcp_server_prod"

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示使用说明
show_usage() {
    cat << EOF
MCP服务部署脚本

用法: $0 [选项] <命令>

命令:
    deploy      部署MCP服务（构建并启动）
    start       启动MCP服务
    stop        停止MCP服务
    restart     重启MCP服务
    rebuild     重新构建并部署
    logs        查看服务日志
    status      查看服务状态
    health      检查服务健康状态

选项:
    -h, --help          显示此帮助信息
    -p, --project-root  项目根目录（默认: 脚本所在目录的上一级）
    -f, --file          docker-compose文件（默认: docker-compose.prod.yml）
    -v, --verbose       显示详细输出

示例:
    $0 deploy                           # 部署MCP服务
    $0 -p /path/to/project deploy       # 指定项目路径部署
    $0 logs                             # 查看日志
    $0 health                           # 健康检查

EOF
}

# 检查依赖
check_dependencies() {
    log_info "检查依赖..."

    local missing_deps=()

    if ! command -v docker &> /dev/null; then
        missing_deps+=("docker")
    fi

    if ! command -v docker-compose &> /dev/null; then
        missing_deps+=("docker-compose")
    fi

    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_error "缺少必要的依赖: ${missing_deps[*]}"
        exit 1
    fi

    log_success "依赖检查通过"
}

# 检查项目目录
check_project_dir() {
    log_info "检查项目目录: $PROJECT_ROOT"

    if [ ! -d "$PROJECT_ROOT" ]; then
        log_error "项目目录不存在: $PROJECT_ROOT"
        exit 1
    fi

    if [ ! -f "$PROJECT_ROOT/$COMPOSE_FILE" ]; then
        log_error "docker-compose文件不存在: $PROJECT_ROOT/$COMPOSE_FILE"
        exit 1
    fi

    log_success "项目目录检查通过"
}

# 部署服务
deploy_service() {
    log_info "开始部署MCP服务..."

    cd "$PROJECT_ROOT"

    # 停止现有服务（如果存在）
    log_info "停止现有服务..."
    docker-compose -f "$COMPOSE_FILE" stop "$SERVICE_NAME" 2>/dev/null || true

    # 构建镜像
    log_info "构建Docker镜像..."
    docker-compose -f "$COMPOSE_FILE" build "$SERVICE_NAME"

    # 启动服务
    log_info "启动服务..."
    docker-compose -f "$COMPOSE_FILE" up -d "$SERVICE_NAME"

    # 等待服务启动
    log_info "等待服务启动..."
    sleep 5

    # 检查健康状态
    check_health

    log_success "MCP服务部署完成！"
}

# 启动服务
start_service() {
    log_info "启动MCP服务..."

    cd "$PROJECT_ROOT"
    docker-compose -f "$COMPOSE_FILE" start "$SERVICE_NAME"

    sleep 3
    check_health

    log_success "MCP服务已启动"
}

# 停止服务
stop_service() {
    log_info "停止MCP服务..."

    cd "$PROJECT_ROOT"
    docker-compose -f "$COMPOSE_FILE" stop "$SERVICE_NAME"

    log_success "MCP服务已停止"
}

# 重启服务
restart_service() {
    log_info "重启MCP服务..."

    cd "$PROJECT_ROOT"
    docker-compose -f "$COMPOSE_FILE" restart "$SERVICE_NAME"

    sleep 3
    check_health

    log_success "MCP服务已重启"
}

# 重新构建
rebuild_service() {
    log_info "重新构建MCP服务..."

    cd "$PROJECT_ROOT"

    # 停止并删除容器
    log_info "停止并删除旧容器..."
    docker-compose -f "$COMPOSE_FILE" rm -sf "$SERVICE_NAME" 2>/dev/null || true

    # 重新构建（不使用缓存）
    log_info "重新构建镜像（不使用缓存）..."
    docker-compose -f "$COMPOSE_FILE" build --no-cache "$SERVICE_NAME"

    # 启动服务
    log_info "启动服务..."
    docker-compose -f "$COMPOSE_FILE" up -d "$SERVICE_NAME"

    sleep 5
    check_health

    log_success "MCP服务重新构建完成！"
}

# 查看日志
view_logs() {
    log_info "查看MCP服务日志..."

    cd "$PROJECT_ROOT"
    docker-compose -f "$COMPOSE_FILE" logs -f --tail=50 "$SERVICE_NAME"
}

# 查看状态
view_status() {
    log_info "MCP服务状态："

    cd "$PROJECT_ROOT"

    echo ""
    echo "容器状态:"
    docker-compose -f "$COMPOSE_FILE" ps "$SERVICE_NAME"

    echo ""
    echo "详细信息:"
    if docker ps --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -q "$CONTAINER_NAME"; then
        docker ps --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

        echo ""
        echo "资源使用:"
        docker stats "$CONTAINER_NAME" --no-stream
    else
        log_warn "容器未运行"
    fi
}

# 健康检查
check_health() {
    log_info "执行健康检查..."

    # 检查容器是否运行
    if ! docker ps --filter "name=$CONTAINER_NAME" --format "{{.Names}}" | grep -q "$CONTAINER_NAME"; then
        log_error "容器未运行"
        return 1
    fi

    log_success "容器运行中"

    # 检查健康端点
    echo ""
    log_info "测试健康检查端点..."

    # 等待服务就绪
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -s --max-time 2 http://localhost:3100/health > /dev/null 2>&1; then
            log_success "健康检查通过"
            echo ""
            curl -s http://localhost:3100/health | jq . 2>/dev/null || curl -s http://localhost:3100/health
            return 0
        fi

        log_info "等待服务就绪... ($attempt/$max_attempts)"
        sleep 2
        ((attempt++))
    done

    log_error "健康检查失败（超时）"
    echo ""
    log_info "查看日志以获取更多信息:"
    docker logs "$CONTAINER_NAME" --tail 20

    return 1
}

# 主函数
main() {
    local command=""
    local verbose=false

    # 解析参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -p|--project-root)
                PROJECT_ROOT="$2"
                shift 2
                ;;
            -f|--file)
                COMPOSE_FILE="$2"
                shift 2
                ;;
            -v|--verbose)
                verbose=true
                shift
                ;;
            deploy|start|stop|restart|rebuild|logs|status|health)
                command="$1"
                shift
                ;;
            *)
                log_error "未知选项: $1"
                show_usage
                exit 1
                ;;
        esac
    done

    # 如果没有指定命令，显示使用说明
    if [ -z "$command" ]; then
        show_usage
        exit 1
    fi

    # 显示banner
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}   MCP服务部署工具${NC}"
    echo -e "${BLUE}================================${NC}"
    echo ""

    # 检查依赖和项目目录
    check_dependencies
    check_project_dir

    echo ""

    # 执行命令
    case $command in
        deploy)
            deploy_service
            ;;
        start)
            start_service
            ;;
        stop)
            stop_service
            ;;
        restart)
            restart_service
            ;;
        rebuild)
            rebuild_service
            ;;
        logs)
            view_logs
            ;;
        status)
            view_status
            ;;
        health)
            check_health
            ;;
    esac

    echo ""
    echo -e "${BLUE}================================${NC}"
    echo -e "${GREEN}完成！${NC}"
    echo -e "${BLUE}================================${NC}"
}

# 运行主函数
main "$@"
