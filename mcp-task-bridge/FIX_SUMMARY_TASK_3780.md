# MCP append-document-content 认证问题修复总结

## 🎯 核心问题

MCP工具 `append-document-content` 调用失败，返回：
```
"认证失败，请检查API令牌: Missing authorization header"
```

## 🔍 根本原因（双重问题）

### 问题1：使用了后端不支持的认证方式 ❌

- **.env配置了**: `MCP_API_KEY=mcpsk_dev_test_key_123456789abcdef`
- **代码优先使用**: X-API-Key认证
- **但后端只支持**: Bearer Token认证

**验证**：
```bash
curl -X POST "http://localhost:8080/api/v1/mcp/documents/append" \
  -H "X-API-Key: mcpsk_dev_test_key_123456789abcdef"
# 返回: "Missing authorization header" ❌
```

### 问题2：getHeaders()未从统一上下文获取token ❌

- `dev_quick_login` 更新token到统一上下文
- 但 `getHeaders()` 只检查 `this.authToken` 实例变量
- 未从 `contextManager.getCurrentContext()` 读取最新token

## ✅ 完整修复方案

### 1. 禁用不支持的API Key认证 ✅

**文件**: `mcp-task-bridge/.env`

```bash
# 已注释掉（后端不支持X-API-Key）
# MCP_API_KEY=mcpsk_dev_test_key_123456789abcdef
```

### 2. 修改getHeaders()从统一上下文获取token ✅

**文件**: `mcp-task-bridge/base-client.ts` (行89-125)

**关键修改**：
```typescript
// ✅ 从统一上下文获取最新token
let effectiveToken = this.authToken;
try {
  const context = this.contextManager.getCurrentContext();
  if (context && context.token) {
    effectiveToken = context.token;  // 优先使用统一上下文中的token
  }
} catch (error) {
  // 回退到实例变量
}

// ✅ 使用Bearer Token认证
if (effectiveToken) {
  headers['Authorization'] = `Bearer ${effectiveToken}`;
}
```

### 3. 增强调试日志 ✅

**文件**: `mcp-task-bridge/base-client.ts` + `document-service.ts`

添加了详细的debug日志：
- `[GET_HEADERS] Using token from unified context`
- `[SET_AUTH_TOKEN] Setting token in ...`
- `[APPEND_DOCUMENT] Starting append for task ...`

### 4. 重新编译TypeScript ✅

```bash
cd mcp-task-bridge
npx tsc
# 成功编译到 dist/ 目录
```

## 📋 修复状态

### ✅ 已完成

- [x] 修改 base-client.ts 源码
- [x] 修改 document-service.ts 源码
- [x] 重新编译 TypeScript
- [x] 禁用 .env 中的 MCP_API_KEY
- [x] 验证编译后代码包含修复

### ⏳ 等待MCP重启

- [ ] **MCP进程需要重启**（Claude Code自动管理）
- [ ] 调用 `dev_quick_login` 刷新token
- [ ] 测试 `append-document-content` 验证成功
- [ ] 确认debug日志正常输出

## 🚀 下一步操作

### 方法1：等待自动重启（推荐）

Claude Code会自动检测MCP更新并重启进程。

### 方法2：手动重新连接（如需要）

如果长时间未自动重启，可以：
1. 重新打开Claude Code
2. 或断开并重新连接MCP服务器

## 🧪 验证步骤（MCP重启后）

```javascript
// 1. 刷新token
mcp__ai-proj__dev_quick_login()

// 2. 测试追加
mcp__ai-proj__append-document-content({
  taskId: 3780,
  documentId: 3040,
  content: "## 修复验证\n\n修复后的第一次成功测试！"
})

// 3. 预期结果
{
  "success": true,
  "message": "✅ 文档内容已追加 - 版本: X, 新增: Y 字符"
}
```

## 📊 Token流转图（修复后）

```
初始化
  └─> BaseClient.constructor
      ├─> 从.env读取token
      └─> initializeContextFromToken() ──> 统一上下文

dev_quick_login
  └─> BaseClient.devQuickLogin()
      ├─> 调用后端 /dev-login
      ├─> 获取新token
      └─> setAuthToken(newToken) ──> 统一上下文

API调用
  └─> BaseClient.makeRequest()
      └─> getHeaders()
          ├─> ✅ 从统一上下文获取token
          ├─> effectiveToken = context.token || this.authToken
          └─> Authorization: Bearer {effectiveToken}
```

## 📁 关键文件

| 文件 | 状态 | 说明 |
|------|------|------|
| base-client.ts | ✅ 已修改 | getHeaders()完全重写 |
| document-service.ts | ✅ 已修改 | 增强调试日志 |
| .env | ✅ 已修改 | 禁用MCP_API_KEY |
| dist/base-client.js | ✅ 已编译 | 包含所有修复 |
| dist/document-service.js | ✅ 已编译 | 包含调试日志 |

## ⚠️ 重要提示

**当前状态**: 代码修复完成，但运行中的MCP进程仍在使用旧代码。

**原因**: MCP进程是几小时前启动的，加载的是旧的编译代码和.env配置。

**解决**: MCP进程重启后，所有修复将自动生效。

## 🏁 预期结果

MCP重启后：
1. ✅ 不再尝试使用X-API-Key
2. ✅ 从统一上下文获取最新token
3. ✅ 使用Bearer Token成功认证
4. ✅ append-document-content正常工作

---

**任务ID**: #3780
**修复日期**: 2025-01-16
**状态**: ✅ 代码修复完成，⏳ 等待MCP重启
