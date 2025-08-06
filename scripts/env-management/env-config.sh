#!/bin/bash

# AI项目管理平台 - 环境配置管理
# 位置：new-ai-proj/scripts/env-management/env-config.sh
# 作用：统一管理不同环境的配置参数

# 默认环境设置
DEFAULT_ENV="development"
CURRENT_ENV="${AI_PROJECT_ENV:-$DEFAULT_ENV}"

# 项目路径配置
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SCRIPTS_DIR="$PROJECT_ROOT/scripts/env-management"
LOGS_DIR="$PROJECT_ROOT/logs"

# 确保日志目录存在
mkdir -p "$LOGS_DIR"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 环境配置函数
load_env_config() {
    local env_name="$1"
    
    case "$env_name" in
        "development"|"dev")
            # 开发环境配置
            export AI_ENV="development"
            export AI_FRONTEND_PORT=3001
            export AI_BACKEND_PORT=8090
            export AI_DB_PORT=5432
            export AI_DB_NAME="main_db"
            export AI_DB_USER="user"
            export AI_DB_PASSWORD="password"
            export AI_LOG_LEVEL="debug"
            export AI_DEBUG_MODE="true"
            export AI_HOT_RELOAD="true"
            export AI_CORS_ORIGINS="http://localhost:3000,http://localhost:3001"
            export REACT_APP_API_BASE_URL="http://localhost:${AI_BACKEND_PORT}/api/v1"
            export REACT_APP_ENVIRONMENT="development"
            ;;
            
# 本地开发和应用阶段暂不需要测试和预发布环境，已注释
        # "testing"|"test")
        #     # 测试环境配置
        #     export AI_ENV="testing"
        #     export AI_FRONTEND_PORT=4001
        #     export AI_BACKEND_PORT=9090
        #     export AI_DB_PORT=5433
        #     export AI_DB_NAME="test_db"
        #     export AI_DB_USER="test_user"
        #     export AI_DB_PASSWORD="test_password"
        #     export AI_LOG_LEVEL="info"
        #     export AI_DEBUG_MODE="false"
        #     export AI_HOT_RELOAD="false"
        #     export AI_CORS_ORIGINS="http://localhost:4001"
        #     export REACT_APP_API_BASE_URL="http://localhost:${AI_BACKEND_PORT}/api/v1"
        #     export REACT_APP_ENVIRONMENT="testing"
        #     # 测试环境特殊配置
        #     export AI_TEST_TIMEOUT="30s"
        #     export AI_MOCK_EXTERNAL_APIS="true"
        #     ;;
            
        # "staging")
        #     # 预发布环境配置
        #     export AI_ENV="staging"
        #     export AI_FRONTEND_PORT=3000
        #     export AI_BACKEND_PORT=8080
        #     export AI_DB_PORT=5432
        #     export AI_DB_NAME="staging_db"
        #     export AI_DB_USER="staging_user"
        #     export AI_DB_PASSWORD="${AI_STAGING_DB_PASSWORD:-staging_password}"
        #     export AI_LOG_LEVEL="warn"
        #     export AI_DEBUG_MODE="false"
        #     export AI_HOT_RELOAD="false"
        #     export AI_CORS_ORIGINS="https://staging.ai-project.com"
        #     export REACT_APP_API_BASE_URL="https://api-staging.ai-project.com/api/v1"
        #     export REACT_APP_ENVIRONMENT="staging"
        #     # 性能监控
        #     export AI_PERFORMANCE_MONITORING="true"
        #     export AI_ERROR_REPORTING="true"
        #     ;;
            
        "production"|"prod")
            # 生产环境配置
            export AI_ENV="production"
            export AI_FRONTEND_PORT=80
            export AI_BACKEND_PORT=8080
            export AI_DB_PORT=5432
            export AI_DB_NAME="production_db"
            export AI_DB_USER="prod_user"
            export AI_DB_PASSWORD="${AI_PROD_DB_PASSWORD:-}"
            export AI_LOG_LEVEL="error"
            export AI_DEBUG_MODE="false"
            export AI_HOT_RELOAD="false"
            export AI_CORS_ORIGINS="https://ai-project.com"
            export REACT_APP_API_BASE_URL="https://api.ai-project.com/api/v1"
            export REACT_APP_ENVIRONMENT="production"
            # 生产环境安全配置
            export AI_SECURITY_HEADERS="true"
            export AI_RATE_LIMITING="true"
            export AI_SSL_REQUIRED="true"
            export AI_SESSION_SECURE="true"
            ;;
            
        *)
            echo -e "${RED}[ERROR]${NC} 未知环境: $env_name"
            echo "支持的环境: development, testing, staging, production"
            return 1
            ;;
    esac
    
    # 通用配置
    export AI_PROJECT_NAME="AI项目管理平台"
    export AI_PROJECT_VERSION="1.0.0"
    export AI_TIMEZONE="Asia/Shanghai"
    export AI_LANGUAGE="zh-CN"
    
    # JWT配置
    export JWT_SECRET="${AI_JWT_SECRET:-your-super-secret-jwt-key-change-in-production}"
    export JWT_EXPIRATION="${AI_JWT_EXPIRATION:-24h}"
    
    # Google Calendar集成配置
    export GOOGLE_CLIENT_ID="${AI_GOOGLE_CLIENT_ID:-}"
    export GOOGLE_CLIENT_SECRET="${AI_GOOGLE_CLIENT_SECRET:-}"
    export GOOGLE_REDIRECT_URL="${AI_GOOGLE_REDIRECT_URL:-http://localhost:${AI_BACKEND_PORT}/auth/google/callback}"
    export GOOGLE_CALENDAR_SCOPES="${AI_GOOGLE_CALENDAR_SCOPES:-https://www.googleapis.com/auth/calendar}"
    
    # 数据库连接字符串
    export DATABASE_URL="postgres://${AI_DB_USER}:${AI_DB_PASSWORD}@localhost:${AI_DB_PORT}/${AI_DB_NAME}?sslmode=disable"
    
    echo -e "${GREEN}[INFO]${NC} 已加载 ${BLUE}${env_name}${NC} 环境配置"
    return 0
}

