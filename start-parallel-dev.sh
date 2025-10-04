#!/bin/bash

# 评论系统多AI并行开发启动脚本
# 根据任务2603的8个子任务，启动多个Claude Code实例进行并行开发

PROJECT_DIR="/Users/johnqiu/coding/www/projects/new-ai-proj"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

# 读取JWT Token
TOKEN=$(cat /tmp/token.txt 2>/dev/null | tr -d '\n')

echo "🚀 启动评论系统并行开发..."
echo "📋 项目目录: $PROJECT_DIR"
echo ""

# 启动代理
echo "🔌 启动代理..."
source ~/proxy.sh local
echo ""

# Terminal 1: 后端数据库开发 (Task 2606)
echo "📦 Terminal 1: 启动后端数据库开发实例 (Task 2606)"
osascript <<END
tell application "Terminal"
    activate
    set newTab to do script "cd '$BACKEND_DIR' && source ~/proxy.sh local && echo '🔧 任务 2606: 数据库设计与迁移' && echo '📝 请在Claude启动后输入: 执行任务2606' && echo '' && claude"
end tell
END

sleep 2

# Terminal 2: 后端核心服务开发 (Task 2607)
echo "🔧 Terminal 2: 启动后端核心服务开发实例 (Task 2607)"
osascript <<END
tell application "Terminal"
    activate
    set newTab to do script "cd '$BACKEND_DIR' && source ~/proxy.sh local && echo '🔧 任务 2607: 后端核心服务开发' && echo '📝 请在Claude启动后输入: 执行任务2607' && echo '' && claude"
end tell
END

sleep 2

# Terminal 3: API Handler开发 (Task 2608)
echo "🌐 Terminal 3: 启动API Handler开发实例 (Task 2608)"
osascript <<END
tell application "Terminal"
    activate
    set newTab to do script "cd '$BACKEND_DIR' && source ~/proxy.sh local && echo '🌐 任务 2608: API Handler和路由' && echo '📝 请在Claude启动后输入: 执行任务2608' && echo '' && claude"
end tell
END

sleep 2

# Terminal 4: 前端评论组件开发 (Task 2609)
echo "🎨 Terminal 4: 启动前端评论组件开发实例 (Task 2609)"
osascript <<END
tell application "Terminal"
    activate
    set newTab to do script "cd '$FRONTEND_DIR' && source ~/proxy.sh local && echo '🎨 任务 2609: 前端评论组件开发' && echo '📝 请在Claude启动后输入: 执行任务2609' && echo '' && claude"
end tell
END

sleep 2

# Terminal 5: @Mention输入组件开发 (Task 2610)
echo "💬 Terminal 5: 启动@Mention输入组件开发实例 (Task 2610)"
osascript <<END
tell application "Terminal"
    activate
    set newTab to do script "cd '$FRONTEND_DIR' && source ~/proxy.sh local && echo '💬 任务 2610: @Mention输入组件' && echo '📝 请在Claude启动后输入: 执行任务2610' && echo '' && claude"
end tell
END

echo ""
echo "✅ 已启动5个并行开发实例！"
echo ""
echo "📊 开发计划:"
echo "  Backend Track (Sequential):"
echo "    - Task 2606: 数据库设计 (1h)"
echo "    - Task 2607: 核心服务 (3h)"
echo "    - Task 2608: API Handler (3h)"
echo "    - Task 2612: 通知系统 (2h)"
echo ""
echo "  Frontend Track (Parallel):"
echo "    - Task 2609: 评论组件 (6h)"
echo "    - Task 2610: @Mention组件 (2h)"
echo "    - Task 2611: 页面集成 (3h)"
echo ""
echo "  Final Phase:"
echo "    - Task 2613: 测试优化 (6h)"
echo ""
echo "🎯 总预计时间: 28小时 (并行开发可缩短至约15小时)"
echo ""
echo "📖 详细技术文档已准备，请在每个终端中使用MCP命令查看任务文档"
