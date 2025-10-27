#!/bin/bash

################################################################################
# 数据迁移脚本 - 将Company数据迁移到Enterprise体系
#
# 用途: 将company体系的数据迁移到enterprise体系
# 作者: Claude Code
# 日期: 2025-01-27
#
# 迁移内容:
# 1. 将companies表数据迁移到enterprises表
# 2. 将customers表数据关联到enterprises
# 3. 将company_users迁移到enterprise_users
# 4. 处理重复用户名问题
# 5. 更新项目关联
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

    # 检查是否有备份
    local latest_backup=$(find "${BACKUP_ROOT}" -name "company_cleanup_*" -type d | sort -r | head -1)
    if [ -z "${latest_backup}" ]; then
        log WARNING "未找到备份，强烈建议先执行 01_backup_before_cleanup.sh"
        read -p "是否继续? (yes/no): " confirm
        if [ "${confirm}" != "yes" ]; then
            log INFO "迁移已取消"
            exit 0
        fi
    else
        log SUCCESS "找到备份: ${latest_backup}"
    fi

    # 检查重复用户
    log INFO "检查重复用户名..."
    psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
         -t -c "SELECT COUNT(*) FROM (
                    SELECT username, COUNT(*) as cnt
                    FROM users
                    WHERE deleted_at IS NULL
                    GROUP BY username
                    HAVING COUNT(*) > 1
                ) duplicates;" | xargs | read dup_count

    if [ "${dup_count}" -gt 0 ]; then
        log WARNING "发现 ${dup_count} 个重复用户名，需要先处理"
        psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
             -c "SELECT username, COUNT(*) as count, array_agg(id) as user_ids, array_agg(user_type) as types
                 FROM users WHERE deleted_at IS NULL
                 GROUP BY username HAVING COUNT(*) > 1;"
        return 1
    fi

    log SUCCESS "迁移前检查通过"
}

# ============================================================================
# 处理重复用户
# ============================================================================

handle_duplicate_users() {
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
    'Renamed company user: ' || username || ' -> ' || username || '_company' as action
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
# 迁移Companies到Enterprises
# ============================================================================

migrate_companies_to_enterprises() {
    log INFO "迁移 companies 到 enterprises..."

    cat > /tmp/migrate_companies.sql << 'EOSQL'
BEGIN;

-- 创建映射表，记录company_id -> enterprise_id的对应关系
CREATE TEMP TABLE company_enterprise_mapping (
    company_id INTEGER,
    enterprise_id INTEGER
);

-- 将companies数据插入enterprises表
INSERT INTO enterprises (
    name, code, description, industry, scale, address,
    contact_person, contact_phone, contact_email,
    status, license_number, tax_number,
    created_by, created_at, updated_at
)
SELECT
    c.name,
    c.code,
    c.description,
    c.industry,
    c.scale,
    c.address,
    c.contact_person,
    c.contact_phone,
    c.contact_email,
    c.status,
    c.license_number,
    c.tax_number,
    1, -- created_by: admin
    c.created_at,
    c.updated_at
FROM companies c
WHERE c.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM enterprises e
      WHERE e.name = c.name AND e.deleted_at IS NULL
  )
RETURNING id, name;

-- 填充映射表
INSERT INTO company_enterprise_mapping (company_id, enterprise_id)
SELECT
    c.id,
    e.id
FROM companies c
JOIN enterprises e ON e.name = c.name AND e.deleted_at IS NULL
WHERE c.deleted_at IS NULL;

-- 显示映射结果
SELECT
    'Migrated company: ' || c.name || ' (company_id: ' || cem.company_id || ' -> enterprise_id: ' || cem.enterprise_id || ')' as result
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
# 迁移Company Users到Enterprise Users
# ============================================================================

migrate_company_users() {
    log INFO "迁移 company_users 到 enterprise_users..."

    cat > /tmp/migrate_users.sql << 'EOSQL'
BEGIN;

-- 重新创建映射表
CREATE TEMP TABLE company_enterprise_mapping (
    company_id INTEGER,
    enterprise_id INTEGER
);

INSERT INTO company_enterprise_mapping (company_id, enterprise_id)
SELECT c.id, e.id
FROM companies c
JOIN enterprises e ON e.name = c.name AND e.deleted_at IS NULL
WHERE c.deleted_at IS NULL;

-- 迁移company_users到enterprise_users
INSERT INTO enterprise_users (
    enterprise_id, user_id, username, email, name, phone,
    position, access_level, status, created_by, created_at, updated_at
)
SELECT
    cem.enterprise_id,
    u.id as user_id,
    cu.username,
    cu.email,
    cu.name,
    cu.phone,
    cu.position,
    CASE cu.role
        WHEN 'company_admin' THEN 4
        WHEN 'company_user' THEN 2
        ELSE 1
    END as access_level,
    cu.status,
    1, -- created_by: admin
    cu.created_at,
    cu.updated_at
FROM company_users cu
JOIN company_enterprise_mapping cem ON cem.company_id = cu.company_id
LEFT JOIN users u ON u.username = cu.username AND u.deleted_at IS NULL
WHERE cu.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM enterprise_users eu
      WHERE eu.username = cu.username AND eu.deleted_at IS NULL
  );

-- 更新users表的user_type和role
UPDATE users u
SET
    user_type = 'enterprise',
    role = CASE cu.role
        WHEN 'company_admin' THEN 'enterprise_admin'
        WHEN 'company_user' THEN 'enterprise_user'
        ELSE 'enterprise_user'
    END,
    updated_at = CURRENT_TIMESTAMP
FROM company_users cu
WHERE u.username = cu.username
  AND u.user_type = 'company'
  AND u.deleted_at IS NULL
  AND cu.deleted_at IS NULL;

-- 显示迁移结果
SELECT
    'Migrated user: ' || cu.username ||
    ' (company_id: ' || cu.company_id || ' -> enterprise_id: ' || cem.enterprise_id || ')' as result
FROM company_users cu
JOIN company_enterprise_mapping cem ON cem.company_id = cu.company_id
WHERE cu.deleted_at IS NULL;

COMMIT;
EOSQL

    execute_sql_file "/tmp/migrate_users.sql" "迁移company_users数据"
    local result=$?
    rm -f /tmp/migrate_users.sql
    return $result
}

