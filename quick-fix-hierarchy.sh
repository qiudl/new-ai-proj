#!/bin/bash

echo "🔧 快速修复任务层级缩进问题"
echo "================================"

# 检查前端服务是否运行
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "❌ 前端服务未运行，请先启动: npm start"
    exit 1
fi

echo "✅ 前端服务正在运行"

# 检查CSS文件
CSS_FILE="frontend/src/styles/task-hierarchy.css"
if [[ -f "$CSS_FILE" ]]; then
    echo "✅ CSS文件存在"
else
    echo "❌ CSS文件不存在: $CSS_FILE"
    exit 1
fi

# 检查App.tsx中的CSS引入
if grep -q "./styles/task-hierarchy.css" frontend/src/App.tsx; then
    echo "✅ CSS已在App.tsx中引入"
else
    echo "❌ CSS未在App.tsx中引入"
    exit 1
fi

echo ""
echo "🎯 问题诊断：子任务缩进效果不显示"
echo "可能的原因："
echo "1. 后端API没有返回parent_id信息"
echo "2. 前端没有正确识别子任务"
echo "3. CSS样式没有正确应用"
echo "4. 需要手动展开父任务才能看到子任务"

echo ""
echo "🔍 建议的测试步骤："
echo "1. 打开浏览器访问: http://localhost:3000/tasks"
echo "2. 打开开发者工具(F12)，切换到Console标签"
echo "3. 粘贴并运行以下代码："
echo ""
echo "   // 检查任务数据结构"
echo "   console.log('Tasks data:', window.React?.__data?.tasks);"
echo ""
echo "   // 检查CSS类应用"
echo "   document.querySelectorAll('tr.task-hierarchy-item').forEach((row, i) => {"
echo "     console.log(\`Row \${i}:\`, row.className, row.querySelector('.task-indent-space')?.style.width);"
echo "   });"
echo ""
echo "4. 如果看到parent_id不为null的任务，尝试点击父任务的展开按钮"
echo "5. 观察是否出现缩进效果"

echo ""
echo "📋 当前文件状态："
echo "- CSS文件: ✅ 已创建"
echo "- App.tsx: ✅ 已引入CSS"
echo "- TasksPage.tsx: ✅ 已更新渲染逻辑"

echo ""
echo "💡 如果问题仍然存在，可能需要："
echo "1. 重启前端开发服务器"
echo "2. 清除浏览器缓存"
echo "3. 检查后端API是否返回正确的层级数据"

echo ""
echo "🚀 开始手动测试..."
echo "请在浏览器中访问任务列表页面并检查效果"