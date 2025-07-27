#!/bin/bash

echo "🚀 测试工作台结构修改"
echo "========================"

echo ""
echo "📁 检查页面文件..."
echo "✅ WorkspaceOverviewPage.tsx: $([ -f frontend/src/pages/WorkspaceOverviewPage.tsx ] && echo "存在" || echo "❌ 不存在")"
echo "✅ TimeAnalysisPage.tsx: $([ -f frontend/src/pages/TimeAnalysisPage.tsx ] && echo "存在" || echo "❌ 不存在")"
echo "✅ 原TimeManagementHomePage.tsx: $([ -f frontend/src/pages/TimeManagementHomePage.tsx ] && echo "❌ 仍存在(应该已删除)" || echo "正确删除")"

echo ""
echo "🔍 检查路由配置..."
grep -q "WorkspaceOverviewPage" frontend/src/App.tsx && echo "✅ App.tsx中包含WorkspaceOverviewPage引用" || echo "❌ App.tsx中缺少WorkspaceOverviewPage引用"
grep -q "TimeAnalysisPage" frontend/src/App.tsx && echo "✅ App.tsx中包含TimeAnalysisPage引用" || echo "❌ App.tsx中缺少TimeAnalysisPage引用"
grep -q "/time-analysis" frontend/src/App.tsx && echo "✅ App.tsx中包含/time-analysis路由" || echo "❌ App.tsx中缺少/time-analysis路由"

echo ""
echo "🎯 检查菜单配置..."
grep -q "/time-analysis" frontend/src/components/Layout.tsx && echo "✅ Layout.tsx中包含/time-analysis菜单项" || echo "❌ Layout.tsx中缺少/time-analysis菜单项"

echo ""
echo "📊 检查依赖..."
grep -q "@ant-design/plots" frontend/package.json && echo "✅ @ant-design/plots依赖已安装" || echo "❌ @ant-design/plots依赖未安装"

echo ""
echo "🏗️ 检查服务方法..."
grep -q "static async getAllTasks" frontend/src/services/timeManagementService.ts && echo "✅ getAllTasks方法已设为公有静态" || echo "❌ getAllTasks方法未正确配置"

echo ""
echo "📝 工作台菜单结构:"
echo "├── 工作台"
echo "│   ├── 工作概览 (/) - WorkspaceOverviewPage.tsx"
echo "│   ├── 时间管理 (/time-analysis) - TimeAnalysisPage.tsx" 
echo "│   └── 任务周报 (/task-dashboard) - TaskDashboardPage.tsx"

echo ""
echo "🎉 修改完成！请启动前端服务测试功能:"
echo "cd frontend && npm start"
