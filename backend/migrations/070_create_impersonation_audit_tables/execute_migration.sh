#!/bin/bash

# 配置数据库连接参数
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5433}
DB_NAME=${DB_NAME:-ai_project_db}
DB_USER=${DB_USER:-dev_user}
DB_PASSWORD=${DB_PASSWORD:-dev_password_2024}

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 颜色定义
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

# 检查数据库连接
check_db_connection() {
    log_info "检查数据库连接..."
    if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c '\q' 2>/dev/null; then
        log_success "数据库连接正常"
        return 0
    else
        log_error "无法连接到数据库"
        return 1
    fi
}

# 执行上行迁移
execute_up() {
    log_info "开始执行上行迁移：创建模拟审计表..."
    
    if ! check_db_connection; then
        exit 1
    fi
    
    # 执行上行SQL
    if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$SCRIPT_DIR/up.sql"; then
        log_success "上行迁移执行成功"
        
        # 验证表是否创建成功
        log_info "验证表创建..."
        table_count=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "
            SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_name IN ('impersonation_sessions', 'impersonation_audit_logs')
        " | tr -d ' ')
        
        if [ "$table_count" = "2" ]; then
            log_success "所有表创建成功"
            
            # 显示表结构
            log_info "模拟会话表结构："
            PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "\d impersonation_sessions"
            
            log_info "模拟审计日志表结构："
            PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "\d impersonation_audit_logs"
            
            # 显示示例数据
            log_info "示例会话数据："
            PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
                SELECT session_id, username, enterprise_name, status, started_at, expires_at 
                FROM impersonation_sessions LIMIT 5;
            "
        else
            log_error "表创建不完整，请检查错误信息"
            exit 1
        fi
    else
        log_error "上行迁移执行失败"
        exit 1
    fi
}

# 执行下行迁移
execute_down() {
    log_warning "开始执行下行迁移：删除模拟审计表..."
    log_warning "这将删除所有模拟审计数据，请确认是否继续？(y/N)"
    
    read -r confirmation
    if [ "$confirmation" != "y" ] && [ "$confirmation" != "Y" ]; then
        log_info "迁移已取消"
        exit 0
    fi
    
    if ! check_db_connection; then
        exit 1
    fi
    
    # 执行下行SQL
    if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$SCRIPT_DIR/down.sql"; then
        log_success "下行迁移执行成功"
        
        # 验证表是否删除成功
        log_info "验证表删除..."
        table_count=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "
            SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_name IN ('impersonation_sessions', 'impersonation_audit_logs')
        " | tr -d ' ')
        
        if [ "$table_count" = "0" ]; then
            log_success "所有表删除成功"
        else
            log_error "表删除不完整，请检查错误信息"
            exit 1
        fi
    else
        log_error "下行迁移执行失败"
        exit 1
    fi
}

# 显示帮助信息
show_help() {
    echo "模拟审计表数据库迁移脚本"
    echo
    echo "用法: $0 [up|down|help]"
    echo
    echo "命令:"
    echo "  up      执行上行迁移（创建表和索引）"
    echo "  down    执行下行迁移（删除表和索引）"
    echo "  help    显示此帮助信息"
    echo
    echo "环境变量:"
    echo "  DB_HOST      数据库主机 (默认: localhost)"
    echo "  DB_PORT      数据库端口 (默认: 5433)"
    echo "  DB_NAME      数据库名称 (默认: ai_project_db)"
    echo "  DB_USER      数据库用户 (默认: dev_user)"
    echo "  DB_PASSWORD  数据库密码 (默认: dev_password_2024)"
    echo
    echo "示例:"
    echo "  $0 up                    # 创建表"
    echo "  DB_HOST=prod $0 up       # 在生产环境创建表"
    echo "  $0 down                  # 删除表"
}

# 主函数
main() {
    case "${1:-help}" in
        "up")
            execute_up
            ;;
        "down")
            execute_down
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        *)
            log_error "未知命令: $1"
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"