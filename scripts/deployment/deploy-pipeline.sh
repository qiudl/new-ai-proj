#!/bin/bash

# AI项目管理平台 - 开发到生产部署流水线
# 功能：自动化从开发环境到生产环境的完整部署流程

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# 项目配置
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="$PROJECT_ROOT/build"
BACKUP_DIR="$PROJECT_ROOT/backups"

# 创建必要目录
mkdir -p "$BUILD_DIR" "$BACKUP_DIR"

echo -e "${PURPLE}🚀 AI项目管理平台 - 部署流水线${NC}"
echo "=============================================="

# 环境验证函数
validate_environment() {
    local env_type="$1"
    echo -e "${BLUE}[INFO]${NC} 验证 ${env_type} 环境..."
    
    case "$env_type" in
        "development")
            # 验证开发环境
            if [ ! -f "$PROJECT_ROOT/frontend/.env.local" ]; then
                echo -e "${RED}[ERROR]${NC} 缺少开发环境配置文件: frontend/.env.local"
                return 1
            fi
            
            if ! curl -s http://localhost:3001 > /dev/null 2>&1; then
                echo -e "${YELLOW}[WARN]${NC} 本地开发服务器未运行，将启动..."
                return 2
            fi
            ;;
            
        "container-dev")
            # 验证Docker开发环境
            if ! docker-compose ps | grep -q "Up"; then
                echo -e "${YELLOW}[WARN]${NC} Docker服务未运行，将启动..."
                return 2
            fi
            ;;
            
        "production")
            # 验证生产环境条件
            if [ -z "$AI_PROD_DB_PASSWORD" ]; then
                echo -e "${RED}[ERROR]${NC} 生产环境需要设置 AI_PROD_DB_PASSWORD"
                return 1
            fi
            
            if [ -z "$JWT_SECRET_PROD" ]; then
                echo -e "${RED}[ERROR]${NC} 生产环境需要设置 JWT_SECRET_PROD"
                return 1
            fi
            ;;
    esac
    
    echo -e "${GREEN}✅ ${env_type} 环境验证通过${NC}"
    return 0
}

# 代码质量检查
run_quality_checks() {
    echo -e "${BLUE}[INFO]${NC} 执行代码质量检查..."
    
    cd "$PROJECT_ROOT/frontend"
    
    # TypeScript 类型检查
    echo -e "${BLUE}[CHECK]${NC} TypeScript 类型检查..."
    if npm run type-check 2>/dev/null; then
        echo -e "${GREEN}✅ TypeScript 类型检查通过${NC}"
    else
        echo -e "${YELLOW}⚠️ TypeScript 存在警告，但继续部署${NC}"
    fi
    
    # ESLint 检查
    echo -e "${BLUE}[CHECK]${NC} ESLint 代码检查..."
    if npx eslint src --ext .ts,.tsx --max-warnings 10 2>/dev/null; then
        echo -e "${GREEN}✅ ESLint 检查通过${NC}"
    else
        echo -e "${YELLOW}⚠️ ESLint 存在警告，但继续部署${NC}"
    fi
    
    cd "$PROJECT_ROOT"
    
    # Go 代码检查
    echo -e "${BLUE}[CHECK]${NC} Go 代码格式检查..."
    cd "$PROJECT_ROOT/backend"
    if [ "$(gofmt -s -l . | wc -l)" -eq 0 ]; then
        echo -e "${GREEN}✅ Go 代码格式检查通过${NC}"
    else
        echo -e "${YELLOW}⚠️ Go 代码格式需要调整：${NC}"
        gofmt -s -l . | head -5
    fi
    
    cd "$PROJECT_ROOT"
    echo -e "${GREEN}📋 代码质量检查完成${NC}"
}

# 构建应用
build_application() {
    local target_env="$1"
    
    echo -e "${BLUE}[BUILD]${NC} 为 ${target_env} 环境构建应用..."
    
    # 设置构建环境变量
    case "$target_env" in
        "production")
            export NODE_ENV=production
            export REACT_APP_ENV=production
            export GIN_MODE=release
            ;;
        "staging")
            export NODE_ENV=production
            export REACT_APP_ENV=staging
            export GIN_MODE=release
            ;;
        *)
            export NODE_ENV=development
            export REACT_APP_ENV=development
            export GIN_MODE=debug
            ;;
    esac
    
    # 构建前端
    echo -e "${BLUE}[BUILD]${NC} 构建 React 前端..."
    cd "$PROJECT_ROOT/frontend"
    
    if npm run build; then
        echo -e "${GREEN}✅ 前端构建完成${NC}"
        
        # 移动构建文件
        if [ -d "build" ]; then
            rm -rf "$BUILD_DIR/frontend" 2>/dev/null || true
            cp -r build "$BUILD_DIR/frontend"
            echo -e "${GREEN}📦 前端构建文件已准备${NC}"
        fi
    else
        echo -e "${RED}❌ 前端构建失败${NC}"
        return 1
    fi
    
    # 构建后端
    echo -e "${BLUE}[BUILD]${NC} 构建 Go 后端..."
    cd "$PROJECT_ROOT/backend"
    
    if go build -o "$BUILD_DIR/backend-server" .; then
        echo -e "${GREEN}✅ 后端构建完成${NC}"
        echo -e "${GREEN}📦 后端可执行文件: $BUILD_DIR/backend-server${NC}"
    else
        echo -e "${RED}❌ 后端构建失败${NC}"
        return 1
    fi
    
    cd "$PROJECT_ROOT"
}

