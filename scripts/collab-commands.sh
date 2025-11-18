#!/bin/bash

# 双人协同开发 - 便捷命令集合
# 用途：提供常用的协同开发命令别名

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 显示帮助信息
show_help() {
    cat << EOF
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🤝 双人协同开发 - 便捷命令
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 可用命令：

  ${GREEN}collab sync${NC}          - 同步最新main分支代码
  ${GREEN}collab new <name>${NC}    - 创建新功能分支
  ${GREEN}collab status${NC}        - 查看当前状态和分支信息
  ${GREEN}collab push${NC}          - 推送当前分支并提示创建PR
  ${GREEN}collab pr${NC}            - 快速创建Pull Request
  ${GREEN}collab review${NC}        - 拉取并审查别人的PR
  ${GREEN}collab clean${NC}         - 清理已合并的本地分支
  ${GREEN}collab switch <name>${NC} - 切换到指定分支
  ${GREEN}collab help${NC}          - 显示此帮助信息

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📖 示例：
  collab new user-profile-page
  collab sync
  collab push
  collab pr

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF
}

# 同步main分支
cmd_sync() {
    echo -e "${BLUE}📥 同步最新main分支...${NC}"

    current_branch=$(git branch --show-current)

    # 保存当前工作
    if ! git diff-index --quiet HEAD --; then
        echo -e "${YELLOW}💾 保存当前工作进度...${NC}"
        git stash push -m "Auto-stash before sync at $(date)"
    fi

    # 切换到main并拉取
    git checkout main
    git pull origin main

    # 如果之前不在main分支，切换回去
    if [ "$current_branch" != "main" ]; then
        echo -e "${BLUE}🔄 切换回分支: $current_branch${NC}"
        git checkout "$current_branch"

        # 询问是否要rebase
        echo -e "${YELLOW}是否要将main的更新合并到当前分支？ (y/n)${NC}"
        read -r answer
        if [ "$answer" = "y" ]; then
            git rebase main
            echo -e "${GREEN}✅ 已将main更新合并到当前分支${NC}"
        fi

        # 恢复工作进度
        if git stash list | grep -q "Auto-stash before sync"; then
            echo -e "${YELLOW}📤 恢复工作进度...${NC}"
            git stash pop
        fi
    fi

    echo -e "${GREEN}✅ 同步完成！${NC}"
}

# 创建新功能分支
cmd_new() {
    if [ -z "$1" ]; then
        echo -e "${RED}❌ 错误：请提供分支名称${NC}"
        echo "用法：collab new <branch-name>"
        echo "示例：collab new user-profile-page"
        exit 1
    fi

    branch_name="$1"

    # 自动添加前缀
    if [[ ! "$branch_name" =~ ^(feature|fix|hotfix|refactor|docs)/ ]]; then
        echo -e "${YELLOW}选择分支类型：${NC}"
        echo "1) feature (新功能)"
        echo "2) fix (bug修复)"
        echo "3) hotfix (紧急修复)"
        echo "4) refactor (重构)"
        echo "5) docs (文档)"
        read -p "请选择 (1-5，默认1): " choice

        case $choice in
            2) prefix="fix" ;;
            3) prefix="hotfix" ;;
            4) prefix="refactor" ;;
            5) prefix="docs" ;;
            *) prefix="feature" ;;
        esac

        branch_name="${prefix}/${branch_name}"
    fi

    echo -e "${BLUE}🌿 创建新分支: $branch_name${NC}"

    # 确保从最新的main创建
    git checkout main
    git pull origin main
    git checkout -b "$branch_name"

    echo -e "${GREEN}✅ 已创建并切换到分支: $branch_name${NC}"
    echo ""
    echo "💡 下一步："
    echo "   1. 开发你的功能"
    echo "   2. 提交代码: git add . && git commit -m 'feat: your message'"
    echo "   3. 推送分支: collab push"
}

# 查看状态
cmd_status() {
    echo -e "${BLUE}📊 当前状态${NC}"
    echo ""

    current_branch=$(git branch --show-current)
    echo -e "当前分支: ${GREEN}$current_branch${NC}"

    # 检查是否有未提交的更改
    if ! git diff-index --quiet HEAD --; then
        echo -e "工作区状态: ${YELLOW}有未提交的更改${NC}"
        git status --short
    else
        echo -e "工作区状态: ${GREEN}干净${NC}"
    fi

    echo ""

    # 显示与main的差异
    if [ "$current_branch" != "main" ]; then
        ahead=$(git rev-list --count main.."$current_branch" 2>/dev/null || echo "0")
        behind=$(git rev-list --count "$current_branch"..main 2>/dev/null || echo "0")

        if [ "$ahead" -gt 0 ]; then
            echo -e "领先main: ${GREEN}+$ahead commits${NC}"
        fi
        if [ "$behind" -gt 0 ]; then
            echo -e "落后main: ${YELLOW}-$behind commits${NC}"
            echo "  💡 运行 'collab sync' 同步最新代码"
        fi
    fi

    echo ""

    # 显示最近的commits
    echo "最近的提交："
    git log --oneline -n 5
}

