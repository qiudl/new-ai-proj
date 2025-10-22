#!/bin/bash

###############################################################################
# 生产环境错误修复脚本
# 修复CSP违规和静态资源404问题
###############################################################################

set -e

# 配置
REMOTE_HOST="ubuntu@152.136.104.251"
LOCAL_NGINX_CONF="nginx/sites/ai-project.conf"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "=================================="
echo "🔧 生产环境错误修复"
echo "=================================="
echo ""

# 步骤1: 上传修复后的nginx配置
log_info "上传nginx配置..."
scp "$LOCAL_NGINX_CONF" "$REMOTE_HOST:/home/ubuntu/apps/new-ai-proj/nginx/sites/ai-project.conf"
log_success "nginx配置上传完成"

# 步骤2: 备份旧配置
log_info "备份旧的nginx配置..."
ssh "$REMOTE_HOST" << 'EOF'
    cd /home/ubuntu/apps/new-ai-proj

    # 备份宿主机nginx配置
    if [ -f /etc/nginx/sites-available/ai-project.conf ]; then
        sudo cp /etc/nginx/sites-available/ai-project.conf \
                /etc/nginx/sites-available/ai-project.conf.bak.$(date +%Y%m%d_%H%M%S)
        echo "已备份宿主机nginx配置"
    fi
EOF
log_success "配置备份完成"

# 步骤3: 更新宿主机nginx配置
log_info "更新宿主机nginx配置..."
ssh "$REMOTE_HOST" << 'EOF'
    cd /home/ubuntu/apps/new-ai-proj

    # 复制新配置到nginx配置目录
    sudo cp nginx/sites/ai-project.conf /etc/nginx/sites-available/ai-project.conf

    # 测试nginx配置
    echo "测试nginx配置..."
    if sudo nginx -t; then
        echo "nginx配置测试通过"
    else
        echo "ERROR: nginx配置测试失败"
        exit 1
    fi
EOF
log_success "nginx配置更新完成"

# 步骤4: 重新加载nginx
log_info "重新加载nginx..."
ssh "$REMOTE_HOST" << 'EOF'
    # 重新加载nginx（不中断服务）
    sudo nginx -s reload

    # 等待配置生效
    sleep 2

    # 验证nginx进程
    if sudo nginx -t >/dev/null 2>&1; then
        echo "nginx重新加载成功"
    else
        echo "ERROR: nginx重新加载失败"
        exit 1
    fi
EOF
log_success "nginx重新加载完成"

# 步骤5: 验证修复效果
log_info "验证修复效果..."
echo ""

# 检查CSP头
log_info "检查CSP配置..."
CSP_HEADER=$(ssh "$REMOTE_HOST" "curl -sI https://proj.joylodging.com 2>&1 | grep -i 'content-security-policy' || echo ''")
if [[ "$CSP_HEADER" == *"unpkg.com"* ]]; then
    log_success "✅ CSP已包含unpkg.com"
    echo "   $CSP_HEADER"
else
    log_warning "⚠️  CSP可能未正确配置"
    echo "   $CSP_HEADER"
fi

# 检查静态资源
log_info "检查静态资源访问..."
STATIC_CHECK=$(ssh "$REMOTE_HOST" "curl -sI https://proj.joylodging.com/static/js/test 2>&1 | head -1 || echo 'ERROR'")
echo "   $STATIC_CHECK"

# 检查健康状态
log_info "检查服务健康状态..."
HEALTH=$(ssh "$REMOTE_HOST" "curl -s http://localhost:8080/health 2>&1 || echo 'ERROR'")
if [[ "$HEALTH" == *"ok"* ]] || [[ "$HEALTH" == *"healthy"* ]]; then
    log_success "✅ 后端服务健康"
else
    log_warning "⚠️  后端服务可能异常"
fi

echo ""
log_success "🎉 修复完成！"
echo ""
log_info "请在浏览器中访问 https://proj.joylodging.com 验证以下内容："
log_info "1. 控制台没有CSP违规错误"
log_info "2. 静态资源（CSS/JS）正常加载"
log_info "3. 页面功能正常"
echo ""
log_info "如果仍有问题，请检查："
log_info "- 前端Docker容器是否正常运行: ssh $REMOTE_HOST 'docker ps | grep frontend'"
log_info "- 前端容器日志: ssh $REMOTE_HOST 'docker logs ai_frontend_prod'"
log_info "- nginx错误日志: ssh $REMOTE_HOST 'sudo tail -50 /var/log/nginx/error.log'"
