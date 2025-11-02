#!/bin/bash
# =============================================================================
# AI Project 角色系统初始化主脚本
# =============================================================================
# 功能: 一键初始化完整的角色权限系统
# 版本: v1.0
# 日期: 2025-11-02
# 作者: Claude Code AI
# =============================================================================

set -e  # 遇到错误立即退出

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

# 打印横幅
print_banner() {
    echo ""
    echo "========================================================================"
    echo "   AI Project 角色权限系统初始化"
    echo "========================================================================"
    echo ""
}

# 检查数据库连接
check_database() {
    log_info "检查数据库连接..."

    if PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT 1" > /dev/null 2>&1; then
        log_success "数据库连接成功"
        return 0
    else
        log_error "无法连接到数据库"
        log_error "请检查 .env 文件中的数据库配置"
        return 1
    fi
}

# 备份现有角色数据
backup_roles() {
    log_info "备份现有角色数据..."

    BACKUP_DIR="./backups/roles-$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"

    PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
        -c "COPY (SELECT * FROM company_roles) TO STDOUT WITH CSV HEADER" > "$BACKUP_DIR/company_roles.csv"

    PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
        -c "COPY (SELECT * FROM role_permissions) TO STDOUT WITH CSV HEADER" > "$BACKUP_DIR/role_permissions.csv"

    log_success "备份已保存到: $BACKUP_DIR"
}

# 执行SQL脚本
execute_sql_file() {
    local sql_file=$1
    local description=$2

    log_info "$description"

    if [ ! -f "$sql_file" ]; then
        log_error "SQL文件不存在: $sql_file"
        return 1
    fi

    if PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
        -f "$sql_file" > /dev/null 2>&1; then
        log_success "$description - 完成"
        return 0
    else
        log_error "$description - 失败"
        return 1
    fi
}

# 主执行流程
main() {
    print_banner

    # 读取环境变量
    if [ -f "../../.env" ]; then
        log_info "加载环境变量..."
        export $(cat ../../.env | grep -v '^#' | xargs)
    else
        log_warning "未找到 .env 文件，使用默认配置"
        export DB_HOST=${DB_HOST:-"127.0.0.1"}
        export DB_PORT=${DB_PORT:-"5433"}
        export DB_USER=${DB_USER:-"ai_prod_user"}
        export DB_PASSWORD=${DB_PASSWORD:-"SecureAI2024!@#$%^"}
        export DB_NAME=${DB_NAME:-"ai_project_prod"}
    fi

    log_info "数据库配置:"
    echo "  主机: $DB_HOST:$DB_PORT"
    echo "  用户: $DB_USER"
    echo "  数据库: $DB_NAME"
    echo ""

    # 检查数据库连接
    if ! check_database; then
        exit 1
    fi

    # 询问是否备份
    read -p "是否备份现有角色数据? (y/n, 默认: y) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        backup_roles
    fi

    # 执行系统角色初始化
    echo ""
    log_info "========================================="
    log_info "步骤 1: 初始化系统角色"
    log_info "========================================="

    if ! execute_sql_file "./init-default-system-roles.sql" "创建系统角色和权限映射"; then
        log_error "系统角色初始化失败"
        exit 1
    fi

    # 执行企业角色创建
    echo ""
    log_info "========================================="
    log_info "步骤 2: 为现有企业创建角色"
    log_info "========================================="

    if ! execute_sql_file "./create-enterprise-roles.sql" "为企业创建默认角色"; then
        log_error "企业角色创建失败"
        exit 1
    fi

    # 完成
    echo ""
    log_success "========================================================================"
    log_success "  角色权限系统初始化完成!"
    log_success "========================================================================"
    echo ""

    log_info "下一步操作:"
    echo "  1. 查看系统角色: SELECT * FROM v_system_roles_summary;"
    echo "  2. 查看企业角色: SELECT * FROM v_enterprise_roles_summary;"
    echo "  3. 测试权限系统: ./test-roles-system.sh"
    echo "  4. 访问管理页面: http://localhost:3000/admin/roles"
    echo ""
}

# 运行主函数
main "$@"
