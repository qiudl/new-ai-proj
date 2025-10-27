#!/bin/bash

################################################################################
# 清理脚本 - 删除Company相关表和约束
#
# 用途: 在数据迁移完成后，清理company相关的表和约束
# 作者: Claude Code
# 日期: 2025-01-27
#
# 清理内容:
# 1. 软删除company相关表的数据
# 2. 移除外键约束
# 3. 更新CHECK约束
# 4. 标记表为废弃（可选择物理删除）
################################################################################

set -e
set -u

# ============================================================================
# 配置部分
# ============================================================================

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5433}"
DB_NAME="${DB_NAME:-ai_project_prod}"
DB_USER="${DB_USER:-ai_prod_user}"
export PGPASSWORD="${PGPASSWORD:-SecureAI2024!@#$%^}"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_ROOT="/Users/johnqiu/coding/www/projects/new-ai-proj/backend/backups"
CLEANUP_LOG="${BACKUP_ROOT}/cleanup_${TIMESTAMP}.log"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 清理模式: soft (软删除) 或 hard (物理删除)
CLEANUP_MODE="${1:-soft}"

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

    echo "[${timestamp}] [${level}] ${message}" >> "${CLEANUP_LOG}"
}

execute_sql() {
    local sql="$1"
    local description="$2"

    log INFO "${description}"

    if psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
            -c "${sql}" >> "${CLEANUP_LOG}" 2>&1; then
        log SUCCESS "${description} - 成功"
        return 0
    else
        log ERROR "${description} - 失败"
        return 1
    fi
}

execute_sql_file() {
    local file="$1"
    local description="$2"

    log INFO "${description}"

    if psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
            -f "${file}" >> "${CLEANUP_LOG}" 2>&1; then
        log SUCCESS "${description} - 成功"
        return 0
    else
        log ERROR "${description} - 失败"
        return 1
    fi
}

# ============================================================================
# 清理前检查
# ============================================================================

pre_cleanup_checks() {
    log INFO "执行清理前检查..."

    # 检查是否完成迁移
    local company_users_count=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
         -t -c "SELECT COUNT(*) FROM company_users WHERE deleted_at IS NULL;" | xargs)

    local enterprise_users_count=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
         -t -c "SELECT COUNT(*) FROM enterprise_users WHERE deleted_at IS NULL;" | xargs)

    log INFO "Company用户数: ${company_users_count}"
    log INFO "Enterprise用户数: ${enterprise_users_count}"

    if [ "${company_users_count}" -gt 0 ]; then
        log WARNING "仍有 ${company_users_count} 个company用户未迁移"
        read -p "是否继续清理? (yes/no): " confirm
        if [ "${confirm}" != "yes" ]; then
            log INFO "清理已取消"
            exit 0
        fi
    fi

    # 检查备份
    local latest_backup=$(find "${BACKUP_ROOT}" -name "company_cleanup_*" -type d | sort -r | head -1)
    if [ -z "${latest_backup}" ]; then
        log ERROR "未找到备份，必须先执行备份！"
        exit 1
    else
        log SUCCESS "找到备份: ${latest_backup}"
    fi

    log SUCCESS "清理前检查通过"
}

# ============================================================================
# 软删除Company数据
# ============================================================================

