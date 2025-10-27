#!/bin/bash

################################################################################
# 数据迁移脚本 - 修正版
#
# 用途: 将company体系的数据迁移到enterprise体系
# 作者: Claude Code
# 日期: 2025-01-27 (修正版)
#
# 修正内容:
# 1. 修复字段名映射(companies.company_name -> enterprises.name等)
# 2. 处理没有deleted_at字段的表(company_users, company_roles)
# 3. 适应实际数据库schema
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
MIGRATION_LOG="${BACKUP_ROOT}/migration_${TIMESTAMP}.log"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

    echo "[${timestamp}] [${level}] ${message}" >> "${MIGRATION_LOG}"
}

execute_sql() {
    local sql="$1"
    local description="$2"

    log INFO "${description}"

    if psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
            -c "${sql}" >> "${MIGRATION_LOG}" 2>&1; then
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
            -f "${file}" >> "${MIGRATION_LOG}" 2>&1; then
        log SUCCESS "${description} - 成功"
        return 0
    else
        log ERROR "${description} - 失败"
        return 1
    fi
}

# ============================================================================
# 迁移前检查
# ============================================================================

pre_migration_checks() {
    log INFO "执行迁移前检查..."

    # 检查company数据
    local company_count=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
         -t -c "SELECT COUNT(*) FROM companies WHERE deleted_at IS NULL;" | xargs)

    local company_user_count=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
         -t -c "SELECT COUNT(*) FROM users WHERE user_type = 'company' AND deleted_at IS NULL;" | xargs)

    log INFO "Company数量: ${company_count}"
    log INFO "Company类型用户数: ${company_user_count}"

    if [ "${company_count}" -eq 0 ] && [ "${company_user_count}" -eq 0 ]; then
        log WARNING "没有需要迁移的company数据"
        return 1
    fi

    # 检查重复用户名
    local duplicate_users=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
         -t -c "SELECT COUNT(*) FROM (SELECT username, COUNT(*) FROM users WHERE deleted_at IS NULL GROUP BY username HAVING COUNT(*) > 1) AS dup;" | xargs)

    log INFO "重复用户名数量: ${duplicate_users}"

    log SUCCESS "迁移前检查通过"
    return 0
}

# ============================================================================
# 处理重复用户名
# ============================================================================

handle_duplicate_usernames() {
    log INFO "处理重复用户名..."

    cat > /tmp/handle_duplicates.sql << 'EOSQL'
BEGIN;

-- 策略: 保留enterprise类型，重命名company类型
-- 对于每个重复的用户名，将company类型的用户名改为 username_company

UPDATE users u1
SET username = u1.username || '_company',
    updated_at = CURRENT_TIMESTAMP
WHERE u1.user_type = 'company'
  AND u1.deleted_at IS NULL
  AND EXISTS (
      SELECT 1
      FROM users u2
      WHERE u2.username = u1.username
        AND u2.user_type = 'enterprise'
        AND u2.deleted_at IS NULL
        AND u2.id != u1.id
  );

-- 记录修改
SELECT
    'Renamed company user: ' || username as action
FROM users
WHERE username LIKE '%_company'
  AND user_type = 'company'
  AND deleted_at IS NULL;

COMMIT;
EOSQL

    if execute_sql_file "/tmp/handle_duplicates.sql" "处理重复用户名"; then
        rm -f /tmp/handle_duplicates.sql
        return 0
    else
        rm -f /tmp/handle_duplicates.sql
        return 1
    fi
}

# ============================================================================
# 迁移Companies到Enterprises (修正版)
# ============================================================================

migrate_companies_to_enterprises() {
    log INFO "迁移 companies 到 enterprises (修正版)..."

    cat > /tmp/migrate_companies.sql << 'EOSQL'
BEGIN;

-- 创建映射表，记录company_id -> enterprise_id的对应关系
CREATE TEMP TABLE company_enterprise_mapping (
    company_id INTEGER,
    enterprise_id INTEGER
);

-- 将companies数据插入enterprises表 (修正字段映射)
INSERT INTO enterprises (
    name, code, industry_type, business_type,
    registration_number, tax_id, legal_representative,
    contact_email, contact_phone, address, city, province, postal_code, website,
    description, status, created_by, created_at, updated_at
)
SELECT
    c.company_name,  -- 修正: company_name -> name
    COALESCE(c.company_code, 'COMP' || c.id),  -- 修正: 生成code (enterprises要求非空)
    c.industry,  -- 修正: industry -> industry_type
    'corporation',  -- 默认为corporation
    c.business_license,  -- 修正: business_license -> registration_number
    c.tax_number,  -- 修正: tax_number -> tax_id
    c.legal_representative,
    c.main_email,  -- 修正: main_email -> contact_email
    c.main_phone,  -- 修正: main_phone -> contact_phone
    c.address,
    c.city,
    c.province,
    c.postal_code,
    c.website,
    'Migrated from companies table (id: ' || c.id || ')',  -- description
    c.status,
    COALESCE(c.created_by, 1),  -- created_by: 默认admin
    c.created_at,
    c.updated_at
FROM companies c
WHERE c.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM enterprises e
      WHERE e.code = COALESCE(c.company_code, 'COMP' || c.id) AND e.deleted_at IS NULL
  )
RETURNING id, name;

