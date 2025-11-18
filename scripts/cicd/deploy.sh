#!/bin/bash
# GitHub Actions CI/CD - 主部署脚本
# 用途：自动化部署新版本到生产环境

set -e  # 遇到错误立即退出
set -o pipefail  # 管道命令失败时退出

# ============================================
# 配置变量
# ============================================
DEPLOY_ROOT="/opt/ai-project-cicd"
RELEASE_NAME="release-$(date +%Y%m%d-%H%M%S)"
RELEASE_DIR="$DEPLOY_ROOT/releases/$RELEASE_NAME"
GIT_SHA="${1:-unknown}"  # Git commit SHA，从参数传入

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================
# 辅助函数
# ============================================
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

# ============================================
# 主部署流程
# ============================================
main() {
    log_info "=========================================="
    log_info "开始部署新版本: $RELEASE_NAME"
    log_info "Git SHA: $GIT_SHA"
    log_info "=========================================="

    # 1. 创建版本目录
    log_info "Step 1/7: 创建版本目录..."
    mkdir -p "$RELEASE_DIR"/{backend,frontend,config}
    log_success "版本目录创建成功: $RELEASE_DIR"

    # 2. 备份当前版本
    log_info "Step 2/7: 备份当前版本..."
    if [ -L "$DEPLOY_ROOT/current" ]; then
        bash "$DEPLOY_ROOT/scripts/backup.sh"
        log_success "备份完成"
    else
        log_warning "没有找到当前版本，跳过备份"
    fi

    # 3. 加载 Docker 镜像
    log_info "Step 3/7: 加载 Docker 镜像..."
    if [ -f "/tmp/backend-image.tar.gz" ]; then
        log_info "加载后端镜像..."
        docker load < /tmp/backend-image.tar.gz
        log_success "后端镜像加载成功"
    else
        log_error "后端镜像文件不存在: /tmp/backend-image.tar.gz"
        exit 1
    fi

    if [ -f "/tmp/frontend-image.tar.gz" ]; then
        log_info "加载前端镜像..."
        docker load < /tmp/frontend-image.tar.gz
        log_success "前端镜像加载成功"
    else
        log_error "前端镜像文件不存在: /tmp/frontend-image.tar.gz"
        exit 1
    fi

    # 4. 标记镜像为 latest
    log_info "Step 4/7: 标记镜像..."
    docker tag "ai-backend:$GIT_SHA" ai-backend:latest || true
    docker tag "ai-frontend:$GIT_SHA" ai-frontend:latest || true
    log_success "镜像标记完成"

    # 5. 复制 docker-compose 配置
    log_info "Step 5/7: 准备配置文件..."
    if [ -f "$DEPLOY_ROOT/shared/env/docker-compose.prod.yml" ]; then
        cp "$DEPLOY_ROOT/shared/env/docker-compose.prod.yml" "$RELEASE_DIR/docker-compose.yml"
    else
        log_warning "使用默认 docker-compose 配置"
        # 这里可以添加默认配置的生成逻辑
    fi
    log_success "配置文件准备完成"

    # 6. 更新软链接到新版本
    log_info "Step 6/7: 更新软链接..."
    ln -sfn "$RELEASE_DIR" "$DEPLOY_ROOT/current"
    log_success "软链接已更新到: $RELEASE_DIR"

    # 7. 重启服务
    log_info "Step 7/7: 重启服务..."
    cd "$DEPLOY_ROOT/current"

    # 检查是否有 docker-compose.yml
    if [ ! -f "docker-compose.yml" ]; then
        log_error "docker-compose.yml 不存在"
        exit 1
    fi

    # 停止旧服务
    docker-compose down || true

    # 启动新服务
    docker-compose up -d
    log_success "服务启动成功"

    # 8. 健康检查
    log_info "=========================================="
    log_info "执行健康检查..."
    log_info "=========================================="

    if bash "$DEPLOY_ROOT/scripts/health-check.sh"; then
        log_success "=========================================="
        log_success "✅ 部署成功！"
        log_success "版本: $RELEASE_NAME"
        log_success "Git SHA: $GIT_SHA"
        log_success "=========================================="

        # 清理临时文件
        rm -f /tmp/backend-image.tar.gz /tmp/frontend-image.tar.gz

        # 清理旧版本（保留最近7个）
        log_info "清理旧版本..."
        cd "$DEPLOY_ROOT/releases"
        ls -t | tail -n +8 | xargs -I {} rm -rf {} 2>/dev/null || true
        log_success "旧版本清理完成"

        exit 0
    else
        log_error "=========================================="
        log_error "❌ 健康检查失败！"
        log_error "开始自动回滚..."
        log_error "=========================================="

        bash "$DEPLOY_ROOT/scripts/rollback.sh"
        exit 1
    fi
}

# 执行主函数
main "$@"
