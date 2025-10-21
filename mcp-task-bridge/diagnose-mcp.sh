#!/bin/bash

# MCP服务诊断脚本
# 用于在服务器上诊断MCP服务的各种问题

set +e  # 允许命令失败继续执行

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查标记
CHECK_MARK="${GREEN}✓${NC}"
CROSS_MARK="${RED}✗${NC}"
INFO_MARK="${BLUE}ℹ${NC}"
WARN_MARK="${YELLOW}⚠${NC}"

echo -e "${BLUE}==================================${NC}"
echo -e "${BLUE}   MCP服务诊断工具${NC}"
echo -e "${BLUE}==================================${NC}"
echo ""

# 函数：打印分隔线
print_separator() {
    echo -e "${BLUE}----------------------------------${NC}"
}

# 函数：检查命令是否存在
check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${CHECK_MARK} $1 已安装"
        return 0
    else
        echo -e "${CROSS_MARK} $1 未安装"
        return 1
    fi
}

# 1. 系统信息
print_separator
echo -e "${YELLOW}1. 系统信息${NC}"
print_separator
echo "主机名: $(hostname)"
echo "操作系统: $(uname -s)"
echo "内核版本: $(uname -r)"
echo "当前时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "运行时长: $(uptime -p 2>/dev/null || uptime)"
echo ""

# 2. 检查必要工具
print_separator
echo -e "${YELLOW}2. 检查必要工具${NC}"
print_separator
check_command docker
check_command docker-compose
check_command curl
check_command netstat || check_command ss
check_command nc
echo ""

# 3. 检查Docker服务
print_separator
echo -e "${YELLOW}3. Docker服务状态${NC}"
print_separator
if systemctl is-active --quiet docker 2>/dev/null; then
    echo -e "${CHECK_MARK} Docker服务运行中"
elif pgrep dockerd > /dev/null; then
    echo -e "${CHECK_MARK} Docker进程运行中"
else
    echo -e "${CROSS_MARK} Docker服务未运行"
fi

docker version --format 'Docker版本: {{.Server.Version}}' 2>/dev/null || echo -e "${CROSS_MARK} 无法获取Docker版本"
echo ""

# 4. 检查MCP容器状态
print_separator
echo -e "${YELLOW}4. MCP容器状态${NC}"
print_separator

MCP_CONTAINER=$(docker ps --filter "name=mcp" --format "{{.Names}}" 2>/dev/null)
if [ -n "$MCP_CONTAINER" ]; then
    echo -e "${CHECK_MARK} MCP容器运行中: $MCP_CONTAINER"

    # 容器详细信息
    echo ""
    echo "容器ID: $(docker ps --filter "name=mcp" --format "{{.ID}}" 2>/dev/null)"
    echo "镜像: $(docker ps --filter "name=mcp" --format "{{.Image}}" 2>/dev/null)"
    echo "状态: $(docker ps --filter "name=mcp" --format "{{.Status}}" 2>/dev/null)"
    echo "端口映射: $(docker ps --filter "name=mcp" --format "{{.Ports}}" 2>/dev/null)"

    # 健康检查
    HEALTH=$(docker inspect --format='{{.State.Health.Status}}' $MCP_CONTAINER 2>/dev/null)
    if [ -n "$HEALTH" ]; then
        if [ "$HEALTH" = "healthy" ]; then
            echo -e "健康状态: ${CHECK_MARK} $HEALTH"
        else
            echo -e "健康状态: ${WARN_MARK} $HEALTH"
        fi
    fi
else
    echo -e "${CROSS_MARK} MCP容器未运行"
    echo ""
    echo "查找所有容器（包括停止的）："
    docker ps -a --filter "name=mcp" --format "table {{.Names}}\t{{.Status}}\t{{.Image}}" 2>/dev/null
fi
echo ""

# 5. 检查端口监听
print_separator
echo -e "${YELLOW}5. 端口监听状态${NC}"
print_separator

