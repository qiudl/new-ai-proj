#!/bin/bash

# ===================================================================
# 计时系统数据备份和回滚脚本
# 版本: 1.0
# 日期: 2025-08-01
# 目标: 为计时系统修复提供安全的备份和回滚机制
# ===================================================================

set -e

# 配置变量
DB_CONTAINER="go_database"
DB_NAME="main_db"
DB_USER="user"
BACKUP_DIR="./backups/timer-fix-$(date +%Y%m%d_%H%M%S)"
LOG_FILE="$BACKUP_DIR/backup.log"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

# 创建备份目录
create_backup_dir() {
    log "Creating backup directory: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
    touch "$LOG_FILE"
}

# 检查Docker容器状态
check_docker_status() {
    log "Checking Docker container status..."
    if ! docker-compose ps | grep -q "$DB_CONTAINER.*Up"; then
        error "Database container is not running. Please start with: docker-compose up -d"
    fi
    success "Database container is running"
}

# 备份计时相关数据
backup_timer_data() {
    log "Starting timer system data backup..."
    
    # 备份用户计时状态
    log "Backing up users timing data..."
    docker-compose exec -T db pg_dump -U "$DB_USER" -d "$DB_NAME" \
        --table=users \
        --column-inserts \
        --data-only \
        > "$BACKUP_DIR/users_timing_backup.sql" || error "Failed to backup users data"
    
    # 备份任务数据
    log "Backing up tasks data..."
    docker-compose exec -T db pg_dump -U "$DB_USER" -d "$DB_NAME" \
        --table=tasks \
        --column-inserts \
        --data-only \
        > "$BACKUP_DIR/tasks_backup.sql" || error "Failed to backup tasks data"
    
    # 备份时间日志
    log "Backing up task_time_logs data..."
    docker-compose exec -T db pg_dump -U "$DB_USER" -d "$DB_NAME" \
        --table=task_time_logs \
        --column-inserts \
        --data-only \
        > "$BACKUP_DIR/task_time_logs_backup.sql" || error "Failed to backup time logs"
    
    # 备份关键统计信息
    log "Extracting pre-fix statistics..."
    docker-compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" -c "
        -- 备份修复前的数据统计
        COPY (
            SELECT 
                'BEFORE_FIX' as snapshot_type,
                NOW() as snapshot_time,
                COUNT(*) as total_tasks,
                COUNT(CASE WHEN total_time_seconds > 0 THEN 1 END) as tasks_with_time,
                SUM(total_time_seconds) as total_task_time_seconds
            FROM tasks
            WHERE deleted_at IS NULL
        ) TO STDOUT WITH CSV HEADER;
    " > "$BACKUP_DIR/pre_fix_task_stats.csv"
    
    docker-compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" -c "
        COPY (
            SELECT 
                'BEFORE_FIX' as snapshot_type,
                NOW() as snapshot_time,
                COUNT(*) as total_time_logs,
                SUM(duration_seconds) as total_logged_seconds,
                COUNT(DISTINCT task_id) as unique_tasks_logged,
                COUNT(DISTINCT user_id) as unique_users_logged
            FROM task_time_logs
        ) TO STDOUT WITH CSV HEADER;
    " > "$BACKUP_DIR/pre_fix_time_log_stats.csv"
    
    # 备份不一致数据详情
    log "Extracting inconsistent data details..."
    docker-compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" -c "
        COPY (
            SELECT 
                t.id as task_id,
                t.title,
                t.total_time_seconds as task_total_time,
                COALESCE(SUM(ttl.duration_seconds), 0) as logged_total_time,
                t.total_time_seconds - COALESCE(SUM(ttl.duration_seconds), 0) as difference,
                COUNT(ttl.id) as log_entries_count
            FROM tasks t
            LEFT JOIN task_time_logs ttl ON t.id = ttl.task_id
            WHERE t.deleted_at IS NULL
            GROUP BY t.id, t.title, t.total_time_seconds
            HAVING t.total_time_seconds != COALESCE(SUM(ttl.duration_seconds), 0)
            ORDER BY ABS(t.total_time_seconds - COALESCE(SUM(ttl.duration_seconds), 0)) DESC
        ) TO STDOUT WITH CSV HEADER;
    " > "$BACKUP_DIR/inconsistent_tasks_before_fix.csv"
    
    success "Timer system data backup completed"
}

# 创建结构备份
backup_schema() {
    log "Backing up database schema..."
    docker-compose exec -T db pg_dump -U "$DB_USER" -d "$DB_NAME" \
        --schema-only \
        --no-owner \
        --no-privileges \
        > "$BACKUP_DIR/schema_backup.sql" || error "Failed to backup database schema"
    success "Schema backup completed"
}

# 验证备份完整性
verify_backup() {
    log "Verifying backup integrity..."
    
    local files=(
        "users_timing_backup.sql"
        "tasks_backup.sql" 
        "task_time_logs_backup.sql"
        "schema_backup.sql"
        "pre_fix_task_stats.csv"
        "pre_fix_time_log_stats.csv"
        "inconsistent_tasks_before_fix.csv"
    )
    
    for file in "${files[@]}"; do
        if [[ ! -f "$BACKUP_DIR/$file" ]]; then
            error "Backup file missing: $file"
        fi
        
        if [[ ! -s "$BACKUP_DIR/$file" ]]; then
            warning "Backup file is empty: $file"
        fi
    done
    
    success "Backup verification completed"
}

