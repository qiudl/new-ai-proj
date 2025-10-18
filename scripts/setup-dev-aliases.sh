#!/bin/bash

###############################################################################
# AI项目开发环境别名配置脚本
# 功能：为开发脚本创建快捷别名，提供更便捷的命令行体验
# 用法: source scripts/setup-dev-aliases.sh
###############################################################################

# ============================================================================
# 颜色输出
# ============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ============================================================================
# 项目路径检测
# ============================================================================

# 尝试多种方式检测项目根目录
if [ -n "$BASH_SOURCE" ]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
elif [ -f "./scripts/setup-dev-aliases.sh" ]; then
    PROJECT_ROOT="$(pwd)"
else
    PROJECT_ROOT="/Users/johnqiu/coding/www/projects/new-ai-proj"
fi

# ============================================================================
# 别名定义
# ============================================================================

# 开发环境管理
alias dev="$PROJECT_ROOT/scripts/dev.sh"
alias dev-start="$PROJECT_ROOT/scripts/dev.sh both"
alias dev-backend="$PROJECT_ROOT/scripts/dev.sh backend"
alias dev-frontend="$PROJECT_ROOT/scripts/dev.sh frontend"
alias dev-stop="$PROJECT_ROOT/scripts/dev.sh stop"
alias dev-status="$PROJECT_ROOT/scripts/dev.sh status"

# 数据库隧道管理
alias tunnel="$PROJECT_ROOT/scripts/tunnel.sh"
alias tunnel-start="$PROJECT_ROOT/scripts/tunnel.sh start"
alias tunnel-stop="$PROJECT_ROOT/scripts/tunnel.sh stop"
alias tunnel-restart="$PROJECT_ROOT/scripts/tunnel.sh restart"
alias tunnel-status="$PROJECT_ROOT/scripts/tunnel.sh status"
alias tunnel-check="$PROJECT_ROOT/scripts/tunnel.sh check"

# 项目目录快速跳转
alias cdproj="cd $PROJECT_ROOT"
alias cdback="cd $PROJECT_ROOT/backend"
alias cdfront="cd $PROJECT_ROOT/frontend"
alias cdscript="cd $PROJECT_ROOT/scripts"

# 日志查看
alias log-backend="tail -f /tmp/ai-proj-backend.log"
alias log-frontend="tail -f /tmp/ai-proj-frontend.log"
alias log-tunnel="tail -f /tmp/ai-proj-tunnel.log"
alias log-all="tail -f /tmp/ai-proj-*.log"

# 端口管理
alias port-check="lsof -i :8080 -i :3000 -i :5433"
alias port-kill-backend="lsof -ti :8080 | xargs kill -9 2>/dev/null || echo 'No process on port 8080'"
alias port-kill-frontend="lsof -ti :3000 | xargs kill -9 2>/dev/null || echo 'No process on port 3000'"
alias port-kill-tunnel="lsof -ti :5433 | xargs kill -9 2>/dev/null || echo 'No process on port 5433'"
alias port-kill-all="lsof -ti :8080 :3000 :5433 | xargs kill -9 2>/dev/null || echo 'No processes to kill'"

# Git快捷命令（项目相关）
alias gst="git status"
alias glog="git log --oneline --graph --decorate -10"
alias gd="git diff"
alias ga="git add"
alias gc="git commit"
alias gp="git push"

# 数据库连接
alias db-connect="PGPASSWORD='SecureAI2024!@#$%^' psql -h localhost -p 5433 -U ai_prod_user -d ai_project_prod"
alias db-test="PGPASSWORD='SecureAI2024!@#$%^' psql -h localhost -p 5433 -U ai_prod_user -d ai_project_prod -c 'SELECT 1'"

# 后端快捷命令
alias backend-build="cd $PROJECT_ROOT/backend && go build -o backend main.go"
alias backend-test="cd $PROJECT_ROOT/backend && go test ./..."
alias backend-run="cd $PROJECT_ROOT/backend && go run main.go"

# 前端快捷命令
alias frontend-install="cd $PROJECT_ROOT/frontend && npm install"
alias frontend-start="cd $PROJECT_ROOT/frontend && npm start"
alias frontend-build="cd $PROJECT_ROOT/frontend && npm run build"
alias frontend-test="cd $PROJECT_ROOT/frontend && npm test"

