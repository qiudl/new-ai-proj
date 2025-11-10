#!/bin/bash

###############################################################################
# 生产环境部署脚本 v2.0 - 修复版
# 功能：同步本地代码到生产服务器并重启服务
# 修复：彻底解决 rsync --delete 导致的目录清空问题
###############################################################################

set -e

# 配置
REMOTE_HOST="ubuntu@152.136.104.251"
REMOTE_BASE="/opt/ai-project"
LOCAL_DIR="/Users/johnqiu/coding/www/projects/new-ai-proj"

# SSH超时配置
SSH_OPTS="-o ConnectTimeout=10 -o ServerAliveInterval=5 -o ServerAliveCountMax=3"

# 命令超时配置
RSYNC_TIMEOUT=300
BUILD_TIMEOUT=600

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 日志函数
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
生产环境部署脚本 v2.0

用法: $0 [选项]

选项:
  --backend-only      仅部署后端
  --frontend-only     仅部署前端
  --no-build          跳过构建步骤
  --no-restart        跳过服务重启
  --dry-run           模拟运行
  --help              显示此帮助

改进:
  ✅ 修复 rsync --delete 导致目录清空问题
  ✅ 采用临时目录+原子切换策略
  ✅ 增强错误处理和回滚机制
  ✅ 详细的部署验证
EOF
}

# 检查前置条件
check_prerequisites() {
    log_info "检查前置条件..."

    if ! ssh $SSH_OPTS "$REMOTE_HOST" "echo connected" > /dev/null 2>&1; then
        log_error "无法连接到远程服务器: $REMOTE_HOST"
        exit 1
    fi

    log_success "前置条件检查通过"
}

# 创建临时构建目录
create_temp_build_dir() {
    local release_name="release_$(date +%Y%m%d_%H%M%S)"
    local temp_dir="$REMOTE_BASE/temp/$release_name"

    log_info "创建临时构建目录: $release_name"

    if [ "$DRY_RUN" != true ]; then
        ssh $SSH_OPTS "$REMOTE_HOST" "mkdir -p $temp_dir"
    fi

    echo "$temp_dir"
}

# 同步后端代码（不使用--delete）
sync_backend() {
    local temp_dir=$1

    log_info "同步后端代码..."

    if [ "$DRY_RUN" = true ]; then
        log_warning "[模拟] 同步后端代码"
        return 0
    fi

    # 关键修复：不使用 --delete 选项！
    rsync -az --timeout=$RSYNC_TIMEOUT \
        --exclude='*.log' \
        --exclude='uploads/' \
        --exclude='.env' \
        --exclude='.env.local' \
        --exclude='node_modules/' \
        --exclude='vendor/' \
        --exclude='.git/' \
        --exclude='build/' \
        --exclude='dist/' \
        "$LOCAL_DIR/backend/" \
        "$REMOTE_HOST:$temp_dir/backend/"

    if [ $? -ne 0 ]; then
        log_error "后端代码同步失败"
        return 1
    fi

    # 验证
    local file_count=$(ssh $SSH_OPTS "$REMOTE_HOST" "find $temp_dir/backend -type f | wc -l")
    if [ "$file_count" -lt 10 ]; then
        log_error "后端代码同步验证失败：文件太少 ($file_count 个)"
        return 1
    fi

    log_success "后端代码同步完成 ($file_count 个文件)"
}

# 同步前端代码
sync_frontend() {
    local temp_dir=$1

    log_info "同步前端代码..."

    if [ "$DRY_RUN" = true ]; then
        log_warning "[模拟] 同步前端代码"
        return 0
    fi

    rsync -az --timeout=$RSYNC_TIMEOUT \
        --exclude='node_modules/' \
        --exclude='build/' \
        --exclude='dist/' \
        --exclude='.env' \
        --exclude='.env.local' \
        --exclude='*.log' \
        --exclude='.git/' \
        "$LOCAL_DIR/frontend/" \
        "$REMOTE_HOST:$temp_dir/frontend/"

    if [ $? -ne 0 ]; then
        log_error "前端代码同步失败"
        return 1
    fi

    log_success "前端代码同步完成"
}

