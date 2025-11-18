#!/bin/bash
# GitHub Actions CI/CD - 备份脚本
# 用途：备份当前运行的版本和数据

set -e  # 遇到错误立即退出
set -o pipefail  # 管道命令失败时退出

# ============================================
# 配置变量
# ============================================
DEPLOY_ROOT="/opt/ai-project-cicd"
BACKUP_DIR="$DEPLOY_ROOT/backups/backup-$(date +%Y%m%d-%H%M%S)"
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
# 主备份流程
# ============================================
main() {
    log_info "=========================================="
    log_info "开始备份当前版本"
    log_info "=========================================="

    # 检查当前版本是否存在
    if [ ! -L "$CURRENT_LINK" ]; then
        log_warning "没有找到当前运行的版本，跳过备份"
        exit 0
    fi

    CURRENT_RELEASE=$(readlink "$CURRENT_LINK")
    CURRENT_RELEASE_NAME=$(basename "$CURRENT_RELEASE")

    log_info "当前版本: $CURRENT_RELEASE_NAME"

    # 创建备份目录
    mkdir -p "$BACKUP_DIR"

    # 1. 备份应用代码和配置
    log_info "Step 1/4: 备份应用代码和配置..."
    if [ -d "$CURRENT_RELEASE" ]; then
        cp -r "$CURRENT_RELEASE" "$BACKUP_DIR/release"
        log_success "应用代码备份完成"
    else
        log_warning "当前版本目录不存在: $CURRENT_RELEASE"
    fi

    # 2. 备份环境变量和配置
    log_info "Step 2/4: 备份环境变量和配置..."
    if [ -d "$DEPLOY_ROOT/shared/env" ]; then
        cp -r "$DEPLOY_ROOT/shared/env" "$BACKUP_DIR/env"
        log_success "环境变量备份完成"
    fi

    # 3. 备份 Docker 镜像信息
    log_info "Step 3/4: 记录 Docker 镜像信息..."
    {
        echo "=== Docker Images at $(date) ==="
        docker images | grep -E "ai-backend|ai-frontend"
        echo ""
        echo "=== Running Containers ==="
        docker ps --format "table {{.ID}}\t{{.Image}}\t{{.Status}}\t{{.Names}}"
    } > "$BACKUP_DIR/docker-info.txt"
    log_success "Docker 镜像信息记录完成"

    # 4. 备份数据库（可选）
    log_info "Step 4/4: 备份数据库..."
    if command -v pg_dump &> /dev/null; then
        # 从环境变量读取数据库配置
        if [ -f "$DEPLOY_ROOT/shared/env/.env" ]; then
            source "$DEPLOY_ROOT/shared/env/.env"

            if [ -n "$DB_NAME" ] && [ -n "$DB_USER" ]; then
                log_info "执行数据库备份: $DB_NAME"
                PGPASSWORD="$DB_PASSWORD" pg_dump -h "${DB_HOST:-localhost}" -p "${DB_PORT:-5432}" -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_DIR/database-$DB_NAME.sql.gz"
                log_success "数据库备份完成"
            else
                log_warning "数据库配置不完整，跳过数据库备份"
            fi
        else
            log_warning "环境变量文件不存在，跳过数据库备份"
        fi
    else
        log_warning "pg_dump 未安装，跳过数据库备份"
    fi

    # 5. 创建备份元数据
    log_info "创建备份元数据..."
    {
        echo "Backup Date: $(date)"
        echo "Current Release: $CURRENT_RELEASE_NAME"
        echo "Git SHA: $(cat $CURRENT_RELEASE/git-sha.txt 2>/dev/null || echo 'unknown')"
        echo "Backup Directory: $BACKUP_DIR"
    } > "$BACKUP_DIR/metadata.txt"

    # 6. 清理旧备份（保留最近30天）
    log_info "清理旧备份..."
    find "$DEPLOY_ROOT/backups" -type d -name "backup-*" -mtime +30 -exec rm -rf {} \; 2>/dev/null || true
    log_success "旧备份清理完成"

    log_success "=========================================="
    log_success "✅ 备份完成！"
    log_success "备份位置: $BACKUP_DIR"
    log_success "备份大小: $(du -sh $BACKUP_DIR | cut -f1)"
    log_success "=========================================="

    exit 0
}

# 执行主函数
main "$@"
