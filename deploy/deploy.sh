#!/bin/bash

# 项目部署脚本 - 在服务器上运行
# 使用方法: ./deploy.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目配置
PROJECT_NAME="new-ai-proj"
PROJECT_DIR="/home/ubuntu/projects/$PROJECT_NAME"
GITHUB_REPO="git@github.com:qiudl/new-ai-proj.git"
BRANCH="main"

# 函数：打印带颜色的消息
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# 检查是否在正确的目录
if [ ! -d "$PROJECT_DIR" ]; then
    print_error "项目目录不存在: $PROJECT_DIR"
    print_error "请先运行 server-setup.sh 脚本"
    exit 1
fi

cd "$PROJECT_DIR"

print_step "=== 开始部署 AI项目管理平台 ==="
echo "项目目录: $PROJECT_DIR"
echo "分支: $BRANCH"
echo ""

# 1. 创建备份
print_step "1. 创建备份..."
BACKUP_DIR="$PROJECT_DIR/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# 备份当前代码
if [ -d ".git" ]; then
    git archive --format=tar.gz --prefix=code/ HEAD > "$BACKUP_DIR/code.tar.gz"
    print_status "代码备份完成"
fi

# 备份数据库（如果存在）
if docker-compose ps | grep -q postgres; then
    print_status "备份数据库..."
    docker-compose exec -T postgres pg_dump -U user main_db > "$BACKUP_DIR/database.sql"
    print_status "数据库备份完成"
fi

# 2. 停止现有服务
print_step "2. 停止现有服务..."
if docker-compose ps | grep -q Up; then
    docker-compose down
    print_status "服务已停止"
else
    print_status "没有运行中的服务"
fi

# 3. 更新代码
print_step "3. 更新代码..."
git fetch origin
git reset --hard origin/$BRANCH
git clean -fd
print_status "代码更新完成"

# 4. 检查环境文件
print_step "4. 检查环境配置..."
if [ ! -f .env.production ]; then
    print_warning "生产环境配置文件不存在，从示例文件复制..."
    cp .env.example .env.production
    print_warning "请编辑 .env.production 文件配置生产环境变量"
fi

# 5. 构建Docker镜像
print_step "5. 构建Docker镜像..."
docker-compose build --no-cache
print_status "Docker镜像构建完成"

# 6. 启动服务
print_step "6. 启动服务..."
docker-compose up -d
print_status "服务启动完成"

# 7. 等待服务启动
print_step "7. 等待服务启动..."
sleep 10

# 8. 检查服务状态
print_step "8. 检查服务状态..."
docker-compose ps

# 9. 检查服务健康状态
print_step "9. 检查服务健康状态..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f -s http://localhost:8080/health > /dev/null 2>&1; then
        print_status "后端服务健康检查通过"
        break
    else
        print_warning "等待后端服务启动... ($((RETRY_COUNT+1))/$MAX_RETRIES)"
        sleep 2
        RETRY_COUNT=$((RETRY_COUNT+1))
    fi
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    print_error "后端服务启动失败或健康检查超时"
    print_error "请检查服务日志: docker-compose logs backend"
fi

# 10. 显示日志
print_step "10. 显示服务日志..."
docker-compose logs --tail=50

# 11. 清理旧的Docker镜像
print_step "11. 清理旧的Docker镜像..."
docker image prune -f
print_status "Docker镜像清理完成"

# 12. 显示部署结果
print_step "=== 部署完成 ==="
echo ""
print_status "服务访问地址:"
print_status "  前端: http://152.136.104.251:3000"
print_status "  后端API: http://152.136.104.251:8080"
print_status "  健康检查: http://152.136.104.251:8080/health"
print_status "  API文档: http://152.136.104.251:8080/api/v1/docs"
echo ""
print_status "常用命令:"
print_status "  查看服务状态: docker-compose ps"
print_status "  查看日志: docker-compose logs -f [服务名]"
print_status "  重启服务: docker-compose restart [服务名]"
print_status "  停止服务: docker-compose down"
echo ""
print_status "备份位置: $BACKUP_DIR"