# 同步其他文件
sync_other_files() {
    local temp_dir=$1

    log_info "同步其他文件..."

    if [ "$DRY_RUN" = true ]; then
        log_warning "[模拟] 同步其他文件"
        return 0
    fi

    # 同步配置文件
    rsync -az --timeout=$RSYNC_TIMEOUT \
        "$LOCAL_DIR/docker-compose.prod.yml" \
        "$LOCAL_DIR/nginx.conf" \
        "$REMOTE_HOST:$temp_dir/" 2>/dev/null || true

    # 同步MCP服务器
    rsync -az --timeout=$RSYNC_TIMEOUT \
        --exclude='node_modules/' \
        --exclude='dist/' \
        --exclude='.env' \
        "$LOCAL_DIR/mcp-task-bridge/" \
        "$REMOTE_HOST:$temp_dir/mcp-task-bridge/" 2>/dev/null || true

    log_success "其他文件同步完成"
}

# 复制生产环境配置
copy_production_config() {
    local temp_dir=$1

    log_info "复制生产环境配置..."

    if [ "$DRY_RUN" = true ]; then
        log_warning "[模拟] 复制配置"
        return 0
    fi

    # 尝试从多个位置复制配置
    ssh $SSH_OPTS "$REMOTE_HOST" bash -s << EOF
        if [ -f $REMOTE_BASE/current/backend/.env ]; then
            cp $REMOTE_BASE/current/backend/.env $temp_dir/backend/.env
            echo "从 current 复制配置"
        elif [ -f $REMOTE_BASE/emergency-release/backend/.env ]; then
            cp $REMOTE_BASE/emergency-release/backend/.env $temp_dir/backend/.env
            echo "从 emergency-release 复制配置"
        elif [ -f $REMOTE_BASE/.env.prod ]; then
            cp $REMOTE_BASE/.env.prod $temp_dir/backend/.env
            echo "从备用配置复制"
        else
            echo "ERROR: 找不到配置文件"
            exit 1
        fi
EOF

    if [ $? -ne 0 ]; then
        log_error "复制配置失败"
        return 1
    fi

    log_success "配置复制完成"
}

# 在本地构建后端
build_backend_local() {
    log_info "在本地构建后端..."

    if [ "$DRY_RUN" = true ]; then
        log_warning "[模拟] 构建后端"
        return 0
    fi

    if ! command -v go &> /dev/null; then
        log_warning "本地未找到 Go 编译器"
        return 1
    fi

    cd "$LOCAL_DIR/backend" || return 1

    log_info "编译中..."
    GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -o main main.go

    if [ $? -ne 0 ] || [ ! -f main ]; then
        log_error "编译失败"
        return 1
    fi

    log_success "本地编译完成: $(ls -lh main | awk '{print $5}')"
    return 0
}

# 上传二进制文件
upload_binary() {
    local temp_dir=$1

    log_info "上传二进制文件..."

    if [ "$DRY_RUN" = true ]; then
        log_warning "[模拟] 上传二进制"
        return 0
    fi

    if [ ! -f "$LOCAL_DIR/backend/main" ]; then
        log_error "二进制文件不存在"
        return 1
    fi

    rsync -az --timeout=$RSYNC_TIMEOUT \
        "$LOCAL_DIR/backend/main" \
        "$REMOTE_HOST:$temp_dir/backend/main"

    if [ $? -ne 0 ]; then
        log_error "上传失败"
        return 1
    fi

    ssh $SSH_OPTS "$REMOTE_HOST" "chmod +x $temp_dir/backend/main"

    # 清理本地文件
    rm -f "$LOCAL_DIR/backend/main"

    log_success "二进制文件上传完成"
}

# 构建后端
build_backend() {
    local temp_dir=$1

    log_info "构建后端..."

    if build_backend_local && upload_binary "$temp_dir"; then
        log_success "后端构建完成"
        return 0
    fi

    log_error "后端构建失败"
    return 1
}

# 构建前端
build_frontend() {
    local temp_dir=$1

    log_info "构建前端..."

    if [ "$DRY_RUN" = true ]; then
        log_warning "[模拟] 构建前端"
        return 0
    fi

    log_info "在远程服务器构建前端..."
    ssh $SSH_OPTS "$REMOTE_HOST" bash -s << EOF
        cd $temp_dir/frontend

        if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
            echo "ERROR: Node.js 或 npm 未找到"
            exit 1
        fi

        echo "安装依赖..."
        npm install --legacy-peer-deps > /dev/null 2>&1

        echo "构建生产版本..."
        CI=false npm run build > /dev/null 2>&1

        if [ ! -d build ]; then
            echo "ERROR: 构建目录不存在"
            exit 1
        fi

        echo "SUCCESS: 构建完成 (\$(du -sh build | awk '{print \$1}'))"
EOF

    if [ $? -ne 0 ]; then
        log_error "前端构建失败"
        return 1
    fi

    log_success "前端构建完成"
}