check_port() {
    local port=$1
    local service=$2

    if command -v netstat &> /dev/null; then
        if netstat -tlnp 2>/dev/null | grep -q ":$port "; then
            echo -e "${CHECK_MARK} 端口 $port ($service) 正在监听"
            netstat -tlnp 2>/dev/null | grep ":$port " | head -1
        else
            echo -e "${CROSS_MARK} 端口 $port ($service) 未监听"
        fi
    elif command -v ss &> /dev/null; then
        if ss -tlnp 2>/dev/null | grep -q ":$port "; then
            echo -e "${CHECK_MARK} 端口 $port ($service) 正在监听"
            ss -tlnp 2>/dev/null | grep ":$port " | head -1
        else
            echo -e "${CROSS_MARK} 端口 $port ($service) 未监听"
        fi
    else
        echo -e "${WARN_MARK} 无法检查端口（缺少netstat/ss）"
    fi
}

check_port 3000 "MCP SSE (容器内)"
check_port 3100 "MCP SSE (主机映射)"
check_port 80 "Nginx HTTP"
check_port 443 "Nginx HTTPS"
check_port 8080 "Backend API"
echo ""

# 6. 测试本地连接
print_separator
echo -e "${YELLOW}6. 本地连接测试${NC}"
print_separator

# 测试MCP直接连接
echo -n "MCP健康检查 (localhost:3100): "
if curl -s --max-time 3 http://localhost:3100/health > /dev/null 2>&1; then
    echo -e "${CHECK_MARK}"
    curl -s http://localhost:3100/health | jq . 2>/dev/null || curl -s http://localhost:3100/health
else
    echo -e "${CROSS_MARK}"
fi

echo ""
echo -n "MCP健康检查 (localhost:3000): "
if curl -s --max-time 3 http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${CHECK_MARK}"
    curl -s http://localhost:3000/health | jq . 2>/dev/null || curl -s http://localhost:3000/health
else
    echo -e "${CROSS_MARK}"
fi

echo ""
echo -n "Nginx代理 (localhost/mcp/health): "
if curl -s --max-time 3 http://localhost/mcp/health > /dev/null 2>&1; then
    echo -e "${CHECK_MARK}"
    curl -s http://localhost/mcp/health | jq . 2>/dev/null || curl -s http://localhost/mcp/health
else
    echo -e "${CROSS_MARK}"
fi
echo ""

# 7. 检查Nginx配置
print_separator
echo -e "${YELLOW}7. Nginx配置检查${NC}"
print_separator

NGINX_CONTAINER=$(docker ps --filter "name=nginx" --format "{{.Names}}" 2>/dev/null | head -1)
if [ -n "$NGINX_CONTAINER" ]; then
    echo -e "${CHECK_MARK} Nginx容器运行中: $NGINX_CONTAINER"
    echo ""
    echo "配置测试:"
    if docker exec $NGINX_CONTAINER nginx -t 2>&1; then
        echo -e "${CHECK_MARK} Nginx配置正确"
    else
        echo -e "${CROSS_MARK} Nginx配置有误"
    fi
else
    echo -e "${CROSS_MARK} Nginx容器未运行"
fi
echo ""

# 8. 检查防火墙
print_separator
echo -e "${YELLOW}8. 防火墙检查${NC}"
print_separator

# UFW
if command -v ufw &> /dev/null; then
    echo "UFW状态:"
    sudo ufw status 2>/dev/null || echo -e "${INFO_MARK} 需要sudo权限"
fi

# iptables
if command -v iptables &> /dev/null; then
    echo ""
    echo "iptables规则（80, 443端口）:"
    sudo iptables -L -n 2>/dev/null | grep -E '(80|443)' || echo -e "${INFO_MARK} 无相关规则或需要sudo权限"
fi
echo ""

# 9. 检查SSL证书
print_separator
echo -e "${YELLOW}9. SSL证书检查${NC}"
print_separator

# 查找SSL证书文件
CERT_PATHS=(
    "./ssl/cert.pem"
    "/etc/nginx/ssl/cert.pem"
    "../ssl/cert.pem"
)