soft_delete_company_data() {
    log INFO "软删除Company相关数据..."

    cat > /tmp/soft_delete.sql << 'EOSQL'
BEGIN;

-- 记录清理前的数据量
SELECT 'Before cleanup:' as status;
SELECT 'companies: ' || COUNT(*) as count FROM companies WHERE deleted_at IS NULL;
SELECT 'customers: ' || COUNT(*) as count FROM customers WHERE deleted_at IS NULL;
SELECT 'company_departments: ' || COUNT(*) as count FROM company_departments WHERE deleted_at IS NULL;
SELECT 'company_users: ' || COUNT(*) as count FROM company_users WHERE deleted_at IS NULL;
SELECT 'company_roles: ' || COUNT(*) as count FROM company_roles WHERE deleted_at IS NULL;
SELECT 'company_user_project_permissions: ' || COUNT(*) as count FROM company_user_project_permissions WHERE deleted_at IS NULL;
SELECT 'project_companies: ' || COUNT(*) as count FROM project_companies WHERE deleted_at IS NULL;

-- 软删除所有company相关数据
UPDATE companies SET deleted_at = CURRENT_TIMESTAMP WHERE deleted_at IS NULL;
UPDATE customers SET deleted_at = CURRENT_TIMESTAMP WHERE deleted_at IS NULL;
UPDATE company_departments SET deleted_at = CURRENT_TIMESTAMP WHERE deleted_at IS NULL;
UPDATE company_users SET deleted_at = CURRENT_TIMESTAMP WHERE deleted_at IS NULL;
UPDATE company_roles SET deleted_at = CURRENT_TIMESTAMP WHERE deleted_at IS NULL;
UPDATE company_user_project_permissions SET deleted_at = CURRENT_TIMESTAMP WHERE deleted_at IS NULL;
UPDATE project_companies SET deleted_at = CURRENT_TIMESTAMP WHERE deleted_at IS NULL;

-- 软删除users表中的company类型用户
UPDATE users SET deleted_at = CURRENT_TIMESTAMP
WHERE user_type = 'company' AND deleted_at IS NULL;

-- 记录清理后的数据量
SELECT 'After cleanup:' as status;
SELECT 'companies (active): ' || COUNT(*) as count FROM companies WHERE deleted_at IS NULL;
SELECT 'customers (active): ' || COUNT(*) as count FROM customers WHERE deleted_at IS NULL;
SELECT 'company_users (active): ' || COUNT(*) as count FROM company_users WHERE deleted_at IS NULL;
SELECT 'users (company type, active): ' || COUNT(*) as count FROM users WHERE user_type = 'company' AND deleted_at IS NULL;

COMMIT;
EOSQL

    execute_sql_file "/tmp/soft_delete.sql" "软删除company数据"
    local result=$?
    rm -f /tmp/soft_delete.sql
    return $result
}

# ============================================================================
# 移除外键约束
# ============================================================================

remove_foreign_keys() {
    log INFO "移除Company相关外键约束..."

    cat > /tmp/remove_fk.sql << 'EOSQL'
BEGIN;

-- 查找并移除所有指向company表的外键
DO $$
DECLARE
    fk_record RECORD;
BEGIN
    FOR fk_record IN
        SELECT
            tc.constraint_name,
            tc.table_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
            AND (tc.table_name LIKE 'company%' OR ccu.table_name LIKE 'company%')
    LOOP
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I',
                      fk_record.table_name,
                      fk_record.constraint_name);
        RAISE NOTICE 'Dropped FK: %.% (-> %.%)',
                     fk_record.table_name,
                     fk_record.column_name,
                     fk_record.foreign_table_name,
                     fk_record.constraint_name;
    END LOOP;
END $$;

COMMIT;
EOSQL

    execute_sql_file "/tmp/remove_fk.sql" "移除外键约束"
    local result=$?
    rm -f /tmp/remove_fk.sql
    return $result
}

# ============================================================================
# 更新CHECK约束
# ============================================================================

update_check_constraints() {
    log INFO "更新CHECK约束..."

    cat > /tmp/update_check.sql << 'EOSQL'
BEGIN;

-- 更新users表的user_type CHECK约束
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_user_type_check;
ALTER TABLE users ADD CONSTRAINT users_user_type_check
    CHECK (user_type IN ('system', 'enterprise'));

-- 更新users表的role CHECK约束
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('admin', 'user', 'enterprise_admin', 'enterprise_user'));

-- 显示更新后的约束
SELECT
    tc.constraint_name,
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'users'
    AND tc.constraint_type = 'CHECK';

COMMIT;
EOSQL

    execute_sql_file "/tmp/update_check.sql" "更新CHECK约束"
    local result=$?
    rm -f /tmp/update_check.sql
    return $result
}

# ============================================================================
# 物理删除表（可选）
# ============================================================================

drop_company_tables() {
    log WARNING "准备物理删除Company相关表..."
    log WARNING "这是不可逆操作！"

    read -p "确认要物理删除表? 请输入 'DELETE_TABLES' 确认: " confirm
    if [ "${confirm}" != "DELETE_TABLES" ]; then
        log INFO "物理删除已取消"
        return 0
    fi

    cat > /tmp/drop_tables.sql << 'EOSQL'
BEGIN;

-- 按依赖顺序删除表
DROP TABLE IF EXISTS company_user_project_permissions CASCADE;
DROP TABLE IF EXISTS project_companies CASCADE;
DROP TABLE IF EXISTS company_roles CASCADE;
DROP TABLE IF EXISTS company_departments CASCADE;
DROP TABLE IF EXISTS company_users CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

-- 确认删除
SELECT 'Tables dropped successfully' as result;

COMMIT;
EOSQL

    execute_sql_file "/tmp/drop_tables.sql" "物理删除company表"
    local result=$?
    rm -f /tmp/drop_tables.sql
    return $result
}

