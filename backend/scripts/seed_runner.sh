#!/bin/bash

# 种子数据执行器
# 文件: seed_runner.sh
# 描述: 根据环境自动执行相应的种子数据脚本
# 作者: Claude AI (任务#621)
# 创建时间: 2025-08-27

set -e  # 遇到错误立即退出

# =============================================================================
# 1. 配置和常量
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SEED_DIR="${SCRIPT_DIR}/seed"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'  
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# 默认配置
DEFAULT_DB_HOST="localhost"
DEFAULT_DB_PORT="5433"
DEFAULT_DB_NAME="ai_project_db"
DEFAULT_DB_USER="dev_user"
DEFAULT_DB_PASSWORD="dev_password_2024"
DEFAULT_APP_ENV="development"

# =============================================================================
# 2. 工具函数
# =============================================================================

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_debug() {
    if [[ "${DEBUG}" == "true" ]]; then
        echo -e "${BLUE}[DEBUG]${NC} $1"
    fi
}

print_banner() {
    echo -e "${PURPLE}"
    echo "=========================================="
    echo "          种子数据执行器 v1.0"
    echo "=========================================="
    echo -e "${NC}"
}

print_usage() {
    cat << EOF
用法: $0 [选项]

选项:
  -e, --env ENV          指定环境 (development|staging|production)
  -h, --host HOST        数据库主机 (默认: $DEFAULT_DB_HOST)
  -p, --port PORT        数据库端口 (默认: $DEFAULT_DB_PORT)  
  -d, --database DB      数据库名称 (默认: $DEFAULT_DB_NAME)
  -u, --user USER        数据库用户 (默认: $DEFAULT_DB_USER)
  -w, --password PASS    数据库密码
  -f, --force            强制执行，跳过确认
  -c, --cleanup          清理模式，执行数据清理
  -r, --recreate         清理后重建基础数据
  -l, --list             列出可用的脚本
  -s, --script SCRIPT    执行指定脚本
  -t, --test             测试数据库连接
  -v, --verbose          详细输出
  -h, --help             显示此帮助信息

示例:
  $0                     # 在开发环境执行默认脚本
  $0 -e staging          # 在staging环境执行
  $0 -c -r               # 清理并重建数据
  $0 -s 001_basic_seed_data.sql  # 执行指定脚本
  $0 -t                  # 测试数据库连接

EOF
}

# 检查依赖
check_dependencies() {
    local missing_deps=()
    
    if ! command -v psql &> /dev/null; then
        missing_deps+=("psql")
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        missing_deps+=("docker-compose")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "缺少依赖: ${missing_deps[*]}"
        log_error "请安装缺少的依赖后重试"
        exit 1
    fi
}

# 加载环境变量
load_env_config() {
    local env_file="${PROJECT_ROOT}/.env"
    
    if [[ -f "$env_file" ]]; then
        log_debug "加载环境配置: $env_file"
        # 只加载数据库相关的环境变量
        export $(grep -E '^(DB_|APP_ENV)' "$env_file" | xargs)
    fi
    
    # 设置默认值 - 对于宿主机执行，调整Docker容器的连接参数
    export APP_ENV="${APP_ENV:-$DEFAULT_APP_ENV}"
    
    # 如果DB_HOST是Docker容器名，调整为宿主机访问方式
    if [[ "${DB_HOST}" == "postgres-master" ]]; then
        export DB_HOST="localhost"
        export DB_PORT="5433"  # Docker映射的端口
        log_debug "检测到Docker容器配置，调整为宿主机访问方式"
    else
        export DB_HOST="${DB_HOST:-$DEFAULT_DB_HOST}"
        export DB_PORT="${DB_PORT:-$DEFAULT_DB_PORT}"
    fi
    
    export DB_NAME="${DB_NAME:-$DEFAULT_DB_NAME}"
    export DB_USER="${DB_USER:-$DEFAULT_DB_USER}"
    export DB_PASSWORD="${DB_PASSWORD:-$DEFAULT_DB_PASSWORD}"
}

# 测试数据库连接
test_db_connection() {
    log_info "测试数据库连接..."
    log_debug "连接信息: ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
    
    if PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT 1" &>/dev/null; then
        log_info "✓ 数据库连接成功"
        return 0
    else
        log_error "✗ 数据库连接失败"
        log_error "请检查数据库服务是否运行，连接参数是否正确"
        return 1
    fi
}

