#!/bin/bash

# migrate.sh - 数据库迁移执行脚本
# 用法: ./migrate.sh [数据库名] [用户名] [密码] [主机] [端口]

set -e  # 遇到错误立即退出

# 默认配置
DB_NAME=${1:-"ai_proj_db"}
DB_USER=${2:-"root"}
DB_PASS=${3:-""}
DB_HOST=${4:-"localhost"}
DB_PORT=${5:-"3306"}

# 迁移文件目录
MIGRATION_DIR="$(dirname "$0")/migrations"

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

# 检查MySQL连接
check_mysql_connection() {
    log_info "检查MySQL连接..."
    
    if [ -z "$DB_PASS" ]; then
        mysql_cmd="mysql -h$DB_HOST -P$DB_PORT -u$DB_USER"
    else
        mysql_cmd="mysql -h$DB_HOST -P$DB_PORT -u$DB_USER -p$DB_PASS"
    fi
    
    if ! $mysql_cmd -e "SELECT 1;" >/dev/null 2>&1; then
        log_error "无法连接到MySQL服务器"
        log_error "请检查连接参数: $DB_HOST:$DB_PORT, 用户: $DB_USER"
        exit 1
    fi
    
    log_success "MySQL连接正常"
}

# 创建数据库（如果不存在）
create_database() {
    log_info "检查/创建数据库: $DB_NAME"
    
    if [ -z "$DB_PASS" ]; then
        mysql_cmd="mysql -h$DB_HOST -P$DB_PORT -u$DB_USER"
    else
        mysql_cmd="mysql -h$DB_HOST -P$DB_PORT -u$DB_USER -p$DB_PASS"
    fi
    
    $mysql_cmd -e "CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    log_success "数据库 $DB_NAME 准备就绪"
}

# 执行迁移文件
execute_migration() {
    local migration_file=$1
    local file_name=$(basename "$migration_file")
    
    log_info "执行迁移: $file_name"
    
    if [ -z "$DB_PASS" ]; then
        mysql_cmd="mysql -h$DB_HOST -P$DB_PORT -u$DB_USER $DB_NAME"
    else
        mysql_cmd="mysql -h$DB_HOST -P$DB_PORT -u$DB_USER -p$DB_PASS $DB_NAME"
    fi
    
    # 记录开始时间
    start_time=$(date +%s)
    
    if $mysql_cmd < "$migration_file"; then
        end_time=$(date +%s)
        duration=$((end_time - start_time))
        log_success "迁移完成: $file_name (用时: ${duration}秒)"
    else
        log_error "迁移失败: $file_name"
        exit 1
    fi
}

# 主函数
main() {
    echo "=========================================="
    echo "    AI项目角色管理系统 - 数据库迁移"
    echo "=========================================="
    echo
    
    log_info "迁移配置:"
    log_info "  数据库: $DB_NAME"
    log_info "  主机: $DB_HOST:$DB_PORT"
    log_info "  用户: $DB_USER"
    log_info "  迁移目录: $MIGRATION_DIR"
    echo
    
    # 检查迁移目录是否存在
    if [ ! -d "$MIGRATION_DIR" ]; then
        log_error "迁移目录不存在: $MIGRATION_DIR"
        exit 1
    fi
    
    # 检查MySQL连接
    check_mysql_connection
    
    # 创建数据库
    create_database
    
    # 获取所有迁移文件并排序
    migration_files=$(find "$MIGRATION_DIR" -name "*.sql" | sort)
    
    if [ -z "$migration_files" ]; then
        log_warning "未找到迁移文件"
        exit 0
    fi
    
    # 执行迁移
    total_files=$(echo "$migration_files" | wc -l)
    current=0
    
    log_info "找到 $total_files 个迁移文件，开始执行..."
    echo
    
    for migration_file in $migration_files; do
        current=$((current + 1))
        echo "[$current/$total_files]"
        execute_migration "$migration_file"
        echo
    done
    
    echo "=========================================="
    log_success "所有迁移执行完成！"
    log_info "数据库 $DB_NAME 已成功初始化"
    echo "=========================================="
    
    # 显示统计信息
    log_info "数据库统计信息:"
    
    if [ -z "$DB_PASS" ]; then
        mysql_cmd="mysql -h$DB_HOST -P$DB_PORT -u$DB_USER $DB_NAME"
    else
        mysql_cmd="mysql -h$DB_HOST -P$DB_PORT -u$DB_USER -p$DB_PASS $DB_NAME"
    fi
    
    echo "  表数量: $($mysql_cmd -se "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB_NAME';")"
    echo "  视图数量: $($mysql_cmd -se "SELECT COUNT(*) FROM information_schema.views WHERE table_schema='$DB_NAME';")"
    echo "  存储过程数量: $($mysql_cmd -se "SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema='$DB_NAME' AND routine_type='PROCEDURE';")"
    echo "  函数数量: $($mysql_cmd -se "SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema='$DB_NAME' AND routine_type='FUNCTION';")"
    echo
    
    log_info "默认用户信息:"
    echo "  用户名: admin"
    echo "  密码: admin123"
    echo "  角色: 超级管理员"
}

# 运行主函数
main "$@"
