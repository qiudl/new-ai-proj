#!/bin/zsh

# =============================================================================
# JWT工具别名配置脚本
# =============================================================================
# 使用方法:
#   source scripts/setup-jwt-alias.sh
#
# 这将在当前shell中设置以下别名:
#   - gen-jwt: 生成JWT token
#   - load-jwt: 加载JWT token到环境变量
#   - show-jwt: 显示当前token信息
# =============================================================================

# 颜色
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 项目根目录
PROJECT_ROOT="/Users/johnqiu/coding/www/projects/new-ai-proj"

echo "${BLUE}🔧 配置JWT工具别名...${NC}"

# 别名1: 生成JWT token
alias gen-jwt="$PROJECT_ROOT/scripts/gen-jwt.sh"

# 别名2: 加载JWT token
alias load-jwt="source ~/.ai-proj-jwt.env && echo '${GREEN}✅ JWT Token已加载${NC}'"

# 别名3: 显示token信息
alias show-jwt='echo "${BLUE}📋 Current JWT Token:${NC}" && cat ~/.ai-proj-jwt-token && echo "" && echo "${BLUE}📊 Token Info:${NC}" && jq -R "split(\".\") | .[1] | @base64d | fromjson" ~/.ai-proj-jwt-token 2>/dev/null || echo "${YELLOW}⚠️  无法解析token${NC}"'

# 别名4: 测试token
alias test-jwt='TOKEN=$(cat ~/.ai-proj-jwt-token 2>/dev/null) && [ -n "$TOKEN" ] && curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/tasks?page=1&page_size=1 | jq . || echo "${RED}❌ Token无效或后端未启动${NC}"'

# 添加到shell配置文件
add_to_shell_config() {
    local shell_config="$1"
    local config_block='
# AI Project JWT工具别名
export AI_PROJ_ROOT="/Users/johnqiu/coding/www/projects/new-ai-proj"
alias gen-jwt="$AI_PROJ_ROOT/scripts/gen-jwt.sh"
alias load-jwt="source ~/.ai-proj-jwt.env && echo \"✅ JWT Token已加载\""
alias show-jwt='"'"'jq -R "split(\".\") | .[1] | @base64d | fromjson" ~/.ai-proj-jwt-token 2>/dev/null'"'"'
alias test-jwt='"'"'TOKEN=$(cat ~/.ai-proj-jwt-token 2>/dev/null) && [ -n "$TOKEN" ] && curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/tasks?page=1&page_size=1 | jq .'"'"'
'

    if [ -f "$shell_config" ]; then
        # 检查是否已经添加
        if ! grep -q "AI Project JWT工具别名" "$shell_config" 2>/dev/null; then
            echo "$config_block" >> "$shell_config"
            echo "${GREEN}✓ 已添加到 $shell_config${NC}"
        else
            echo "${YELLOW}• $shell_config 中已存在配置${NC}"
        fi
    fi
}

echo ""
echo "${GREEN}✅ 别名已在当前shell中配置成功!${NC}"
echo ""
echo "${YELLOW}📝 可用命令:${NC}"
echo "  ${BLUE}gen-jwt [username] [hours]${NC}  - 生成JWT token"
echo "  ${BLUE}load-jwt${NC}                     - 加载token到环境变量"
echo "  ${BLUE}show-jwt${NC}                     - 显示token信息"
echo "  ${BLUE}test-jwt${NC}                     - 测试token有效性"
echo ""
echo "${YELLOW}💡 永久生效:${NC}"
echo "  将以下命令添加到 ~/.zshrc 或 ~/.bashrc:"
echo ""
read -p "是否要将别名添加到 ~/.zshrc? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    add_to_shell_config "$HOME/.zshrc"
    echo ""
    echo "${GREEN}🎉 完成! 重新加载shell或运行:${NC}"
    echo "  source ~/.zshrc"
fi
