#!/bin/bash
# 第二次修复App.tsx中的JSX语法错误

echo "开始第二次修复..."
# 删除孤立的Suspense标签（第523行）
sed -i '523d' /opt/ai-project/frontend/src/App.tsx

# 检查修复结果
echo "第二次修复完成，检查关键行..."
sed -n '520,530p' /opt/ai-project/frontend/src/App.tsx
