#!/bin/bash

###############################################################################
# 生产环境部署脚本
# 功能：同步本地代码到生产服务器并重启服务
###############################################################################

set -e

# 配置
REMOTE_HOST="ubuntu@152.136.104.251"
REMOTE_BASE="/home/ubuntu/apps/new-ai-proj"
LOCAL_DIR="/Users/johnqiu/coding/www/projects/new-ai-proj"

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

# 显示帮助
show_help() {
    cat << EOF
生产环境部署脚本

用法: $0 [选项]

选项:
  --backend-only      仅部署后端
  --frontend-only     仅部署前端
  --no-build          跳过构建步骤
  --no-restart        跳过服务重启
  --dry-run           模拟运行（不实际同步）
  --help              显示此帮助信息

示例:
  # 完整部署
  $0

  # 仅部署后端
  $0 --backend-only

  # 部署但不重启服务
  $0 --no-restart

  # 模拟运行
  $0 --dry-run

EOF
}

# 检查前置条件
check_prerequisites() {
    log_info "检查前置条件..."
    
    # 检查SSH连接
    if ! ssh -o ConnectTimeout=5 "$REMOTE_HOST" "echo connected" > /dev/null 2>&1; then
        log_error "无法连接到远程服务器: $REMOTE_HOST"
        exit 1
    fi
    
    log_success "前置条件检查通过"
}

# 创建新的发布目录
create_release() {
    local release_name="release_$(date +%Y%m%d_%H%M%S)"
    local release_dir="$REMOTE_BASE/releases/$release_name"
    
    log_info "创建发布目录: $release_name"
    
    ssh "$REMOTE_HOST" "mkdir -p $release_dir"
    
    echo "$release_dir"
}

# 同步后端代码
sync_backend() {
    local release_dir=$1
    
    log_info "同步后端代码..."
    
    if [ "$DRY_RUN" = true ]; then
        log_warning "[模拟] 同步后端代码到: $release_dir/backend"
        return 0
    fi
    
    # 排除不需要同步的文件
    rsync -avz --delete \
        --exclude='backend-test' \
        --exclude='backend-linux' \
        --exclude='backend' \
        --exclude='*.log' \
        --exclude='uploads/' \
        --exclude='.env' \
        --exclude='.env.local' \
        --exclude='node_modules/' \
        --exclude='vendor/' \
        --exclude='.git/' \
        "$LOCAL_DIR/backend/" \
        "$REMOTE_HOST:$release_dir/backend/"
    
    log_success "后端代码同步完成"
}

# 同步前端代码
sync_frontend() {
    local release_dir=$1
    
    log_info "同步前端代码..."
    
    if [ "$DRY_RUN" = true ]; then
        log_warning "[模拟] 同步前端代码到: $release_dir/frontend"
        return 0
    fi
    
    rsync -avz --delete \
        --exclude='node_modules/' \
        --exclude='build/' \
        --exclude='dist/' \
        --exclude='.env' \
        --exclude='.env.local' \
        --exclude='*.log' \
        --exclude='.git/' \
        "$LOCAL_DIR/frontend/" \
        "$REMOTE_HOST:$release_dir/frontend/"
    
    log_success "前端代码同步完成"
}

# 同步其他文件
sync_other_files() {
    local release_dir=$1
    
    log_info "同步其他文件..."
    
    if [ "$DRY_RUN" = true ]; then
        log_warning "[模拟] 同步其他文件"
        return 0
    fi
    
    # 同步配置文件
    rsync -avz \
        "$LOCAL_DIR/docker-compose.prod.yml" \
        "$LOCAL_DIR/nginx.conf" \
        "$REMOTE_HOST:$release_dir/" 2>/dev/null || true
    
    # 同步MCP服务器
    rsync -avz --delete \
        --exclude='node_modules/' \
        --exclude='dist/' \
        --exclude='.env' \
        "$LOCAL_DIR/mcp-task-bridge/" \
        "$REMOTE_HOST:$release_dir/mcp-task-bridge/" 2>/dev/null || true
    
    log_success "其他文件同步完成"
}

