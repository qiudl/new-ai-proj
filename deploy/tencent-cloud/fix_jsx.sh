#!/bin/bash
# 修复App.tsx中的JSX语法错误

# 首先备份原文件
cp /opt/ai-project/frontend/src/App.tsx /opt/ai-project/frontend/src/App.tsx.backup.$(date +%Y%m%d_%H%M%S)

# 修复JSX结构问题
# 1. 删除多余的Suspense标签和Routes（第524-528行）
sed -i '524,528d' /opt/ai-project/frontend/src/App.tsx

# 2. 清理中文注释，替换为ASCII字符
sed -i 's/开发者缓存调试面板/Cache debug panel - dev only/g' /opt/ai-project/frontend/src/App.tsx
sed -i 's/隐藏调试功能/Hidden debug features/g' /opt/ai-project/frontend/src/App.tsx

# 3. 检查修复结果
echo "修复完成，检查文件..."
grep -n "Suspense\|React.Fragment\|TimerProvider" /opt/ai-project/frontend/src/App.tsx | head -10
