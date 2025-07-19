#!/bin/bash

# 工作台首页真实数据演示脚本
# 
# 此脚本用于演示更新后的工作台首页功能

echo "🚀 AI任务管理系统 - 工作台首页演示"
echo "=================================="
echo ""

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 请在前端项目根目录运行此脚本"
    exit 1
fi

echo "📋 更新内容概览:"
echo "  ✅ 创建真实样本数据 (14个任务, 3个项目)"
echo "  ✅ 实现数据缓存机制"
echo "  ✅ 添加格式化工具函数"
echo "  ✅ 优化用户界面和交互"
echo "  ✅ 添加加载状态和错误处理"
echo ""

echo "📁 新增文件:"
echo "  • src/data/sampleData.ts - 样本数据和统计函数"
echo "  • src/services/dashboardService.ts - 工作台数据服务"
echo "  • src/utils/formatters.ts - 数据格式化工具"
echo ""

echo "🔄 更新文件:"
echo "  • src/pages/DashboardPage.tsx - 工作台首页组件"
echo "  • src/App.css - 新增工作台样式"
echo ""

# 检查关键文件是否存在
echo "🔍 检查文件完整性..."
files=(
    "src/data/sampleData.ts"
    "src/services/dashboardService.ts" 
    "src/utils/formatters.ts"
    "src/pages/DashboardPage.tsx"
    "src/hooks/useCache.ts"
)

all_files_exist=true
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file (缺失)"
        all_files_exist=false
    fi
done

echo ""

if [ "$all_files_exist" = true ]; then
    echo "✅ 所有文件检查通过!"
    echo ""
    
    echo "🎯 主要功能特性:"
    echo "  📊 实时统计数据展示"
    echo "  📈 项目进度可视化"
    echo "  👥 团队工作负载分析"
    echo "  🕒 最近活动时间轴"
    echo "  ⚡ 快速操作导航"
    echo "  🎨 响应式设计和动画效果"
    echo ""
    
    echo "💾 数据缓存策略:"
    echo "  • 统计数据: 2分钟缓存"
    echo "  • 最近活动: 1分钟缓存"
    echo "  • 项目进度: 5分钟缓存"
    echo "  • 工作负载: 3分钟缓存"
    echo "  • 效率统计: 10分钟缓存"
    echo ""
    
    echo "🌟 样本数据说明:"
    echo "  • 3个项目: AI任务管理系统, 移动应用重构, 数据分析平台"
    echo "  • 14个任务: 包含完成、进行中、待办状态"
    echo "  • 3个团队成员: 张三、李四、王五"
    echo "  • 真实的工时估算和进度跟踪"
    echo ""
    
    # 启动开发服务器
    echo "🚀 启动开发服务器..."
    echo "访问 http://localhost:3000 查看更新后的工作台首页"
    echo ""
    echo "按 Ctrl+C 退出服务器"
    echo "=================================="
    
    # 检查是否安装了依赖
    if [ ! -d "node_modules" ]; then
        echo "📦 安装依赖包..."
        npm install
    fi
    
    # 启动开发服务器
    npm start
    
else
    echo "❌ 文件检查失败，请确保所有文件都已正确创建"
    echo ""
    echo "💡 解决方案:"
    echo "  1. 检查文件路径是否正确"
    echo "  2. 确保所有文件都已保存"
    echo "  3. 重新运行文件创建脚本"
    exit 1
fi
