#!/usr/bin/env zsh

# =============================================================================
# MCP Token管理工具 - 统一的Token管理命令行界面
# =============================================================================
# 用法:
#   mcp-token gen [username] [days]     - 生成新Token并同步
#   mcp-token sync                      - 同步现有Token到所有配置
#   mcp-token show                      - 显示当前Token信息
#   mcp-token verify                    - 验证Token是否有效
#   mcp-token status                    - 检查Token和MCP状态
#   mcp-token restart                   - 重启MCP服务器
#   mcp-token help                      - 显示帮助信息
# =============================================================================

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# 配置
PROJECT_ROOT="$HOME/coding/www/projects/new-ai-proj"
SCRIPTS_DIR="$PROJECT_ROOT/scripts"
TOKEN_FILE="$HOME/.ai-proj-jwt-token"
ENV_FILE="$HOME/.ai-proj-jwt.env"

# ============================================================================
# 辅助函数
# ============================================================================

print_header() {
    echo "${CYAN}╔═══════════════════════════════════════════════════════════════════╗${NC}"
    echo "${CYAN}║              MCP Token 管理工具                                   ║${NC}"
    echo "${CYAN}╚═══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_section() {
    echo ""
    echo "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo "${YELLOW}$1${NC}"
    echo "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

get_token() {
    if [ -f "$TOKEN_FILE" ]; then
        cat "$TOKEN_FILE" | tr -d '\n' | tr -d ' '
    else
        echo ""
    fi
}

decode_jwt_payload() {
    local token="$1"
    local payload=$(echo "$token" | cut -d. -f2)

    # 添加padding
    local len=$((${#payload} % 4))
    if [ $len -eq 2 ]; then
        payload="${payload}=="
    elif [ $len -eq 3 ]; then
        payload="${payload}="
    fi

    echo "$payload" | base64 -d 2>/dev/null | jq -r '.' 2>/dev/null || echo "{}"
}

# ============================================================================
# 命令实现
# ============================================================================

cmd_gen() {
    local username="${1:-admin}"
    local days="${2:-7}"

    print_header
    echo "${BLUE}📝 生成新Token并自动同步${NC}"
    echo ""

    "$SCRIPTS_DIR/jwt-auto-sync.sh" "$username" "$days" false
}

cmd_sync() {
    print_header
    echo "${BLUE}🔄 同步现有Token到所有配置${NC}"
    echo ""

    local token=$(get_token)
    if [ -z "$token" ]; then
        echo "${RED}❌ 未找到Token文件: $TOKEN_FILE${NC}"
        echo "${YELLOW}💡 提示: 运行 'mcp-token gen' 生成新Token${NC}"
        exit 1
    fi

    echo "${GREEN}✓ Token已找到${NC}"
    echo "  Token前缀: ${token:0:50}..."
    echo ""

    # 同步到Claude配置
    "$SCRIPTS_DIR/sync-jwt-to-claude.sh" "$token"
}

cmd_show() {
    print_header
    echo "${BLUE}📋 当前Token信息${NC}"
    echo ""

    local token=$(get_token)
    if [ -z "$token" ]; then
        echo "${RED}❌ 未找到Token${NC}"
        exit 1
    fi

    # 解码Token
    local payload=$(decode_jwt_payload "$token")

    echo "${YELLOW}Token详情:${NC}"
    echo "  完整Token: ${token:0:50}...${token: -10}"
    echo ""

    if [ -n "$payload" ] && [ "$payload" != "{}" ]; then
        echo "${YELLOW}Payload:${NC}"
        echo "$payload" | jq -C '.' 2>/dev/null || echo "$payload"
        echo ""

        # 提取关键信息
        local username=$(echo "$payload" | jq -r '.username // .sub // "N/A"')
        local user_id=$(echo "$payload" | jq -r '.user_id // "N/A"')
        local exp=$(echo "$payload" | jq -r '.exp // "N/A"')

        echo "${YELLOW}关键信息:${NC}"
        echo "  用户: $username (ID: $user_id)"

        if [ "$exp" != "N/A" ]; then
            local exp_date=$(date -r "$exp" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo "Invalid")
            local now=$(date +%s)
            local remaining=$((exp - now))

            echo "  过期时间: $exp_date"

            if [ $remaining -gt 0 ]; then
                local days=$((remaining / 86400))
                local hours=$(((remaining % 86400) / 3600))
                echo "  剩余时间: ${GREEN}$days 天 $hours 小时${NC}"
            else
                echo "  状态: ${RED}已过期${NC}"
            fi
        fi
    else
        echo "${YELLOW}⚠️  无法解码Payload${NC}"
    fi

    echo ""
    echo "${YELLOW}文件位置:${NC}"
    [ -f "$TOKEN_FILE" ] && echo "  ${GREEN}✓${NC} $TOKEN_FILE" || echo "  ${RED}✗${NC} $TOKEN_FILE"
    [ -f "$ENV_FILE" ] && echo "  ${GREEN}✓${NC} $ENV_FILE" || echo "  ${RED}✗${NC} $ENV_FILE"
}

cmd_verify() {
    print_header
    echo "${BLUE}🔍 验证Token有效性${NC}"
    echo ""

    local token=$(get_token)
    if [ -z "$token" ]; then
        echo "${RED}❌ 未找到Token${NC}"
        exit 1
    fi

    # 测试API连接
    echo "${YELLOW}测试API连接...${NC}"
    local response=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: Bearer $token" \
        http://localhost:8080/api/v1/auth/permissions 2>/dev/null || echo "error\n000")

    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n-1)

    if [ "$http_code" = "200" ]; then
        echo "${GREEN}✅ Token有效!${NC}"
        echo ""
        echo "${YELLOW}权限信息:${NC}"
        echo "$body" | jq -C '.' 2>/dev/null || echo "$body"
    elif [ "$http_code" = "401" ]; then
        echo "${RED}❌ Token无效或已过期${NC}"
        echo "${YELLOW}💡 提示: 运行 'mcp-token gen' 生成新Token${NC}"
    elif [ "$http_code" = "000" ]; then
        echo "${RED}❌ 无法连接到API服务器${NC}"
        echo "${YELLOW}💡 提示: 确保后端服务正在运行 (http://localhost:8080)${NC}"
    else
        echo "${RED}❌ 验证失败 (HTTP $http_code)${NC}"
        echo "$body"
    fi
}

cmd_status() {
    print_header
    echo "${BLUE}📊 Token和MCP状态检查${NC}"
    echo ""

    # 检查Token文件
    print_section "Token文件"
    [ -f "$TOKEN_FILE" ] && echo "${GREEN}✓${NC} ~/.ai-proj-jwt-token" || echo "${RED}✗${NC} ~/.ai-proj-jwt-token"
    [ -f "$ENV_FILE" ] && echo "${GREEN}✓${NC} ~/.ai-proj-jwt.env" || echo "${RED}✗${NC} ~/.ai-proj-jwt.env"

    # 检查MCP配置
    print_section "MCP配置文件"
    local mcp_env="$PROJECT_ROOT/mcp-task-bridge/.env"
    [ -f "$mcp_env" ] && echo "${GREEN}✓${NC} $mcp_env" || echo "${RED}✗${NC} $mcp_env"

    # 检查Claude配置
    print_section "Claude Desktop配置"
    local claude_configs=(
        "$HOME/Library/Application Support/Claude/claude_desktop_config.json"
        "$HOME/.config/claude-desktop/claude_desktop_config.json"
    )

    for config in "${claude_configs[@]}"; do
        if [ -f "$config" ]; then
            echo "${GREEN}✓${NC} $config"
            # 检查是否包含ai-proj配置
            if grep -q '"ai-proj"' "$config" 2>/dev/null; then
                echo "    ${BLUE}[包含 ai-proj MCP配置]${NC}"
            fi
        else
            echo "${RED}✗${NC} $config"
        fi
    done

    # 检查MCP进程
    print_section "MCP进程状态"
    local mcp_pids=$(ps aux | grep 'mcp-task-bridge' | grep -v grep | awk '{print $2}')
    if [ -n "$mcp_pids" ]; then
        echo "${GREEN}✓${NC} MCP进程运行中"
        echo "  PID: $mcp_pids"
    else
        echo "${YELLOW}⚠️${NC}  MCP进程未运行"
    fi

    # 检查后端API
    print_section "后端API状态"
    local api_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health 2>/dev/null || echo "000")
    if [ "$api_status" = "200" ]; then
        echo "${GREEN}✓${NC} 后端API运行中 (http://localhost:8080)"
    else
        echo "${RED}✗${NC} 后端API未响应"
    fi

    echo ""
}

cmd_restart() {
    print_header
    echo "${BLUE}🔄 重启MCP服务器${NC}"
    echo ""

    local mcp_pids=$(ps aux | grep 'mcp-task-bridge' | grep -v grep | awk '{print $2}')

    if [ -n "$mcp_pids" ]; then
        echo "找到MCP进程: $mcp_pids"
        echo "$mcp_pids" | xargs kill -9 2>/dev/null || true
        echo "${GREEN}✅ MCP进程已终止${NC}"
        echo "${YELLOW}💡 Claude Code将在下次调用MCP工具时自动重启服务${NC}"
    else
        echo "${YELLOW}⚠️  未找到运行中的MCP进程${NC}"
    fi
}

cmd_help() {
    print_header
    echo "${BLUE}使用方法:${NC}"
    echo ""
    echo "  ${CYAN}mcp-token gen [username] [days]${NC}"
    echo "    生成新Token并自动同步到所有配置"
    echo "    默认: username=admin, days=7"
    echo ""
    echo "  ${CYAN}mcp-token sync${NC}"
    echo "    同步现有Token到所有配置文件"
    echo ""
    echo "  ${CYAN}mcp-token show${NC}"
    echo "    显示当前Token的详细信息"
    echo ""
    echo "  ${CYAN}mcp-token verify${NC}"
    echo "    验证Token是否有效(通过API测试)"
    echo ""
    echo "  ${CYAN}mcp-token status${NC}"
    echo "    检查Token、配置文件、MCP进程状态"
    echo ""
    echo "  ${CYAN}mcp-token restart${NC}"
    echo "    重启MCP服务器"
    echo ""
    echo "  ${CYAN}mcp-token help${NC}"
    echo "    显示此帮助信息"
    echo ""
    echo "${BLUE}示例:${NC}"
    echo "  ${CYAN}# 生成7天有效期的Token${NC}"
    echo "  mcp-token gen"
    echo ""
    echo "  ${CYAN}# 生成30天有效期的Token${NC}"
    echo "  mcp-token gen admin 30"
    echo ""
    echo "  ${CYAN}# 查看Token信息和状态${NC}"
    echo "  mcp-token show"
    echo "  mcp-token status"
    echo ""
    echo "  ${CYAN}# 验证并重启${NC}"
    echo "  mcp-token verify && mcp-token restart"
    echo ""
}

# ============================================================================
# 主流程
# ============================================================================

COMMAND="${1:-help}"

case "$COMMAND" in
    gen|generate)
        cmd_gen "${2:-admin}" "${3:-7}"
        ;;
    sync)
        cmd_sync
        ;;
    show|info)
        cmd_show
        ;;
    verify|test)
        cmd_verify
        ;;
    status)
        cmd_status
        ;;
    restart)
        cmd_restart
        ;;
    help|--help|-h)
        cmd_help
        ;;
    *)
        echo "${RED}❌ 未知命令: $COMMAND${NC}"
        echo ""
        cmd_help
        exit 1
        ;;
esac
