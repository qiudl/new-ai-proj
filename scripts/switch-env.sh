#!/bin/bash

# 环境切换脚本 (Environment Switcher)
# 用于在开发、测试、生产环境间切换

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 显示帮助信息
show_help() {
    echo -e "${BLUE}AI项目管理平台 - 环境切换脚本${NC}"
    echo ""
    echo "使用方法:"
    echo "  $0 [环境名称]"
    echo ""
    echo "可用环境:"
    echo "  development  - 开发环境 (本地开发)"
    echo "  testing      - 测试环境 (集成测试)"  
    echo "  production   - 生产环境 (生产部署)"
    echo ""
    echo "示例:"
    echo "  $0 development"
    echo "  $0 testing"
    echo "  $0 production"
    echo ""
}

# 检查环境文件是否存在
check_env_file() {
    local env_file="$1"
    if [ ! -f "$env_file" ]; then
        echo -e "${RED}❌ 错误: 环境文件 $env_file 不存在${NC}"
        return 1
    fi
    return 0
}

# 备份当前环境文件
backup_current_env() {
    if [ -f ".env" ]; then
        local timestamp=$(date +"%Y%m%d_%H%M%S")
        cp .env ".env.backup_${timestamp}"
        echo -e "${YELLOW}📦 已备份当前 .env 文件为 .env.backup_${timestamp}${NC}"
    fi
}

# 切换到指定环境
switch_environment() {
    local target_env="$1"
    local env_file=".env.${target_env}"
    
    echo -e "${BLUE}🔄 正在切换到 ${target_env} 环境...${NC}"
    
    # 检查目标环境文件
    if ! check_env_file "$env_file"; then
        return 1
    fi
    
    # 备份当前环境
    backup_current_env
    
    # 复制目标环境文件
    cp "$env_file" ".env"
    
    echo -e "${GREEN}✅ 成功切换到 ${target_env} 环境${NC}"
    
    # 显示当前环境信息
    show_current_environment
    
    # 提示重启服务
    echo -e "${YELLOW}💡 提示: 请重启 Docker 服务以应用新的环境配置:${NC}"
    echo "   docker-compose down"
    echo "   docker-compose up -d"
}

# 显示当前环境信息
show_current_environment() {
    echo ""
    echo -e "${BLUE}📋 当前环境信息:${NC}"
    
    if [ -f ".env" ]; then
        # 提取关键配置信息
        local env_name=$(grep "^ENV=" .env | cut -d'=' -f2 2>/dev/null || echo "未知")
        local db_name=$(grep "^DB_NAME=" .env | cut -d'=' -f2 2>/dev/null || echo "未知")
        local backend_port=$(grep "^BACKEND_PORT=" .env | cut -d'=' -f2 2>/dev/null || echo "未知")
        local frontend_port=$(grep "^FRONTEND_PORT=" .env | cut -d'=' -f2 2>/dev/null || echo "未知")
        local gin_mode=$(grep "^GIN_MODE=" .env | cut -d'=' -f2 2>/dev/null || echo "未知")
        local log_level=$(grep "^LOG_LEVEL=" .env | cut -d'=' -f2 2>/dev/null || echo "未知")
        
        echo "  🏷️  环境名称: $env_name"
        echo "  🗄️  数据库: $db_name"
        echo "  🔧 后端端口: $backend_port"
        echo "  🌐 前端端口: $frontend_port"
        echo "  ⚙️  运行模式: $gin_mode"
        echo "  📊 日志级别: $log_level"
    else
        echo -e "${RED}  ❌ 没有找到 .env 文件${NC}"
    fi
    echo ""
}

# 列出所有可用环境
list_environments() {
    echo -e "${BLUE}📋 可用环境列表:${NC}"
    echo ""
    
    for env_file in .env.*; do
        if [ -f "$env_file" ] && [[ "$env_file" != *.backup_* ]]; then
            local env_name=$(basename "$env_file" | sed 's/^\.env\.//')
            local env_display=$(grep "^ENV=" "$env_file" | cut -d'=' -f2 2>/dev/null || echo "$env_name")
            local db_name=$(grep "^DB_NAME=" "$env_file" | cut -d'=' -f2 2>/dev/null || echo "未知")
            
            if [ -f ".env" ] && diff -q ".env" "$env_file" > /dev/null 2>&1; then
                echo -e "  ${GREEN}✓ $env_name${NC} (当前环境) - 数据库: $db_name"
            else
                echo -e "  - $env_name - 数据库: $db_name"
            fi
        fi
    done
    echo ""
}

# 主函数
main() {
    # 检查是否在项目根目录
    if [ ! -f "docker-compose.yml" ]; then
        echo -e "${RED}❌ 错误: 请在项目根目录运行此脚本${NC}"
        exit 1
    fi
    
    # 处理命令行参数
    case "$1" in
        "help"|"-h"|"--help"|"")
            show_help
            list_environments
            show_current_environment
            ;;
        "list"|"-l"|"--list")
            list_environments
            show_current_environment
            ;;
        "status"|"-s"|"--status")
            show_current_environment
            ;;
        "development"|"dev")
            switch_environment "development"
            ;;
        "testing"|"test")
            switch_environment "testing"
            ;;
        "production"|"prod")
            switch_environment "production"
            ;;
        *)
            echo -e "${RED}❌ 错误: 未知环境 '$1'${NC}"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"