#!/bin/bash

################################################################################
# 数据库备份脚本 - Company体系清理前的完整备份
#
# 用途: 在执行company体系清理前，创建完整的数据库备份
# 作者: Claude Code
# 日期: 2025-01-27
#
# 备份内容:
# 1. 完整数据库备份 (pg_dump custom format)
# 2. Company相关表SQL备份
# 3. 关键表的CSV导出
# 4. 数据统计信息
# 5. 备份清单文件
################################################################################

set -e  # 遇到错误立即退出
set -u  # 使用未定义变量时报错

# ============================================================================
# 配置部分
# ============================================================================

# 数据库连接配置
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5433}"
DB_NAME="${DB_NAME:-ai_project_prod}"
DB_USER="${DB_USER:-ai_prod_user}"
export PGPASSWORD="${PGPASSWORD:-SecureAI2024!@#$%^}"

# 备份目录配置
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_ROOT="/Users/johnqiu/coding/www/projects/new-ai-proj/backend/backups"
BACKUP_DIR="${BACKUP_ROOT}/company_cleanup_${TIMESTAMP}"

# 日志配置
LOG_FILE="${BACKUP_DIR}/backup.log"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# 工具函数
# ============================================================================

log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    case $level in
        INFO)
            echo -e "${BLUE}[INFO]${NC} ${message}"
            ;;
        SUCCESS)
            echo -e "${GREEN}[SUCCESS]${NC} ${message}"
            ;;
        WARNING)
            echo -e "${YELLOW}[WARNING]${NC} ${message}"
            ;;
        ERROR)
            echo -e "${RED}[ERROR]${NC} ${message}"
            ;;
    esac

    echo "[${timestamp}] [${level}] ${message}" >> "${LOG_FILE}"
}

check_command() {
    if ! command -v "$1" &> /dev/null; then
        log ERROR "命令 $1 未找到，请先安装"
        exit 1
    fi
}

test_db_connection() {
    log INFO "测试数据库连接..."
    if psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT 1;" &> /dev/null; then
        log SUCCESS "数据库连接成功"
        return 0
    else
        log ERROR "数据库连接失败"
        return 1
    fi
}

# ============================================================================
# 备份函数
# ============================================================================

backup_full_database() {
    log INFO "开始完整数据库备份..."

    local backup_file="${BACKUP_DIR}/full_database.backup"

    pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" \
            -d "${DB_NAME}" -F c -b -v \
            -f "${backup_file}" 2>&1 | tee -a "${LOG_FILE}"

    if [ $? -eq 0 ]; then
        local size=$(du -h "${backup_file}" | cut -f1)
        log SUCCESS "完整数据库备份完成 (大小: ${size})"
        echo "${backup_file}" >> "${BACKUP_DIR}/backup_manifest.txt"
    else
        log ERROR "完整数据库备份失败"
        return 1
    fi
}

backup_company_tables() {
    log INFO "开始备份Company相关表..."

    local sql_dir="${BACKUP_DIR}/sql_backups"
    mkdir -p "${sql_dir}"

    local tables=(
        "companies"
        "customers"
        "company_departments"
        "company_users"
        "company_roles"
        "company_user_project_permissions"
        "project_companies"
    )

    for table in "${tables[@]}"; do
        log INFO "备份表: ${table}"
        local backup_file="${sql_dir}/${table}.sql"

        pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" \
                -d "${DB_NAME}" -t "${table}" \
                --column-inserts --data-only \
                -f "${backup_file}" 2>&1 | tee -a "${LOG_FILE}"

        if [ $? -eq 0 ]; then
            log SUCCESS "表 ${table} 备份完成"
            echo "${backup_file}" >> "${BACKUP_DIR}/backup_manifest.txt"
        else
            log ERROR "表 ${table} 备份失败"
            return 1
        fi
    done
}

export_csv_data() {
    log INFO "开始导出CSV数据..."

    local csv_dir="${BACKUP_DIR}/csv_exports"
    mkdir -p "${csv_dir}"

    # 导出companies表
    log INFO "导出 companies 表"
    psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
         -c "\COPY (SELECT * FROM companies WHERE deleted_at IS NULL) TO '${csv_dir}/companies.csv' WITH CSV HEADER" \
         2>&1 | tee -a "${LOG_FILE}"

    # 导出customers表
    log INFO "导出 customers 表"
    psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
         -c "\COPY (SELECT * FROM customers WHERE deleted_at IS NULL) TO '${csv_dir}/customers.csv' WITH CSV HEADER" \
         2>&1 | tee -a "${LOG_FILE}"

    # 导出company_users表
    log INFO "导出 company_users 表"
    psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
         -c "\COPY (SELECT * FROM company_users WHERE deleted_at IS NULL) TO '${csv_dir}/company_users.csv' WITH CSV HEADER" \
         2>&1 | tee -a "${LOG_FILE}"

    # 导出users表中的company类型用户
    log INFO "导出 company 类型的 users"
    psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
         -c "\COPY (SELECT * FROM users WHERE user_type = 'company' AND deleted_at IS NULL) TO '${csv_dir}/users_company.csv' WITH CSV HEADER" \
         2>&1 | tee -a "${LOG_FILE}"

    log SUCCESS "CSV数据导出完成"
}

