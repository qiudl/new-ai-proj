#!/bin/bash

# SSL证书续期脚本
# 使用方法: ./ssl-renew.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
DOMAIN="proj.joylodging.com"
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

print_step "=== SSL证书续期 ==="
echo "域名: $DOMAIN"
echo "项目目录: $PROJECT_DIR"
echo ""

# 1. 检查当前证书状态
print_step "1. 检查当前证书状态..."
if [ -f "/etc/letsencrypt/live/$DOMAIN/cert.pem" ]; then
    EXPIRY_DATE=$(openssl x509 -in /etc/letsencrypt/live/$DOMAIN/cert.pem -text -noout | grep "Not After" | cut -d: -f2-)
    print_status "当前证书到期时间: $EXPIRY_DATE"
    
    # 检查证书是否即将过期（30天内）
    if openssl x509 -in /etc/letsencrypt/live/$DOMAIN/cert.pem -checkend 2592000 > /dev/null; then
        print_status "证书有效期超过30天，无需续期"
        if [ "$1" != "--force" ]; then
            exit 0
        else
            print_warning "强制续期模式"
        fi
    else
        print_warning "证书即将过期，需要续期"
    fi
else
    print_error "未找到现有证书"
    exit 1
fi

# 2. 续期证书
print_step "2. 续期证书..."
if certbot renew --quiet --deploy-hook "$PROJECT_DIR/deploy/ssl-deploy-hook.sh"; then
    print_status "证书续期成功"
else
    print_error "证书续期失败"
    exit 1
fi

# 3. 验证新证书
print_step "3. 验证新证书..."
sleep 5
if openssl s_client -connect $DOMAIN:443 -servername $DOMAIN < /dev/null 2>/dev/null | grep -q "Verify return code: 0"; then
    print_status "新证书验证成功"
    
    # 显示新证书到期时间
    NEW_EXPIRY_DATE=$(openssl x509 -in /etc/letsencrypt/live/$DOMAIN/cert.pem -text -noout | grep "Not After" | cut -d: -f2-)
    print_status "新证书到期时间: $NEW_EXPIRY_DATE"
else
    print_error "新证书验证失败"
    exit 1
fi

print_step "=== SSL证书续期完成 ==="
print_status "HTTPS网站访问地址: https://$DOMAIN"
print_status "证书续期成功完成"