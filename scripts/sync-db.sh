#!/bin/bash

###############################################################################
# AI项目数据库同步脚本
# 在本地数据库和远程数据库之间同步数据
# 用法: ./scripts/sync-db.sh [init|pull|push|schema|help]
###############################################################################

set -e

# ============================================================================
# 配置
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TUNNEL_SCRIPT="$SCRIPT_DIR/tunnel.sh"

# 本地数据库配置 (本机 PostgreSQL)
# 从环境变量或 ~/.ai-proj-tunnel.env 读取
LOCAL_HOST="${LOCAL_DB_HOST:-localhost}"
LOCAL_PORT="${LOCAL_DB_PORT:-5432}"
LOCAL_USER="${LOCAL_DB_USER:-ai_dev}"
LOCAL_PASSWORD="${LOCAL_DB_PASSWORD:-}"
LOCAL_DB="${LOCAL_DB_NAME:-ai_project_local}"

# 远程数据库配置 (通过隧道)
REMOTE_HOST="${REMOTE_DB_HOST:-localhost}"
REMOTE_PORT="${REMOTE_DB_PORT:-5433}"
REMOTE_USER="${REMOTE_DB_USER:-ai_prod_user}"
REMOTE_PASSWORD="${REMOTE_DB_PASSWORD:-}"
REMOTE_DB="${REMOTE_DB_NAME:-ai_project_prod}"

# 临时文件
DUMP_DIR="/tmp/ai-proj-sync"
DUMP_FILE="$DUMP_DIR/db_dump.sql"

# 需要同步的核心表（用于增量同步）
CORE_TABLES="users enterprises projects tasks documents work_notes"

# ============================================================================
# 颜色输出
# ============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1" >&2; }
log_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
log_section() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# ============================================================================
# 工具函数
# ============================================================================

# 检查本机 PostgreSQL 是否运行
is_local_postgres_running() {
    pg_isready -h "$LOCAL_HOST" -p "$LOCAL_PORT" > /dev/null 2>&1
}

# 检查隧道是否运行
is_tunnel_running() {
    "$TUNNEL_SCRIPT" check > /dev/null 2>&1
}

# 启动临时隧道（用于同步）
start_temp_tunnel() {
    if is_tunnel_running; then
        log "隧道已运行"
        return 0
    fi

    log "启动临时隧道..."
    "$TUNNEL_SCRIPT" start
}

# 确保本机 PostgreSQL 运行
ensure_local_db() {
    if ! is_local_postgres_running; then
        log_error "本机 PostgreSQL 未运行"
        log "请先启动: brew services start postgresql@16"
        return 1
    fi
    return 0
}

# 创建本地数据库和用户
create_local_database() {
    log "检查/创建本地数据库用户和数据库..."

    # 检查用户是否存在，不存在则创建
    if ! psql -h "$LOCAL_HOST" -p "$LOCAL_PORT" -U postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='$LOCAL_USER'" 2>/dev/null | grep -q 1; then
        log "创建用户: $LOCAL_USER"
        psql -h "$LOCAL_HOST" -p "$LOCAL_PORT" -U postgres -c "CREATE USER $LOCAL_USER WITH PASSWORD '$LOCAL_PASSWORD' CREATEDB;" 2>/dev/null || \
        createuser -h "$LOCAL_HOST" -p "$LOCAL_PORT" -s "$LOCAL_USER" 2>/dev/null || true
    fi

    # 检查数据库是否存在，不存在则创建
    if ! psql -h "$LOCAL_HOST" -p "$LOCAL_PORT" -U "$LOCAL_USER" -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$LOCAL_DB"; then
        log "创建数据库: $LOCAL_DB"
        createdb -h "$LOCAL_HOST" -p "$LOCAL_PORT" -U "$LOCAL_USER" -O "$LOCAL_USER" "$LOCAL_DB" 2>/dev/null || \
        psql -h "$LOCAL_HOST" -p "$LOCAL_PORT" -U postgres -c "CREATE DATABASE $LOCAL_DB OWNER $LOCAL_USER;" 2>/dev/null || true
    fi

    log_success "本地数据库环境就绪"
}

# 加载远程数据库密码
load_remote_password() {
    if [ -z "$REMOTE_PASSWORD" ]; then
        if [ -f "$HOME/.ai-proj-tunnel.env" ]; then
            source "$HOME/.ai-proj-tunnel.env"
            REMOTE_PASSWORD="${DB_PASSWORD:-}"
        fi
    fi

    if [ -z "$REMOTE_PASSWORD" ]; then
        log_error "远程数据库密码未配置"
        log "请设置环境变量 REMOTE_DB_PASSWORD 或配置 ~/.ai-proj-tunnel.env"
        return 1
    fi
    return 0
}

# ============================================================================
# 同步功能
# ============================================================================

