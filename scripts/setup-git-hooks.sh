#!/bin/bash

# 双人协同开发 - Git Hooks 自动安装脚本
# 用途：防止直接推送到main分支，强制使用PR流程

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOOKS_DIR="$PROJECT_ROOT/.git/hooks"

echo "=========================================="
echo "🔧 设置Git Hooks - 双人协同开发"
echo "=========================================="
echo ""

# 检查是否在Git仓库中
if [ ! -d "$PROJECT_ROOT/.git" ]; then
    echo "❌ 错误：当前目录不是Git仓库"
    exit 1
fi

# 创建pre-push hook
echo "📝 创建pre-push hook..."
cat > "$HOOKS_DIR/pre-push" << 'EOF'
#!/bin/bash

# 防止直接推送到受保护分支

# 获取当前分支
current_branch=$(git symbolic-ref HEAD 2>/dev/null | sed -e 's,.*/\(.*\),\1,')

# 受保护的分支列表
protected_branches=("main" "master" "production")

# 检查是否推送到受保护分支
for branch in "${protected_branches[@]}"; do
    if [ "$current_branch" = "$branch" ]; then
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "❌ 错误：不允许直接推送到 '$branch' 分支！"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "📖 正确的协同开发流程："
        echo "  1️⃣  创建功能分支："
        echo "      git checkout -b feature/your-feature-name"
        echo ""
        echo "  2️⃣  在功能分支上开发和提交"
        echo ""
        echo "  3️⃣  推送功能分支到远程："
        echo "      git push origin feature/your-feature-name"
        echo ""
        echo "  4️⃣  在GitHub创建Pull Request"
        echo ""
        echo "  5️⃣  等待审查和CI检查通过"
        echo ""
        echo "  6️⃣  合并PR后自动部署"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""

        # 提供快速创建分支的建议
        echo "💡 快速操作："
        echo "   git checkout -b feature/$(date +%Y%m%d)-my-feature"
        echo ""

        exit 1
    fi
done

# 显示推送信息
echo "✅ 推送 '$current_branch' 分支到远程..."

exit 0
EOF

chmod +x "$HOOKS_DIR/pre-push"
echo "✅ pre-push hook 已创建"

# 创建commit-msg hook（检查commit message格式）
echo "📝 创建commit-msg hook..."
cat > "$HOOKS_DIR/commit-msg" << 'EOF'
#!/bin/bash

# 检查commit message格式
# 推荐格式：<type>(<scope>): <subject>
# 例如：feat(auth): add JWT token refresh

commit_msg_file="$1"
commit_msg=$(cat "$commit_msg_file")

# 跳过merge commit
if echo "$commit_msg" | grep -q "^Merge"; then
    exit 0
fi

# 检查是否符合Conventional Commits格式
commit_regex='^(feat|fix|docs|style|refactor|perf|test|chore|revert)(\(.+\))?: .{1,100}'

if ! echo "$commit_msg" | grep -qE "$commit_regex"; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "⚠️  警告：Commit message格式不规范"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📖 推荐的格式："
    echo "   <type>(<scope>): <subject>"
    echo ""
    echo "🏷️  Type类型："
    echo "   feat     - 新功能"
    echo "   fix      - Bug修复"
    echo "   docs     - 文档更新"
    echo "   style    - 代码格式（不影响功能）"
    echo "   refactor - 重构"
    echo "   perf     - 性能优化"
    echo "   test     - 测试相关"
    echo "   chore    - 构建/工具变更"
    echo ""
    echo "✅ 正确示例："
    echo "   feat(auth): add JWT token refresh mechanism"
    echo "   fix(ui): resolve button alignment issue"
    echo "   docs(readme): update installation instructions"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "💡 提示：虽然不符合规范，但仍允许提交"
    echo "   建议修改以保持项目提交历史清晰"
    echo ""
fi

exit 0
EOF

chmod +x "$HOOKS_DIR/commit-msg"
echo "✅ commit-msg hook 已创建"

# 创建pre-commit hook（代码格式检查）
echo "📝 创建pre-commit hook..."
cat > "$HOOKS_DIR/pre-commit" << 'EOF'
#!/bin/bash

# 代码格式检查（可选）

echo "🔍 检查代码格式..."

# 检查Go代码格式
go_files=$(git diff --cached --name-only --diff-filter=ACM | grep '\.go$')
if [ -n "$go_files" ]; then
    echo "  检查Go代码..."

    # 检查gofmt
    unformatted=$(echo "$go_files" | xargs gofmt -l 2>/dev/null)
    if [ -n "$unformatted" ]; then
        echo ""
        echo "⚠️  以下Go文件需要格式化："
        echo "$unformatted"
        echo ""
        echo "💡 运行以下命令自动格式化："
        echo "   gofmt -w $unformatted"
        echo ""
        echo "提示：仍允许提交，但建议先格式化代码"
        echo ""
    fi
fi

# 检查package-lock.json是否被意外修改
if git diff --cached --name-only | grep -q "package-lock.json"; then
    echo ""
    echo "⚠️  注意：package-lock.json 已被修改"
    echo "   确认这是预期的依赖更新"
    echo ""
fi

# 检查是否包含调试代码
if git diff --cached | grep -iE '(console\.log|debugger|TODO|FIXME)' > /dev/null; then
    echo ""
    echo "⚠️  发现可能的调试代码或TODO标记"
    echo "   请确认是否需要移除"
    echo ""
fi

exit 0
EOF

chmod +x "$HOOKS_DIR/pre-commit"
echo "✅ pre-commit hook 已创建"

echo ""
echo "=========================================="
echo "✅ Git Hooks 设置完成！"
echo "=========================================="
echo ""
echo "已安装的hooks："
echo "  ✓ pre-push    - 防止直接推送到main/master"
echo "  ✓ commit-msg  - 检查commit message格式"
echo "  ✓ pre-commit  - 代码格式检查"
echo ""
echo "📚 使用指南："
echo "  - 这些hooks会在本地自动运行"
echo "  - 它们是建议性的，不会阻止你的工作"
echo "  - 但强烈建议遵循提示"
echo ""
echo "🔧 如需禁用某个hook："
echo "  chmod -x $HOOKS_DIR/<hook-name>"
echo ""
echo "📖 查看协同开发指南："
echo "  cat docs/COLLABORATION_GUIDE.md"
echo ""
