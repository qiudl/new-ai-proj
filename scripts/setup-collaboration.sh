#!/bin/bash

# 双人协同开发环境一键安装脚本
# 用途：快速设置所有协同开发所需的工具和配置

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${GREEN}🤝 双人协同开发环境设置${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. 检查Git环境
echo -e "${BLUE}1️⃣  检查Git环境...${NC}"
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ 错误：未安装Git${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Git已安装: $(git --version)${NC}"

# 检查Git配置
if [ -z "$(git config user.name)" ] || [ -z "$(git config user.email)" ]; then
    echo -e "${YELLOW}⚠️  Git用户信息未配置${NC}"
    echo "请配置你的Git用户信息："
    echo "  git config --global user.name \"Your Name\""
    echo "  git config --global user.email \"your.email@example.com\""
    exit 1
fi
echo -e "${GREEN}✅ Git用户已配置: $(git config user.name) <$(git config user.email)>${NC}"
echo ""

# 2. 安装Git Hooks
echo -e "${BLUE}2️⃣  安装Git Hooks...${NC}"
bash "$PROJECT_ROOT/scripts/setup-git-hooks.sh"
echo ""

# 3. 设置便捷命令别名
echo -e "${BLUE}3️⃣  设置便捷命令别名...${NC}"

# 检测shell类型
if [ -n "$ZSH_VERSION" ]; then
    SHELL_RC="$HOME/.zshrc"
elif [ -n "$BASH_VERSION" ]; then
    SHELL_RC="$HOME/.bashrc"
else
    SHELL_RC="$HOME/.profile"
fi

# 添加别名到shell配置
if ! grep -q "# AI Project Collaboration Commands" "$SHELL_RC" 2>/dev/null; then
    cat >> "$SHELL_RC" << 'EOF'

# AI Project Collaboration Commands
alias collab="bash $HOME/coding/www/projects/new-ai-proj/scripts/collab-commands.sh"
alias collab-sync="bash $HOME/coding/www/projects/new-ai-proj/scripts/collab-commands.sh sync"
alias collab-new="bash $HOME/coding/www/projects/new-ai-proj/scripts/collab-commands.sh new"
alias collab-status="bash $HOME/coding/www/projects/new-ai-proj/scripts/collab-commands.sh status"
alias collab-push="bash $HOME/coding/www/projects/new-ai-proj/scripts/collab-commands.sh push"
alias collab-pr="bash $HOME/coding/www/projects/new-ai-proj/scripts/collab-commands.sh pr"
alias collab-review="bash $HOME/coding/www/projects/new-ai-proj/scripts/collab-commands.sh review"
alias collab-clean="bash $HOME/coding/www/projects/new-ai-proj/scripts/collab-commands.sh clean"
EOF
    echo -e "${GREEN}✅ 已添加别名到 $SHELL_RC${NC}"
else
    echo -e "${YELLOW}⚠️  别名已存在，跳过${NC}"
fi
echo ""

# 4. 检查GitHub CLI
echo -e "${BLUE}4️⃣  检查GitHub CLI (gh)...${NC}"
if command -v gh &> /dev/null; then
    echo -e "${GREEN}✅ GitHub CLI已安装: $(gh --version | head -n 1)${NC}"

    # 检查是否已认证
    if gh auth status &> /dev/null; then
        echo -e "${GREEN}✅ GitHub CLI已认证${NC}"
    else
        echo -e "${YELLOW}⚠️  GitHub CLI未认证${NC}"
        echo "请运行以下命令进行认证："
        echo "  gh auth login"
    fi
else
    echo -e "${YELLOW}⚠️  GitHub CLI未安装${NC}"
    echo ""
    echo "安装GitHub CLI可以获得更好的协同开发体验："
    echo ""
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "  macOS安装："
        echo "    brew install gh"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "  Linux安装："
        echo "    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg"
        echo "    sudo apt install gh"
    fi
    echo ""
    echo "  安装后运行："
    echo "    gh auth login"
fi
echo ""

# 5. 检查开发环境
echo -e "${BLUE}5️⃣  检查开发环境...${NC}"

# Go环境
if command -v go &> /dev/null; then
    echo -e "${GREEN}✅ Go已安装: $(go version)${NC}"
else
    echo -e "${YELLOW}⚠️  Go未安装${NC}"
fi

# Node.js环境
if command -v node &> /dev/null; then
    echo -e "${GREEN}✅ Node.js已安装: $(node --version)${NC}"
else
    echo -e "${YELLOW}⚠️  Node.js未安装${NC}"
fi

# Docker环境
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✅ Docker已安装: $(docker --version)${NC}"
else
    echo -e "${YELLOW}⚠️  Docker未安装${NC}"
fi
echo ""

# 6. 创建示例配置文件
echo -e "${BLUE}6️⃣  创建示例配置文件...${NC}"

# 创建.env.local示例
if [ ! -f "$PROJECT_ROOT/backend/.env.local.example" ]; then
    cat > "$PROJECT_ROOT/backend/.env.local.example" << 'EOF'
# 本地开发环境配置示例
# 复制此文件为 .env.local 并修改配置

# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_USER=dev_user
DB_PASSWORD=dev_password_2024
DB_NAME=ai_project_db

# 服务器配置
PORT=8080
APP_ENV=development

# JWT配置
JWT_SECRET=your-local-secret-key
JWT_EXPIRATION=24h
EOF
    echo -e "${GREEN}✅ 已创建 backend/.env.local.example${NC}"
else
    echo -e "${YELLOW}⚠️  backend/.env.local.example 已存在${NC}"
fi

if [ ! -f "$PROJECT_ROOT/frontend/.env.local.example" ]; then
    cat > "$PROJECT_ROOT/frontend/.env.local.example" << 'EOF'
# 前端本地开发环境配置示例
# 复制此文件为 .env.local 并修改配置

REACT_APP_API_URL=http://localhost:8080
REACT_APP_ENV=development
EOF
    echo -e "${GREEN}✅ 已创建 frontend/.env.local.example${NC}"
else
    echo -e "${YELLOW}⚠️  frontend/.env.local.example 已存在${NC}"
fi
echo ""

# 7. 显示快速开始指南
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${GREEN}✅ 安装完成！${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW}📚 下一步：${NC}"
echo ""
echo "1️⃣  重新加载shell配置："
echo "   source $SHELL_RC"
echo ""
echo "2️⃣  查看可用命令："
echo "   collab help"
echo ""
echo "3️⃣  开始协同开发："
echo "   collab new my-feature    # 创建功能分支"
echo "   # 开发代码..."
echo "   collab push              # 推送并创建PR"
echo ""
echo "4️⃣  审查队友的PR："
echo "   collab review"
echo ""
echo -e "${YELLOW}📖 完整指南：${NC}"
echo "   cat docs/COLLABORATION_GUIDE.md"
echo ""
echo -e "${YELLOW}🔧 Git Hooks已启用：${NC}"
echo "   ✓ 防止直接推送到main"
echo "   ✓ 检查commit message格式"
echo "   ✓ 代码格式检查"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}🎉 祝你和队友协同开发愉快！${NC}"
echo ""