generate_statistics() {
    log INFO "生成数据统计信息..."

    local stats_file="${BACKUP_DIR}/statistics.txt"

    cat > /tmp/stats_query.sql << 'EOSQL'
\echo '=========================================='
\echo 'Company体系数据统计'
\echo '=========================================='
\echo ''

\echo '1. Companies表统计:'
SELECT
    COUNT(*) as total_companies,
    COUNT(*) FILTER (WHERE deleted_at IS NULL) as active_companies
FROM companies;

\echo ''
\echo '2. Customers表统计:'
SELECT
    COUNT(*) as total_customers,
    COUNT(*) FILTER (WHERE deleted_at IS NULL) as active_customers
FROM customers;

\echo ''
\echo '3. Company Users统计:'
SELECT
    COUNT(*) as total_company_users,
    COUNT(*) FILTER (WHERE deleted_at IS NULL) as active_company_users
FROM company_users;

\echo ''
\echo '4. Users表中company类型统计:'
SELECT
    user_type,
    role,
    COUNT(*) as count
FROM users
WHERE user_type = 'company' AND deleted_at IS NULL
GROUP BY user_type, role;

\echo ''
\echo '5. Company相关表的外键关联:'
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND (tc.table_name LIKE 'company%' OR ccu.table_name LIKE 'company%')
ORDER BY tc.table_name;

\echo ''
\echo '6. 重复用户名检查:'
SELECT
    username,
    COUNT(*) as count,
    array_agg(id) as user_ids,
    array_agg(user_type) as types
FROM users
WHERE deleted_at IS NULL
GROUP BY username
HAVING COUNT(*) > 1;
EOSQL

    psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
         -f /tmp/stats_query.sql > "${stats_file}" 2>&1

    rm -f /tmp/stats_query.sql

    if [ $? -eq 0 ]; then
        log SUCCESS "统计信息生成完成"
        cat "${stats_file}"
    else
        log ERROR "统计信息生成失败"
        return 1
    fi
}

create_manifest() {
    log INFO "创建备份清单..."

    local manifest="${BACKUP_DIR}/backup_manifest.txt"

    cat > "${manifest}" << EOF
================================================================================
Company体系清理备份清单
================================================================================
备份时间: ${TIMESTAMP}
数据库: ${DB_NAME}@${DB_HOST}:${DB_PORT}
备份目录: ${BACKUP_DIR}

备份文件:
EOF

    find "${BACKUP_DIR}" -type f -name "*.backup" -o -name "*.sql" -o -name "*.csv" | while read file; do
        local size=$(du -h "$file" | cut -f1)
        local relative_path=$(echo "$file" | sed "s|${BACKUP_DIR}/||")
        echo "  - ${relative_path} (${size})" >> "${manifest}"
    done

    cat >> "${manifest}" << EOF

备份大小:
EOF

    du -sh "${BACKUP_DIR}" | awk '{print "  总大小: " $1}' >> "${manifest}"

    log SUCCESS "备份清单创建完成"
}

# ============================================================================
# 主流程
# ============================================================================

main() {
    echo ""
    echo "========================================================================"
    echo "  Company体系清理 - 数据库备份脚本"
    echo "========================================================================"
    echo ""

    # 检查必要的命令
    log INFO "检查必要的命令..."
    check_command psql
    check_command pg_dump

    # 创建备份目录
    log INFO "创建备份目录: ${BACKUP_DIR}"
    mkdir -p "${BACKUP_DIR}"
    mkdir -p "${BACKUP_DIR}/sql_backups"
    mkdir -p "${BACKUP_DIR}/csv_exports"

    # 初始化日志
    echo "备份开始于: $(date)" > "${LOG_FILE}"

    # 测试数据库连接
    if ! test_db_connection; then
        log ERROR "数据库连接失败，备份终止"
        exit 1
    fi

    # 执行备份
    log INFO "开始执行备份..."
    echo ""

    # 1. 完整数据库备份
    if ! backup_full_database; then
        log ERROR "完整数据库备份失败，备份终止"
        exit 1
    fi
    echo ""

    # 2. Company表备份
    if ! backup_company_tables; then
        log ERROR "Company表备份失败，备份终止"
        exit 1
    fi
    echo ""

    # 3. CSV导出
    if ! export_csv_data; then
        log WARNING "CSV导出失败，但继续执行"
    fi
    echo ""

    # 4. 生成统计
    if ! generate_statistics; then
        log WARNING "统计信息生成失败，但继续执行"
    fi
    echo ""

    # 5. 创建清单
    create_manifest
    echo ""

    # 完成
    log SUCCESS "========================================================================"
    log SUCCESS "备份完成!"
    log SUCCESS "========================================================================"
    log SUCCESS "备份位置: ${BACKUP_DIR}"
    log SUCCESS "日志文件: ${LOG_FILE}"
    echo ""

    # 显示备份统计
    echo "备份统计:"
    echo "  - 完整备份: $(du -h ${BACKUP_DIR}/full_database.backup | cut -f1)"
    echo "  - SQL备份: $(find ${BACKUP_DIR}/sql_backups -name "*.sql" | wc -l) 个文件"
    echo "  - CSV导出: $(find ${BACKUP_DIR}/csv_exports -name "*.csv" | wc -l) 个文件"
    echo "  - 总大小: $(du -sh ${BACKUP_DIR} | cut -f1)"
    echo ""

    echo "下一步操作:"
    echo "  1. 检查备份文件: ls -lh ${BACKUP_DIR}"
    echo "  2. 查看统计信息: cat ${BACKUP_DIR}/statistics.txt"
    echo "  3. 查看日志: cat ${LOG_FILE}"
    echo "  4. 执行迁移脚本: ./02_migrate_data.sh"
    echo ""
}

# 执行主流程
main "$@"
