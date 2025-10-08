#!/bin/bash
# PostgreSQL主从复制SSH隧道启动脚本

echo "🔗 启动PostgreSQL SSH隧道..."

# 检查隧道是否已经运行
if pgrep -f "ssh.*15433.*152.136.104.251" > /dev/null; then
    echo "✅ SSH隧道已在运行"
    ps aux | grep "ssh.*15433" | grep -v grep
    exit 0
fi

# 启动SSH隧道
ssh -f -N -L 15433:127.0.0.1:5432 ubuntu@152.136.104.251

# 等待隧道建立
sleep 2

# 验证隧道
if pgrep -f "ssh.*15433.*152.136.104.251" > /dev/null; then
    echo "✅ SSH隧道启动成功!"
    echo "   本地端口: 15433"
    echo "   远端地址: 152.136.104.251:5432"
    ps aux | grep "ssh.*15433" | grep -v grep
else
    echo "❌ SSH隧道启动失败"
    exit 1
fi
