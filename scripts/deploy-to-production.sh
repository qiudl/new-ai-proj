#!/bin/bash

###############################################################################
# 生产环境部署脚本
# 功能：同步本地代码到生产服务器并重启服务
###############################################################################

set -e

# 配置
REMOTE_HOST="ubuntu@152.136.104.251"
REMOTE_BASE="/opt/ai-project"
LOCAL_DIR="/Users/johnqiu/coding/www/projects/new-ai-proj"

# SSH超时配置（防止网络不稳定时卡住）
SSH_OPTS="-o ConnectTimeout=10 -o ServerAliveInterval=5 -o ServerAliveCountMax=3"

# 命令超时配置
RSYNC_TIMEOUT=300      # rsync超时：5分钟
BUILD_TIMEOUT=600      # 编译超时：10分钟
DB_CHECK_TIMEOUT=30    # 数据库检查超时：30秒

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
生产环境部署脚本

用法: $0 [选项]

选项:
  --backend-only      仅部署后端
  --frontend-only     仅部署前端
  --no-build          跳过构建步骤
  --no-restart        跳过服务重启
  --dry-run           模拟运行（不实际同步）
  --help              显示此帮助信息

编译策略:
  脚本会自动选择最佳的编译方式（按优先级）：
  1. 本地 Go 编译    - 最快，如果本机有 Go 环境
  2. Docker 编译     - 推荐，不需要本地 Go 环境
  3. 远程服务器编译  - 降级方案，在服务器上编译

系统要求:
  本地环境（以下至少一项）：
    - Go 1.24.0+ (推荐)
    - Docker (推荐)

  远程服务器：
    - 如果本地无 Go/Docker，远程需要 Go 环境

示例:
  # 完整部署（自动选择编译方式）
  $0

  # 仅部署后端
  $0 --backend-only

  # 部署但不重启服务
  $0 --no-restart

  # 模拟运行
  $0 --dry-run

  # 跳过编译（使用已有二进制文件）
  $0 --no-build

EOF
}

# 检查前置条件
check_prerequisites() {
    log_info "检查前置条件..."
    
    # 检查SSH连接
    if ! ssh $SSH_OPTS "$REMOTE_HOST" "echo connected" > /dev/null 2>&1; then
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

    if [ "$DRY_RUN" != true ]; then
        ssh $SSH_OPTS "$REMOTE_HOST" "mkdir -p $release_dir"
    fi

    echo "$release_dir"
}

# 同步后端代码
sync_backend() {
    local release_dir=$1

    log_info "同步后端代码..."

    ssh $SSH_OPTS "$REMOTE_HOST" "mkdir -p $release_dir/backend"

    if [ "$DRY_RUN" = true ]; then
        log_warning "[模拟] 同步后端代码到: $release_dir/backend"
        return 0
    fi

    # 排除不需要同步的文件
    # 注意：排除规则不要使用通配符，避免误排除目录
    # 使用 -a 而不是 -avz 来减少输出
    rsync -az --delete --timeout=$RSYNC_TIMEOUT \
        --exclude='ai-project-backend*' \
        --exclude='main' \
        --exclude='backend-test' \
        --exclude='backend-linux' \
        --exclude='main-*' \
        --exclude='*.log' \
        --exclude='uploads/' \
        --exclude='.env' \
        --exclude='.env.local' \
        --exclude='node_modules/' \
        --exclude='vendor/' \
        --exclude='.git/' \
        "$LOCAL_DIR/backend/" \
        "$REMOTE_HOST:$release_dir/backend/"

    if [ $? -ne 0 ]; then
        log_error "后端代码同步失败"
        return 1
    fi

    # 验证同步结果
    local file_count=$(ssh $SSH_OPTS "$REMOTE_HOST" "ls -1 $release_dir/backend/ 2>/dev/null | wc -l")
    if [ "$file_count" -lt 5 ]; then
        log_error "后端代码同步验证失败：目录中文件太少 ($file_count 个文件)"
        log_error "尝试列出目录内容："
        ssh $SSH_OPTS "$REMOTE_HOST" "ls -la $release_dir/backend/ 2>&1" || true
        return 1
    fi

    log_success "后端代码同步完成 (共 $file_count 个文件/目录)"
}

