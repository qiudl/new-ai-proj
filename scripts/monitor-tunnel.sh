#!/bin/bash

###############################################################################
# SSH隧道监控和告警脚本
# 功能：
# 1. 检查隧道健康状态
# 2. 收集性能指标
# 3. 发送告警通知（支持多种方式）
###############################################################################

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# 配置
TUNNEL_MANAGER="${PROJECT_ROOT}/scripts/ssh-tunnel-manager.sh"
ALERT_THRESHOLD="${ALERT_THRESHOLD:-3}"  # 连续失败次数
CHECK_INTERVAL="${CHECK_INTERVAL:-60}"   # 检查间隔（秒）
WEBHOOK_URL="${WEBHOOK_URL:-}"           # Webhook URL（企业微信/钉钉/Slack等）
EMAIL_TO="${EMAIL_TO:-}"                 # 告警邮箱
ENABLE_METRICS="${ENABLE_METRICS:-true}" # 是否输出Prometheus metrics

# 状态文件
STATUS_FILE="/tmp/tunnel-monitor-status.json"
METRICS_FILE="/tmp/tunnel-metrics.txt"

# 计数器
consecutive_failures=0
total_checks=0
total_failures=0
total_recoveries=0

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] [INFO] $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] [SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] [WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] [ERROR]${NC} $1"
}

# 检查隧道状态
check_tunnel() {
    if "$TUNNEL_MANAGER" check > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# 测试数据库连接
test_database() {
    timeout 5 bash -c "echo > /dev/tcp/localhost/15433" 2>/dev/null
    return $?
}

# 获取隧道进程信息
get_tunnel_info() {
    local pid=$(lsof -ti :15433 -sTCP:LISTEN 2>/dev/null | head -1)

    if [ -z "$pid" ]; then
        echo "{\"status\":\"down\",\"pid\":null}"
        return 1
    fi

    # 获取进程信息
    local cpu=$(ps -p "$pid" -o %cpu= 2>/dev/null | tr -d ' ')
    local mem=$(ps -p "$pid" -o %mem= 2>/dev/null | tr -d ' ')
    local vsz=$(ps -p "$pid" -o vsz= 2>/dev/null | tr -d ' ')
    local uptime=$(ps -p "$pid" -o etime= 2>/dev/null | tr -d ' ')

    cat << EOF
{
  "status": "up",
  "pid": $pid,
  "cpu_percent": ${cpu:-0},
  "mem_percent": ${mem:-0},
  "vsz_kb": ${vsz:-0},
  "uptime": "$uptime"
}
EOF
}

# 发送Webhook告警
send_webhook_alert() {
    local message="$1"
    local level="${2:-error}"

    if [ -z "$WEBHOOK_URL" ]; then
        return 0
    fi

    local color="#FF0000"
    [ "$level" = "warning" ] && color="#FFA500"
    [ "$level" = "info" ] && color="#0000FF"
    [ "$level" = "success" ] && color="#00FF00"

    # 通用Webhook格式（适用于企业微信、钉钉等）
    local payload=$(cat << EOF
{
  "msgtype": "markdown",
  "markdown": {
    "content": "## SSH隧道告警\n\n**级别**: ${level}\n\n**时间**: $(date +'%Y-%m-%d %H:%M:%S')\n\n**消息**: ${message}\n\n---\n\n*来自: AI Project Backend*"
  }
}
EOF
)

    curl -s -X POST "$WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d "$payload" > /dev/null 2>&1
}

# 发送邮件告警
send_email_alert() {
    local message="$1"
    local subject="${2:-SSH隧道告警}"

    if [ -z "$EMAIL_TO" ]; then
        return 0
    fi

    if command -v mail > /dev/null 2>&1; then
        echo "$message" | mail -s "$subject" "$EMAIL_TO"
    fi
}

# 更新状态文件
update_status() {
    local status="$1"
    local info="$2"

    cat > "$STATUS_FILE" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "status": "$status",
  "total_checks": $total_checks,
  "total_failures": $total_failures,
  "total_recoveries": $total_recoveries,
  "consecutive_failures": $consecutive_failures,
  "tunnel_info": $info
}
EOF
}

# 生成Prometheus metrics
generate_metrics() {
    if [ "$ENABLE_METRICS" != "true" ]; then
        return 0
    fi

    local status=0
    check_tunnel && status=1

    local db_status=0
    test_database && db_status=1

    cat > "$METRICS_FILE" << EOF
# HELP ssh_tunnel_up SSH隧道是否运行 (1=运行, 0=停止)
# TYPE ssh_tunnel_up gauge
ssh_tunnel_up $status

# HELP ssh_tunnel_db_reachable 数据库是否可达 (1=可达, 0=不可达)
# TYPE ssh_tunnel_db_reachable gauge
ssh_tunnel_db_reachable $db_status

# HELP ssh_tunnel_total_checks 总检查次数
# TYPE ssh_tunnel_total_checks counter
ssh_tunnel_total_checks $total_checks

# HELP ssh_tunnel_total_failures 总失败次数
# TYPE ssh_tunnel_total_failures counter
ssh_tunnel_total_failures $total_failures

# HELP ssh_tunnel_consecutive_failures 连续失败次数
# TYPE ssh_tunnel_consecutive_failures gauge
ssh_tunnel_consecutive_failures $consecutive_failures

# HELP ssh_tunnel_total_recoveries 总恢复次数
# TYPE ssh_tunnel_total_recoveries counter
ssh_tunnel_total_recoveries $total_recoveries
EOF

    log_info "Metrics已更新: $METRICS_FILE"
}

