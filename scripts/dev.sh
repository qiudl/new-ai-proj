#!/bin/bash

###############################################################################
# AI项目开发环境统一启动脚本
# 功能：自动启动隧道、后端、前端，提供统一的开发体验
# 用法: ./scripts/dev.sh [backend|frontend|both|stop|status]
###############################################################################

set -e

# ============================================================================
# 配置
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

TUNNEL_SCRIPT="$SCRIPT_DIR/tunnel.sh"
BACKEND_PORT="8080"
FRONTEND_PORT="3000"

# PID文件
BACKEND_PID_FILE="/tmp/ai-proj-backend.pid"
FRONTEND_PID_FILE="/tmp/ai-proj-frontend.pid"

# 日志文件
BACKEND_LOG_FILE="/tmp/ai-proj-backend.log"
FRONTEND_LOG_FILE="/tmp/ai-proj-frontend.log"

# ============================================================================
# 颜色输出
# ============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# ============================================================================
# 工具函数
# ============================================================================

log() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1" >&2
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_section() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# ============================================================================
# 检查函数
# ============================================================================

# 检查端口是否被占用
is_port_busy() {
    lsof -i ":$1" > /dev/null 2>&1
}

# 检查进程是否运行
is_process_running() {
    if [ -f "$1" ]; then
        local pid=$(cat "$1")
        ps -p "$pid" > /dev/null 2>&1
        return $?
    fi
    return 1
}

# 等待端口监听
wait_for_port() {
    local port=$1
    local max_wait=${2:-30}
    local count=0

    while [ $count -lt $max_wait ]; do
        if is_port_busy "$port"; then
            return 0
        fi
        sleep 1
        count=$((count + 1))
        echo -n "."
    done
    echo ""
    return 1
}

