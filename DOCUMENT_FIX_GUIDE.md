# 文档问题修复指南

## 问题描述
项目遇到了文档加载错误，错误信息为 "服务器错误，请稍后重试"，特别是访问 URL 如 `/documents/1753513206196` 时。

## 问题原因
1. 前端在创建文档时，如果 API 调用失败，会降级使用本地存储
2. 本地存储使用时间戳作为文档 ID（如 1753513206196）
3. 数据库的 `documents.id` 字段是 `integer` 类型，最大值为 2,147,483,647
4. 时间戳 ID 超过了 PostgreSQL integer 类型的最大值，导致查询失败

## 已实施的修复

### 1. 前端修复
- **DocumentEditorPage.tsx**: 添加了对无效 ID 的检测和处理
- **unifiedDocumentService.ts**: 改用负数 ID 生成本地文档，避免与数据库 ID 冲突
- **URL 导航**: 只有有效的数据库 ID 才会被用于 URL 导航

### 2. 错误处理改进
- 无效 ID 检测：检查 ID 是否在有效范围内（1 - 2,147,483,647）
- 本地存储回退：对于本地文档，显示适当的警告信息
- 优雅降级：失败时重定向到文档管理页面而不是显示错误

## 用户如何清理现有问题

### 清理浏览器本地存储
如果用户遇到无效文档链接，可以在浏览器开发者工具中执行：

```javascript
// 清理无效的本地文档
const docs = JSON.parse(localStorage.getItem('mock_documents') || '[]');
const validDocs = docs.filter(doc => doc.id > 0 && doc.id <= 2147483647);
localStorage.setItem('mock_documents', JSON.stringify(validDocs));
console.log('清理完成，刷新页面生效');
```

### 或者完全清理本地文档存储
```javascript
localStorage.removeItem('mock_documents');
console.log('本地文档存储已清空');
```

## 后端状态
- 文档创建 API (`POST /api/v1/documents`) 工作正常
- 文档获取 API (`GET /api/v1/documents/:id`) 对有效 ID 工作正常
- 数据库表结构正常，包含有效文档 (ID 15-29)

## 测试验证
1. 手动测试：`curl -X POST http://localhost:8080/api/v1/documents` 成功创建文档
2. 数据库查询：`SELECT id, title FROM documents` 显示有效文档
3. 前端修复：无效 ID 现在会被正确处理

## 预防措施
1. 改进了本地存储的 ID 生成策略（使用负数）
2. 添加了更好的错误处理和用户提示
3. 只有成功的 API 响应才会触发 URL 导航

## 监控建议
- 监控文档创建 API 的失败率
- 检查网络问题导致的降级情况
- 考虑添加离线状态检测

## 当前状态
✅ 问题已修复
✅ 前端错误处理已改进  
✅ 无效 ID 不再导致服务器错误
✅ 用户体验已优化
