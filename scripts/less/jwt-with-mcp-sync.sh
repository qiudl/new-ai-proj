#!/usr/bin/env zsh

# 增强版JWT生成脚本 - 自动同步到MCP
# 集成原有jwt命令功能 + MCP自动同步

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "${BLUE}🔐 JWT Token生成与MCP同步工具${NC}"
echo "================================================"

# 获取参数
DAYS=${1:-7}

# 项目根目录
PROJECT_ROOT="$HOME/coding/www/projects/new-ai-proj"

# 执行JWT签名
echo "${YELLOW}1️⃣  生成JWT Token (有效期: ${DAYS}天)${NC}"
"$PROJECT_ROOT/scripts/gen-jwt.sh" admin "$((DAYS * 24))" > /dev/null 2>&1

# 从保存的文件读取token
JWT_TOKEN_FILE="$HOME/.ai-proj-jwt-token"
if [ ! -f "$JWT_TOKEN_FILE" ]; then
    echo "${RED}❌ Token文件不存在: $JWT_TOKEN_FILE${NC}"
    exit 1
fi

JWT_TOKEN=$(cat "$JWT_TOKEN_FILE" | tr -d '\n' | tr -d ' ')

if [ -z "$JWT_TOKEN" ]; then
    echo "${RED}❌ JWT生成失败${NC}"
    exit 1
fi

echo "${GREEN}✓ JWT Token生成成功${NC}"

# 保存到标准位置
echo ""
echo "${YELLOW}2️⃣  保存Token到标准位置${NC}"

JWT_TOKEN_FILE="$HOME/.ai-proj-jwt-token"
JWT_ENV_FILE="$HOME/.ai-proj-jwt.env"

# 保存纯token
echo "$JWT_TOKEN" > "$JWT_TOKEN_FILE"
echo "${GREEN}✓ 保存到: $JWT_TOKEN_FILE${NC}"

# 生成环境变量文件
EXPIRY_DATE=$(date -v+${DAYS}d "+%Y-%m-%dT%H:%M:%S%z")
cat > "$JWT_ENV_FILE" <<EOF
# AI Project JWT Token
# Generated: $(date "+%Y-%m-%d %H:%M:%S")
# User: admin (ID: 1)
# Expires: $EXPIRY_DATE

export AI_PROJ_JWT_TOKEN="$JWT_TOKEN"
export TOKEN="$JWT_TOKEN"
EOF

echo "${GREEN}✓ 保存到: $JWT_ENV_FILE${NC}"

# 同步到MCP配置
echo ""
echo "${YELLOW}3️⃣  同步到MCP配置${NC}"

MCP_ENV_FILE="$PROJECT_ROOT/mcp-task-bridge/.env"

if [ ! -f "$MCP_ENV_FILE" ]; then
    echo "${RED}❌ MCP配置文件不存在: $MCP_ENV_FILE${NC}"
    exit 1
fi

# 备份
BACKUP_FILE="${MCP_ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
cp "$MCP_ENV_FILE" "$BACKUP_FILE"

# 更新TASK_API_TOKEN和API_TOKEN
# 需要转义特殊字符
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

echo "${GREEN}✓ MCP配置已更新${NC}"
echo "${GREEN}✓ 备份文件: $BACKUP_FILE${NC}"

# 加载到当前shell
echo ""
echo "${YELLOW}4️⃣  加载到当前Shell${NC}"
export TOKEN="$JWT_TOKEN"
export AI_PROJ_JWT_TOKEN="$JWT_TOKEN"
echo "${GREEN}✓ 已设置环境变量: \$TOKEN 和 \$AI_PROJ_JWT_TOKEN${NC}"

# 显示摘要
echo ""
echo "${BLUE}================================================${NC}"
echo "${GREEN}✅ 全部完成！${NC}"
echo ""
echo "${YELLOW}📊 Token信息:${NC}"
echo "  有效期: ${DAYS}天"
echo "  过期时间: $EXPIRY_DATE"
echo "  Token前缀: ${JWT_TOKEN:0:50}..."
echo ""
echo "${YELLOW}📝 使用方法:${NC}"
echo "  • Bash命令: curl -H \"Authorization: Bearer \$TOKEN\" ..."
echo "  • 新终端: source ~/.ai-proj-jwt.env"
echo "  • 查看Token: jwt-show"
echo "  • 复制Token: jwt-copy"
echo ""
echo "${YELLOW}⚠️  重要提示:${NC}"
echo "  MCP服务器需要重启以应用新token"
echo "  • 自动重启: pkill -f 'mcp-task-bridge' (Claude Code会自动重启)"
echo "  • 或重启Claude Code应用"
echo ""
