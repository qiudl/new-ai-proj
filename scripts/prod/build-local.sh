#!/bin/bash
# build-local.sh - 本地构建脚本（用于测试构建是否成功）
# 用法: ./scripts/prod/build-local.sh [--backend|--frontend|--all]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

BUILD_BACKEND=false
BUILD_FRONTEND=false

# 解析参数
case "${1:-all}" in
    --backend)
        BUILD_BACKEND=true
        ;;
    --frontend)
        BUILD_FRONTEND=true
        ;;
    --all|*)
        BUILD_BACKEND=true
        BUILD_FRONTEND=true
        ;;
esac

echo ""
echo -e "${CYAN}==========================================${NC}"
echo -e "${CYAN}🔨 本地构建测试${NC}"
echo -e "${CYAN}==========================================${NC}"
echo ""

START_TIME=$(date +%s)

# 构建后端
if [ "$BUILD_BACKEND" = true ]; then
    log "构建后端 (Linux amd64)..."
    cd "$PROJECT_ROOT/backend"

    # 交叉编译
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
        -ldflags="-s -w" \
        -o ai-backend main.go

    BACKEND_SIZE=$(du -h ai-backend | cut -f1)
    log_success "后端构建完成: $BACKEND_SIZE"

    # 也构建本地版本用于测试
    log "构建后端 (本地版本)..."
    go build -o ai-backend-local main.go
    log_success "本地版本构建完成"
fi

# 构建前端
if [ "$BUILD_FRONTEND" = true ]; then
    log "构建前端..."
    cd "$PROJECT_ROOT/frontend"

    # 检查依赖
    if [ ! -d "node_modules" ]; then
        log "安装依赖..."
        npm ci
    fi

    # 构建
    GENERATE_SOURCEMAP=false npm run build

    FRONTEND_SIZE=$(du -sh build | cut -f1)
    log_success "前端构建完成: $FRONTEND_SIZE"
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo -e "${CYAN}==========================================${NC}"
log_success "构建完成！耗时: ${DURATION}秒"
echo -e "${CYAN}==========================================${NC}"

# 显示构建产物
echo ""
echo "构建产物:"
if [ "$BUILD_BACKEND" = true ]; then
    echo "  后端: backend/ai-backend ($(du -h "$PROJECT_ROOT/backend/ai-backend" | cut -f1))"
fi
if [ "$BUILD_FRONTEND" = true ]; then
    echo "  前端: frontend/build/ ($(du -sh "$PROJECT_ROOT/frontend/build" | cut -f1))"
fi
