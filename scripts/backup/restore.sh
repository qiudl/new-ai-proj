#!/bin/bash

# =============================================================================
# 数据库恢复脚本 (Database Restore Script)
# =============================================================================
# 作者: 系统管理员
# 版本: 2.0
# 创建时间: $(date +%Y-%m-%d)
# 描述: 提供安全的数据库恢复功能，支持多种恢复模式
# =============================================================================

set -e  # 遇到错误时停止执行

# =============================================================================
# 配置部分 (Configuration)
# =============================================================================

# Docker容器配置
DB_CONTAINER="postgres_db"

# 从环境文件读取配置
if [[ -f ".env" ]]; then
    export $(cat .env | grep -v '^#' | xargs) 2>/dev/null || true
fi

# 数据库配置
DB_HOST="localhost"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-main_db}"
DB_USER="${DB_USER:-user}"
DB_PASSWORD="${DB_PASSWORD:-password}"

# 目录配置
BACKUP_DIR="./backups"
RESTORE_LOGS_DIR="./backups/logs"

# 时间戳
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m'

# =============================================================================
# 工具函数 (Utility Functions)
# =============================================================================

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date +'%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date +'%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date +'%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date +'%Y-%m-%d %H:%M:%S') - $1"
}

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $(date +'%Y-%m-%d %H:%M:%S') - $1"
}

log_header() {
    echo -e "${WHITE}${1}${NC}"
}

# 记录操作日志
log_to_file() {
    local level="$1"
    local message="$2"
    local log_file="$RESTORE_LOGS_DIR/restore_operations_$(date +%Y%m).log"
    
    mkdir -p "$(dirname "$log_file")"
    echo "$(date +'%Y-%m-%d %H:%M:%S') [$level] $message" >> "$log_file"
}

# 获取用户确认
get_user_confirmation() {
    local message="$1"
    local default="${2:-N}"
    
    log_warning "$message"
    if [[ "$default" == "Y" ]]; then
        read -p "确认继续？ (Y/n): " -r response
        response=${response:-Y}
    else
        read -p "确认继续？ (y/N): " -r response
        response=${response:-N}
    fi
    
    [[ "$response" =~ ^[Yy]$ ]]
}

# 显示进度条
show_progress() {
    local message="$1"
    local duration="${2:-5}"
    
    echo -n "$message "
    for ((i=1; i<=duration; i++)); do
        echo -n "."
        sleep 1
    done
    echo " 完成"
}

# =============================================================================
# 环境检查函数 (Environment Check Functions)
# =============================================================================

