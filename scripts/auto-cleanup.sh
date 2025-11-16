#!/bin/bash
#########################################
# 自动清理脚本
# 功能: 清理Docker无用镜像和旧releases目录
# 作者: Claude Code
# 日期: 2025-11-15
# 建议: 每周日凌晨2点执行
#########################################

set -euo pipefail

# 配置
KEEP_RELEASES=3  # 保留最近N个release
PROJECT_DIR="/opt/ai-project"
LOG_FILE="/opt/ai-project/logs/auto-cleanup.log"

# 颜色输出
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log() {
    echo -e "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log_section() {
    log "${BLUE}========================================${NC}"
    log "${BLUE}$1${NC}"
    log "${BLUE}========================================${NC}"
}

# 检查磁盘空间
check_disk_before() {
    log_section "清理前磁盘状态"
    DISK_BEFORE=$(df -h / | awk 'NR==2 {print $3 " used of " $2 " (" $5 ")"}')
    log "磁盘使用: $DISK_BEFORE"
}

check_disk_after() {
    log_section "清理后磁盘状态"
    DISK_AFTER=$(df -h / | awk 'NR==2 {print $3 " used of " $2 " (" $5 ")"}')
    log "磁盘使用: $DISK_AFTER"

    # 计算释放的空间
    BEFORE_KB=$(df / | awk 'NR==2 {print $3}')
    AFTER_KB=$(df / | awk 'NR==2 {print $3}')
    FREED_KB=$((BEFORE_KB - AFTER_KB))
    FREED_MB=$((FREED_KB / 1024))

    if [ $FREED_MB -gt 0 ]; then
        log "${GREEN}✓ 释放空间: ${FREED_MB}MB${NC}"
    else
        log "${YELLOW}⚠ 未释放空间${NC}"
    fi
}

# 清理Docker镜像
cleanup_docker() {
    log_section "清理Docker无用镜像"

    # 检查Docker是否运行
    if ! docker info > /dev/null 2>&1; then
        log "${RED}✗ Docker未运行,跳过Docker清理${NC}"
        return 1
    fi

    # 显示清理前的镜像数量
    IMAGES_BEFORE=$(docker images -q | wc -l)
    log "清理前镜像数量: $IMAGES_BEFORE"

    # 清理未使用的镜像、容器、网络和卷
    log "${YELLOW}开始清理Docker资源...${NC}"

    # 清理停止的容器
    STOPPED_CONTAINERS=$(docker ps -aq -f status=exited | wc -l)
    if [ "$STOPPED_CONTAINERS" -gt 0 ]; then
        docker container prune -f 2>&1 | tee -a "$LOG_FILE"
        log "${GREEN}✓ 清理了 $STOPPED_CONTAINERS 个已停止的容器${NC}"
    fi

    # 清理无用镜像
    docker image prune -af 2>&1 | tee -a "$LOG_FILE"

    # 清理无用卷(谨慎:不包含--volumes标志以避免删除重要数据)
    docker system prune -f 2>&1 | tee -a "$LOG_FILE"

    # 显示清理后的镜像数量
    IMAGES_AFTER=$(docker images -q | wc -l)
    IMAGES_REMOVED=$((IMAGES_BEFORE - IMAGES_AFTER))
    log "清理后镜像数量: $IMAGES_AFTER"
    log "${GREEN}✓ 删除了 $IMAGES_REMOVED 个镜像${NC}"
}

