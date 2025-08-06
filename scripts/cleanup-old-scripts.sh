#!/bin/bash

# 清理旧的环境脚本
echo "🧹 清理旧的环境管理脚本..."

OLD_SCRIPTS=(
    "/Users/johnqiu/coding/www/projects/new-ai-proj-dev/start-dev-local.sh"
    "/Users/johnqiu/coding/www/projects/new-ai-proj-dev/stop-dev-local.sh"
    "/Users/johnqiu/coding/www/projects/new-ai-proj-dev/restart-dev.sh"
    "/Users/johnqiu/coding/www/projects/new-ai-proj-dev/rename-key-files.sh"
    "/Users/johnqiu/coding/www/projects/new-ai-proj-dev/rename-platform.sh"
)

for script in "${OLD_SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        echo "  删除: $(basename $script)"
        rm "$script"
    fi
done

echo ""
echo "✅ 清理完成！"
echo ""
echo "📍 新的使用方式："
echo "   cd /Users/johnqiu/coding/www/projects/new-ai-proj"
echo "   ./ai-context-env.sh start-dev   # 启动开发环境"
echo "   ./ai-context-env.sh status      # 查看状态"
echo "   ./ai-context-env.sh stop-dev    # 停止环境"
echo ""
echo "💡 提示：所有环境管理脚本现在都在项目内部"
echo "   位置：new-ai-proj/scripts/env-management/"
