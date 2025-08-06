#!/bin/bash

# AI上下文任务管理平台 - 开发环境停止脚本
# 位置：new-ai-proj/scripts/env-management/stop-dev.sh
# 作用：安全停止所有开发环境服务

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 获取项目路径
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DEV_PROJECT_ROOT="$PROJECT_ROOT/../new-ai-proj-dev"
LOGS_DIR="$PROJECT_ROOT/logs"

echo "🛑 停止AI上下文任务管理平台 - 开发环境"
echo "项目路径: $PROJECT_ROOT"

# 定义PID文件路径
BACKEND_PID_FILE="$LOGS_DIR/backend-dev.pid"
FRONTEND_PID_FILE="$LOGS_DIR/frontend-dev.pid"

# 停止函数
stop_service() {
    local service_name="$1"
    local pid_file="$2"
    local process_pattern="$3"
    local port="$4"
    
    log_info "正在停止${service_name}服务..."
    
    # 方法1: 通过PID文件停止
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            log_info "通过PID文件停止${service_name} (PID: $pid)"
            kill "$pid" 2>/dev/null
            
            # 等待进程结束
            local count=0
            while kill -0 "$pid" 2>/dev/null && [ $count -lt 10 ]; do
                sleep 1
                count=$((count + 1))
            done
            
            # 如果还没停止，强制杀死
            if kill -0 "$pid" 2>/dev/null; then
                log_warn "${service_name}进程未正常结束，强制终止"
                kill -9 "$pid" 2>/dev/null
            fi
        else
            log_warn "${service_name}的PID文件存在但进程已停止"
        fi
        rm -f "$pid_file"
    else
        log_warn "${service_name}PID文件不存在: $pid_file"
    fi
    
    # 方法2: 通过进程名停止
    if [ -n "$process_pattern" ]; then
        log_info "通过进程模式查找并停止${service_name}: $process_pattern"
        pkill -f "$process_pattern" 2>/dev/null || true
    fi
    
    # 方法3: 通过端口停止（额外保险）
    if [ -n "$port" ]; then
        local pid_on_port=$(lsof -ti:$port 2>/dev/null || true)
        if [ -n "$pid_on_port" ]; then
            log_info "发现端口${port}上的进程，正在停止..."
            kill "$pid_on_port" 2>/dev/null || true
        fi
    fi
}

# 停止后端服务
stop_service "后端" "$BACKEND_PID_FILE" "go run.*main.go" "8090"

# 停止前端服务  
stop_service "前端" "$FRONTEND_PID_FILE" "node.*react-scripts" "3001"

# 清理日志文件（可选）
cleanup_logs() {
    if [ "$1" = "--clean-logs" ]; then
        log_info "清理开发日志文件..."
        rm -f "$LOGS_DIR"/backend-dev.log
        rm -f "$LOGS_DIR"/frontend-dev.log
        rm -f "$PROJECT_ROOT"/backend-dev.log
        rm -f "$PROJECT_ROOT"/frontend-dev.log
        # 清理旧的日志文件
        rm -f "$DEV_PROJECT_ROOT"/backend-dev.log
        rm -f "$DEV_PROJECT_ROOT"/frontend-dev.log
    fi
}

# 验证服务已停止
verify_stopped() {
    log_info "验证服务停止状态..."
    
    local backend_check=$(lsof -ti:8090 2>/dev/null || true)
    local frontend_check=$(lsof -ti:3001 2>/dev/null || true)
    
    if [ -z "$backend_check" ]; then
        log_info "✅ 后端服务已停止 (端口8090空闲)"
    else
        log_warn "⚠️  端口8090仍被占用 (PID: $backend_check)"
    fi
    
    if [ -z "$frontend_check" ]; then
        log_info "✅ 前端服务已停止 (端口3001空闲)"
    else
        log_warn "⚠️  端口3001仍被占用 (PID: $frontend_check)"
    fi
}

# 主执行流程
cleanup_logs "$1"
verify_stopped

echo ""
log_info "✅ 开发环境已完全停止"
echo ""
echo "📝 可用选项:"
echo "  --clean-logs    同时清理开发日志文件"
echo ""
echo "🚀 重新启动: ./start-dev.sh"
echo "🔧 环境管理: ../../ai-context-env.sh"
