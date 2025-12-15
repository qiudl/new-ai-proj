#!/bin/bash
# pre-deploy-check.sh - 部署前检查脚本
# 用法: ./scripts/prod/pre-deploy-check.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SERVER_IP="${PROD_SERVER_IP:?请设置 PROD_SERVER_IP 环境变量}"
SERVER_USER="${PROD_SERVER_USER:-ubuntu}"
SSH_KEY="${PROD_SSH_KEY:-~/.ssh/id_rsa}"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

check_pass() { echo -e "  ${GREEN}✓${NC} $1"; }
check_fail() { echo -e "  ${RED}✗${NC} $1"; ERRORS=$((ERRORS + 1)); }
check_warn() { echo -e "  ${YELLOW}⚠${NC} $1"; WARNINGS=$((WARNINGS + 1)); }

echo ""
echo "=========================================="
echo "🔍 部署前检查"
echo "=========================================="
echo ""

# 1. 本地环境检查
echo -e "${BLUE}[1/5] 本地环境检查${NC}"

# Go 环境
if command -v go &> /dev/null; then
    GO_VERSION=$(go version | awk '{print $3}')
    check_pass "Go 已安装: $GO_VERSION"
else
    check_fail "Go 未安装"
fi

# Node.js 环境
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    check_pass "Node.js 已安装: $NODE_VERSION"
else
    check_fail "Node.js 未安装"
fi

# npm 环境
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    check_pass "npm 已安装: $NPM_VERSION"
else
    check_fail "npm 未安装"
fi
echo ""

# 2. 项目文件检查
echo -e "${BLUE}[2/5] 项目文件检查${NC}"

# 后端
if [ -f "$PROJECT_ROOT/backend/main.go" ]; then
    check_pass "后端入口文件存在"
else
    check_fail "后端入口文件不存在: backend/main.go"
fi

if [ -f "$PROJECT_ROOT/backend/go.mod" ]; then
    check_pass "Go 模块文件存在"
else
    check_fail "Go 模块文件不存在: backend/go.mod"
fi

# 前端
if [ -f "$PROJECT_ROOT/frontend/package.json" ]; then
    check_pass "前端 package.json 存在"
else
    check_fail "前端 package.json 不存在"
fi

if [ -d "$PROJECT_ROOT/frontend/src" ]; then
    check_pass "前端源码目录存在"
else
    check_fail "前端源码目录不存在"
fi

# 迁移文件
MIGRATION_COUNT=$(find "$PROJECT_ROOT/backend/migrations" -type d -name "[0-9]*" 2>/dev/null | wc -l)
if [ "$MIGRATION_COUNT" -gt 0 ]; then
    check_pass "数据库迁移文件: $MIGRATION_COUNT 个"
else
    check_warn "未找到数据库迁移文件"
fi
echo ""

# 3. Git 状态检查
echo -e "${BLUE}[3/5] Git 状态检查${NC}"

cd "$PROJECT_ROOT"

# 检查是否有未提交的更改
if git diff --quiet && git diff --staged --quiet; then
    check_pass "工作目录干净"
else
    check_warn "存在未提交的更改"
fi

# 检查当前分支
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" = "main" ] || [ "$CURRENT_BRANCH" = "master" ]; then
    check_pass "当前分支: $CURRENT_BRANCH"
else
    check_warn "当前分支 $CURRENT_BRANCH 不是主分支"
fi

# 检查是否与远程同步
git fetch origin --quiet 2>/dev/null || true
LOCAL=$(git rev-parse HEAD 2>/dev/null)
REMOTE=$(git rev-parse origin/$CURRENT_BRANCH 2>/dev/null || echo "unknown")
if [ "$LOCAL" = "$REMOTE" ]; then
    check_pass "与远程仓库同步"
else
    check_warn "本地与远程不同步"
fi
echo ""

# 4. SSH 连接检查
echo -e "${BLUE}[4/5] SSH 连接检查${NC}"

# SSH 密钥
if [ -f "${SSH_KEY/#\~/$HOME}" ]; then
    check_pass "SSH 密钥存在: $SSH_KEY"
