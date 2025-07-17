#!/bin/bash

# 直接在服务器上运行的SSL证书设置脚本
# 使用方法: 在服务器上运行 ./ssl-direct-setup.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
DOMAIN="proj.joylodging.com"
EMAIL="admin@joylodging.com"
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

# 检查是否在正确的目录
if [ ! -f "docker-compose.yml" ]; then
    print_error "请在项目根目录中运行此脚本"
    print_error "当前目录: $(pwd)"
    print_error "预期目录: $PROJECT_DIR"
    exit 1
fi

print_step "=== 直接SSL证书设置 ==="
echo "域名: $DOMAIN"
echo "邮箱: $EMAIL"
echo "项目目录: $(pwd)"
echo ""

# 1. 检查系统权限
print_step "1. 检查系统权限..."
if [ "$EUID" -eq 0 ]; then
    print_status "以root用户运行"
else
    print_warning "以普通用户运行，某些操作可能需要sudo权限"
fi

# 2. 安装Certbot
print_step "2. 安装Certbot..."
if ! command -v certbot &> /dev/null; then
    print_status "正在安装Certbot..."
    sudo apt update
    sudo apt install -y snapd
    sudo snap install --classic certbot
    sudo ln -sf /snap/bin/certbot /usr/bin/certbot
    print_status "Certbot安装完成"
else
    print_status "Certbot已安装"
fi

# 3. 创建webroot目录
print_step "3. 创建webroot目录..."
sudo mkdir -p /var/www/certbot
sudo chown -R www-data:www-data /var/www/certbot || sudo chown -R ubuntu:ubuntu /var/www/certbot
print_status "webroot目录创建完成"

# 4. 创建SSL目录
print_step "4. 创建SSL目录..."
mkdir -p ssl/live/$DOMAIN
mkdir -p ssl/archive/$DOMAIN
print_status "SSL目录创建完成"

# 5. 检查DNS解析
print_step "5. 检查DNS解析..."
if nslookup $DOMAIN | grep -q "152.136.104.251"; then
    print_status "DNS解析正确"
else
    print_warning "DNS解析可能未生效，请确保域名指向正确的IP地址"
    print_warning "域名: $DOMAIN"
    print_warning "应该指向: 152.136.104.251"
    read -p "是否继续? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "请先配置DNS解析"
        exit 1
    fi
fi

# 6. 创建临时nginx配置用于验证
print_step "6. 创建临时nginx配置..."
cat > nginx/conf.d/temp-ssl.conf << 'EOF'
server {
    listen 80;
    server_name proj.joylodging.com;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 200 "SSL setup in progress... Please wait.";
        add_header Content-Type text/plain;
    }
}
EOF

# 7. 启动临时服务
print_step "7. 启动临时服务..."
docker-compose down || true
sleep 2
docker-compose up -d nginx postgres
sleep 10

# 检查nginx是否正常启动
if docker-compose ps | grep nginx | grep -q "Up"; then
    print_status "Nginx服务启动成功"
else
    print_error "Nginx服务启动失败"
    docker-compose logs nginx
    exit 1
fi

# 8. 测试HTTP访问
print_step "8. 测试HTTP访问..."
if curl -f -s http://$DOMAIN/ > /dev/null; then
    print_status "HTTP访问正常"
else
    print_warning "HTTP访问可能有问题，但继续尝试获取证书"
fi

# 9. 获取SSL证书
print_step "9. 获取SSL证书..."
print_status "正在从Let's Encrypt获取证书，请稍等..."

if sudo certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    --domains $DOMAIN \
    --non-interactive \
    --verbose; then
    print_status "SSL证书获取成功"
else
    print_error "SSL证书获取失败"
    print_error "可能的原因："
    print_error "1. DNS解析未生效"
    print_error "2. 防火墙阻止了80端口"
    print_error "3. 域名验证失败"
    exit 1
fi

# 10. 复制证书到项目目录
print_step "10. 复制证书到项目目录..."
sudo cp -L /etc/letsencrypt/live/$DOMAIN/fullchain.pem ssl/live/$DOMAIN/
sudo cp -L /etc/letsencrypt/live/$DOMAIN/privkey.pem ssl/live/$DOMAIN/
sudo cp -L /etc/letsencrypt/live/$DOMAIN/cert.pem ssl/live/$DOMAIN/
sudo cp -L /etc/letsencrypt/live/$DOMAIN/chain.pem ssl/live/$DOMAIN/

# 设置权限
sudo chown -R ubuntu:ubuntu ssl/
chmod 644 ssl/live/$DOMAIN/fullchain.pem
chmod 644 ssl/live/$DOMAIN/cert.pem
chmod 644 ssl/live/$DOMAIN/chain.pem
chmod 600 ssl/live/$DOMAIN/privkey.pem

print_status "证书复制完成"

# 11. 删除临时配置
print_step "11. 清理临时配置..."
rm -f nginx/conf.d/temp-ssl.conf

# 12. 重启服务使用HTTPS配置
print_step "12. 重启服务使用HTTPS配置..."
docker-compose down
sleep 2
docker-compose up -d

# 等待服务启动
print_status "等待服务启动..."
sleep 15

# 13. 验证HTTPS
print_step "13. 验证HTTPS..."
if curl -f -s https://$DOMAIN/ > /dev/null; then
    print_status "HTTPS访问成功"
else
    print_warning "HTTPS访问可能有问题，请检查配置"
fi

# 14. 设置自动续期
print_step "14. 设置证书自动续期..."
sudo tee /etc/cron.d/certbot-renewal > /dev/null << EOF
# 每天凌晨2点检查证书续期
0 2 * * * root /usr/bin/certbot renew --quiet --deploy-hook "$(pwd)/deploy/ssl-deploy-hook.sh"
EOF

# 创建续期部署钩子
cat > deploy/ssl-deploy-hook.sh << 'EOF'
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

chmod +x deploy/ssl-deploy-hook.sh

print_status "证书自动续期设置完成"

# 15. 显示最终状态
print_step "15. 显示最终状态..."
echo ""
print_status "=== SSL设置完成 ==="
print_status "HTTPS网站: https://$DOMAIN"
print_status "证书路径: $(pwd)/ssl/live/$DOMAIN/"
print_status "证书到期时间:"
openssl x509 -in ssl/live/$DOMAIN/cert.pem -text -noout | grep "Not After"
echo ""

print_status "服务状态:"
docker-compose ps

echo ""
print_status "下一步验证："
print_status "1. 访问 https://$DOMAIN"
print_status "2. 检查证书是否有效"
print_status "3. 测试API: https://$DOMAIN/api/v1/health"
print_status "4. 验证HTTP重定向: curl -I http://$DOMAIN"