# 显示环境配置信息
show_env_config() {
    local env_name="${1:-$CURRENT_ENV}"
    
    echo -e "${BLUE}=== 环境配置信息 ===${NC}"
    echo -e "环境名称: ${GREEN}${env_name}${NC}"
    echo -e "项目名称: ${AI_PROJECT_NAME}"
    echo -e "项目版本: ${AI_PROJECT_VERSION}"
    echo ""
    echo -e "${BLUE}=== 服务端口配置 ===${NC}"
    echo -e "前端端口: ${AI_FRONTEND_PORT}"
    echo -e "后端端口: ${AI_BACKEND_PORT}"
    echo -e "数据库端口: ${AI_DB_PORT}"
    echo ""
    echo -e "${BLUE}=== 数据库配置 ===${NC}"
    echo -e "数据库名: ${AI_DB_NAME}"
    echo -e "数据库用户: ${AI_DB_USER}"
    echo -e "连接字符串: ${DATABASE_URL}"
    echo ""
    echo -e "${BLUE}=== 应用配置 ===${NC}"
    echo -e "日志级别: ${AI_LOG_LEVEL}"
    echo -e "调试模式: ${AI_DEBUG_MODE}"
    echo -e "热重载: ${AI_HOT_RELOAD:-N/A}"
    echo -e "CORS源: ${AI_CORS_ORIGINS}"
    echo ""
    echo -e "${BLUE}=== 前端配置 ===${NC}"
    echo -e "API基础URL: ${REACT_APP_API_BASE_URL}"
    echo -e "运行环境: ${REACT_APP_ENVIRONMENT}"
}

