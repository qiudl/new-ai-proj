#!/bin/bash

# GitHub源码同步管理方案 - 服务器部署脚本
# 用于将代码部署到腾讯云Ubuntu服务器 (152.136.104.251)
# 作者: johnqiu
# 版本: v1.0

set -e  # 任何命令失败时退出

# 配置变量
SERVER_HOST="${SERVER_HOST:-152.136.104.251}"
SERVER_USER="${SERVER_USER:-ubuntu}"
SERVER_PORT="${SERVER_PORT:-22}"
DEPLOY_PATH="${DEPLOY_PATH:-/home/ubuntu/new-ai-proj}"
BACKUP_PATH="${BACKUP_PATH:-/home/ubuntu/backups}"
GITHUB_REPO="${GITHUB_REPO:-git@github.com:qiudl/new-ai-proj.git}"
BRANCH="${BRANCH:-main}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# 检查必要的工具
check_dependencies() {
    log_info "检查部署依赖..."
    
    if ! command -v ssh &> /dev/null; then
        log_error "SSH 未安装或不在PATH中"
        exit 1
    fi
    
    if ! command -v rsync &> /dev/null; then
        log_error "rsync 未安装或不在PATH中"
        exit 1
    fi
    
    if ! command -v git &> /dev/null; then
        log_error "Git 未安装或不在PATH中"
        exit 1
    fi
    
    log_success "依赖检查通过"
}

# 检查服务器连接
check_server_connection() {
    log_info "检查服务器连接..."
    
    if ssh -o ConnectTimeout=10 -o BatchMode=yes ${SERVER_USER}@${SERVER_HOST} -p ${SERVER_PORT} 'echo "连接成功"' &> /dev/null; then
        log_success "服务器连接正常"
    else
        log_error "无法连接到服务器 ${SERVER_USER}@${SERVER_HOST}:${SERVER_PORT}"
        log_error "请检查:"
        log_error "1. 服务器IP地址和端口"
        log_error "2. SSH密钥配置"
        log_error "3. 网络连接"
        exit 1
    fi
}

# 创建备份
create_backup() {
    log_info "创建部署前备份..."
    
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    BACKUP_NAME="backup_${TIMESTAMP}"
    
    ssh ${SERVER_USER}@${SERVER_HOST} -p ${SERVER_PORT} << EOF
        set -e
        
        # 创建备份目录
        mkdir -p ${BACKUP_PATH}
        
        # 如果项目目录存在，创建备份
        if [ -d "${DEPLOY_PATH}" ]; then
            echo "备份现有部署到 ${BACKUP_PATH}/${BACKUP_NAME}..."
            cp -r ${DEPLOY_PATH} ${BACKUP_PATH}/${BACKUP_NAME}
            echo "备份创建成功: ${BACKUP_PATH}/${BACKUP_NAME}"
        else
            echo "项目目录不存在，跳过备份"
        fi
        
        # 清理旧备份（保留最近5个）
        cd ${BACKUP_PATH}
        ls -1t backup_* 2>/dev/null | tail -n +6 | xargs rm -rf 2>/dev/null || true
        echo "旧备份清理完成"
EOF
    
    log_success "备份创建完成"
}

# 部署代码
deploy_code() {
    log_info "开始部署代码..."
    
    ssh ${SERVER_USER}@${SERVER_HOST} -p ${SERVER_PORT} << EOF
        set -e
        
        # 创建项目目录
        mkdir -p ${DEPLOY_PATH}
        cd \$(dirname ${DEPLOY_PATH})
        
        # 如果项目目录不存在或不是Git仓库，克隆仓库
        if [ ! -d "${DEPLOY_PATH}/.git" ]; then
            echo "克隆仓库..."
            rm -rf ${DEPLOY_PATH}
            git clone ${GITHUB_REPO} \$(basename ${DEPLOY_PATH})
        fi
        
        # 进入项目目录
        cd ${DEPLOY_PATH}
        
        # 获取最新代码
        echo "获取最新代码..."
        git fetch origin
        git checkout ${BRANCH}
        git pull origin ${BRANCH}
        
        # 显示当前版本信息
        echo "部署版本信息:"
        git log -1 --oneline
        
        echo "代码部署完成"
EOF
    
    log_success "代码部署成功"
}

# 安装依赖和启动服务
setup_and_start_services() {
    log_info "配置服务器环境..."
    
    ssh ${SERVER_USER}@${SERVER_HOST} -p ${SERVER_PORT} << 'EOF'
        set -e
        cd /home/ubuntu/new-ai-proj
        
        # 检查Docker是否安装
        if ! command -v docker &> /dev/null; then
            echo "安装Docker..."
            curl -fsSL https://get.docker.com -o get-docker.sh
            sudo sh get-docker.sh
            sudo usermod -aG docker ubuntu
            echo "Docker安装完成，请重新登录以使用Docker"
        fi
        
        # 检查Docker Compose是否安装
        if ! command -v docker-compose &> /dev/null; then
            echo "安装Docker Compose..."
            sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
            sudo chmod +x /usr/local/bin/docker-compose
        fi
        
        # 停止现有服务
        echo "停止现有服务..."
        docker-compose -f docker-compose.dev.yml down || true
        
        # 启动服务
        echo "启动服务..."
        docker-compose -f docker-compose.dev.yml up -d
        
        # 等待服务启动
        echo "等待服务启动..."
        sleep 10
        
        # 健康检查
        echo "执行健康检查..."
        if curl -f http://localhost:8080/health; then
            echo "后端服务健康检查通过"
        else
            echo "后端服务健康检查失败"
        fi
        
        if curl -f http://localhost:3000; then
            echo "前端服务健康检查通过"
        else
            echo "前端服务健康检查失败"
        fi
        
        echo "服务配置完成"
EOF
    
    log_success "服务配置完成"
}

