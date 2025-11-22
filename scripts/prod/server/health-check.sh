#!/bin/bash
# health-check.sh - 系统健康检查脚本
# 用法: ./health-check.sh [--json]

DEPLOY_DIR="/opt/ai-project"
BACKEND_URL="http://localhost:8080"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# JSON 输出模式
JSON_MODE=false
if [ "$1" = "--json" ]; then
    JSON_MODE=true
fi

# 检查结果
declare -A RESULTS

check_backend() {
    local status="unknown"
    local message=""

    if curl -sf "$BACKEND_URL/health" > /dev/null 2>&1; then
        status="healthy"
        message="Backend API is responding"
    else
        status="unhealthy"
        message="Backend API is not responding"
    fi

    RESULTS["backend"]="$status"

    if [ "$JSON_MODE" = false ]; then
        if [ "$status" = "healthy" ]; then
            echo -e "${GREEN}✅ Backend:${NC} $message"
        else
            echo -e "${RED}❌ Backend:${NC} $message"
        fi
    fi
}

check_nginx() {
    local status="unknown"
    local message=""

    if systemctl is-active --quiet nginx; then
        status="healthy"
        message="Nginx is running"
    else
        status="unhealthy"
        message="Nginx is not running"
    fi

    RESULTS["nginx"]="$status"

    if [ "$JSON_MODE" = false ]; then
        if [ "$status" = "healthy" ]; then
            echo -e "${GREEN}✅ Nginx:${NC} $message"
        else
            echo -e "${RED}❌ Nginx:${NC} $message"
        fi
    fi
}

check_postgresql() {
    local status="unknown"
    local message=""

    if pg_isready -q 2>/dev/null; then
        status="healthy"
        message="PostgreSQL is ready"
    elif systemctl is-active --quiet postgresql; then
        status="healthy"
        message="PostgreSQL service is running"
    else
        status="unhealthy"
        message="PostgreSQL is not available"
    fi

    RESULTS["postgresql"]="$status"

    if [ "$JSON_MODE" = false ]; then
        if [ "$status" = "healthy" ]; then
            echo -e "${GREEN}✅ PostgreSQL:${NC} $message"
        else
            echo -e "${RED}❌ PostgreSQL:${NC} $message"
        fi
    fi
}

check_redis() {
    local status="unknown"
    local message=""

    if redis-cli ping > /dev/null 2>&1; then
        status="healthy"
        message="Redis is responding"
    elif systemctl is-active --quiet redis-server; then
        status="healthy"
        message="Redis service is running"
    else
        status="unhealthy"
        message="Redis is not available"
    fi

    RESULTS["redis"]="$status"

    if [ "$JSON_MODE" = false ]; then
        if [ "$status" = "healthy" ]; then
            echo -e "${GREEN}✅ Redis:${NC} $message"
        else
            echo -e "${RED}❌ Redis:${NC} $message"
        fi
    fi
}

check_disk() {
    local status="unknown"
    local message=""
    local usage=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')

    if [ "$usage" -lt 80 ]; then
        status="healthy"
        message="Disk usage: ${usage}%"
    elif [ "$usage" -lt 90 ]; then
        status="warning"
        message="Disk usage high: ${usage}%"
    else
        status="critical"
        message="Disk usage critical: ${usage}%"
    fi

    RESULTS["disk"]="$status"

    if [ "$JSON_MODE" = false ]; then
        if [ "$status" = "healthy" ]; then
            echo -e "${GREEN}✅ Disk:${NC} $message"
        elif [ "$status" = "warning" ]; then
            echo -e "${YELLOW}⚠️ Disk:${NC} $message"
        else
            echo -e "${RED}❌ Disk:${NC} $message"
        fi
    fi
}

check_memory() {
    local status="unknown"
    local message=""
    local usage=$(free | awk '/Mem:/ {printf "%.0f", $3/$2 * 100}')

    if [ "$usage" -lt 80 ]; then
        status="healthy"
        message="Memory usage: ${usage}%"
    elif [ "$usage" -lt 90 ]; then
        status="warning"
        message="Memory usage high: ${usage}%"
    else
        status="critical"
        message="Memory usage critical: ${usage}%"
    fi

    RESULTS["memory"]="$status"

    if [ "$JSON_MODE" = false ]; then
        if [ "$status" = "healthy" ]; then
            echo -e "${GREEN}✅ Memory:${NC} $message"
        elif [ "$status" = "warning" ]; then
            echo -e "${YELLOW}⚠️ Memory:${NC} $message"
        else
            echo -e "${RED}❌ Memory:${NC} $message"
        fi
    fi
}

# 输出 JSON 结果
output_json() {
    local overall="healthy"

    for key in "${!RESULTS[@]}"; do
        if [ "${RESULTS[$key]}" = "unhealthy" ] || [ "${RESULTS[$key]}" = "critical" ]; then
            overall="unhealthy"
            break
        elif [ "${RESULTS[$key]}" = "warning" ]; then
            overall="degraded"
        fi
    done

    cat << EOF
{
  "status": "$overall",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "checks": {
    "backend": "${RESULTS[backend]}",
    "nginx": "${RESULTS[nginx]}",
    "postgresql": "${RESULTS[postgresql]}",
    "redis": "${RESULTS[redis]}",
    "disk": "${RESULTS[disk]}",
    "memory": "${RESULTS[memory]}"
  }
}
EOF
}

# 主函数
main() {
    if [ "$JSON_MODE" = false ]; then
        echo ""
        echo "=========================================="
        echo "🔍 系统健康检查"
        echo "=========================================="
        echo ""
    fi

    check_backend
    check_nginx
    check_postgresql
    check_redis
    check_disk
    check_memory

    if [ "$JSON_MODE" = true ]; then
        output_json
    else
        echo ""
        echo "=========================================="
        echo "检查完成: $(date)"
        echo "=========================================="
    fi
}

main
