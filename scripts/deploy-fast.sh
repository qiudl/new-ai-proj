#!/bin/bash

###############################################################################
# 快速生产环境部署脚本 - SCP模式
# 核心思路: 本地构建 -> SCP传输 -> 远程快速替换
# 优势: 极速部署,只传输编译产物,避免远程构建耗时
###############################################################################

set -e

# 配置
REMOTE_HOST="ubuntu@152.136.104.251"
REMOTE_BASE="/opt/ai-project"
LOCAL_DIR="/Users/johnqiu/coding/www/projects/new-ai-proj"

# SSH配置
SSH_OPTS="-o ConnectTimeout=10 -o ServerAliveInterval=5 -o ServerAliveCountMax=3"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 日志函数 - 输出到stderr避免污染函数返回值
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" >&2
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" >&2
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" >&2
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

# 显示帮助
show_help() {
    cat << EOF
快速生产环境部署脚本 - SCP模式

用法: $0 [选项]

选项:
  --backend-only      仅部署后端
  --frontend-only     仅部署前端
  --skip-build        跳过本地构建(直接使用已有编译产物)
  --dry-run           模拟运行
  --help              显示此帮助

特点:
  ✅ 本地构建 - 利用本地资源快速编译
  ✅ SCP传输 - 只传输必要的编译产物
  ✅ 快速部署 - 远程服务器无需编译,秒级重启
  ✅ Docker容器 - 使用Docker Compose管理服务

示例:
  # 完整部署(后端+前端)
  $0

  # 仅部署后端
  $0 --backend-only

  # 仅部署前端
  $0 --frontend-only

  # 跳过构建,直接部署
  $0 --skip-build
EOF
}

# 解析参数
BACKEND_ONLY=false
FRONTEND_ONLY=false
SKIP_BUILD=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --backend-only) BACKEND_ONLY=true; shift ;;
        --frontend-only) FRONTEND_ONLY=true; shift ;;
        --skip-build) SKIP_BUILD=true; shift ;;
        --dry-run) DRY_RUN=true; shift ;;
        --help) show_help; exit 0 ;;
        *)
            log_error "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
done

# 检查前置条件
check_prerequisites() {
    log_info "检查前置条件..."

    # 检查SSH连接
    if ! ssh $SSH_OPTS "$REMOTE_HOST" "echo connected" > /dev/null 2>&1; then
        log_error "无法连接到远程服务器: $REMOTE_HOST"
        exit 1
    fi

    # 检查本地工具
    if [ "$SKIP_BUILD" = false ]; then
        if [ "$FRONTEND_ONLY" = false ]; then
            if ! command -v go &> /dev/null; then
                log_error "未找到 Go 编译器"
                exit 1
            fi
        fi

        if [ "$BACKEND_ONLY" = false ]; then
            if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
                log_error "未找到 Node.js 或 npm"
                exit 1
            fi
        fi
    fi

    log_success "前置条件检查通过"
}

# 本地构建后端
build_backend_local() {
    log_info "本地构建后端..."

    if [ "$DRY_RUN" = true ]; then
        log_warning "[模拟] 构建后端"
        return 0
    fi

    cd "$LOCAL_DIR/backend" || exit 1

    # 清理旧文件
    rm -f main main-linux

    # 确保依赖正确
    log_info "检查依赖..."
    go mod tidy > /dev/null 2>&1

    # 编译Linux版本
    log_info "编译中... (GOOS=linux GOARCH=amd64)"
    GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -ldflags="-s -w" -o main-linux main.go

    if [ $? -ne 0 ] || [ ! -f main-linux ]; then
        log_error "编译失败"
        exit 1
    fi

    local size=$(ls -lh main-linux | awk '{print $5}')
    log_success "后端编译完成: $size"
}

# 本地构建前端
build_frontend_local() {
    log_info "本地构建前端..."

    if [ "$DRY_RUN" = true ]; then
        log_warning "[模拟] 构建前端"
        return 0
    fi

    cd "$LOCAL_DIR/frontend" || exit 1

    # 清理旧文件
    rm -rf build

    # 构建生产版本
    log_info "构建中... (npm run build)"
    CI=false npm run build

    if [ $? -ne 0 ] || [ ! -d build ]; then
        log_error "构建失败"
        exit 1
    fi

    local size=$(du -sh build | awk '{print $1}')
    log_success "前端构建完成: $size"
}

