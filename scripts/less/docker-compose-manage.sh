#!/bin/bash

###############################################################################
# Docker Compose 生产环境管理脚本 v1.0
# 功能：统一管理docker-compose生产环境
###############################################################################

set -e

# 配置
REMOTE_HOST="ubuntu@152.136.104.251"
REMOTE_DIR="/opt/ai-project/current"
LOCAL_DIR="/Users/johnqiu/coding/www/projects/new-ai-proj"
SSH_OPTS="-o ConnectTimeout=10 -o ServerAliveInterval=5 -o ServerAliveCountMax=3"

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
Docker Compose 生产环境管理脚本 v1.0

用法: $0 <命令> [选项]

命令:
  up              启动所有服务
  down            停止所有服务
  restart         重启所有服务
  restart-backend 仅重启后端服务
  restart-frontend 仅重启前端服务
  restart-nginx   仅重启Nginx服务
  status          查看所有服务状态
  logs            查看服务日志
  ps              查看容器列表
  deploy          部署更新（同步代码+重启）
  validate        验证docker-compose配置
  stats           查看资源使用情况
  clean           清理未使用的容器和镜像

选项:
  -f, --follow    跟随日志输出（用于logs命令）
  -h, --help      显示此帮助

示例:
  # 启动所有服务
  $0 up

  # 重启后端
  $0 restart-backend

  # 查看实时日志
  $0 logs -f

  # 查看后端日志
  $0 logs backend-prod

  # 部署更新
  $0 deploy
EOF
}

# 同步docker-compose文件到远程
sync_compose_file() {
    log_info "同步docker-compose配置到生产服务器..."

    rsync -avz --timeout=300 \
        -e "ssh $SSH_OPTS" \
        "$LOCAL_DIR/docker-compose.prod.yml" \
        "$REMOTE_HOST:$REMOTE_DIR/" || {
        log_error "同步失败"
        return 1
    }

    # 同步.env文件（如果存在）
    if [ -f "$LOCAL_DIR/.env.production" ]; then
        rsync -avz --timeout=300 \
            -e "ssh $SSH_OPTS" \
            "$LOCAL_DIR/.env.production" \
            "$REMOTE_HOST:$REMOTE_DIR/.env" || {
            log_warning ".env文件同步失败"
        }
    fi

    log_success "配置文件同步完成"
}

# 验证配置
validate_config() {
    log_info "验证docker-compose配置..."

    ssh $SSH_OPTS "$REMOTE_HOST" bash -s << 'EOF'
        cd /opt/ai-project/current

        if [ ! -f docker-compose.prod.yml ]; then
            echo "ERROR: docker-compose.prod.yml不存在"
            exit 1
        fi

        docker-compose -f docker-compose.prod.yml config --quiet

        if [ $? -eq 0 ]; then
            echo "SUCCESS: 配置验证通过"
        else
            echo "ERROR: 配置验证失败"
            exit 1
        fi
EOF

    if [ $? -eq 0 ]; then
        log_success "配置验证通过"
        return 0
    else
        log_error "配置验证失败"
        return 1
    fi
}

# 启动服务
start_services() {
    log_info "启动所有服务..."

    ssh $SSH_OPTS "$REMOTE_HOST" bash -s << 'EOF'
        cd /opt/ai-project/current
        docker-compose -f docker-compose.prod.yml up -d

        echo ""
        echo "=== 等待服务启动 ==="
        sleep 10

        echo ""
        echo "=== 容器状态 ==="
        docker-compose -f docker-compose.prod.yml ps
EOF

    if [ $? -eq 0 ]; then
        log_success "服务启动完成"
        return 0
    else
        log_error "服务启动失败"
        return 1
    fi
}

# 停止服务
stop_services() {
    log_info "停止所有服务..."

    ssh $SSH_OPTS "$REMOTE_HOST" bash -s << 'EOF'
        cd /opt/ai-project/current
        docker-compose -f docker-compose.prod.yml down
EOF

    if [ $? -eq 0 ]; then
        log_success "服务停止完成"
        return 0
    else
        log_error "服务停止失败"
        return 1
    fi
}

# 重启服务
restart_services() {
    log_info "重启所有服务..."

    ssh $SSH_OPTS "$REMOTE_HOST" bash -s << 'EOF'
        cd /opt/ai-project/current
        docker-compose -f docker-compose.prod.yml restart

        echo ""
        echo "=== 等待服务重启 ==="
        sleep 5

        echo ""
        echo "=== 容器状态 ==="
        docker-compose -f docker-compose.prod.yml ps
EOF

    if [ $? -eq 0 ]; then
        log_success "服务重启完成"
        return 0
    else
        log_error "服务重启失败"
        return 1
    fi
}

# 重启单个服务
restart_service() {
    local service=$1
    log_info "重启服务: $service"

    ssh $SSH_OPTS "$REMOTE_HOST" bash -s "$service" << 'EOF'
        service=$1
        cd /opt/ai-project/current
        docker-compose -f docker-compose.prod.yml restart "$service"

        echo ""
        echo "=== 等待服务重启 ==="
        sleep 3

        echo ""
        echo "=== 服务状态 ==="
        docker-compose -f docker-compose.prod.yml ps "$service"
EOF

    if [ $? -eq 0 ]; then
        log_success "服务重启完成: $service"
        return 0
    else
        log_error "服务重启失败: $service"
        return 1
    fi
}

