#!/usr/bin/env zsh

# =============================================================================
# JWT完全自动化同步工具 - 一键生成并同步到所有位置
# =============================================================================
# 功能:
# 1. 生成新的JWT Token
# 2. 同步到~/.ai-proj-jwt-token和~/.ai-proj-jwt.env
# 3. 同步到MCP配置文件(.env)
# 4. 同步到Claude Desktop配置文件
# 5. 可选: 自动重启MCP服务器
# =============================================================================

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 配置
PROJECT_ROOT="$HOME/coding/www/projects/new-ai-proj"
SCRIPTS_DIR="$PROJECT_ROOT/scripts"

# 参数
USERNAME="${1:-admin}"
DAYS="${2:-7}"
AUTO_RESTART="${3:-false}"

echo "${CYAN}╔═══════════════════════════════════════════════════════════════════╗${NC}"
echo "${CYAN}║         JWT Token 完全自动化同步工具                              ║${NC}"
echo "${CYAN}╚═══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "${BLUE}📊 配置信息:${NC}"
echo "  用户: $USERNAME"
echo "  有效期: $DAYS 天"
echo "  自动重启: $AUTO_RESTART"
echo ""

# ============================================================================
# Step 1: 生成JWT Token
# ============================================================================
echo "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${YELLOW}[1/5] 生成JWT Token${NC}"
echo "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd "$SCRIPTS_DIR"

HOURS=$((DAYS * 24))
"$SCRIPTS_DIR/gen-jwt.sh" "$USERNAME" "$HOURS" > /tmp/jwt-gen.log 2>&1

if [ $? -ne 0 ]; then
    echo "${RED}❌ JWT生成失败${NC}"
    cat /tmp/jwt-gen.log
    exit 1
fi

# 读取生成的Token
JWT_TOKEN=$(cat "$HOME/.ai-proj-jwt-token" | tr -d '\n' | tr -d ' ')

if [ -z "$JWT_TOKEN" ]; then
    echo "${RED}❌ 无法读取生成的Token${NC}"
    exit 1
fi

echo "${GREEN}✅ JWT Token 生成成功${NC}"
echo "   Token前缀: ${JWT_TOKEN:0:50}..."
echo ""

# ============================================================================
# Step 2: 同步到MCP配置文件
# ============================================================================
echo "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${YELLOW}[2/5] 同步到MCP配置文件${NC}"
echo "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

MCP_ENV_FILE="$PROJECT_ROOT/mcp-task-bridge/.env"

if [ ! -f "$MCP_ENV_FILE" ]; then
    echo "${RED}❌ MCP配置文件不存在: $MCP_ENV_FILE${NC}"
    exit 1
fi

# 备份
MCP_BACKUP="${MCP_ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
cp "$MCP_ENV_FILE" "$MCP_BACKUP"

# 更新Token
ESCAPED_TOKEN=$(echo "$JWT_TOKEN" | sed 's/[\/&]/\\&/g')
sed -i '' "s|^TASK_API_TOKEN=.*|TASK_API_TOKEN=$ESCAPED_TOKEN|" "$MCP_ENV_FILE"
sed -i '' "s|^API_TOKEN=.*|API_TOKEN=$ESCAPED_TOKEN|" "$MCP_ENV_FILE"

# 如果不存在则添加
if ! grep -q "^TASK_API_TOKEN=" "$MCP_ENV_FILE"; then
    echo "TASK_API_TOKEN=$JWT_TOKEN" >> "$MCP_ENV_FILE"
fi
if ! grep -q "^API_TOKEN=" "$MCP_ENV_FILE"; then
    echo "API_TOKEN=$JWT_TOKEN" >> "$MCP_ENV_FILE"
fi

echo "${GREEN}✅ MCP配置已更新${NC}"
echo "   文件: $MCP_ENV_FILE"
echo "   备份: $MCP_BACKUP"
echo ""

# ============================================================================
# Step 3: 同步到Claude Desktop配置文件
# ============================================================================
echo "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${YELLOW}[3/5] 同步到Claude Desktop配置${NC}"
echo "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

"$SCRIPTS_DIR/sync-jwt-to-claude.sh" "$JWT_TOKEN" > /tmp/claude-sync.log 2>&1

if [ $? -eq 0 ]; then
    echo "${GREEN}✅ Claude配置已更新${NC}"
    tail -3 /tmp/claude-sync.log | grep -E "(✓|成功|updated)" || echo "   查看详情: /tmp/claude-sync.log"