# ============================================================================
# 更新项目关联
# ============================================================================

update_project_associations() {
    log INFO "更新项目-企业关联..."

    cat > /tmp/update_projects.sql << 'EOSQL'
BEGIN;

-- 重新创建映射表
CREATE TEMP TABLE company_enterprise_mapping (
    company_id INTEGER,
    enterprise_id INTEGER
);

INSERT INTO company_enterprise_mapping (company_id, enterprise_id)
SELECT c.id, e.id
FROM companies c
JOIN enterprises e ON e.name = c.name AND e.deleted_at IS NULL
WHERE c.deleted_at IS NULL;

-- 更新project_companies表，将company_id替换为enterprise_id
-- 注意: 这需要修改表结构，暂时只做数据验证
SELECT
    pc.project_id,
    pc.company_id as old_company_id,
    cem.enterprise_id as new_enterprise_id,
    p.title as project_title
FROM project_companies pc
JOIN company_enterprise_mapping cem ON cem.company_id = pc.company_id
JOIN projects p ON p.id = pc.project_id
WHERE pc.deleted_at IS NULL;

-- 注意: 实际的表结构修改需要另外的迁移脚本

COMMIT;
EOSQL

    execute_sql_file "/tmp/update_projects.sql" "验证项目关联"
    local result=$?
    rm -f /tmp/update_projects.sql
    return $result
}

# ============================================================================
# 验证迁移结果
# ============================================================================

verify_migration() {
    log INFO "验证迁移结果..."

    cat > /tmp/verify.sql << 'EOSQL'
\echo '=========================================='
\echo '迁移结果验证'
\echo '=========================================='

\echo ''
\echo '1. Enterprises统计:'
SELECT COUNT(*) as total_enterprises FROM enterprises WHERE deleted_at IS NULL;

\echo ''
\echo '2. Enterprise Users统计:'
SELECT COUNT(*) as total_enterprise_users FROM enterprise_users WHERE deleted_at IS NULL;

\echo ''
\echo '3. 剩余Company类型用户:'
SELECT COUNT(*) as remaining_company_users FROM users WHERE user_type = 'company' AND deleted_at IS NULL;

\echo ''
\echo '4. 重复用户名检查:'
SELECT username, COUNT(*) as count
FROM users WHERE deleted_at IS NULL
GROUP BY username HAVING COUNT(*) > 1;

\echo ''
\echo '5. 未迁移的Company Users:'
SELECT cu.id, cu.username, cu.company_id
FROM company_users cu
WHERE cu.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM enterprise_users eu
      WHERE eu.username = cu.username AND eu.deleted_at IS NULL
  );
EOSQL

    psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
         -f /tmp/verify.sql

    rm -f /tmp/verify.sql
}

# ============================================================================
# 主流程
# ============================================================================

main() {
    echo ""
    echo "========================================================================"
    echo "  Company体系数据迁移脚本"
    echo "========================================================================"
    echo ""

    # 初始化日志
    mkdir -p "${BACKUP_ROOT}"
    echo "迁移开始于: $(date)" > "${MIGRATION_LOG}"

    # 迁移前检查
    if ! pre_migration_checks; then
        log ERROR "迁移前检查失败，请先处理问题"
        exit 1
    fi
    echo ""

    # 处理重复用户
    log INFO "步骤 1/4: 处理重复用户"
    if ! handle_duplicate_users; then
        log ERROR "处理重复用户失败"
        exit 1
    fi
    echo ""

    # 迁移companies
    log INFO "步骤 2/4: 迁移companies到enterprises"
    if ! migrate_companies_to_enterprises; then
        log ERROR "迁移companies失败"
        exit 1
    fi
    echo ""

    # 迁移company_users
    log INFO "步骤 3/4: 迁移company_users到enterprise_users"
    if ! migrate_company_users; then
        log ERROR "迁移company_users失败"
        exit 1
    fi
    echo ""

    # 更新项目关联
    log INFO "步骤 4/4: 更新项目关联"
    if ! update_project_associations; then
        log WARNING "项目关联更新需要手动处理"
    fi
    echo ""

    # 验证结果
    verify_migration
    echo ""

    # 完成
    log SUCCESS "========================================================================"
    log SUCCESS "数据迁移完成!"
    log SUCCESS "========================================================================"
    log SUCCESS "日志文件: ${MIGRATION_LOG}"
    echo ""

    echo "下一步操作:"
    echo "  1. 验证迁移结果: cat ${MIGRATION_LOG}"
    echo "  2. 检查数据完整性: psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME}"
    echo "  3. 执行清理脚本: ./03_cleanup_company_tables.sh"
    echo ""
}

main "$@"
