#!/bin/bash
# 检查iPhone连接状态

echo "🔍 检查iPhone连接状态..."
echo ""

# 方法1: 使用instruments检查
echo "📱 已连接的iOS设备:"
xcrun xctrace list devices 2>&1 | grep -v "Simulator" | grep "iPhone"

echo ""
echo "💡 如果看到你的iPhone设备名称，说明连接成功！"
echo "💡 如果没有看到，请："
echo "   1. 检查USB线是否连接好"
echo "   2. 在iPhone上点击'信任此电脑'"
echo "   3. 重新运行此脚本"
