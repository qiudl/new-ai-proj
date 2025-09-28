#!/bin/bash

# 系统监控脚本
# 监控CPU、内存、磁盘、网络和服务状态

set -e

# 配置变量
LOG_FILE="/var/log/system-monitor.log"
ALERT_THRESHOLD_CPU=80
ALERT_THRESHOLD_MEMORY=85
ALERT_THRESHOLD_DISK=85
WEBHOOK_URL="${MONITORING_WEBHOOK_URL:-}"
PROJECT_DIR="/opt/ai-project"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 日志函数
log_message() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

log_info() {
    log_message "INFO" "$1"
}

log_warning() {
    log_message "WARNING" "$1"
}

log_error() {
    log_message "ERROR" "$1"
}

# 发送告警通知
send_alert() {
    local message="$1"
    local severity="$2"
    
    # 记录告警日志
    log_error "ALERT [$severity]: $message"
    
    # 发送Webhook通知（如果配置了）
    if [[ -n "$WEBHOOK_URL" ]]; then
        local payload=$(cat <<EOF
{
    "text": "🚨 AI项目服务器告警",
    "attachments": [
        {
            "color": "danger",
            "fields": [
                {
                    "title": "告警级别",
                    "value": "$severity",
                    "short": true
                },
                {
                    "title": "服务器",
                    "value": "$(hostname) ($(curl -s ifconfig.me))",
                    "short": true
                },
                {
                    "title": "告警内容",
                    "value": "$message",
                    "short": false
                },
                {
                    "title": "时间",
                    "value": "$(date)",
                    "short": true
                }
            ]
        }
    ]
}
EOF
        )
        
        curl -s -X POST "$WEBHOOK_URL" \
             -H "Content-Type: application/json" \
             -d "$payload" || log_warning "Failed to send webhook notification"
    fi
}

# 检查CPU使用率
check_cpu() {
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')
    cpu_usage=${cpu_usage%.*}  # 去除小数点
    
    log_info "CPU使用率: ${cpu_usage}%"
    
    if (( cpu_usage > ALERT_THRESHOLD_CPU )); then
        send_alert "CPU使用率过高: ${cpu_usage}%" "HIGH"
        return 1
    fi
    
    return 0
}

# 检查内存使用率
check_memory() {
    local memory_info=$(free | grep Mem)
    local total_memory=$(echo $memory_info | awk '{print $2}')
    local used_memory=$(echo $memory_info | awk '{print $3}')
    local memory_usage=$((used_memory * 100 / total_memory))
    
    log_info "内存使用率: ${memory_usage}% ($(echo $memory_info | awk '{print $3}')K/$(echo $memory_info | awk '{print $2}')K)"
    
    if (( memory_usage > ALERT_THRESHOLD_MEMORY )); then
        send_alert "内存使用率过高: ${memory_usage}%" "HIGH"
        return 1
    fi
    
    return 0
}

# 检查磁盘使用率
check_disk() {
    local disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    
    log_info "磁盘使用率: ${disk_usage}%"
    
    if (( disk_usage > ALERT_THRESHOLD_DISK )); then
        send_alert "磁盘使用率过高: ${disk_usage}%" "HIGH"
        return 1
    fi
    
    return 0
}

# 检查网络连接
check_network() {
    local external_ping=$(ping -c 3 8.8.8.8 2>/dev/null | tail -1 | awk -F'/' '{print $5}' || echo "failed")
    
    if [[ "$external_ping" == "failed" ]]; then
        send_alert "网络连接异常: 无法访问外网" "CRITICAL"
        return 1
    else
        log_info "网络连接正常: 延迟 ${external_ping}ms"
    fi
    
    return 0
}

# 检查Docker服务
check_docker() {
    if ! systemctl is-active --quiet docker; then
        send_alert "Docker服务未运行" "CRITICAL"
        return 1
    fi
    
    # 检查Docker容器状态
    local unhealthy_containers=$(docker ps --filter "health=unhealthy" --format "{{.Names}}" 2>/dev/null || echo "")
    if [[ -n "$unhealthy_containers" ]]; then
        send_alert "发现不健康的容器: $unhealthy_containers" "HIGH"
        return 1
    fi
    
    local container_count=$(docker ps -q | wc -l)
    log_info "Docker服务正常，运行中容器: $container_count"
    
    return 0
}

