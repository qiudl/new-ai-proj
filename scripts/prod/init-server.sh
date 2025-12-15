#!/bin/bash
# init-server.sh - 一键初始化生产服务器（本地执行）
# 用法: ./scripts/prod/init-server.sh

set -e

# 配置
SERVER_IP="${PROD_SERVER_IP:?请设置 PROD_SERVER_IP 环境变量}"
SERVER_USER="${PROD_SERVER_USER:-ubuntu}"
DEPLOY_USER="ubuntu"
SSH_KEY="${PROD_SSH_KEY:-~/.ssh/id_rsa}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

echo ""
echo -e "${CYAN}==========================================${NC}"
echo -e "${CYAN}🚀 生产服务器一键初始化${NC}"
echo -e "${CYAN}==========================================${NC}"
echo "  服务器: $SERVER_USER@$SERVER_IP"
echo "  部署用户: $DEPLOY_USER"
echo -e "${CYAN}==========================================${NC}"
echo ""

# 确认
read -p "确认初始化服务器? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "已取消"
    exit 0
fi

# Step 1: 执行服务器初始化脚本
log "Step 1/5: 初始化服务器环境..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" 'bash -s' < "$SCRIPT_DIR/server/setup-server.sh"
log_success "服务器环境初始化完成"

# Step 2: 上传配置文件
log "Step 2/5: 上传配置文件..."

# Nginx 配置
scp -i "$SSH_KEY" "$SCRIPT_DIR/server/nginx-ai-project.conf" "$SERVER_USER@$SERVER_IP:/tmp/"
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" << 'ENDSSH'
sudo cp /tmp/nginx-ai-project.conf /etc/nginx/sites-available/ai-project
sudo ln -sf /etc/nginx/sites-available/ai-project /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
ENDSSH

# Supervisor 配置
scp -i "$SSH_KEY" "$SCRIPT_DIR/server/ai-backend.conf" "$SERVER_USER@$SERVER_IP:/tmp/"
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" 'sudo cp /tmp/ai-backend.conf /etc/supervisor/conf.d/'

# 日志轮转配置
scp -i "$SSH_KEY" "$SCRIPT_DIR/server/logrotate-ai-project" "$SERVER_USER@$SERVER_IP:/tmp/"
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" 'sudo cp /tmp/logrotate-ai-project /etc/logrotate.d/ai-project'

log_success "配置文件上传完成"

# Step 3: 上传运维脚本
log "Step 3/5: 上传运维脚本..."
scp -i "$SSH_KEY" "$SCRIPT_DIR/server/"*.sh "$SERVER_USER@$SERVER_IP:/tmp/"
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" << 'ENDSSH'
sudo cp /tmp/*.sh /opt/ai-project/scripts/
sudo chmod +x /opt/ai-project/scripts/*.sh
sudo chown -R ubuntu:ubuntu /opt/ai-project/scripts/
ENDSSH
log_success "运维脚本上传完成"

# Step 4: 上传环境变量模板
log "Step 4/5: 配置环境变量..."
scp -i "$SSH_KEY" "$SCRIPT_DIR/server/.env.prod.example" "$SERVER_USER@$SERVER_IP:/tmp/"
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" << 'ENDSSH'
if [ ! -f /opt/ai-project/backend/.env.prod ]; then
    sudo cp /tmp/.env.prod.example /opt/ai-project/backend/.env.prod
    sudo chown ubuntu:ubuntu /opt/ai-project/backend/.env.prod
    sudo chmod 600 /opt/ai-project/backend/.env.prod
    echo "⚠️  请编辑 /opt/ai-project/backend/.env.prod 配置敏感信息"
else
    echo "✓ .env.prod 已存在，跳过"
fi
ENDSSH
log_success "环境变量配置完成"

# Step 5: 重载服务配置
log "Step 5/5: 重载服务配置..."
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" << 'ENDSSH'
sudo supervisorctl reread
sudo supervisorctl update
sudo nginx -t && sudo systemctl reload nginx
ENDSSH
log_success "服务配置重载完成"

echo ""
echo -e "${CYAN}==========================================${NC}"
log_success "🎉 服务器初始化完成!"
echo -e "${CYAN}==========================================${NC}"
echo ""
echo "下一步操作:"
echo "  1. SSH 到服务器编辑环境变量:"
echo "     ssh $DEPLOY_USER@$SERVER_IP"
echo "     vim /opt/ai-project/backend/.env.prod"
echo ""
echo "  2. 配置数据库密码和 JWT 密钥"
echo ""
echo "  3. 执行首次部署:"
echo "     ./scripts/prod/deploy-scp.sh"
echo ""
echo -e "${CYAN}==========================================${NC}"