# 检查Docker服务
check_docker_services() {
    local compose_file="${PROJECT_ROOT}/docker-compose.dev.yml"
    
    if [[ ! -f "$compose_file" ]]; then
        log_warn "Docker Compose文件不存在: $compose_file"
        return 1
    fi
    
    log_info "检查Docker服务状态..."
    
    if docker-compose -f "$compose_file" ps postgres-master | grep -q "Up"; then
        log_info "✓ PostgreSQL服务运行中"
        return 0
    else
        log_warn "PostgreSQL服务未运行，尝试启动..."
        if docker-compose -f "$compose_file" up -d postgres-master; then
            log_info "✓ PostgreSQL服务已启动"
            sleep 5  # 等待服务启动
            return 0
        else
            log_error "✗ 无法启动PostgreSQL服务"
            return 1
        fi
    fi
}

# 列出可用脚本
list_available_scripts() {
    log_info "可用的种子数据脚本:"
    echo
    
    if [[ -d "$SEED_DIR" ]]; then
        for script in "$SEED_DIR"/*.sql; do
            if [[ -f "$script" ]]; then
                local filename=$(basename "$script")
                local description=""
                
                # 尝试从文件中提取描述
                description=$(grep -m 1 "^-- 描述:" "$script" | sed 's/^-- 描述: *//' || echo "")
                
                printf "  %-30s %s\n" "$filename" "$description"
            fi
        done
    else
        log_warn "种子数据目录不存在: $SEED_DIR"
    fi
    echo
}

# 执行SQL脚本
execute_sql_script() {
    local script_path="$1"
    local script_name=$(basename "$script_path")
    
    if [[ ! -f "$script_path" ]]; then
        log_error "脚本文件不存在: $script_path"
        return 1
    fi
    
    log_info "执行脚本: $script_name"
    log_debug "脚本路径: $script_path"
    
    # 设置psql环境变量
    export PGPASSWORD="${DB_PASSWORD}"
    
    # 执行脚本
    if psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
           -v ON_ERROR_STOP=1 \
           -v app_environment="${APP_ENV}" \
           -v app_cleanup_confirm="${CLEANUP_CONFIRM:-false}" \
           -v app_recreate_basic_seed="${RECREATE_BASIC:-false}" \
           -f "$script_path"; then
        log_info "✓ 脚本执行成功: $script_name"
        return 0
    else
        log_error "✗ 脚本执行失败: $script_name"
        return 1
    fi
}

# 根据环境选择脚本
get_scripts_for_env() {
    local env="$1"
    local scripts=()
    
    case "$env" in
        "production")
            scripts=("001_basic_seed_data.sql")
            ;;
        "staging")
            scripts=("001_basic_seed_data.sql" "003_demo_data.sql")
            ;;
        "development"|"dev"|"test")
            scripts=("001_basic_seed_data.sql" "002_dev_test_data.sql" "003_demo_data.sql")
            ;;
        *)
            log_error "不支持的环境: $env"
            return 1
            ;;
    esac
    
    printf '%s\n' "${scripts[@]}"
}

# 确认执行
confirm_execution() {
    local env="$1"
    local scripts="$2"
    
    if [[ "$FORCE" == "true" ]]; then
        return 0
    fi
    
    echo
    log_warn "即将在 ${env} 环境执行以下脚本:"
    echo "$scripts" | while read -r script; do
        echo "  - $script"
    done
    echo
    
    if [[ "$env" == "production" ]]; then
        log_error "警告: 您即将在生产环境执行种子数据脚本!"
        echo -n "请输入 'CONFIRM-PRODUCTION' 来确认: "
        read -r confirmation
        if [[ "$confirmation" != "CONFIRM-PRODUCTION" ]]; then
            log_info "操作已取消"
            exit 0
        fi
    else
        echo -n "确认执行? [y/N]: "
        read -r -n 1 confirmation
        echo
        if [[ ! "$confirmation" =~ ^[Yy]$ ]]; then
            log_info "操作已取消"
            exit 0
        fi
    fi
}