# 检查关键端口
check_ports() {
    local critical_ports=("22" "80" "443")
    local failed_ports=()
    
    for port in "${critical_ports[@]}"; do
        if ! ss -tlnp | grep ":$port " > /dev/null; then
            failed_ports+=("$port")
        fi
    done
    
    if [[ ${#failed_ports[@]} -gt 0 ]]; then
        send_alert "关键端口未监听: ${failed_ports[*]}" "HIGH"
        return 1
    fi
    
    log_info "关键端口检查通过: ${critical_ports[*]}"
    return 0
}

# 检查系统负载
check_load() {
    local load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk -F',' '{print $1}' | tr -d ' ')
    local cpu_cores=$(nproc)
    local load_percentage=$(echo "scale=0; $load_avg * 100 / $cpu_cores" | bc 2>/dev/null || echo "0")
    
    log_info "系统负载: ${load_avg} (${load_percentage}%)"
    
    if (( $(echo "$load_percentage > 90" | bc -l) )); then
        send_alert "系统负载过高: ${load_avg} (${load_percentage}%)" "HIGH"
        return 1
    fi
    
    return 0
}

# 检查磁盘IO
check_disk_io() {
    if command -v iostat &> /dev/null; then
        local io_wait=$(iostat -c 1 2 | tail -1 | awk '{print $4}')
        local io_wait_int=${io_wait%.*}
        
        log_info "磁盘IO等待: ${io_wait}%"
        
        if (( io_wait_int > 50 )); then
            send_alert "磁盘IO等待过高: ${io_wait}%" "MEDIUM"
            return 1
        fi
    else
        log_warning "iostat 未安装，跳过磁盘IO检查"
    fi
    
    return 0
}

# 检查应用服务
check_application_services() {
    if [[ -f "$PROJECT_DIR/docker-compose.yml" ]]; then
        cd "$PROJECT_DIR"
        
        # 检查容器健康状态
        local unhealthy=$(docker-compose ps --services --filter "status=unhealthy" 2>/dev/null || echo "")
        if [[ -n "$unhealthy" ]]; then
            send_alert "应用服务不健康: $unhealthy" "HIGH"
            return 1
        fi
        
        # 检查应用API健康
        if curl -s --connect-timeout 5 "http://localhost:8080/api/v1/health" >/dev/null 2>&1; then
            log_info "应用API健康检查通过"
        else
            send_alert "应用API健康检查失败" "HIGH"
            return 1
        fi
    else
        log_info "应用未部署，跳过应用服务检查"
    fi
    
    return 0
}

# 生成系统状态报告
generate_status_report() {
    local report_file="/tmp/system-status-$(date +%Y%m%d_%H%M%S).json"
    
    cat > "$report_file" << EOF
{
    "timestamp": "$(date -Iseconds)",
    "hostname": "$(hostname)",
    "uptime": "$(uptime -p)",
    "cpu": {
        "usage_percent": $(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}'),
        "load_average": "$(uptime | awk -F'load average:' '{print $2}' | tr -d ' ')",
        "cores": $(nproc)
    },
    "memory": {
        "total_kb": $(free | grep Mem | awk '{print $2}'),
        "used_kb": $(free | grep Mem | awk '{print $3}'),
        "available_kb": $(free | grep Mem | awk '{print $7}'),
        "usage_percent": $(($(free | grep Mem | awk '{print $3}') * 100 / $(free | grep Mem | awk '{print $2}')))
    },
    "disk": {
        "usage_percent": $(df / | tail -1 | awk '{print $5}' | sed 's/%//'),
        "available_gb": $(df -BG / | tail -1 | awk '{print $4}' | sed 's/G//')
    },
    "docker": {
        "running_containers": $(docker ps -q | wc -l),
        "service_status": "$(systemctl is-active docker)"
    },
    "network": {
        "external_connectivity": $(ping -c 1 8.8.8.8 >/dev/null 2>&1 && echo "true" || echo "false")
    }
}
EOF
    
    log_info "状态报告生成: $report_file"
    echo "$report_file"
}

# 主函数
main() {
    log_info "开始系统监控检查..."
    
    local failed_checks=0
    local checks=("check_cpu" "check_memory" "check_disk" "check_network" "check_docker" "check_ports" "check_load" "check_disk_io" "check_application_services")
    
    for check in "${checks[@]}"; do
        if ! $check; then
            ((failed_checks++))
        fi
    done
    
    # 生成状态报告
    local report_file=$(generate_status_report)
    
    if (( failed_checks > 0 )); then
        log_error "监控检查完成，发现 $failed_checks 个问题"
        send_alert "监控检查发现 $failed_checks 个问题，详见日志: $LOG_FILE" "MEDIUM"
        exit 1
    else
        log_info "所有监控检查通过"
        exit 0
    fi
}

# 运行主函数
main "$@"