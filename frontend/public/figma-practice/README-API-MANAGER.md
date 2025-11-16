# Figma API 速率限制管理器使用指南

## 📦 文件说明

- `figma-api-manager.js` - 核心管理器类
- `README-API-MANAGER.md` - 本说明文档

## 🎯 核心功能

### 1. 自动速率限制追踪
- ✅ 实时监控 API 调用次数
- ✅ 自动计算剩余配额
- ✅ 窗口重置提醒

### 2. 智能延迟机制
- ✅ 自动在调用间添加延迟（默认5秒）
- ✅ 防止短时间内频繁调用
- ✅ 可自定义延迟时间

### 3. 自动重试
- ✅ 捕获 429 错误
- ✅ 读取 Retry-After 头
- ✅ 自动等待后重试（最多3次）

### 4. 本地缓存
- ✅ 自动缓存 API 响应
- ✅ 避免重复调用相同资源
- ✅ 可配置缓存过期时间（默认1小时）

### 5. 详细日志
- ✅ 控制台输出调用记录
- ✅ 可选文件日志
- ✅ 统计信息展示

## 🚀 快速开始

### 方法1: 在浏览器中使用

```html
<!DOCTYPE html>
<html>
<head>
    <script src="figma-api-manager.js"></script>
</head>
<body>
    <script>
        // 创建管理器
        const manager = new FigmaAPIManager({
            rateLimit: 15,      // Professional Full seat
            minDelay: 5000,     // 5秒延迟
            enableCache: true   // 启用缓存
        });

        // 使用（需要配合 Claude Code MCP）
        // 注意：浏览器环境无法直接调用 MCP
        // 这里主要用于速率追踪和日志

        // 手动记录调用
        manager.checkRateLimit();  // 检查限制
        manager.printStats();       // 查看统计
    </script>
</body>
</html>
```

### 方法2: 在 Node.js 中使用

```javascript
const FigmaAPIManager = require('./figma-api-manager.js');

const manager = new FigmaAPIManager({
    rateLimit: 15,
    minDelay: 5000,
    verbose: true
});

// 查看统计
manager.printStats();
```

## ⚙️ 配置选项

```javascript
const manager = new FigmaAPIManager({
    // === 速率限制配置 ===
    rateLimit: 15,              // 每分钟最大调用次数
                                // Starter Full: 10
                                // Professional Full: 15
                                // Organization Full: 20

    rateLimitWindow: 60000,     // 速率限制窗口（毫秒）
                                // 默认 60000ms = 1分钟

    // === 延迟配置 ===
    minDelay: 5000,             // 最小调用间隔（毫秒）
                                // 推荐 3000-10000 (3-10秒)

    maxRetries: 3,              // 最大重试次数
    retryDelay: 60000,          // 重试延迟（毫秒）

    // === 缓存配置 ===
    enableCache: true,          // 是否启用缓存
    cacheDir: './figma-cache',  // 缓存目录
    cacheTTL: 3600000,          // 缓存过期时间（毫秒）
                                // 默认 3600000ms = 1小时

    // === 日志配置 ===
    verbose: true,              // 是否输出详细日志
    logFile: './figma-api-calls.log'  // 日志文件路径
});
```

## 📊 API 方法

### 检查速率限制

```javascript
const check = manager.checkRateLimit();
console.log(check);
// {
//   allowed: true,
//   waitTime: 0,
//   remaining: 12,
//   avgDelay: 5000
// }
```

### 查看统计信息

```javascript
manager.printStats();
// 输出:
// 📊 Figma API 调用统计
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 总调用次数: 5
// 当前窗口: 3/15 (剩余12)
// 窗口进度: 25s / 60s
// ...
```

### 清除缓存

```javascript
manager.clearCache();
// 输出: 🗑️ 缓存已清除
```

### 重置追踪

```javascript
manager.reset();
// 输出: 🔄 速率追踪已重置
```

## 💡 最佳实践

### 1. 根据账户配置速率限制

```javascript
// 检查账户类型
// 运行: mcp__figma__whoami

// 根据结果配置
const manager = new FigmaAPIManager({
    rateLimit: 15  // 根据你的座位类型调整
});
```

### 2. 设置合理的延迟