# 创建回滚脚本
create_rollback_script() {
    log "Creating rollback script..."
    
    cat > "$BACKUP_DIR/rollback.sh" << 'EOF'
#!/bin/bash

# 自动生成的计时系统回滚脚本
# 警告: 此脚本将恢复备份时的数据状态，会丢失备份后的所有修改！

set -e

BACKUP_DIR="$(dirname "$0")"
DB_CONTAINER="go_database"
DB_NAME="main_db"
DB_USER="user"

echo "====================================="
echo "计时系统数据回滚脚本"
echo "备份时间: $(date)"
echo "====================================="

read -p "确定要回滚到备份状态吗？这将丢失备份后的所有数据修改！(yes/no): " confirm
if [[ $confirm != "yes" ]]; then
    echo "回滚操作已取消"
    exit 1
fi

echo "开始回滚操作..."

# 清空目标表
echo "清空现有数据..."
docker-compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" -c "
    TRUNCATE task_time_logs CASCADE;
    TRUNCATE TABLE tasks RESTART IDENTITY CASCADE;
    -- 注意：不完全清空users表，只重置计时状态
    UPDATE users SET 
        current_timing_task_id = NULL,
        timing_start_time = NULL,
        timing_status = 'stopped';
"

# 恢复数据
echo "恢复备份数据..."
docker-compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" < "$BACKUP_DIR/tasks_backup.sql"
docker-compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" < "$BACKUP_DIR/task_time_logs_backup.sql"

# 恢复用户计时状态（只恢复计时相关字段）
echo "恢复用户计时状态..."
# 这里需要手动处理，因为我们不想完全覆盖用户表

echo "回滚操作完成！"
echo "请验证数据一致性"
EOF

    chmod +x "$BACKUP_DIR/rollback.sh"
    success "Rollback script created at: $BACKUP_DIR/rollback.sh"
}

# 生成修复摘要
generate_fix_summary() {
    log "Generating fix summary..."
    
    cat > "$BACKUP_DIR/README.md" << EOF
# 计时系统修复备份

## 备份信息
- **备份时间**: $(date)
- **备份目录**: $BACKUP_DIR
- **修复目标**: 数据一致性问题和并发控制

## 文件说明

### 数据备份文件
- \`users_timing_backup.sql\`: 用户计时状态数据
- \`tasks_backup.sql\`: 任务数据（包含total_time_seconds）
- \`task_time_logs_backup.sql\`: 时间日志数据
- \`schema_backup.sql\`: 数据库结构备份

### 统计文件
- \`pre_fix_task_stats.csv\`: 修复前任务统计
- \`pre_fix_time_log_stats.csv\`: 修复前时间日志统计
- \`inconsistent_tasks_before_fix.csv\`: 修复前不一致任务详情

### 回滚文件
- \`rollback.sh\`: 自动回滚脚本（谨慎使用！）
- \`backup.log\`: 备份操作日志

## 使用说明

### 回滚操作
如果修复出现问题，可以使用回滚脚本：
\`\`\`bash
cd $BACKUP_DIR
./rollback.sh
\`\`\`

⚠️ **警告**: 回滚操作会丢失备份后的所有数据修改！

### 验证修复效果
修复完成后，可以对比修复前后的统计数据：
\`\`\`bash
# 查看修复前数据
cat pre_fix_task_stats.csv
cat inconsistent_tasks_before_fix.csv

# 运行相同的查询检查修复后状态
\`\`\`

## 修复步骤记录
1. 数据备份 ✓
2. 应用数据一致性修复脚本
3. 部署并发控制代码
4. 验证修复效果
5. 性能测试

## 联系信息
如有问题，请联系开发团队。
EOF

    success "Fix summary generated at: $BACKUP_DIR/README.md"
}

# 主执行函数
main() {
    echo "====================================="
    echo "计时系统修复备份脚本 v1.0"
    echo "====================================="
    
    create_backup_dir
    check_docker_status
    backup_timer_data
    backup_schema
    verify_backup
    create_rollback_script
    generate_fix_summary
    
    success "==========================================="
    success "备份操作完成！"
    success "备份位置: $BACKUP_DIR"
    success "请保存此备份，然后继续执行修复操作"
    success "==========================================="
}

# 脚本参数处理
case "${1:-}" in
    "backup")
        main
        ;;
    "verify")
        if [[ -z "${2:-}" ]]; then
            error "Usage: $0 verify <backup_dir>"
        fi
        BACKUP_DIR="$2"
        verify_backup
        ;;
    *)
        echo "Usage: $0 {backup|verify <backup_dir>}"
        echo "  backup  - 创建完整备份"
        echo "  verify  - 验证指定备份的完整性"
        exit 1
        ;;
esac