else
    echo "${YELLOW}⚠️  Claude配置更新部分成功${NC}"
    cat /tmp/claude-sync.log
fi
echo ""

# ============================================================================
# Step 4: 验证同步结果
# ============================================================================
echo "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${YELLOW}[4/5] 验证同步结果${NC}"
echo "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 验证文件存在性
check_file() {
    local file="$1"
    local name="$2"

    if [ -f "$file" ]; then
        echo "${GREEN}✓${NC} $name"
        return 0
    else
        echo "${RED}✗${NC} $name"
        return 1
    fi
}

echo "${BLUE}Token文件:${NC}"
check_file "$HOME/.ai-proj-jwt-token" "~/.ai-proj-jwt-token"
check_file "$HOME/.ai-proj-jwt.env" "~/.ai-proj-jwt.env"

echo ""
echo "${BLUE}配置文件:${NC}"
check_file "$MCP_ENV_FILE" "MCP .env"
check_file "$HOME/Library/Application Support/Claude/claude_desktop_config.json" "Claude Desktop (Library)"
check_file "$HOME/.config/claude-desktop/claude_desktop_config.json" "Claude Desktop (.config)"

echo ""

# ============================================================================
# Step 5: 重启MCP服务器 (可选)
# ============================================================================
echo "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${YELLOW}[5/5] MCP服务器管理${NC}"
echo "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ "$AUTO_RESTART" = "true" ] || [ "$AUTO_RESTART" = "yes" ] || [ "$AUTO_RESTART" = "1" ]; then
    echo "${BLUE}🔄 重启MCP服务器...${NC}"

    # 查找MCP进程
    MCP_PIDS=$(ps aux | grep -E 'mcp-task-bridge|Claude.*mcp' | grep -v grep | awk '{print $2}')

    if [ -n "$MCP_PIDS" ]; then
        echo "   找到MCP进程: $MCP_PIDS"
        echo "$MCP_PIDS" | xargs kill -9 2>/dev/null || true
        echo "${GREEN}✅ MCP进程已终止，Claude Code将自动重启${NC}"
    else
        echo "${YELLOW}⚠️  未找到运行中的MCP进程${NC}"
    fi
else
    echo "${YELLOW}💡 手动重启选项:${NC}"
    echo "   • 重启Claude Code应用 (Cmd+Q 后重新打开)"
    echo "   • 或运行: pkill -f 'mcp-task-bridge'"
    echo "   • 或运行: $0 $USERNAME $DAYS true"
fi

echo ""

# ============================================================================
# 总结
# ============================================================================
echo "${CYAN}╔═══════════════════════════════════════════════════════════════════╗${NC}"
echo "${CYAN}║                         同步完成                                  ║${NC}"
echo "${CYAN}╚═══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "${GREEN}✅ JWT Token已同步到所有位置${NC}"
echo ""
echo "${BLUE}📋 Token信息:${NC}"
echo "  用户: $USERNAME"
echo "  有效期: $DAYS 天"
echo "  过期时间: $(date -v+${DAYS}d '+%Y-%m-%d %H:%M:%S')"
echo "  Token前缀: ${JWT_TOKEN:0:50}..."
echo ""
echo "${BLUE}📁 已更新的文件:${NC}"
echo "  1. ~/.ai-proj-jwt-token"
echo "  2. ~/.ai-proj-jwt.env"
echo "  3. mcp-task-bridge/.env"
echo "  4. Claude Desktop配置文件 (2个)"
echo ""
echo "${BLUE}🚀 快速使用:${NC}"
echo "  ${CYAN}# 加载到当前Shell${NC}"
echo "  source ~/.ai-proj-jwt.env"
echo ""
echo "  ${CYAN}# 使用Token${NC}"
echo "  curl -H \"Authorization: Bearer \$TOKEN\" http://localhost:8080/api/v1/tasks"
echo ""
echo "  ${CYAN}# 下次更新Token${NC}"
echo "  $0 $USERNAME $DAYS"
echo ""

# 加载到当前环境
export TOKEN="$JWT_TOKEN"
export AI_PROJ_JWT_TOKEN="$JWT_TOKEN"

echo "${GREEN}✨ 完成! Token已加载到当前Shell${NC}"
echo ""
