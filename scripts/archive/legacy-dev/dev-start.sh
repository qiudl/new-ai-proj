#!/bin/bash
# 开发环境一键启动脚本

set -e

echo "🚀 启动AI项目开发环境"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 检查SSH隧道是否已运行
if lsof -i:5433 > /dev/null 2>&1; then
    echo "✅ SSH隧道已建立"
else
    echo "⚠️  SSH隧道未建立"
    echo ""
    read -p "是否现在启动SSH隧道? (y/n): " start_tunnel
    if [ "$start_tunnel" = "y" ]; then
        echo "🔐 启动SSH隧道（将在后台运行）..."
        nohup ./scripts/db-tunnel.sh > logs/db-tunnel.log 2>&1 &
        TUNNEL_PID=$!
        echo "SSH隧道进程ID: $TUNNEL_PID"
        sleep 3

        if lsof -i:5433 > /dev/null 2>&1; then
            echo "✅ SSH隧道启动成功"
        else
            echo "❌ SSH隧道启动失败，请查看日志: logs/db-tunnel.log"
            exit 1
        fi
    else
        echo "请在另一个终端运行: ./scripts/db-tunnel.sh"
        exit 1
    fi
fi

# 测试数据库连接
echo "🔍 测试数据库连接..."
if PGPASSWORD='SecureAI2024!@#$%^' psql -h localhost -p 5433 -U ai_prod_user -d ai_project_prod -c "SELECT 1" > /dev/null 2>&1; then
    echo "✅ 数据库连接成功"

    # 显示任务数统计
    TASK_COUNT=$(PGPASSWORD='SecureAI2024!@#$%^' psql -h localhost -p 5433 -U ai_prod_user -d ai_project_prod -t -c "SELECT COUNT(*) FROM tasks;" | xargs)
    echo "📊 远端数据库任务总数: $TASK_COUNT"
else
    echo "❌ 数据库连接失败，请检查SSH隧道"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 选择启动模式
echo "请选择启动模式："
echo "1) 仅后端"
echo "2) 仅前端"
echo "3) 后端+前端 (需要tmux)"
read -p "选择 (1-3): " choice

case $choice in
    1)
        echo "🔧 启动后端..."
        cd backend && go run main.go
        ;;
    2)
        echo "🎨 启动前端..."
        cd frontend && npm start
        ;;
    3)
        echo "🔧 启动后端和前端..."
        # 使用tmux分屏
        if command -v tmux &> /dev/null; then
            tmux new-session -d -s aiproj-dev 'cd backend && go run main.go'
            tmux split-window -h 'cd frontend && npm start'
            tmux attach-session -t aiproj-dev
        else
            echo "❌ 请安装tmux: brew install tmux"
            echo ""
            echo "或者手动在不同终端启动："
            echo "  终端1: cd backend && go run main.go"
            echo "  终端2: cd frontend && npm start"
            exit 1
        fi
        ;;
    *)
        echo "无效选择"
        exit 1
        ;;
esac
