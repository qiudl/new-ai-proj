#!/bin/bash

# AI项目管理平台 - 腾讯云生产环境部署脚本
# 服务器: 152.136.104.251

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
CLOUD_SERVER="152.136.104.251"
DEPLOY_USER="ubuntu"  # 或者 root，根据你的服务器配置
DEPLOY_PATH="/opt/ai-project"
PROJECT_NAME="ai-project"
BACKUP_DIR="/opt/backups"

echo -e "${BLUE}🚀 AI项目管理平台 - 腾讯云部署脚本${NC}"
echo "=========================================="

# 检查本地环境
check_local_environment() {
    echo -e "${BLUE}[INFO]${NC} 检查本地部署环境..."
    
    # 检查必要工具
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}[ERROR]${NC} Docker未安装或未在PATH中"
        return 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}[ERROR]${NC} Docker Compose未安装"
        return 1
    fi
    
    if ! command -v ssh &> /dev/null; then
        echo -e "${RED}[ERROR]${NC} SSH客户端未安装"
        return 1
    fi
    
    echo -e "${GREEN}✅ 本地环境检查通过${NC}"
}

# 检查云服务器连接
check_cloud_connection() {
    echo -e "${BLUE}[INFO]${NC} 测试云服务器连接..."
    
    if ssh -o ConnectTimeout=10 "${DEPLOY_USER}@${CLOUD_SERVER}" "echo '连接成功'" &> /dev/null; then
        echo -e "${GREEN}✅ 云服务器连接正常${NC}"
        return 0
    else
        echo -e "${RED}[ERROR]${NC} 无法连接到云服务器 ${CLOUD_SERVER}"
        echo -e "${YELLOW}[提示]${NC} 请确认："
        echo "  1. 服务器IP地址正确: ${CLOUD_SERVER}"
        echo "  2. SSH密钥已配置"
        echo "  3. 防火墙端口22已开放"
        echo "  4. 用户名正确: ${DEPLOY_USER}"
        return 1
    fi
}

# 准备云服务器环境
prepare_cloud_environment() {
    echo -e "${BLUE}[INFO]${NC} 准备云服务器环境..."
    
    ssh "${DEPLOY_USER}@${CLOUD_SERVER}" "bash -s" << 'REMOTE_SCRIPT'
        # 更新系统
        sudo apt update && sudo apt upgrade -y
        
        # 安装Docker
        if ! command -v docker &> /dev/null; then
            curl -fsSL https://get.docker.com -o get-docker.sh
            sudo sh get-docker.sh
            sudo usermod -aG docker $USER
        fi
        
        # 安装Docker Compose
        if ! command -v docker-compose &> /dev/null; then
            sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
            sudo chmod +x /usr/local/bin/docker-compose
        fi
        
        # 创建项目目录
        sudo mkdir -p /opt/ai-project
        sudo mkdir -p /opt/backups
        sudo mkdir -p /var/log/ai-project
        
        # 设置目录权限
        sudo chown -R $USER:$USER /opt/ai-project
        sudo chown -R $USER:$USER /opt/backups
        
        # 安装其他必要工具
        sudo apt install -y curl wget git vim htop nginx
        
        echo "✅ 云服务器环境准备完成"
REMOTE_SCRIPT
    
    echo -e "${GREEN}✅ 云服务器环境已准备就绪${NC}"
}

# 构建并推送镜像
build_and_push() {
    echo -e "${BLUE}[INFO]${NC} 构建生产环境镜像..."
    
    # 构建前端生产镜像
    echo -e "${BLUE}[BUILD]${NC} 构建前端镜像..."
    docker build -t ai-project-frontend:latest -f deploy/cloud-production/dockerfiles/Dockerfile.frontend .
    
    # 构建后端生产镜像
    echo -e "${BLUE}[BUILD]${NC} 构建后端镜像..."
    docker build -t ai-project-backend:latest -f deploy/cloud-production/dockerfiles/Dockerfile.backend .
    
    # 保存镜像为tar文件
    echo -e "${BLUE}[EXPORT]${NC} 导出镜像文件..."
    docker save ai-project-frontend:latest ai-project-backend:latest > ai-project-images.tar
    
    echo -e "${GREEN}✅ 镜像构建和导出完成${NC}"
}

