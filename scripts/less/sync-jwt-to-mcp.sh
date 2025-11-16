#!/usr/bin/env zsh

# JWT Token同步到MCP配置脚本
# 功能：将本地JWT token自动同步到MCP服务器的.env文件

set -e

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "${GREEN}🔄 JWT Token同步工具${NC}"
echo "================================"

# JWT token文件路径
JWT_TOKEN_FILE="$HOME/.ai-proj-jwt-token"
JWT_ENV_FILE="$HOME/.ai-proj-jwt.env"

# MCP .env 文件路径
MCP_ENV_FILE="$HOME/coding/www/projects/new-ai-proj/mcp-task-bridge/.env"

# 检查JWT token文件是否存在
if [ ! -f "$JWT_TOKEN_FILE" ]; then
    echo "${RED}❌ JWT token文件不存在: $JWT_TOKEN_FILE${NC}"
    echo "${YELLOW}💡 提示: 请先运行 'jwt' 命令生成token${NC}"
    exit 1
fi

# 读取JWT token
JWT_TOKEN=$(cat "$JWT_TOKEN_FILE" | tr -d '\n' | tr -d ' ')

if [ -z "$JWT_TOKEN" ]; then
    echo "${RED}❌ JWT token为空${NC}"
    exit 1
fi

echo "${GREEN}✓ 已读取JWT token${NC}"
echo "Token前缀: ${JWT_TOKEN:0:50}..."

# 检查MCP .env文件是否存在
if [ ! -f "$MCP_ENV_FILE" ]; then
    echo "${RED}❌ MCP .env文件不存在: $MCP_ENV_FILE${NC}"
    exit 1
fi

# 备份原始.env文件
BACKUP_FILE="${MCP_ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
cp "$MCP_ENV_FILE" "$BACKUP_FILE"
echo "${GREEN}✓ 已备份原始配置到: $BACKUP_FILE${NC}"

# 使用sed更新TASK_API_TOKEN
# macOS的sed需要-i后跟备份后缀，使用''表示不创建备份
sed -i '' "s|^TASK_API_TOKEN=.*|TASK_API_TOKEN=$JWT_TOKEN|" "$MCP_ENV_FILE"

# 如果TASK_API_TOKEN不存在，则添加
if ! grep -q "^TASK_API_TOKEN=" "$MCP_ENV_FILE"; then
    echo "" >> "$MCP_ENV_FILE"
    echo "# API认证令牌（自动同步于 $(date)）" >> "$MCP_ENV_FILE"
    echo "TASK_API_TOKEN=$JWT_TOKEN" >> "$MCP_ENV_FILE"
fi

echo "${GREEN}✓ 已更新MCP配置文件${NC}"

# 验证更新
CURRENT_TOKEN=$(grep "^TASK_API_TOKEN=" "$MCP_ENV_FILE" | cut -d'=' -f2)
if [ "$CURRENT_TOKEN" = "$JWT_TOKEN" ]; then
    echo "${GREEN}✅ Token同步成功！${NC}"
else
    echo "${RED}❌ Token同步失败，请检查${NC}"
    exit 1
fi

echo ""
echo "${YELLOW}📝 下一步操作:${NC}"
echo "1. 重启Claude Code MCP服务器以应用新token"
echo "2. 或者使用命令: pkill -f 'mcp-task-bridge'"
echo ""
echo "${GREEN}完成！${NC}"
