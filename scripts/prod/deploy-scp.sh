#!/bin/bash
# deploy-scp.sh - 从本地部署到生产服务器 (SCP + Build 方案)
# 用法: ./scripts/prod/deploy-scp.sh [--backend-only|--frontend-only|--skip-build]

set -e

# ============= 配置 =============
SERVER_IP="${PROD_SERVER_IP:-152.136.104.251}"
SERVER_USER="${PROD_SERVER_USER:-ubuntu}"
SERVER_DOMAIN="proj.joylodging.com"
DEPLOY_DIR="/opt/ai-project"
SSH_KEY="${PROD_SSH_KEY:-~/.ssh/id_rsa}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

# ============= 参数解析 =============
SKIP_FRONTEND=false
SKIP_BACKEND=false
SKIP_BUILD=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-frontend|--backend-only)
            SKIP_FRONTEND=true
            shift
            ;;
        --skip-backend|--frontend-only)
            SKIP_BACKEND=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        -h|--help)
            echo "用法: $0 [选项]"
            echo ""
            echo "选项:"
            echo "  --backend-only    仅部署后端"
            echo "  --frontend-only   仅部署前端"
            echo "  --skip-build      跳过构建，直接上传已构建的文件"
            echo "  -h, --help        显示帮助"
            exit 0
            ;;
        *)
            log_error "未知选项: $1"
            exit 1
            ;;
    esac
done

# ============= 1. 本地构建 =============
build_backend() {
    if [ "$SKIP_BUILD" = true ]; then
        log_warning "跳过后端构建"
        return
    fi

    log "构建后端二进制文件 (Linux amd64)..."
    cd "$PROJECT_ROOT/backend"

    # 交叉编译为 Linux
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
        -ldflags="-s -w -X main.BuildTime=$(date -u +%Y%m%d_%H%M%S)" \
        -o ai-backend main.go

    log_success "后端构建完成: $(du -h ai-backend | cut -f1)"
}

build_frontend() {
    if [ "$SKIP_BUILD" = true ]; then
        log_warning "跳过前端构建"
        return
    fi

    log "构建前端静态文件..."
    cd "$PROJECT_ROOT/frontend"

    # 检查依赖
    if [ ! -d "node_modules" ]; then
        log "安装前端依赖..."
        npm ci
    fi

    # 构建
    REACT_APP_API_URL="${API_URL:-https://$SERVER_DOMAIN/api/v1}" \
    GENERATE_SOURCEMAP=false \
    npm run build

    log_success "前端构建完成: $(du -sh build | cut -f1)"
}

# ============= 2. 打包文件 =============
package_files() {
    log "打包部署文件..."
    cd "$PROJECT_ROOT"

    # 打包后端
    if [ "$SKIP_BACKEND" = false ]; then
        if [ -f "backend/ai-backend" ]; then
            tar -czf /tmp/backend-deploy.tar.gz \
                -C backend ai-backend \
                -C "$PROJECT_ROOT/backend" migrations
            log "后端包: $(du -h /tmp/backend-deploy.tar.gz | cut -f1)"
        else
            log_error "后端二进制文件不存在"
            exit 1
        fi
    fi

    # 打包前端
    if [ "$SKIP_FRONTEND" = false ]; then
        if [ -d "frontend/build" ]; then
            tar -czf /tmp/frontend-deploy.tar.gz \
                -C "$PROJECT_ROOT/frontend" build
            log "前端包: $(du -h /tmp/frontend-deploy.tar.gz | cut -f1)"
        else
            log_error "前端构建目录不存在"
            exit 1
        fi
    fi

    log_success "打包完成"
}

# ============= 3. 上传文件 =============
upload_files() {
    log "上传文件到服务器..."

    local files_to_upload=""

    if [ "$SKIP_BACKEND" = false ] && [ -f "/tmp/backend-deploy.tar.gz" ]; then
        files_to_upload="$files_to_upload /tmp/backend-deploy.tar.gz"
    fi

    if [ "$SKIP_FRONTEND" = false ] && [ -f "/tmp/frontend-deploy.tar.gz" ]; then
        files_to_upload="$files_to_upload /tmp/frontend-deploy.tar.gz"
    fi

    if [ -z "$files_to_upload" ]; then
        log_error "没有文件需要上传"
        exit 1
    fi

    scp -i "$SSH_KEY" -o StrictHostKeyChecking=no \
        $files_to_upload \
        "$SERVER_USER@$SERVER_IP:/tmp/"

    log_success "文件上传完成"
}