# 验证环境配置
validate_env_config() {
    local env_name="${1:-$CURRENT_ENV}"
    local errors=0
    
    echo -e "${BLUE}[INFO]${NC} 验证 ${env_name} 环境配置..."
    
    # 必需的环境变量检查
    local required_vars=(
        "AI_ENV"
        "AI_FRONTEND_PORT"
        "AI_BACKEND_PORT"
        "AI_DB_PORT"
        "DATABASE_URL"
        "REACT_APP_API_BASE_URL"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            echo -e "${RED}[ERROR]${NC} 缺少必需的环境变量: $var"
            errors=$((errors + 1))
        fi
    done
    
    # 端口冲突检查
    if [ "$AI_FRONTEND_PORT" = "$AI_BACKEND_PORT" ]; then
        echo -e "${RED}[ERROR]${NC} 前端和后端端口冲突: $AI_FRONTEND_PORT"
        errors=$((errors + 1))
    fi
    
    # 生产环境安全检查
    if [ "$env_name" = "production" ]; then
        if [ "$AI_DB_PASSWORD" = "" ] || [ "$AI_DB_PASSWORD" = "password" ]; then
            echo -e "${RED}[ERROR]${NC} 生产环境必须设置安全的数据库密码"
            errors=$((errors + 1))
        fi
        
        if [ "$JWT_SECRET" = "your-super-secret-jwt-key-change-in-production" ]; then
            echo -e "${RED}[ERROR]${NC} 生产环境必须设置安全的JWT密钥"
            errors=$((errors + 1))
        fi
        
        if [ "$AI_DEBUG_MODE" = "true" ]; then
            echo -e "${YELLOW}[WARN]${NC} 生产环境不建议开启调试模式"
        fi
    fi
    
    if [ $errors -eq 0 ]; then
        echo -e "${GREEN}[SUCCESS]${NC} 环境配置验证通过"
        return 0
    else
        echo -e "${RED}[ERROR]${NC} 环境配置验证失败，发现 $errors 个问题"
        return 1
    fi
}

# 导出环境配置到文件
export_env_config() {
    local env_name="${1:-$CURRENT_ENV}"
    local output_file="${2:-$PROJECT_ROOT/.env.$env_name}"
    
    echo -e "${BLUE}[INFO]${NC} 导出 ${env_name} 环境配置到: $output_file"
    
    # 确保配置已加载
    load_env_config "$env_name"
    
    # 创建.env文件
    cat > "$output_file" << EOF
# AI项目管理平台 - ${env_name} 环境配置
# 自动生成时间: $(date '+%Y-%m-%d %H:%M:%S')

# 环境标识
AI_ENV=${AI_ENV}
AI_PROJECT_NAME=${AI_PROJECT_NAME}
AI_PROJECT_VERSION=${AI_PROJECT_VERSION}

# 服务端口
AI_FRONTEND_PORT=${AI_FRONTEND_PORT}
AI_BACKEND_PORT=${AI_BACKEND_PORT}
AI_DB_PORT=${AI_DB_PORT}

# 数据库配置
AI_DB_NAME=${AI_DB_NAME}
AI_DB_USER=${AI_DB_USER}
AI_DB_PASSWORD=${AI_DB_PASSWORD}
DATABASE_URL=${DATABASE_URL}

# 应用配置
AI_LOG_LEVEL=${AI_LOG_LEVEL}
AI_DEBUG_MODE=${AI_DEBUG_MODE}
AI_HOT_RELOAD=${AI_HOT_RELOAD}
AI_CORS_ORIGINS=${AI_CORS_ORIGINS}

# JWT配置
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRATION=${JWT_EXPIRATION}

# Google Calendar集成
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
GOOGLE_REDIRECT_URL=${GOOGLE_REDIRECT_URL}
GOOGLE_CALENDAR_SCOPES=${GOOGLE_CALENDAR_SCOPES}

# 前端配置
REACT_APP_API_BASE_URL=${REACT_APP_API_BASE_URL}
REACT_APP_ENVIRONMENT=${REACT_APP_ENVIRONMENT}
EOF

    echo -e "${GREEN}[SUCCESS]${NC} 环境配置已导出"
}

# 切换环境
switch_env() {
    local target_env="$1"
    
    if [ -z "$target_env" ]; then
        echo -e "${RED}[ERROR]${NC} 请指定目标环境"
        echo "使用方法: switch_env <environment>"
        echo "支持的环境: development, testing, staging, production"
        return 1
    fi
    
    echo -e "${BLUE}[INFO]${NC} 切换环境: ${CURRENT_ENV} -> ${target_env}"
    
    # 加载新环境配置
    if load_env_config "$target_env"; then
        CURRENT_ENV="$target_env"
        export AI_PROJECT_ENV="$target_env"
        
        # 导出配置文件
        export_env_config "$target_env"
        
        echo -e "${GREEN}[SUCCESS]${NC} 环境切换完成: ${GREEN}${target_env}${NC}"
        echo -e "${YELLOW}[提示]${NC} 请重启服务以应用新配置"
    else
        echo -e "${RED}[ERROR]${NC} 环境切换失败"
        return 1
    fi
}

# 列出支持的环境
list_environments() {
    echo -e "${BLUE}=== 支持的环境列表 ===${NC}"
    echo -e "${GREEN}development${NC} (dev)  - 开发环境，热重载，详细日志"
    echo -e "${YELLOW}testing${NC} (test)     - 测试环境，模拟外部API"  
    echo -e "${BLUE}staging${NC}             - 预发布环境，性能监控"
    echo -e "${RED}production${NC} (prod)   - 生产环境，安全优化"
    echo ""
    echo -e "当前环境: ${GREEN}${CURRENT_ENV}${NC}"
    echo -e "设置环境: export AI_PROJECT_ENV=<environment>"
}

# 如果直接执行此脚本，显示帮助信息
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    echo -e "${BLUE}AI项目管理平台 - 环境配置管理器${NC}"
    echo ""
    echo "使用方法:"
    echo "  source $0                    # 加载配置函数"
    echo "  load_env_config <env>        # 加载指定环境配置"
    echo "  show_env_config [env]        # 显示环境配置信息"
    echo "  validate_env_config [env]    # 验证环境配置"
    echo "  export_env_config <env>      # 导出环境配置到文件"
    echo "  switch_env <env>             # 切换环境"
    echo "  list_environments            # 列出支持的环境"
    echo ""
    list_environments
fi