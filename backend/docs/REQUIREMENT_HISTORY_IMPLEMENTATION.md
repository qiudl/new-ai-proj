# 需求操作历史记录功能实现文档

## 概述

实现了完整的需求操作历史记录功能，用于追踪需求的所有变更操作，包括创建、更新、状态变更、任务关联、评审等操作。

## 实现文件

### 后端

#### 1. Handler (`handlers/requirement_history_handler.go`)
新建文件，包含3个核心接口：

- `GetRequirementHistory` - 获取需求的操作历史列表
  - 支持分页、排序、过滤
  - 权限检查：用户必须属于需求所在企业
  - 系统管理员可查看所有需求历史

- `GetRequirementHistoryStats` - 获取需求历史统计信息
  - 按操作类型统计数量
  - 操作者统计
  - 时间线统计

- `CreateRequirementHistory` - 手动创建历史记录
  - 用于特殊场景的历史记录创建

#### 2. 路由注册 (`routes/requirement_routes.go`)
修改文件，添加历史记录路由：

```go
// History routes - MUST come before /:id routes to avoid route conflicts
if requirementHistoryHandler != nil {
    // Per-requirement history routes
    requirements.GET("/:id/history", requirementHistoryHandler.GetRequirementHistory)
    requirements.GET("/:id/history/stats", requirementHistoryHandler.GetRequirementHistoryStats)
    requirements.POST("/:id/history", requirementHistoryHandler.CreateRequirementHistory)
}
```

**重要**：历史记录路由必须在 `/:id` 路由之前注册，以避免路由冲突。

#### 3. 应用接口 (`routes/interfaces.go`, `application/application.go`)
添加 Handler getter 方法：

```go
// routes/interfaces.go
GetRequirementHistoryHandler() *handlers.RequirementHistoryHandler

// application/application.go
func (app *Application) GetRequirementHistoryHandler() *handlers.RequirementHistoryHandler {
    return handlers.NewRequirementHistoryHandler(app.db, app.logger, app.validator)
}
```

#### 4. 自动历史记录 (`handlers/requirement_task_handler.go`)
修改任务关联Handler，在关联任务时自动记录历史：

```go
// Record history: linked task
taskIDStr := strconv.Itoa(req.TaskID)
linkTypeComment := "关联类型: " + req.LinkType
if req.LinkComment != nil && *req.LinkComment != "" {
    linkTypeComment += ", 备注: " + *req.LinkComment
}
_ = RecordRequirementHistory(
    h.db,
    requirementID,
    userID,
    "task_linked",
    nil,
    nil,
    &taskIDStr,
    &linkTypeComment,
)
```

### 前端

#### 1. 服务层 (`services/requirementHistoryService.ts`)
新建文件，提供：

- API客户端函数
  - `getRequirementHistory()` - 获取历史记录列表

- 辅助工具函数
  - `getActionIcon()` - 根据操作类型返回图标
  - `getActionColor()` - 根据操作类型返回颜色

- TypeScript类型定义
  - `RequirementHistoryItem`
  - `RequirementHistoryListResponse`
  - `GetRequirementHistoryParams`

#### 2. UI组件 (`pages/RequirementDetail/RequirementDetailContent.tsx`)
修改需求详情页，添加历史记录功能：

- 状态管理
  ```typescript
  const [historyItems, setHistoryItems] = useState<RequirementHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  ```

- 数据加载
  ```typescript
  useEffect(() => {
    if (activeTab === 'history' && requirementId) {
      loadHistory();
    }
  }, [activeTab, requirementId]);
  ```

- UI渲染
  - 使用Ant Design Timeline组件展示历史
  - 根据操作类型显示不同颜色和图标
  - 显示操作者、时间、详细信息

## API端点

### 1. GET /api/v1/requirements/:id/history

获取需求的操作历史记录列表。

**请求参数**：
- `id` (path) - 需求ID
- `page` (query) - 页码，默认1
- `page_size` (query) - 每页数量，默认20，最大100
- `action` (query, 数组) - 按操作类型过滤
- `user_id` (query) - 按用户ID过滤
- `created_after` (query) - 按创建时间过滤（RFC3339格式）
- `created_before` (query) - 按创建时间过滤（RFC3339格式）
- `sort_order` (query) - 排序顺序，asc/desc，默认desc