# SCP传输后端
transfer_backend() {
    log_info "传输后端到服务器..."

    if [ "$DRY_RUN" = true ]; then
        log_warning "[模拟] 传输后端"
        return 0
    fi

    # 创建临时目录
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local temp_dir="$REMOTE_BASE/temp/backend_$timestamp"

    ssh $SSH_OPTS "$REMOTE_HOST" "mkdir -p $temp_dir"

    # 传输二进制文件
    log_info "上传二进制文件..."
    scp $SSH_OPTS "$LOCAL_DIR/backend/main-linux" "$REMOTE_HOST:$temp_dir/main"

    if [ $? -ne 0 ]; then
        log_error "传输失败"
        exit 1
    fi

    # 设置执行权限
    ssh $SSH_OPTS "$REMOTE_HOST" "chmod +x $temp_dir/main"

    # 传输必要的配置文件和迁移
    log_info "传输配置和迁移文件..."
    scp -r $SSH_OPTS "$LOCAL_DIR/backend/migrations" "$REMOTE_HOST:$temp_dir/" 2>/dev/null || true
    scp -r $SSH_OPTS "$LOCAL_DIR/backend/docs" "$REMOTE_HOST:$temp_dir/" 2>/dev/null || true
    scp $SSH_OPTS "$LOCAL_DIR/backend/Dockerfile.prod" "$REMOTE_HOST:$temp_dir/Dockerfile" 2>/dev/null || true

    echo "$temp_dir"
}

# SCP传输前端
transfer_frontend() {
    log_info "传输前端到服务器..."

    if [ "$DRY_RUN" = true ]; then
        log_warning "[模拟] 传输前端"
        return 0
    fi

    # 创建临时目录
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local temp_dir="$REMOTE_BASE/temp/frontend_$timestamp"

    ssh $SSH_OPTS "$REMOTE_HOST" "mkdir -p $temp_dir"

    # 传输构建产物
    log_info "上传前端构建产物..."
    rsync -az -e "ssh $SSH_OPTS" "$LOCAL_DIR/frontend/build/" "$REMOTE_HOST:$temp_dir/build/"

    if [ $? -ne 0 ]; then
        log_error "传输失败"
        exit 1
    fi

    echo "$temp_dir"
}

# 部署后端容器
deploy_backend_container() {
    local temp_dir=$1

    log_info "部署后端容器..."

    if [ "$DRY_RUN" = true ]; then
        log_warning "[模拟] 部署后端"
        return 0
    fi

    ssh $SSH_OPTS "$REMOTE_HOST" bash <<EOF
        set -e
        temp_dir="$temp_dir"

        echo "=== 复制配置文件 ==="
        if [ -f /opt/ai-project/backend/.env ]; then
            cp /opt/ai-project/backend/.env "\$temp_dir/.env"
        elif [ -f /opt/ai-project/.env ]; then
            cp /opt/ai-project/.env "\$temp_dir/.env"
        elif [ -f /home/ubuntu/apps/new-ai-proj/.env ]; then
            cp /home/ubuntu/apps/new-ai-proj/.env "\$temp_dir/.env"
        else
            echo "ERROR: 配置文件不存在"
            exit 1
        fi

        echo "=== 备份当前版本 ==="
        if [ -d /opt/ai-project/backend ]; then
            mv /opt/ai-project/backend /opt/ai-project/backend.bak.\$(date +%s)
        fi

        echo "=== 部署新版本 ==="
        mv "\$temp_dir" /opt/ai-project/backend

        echo "=== 重启Docker容器 ==="
        cd /opt/ai-project

        # 停止旧容器
        docker stop ai_backend_prod 2>/dev/null || true
        docker rm ai_backend_prod 2>/dev/null || true

        # 构建新镜像（使用本地编译的二进制）
        docker compose -f docker-compose.prod.yml build --no-cache backend-prod

        # 启动新容器
        docker compose -f docker-compose.prod.yml up -d backend-prod

        # 等待启动
        sleep 8

        echo "SUCCESS: 后端部署完成"
EOF

    if [ $? -ne 0 ]; then
        log_error "后端部署失败"
        return 1
    fi

    # 健康检查
    log_info "健康检查..."
    for i in {1..15}; do
        local health=$(ssh $SSH_OPTS "$REMOTE_HOST" "curl -s http://localhost:8080/health 2>&1" || echo "ERROR")

        if [[ "$health" == *'"status":"ok"'* ]]; then
            log_success "后端健康检查通过"
            return 0
        fi

        if [ $i -lt 15 ]; then
            log_info "等待服务就绪... ($i/15)"
            sleep 3
        fi
    done

    log_error "健康检查失败"
    ssh $SSH_OPTS "$REMOTE_HOST" "docker logs ai_backend_prod --tail 30"
    return 1
}