# 等待HTTP服务就绪
wait_for_http() {
    local url=$1
    local max_wait=${2:-30}
    local count=0

    while [ $count -lt $max_wait ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            return 0
        fi
        sleep 1
        count=$((count + 1))
        echo -n "."
    done
    echo ""
    return 1
}

# ============================================================================
# 隧道管理
# ============================================================================

ensure_tunnel() {
    log_section "📡 检查数据库隧道"

    if [ ! -f "$TUNNEL_SCRIPT" ]; then
        log_error "隧道脚本不存在: $TUNNEL_SCRIPT"
        return 1
    fi

    # 检查隧道状态 - 优先检查端口是否监听（更宽松的检查）
    # tunnel.sh check 要求数据库连接成功，但有时只需要端口通就行
    if is_port_busy "5433"; then
        log_success "数据库隧道已运行 (端口 5433 已监听)"
        return 0
    fi

    # 备选：使用 tunnel.sh 的完整检查
    if "$TUNNEL_SCRIPT" check > /dev/null 2>&1; then
        log_success "数据库隧道已运行"
        return 0
    fi

    log_warning "数据库隧道未运行，正在启动..."

    if "$TUNNEL_SCRIPT" start; then
        log_success "数据库隧道启动成功"
        return 0
    else
        log_error "数据库隧道启动失败"
        echo ""
        log_warning "可能的原因："
        echo "  1. SSH连接超时（网络问题或服务器不可达）"
        echo "  2. SSH密钥未配置或权限不正确"
        echo "  3. 端口5433已被占用"
        echo "  4. 防火墙阻止连接"
        echo ""
        log "排查步骤："
        echo "  1. 检查网络连接: ping 152.136.104.251"
        echo "  2. 测试SSH: ssh ubuntu@152.136.104.251"
        echo "  3. 查看日志: tail -f /tmp/ai-proj-tunnel.log"
        echo "  4. 手动启动: $TUNNEL_SCRIPT start"
        echo ""

        # 检查是否在交互式终端中运行
        if [ -t 0 ]; then
            read -p "是否继续启动后端服务（可能无法连接数据库）? (y/N) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                log_warning "将继续启动后端，但数据库连接可能失败"
                return 0
            else
                return 1
            fi
        else
            # 非交互模式：提示但不阻止
            log_warning "非交互模式：将继续启动，但数据库连接可能失败"
            return 0
        fi
    fi
}

# ============================================================================
# 后端管理
# ============================================================================

start_backend() {
    log_section "🔧 启动后端服务"

    # 检查后端目录
    if [ ! -d "$BACKEND_DIR" ]; then
        log_error "后端目录不存在: $BACKEND_DIR"
        return 1
    fi

    # 检查端口
    if is_port_busy "$BACKEND_PORT"; then
        log_warning "端口 $BACKEND_PORT 已被占用"

        # 检查是否在交互式终端中运行
        if [ -t 0 ]; then
            read -p "是否停止占用进程并重启? (y/N) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                lsof -ti ":$BACKEND_PORT" | xargs kill -9 2>/dev/null || true
                sleep 2
            else
                return 1
            fi
        else
            # 非交互模式：自动杀死占用进程
            log "非交互模式：自动停止占用进程..."
            lsof -ti ":$BACKEND_PORT" | xargs kill -9 2>/dev/null || true
            sleep 2
        fi
    fi

    log "切换到后端目录: $BACKEND_DIR"
    cd "$BACKEND_DIR"

    # 检查是否需要构建
    if [ ! -f "./backend" ]; then
        log_warning "backend 可执行文件不存在"

        # 检查是否在交互式终端中运行
        if [ -t 0 ]; then
            read -p "是否立即构建? (Y/n) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Nn]$ ]]; then
                log "正在构建后端..."
                if go build -o backend main.go; then
                    log_success "构建完成"
                else
                    log_error "构建失败"
                    return 1
                fi
            else
                log_error "取消启动"
                return 1
            fi
        else
            # 非交互模式：自动构建
            log "非交互模式：自动构建后端..."
            if go build -o backend main.go; then
                log_success "构建完成"
            else
                log_error "构建失败"
                return 1
            fi
        fi
    fi

    log "启动后端服务..."

    # 清理旧日志
    > "$BACKEND_LOG_FILE"

    # 清除可能污染环境的旧数据库环境变量
    # 让 backend 从 .env 文件读取正确的配置
    unset DB_HOST DB_PORT DB_USER DB_PASSWORD DB_NAME DB_SSL_MODE DB_SOURCE

    # 启动后端（后台运行）
    nohup ./backend > "$BACKEND_LOG_FILE" 2>&1 &
    local pid=$!
    echo "$pid" > "$BACKEND_PID_FILE"

    log "等待后端服务启动 (PID: $pid)"
    echo -n "  "

    # 等待健康检查通过
    if wait_for_http "http://localhost:$BACKEND_PORT/health" 20; then
        echo ""
        log_success "后端服务启动成功"
        log "  访问地址: http://localhost:$BACKEND_PORT"
        log "  健康检查: http://localhost:$BACKEND_PORT/health"
        log "  查看日志: tail -f $BACKEND_LOG_FILE"

        # 显示健康检查信息
        echo ""
        echo "  健康状态:"
        curl -s "http://localhost:$BACKEND_PORT/health" | jq '.' 2>/dev/null || \
        curl -s "http://localhost:$BACKEND_PORT/health"

        return 0
    else
        echo ""
        log_error "后端服务启动超时"
        log_error "查看日志: tail -f $BACKEND_LOG_FILE"

        # 显示最后10行日志
        echo ""
        echo "最后10行日志:"
        tail -10 "$BACKEND_LOG_FILE" | sed 's/^/  /'

        # 清理
        if ps -p "$pid" > /dev/null 2>&1; then
            kill "$pid" 2>/dev/null || true
        fi
        rm -f "$BACKEND_PID_FILE"

        return 1
    fi
}

stop_backend() {
    log "停止后端服务..."

    if is_process_running "$BACKEND_PID_FILE"; then
        local pid=$(cat "$BACKEND_PID_FILE")
        kill "$pid" 2>/dev/null || true
        sleep 1

        if ps -p "$pid" > /dev/null 2>&1; then
            kill -9 "$pid" 2>/dev/null || true
        fi

        log_success "后端服务已停止 (PID: $pid)"
    else
        # 通过端口查找并停止
        if is_port_busy "$BACKEND_PORT"; then
            lsof -ti ":$BACKEND_PORT" | xargs kill -9 2>/dev/null || true
            log_success "已清理占用后端端口的进程"
        else
            log_warning "后端服务未运行"
        fi
    fi

    rm -f "$BACKEND_PID_FILE"
}

# ============================================================================
# 前端管理
# ============================================================================

start_frontend() {
    log_section "🎨 启动前端服务"

    # 检查前端目录
    if [ ! -d "$FRONTEND_DIR" ]; then
        log_error "前端目录不存在: $FRONTEND_DIR"
        return 1
    fi

    # 检查端口
    if is_port_busy "$FRONTEND_PORT"; then
        log_warning "端口 $FRONTEND_PORT 已被占用"

        # 检查是否在交互式终端中运行
        if [ -t 0 ]; then
            read -p "是否停止占用进程并重启? (y/N) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                lsof -ti ":$FRONTEND_PORT" | xargs kill -9 2>/dev/null || true
                sleep 2
            else
                return 1
            fi
        else
            # 非交互模式：自动杀死占用进程
            log "非交互模式：自动停止占用进程..."
            lsof -ti ":$FRONTEND_PORT" | xargs kill -9 2>/dev/null || true
            sleep 2
        fi
    fi

    log "切换到前端目录: $FRONTEND_DIR"
    cd "$FRONTEND_DIR"

    # 检查依赖
    if [ ! -d "node_modules" ]; then
        log_warning "node_modules 不存在"

        # 检查是否在交互式终端中运行
        if [ -t 0 ]; then
            read -p "是否立即安装依赖? (Y/n) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Nn]$ ]]; then
                log "正在安装依赖..."
                if npm install; then
                    log_success "依赖安装完成"
                else
                    log_error "依赖安装失败"
                    return 1
                fi
            else
                log_error "取消启动"
                return 1
            fi
        else
            # 非交互模式：自动安装依赖
            log "非交互模式：自动安装依赖..."
            if npm install; then
                log_success "依赖安装完成"
            else
                log_error "依赖安装失败"
                return 1
            fi
        fi
    fi

    log "启动前端开发服务器..."

    # 清理旧日志
    > "$FRONTEND_LOG_FILE"

    # 启动前端（后台运行，不自动打开浏览器）
    PORT=$FRONTEND_PORT BROWSER=none nohup npm start > "$FRONTEND_LOG_FILE" 2>&1 &
    local pid=$!
    echo "$pid" > "$FRONTEND_PID_FILE"

    log "等待前端服务启动 (PID: $pid)"
    echo -n "  "

    # 等待端口监听
    if wait_for_port "$FRONTEND_PORT" 40; then
        echo ""
        log_success "前端服务启动成功"
        log "  访问地址: http://localhost:$FRONTEND_PORT"
        log "  查看日志: tail -f $FRONTEND_LOG_FILE"
        return 0
    else
        echo ""
        log_error "前端服务启动超时"
        log_error "查看日志: tail -f $FRONTEND_LOG_FILE"

        # 清理
        if ps -p "$pid" > /dev/null 2>&1; then
            kill "$pid" 2>/dev/null || true
        fi
        rm -f "$FRONTEND_PID_FILE"

        return 1
    fi
}

stop_frontend() {
    log "停止前端服务..."

    if is_process_running "$FRONTEND_PID_FILE"; then
        local pid=$(cat "$FRONTEND_PID_FILE")
        kill "$pid" 2>/dev/null || true
        sleep 1

        if ps -p "$pid" > /dev/null 2>&1; then
            kill -9 "$pid" 2>/dev/null || true
        fi

        log_success "前端服务已停止 (PID: $pid)"
    else
        # 通过端口查找并停止
        if is_port_busy "$FRONTEND_PORT"; then
            lsof -ti ":$FRONTEND_PORT" | xargs kill -9 2>/dev/null || true
            log_success "已清理占用前端端口的进程"
        else
            log_warning "前端服务未运行"
        fi
    fi

    rm -f "$FRONTEND_PID_FILE"
}

# ============================================================================
# 状态显示
# ============================================================================

show_status() {
    log_section "📊 开发环境状态"

    # 隧道状态 - 使用端口检测，更可靠
    echo -e "${YELLOW}数据库隧道:${NC}"
    if is_port_busy "5433"; then
        echo -e "  状态: ${GREEN}运行中${NC} (端口 5433 已监听)"
        # 额外显示数据库连接状态
        if "$TUNNEL_SCRIPT" check > /dev/null 2>&1; then
            echo -e "  数据库: ${GREEN}连接正常${NC}"
        else
            echo -e "  数据库: ${YELLOW}连接测试失败 (可能缺少密码配置)${NC}"
        fi
    else
        echo -e "  状态: ${RED}未运行${NC}"
    fi
    echo ""

    # 后端状态
    echo -e "${YELLOW}后端服务:${NC}"
    if is_process_running "$BACKEND_PID_FILE"; then
        local pid=$(cat "$BACKEND_PID_FILE")
        echo -e "  状态:   ${GREEN}运行中${NC}"
        echo "  PID:    $pid"
        echo "  端口:   $BACKEND_PORT"
        echo "  URL:    http://localhost:$BACKEND_PORT"

        # 检查健康状态
        if curl -s "http://localhost:$BACKEND_PORT/health" > /dev/null 2>&1; then
            echo -e "  健康:   ${GREEN}正常${NC}"
        else
            echo -e "  健康:   ${RED}异常${NC}"
        fi
    else
        echo -e "  状态:   ${RED}未运行${NC}"
    fi
    echo ""

    # 前端状态
    echo -e "${YELLOW}前端服务:${NC}"
    if is_process_running "$FRONTEND_PID_FILE"; then
        local pid=$(cat "$FRONTEND_PID_FILE")
        echo -e "  状态:   ${GREEN}运行中${NC}"
        echo "  PID:    $pid"
        echo "  端口:   $FRONTEND_PORT"
        echo "  URL:    http://localhost:$FRONTEND_PORT"
    else
        echo -e "  状态:   ${RED}未运行${NC}"
    fi
    echo ""

    # 日志文件
    echo -e "${YELLOW}日志文件:${NC}"
    echo "  后端: tail -f $BACKEND_LOG_FILE"
    echo "  前端: tail -f $FRONTEND_LOG_FILE"
    echo ""

    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# ============================================================================
# 停止所有服务
# ============================================================================

stop_all() {
    log_section "🛑 停止所有服务"

    stop_backend
    stop_frontend

    log_success "所有服务已停止"
}

# ============================================================================
# 显示帮助
# ============================================================================

show_help() {
    cat << EOF

${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}
${CYAN}🚀 AI项目开发环境管理工具${NC}
${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}

${YELLOW}用法:${NC}
  $0 [backend|frontend|both|stop|status|help]

${YELLOW}命令:${NC}
  ${GREEN}backend${NC}    仅启动后端服务
  ${GREEN}frontend${NC}   仅启动前端服务
  ${GREEN}both${NC}       启动后端和前端（默认）
  ${GREEN}stop${NC}       停止所有服务
  ${GREEN}status${NC}     查看服务状态
  ${GREEN}help${NC}       显示此帮助信息

${YELLOW}示例:${NC}
  # 启动完整开发环境（隧道+后端+前端）
  $0
  $0 both

  # 仅启动后端
  $0 backend

  # 仅启动前端
  $0 frontend

  # 查看状态
  $0 status

  # 停止所有服务
  $0 stop

${YELLOW}服务端口:${NC}
  后端:   http://localhost:$BACKEND_PORT
  前端:   http://localhost:$FRONTEND_PORT
  隧道:   localhost:5433

${YELLOW}快速命令:${NC}
  查看后端日志:  tail -f $BACKEND_LOG_FILE
  查看前端日志:  tail -f $FRONTEND_LOG_FILE
  隧道状态:      $TUNNEL_SCRIPT status

${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}

EOF
}

# ============================================================================
# 主函数
# ============================================================================

main() {
    local command="${1:-both}"

    case "$command" in
        backend)
            log_section "🚀 启动开发环境 (仅后端)"
            ensure_tunnel || exit 1
            start_backend || exit 1
            echo ""
            log_success "开发环境已就绪！"
            ;;

        frontend)
            log_section "🚀 启动开发环境 (仅前端)"
            start_frontend || exit 1
            echo ""
            log_success "开发环境已就绪！"
            ;;

        both|start)
            log_section "🚀 启动完整开发环境"
            ensure_tunnel || exit 1
            start_backend || exit 1
            start_frontend || exit 1
            echo ""
            log_section "🎉 开发环境已就绪！"
            show_status
            ;;

        stop)
            stop_all
            ;;

        status)
            show_status
            ;;

        help|--help|-h)
            show_help
            ;;

        *)
            log_error "未知命令: $command"
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