# 验证构建结果
verify_build() {
    local temp_dir=$1

    log_info "验证构建结果..."

    if [ "$DRY_RUN" = true ]; then
        log_warning "[模拟] 验证构建"
        return 0
    fi

    local result=$(ssh $SSH_OPTS "$REMOTE_HOST" bash -s "$FRONTEND_ONLY" "$BACKEND_ONLY" << 'EOF'
        frontend_only=$1
        backend_only=$2
        temp_dir=/opt/ai-project/temp/release_*
        temp_dir=$(ls -td $temp_dir 2>/dev/null | head -1)
        errors=""

        # 检查后端
        if [ "$frontend_only" != "true" ]; then
            if [ ! -f $temp_dir/backend/main ]; then
                errors="${errors}后端二进制文件不存在\n"
            elif [ ! -x $temp_dir/backend/main ]; then
                errors="${errors}后端二进制文件没有执行权限\n"
            fi

            if [ ! -f $temp_dir/backend/.env ]; then
                errors="${errors}配置文件不存在\n"
            fi
        fi

        # 检查前端
        if [ "$backend_only" != "true" ]; then
            if [ ! -d $temp_dir/frontend/build ]; then
                errors="${errors}前端构建产物不存在\n"
            fi
        fi

        if [ -n "$errors" ]; then
            echo "ERROR: $errors"
            exit 1
        fi

        echo "SUCCESS"
EOF
)

    if [[ "$result" == *"ERROR"* ]]; then
        log_error "构建验证失败: $result"
        return 1
    fi

    log_success "构建验证通过"
}

# 原子切换到新版本
atomic_switch() {
    local temp_dir=$1
    local release_name=$(basename "$temp_dir")
    local release_dir="$REMOTE_BASE/releases/$release_name"

    log_info "原子切换到新版本..."

    if [ "$DRY_RUN" = true ]; then
        log_warning "[模拟] 原子切换"
        return 0
    fi

    ssh $SSH_OPTS "$REMOTE_HOST" bash -s << EOF
        # 创建releases目录
        mkdir -p $REMOTE_BASE/releases

        # 移动临时目录到releases
        mv $temp_dir $release_dir

        # 备份当前链接
        if [ -L $REMOTE_BASE/current ]; then
            rm -f $REMOTE_BASE/previous
            cp -P $REMOTE_BASE/current $REMOTE_BASE/previous
        fi

        # 原子更新链接
        ln -snf $release_dir $REMOTE_BASE/current

        echo "切换完成: $release_dir"
EOF

    if [ $? -ne 0 ]; then
        log_error "原子切换失败"
        return 1
    fi

    log_success "已切换到新版本: $release_name"
}

# 重启后端服务
restart_backend() {
    log_info "重启后端服务..."

    if [ "$DRY_RUN" = true ]; then
        log_warning "[模拟] 重启服务"
        return 0
    fi

    # 停止旧服务
    log_info "停止旧服务..."
    ssh $SSH_OPTS "$REMOTE_HOST" bash -s << 'EOF'
        # 查找进程
        pids=$(pgrep -f '/opt/ai-project.*main' || echo "")

        # 如果没找到，通过端口查找
        if [ -z "$pids" ]; then
            pids=$(lsof -ti:8080 2>/dev/null || echo "")
        fi

        if [ -n "$pids" ]; then
            echo "停止进程: $pids"
            kill $pids 2>/dev/null || true
            sleep 3

            # 强制停止残留
            remaining=$(lsof -ti:8080 2>/dev/null || echo "")
            if [ -n "$remaining" ]; then
                kill -9 $remaining 2>/dev/null || true
                sleep 1
            fi
        fi

        echo "旧服务已停止"
EOF

    # 启动新服务
    log_info "启动新服务..."
    ssh $SSH_OPTS "$REMOTE_HOST" bash -s << 'EOF'
        cd /opt/ai-project/current/backend

        if [ ! -f main ] || [ ! -x main ]; then
            echo "ERROR: 二进制文件不存在或无执行权限"
            exit 1
        fi

        nohup ./main > backend.log 2>&1 &
        new_pid=$!

        sleep 3

        if ! kill -0 $new_pid 2>/dev/null; then
            echo "ERROR: 进程启动失败"
            tail -30 backend.log
            exit 1
        fi

        echo "SUCCESS: 服务启动成功 (PID: $new_pid)"
EOF

    if [ $? -ne 0 ]; then
        log_error "服务启动失败"
        return 1
    fi

    # 健康检查
    log_info "健康检查..."
    for i in {1..10}; do
        local health=$(ssh $SSH_OPTS "$REMOTE_HOST" "curl -s http://localhost:8080/health 2>&1" || echo "ERROR")

        if [[ "$health" == *'"status":"ok"'* ]]; then
            log_success "健康检查通过"
            return 0
        fi

        if [ $i -lt 10 ]; then
            log_info "等待服务就绪... ($i/10)"
            sleep 2
        fi
    done

    log_error "健康检查失败"
    return 1
}

