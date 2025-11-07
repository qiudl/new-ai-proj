#!/bin/bash

# ================================================
# 需求管理系统数据库迁移验证脚本
# ================================================
# 版本: 1.0.0
# 作者: AI Project Team
# 日期: 2025-11-06
# 用途: 验证需求管理系统数据库迁移的完整性
# ================================================

set -e
set -u

# ================================================
# 颜色定义
# ================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ================================================
# 配置变量
# ================================================
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-ai_project_db}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-}"

# 测试计数器
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# ================================================
# 辅助函数
# ================================================

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

error() {
    echo -e "${RED}[✗]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# 执行SQL查询
query() {
    if [ -n "$DB_PASSWORD" ]; then
        export PGPASSWORD="$DB_PASSWORD"
    fi

    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "$1" 2>/dev/null | tr -d ' '
}

# 运行测试
run_test() {
    local test_name=$1
    local test_command=$2

    TESTS_TOTAL=$((TESTS_TOTAL + 1))

    if eval "$test_command"; then
        success "$test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        error "$test_name"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# ================================================
# 测试函数
# ================================================

# 测试表是否存在
test_table_exists() {
    local table_name=$1
    local result=$(query "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table_name');")
    [ "$result" = "t" ]
}

# 测试索引是否存在
test_index_exists() {
    local index_name=$1
    local result=$(query "SELECT EXISTS (SELECT FROM pg_indexes WHERE schemaname = 'public' AND indexname = '$index_name');")
    [ "$result" = "t" ]
}

# 测试触发器是否存在
test_trigger_exists() {
    local table_name=$1
    local trigger_name=$2
    local result=$(query "SELECT EXISTS (SELECT FROM pg_trigger WHERE tgname = '$trigger_name' AND tgrelid = '$table_name'::regclass);")
    [ "$result" = "t" ]
}

# 测试函数是否存在
test_function_exists() {
    local function_name=$1
    local result=$(query "SELECT EXISTS (SELECT FROM pg_proc WHERE proname = '$function_name');")
    [ "$result" = "t" ]
}

# 测试字段是否存在
test_column_exists() {
    local table_name=$1
    local column_name=$2
    local result=$(query "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '$table_name' AND column_name = '$column_name');")
    [ "$result" = "t" ]
}

# 测试约束是否存在
test_constraint_exists() {
    local table_name=$1
    local constraint_name=$2
    local result=$(query "SELECT EXISTS (SELECT FROM information_schema.table_constraints WHERE table_schema = 'public' AND table_name = '$table_name' AND constraint_name = '$constraint_name');")
    [ "$result" = "t" ]
}

# 获取表的行数
get_table_count() {
    local table_name=$1
    query "SELECT COUNT(*) FROM $table_name;"
}

# ================================================
# 主要验证逻辑
# ================================================

echo ""
echo "========================================"
echo "  Requirement System Migration Verification"
echo "========================================"
echo ""
echo "Database: $DB_NAME@$DB_HOST:$DB_PORT"
echo ""

# 测试数据库连接
info "Testing database connection..."
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c '\q' 2>/dev/null; then
    error "Failed to connect to database"
    exit 1
fi
success "Database connection successful"
echo ""

# ================================================
# 1. 验证表结构
# ================================================

echo "========================================"
echo "1. Verifying Tables"
echo "========================================"

run_test "Table 'requirements' exists" "test_table_exists 'requirements'"
run_test "Table 'requirement_comments' exists" "test_table_exists 'requirement_comments'"
run_test "Table 'requirement_history' exists" "test_table_exists 'requirement_history'"
run_test "Table 'requirement_tasks' exists" "test_table_exists 'requirement_tasks'"

echo ""

# ================================================
# 2. 验证核心字段
# ================================================

echo "========================================"
echo "2. Verifying Core Columns"
echo "========================================"

# requirements表字段
run_test "Column 'requirements.id' exists" "test_column_exists 'requirements' 'id'"
run_test "Column 'requirements.display_id' exists" "test_column_exists 'requirements' 'display_id'"
run_test "Column 'requirements.title' exists" "test_column_exists 'requirements' 'title'"
run_test "Column 'requirements.status' exists" "test_column_exists 'requirements' 'status'"
run_test "Column 'requirements.enterprise_id' exists" "test_column_exists 'requirements' 'enterprise_id'"

# requirement_comments表字段
run_test "Column 'requirement_comments.mentioned_user_ids' exists" "test_column_exists 'requirement_comments' 'mentioned_user_ids'"
run_test "Column 'requirement_comments.mentioned_count' exists" "test_column_exists 'requirement_comments' 'mentioned_count'"

# requirement_tasks表字段
run_test "Column 'requirement_tasks.link_type' exists" "test_column_exists 'requirement_tasks' 'link_type'"

echo ""

# ================================================
# 3. 验证索引
# ================================================

echo "========================================"
echo "3. Verifying Indexes"
echo "========================================"

# requirements表索引
run_test "Index 'idx_requirements_enterprise' exists" "test_index_exists 'idx_requirements_enterprise'"
run_test "Index 'idx_requirements_status' exists" "test_index_exists 'idx_requirements_status'"
run_test "Index 'idx_requirements_display_id' exists" "test_index_exists 'idx_requirements_display_id'"
run_test "Index 'idx_requirements_search' exists" "test_index_exists 'idx_requirements_search'"

# requirement_comments表索引
run_test "Index 'idx_req_comments_req' exists" "test_index_exists 'idx_req_comments_req'"
run_test "Index 'idx_req_comments_mentioned_users' exists" "test_index_exists 'idx_req_comments_mentioned_users'"

# requirement_tasks表索引
run_test "Index 'idx_requirement_tasks_requirement' exists" "test_index_exists 'idx_requirement_tasks_requirement'"
run_test "Index 'idx_requirement_tasks_task' exists" "test_index_exists 'idx_requirement_tasks_task'"

echo ""

# ================================================
# 4. 验证触发器
# ================================================

echo "========================================"
echo "4. Verifying Triggers"
echo "========================================"

run_test "Trigger 'trigger_requirements_updated_at' exists" \
    "test_trigger_exists 'requirements' 'trigger_requirements_updated_at'"

run_test "Trigger 'trigger_requirement_comments_updated_at' exists" \
    "test_trigger_exists 'requirement_comments' 'trigger_requirement_comments_updated_at'"

run_test "Trigger 'trigger_sync_mentioned_count' exists" \
    "test_trigger_exists 'requirement_comments' 'trigger_sync_mentioned_count'"

run_test "Trigger 'trigger_requirement_tasks_updated_at' exists" \
    "test_trigger_exists 'requirement_tasks' 'trigger_requirement_tasks_updated_at'"

echo ""

# ================================================
# 5. 验证函数
# ================================================

echo "========================================"
echo "5. Verifying Functions"
echo "========================================"

run_test "Function 'update_requirements_updated_at' exists" \
    "test_function_exists 'update_requirements_updated_at'"

run_test "Function 'update_requirement_comments_updated_at' exists" \
    "test_function_exists 'update_requirement_comments_updated_at'"

run_test "Function 'sync_requirement_comment_mentioned_count' exists" \
    "test_function_exists 'sync_requirement_comment_mentioned_count'"

run_test "Function 'update_requirement_tasks_updated_at' exists" \
    "test_function_exists 'update_requirement_tasks_updated_at'"

echo ""

# ================================================
# 6. 验证约束
# ================================================

echo "========================================"
echo "6. Verifying Constraints"
echo "========================================"

run_test "Constraint 'check_req_status' exists" \
    "test_constraint_exists 'requirements' 'check_req_status'"

run_test "Constraint 'check_req_priority' exists" \
    "test_constraint_exists 'requirements' 'check_req_priority'"

run_test "Constraint 'unique_requirement_task_link' exists" \
    "test_constraint_exists 'requirement_tasks' 'unique_requirement_task_link'"

run_test "Constraint 'check_link_type' exists" \
    "test_constraint_exists 'requirement_tasks' 'check_link_type'"

echo ""

# ================================================
# 7. 数据一致性检查
# ================================================

echo "========================================"
echo "7. Data Consistency Checks"
echo "========================================"

# 获取表的行数
req_count=$(get_table_count "requirements")
comments_count=$(get_table_count "requirement_comments")
history_count=$(get_table_count "requirement_history")
tasks_count=$(get_table_count "requirement_tasks")

info "Requirements count: $req_count"
info "Comments count: $comments_count"
info "History count: $history_count"
info "Tasks links count: $tasks_count"

# 检查外键引用完整性
orphan_comments=$(query "SELECT COUNT(*) FROM requirement_comments WHERE requirement_id NOT IN (SELECT id FROM requirements);")
orphan_history=$(query "SELECT COUNT(*) FROM requirement_history WHERE requirement_id NOT IN (SELECT id FROM requirements);")
orphan_tasks=$(query "SELECT COUNT(*) FROM requirement_tasks WHERE requirement_id NOT IN (SELECT id FROM requirements);")

run_test "No orphan comments (foreign key integrity)" "[ $orphan_comments -eq 0 ]"
run_test "No orphan history records (foreign key integrity)" "[ $orphan_history -eq 0 ]"
run_test "No orphan task links (foreign key integrity)" "[ $orphan_tasks -eq 0 ]"

echo ""

# ================================================
# 8. 功能性测试
# ================================================

echo "========================================"
echo "8. Functional Tests"
echo "========================================"

# 测试mentioned_count同步
info "Testing mentioned_count synchronization..."
test_result=$(query "
    SELECT COUNT(*) FROM requirement_comments
    WHERE mentioned_user_ids IS NOT NULL
    AND mentioned_count != jsonb_array_length(mentioned_user_ids);
")
run_test "mentioned_count is synchronized with mentioned_user_ids" "[ $test_result -eq 0 ]"

# 测试状态约束
info "Testing status constraints..."
invalid_status=$(query "
    SELECT COUNT(*) FROM requirements
    WHERE status NOT IN ('draft', 'pending', 'reviewing', 'need_more_info', 'approved', 'rejected', 'converted', 'archived');
")
run_test "All requirements have valid status" "[ $invalid_status -eq 0 ]"

echo ""

# ================================================
# 最终总结
# ================================================

echo "========================================"
echo "  Verification Summary"
echo "========================================"
echo ""
echo "Total tests: $TESTS_TOTAL"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    success "========================================
    success "All verification tests passed!"
    success "Migration is complete and valid."
    success "========================================"
    exit 0
else
    error "========================================
    error "Some verification tests failed!"
    error "Please review the errors above."
    error "========================================"
    exit 1
fi
