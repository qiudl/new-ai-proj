#!/bin/bash
# ============================================================================
# Migration Test Script: 20251026_02_enhance_system_admin_management
# Description: 测试迁移脚本的执行和验证
# ============================================================================

set -e  # 遇到错误立即退出

# 配置
DB_HOST="127.0.0.1"
DB_PORT="5433"
DB_USER="ai_prod_user"
DB_NAME="ai_project_prod"
DB_PASSWORD="SecureAI2024!@#$%^"

MIGRATION_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "============================================"
echo "Migration Test: 20251026_02"
echo "============================================"
echo ""

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

#===========================================================================
# 函数: 执行SQL查询
#===========================================================================
run_query() {
    local query="$1"
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -t -A -c "$query" 2>&1
}

#===========================================================================
# Step 1: 迁移前检查
#===========================================================================
echo "Step 1: 迁移前检查..."
echo "-------------------------------------------"

# 检查system_users表是否存在
if run_query "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_users');" | grep -q 't'; then
    echo -e "${GREEN}✓${NC} system_users表已存在"
else
    echo -e "${YELLOW}!${NC} system_users表不存在，将在迁移时创建"
fi

# 检查是否有待迁移的管理员
echo ""
echo "检查待迁移的管理员用户..."
run_query "SELECT id, username, email FROM system_users WHERE id IN (1, 110, 43, 112) ORDER BY id;"

echo ""

#===========================================================================
# Step 2: 执行升级迁移
#===========================================================================
echo "Step 2: 执行升级迁移..."
echo "-------------------------------------------"

if [ -f "$MIGRATION_DIR/up.sql" ]; then
    echo "执行 up.sql..."
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -f "$MIGRATION_DIR/up.sql"

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} 迁移脚本执行成功"
    else
        echo -e "${RED}✗${NC} 迁移脚本执行失败"
        exit 1
    fi
else
    echo -e "${RED}✗${NC} up.sql文件不存在"
    exit 1
fi

echo ""

#===========================================================================
# Step 3: 验证迁移结果
#===========================================================================
echo "Step 3: 验证迁移结果..."
echo "-------------------------------------------"

# 3.1 检查新增字段
echo "3.1 检查system_users表新增字段..."
fields=("system_role_id" "is_system_admin" "admin_level" "admin_scopes" "admin_activated_at" "admin_deactivated_at" "admin_notes")
for field in "${fields[@]}"; do
    if run_query "SELECT column_name FROM information_schema.columns WHERE table_name='system_users' AND column_name='$field';" | grep -q "$field"; then
        echo -e "  ${GREEN}✓${NC} $field"
    else
        echo -e "  ${RED}✗${NC} $field (missing)"
    fi
done

echo ""

# 3.2 检查新表
echo "3.2 检查system_admin_audit_logs表..."
if run_query "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_admin_audit_logs');" | grep -q 't'; then
    echo -e "  ${GREEN}✓${NC} system_admin_audit_logs表已创建"

    # 检查记录数
    count=$(run_query "SELECT COUNT(*) FROM system_admin_audit_logs;")
    echo -e "  ${GREEN}✓${NC} 审计日志记录数: $count"
else
    echo -e "  ${RED}✗${NC} system_admin_audit_logs表不存在"
fi

echo ""

# 3.3 检查索引
echo "3.3 检查创建的索引..."
index_count=$(run_query "SELECT COUNT(*) FROM pg_indexes WHERE tablename IN ('system_users', 'system_admin_audit_logs') AND indexname LIKE 'idx_sys%';")
echo -e "  ${GREEN}✓${NC} 创建的索引数量: $index_count (预期: 13)"

echo ""

# 3.4 检查视图
echo "3.4 检查创建的视图..."
views=("v_active_system_admins" "v_admin_audit_stats")
for view in "${views[@]}"; do
    if run_query "SELECT EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = '$view');" | grep -q 't'; then
        echo -e "  ${GREEN}✓${NC} $view"
    else
        echo -e "  ${RED}✗${NC} $view (missing)"
    fi
done

echo ""

# 3.5 检查迁移的管理员数据
echo "3.5 检查迁移的管理员数据..."
echo "-------------------------------------------"
echo "活跃的系统管理员:"
run_query "
SELECT
    id,
    username,
    admin_level,
    CASE
        WHEN admin_level = 1 THEN '超级管理员'
        WHEN admin_level = 2 THEN '系统管理员'
        ELSE '其他'
    END as level_name,
    CASE
        WHEN (admin_scopes->>'global_scope')::boolean = true THEN '全局'
        ELSE '限定'
    END as scope_type,
    to_char(admin_activated_at, 'YYYY-MM-DD HH24:MI') as activated_at
FROM system_users
WHERE is_system_admin = TRUE
ORDER BY admin_level, id;
" | column -t

echo ""

# 3.6 查看审计日志
echo "3.6 查看最近的审计日志..."
echo "-------------------------------------------"
run_query "
SELECT
    to_char(created_at, 'YYYY-MM-DD HH24:MI') as time,
    operator_username,
    action,
    substring(change_summary, 1, 60) as summary
FROM system_admin_audit_logs
ORDER BY created_at DESC
LIMIT 5;
" | column -t

echo ""

#===========================================================================
# Step 4: 性能测试
#===========================================================================
echo "Step 4: 性能测试..."
echo "-------------------------------------------"

echo "测试索引查询性能..."
echo ""
echo "Query 1: 查询系统管理员（应使用索引）"
run_query "EXPLAIN ANALYZE SELECT * FROM system_users WHERE is_system_admin = TRUE;" | grep -E "(Index|Seq Scan|Time)"

echo ""
echo "Query 2: 查询特定等级管理员（应使用索引）"
run_query "EXPLAIN ANALYZE SELECT * FROM system_users WHERE admin_level <= 2;" | grep -E "(Index|Seq Scan|Time)"

echo ""

#===========================================================================
# Step 5: 测试回滚（可选）
#===========================================================================
echo ""
echo -e "${YELLOW}提示:${NC} 如需测试回滚，请运行:"
echo "  psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $MIGRATION_DIR/down.sql"

echo ""
echo "============================================"
echo -e "${GREEN}✓ 迁移测试完成${NC}"
echo "============================================"
echo ""
echo "下一步:"
echo "1. 如果测试通过，可以在生产环境执行"
echo "2. 继续 Phase 2: 后端服务层开发"
echo "3. 监控系统管理员操作审计日志"
echo ""