else
    check_fail "SSH 密钥不存在: $SSH_KEY"
fi

# 服务器连接
if ssh -i "$SSH_KEY" -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "echo ok" &> /dev/null; then
    check_pass "服务器连接正常: $SERVER_USER@$SERVER_IP"
else
    check_fail "无法连接服务器: $SERVER_USER@$SERVER_IP"
fi
echo ""

# 5. 服务器状态检查
echo -e "${BLUE}[5/5] 服务器状态检查${NC}"

if ssh -i "$SSH_KEY" -o ConnectTimeout=10 "$SERVER_USER@$SERVER_IP" << 'ENDSSH' 2>/dev/null
    # 检查磁盘空间
    DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
    if [ "$DISK_USAGE" -lt 90 ]; then
        echo "DISK_OK:$DISK_USAGE"
    else
        echo "DISK_WARN:$DISK_USAGE"
    fi

    # 检查内存
    MEM_USAGE=$(free | awk '/Mem:/ {printf "%.0f", $3/$2 * 100}')
    if [ "$MEM_USAGE" -lt 90 ]; then
        echo "MEM_OK:$MEM_USAGE"
    else
        echo "MEM_WARN:$MEM_USAGE"
    fi

    # 检查部署目录
    if [ -d "/opt/ai-project" ]; then
        echo "DIR_OK"
    else
        echo "DIR_MISSING"
    fi

    # 检查 supervisor
    if systemctl is-active --quiet supervisor; then
        echo "SUPERVISOR_OK"
    else
        echo "SUPERVISOR_MISSING"
    fi

    # 检查 nginx
    if systemctl is-active --quiet nginx; then
        echo "NGINX_OK"
    else
        echo "NGINX_MISSING"
    fi
ENDSSH
then
    # 解析结果
    RESULT=$(ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" << 'ENDSSH' 2>/dev/null
        DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
        MEM_USAGE=$(free | awk '/Mem:/ {printf "%.0f", $3/$2 * 100}')
        echo "DISK:$DISK_USAGE"
        echo "MEM:$MEM_USAGE"
        [ -d "/opt/ai-project" ] && echo "DIR:OK" || echo "DIR:MISSING"
        systemctl is-active --quiet supervisor && echo "SUPERVISOR:OK" || echo "SUPERVISOR:MISSING"
        systemctl is-active --quiet nginx && echo "NGINX:OK" || echo "NGINX:MISSING"
ENDSSH
    )

    while IFS=: read -r key value; do
        case "$key" in
            DISK)
                if [ "$value" -lt 90 ]; then
                    check_pass "磁盘使用: ${value}%"
                else
                    check_warn "磁盘使用过高: ${value}%"
                fi
                ;;
            MEM)
                if [ "$value" -lt 90 ]; then
                    check_pass "内存使用: ${value}%"
                else
                    check_warn "内存使用过高: ${value}%"
                fi
                ;;
            DIR)
                if [ "$value" = "OK" ]; then
                    check_pass "部署目录存在"
                else
                    check_warn "部署目录不存在，首次部署将自动创建"
                fi
                ;;
            SUPERVISOR)
                if [ "$value" = "OK" ]; then
                    check_pass "Supervisor 运行中"
                else
                    check_fail "Supervisor 未运行"
                fi
                ;;
            NGINX)
                if [ "$value" = "OK" ]; then
                    check_pass "Nginx 运行中"
                else
                    check_fail "Nginx 未运行"
                fi
                ;;
        esac
    done <<< "$RESULT"
else
    check_fail "无法获取服务器状态"
fi
echo ""

# 结果汇总
echo "=========================================="
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ 所有检查通过，可以部署${NC}"
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️ 检查完成: $WARNINGS 个警告${NC}"
    echo "   建议处理警告后再部署"
else
    echo -e "${RED}❌ 检查失败: $ERRORS 个错误, $WARNINGS 个警告${NC}"
    echo "   请修复错误后再部署"
    exit 1
fi
echo "=========================================="
