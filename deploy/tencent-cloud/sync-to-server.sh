#!/bin/bash

# AI项目管理系统 - 本地到腾讯云服务器同步脚本
# 使用rsync进行增量同步

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# 配置变量
SERVER_IP="${SERVER_IP:-your-server-ip}"
SERVER_USER="${SERVER_USER:-ubuntu}"
REMOTE_PATH="${REMOTE_PATH:-/opt/ai-project}"
LOCAL_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_rsa}"

# 检查配置
check_config() {
    log "检查同步配置..."
    
    if [ "$SERVER_IP" = "your-server-ip" ]; then
        error "请设置服务器IP地址: export SERVER_IP=your-server-ip"
    fi
    
    if [ ! -f "$SSH_KEY" ]; then
        error "SSH密钥不存在: $SSH_KEY"
    fi
    
    if [ ! -f "$LOCAL_PATH/.syncignore" ]; then
        error "同步排除文件不存在: $LOCAL_PATH/.syncignore"
    fi
    
    log "配置检查通过"
}

# 测试SSH连接
test_ssh() {
    log "测试SSH连接..."
    
    if ! ssh -i "$SSH_KEY" -o ConnectTimeout=10 -o BatchMode=yes \
        "$SERVER_USER@$SERVER_IP" "echo 'SSH连接测试成功'" 2>/dev/null; then
        error "SSH连接失败，请检查服务器IP、用户名和SSH密钥"
    fi
    
    log "SSH连接正常"
}

# 创建远程目录
prepare_remote() {
    log "准备远程目录..."
    
    ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" \
        "sudo mkdir -p $REMOTE_PATH && sudo chown -R $SERVER_USER:$SERVER_USER $REMOTE_PATH"
    
    log "远程目录准备完成"
}

# 同步文件
sync_files() {
    log "开始同步文件..."
    log "本地路径: $LOCAL_PATH"
    log "远程路径: $SERVER_USER@$SERVER_IP:$REMOTE_PATH"
    
    # 显示同步进度
    rsync -avz --delete --progress --stats \
        --exclude-from="$LOCAL_PATH/.syncignore" \
        -e "ssh -i $SSH_KEY" \
        "$LOCAL_PATH/" "$SERVER_USER@$SERVER_IP:$REMOTE_PATH/"
    
    if [ $? -eq 0 ]; then
        log "文件同步完成"
    else
        error "文件同步失败"
    fi
}

# 验证同步结果
verify_sync() {
    log "验证同步结果..."
    
    # 检查关键文件是否存在
    local key_files=(
        "backend/go.mod"
        "frontend/package.json" 
        "deploy/tencent-cloud/docker-compose.prod.yml"
    )
    
    for file in "${key_files[@]}"; do
        if ! ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" "[ -f $REMOTE_PATH/$file ]"; then
            warn "关键文件未找到: $file"
        else
            log "✓ $file 已同步"
        fi
    done
    
    # 检查目录大小
    local remote_size=$(ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" "du -sh $REMOTE_PATH" | cut -f1)
    log "远程目录大小: $remote_size"
}

# 设置远程文件权限
set_permissions() {
    log "设置远程文件权限..."
    
    ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" << 'EOF'
        cd /opt/ai-project
        
        # 设置脚本执行权限
        find . -name "*.sh" -type f -exec chmod +x {} \;
        
        # 设置配置文件权限
        find . -name ".env*" -type f -exec chmod 600 {} \;
        
        # 设置目录权限
        find . -type d -exec chmod 755 {} \;
        
        # 设置普通文件权限
        find . -type f -exec chmod 644 {} \;
        
        echo "权限设置完成"
EOF
    
    log "文件权限设置完成"
}

# 可选：远程构建
remote_build() {
    if [ "$1" = "--build" ] || [ "$1" = "-b" ]; then
        log "开始远程构建..."
        
        ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" << 'EOF'
            cd /opt/ai-project
            
            # 构建Go后端
            if [ -f "backend/go.mod" ]; then
                echo "构建Go后端..."
                cd backend
                go mod download
                go build -o ai-project-backend main.go
                cd ..
            fi
            
            # 构建React前端
            if [ -f "frontend/package.json" ]; then
                echo "构建React前端..."
                cd frontend
                npm install
                npm run build
                cd ..
            fi
            
            echo "构建完成"
EOF
        
        log "远程构建完成"
    fi
}

# 可选：远程部署
remote_deploy() {
    if [ "$1" = "--deploy" ] || [ "$1" = "-d" ]; then
        log "开始远程部署..."
        
        ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" << 'EOF'
            cd /opt/ai-project/deploy/tencent-cloud
            
            if [ -f "scripts/deploy.sh" ]; then
                sudo ./scripts/deploy.sh
            else
                echo "部署脚本不存在"
            fi
EOF
        
        log "远程部署完成"
    fi
}

# 显示帮助信息
show_help() {
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help     显示此帮助信息"
    echo "  -b, --build    同步后进行远程构建"
    echo "  -d, --deploy   同步后进行远程部署"
    echo "  --dry-run      只显示将要同步的文件，不实际执行"
    echo ""
    echo "环境变量:"
    echo "  SERVER_IP      服务器IP地址 (必需)"
    echo "  SERVER_USER    服务器用户名 (默认: ubuntu)"
    echo "  REMOTE_PATH    远程路径 (默认: /opt/ai-project)"
    echo "  SSH_KEY        SSH密钥路径 (默认: ~/.ssh/id_rsa)"
    echo ""
    echo "示例:"
    echo "  export SERVER_IP=123.456.789.0"
    echo "  $0 --build --deploy"
}

# 干运行模式
dry_run() {
    log "预览模式 - 显示将要同步的文件..."
    
    rsync -avz --delete --dry-run \
        --exclude-from="$LOCAL_PATH/.syncignore" \
        -e "ssh -i $SSH_KEY" \
        "$LOCAL_PATH/" "$SERVER_USER@$SERVER_IP:$REMOTE_PATH/"
}

# 主函数
main() {
    log "=== AI项目管理系统代码同步工具 ==="
    
    # 处理命令行参数
    case "${1:-}" in
        -h|--help)
            show_help
            exit 0
            ;;
        --dry-run)
            check_config
            test_ssh
            dry_run
            exit 0
            ;;
    esac
    
    # 执行同步流程
    check_config
    test_ssh
    prepare_remote
    sync_files
    verify_sync
    set_permissions
    
    # 处理可选操作
    remote_build "$1"
    remote_deploy "$1"
    
    log "=== 同步完成 ==="
    log "服务器地址: $SERVER_USER@$SERVER_IP"
    log "远程路径: $REMOTE_PATH"
    
    # 显示下一步操作建议
    echo ""
    echo "下一步操作:"
    echo "1. 登录服务器: ssh $SERVER_USER@$SERVER_IP"
    echo "2. 进入项目目录: cd $REMOTE_PATH"
    echo "3. 执行部署: sudo ./deploy/tencent-cloud/scripts/deploy.sh"
}

# 执行主函数
main "$@"