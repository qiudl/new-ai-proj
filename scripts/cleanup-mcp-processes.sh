#!/bin/bash
# MCP进程清理脚本
# 用于清理多余的mcp-task-bridge进程，只保留最新的一个

echo "🧹 清理MCP僵尸进程..."

# 查找所有mcp-task-bridge进程
ZOMBIE_PROCESSES=$(ps aux | grep "mcp-task-bridge" | grep -v grep | awk '{print $2}')

if [ -n "$ZOMBIE_PROCESSES" ]; then
    PROCESS_COUNT=$(echo "$ZOMBIE_PROCESSES" | wc -l | tr -d ' ')
    echo "发现 $PROCESS_COUNT 个MCP进程"
    
    if [ "$PROCESS_COUNT" -gt 1 ]; then
        # 按PID排序，保留最新的进程
        SORTED_PIDS=$(echo "$ZOMBIE_PROCESSES" | sort -n)
        LATEST_PID=$(echo "$SORTED_PIDS" | tail -1)
        OLD_PIDS=$(echo "$SORTED_PIDS" | head -n -1)
        
        if [ -n "$OLD_PIDS" ]; then
            echo "清理旧进程: $OLD_PIDS"
            echo "$OLD_PIDS" | xargs kill -9 2>/dev/null
            sleep 1
        fi
        
        echo "✅ 保留最新进程: $LATEST_PID"
    else
        echo "✅ 只有一个MCP进程在运行，无需清理"
    fi
else
    echo "⚠️  未发现MCP进程"
fi

# 显示清理后的状态
REMAINING=$(ps aux | grep "mcp-task-bridge" | grep -v grep | wc -l | tr -d ' ')
echo "清理完成，当前运行的MCP进程数: $REMAINING"