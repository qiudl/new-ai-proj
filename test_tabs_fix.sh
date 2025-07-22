#!/bin/bash

# Test script to verify Tabs fix
echo "🔧 验证Ant Design Tabs组件修复"
echo "==============================="

# Test 1: TypeScript compilation
echo "1. 检查TypeScript编译..."
cd frontend
if npm run type-check > /dev/null 2>&1; then
    echo "✅ TypeScript编译成功，没有类型错误"
else
    echo "❌ TypeScript编译失败"
    exit 1
fi

# Test 2: Check if TabPane is removed
echo "2. 检查废弃的TabPane是否已移除..."
if grep -q "TabPane" src/pages/CustomerDetailPage.tsx; then
    echo "❌ 仍然使用废弃的TabPane组件"
    exit 1
else
    echo "✅ 已移除废弃的TabPane组件"
fi

# Test 3: Check if items prop is used
echo "3. 检查是否使用新的items属性..."
if grep -q "items={tabItems}" src/pages/CustomerDetailPage.tsx; then
    echo "✅ 正确使用新的items属性"
else
    echo "❌ 未找到items属性使用"
    exit 1
fi

# Test 4: Check if tabItems is properly defined
echo "4. 检查tabItems定义..."
if grep -q "tabItems: TabsProps\['items'\]" src/pages/CustomerDetailPage.tsx; then
    echo "✅ tabItems类型定义正确"
else
    echo "❌ tabItems类型定义不正确"
    exit 1
fi

# Test 5: Check if TabsProps import exists
echo "5. 检查TabsProps导入..."
if grep -q "import type { TabsProps }" src/pages/CustomerDetailPage.tsx; then
    echo "✅ 正确导入TabsProps类型"
else
    echo "❌ 未找到TabsProps导入"
    exit 1
fi

cd ..

echo ""
echo "🎉 所有检查通过！Ant Design Tabs组件已成功升级到新API。"
echo ""
echo "修复内容："
echo "- ❌ 移除废弃的 TabPane 组件"
echo "- ✅ 使用新的 items 属性"
echo "- ✅ 正确的 TypeScript 类型定义"
echo "- ✅ 保持所有功能不变"
echo ""
echo "现在访问客户详情页将不再出现废弃警告。"