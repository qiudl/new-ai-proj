#!/bin/bash

# AI Project 部署脚本
# 用于在 proj-joylodging 服务器上执行部署任务

set -euo pipefail

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
DEPLOY_DIR="/home/deploy/new-ai-proj"
BACKUP_DIR="/home/deploy/backups"
MAX_BACKUPS=5
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env.production"

# 日志函数
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# 检查必要的工具
check_dependencies() {
    log "检查系统依赖..."
    
    local deps=("docker" "docker-compose" "git" "curl")
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            error "$dep 未安装"
            return 1
        fi
    done
    
    # 检查 Docker 服务状态
    if ! systemctl is-active --quiet docker; then
        error "Docker 服务未运行"
        return 1
    fi
    
    success "所有依赖检查通过"
}

# 创建备份
create_backup() {
    log "创建当前版本备份..."
    
    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
    fi
    
    local backup_name="backup-$(date +%Y%m%d-%H%M%S)"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    # 备份当前配置和数据
    mkdir -p "$backup_path"
    
    # 备份环境变量文件
    if [ -f "$DEPLOY_DIR/$ENV_FILE" ]; then
        cp "$DEPLOY_DIR/$ENV_FILE" "$backup_path/"
    fi
    
    # 备份 docker-compose 文件
    if [ -f "$DEPLOY_DIR/$COMPOSE_FILE" ]; then
        cp "$DEPLOY_DIR/$COMPOSE_FILE" "$backup_path/"
    fi
    
    # 记录当前运行的容器版本
    docker compose -f "$DEPLOY_DIR/$COMPOSE_FILE" ps --format json > "$backup_path/containers.json"
    
    # 导出数据库备份
    log "导出数据库备份..."
    docker compose -f "$DEPLOY_DIR/$COMPOSE_FILE" exec -T postgres pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$backup_path/database.sql.gz"
    
    success "备份创建完成: $backup_path"
    
    # 清理旧备份
    cleanup_old_backups
}

# 清理旧备份
cleanup_old_backups() {
    log "清理旧备份..."
    
    local backup_count=$(ls -1 "$BACKUP_DIR" | wc -l)
    if [ "$backup_count" -gt "$MAX_BACKUPS" ]; then
        local backups_to_remove=$((backup_count - MAX_BACKUPS))
        ls -1t "$BACKUP_DIR" | tail -n "$backups_to_remove" | while read -r backup; do
            rm -rf "$BACKUP_DIR/$backup"
            log "删除旧备份: $backup"
        done
    fi
}

# 拉取最新镜像
pull_images() {
    log "拉取最新 Docker 镜像..."
    
    cd "$DEPLOY_DIR"
    docker compose -f "$COMPOSE_FILE" pull
    
    success "镜像拉取完成"
}

# 停止服务
stop_services() {
    log "停止当前服务..."
    
    cd "$DEPLOY_DIR"
    docker compose -f "$COMPOSE_FILE" down
    
    success "服务已停止"
}

# 启动服务
start_services() {
    log "启动新服务..."
    
    cd "$DEPLOY_DIR"
    docker compose -f "$COMPOSE_FILE" up -d
    
    success "服务启动完成"
}

# 健康检查
health_check() {
    log "执行健康检查..."
    
    local services=("postgres" "backend" "frontend" "nginx")
    local max_retries=30
    local retry_interval=2
    
    for service in "${services[@]}"; do
        log "检查服务: $service"
        local retries=0
        
        while [ $retries -lt $max_retries ]; do
            if docker compose -f "$DEPLOY_DIR/$COMPOSE_FILE" ps "$service" | grep -q "healthy"; then
                success "$service 服务健康"
                break
            else
                retries=$((retries + 1))
                if [ $retries -eq $max_retries ]; then
                    error "$service 服务不健康"
                    return 1
                fi
                sleep $retry_interval
            fi
        done
    done
    
    # 检查 HTTP 端点
    log "检查 HTTP 端点..."
    local http_retries=0
    while [ $http_retries -lt 10 ]; do
        if curl -sf http://localhost/health > /dev/null; then
            success "HTTP 健康检查通过"
            return 0
        else
            http_retries=$((http_retries + 1))
            sleep 2
        fi
    done
    
    error "HTTP 健康检查失败"
    return 1
}

# 清理资源
cleanup() {
    log "清理未使用的资源..."
    
    # 清理未使用的镜像
    docker image prune -f
    
    # 清理未使用的容器
    docker container prune -f
    
    # 清理未使用的网络
    docker network prune -f
    
    # 清理未使用的卷（谨慎使用）
    # docker volume prune -f
    
    success "资源清理完成"
}

# 回滚到上一个版本
rollback() {
    error "部署失败，开始回滚..."
    
    # 查找最新的备份
    local latest_backup=$(ls -1t "$BACKUP_DIR" | head -n 1)
    if [ -z "$latest_backup" ]; then
        error "没有找到可用的备份"
        return 1
    fi
    
    log "回滚到备份: $latest_backup"
    
    # 停止当前服务
    stop_services
    
    # 恢复配置文件
    cp "$BACKUP_DIR/$latest_backup/$ENV_FILE" "$DEPLOY_DIR/" 2>/dev/null || true
    cp "$BACKUP_DIR/$latest_backup/$COMPOSE_FILE" "$DEPLOY_DIR/" 2>/dev/null || true
    
    # 启动服务
    start_services
    
    # 健康检查
    if health_check; then
        success "回滚成功"
        return 0
    else
        error "回滚失败"
        return 1
    fi
}

# 显示部署信息
show_deployment_info() {
    log "部署信息:"
    echo "----------------------------------------"
    echo "部署时间: $(date)"
    echo "部署版本: ${DEPLOY_VERSION:-unknown}"
    echo "部署用户: ${USER}"
    echo "----------------------------------------"
    
    log "运行中的服务:"
    docker compose -f "$DEPLOY_DIR/$COMPOSE_FILE" ps
}

# 主部署流程
main() {
    log "开始部署 AI Project..."
    
    # 检查依赖
    if ! check_dependencies; then
        error "依赖检查失败"
        exit 1
    fi
    
    # 创建备份
    if ! create_backup; then
        error "备份创建失败"
        exit 1
    fi
    
    # 拉取镜像
    if ! pull_images; then
        error "镜像拉取失败"
        rollback
        exit 1
    fi
    
    # 停止旧服务
    stop_services
    
    # 启动新服务
    if ! start_services; then
        error "服务启动失败"
        rollback
        exit 1
    fi
    
    # 健康检查
    if ! health_check; then
        error "健康检查失败"
        rollback
        exit 1
    fi
    
    # 清理资源
    cleanup
    
    # 显示部署信息
    show_deployment_info
    
    success "部署完成！"
}

# 处理命令行参数
case "${1:-deploy}" in
    deploy)
        main
        ;;
    rollback)
        rollback
        ;;
    backup)
        create_backup
        ;;
    health)
        health_check
        ;;
    cleanup)
        cleanup
        ;;
    info)
        show_deployment_info
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|backup|health|cleanup|info}"
        exit 1
        ;;
esac