# ============================================================================
# 辅助函数
# ============================================================================

# 显示所有别名
dev-aliases() {
    cat << EOF

${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}
${CYAN}🚀 AI项目开发环境快捷命令${NC}
${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}

${YELLOW}开发环境管理:${NC}
  ${GREEN}dev${NC}                启动完整开发环境（默认both）
  ${GREEN}dev-start${NC}          启动后端和前端
  ${GREEN}dev-backend${NC}        仅启动后端
  ${GREEN}dev-frontend${NC}       仅启动前端
  ${GREEN}dev-stop${NC}           停止所有服务
  ${GREEN}dev-status${NC}         查看服务状态

${YELLOW}数据库隧道:${NC}
  ${GREEN}tunnel${NC}             隧道管理（显示帮助）
  ${GREEN}tunnel-start${NC}       启动隧道
  ${GREEN}tunnel-stop${NC}        停止隧道
  ${GREEN}tunnel-restart${NC}     重启隧道
  ${GREEN}tunnel-status${NC}      查看隧道状态
  ${GREEN}tunnel-check${NC}       快速健康检查

${YELLOW}目录跳转:${NC}
  ${GREEN}cdproj${NC}             跳转到项目根目录
  ${GREEN}cdback${NC}             跳转到backend目录
  ${GREEN}cdfront${NC}            跳转到frontend目录
  ${GREEN}cdscript${NC}           跳转到scripts目录

${YELLOW}日志查看:${NC}
  ${GREEN}log-backend${NC}        查看后端日志
  ${GREEN}log-frontend${NC}       查看前端日志
  ${GREEN}log-tunnel${NC}         查看隧道日志
  ${GREEN}log-all${NC}            查看所有日志

${YELLOW}端口管理:${NC}
  ${GREEN}port-check${NC}         检查端口占用情况
  ${GREEN}port-kill-backend${NC}  停止后端端口进程
  ${GREEN}port-kill-frontend${NC} 停止前端端口进程
  ${GREEN}port-kill-tunnel${NC}   停止隧道端口进程
  ${GREEN}port-kill-all${NC}      停止所有端口进程

${YELLOW}数据库:${NC}
  ${GREEN}db-connect${NC}         连接到数据库
  ${GREEN}db-test${NC}            测试数据库连接

${YELLOW}后端开发:${NC}
  ${GREEN}backend-build${NC}      构建后端
  ${GREEN}backend-test${NC}       运行后端测试
  ${GREEN}backend-run${NC}        直接运行后端

${YELLOW}前端开发:${NC}
  ${GREEN}frontend-install${NC}   安装前端依赖
  ${GREEN}frontend-start${NC}     启动前端开发服务器
  ${GREEN}frontend-build${NC}     构建前端生产版本
  ${GREEN}frontend-test${NC}      运行前端测试

${YELLOW}快速开始示例:${NC}
  # 启动完整开发环境
  ${GREEN}dev${NC}

  # 仅启动后端
  ${GREEN}dev-backend${NC}

  # 查看状态
  ${GREEN}dev-status${NC}

  # 查看后端日志
  ${GREEN}log-backend${NC}

  # 停止所有服务
  ${GREEN}dev-stop${NC}

${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}

${BLUE}💡 提示: 使用 'dev-aliases' 随时查看此帮助${NC}

EOF
}

