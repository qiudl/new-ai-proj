#!/bin/bash

# OKR进度日志表迁移执行脚本
# 用途: 创建 okr_progress_logs 表和相关的审计功能

set -e

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 数据库连接参数 (从环境变量获取，或使用默认值)
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5433}"
DB_NAME="${DB_NAME:-ai_project_db}"
DB_USER="${DB_USER:-dev_user}"
DB_PASSWORD="${DB_PASSWORD:-dev_password_2024}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查PostgreSQL连接
check_db_connection() {
    print_info "检查数据库连接..."
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
        print_success "数据库连接正常"
    else
        print_error "无法连接到数据库: $DB_HOST:$DB_PORT/$DB_NAME"
        print_error "请检查数据库配置和连接参数"
        exit 1
    fi
}

# 执行迁移
execute_migration() {
    local direction="${1:-up}"
    
    if [[ "$direction" != "up" && "$direction" != "down" ]]; then
        print_error "无效的迁移方向: $direction (应该是 'up' 或 'down')"
        exit 1
    fi
    
    local sql_file="$SCRIPT_DIR/${direction}.sql"
    
    if [[ ! -f "$sql_file" ]]; then
        print_error "迁移文件不存在: $sql_file"
        exit 1
    fi
    
    print_info "执行 $direction 迁移: $sql_file"
    
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$sql_file"; then
        print_success "$direction 迁移执行成功"
        
        # 如果是up迁移，显示表结构验证
        if [[ "$direction" == "up" ]]; then
            print_info "验证表结构..."
            PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
                \d+ okr_progress_logs;
                SELECT COUNT(*) as initial_log_count FROM okr_progress_logs;
            "
        fi
    else
        print_error "$direction 迁移执行失败"
        exit 1
    fi
}

# 测试审计功能
test_audit_function() {
    print_info "测试审计功能..."
    
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        -- 测试审计函数
        SELECT log_okr_change(
            NULL,                           -- objective_id
            1,                             -- key_result_id (假设存在)
            1,                             -- user_id
            'manual',                      -- change_type
            'current_value',               -- field_name
            '10',                          -- previous_value
            '20',                          -- new_value
            '测试审计功能',                 -- reason
            '127.0.0.1'::INET,            -- ip_address
            'Mozilla/5.0 Test'             -- user_agent
        ) as test_log_id;
        
        -- 查看最新的审计记录
        SELECT 
            id,
            CASE 
                WHEN objective_id IS NOT NULL THEN 'Objective #' || objective_id
                WHEN key_result_id IS NOT NULL THEN 'KeyResult #' || key_result_id
            END as target,
            change_type,
            field_name,
            previous_value,
            new_value,
            reason,
            created_at
        FROM okr_progress_logs 
        ORDER BY created_at DESC 
        LIMIT 5;
    "
    
    print_success "审计功能测试完成"
}

# 主函数
main() {
    local command="${1:-up}"
    
    echo "===========================================" 
    echo "OKR进度日志表迁移脚本"
    echo "==========================================="
    echo "目标: 创建 okr_progress_logs 表及审计功能"
    echo "方向: $command"
    echo "数据库: $DB_HOST:$DB_PORT/$DB_NAME"
    echo "==========================================="
    
    check_db_connection
    execute_migration "$command"
    
    if [[ "$command" == "up" ]]; then
        test_audit_function
        
        print_success "迁移完成！功能说明:"
        echo "✅ okr_progress_logs 表已创建"
        echo "✅ 审计日志索引已优化"
        echo "✅ log_okr_change() 函数已创建"
        echo "✅ 测试数据已插入"
        echo ""
        echo "🔧 使用方法:"
        echo "   在Go代码中调用审计日志记录"
        echo "   前端可查询进度变更历史"
        echo "   支持按目标、关键结果、用户等维度查询"
    else
        print_success "回滚完成！"
        echo "❌ okr_progress_logs 表及相关功能已删除"
    fi
}

# 检查命令行参数
if [[ $# -gt 1 ]]; then
    print_error "用法: $0 [up|down]"
    exit 1
fi

# 执行主函数
main "$@"