#!/bin/bash
# GitHub Actions CI/CD - 回滚脚本
# 用途：快速回滚到上一个版本

set -e  # 遇到错误立即退出
set -o pipefail  # 管道命令失败时退出

# ============================================
# 配置变量
# ============================================
DEPLOY_ROOT="/opt/ai-project-cicd"
CURRENT_LINK="$DEPLOY_ROOT/current"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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
# 主回滚流程
# ============================================
main() {
    log_info "=========================================="
    log_info "开始回滚到上一版本"
    log_info "=========================================="

    # 检查当前版本
    if [ ! -L "$CURRENT_LINK" ]; then
        log_error "没有找到当前版本，无法回滚"
        exit 1
    fi

    CURRENT_RELEASE=$(readlink "$CURRENT_LINK")
    CURRENT_RELEASE_NAME=$(basename "$CURRENT_RELEASE")

    log_info "当前版本: $CURRENT_RELEASE_NAME"

    # 查找上一个版本
    cd "$DEPLOY_ROOT/releases"
    PREVIOUS_RELEASE=$(ls -t | grep -v "$CURRENT_RELEASE_NAME" | head -n 1)

    if [ -z "$PREVIOUS_RELEASE" ]; then
        log_error "没有找到可回滚的版本"
        log_error "可用版本列表:"
        ls -la "$DEPLOY_ROOT/releases"
        exit 1
    fi

    PREVIOUS_RELEASE_PATH="$DEPLOY_ROOT/releases/$PREVIOUS_RELEASE"

    log_warning "准备回滚到: $PREVIOUS_RELEASE"

    # 确认回滚
    if [ "${1}" != "--force" ] && [ -t 0 ]; then
        read -p "确认回滚到 $PREVIOUS_RELEASE ? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "回滚已取消"
            exit 0
        fi
    fi

    # 1. 停止当前服务
    log_info "Step 1/4: 停止当前服务..."
    cd "$CURRENT_RELEASE"
    docker-compose down || true
    log_success "服务已停止"

    # 2. 切换到上一版本
    log_info "Step 2/4: 切换软链接..."
    ln -sfn "$PREVIOUS_RELEASE_PATH" "$CURRENT_LINK"
    log_success "软链接已切换到: $PREVIOUS_RELEASE"

    # 3. 启动上一版本服务
    log_info "Step 3/4: 启动服务..."
    cd "$DEPLOY_ROOT/current"

    if [ ! -f "docker-compose.yml" ]; then
        log_error "docker-compose.yml 不存在于上一版本"
        log_error "尝试从备份恢复..."

        # 尝试从最新备份恢复
        LATEST_BACKUP=$(ls -t "$DEPLOY_ROOT/backups" | head -n 1)
        if [ -n "$LATEST_BACKUP" ]; then
            log_warning "从备份恢复: $LATEST_BACKUP"
            cp -r "$DEPLOY_ROOT/backups/$LATEST_BACKUP/release/"* "$CURRENT_RELEASE/"
        else
            log_error "没有找到可用的备份"
            exit 1
        fi
    fi

    docker-compose up -d
    log_success "服务已启动"

    # 4. 健康检查
    log_info "Step 4/4: 健康检查..."
    sleep 5  # 等待服务启动

    if bash "$DEPLOY_ROOT/scripts/health-check.sh"; then
        log_success "=========================================="
        log_success "✅ 回滚成功！"
        log_success "当前版本: $PREVIOUS_RELEASE"
        log_success "=========================================="

        # 记录回滚事件
        {
            echo "=== Rollback Event ==="
            echo "Date: $(date)"
            echo "From: $CURRENT_RELEASE_NAME"
            echo "To: $PREVIOUS_RELEASE"
            echo "Reason: ${2:-Manual rollback or deployment failure}"
        } >> "$DEPLOY_ROOT/shared/logs/rollback.log"

        exit 0
    else
        log_error "=========================================="
        log_error "❌ 回滚后健康检查失败！"
        log_error "请手动检查系统状态"
        log_error "=========================================="
        exit 1
    fi
}

# 执行主函数
main "$@"
