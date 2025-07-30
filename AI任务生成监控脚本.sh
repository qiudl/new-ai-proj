#!/bin/bash

# AI任务生成监控脚本
# 用于监控AI任务生成功能的运行状态和错误

set -e

# 配置
LOG_DIR="/tmp/ai-task-monitor"
BACKEND_CONTAINER="go_backend"
MONITOR_INTERVAL=10
MAX_LOG_SIZE="10M"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 输出函数
log_info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO: ${1}${NC}"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS: ${1}${NC}"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: ${1}${NC}"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: ${1}${NC}"
}

# 创建日志目录
setup_logging() {
    if [ ! -d "$LOG_DIR" ]; then
        mkdir -p "$LOG_DIR"
        log_info "创建日志目录: $LOG_DIR"
    fi
}

# 监控AI任务生成API调用
monitor_ai_task_generation() {
    log_info "开始监控AI任务生成API调用..."
    
    local log_file="$LOG_DIR/ai_task_generation.log"
    
    # 实时监控后端日志中的AI任务生成相关事件
    docker-compose logs -f backend 2>/dev/null | while read -r line; do
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] $line" >> "$log_file"
        
        # 检查AI任务生成成功
        if echo "$line" | grep -q "AI任务生成成功"; then
            log_success "检测到AI任务生成成功"
            echo "[SUCCESS] $line" >> "$LOG_DIR/ai_success.log"
        fi
        
        # 检查AI任务生成失败
        if echo "$line" | grep -q "AI任务生成失败\|JSON解析失败\|AI服务调用失败"; then
            log_error "检测到AI任务生成失败"
            echo "[ERROR] $line" >> "$LOG_DIR/ai_errors.log"
            
            # 发送告警（可以扩展为邮件、钉钉等）
            send_alert "AI任务生成错误" "$line"
        fi
        
        # 检查Token使用情况
        if echo "$line" | grep -q "Token使用.*total_tokens"; then
            token_usage=$(echo "$line" | grep -o 'total_tokens.*[0-9]*')
            echo "[TOKEN] $(date '+%Y-%m-%d %H:%M:%S') $token_usage" >> "$LOG_DIR/token_usage.log"
        fi
        
        # 检查响应时间
        if echo "$line" | grep -q "处理时间.*ms"; then
            response_time=$(echo "$line" | grep -o '[0-9]*ms')
            echo "[PERF] $(date '+%Y-%m-%d %H:%M:%S') $response_time" >> "$LOG_DIR/performance.log"
        fi
        
        # 日志轮转
        if [ -f "$log_file" ] && [ $(stat -f%z "$log_file" 2>/dev/null || stat -c%s "$log_file" 2>/dev/null) -gt $(numfmt --from=iec $MAX_LOG_SIZE) ]; then
            mv "$log_file" "${log_file}.$(date +%Y%m%d_%H%M%S)"
            log_info "日志文件已轮转: $log_file"
        fi
    done &
}

# 发送告警
send_alert() {
    local title="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # 写入告警日志
    echo "[$timestamp] ALERT: $title - $message" >> "$LOG_DIR/alerts.log"
    
    # 这里可以扩展为实际的告警方式
    log_warning "告警: $title - $message"
}

# 生成监控报告
generate_report() {
    log_info "生成AI任务生成监控报告..."
    
    local report_file="$LOG_DIR/report_$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "AI任务生成监控报告"
        echo "生成时间: $(date '+%Y-%m-%d %H:%M:%S')"
        echo "=" * 50
        echo
        
        # 成功率统计
        local success_count=$(grep -c "SUCCESS" "$LOG_DIR/ai_success.log" 2>/dev/null || echo "0")
        local error_count=$(grep -c "ERROR" "$LOG_DIR/ai_errors.log" 2>/dev/null || echo "0")
        local total_count=$((success_count + error_count))
        
        if [ $total_count -gt 0 ]; then
            local success_rate=$(awk "BEGIN {printf \"%.2f\", $success_count * 100 / $total_count}")
            echo "成功率统计:"
            echo "  总请求数: $total_count"
            echo "  成功数: $success_count"
            echo "  失败数: $error_count"
            echo "  成功率: ${success_rate}%"
        else
            echo "成功率统计: 暂无数据"
        fi
        echo
        
        # Token使用统计
        if [ -f "$LOG_DIR/token_usage.log" ]; then
            echo "Token使用统计:"
            local total_tokens=$(grep -o '[0-9]*' "$LOG_DIR/token_usage.log" | awk '{sum+=$1} END {print sum+0}')
            local avg_tokens=$(grep -o '[0-9]*' "$LOG_DIR/token_usage.log" | awk '{sum+=$1; count++} END {if(count>0) print sum/count; else print 0}')
            echo "  总Token使用: $total_tokens"
            echo "  平均每次使用: $(printf "%.0f" $avg_tokens)"
        else
            echo "Token使用统计: 暂无数据"
        fi
        echo
        
        # 性能统计
        if [ -f "$LOG_DIR/performance.log" ]; then
            echo "性能统计:"
            local avg_time=$(grep -o '[0-9]*' "$LOG_DIR/performance.log" | awk '{sum+=$1; count++} END {if(count>0) print sum/count; else print 0}')
            local max_time=$(grep -o '[0-9]*' "$LOG_DIR/performance.log" | sort -n | tail -1)
            echo "  平均响应时间: $(printf "%.0f" $avg_time)ms"
            echo "  最大响应时间: ${max_time}ms"
        else
            echo "性能统计: 暂无数据"
        fi
        echo
        
        # 错误分析
        if [ -f "$LOG_DIR/ai_errors.log" ]; then
            echo "错误分析 (最近10条):"
            tail -10 "$LOG_DIR/ai_errors.log" | while IFS= read -r line; do
                echo "  $line"
            done
        else
            echo "错误分析: 暂无错误"
        fi
        
    } > "$report_file"
    
    log_success "监控报告已生成: $report_file"
    
    # 显示简要报告
    cat "$report_file"
}

