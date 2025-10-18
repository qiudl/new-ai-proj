#!/bin/bash
set -e

echo "📦 从develop发布到main分支"
echo "=============================="

# 检查当前分支
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$CURRENT_BRANCH" != "develop" ]]; then
    echo "⚠️  当前不在develop分支"
    read -p "是否切换到develop？(y/n): " switch_choice
    if [[ "$switch_choice" == "y" ]]; then
        git checkout develop
    else
        exit 1
    fi
fi

# 确保develop是最新的
echo ""
echo "📥 同步最新的develop分支..."
git pull origin develop

# 显示将要发布的内容
echo ""
echo "📊 develop领先main的提交："
COMMITS_AHEAD=$(git rev-list main..develop --count)
echo "总共: $COMMITS_AHEAD 次提交"
echo ""
git log main..develop --oneline --graph -20

echo ""
echo "────────────────────────────────"
echo "📝 请输入本次发布的描述："
echo "例如: Android功能完善 + 后端性能优化"
read -r RELEASE_DESC

# 切换到main
echo ""
echo "🔄 切换到main分支..."
git checkout main
git pull origin main

# 使用squash合并（保持main历史清晰）
echo "🔨 合并develop到main（squash模式）..."
git merge develop --squash

# 创建发布提交
RELEASE_DATE=$(date +%Y%m%d)
cat > /tmp/commit-msg.txt << COMMIT_MSG
Release v${RELEASE_DATE}: ${RELEASE_DESC}

📦 包含 ${COMMITS_AHEAD} 次开发提交
📅 发布时间: $(date +"%Y-%m-%d %H:%M:%S")

🤖 Generated with [Claude Code](https://claude.com/claude-code)
COMMIT_MSG

git commit -F /tmp/commit-msg.txt
rm /tmp/commit-msg.txt

# 推送到远程
echo ""
echo "📤 推送到远程main..."
git push origin main

# 同步回develop
echo ""
echo "🔄 同步更新回develop..."
git checkout develop
git merge main --no-ff -m "chore: sync from main after release"
git push origin develop

echo ""
echo "✅ 发布到main完成！"
echo "📊 Main分支已更新，可以执行生产部署"
git checkout develop  # 切回develop继续开发
