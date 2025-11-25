#!/bin/bash
# setup-server.sh - 初始化生产服务器环境
# 用法: ssh user@server 'bash -s' < scripts/prod/server/setup-server.sh

set -e

echo "=========================================="
echo "🔧 初始化生产服务器环境"
echo "=========================================="

# 配置
DEPLOY_USER="aiproject"
DEPLOY_DIR="/opt/ai-project"

# 更新系统
echo "📦 更新系统包..."
sudo apt update && sudo apt upgrade -y

# 安装基础依赖
echo "📦 安装基础依赖..."
sudo apt install -y \
    curl wget git vim htop \
    build-essential \
    nginx \
    postgresql postgresql-contrib \
    redis-server \
    supervisor \
    certbot python3-certbot-nginx \
    jq

# 创建部署用户
echo "👤 创建部署用户..."
if ! id "$DEPLOY_USER" &>/dev/null; then
    sudo useradd -m -s /bin/bash $DEPLOY_USER
    echo "$DEPLOY_USER ALL=(ALL) NOPASSWD: /usr/bin/supervisorctl, /usr/sbin/nginx, /usr/bin/systemctl" | sudo tee /etc/sudoers.d/$DEPLOY_USER
    sudo chmod 440 /etc/sudoers.d/$DEPLOY_USER
fi

# 创建目录结构
echo "📁 创建目录结构..."
sudo mkdir -p $DEPLOY_DIR/{backend,frontend/build,config,logs,backups,ssl,scripts}
sudo chown -R $DEPLOY_USER:$DEPLOY_USER $DEPLOY_DIR

# 配置 PostgreSQL
echo "🐘 配置 PostgreSQL..."
sudo -u postgres psql -c "SELECT 1 FROM pg_roles WHERE rolname='ai_prod_user'" | grep -q 1 || {
    sudo -u postgres psql << 'EOF'
CREATE USER ai_prod_user WITH PASSWORD 'change-this-password';
CREATE DATABASE ai_project_prod OWNER ai_prod_user ENCODING 'UTF8';
GRANT ALL PRIVILEGES ON DATABASE ai_project_prod TO ai_prod_user;
EOF
}

# 配置 Redis
echo "📦 配置 Redis..."
sudo sed -i 's/^bind .*/bind 127.0.0.1/' /etc/redis/redis.conf
sudo systemctl restart redis-server

# 配置 Nginx
echo "🌐 配置 Nginx..."
sudo rm -f /etc/nginx/sites-enabled/default

# 启动服务
echo "🚀 启动服务..."
sudo systemctl enable nginx postgresql redis-server supervisor
sudo systemctl start nginx postgresql redis-server supervisor

# 显示状态
echo ""
echo "=========================================="
echo "✅ 服务器初始化完成"
echo "=========================================="
echo ""
echo "服务状态:"
sudo systemctl is-active nginx && echo "  Nginx: 运行中" || echo "  Nginx: 未运行"
sudo systemctl is-active postgresql && echo "  PostgreSQL: 运行中" || echo "  PostgreSQL: 未运行"
sudo systemctl is-active redis-server && echo "  Redis: 运行中" || echo "  Redis: 未运行"
sudo systemctl is-active supervisor && echo "  Supervisor: 运行中" || echo "  Supervisor: 未运行"
echo ""
echo "下一步:"
echo "  1. 上传 Nginx 配置到 /etc/nginx/sites-available/ai-project"
echo "  2. 上传 Supervisor 配置到 /etc/supervisor/conf.d/ai-backend.conf"
echo "  3. 配置 .env.prod 环境变量"
echo "  4. 运行部署脚本"
echo ""