# 健康检查
health_check() {
    log_info "执行AI任务生成健康检查..."
    
    # 检查后端容器状态
    if ! docker-compose ps | grep -q "go_backend.*Up"; then
        log_error "后端容器未运行"
        return 1
    fi
    
    # 检查API可达性
    if ! docker-compose exec backend wget -q -O - http://localhost:8080/health > /dev/null 2>&1; then
        log_error "后端API不可达"
        return 1
    fi
    
    # 检查AI配置
    local ai_config_check=$(docker-compose exec backend wget -q -O - \
        --header="Authorization: Bearer test" \
        http://localhost:8080/api/v1/system/ai-configs 2>/dev/null || echo "failed")
    
    if echo "$ai_config_check" | grep -q "failed"; then
        log_warning "无法检查AI配置状态"
    else
        log_success "AI配置API可达"
    fi
    
    log_success "健康检查完成"
    return 0
}

# 清理旧日志
cleanup_logs() {
    log_info "清理旧日志文件..."
    
    # 清理7天前的日志
    find "$LOG_DIR" -name "*.log.*" -mtime +7 -delete 2>/dev/null || true
    find "$LOG_DIR" -name "report_*.txt" -mtime +30 -delete 2>/dev/null || true
    
    log_success "日志清理完成"
}

# 显示使用帮助
show_help() {
    echo "AI任务生成监控脚本"
    echo
    echo "用法: $0 [选项]"
    echo
    echo "选项:"
    echo "  start     开始监控"
    echo "  stop      停止监控"
    echo "  status    查看监控状态"
    echo "  report    生成监控报告"
    echo "  health    执行健康检查"
    echo "  cleanup   清理旧日志"
    echo "  logs      查看实时日志"
    echo "  -h        显示此帮助信息"
    echo
    echo "示例:"
    echo "  $0 start          # 开始监控"
    echo "  $0 report         # 生成报告"
    echo "  $0 health         # 健康检查"
}

# 启动监控
start_monitor() {
    log_info "启动AI任务生成监控..."
    
    setup_logging
    
    # 检查是否已经在运行
    if pgrep -f "ai-task-monitor" > /dev/null; then
        log_warning "监控已在运行中"
        return 1
    fi
    
    # 后台启动监控
    monitor_ai_task_generation
    
    # 定期健康检查
    (
        while true; do
            sleep 300  # 每5分钟检查一次
            health_check > /dev/null 2>&1 || log_warning "健康检查失败"
        done
    ) &
    
    # 保存PID
    echo $! > "$LOG_DIR/monitor.pid"
    
    log_success "监控已启动，PID: $!"
}

# 停止监控
stop_monitor() {
    log_info "停止AI任务生成监控..."
    
    # 杀死监控进程
    if [ -f "$LOG_DIR/monitor.pid" ]; then
        local pid=$(cat "$LOG_DIR/monitor.pid")
        if kill "$pid" 2>/dev/null; then
            log_success "监控进程已停止 (PID: $pid)"
        else
            log_warning "无法停止监控进程 (PID: $pid)"
        fi
        rm -f "$LOG_DIR/monitor.pid"
    fi
    
    # 杀死所有相关进程
    pkill -f "ai-task-monitor" 2>/dev/null || true
    pkill -f "docker-compose logs -f backend" 2>/dev/null || true
    
    log_success "监控已停止"
}

# 查看监控状态
show_status() {
    log_info "检查监控状态..."
    
    if [ -f "$LOG_DIR/monitor.pid" ]; then
        local pid=$(cat "$LOG_DIR/monitor.pid")
        if kill -0 "$pid" 2>/dev/null; then
            log_success "监控运行中 (PID: $pid)"
            
            # 显示最近的活动
            if [ -f "$LOG_DIR/ai_task_generation.log" ]; then
                echo "最近的活动:"
                tail -5 "$LOG_DIR/ai_task_generation.log" | while IFS= read -r line; do
                    echo "  $line"
                done
            fi
        else
            log_warning "监控进程不存在 (PID: $pid)"
            rm -f "$LOG_DIR/monitor.pid"
        fi
    else
        log_info "监控未运行"
    fi
}

# 查看实时日志
show_logs() {
    log_info "显示AI任务生成实时日志..."
    
    if [ -f "$LOG_DIR/ai_task_generation.log" ]; then
        tail -f "$LOG_DIR/ai_task_generation.log"
    else
        log_warning "日志文件不存在，请先启动监控"
    fi
}

# 主函数
main() {
    case "${1:-start}" in
        start)
            start_monitor
            ;;
        stop)
            stop_monitor
            ;;
        status)
            show_status
            ;;
        report)
            generate_report
            ;;
        health)
            health_check
            ;;
        cleanup)
            cleanup_logs
            ;;
        logs)
            show_logs
            ;;
        -h|--help)
            show_help
            ;;
        *)
            echo "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
}

# 信号处理
trap 'stop_monitor; exit 0' SIGINT SIGTERM

# 运行主函数
main "$@"