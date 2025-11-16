# MCP create-and-attach 接口修复总结

**任务**: Task #3779
**修复时间**: 2025-11-16 14:43
**修复人**: Claude Code AI

## 问题描述

MCP 工具 `create-and-attach` 接口报错，提示认证失败：
```
"Missing authorization header"
```

## 问题原因

`create-and-attach` case 使用了 `taskServer.createAndAttachTaskDocument()` 方法，该方法通过 axios 的 `makeRequest` 发送请求，可能使用了过期或无效的 token。

而 `create_task` 等其他工具使用了硬编码的有效 `VALID_TOKEN` 通过 `curlApiCall` 方法调用，可以正常工作。

## 修复方案

将 `create-and-attach` case 改为使用与 `create_task` 相同的认证方式：

### 修改前 (index.ts:1719-1750)
```typescript
case 'create-and-attach': {
  // ... 参数处理 ...

  result = await taskServer.createAndAttachTaskDocument(
    taskId as number,
    content as string,
    projectId as number,
    title as string
  );
  break;
}
```

### 修改后 (index.ts:1719-1760)
```typescript
case 'create-and-attach': {
  // ... 参数处理 ...

  // 使用curl绕过认证问题（与create_task保持一致）
  const payload: any = {
    taskId: taskId,
    content: content
  };

  if (projectId && projectId !== 1) {
    payload.projectId = projectId;
  }

  if (title) {
    payload.title = title;
  }

  result = await curlApiCall('POST', '/mcp/create-and-attach', payload);
  break;
}
```

### 副作用修复

同时移除了 `update_task_document` case 中未使用的 `projectId` 变量，消除 TypeScript 编译警告。

## 验证测试

### 1. 直接 API 测试（成功 ✅）
```bash
curl -s -X POST "http://localhost:8080/api/v1/mcp/create-and-attach" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"taskId": 3779, "content": "...", "title": "..."}'
```

**结果**：
```json
{
  "success": true,
  "data": {
    "action": "updated",
    "document_id": 3039,
    "task_id": 3779,
    "title": "create-and-attach 接口修复测试文档",
    "version": "3"
  },
  "message": "Document updated successfully"
}
```

### 2. MCP 工具测试（需要重启）

由于 MCP server 缓存，需要重启 Claude Code 或 MCP server 才能加载新编译的代码。

**重启方法**：
1. 重启 Claude Code 应用
2. 或者重新配置 MCP server（在 Claude Code 设置中）

## 文件变更

### 修改的文件
- `mcp-task-bridge/index.ts` (行1719-1760, 行1903-1924)

### 编译输出
- `mcp-task-bridge/dist/index.js` (已更新，时间戳: 2025-11-16 14:43)
- `mcp-task-bridge/dist/index.js.map` (已更新)

### 测试脚本
- `mcp-task-bridge/test-create-and-attach-fix.sh` (新建)

## 后续步骤

1. ✅ 修改代码
2. ✅ 编译代码 (`npm run build`)
3. ✅ 直接 API 测试验证
4. ⏳ 重启 Claude Code 或 MCP server
5. ⏳ MCP 工具测试验证

## 技术要点

### curlApiCall 方法优势
```typescript
async function curlApiCall(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  endpoint: string,
  body?: any
): Promise<any> {
  const url = `http://localhost:8080/api/v1${endpoint}`;
  const cmd = `curl -s -X ${method} "${url}" -H "Authorization: Bearer ${VALID_TOKEN}" -H "Content-Type: application/json"`;
  // ... 执行命令 ...
}
```

优势：
- 使用硬编码的有效 token (`VALID_TOKEN`)
- 通过 shell 执行，绕过 axios 的 token 管理
- 与其他 MCP 工具（如 `create_task`）保持一致
- 避免 token 过期问题

### 为什么不直接修复 base-client.ts

虽然根本原因可能在 `BaseClient.getHeaders()` 或 token 管理，但：
1. `curlApiCall` 是已验证的工作方案
2. 保持与现有工具的一致性
3. 避免影响其他使用 `makeRequest` 的功能
4. 快速解决问题，降低风险

## 相关链接

- Backend API: http://localhost:8080/api/v1/mcp/create-and-attach
- Task #3779: Android App功能模块全面检查
- 测试脚本: `mcp-task-bridge/test-create-and-attach-fix.sh`

---

**修复状态**: ✅ 代码已修复并编译
**应用状态**: ⏳ 等待 MCP server 重启
**验证状态**: ✅ API 测试通过，⏳ MCP 工具测试待重启后进行