# 环境诊断
dev-doctor() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}🔍 开发环境诊断${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # 检查项目目录
    echo -e "${YELLOW}项目目录:${NC}"
    if [ -d "$PROJECT_ROOT" ]; then
        echo -e "  ${GREEN}✓${NC} $PROJECT_ROOT"
    else
        echo -e "  ${RED}✗${NC} 项目目录不存在: $PROJECT_ROOT"
    fi
    echo ""

    # 检查脚本
    echo -e "${YELLOW}脚本检查:${NC}"
    for script in "scripts/dev.sh" "scripts/tunnel.sh"; do
        if [ -f "$PROJECT_ROOT/$script" ] && [ -x "$PROJECT_ROOT/$script" ]; then
            echo -e "  ${GREEN}✓${NC} $script"
        else
            echo -e "  ${RED}✗${NC} $script (不存在或无执行权限)"
        fi
    done
    echo ""

    # 检查依赖
    echo -e "${YELLOW}依赖检查:${NC}"
    for cmd in go node npm psql ssh lsof jq; do
        if command -v $cmd > /dev/null 2>&1; then
            local version=$(${cmd} --version 2>&1 | head -1 | cut -d' ' -f1-3)
            echo -e "  ${GREEN}✓${NC} $cmd ($version)"
        else
            echo -e "  ${YELLOW}⚠${NC} $cmd (未安装)"
        fi
    done
    echo ""

    # 检查服务状态
    echo -e "${YELLOW}服务状态:${NC}"

    # 隧道
    if lsof -i :5433 > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} 数据库隧道 (端口 5433)"
    else
        echo -e "  ${RED}✗${NC} 数据库隧道 (未运行)"
    fi

    # 后端
    if lsof -i :8080 > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} 后端服务 (端口 8080)"
    else
        echo -e "  ${RED}✗${NC} 后端服务 (未运行)"
    fi

    # 前端
    if lsof -i :3000 > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} 前端服务 (端口 3000)"
    else
        echo -e "  ${RED}✗${NC} 前端服务 (未运行)"
    fi

    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# 快速启动
dev-quick() {
    echo -e "${BLUE}🚀 快速启动开发环境...${NC}"
    dev-start
}

# ============================================================================
# 安装到shell配置文件
# ============================================================================

dev-install() {
    local shell_config=""
    local shell_name=$(basename "$SHELL")

    # 检测shell类型
    case "$shell_name" in
        zsh)
            shell_config="$HOME/.zshrc"
            ;;
        bash)
            shell_config="$HOME/.bashrc"
            if [ ! -f "$shell_config" ]; then
                shell_config="$HOME/.bash_profile"
            fi
            ;;
        *)
            echo -e "${RED}✗${NC} 不支持的shell: $shell_name"
            return 1
            ;;
    esac

    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}📦 安装开发环境别名${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # 检查是否已安装
    if grep -q "# AI Project Dev Aliases" "$shell_config" 2>/dev/null; then
        echo -e "${YELLOW}⚠${NC} 别名已安装在: $shell_config"
        read -p "是否覆盖安装? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}ℹ${NC} 取消安装"
            return 0
        fi

        # 删除旧配置
        sed -i.bak '/# AI Project Dev Aliases/,/# End AI Project Dev Aliases/d' "$shell_config"
        echo -e "${GREEN}✓${NC} 已删除旧配置"
    fi

    # 添加新配置
    cat >> "$shell_config" << 'EOF'

# ============================================================================
# AI Project Dev Aliases
# Auto-generated by scripts/setup-dev-aliases.sh
# ============================================================================

# 加载AI项目开发别名
if [ -f "$HOME/coding/www/projects/new-ai-proj/scripts/setup-dev-aliases.sh" ]; then
    source "$HOME/coding/www/projects/new-ai-proj/scripts/setup-dev-aliases.sh"
fi

# End AI Project Dev Aliases
# ============================================================================
EOF

    echo -e "${GREEN}✓${NC} 别名已安装到: $shell_config"
    echo ""
    echo -e "${YELLOW}下一步:${NC}"
    echo "  1. 重新加载配置: ${GREEN}source $shell_config${NC}"
    echo "  2. 或者重启终端"
    echo "  3. 使用 ${GREEN}dev-aliases${NC} 查看所有可用命令"
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# ============================================================================
# 显示欢迎信息
# ============================================================================

echo ""
echo -e "${GREEN}✓${NC} AI项目开发别名已加载"
echo -e "${BLUE}ℹ${NC} 使用 ${GREEN}dev-aliases${NC} 查看所有可用命令"
echo -e "${BLUE}ℹ${NC} 使用 ${GREEN}dev-install${NC} 将别名永久安装到shell配置"
echo -e "${BLUE}ℹ${NC} 使用 ${GREEN}dev-doctor${NC} 进行环境诊断"
echo ""

# ============================================================================
# Export函数（使其在子shell中可用）
# ============================================================================

export -f dev-aliases 2>/dev/null || true
export -f dev-doctor 2>/dev/null || true
export -f dev-quick 2>/dev/null || true
export -f dev-install 2>/dev/null || true
