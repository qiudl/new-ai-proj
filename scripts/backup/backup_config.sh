# =============================================================================
# 数据库备份系统配置文件 (Database Backup System Configuration)
# =============================================================================
# 配置文件版本: 2.0
# 创建时间: $(date +%Y-%m-%d)
# 描述: 数据库备份系统的主要配置文件
# =============================================================================

# =============================================================================
# 基础配置 (Basic Configuration)
# =============================================================================

# Docker容器名称
DB_CONTAINER="postgres_db"

# 数据库连接配置（优先从.env文件读取）
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="main_db"
DB_USER="user"
DB_PASSWORD="password"

# =============================================================================
# 备份目录配置 (Backup Directory Configuration)
# =============================================================================

# 备份根目录
BACKUP_ROOT_DIR="./backups"

# 各类备份的子目录
BACKUP_DAILY_DIR="$BACKUP_ROOT_DIR/daily"
BACKUP_WEEKLY_DIR="$BACKUP_ROOT_DIR/weekly"
BACKUP_MONTHLY_DIR="$BACKUP_ROOT_DIR/monthly"
BACKUP_MANUAL_DIR="$BACKUP_ROOT_DIR/manual"
BACKUP_SCHEMA_DIR="$BACKUP_ROOT_DIR/schema"
BACKUP_LOGS_DIR="$BACKUP_ROOT_DIR/logs"
BACKUP_TEMP_DIR="$BACKUP_ROOT_DIR/temp"
BACKUP_PRE_RESTORE_DIR="$BACKUP_ROOT_DIR/pre-restore"

# =============================================================================
# 备份保留策略 (Backup Retention Policy)
# =============================================================================

# 各类备份的保留天数
DAILY_RETENTION_DAYS=7          # 日备份保留7天
WEEKLY_RETENTION_DAYS=30        # 周备份保留30天（约4周）
MONTHLY_RETENTION_DAYS=365      # 月备份保留365天（12个月）
MANUAL_RETENTION_DAYS=90        # 手动备份保留90天
SCHEMA_RETENTION_DAYS=180       # 结构备份保留180天
PRE_RESTORE_RETENTION_DAYS=30   # 恢复前备份保留30天

# 日志文件保留天数
LOG_RETENTION_DAYS=90

# =============================================================================
# 备份执行配置 (Backup Execution Configuration)
# =============================================================================

# 备份压缩配置
ENABLE_COMPRESSION=true          # 是否启用压缩
COMPRESSION_LEVEL=6              # 压缩级别（1-9，9为最高压缩）

# 备份验证配置
ENABLE_BACKUP_VERIFICATION=true  # 是否启用备份后验证
VERIFICATION_TIMEOUT=300         # 验证超时时间（秒）

# 并发控制
MAX_CONCURRENT_BACKUPS=1         # 最大并发备份数

# 超时设置
BACKUP_TIMEOUT=3600              # 备份操作超时时间（秒）
RESTORE_TIMEOUT=7200             # 恢复操作超时时间（秒）

# =============================================================================
# 安全配置 (Security Configuration)
# =============================================================================

# 备份文件权限
BACKUP_FILE_PERMISSIONS=640      # 备份文件权限（rw-r-----）
BACKUP_DIR_PERMISSIONS=750       # 备份目录权限（rwxr-x---）

# 安全备份选项
CREATE_PRE_RESTORE_BACKUP=true   # 恢复前是否创建安全备份
REQUIRE_CONFIRMATION=true        # 危险操作是否需要确认

# =============================================================================
# 监控和通知配置 (Monitoring and Notification Configuration)
# =============================================================================

# 监控配置
ENABLE_HEALTH_CHECK=true         # 是否启用健康检查
HEALTH_CHECK_INTERVAL=3600       # 健康检查间隔（秒）

# 磁盘空间监控
MIN_FREE_SPACE_MB=1024           # 最小可用空间（MB）
DISK_USAGE_WARNING_THRESHOLD=80  # 磁盘使用率警告阈值（%）

# 通知配置（可扩展）
ENABLE_NOTIFICATIONS=false       # 是否启用通知
NOTIFICATION_WEBHOOK_URL=""      # 通知webhook地址
NOTIFICATION_EMAIL=""            # 通知邮箱地址

# =============================================================================
# 定时任务配置 (Cron Job Configuration)
# =============================================================================

# 自动备份时间配置
# 格式：分 时 日 月 星期

# 日备份时间（默认：每天凌晨2点）
DAILY_BACKUP_CRON="0 2 * * *"

# 周备份时间（默认：每周日凌晨3点）
WEEKLY_BACKUP_CRON="0 3 * * 0"

# 月备份时间（默认：每月1号凌晨4点）
MONTHLY_BACKUP_CRON="0 4 1 * *"

# 备份清理时间（默认：每天凌晨5点）
CLEANUP_CRON="0 5 * * *"

# 健康检查时间（默认：每小时）
HEALTH_CHECK_CRON="0 * * * *"

# =============================================================================
# 高级配置 (Advanced Configuration)
# =============================================================================

# pg_dump 选项
PG_DUMP_EXTRA_OPTIONS=""         # 额外的pg_dump选项
PG_RESTORE_EXTRA_OPTIONS=""      # 额外的pg_restore选项

# 性能优化
USE_PARALLEL_JOBS=false          # 是否使用并行作业
PARALLEL_JOBS_COUNT=2            # 并行作业数量