**响应示例**：
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": 1,
        "requirement_id": 8,
        "user_id": 1,
        "username": "admin",
        "action": "task_linked",
        "action_display": "关联任务",
        "new_value": "3565",
        "comment": "关联类型: implements, 备注: 实现此需求",
        "created_at": "2025-11-10T10:30:00Z"
      }
    ],
    "total": 10,
    "page": 1,
    "page_size": 20
  }
}
```

### 2. GET /api/v1/requirements/:id/history/stats

获取需求历史记录的统计信息。

**响应示例**：
```json
{
  "success": true,
  "data": {
    "total_count": 25,
    "action_counts": {
      "created": 1,
      "updated": 10,
      "task_linked": 5,
      "approved": 3,
      "rejected": 2
    },
    "user_counts": {
      "admin": 15,
      "user1": 10
    }
  }
}
```

### 3. POST /api/v1/requirements/:id/history

创建新的历史记录（手动）。

**请求体**：
```json
{
  "action": "commented",
  "field_name": null,
  "old_value": null,
  "new_value": null,
  "comment": "添加评论：这个需求很重要"
}
```

## 支持的操作类型

- `created` - 需求创建
- `updated` - 需求更新
- `status_changed` - 状态变更
- `reviewed` - 评审
- `approved` - 批准
- `rejected` - 拒绝
- `task_linked` - 关联任务 ✅ 已实现自动记录
- `task_unlinked` - 取消关联任务
- `converted` - 转换为任务
- `commented` - 评论
- `assigned` - 分配
- `priority_changed` - 优先级变更
- `archived` - 归档
- `restored` - 恢复
- `deleted` - 删除

## 数据库表

使用现有的 `requirement_history` 表：

```sql
CREATE TABLE requirement_history (
    id SERIAL PRIMARY KEY,
    requirement_id INTEGER NOT NULL REFERENCES requirements(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_requirement_history_requirement_id (requirement_id),
    INDEX idx_requirement_history_created_at (created_at)
);
```

## 权限控制

- 普通用户：只能查看本企业需求的历史记录
- 系统管理员：可以查看所有需求的历史记录

## 开发注意事项

### 重要：代码修改后必须重新编译

在开发过程中发现的问题：修改代码后如果没有重新编译，后端服务仍然运行旧的二进制文件，导致新功能不生效。

**解决方案**：
```bash
cd backend
go build -o backend ./main.go
./scripts/dev.sh stop
./scripts/dev.sh backend
```

或者使用 `air` 进行热重载：
```bash
cd backend
air
```

### 路由注册顺序

历史记录路由必须在 `/:id` 路由之前注册：

```go
// ✅ 正确顺序
requirements.GET("/:id/history", ...)      // 更具体的路由
requirements.GET("/:id", ...)              // 通用路由

// ❌ 错误顺序
requirements.GET("/:id", ...)              // 会匹配所有 /:id/*
requirements.GET("/:id/history", ...)      // 永远不会被匹配
```

## 测试

### 验证路由是否注册

```bash
# 使用无效token测试，应该返回 UNAUTHORIZED 而不是 NOT_FOUND
curl -H "Authorization: Bearer invalid-token" \
  "http://localhost:8080/api/v1/requirements/8/history"

# 预期响应：
# {"error":{"code":"UNAUTHORIZED",...}}
#
# 如果返回 NOT_FOUND，说明路由未注册
```

### 完整功能测试

见 `/tmp/test-history-simple.sh`

## 自动历史记录功能

以下操作已实现自动历史记录：

- [x] ✅ 需求创建时记录 (`requirement_handler.go:241-248`)
- [x] ✅ 需求更新时记录 (`requirement_handler.go:403-409`)
- [x] ✅ 需求删除时记录 (`requirement_handler.go:473-479`)
- [x] ✅ 批准需求时记录 (`requirement_status_handler.go:246-257`)
- [x] ✅ 拒绝需求时记录 (`requirement_status_handler.go:339-350`)
- [x] ✅ 关联任务时记录 (`requirement_task_handler.go:156-171`)
- [x] ✅ 取消任务关联时记录 (`requirement_task_handler.go:239-251`)
- [x] ✅ 转换为任务时记录 (`requirement_handler.go:789-799`)
- [x] ✅ 提交需求时记录 (`requirement_status_handler.go:453-464` 通过 `transitionToStatus` 辅助方法)
- [x] ✅ 撤回需求时记录 (`requirement_status_handler.go:453-464` 通过 `transitionToStatus` 辅助方法)
- [x] ✅ 归档需求时记录 (`requirement_status_handler.go:453-464` 通过 `transitionToStatus` 辅助方法)
- [x] ✅ 更新评论时记录 (`requirement_comment_handler.go:562-575`) - **最新新增**
- [x] ✅ 删除评论时记录 (`requirement_comment_handler.go:635-645`) - **最新新增**
- [x] ✅ 基础状态变更时记录 (`requirement_status_handler.go:128-139` UpdateRequirementStatusEnhanced)

## 历史记录完整度

✅ **所有核心需求操作都已实现自动历史记录！**

总计 **14 种操作** 都会自动记录历史：
1. 创建需求
2. 更新需求
3. 删除需求
4. 批准需求
5. 拒绝需求
6. 关联任务
7. 取消关联任务
8. 转换为任务
9. 提交需求审核
10. 撤回需求
11. 归档需求
12. 更新评论
13. 删除评论
14. 状态变更

## 相关文件

### Backend
- `handlers/requirement_history_handler.go` - 新建
- `routes/requirement_routes.go` - 修改（第48-55行）
- `routes/interfaces.go` - 修改（第235行）
- `application/application.go` - 修改（第1024-1026行）
- `handlers/requirement_task_handler.go` - 修改（第156-171行）

### Frontend
- `services/requirementHistoryService.ts` - 新建
- `pages/RequirementDetail/RequirementDetailContent.tsx` - 修改

## 版本信息

- 实现日期：2025-11-10
- 实现者：Claude Code AI Assistant
- Backend版本：Go 1.24.0
- Frontend版本：React 18.2.0