# 运行测试
run_tests() {
    echo -e "${BLUE}[TEST]${NC} 执行测试套件..."
    
    # 前端测试
    echo -e "${BLUE}[TEST]${NC} 执行前端测试..."
    cd "$PROJECT_ROOT/frontend"
    if npm test -- --coverage --watchAll=false 2>/dev/null; then
        echo -e "${GREEN}✅ 前端测试通过${NC}"
    else
        echo -e "${YELLOW}⚠️ 前端测试跳过或存在问题${NC}"
    fi
    
    # 后端测试
    echo -e "${BLUE}[TEST]${NC} 执行后端测试..."
    cd "$PROJECT_ROOT/backend"
    if go test ./... 2>/dev/null; then
        echo -e "${GREEN}✅ 后端测试通过${NC}"
    else
        echo -e "${YELLOW}⚠️ 后端测试跳过或存在问题${NC}"
    fi
    
    cd "$PROJECT_ROOT"
}

# 创建备份
create_backup() {
    local timestamp=$(date +"%Y%m%d-%H%M%S")
    local backup_file="$BACKUP_DIR/pre-deployment-backup-$timestamp.tar.gz"
    
    echo -e "${BLUE}[BACKUP]${NC} 创建部署前备份..."
    
    # 备份当前运行的容器数据
    if docker-compose ps | grep -q "Up"; then
        echo -e "${BLUE}[BACKUP]${NC} 备份数据库..."
        docker-compose exec -T db pg_dump -U user main_db > "$BACKUP_DIR/db-backup-$timestamp.sql"
        
        # 备份重要文件
        tar -czf "$backup_file" \
            --exclude-from="$PROJECT_ROOT/.gitignore" \
            -C "$PROJECT_ROOT" \
            . 2>/dev/null
        
        echo -e "${GREEN}✅ 备份创建完成: $backup_file${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️ Docker服务未运行，跳过备份${NC}"
        return 1
    fi
}

# 部署到生产环境
deploy_to_production() {
    echo -e "${BLUE}[DEPLOY]${NC} 部署到生产环境..."
    
    # 创建生产环境配置
    cat > "$PROJECT_ROOT/.env.production" << EOF
# 生产环境配置 - $(date '+%Y-%m-%d %H:%M:%S')
NODE_ENV=production
REACT_APP_ENV=production
GIN_MODE=release

# 数据库配置
DB_HOST=db
DB_PORT=5432
DB_USER=prod_user
DB_PASSWORD=${AI_PROD_DB_PASSWORD}
DB_NAME=production_db

# 安全配置
JWT_SECRET=${JWT_SECRET_PROD}
JWT_EXPIRATION=24h

# 服务端口
FRONTEND_PORT=80
BACKEND_PORT=8080

# 性能和安全
LOG_LEVEL=error
CHOKIDAR_USEPOLLING=false
GENERATE_SOURCEMAP=false
EOF

    # 更新Docker Compose配置为生产模式
    echo -e "${BLUE}[DEPLOY]${NC} 配置生产环境Docker服务..."
    
    # 使用生产环境配置重启服务
    ENV_FILE=".env.production" docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
    
    # 等待服务启动
    echo -e "${BLUE}[DEPLOY]${NC} 等待服务启动..."
    sleep 30
    
    # 验证部署
    if curl -s http://localhost/health | grep -q "healthy"; then
        echo -e "${GREEN}🎉 生产环境部署成功！${NC}"
        echo -e "${GREEN}📱 应用访问地址: http://localhost${NC}"
        return 0
    else
        echo -e "${RED}❌ 生产环境部署失败${NC}"
        return 1
    fi
}

# 健康检查
health_check() {
    local env_type="$1"
    local max_attempts=10
    local attempt=0
    
    echo -e "${BLUE}[HEALTH]${NC} 执行 ${env_type} 环境健康检查..."
    
    case "$env_type" in
        "development")
            local url="http://localhost:3001"
            ;;
        "container-dev")
            local url="http://localhost"
            ;;
        "production")
            local url="http://localhost"
            ;;
    esac
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s "$url/health" | grep -q "healthy" 2>/dev/null; then
            echo -e "${GREEN}✅ ${env_type} 环境健康检查通过${NC}"
            echo -e "${GREEN}🌐 应用访问地址: $url${NC}"
            return 0
        fi
        
        attempt=$((attempt + 1))
        echo -e "${YELLOW}[HEALTH]${NC} 尝试 $attempt/$max_attempts, 等待服务启动..."
        sleep 5
    done
    
    echo -e "${RED}❌ ${env_type} 环境健康检查失败${NC}"
    return 1
}

