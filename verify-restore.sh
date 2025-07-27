#!/bin/bash

echo "🔧 验证工作台结构恢复"
echo "========================"

echo ""
echo "📁 检查页面文件..."
echo "✅ DashboardPage.tsx: $([ -f frontend/src/pages/DashboardPage.tsx ] && echo "存在" || echo "❌ 不存在")"
echo "✅ TimeManagementHomePage.tsx: $([ -f frontend/src/pages/TimeManagementHomePage.tsx ] && echo "存在" || echo "❌ 不存在")"
echo "✅ TimeAnalysisPage.tsx: $([ -f frontend/src/pages/TimeAnalysisPage.tsx ] && echo "存在" || echo "❌ 不存在")"
echo "✅ WorkspaceOverviewPage.tsx: $([ -f frontend/src/pages/WorkspaceOverviewPage.tsx ] && echo "❌ 仍存在(应该已删除)" || echo "正确删除")"

echo ""
echo "🔍 检查路由配置..."
grep -q "DashboardPage" frontend/src/App.tsx && echo "✅ App.tsx中恢复DashboardPage引用" || echo "❌ App.tsx中缺少DashboardPage引用"
grep -q "TimeManagementHomePage" frontend/src/App.tsx && echo "✅ App.tsx中恢复TimeManagementHomePage引用" || echo "❌ App.tsx中缺少TimeManagementHomePage引用"
grep -q 'path="/".*DashboardPage' frontend/src/App.tsx && echo "✅ 根路径指向DashboardPage" || echo "❌ 根路径配置错误"
grep -q 'path="/time-management".*TimeManagementHomePage' frontend/src/App.tsx && echo "✅ /time-management指向TimeManagementHomePage" || echo "❌ /time-management配置错误"

echo ""
echo "🎯 检查菜单配置..."
grep -q "/time-management" frontend/src/components/Layout.tsx && echo "✅ Layout.tsx中恢复/time-management菜单项" || echo "❌ Layout.tsx中缺少/time-management菜单项"

echo ""
echo "📝 当前工作台菜单结构:"
echo "├── 工作台"
echo "│   ├── 工作概览 (/) - DashboardPage.tsx"
echo "│   ├── 时间管理 (/time-management) - TimeManagementHomePage.tsx" 
echo "│   └── 任务周报 (/task-dashboard) - TaskDashboardPage.tsx"

echo ""
echo "🎉 恢复完成！现在的配置："
echo "- 工作概览：原来的仪表板页面"
echo "- 时间管理：原来的时间管理首页内容"
echo "- 新建的TimeAnalysisPage保留在/time-analysis路径"
