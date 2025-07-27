#!/bin/bash

echo "🕒 测试时间管理页面布局修改"
echo "================================"

# 检查文件是否存在
echo "✅ 检查修改的文件..."

if [ -f "frontend/src/pages/DashboardPage.tsx" ]; then
    echo "  ✓ DashboardPage.tsx 存在"
else
    echo "  ✗ DashboardPage.tsx 不存在"
    exit 1
fi

if [ -f "frontend/src/styles/TimeManagementLayout.css" ]; then
    echo "  ✓ TimeManagementLayout.css 存在"
else
    echo "  ✗ TimeManagementLayout.css 不存在"
    exit 1
fi

# 检查布局配置
echo ""
echo "✅ 检查布局配置..."

# 检查是否有正确的5个组件（移除了recent-tasks）
component_count=$(grep -o "key=\".*\"" frontend/src/pages/DashboardPage.tsx | wc -l)
echo "  组件数量: $component_count (期望: 5)"

# 检查第一行布局（各占1/3：4/12）
first_row_layout=$(grep -A 3 "// First row: 3 components each taking 1/3" frontend/src/pages/DashboardPage.tsx)
if echo "$first_row_layout" | grep -q "w: 4"; then
    echo "  ✓ 第一行布局正确 (各占1/3宽度)"
else
    echo "  ✗ 第一行布局可能有误"
fi

# 检查第二行布局（2/3 + 1/3：8/12 + 4/12）
second_row_layout=$(grep -A 2 "// Second row: Task stats" frontend/src/pages/DashboardPage.tsx)
if echo "$second_row_layout" | grep -q "w: 8" && echo "$second_row_layout" | grep -q "w: 4"; then
    echo "  ✓ 第二行布局正确 (2/3 + 1/3宽度)"
else
    echo "  ✗ 第二行布局可能有误"
fi

# 检查是否移除了recent-tasks
if ! grep -q "recent-tasks" frontend/src/pages/DashboardPage.tsx; then
    echo "  ✓ 已移除recent-tasks组件"
else
    echo "  ✗ recent-tasks组件仍然存在"
fi

# 检查样式文件
echo ""
echo "✅ 检查样式文件..."

if grep -q "今日工作统计" frontend/src/styles/TimeManagementLayout.css; then
    echo "  ✓ 包含今日工作统计样式"
else
    echo "  ✗ 缺少今日工作统计样式"
fi

if grep -q "任务统计分析" frontend/src/styles/TimeManagementLayout.css; then
    echo "  ✓ 包含任务统计分析样式"
else
    echo "  ✗ 缺少任务统计分析样式"
fi

if grep -q "任务进度分析" frontend/src/styles/TimeManagementLayout.css; then
    echo "  ✓ 包含任务进度分析样式"
else
    echo "  ✗ 缺少任务进度分析样式"
fi

# 启动开发服务器进行测试
echo ""
echo "🚀 准备启动开发服务器进行测试..."
echo "请访问: http://localhost:3000 查看时间管理页面"
echo ""
echo "预期布局:"
echo "第一行: [任务计时 1/3] [我的任务 1/3] [今日工作统计 1/3]"
echo "第二行: [任务统计分析 2/3] [任务进度分析 1/3]"
echo ""

read -p "是否启动开发服务器? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd frontend
    npm start
fi