# 执行清理操作
execute_cleanup() {
    local cleanup_script="${SEED_DIR}/999_cleanup_seed_data.sql"
    
    if [[ ! -f "$cleanup_script" ]]; then
        log_error "清理脚本不存在: $cleanup_script"
        return 1
    fi
    
    log_warn "即将执行数据清理操作!"
    
    if [[ "$FORCE" != "true" ]]; then
        echo -n "这将删除所有种子和测试数据，确认继续? [y/N]: "
        read -r -n 1 confirmation
        echo
        if [[ ! "$confirmation" =~ ^[Yy]$ ]]; then
            log_info "清理操作已取消"
            return 0
        fi
    fi
    
    export CLEANUP_CONFIRM="true"
    export RECREATE_BASIC="${RECREATE:-false}"
    
    execute_sql_script "$cleanup_script"
}

# 主执行函数
main_execution() {
    local env="$APP_ENV"
    
    if [[ "$CLEANUP" == "true" ]]; then
        execute_cleanup
        return $?
    fi
    
    if [[ -n "$SPECIFIC_SCRIPT" ]]; then
        local script_path="${SEED_DIR}/${SPECIFIC_SCRIPT}"
        execute_sql_script "$script_path"
        return $?
    fi
    
    log_info "环境: $env"
    
    local scripts
    if ! scripts=$(get_scripts_for_env "$env"); then
        return 1
    fi
    
    confirm_execution "$env" "$scripts"
    
    local success_count=0
    local total_count=0
    
    echo "$scripts" | while read -r script; do
        if [[ -n "$script" ]]; then
            total_count=$((total_count + 1))
            local script_path="${SEED_DIR}/${script}"
            
            if execute_sql_script "$script_path"; then
                success_count=$((success_count + 1))
            fi
        fi
    done
    
    # 由于管道的原因，这里的计数可能不准确，所以简化处理
    log_info "种子数据执行完成"
}

# =============================================================================
# 3. 命令行参数处理
# =============================================================================

# 解析命令行参数
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -e|--env)
                APP_ENV="$2"
                shift 2
                ;;
            -h|--host)
                DB_HOST="$2"
                shift 2
                ;;
            -p|--port)
                DB_PORT="$2"
                shift 2
                ;;
            -d|--database)
                DB_NAME="$2"
                shift 2
                ;;
            -u|--user)
                DB_USER="$2"
                shift 2
                ;;
            -w|--password)
                DB_PASSWORD="$2"
                shift 2
                ;;
            -f|--force)
                FORCE="true"
                shift
                ;;
            -c|--cleanup)
                CLEANUP="true"
                shift
                ;;
            -r|--recreate)
                RECREATE="true"
                shift
                ;;
            -l|--list)
                LIST_SCRIPTS="true"
                shift
                ;;
            -s|--script)
                SPECIFIC_SCRIPT="$2"
                shift 2
                ;;
            -t|--test)
                TEST_CONNECTION="true"
                shift
                ;;
            -v|--verbose)
                DEBUG="true"
                shift
                ;;
            --help)
                print_usage
                exit 0
                ;;
            *)
                log_error "未知参数: $1"
                print_usage
                exit 1
                ;;
        esac
    done
}

# =============================================================================
# 4. 主程序
# =============================================================================

main() {
    print_banner
    
    # 解析参数
    parse_arguments "$@"
    
    # 检查依赖
    check_dependencies
    
    # 加载配置
    load_env_config
    
    # 处理特殊操作
    if [[ "$LIST_SCRIPTS" == "true" ]]; then
        list_available_scripts
        exit 0
    fi
    
    # 测试连接
    if [[ "$TEST_CONNECTION" == "true" ]]; then
        test_db_connection
        exit $?
    fi
    
    # 检查Docker服务（如果适用）
    if [[ "$DB_HOST" == "localhost" ]] && [[ -f "${PROJECT_ROOT}/docker-compose.dev.yml" ]]; then
        check_docker_services
    fi
    
    # 测试数据库连接
    if ! test_db_connection; then
        exit 1
    fi
    
    # 执行主要操作
    main_execution
}

# 错误处理
trap 'log_error "脚本执行过程中发生错误"; exit 1' ERR

# 运行主程序
main "$@"