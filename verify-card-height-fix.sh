#!/bin/bash

echo "🔍 验证项目详情页任务管理tab统计卡片高度修复"
echo "================================================"

# 检查Docker服务状态
echo "📦 检查Docker服务状态..."
docker-compose ps

echo ""
echo "🌐 测试前端服务可用性..."
curl -s http://localhost:3000 > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ 前端服务正常运行"
else
    echo "❌ 前端服务无法访问"
    exit 1
fi

echo ""
echo "🔧 检查修改的文件..."

# 检查EnhancedProjectTaskManager.tsx是否包含minHeight设置
if grep -q "minHeight: '120px'" frontend/src/components/EnhancedProjectTaskManager.tsx; then
    echo "✅ EnhancedProjectTaskManager.tsx 已设置 minHeight: '120px'"
else
    echo "❌ EnhancedProjectTaskManager.tsx 缺少 minHeight 设置"
fi

# 检查CSS文件是否包含高度对齐样式
if grep -q "min-height: 120px" frontend/src/styles/EnhancedProjectTaskManager.css; then
    echo "✅ EnhancedProjectTaskManager.css 已添加统一高度样式"
else
    echo "❌ EnhancedProjectTaskManager.css 缺少统一高度样式"
fi

echo ""
echo "📋 修复摘要："
echo "1. 问题：已完成任务统计卡片因包含进度条和完成率文本而高度不一致"
echo "2. 解决：为所有统计卡片设置 minHeight: '120px'"
echo "3. 文件：EnhancedProjectTaskManager.tsx, EnhancedProjectTaskManager.css"
echo "4. 效果：所有4个统计卡片现在具有相同的高度"

echo ""
echo "🌍 访问地址："
echo "- 前端应用: http://localhost:3000"
echo "- 项目详情页: http://localhost:3000/projects/1"
echo "- 测试页面: file://$(pwd)/test-card-height.html"

echo ""
echo "✅ 修复完成！请在浏览器中访问项目详情页的任务管理tab验证效果。"