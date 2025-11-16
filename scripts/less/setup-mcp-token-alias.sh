#!/usr/bin/env zsh

# =============================================================================
# MCP Token 管理工具 - Shell别名配置
# =============================================================================

# 颜色
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_ROOT="$HOME/coding/www/projects/new-ai-proj"

echo "${BLUE}🔧 配置MCP Token管理工具别名${NC}"
echo ""

# 检测Shell类型
SHELL_RC=""
if [ -n "$ZSH_VERSION" ]; then
    SHELL_RC="$HOME/.zshrc"
    SHELL_NAME="zsh"
elif [ -n "$BASH_VERSION" ]; then
    SHELL_RC="$HOME/.bashrc"
    SHELL_NAME="bash"
else
    echo "${YELLOW}⚠️  未检测到zsh或bash${NC}"
    exit 1
fi

echo "${BLUE}检测到Shell: $SHELL_NAME${NC}"
echo "${BLUE}配置文件: $SHELL_RC${NC}"
echo ""

# 备份配置文件
BACKUP_FILE="${SHELL_RC}.backup.$(date +%Y%m%d_%H%M%S)"
cp "$SHELL_RC" "$BACKUP_FILE"
echo "${GREEN}✓ 已备份: $BACKUP_FILE${NC}"

# 检查是否已有配置
if grep -q "# MCP Token Management" "$SHELL_RC"; then
    echo "${YELLOW}⚠️  已存在MCP Token配置,将更新${NC}"
    # 删除旧配置
    sed -i.tmp '/# MCP Token Management/,/# End MCP Token Management/d' "$SHELL_RC"
    rm -f "${SHELL_RC}.tmp"
fi

# 添加新配置
cat >> "$SHELL_RC" <<'SHELL_ALIASES'

# ============================================================================
# MCP Token Management
# ============================================================================
export MCP_TOKEN_SCRIPTS="$HOME/coding/www/projects/new-ai-proj/scripts"

# 主命令
alias mcp-token='$MCP_TOKEN_SCRIPTS/mcp-token.sh'

# 快捷命令
alias jwt='$MCP_TOKEN_SCRIPTS/jwt-auto-sync.sh'              # 生成Token并同步
alias jwt-sync='$MCP_TOKEN_SCRIPTS/sync-jwt-to-claude.sh'   # 仅同步到Claude
alias jwt-show='mcp-token show'                              # 显示Token信息
alias jwt-verify='mcp-token verify'                          # 验证Token
alias jwt-status='mcp-token status'                          # 检查状态

# Token读取
alias jwt-cat='cat ~/.ai-proj-jwt-token'                     # 显示Token
alias jwt-copy='cat ~/.ai-proj-jwt-token | pbcopy && echo "Token已复制到剪贴板"'
alias jwt-load='source ~/.ai-proj-jwt.env && echo "Token已加载: \${TOKEN:0:50}..."'

# MCP管理
alias mcp-restart='mcp-token restart'                        # 重启MCP
alias mcp-logs='tail -f ~/.config/claude-desktop/logs/*'    # 查看MCP日志
alias mcp-ps='ps aux | grep -E "mcp-task-bridge|Claude.*mcp" | grep -v grep'

# End MCP Token Management
# ============================================================================

SHELL_ALIASES

echo "${GREEN}✓ 别名配置已添加${NC}"
echo ""

# 显示配置的别名
echo "${BLUE}📋 已配置的别名:${NC}"
echo ""
echo "${YELLOW}主命令:${NC}"
echo "  ${GREEN}mcp-token${NC}          - Token管理主命令"
echo "  ${GREEN}jwt${NC}                - 快速生成Token并同步"
echo ""
echo "${YELLOW}Token操作:${NC}"
echo "  ${GREEN}jwt-show${NC}           - 显示Token详细信息"
echo "  ${GREEN}jwt-verify${NC}         - 验证Token有效性"
echo "  ${GREEN}jwt-status${NC}         - 检查Token和MCP状态"
echo "  ${GREEN}jwt-sync${NC}           - 同步Token到Claude配置"
echo ""
echo "${YELLOW}Token读取:${NC}"
echo "  ${GREEN}jwt-cat${NC}            - 显示Token内容"
echo "  ${GREEN}jwt-copy${NC}           - 复制Token到剪贴板"
echo "  ${GREEN}jwt-load${NC}           - 加载Token到当前Shell"
echo ""
echo "${YELLOW}MCP管理:${NC}"
echo "  ${GREEN}mcp-restart${NC}        - 重启MCP服务器"
echo "  ${GREEN}mcp-logs${NC}           - 查看MCP日志"
echo "  ${GREEN}mcp-ps${NC}             - 查看MCP进程"
echo ""

# 重新加载配置
echo "${BLUE}🔄 重新加载Shell配置...${NC}"
source "$SHELL_RC"
echo "${GREEN}✓ 配置已重新加载${NC}"
echo ""

echo "${GREEN}✅ 配置完成!${NC}"
echo ""
echo "${YELLOW}💡 使用示例:${NC}"
echo "  ${BLUE}# 生成新Token (7天有效期)${NC}"
echo "  jwt"
echo ""
echo "  ${BLUE}# 生成30天有效期的Token${NC}"
echo "  jwt admin 30"
echo ""
echo "  ${BLUE}# 查看Token信息${NC}"
echo "  jwt-show"
echo ""
echo "  ${BLUE}# 验证并重启MCP${NC}"
echo "  jwt-verify && mcp-restart"
echo ""
echo "  ${BLUE}# 查看所有可用命令${NC}"
echo "  mcp-token help"
echo ""
