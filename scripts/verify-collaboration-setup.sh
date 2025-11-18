#!/bin/bash

# 验证双人协同开发环境是否正确安装

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${BLUE}🔍 验证协同开发环境${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

passed=0
failed=0

# 检查函数
check() {
    local name="$1"
    local command="$2"

    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅${NC} $name"
        ((passed++))
        return 0
    else
        echo -e "${RED}❌${NC} $name"
        ((failed++))
        return 1
    fi
}

# 1. Git Hooks检查
echo -e "${BLUE}Git Hooks:${NC}"
check "pre-push hook存在" "[ -f $PROJECT_ROOT/.git/hooks/pre-push ]"
check "pre-push hook可执行" "[ -x $PROJECT_ROOT/.git/hooks/pre-push ]"
check "commit-msg hook存在" "[ -f $PROJECT_ROOT/.git/hooks/commit-msg ]"
check "pre-commit hook存在" "[ -f $PROJECT_ROOT/.git/hooks/pre-commit ]"
echo ""

# 2. 脚本文件检查
echo -e "${BLUE}脚本文件:${NC}"
check "setup-git-hooks.sh存在" "[ -f $PROJECT_ROOT/scripts/setup-git-hooks.sh ]"
check "collab-commands.sh存在" "[ -f $PROJECT_ROOT/scripts/collab-commands.sh ]"
check "setup-collaboration.sh存在" "[ -f $PROJECT_ROOT/scripts/setup-collaboration.sh ]"
check "collab-commands.sh可执行" "[ -x $PROJECT_ROOT/scripts/collab-commands.sh ]"
echo ""

# 3. GitHub配置文件检查
echo -e "${BLUE}GitHub配置:${NC}"
check "PR模板存在" "[ -f $PROJECT_ROOT/.github/PULL_REQUEST_TEMPLATE.md ]"
check "PR检查workflow存在" "[ -f $PROJECT_ROOT/.github/workflows/pr-check.yml ]"
check "部署workflow存在" "[ -f $PROJECT_ROOT/.github/workflows/deploy-cicd.yml ]"
echo ""

# 4. 文档检查
echo -e "${BLUE}文档文件:${NC}"
check "快速开始文档存在" "[ -f $PROJECT_ROOT/docs/TEAM_COLLABORATION_QUICKSTART.md ]"
check "协作指南存在" "[ -f $PROJECT_ROOT/docs/COLLABORATION_GUIDE.md ]"
check "工作流程图存在" "[ -f $PROJECT_ROOT/docs/WORKFLOW_DIAGRAM.md ]"
check "GitHub设置指南存在" "[ -f $PROJECT_ROOT/docs/GITHUB_SETTINGS.md ]"
echo ""

# 5. Shell别名检查
echo -e "${BLUE}Shell别名:${NC}"
if [ -n "$ZSH_VERSION" ]; then
    SHELL_RC="$HOME/.zshrc"
elif [ -n "$BASH_VERSION" ]; then
    SHELL_RC="$HOME/.bashrc"
else
    SHELL_RC="$HOME/.profile"
fi

if grep -q "AI Project Collaboration Commands" "$SHELL_RC" 2>/dev/null; then
    echo -e "${GREEN}✅${NC} Shell别名已配置"
    ((passed++))
else
    echo -e "${YELLOW}⚠️${NC}  Shell别名未配置（需要运行setup-collaboration.sh）"
fi
echo ""

# 6. 工具检查
echo -e "${BLUE}开发工具:${NC}"
check "Git已安装" "command -v git"
check "Go已安装" "command -v go"
check "Node.js已安装" "command -v node"
check "npm已安装" "command -v npm"
check "Docker已安装" "command -v docker"

if command -v gh &> /dev/null; then
    echo -e "${GREEN}✅${NC} GitHub CLI已安装"
    ((passed++))
else
    echo -e "${YELLOW}⚠️${NC}  GitHub CLI未安装（推荐安装：brew install gh）"
fi
echo ""

# 7. Git配置检查
echo -e "${BLUE}Git配置:${NC}"
if [ -n "$(git config user.name)" ]; then
    echo -e "${GREEN}✅${NC} Git用户名已配置: $(git config user.name)"
    ((passed++))
else
    echo -e "${RED}❌${NC} Git用户名未配置"
    ((failed++))
fi

if [ -n "$(git config user.email)" ]; then
    echo -e "${GREEN}✅${NC} Git邮箱已配置: $(git config user.email)"
    ((passed++))
else
    echo -e "${RED}❌${NC} Git邮箱未配置"
    ((failed++))
fi
echo ""

# 总结
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${BLUE}验证总结${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}通过: $passed${NC}"
echo -e "${RED}失败: $failed${NC}"
echo ""

if [ $failed -eq 0 ]; then
    echo -e "${GREEN}🎉 所有检查通过！协同开发环境已正确设置${NC}"
    echo ""
    echo "下一步："
    echo "  1. 阅读快速开始文档: cat docs/TEAM_COLLABORATION_QUICKSTART.md"
    echo "  2. 配置GitHub仓库: cat docs/GITHUB_SETTINGS.md"
    echo "  3. 开始协同开发: collab help"
    exit 0
else
    echo -e "${YELLOW}⚠️  部分检查未通过${NC}"
    echo ""
    echo "修复建议："
    echo "  - 运行安装脚本: bash scripts/setup-collaboration.sh"
    echo "  - 配置Git用户: git config --global user.name \"Your Name\""
    echo "  - 配置Git邮箱: git config --global user.email \"you@example.com\""
    echo "  - 安装GitHub CLI: brew install gh"
    exit 1
fi