# 查看状态
show_status() {
    log_info "查看服务状态..."

    ssh $SSH_OPTS "$REMOTE_HOST" bash -s << 'EOF'
        cd /opt/ai-project/current

        echo "=== Docker Compose 服务状态 ==="
        docker-compose -f docker-compose.prod.yml ps

        echo ""
        echo "=== 健康检查状态 ==="
        docker ps --filter "name=ai_" --format "table {{.Names}}\t{{.Status}}"

        echo ""
        echo "=== 资源使用 ==="
        docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" $(docker ps --filter "name=ai_" -q)
EOF
}

# 查看日志
show_logs() {
    local service=$1
    local follow=$2

    if [ "$follow" = "-f" ] || [ "$follow" = "--follow" ]; then
        log_info "查看实时日志: ${service:-所有服务}"
        ssh $SSH_OPTS "$REMOTE_HOST" -t "cd /opt/ai-project/current && docker-compose -f docker-compose.prod.yml logs -f $service"
    else
        log_info "查看日志: ${service:-所有服务}"
        ssh $SSH_OPTS "$REMOTE_HOST" "cd /opt/ai-project/current && docker-compose -f docker-compose.prod.yml logs --tail=100 $service"
    fi
}

# 查看容器列表
show_ps() {
    ssh $SSH_OPTS "$REMOTE_HOST" "cd /opt/ai-project/current && docker-compose -f docker-compose.prod.yml ps"
}

# 部署更新
deploy_update() {
    log_info "开始部署更新..."

    # 1. 同步配置文件
    sync_compose_file || return 1

    # 2. 验证配置
    validate_config || return 1

    # 3. 同步代码（后端和前端）
    log_info "同步代码..."
    rsync -avz --timeout=300 \
        -e "ssh $SSH_OPTS" \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude 'vendor' \
        "$LOCAL_DIR/backend/" \
        "$REMOTE_HOST:$REMOTE_DIR/backend/" || {
        log_error "后端代码同步失败"
        return 1
    }

    rsync -avz --timeout=300 \
        -e "ssh $SSH_OPTS" \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude 'build' \
        "$LOCAL_DIR/frontend/" \
        "$REMOTE_HOST:$REMOTE_DIR/frontend/" || {
        log_error "前端代码同步失败"
        return 1
    }

    # 4. 重新构建并启动
    log_info "重新构建并启动服务..."
    ssh $SSH_OPTS "$REMOTE_HOST" bash -s << 'EOF'
        cd /opt/ai-project/current

        # 重新构建镜像
        docker-compose -f docker-compose.prod.yml build --no-cache backend-prod frontend-prod

        # 停止旧容器
        docker-compose -f docker-compose.prod.yml stop backend-prod frontend-prod

        # 启动新容器
        docker-compose -f docker-compose.prod.yml up -d backend-prod frontend-prod

        echo ""
        echo "=== 等待服务启动 ==="
        sleep 10

        echo ""
        echo "=== 健康检查 ==="
        for i in {1..30}; do
            if docker exec ai_backend_prod wget --no-proxy -O- -q http://localhost:8080/health > /dev/null 2>&1; then
                echo "✓ 后端健康检查通过"
                break
            fi
            if [ $i -eq 30 ]; then
                echo "✗ 后端健康检查超时"
                exit 1
            fi
            echo "等待后端就绪... ($i/30)"
            sleep 2
        done
EOF

    if [ $? -eq 0 ]; then
        log_success "部署更新完成"
        show_status
        return 0
    else
        log_error "部署更新失败"
        return 1
    fi
}

# 查看资源统计
show_stats() {
    log_info "查看资源使用统计..."

    ssh $SSH_OPTS "$REMOTE_HOST" -t "cd /opt/ai-project/current && docker stats $(docker ps --filter 'name=ai_' -q)"
}

# 清理未使用资源
clean_resources() {
    log_warning "清理未使用的Docker资源..."

    ssh $SSH_OPTS "$REMOTE_HOST" bash -s << 'EOF'
        echo "=== 清理停止的容器 ==="
        docker container prune -f

        echo ""
        echo "=== 清理未使用的镜像 ==="
        docker image prune -f

        echo ""
        echo "=== 清理未使用的卷 ==="
        docker volume prune -f

        echo ""
        echo "=== 清理未使用的网络 ==="
        docker network prune -f

        echo ""
        echo "=== 磁盘使用情况 ==="
        docker system df
EOF

    if [ $? -eq 0 ]; then
        log_success "清理完成"
        return 0
    else
        log_error "清理失败"
        return 1
    fi
}

# 主函数
main() {
    if [ $# -eq 0 ]; then
        show_help
        exit 0
    fi

    local command=$1
    shift

    case $command in
        up)
            start_services
            ;;
        down)
            stop_services
            ;;
        restart)
            restart_services
            ;;
        restart-backend)
            restart_service "backend-prod"
            ;;
        restart-frontend)
            restart_service "frontend-prod"
            ;;
        restart-nginx)
            restart_service "nginx"
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs "$@"
            ;;
        ps)
            show_ps
            ;;
        deploy)
            deploy_update
            ;;
        validate)
            sync_compose_file && validate_config
            ;;
        stats)
            show_stats
            ;;
        clean)
            clean_resources
            ;;
        -h|--help)
            show_help
            ;;
        *)
            log_error "未知命令: $command"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
