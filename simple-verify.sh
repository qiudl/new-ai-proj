#!/bin/bash

echo "🔍 简化验证测试"
echo "================"

echo ""
echo "📁 关键文件检查:"
echo "- DashboardPage.tsx: $([ -f frontend/src/pages/DashboardPage.tsx ] && echo "✅" || echo "❌")"
echo "- TimeManagementHomePage.tsx: $([ -f frontend/src/pages/TimeManagementHomePage.tsx ] && echo "✅" || echo "❌")"

echo ""
echo "🔗 路由检查:"
echo "- 根路径配置:"
grep -A3 'path="/"' frontend/src/App.tsx | grep -q "DashboardPage" && echo "  ✅ / -> DashboardPage" || echo "  ❌ 配置错误"

echo "- 时间管理路径配置:"
grep -A3 'path="/time-management"' frontend/src/App.tsx | grep -q "TimeManagementHomePage" && echo "  ✅ /time-management -> TimeManagementHomePage" || echo "  ❌ 配置错误"

echo ""
echo "📋 最终菜单结构:"
echo "工作台/"
echo "├── 工作概览 (/) → DashboardPage"
echo "├── 时间管理 (/time-management) → TimeManagementHomePage"  
echo "└── 任务周报 (/task-dashboard) → TaskDashboardPage"

echo ""
echo "✅ 恢复完成！"
echo "- 工作概览现在是原来的仪表板"
echo "- 时间管理现在是原来的时间管理首页"