# 复制生产环境配置
copy_production_config() {
    local release_dir=$1

    log_info "复制生产环境配置..."

    if [ "$DRY_RUN" = true ]; then
        log_warning "[模拟] 复制生产环境配置"
        return 0
    fi

    # 检查旧版本的配置文件
    local old_env_exists=$(ssh $SSH_OPTS "$REMOTE_HOST" "test -f $REMOTE_BASE/backend/.env && echo 'yes' || echo 'no'")

    if [ "$old_env_exists" = "yes" ]; then
        log_info "从旧版本复制 .env 配置..."
        ssh $SSH_OPTS "$REMOTE_HOST" "cp $REMOTE_BASE/backend/.env $release_dir/backend/.env"
        log_success "生产环境配置复制完成"
    else
        log_warning "未找到旧版本的 .env 文件"
        log_warning "请确保新版本目录中有正确的 .env 配置文件"

        # 检查是否有备用配置
        local backup_env_exists=$(ssh $SSH_OPTS "$REMOTE_HOST" "test -f $REMOTE_BASE/.env.prod && echo 'yes' || echo 'no'")
        if [ "$backup_env_exists" = "yes" ]; then
            log_info "使用备用配置 .env.prod..."
            ssh $SSH_OPTS "$REMOTE_HOST" "cp $REMOTE_BASE/.env.prod $release_dir/backend/.env"
            log_success "备用配置复制完成"
        else
            log_error "错误：找不到生产环境配置文件！"
            log_error "请在以下位置之一提供 .env 文件："
            log_error "  - $REMOTE_BASE/backend/.env (旧版本配置)"
            log_error "  - $REMOTE_BASE/.env.prod (备用配置)"
            return 1
        fi
    fi

    # 验证配置文件内容
    log_info "验证配置文件..."
    local db_port=$(ssh $SSH_OPTS "$REMOTE_HOST" "grep '^DB_PORT=' $release_dir/backend/.env | cut -d'=' -f2")
    local db_host=$(ssh $SSH_OPTS "$REMOTE_HOST" "grep '^DB_HOST=' $release_dir/backend/.env | cut -d'=' -f2")

    if [ -z "$db_port" ] || [ -z "$db_host" ]; then
        log_error "配置文件验证失败：缺少必要的数据库配置"
        return 1
    fi

    log_success "配置验证通过: DB_HOST=$db_host, DB_PORT=$db_port"
}

# 验证数据库连接
verify_database_connection() {
    local release_dir=$1

    log_info "验证数据库连接..."

    if [ "$DRY_RUN" = true ]; then
        log_warning "[模拟] 验证数据库连接"
        return 0
    fi

    # 从配置文件读取数据库信息
    local db_check=$(ssh $SSH_OPTS "$REMOTE_HOST" bash -s "$release_dir" << 'EOF'
        release_dir=$1
        cd $release_dir/backend
        if [ ! -f .env ]; then
            echo "ERROR: .env file not found"
            exit 1
        fi

        # 读取数据库配置
        source .env

        # 检查PostgreSQL是否可访问
        if command -v psql > /dev/null 2>&1; then
            # 使用psql检查连接（带超时）
            timeout $DB_CHECK_TIMEOUT bash -c "PGPASSWORD=\$DB_PASSWORD psql -h \$DB_HOST -p \$DB_PORT -U \$DB_USER -d \$DB_NAME -c 'SELECT 1;'" > /dev/null 2>&1
            if [ $? -eq 0 ]; then
                echo "SUCCESS"
            else
                echo "ERROR: Cannot connect to database"
            fi
        else
            # 如果没有psql，至少检查端口是否开放
            if nc -z $DB_HOST $DB_PORT 2>/dev/null || timeout 2 bash -c "cat < /dev/null > /dev/tcp/$DB_HOST/$DB_PORT" 2>/dev/null; then
                echo "SUCCESS"
            else
                echo "ERROR: Database port $DB_PORT is not accessible"
            fi
        fi
EOF
)

    if [[ "$db_check" == *"ERROR"* ]]; then
        log_error "数据库连接验证失败: $db_check"
        log_error "请检查以下内容："
        log_error "  1. PostgreSQL 服务是否运行"
        log_error "  2. 数据库配置是否正确"
        log_error "  3. 网络连接是否正常"
        return 1
    fi

    log_success "数据库连接验证通过"
}

