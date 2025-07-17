#!/bin/bash

# SSL证书设置脚本 - 使用Let's Encrypt获取免费SSL证书
# 使用方法: ./ssl-setup.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
DOMAIN="proj.joylodging.com"
EMAIL="admin@joylodging.com"  # 请更改为实际邮箱
PROJECT_DIR="/home/ubuntu/projects/new-ai-proj"

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

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# 检查是否以root用户运行
if [ "$EUID" -ne 0 ]; then
    print_error "请以root用户运行此脚本: sudo $0"
    exit 1
fi

print_step "=== SSL证书设置 ==="
echo "域名: $DOMAIN"
echo "邮箱: $EMAIL"
echo "项目目录: $PROJECT_DIR"
echo ""

# 1. 安装Certbot
print_step "1. 安装Certbot..."
if ! command -v certbot &> /dev/null; then
    apt update
    apt install -y snapd
    snap install --classic certbot
    ln -sf /snap/bin/certbot /usr/bin/certbot
    print_status "Certbot安装完成"
else
    print_status "Certbot已安装"
fi

# 2. 创建webroot目录
print_step "2. 创建webroot目录..."
mkdir -p /var/www/certbot
chown -R www-data:www-data /var/www/certbot
print_status "webroot目录创建完成"

# 3. 创建SSL目录
print_step "3. 创建SSL目录..."
mkdir -p $PROJECT_DIR/ssl/live/$DOMAIN
mkdir -p $PROJECT_DIR/ssl/archive/$DOMAIN
print_status "SSL目录创建完成"

# 4. 临时启动HTTP服务器（用于域名验证）
print_step "4. 临时启动HTTP服务器..."
cd $PROJECT_DIR

# 创建临时nginx配置
cat > nginx/conf.d/temp-ssl.conf << 'EOF'
server {
    listen 80;
    server_name proj.joylodging.com;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 200 "SSL setup in progress...";
        add_header Content-Type text/plain;
    }
}
EOF

# 启动临时服务
docker-compose down || true
docker-compose up -d nginx
sleep 10

print_status "临时HTTP服务器启动完成"

# 5. 获取SSL证书
print_step "5. 获取SSL证书..."
certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    --domains $DOMAIN \
    --non-interactive \
    --verbose

if [ $? -eq 0 ]; then
    print_status "SSL证书获取成功"
else
    print_error "SSL证书获取失败"
    exit 1
fi

# 6. 复制证书到项目目录
print_step "6. 复制证书到项目目录..."
cp -L /etc/letsencrypt/live/$DOMAIN/fullchain.pem $PROJECT_DIR/ssl/live/$DOMAIN/
cp -L /etc/letsencrypt/live/$DOMAIN/privkey.pem $PROJECT_DIR/ssl/live/$DOMAIN/
cp -L /etc/letsencrypt/live/$DOMAIN/cert.pem $PROJECT_DIR/ssl/live/$DOMAIN/
cp -L /etc/letsencrypt/live/$DOMAIN/chain.pem $PROJECT_DIR/ssl/live/$DOMAIN/

# 设置权限
chown -R ubuntu:ubuntu $PROJECT_DIR/ssl/
chmod 644 $PROJECT_DIR/ssl/live/$DOMAIN/fullchain.pem
chmod 644 $PROJECT_DIR/ssl/live/$DOMAIN/cert.pem
chmod 644 $PROJECT_DIR/ssl/live/$DOMAIN/chain.pem
chmod 600 $PROJECT_DIR/ssl/live/$DOMAIN/privkey.pem

print_status "证书复制完成"

# 7. 删除临时配置
print_step "7. 清理临时配置..."
rm -f nginx/conf.d/temp-ssl.conf

# 8. 重启服务
print_step "8. 重启服务..."
docker-compose down
docker-compose up -d

print_status "服务重启完成"

# 9. 设置证书自动续期
print_step "9. 设置证书自动续期..."
cat > /etc/cron.d/certbot-renewal << EOF
# 每天凌晨2点检查证书续期
0 2 * * * root /usr/bin/certbot renew --quiet --deploy-hook "$PROJECT_DIR/deploy/ssl-deploy-hook.sh"
EOF

# 创建续期部署钩子
cat > $PROJECT_DIR/deploy/ssl-deploy-hook.sh << 'EOF'
#!/bin/bash
# SSL证书续期后的部署钩子

PROJECT_DIR="/home/ubuntu/projects/new-ai-proj"
DOMAIN="proj.joylodging.com"

# 复制新证书
cp -L /etc/letsencrypt/live/$DOMAIN/fullchain.pem $PROJECT_DIR/ssl/live/$DOMAIN/
cp -L /etc/letsencrypt/live/$DOMAIN/privkey.pem $PROJECT_DIR/ssl/live/$DOMAIN/
cp -L /etc/letsencrypt/live/$DOMAIN/cert.pem $PROJECT_DIR/ssl/live/$DOMAIN/
cp -L /etc/letsencrypt/live/$DOMAIN/chain.pem $PROJECT_DIR/ssl/live/$DOMAIN/

# 设置权限
chown -R ubuntu:ubuntu $PROJECT_DIR/ssl/
chmod 644 $PROJECT_DIR/ssl/live/$DOMAIN/fullchain.pem
chmod 644 $PROJECT_DIR/ssl/live/$DOMAIN/cert.pem
chmod 644 $PROJECT_DIR/ssl/live/$DOMAIN/chain.pem
chmod 600 $PROJECT_DIR/ssl/live/$DOMAIN/privkey.pem

# 重启nginx
cd $PROJECT_DIR
docker-compose restart nginx

echo "SSL证书续期部署完成: $(date)"
EOF

chmod +x $PROJECT_DIR/deploy/ssl-deploy-hook.sh
chown ubuntu:ubuntu $PROJECT_DIR/deploy/ssl-deploy-hook.sh

print_status "证书自动续期设置完成"

# 10. 验证SSL证书
print_step "10. 验证SSL证书..."
sleep 5
if openssl s_client -connect $DOMAIN:443 -servername $DOMAIN < /dev/null 2>/dev/null | grep -q "Verify return code: 0"; then
    print_status "SSL证书验证成功"
else
    print_warning "SSL证书验证失败，请检查配置"
fi

print_step "=== SSL设置完成 ==="
print_status "HTTPS网站访问地址: https://$DOMAIN"
print_status "证书路径: $PROJECT_DIR/ssl/live/$DOMAIN/"
print_status "自动续期: 已设置每日检查"
echo ""
print_status "下一步:"
print_status "1. 确认DNS记录指向服务器IP"
print_status "2. 访问 https://$DOMAIN 验证HTTPS"
print_status "3. 检查证书有效期: openssl x509 -in $PROJECT_DIR/ssl/live/$DOMAIN/cert.pem -text -noout | grep 'Not After'"