# 部署后验证
post_deploy_verification() {
    log_info "执行部署后验证..."
    
    ssh ${SERVER_USER}@${SERVER_HOST} -p ${SERVER_PORT} << 'EOF'
        set -e
        cd /home/ubuntu/new-ai-proj
        
        echo "=== 服务状态检查 ==="
        docker-compose -f docker-compose.dev.yml ps
        
        echo -e "\n=== 日志检查 ==="
        docker-compose -f docker-compose.dev.yml logs --tail=20
        
        echo -e "\n=== 端口监听检查 ==="
        netstat -tlnp | grep -E ":(8080|3000|5432|6379)" || true
        
        echo -e "\n=== 磁盘空间检查 ==="
        df -h
        
        echo -e "\n=== 内存使用检查 ==="
        free -h
        
        echo "部署验证完成"
EOF
    
    log_success "部署验证通过"
}

# 显示部署信息
show_deployment_info() {
    log_success "部署完成！"
    echo ""
    echo "=== 部署信息 ==="
    echo "服务器: ${SERVER_HOST}"
    echo "用户: ${SERVER_USER}"
    echo "部署路径: ${DEPLOY_PATH}"
    echo "分支: ${BRANCH}"
    echo ""
    echo "=== 服务访问地址 ==="
    echo "前端: http://${SERVER_HOST}:3000"
    echo "后端API: http://${SERVER_HOST}:8080"
    echo "健康检查: http://${SERVER_HOST}:8080/health"
    echo ""
    echo "=== 管理命令 ==="
    echo "SSH登录: ssh ${SERVER_USER}@${SERVER_HOST} -p ${SERVER_PORT}"
    echo "查看日志: ssh ${SERVER_USER}@${SERVER_HOST} 'cd ${DEPLOY_PATH} && docker-compose -f docker-compose.dev.yml logs'"
    echo "重启服务: ssh ${SERVER_USER}@${SERVER_HOST} 'cd ${DEPLOY_PATH} && docker-compose -f docker-compose.dev.yml restart'"
    echo ""
}

# 错误处理和回滚
rollback() {
    log_error "部署失败，尝试回滚..."
    
    ssh ${SERVER_USER}@${SERVER_HOST} -p ${SERVER_PORT} << EOF
        set -e
        
        # 查找最新的备份
        LATEST_BACKUP=\$(ls -1t ${BACKUP_PATH}/backup_* 2>/dev/null | head -1)
        
        if [ -n "\$LATEST_BACKUP" ]; then
            echo "回滚到备份: \$LATEST_BACKUP"
            rm -rf ${DEPLOY_PATH}
            cp -r \$LATEST_BACKUP ${DEPLOY_PATH}
            
            cd ${DEPLOY_PATH}
            docker-compose -f docker-compose.dev.yml down || true
            docker-compose -f docker-compose.dev.yml up -d
            
            echo "回滚完成"
        else
            echo "未找到备份，无法回滚"
        fi
EOF
}

# 主函数
main() {
    echo "=== GitHub源码同步管理方案 - 服务器部署 ==="
    echo "目标服务器: ${SERVER_HOST}"
    echo "部署分支: ${BRANCH}"
    echo ""
    
    # 捕获错误并回滚
    trap 'rollback' ERR
    
    check_dependencies
    check_server_connection
    create_backup
    deploy_code
    setup_and_start_services
    post_deploy_verification
    show_deployment_info
    
    log_success "部署流程全部完成！"
}

# 参数处理
while [[ $# -gt 0 ]]; do
    case $1 in
        --server)
            SERVER_HOST="$2"
            shift 2
            ;;
        --user)
            SERVER_USER="$2"
            shift 2
            ;;
        --branch)
            BRANCH="$2"
            shift 2
            ;;
        --help)
            echo "用法: $0 [选项]"
            echo ""
            echo "选项:"
            echo "  --server HOST    服务器地址 (默认: 152.136.104.251)"
            echo "  --user USER      SSH用户名 (默认: ubuntu)"
            echo "  --branch BRANCH  部署分支 (默认: main)"
            echo "  --help           显示帮助信息"
            echo ""
            echo "环境变量:"
            echo "  SERVER_HOST      服务器地址"
            echo "  SERVER_USER      SSH用户名"
            echo "  SERVER_PORT      SSH端口 (默认: 22)"
            echo "  DEPLOY_PATH      部署路径 (默认: /home/ubuntu/new-ai-proj)"
            echo "  BACKUP_PATH      备份路径 (默认: /home/ubuntu/backups)"
            echo "  GITHUB_REPO      GitHub仓库地址"
            echo "  BRANCH           部署分支"
            echo ""
            echo "示例:"
            echo "  $0                           # 使用默认配置部署"
            echo "  $0 --branch develop          # 部署develop分支"
            echo "  $0 --server 192.168.1.100    # 部署到指定服务器"
            exit 0
            ;;
        *)
            log_error "未知参数: $1"
            echo "使用 --help 查看帮助信息"
            exit 1
            ;;
    esac
done

# 执行主函数
main