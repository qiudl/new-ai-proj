#!/bin/bash

# 任务文档数据迁移脚本
# Phase 2: 将文件系统的任务文档迁移到统一文档系统

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
DB_CONTAINER="${DB_CONTAINER:-db}"
DB_NAME="${DB_NAME:-main_db}"
DB_USER="${DB_USER:-user}"
DOCS_PATH="${DOCS_PATH:-./docs}"
BATCH_SIZE="${BATCH_SIZE:-50}"
MIGRATED_BY="${MIGRATED_BY:-1}"

# 辅助函数
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 检查数据库连接
check_database() {
    log_info "检查数据库连接..."
    
    if ! docker-compose exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1; then
        log_error "无法连接到数据库"
        log_info "请确保数据库服务已启动: docker-compose up -d"
        exit 1
    fi
    
    log_success "数据库连接正常"
}

# 执行迁移SQL脚本
run_migration_schema() {
    log_info "执行迁移SQL脚本..."
    
    local migration_file="./database/migrations/005_task_document_migration.sql"
    
    if [[ ! -f "$migration_file" ]]; then
        log_error "迁移SQL文件不存在: $migration_file"
        exit 1
    fi
    
    if docker-compose exec -T $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -f "/migrations/005_task_document_migration.sql" > /dev/null 2>&1; then
        log_success "迁移SQL脚本执行成功"
    else
        log_error "迁移SQL脚本执行失败"
        exit 1
    fi
}

# 扫描现有文档文件
scan_existing_documents() {
    log_info "扫描现有文档文件..."
    
    local docs_count=0
    
    if [[ -d "$DOCS_PATH" ]]; then
        docs_count=$(find "$DOCS_PATH" -name "*.md" | wc -l)
        log_info "发现 $docs_count 个Markdown文档文件"
        
        # 显示前几个文件示例
        if [[ $docs_count -gt 0 ]]; then
            log_info "文档文件示例:"
            find "$DOCS_PATH" -name "*.md" | head -5 | sed 's/^/  - /'
        fi
    else
        log_warning "文档目录不存在: $DOCS_PATH"
        log_info "将创建默认文档内容进行迁移"
    fi
    
    return $docs_count
}

# 迁移单个文档文件
migrate_single_document() {
    local file_path=$1
    local task_id=$2
    local project_id=$3
    
    log_info "迁移文档: $file_path (任务ID: $task_id)"
    
    # 读取文件内容
    local content=""
    if [[ -f "$file_path" ]]; then
        content=$(cat "$file_path" | sed "s/'/''/g")  # 转义SQL单引号
    else
        # 如果文件不存在，生成默认内容
        content="# 任务 $task_id 文档\n\n## 概述\n这是从旧系统迁移的任务文档。\n\n## 迁移信息\n- 迁移时间: $(date)\n- 原始文件路径: $file_path\n\n如果原始内容丢失，请联系管理员。"
    fi
    
    # 执行SQL迁移
    local sql="SELECT migrate_task_document($task_id, $project_id, '$content', '$file_path', $MIGRATED_BY);"
    
    local result=$(docker-compose exec -T $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -t -c "$sql" 2>/dev/null | tr -d ' ')
    
    if [[ "$result" =~ ^[0-9]+$ ]]; then
        log_success "任务 $task_id 文档迁移成功，文档ID: $result"
        return 0
    else
        log_error "任务 $task_id 文档迁移失败"
        return 1
    fi
}

# 批量迁移文档
batch_migrate_documents() {
    log_info "开始批量迁移文档..."
    log_info "批处理大小: $BATCH_SIZE"
    
    # 执行批量迁移函数
    local sql="SELECT batch_migrate_task_documents($MIGRATED_BY, $BATCH_SIZE);"
    
    log_info "执行迁移SQL: $sql"
    
    local result=$(docker-compose exec -T $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -t -c "$sql" 2>&1)
    
    if [[ $? -eq 0 ]]; then
        log_success "批量迁移执行完成"
        echo "$result" | jq '.' 2>/dev/null || echo "$result"
    else
        log_error "批量迁移执行失败"
        echo "$result"
        return 1
    fi
}

# 验证迁移结果
validate_migration() {
    log_info "验证迁移结果..."
    
    local sql="SELECT validate_migration_integrity();"
    local result=$(docker-compose exec -T $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -t -c "$sql" 2>/dev/null)
    
    if [[ $? -eq 0 ]]; then
        log_success "迁移验证完成"
        echo "$result" | jq '.' 2>/dev/null || echo "$result"
        
        # 解析验证结果
        local validation_passed=$(echo "$result" | jq -r '.validation_passed' 2>/dev/null)
        if [[ "$validation_passed" == "true" ]]; then
            log_success "🎉 迁移验证通过！"
        else
            log_warning "⚠️  迁移验证发现问题，请检查详细结果"
        fi
    else
        log_error "迁移验证失败"
        return 1
    fi
}

