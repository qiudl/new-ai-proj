#!/bin/bash

###############################################################################
# 后端服务启动脚本
# 功能：
# 1. 检查并启动SSH隧道
# 2. 验证数据库连接
# 3. 启动后端服务
# 4. 可选：后台运行健康检查
###############################################################################

set -e

# 脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# SSH隧道管理脚本
TUNNEL_MANAGER="${PROJECT_ROOT}/scripts/ssh-tunnel-manager.sh"

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
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查SSH隧道
check_tunnel() {
    log_info "检查SSH隧道状态..."

    if [ ! -f "$TUNNEL_MANAGER" ]; then
        log_error "SSH隧道管理脚本不存在: $TUNNEL_MANAGER"
        return 1
    fi

    if ! "$TUNNEL_MANAGER" check > /dev/null 2>&1; then
        log_warning "SSH隧道未运行，正在启动..."
        if "$TUNNEL_MANAGER" start; then
            log_success "SSH隧道启动成功"
            sleep 2
        else
            log_error "SSH隧道启动失败"
            return 1
        fi
    else
        log_success "SSH隧道已运行"
    fi

    return 0
}

# 测试数据库连接
test_database() {
    log_info "测试数据库连接..."

    # 从.env文件读取配置
    if [ -f "$SCRIPT_DIR/.env" ]; then
        source "$SCRIPT_DIR/.env"
    fi

    local db_host="${DB_HOST:-localhost}"
    local db_port="${DB_PORT:-15433}"
    local db_user="${DB_USER:-app_user}"
    local db_password="${DB_PASSWORD:-secure_password_here}"
    local db_name="${DB_NAME:-new_ai_proj_prod}"

    # 测试连接（使用psql或nc）
    if command -v psql > /dev/null 2>&1; then
        if PGPASSWORD="$db_password" psql -h "$db_host" -p "$db_port" -U "$db_user" -d "$db_name" -c "SELECT 1" > /dev/null 2>&1; then
            log_success "数据库连接测试通过"
            return 0
        else
            log_error "数据库连接失败"
            return 1
        fi
    else
        # 备用方案：使用nc测试端口
        if timeout 3 bash -c "echo > /dev/tcp/$db_host/$db_port" 2>/dev/null; then
            log_success "数据库端口可达 (${db_host}:${db_port})"
            return 0
        else
            log_error "数据库端口不可达 (${db_host}:${db_port})"
            return 1
        fi
    fi
}

# 启动后端服务
start_backend() {
    log_info "正在启动后端服务..."

    cd "$SCRIPT_DIR"

    # 检查端口是否被占用
    if lsof -i :8080 > /dev/null 2>&1; then
        log_warning "端口8080已被占用"
        read -p "是否杀死占用进程并重启? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "正在停止旧的后端进程..."
            lsof -ti :8080 | xargs kill -9 2>/dev/null || true
            sleep 2
        else
            log_error "启动取消"
            return 1
        fi
    fi

    # 启动Go服务
    if [ "$BACKGROUND" = "true" ]; then
        log_info "后台启动后端服务..."
        nohup go run . > /tmp/backend-service.log 2>&1 &
        local pid=$!
        echo "$pid" > /tmp/backend-service.pid
        log_success "后端服务已在后台启动 (PID: $pid)"
        log_info "日志文件: /tmp/backend-service.log"
    else
        log_info "前台启动后端服务..."
        go run .
    fi
}

# 启动健康检查守护进程
start_health_daemon() {
    if [ "$ENABLE_HEALTH_CHECK" = "true" ]; then
        log_info "启动SSH隧道健康检查守护进程..."
        nohup "$TUNNEL_MANAGER" health > /tmp/ssh-tunnel-health.log 2>&1 &
        local pid=$!
        echo "$pid" > /tmp/ssh-tunnel-health.pid
        log_success "健康检查守护进程已启动 (PID: $pid)"
        log_info "健康检查日志: /tmp/ssh-tunnel-health.log"
    fi
}

# 显示帮助
show_help() {
    cat << EOF
后端服务启动脚本

用法: $0 [选项]

选项:
  -b, --background        后台运行后端服务
  -h, --health            启用SSH隧道健康检查守护进程
  -s, --skip-tunnel       跳过SSH隧道检查
  -d, --skip-db           跳过数据库连接测试
  --help                  显示此帮助信息

示例:
  # 前台启动（推荐用于开发）
  $0

  # 后台启动并启用健康检查（推荐用于生产）
  $0 -b -h

  # 跳过隧道检查（如果数据库在本地）
  $0 -s

环境变量:
  SKIP_TUNNEL_CHECK      跳过SSH隧道检查 (true/false)
  SKIP_DB_TEST           跳过数据库测试 (true/false)
  BACKGROUND             后台运行 (true/false)
  ENABLE_HEALTH_CHECK    启用健康检查 (true/false)

EOF
}

# 主函数
main() {
    echo "=================================="
    echo "🚀 后端服务启动程序"
    echo "=================================="
    echo ""

    # 解析参数
    SKIP_TUNNEL_CHECK="${SKIP_TUNNEL_CHECK:-false}"
    SKIP_DB_TEST="${SKIP_DB_TEST:-false}"
    BACKGROUND="${BACKGROUND:-false}"
    ENABLE_HEALTH_CHECK="${ENABLE_HEALTH_CHECK:-false}"

    while [[ $# -gt 0 ]]; do
        case $1 in
            -b|--background)
                BACKGROUND=true
                shift
                ;;
            -h|--health)
                ENABLE_HEALTH_CHECK=true
                shift
                ;;
            -s|--skip-tunnel)
                SKIP_TUNNEL_CHECK=true
                shift
                ;;
            -d|--skip-db)
                SKIP_DB_TEST=true
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                log_error "未知选项: $1"
                show_help
                exit 1
                ;;
        esac
    done

    # 步骤1: 检查SSH隧道
    if [ "$SKIP_TUNNEL_CHECK" != "true" ]; then
        if ! check_tunnel; then
            log_error "SSH隧道检查失败，无法启动后端服务"
            log_info "提示: 使用 -s 或 --skip-tunnel 参数跳过隧道检查"
            exit 1
        fi
    else
        log_warning "已跳过SSH隧道检查"
    fi

    # 步骤2: 测试数据库连接
    if [ "$SKIP_DB_TEST" != "true" ]; then
        if ! test_database; then
            log_error "数据库连接测试失败"
            log_info "提示: 使用 -d 或 --skip-db 参数跳过数据库测试"
            exit 1
        fi
    else
        log_warning "已跳过数据库连接测试"
    fi

    # 步骤3: 启动健康检查守护进程
    if [ "$ENABLE_HEALTH_CHECK" = "true" ]; then
        start_health_daemon
    fi

    # 步骤4: 启动后端服务
    echo ""
    log_info "所有检查通过，准备启动后端服务"
    echo ""

    start_backend
}

# 执行主函数
main "$@"