# 初始化本地数据库（从远程完整同步）
sync_init() {
    log_section "🔄 初始化本地数据库"

    ensure_local_db || return 1
    load_remote_password || return 1

    # 创建本地数据库和用户
    create_local_database

    # 启动隧道（端口5433，与本地5432不冲突）
    log "启动远程数据库隧道..."
    start_temp_tunnel || {
        log_error "无法建立隧道连接"
        return 1
    }

    mkdir -p "$DUMP_DIR"

    log "从远程数据库导出数据..."
    PGPASSWORD="$REMOTE_PASSWORD" pg_dump \
        -h "$REMOTE_HOST" \
        -p "$REMOTE_PORT" \
        -U "$REMOTE_USER" \
        -d "$REMOTE_DB" \
        --no-owner \
        --no-privileges \
        --clean \
        --if-exists \
        -f "$DUMP_FILE" || {
            log_error "导出失败"
            "$TUNNEL_SCRIPT" stop
            return 1
        }

    log_success "导出完成: $(du -h $DUMP_FILE | cut -f1)"

    # 停止隧道
    "$TUNNEL_SCRIPT" stop

    log "导入数据到本地数据库..."
    PGPASSWORD="$LOCAL_PASSWORD" psql \
        -h "$LOCAL_HOST" \
        -p "$LOCAL_PORT" \
        -U "$LOCAL_USER" \
        -d "$LOCAL_DB" \
        -f "$DUMP_FILE" 2>&1 | grep -v "^SET\|^COMMENT\|already exists" || true

    log_success "本地数据库初始化完成！"
    echo ""
    log "本地数据库连接信息:"
    echo "  Host:     localhost"
    echo "  Port:     $LOCAL_PORT"
    echo "  Database: $LOCAL_DB"
    echo "  User:     $LOCAL_USER"
    echo "  Password: $LOCAL_PASSWORD"
    echo ""
    log "现在可以使用本地模式启动:"
    echo "  ./scripts/dev.sh local"

    # 清理
    rm -f "$DUMP_FILE"
}

# 从远程拉取数据更新本地
sync_pull() {
    log_section "⬇️  从远程拉取数据"

    ensure_local_db || return 1
    load_remote_password || return 1

    log_warning "此操作将覆盖本地数据库中的数据"

    if [ -t 0 ]; then
        read -p "确认继续? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "已取消"
            return 0
        fi
    fi

    # 启动隧道
    start_temp_tunnel || return 1

    mkdir -p "$DUMP_DIR"

    log "从远程数据库导出数据..."
    PGPASSWORD="$REMOTE_PASSWORD" pg_dump \
        -h "$REMOTE_HOST" \
        -p "$REMOTE_PORT" \
        -U "$REMOTE_USER" \
        -d "$REMOTE_DB" \
        --no-owner \
        --no-privileges \
        --clean \
        --if-exists \
        -f "$DUMP_FILE" || {
            log_error "导出失败"
            "$TUNNEL_SCRIPT" stop
            return 1
        }

    log_success "导出完成: $(du -h $DUMP_FILE | cut -f1)"
    "$TUNNEL_SCRIPT" stop

    log "导入数据到本地数据库..."
    PGPASSWORD="$LOCAL_PASSWORD" psql \
        -h "$LOCAL_HOST" \
        -p "$LOCAL_PORT" \
        -U "$LOCAL_USER" \
        -d "$LOCAL_DB" \
        -f "$DUMP_FILE" 2>&1 | grep -v "^SET\|^COMMENT\|already exists" || true

    log_success "数据同步完成！"
    rm -f "$DUMP_FILE"
}

# 推送本地数据到远程（谨慎使用）
sync_push() {
    log_section "⬆️  推送数据到远程"

    log_error "推送功能暂未实现"
    log_warning "为安全起见，请手动操作或使用专门的迁移工具"
    return 1
}

# 仅同步表结构
sync_schema() {
    log_section "📋 同步表结构"

    ensure_local_db || return 1
    load_remote_password || return 1

    # 创建本地数据库和用户
    create_local_database

    start_temp_tunnel || return 1

    mkdir -p "$DUMP_DIR"

    log "从远程导出表结构..."
    PGPASSWORD="$REMOTE_PASSWORD" pg_dump \
        -h "$REMOTE_HOST" \
        -p "$REMOTE_PORT" \
        -U "$REMOTE_USER" \
        -d "$REMOTE_DB" \
        --schema-only \
        --no-owner \
        --no-privileges \
        -f "$DUMP_FILE" || {
            "$TUNNEL_SCRIPT" stop
            return 1
        }

    "$TUNNEL_SCRIPT" stop

    log "导入表结构到本地..."
    PGPASSWORD="$LOCAL_PASSWORD" psql \
        -h "$LOCAL_HOST" \
        -p "$LOCAL_PORT" \
        -U "$LOCAL_USER" \
        -d "$LOCAL_DB" \
        -f "$DUMP_FILE" 2>&1 | grep -v "^SET\|^COMMENT\|already exists" || true

    log_success "表结构同步完成！"
    rm -f "$DUMP_FILE"
}

# 显示帮助
show_help() {
    cat << EOF

${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}
${CYAN}🔄 AI项目数据库同步工具${NC}
${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}

${YELLOW}用法:${NC}
  $0 [init|pull|push|schema|help]

${YELLOW}命令:${NC}
  ${GREEN}init${NC}      初始化本地数据库（从远程完整同步）
  ${GREEN}pull${NC}      从远程拉取最新数据到本地
  ${GREEN}push${NC}      推送本地数据到远程（暂未实现）
  ${GREEN}schema${NC}    仅同步表结构（不含数据）
  ${GREEN}help${NC}      显示此帮助信息

${YELLOW}首次使用:${NC}
  1. 安装并启动本机 PostgreSQL:
     brew install postgresql@16
     brew services start postgresql@16

  2. 配置远程数据库密码:
     echo 'DB_PASSWORD=your_password' > ~/.ai-proj-tunnel.env

  3. 初始化本地数据库:
     $0 init

${YELLOW}日常使用:${NC}
  # 开发时使用本地数据库
  ./scripts/dev.sh local

  # 需要最新数据时同步
  $0 pull

${YELLOW}注意事项:${NC}
  - 同步过程中会临时停止本地 PostgreSQL
  - pull 操作会覆盖本地数据
  - push 操作需要谨慎，目前未实现

${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}

EOF
}

# ============================================================================
# 主函数
# ============================================================================

main() {
    case "${1:-help}" in
        init)
            sync_init
            ;;
        pull)
            sync_pull
            ;;
        push)
            sync_push
            ;;
        schema)
            sync_schema
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "未知命令: $1"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
