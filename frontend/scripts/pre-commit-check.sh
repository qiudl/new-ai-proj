#!/bin/bash

# Pre-commit检查脚本 - 防止破坏性的代码提交

echo "🔍 运行提交前检查..."

# 1. TypeScript编译检查
echo "📝 检查TypeScript编译..."
npm run type-check
if [ $? -ne 0 ]; then
  echo "❌ TypeScript编译失败！请修复类型错误后再提交。"
  exit 1
fi

# 2. ESLint检查关键错误
echo "🔧 检查ESLint关键错误..."
npm run lint -- --max-warnings 100 --quiet
if [ $? -ne 0 ]; then
  echo "❌ 存在严重的ESLint错误！请修复后再提交。"
  exit 1
fi

# 3. 检查是否有空的import语句
echo "📦 检查import语句..."
EMPTY_IMPORTS=$(grep -r "import\s*{\s*,\s*" src/ || true)
if [ ! -z "$EMPTY_IMPORTS" ]; then
  echo "❌ 发现空的import语句："
  echo "$EMPTY_IMPORTS"
  echo "请修复这些import语句后再提交。"
  exit 1
fi

# 4. 检查是否有重复的React imports
echo "⚛️ 检查重复的React导入..."
DUPLICATE_REACT=$(grep -r "import React.*import React" src/ || true)
if [ ! -z "$DUPLICATE_REACT" ]; then
  echo "❌ 发现重复的React导入："
  echo "$DUPLICATE_REACT"
  exit 1
fi

echo "✅ 所有检查通过！可以安全提交。"