# 构建后端
build_backend() {
    local release_dir=$1
    
    log_info "在服务器上构建后端..."
    
    if [ "$DRY_RUN" = true ]; then
        log_warning "[模拟] 构建后端"
        return 0
    fi
    
    ssh "$REMOTE_HOST" << EOF
        cd $release_dir/backend
        go build -o main main.go
        chmod +x main
EOF
    
    log_success "后端构建完成"
}

# 更新软链接
update_symlink() {
    local release_dir=$1
    
    log_info "更新软链接..."
    
    if [ "$DRY_RUN" = true ]; then
        log_warning "[模拟] 更新软链接"
        return 0
    fi
    
    ssh "$REMOTE_HOST" << EOF
        cd $REMOTE_BASE
        # 备份当前链接为previous
        if [ -L current ]; then
            rm -f previous
            cp -P current previous
        fi
        # 更新current链接
        ln -snf $release_dir current
EOF
    
    log_success "软链接更新完成"
}

# 重启后端服务
restart_backend() {
    log_info "重启后端服务..."
    
    if [ "$DRY_RUN" = true ]; then
        log_warning "[模拟] 重启后端服务"
        return 0
    fi
    
    ssh "$REMOTE_HOST" << 'EOF'
        # 停止旧的后端进程
        pkill -f "/opt/ai-project/backend/backend" || true
        sleep 2
        
        # 启动新的后端服务
        cd /opt/ai-project/backend
        nohup ./backend > backend.log 2>&1 &
        
        sleep 3
        
        # 检查服务状态
        if curl -s http://localhost:8080/health > /dev/null; then
            echo "✅ 后端服务启动成功"
        else
            echo "❌ 后端服务启动失败"
            exit 1
        fi
EOF
    
    log_success "后端服务重启完成"
}

# 主函数
main() {
    echo "=================================="
    echo "🚀 生产环境部署工具"
    echo "=================================="
    echo ""
    
    # 解析参数
    BACKEND_ONLY=false
    FRONTEND_ONLY=false
    NO_BUILD=false
    NO_RESTART=false
    DRY_RUN=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --backend-only)
                BACKEND_ONLY=true
                shift
                ;;
            --frontend-only)
                FRONTEND_ONLY=true
                shift
                ;;
            --no-build)
                NO_BUILD=true
                shift
                ;;
            --no-restart)
                NO_RESTART=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                log_error "未知选项: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    if [ "$DRY_RUN" = true ]; then
        log_warning "=== 模拟运行模式 ==="
    fi
    
    # 步骤1: 检查前置条件
    check_prerequisites
    
    # 步骤2: 创建发布目录
    RELEASE_DIR=$(create_release)
    log_info "发布目录: $RELEASE_DIR"
    
    # 步骤3: 同步代码
    if [ "$FRONTEND_ONLY" = false ]; then
        sync_backend "$RELEASE_DIR"
    fi
    
    if [ "$BACKEND_ONLY" = false ]; then
        sync_frontend "$RELEASE_DIR"
        sync_other_files "$RELEASE_DIR"
    fi
    
    # 步骤4: 构建
    if [ "$NO_BUILD" = false ] && [ "$FRONTEND_ONLY" = false ]; then
        build_backend "$RELEASE_DIR"
    fi
    
    # 步骤5: 更新软链接
    update_symlink "$RELEASE_DIR"
    
    # 步骤6: 重启服务
    if [ "$NO_RESTART" = false ] && [ "$FRONTEND_ONLY" = false ]; then
        restart_backend
    fi
    
    echo ""
    log_success "🎉 部署完成！"
    echo ""
    log_info "发布目录: $RELEASE_DIR"
    log_info "健康检查: ssh $REMOTE_HOST 'curl -s http://localhost:8080/health'"
    
    if [ "$DRY_RUN" = true ]; then
        log_warning "这是一次模拟运行，没有实际更改"
    fi
}

# 执行主函数
main "$@"