# 备份格式配置
DEFAULT_BACKUP_FORMAT="plain"    # 默认备份格式：plain, custom, directory, tar
COMPRESSED_BACKUP_FORMAT="custom" # 压缩备份使用的格式

# 日志配置
LOG_LEVEL="INFO"                 # 日志级别：DEBUG, INFO, WARNING, ERROR
ENABLE_DETAILED_LOGGING=true     # 是否启用详细日志
LOG_ROTATION_SIZE="10M"          # 日志轮转大小

# =============================================================================
# 环境特定配置 (Environment Specific Configuration)
# =============================================================================

# 开发环境配置
if [[ "$ENVIRONMENT" == "development" ]]; then
    DAILY_RETENTION_DAYS=3
    WEEKLY_RETENTION_DAYS=14
    MONTHLY_RETENTION_DAYS=30
    ENABLE_NOTIFICATIONS=false
fi

# 生产环境配置  
if [[ "$ENVIRONMENT" == "production" ]]; then
    DAILY_RETENTION_DAYS=30
    WEEKLY_RETENTION_DAYS=90
    MONTHLY_RETENTION_DAYS=365
    ENABLE_NOTIFICATIONS=true
    REQUIRE_CONFIRMATION=true
    CREATE_PRE_RESTORE_BACKUP=true
fi

# 测试环境配置
if [[ "$ENVIRONMENT" == "testing" ]]; then
    DAILY_RETENTION_DAYS=1
    WEEKLY_RETENTION_DAYS=7
    MONTHLY_RETENTION_DAYS=30
    ENABLE_NOTIFICATIONS=false
    REQUIRE_CONFIRMATION=false
fi

# =============================================================================
# 备份策略配置 (Backup Strategy Configuration)
# =============================================================================

# 完整备份策略
FULL_BACKUP_STRATEGY="daily"     # 完整备份频率：daily, weekly, monthly

# 增量备份配置（未来扩展）
ENABLE_INCREMENTAL_BACKUP=false
INCREMENTAL_BACKUP_STRATEGY="none"

# 差异备份配置（未来扩展）
ENABLE_DIFFERENTIAL_BACKUP=false
DIFFERENTIAL_BACKUP_STRATEGY="none"

# =============================================================================
# 恢复配置 (Restore Configuration)
# =============================================================================

# 恢复验证配置
ENABLE_RESTORE_VERIFICATION=true
RESTORE_VERIFICATION_QUERIES=(
    "SELECT COUNT(*) FROM users;"
    "SELECT COUNT(*) FROM projects;"
    "SELECT COUNT(*) FROM tasks;"
)

# 恢复后操作
RUN_POST_RESTORE_SCRIPTS=false
POST_RESTORE_SCRIPT_DIR="./scripts/post-restore"

# =============================================================================
# 配置验证函数 (Configuration Validation Functions)
# =============================================================================

# 验证配置的函数
validate_backup_config() {
    local errors=()
    
    # 检查必要的配置项
    [[ -z "$DB_Container" ]] && errors+=("DB_CONTAINER未设置")
    [[ -z "$DB_NAME" ]] && errors+=("DB_NAME未设置")
    [[ -z "$DB_USER" ]] && errors+=("DB_USER未设置")
    
    # 检查保留天数配置
    [[ $DAILY_RETENTION_DAYS -lt 1 ]] && errors+=("DAILY_RETENTION_DAYS必须大于0")
    [[ $WEEKLY_RETENTION_DAYS -lt 1 ]] && errors+=("WEEKLY_RETENTION_DAYS必须大于0")
    [[ $MONTHLY_RETENTION_DAYS -lt 1 ]] && errors+=("MONTHLY_RETENTION_DAYS必须大于0")
    
    # 检查磁盘空间配置
    [[ $MIN_FREE_SPACE_MB -lt 100 ]] && errors+=("MIN_FREE_SPACE_MB建议至少100MB")
    
    if [[ ${#errors[@]} -gt 0 ]]; then
        echo "配置验证失败："
        printf "%s\n" "${errors[@]}"
        return 1
    fi
    
    return 0
}

# 显示当前配置的函数
show_backup_config() {
    echo "当前备份系统配置："
    echo "===================="
    echo "数据库容器: $DB_CONTAINER"
    echo "数据库名称: $DB_NAME"
    echo "备份根目录: $BACKUP_ROOT_DIR"
    echo "日备份保留: $DAILY_RETENTION_DAYS 天"
    echo "周备份保留: $WEEKLY_RETENTION_DAYS 天"
    echo "月备份保留: $MONTHLY_RETENTION_DAYS 天"
    echo "压缩备份: $([ "$ENABLE_COMPRESSION" = true ] && echo "启用" || echo "禁用")"
    echo "备份验证: $([ "$ENABLE_BACKUP_VERIFICATION" = true ] && echo "启用" || echo "禁用")"
    echo "通知功能: $([ "$ENABLE_NOTIFICATIONS" = true ] && echo "启用" || echo "禁用")"
    echo "最小空间: ${MIN_FREE_SPACE_MB}MB"
    echo "日志级别: $LOG_LEVEL"
}

# =============================================================================
# 配置文件结束标记
# =============================================================================

# 标记配置文件已加载
BACKUP_CONFIG_LOADED=true

echo "备份系统配置已加载 (版本: 2.0)"