# 部署前端
deploy_frontend() {
    local temp_dir=$1

    log_info "部署前端..."

    if [ "$DRY_RUN" = true ]; then
        log_warning "[模拟] 部署前端"
        return 0
    fi

    ssh $SSH_OPTS "$REMOTE_HOST" bash -s "$temp_dir" << 'FRONTEND_DEPLOY_EOF'
        set -e
        temp_dir=$1

        echo "=== 备份当前版本 ==="
        if [ -d /opt/ai-project/frontend/build ]; then
            mv /opt/ai-project/frontend/build /opt/ai-project/frontend/build.bak.$(date +%s)
        fi

        echo "=== 部署新版本 ==="
        mkdir -p /opt/ai-project/frontend
        mv $temp_dir/build /opt/ai-project/frontend/build

        echo "=== 清理临时目录 ==="
        rm -rf $temp_dir

        echo "=== 重启前端容器 ==="
        cd /opt/ai-project
        docker compose -f docker-compose.prod.yml restart frontend-prod

        echo "SUCCESS: 前端部署完成"
FRONTEND_DEPLOY_EOF

    if [ $? -ne 0 ]; then
        log_error "前端部署失败"
        return 1
    fi

    log_success "前端部署完成"
}

# 清理本地构建产物
cleanup_local() {
    if [ "$DRY_RUN" = true ]; then
        return 0
    fi

    log_info "清理本地构建产物..."

    if [ "$FRONTEND_ONLY" = false ]; then
        rm -f "$LOCAL_DIR/backend/main-linux"
    fi

    # 前端build目录保留,方便下次 --skip-build
}

# 主函数
main() {
    echo "=================================="
    echo "🚀 快速生产环境部署 - SCP模式"
    echo "=================================="
    echo ""

    if [ "$DRY_RUN" = true ]; then
        log_warning "=== 模拟运行模式 ==="
    fi

    local start_time=$(date +%s)

    # 步骤1: 检查前置条件
    check_prerequisites

    # 步骤2: 本地构建
    if [ "$SKIP_BUILD" = false ]; then
        if [ "$FRONTEND_ONLY" = false ]; then
            build_backend_local
        fi

        if [ "$BACKEND_ONLY" = false ]; then
            build_frontend_local
        fi
    else
        log_warning "跳过构建步骤,使用已有编译产物"
    fi

    # 步骤3: 传输到服务器
    local backend_temp=""
    local frontend_temp=""

    if [ "$FRONTEND_ONLY" = false ]; then
        backend_temp=$(transfer_backend)
        log_info "后端临时目录: $backend_temp"
    fi

    if [ "$BACKEND_ONLY" = false ]; then
        frontend_temp=$(transfer_frontend)
        log_info "前端临时目录: $frontend_temp"
    fi

    # 步骤4: 远程部署
    if [ "$FRONTEND_ONLY" = false ]; then
        deploy_backend_container "$backend_temp" || {
            log_error "后端部署失败"
            exit 1
        }
    fi

    if [ "$BACKEND_ONLY" = false ]; then
        deploy_frontend "$frontend_temp" || {
            log_error "前端部署失败"
            exit 1
        }
    fi

    # 步骤5: 清理
    cleanup_local

    # 计算耗时
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    echo ""
    log_success "🎉 部署完成! 总耗时: ${duration}秒"
    echo ""

    log_info "可用命令:"
    log_info "  查看后端日志: ssh $REMOTE_HOST 'docker logs -f ai_backend_prod'"
    log_info "  健康检查: ssh $REMOTE_HOST 'curl http://localhost:8080/health'"
    log_info "  容器状态: ssh $REMOTE_HOST 'cd $REMOTE_BASE && docker compose -f docker-compose.prod.yml ps'"
}

# 执行主函数
main "$@"
