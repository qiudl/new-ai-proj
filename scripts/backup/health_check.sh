#!/bin/bash

# =============================================================================
# 数据库备份系统健康检查脚本 (Database Backup System Health Check)
# =============================================================================
# 作者: 系统管理员
# 版本: 2.0  
# 创建时间: $(date +%Y-%m-%d)
# 描述: 监控和检查数据库备份系统的健康状态
# =============================================================================

set -e  # 遇到错误时停止执行

# =============================================================================
# 配置部分 (Configuration)
# =============================================================================

# 脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# 加载配置文件
if [[ -f "$SCRIPT_DIR/backup_config.sh" ]]; then
    source "$SCRIPT_DIR/backup_config.sh"
fi

# Docker容器配置
DB_CONTAINER="${DB_CONTAINER:-postgres_db}"

# 从环境文件读取配置
if [[ -f "$PROJECT_ROOT/.env" ]]; then
    export $(cat "$PROJECT_ROOT/.env" | grep -v '^#' | xargs) 2>/dev/null || true
fi

# 数据库配置
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-main_db}"
DB_USER="${DB_USER:-user}"
DB_PASSWORD="${DB_PASSWORD:-password}"

# 备份目录
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups}"
HEALTH_LOG_DIR="$BACKUP_DIR/logs"
HEALTH_LOG_FILE="$HEALTH_LOG_DIR/health_check_$(date +%Y%m).log"

# 健康检查阈值
MAX_BACKUP_AGE_HOURS=25           # 最大备份年龄（小时）
MIN_FREE_SPACE_MB=1024           # 最小可用空间（MB）  
MAX_DISK_USAGE_PERCENT=85        # 最大磁盘使用率（%）
MAX_DB_CONNECTION_COUNT=20       # 最大数据库连接数

# 时间戳
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# =============================================================================
# 工具函数 (Utility Functions)
# =============================================================================

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date +'%Y-%m-%d %H:%M:%S') - $1"
    echo "$(date +'%Y-%m-%d %H:%M:%S') [INFO] $1" >> "$HEALTH_LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date +'%Y-%m-%d %H:%M:%S') - $1"
    echo "$(date +'%Y-%m-%d %H:%M:%S') [SUCCESS] $1" >> "$HEALTH_LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date +'%Y-%m-%d %H:%M:%S') - $1"
    echo "$(date +'%Y-%m-%d %H:%M:%S') [WARNING] $1" >> "$HEALTH_LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date +'%Y-%m-%d %H:%M:%S') - $1"
    echo "$(date +'%Y-%m-%d %H:%M:%S') [ERROR] $1" >> "$HEALTH_LOG_FILE"
}

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $(date +'%Y-%m-%d %H:%M:%S') - $1"
}

log_header() {
    echo -e "${CYAN}$1${NC}"
}

# 发送通知（可扩展）
send_health_notification() {
    local level="$1"
    local title="$2"
    local message="$3"
    
    # 记录到健康检查日志
    echo "$(date +'%Y-%m-%d %H:%M:%S') [HEALTH-$level] $title: $message" >> "$HEALTH_LOG_FILE"
    
    # 这里可以添加邮件、Slack、企业微信等通知方式
    # 例如：
    # if [[ "$ENABLE_NOTIFICATIONS" == "true" ]] && [[ -n "$NOTIFICATION_WEBHOOK_URL" ]]; then
    #     curl -X POST "$NOTIFICATION_WEBHOOK_URL" \
    #          -H "Content-Type: application/json" \
    #          -d "{\"level\":\"$level\",\"title\":\"$title\",\"message\":\"$message\"}"
    # fi
}

# 获取人类可读的文件大小
get_human_readable_size() {
    local bytes="$1"
    
    if command -v numfmt >/dev/null 2>&1; then
        echo "$bytes" | numfmt --to=iec-i --suffix=B --format="%.1f"
    else
        # 简单的转换
        if [[ $bytes -lt 1024 ]]; then
            echo "${bytes}B"
        elif [[ $bytes -lt $((1024*1024)) ]]; then
            echo "$((bytes/1024))KB"
        elif [[ $bytes -lt $((1024*1024*1024)) ]]; then
            echo "$((bytes/1024/1024))MB"
        else
            echo "$((bytes/1024/1024/1024))GB"
        fi
    fi
}

# =============================================================================
# 健康检查函数 (Health Check Functions)
# =============================================================================

