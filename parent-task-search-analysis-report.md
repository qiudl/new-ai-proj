# 父任务搜索API分析报告

## 问题描述
用户报告父任务搜索API会返回当前选中的任务，即使设置了排除参数也会出现这个问题。

## API实现分析

### 1. API端点路由
- **前端调用**: `/projects/${projectId}/tasks/search-parents`
- **后端路由**: `GET /api/projects/:id/tasks/search-parents`
- **Handler函数**: `searchParentTasksHandler` (位于 `/backend/main.go`)

### 2. 路由定义位置
文件: `/Users/johnqiu/coding/www/projects/new-ai-proj/backend/main.go`
```go
projects.GET("/:id/tasks/search-parents", app.searchParentTasksHandler)
```

### 3. Handler函数实现
位置: `/Users/johnqiu/coding/www/projects/new-ai-proj/backend/main.go`

**参数解析逻辑**:
```go
// 获取查询参数
keyword := c.Query("keyword")
excludeTaskIDStr := c.Query("exclude_task_id")
maxLevelStr := c.Query("max_level")

// 解析exclude_task_id
var excludeTaskID *int
if excludeTaskIDStr != "" {
    excludeID, err := strconv.Atoi(excludeTaskIDStr)
    if err != nil {
        // 返回错误：Invalid exclude_task_id
        return
    }
    excludeTaskID = &excludeID
}
```

**数据库调用**:
```go
tasks, total, err := app.db.Tasks().SearchParentTasks(
    c.Request.Context(), 
    projectID, 
    keyword, 
    excludeTaskID,  // 这里传递了排除任务ID
    maxLevel, 
    pagination.PageSize, 
    offset
)
```

### 4. 数据库层实现
位置: `/Users/johnqiu/coding/www/projects/new-ai-proj/backend/database/task_repository.go`

**函数签名**:
```go
func (r *PostgresTaskRepository) SearchParentTasks(
    ctx context.Context, 
    projectID int, 
    keyword string, 
    excludeTaskID *int, 
    maxLevel int, 
    limit, offset int
) ([]*models.Task, int, error)
```

**SQL查询构建逻辑**:
```go
// 基本过滤条件
conditions = append(conditions, "project_id = $1")
conditions = append(conditions, "deleted_at IS NULL")
conditions = append(conditions, "(task_level IS NULL OR task_level <= $2)")

// 排除特定任务的逻辑
if excludeTaskID != nil {
    conditions = append(conditions, fmt.Sprintf("id != $%d", argIndex))
    args = append(args, *excludeTaskID)
    argIndex++
}

// 关键词搜索
if keyword != "" {
    conditions = append(conditions, fmt.Sprintf("(title ILIKE $%d OR description ILIKE $%d)", argIndex, argIndex+1))
    keywordPattern := "%" + keyword + "%"
    args = append(args, keywordPattern, keywordPattern)
    argIndex += 2
}
```

**最终SQL查询**:
```sql
SELECT id, project_id, title, description, status, assignee_id, due_date, 
       custom_fields, created_at, updated_at, deleted_at, parent_id, 
       task_level, sort_order
FROM tasks 
WHERE project_id = $1 
  AND deleted_at IS NULL 
  AND (task_level IS NULL OR task_level <= $2)
  AND id != $3  -- 排除条件，当excludeTaskID不为空时添加
  AND (title ILIKE $4 OR description ILIKE $5)  -- 关键词搜索，当keyword不为空时添加
ORDER BY task_level ASC, title ASC
LIMIT $6 OFFSET $7
```

### 5. 前端调用实现
位置: `/Users/johnqiu/coding/www/projects/new-ai-proj/frontend/src/hooks/useTaskParentSearch.ts`

