#!/bin/bash

echo "🧪 测试 MCP Bridge 进程锁功能"
echo "================================"

# 清理旧的锁文件
LOCK_FILE="/tmp/mcp-task-bridge.lock"
if [ -f "$LOCK_FILE" ]; then
  echo "📝 清理旧锁文件: $LOCK_FILE"
  rm -f "$LOCK_FILE"
fi

echo ""
echo "1️⃣ 启动第一个实例（后台运行）..."
node dist/index.js > /tmp/mcp-test-1.log 2>&1 &
PID1=$!
echo "   PID: $PID1"
sleep 2

# 检查锁文件
if [ -f "$LOCK_FILE" ]; then
  LOCK_PID=$(cat "$LOCK_FILE")
  echo "   ✅ 锁文件已创建，PID: $LOCK_PID"
else
  echo "   ❌ 锁文件未创建"
fi

echo ""
echo "2️⃣ 尝试启动第二个实例（应该被拒绝）..."
timeout 3 node dist/index.js > /tmp/mcp-test-2.log 2>&1 &
PID2=$!
sleep 2

# 检查第二个实例是否被拒绝
if ps -p $PID2 > /dev/null 2>&1; then
  echo "   ❌ 第二个实例仍在运行（进程锁失败）"
  kill $PID2 2>/dev/null
else
  echo "   ✅ 第二个实例已退出（进程锁正常）"
fi

# 显示日志
if [ -f /tmp/mcp-test-2.log ]; then
  echo ""
  echo "📄 第二个实例的日志："
  cat /tmp/mcp-test-2.log | grep -E "\[LOCK\]|\[MCP\]" | head -5
fi

echo ""
echo "3️⃣ 清理测试进程..."
kill $PID1 2>/dev/null
sleep 1

# 检查锁文件是否被清理
if [ -f "$LOCK_FILE" ]; then
  echo "   ⚠️  锁文件未自动清理"
else
  echo "   ✅ 锁文件已自动清理"
fi

echo ""
echo "4️⃣ 再次启动（应该成功）..."
timeout 3 node dist/index.js > /tmp/mcp-test-3.log 2>&1 &
PID3=$!
sleep 2

if ps -p $PID3 > /dev/null 2>&1; then
  echo "   ✅ 新实例启动成功"
  kill $PID3 2>/dev/null
else
  echo "   ❌ 新实例启动失败"
fi

echo ""
echo "🧹 清理测试文件..."
rm -f /tmp/mcp-test-*.log
rm -f "$LOCK_FILE"

echo ""
echo "✅ 测试完成！"