# 同步前端代码
sync_frontend() {
    local release_dir=$1
    
    log_info "同步前端代码..."

    ssh $SSH_OPTS "$REMOTE_HOST" "mkdir -p $release_dir/frontend"

    if [ "$DRY_RUN" = true ]; then
        log_warning "[模拟] 同步前端代码到: $release_dir/frontend"
        return 0
    fi
    
    rsync -az --delete --timeout=$RSYNC_TIMEOUT \
        --exclude='node_modules/' \
        --exclude='build/' \
        --exclude='dist/' \
        --exclude='.env' \
        --exclude='.env.local' \
        --exclude='*.log' \
        --exclude='.git/' \
        "$LOCAL_DIR/frontend/" \
        "$REMOTE_HOST:$release_dir/frontend/"

    if [ $? -ne 0 ]; then
        log_error "前端代码同步失败"
        return 1
    fi

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

    ssh $SSH_OPTS "$REMOTE_HOST" "mkdir -p $release_dir/mcp-task-bridge"

    # 同步配置文件
    rsync -az --timeout=$RSYNC_TIMEOUT \
        "$LOCAL_DIR/docker-compose.prod.yml" \
        "$LOCAL_DIR/nginx.conf" \
        "$REMOTE_HOST:$release_dir/" 2>/dev/null || true

    # 同步MCP服务器
    rsync -az --delete --timeout=$RSYNC_TIMEOUT \
        --exclude='node_modules/' \
        --exclude='dist/' \
        --exclude='.env' \
        "$LOCAL_DIR/mcp-task-bridge/" \
        "$REMOTE_HOST:$release_dir/mcp-task-bridge/" 2>/dev/null || true
    
    log_success "其他文件同步完成"
}

# 在本地构建后端（使用本机 Go）
build_backend_local() {
    log_info "在本地使用 Go 构建后端..."

    if [ "$DRY_RUN" = true ]; then
        log_warning "[模拟] 本地构建后端"
        return 0
    fi

    # 检查本地 Go 环境
    if ! command -v go &> /dev/null; then
        log_warning "本地未找到 Go 编译器"
        return 1
    fi

    log_info "使用本地 Go 编译器: $(go version)"
    log_info "目标平台: Linux AMD64"

    cd "$LOCAL_DIR/backend" || return 1

    # 为 Linux 编译
    log_info "开始编译..."
    GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -v -o main main.go

    if [ $? -ne 0 ]; then
        log_error "本地编译失败"
        return 1
    fi

    if [ ! -f main ]; then
        log_error "编译后的二进制文件不存在"
        return 1
    fi

    log_success "本地编译完成: $(ls -lh main | awk '{print $5}')"
    return 0
}

# 使用 Docker 构建后端
build_backend_docker() {
    log_info "使用 Docker 构建后端..."

    if [ "$DRY_RUN" = true ]; then
        log_warning "[模拟] Docker 构建后端"
        return 0
    fi

    # 检查 Docker
    if ! command -v docker &> /dev/null; then
        log_warning "Docker 未找到"
        return 1
    fi

    log_info "使用 Docker 编译..."
    cd "$LOCAL_DIR/backend" || return 1

    # 使用 Go Docker 镜像编译
    docker run --rm \
        -v "$LOCAL_DIR/backend:/app" \
        -w /app \
        golang:1.24.0-alpine \
        sh -c "go mod download && GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -v -o main main.go"

    if [ $? -ne 0 ]; then
        log_error "Docker 编译失败"
        return 1
    fi

    if [ ! -f main ]; then
        log_error "编译后的二进制文件不存在"
        return 1
    fi

    log_success "Docker 编译完成: $(ls -lh main | awk '{print $5}')"
    return 0
}