CERT_FOUND=false
for cert_path in "${CERT_PATHS[@]}"; do
    if [ -f "$cert_path" ]; then
        echo -e "${CHECK_MARK} 找到证书: $cert_path"
        CERT_FOUND=true

        # 检查证书有效期
        echo ""
        echo "证书信息:"
        openssl x509 -in "$cert_path" -noout -subject -issuer -dates 2>/dev/null || echo -e "${WARN_MARK} 无法读取证书"

        # 检查是否即将过期
        EXPIRY_DATE=$(openssl x509 -in "$cert_path" -noout -enddate 2>/dev/null | cut -d= -f2)
        if [ -n "$EXPIRY_DATE" ]; then
            EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s 2>/dev/null)
            CURRENT_EPOCH=$(date +%s)
            DAYS_LEFT=$(( ($EXPIRY_EPOCH - $CURRENT_EPOCH) / 86400 ))

            if [ $DAYS_LEFT -lt 0 ]; then
                echo -e "${CROSS_MARK} 证书已过期 ($DAYS_LEFT 天前)"
            elif [ $DAYS_LEFT -lt 30 ]; then
                echo -e "${WARN_MARK} 证书即将过期 (剩余 $DAYS_LEFT 天)"
            else
                echo -e "${CHECK_MARK} 证书有效 (剩余 $DAYS_LEFT 天)"
            fi
        fi
        break
    fi
done

if [ "$CERT_FOUND" = false ]; then
    echo -e "${WARN_MARK} 未找到SSL证书文件"
fi
echo ""

# 10. 容器日志（最后20行）
print_separator
echo -e "${YELLOW}10. MCP服务日志（最后20行）${NC}"
print_separator

if [ -n "$MCP_CONTAINER" ]; then
    docker logs $MCP_CONTAINER --tail 20 2>&1
else
    echo -e "${WARN_MARK} MCP容器未运行，无法获取日志"
fi
echo ""

# 11. 资源使用情况
print_separator
echo -e "${YELLOW}11. 资源使用情况${NC}"
print_separator

if [ -n "$MCP_CONTAINER" ]; then
    docker stats $MCP_CONTAINER --no-stream 2>/dev/null || echo -e "${WARN_MARK} 无法获取资源使用情况"
fi
echo ""

# 12. 环境变量检查
print_separator
echo -e "${YELLOW}12. MCP服务环境变量${NC}"
print_separator

if [ -n "$MCP_CONTAINER" ]; then
    echo "关键环境变量:"
    docker exec $MCP_CONTAINER env 2>/dev/null | grep -E '(MCP_|API_|NODE_ENV|PORT)' || echo -e "${WARN_MARK} 无法获取环境变量"
fi
echo ""

# 13. 网络连接测试
print_separator
echo -e "${YELLOW}13. 外部连接测试${NC}"
print_separator

# 获取服务器公网IP
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s icanhazip.com 2>/dev/null || echo "unknown")
echo "公网IP: $PUBLIC_IP"
echo ""

if [ "$PUBLIC_IP" != "unknown" ]; then
    echo "测试外部访问（使用公网IP）:"

    # HTTP测试
    echo -n "HTTP (80): "
    if curl -s --max-time 5 http://$PUBLIC_IP > /dev/null 2>&1; then
        echo -e "${CHECK_MARK}"
    else
        echo -e "${CROSS_MARK}"
    fi

    # HTTPS测试
    echo -n "HTTPS (443): "
    if curl -k -s --max-time 5 https://$PUBLIC_IP > /dev/null 2>&1; then
        echo -e "${CHECK_MARK}"
    else
        echo -e "${CROSS_MARK}"
    fi
fi
echo ""

# 总结
print_separator
echo -e "${BLUE}==================================${NC}"
echo -e "${BLUE}   诊断完成${NC}"
echo -e "${BLUE}==================================${NC}"
echo ""

echo -e "${YELLOW}快速修复建议:${NC}"
echo ""

# 根据检查结果给出建议
if [ -z "$MCP_CONTAINER" ]; then
    echo -e "${WARN_MARK} MCP容器未运行"
    echo "   建议: cd /path/to/new-ai-proj && docker-compose -f docker-compose.prod.yml up -d mcp-server-prod"
    echo ""
fi

if ! curl -s --max-time 3 http://localhost:3100/health > /dev/null 2>&1; then
    echo -e "${WARN_MARK} MCP服务健康检查失败"
    echo "   建议: 查看容器日志 docker logs ai_mcp_server_prod"
    echo ""
fi

if ! curl -s --max-time 3 http://localhost/mcp/health > /dev/null 2>&1; then
    echo -e "${WARN_MARK} Nginx代理配置可能有问题"
    echo "   建议: docker exec ai_nginx nginx -t && docker restart ai_nginx"
    echo ""
fi

echo -e "${INFO_MARK} 详细故障排查请参考: TROUBLESHOOTING.md"
echo ""
