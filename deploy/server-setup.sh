#!/bin/bash

# AI项目管理平台服务器部署脚本
# 使用方法: ./server-setup.sh

set -e

echo "=== AI项目管理平台服务器部署脚本 ==="
echo "服务器: 152.136.104.251"
echo "仓库: git@github.com:qiudl/new-ai-proj.git"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 项目配置
PROJECT_NAME="new-ai-proj"
PROJECT_DIR="/home/ubuntu/projects/$PROJECT_NAME"
GITHUB_REPO="git@github.com:qiudl/new-ai-proj.git"

# 函数：打印带颜色的消息
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否以ubuntu用户运行
if [ "$USER" != "ubuntu" ]; then
    print_error "请以ubuntu用户运行此脚本"
    exit 1
fi

# 1. 更新系统
print_status "更新系统包..."
sudo apt update && sudo apt upgrade -y

# 2. 安装必要的软件
print_status "安装必要的软件包..."
sudo apt install -y \
    git \
    curl \
    wget \
    vim \
    htop \
    unzip \
    build-essential \
    ca-certificates \
    gnupg \
    lsb-release

# 3. 安装Docker
print_status "安装Docker..."
if ! command -v docker &> /dev/null; then
    # 添加Docker官方GPG密钥
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    # 设置Docker仓库
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # 安装Docker Engine
    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # 将ubuntu用户添加到docker组
    sudo usermod -aG docker ubuntu
    
    print_status "Docker安装完成"
else
    print_status "Docker已安装"
fi

# 4. 安装Docker Compose (如果没有)
print_status "检查Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    print_status "Docker Compose安装完成"
else
    print_status "Docker Compose已安装"
fi

# 5. 安装Node.js (用于前端构建)
print_status "安装Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
    print_status "Node.js安装完成"
else
    print_status "Node.js已安装"
fi

# 6. 安装Go (用于后端构建)
print_status "安装Go..."
if ! command -v go &> /dev/null; then
    GO_VERSION="1.22.0"
    wget https://golang.org/dl/go${GO_VERSION}.linux-amd64.tar.gz
    sudo rm -rf /usr/local/go
    sudo tar -C /usr/local -xzf go${GO_VERSION}.linux-amd64.tar.gz
    rm go${GO_VERSION}.linux-amd64.tar.gz
    
    # 添加Go到PATH
    echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
    echo 'export GOPATH=$HOME/go' >> ~/.bashrc
    echo 'export PATH=$PATH:$GOPATH/bin' >> ~/.bashrc
    
    print_status "Go安装完成"
else
    print_status "Go已安装"
fi

# 7. 创建项目目录
print_status "创建项目目录..."
mkdir -p /home/ubuntu/projects
cd /home/ubuntu/projects

# 8. 克隆项目（如果不存在）
if [ ! -d "$PROJECT_DIR" ]; then
    print_status "克隆项目仓库..."
    git clone $GITHUB_REPO $PROJECT_NAME
    cd $PROJECT_NAME
else
    print_status "项目目录已存在，更新代码..."
    cd $PROJECT_NAME
    git pull origin main
fi

# 9. 设置Git配置
print_status "设置Git配置..."
git config user.name "ubuntu"
git config user.email "ubuntu@server"

# 10. 创建部署相关目录
print_status "创建部署目录..."
mkdir -p logs
mkdir -p backups
mkdir -p ssl

# 11. 设置环境变量文件
print_status "创建环境变量文件..."
if [ ! -f .env.production ]; then
    cp .env.example .env.production
    print_warning "请编辑 .env.production 文件配置生产环境变量"
fi

# 12. 设置防火墙规则
print_status "配置防火墙..."
sudo ufw allow 22      # SSH
sudo ufw allow 80      # HTTP
sudo ufw allow 443     # HTTPS
sudo ufw allow 8080    # 后端API (可选)
sudo ufw allow 3000    # 前端开发服务器 (可选)
sudo ufw --force enable

# 13. 创建systemd服务文件
print_status "创建systemd服务文件..."
sudo tee /etc/systemd/system/ai-project.service > /dev/null <<EOF
[Unit]
Description=AI Project Management Platform
After=network.target
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/bin/docker-compose up -d
ExecStop=/usr/bin/docker-compose down
User=ubuntu
Group=ubuntu

[Install]
WantedBy=multi-user.target
EOF

# 14. 重新加载systemd并启用服务
sudo systemctl daemon-reload
sudo systemctl enable ai-project.service

# 15. 设置日志轮转
print_status "设置日志轮转..."
sudo tee /etc/logrotate.d/ai-project > /dev/null <<EOF
$PROJECT_DIR/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 ubuntu ubuntu
}
EOF

print_status "=== 服务器设置完成 ==="
print_status "项目目录: $PROJECT_DIR"
print_status "下一步："
print_status "1. 编辑 .env.production 文件"
print_status "2. 运行 'docker-compose up -d' 启动服务"
print_status "3. 检查服务状态 'docker-compose ps'"
print_status ""
print_warning "注意：重新登录以使Docker组权限生效，或运行 'newgrp docker'"