# 在远程服务器构建后端
build_backend_remote() {
    local release_dir=$1

    log_info "在服务器上构建后端..."

    if [ "$DRY_RUN" = true ]; then
        log_warning "[模拟] 远程构建后端"
        return 0
    fi

    log_info "开始远程编译 Go 项目..."
    local build_output=$(ssh $SSH_OPTS "$REMOTE_HOST" bash -s << EOF 2>&1
        cd $release_dir/backend

        # 检查 Go 是否安装
        if ! command -v go &> /dev/null; then
            echo "ERROR: Go 编译器未找到"
            exit 1
        fi

        # 显示 Go 版本
        echo "Go version: \$(go version)"

        # 检查 main.go 是否存在
        if [ ! -f main.go ]; then
            echo "ERROR: main.go 文件不存在"
            exit 1
        fi

        # 下载依赖
        echo "下载依赖..."
        go mod download 2>&1

        # 编译（带超时保护）
        echo "开始编译..."
        timeout $BUILD_TIMEOUT go build -v -o main main.go 2>&1
        build_status=\$?

        if [ \$build_status -ne 0 ]; then
            echo "ERROR: 编译失败，退出码: \$build_status"
            exit \$build_status
        fi

        # 设置执行权限
        chmod +x main

        # 验证二进制文件
        if [ ! -f main ]; then
            echo "ERROR: 编译后的二进制文件不存在"
            exit 1
        fi

        # 显示二进制文件信息
        echo "SUCCESS: 编译完成"
        ls -lh main
EOF
)

    local build_status=$?

    # 输出构建日志
    echo "$build_output" | while IFS= read -r line; do
        if [[ "$line" == ERROR:* ]]; then
            log_error "  $line"
        elif [[ "$line" == SUCCESS:* ]]; then
            log_success "  $line"
        else
            log_info "  $line"
        fi
    done

    # 检查构建状态
    if [ $build_status -ne 0 ]; then
        log_error "远程构建失败！"
        log_error "请检查以下内容："
        log_error "  1. Go 编译器是否正确安装"
        log_error "  2. 代码是否有编译错误"
        log_error "  3. 依赖包是否完整"
        return 1
    fi

    log_success "远程构建完成"
}

# 上传本地编译的二进制文件
upload_binary() {
    local release_dir=$1

    log_info "上传编译好的二进制文件到服务器..."

    if [ "$DRY_RUN" = true ]; then
        log_warning "[模拟] 上传二进制文件"
        return 0
    fi

    if [ ! -f "$LOCAL_DIR/backend/main" ]; then
        log_error "本地二进制文件不存在: $LOCAL_DIR/backend/main"
        return 1
    fi

    # 上传二进制文件
    rsync -avz --timeout=$RSYNC_TIMEOUT \
        "$LOCAL_DIR/backend/main" \
        "$REMOTE_HOST:$release_dir/backend/main"

    if [ $? -ne 0 ]; then
        log_error "上传二进制文件失败"
        return 1
    fi

    # 设置执行权限
    ssh $SSH_OPTS "$REMOTE_HOST" "chmod +x $release_dir/backend/main"

    log_success "二进制文件上传完成"

    # 清理本地编译文件
    log_info "清理本地编译文件..."
    rm -f "$LOCAL_DIR/backend/main"

    return 0
}

