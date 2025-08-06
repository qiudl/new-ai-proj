#!/bin/bash

# AI项目管理平台 - 环境自动检测器
# 功能：自动识别当前运行环境并设置相应配置

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo -e "${BLUE}🔍 AI项目管理平台 - 环境检测器${NC}"
echo "=================================="

# 环境检测函数
detect_environment() {
    local env_type=""
    
    echo -e "${BLUE}[INFO]${NC} 正在检测运行环境..."
    
    # 1. 检测Docker容器环境
    if [ -f "/.dockerenv" ] || grep -q 'docker\|lxc' /proc/1/cgroup 2>/dev/null; then
        env_type="container"
        echo -e "${GREEN}[DETECTED]${NC} Docker容器环境"
        
        # 检测容器内的环境类型
        if [ "$GIN_MODE" = "debug" ] || [ "$REACT_APP_ENV" = "development" ]; then
            env_type="development-container"
        elif [ "$GIN_MODE" = "test" ] || [ "$REACT_APP_ENV" = "test" ]; then
            env_type="test-container"
        elif [ "$GIN_MODE" = "release" ] || [ "$REACT_APP_ENV" = "production" ]; then
            env_type="production-container"
        else
            env_type="container-unknown"
        fi
    
    # 2. 检测Kubernetes环境
    elif [ -n "$KUBERNETES_SERVICE_HOST" ]; then
        env_type="kubernetes"
        echo -e "${GREEN}[DETECTED]${NC} Kubernetes环境"
    
    # 3. 检测本地开发环境
    elif [ -d "$PROJECT_ROOT/node_modules" ] && [ -f "$PROJECT_ROOT/package.json" ]; then
        if pgrep -f "react-scripts.*start" > /dev/null || pgrep -f "npm.*start" > /dev/null; then
            env_type="local-development"
            echo -e "${GREEN}[DETECTED]${NC} 本地开发环境 (React热重载)"
        elif pgrep -f "go run main.go" > /dev/null; then
            env_type="local-development"
            echo -e "${GREEN}[DETECTED]${NC} 本地开发环境 (Go热重载)"
        else
            env_type="local-build"
            echo -e "${GREEN}[DETECTED]${NC} 本地构建环境"
        fi
    
    # 4. 检测CI/CD环境
    elif [ -n "$CI" ] || [ -n "$GITHUB_ACTIONS" ] || [ -n "$GITLAB_CI" ]; then
        env_type="ci-cd"
        echo -e "${GREEN}[DETECTED]${NC} CI/CD环境"
    
    # 5. 检测生产服务器环境
    elif [ -f "/etc/systemd/system/ai-project.service" ] || [ -d "/opt/ai-project" ]; then
        env_type="production-server"
        echo -e "${GREEN}[DETECTED]${NC} 生产服务器环境"
    
    # 6. 默认环境检测
    else
        env_type="unknown"
        echo -e "${YELLOW}[WARNING]${NC} 无法确定环境类型，使用默认设置"
    fi
    
    echo "$env_type"
}

# 环境配置应用函数
apply_environment_config() {
    local env_type="$1"
    
    echo -e "${BLUE}[INFO]${NC} 应用环境配置: ${GREEN}${env_type}${NC}"
    
    case "$env_type" in
        "local-development")
            export NODE_ENV="development"
            export REACT_APP_ENV="development"
            export GIN_MODE="debug"
            export LOG_LEVEL="debug"
            export AI_ENVIRONMENT="local-development"
            export AI_FRONTEND_PORT="3001"
            export AI_BACKEND_PORT="8090"
            export AI_DEBUG_MODE="true"
            echo -e "${GREEN}✅ 本地开发环境配置已应用${NC}"
            ;;
            
        "development-container")
            export NODE_ENV="development"
            export REACT_APP_ENV="development"
            export GIN_MODE="debug"
            export LOG_LEVEL="debug"
            export AI_ENVIRONMENT="development-container"
            export AI_DEBUG_MODE="true"
            echo -e "${GREEN}✅ 开发容器环境配置已应用${NC}"
            ;;
            
        "test-container")
            export NODE_ENV="test"
            export REACT_APP_ENV="test"
            export GIN_MODE="test"
            export LOG_LEVEL="info"
            export AI_ENVIRONMENT="test-container"
            export AI_DEBUG_MODE="false"
            echo -e "${GREEN}✅ 测试容器环境配置已应用${NC}"
            ;;
            
        "production-container"|"production-server")
            export NODE_ENV="production"
            export REACT_APP_ENV="production"
            export GIN_MODE="release"
            export LOG_LEVEL="error"
            export AI_ENVIRONMENT="production"
            export AI_DEBUG_MODE="false"
            echo -e "${GREEN}✅ 生产环境配置已应用${NC}"
            ;;
            
        "ci-cd")
            export NODE_ENV="test"
            export REACT_APP_ENV="test"
            export GIN_MODE="test"
            export LOG_LEVEL="info"
            export AI_ENVIRONMENT="ci-cd"
            export AI_DEBUG_MODE="false"
            echo -e "${GREEN}✅ CI/CD环境配置已应用${NC}"
            ;;
            
        *)
            export NODE_ENV="development"
            export REACT_APP_ENV="development"
            export GIN_MODE="debug"
            export LOG_LEVEL="debug"
            export AI_ENVIRONMENT="unknown-default"
            export AI_DEBUG_MODE="true"
            echo -e "${YELLOW}⚠️ 使用默认开发环境配置${NC}"
            ;;
    esac
}