# ============================================================================
# 验证清理结果
# ============================================================================

verify_cleanup() {
    log INFO "验证清理结果..."

    cat > /tmp/verify_cleanup.sql << 'EOSQL'
\echo '=========================================='
\echo '清理结果验证'
\echo '=========================================='

\echo ''
\echo '1. 剩余Company类型用户:'
SELECT COUNT(*) as remaining_company_users
FROM users WHERE user_type = 'company' AND deleted_at IS NULL;

\echo ''
\echo '2. 活跃的Company数据:'
SELECT
    'companies: ' || COUNT(*) as count FROM companies WHERE deleted_at IS NULL
UNION ALL
SELECT
    'company_users: ' || COUNT(*) as count FROM company_users WHERE deleted_at IS NULL
UNION ALL
SELECT
    'customers: ' || COUNT(*) as count FROM customers WHERE deleted_at IS NULL;

\echo ''
\echo '3. Enterprise体系数据:'
SELECT
    'enterprises: ' || COUNT(*) as count FROM enterprises WHERE deleted_at IS NULL
UNION ALL
SELECT
    'enterprise_users: ' || COUNT(*) as count FROM enterprise_users WHERE deleted_at IS NULL;

\echo ''
\echo '4. Users表的类型分布:'
SELECT
    user_type,
    role,
    COUNT(*) as count
FROM users
WHERE deleted_at IS NULL
GROUP BY user_type, role
ORDER BY user_type, role;

\echo ''
\echo '5. 当前约束检查:'
SELECT
    tc.constraint_name,
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'users'
    AND tc.constraint_type IN ('CHECK', 'FOREIGN KEY')
ORDER BY tc.constraint_type, tc.constraint_name;
EOSQL

    psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
         -f /tmp/verify_cleanup.sql

    rm -f /tmp/verify_cleanup.sql
}

# ============================================================================
# 主流程
# ============================================================================

main() {
    echo ""
    echo "========================================================================"
    echo "  Company体系清理脚本"
    echo "========================================================================"
    echo ""
    echo "清理模式: ${CLEANUP_MODE}"
    echo "  - soft: 软删除（保留表结构和数据，标记为已删除）"
    echo "  - hard: 硬删除（物理删除表和数据）"
    echo ""

    # 初始化日志
    mkdir -p "${BACKUP_ROOT}"
    echo "清理开始于: $(date)" > "${CLEANUP_LOG}"

    # 清理前检查
    if ! pre_cleanup_checks; then
        log ERROR "清理前检查失败"
        exit 1
    fi
    echo ""

    # 软删除数据
    log INFO "步骤 1/3: 软删除Company数据"
    if ! soft_delete_company_data; then
        log ERROR "软删除失败"
        exit 1
    fi
    echo ""

    # 移除外键约束
    log INFO "步骤 2/3: 移除外键约束"
    if ! remove_foreign_keys; then
        log WARNING "移除外键约束失败，但继续执行"
    fi
    echo ""

    # 更新CHECK约束
    log INFO "步骤 3/3: 更新CHECK约束"
    if ! update_check_constraints; then
        log WARNING "更新CHECK约束失败"
    fi
    echo ""

    # 物理删除表（仅在hard模式下）
    if [ "${CLEANUP_MODE}" == "hard" ]; then
        if ! drop_company_tables; then
            log ERROR "物理删除表失败"
            exit 1
        fi
        echo ""
    fi

    # 验证结果
    verify_cleanup
    echo ""

    # 完成
    log SUCCESS "========================================================================"
    log SUCCESS "清理完成!"
    log SUCCESS "========================================================================"
    log SUCCESS "日志文件: ${CLEANUP_LOG}"
    echo ""

    echo "清理摘要:"
    if [ "${CLEANUP_MODE}" == "soft" ]; then
        echo "  - Company相关数据已软删除"
        echo "  - 表结构保留，可以恢复"
        echo "  - 如需物理删除，请运行: $0 hard"
    else
        echo "  - Company相关表已物理删除"
        echo "  - 数据不可恢复（除非从备份还原）"
    fi
    echo ""

    echo "后续工作:"
    echo "  1. 更新后端代码，移除company相关接口"
    echo "  2. 更新前端代码，移除company相关页面"
    echo "  3. 更新API文档"
    echo "  4. 通知相关开发人员"
    echo ""
}

main "$@"
