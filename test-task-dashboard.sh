#!/bin/bash

echo "🚀 测试任务周报页面..."

# 检查前端目录
cd /Users/johnqiu/coding/www/projects/new-ai-proj/frontend

# 检查 TypeScript 编译
echo "📝 检查 TypeScript 编译..."
npx tsc --noEmit --project tsconfig.json

if [ $? -eq 0 ]; then
    echo "✅ TypeScript 编译成功"
else
    echo "❌ TypeScript 编译失败"
    exit 1
fi

# 检查任务周报页面的导入
echo "🔍 检查任务周报页面的导入..."
node -e "
try {
  const fs = require('fs');
  const path = require('path');
  
  const filePath = './src/pages/TaskDashboardPage.tsx';
  const content = fs.readFileSync(filePath, 'utf8');
  
  // 检查关键导入
  const requiredImports = [
    'DashboardService',
    'projectService', 
    'customerService',
    'useCache',
    'dayjs'
  ];
  
  let allImportsFound = true;
  
  requiredImports.forEach(imp => {
    if (!content.includes(imp)) {
      console.log('❌ 缺少导入:', imp);
      allImportsFound = false;
    }
  });
  
  if (allImportsFound) {
    console.log('✅ 所有必要的导入都存在');
  } else {
    process.exit(1);
  }
  
  // 检查函数定义
  const requiredFunctions = [
    'getDayName',
    'getPriorityColor', 
    'getStatusColor',
    'getStatusText'
  ];
  
  let allFunctionsFound = true;
  
  requiredFunctions.forEach(func => {
    if (!content.includes(func)) {
      console.log('❌ 缺少函数:', func);
      allFunctionsFound = false;
    }
  });
  
  if (allFunctionsFound) {
    console.log('✅ 所有必要的函数都存在');
  } else {
    process.exit(1);
  }
  
} catch (error) {
  console.log('❌ 检查失败:', error.message);
  process.exit(1);
}
"

if [ $? -eq 0 ]; then
    echo "✅ 任务周报页面检查通过"
else
    echo "❌ 任务周报页面检查失败"
    exit 1
fi

echo "🎉 所有检查都通过！任务周报页面已准备就绪"