# 环境验证函数
validate_environment() {
    local env_type="$1"
    
    echo -e "${BLUE}[INFO]${NC} 验证环境配置..."
    
    # 必需的环境变量检查
    local required_vars=("NODE_ENV" "REACT_APP_ENV" "GIN_MODE" "AI_ENVIRONMENT")
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -eq 0 ]; then
        echo -e "${GREEN}✅ 环境配置验证通过${NC}"
        return 0
    else
        echo -e "${RED}❌ 缺少环境变量: ${missing_vars[*]}${NC}"
        return 1
    fi
}

# 显示环境信息
show_environment_info() {
    echo -e "${BLUE}=== 当前环境信息 ===${NC}"
    echo -e "环境类型: ${GREEN}${AI_ENVIRONMENT}${NC}"
    echo -e "Node.js环境: ${NODE_ENV}"
    echo -e "React环境: ${REACT_APP_ENV}"
    echo -e "Gin模式: ${GIN_MODE}"
    echo -e "日志级别: ${LOG_LEVEL}"
    echo -e "调试模式: ${AI_DEBUG_MODE}"
    
    if [ -n "$AI_FRONTEND_PORT" ]; then
        echo -e "前端端口: ${AI_FRONTEND_PORT}"
    fi
    
    if [ -n "$AI_BACKEND_PORT" ]; then
        echo -e "后端端口: ${AI_BACKEND_PORT}"
    fi
    
    echo ""
}

# 导出环境配置
export_environment_config() {
    local output_file="${1:-$PROJECT_ROOT/.env.detected}"
    
    echo -e "${BLUE}[INFO]${NC} 导出环境配置到: $output_file"
    
    cat > "$output_file" << EOF
# AI项目管理平台 - 自动检测的环境配置
# 生成时间: $(date '+%Y-%m-%d %H:%M:%S')
# 检测到的环境: ${AI_ENVIRONMENT}

# 基础环境变量
NODE_ENV=${NODE_ENV}
REACT_APP_ENV=${REACT_APP_ENV}
GIN_MODE=${GIN_MODE}
LOG_LEVEL=${LOG_LEVEL}
AI_ENVIRONMENT=${AI_ENVIRONMENT}
AI_DEBUG_MODE=${AI_DEBUG_MODE}

# 端口配置
$([ -n "$AI_FRONTEND_PORT" ] && echo "AI_FRONTEND_PORT=${AI_FRONTEND_PORT}")
$([ -n "$AI_BACKEND_PORT" ] && echo "AI_BACKEND_PORT=${AI_BACKEND_PORT}")

# 检测时间戳
AI_ENV_DETECTED_AT=$(date +%s)
EOF
    
    echo -e "${GREEN}✅ 环境配置已导出${NC}"
}

# 主执行流程
main() {
    echo -e "${BLUE}[INFO]${NC} 开始环境检测流程..."
    
    # 检测环境
    local detected_env=$(detect_environment)
    
    # 应用配置
    apply_environment_config "$detected_env"
    
    # 验证配置
    if validate_environment "$detected_env"; then
        # 显示信息
        show_environment_info
        
        # 导出配置
        export_environment_config
        
        echo -e "${GREEN}🎉 环境检测和配置完成！${NC}"
        return 0
    else
        echo -e "${RED}❌ 环境配置验证失败${NC}"
        return 1
    fi
}

# 如果直接执行此脚本
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi