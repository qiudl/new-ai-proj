#!/bin/bash

# SSL证书管理脚本
# 使用方法: ./ssl-manage.sh [命令]

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
SERVER_HOST="proj-joyloding"

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

# 显示帮助信息
show_help() {
    echo "SSL证书管理脚本"
    echo ""
    echo "使用方法: $0 [命令]"
    echo ""
    echo "可用命令:"
    echo "  setup      - 首次设置SSL证书"
    echo "  renew      - 续期SSL证书"
    echo "  status     - 查看SSL证书状态"
    echo "  test       - 测试SSL证书"
    echo "  deploy     - 部署SSL证书到服务器"
    echo "  backup     - 备份SSL证书"
    echo "  restore    - 恢复SSL证书"
    echo "  help       - 显示帮助信息"
    echo ""
}

# 执行远程命令
execute_remote() {
    local cmd="$1"
    ssh $SERVER_HOST "$cmd"
}

# 上传文件到服务器
upload_file() {
    local local_file="$1"
    local remote_file="$2"
    scp "$local_file" "$SERVER_HOST:$remote_file"
}

# 设置SSL证书
setup_ssl() {
    print_step "设置SSL证书..."
    
    # 上传SSL设置脚本
    upload_file "deploy/ssl-setup.sh" "/tmp/ssl-setup.sh"
    
    # 在服务器上执行SSL设置
    execute_remote "chmod +x /tmp/ssl-setup.sh && sudo /tmp/ssl-setup.sh"
    
    print_status "SSL证书设置完成"
}

# 续期SSL证书
renew_ssl() {
    print_step "续期SSL证书..."
    
    # 上传续期脚本
    upload_file "deploy/ssl-renew.sh" "/tmp/ssl-renew.sh"
    
    # 在服务器上执行续期
    execute_remote "chmod +x /tmp/ssl-renew.sh && sudo /tmp/ssl-renew.sh $1"
    
    print_status "SSL证书续期完成"
}

# 查看SSL证书状态
check_ssl_status() {
    print_step "查看SSL证书状态..."
    
    execute_remote "
        echo '=== SSL证书信息 ==='
        if [ -f /etc/letsencrypt/live/$DOMAIN/cert.pem ]; then
            echo '证书文件: 存在'
            echo '到期时间:'
            openssl x509 -in /etc/letsencrypt/live/$DOMAIN/cert.pem -text -noout | grep 'Not After'
            echo ''
            echo '证书详情:'
            openssl x509 -in /etc/letsencrypt/live/$DOMAIN/cert.pem -text -noout | grep -A 1 'Subject:'
            echo ''
            echo '证书有效性检查:'
            if openssl x509 -in /etc/letsencrypt/live/$DOMAIN/cert.pem -checkend 2592000 > /dev/null; then
                echo '✓ 证书有效期超过30天'
            else
                echo '⚠ 证书即将过期（30天内）'
            fi
        else
            echo '证书文件: 不存在'
        fi
        
        echo ''
        echo '=== 服务状态 ==='
        cd $PROJECT_DIR
        docker-compose ps nginx
    "
}

# 测试SSL证书
test_ssl() {
    print_step "测试SSL证书..."
    
    echo "测试HTTPS连接..."
    if curl -Is https://$DOMAIN | head -1 | grep -q "200 OK"; then
        print_status "✓ HTTPS连接正常"
    else
        print_error "✗ HTTPS连接失败"
    fi
    
    echo ""
    echo "测试SSL证书有效性..."
    if openssl s_client -connect $DOMAIN:443 -servername $DOMAIN < /dev/null 2>/dev/null | grep -q "Verify return code: 0"; then
        print_status "✓ SSL证书有效"
    else
        print_error "✗ SSL证书无效"
    fi
    
    echo ""
    echo "测试SSL评级..."
    echo "可以访问以下链接查看详细SSL评级："
    echo "https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
}

# 部署SSL证书
deploy_ssl() {
    print_step "部署SSL证书..."
    
    # 重新部署服务
    execute_remote "
        cd $PROJECT_DIR
        docker-compose down
        docker-compose up -d
    "
    
    print_status "SSL证书部署完成"
}

# 备份SSL证书
backup_ssl() {
    print_step "备份SSL证书..."
    
    BACKUP_NAME="ssl_backup_$(date +%Y%m%d_%H%M%S)"
    
    execute_remote "
        mkdir -p $PROJECT_DIR/backups/$BACKUP_NAME
        
        # 备份Let's Encrypt证书
        if [ -d /etc/letsencrypt ]; then
            sudo tar -czf $PROJECT_DIR/backups/$BACKUP_NAME/letsencrypt.tar.gz -C /etc letsencrypt
        fi
        
        # 备份项目SSL目录
        if [ -d $PROJECT_DIR/ssl ]; then
            tar -czf $PROJECT_DIR/backups/$BACKUP_NAME/project-ssl.tar.gz -C $PROJECT_DIR ssl
        fi
        
        # 备份nginx配置
        tar -czf $PROJECT_DIR/backups/$BACKUP_NAME/nginx-config.tar.gz -C $PROJECT_DIR nginx
        
        echo '备份完成: $PROJECT_DIR/backups/$BACKUP_NAME'
        ls -la $PROJECT_DIR/backups/$BACKUP_NAME/
    "
    
    print_status "SSL证书备份完成"
}

# 恢复SSL证书
restore_ssl() {
    if [ -z "$2" ]; then
        print_error "请指定备份目录名称"
        print_error "使用方法: $0 restore [备份目录名]"
        exit 1
    fi
    
    local backup_dir="$2"
    
    print_step "恢复SSL证书..."
    print_warning "此操作将覆盖现有SSL配置"
    
    read -p "确定要继续吗? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "操作取消"
        exit 1
    fi
    
    execute_remote "
        cd $PROJECT_DIR/backups/$backup_dir
        
        # 恢复Let's Encrypt证书
        if [ -f letsencrypt.tar.gz ]; then
            sudo tar -xzf letsencrypt.tar.gz -C /etc/
        fi
        
        # 恢复项目SSL目录
        if [ -f project-ssl.tar.gz ]; then
            tar -xzf project-ssl.tar.gz -C $PROJECT_DIR/
        fi
        
        # 恢复nginx配置
        if [ -f nginx-config.tar.gz ]; then
            tar -xzf nginx-config.tar.gz -C $PROJECT_DIR/
        fi
        
        echo '恢复完成'
    "
    
    # 重启服务
    deploy_ssl
    
    print_status "SSL证书恢复完成"
}

# 主函数
main() {
    case "$1" in
        setup)
            setup_ssl
            ;;
        renew)
            renew_ssl "$2"
            ;;
        status)
            check_ssl_status
            ;;
        test)
            test_ssl
            ;;
        deploy)
            deploy_ssl
            ;;
        backup)
            backup_ssl
            ;;
        restore)
            restore_ssl "$@"
            ;;
        help|--help|-h)
            show_help
            ;;
        "")
            show_help
            ;;
        *)
            print_error "未知命令: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"