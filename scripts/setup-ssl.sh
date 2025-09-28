#!/bin/bash
# SSL证书申请和配置脚本
# 支持Let's Encrypt免费证书和自签名证书

set -e

DOMAIN="${1:-152.136.104.251}"
EMAIL="${2:-admin@example.com}"
SSL_DIR="./ssl"
NGINX_DIR="./nginx"

echo "🔐 开始配置SSL证书..."
echo "域名: $DOMAIN"
echo "邮箱: $EMAIL"

# 创建SSL目录
mkdir -p $SSL_DIR

# 函数：生成自签名证书
generate_self_signed() {
    echo "📝 生成自签名证书..."
    
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout $SSL_DIR/key.pem \
        -out $SSL_DIR/cert.pem \
        -subj "/C=CN/ST=Beijing/L=Beijing/O=AI Project/CN=$DOMAIN"
    
    echo "✅ 自签名证书生成完成"
    echo "证书位置: $SSL_DIR/cert.pem"
    echo "私钥位置: $SSL_DIR/key.pem"
    echo "有效期: 365天"
    echo ""
    echo "⚠️  注意: 自签名证书不被浏览器信任，仅用于测试"
    echo "生产环境请使用 Let's Encrypt 证书"
}

# 函数：申请Let's Encrypt证书
generate_letsencrypt() {
    echo "🌐 申请 Let's Encrypt 证书..."
    
    # 检查是否安装了certbot
    if ! command -v certbot &> /dev/null; then
        echo "安装 Certbot..."
        if command -v apt &> /dev/null; then
            sudo apt update
            sudo apt install -y certbot python3-certbot-nginx
        elif command -v yum &> /dev/null; then
            sudo yum install -y certbot python3-certbot-nginx
        else
            echo "❌ 无法自动安装 Certbot，请手动安装"
            exit 1
        fi
    fi
    
    # 验证域名是否指向当前服务器
    echo "🔍 验证域名DNS解析..."
    if ! nslookup $DOMAIN | grep -q "$(curl -s ifconfig.me)"; then
        echo "⚠️  警告: 域名 $DOMAIN 可能未正确解析到当前服务器"
        echo "当前服务器IP: $(curl -s ifconfig.me)"
        echo "请确保域名解析正确，否则证书申请可能失败"
        read -p "是否继续? (y/N): " continue_anyway
        if [[ $continue_anyway != "y" && $continue_anyway != "Y" ]]; then
            echo "证书申请已取消"
            exit 1
        fi
    fi
    
    # 临时启动简单HTTP服务器用于验证
    echo "🚀 启动临时HTTP服务器..."
    python3 -m http.server 80 > /dev/null 2>&1 &
    HTTP_PID=$!
    sleep 2
    
    # 申请证书
    sudo certbot certonly --standalone \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        -d $DOMAIN
    
    # 停止临时服务器
    kill $HTTP_PID 2>/dev/null || true
    
    # 复制证书到项目目录
    if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $SSL_DIR/cert.pem
        sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $SSL_DIR/key.pem
        sudo chown $(whoami):$(whoami) $SSL_DIR/*.pem
        
        echo "✅ Let's Encrypt 证书申请成功"
        echo "证书位置: $SSL_DIR/cert.pem"
        echo "私钥位置: $SSL_DIR/key.pem"
        echo "有效期: 90天"
        echo ""
        echo "📅 设置自动续期..."
        
        # 设置自动续期
        (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet --post-hook 'docker-compose restart nginx'") | crontab -
        
        echo "✅ 自动续期已设置 (每天12点检查)"
    else
        echo "❌ 证书申请失败，使用自签名证书作为备选"
        generate_self_signed
    fi
}

# 主逻辑
echo "请选择SSL证书类型:"
echo "1. Let's Encrypt 免费证书 (推荐，需要有效域名)"
echo "2. 自签名证书 (测试用)"
echo ""

# 如果域名是IP地址，自动使用自签名证书
if [[ $DOMAIN =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "检测到IP地址，自动使用自签名证书"
    generate_self_signed
else
    read -p "请选择 (1/2): " choice
    
    case $choice in
        1)
            generate_letsencrypt
            ;;
        2)
            generate_self_signed
            ;;
        *)
            echo "无效选择，使用自签名证书"
            generate_self_signed
            ;;
    esac
fi

# 验证证书
echo ""
echo "🔍 验证证书..."
if openssl x509 -in $SSL_DIR/cert.pem -text -noout > /dev/null 2>&1; then
    echo "✅ 证书验证成功"
    
    # 显示证书信息
    echo ""
    echo "📋 证书信息:"
    echo "主题: $(openssl x509 -in $SSL_DIR/cert.pem -subject -noout | sed 's/subject=//')"
    echo "颁发者: $(openssl x509 -in $SSL_DIR/cert.pem -issuer -noout | sed 's/issuer=//')"
    echo "有效期从: $(openssl x509 -in $SSL_DIR/cert.pem -startdate -noout | sed 's/notBefore=//')"
    echo "有效期到: $(openssl x509 -in $SSL_DIR/cert.pem -enddate -noout | sed 's/notAfter=//')"
else
    echo "❌ 证书验证失败"
    exit 1
fi

# 生成DH参数（可选，增强安全性）
if [ ! -f "$SSL_DIR/dhparam.pem" ]; then
    echo ""
    echo "🔒 生成DH参数 (增强安全性)..."
    openssl dhparam -out $SSL_DIR/dhparam.pem 2048
    echo "✅ DH参数生成完成"
fi

# 设置适当的权限
chmod 600 $SSL_DIR/key.pem
chmod 644 $SSL_DIR/cert.pem
chmod 644 $SSL_DIR/dhparam.pem 2>/dev/null || true

echo ""
echo "🎉 SSL证书配置完成！"
echo ""
echo "📁 证书文件:"
echo "- 证书: $SSL_DIR/cert.pem"
echo "- 私钥: $SSL_DIR/key.pem"
echo "- DH参数: $SSL_DIR/dhparam.pem"
echo ""
echo "🚀 下一步:"
echo "1. 检查 nginx/sites/ai-project.conf 中的SSL配置"
echo "2. 运行 docker-compose up -d nginx 重启Nginx"
echo "3. 访问 https://$DOMAIN 验证SSL"
echo ""

# 提供测试命令
echo "🧪 测试命令:"
echo "curl -I https://$DOMAIN"
echo "openssl s_client -connect $DOMAIN:443 -servername $DOMAIN"