```javascript
// 保守策略（推荐新手）
const manager = new FigmaAPIManager({
    minDelay: 10000  // 10秒
});

// 平衡策略
const manager = new FigmaAPIManager({
    minDelay: 5000   // 5秒（默认）
});

// 激进策略（仅限高配额账户）
const manager = new FigmaAPIManager({
    minDelay: 3000   // 3秒
});
```

### 3. 启用缓存节省配额

```javascript
const manager = new FigmaAPIManager({
    enableCache: true,
    cacheTTL: 3600000  // 1小时缓存
});

// 首次调用 - 消耗配额
await manager.getScreenshot(fileKey, nodeId);

// 再次调用 - 使用缓存，不消耗配额
await manager.getScreenshot(fileKey, nodeId);
```

### 4. 批量操作时监控统计

```javascript
const nodes = ['1:2', '3:4', '5:6'];

for (const nodeId of nodes) {
    // 每次调用前检查
    const check = manager.checkRateLimit();
    console.log(`剩余配额: ${check.remaining}`);

    // 调用 API
    // await manager.getScreenshot(fileKey, nodeId);

    // 查看统计
    if (nodeId === nodes[nodes.length - 1]) {
        manager.printStats();
    }
}
```

## 🎓 实际使用场景

### 场景1: 单次设计转代码

```javascript
const manager = new FigmaAPIManager();

// 1. 预览设计
console.log('步骤1: 获取截图...');
// const screenshot = await manager.getScreenshot(fileKey, nodeId);

// 2. 自动延迟5秒

// 3. 生成代码
console.log('步骤2: 生成代码...');
// const code = await manager.getDesignContext(fileKey, nodeId);

manager.printStats();
```

### 场景2: 批量处理多个组件

```javascript
const components = [
    { fileKey: 'abc', nodeId: '1:2' },
    { fileKey: 'abc', nodeId: '3:4' },
    { fileKey: 'abc', nodeId: '5:6' }
];

const manager = new FigmaAPIManager({
    minDelay: 8000  // 增加延迟到8秒
});

for (const comp of components) {
    console.log(`处理组件: ${comp.nodeId}`);

    // 检查速率限制
    const check = manager.checkRateLimit();
    if (!check.allowed) {
        console.log('达到限制，等待窗口重置...');
        // 自动等待
    }

    // 调用 API
    // await manager.getDesignContext(comp.fileKey, comp.nodeId);
}

manager.printStats();
```

## 🐛 故障排除

### 问题1: 仍然遇到 429 错误

**原因**: 延迟时间不够或配额设置不正确

**解决**:
```javascript
// 增加延迟
const manager = new FigmaAPIManager({
    minDelay: 10000  // 从5秒增加到10秒
});

// 降低速率限制
const manager = new FigmaAPIManager({
    rateLimit: 10  // 从15降低到10
});
```

### 问题2: 缓存未生效

**原因**: 参数不一致导致缓存键不同

**解决**:
```javascript
// 确保参数一致
const params = {
    clientLanguages: 'html,css,javascript',
    clientFrameworks: 'react'
};

// 两次调用使用相同参数
await manager.getScreenshot(fileKey, nodeId, params);
await manager.getScreenshot(fileKey, nodeId, params);  // 使用缓存
```

### 问题3: 统计信息不准确

**原因**: 未正确记录调用

**解决**:
```javascript
// 确保通过 manager 的方法调用
// ✅ 正确
await manager.getScreenshot(fileKey, nodeId);

// ❌ 错误（绕过管理器）
// 直接调用 MCP 工具
```

## 📈 性能优化建议

1. **启用缓存**: 可节省 50-80% 的 API 调用
2. **合理延迟**: 5-10秒延迟可避免大部分限速
3. **批量规划**: 提前规划需要调用的节点，避免重复
4. **定期清理**: 定期清除过期缓存释放内存
5. **监控统计**: 通过 `printStats()` 了解使用模式

## 🔗 相关资源

- [Figma REST API 速率限制](https://developers.figma.com/docs/rest-api/rate-limits/)
- [Figma MCP Server 文档](https://developers.figma.com/docs/figma-mcp-server/)
- [项目练习文件](./practice-1-card.html)

---

**创建时间**: 2025-11-16
**版本**: 1.0.0
**作者**: Claude AI
**许可**: MIT