# 推送并提示创建PR
cmd_push() {
    current_branch=$(git branch --show-current)

    if [ "$current_branch" = "main" ]; then
        echo -e "${RED}❌ 错误：不能直接在main分支工作${NC}"
        echo "请先创建功能分支: collab new <branch-name>"
        exit 1
    fi

    echo -e "${BLUE}📤 推送分支: $current_branch${NC}"

    # 推送到远程
    git push -u origin "$current_branch"

    echo ""
    echo -e "${GREEN}✅ 推送成功！${NC}"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${YELLOW}🎯 下一步：创建Pull Request${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "方式1 - 使用GitHub CLI (推荐):"
    echo "  gh pr create --fill"
    echo ""
    echo "方式2 - 浏览器打开:"
    echo "  打开 https://github.com/<username>/<repo>/pull/new/$current_branch"
    echo ""
    echo "方式3 - 使用快捷命令:"
    echo "  collab pr"
    echo ""
}

# 快速创建PR
cmd_pr() {
    current_branch=$(git branch --show-current)

    if [ "$current_branch" = "main" ]; then
        echo -e "${RED}❌ 错误：不能从main分支创建PR${NC}"
        exit 1
    fi

    # 检查是否安装了gh命令
    if command -v gh &> /dev/null; then
        echo -e "${BLUE}📝 创建Pull Request...${NC}"
        gh pr create --fill
    else
        echo -e "${YELLOW}⚠️  未安装GitHub CLI (gh)${NC}"
        echo ""
        echo "方式1 - 安装gh (推荐):"
        echo "  brew install gh"
        echo "  gh auth login"
        echo ""
        echo "方式2 - 手动创建PR:"
        echo "  访问 GitHub 仓库页面"
        echo "  点击 'Compare & pull request' 按钮"
    fi
}

# 审查PR
cmd_review() {
    echo -e "${BLUE}🔍 查看待审查的PR...${NC}"

    if command -v gh &> /dev/null; then
        gh pr list

        echo ""
        echo "输入PR编号进行审查 (留空退出):"
        read -r pr_number

        if [ -n "$pr_number" ]; then
            # 检出PR分支
            gh pr checkout "$pr_number"
            echo ""
            echo -e "${GREEN}✅ 已切换到PR分支${NC}"
            echo ""
            echo "💡 审查步骤："
            echo "  1. 查看代码变更: gh pr diff"
            echo "  2. 本地测试"
            echo "  3. 添加评论: gh pr review --comment"
            echo "  4. 批准: gh pr review --approve"
            echo "  5. 请求修改: gh pr review --request-changes"
        fi
    else
        echo -e "${YELLOW}⚠️  未安装GitHub CLI (gh)${NC}"
        echo "访问: https://github.com/<username>/<repo>/pulls"
    fi
}

# 清理已合并的分支
cmd_clean() {
    echo -e "${BLUE}🧹 清理已合并的本地分支...${NC}"

    # 切换到main
    git checkout main

    # 删除已合并的本地分支
    echo "以下分支已合并到main，将被删除:"
    git branch --merged | grep -v "\*" | grep -v "main" | grep -v "master"

    echo ""
    echo "确认删除？(y/n)"
    read -r answer

    if [ "$answer" = "y" ]; then
        git branch --merged | grep -v "\*" | grep -v "main" | grep -v "master" | xargs -n 1 git branch -d
        echo -e "${GREEN}✅ 清理完成${NC}"
    else
        echo "已取消"
    fi
}

# 切换分支
cmd_switch() {
    if [ -z "$1" ]; then
        echo "可用的分支："
        git branch -a
        echo ""
        echo "输入分支名称:"
        read -r branch_name
    else
        branch_name="$1"
    fi

    git checkout "$branch_name"
}

# 主命令处理
case "$1" in
    sync)
        cmd_sync
        ;;
    new)
        cmd_new "$2"
        ;;
    status)
        cmd_status
        ;;
    push)
        cmd_push
        ;;
    pr)
        cmd_pr
        ;;
    review)
        cmd_review
        ;;
    clean)
        cmd_clean
        ;;
    switch)
        cmd_switch "$2"
        ;;
    help|--help|-h|"")
        show_help
        ;;
    *)
        echo -e "${RED}❌ 未知命令: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac
