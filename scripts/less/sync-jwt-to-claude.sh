#!/usr/bin/env zsh

# =============================================================================
# Claude配置文件JWT Token同步工具
# 自动更新Claude Desktop配置文件中的JWT Token
# =============================================================================

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Claude配置文件路径
CLAUDE_CONFIG_PATHS=(
    "$HOME/Library/Application Support/Claude/claude_desktop_config.json"
    "$HOME/.config/claude-desktop/claude_desktop_config.json"
)

# Token来源（按优先级）
TOKEN_SOURCES=(
    "$HOME/.ai-proj-jwt-token"
    "$HOME/.ai-proj-jwt.env"
)

echo "${BLUE}🔄 Claude配置文件JWT同步工具${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ============================================================================
# 读取JWT Token
# ============================================================================
read_jwt_token() {
    local jwt_token=""

    # 尝试从命令行参数读取
    if [ -n "$1" ]; then
        jwt_token="$1"
        echo "${GREEN}✓ 使用命令行提供的Token${NC}" >&2
        echo "$jwt_token"
        return 0
    fi

    # 从文件读取
    for source in "${TOKEN_SOURCES[@]}"; do
        if [ -f "$source" ]; then
            if [[ "$source" == *.env ]]; then
                # 从env文件提取
                jwt_token=$(grep -E '^export (TOKEN|AI_PROJ_JWT_TOKEN)=' "$source" | head -1 | cut -d'"' -f2)
            else
                # 直接读取
                jwt_token=$(cat "$source" | tr -d '\n' | tr -d ' ')
            fi

            if [ -n "$jwt_token" ] && [ "$jwt_token" != "null" ]; then
                echo "${GREEN}✓ 从 $source 读取Token${NC}" >&2
                echo "$jwt_token"
                return 0
            fi
        fi
    done

    echo "${RED}❌ 无法找到有效的JWT Token${NC}" >&2
    echo "${YELLOW}💡 提示: 先运行 jwt 命令生成token${NC}" >&2
    return 1
}

# ============================================================================
# 更新JSON配置文件
# ============================================================================
update_json_config() {
    local config_file="$1"
    local jwt_token="$2"

    if [ ! -f "$config_file" ]; then
        echo "${YELLOW}⚠️  配置文件不存在: $config_file${NC}"
        return 1
    fi

    echo "${BLUE}📝 更新: $config_file${NC}"

    # 备份原文件
    local backup_file="${config_file}.backup.$(date +%Y%m%d_%H%M%S)"
    cp "$config_file" "$backup_file"
    echo "  ${GREEN}✓ 备份: $backup_file${NC}"

    # 检查配置文件是否包含ai-proj MCP配置
    if ! grep -q '"ai-proj"' "$config_file"; then
        echo "  ${YELLOW}⚠️  未找到ai-proj MCP配置,跳过${NC}"
        rm "$backup_file"
        return 1
    fi

    # 使用jq更新配置
    if command -v jq &> /dev/null; then
        # 使用jq安全更新
        local temp_file="${config_file}.tmp"
        jq --arg token "$jwt_token" \
            '.mcpServers["ai-proj"].env.TASK_API_TOKEN = $token |
             .mcpServers["ai-proj"].env.API_TOKEN = $token' \
            "$config_file" > "$temp_file"

        mv "$temp_file" "$config_file"
        echo "  ${GREEN}✓ Token已更新 (使用jq)${NC}"
    else
        # 使用sed作为备选方案
        local escaped_token=$(echo "$jwt_token" | sed 's/[\/&]/\\&/g')

        # 更新TASK_API_TOKEN
        sed -i.tmp "s|\"TASK_API_TOKEN\": \"[^\"]*\"|\"TASK_API_TOKEN\": \"$escaped_token\"|g" "$config_file"

        # 更新API_TOKEN
        sed -i.tmp "s|\"API_TOKEN\": \"[^\"]*\"|\"API_TOKEN\": \"$escaped_token\"|g" "$config_file"

        rm -f "${config_file}.tmp"
        echo "  ${GREEN}✓ Token已更新 (使用sed)${NC}"
    fi

    return 0
}

# ============================================================================
# 验证配置文件
# ============================================================================
verify_config() {
    local config_file="$1"

    if [ ! -f "$config_file" ]; then
        return 1
    fi

    # 检查JSON格式
    if command -v jq &> /dev/null; then
        if ! jq empty "$config_file" 2>/dev/null; then
            echo "  ${RED}❌ JSON格式错误${NC}"
            return 1
        fi

        # 验证token是否存在
        local token=$(jq -r '.mcpServers["ai-proj"].env.TASK_API_TOKEN // empty' "$config_file")
        if [ -n "$token" ]; then
            echo "  ${GREEN}✓ 配置验证通过${NC}"
            echo "  Token前缀: ${token:0:50}..."
            return 0
        else
            echo "  ${RED}❌ Token未找到${NC}"
            return 1
        fi
    else
        echo "  ${YELLOW}⚠️  无法验证 (需要jq)${NC}"
        return 0
    fi
}

# ============================================================================
# 主流程
# ============================================================================

# 读取Token
JWT_TOKEN=$(read_jwt_token "$1")
if [ -z "$JWT_TOKEN" ]; then
    exit 1
fi

echo ""
echo "${BLUE}Token前缀:${NC} ${JWT_TOKEN:0:50}..."
echo ""

# 更新所有配置文件
updated_count=0
for config_path in "${CLAUDE_CONFIG_PATHS[@]}"; do
    if update_json_config "$config_path" "$JWT_TOKEN"; then
        verify_config "$config_path"
        updated_count=$((updated_count + 1))
        echo ""
    fi
done

# 显示结果
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $updated_count -eq 0 ]; then
    echo "${RED}❌ 没有更新任何配置文件${NC}"
    exit 1
else
    echo "${GREEN}✅ 成功更新 $updated_count 个配置文件${NC}"
fi

echo ""
echo "${YELLOW}📋 后续步骤:${NC}"
echo "  1. 重启Claude Code应用 (Cmd+Q 然后重新打开)"
echo "  2. 或者运行: pkill -f 'Claude' (会自动重启MCP)"
echo ""
echo "${YELLOW}💡 提示:${NC}"
echo "  • 验证MCP连接: 在Claude Code中尝试使用MCP工具"
echo "  • 查看MCP日志: tail -f ~/.config/claude-desktop/logs/*"
echo ""