# ============= 4. 远程部署 =============
deploy_remote() {
    log "执行远程部署..."

    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << ENDSSH
        set -e

        DEPLOY_DIR="/opt/ai-project"
        TIMESTAMP=\$(date +%Y%m%d_%H%M%S)

        echo "=========================================="
        echo "🚀 开始远程部署..."
        echo "=========================================="

        # 创建必要目录
        mkdir -p "\$DEPLOY_DIR"/{backend,frontend,logs,backups,ssl,scripts}

        cd "\$DEPLOY_DIR"

        # 处理后端
        if [ -f "/tmp/backend-deploy.tar.gz" ]; then
            echo "📦 备份当前后端..."
            if [ -f "backend/ai-backend" ]; then
                cp "backend/ai-backend" "backups/ai-backend.\$TIMESTAMP"
            fi

            echo "📥 解压新后端..."
            tar -xzf /tmp/backend-deploy.tar.gz -C backend/
            chmod +x backend/ai-backend

            echo "🔄 重启后端服务..."
            sudo supervisorctl restart ai-backend || {
                echo "Supervisor 未配置，尝试手动重启..."
                pkill -f ai-backend || true
                sleep 2
                cd backend
                nohup ./ai-backend > ../logs/backend.log 2>&1 &
                cd ..
            }
        fi

        # 处理前端
        if [ -f "/tmp/frontend-deploy.tar.gz" ]; then
            echo "📥 解压新前端..."
            rm -rf frontend/build
            tar -xzf /tmp/frontend-deploy.tar.gz -C frontend/

            echo "🔄 重载 Nginx..."
            sudo nginx -t && sudo systemctl reload nginx || echo "Nginx 重载失败"
        fi

        # 清理
        echo "🧹 清理临时文件..."
        rm -f /tmp/backend-deploy.tar.gz /tmp/frontend-deploy.tar.gz

        # 保留最近10个备份
        cd "backups"
        ls -t ai-backend.* 2>/dev/null | tail -n +11 | xargs -r rm -f

        echo "=========================================="
        echo "✅ 远程部署完成!"
        echo "=========================================="
ENDSSH

    log_success "远程部署完成"
}

# ============= 5. 健康检查 =============
health_check() {
    log "执行健康检查..."

    local max_retries=10
    local retry=0

    while [ $retry -lt $max_retries ]; do
        sleep 3
        if curl -sf "http://$SERVER_IP:8080/health" > /dev/null 2>&1; then
            log_success "健康检查通过"
            return 0
        fi
        retry=$((retry + 1))
        echo -n "."
    done

    echo ""
    log_warning "健康检查超时，查看日志..."

    ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" "tail -30 $DEPLOY_DIR/logs/backend.log" 2>/dev/null || true

    return 1
}

# ============= 主流程 =============
main() {
    echo ""
    echo -e "${CYAN}==========================================${NC}"
    echo -e "${CYAN}🚀 生产环境部署 (SCP + Build)${NC}"
    echo -e "${CYAN}==========================================${NC}"
    echo "  服务器: $SERVER_USER@$SERVER_IP"
    echo "  部署目录: $DEPLOY_DIR"
    echo "  跳过后端: $SKIP_BACKEND"
    echo "  跳过前端: $SKIP_FRONTEND"
    echo "  跳过构建: $SKIP_BUILD"
    echo -e "${CYAN}==========================================${NC}"
    echo ""

    local start_time=$(date +%s)

    # 构建
    if [ "$SKIP_BACKEND" = false ]; then
        build_backend
    fi

    if [ "$SKIP_FRONTEND" = false ]; then
        build_frontend
    fi

    # 打包和上传
    package_files
    upload_files

    # 部署
    deploy_remote

    # 健康检查
    if [ "$SKIP_BACKEND" = false ]; then
        health_check || log_warning "健康检查未通过，请手动检查"
    fi

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    echo ""
    echo -e "${CYAN}==========================================${NC}"
    log_success "🎉 部署完成!"
    echo "  耗时: ${duration}秒"
    echo "  访问: https://$SERVER_DOMAIN"
    echo -e "${CYAN}==========================================${NC}"
}

main "$@"