# 检查Docker环境
check_docker_health() {
    local issues=()
    
    log_step "检查Docker环境健康状态..."
    
    # 检查Docker服务
    if ! docker info >/dev/null 2>&1; then
        issues+=("Docker服务未运行或无法连接")
        log_error "Docker服务健康检查失败"
        return 1
    fi
    
    # 检查数据库容器
    if ! docker ps | grep -q "$DB_CONTAINER"; then
        issues+=("数据库容器 '$DB_CONTAINER' 未运行")
    else
        # 检查容器健康状态
        local health_status=$(docker inspect --format='{{.State.Health.Status}}' "$DB_CONTAINER" 2>/dev/null || echo "none")
        case "$health_status" in
            "healthy")
                log_success "数据库容器健康状态: 正常"
                ;;
            "unhealthy")
                issues+=("数据库容器健康检查失败")
                ;;
            "starting")
                log_warning "数据库容器正在启动中"
                ;;
            "none")
                log_info "数据库容器未配置健康检查"
                ;;
        esac
        
        # 检查容器资源使用
        local container_stats=$(docker stats --no-stream --format "table {{.CPUPerc}}\t{{.MemUsage}}" "$DB_CONTAINER" 2>/dev/null | tail -1)
        if [[ -n "$container_stats" ]]; then
            log_info "容器资源使用: $container_stats"
        fi
    fi
    
    if [[ ${#issues[@]} -eq 0 ]]; then
        log_success "Docker环境健康状态正常"
        return 0
    else
        for issue in "${issues[@]}"; do
            log_error "$issue"
        done
        return 1
    fi
}

# 检查数据库连接健康
check_database_health() {
    local issues=()
    
    log_step "检查数据库健康状态..."
    
    # 检查数据库连接
    if ! docker exec "$DB_CONTAINER" pg_isready -U "$DB_USER" -d "$DB_NAME" &>/dev/null; then
        issues+=("无法连接到数据库 $DB_NAME")
        log_error "数据库连接健康检查失败"
        return 1
    fi
    
    # 检查数据库版本和基本信息
    local db_version=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT version();" 2>/dev/null | head -1 | xargs || echo "未知")
    log_info "数据库版本: $db_version"
    
    # 检查数据库大小
    local db_size=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT pg_size_pretty(pg_database_size('$DB_NAME'));
    " 2>/dev/null | xargs || echo "未知")
    log_info "数据库大小: $db_size"
    
    # 检查活跃连接数
    local connection_count=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT count(*) FROM pg_stat_activity WHERE datname='$DB_NAME';
    " 2>/dev/null | xargs || echo "0")
    
    log_info "当前连接数: $connection_count"
    
    if [[ $connection_count -gt $MAX_DB_CONNECTION_COUNT ]]; then
        issues+=("数据库连接数过多: $connection_count (阈值: $MAX_DB_CONNECTION_COUNT)")
    fi
    
    # 检查表的健康状态
    local table_count=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    " 2>/dev/null | xargs || echo "0")
    
    log_info "数据库表数量: $table_count"
    
    # 检查关键表是否存在
    local critical_tables=("users" "projects" "tasks")
    for table in "${critical_tables[@]}"; do
        local exists=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "
            SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = '$table';
        " 2>/dev/null | xargs || echo "0")
        
        if [[ "$exists" == "0" ]]; then
            issues+=("关键表 '$table' 不存在")
        fi
    done
    
    # 检查数据库锁情况
    local lock_count=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT count(*) FROM pg_locks WHERE NOT granted;
    " 2>/dev/null | xargs || echo "0")
    
    if [[ $lock_count -gt 0 ]]; then
        issues+=("发现 $lock_count 个未授予的数据库锁")
    fi
    
    if [[ ${#issues[@]} -eq 0 ]]; then
        log_success "数据库健康状态正常"
        return 0
    else  
        for issue in "${issues[@]}"; do
            log_warning "$issue"
        done
        return 1
    fi
}

# 检查备份文件健康
check_backup_files_health() {
    local issues=()
    
    log_step "检查备份文件健康状态..."
    
    # 检查备份目录
    if [[ ! -d "$BACKUP_DIR" ]]; then
        issues+=("备份目录不存在: $BACKUP_DIR")
        log_error "备份目录健康检查失败"
        return 1
    fi
    
    # 检查备份目录权限
    if [[ ! -w "$BACKUP_DIR" ]]; then
        issues+=("备份目录无写权限: $BACKUP_DIR")
    fi
    
    # 检查最近的备份文件
    local recent_backup=$(find "$BACKUP_DIR" -name "*.sql" -o -name "*.dump" | xargs ls -t 2>/dev/null | head -1)
    
    if [[ -z "$recent_backup" ]]; then
        issues+=("没有找到任何备份文件")
    else
        # 检查最近备份的年龄
        local backup_age_hours
        if command -v stat >/dev/null 2>&1; then
            local backup_timestamp=$(stat -f%m "$recent_backup" 2>/dev/null || stat -c%Y "$recent_backup" 2>/dev/null)
            local current_timestamp=$(date +%s)
            backup_age_hours=$(( (current_timestamp - backup_timestamp) / 3600 ))
        else
            backup_age_hours=0
        fi
        
        log_info "最近备份: $(basename "$recent_backup") (${backup_age_hours}小时前)"
        
        if [[ $backup_age_hours -gt $MAX_BACKUP_AGE_HOURS ]]; then
            issues+=("最近备份过于陈旧: ${backup_age_hours}小时前 (阈值: ${MAX_BACKUP_AGE_HOURS}小时)")
        fi
        
        # 检查最近备份文件的完整性
        if [[ "$recent_backup" == *.sql ]]; then
            if head -5 "$recent_backup" | grep -q "PostgreSQL database dump"; then
                log_success "最近备份文件格式正常"
            else
                issues+=("最近备份文件格式可能损坏")
            fi
        fi
    fi
    
    # 统计各类备份文件数量
    local daily_count=$(find "$BACKUP_DIR/daily" -name "*.sql" -o -name "*.dump" 2>/dev/null | wc -l | xargs)
    local weekly_count=$(find "$BACKUP_DIR/weekly" -name "*.sql" -o -name "*.dump" 2>/dev/null | wc -l | xargs)
    local monthly_count=$(find "$BACKUP_DIR/monthly" -name "*.sql" -o -name "*.dump" 2>/dev/null | wc -l | xargs)
    
    log_info "备份文件统计 - 日备份: $daily_count, 周备份: $weekly_count, 月备份: $monthly_count"
    
    # 检查备份策略是否正常执行
    if [[ $daily_count -eq 0 ]]; then
        issues+=("没有日备份文件")
    fi
    
    if [[ ${#issues[@]} -eq 0 ]]; then
        log_success "备份文件健康状态正常"
        return 0
    else
        for issue in "${issues[@]}"; do
            log_warning "$issue"
        done
        return 1
    fi
}

# 检查磁盘空间健康
check_disk_space_health() {
    local issues=()
    
    log_step "检查磁盘空间健康状态..."
    
    # 检查备份目录所在磁盘的可用空间
    if command -v df >/dev/null 2>&1; then
        local disk_info=$(df "$BACKUP_DIR" | tail -1)
        local total_kb=$(echo "$disk_info" | awk '{print $2}')
        local used_kb=$(echo "$disk_info" | awk '{print $3}')
        local available_kb=$(echo "$disk_info" | awk '{print $4}')
        local usage_percent=$(echo "$disk_info" | awk '{print $5}' | sed 's/%//')
        
        local available_mb=$((available_kb / 1024))
        local total_mb=$((total_kb / 1024))
        local used_mb=$((used_kb / 1024))
        
        log_info "磁盘空间状况:"
        log_info "  总空间: $(get_human_readable_size $((total_mb * 1024 * 1024)))"
        log_info "  已使用: $(get_human_readable_size $((used_mb * 1024 * 1024))) (${usage_percent}%)"
        log_info "  可用空间: $(get_human_readable_size $((available_mb * 1024 * 1024)))"
        
        # 检查可用空间是否足够
        if [[ $available_mb -lt $MIN_FREE_SPACE_MB ]]; then
            issues+=("可用磁盘空间不足: ${available_mb}MB (阈值: ${MIN_FREE_SPACE_MB}MB)")
        fi
        
        # 检查磁盘使用率
        if [[ $usage_percent -gt $MAX_DISK_USAGE_PERCENT ]]; then
            issues+=("磁盘使用率过高: ${usage_percent}% (阈值: ${MAX_DISK_USAGE_PERCENT}%)")
        fi
    else
        log_warning "无法获取磁盘空间信息（df命令不可用）"
    fi
    
    # 检查备份目录大小
    if command -v du >/dev/null 2>&1; then
        local backup_size_mb=$(du -sm "$BACKUP_DIR" 2>/dev/null | cut -f1 || echo "0")
        log_info "备份目录总大小: $(get_human_readable_size $((backup_size_mb * 1024 * 1024)))"
        
        # 检查各子目录大小
        for subdir in daily weekly monthly manual schema logs; do
            local subdir_path="$BACKUP_DIR/$subdir"
            if [[ -d "$subdir_path" ]]; then
                local subdir_size_mb=$(du -sm "$subdir_path" 2>/dev/null | cut -f1 || echo "0")
                log_info "  $subdir: $(get_human_readable_size $((subdir_size_mb * 1024 * 1024)))"
            fi
        done
    fi
    
    if [[ ${#issues[@]} -eq 0 ]]; then
        log_success "磁盘空间健康状态正常"
        return 0
    else
        for issue in "${issues[@]}"; do
            log_error "$issue"
        done
        return 1
    fi
}

# 检查定时任务健康
check_cron_jobs_health() {
    local issues=()
    
    log_step "检查定时任务健康状态..."
    
    # 检查crontab是否存在备份相关任务
    local cron_content=$(crontab -l 2>/dev/null || echo "")
    
    if [[ -z "$cron_content" ]]; then
        issues+=("当前用户没有设置任何定时任务")
    else
        # 检查各类备份任务
        local backup_jobs=("daily" "weekly" "monthly" "rotation")
        local missing_jobs=()
        
        for job in "${backup_jobs[@]}"; do
            if ! echo "$cron_content" | grep -q "$job"; then
                missing_jobs+=("$job")
            fi
        done
        
        if [[ ${#missing_jobs[@]} -gt 0 ]]; then
            issues+=("缺少定时任务: ${missing_jobs[*]}")
        else
            log_success "所有备份定时任务都已配置"
        fi
        
        # 检查定时任务格式
        local backup_cron_lines=$(echo "$cron_content" | grep -E "(backup|daily|weekly|monthly)")
        if [[ -n "$backup_cron_lines" ]]; then
            log_info "当前备份定时任务:"
            echo "$backup_cron_lines" | while read -r line; do
                log_info "  $line"
            done
        fi
    fi
    
    # 检查定时任务日志
    local cron_log_files=(
        "$BACKUP_DIR/logs/daily_backup.log"
        "$BACKUP_DIR/logs/weekly_backup.log"
        "$BACKUP_DIR/logs/monthly_backup.log"
        "$BACKUP_DIR/logs/cleanup_backup.log"
    )
    
    for log_file in "${cron_log_files[@]}"; do
        if [[ -f "$log_file" ]]; then
            local last_run=$(tail -1 "$log_file" 2>/dev/null | grep -o "[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\} [0-9]\{2\}:[0-9]\{2\}:[0-9]\{2\}" | head -1)
            if [[ -n "$last_run" ]]; then
                log_info "$(basename "$log_file" .log) 最后执行: $last_run"
            fi
        fi
    done
    
    if [[ ${#issues[@]} -eq 0 ]]; then
        log_success "定时任务健康状态正常"
        return 0
    else
        for issue in "${issues[@]}"; do
            log_warning "$issue"
        done
        return 1
    fi
}

# 检查脚本文件健康
check_scripts_health() {
    local issues=()
    
    log_step "检查备份脚本健康状态..."
    
    # 检查关键脚本文件
    local critical_scripts=(
        "$SCRIPT_DIR/manual_backup.sh"
        "$SCRIPT_DIR/auto_backup.sh" 
        "$SCRIPT_DIR/restore.sh"
        "$SCRIPT_DIR/setup_cron.sh"
    )
    
    for script in "${critical_scripts[@]}"; do
        local script_name=$(basename "$script")
        
        if [[ ! -f "$script" ]]; then
            issues+=("脚本文件不存在: $script_name")
        else
            # 检查执行权限
            if [[ ! -x "$script" ]]; then
                issues+=("脚本文件无执行权限: $script_name")
            fi
            
            # 检查脚本语法（简单检查）
            if ! bash -n "$script" 2>/dev/null; then
                issues+=("脚本语法错误: $script_name")
            fi
            
            log_info "脚本 $script_name: 正常"
        fi
    done
    
    if [[ ${#issues[@]} -eq 0 ]]; then
        log_success "备份脚本健康状态正常"
        return 0
    else
        for issue in "${issues[@]}"; do
            log_error "$issue"
        done
        return 1
    fi
}

# =============================================================================
# 综合健康检查函数 (Comprehensive Health Check)
# =============================================================================

# 执行完整的健康检查
perform_comprehensive_health_check() {
    local overall_status=0
    
    log_header "=============================================="
    log_header "     数据库备份系统综合健康检查"
    log_header "=============================================="
    log_info "开始时间: $(date)"
    echo
    
    # 创建健康检查日志目录
    mkdir -p "$HEALTH_LOG_DIR"
    
    # 各项健康检查
    local checks=(
        "check_docker_health:Docker环境"
        "check_database_health:数据库系统"
        "check_backup_files_health:备份文件"
        "check_disk_space_health:磁盘空间"
        "check_cron_jobs_health:定时任务"
        "check_scripts_health:脚本文件"
    )
    
    local passed=0
    local failed=0
    local warnings=0
    
    for check_item in "${checks[@]}"; do
        local check_func=$(echo "$check_item" | cut -d: -f1)
        local check_name=$(echo "$check_item" | cut -d: -f2)
        
        echo
        if $check_func; then
            ((passed++))
        else
            ((failed++))
            overall_status=1
        fi
    done
    
    # 生成健康检查报告
    echo
    log_header "=============================================="
    log_header "           健康检查结果摘要"
    log_header "=============================================="
    
    log_info "检查项目总数: ${#checks[@]}"
    log_success "通过项目: $passed"
    if [[ $failed -gt 0 ]]; then
        log_error "失败项目: $failed"
    fi
    
    # 评估整体健康状态
    if [[ $overall_status -eq 0 ]]; then
        log_success "✅ 数据库备份系统整体健康状态: 良好"
        send_health_notification "SUCCESS" "健康检查通过" "所有检查项目都正常"
    else
        log_warning "⚠️  数据库备份系统整体健康状态: 存在问题"
        send_health_notification "WARNING" "健康检查发现问题" "发现 $failed 个问题需要处理"
    fi
    
    log_info "完成时间: $(date)"
    log_info "详细日志: $HEALTH_LOG_FILE"
    
    return $overall_status
}

# 生成健康报告
generate_health_report() {
    local report_file="$BACKUP_DIR/logs/health_report_$(date +%Y%m%d_%H%M%S).md"
    
    log_step "生成健康检查报告..."
    
    cat > "$report_file" << EOF
# 数据库备份系统健康检查报告

## 基本信息
- **检查时间**: $(date)
- **系统**: $(uname -s) $(uname -r)
- **项目路径**: $PROJECT_ROOT
- **数据库容器**: $DB_CONTAINER
- **数据库名称**: $DB_NAME

## 检查结果概览

### Docker环境
EOF

    # 添加Docker检查结果
    if check_docker_health >/dev/null 2>&1; then
        echo "- ✅ Docker环境正常" >> "$report_file"
    else
        echo "- ❌ Docker环境存在问题" >> "$report_file"
    fi
    
    # 添加数据库检查结果
    echo >> "$report_file"
    echo "### 数据库系统" >> "$report_file"
    if check_database_health >/dev/null 2>&1; then
        echo "- ✅ 数据库系统正常" >> "$report_file"
    else
        echo "- ❌ 数据库系统存在问题" >> "$report_file"
    fi
    
    # 添加备份文件检查结果
    echo >> "$report_file"
    echo "### 备份文件" >> "$report_file"
    if check_backup_files_health >/dev/null 2>&1; then
        echo "- ✅ 备份文件状态正常" >> "$report_file"
    else
        echo "- ❌ 备份文件存在问题" >> "$report_file"
    fi
    
    # 添加磁盘空间检查结果
    echo >> "$report_file"
    echo "### 磁盘空间" >> "$report_file"
    if check_disk_space_health >/dev/null 2>&1; then
        echo "- ✅ 磁盘空间充足" >> "$report_file"
    else
        echo "- ❌ 磁盘空间不足" >> "$report_file"
    fi
    
    # 添加定时任务检查结果
    echo >> "$report_file"
    echo "### 定时任务" >> "$report_file"
    if check_cron_jobs_health >/dev/null 2>&1; then
        echo "- ✅ 定时任务配置正常" >> "$report_file"
    else
        echo "- ❌ 定时任务配置存在问题" >> "$report_file"
    fi
    
    # 添加脚本文件检查结果
    echo >> "$report_file"
    echo "### 脚本文件" >> "$report_file"
    if check_scripts_health >/dev/null 2>&1; then
        echo "- ✅ 脚本文件状态正常" >> "$report_file"
    else
        echo "- ❌ 脚本文件存在问题" >> "$report_file"
    fi
    
    # 添加详细信息
    cat >> "$report_file" << EOF

## 详细信息

### 系统资源
- **CPU负载**: $(uptime | awk -F'load average:' '{print $2}' | xargs)
- **内存使用**: $(free -h 2>/dev/null | grep Mem | awk '{print $3"/"$2}' || echo "未知")

### 备份统计
EOF

    # 添加备份统计信息
    local daily_count=$(find "$BACKUP_DIR/daily" -name "*.sql" -o -name "*.dump" 2>/dev/null | wc -l | xargs)
    local weekly_count=$(find "$BACKUP_DIR/weekly" -name "*.sql" -o -name "*.dump" 2>/dev/null | wc -l | xargs)
    local monthly_count=$(find "$BACKUP_DIR/monthly" -name "*.sql" -o -name "*.dump" 2>/dev/null | wc -l | xargs)
    
    echo "- **日备份**: $daily_count 个文件" >> "$report_file"
    echo "- **周备份**: $weekly_count 个文件" >> "$report_file"  
    echo "- **月备份**: $monthly_count 个文件" >> "$report_file"
    
    # 添加最近备份信息
    local recent_backup=$(find "$BACKUP_DIR" -name "*.sql" -o -name "*.dump" | xargs ls -t 2>/dev/null | head -1)
    if [[ -n "$recent_backup" ]]; then
        local backup_time=$(stat -f%Sm "$recent_backup" 2>/dev/null || stat -c%y "$recent_backup" | cut -d'.' -f1)
        echo "- **最近备份**: $(basename "$recent_backup") ($backup_time)" >> "$report_file"
    fi
    
    cat >> "$report_file" << EOF

## 建议措施

### 如果发现问题
1. 检查Docker服务状态: \`docker info\`
2. 检查数据库连接: \`docker exec $DB_CONTAINER pg_isready -U $DB_USER -d $DB_NAME\`
3. 检查磁盘空间: \`df -h $BACKUP_DIR\`
4. 检查定时任务: \`crontab -l\`
5. 查看详细日志: \`$HEALTH_LOG_FILE\`

### 定期维护
- 每周检查一次健康状态
- 每月清理旧的日志文件
- 定期测试备份恢复功能
- 监控磁盘空间使用情况

---
报告生成时间: $(date)
报告文件: $report_file
EOF

    log_success "健康检查报告已生成: $report_file"
    echo "$report_file"
}

# =============================================================================
# 主程序函数 (Main Program Functions)
# =============================================================================

# 显示帮助信息
show_help() {
    echo "数据库备份系统健康检查工具 v2.0"
    echo
    echo "用法: $0 [选项]"
    echo
    echo "选项:"
    echo "  check       - 执行完整健康检查"
    echo "  docker      - 仅检查Docker环境"
    echo "  database    - 仅检查数据库健康"
    echo "  backups     - 仅检查备份文件"
    echo "  disk        - 仅检查磁盘空间"
    echo "  cron        - 仅检查定时任务"
    echo "  scripts     - 仅检查脚本文件"
    echo "  report      - 生成健康检查报告"
    echo "  help        - 显示此帮助信息"
    echo
    echo "示例:"
    echo "  $0 check      # 执行完整健康检查"
    echo "  $0 docker     # 仅检查Docker环境"
    echo "  $0 report     # 生成详细报告"
}

# 主执行函数
main() {
    local action="${1:-check}"
    
    # 记录脚本启动
    mkdir -p "$HEALTH_LOG_DIR"
    log_info "Health check script started - action: $action"
    
    case "$action" in
        "check")
            perform_comprehensive_health_check
            ;;
        "docker")
            check_docker_health
            ;;
        "database")
            check_database_health
            ;;
        "backups")
            check_backup_files_health
            ;;
        "disk")
            check_disk_space_health
            ;;
        "cron")
            check_cron_jobs_health
            ;;
        "scripts")
            check_scripts_health
            ;;
        "report")
            perform_comprehensive_health_check >/dev/null
            generate_health_report
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            log_error "未知选项: $action"
            echo "使用 '$0 help' 查看可用选项"
            exit 1
            ;;
    esac
    
    log_info "Health check script completed"
}

# 执行主程序
main "$@"