# 构建后端（智能选择编译方式）
build_backend() {
    local release_dir=$1

    log_info "开始构建后端..."
    log_info "编译策略: 本地Go → Docker → 远程服务器"

    if [ "$DRY_RUN" = true ]; then
        log_warning "[模拟] 构建后端"
        return 0
    fi

    # 策略1: 尝试本地编译
    if build_backend_local; then
        log_success "使用本地 Go 编译成功"
        if upload_binary "$release_dir"; then
            log_success "后端构建完成（本地编译）"
            return 0
        else
            log_warning "上传失败，尝试其他方式"
        fi
    else
        log_warning "本地 Go 编译失败或不可用"
    fi

    # 策略2: 尝试使用 Docker 编译
    if build_backend_docker; then
        log_success "使用 Docker 编译成功"
        if upload_binary "$release_dir"; then
            log_success "后端构建完成（Docker编译）"
            return 0
        else
            log_warning "上传失败，尝试远程编译"
        fi
    else
        log_warning "Docker 编译失败或不可用"
    fi

    # 策略3: 在远程服务器编译
    log_info "尝试在远程服务器编译..."
    if build_backend_remote "$release_dir"; then
        log_success "后端构建完成（远程编译）"
        return 0
    fi

    # 所有方式都失败
    log_error "所有编译方式都失败了！"
    log_error "请检查以下内容："
    log_error "  1. 本地安装 Go 编译器: brew install go"
    log_error "  2. 或安装 Docker: brew install docker"
    log_error "  3. 或确保远程服务器安装了 Go"
    return 1
}

# 更新软链接
update_symlink() {
    local release_dir=$1
    
    log_info "更新软链接..."
    
    if [ "$DRY_RUN" = true ]; then
        log_warning "[模拟] 更新软链接"
        return 0
    fi
    
    ssh $SSH_OPTS "$REMOTE_HOST" << EOF
        cd $REMOTE_BASE
        # 备份当前链接为previous
        if [ -L current ]; then
            rm -f previous
            cp -P current previous
        fi
        # 更新current链接
        ln -sf $release_dir current
EOF
    
    log_success "软链接更新完成"
}