# 查看迁移状态
show_migration_status() {
    log_info "查看迁移状态..."
    
    echo ""
    echo "=== 迁移状态 ==="
    docker-compose exec -T $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
        SELECT migration_name, status, 
               to_char(started_at, 'YYYY-MM-DD HH24:MI:SS') as started,
               to_char(completed_at, 'YYYY-MM-DD HH24:MI:SS') as completed,
               total_items, processed_items, failed_items,
               ROUND((processed_items::NUMERIC / GREATEST(total_items, 1)) * 100, 1) as progress_pct
        FROM migration_status 
        WHERE migration_name LIKE '%task_document%'
        ORDER BY started_at DESC;
    "
    
    echo ""
    echo "=== 最近迁移日志 ==="
    docker-compose exec -T $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
        SELECT operation_type, task_id, document_id, success,
               COALESCE(error_message, 'Success') as result,
               to_char(migrated_at, 'MM-DD HH24:MI:SS') as time
        FROM task_document_migration_log 
        ORDER BY migrated_at DESC 
        LIMIT 10;
    "
}

# 清理迁移数据
cleanup_migration() {
    local keep_logs=${1:-true}
    
    log_info "清理迁移数据（保留日志: $keep_logs）..."
    
    local sql="SELECT cleanup_migration_data($keep_logs);"
    
    if docker-compose exec -T $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "$sql" > /dev/null 2>&1; then
        log_success "迁移数据清理完成"
    else
        log_error "迁移数据清理失败"
        return 1
    fi
}

# 主要功能函数
run_full_migration() {
    log_info "🚀 开始完整的任务文档迁移流程"
    echo "=================================="
    
    # 1. 检查环境
    check_database
    
    # 2. 执行迁移SQL脚本
    run_migration_schema
    
    # 3. 扫描现有文档
    scan_existing_documents
    
    # 4. 批量迁移
    batch_migrate_documents
    
    # 5. 验证迁移
    validate_migration
    
    # 6. 显示结果
    show_migration_status
    
    log_success "🎉 任务文档迁移流程完成！"
}

# 交互式迁移
interactive_migration() {
    echo "任务文档迁移工具"
    echo "=================="
    echo ""
    echo "请选择操作："
    echo "1) 完整迁移流程"
    echo "2) 仅执行批量迁移"
    echo "3) 验证迁移结果"
    echo "4) 查看迁移状态"
    echo "5) 清理迁移数据"
    echo "6) 退出"
    echo ""
    
    read -p "请选择 (1-6): " choice
    
    case $choice in
        1)
            run_full_migration
            ;;
        2)
            check_database
            batch_migrate_documents
            ;;
        3)
            check_database
            validate_migration
            ;;
        4)
            check_database
            show_migration_status
            ;;
        5)
            check_database
            read -p "是否保留迁移日志? (y/N): " keep_logs
            cleanup_migration $([[ "$keep_logs" =~ ^[Yy]$ ]] && echo "true" || echo "false")
            ;;
        6)
            log_info "退出迁移工具"
            exit 0
            ;;
        *)
            log_error "无效选择"
            exit 1
            ;;
    esac
}

# 显示帮助信息
show_help() {
    echo "任务文档迁移脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help              显示帮助信息"
    echo "  -f, --full              执行完整迁移流程"
    echo "  -b, --batch             仅执行批量迁移"
    echo "  -v, --validate          验证迁移结果"
    echo "  -s, --status            查看迁移状态"
    echo "  -c, --cleanup           清理迁移数据"
    echo "  -i, --interactive       交互式模式（默认）"
    echo ""
    echo "环境变量:"
    echo "  DB_CONTAINER           数据库容器名 (默认: db)"
    echo "  DB_NAME                数据库名 (默认: main_db)"
    echo "  DB_USER                数据库用户 (默认: user)"
    echo "  DOCS_PATH              文档路径 (默认: ./docs)"
    echo "  BATCH_SIZE             批处理大小 (默认: 50)"
    echo "  MIGRATED_BY            迁移者用户ID (默认: 1)"
    echo ""
    echo "示例:"
    echo "  $0 -f                           # 执行完整迁移"
    echo "  BATCH_SIZE=100 $0 -b           # 指定批处理大小"
    echo "  $0 -v                          # 验证迁移结果"
    echo ""
}

# 主程序入口
main() {
    # 解析命令行参数
    case "${1:-}" in
        -h|--help)
            show_help
            exit 0
            ;;
        -f|--full)
            run_full_migration
            ;;
        -b|--batch)
            check_database
            batch_migrate_documents
            ;;
        -v|--validate)
            check_database
            validate_migration
            ;;
        -s|--status)
            check_database
            show_migration_status
            ;;
        -c|--cleanup)
            check_database
            cleanup_migration false
            ;;
        -i|--interactive|"")
            interactive_migration
            ;;
        *)
            log_error "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
}

# 执行主程序
main "$@"