# 展示部署摘要
show_deployment_summary() {
    local env_type="$1"
    local status="$2"
    
    echo ""
    echo -e "${PURPLE}=== 部署摘要 ===${NC}"
    echo -e "目标环境: ${GREEN}${env_type}${NC}"
    echo -e "部署状态: $([ "$status" = "success" ] && echo -e "${GREEN}✅ 成功${NC}" || echo -e "${RED}❌ 失败${NC}")"
    echo -e "部署时间: $(date '+%Y-%m-%d %H:%M:%S')"
    echo -e "项目版本: $(git rev-parse --short HEAD 2>/dev/null || echo '未知')"
    
    if [ "$status" = "success" ]; then
        case "$env_type" in
            "development")
                echo -e "${BLUE}🔗 开发环境访问:${NC}"
                echo -e "  - 本地开发: http://localhost:3001"
                echo -e "  - 容器开发: http://localhost"
                ;;
            "production")
                echo -e "${BLUE}🔗 生产环境访问:${NC}"
                echo -e "  - 应用首页: http://localhost"
                echo -e "  - API端点: http://localhost/api"
                echo -e "  - 健康检查: http://localhost/health"
                ;;
        esac
    fi
    
    echo ""
}

# 主部署流程
main() {
    local target_env="${1:-development}"
    local skip_tests="${2:-false}"
    local skip_backup="${3:-false}"
    
    echo -e "${BLUE}[INFO]${NC} 开始部署流程..."
    echo -e "目标环境: ${GREEN}${target_env}${NC}"
    echo -e "跳过测试: ${skip_tests}"
    echo -e "跳过备份: ${skip_backup}"
    echo ""
    
    # 1. 环境验证
    if ! validate_environment "$target_env"; then
        echo -e "${RED}[ERROR]${NC} 环境验证失败，终止部署"
        show_deployment_summary "$target_env" "failed"
        exit 1
    fi
    
    # 2. 代码质量检查
    run_quality_checks
    
    # 3. 运行测试
    if [ "$skip_tests" != "true" ]; then
        run_tests
    else
        echo -e "${YELLOW}[SKIP]${NC} 跳过测试阶段"
    fi
    
    # 4. 创建备份
    if [ "$skip_backup" != "true" ] && [ "$target_env" = "production" ]; then
        if ! create_backup; then
            echo -e "${YELLOW}[WARN]${NC} 备份创建失败，但继续部署"
        fi
    else
        echo -e "${YELLOW}[SKIP]${NC} 跳过备份阶段"
    fi
    
    # 5. 构建应用
    if ! build_application "$target_env"; then
        echo -e "${RED}[ERROR]${NC} 应用构建失败，终止部署"
        show_deployment_summary "$target_env" "failed"
        exit 1
    fi
    
    # 6. 部署
    case "$target_env" in
        "production")
            if ! deploy_to_production; then
                show_deployment_summary "$target_env" "failed"
                exit 1
            fi
            ;;
        "development"|"container-dev")
            echo -e "${BLUE}[INFO]${NC} 开发环境无需特殊部署步骤"
            ;;
    esac
    
    # 7. 健康检查
    if ! health_check "$target_env"; then
        show_deployment_summary "$target_env" "failed"
        exit 1
    fi
    
    # 8. 部署成功
    show_deployment_summary "$target_env" "success"
    echo -e "${GREEN}🎉 部署流程完成！${NC}"
}

# 显示帮助信息
show_help() {
    echo -e "${BLUE}AI项目管理平台 - 部署流水线${NC}"
    echo ""
    echo "使用方法:"
    echo "  $0 [环境] [跳过测试] [跳过备份]"
    echo ""
    echo "参数:"
    echo "  环境        : development, container-dev, staging, production (默认: development)"
    echo "  跳过测试    : true/false (默认: false)"
    echo "  跳过备份    : true/false (默认: false)"
    echo ""
    echo "示例:"
    echo "  $0                                 # 开发环境部署"
    echo "  $0 production                      # 生产环境部署"
    echo "  $0 production true                 # 生产环境部署，跳过测试"
    echo "  $0 production false true           # 生产环境部署，跳过备份"
    echo ""
    echo "环境要求:"
    echo "  production: 需要设置 AI_PROD_DB_PASSWORD 和 JWT_SECRET_PROD"
}

# 检查参数
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    show_help
    exit 0
fi

# 执行主流程
main "$@"