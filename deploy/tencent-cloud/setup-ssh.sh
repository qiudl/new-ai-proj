#!/bin/bash

# SSH密钥生成和配置脚本
# 用于配置本地到腾讯云服务器的无密码SSH访问

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] $1${NC}"
    exit 1
}

# 配置
SERVER_IP="${SERVER_IP:-}"
SERVER_USER="${SERVER_USER:-ubuntu}"
SSH_KEY_PATH="$HOME/.ssh/id_rsa"
SSH_PUB_PATH="$HOME/.ssh/id_rsa.pub"

# 检查参数
if [ -z "$SERVER_IP" ]; then
    echo "用法: SERVER_IP=your-server-ip $0"
    echo "或者: export SERVER_IP=your-server-ip && $0"
    exit 1
fi

# 1. 生成SSH密钥（如果不存在）
generate_ssh_key() {
    log "检查SSH密钥..."
    
    if [ -f "$SSH_KEY_PATH" ]; then
        log "SSH密钥已存在: $SSH_KEY_PATH"
    else
        log "生成新的SSH密钥..."
        ssh-keygen -t rsa -b 4096 -C "ai-project-deploy@$(hostname)" -f "$SSH_KEY_PATH" -N ""
        log "SSH密钥生成完成"
    fi
}

# 2. 复制公钥到服务器
copy_public_key() {
    log "复制公钥到服务器 $SERVER_USER@$SERVER_IP..."
    
    if ! ssh-copy-id -i "$SSH_PUB_PATH" "$SERVER_USER@$SERVER_IP"; then
        error "公钥复制失败，请检查服务器地址和密码"
    fi
    
    log "公钥复制完成"
}

# 3. 测试SSH连接
test_connection() {
    log "测试无密码SSH连接..."
    
    if ssh -o BatchMode=yes -o ConnectTimeout=10 "$SERVER_USER@$SERVER_IP" "echo 'SSH连接测试成功'"; then
        log "无密码SSH连接配置成功！"
    else
        error "SSH连接测试失败"
    fi
}

# 4. 配置SSH客户端
configure_ssh_client() {
    log "配置SSH客户端..."
    
    SSH_CONFIG="$HOME/.ssh/config"
    
    # 创建SSH配置条目
    cat >> "$SSH_CONFIG" << EOF

# AI项目腾讯云服务器
Host ai-project-server
    HostName $SERVER_IP
    User $SERVER_USER
    IdentityFile $SSH_KEY_PATH
    ServerAliveInterval 60
    ServerAliveCountMax 3
EOF
    
    # 设置正确的权限
    chmod 600 "$SSH_CONFIG"
    
    log "SSH客户端配置完成"
    log "现在可以使用 'ssh ai-project-server' 连接服务器"
}

# 5. 显示使用说明
show_usage() {
    echo ""
    echo "=== SSH配置完成 ==="
    echo ""
    echo "现在可以使用以下方式连接服务器："
    echo "1. ssh $SERVER_USER@$SERVER_IP"
    echo "2. ssh ai-project-server"
    echo ""
    echo "同步代码到服务器："
    echo "  export SERVER_IP=$SERVER_IP"
    echo "  ./sync-to-server.sh"
    echo ""
    echo "一键同步、构建和部署："
    echo "  export SERVER_IP=$SERVER_IP"  
    echo "  ./sync-to-server.sh --build --deploy"
}

# 主函数
main() {
    log "=== SSH密钥配置工具 ==="
    log "服务器: $SERVER_USER@$SERVER_IP"
    
    generate_ssh_key
    copy_public_key
    test_connection
    configure_ssh_client
    show_usage
    
    log "SSH配置完成！"
}

main "$@"