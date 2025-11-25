#!/bin/bash
# setup-ssl.sh - SSL 证书配置脚本
# 用法: ./setup-ssl.sh [域名] [邮箱]

set -e

DEPLOY_DIR="/opt/ai-project"
DOMAIN="${1:-}"
EMAIL="${2:-admin@example.com}"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

echo ""
echo "=========================================="
echo "🔐 SSL 证书配置"
echo "=========================================="

# 检查参数
if [ -z "$DOMAIN" ]; then
    echo "用法: $0 <域名> [邮箱]"
    echo ""
    echo "示例:"
    echo "  $0 ai.example.com admin@example.com"
    echo "  $0 192.168.1.100  # 使用自签名证书"
    exit 1
fi

# 创建 SSL 目录
mkdir -p "$DEPLOY_DIR/ssl"

# 判断是 IP 还是域名
if [[ "$DOMAIN" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    # IP 地址 - 使用自签名证书
    log "检测到 IP 地址，将创建自签名证书..."

    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$DEPLOY_DIR/ssl/privkey.pem" \
        -out "$DEPLOY_DIR/ssl/fullchain.pem" \
        -subj "/C=CN/ST=Beijing/L=Beijing/O=AI Project/CN=$DOMAIN"

    # 创建证书链（自签名时与证书相同）
    cp "$DEPLOY_DIR/ssl/fullchain.pem" "$DEPLOY_DIR/ssl/chain.pem"

    log_success "自签名证书创建完成"
    log_warning "注意: 自签名证书会导致浏览器警告"
else
    # 域名 - 使用 Let's Encrypt
    log "将使用 Let's Encrypt 申请证书..."

    # 检查 certbot
    if ! command -v certbot &> /dev/null; then
        log "安装 certbot..."
        sudo apt update
        sudo apt install -y certbot python3-certbot-nginx
    fi

    # 停止 nginx 以释放 80 端口
    log "暂停 Nginx..."
    sudo systemctl stop nginx || true

    # 申请证书
    log "申请证书..."
    sudo certbot certonly --standalone \
        --agree-tos \
        --no-eff-email \
        --email "$EMAIL" \
        -d "$DOMAIN" \
        --non-interactive

    # 复制证书
    log "复制证书到项目目录..."
    sudo cp -L "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$DEPLOY_DIR/ssl/"
    sudo cp -L "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$DEPLOY_DIR/ssl/"
    sudo cp -L "/etc/letsencrypt/live/$DOMAIN/chain.pem" "$DEPLOY_DIR/ssl/"
    sudo chown -R aiproject:aiproject "$DEPLOY_DIR/ssl/"

    # 启动 nginx
    sudo systemctl start nginx

    log_success "Let's Encrypt 证书申请完成"

    # 设置自动续期
    log "配置证书自动续期..."
    (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --post-hook 'cp -L /etc/letsencrypt/live/$DOMAIN/*.pem $DEPLOY_DIR/ssl/ && systemctl reload nginx'") | crontab -
    log_success "自动续期已配置"
fi

# 更新 Nginx 配置启用 SSL
log "更新 Nginx 配置..."

# 创建 HTTPS 配置
cat > /tmp/nginx-ssl.conf << EOF
# AI项目管理系统 - HTTPS 配置
# 自动生成于 $(date)

upstream backend {
    server 127.0.0.1:8080 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

# HTTP 重定向到 HTTPS
server {
    listen 80;
    server_name $DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS 主站点
server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    # SSL 证书
    ssl_certificate $DEPLOY_DIR/ssl/fullchain.pem;
    ssl_certificate_key $DEPLOY_DIR/ssl/privkey.pem;

    # SSL 优化
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    # 安全头
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # 前端
    root $DEPLOY_DIR/frontend/build;
    index index.html;

    # API
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 30s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket
    location /ws/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400s;
    }

    # SPA
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1M;
        add_header Cache-Control "public";
        access_log off;
    }

    # 健康检查
    location /health {
        access_log off;
        return 200 "healthy\\n";
    }
}
EOF

sudo cp /tmp/nginx-ssl.conf /etc/nginx/sites-available/ai-project
sudo nginx -t && sudo systemctl reload nginx

echo ""
echo "=========================================="
log_success "🔐 SSL 配置完成!"
echo "=========================================="
echo ""
echo "访问地址: https://$DOMAIN"
echo "证书位置: $DEPLOY_DIR/ssl/"
echo ""