# 清理旧的releases
cleanup_releases() {
    log_section "清理旧的Releases目录"

    RELEASES_DIR="$PROJECT_DIR/releases"

    if [ ! -d "$RELEASES_DIR" ]; then
        log "${YELLOW}⚠ Releases目录不存在: $RELEASES_DIR${NC}"
        return 1
    fi

    # 统计清理前的release数量
    RELEASES_BEFORE=$(ls -1 "$RELEASES_DIR" | wc -l)
    log "清理前release数量: $RELEASES_BEFORE"

    # 保留最近的N个release,删除其余的
    OLD_RELEASES=$(ls -t "$RELEASES_DIR" | tail -n +$((KEEP_RELEASES + 1)))

    if [ -z "$OLD_RELEASES" ]; then
        log "${GREEN}✓ 无需清理,当前仅有 $RELEASES_BEFORE 个release (保留策略: $KEEP_RELEASES)${NC}"
        return 0
    fi

    # 删除旧releases
    REMOVED_COUNT=0
    while IFS= read -r release; do
        RELEASE_PATH="$RELEASES_DIR/$release"
        RELEASE_SIZE=$(du -sh "$RELEASE_PATH" | cut -f1)

        log "${YELLOW}删除旧release: $release (大小: $RELEASE_SIZE)${NC}"
        rm -rf "$RELEASE_PATH"
        REMOVED_COUNT=$((REMOVED_COUNT + 1))
    done <<< "$OLD_RELEASES"

    log "${GREEN}✓ 删除了 $REMOVED_COUNT 个旧release,保留最近 $KEEP_RELEASES 个${NC}"

    # 显示保留的releases
    log "保留的releases:"
    ls -lt "$RELEASES_DIR" | head -n $((KEEP_RELEASES + 1)) | tail -n +2 | tee -a "$LOG_FILE"
}

# 清理旧的备份
cleanup_backups() {
    log_section "清理旧的备份文件"

    BACKUP_DIR="$PROJECT_DIR"

    # 保留最近2个备份
    OLD_BACKUPS=$(ls -t "$BACKUP_DIR" | grep "^backup-" | tail -n +3)

    if [ -z "$OLD_BACKUPS" ]; then
        log "${GREEN}✓ 无需清理备份文件${NC}"
        return 0
    fi

    REMOVED_COUNT=0
    while IFS= read -r backup; do
        BACKUP_PATH="$BACKUP_DIR/$backup"
        if [ -d "$BACKUP_PATH" ]; then
            BACKUP_SIZE=$(du -sh "$BACKUP_PATH" | cut -f1)
            log "${YELLOW}删除旧备份: $backup (大小: $BACKUP_SIZE)${NC}"
            rm -rf "$BACKUP_PATH"
            REMOVED_COUNT=$((REMOVED_COUNT + 1))
        fi
    done <<< "$OLD_BACKUPS"

    if [ $REMOVED_COUNT -gt 0 ]; then
        log "${GREEN}✓ 删除了 $REMOVED_COUNT 个旧备份${NC}"
    fi
}

# 清理日志文件(可选)
cleanup_logs() {
    log_section "清理旧日志文件"

    # 清理超过30天的日志
    find /var/log -name "*.log" -type f -mtime +30 -size +100M 2>/dev/null | while read -r logfile; do
        LOG_SIZE=$(du -sh "$logfile" | cut -f1)
        log "${YELLOW}压缩旧日志: $logfile (大小: $LOG_SIZE)${NC}"
        gzip "$logfile" 2>&1 | tee -a "$LOG_FILE" || true
    done

    log "${GREEN}✓ 日志清理完成${NC}"
}

# 主函数
main() {
    log_section "开始自动清理任务"
    log "执行策略: 保留最近 $KEEP_RELEASES 个release"

    # 记录清理前磁盘状态
    DISK_BEFORE_KB=$(df / | awk 'NR==2 {print $3}')
    check_disk_before

    # 执行清理任务
    cleanup_docker
    cleanup_releases
    cleanup_backups
    cleanup_logs

    # 记录清理后磁盘状态
    DISK_AFTER_KB=$(df / | awk 'NR==2 {print $3}')
    check_disk_after

    # 计算实际释放的空间
    FREED_KB=$((DISK_BEFORE_KB - DISK_AFTER_KB))
    FREED_MB=$((FREED_KB / 1024))
    FREED_GB=$((FREED_MB / 1024))

    log_section "清理任务完成"
    if [ $FREED_GB -gt 0 ]; then
        log "${GREEN}✅ 总共释放空间: ${FREED_GB}GB (${FREED_MB}MB)${NC}"
    elif [ $FREED_MB -gt 0 ]; then
        log "${GREEN}✅ 总共释放空间: ${FREED_MB}MB${NC}"
    else
        log "${YELLOW}⚠ 本次清理未释放明显空间${NC}"
    fi

    log "日志文件: $LOG_FILE"
}

# 执行主函数
main