# 检查系统先决条件
check_prerequisites() {
    log_step "检查系统先决条件..."
    
    # 检查必要命令
    local missing_commands=()
    for cmd in docker date; do
        if ! command -v "$cmd" >/dev/null 2>&1; then
            missing_commands+=("$cmd")  
        fi
    done
    
    if [[ ${#missing_commands[@]} -gt 0 ]]; then
        log_error "缺少必要命令: ${missing_commands[*]}"
        exit 1
    fi
    
    # 检查Docker环境
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker未运行或无法连接"
        exit 1
    fi
    
    # 检查数据库容器
    if ! docker ps | grep -q "$DB_CONTAINER"; then
        log_error "数据库容器 '$DB_CONTAINER' 未运行"
        echo "请启动数据库容器: docker-compose up -d db"
        exit 1
    fi
    
    log_success "系统先决条件检查通过"
}

# 检查数据库连接
check_database_connection() {
    log_step "检查数据库连接..."
    
    if ! docker exec "$DB_CONTAINER" pg_isready -U "$DB_USER" -d "$DB_NAME" &>/dev/null; then
        log_error "无法连接到数据库"
        exit 1
    fi
    
    log_success "数据库连接正常"
}

# =============================================================================
# 备份文件管理函数 (Backup File Management)
# =============================================================================

# 列出可用的备份文件
list_available_backups() {
    log_header "=============================================="
    log_header "           可用备份文件列表"
    log_header "=============================================="
    
    local backup_files=()
    local counter=1
    
    # 查找所有备份文件
    while IFS= read -r -d '' file; do
        backup_files+=("$file")
    done < <(find "$BACKUP_DIR" -name "*.sql" -o -name "*.dump" | sort -r | head -20 | tr '\n' '\0')
    
    if [[ ${#backup_files[@]} -eq 0 ]]; then
        log_warning "没有找到备份文件"
        return 1
    fi
    
    echo "最近的备份文件:"
    echo
    printf "%-4s %-15s %-25s %-10s %-20s\n" "序号" "类型" "文件名" "大小" "创建时间"
    echo "--------------------------------------------------------------------"
    
    for file in "${backup_files[@]}"; do
        local basename_file=$(basename "$file")
        local file_size
        local create_time
        local backup_type="手动"
        
        # 获取文件大小
        if command -v numfmt >/dev/null 2>&1; then
            file_size=$(stat -f%z "$file" 2>/dev/null | numfmt --to=iec-i --suffix=B --format="%.1f" || echo "未知")
        else
            file_size=$(du -h "$file" | cut -f1)
        fi
        
        # 获取创建时间
        create_time=$(stat -f%Sm -t"%Y-%m-%d %H:%M" "$file" 2>/dev/null || stat -c%y "$file" | cut -d' ' -f1-2 | cut -d'.' -f1)
        
        # 判断备份类型
        if [[ "$basename_file" == *"daily"* ]]; then
            backup_type="日备份"
        elif [[ "$basename_file" == *"weekly"* ]]; then
            backup_type="周备份"
        elif [[ "$basename_file" == *"monthly"* ]]; then
            backup_type="月备份"
        elif [[ "$basename_file" == *"schema"* ]]; then
            backup_type="结构"
        elif [[ "$basename_file" == *"data"* ]]; then
            backup_type="数据"
        elif [[ "$basename_file" == *"compressed"* ]]; then
            backup_type="压缩"
        fi
        
        printf "%-4d %-15s %-25s %-10s %-20s\n" \
            "$counter" \
            "$backup_type" \
            "${basename_file:0:25}" \
            "$file_size" \
            "$create_time"
        
        ((counter++))
    done
    
    echo
    return 0
}

# 选择备份文件
select_backup_file() {
    local backup_files=()
    
    # 获取备份文件列表
    while IFS= read -r -d '' file; do
        backup_files+=("$file")
    done < <(find "$BACKUP_DIR" -name "*.sql" -o -name "*.dump" | sort -r | head -20 | tr '\n' '\0')
    
    if [[ ${#backup_files[@]} -eq 0 ]]; then
        log_error "没有找到备份文件"
        return 1
    fi
    
    # 让用户选择
    echo "请选择要恢复的备份文件:"
    read -p "输入序号 (1-${#backup_files[@]}): " selection
    
    # 验证选择
    if ! [[ "$selection" =~ ^[0-9]+$ ]] || [[ "$selection" -lt 1 ]] || [[ "$selection" -gt ${#backup_files[@]} ]]; then
        log_error "无效的选择: $selection"
        return 1
    fi
    
    local selected_file="${backup_files[$((selection-1))]}"
    log_info "已选择备份文件: $(basename "$selected_file")"
    echo "$selected_file"
}

# 验证备份文件
verify_backup_file() {
    local backup_file="$1"
    
    log_step "验证备份文件: $(basename "$backup_file")"
    
    # 检查文件存在性
    if [[ ! -f "$backup_file" ]]; then
        log_error "备份文件不存在: $backup_file"
        return 1
    fi
    
    # 检查文件大小
    local file_size_bytes=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file" 2>/dev/null)
    if [[ "$file_size_bytes" -lt 100 ]]; then
        log_error "备份文件异常小: $file_size_bytes bytes"
        return 1
    fi
    
    # 检查文件格式
    if [[ "$backup_file" == *.sql ]]; then
        if head -10 "$backup_file" | grep -q "PostgreSQL database dump\|CREATE\|INSERT"; then
            log_success "SQL备份文件格式验证通过"
        else
            log_error "SQL备份文件格式异常"
            return 1
        fi
    elif [[ "$backup_file" == *.dump ]]; then
        if file "$backup_file" 2>/dev/null | grep -q "PostgreSQL\|database"; then
            log_success "自定义格式备份文件验证通过"
        else
            log_warning "无法验证自定义格式备份文件，将尝试恢复"
        fi
    fi
    
    return 0
}

# 显示备份文件信息
show_backup_info() {
    local backup_file="$1"
    
    log_header "=============================================="
    log_header "           备份文件详细信息"
    log_header "=============================================="
    
    echo "文件路径: $backup_file"
    echo "文件名称: $(basename "$backup_file")"
    
    # 文件大小
    local file_size
    if command -v numfmt >/dev/null 2>&1; then
        file_size=$(stat -f%z "$backup_file" 2>/dev/null | numfmt --to=iec-i --suffix=B --format="%.1f" || echo "未知")
    else
        file_size=$(du -h "$backup_file" | cut -f1)
    fi
    echo "文件大小: $file_size"
    
    # 创建时间
    local create_time=$(stat -f%Sm "$backup_file" 2>/dev/null || stat -c%y "$backup_file" | cut -d'.' -f1)
    echo "创建时间: $create_time"
    
    # 文件权限
    echo "文件权限: $(ls -la "$backup_file" | awk '{print $1}')"
    
    # MD5校验
    local md5_hash=$(md5sum "$backup_file" 2>/dev/null | cut -d' ' -f1 || md5 -q "$backup_file" 2>/dev/null || echo "无法计算")
    echo "MD5校验: $md5_hash"
    
    # 查找对应的信息文件
    local info_file
    if [[ "$backup_file" == *.sql ]]; then
        info_file="${backup_file%.sql}_info.txt"
    elif [[ "$backup_file" == *.dump ]]; then
        info_file="${backup_file%.dump}_info.txt"
    fi
    
    if [[ -f "$info_file" ]]; then
        echo
        echo "备份信息文件内容:"
        echo "=================="
        cat "$info_file"
    fi
    
    echo
}

# =============================================================================
# 数据库备份函数 (Pre-restore Backup)
# =============================================================================

# 在恢复前创建当前数据库备份
create_pre_restore_backup() {
    log_step "创建恢复前备份..."
    
    local pre_backup_dir="$BACKUP_DIR/pre-restore"
    mkdir -p "$pre_backup_dir"
    
    local pre_backup_file="$pre_backup_dir/pre_restore_backup_${DB_NAME}_${TIMESTAMP}.sql"
    
    log_info "备份当前数据库状态到: $(basename "$pre_backup_file")"
    
    if docker exec "$DB_CONTAINER" pg_dump \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --format=plain \
        --no-tablespaces \
        --no-owner \
        --no-privileges > "$pre_backup_file"; then
        
        # 获取文件大小
        local file_size
        if command -v numfmt >/dev/null 2>&1; then
            file_size=$(stat -f%z "$pre_backup_file" 2>/dev/null | numfmt --to=iec-i --suffix=B --format="%.1f")
        else
            file_size=$(du -h "$pre_backup_file" | cut -f1)
        fi
        
        log_success "恢复前备份完成 - 大小: $file_size"
        
        # 创建信息文件
        cat > "${pre_backup_file%.sql}_info.txt" << EOF
恢复前备份信息
===================
备份时间: $(date)
备份类型: 恢复前备份
原因: 数据库恢复操作前的安全备份
数据库: $DB_NAME
备份文件: $pre_backup_file
文件大小: $file_size

恢复命令:
docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME < "$pre_backup_file"
EOF
        
        echo "$pre_backup_file"
    else
        log_error "创建恢复前备份失败"
        return 1
    fi
}

# =============================================================================
# 数据库恢复函数 (Database Restore Functions)
# =============================================================================

# 完整数据库恢复
restore_full_database() {
    local backup_file="$1"
    local target_db="${2:-$DB_NAME}"
    
    log_step "开始完整数据库恢复..."
    log_info "源文件: $(basename "$backup_file")"
    log_info "目标数据库: $target_db"
    
    # 记录开始时间
    local start_time=$(date +%s)
    log_to_file "INFO" "Full database restore started - file: $backup_file, target: $target_db"
    
    # 如果是SQL文件，直接恢复
    if [[ "$backup_file" == *.sql ]]; then
        log_info "恢复SQL格式备份..."
        
        if docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$target_db" < "$backup_file"; then
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))
            
            log_success "完整数据库恢复完成，耗时: ${duration}秒"
            log_to_file "SUCCESS" "Full database restore completed in ${duration}s"
            return 0
        else
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))
            
            log_error "完整数据库恢复失败，耗时: ${duration}秒"
            log_to_file "ERROR" "Full database restore failed after ${duration}s"
            return 1
        fi
        
    # 如果是dump文件，使用pg_restore
    elif [[ "$backup_file" == *.dump ]]; then
        log_info "恢复自定义格式备份..."
        
        # 将文件复制到容器内
        docker cp "$backup_file" "$DB_CONTAINER:/tmp/restore.dump"
        
        if docker exec "$DB_CONTAINER" pg_restore \
            -U "$DB_USER" \
            -d "$target_db" \
            --clean \
            --if-exists \
            --no-owner \
            --no-privileges \
            /tmp/restore.dump; then
            
            # 清理临时文件
            docker exec "$DB_CONTAINER" rm -f /tmp/restore.dump
            
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))
            
            log_success "完整数据库恢复完成，耗时: ${duration}秒"
            log_to_file "SUCCESS" "Full database restore completed in ${duration}s"
            return 0
        else
            # 清理临时文件
            docker exec "$DB_CONTAINER" rm -f /tmp/restore.dump
            
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))
            
            log_error "完整数据库恢复失败，耗时: ${duration}秒"
            log_to_file "ERROR" "Full database restore failed after ${duration}s"
            return 1
        fi
    else
        log_error "不支持的备份文件格式"
        return 1
    fi
}

# 仅恢复数据（保留现有结构）
restore_data_only() {
    local backup_file="$1"
    local target_db="${2:-$DB_NAME}"
    
    log_step "开始仅数据恢复..."
    log_warning "此操作将覆盖现有数据但保留表结构"
    
    if ! get_user_confirmation "确认执行仅数据恢复？"; then
        log_info "操作已取消"
        return 1
    fi
    
    # 记录开始时间
    local start_time=$(date +%s)
    log_to_file "INFO" "Data-only restore started - file: $backup_file, target: $target_db"
    
    if [[ "$backup_file" == *.sql ]]; then
        # 创建临时的仅数据SQL文件
        local temp_data_file="/tmp/data_only_restore_${TIMESTAMP}.sql"
        
        # 提取仅数据的SQL语句
        grep -E "^(INSERT|COPY)" "$backup_file" > "$temp_data_file" || {
            log_error "无法从备份文件中提取数据"
            return 1
        }
        
        if docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$target_db" < "$temp_data_file"; then
            rm -f "$temp_data_file"
            
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))
            
            log_success "仅数据恢复完成，耗时: ${duration}秒"
            log_to_file "SUCCESS" "Data-only restore completed in ${duration}s"
            return 0
        else
            rm -f "$temp_data_file"
            
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))
            
            log_error "仅数据恢复失败，耗时: ${duration}秒"
            log_to_file "ERROR" "Data-only restore failed after ${duration}s"
            return 1
        fi
        
    elif [[ "$backup_file" == *.dump ]]; then
        # 将文件复制到容器内
        docker cp "$backup_file" "$DB_CONTAINER:/tmp/restore.dump"
        
        if docker exec "$DB_CONTAINER" pg_restore \
            -U "$DB_USER" \
            -d "$target_db" \
            --data-only \
            --no-owner \
            --no-privileges \
            /tmp/restore.dump; then
            
            # 清理临时文件
            docker exec "$DB_CONTAINER" rm -f /tmp/restore.dump
            
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))
            
            log_success "仅数据恢复完成，耗时: ${duration}秒"
            log_to_file "SUCCESS" "Data-only restore completed in ${duration}s"
            return 0
        else
            # 清理临时文件
            docker exec "$DB_CONTAINER" rm -f /tmp/restore.dump
            
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))
            
            log_error "仅数据恢复失败，耗时: ${duration}秒"
            log_to_file "ERROR" "Data-only restore failed after ${duration}s"
            return 1
        fi
    else
        log_error "不支持的备份文件格式"
        return 1
    fi
}