-- 填充映射表
INSERT INTO company_enterprise_mapping (company_id, enterprise_id)
SELECT
    c.id,
    e.id
FROM companies c
JOIN enterprises e ON e.code = COALESCE(c.company_code, 'COMP' || c.id) AND e.deleted_at IS NULL
WHERE c.deleted_at IS NULL;

-- 显示映射结果
SELECT
    'Migrated company: ' || c.company_name || ' (company_id: ' || cem.company_id || ' -> enterprise_id: ' || cem.enterprise_id || ')' as result
FROM company_enterprise_mapping cem
JOIN companies c ON c.id = cem.company_id;

COMMIT;
EOSQL

    execute_sql_file "/tmp/migrate_companies.sql" "迁移companies数据"
    local result=$?
    rm -f /tmp/migrate_companies.sql
    return $result
}

# ============================================================================
# 更新Users表的类型和角色
# ============================================================================

update_users_type_and_role() {
    log INFO "更新users表的user_type和role..."

    cat > /tmp/update_users.sql << 'EOSQL'
BEGIN;

-- 将company类型用户改为enterprise类型
UPDATE users
SET
    user_type = 'enterprise',
    role = CASE
        WHEN role = 'company_admin' THEN 'enterprise_admin'
        WHEN role = 'company_user' THEN 'enterprise_user'
        ELSE role
    END,
    updated_at = CURRENT_TIMESTAMP
WHERE user_type = 'company'
  AND deleted_at IS NULL;

-- 显示更新结果
SELECT
    'Updated user: ' || username || ' (' || user_type || ', ' || role || ')' as result
FROM users
WHERE user_type = 'enterprise'
  AND username LIKE '%_company'
  AND deleted_at IS NULL;

COMMIT;
EOSQL

    execute_sql_file "/tmp/update_users.sql" "更新用户类型和角色"
    local result=$?
    rm -f /tmp/update_users.sql
    return $result
}

# ============================================================================
# 验证迁移结果
# ============================================================================

verify_migration() {
    log INFO "验证迁移结果..."

    cat > /tmp/verify_migration.sql << 'EOSQL'
\echo '========================================'
\echo '迁移结果验证'
\echo '========================================'

\echo ''
\echo '1. Company类型用户剩余:'
SELECT COUNT(*) as remaining_company_users
FROM users WHERE user_type = 'company' AND deleted_at IS NULL;

\echo ''
\echo '2. Enterprise用户总数:'
SELECT COUNT(*) as total_enterprise_users
FROM users WHERE user_type = 'enterprise' AND deleted_at IS NULL;

\echo ''
\echo '3. Enterprises表新增记录:'
SELECT name, code, industry_type, status, created_at
FROM enterprises
WHERE description LIKE '%Migrated from companies table%'
  AND deleted_at IS NULL
ORDER BY created_at DESC;

\echo ''
\echo '4. 重复用户名检查:'
SELECT username, array_agg(user_type) as user_types, COUNT(*) as count
FROM users
WHERE deleted_at IS NULL
GROUP BY username
HAVING COUNT(*) > 1;

\echo ''
\echo '5. Users表类型分布:'
SELECT user_type, role, COUNT(*) as count
FROM users
WHERE deleted_at IS NULL
GROUP BY user_type, role
ORDER BY user_type, role;
EOSQL

    psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
         -f /tmp/verify_migration.sql

    rm -f /tmp/verify_migration.sql
}

# ============================================================================
# 主流程
# ============================================================================

main() {
    echo ""
    echo "========================================================================"
    echo "  Company体系数据迁移脚本 (修正版)"
    echo "========================================================================"
    echo ""

    # 初始化日志
    mkdir -p "${BACKUP_ROOT}"
    echo "迁移开始于: $(date)" > "${MIGRATION_LOG}"

    # 迁移前检查
    if ! pre_migration_checks; then
        log ERROR "迁移前检查失败"
        exit 1
    fi
    echo ""

    # 步骤1: 处理重复用户名
    log INFO "步骤 1/3: 处理重复用户名"
    if ! handle_duplicate_usernames; then
        log ERROR "处理重复用户名失败"
        exit 1
    fi
    echo ""

    # 步骤2: 迁移companies到enterprises
    log INFO "步骤 2/3: 迁移companies到enterprises"
    if ! migrate_companies_to_enterprises; then
        log ERROR "迁移companies失败"
        exit 1
    fi
    echo ""

    # 步骤3: 更新users表
    log INFO "步骤 3/3: 更新users表类型和角色"
    if ! update_users_type_and_role; then
        log ERROR "更新users表失败"
        exit 1
    fi
    echo ""

    # 验证结果
    verify_migration
    echo ""

    # 完成
    log SUCCESS "========================================================================"
    log SUCCESS "迁移完成!"
    log SUCCESS "========================================================================"
    log SUCCESS "日志文件: ${MIGRATION_LOG}"
    echo ""

    echo "迁移摘要:"
    echo "  - 重复用户名已处理(company类型用户重命名为 username_company)"
    echo "  - Companies已迁移到enterprises"
    echo "  - Users表的user_type已更新为enterprise"
    echo "  - Company_admin角色已更新为enterprise_admin"
    echo ""

    echo "后续步骤:"
    echo "  1. 验证应用功能是否正常"
    echo "  2. 运行清理脚本: ./03_cleanup_company_tables.sh soft"
    echo ""
}

main "$@"
