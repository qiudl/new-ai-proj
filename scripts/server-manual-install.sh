#!/bin/bash

# 腾讯云轻量服务器手动安装脚本
# 请在服务器上直接运行此脚本

set -e

echo "🚀 腾讯云轻量服务器环境准备脚本"
echo "========================================="

# 更新系统
echo "📦 更新系统包..."
sudo apt update

# 安装基础工具
echo "🔧 安装基础工具..."
sudo apt install -y curl wget git vim htop unzip

# 安装Docker
if ! command -v docker >/dev/null 2>&1; then
    echo "🐳 安装Docker..."
    
    # 快速安装方法 - 使用snap（通常更可靠）
    if command -v snap >/dev/null 2>&1; then
        echo "使用snap安装Docker..."
        sudo snap install docker
        sudo groupadd docker 2>/dev/null || true
        sudo usermod -aG docker $USER
    else
        # 传统安装方法
        echo "使用官方脚本安装Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo usermod -aG docker $USER
    fi
    
    # 启动Docker服务
    sudo systemctl start docker
    sudo systemctl enable docker
    
    echo "✅ Docker安装完成"
else
    echo "✅ Docker已安装"
fi

# 安装Docker Compose
if ! command -v docker-compose >/dev/null 2>&1 && ! docker compose version >/dev/null 2>&1; then
    echo "📦 安装Docker Compose..."
    
    # 优先使用apt安装插件版本
    if sudo apt install -y docker-compose-plugin; then
        echo "✅ Docker Compose Plugin安装成功"
    else
        # 备用：直接下载二进制文件
        echo "下载Docker Compose二进制文件..."
        sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
        echo "✅ Docker Compose安装完成"
    fi
else
    echo "✅ Docker Compose已安装"
fi

# 创建项目目录
echo "📁 创建项目目录..."
sudo mkdir -p /opt/ai-project
sudo chown -R $USER:$USER /opt/ai-project

echo ""
echo "🎉 环境准备完成！"
echo ""
echo "下一步操作："
echo "1. 请退出SSH并重新登录以获得Docker组权限"
echo "2. 然后运行部署脚本："
echo "   cd /opt/ai-project"
echo "   wget https://raw.githubusercontent.com/qiudl/new-ai-proj/main/scripts/quick-deploy.sh"
echo "   chmod +x quick-deploy.sh"
echo "   ./quick-deploy.sh"
echo ""
echo "或者使用GitHub Actions的 'Deploy to Lightweight Server (Ultra Simple)' 工作流"