#!/bin/bash

# 快速部署脚本 - 从本地推送到服务器并部署
# 使用方法: ./quick-deploy.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
SERVER_HOST="proj-joyloding"
SERVER_USER="ubuntu"
PROJECT_DIR="/home/ubuntu/projects/new-ai-proj"
LOCAL_PROJECT_DIR="/Users/johnqiu/coding/www/projects/new-ai-proj"

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

# 检查是否在项目目录中
if [ ! -f "docker-compose.yml" ]; then
    print_error "请在项目根目录中运行此脚本"
    exit 1
fi

print_step "=== 快速部署到服务器 ==="
echo "服务器: $SERVER_HOST"
echo "项目目录: $PROJECT_DIR"
echo ""

# 1. 检查Git状态
print_step "1. 检查Git状态..."
if ! git diff --quiet; then
    print_warning "有未提交的更改，是否继续? (y/n)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        print_error "取消部署"
        exit 1
    fi
fi

# 2. 提交并推送代码
print_step "2. 提交并推送代码..."
COMMIT_MSG="deploy: $(date '+%Y-%m-%d %H:%M:%S')"
git add .
git commit -m "$COMMIT_MSG" || print_warning "没有新的更改需要提交"
git push origin main
print_status "代码推送完成"

# 3. 连接服务器并部署
print_step "3. 连接服务器并部署..."
ssh $SERVER_HOST << 'EOF'
    set -e
    
    # 颜色定义
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    RED='\033[0;31m'
    NC='\033[0m'
    
    print_status() {
        echo -e "${GREEN}[REMOTE]${NC} $1"
    }
    
    print_warning() {
        echo -e "${YELLOW}[REMOTE]${NC} $1"
    }
    
    print_error() {
        echo -e "${RED}[REMOTE]${NC} $1"
    }
    
    PROJECT_DIR="/home/ubuntu/projects/new-ai-proj"
    
    # 检查项目目录
    if [ ! -d "$PROJECT_DIR" ]; then
        print_error "项目目录不存在，请先运行 server-setup.sh"
        exit 1
    fi
    
    cd "$PROJECT_DIR"
    
    # 拉取最新代码
    print_status "拉取最新代码..."
    git pull origin main
    
    # 停止现有服务
    print_status "停止现有服务..."
    docker-compose down || true
    
    # 构建并启动服务
    print_status "构建并启动服务..."
    docker-compose up -d --build
    
    # 等待服务启动
    print_status "等待服务启动..."
    sleep 15
    
    # 检查服务状态
    print_status "检查服务状态..."
    docker-compose ps
    
    # 显示最新日志
    print_status "显示最新日志..."
    docker-compose logs --tail=20
    
    print_status "部署完成！"
EOF

print_step "4. 检查部署结果..."
echo ""
print_status "部署完成！"
print_status "服务访问地址:"
print_status "  前端: http://152.136.104.251:3000"
print_status "  后端API: http://152.136.104.251:8080"
print_status "  健康检查: http://152.136.104.251:8080/health"
echo ""
print_status "如需查看详细日志，请运行:"
print_status "  ssh $SERVER_HOST 'cd $PROJECT_DIR && docker-compose logs -f'"