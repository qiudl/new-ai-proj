#!/bin/bash

# 系统性能优化 - 清理和重启脚本

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║      🔧 系统性能优化 - 清理和重启脚本                          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# 1. 检查当前系统状态
echo "📊 检查当前系统状态..."
LOAD=$(uptime | awk -F'load averages:' '{print $2}' | awk '{print $1}')
NODE_COUNT=$(ps aux | grep -E '[n]ode|[n]pm' | wc -l | tr -d ' ')
echo "   负载: $LOAD"
echo "   Node进程数: $NODE_COUNT"
echo ""

# 2. 停止所有开发服务器
echo "🛑 停止所有开发服务器..."
pkill -9 -f "react-scripts" 2>/dev/null && echo "   ✅ 已停止 react-scripts" || echo "   ℹ️  没有react-scripts进程"
pkill -9 -f "webpack" 2>/dev/null && echo "   ✅ 已停止 webpack" || echo "   ℹ️  没有webpack进程"
pkill -9 -f "vite" 2>/dev/null && echo "   ✅ 已停止 vite" || echo "   ℹ️  没有vite进程"
echo ""

# 3. 等待进程清理
echo "⏳ 等待进程清理..."
sleep 3
echo ""

# 4. 清理临时文件
echo "🧹 清理临时文件..."
rm -f /tmp/frontend-*.log 2>/dev/null && echo "   ✅ 已清理临时日志"
echo ""

# 5. 检查清理后状态
echo "✨ 清理完成！"
LOAD_AFTER=$(uptime | awk -F'load averages:' '{print $2}' | awk '{print $1}')
NODE_COUNT_AFTER=$(ps aux | grep -E '[n]ode|[n]pm' | wc -l | tr -d ' ')
echo "   负载: $LOAD_AFTER (之前: $LOAD)"
echo "   Node进程数: $NODE_COUNT_AFTER (之前: $NODE_COUNT)"
echo ""

# 6. 询问是否启动服务器
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
read -p "🚀 是否启动frontend开发服务器? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo ""
    echo "🚀 启动开发服务器（优化配置）..."
    echo "   ✓ 已禁用ESLint插件"
    echo "   ✓ TypeScript错误不阻塞编译"
    echo "   ✓ 已禁用source map生成"
    echo ""

    cd "$(dirname "$0")"
    NODE_OPTIONS='--max-old-space-size=4096' npm start
else
    echo ""
    echo "ℹ️  未启动服务器"
    echo ""
    echo "手动启动命令:"
    echo "   cd $(dirname "$0")"
    echo "   NODE_OPTIONS='--max-old-space-size=4096' npm start"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    ✅ 脚本执行完成                            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