# 恢复到新数据库
restore_to_new_database() {
    local backup_file="$1"
    local new_db_name="$2"
    
    log_step "开始恢复到新数据库: $new_db_name"
    
    # 检查新数据库名是否已存在
    local db_exists=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -lqt | cut -d\| -f1 | grep -w "$new_db_name" | wc -l | xargs)
    
    if [[ "$db_exists" -gt 0 ]]; then
        log_warning "数据库 '$new_db_name' 已存在"
        if ! get_user_confirmation "是否删除现有数据库并重新创建？"; then
            log_info "操作已取消"
            return 1
        fi
        
        # 删除现有数据库
        log_info "删除现有数据库: $new_db_name"
        docker exec "$DB_CONTAINER" psql -U "$DB_USER" -c "DROP DATABASE IF EXISTS \"$new_db_name\";"
    fi
    
    # 创建新数据库
    log_info "创建新数据库: $new_db_name"
    if ! docker exec "$DB_CONTAINER" psql -U "$DB_USER" -c "CREATE DATABASE \"$new_db_name\";"; then
        log_error "无法创建数据库: $new_db_name"
        return 1
    fi
    
    # 恢复到新数据库
    if restore_full_database "$backup_file" "$new_db_name"; then
        log_success "数据库恢复到新数据库成功: $new_db_name"
        log_to_file "SUCCESS" "Database restored to new database: $new_db_name"
        return 0
    else
        log_error "恢复到新数据库失败"
        # 清理失败的数据库
        docker exec "$DB_CONTAINER" psql -U "$DB_USER" -c "DROP DATABASE IF EXISTS \"$new_db_name\";" 2>/dev/null || true
        return 1
    fi
}