# 上传文件到云服务器
upload_to_cloud() {
    echo -e "${BLUE}[INFO]${NC} 上传文件到云服务器..."
    
    # 上传镜像文件
    echo -e "${BLUE}[UPLOAD]${NC} 上传Docker镜像..."
    scp ai-project-images.tar "${DEPLOY_USER}@${CLOUD_SERVER}:${DEPLOY_PATH}/"
    
    # 上传配置文件
    echo -e "${BLUE}[UPLOAD]${NC} 上传配置文件..."
    scp -r deploy/cloud-production/* "${DEPLOY_USER}@${CLOUD_SERVER}:${DEPLOY_PATH}/"
    
    # 上传部署脚本
    scp deploy/cloud-production/scripts/* "${DEPLOY_USER}@${CLOUD_SERVER}:${DEPLOY_PATH}/scripts/"
    
    echo -e "${GREEN}✅ 文件上传完成${NC}"
}

# 在云服务器上部署
deploy_on_cloud() {
    echo -e "${BLUE}[INFO]${NC} 在云服务器上执行部署..."
    
    ssh "${DEPLOY_USER}@${CLOUD_SERVER}" "cd ${DEPLOY_PATH} && bash -s" << 'REMOTE_DEPLOY'
        echo "🚀 开始云服务器部署..."
        
        # 加载镜像
        echo "📦 加载Docker镜像..."
        docker load < ai-project-images.tar
        
        # 设置环境变量
        if [ ! -f ".env.production" ]; then
            echo "❌ 缺少 .env.production 文件，请先配置环境变量"
            exit 1
        fi
        
        # 创建必要目录
        mkdir -p ssl logs/nginx uploads backups
        
        # 停止现有服务（如果存在）
        if [ -f "docker-compose.prod.yml" ]; then
            echo "⏹️  停止现有服务..."
            docker-compose -f docker-compose.prod.yml down --remove-orphans || true
        fi
        
        # 启动生产服务
        echo "🎬 启动生产环境服务..."
        docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
        
        # 等待服务启动
        echo "⏳ 等待服务启动..."
        sleep 30
        
        # 检查服务状态
        if curl -f -s http://localhost/health > /dev/null; then
            echo "✅ 部署成功！服务运行正常"
        else
            echo "❌ 部署失败，服务未正常启动"
            docker-compose -f docker-compose.prod.yml logs --tail=50
            exit 1
        fi
        
        echo "🎉 云端部署完成！"
REMOTE_DEPLOY
    
    echo -e "${GREEN}✅ 云服务器部署完成${NC}"
}

# 部署后验证
verify_deployment() {
    echo -e "${BLUE}[INFO]${NC} 验证部署结果..."
    
    # 检查服务状态
    if ssh "${DEPLOY_USER}@${CLOUD_SERVER}" "curl -f -s http://localhost/health" > /dev/null; then
        echo -e "${GREEN}✅ 服务健康检查通过${NC}"
    else
        echo -e "${RED}❌ 服务健康检查失败${NC}"
        return 1
    fi
    
    # 显示服务信息
    echo -e "${BLUE}=== 部署信息 ===${NC}"
    echo -e "服务器IP: ${GREEN}${CLOUD_SERVER}${NC}"
    echo -e "应用访问地址: ${GREEN}http://${CLOUD_SERVER}${NC}"
    echo -e "API访问地址: ${GREEN}http://${CLOUD_SERVER}/api${NC}"
    echo -e "健康检查: ${GREEN}http://${CLOUD_SERVER}/health${NC}"
    echo ""
    echo -e "${YELLOW}[注意]${NC} 生产环境建议配置域名和SSL证书"
}

# 清理本地文件
cleanup() {
    echo -e "${BLUE}[INFO]${NC} 清理临时文件..."
    rm -f ai-project-images.tar
    echo -e "${GREEN}✅ 清理完成${NC}"
}

# 显示帮助信息
show_help() {
    echo -e "${BLUE}AI项目管理平台 - 腾讯云部署工具${NC}"
    echo ""
    echo "使用方法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --prepare    仅准备云服务器环境"
    echo "  --build      仅构建镜像"
    echo "  --upload     仅上传文件"
    echo "  --deploy     仅在云端部署"
    echo "  --verify     仅验证部署"
    echo "  --help       显示此帮助信息"
    echo ""
    echo "完整部署: $0 (无参数)"
}

# 主函数
main() {
    case "${1:-full}" in
        "--prepare")
            check_local_environment
            check_cloud_connection
            prepare_cloud_environment
            ;;
        "--build")
            check_local_environment
            build_and_push
            ;;
        "--upload")
            build_and_push
            upload_to_cloud
            cleanup
            ;;
        "--deploy")
            check_cloud_connection
            deploy_on_cloud
            ;;
        "--verify")
            verify_deployment
            ;;
        "--help")
            show_help
            exit 0
            ;;
        "full")
            echo -e "${BLUE}[INFO]${NC} 执行完整部署流程..."
            check_local_environment
            check_cloud_connection
            prepare_cloud_environment
            build_and_push
            upload_to_cloud
            deploy_on_cloud
            verify_deployment
            cleanup
            ;;
        *)
            echo -e "${RED}[ERROR]${NC} 未知参数: $1"
            show_help
            exit 1
            ;;
    esac
    
    echo -e "${GREEN}🎉 操作完成！${NC}"
}

# 执行主函数
main "$@"