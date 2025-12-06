#!/bin/zsh

# Android需求管理模块 - 多Agent并行开发启动脚本
# 基于 android-requirement-ai-config.json 配置

set -e

PROJECT_ROOT="/Users/johnqiu/coding/www/projects/new-ai-proj"
CONFIG_FILE="$PROJECT_ROOT/android-requirement-ai-config.json"
WORKTREE_ROOT="/Users/johnqiu/coding/www/projects/new-ai-proj-worktrees"

echo "🚀 启动Android需求管理模块多Agent并行开发..."
echo "📋 父任务: #3656 - 需求管理模块设计"
echo "🔧 子任务: #3657-#3671 (15个子任务)"
echo ""

# 检查配置文件
if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ 配置文件不存在: $CONFIG_FILE"
    exit 1
fi

# 检查worktree目录
if [ ! -d "$WORKTREE_ROOT" ]; then
    echo "❌ Worktree目录不存在: $WORKTREE_ROOT"
    exit 1
fi

# 启动函数
launch_agent() {
    local agent_id=$1
    local agent_name=$2
    local worktree_dir=$3
    local task_ids=$4
    local worktree_path="$WORKTREE_ROOT/$worktree_dir"

    echo "🚀 启动 $agent_name"
    echo "   📁 工作目录: $worktree_path"
    echo "   📝 任务: #$task_ids"

    # 使用osascript打开新Terminal窗口并启动Claude Code
    osascript <<EOF
tell application "Terminal"
    activate

    -- 创建新窗口
    do script "cd '$worktree_path' && clear"

    -- 等待目录切换完成
    delay 1

    -- 显示Agent信息
    do script "echo '═══════════════════════════════════════════════'" in front window
    do script "echo '$agent_name'" in front window
    do script "echo '═══════════════════════════════════════════════'" in front window
    do script "echo '📁 工作目录: $worktree_path'" in front window
    do script "echo '📝 负责任务: #$task_ids'" in front window
    do script "echo '🌿 分支: feature/requirement-$agent_id'" in front window
    do script "echo ''" in front window
    do script "echo '⏳ 启动Claude Code...'" in front window
    do script "echo ''" in front window

    -- 等待信息显示
    delay 1

    -- 启动Claude Code
    do script "claude-code" in front window
end tell
EOF

    # 间隔1秒，避免Terminal窗口混乱
    sleep 1
}

# 按顺序启动4个Agent
echo ""
echo "🎯 Phase 1: 启动并行开发的Agent (数据层 + UI组件)"
launch_agent "data-layer" "🗄️ Agent 1: 数据层专家" "android-data-layer" "3657,3658,3659,3660,3669"
launch_agent "ui-components" "🎨 Agent 2: UI组件专家" "android-ui-components" "3661,3662,3663"

echo ""
echo "🎯 Phase 2: 启动页面开发Agent (依赖Phase 1)"
launch_agent "pages" "📱 Agent 3: 页面开发专家" "android-pages" "3664,3665,3666"

echo ""
echo "🎯 Phase 3-4: 启动集成测试Agent (依赖Phase 2)"
launch_agent "integration" "🔗 Agent 4: 集成测试专家" "android-integration" "3667,3668,3670,3671"

echo ""
echo "✅ 所有Agent已启动！"
echo ""
echo "📊 开发进度追踪:"
echo "   - Agent 1 (数据层): 2.5小时 → 任务 #3657-3660, #3669"
echo "   - Agent 2 (UI组件): 1.5小时 → 任务 #3661-3663"
echo "   - Agent 3 (页面): 2.5小时 → 任务 #3664-3666"
echo "   - Agent 4 (集成): 1.5小时 → 任务 #3667-3668, #3670-3671"
echo ""
echo "📝 注意事项:"
echo "   1. Agent 1和2可以并行开发(Phase 1)"
echo "   2. Agent 3需要等待Agent 1和2完成(Phase 2)"
echo "   3. Agent 4需要等待Agent 3完成(Phase 3-4)"
echo "   4. 每个Agent完成后提交到各自的feature分支"
echo "   5. 所有Agent完成后统一合并到main分支"
echo ""
echo "🔗 Git Worktree结构:"
cd "$WORKTREE_ROOT"
ls -d android-* 2>/dev/null | while read dir; do
    branch=$(cd "$dir" && git branch --show-current)
    echo "   - $dir → $branch"
done
echo ""
echo "🎉 多Agent并行开发环境已就绪！"
