# API响应处理指南

## 概述

本文档说明前端如何正确处理API响应,包括Axios拦截器的工作原理和最佳实践。

## API拦截器工作原理

### 后端标准响应格式

后端返回的标准响应格式为:

```typescript
{
  success: boolean,
  data: any,
  message?: string,
  timestamp: string
}
```

### 前端拦截器自动解包

在 `frontend/src/services/api.ts` 中,响应拦截器会自动解包标准响应:

```typescript
// api.ts lines 76-125
api.interceptors.response.use(
  (response) => {
    const body = response.data;

    // 大多数API会自动解包,只返回data部分
    if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
      return body.data;  // 只返回data,不包含success和message
    }

    return body;
  },
  // ... error handling
);
```

**这意味着:**

- 后端返回: `{success: true, data: {id: 1, title: "Task"}, message: "Success"}`
- 前端接收: `{id: 1, title: "Task"}`

### 特殊API例外

以下API **不会**自动解包,保留完整响应结构:

1. **Timeline API** (`url.includes('/timeline')`)
2. **RecycleBin API** (`url.includes('/system/recycle/')`)
3. **User List API** (`url.includes('/admin/users')` 或 `/admin/company-users`)
4. **Impersonation Status API** (`url.includes('/admin/impersonate/status')`)

## 正确的响应处理方式

### ✅ 正确示例 - 普通API

```typescript
// 创建任务
static async createTask(projectId: number, task: TaskRequest): Promise<Task> {
  try {
    // Note: api interceptor auto-unwraps response, returns Task directly
    const createdTask: Task = await api.post(
      `/projects/${projectId}/tasks`,
      task
    );

    return createdTask;
  } catch (error) {
    // 错误处理
    throw error;
  }
}

// 获取任务列表
static async getTasks(
  projectId: number,
  params?: PaginationParams
): Promise<PaginatedResponse<Task>> {
  // Note: api interceptor auto-unwraps response
  const result: PaginatedResponse<Task> = await api.get(
    `/projects/${projectId}/tasks`,
    { params }
  );

  return result;
}

// 删除任务
static async deleteTask(projectId: number, taskId: number): Promise<void> {
  // Note: DELETE成功返回null/undefined
  await api.delete(`/projects/${projectId}/tasks/${taskId}`);
  // 如果没有抛出异常,说明成功
}
```

### ✅ 正确示例 - Timeline API (特殊API)

```typescript
static async getTaskTimeline(
  projectId: number,
  taskId: number,
  params?: PaginationParams
): Promise<PaginatedResponse<TimelineEvent>> {
  const response: any = await api.get(
    `/projects/${projectId}/tasks/${taskId}/timeline`,
    { params }
  );

  // Timeline API保留完整响应,需要检查success字段
  if (response && typeof response === 'object' && 'success' in response) {
    if (!response.success) {
      throw new Error(response?.error?.message || 'Failed to fetch timeline');
    }
    return response.data;
  }

  // 如果已经被解包,直接返回
  return response;
}
```

## 常见错误和如何避免

### ❌ 错误示例 1: 检查不存在的success字段

```typescript
// 错误!
static async getTaskUpdates(...): Promise<PaginatedResponse<TaskUpdate>> {
  const response: APIResponse<PaginatedResponse<TaskUpdate>> = await api.get(...);

  if (!response.success) {  // response.success是undefined!
    throw new Error('Failed');
  }

  return response.data!;  // response.data也是undefined!
}
```

**问题:** 由于拦截器已经解包,`response`不再有`success`和`data`字段,它直接就是数据本身。

**修复:**

```typescript
// 正确!
static async getTaskUpdates(...): Promise<PaginatedResponse<TaskUpdate>> {
  const result: PaginatedResponse<TaskUpdate> = await api.get(...);
  return result;
}
```

### ❌ 错误示例 2: 多余的类型包装

```typescript
// 不必要的复杂性
const response: APIResponse<Task> = await api.post(...);
return response.data!;
```

**修复:**

```typescript
// 简洁明了
const task: Task = await api.post(...);
return task;
```

### ⚠️ 需要注意的情况: 有fallback但不够优化

```typescript
// 能工作但不够优化
if (response && typeof response === 'object' && 'success' in response) {
  if (!response.success) {
    throw new Error('Failed');
  }
  return response.data;
}

// 普通API永远不会有success字段,所以上面的if永远是false
// 但如果有fallback处理unwrapped的情况,代码能工作,只是不够优化
return response;  // fallback
```

## 错误处理

### 401错误自动处理

拦截器会自动处理401错误,尝试刷新token:

```typescript
// api.ts lines 166-234
case 401:
  // 自动尝试刷新token
  const tokenRefreshManager = TokenRefreshManager.getInstance();
  const refreshResult = await tokenRefreshManager.refreshToken();

  if (refreshResult.success) {
    // 重新发起原始请求
    return api.request(originalConfig);
  } else {
    // 跳转到登录页
    navigateFunction?.('/login');
  }
  break;
```

### 其他错误处理

```typescript
try {
  const result = await api.get(...);
  return result;
} catch (error) {
  if (error instanceof AppError) {
    // 使用统一的错误处理
    NetworkErrorHandler.handleError(error, '操作失败');
  }
  throw error;
}
```

## 修复检查清单

在编写或review API调用代码时,检查以下几点:

- [ ] 是否直接接收解包后的数据,而不是`APIResponse<T>`类型?
- [ ] 是否避免检查不存在的`response.success`字段?
- [ ] 是否避免访问不存在的`response.data`字段?
- [ ] 如果是特殊API(Timeline/RecycleBin),是否正确处理完整响应?
- [ ] 错误处理是否依赖try-catch而不是检查success字段?

## 已修复的问题

### taskService.ts

✅ **修复的方法:**
- `createTask`: 移除了错误的`response.success`检查
- `deleteTask`: 简化为直接await删除操作
- `bulkDeleteTasks`: 直接接收删除结果
- `bulkImportTasks`: 直接接收导入结果
- `getTaskUpdates`: 移除`APIResponse`包装,直接返回数据
- `getBatchUpdatePreview`: 移除`APIResponse`包装,直接返回数据

⚠️ **保留但需要优化的方法:**
- `getTasks`: 有完善的fallback逻辑,但可以简化
- `getAllTasks`: 有完善的fallback逻辑,但可以简化
- `getTask`: 有完善的fallback逻辑,但可以简化
- `updateTask`: 有完善的fallback逻辑,但可以简化

### 其他service文件

✅ **核心服务文件检查通过:**
- `projectService.ts`: 无问题
- `userService.ts`: 无问题
- `documentService.ts`: 无问题
- `authService.ts`: 无问题

⚠️ **发现潜在问题:**
- `impersonationService.ts`: 部分方法直接检查`response.success`可能不会按预期工作
- `taskDocumentService.ts`: 有fallback逻辑但可以优化
- 其他8个service文件有类似的模式,但大多有fallback逻辑

## 参考资源

- **API拦截器代码**: `frontend/src/services/api.ts` (lines 76-273)
- **错误处理工具**: `frontend/src/utils/errorTypes.ts`
- **Token管理**: `frontend/src/utils/tokenManager.ts`
- **相关任务**: 修复taskService.ts中所有错误使用response.success的方法

---

**文档版本**: 1.0
**创建日期**: 2025-01-17
**最后更新**: 2025-01-17
