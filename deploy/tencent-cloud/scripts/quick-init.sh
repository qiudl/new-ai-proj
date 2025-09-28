#!/bin/bash

# 腾讯云服务器一键初始化脚本
# 使用方法：./quick-init.sh

set -e

SERVER_IP="152.136.104.251"
SERVER_USER="root"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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

# 检查本地文件
check_local_files() {
    log_info "检查本地文件..."
    
    if [[ ! -f "$SCRIPT_DIR/init-server.sh" ]]; then
        log_error "找不到 init-server.sh 脚本"
        exit 1
    fi
    
    if [[ ! -x "$SCRIPT_DIR/init-server.sh" ]]; then
        log_warning "init-server.sh 没有执行权限，正在修复..."
        chmod +x "$SCRIPT_DIR/init-server.sh"
    fi
    
    log_success "本地文件检查完成"
}

# 测试服务器连接
test_connection() {
    log_info "测试服务器连接..."
    
    if ping -c 2 -W 5 "$SERVER_IP" >/dev/null 2>&1; then
        log_success "服务器网络连通"
    else
        log_error "无法ping通服务器 $SERVER_IP"
        exit 1
    fi
    
    if timeout 10 ssh -o ConnectTimeout=5 -o BatchMode=yes "$SERVER_USER@$SERVER_IP" "echo 'SSH测试成功'" >/dev/null 2>&1; then
        log_success "SSH连接正常"
    else
        log_warning "SSH连接可能需要密码或密钥配置"
        log_info "请确保可以通过以下命令连接："
        echo "  ssh $SERVER_USER@$SERVER_IP"
        echo ""
        read -p "是否继续？(y/N) " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# 上传初始化脚本
upload_script() {
    log_info "上传初始化脚本到服务器..."
    
    if scp "$SCRIPT_DIR/init-server.sh" "$SERVER_USER@$SERVER_IP:/tmp/init-server.sh"; then
        log_success "脚本上传成功"
    else
        log_error "脚本上传失败"
        log_info "你可以手动复制脚本内容到服务器："
        echo "1. 登录服务器: ssh $SERVER_USER@$SERVER_IP"
        echo "2. 创建脚本: vim /tmp/init-server.sh"
        echo "3. 复制脚本内容并保存"
        echo "4. 执行: chmod +x /tmp/init-server.sh && /tmp/init-server.sh"
        exit 1
    fi
}

# 执行初始化
execute_init() {
    log_info "在服务器上执行初始化脚本..."
    log_warning "这个过程可能需要10-15分钟，请耐心等待..."
    
    if ssh "$SERVER_USER@$SERVER_IP" "chmod +x /tmp/init-server.sh && /tmp/init-server.sh"; then
        log_success "服务器初始化完成！"
    else
        log_error "初始化脚本执行失败"
        log_info "请登录服务器查看详细错误信息："
        echo "  ssh $SERVER_USER@$SERVER_IP"
        echo "  cat /tmp/init-server.sh"
        echo "  bash -x /tmp/init-server.sh"
        exit 1
    fi
}

# 验证安装
verify_installation() {
    log_info "验证安装结果..."
    
    ssh "$SERVER_USER@$SERVER_IP" << 'EOF'
echo "=== 验证安装结果 ==="
echo "Docker版本: $(docker --version 2>/dev/null || echo '未安装')"
echo "Docker Compose版本: $(docker-compose --version 2>/dev/null || echo '未安装')"
echo "Node.js版本: $(node --version 2>/dev/null || echo '未安装')"
echo "Go版本: $(go version 2>/dev/null || echo '未安装')"
echo ""
echo "部署用户: $(id aiproject 2>/dev/null || echo '不存在')"
echo "项目目录: $(ls -ld /opt/ai-project 2>/dev/null || echo '不存在')"
echo ""
echo "防火墙状态:"
ufw status 2>/dev/null || echo "UFW未配置"
echo ""
echo "Docker服务状态:"
systemctl is-active docker 2>/dev/null || echo "Docker服务未运行"
EOF
    
    log_success "验证完成"
}

# 显示后续步骤
show_next_steps() {
    log_info "=== 初始化完成！后续步骤 ==="
    echo ""
    echo "1. 切换到部署用户并克隆代码："
    echo "   ssh $SERVER_USER@$SERVER_IP"
    echo "   su - aiproject"
    echo "   cd /opt/ai-project"
    echo "   git clone https://github.com/your-username/ai-project.git ."
    echo ""
    echo "2. 配置环境变量："
    echo "   cp deploy/tencent-cloud/.env.prod .env"
    echo "   vim .env  # 修改密码和配置"
    echo ""
    echo "3. 执行部署："
    echo "   ./deploy/tencent-cloud/scripts/deploy.sh"
    echo ""
    echo "访问地址将是："
    echo "   https://$SERVER_IP"
    echo "   https://$SERVER_IP/docs (API文档)"
    echo ""
    log_success "任务2159：服务器环境初始化完成！🎉"
}

# 主函数
main() {
    log_info "=== 腾讯云服务器一键初始化 ==="
    echo "服务器: $SERVER_IP"
    echo "用户: $SERVER_USER"
    echo ""
    
    check_local_files
    test_connection
    upload_script
    execute_init
    verify_installation
    show_next_steps
}

# 运行主函数
main "$@"