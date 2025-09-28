#!/bin/bash

# 腾讯云服务器连接和环境检查脚本
# 服务器: 152.136.104.251

set -e

SERVER_IP="152.136.104.251"
SERVER_USER="root"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# 检查本机SSH连接
check_ssh_connection() {
    log_info "检查SSH连接到 $SERVER_IP..."
    
    if timeout 10 ssh -o ConnectTimeout=5 -o BatchMode=yes $SERVER_USER@$SERVER_IP "echo 'SSH连接测试成功'" 2>/dev/null; then
        log_success "SSH连接正常"
        return 0
    else
        log_warning "SSH连接失败，请检查："
        echo "  1. 服务器是否运行：ping $SERVER_IP"
        echo "  2. SSH服务是否启动：telnet $SERVER_IP 22"
        echo "  3. SSH密钥是否配置正确"
        echo "  4. 防火墙是否允许SSH连接"
        return 1
    fi
}

# 检查服务器基本信息
check_server_info() {
    log_info "获取服务器基本信息..."
    
    cat > /tmp/server_check.sh << 'EOF'
#!/bin/bash
echo "=== 服务器基本信息 ==="
echo "主机名: $(hostname)"
echo "操作系统: $(lsb_release -d 2>/dev/null | cut -f2 || cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)"
echo "内核版本: $(uname -r)"
echo "架构: $(uname -m)"
echo "CPU核心数: $(nproc)"
echo "内存总量: $(free -h | grep Mem | awk '{print $2}')"
echo "磁盘空间: $(df -h / | tail -1 | awk '{print $2 " 总计, " $4 " 可用"}')"
echo "当前用户: $(whoami)"
echo "系统时间: $(date)"
echo "运行时间: $(uptime)"
echo ""
echo "=== 网络配置 ==="
echo "内网IP: $(ip route get 1 | awk '{print $7}' | head -1)"
echo "外网IP: $(curl -s ifconfig.me || echo '获取失败')"
echo ""
echo "=== 已安装的软件 ==="
echo "Docker: $(docker --version 2>/dev/null || echo '未安装')"
echo "Docker Compose: $(docker-compose --version 2>/dev/null || echo '未安装')"
echo "Node.js: $(node --version 2>/dev/null || echo '未安装')"
echo "Go: $(go version 2>/dev/null || echo '未安装')"
echo "Git: $(git --version 2>/dev/null || echo '未安装')"
echo "Nginx: $(nginx -v 2>&1 | head -1 || echo '未安装')"
echo ""
echo "=== 防火墙状态 ==="
ufw status 2>/dev/null || echo "UFW未配置"
echo ""
echo "=== 进程和端口 ==="
echo "监听的端口："
netstat -tlnp 2>/dev/null | grep LISTEN | head -10 || ss -tlnp | grep LISTEN | head -10
EOF
    
    if scp /tmp/server_check.sh $SERVER_USER@$SERVER_IP:/tmp/server_check.sh >/dev/null 2>&1; then
        ssh $SERVER_USER@$SERVER_IP "chmod +x /tmp/server_check.sh && /tmp/server_check.sh && rm /tmp/server_check.sh"
        rm /tmp/server_check.sh
        log_success "服务器信息获取完成"
    else
        log_error "无法上传检查脚本到服务器"
        return 1
    fi
}

# 检查是否需要初始化
check_initialization_needed() {
    log_info "检查服务器初始化状态..."
    
    INIT_NEEDED=0
    
    # 检查Docker
    if ! ssh $SERVER_USER@$SERVER_IP "docker --version" >/dev/null 2>&1; then
        log_warning "Docker 未安装"
        INIT_NEEDED=1
    fi
    
    # 检查部署用户
    if ! ssh $SERVER_USER@$SERVER_IP "id aiproject" >/dev/null 2>&1; then
        log_warning "部署用户 aiproject 不存在"
        INIT_NEEDED=1
    fi
    
    # 检查项目目录
    if ! ssh $SERVER_USER@$SERVER_IP "test -d /opt/ai-project" >/dev/null 2>&1; then
        log_warning "项目目录 /opt/ai-project 不存在"
        INIT_NEEDED=1
    fi
    
    if [[ $INIT_NEEDED -eq 1 ]]; then
        log_warning "服务器需要初始化"
        return 1
    else
        log_success "服务器已初始化"
        return 0
    fi
}

# 测试网络连通性
test_network() {
    log_info "测试网络连通性..."
    
    # 测试从本机到服务器
    if ping -c 3 $SERVER_IP >/dev/null 2>&1; then
        log_success "本机到服务器网络连通"
    else
        log_error "本机到服务器网络不通"
        return 1
    fi
    
    # 测试服务器外网连接
    if ssh $SERVER_USER@$SERVER_IP "curl -s --connect-timeout 5 google.com >/dev/null" 2>/dev/null; then
        log_success "服务器外网连接正常"
    else
        log_warning "服务器外网连接可能有问题"
    fi
}

# 主函数
main() {
    log_info "=== 腾讯云服务器环境检查 ==="
    echo "服务器: $SERVER_IP"
    echo "用户: $SERVER_USER"
    echo "检查时间: $(date)"
    echo ""
    
    # 执行检查
    if check_ssh_connection; then
        check_server_info
        test_network
        
        if check_initialization_needed; then
            log_success "服务器环境检查完成，无需初始化"
        else
            log_info "服务器需要初始化，请运行 init-server.sh 脚本"
            echo ""
            echo "初始化命令："
            echo "  scp deploy/tencent-cloud/scripts/init-server.sh $SERVER_USER@$SERVER_IP:/tmp/"
            echo "  ssh $SERVER_USER@$SERVER_IP 'chmod +x /tmp/init-server.sh && sudo /tmp/init-server.sh'"
        fi
    else
        log_error "无法连接到服务器，请检查网络和SSH配置"
        return 1
    fi
}

main "$@"