# 重启后端服务
restart_backend() {
    local release_dir=$1

    log_info "重启后端服务..."

    if [ "$DRY_RUN" = true ]; then
        log_warning "[模拟] 重启后端服务"
        return 0
    fi

    # 获取旧进程信息用于回滚
    log_info "记录当前运行的进程信息..."
    local old_pid=$(ssh $SSH_OPTS "$REMOTE_HOST" "pgrep -f '$REMOTE_BASE/backend.*main' || echo ''")

    if [ -n "$old_pid" ]; then
        log_info "当前运行的进程: PID=$old_pid"
    else
        log_warning "未找到正在运行的后端进程"
    fi

    # 停止旧服务
    log_info "停止旧版本服务..."
    ssh $SSH_OPTS "$REMOTE_HOST" bash -s << 'EOF'
        # 查找所有相关进程
        pids=$(pgrep -f '/opt/ai-project.*main' || echo "")

        if [ -n "$pids" ]; then
            echo "找到以下进程: $pids"
            kill $pids 2>/dev/null || true
            sleep 2

            # 确认进程已停止
            remaining=$(pgrep -f '/opt/ai-project.*main' || echo "")
            if [ -n "$remaining" ]; then
                echo "强制停止残留进程: $remaining"
                kill -9 $remaining 2>/dev/null || true
            fi
            echo "旧服务已停止"
        else
            echo "没有运行中的服务需要停止"
        fi
EOF

    sleep 1

    # 启动新服务
    log_info "启动新版本服务..."
    local start_output=$(ssh $SSH_OPTS "$REMOTE_HOST" bash -s << EOF 2>&1
        cd $release_dir/backend

        # 检查二进制文件
        if [ ! -f main ]; then
            echo "ERROR: 二进制文件不存在"
            exit 1
        fi

        if [ ! -x main ]; then
            echo "ERROR: 二进制文件没有执行权限"
            exit 1
        fi

        # 检查配置文件
        if [ ! -f .env ]; then
            echo "ERROR: 配置文件 .env 不存在"
            exit 1
        fi

        # 启动服务
        echo "启动服务..."
        nohup ./main > backend.log 2>&1 &
        new_pid=\$!
        echo "新进程 PID: \$new_pid"

        # 等待服务启动
        sleep 3

        # 检查进程是否还在运行
        if ! kill -0 \$new_pid 2>/dev/null; then
            echo "ERROR: 进程启动后立即退出"
            echo "最近的日志:"
            tail -30 backend.log
            exit 1
        fi

        echo "SUCCESS: 进程正在运行"
EOF
)

    echo "$start_output"

    # 验证服务健康状态
    log_info "验证服务健康状态..."
    local health_check_passed=false

    for i in {1..10}; do
        log_info "健康检查尝试 $i/10..."
        local health_response=$(ssh $SSH_OPTS "$REMOTE_HOST" "curl -s -w '\nHTTP_CODE:%{http_code}' http://localhost:8080/health 2>&1" || echo "ERROR")

        if [[ "$health_response" == *"HTTP_CODE:200"* ]] || [[ "$health_response" == *'"status":"ok"'* ]]; then
            health_check_passed=true
            log_success "健康检查通过"
            echo "$health_response" | grep -v "HTTP_CODE"
            break
        fi

        if [ $i -lt 10 ]; then
            log_warning "健康检查失败，2秒后重试..."
            sleep 2
        fi
    done

    # 如果健康检查失败，显示详细错误信息
    if [ "$health_check_passed" = false ]; then
        log_error "服务启动失败！"
        log_error "正在收集错误信息..."

        ssh $SSH_OPTS "$REMOTE_HOST" bash -s << EOF
            echo "=== 进程状态 ==="
            ps aux | grep -E 'main|backend' | grep -v grep || echo "没有相关进程"

            echo ""
            echo "=== 端口监听 ==="
            netstat -tlnp 2>/dev/null | grep 8080 || ss -tlnp | grep 8080 || echo "端口 8080 未被监听"

            echo ""
            echo "=== 最近的应用日志 (最后50行) ==="
            tail -50 $release_dir/backend/backend.log 2>/dev/null || echo "日志文件不存在"

            echo ""
            echo "=== 系统日志 ==="
            journalctl -u ai-project-backend -n 20 --no-pager 2>/dev/null || echo "没有systemd服务日志"
EOF

        log_error "部署失败，建议检查上述日志信息"
        return 1
    fi

    log_success "后端服务重启完成"

    # 显示新进程信息
    local new_pid=$(ssh $SSH_OPTS "$REMOTE_HOST" "pgrep -f '$release_dir/backend/main' || echo ''")
    if [ -n "$new_pid" ]; then
        log_success "新服务进程: PID=$new_pid"
    fi
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
        sync_backend "$RELEASE_DIR" || {
            log_error "后端代码同步失败，部署中止"
            exit 1
        }
    fi

    if [ "$BACKEND_ONLY" = false ]; then
        sync_frontend "$RELEASE_DIR" || {
            log_error "前端代码同步失败，部署中止"
            exit 1
        }
        sync_other_files "$RELEASE_DIR"
    fi

    # 步骤4: 复制生产环境配置
    if [ "$FRONTEND_ONLY" = false ]; then
        copy_production_config "$RELEASE_DIR" || {
            log_error "复制生产环境配置失败，部署中止"
            exit 1
        }
    fi

    # 步骤5: 构建
    if [ "$NO_BUILD" = false ] && [ "$FRONTEND_ONLY" = false ]; then
        build_backend "$RELEASE_DIR" || {
            log_error "后端构建失败，部署中止"
            exit 1
        }
    fi

    # 步骤6: 验证数据库连接
    if [ "$FRONTEND_ONLY" = false ]; then
        verify_database_connection "$RELEASE_DIR" || {
            log_error "数据库连接验证失败，部署中止"
            exit 1
        }
    fi

    # 步骤7: 更新软链接
    update_symlink "$RELEASE_DIR"

    # 步骤8: 重启服务
    if [ "$NO_RESTART" = false ] && [ "$FRONTEND_ONLY" = false ]; then
        restart_backend "$RELEASE_DIR" || {
            log_error "服务重启失败，部署失败"
            exit 1
        }
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
