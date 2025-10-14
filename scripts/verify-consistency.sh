#!/bin/bash
# PostgreSQL主从数据一致性验证脚本
# 功能: 定期验证主从数据一致性,检测数据差异

set -e

# 配置参数
MASTER_HOST="152.136.104.251"
MASTER_USER="ubuntu"
MASTER_PORT=15433  # 通过SSH隧道
SLAVE_CONTAINER="ai_postgres_slave"
SLAVE_PORT=5433
DB_NAME="new_ai_proj_prod"
DB_USER="app_user"

# 日志文件
LOG_DIR="/Users/johnqiu/coding/www/projects/new-ai-proj/logs"
LOG_FILE="$LOG_DIR/consistency-check.log"
DIFF_FILE="$LOG_DIR/data-diff-$(date +%Y%m%d_%H%M%S).log"

mkdir -p "$LOG_DIR"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARN:${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO:${NC} $1" | tee -a "$LOG_FILE"
}

# 获取主库表行数
get_master_count() {
    local table=$1
    docker run --rm --network host postgres:16 psql \
        "postgresql://$DB_USER:secure_password_here@127.0.0.1:$MASTER_PORT/$DB_NAME?sslmode=disable" \
        -t -A -c "SELECT count(*) FROM $table;" 2>/dev/null || echo "0"
}

# 获取从库表行数
get_slave_count() {
    local table=$1
    docker exec $SLAVE_CONTAINER psql -U $DB_USER -d $DB_NAME \
        -t -A -c "SELECT count(*) FROM $table;" 2>/dev/null || echo "0"
}

# 获取主库表校验和
get_master_checksum() {
    local table=$1
    docker run --rm --network host postgres:16 psql \
        "postgresql://$DB_USER:secure_password_here@127.0.0.1:$MASTER_PORT/$DB_NAME?sslmode=disable" \
        -t -A -c "SELECT md5(string_agg(md5(t::text), '' ORDER BY ctid)) FROM $table t;" 2>/dev/null || echo ""
}

# 获取从库表校验和
get_slave_checksum() {
    local table=$1
    docker exec $SLAVE_CONTAINER psql -U $DB_USER -d $DB_NAME \
        -t -A -c "SELECT md5(string_agg(md5(t::text), '' ORDER BY ctid)) FROM $table t;" 2>/dev/null || echo ""
}

# 获取所有表名
get_all_tables() {
    docker run --rm --network host postgres:16 psql \
        "postgresql://$DB_USER:secure_password_here@127.0.0.1:$MASTER_PORT/$DB_NAME?sslmode=disable" \
        -t -A -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;" 2>/dev/null
}

# 验证单个表
verify_table() {
    local table=$1

    info "检查表: $table"

    # 1. 检查行数
    local master_count=$(get_master_count "$table")
    local slave_count=$(get_slave_count "$table")

    if [ "$master_count" != "$slave_count" ]; then
        warn "  ⚠️  行数不一致: 主库=$master_count, 从库=$slave_count" | tee -a "$DIFF_FILE"
        return 1
    else
        info "  ✅ 行数一致: $master_count 行"
    fi

    # 2. 检查校验和(仅当行数一致时)
    if [ "$master_count" != "0" ]; then
        local master_checksum=$(get_master_checksum "$table")
        local slave_checksum=$(get_slave_checksum "$table")

        if [ "$master_checksum" != "$slave_checksum" ]; then
            warn "  ⚠️  数据校验和不一致" | tee -a "$DIFF_FILE"
            warn "     主库: $master_checksum" | tee -a "$DIFF_FILE"
            warn "     从库: $slave_checksum" | tee -a "$DIFF_FILE"
            return 1
        else
            info "  ✅ 数据校验和一致"
        fi
    fi

    return 0
}

# 验证所有表
verify_all_tables() {
    log "========== 开始数据一致性验证 =========="

    local tables=$(get_all_tables)
    local total=0
    local success=0
    local failed=0

    if [ -z "$tables" ]; then
        error "无法获取表列表"
        return 1
    fi

    echo "检查到的表:" | tee -a "$DIFF_FILE"
    echo "$tables" | tee -a "$DIFF_FILE"
    echo "" | tee -a "$DIFF_FILE"

    for table in $tables; do
        ((total++))
        if verify_table "$table"; then
            ((success++))
        else
            ((failed++))
        fi
        echo "" | tee -a "$LOG_FILE"
    done

    log "========== 验证完成 =========="
    log "总表数: $total"
    log "一致: $success"
    log "不一致: $failed"

    if [ $failed -gt 0 ]; then
        error "发现 $failed 个表存在数据差异,详情见: $DIFF_FILE"

        # 发送系统通知
        osascript -e "display notification \"发现 $failed 个表数据不一致\" with title \"数据一致性告警\"" 2>/dev/null || true

        return 1
    else
        log "✅ 所有表数据一致"
        return 0
    fi
}

# 快速检查(仅检查关键表)
quick_check() {
    log "========== 快速一致性检查 =========="

    # 定义关键表
    local key_tables=(
        "users"
        "tasks"
        "projects"
        "documents"
    )

    local failed=0

    for table in "${key_tables[@]}"; do
        if ! verify_table "$table"; then
            ((failed++))
        fi
        echo "" | tee -a "$LOG_FILE"
    done

    if [ $failed -gt 0 ]; then
        error "快速检查发现 $failed 个关键表存在差异"
        return 1
    else
        log "✅ 关键表数据一致"
        return 0
    fi
}

# 显示最近差异
show_diff() {
    local diff_files=$(ls -t "$LOG_DIR"/data-diff-*.log 2>/dev/null | head -5)

    if [ -z "$diff_files" ]; then
        echo "暂无差异记录"
        return
    fi

    echo "最近的差异记录:"
    for file in $diff_files; do
        echo ""
        echo "文件: $file"
        echo "---"
        cat "$file"
    done
}

# 定时验证(后台运行)
schedule_verify() {
    local interval=${1:-3600}  # 默认1小时

    log "启动定时验证 (间隔: ${interval}秒)"

    while true; do
        verify_all_tables
        sleep $interval
    done
}

# 主程序
case "${1:-full}" in
    full)
        verify_all_tables
        ;;
    quick)
        quick_check
        ;;
    diff)
        show_diff
        ;;
    schedule)
        schedule_verify "${2:-3600}"
        ;;
    *)
        echo "用法: $0 {full|quick|diff|schedule [间隔秒数]}"
        echo ""
        echo "命令说明:"
        echo "  full     - 完整验证所有表"
        echo "  quick    - 快速验证关键表"
        echo "  diff     - 查看最近差异记录"
        echo "  schedule - 定时验证(默认1小时)"
        exit 1
        ;;
esac

exit $?
