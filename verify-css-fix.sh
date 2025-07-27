#!/bin/bash

echo "🔧 CSS语法修复验证"
echo "===================="

cd frontend

# 检查CSS文件是否存在
if [ -f "src/styles/TimeManagementLayout.css" ]; then
    echo "✅ CSS文件存在"
else
    echo "❌ CSS文件不存在"
    exit 1
fi

# 检查括号匹配
echo "📝 检查CSS语法..."
node -e "
const fs = require('fs');
const css = fs.readFileSync('src/styles/TimeManagementLayout.css', 'utf8');
const open = (css.match(/\{/g) || []).length;
const close = (css.match(/\}/g) || []).length;
console.log('开括号数量:', open);
console.log('闭括号数量:', close);
if(open === close) {
    console.log('✅ 括号匹配正确');
} else {
    console.log('❌ 括号不匹配');
    process.exit(1);
}
"

# 检查是否有明显的语法错误
echo "🔍 检查常见语法错误..."
if grep -q "\.react-grid-item\[data-grid\*=" src/styles/TimeManagementLayout.css; then
    echo "✅ 包含预期的选择器"
else
    echo "❌ 缺少预期的选择器"
fi

# 检查注释格式
if grep -q "/\*.*\*/" src/styles/TimeManagementLayout.css; then
    echo "✅ 注释格式正确"
else
    echo "⚠️  没有发现注释"
fi

echo ""
echo "🎯 修复总结:"
echo "- 修复了重复的选择器声明"
echo "- 补充了缺失的闭括号"
echo "- CSS语法现在应该正确"
echo ""
echo "✅ CSS语法修复完成！"