# 清理临时目录
cleanup_temp() {
    local temp_dir=$1

    if [ "$DRY_RUN" = true ] || [ -z "$temp_dir" ]; then
        return 0
    fi

    log_info "清理临时目录..."
    ssh $SSH_OPTS "$REMOTE_HOST" "rm -rf $temp_dir" 2>/dev/null || true
}

# 回滚函数
rollback() {
    log_warning "开始回滚..."

    ssh $SSH_OPTS "$REMOTE_HOST" bash -s << 'EOF'
        if [ -L /opt/ai-project/previous ]; then
            echo "恢复到previous版本..."
            ln -snf $(readlink /opt/ai-project/previous) /opt/ai-project/current

            # 重启服务
            lsof -ti:8080 | xargs -r kill -9 2>/dev/null || true
            cd /opt/ai-project/current/backend
            nohup ./main > backend.log 2>&1 &

            echo "回滚完成"
        else
            echo "WARNING: 没有previous版本可回滚"
        fi
EOF
}

# 主函数
main() {
    echo "=================================="
    echo "🚀 生产环境部署工具 v2.0"
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
            --backend-only) BACKEND_ONLY=true; shift ;;
            --frontend-only) FRONTEND_ONLY=true; shift ;;
            --no-build) NO_BUILD=true; shift ;;
            --no-restart) NO_RESTART=true; shift ;;
            --dry-run) DRY_RUN=true; shift ;;
            --help) show_help; exit 0 ;;
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

    # 步骤2: 创建临时目录
    TEMP_DIR=$(create_temp_build_dir)
    log_info "临时目录: $TEMP_DIR"

    # 错误处理：清理临时目录
    trap "cleanup_temp $TEMP_DIR" EXIT

    # 步骤3: 同步代码
    if [ "$FRONTEND_ONLY" = false ]; then
        sync_backend "$TEMP_DIR" || {
            log_error "后端同步失败"
            exit 1
        }
    fi

    if [ "$BACKEND_ONLY" = false ]; then
        sync_frontend "$TEMP_DIR" || {
            log_error "前端同步失败"
            exit 1
        }
        sync_other_files "$TEMP_DIR"
    fi

    # 步骤4: 复制配置
    if [ "$FRONTEND_ONLY" = false ]; then
        copy_production_config "$TEMP_DIR" || {
            log_error "复制配置失败"
            exit 1
        }
    fi

    # 步骤5: 构建后端
    if [ "$NO_BUILD" = false ] && [ "$FRONTEND_ONLY" = false ]; then
        build_backend "$TEMP_DIR" || {
            log_error "后端构建失败"
            exit 1
        }
    fi

    # 步骤6: 构建前端
    if [ "$NO_BUILD" = false ] && [ "$BACKEND_ONLY" = false ]; then
        build_frontend "$TEMP_DIR" || {
            log_error "前端构建失败"
            exit 1
        }
    fi

    # 步骤7: 验证构建
    verify_build "$TEMP_DIR" || {
        log_error "构建验证失败"
        exit 1
    }

    # 步骤8: 原子切换
    atomic_switch "$TEMP_DIR" || {
        log_error "版本切换失败"
        exit 1
    }

    # 步骤9: 重启服务
    if [ "$NO_RESTART" = false ] && [ "$FRONTEND_ONLY" = false ]; then
        restart_backend || {
            log_error "服务重启失败，尝试回滚..."
            rollback
            exit 1
        }
    fi

    echo ""
    log_success "🎉 部署完成！"
    echo ""
    log_info "可用命令："
    log_info "  查看日志: ssh $REMOTE_HOST 'tail -f /opt/ai-project/current/backend/backend.log'"
    log_info "  健康检查: ssh $REMOTE_HOST 'curl http://localhost:8080/health'"

    if [ "$DRY_RUN" = true ]; then
        log_warning "这是一次模拟运行"
    fi
}

# 执行主函数
main "$@"