# =============================================================================
# 恢复后验证函数 (Post-restore Verification)
# =============================================================================

# 验证恢复结果
verify_restore_result() {
    local target_db="${1:-$DB_NAME}"
    
    log_step "验证恢复结果..."
    
    # 检查数据库连接
    if ! docker exec "$DB_CONTAINER" pg_isready -U "$DB_USER" -d "$target_db" &>/dev/null; then
        log_error "无法连接到恢复后的数据库"
        return 1
    fi
    
    # 获取表数量
    local table_count=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$target_db" -t -c "
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    " | xargs)
    
    # 获取数据库大小
    local db_size=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$target_db" -t -c "
        SELECT pg_size_pretty(pg_database_size('$target_db'));
    " | xargs)
    
    # 检查基本表是否存在
    local critical_tables=("users" "projects" "tasks")
    local missing_tables=()
    
    for table in "${critical_tables[@]}"; do
        local exists=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$target_db" -t -c "
            SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = '$table';
        " | xargs)
        
        if [[ "$exists" == "0" ]]; then
            missing_tables+=("$table")
        fi
    done
    
    # 显示验证结果
    log_info "数据库验证结果:"
    echo "  数据库名称: $target_db"
    echo "  表数量: $table_count"
    echo "  数据库大小: $db_size"
    
    if [[ ${#missing_tables[@]} -gt 0 ]]; then
        log_warning "缺少关键表: ${missing_tables[*]}"
        return 1
    else
        log_success "所有关键表都存在"
    fi
    
    # 简单的数据完整性检查
    log_info "执行数据完整性检查..."
    
    if docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$target_db" -c "
        SELECT 'Users: ' || COUNT(*) FROM users
        UNION ALL
        SELECT 'Projects: ' || COUNT(*) FROM projects  
        UNION ALL
        SELECT 'Tasks: ' || COUNT(*) FROM tasks;
    " 2>/dev/null; then
        log_success "数据完整性检查通过"
        return 0
    else
        log_warning "数据完整性检查出现问题"
        return 1
    fi
}

# =============================================================================
# 交互式菜单函数 (Interactive Menu Functions)
# =============================================================================

# 显示主菜单
show_main_menu() {
    log_header "=============================================="
    log_header "       数据库恢复工具 v2.0"
    log_header "=============================================="
    echo
    echo "请选择恢复操作："
    echo "  1) 列出可用备份"
    echo "  2) 完整数据库恢复（替换现有数据库）"
    echo "  3) 仅恢复数据（保留现有结构）"
    echo "  4) 恢复到新数据库"
    echo "  5) 查看备份文件详细信息"
    echo "  6) 验证备份文件"
    echo "  7) 创建当前数据库备份"
    echo "  0) 退出"
    echo
}

# 获取新数据库名称
get_new_database_name() {
    while true; do
        read -p "请输入新数据库名称: " new_db_name
        
        if [[ -z "$new_db_name" ]]; then
            log_warning "数据库名称不能为空"
            continue
        fi
        
        # 验证数据库名称格式
        if [[ ! "$new_db_name" =~ ^[a-zA-Z][a-zA-Z0-9_]*$ ]]; then
            log_warning "数据库名称格式无效（只能包含字母、数字和下划线，且以字母开头）"
            continue
        fi
        
        echo "$new_db_name"
        break
    done
}

# =============================================================================
# 主程序函数 (Main Program Functions)
# =============================================================================

# 初始化
initialize() {
    log_step "初始化恢复系统..."
    
    check_prerequisites
    check_database_connection
    
    # 创建日志目录
    mkdir -p "$RESTORE_LOGS_DIR"
    
    log_success "系统初始化完成"
    echo
}

# 主执行函数
main() {
    # 记录脚本启动
    log_to_file "INFO" "Database restore script started"
    
    initialize
    
    # 如果有命令行参数，直接执行对应操作
    if [[ $# -gt 0 ]]; then
        case "$1" in
            "list")
                list_available_backups
                ;;
            "restore")
                if [[ -z "$2" ]]; then
                    log_error "请指定备份文件路径"
                    echo "用法: $0 restore <backup_file>"
                    exit 1
                fi
                
                local backup_file="$2"
                if [[ ! -f "$backup_file" ]]; then
                    log_error "备份文件不存在: $backup_file"
                    exit 1
                fi
                
                if verify_backup_file "$backup_file"; then
                    show_backup_info "$backup_file"
                    echo
                    
                    if get_user_confirmation "确认恢复此备份文件？这将替换当前数据库内容"; then
                        # 创建恢复前备份
                        if pre_backup_file=$(create_pre_restore_backup); then
                            log_info "恢复前备份已创建: $(basename "$pre_backup_file")"
                        fi
                        
                        if restore_full_database "$backup_file"; then
                            verify_restore_result
                            log_to_file "SUCCESS" "Command line restore completed - file: $backup_file"
                        else
                            log_to_file "ERROR" "Command line restore failed - file: $backup_file"
                            exit 1
                        fi
                    else
                        log_info "恢复操作已取消"
                    fi
                else
                    exit 1
                fi
                ;;
            "verify")
                if [[ -z "$2" ]]; then
                    log_error "请指定备份文件路径"
                    echo "用法: $0 verify <backup_file>"
                    exit 1
                fi
                
                verify_backup_file "$2"
                ;;
            "backup")
                create_pre_restore_backup
                ;;
            "help"|"-h"|"--help")
                echo "数据库恢复工具 v2.0"
                echo
                echo "用法: $0 [选项]"
                echo
                echo "选项:"
                echo "  list              - 列出可用备份文件"
                echo "  restore <file>    - 恢复指定备份文件"
                echo "  verify <file>     - 验证备份文件"
                echo "  backup            - 创建当前数据库备份"
                echo "  help              - 显示此帮助"
                echo
                echo "示例:"
                echo "  $0 list"
                echo "  $0 restore ./backups/manual/backup.sql"
                echo "  $0 verify ./backups/daily/daily_backup.sql"
                ;;
            *)
                log_error "未知选项: $1"
                echo "使用 '$0 help' 查看可用选项"
                exit 1
                ;;
        esac
        return
    fi
    
    # 交互式模式
    while true; do
        show_main_menu
        read -p "请输入选择 (0-7): " choice
        echo
        
        case $choice in
            1)
                list_available_backups
                ;;
            2)
                if list_available_backups; then
                    echo
                    if backup_file=$(select_backup_file); then
                        show_backup_info "$backup_file"
                        echo
                        
                        log_warning "⚠️  完整数据库恢复将完全替换当前数据库内容"
                        if get_user_confirmation "确认执行完整数据库恢复？"; then
                            # 创建恢复前备份
                            if pre_backup_file=$(create_pre_restore_backup); then
                                log_info "恢复前备份已创建: $(basename "$pre_backup_file")"
                                echo
                            fi
                            
                            if restore_full_database "$backup_file"; then
                                verify_restore_result
                                log_to_file "SUCCESS" "Interactive full restore completed - file: $backup_file"
                            else
                                log_to_file "ERROR" "Interactive full restore failed - file: $backup_file"
                            fi
                        else
                            log_info "恢复操作已取消"
                        fi
                    fi
                fi
                ;;
            3)
                if list_available_backups; then
                    echo
                    if backup_file=$(select_backup_file); then
                        show_backup_info "$backup_file"
                        echo
                        
                        if restore_data_only "$backup_file"; then
                            verify_restore_result
                            log_to_file "SUCCESS" "Interactive data-only restore completed - file: $backup_file"
                        else
                            log_to_file "ERROR" "Interactive data-only restore failed - file: $backup_file"
                        fi
                    fi
                fi
                ;;
            4)
                if list_available_backups; then
                    echo
                    if backup_file=$(select_backup_file); then
                        show_backup_info "$backup_file"
                        echo
                        
                        new_db_name=$(get_new_database_name)
                        
                        if restore_to_new_database "$backup_file" "$new_db_name"; then
                            verify_restore_result "$new_db_name"
                            log_to_file "SUCCESS" "Interactive restore to new database completed - file: $backup_file, new_db: $new_db_name"
                        else
                            log_to_file "ERROR" "Interactive restore to new database failed - file: $backup_file, new_db: $new_db_name"
                        fi
                    fi
                fi
                ;;
            5)
                if list_available_backups; then
                    echo
                    if backup_file=$(select_backup_file); then
                        show_backup_info "$backup_file"
                    fi
                fi
                ;;
            6)
                if list_available_backups; then
                    echo
                    if backup_file=$(select_backup_file); then
                        verify_backup_file "$backup_file"
                    fi
                fi
                ;;
            7)
                if backup_file=$(create_pre_restore_backup); then
                    log_info "当前数据库备份已创建: $(basename "$backup_file")"
                    log_to_file "SUCCESS" "Manual current database backup created: $backup_file"
                else
                    log_to_file "ERROR" "Manual current database backup failed"
                fi
                ;;
            0)
                log_info "退出恢复工具"
                log_to_file "INFO" "Database restore script ended normally"
                break
                ;;
            *)
                log_warning "无效选择，请重新输入"
                ;;
        esac
        
        if [[ "$choice" != "0" ]]; then
            echo
            read -p "按 Enter 键继续..."
            echo
        fi
    done
}

# 脚本退出时的清理工作
cleanup_on_exit() {
    log_to_file "INFO" "Database restore script ended"
}

# 捕获退出信号
trap cleanup_on_exit EXIT

# 执行主程序
main "$@"