**API调用代码**:
```typescript
const searchParams = {
    keyword: params.keyword || '',
    exclude_task_id: params.excludeTaskId,  // 参数名正确
    max_level: params.maxLevel || 3,
    page: Math.floor((params.offset || 0) / (params.limit || 20)) + 1,
    page_size: params.limit || 20,
};

const response = await api.get(
    `/projects/${params.projectId}/tasks/search-parents`,
    { 
        params: searchParams,
        signal: abortControllerRef.current.signal
    }
);
```

## 可能的问题分析

### 1. ✅ 参数名匹配正确
- 前端使用: `exclude_task_id`
- 后端解析: `c.Query("exclude_task_id")`
- **状态**: 正常

### 2. ✅ 数据类型处理正确
- 前端传递: `number` 类型的任务ID
- 后端解析: `strconv.Atoi()` 转换为整数
- 数据库查询: 使用整数参数
- **状态**: 正常

### 3. ✅ SQL查询逻辑正确
- 排除条件: `id != $excludeTaskID` 
- 条件添加: 只有当 `excludeTaskID != nil` 时才添加
- **状态**: 逻辑正确

### 4. 🔍 需要进一步验证的问题

#### A. 参数传递问题
**可能原因**: 前端某些情况下没有正确传递 `excludeTaskId`
```typescript
// TaskParentSelectorModal.tsx 第150-157行
await searchParentTasks({
    projectId,
    keyword: '',
    excludeTaskId: currentTaskId,  // 这里可能为 undefined
    maxLevel: 3,
    limit: 20,
    offset: 0,
});
```

#### B. 前端组件逻辑问题
**可能原因**: `currentTaskId` 在某些情况下为 `undefined`
```typescript
// useTaskParentSearch.ts 第121行
exclude_task_id: params.excludeTaskId,  // 如果 excludeTaskId 为 undefined，参数会被忽略
```

#### C. 后端参数解析问题
当 `exclude_task_id` 参数值为空字符串时，后端逻辑：
```go
if excludeTaskIDStr != "" {  // 空字符串会被跳过，不会添加排除条件
    // ...
}
```

## 修复建议

### 1. 前端修复 (高优先级)
在 `useTaskParentSearch.ts` 中添加参数验证：
```typescript
const searchParams = {
    keyword: params.keyword || '',
    max_level: params.maxLevel || 3,
    page: Math.floor((params.offset || 0) / (params.limit || 20)) + 1,
    page_size: params.limit || 20,
};

// 只有当 excludeTaskId 存在且为有效数字时才添加排除参数
if (params.excludeTaskId && typeof params.excludeTaskId === 'number') {
    searchParams.exclude_task_id = params.excludeTaskId;
}
```

### 2. 后端调试增强 (中等优先级)
在 `searchParentTasksHandler` 中添加调试日志：
```go
app.logger.Printf("SearchParentTasks: projectID=%d, keyword=%s, excludeTaskID=%v, maxLevel=%d", 
    projectID, keyword, excludeTaskID, maxLevel)
```

### 3. 前端组件逻辑检查 (中等优先级)
在 `TaskParentSelectorModal.tsx` 中确保 `currentTaskId` 有效：
```typescript
useEffect(() => {
    if (visible && projectId && currentTaskId) {  // 添加 currentTaskId 检查
        searchParentTasks({
            projectId,
            keyword: '',
            excludeTaskId: currentTaskId,
            maxLevel: 3,
            limit: 20,
            offset: 0,
        });
    }
}, [visible, projectId, currentTaskId]);
```

## 测试验证

创建了测试脚本: `/Users/johnqiu/coding/www/projects/new-ai-proj/test-search-parents-api.js`

**运行测试**:
```bash
cd /Users/johnqiu/coding/www/projects/new-ai-proj
node test-search-parents-api.js
```

## 总结

代码层面的逻辑是正确的，问题很可能出现在：
1. **前端传递的 `excludeTaskId` 参数为空或未定义**
2. **前端组件在某些状态下没有正确获取 `currentTaskId`**
3. **API调用时机的问题，导致排除参数没有正确传递**

建议按照优先级顺序进行修复和测试验证。