# 监控循环
monitor_loop() {
    log_info "开始监控SSH隧道..."
    log_info "检查间隔: ${CHECK_INTERVAL}秒"
    log_info "告警阈值: 连续失败${ALERT_THRESHOLD}次"

    [ -n "$WEBHOOK_URL" ] && log_info "Webhook告警已启用"
    [ -n "$EMAIL_TO" ] && log_info "邮件告警已启用: $EMAIL_TO"
    [ "$ENABLE_METRICS" = "true" ] && log_info "Prometheus metrics已启用"

    while true; do
        total_checks=$((total_checks + 1))

        # 执行健康检查
        if check_tunnel && test_database; then
            # 检查成功
            if [ $consecutive_failures -gt 0 ]; then
                # 从故障中恢复
                log_success "隧道已恢复正常（之前连续失败 ${consecutive_failures} 次）"
                send_webhook_alert "SSH隧道已恢复正常" "success"
                send_email_alert "SSH隧道已从故障中恢复" "SSH隧道恢复通知"
                total_recoveries=$((total_recoveries + 1))
            fi

            consecutive_failures=0
            local info=$(get_tunnel_info)
            update_status "healthy" "$info"
            generate_metrics

            log_info "健康检查通过 [${total_checks}] - PID: $(echo "$info" | grep -o '"pid":[^,]*' | cut -d: -f2)"
        else
            # 检查失败
            consecutive_failures=$((consecutive_failures + 1))
            total_failures=$((total_failures + 1))

            log_error "隧道异常 [${total_checks}] - 连续失败: ${consecutive_failures}/${ALERT_THRESHOLD}"

            update_status "unhealthy" '{"status":"down","pid":null}'
            generate_metrics

            # 达到告警阈值
            if [ $consecutive_failures -ge $ALERT_THRESHOLD ]; then
                local alert_msg="SSH隧道连续失败 ${consecutive_failures} 次，请立即检查！"
                log_error "$alert_msg"
                send_webhook_alert "$alert_msg" "error"
                send_email_alert "$alert_msg" "【紧急】SSH隧道故障告警"
            fi
        fi

        sleep "$CHECK_INTERVAL"
    done
}

# 单次检查
single_check() {
    echo "=================================="
    echo "SSH隧道监控状态"
    echo "=================================="
    echo ""

    if check_tunnel; then
        echo -e "隧道状态: ${GREEN}正常${NC}"

        if test_database; then
            echo -e "数据库连接: ${GREEN}正常${NC}"
        else
            echo -e "数据库连接: ${RED}异常${NC}"
        fi

        echo ""
        echo "进程信息:"
        get_tunnel_info | python3 -m json.tool 2>/dev/null || echo "无法获取进程信息"
    else
        echo -e "隧道状态: ${RED}异常${NC}"
    fi

    echo ""
    echo "=================================="

    if [ -f "$STATUS_FILE" ]; then
        echo "历史统计:"
        cat "$STATUS_FILE" | python3 -m json.tool 2>/dev/null || cat "$STATUS_FILE"
        echo "=================================="
    fi
}

# 显示帮助
show_help() {
    cat << EOF
SSH隧道监控和告警脚本

用法: $0 {start|check|metrics|help}

命令:
  start         启动持续监控（阻塞）
  check         执行单次检查
  metrics       查看Prometheus metrics
  help          显示此帮助信息

环境变量:
  CHECK_INTERVAL         检查间隔（秒，默认60）
  ALERT_THRESHOLD        告警阈值（连续失败次数，默认3）
  WEBHOOK_URL            Webhook URL（企业微信/钉钉/Slack等）
  EMAIL_TO               告警邮箱
  ENABLE_METRICS         是否生成metrics（默认true）

示例:
  # 启动持续监控
  $0 start

  # 后台运行监控
  nohup $0 start > /tmp/tunnel-monitor.log 2>&1 &

  # 自定义检查间隔和告警阈值
  CHECK_INTERVAL=30 ALERT_THRESHOLD=5 $0 start

  # 启用Webhook告警
  WEBHOOK_URL=https://qyapi.weixin.qq.com/xxx $0 start

  # 单次检查
  $0 check

  # 查看metrics
  $0 metrics

输出文件:
  状态文件:  $STATUS_FILE
  Metrics:   $METRICS_FILE

EOF
}

# 显示metrics
show_metrics() {
    if [ -f "$METRICS_FILE" ]; then
        cat "$METRICS_FILE"
    else
        echo "Metrics文件不存在，请先运行监控"
        exit 1
    fi
}

# 主函数
main() {
    case "${1:-}" in
        start)
            monitor_loop
            ;;
        check)
            single_check
            ;;
        metrics)
            show_metrics
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            echo "错误: 未知命令 '${1:-}'"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

main "$@"
