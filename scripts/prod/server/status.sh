#!/bin/bash
# status.sh - 服务状态面板
# 用法: ./status.sh

DEPLOY_DIR="/opt/ai-project"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# 清屏
clear

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                   AI Project 服务状态面板                      ║"
echo "║                   $(date '+%Y-%m-%d %H:%M:%S')                       ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 系统信息
echo -e "${MAGENTA}═══ 系统信息 ═══${NC}"
echo -e "  主机名:    $(hostname)"
echo -e "  系统:      $(uname -s) $(uname -r)"
echo -e "  运行时间:  $(uptime -p)"
echo ""

# CPU 和内存
echo -e "${MAGENTA}═══ 资源使用 ═══${NC}"
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
MEM_TOTAL=$(free -h | awk '/Mem:/ {print $2}')
MEM_USED=$(free -h | awk '/Mem:/ {print $3}')
MEM_PERCENT=$(free | awk '/Mem:/ {printf "%.1f", $3/$2 * 100}')
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}')

echo -e "  CPU 使用:  ${CPU_USAGE}%"
echo -e "  内存使用:  ${MEM_USED} / ${MEM_TOTAL} (${MEM_PERCENT}%)"
echo -e "  磁盘使用:  ${DISK_USAGE}"
echo ""

# 服务状态
echo -e "${MAGENTA}═══ 服务状态 ═══${NC}"

# Backend
if curl -sf "http://localhost:8080/health" > /dev/null 2>&1; then
    echo -e "  Backend:    ${GREEN}● 运行中${NC}"
else
    echo -e "  Backend:    ${RED}○ 未运行${NC}"
fi

# Nginx
if systemctl is-active --quiet nginx; then
    echo -e "  Nginx:      ${GREEN}● 运行中${NC}"
else
    echo -e "  Nginx:      ${RED}○ 未运行${NC}"
fi

# PostgreSQL
if systemctl is-active --quiet postgresql; then
    echo -e "  PostgreSQL: ${GREEN}● 运行中${NC}"
else
    echo -e "  PostgreSQL: ${RED}○ 未运行${NC}"
fi

# Redis
if systemctl is-active --quiet redis-server; then
    echo -e "  Redis:      ${GREEN}● 运行中${NC}"
else
    echo -e "  Redis:      ${RED}○ 未运行${NC}"
fi

# Supervisor
if systemctl is-active --quiet supervisor; then
    echo -e "  Supervisor: ${GREEN}● 运行中${NC}"
else
    echo -e "  Supervisor: ${RED}○ 未运行${NC}"
fi
echo ""

# 进程信息
echo -e "${MAGENTA}═══ 后端进程 ═══${NC}"
BACKEND_PID=$(pgrep -f "ai-backend" | head -1)
if [ -n "$BACKEND_PID" ]; then
    BACKEND_MEM=$(ps -o rss= -p $BACKEND_PID 2>/dev/null | awk '{printf "%.1f MB", $1/1024}')
    BACKEND_CPU=$(ps -o %cpu= -p $BACKEND_PID 2>/dev/null)
    BACKEND_TIME=$(ps -o etime= -p $BACKEND_PID 2>/dev/null | xargs)
    echo -e "  PID:       $BACKEND_PID"
    echo -e "  内存:      $BACKEND_MEM"
    echo -e "  CPU:       ${BACKEND_CPU}%"
    echo -e "  运行时间:  $BACKEND_TIME"
else
    echo -e "  ${YELLOW}未检测到后端进程${NC}"
fi
echo ""

# 最近日志
echo -e "${MAGENTA}═══ 最近日志 (最后5行) ═══${NC}"
if [ -f "$DEPLOY_DIR/logs/backend.log" ]; then
    tail -5 "$DEPLOY_DIR/logs/backend.log" | while read line; do
        echo -e "  ${BLUE}$line${NC}"
    done
else
    echo -e "  ${YELLOW}日志文件不存在${NC}"
fi
echo ""

# 备份信息
echo -e "${MAGENTA}═══ 备份信息 ═══${NC}"
BACKUP_COUNT=$(ls -1 "$DEPLOY_DIR/backups/ai-backend."* 2>/dev/null | wc -l)
LATEST_BACKUP=$(ls -t "$DEPLOY_DIR/backups/ai-backend."* 2>/dev/null | head -1)
DB_BACKUP_COUNT=$(ls -1 "$DEPLOY_DIR/backups/db/"*.sql.gz 2>/dev/null | wc -l)

echo -e "  二进制备份: ${BACKUP_COUNT} 个"
if [ -n "$LATEST_BACKUP" ]; then
    echo -e "  最新备份:   $(basename $LATEST_BACKUP)"
fi
echo -e "  数据库备份: ${DB_BACKUP_COUNT} 个"
echo ""

# 快捷命令
echo -e "${MAGENTA}═══ 快捷命令 ═══${NC}"
echo -e "  查看日志:   ${CYAN}tail -f $DEPLOY_DIR/logs/backend.log${NC}"
echo -e "  重启后端:   ${CYAN}sudo supervisorctl restart ai-backend${NC}"
echo -e "  健康检查:   ${CYAN}$DEPLOY_DIR/scripts/health-check.sh${NC}"
echo -e "  回滚:       ${CYAN}$DEPLOY_DIR/scripts/rollback.sh${NC}"
echo ""

echo -e "${CYAN}══════════════════════════════════════════════════════════════${NC}"
