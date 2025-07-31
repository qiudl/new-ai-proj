# 前端开发最佳实践

## 🚨 避免语法错误的关键规则

### 1. **提交前必须检查**
```bash
# 每次提交前运行
npm run check:quick

# 或者手动检查
npm run type-check
npm run lint
```

### 2. **使用AI工具时的注意事项**
- ✅ 生成代码后立即运行 `npm run type-check`
- ✅ 检查import语句是否完整
- ✅ 避免使用 `// @ts-nocheck` 除非必要
- ❌ 不要直接复制粘贴大块代码不检查

### 3. **Import语句最佳实践**
```typescript
// ✅ 正确的import
import React from 'react';
import { Button, Input, Select } from 'antd';

// ❌ 错误的import (容易出现的问题)
import { , Button, Input } from 'antd';  // 空逗号
import React from 'react';
import React, { useState } from 'react';  // 重复导入
```

### 4. **修复工具使用**
```bash
# 修复missing imports
npm run fix:imports

# 修复所有可修复的问题
npm run fix:all

# 检查修复结果
npm run check:all
```

## 🛠️ 应急修复命令

如果遇到大量语法错误：

1. **运行自动修复**
   ```bash
   npm run fix:all
   ```

2. **手动检查剩余问题**
   ```bash
   npm run check:all
   ```

3. **如果还有问题，使用专门的修复工具**
   ```bash
   node scripts/targeted-batch-fixer.js
   node scripts/final-error-fixer.js
   ```

## 📋 Git工作流建议

```bash
# 1. 开发前
git pull origin main

# 2. 开发过程中定期检查
npm run check:quick

# 3. 提交前最终检查
npm run check:all

# 4. 如果检查失败，运行修复
npm run fix:all

# 5. 再次检查后提交
npm run check:all && git add . && git commit -m "..."
```

## 🔧 常见问题快速修复

### Import问题
```bash
node scripts/missing-imports-fixer.js
```

### TypeScript编译错误
```bash
npm run type-check
# 查看具体错误，逐个修复
```

### ESLint大量警告
```bash
npm run lint:fix
```

记住：**预防胜于治疗**！养成良好的检查习惯比事后修复更重要。