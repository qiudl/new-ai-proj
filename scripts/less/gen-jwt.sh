#!/usr/bin/env zsh

# =============================================================================
# 简化版JWT生成工具 - 使用私钥签名JWT避免每次调用MCP认证
# =============================================================================

set -e

# 颜色
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 进入scripts目录
cd "$(dirname "$0")"

# 加载环境变量
[ -f ~/.ai-proj-tunnel.env ] && source ~/.ai-proj-tunnel.env
[ -f ../backend/.env ] && source ../backend/.env

# 默认配置
TARGET_USERNAME="${1:-admin}"
EXPIRATION_HOURS="${2:-168}"
JWT_SECRET="${JWT_SECRET:-local_jwt_secret_key_2024}"
DB_PASSWORD="${DB_PASSWORD:-SecureAI2024!@#\$%^}"

# Token保存路径
TOKEN_FILE="$HOME/.ai-proj-jwt-token"
ENV_FILE="$HOME/.ai-proj-jwt.env"

echo "${BLUE}🔐 本地JWT生成工具${NC}"
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 检查jq
if ! command -v jq &> /dev/null; then
    echo "${RED}❌ 需要安装 jq: brew install jq${NC}"
    exit 1
fi

# 查询用户信息
echo "${BLUE}📊 查询用户信息...${NC}"
USER_INFO=$(PGPASSWORD="$DB_PASSWORD" psql -h 127.0.0.1 -p 5433 -U ai_prod_user -d ai_project_prod -t -A -F '|' -c "
SELECT id, username, COALESCE(role, 'user'), COALESCE(user_type, 'system')
FROM users
WHERE username = '$TARGET_USERNAME' AND deleted_at IS NULL
LIMIT 1;
")

if [ -z "$USER_INFO" ]; then
    echo "${RED}❌ 用户 '$TARGET_USERNAME' 不存在${NC}"
    exit 1
fi

USER_ID=$(echo "$USER_INFO" | cut -d'|' -f1)
USER_USERNAME=$(echo "$USER_INFO" | cut -d'|' -f2)
USER_ROLE=$(echo "$USER_INFO" | cut -d'|' -f3)
USER_TYPE=$(echo "$USER_INFO" | cut -d'|' -f4)

echo "${GREEN}✓ 用户: $USER_USERNAME (ID: $USER_ID, 角色: $USER_ROLE)${NC}"

# 确保jwt-gen-tool已编译
if [ ! -f jwt-gen-tool ]; then
    echo "${BLUE}⚙️  编译JWT生成器...${NC}"
    go mod tidy > /dev/null 2>&1
    go build -o jwt-gen-tool jwt-gen-tool.go 2>&1 | grep -v "^go:" || true
fi

# 生成token
echo "${BLUE}🔑 生成JWT token...${NC}"
RESULT=$(./jwt-gen-tool "$JWT_SECRET" "$USER_ID" "$USER_USERNAME" "$USER_ROLE" "$USER_TYPE" "$EXPIRATION_HOURS")

TOKEN=$(echo "$RESULT" | jq -r '.token')
EXPIRES_AT=$(echo "$RESULT" | jq -r '.expires_at')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "${RED}❌ Token生成失败${NC}"
    exit 1
fi

# 保存token
echo "$TOKEN" > "$TOKEN_FILE"
chmod 600 "$TOKEN_FILE"

# 生成环境变量文件
cat > "$ENV_FILE" <<ENVEOF
# AI Project JWT Token
# Generated: $(date '+%Y-%m-%d %H:%M:%S')
# User: $USER_USERNAME (ID: $USER_ID)
# Expires: $EXPIRES_AT

export AI_PROJ_JWT_TOKEN="$TOKEN"
export TOKEN="$TOKEN"
ENVEOF

chmod 600 "$ENV_FILE"

echo "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${GREEN}✅ JWT Token 生成成功!${NC}"
echo "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "${YELLOW}📋 Token信息:${NC}"
echo "  用户: $USER_USERNAME (ID: $USER_ID)"
echo "  角色: $USER_ROLE"
echo "  类型: $USER_TYPE"
echo "  过期时间: $EXPIRES_AT"
echo ""
echo "${YELLOW}💾 已保存到:${NC}"
echo "  • $TOKEN_FILE"
echo "  • $ENV_FILE"
echo ""
echo "${YELLOW}🚀 使用方法:${NC}"
echo ""
echo "${BLUE}1. 加载环境变量:${NC}"
echo "   source ~/.ai-proj-jwt.env"
echo ""
echo "${BLUE}2. 在bash命令中使用:${NC}"
echo "   TOKEN=\"\$(cat ~/.ai-proj-jwt-token)\""
echo "   curl -H \"Authorization: Bearer \$TOKEN\" http://localhost:8080/api/v1/tasks"
echo ""
echo "${BLUE}3. 刷新Token:${NC}"
echo "   ./scripts/gen-jwt.sh $TARGET_USERNAME $EXPIRATION_HOURS"
echo ""

# 验证token
echo "${BLUE}🔍 验证Token...${NC}"
VERIFY=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/auth/permissions 2>/dev/null || echo "")

if [ -n "$VERIFY" ] && [ "$VERIFY" != "null" ]; then
    echo "${GREEN}✅ Token验证成功!${NC}"
    echo "$VERIFY" | jq -C '.' 2>/dev/null || echo "$VERIFY"
else
    echo "${YELLOW}⚠️  无法验证token (后端未启动?)${NC}"
fi

echo ""
echo "${GREEN}🎉 完成! 运行: source ~/.ai-proj-jwt.env${NC}"
