#!/bin/bash
# run-migrations.sh - 执行数据库迁移
# 用法: ./run-migrations.sh [--dry-run]

set -e

DEPLOY_DIR="/opt/ai-project"
MIGRATIONS_DIR="$DEPLOY_DIR/backend/migrations"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

DRY_RUN=false
if [ "$1" = "--dry-run" ]; then
    DRY_RUN=true
    log_warning "DRY RUN MODE - 不会执行实际迁移"
fi

# 加载环境变量
if [ -f "$DEPLOY_DIR/backend/.env.prod" ]; then
    set -a
    source "$DEPLOY_DIR/backend/.env.prod"
    set +a
else
    log_error "环境变量文件不存在: $DEPLOY_DIR/backend/.env.prod"
    exit 1
fi

# 构建连接字符串
PGPASSWORD="$DB_PASSWORD"
export PGPASSWORD

DB_CONN="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?sslmode=$DB_SSL_MODE"

echo ""
echo "=========================================="
echo "🗄️  数据库迁移"
echo "=========================================="
echo "  数据库: $DB_NAME@$DB_HOST"
echo "  迁移目录: $MIGRATIONS_DIR"
echo "=========================================="
echo ""

# 检查迁移目录
if [ ! -d "$MIGRATIONS_DIR" ]; then
    log_error "迁移目录不存在: $MIGRATIONS_DIR"
    exit 1
fi

# 获取所有迁移目录，按名称排序
MIGRATION_DIRS=$(find "$MIGRATIONS_DIR" -maxdepth 1 -type d -name "[0-9]*" | sort)

if [ -z "$MIGRATION_DIRS" ]; then
    log "没有找到迁移文件"
    exit 0
fi

# 创建迁移记录表（如果不存在）
log "检查迁移记录表..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -q << 'EOF'
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
EOF

# 执行迁移
APPLIED=0
SKIPPED=0

for DIR in $MIGRATION_DIRS; do
    MIGRATION_NAME=$(basename "$DIR")
    UP_FILE="$DIR/up.sql"

    if [ ! -f "$UP_FILE" ]; then
        log_warning "跳过 $MIGRATION_NAME (无 up.sql)"
        continue
    fi

    # 检查是否已执行
    ALREADY_APPLIED=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT COUNT(*) FROM schema_migrations WHERE version = '$MIGRATION_NAME'")

    if [ "$ALREADY_APPLIED" -gt 0 ]; then
        SKIPPED=$((SKIPPED + 1))
        continue
    fi

    log "执行迁移: $MIGRATION_NAME"

    if [ "$DRY_RUN" = true ]; then
        echo "  [DRY RUN] 将执行: $UP_FILE"
    else
        # 执行迁移
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$UP_FILE" > /dev/null 2>&1; then
            # 记录迁移
            psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -q -c \
                "INSERT INTO schema_migrations (version) VALUES ('$MIGRATION_NAME')"
            log_success "  已应用: $MIGRATION_NAME"
            APPLIED=$((APPLIED + 1))
        else
            log_error "  迁移失败: $MIGRATION_NAME"
            log_error "  请检查 $UP_FILE"
            exit 1
        fi
    fi
done

echo ""
echo "=========================================="
echo "迁移完成"
echo "  已应用: $APPLIED"
echo "  已跳过: $SKIPPED"
echo "=========================================="
