#!/usr/bin/env zsh

# =============================================================================
# JWT快捷命令设置脚本
# 为常用的JWT操作创建便捷别名
# =============================================================================

set -e

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🔧 设置JWT快捷命令...${NC}"

# 检测shell类型
SHELL_RC=""
if [[ -n "$ZSH_VERSION" ]]; then
  SHELL_RC="$HOME/.zshrc"
  SHELL_NAME="zsh"
elif [[ -n "$BASH_VERSION" ]]; then
  SHELL_RC="$HOME/.bashrc"
  SHELL_NAME="bash"
else
  echo -e "${YELLOW}⚠️  未知shell类型，请手动添加别名${NC}"
  exit 1
fi

echo -e "${BLUE}📝 检测到shell: ${SHELL_NAME}${NC}"
echo -e "${BLUE}📁 配置文件: ${SHELL_RC}${NC}"

# 创建别名定义
ALIASES=$(cat <<'EOF'

# ============================================================
# AI Project JWT快捷命令
# 生成时间: $(date)
# ============================================================

# 项目路径
export AI_PROJ_ROOT="/Users/johnqiu/coding/www/projects/new-ai-proj"

# JWT相关别名（增强版 - 自动同步MCP）
alias jwt='$AI_PROJ_ROOT/scripts/jwt-with-mcp-sync.sh 7'
alias jwt-gen='$AI_PROJ_ROOT/scripts/jwt-with-mcp-sync.sh 7'
alias jwt-gen-1d='$AI_PROJ_ROOT/scripts/jwt-with-mcp-sync.sh 1'
alias jwt-gen-7d='$AI_PROJ_ROOT/scripts/jwt-with-mcp-sync.sh 7'
alias jwt-load='source ~/.ai-proj-jwt.env && echo "✅ JWT Token已加载"'
alias jwt-show='cat ~/.ai-proj-jwt-token'
alias jwt-info='cat ~/.ai-proj-jwt.env'
alias jwt-copy='cat ~/.ai-proj-jwt-token | pbcopy && echo "✅ Token已复制到剪贴板"'
alias jwt-test='TOKEN=$(cat ~/.ai-proj-jwt-token) && curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/auth/me | python3 -m json.tool'
alias jwt-sync='$AI_PROJ_ROOT/scripts/sync-jwt-to-mcp.sh'

# 组合命令
alias jwt-refresh='$AI_PROJ_ROOT/scripts/jwt-with-mcp-sync.sh 7'
alias jwt-restart-mcp='pkill -f "mcp-task-bridge" && echo "✅ MCP服务器已重启（Claude Code会自动重新启动）"'

# 帮助命令
alias jwt-help='echo "
🔐 AI Project JWT快捷命令

基础命令:
  jwt              - 生成7天token并自动同步MCP（最常用）
  jwt-gen          - 生成7天token并同步MCP
  jwt-gen-1d       - 生成1天token并同步MCP
  jwt-gen-7d       - 生成7天token并同步MCP
  jwt-load         - 加载token到环境变量
  jwt-refresh      - 刷新token（生成并同步）

查看命令:
  jwt-show         - 显示token
  jwt-info         - 查看token信息（含过期时间）
  jwt-copy         - 复制token到剪贴板
  jwt-test         - 测试token有效性

MCP相关:
  jwt-sync         - 手动同步token到MCP配置
  jwt-restart-mcp  - 重启MCP服务器应用新token

使用示例:
  jwt                                                    # 生成并加载token
  curl -H \"Authorization: Bearer \$TOKEN\" http://...   # 使用token调用API
  jwt-test                                               # 验证token
"'

EOF
)

# 检查是否已存在
if grep -q "AI Project JWT快捷命令" "$SHELL_RC" 2>/dev/null; then
  echo -e "${YELLOW}⚠️  别名已存在，跳过添加${NC}"
  echo -e "${YELLOW}   如需更新，请手动删除 $SHELL_RC 中的相关部分后重新运行${NC}"
else
  # 添加别名到shell配置文件
  echo "$ALIASES" >> "$SHELL_RC"
  echo -e "${GREEN}✅ 别名已添加到 $SHELL_RC${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ 设置完成！${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}📋 可用的快捷命令:${NC}"
echo ""
echo -e "  ${GREEN}jwt${NC}              - 生成7天token并加载（最常用）"
echo -e "  ${GREEN}jwt-gen${NC}          - 生成7天token"
echo -e "  ${GREEN}jwt-gen-1d${NC}       - 生成1天token"
echo -e "  ${GREEN}jwt-load${NC}         - 加载token到环境变量"
echo -e "  ${GREEN}jwt-show${NC}         - 显示token"
echo -e "  ${GREEN}jwt-info${NC}         - 查看token信息"
echo -e "  ${GREEN}jwt-copy${NC}         - 复制token到剪贴板"
echo -e "  ${GREEN}jwt-test${NC}         - 测试token有效性"
echo -e "  ${GREEN}jwt-help${NC}         - 显示帮助信息"
echo ""
echo -e "${YELLOW}🚀 立即生效:${NC}"
echo -e "   ${BLUE}source $SHELL_RC${NC}"
echo ""
echo -e "${YELLOW}💡 快速开始:${NC}"
echo -e "   ${BLUE}source $SHELL_RC && jwt${NC}"
echo ""
