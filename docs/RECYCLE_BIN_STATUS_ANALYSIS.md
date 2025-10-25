# 回收站功能现状分析报告

## 任务信息

- **任务ID**: #2747
- **任务标题**: 实现任务文档/工作笔记删除回收站功能
- **分析时间**: 2025-10-25
- **分析人**: Claude Code

## 执行摘要

通过代码审查发现，**回收站功能已经部分实现**。项目和任务的回收站功能已经完整，但文档（Documents）和工作笔记（WorkNotes）的回收站功能只实现了**查询列表**功能，缺少**恢复（Restore）**和**永久删除（HardDelete）**功能。

### 完成度评估

| 功能模块 | 数据模型 | 后端API | 前端UI | 完成度 |
|---------|---------|---------|--------|--------|
| 项目回收站 | ✅ | ✅ | ✅ | 100% |
| 任务回收站 | ✅ | ✅ | ✅ | 100% |
| **文档回收站** | ✅ | ⚠️ 部分 | ✅ | **60%** |
| **工作笔记回收站** | ✅ | ⚠️ 部分 | ✅ | **60%** |

## 详细分析

### 1. 数据库层 ✅

#### 1.1 软删除字段

所有相关模型都已实现软删除支持：

**Document模型** (`backend/models/document.go:98`):
```go
type Document struct {
    // ... 其他字段
    DeletedAt *time.Time `json:"deleted_at" db:"deleted_at"`
}
```

**WorkNote模型** (`backend/models/work_note.go:166-168`):
```go
type WorkNote struct {
    // 基础Document字段
    Document
    // ... 专用字段
}
```

✅ **结论**: WorkNote继承了Document的DeletedAt字段，数据库层完整支持软删除。

#### 1.2 数据库视图

已创建回收站视图 (`backend/migrations/038_create_recycle_bin_views.sql`):
- 视图用于统一查询已删除的数据
- 支持项目、任务、文档和工作笔记

### 2. 后端API层 ⚠️ 部分实现

#### 2.1 已实现的功能

**项目回收站** (`backend/handlers/recycle_bin_handlers.go`):
- ✅ GetRecycledProjects (第127行)
- ✅ RestoreProject (第176行)
- ✅ HardDeleteProject (第200行)

**任务回收站** (`backend/handlers/recycle_bin_handlers.go`):
- ✅ GetRecycledTasks (第30行)
- ✅ RestoreTask (第79行)
- ✅ HardDeleteTask (第103行)

**文档回收站** (`backend/handlers/recycle_bin_handlers.go`):
- ✅ GetRecycledDocuments (第224行)
- ❌ RestoreDocument - **缺失**
- ❌ HardDeleteDocument - **缺失**

**工作笔记回收站** (`backend/handlers/recycle_bin_handlers.go`):
- ✅ GetRecycledWorkNotes (第271行)
- ❌ RestoreWorkNote - **缺失**
- ❌ HardDeleteWorkNote - **缺失**

#### 2.2 路由注册情况

**已注册的路由** (`backend/routes/recycle_bin_routes.go`):

```go
// 文档回收站路由
documents := recycleGroup.Group("/documents")
{
    documents.GET("", app.GetRecycledDocumentsHandler()) // ✅ 已实现
    // ❌ 缺少 restore 路由
    // ❌ 缺少 hard delete 路由
}

// 工作笔记回收站路由
workNotes := recycleGroup.Group("/work-notes")
{
    workNotes.GET("", app.GetRecycledWorkNotesHandler()) // ✅ 已实现
    // ❌ 缺少 restore 路由
    // ❌ 缺少 hard delete 路由
}
```

**缺失的路由**:
```go
// 需要添加：
documents.POST("/:id/restore", app.RestoreDocumentHandler())
documents.DELETE("/:id", app.HardDeleteDocumentHandler())

workNotes.POST("/:id/restore", app.RestoreWorkNoteHandler())
workNotes.DELETE("/:id", app.HardDeleteWorkNoteHandler())
```

#### 2.3 Repository层

**已实现** (`backend/database/system_repository.go`):
- ✅ GetRecycledDocuments - 查询已删除文档
- ✅ GetRecycledWorkNotes - 查询已删除工作笔记
- ✅ GetRecycledTasks - 查询已删除任务
- ✅ RestoreTask - 恢复任务
- ✅ HardDeleteTask - 永久删除任务
- ✅ GetRecycledProjects - 查询已删除项目
- ✅ RestoreProject - 恢复项目
- ✅ HardDeleteProject - 永久删除项目

**缺失**:
- ❌ RestoreDocument - 恢复文档
- ❌ HardDeleteDocument - 永久删除文档
- ❌ RestoreWorkNote - 恢复工作笔记
- ❌ HardDeleteWorkNote - 永久删除工作笔记

### 3. 前端UI层 ✅

#### 3.1 回收站页面

**RecycleBinPage组件** (`frontend/src/pages/RecycleBinPage.tsx`):
- ✅ 项目回收站Tab - 完整实现
- ✅ 任务回收站Tab - 完整实现
- ✅ **文档回收站Tab** - UI完整，但API未实现
- ✅ **工作笔记回收站Tab** - UI完整，但API未实现

#### 3.2 前端Service

**SystemService** (`frontend/src/services/systemService.ts`):

**已实现的方法**:
```typescript
// 文档回收站
static async getRecycledDocuments(...): Promise<...>  // ✅
static async restoreDocument(id: number): Promise<void>  // ✅ 前端已实现
static async hardDeleteDocument(id: number): Promise<void>  // ✅ 前端已实现

// 工作笔记回收站
static async getRecycledWorkNotes(...): Promise<...>  // ✅
static async restoreWorkNote(id: number): Promise<void>  // ✅ 前端已实现
static async hardDeleteWorkNote(id: number): Promise<void>  // ✅ 前端已实现
```

**API调用路径**:
```typescript
// 这些路径在后端还不存在，会返回404
restoreDocument: POST /api/v1/system/recycle/documents/:id/restore  // ❌ 404
hardDeleteDocument: DELETE /api/v1/system/recycle/documents/:id  // ❌ 404
restoreWorkNote: POST /api/v1/system/recycle/work-notes/:id/restore  // ❌ 404
hardDeleteWorkNote: DELETE /api/v1/system/recycle/work-notes/:id  // ❌ 404
```

#### 3.3 UI功能

**文档回收站列表** (`frontend/src/pages/RecycleBinPage.tsx:470-550`):
- ✅ 显示文档ID、标题、类型、所有者
- ✅ 显示创建时间和删除时间
- ✅ 恢复按钮 (handleRestoreDocument) - UI存在但API缺失
- ✅ 永久删除按钮 (handleHardDeleteDocument) - UI存在但API缺失

**工作笔记回收站列表** (`frontend/src/pages/RecycleBinPage.tsx:570-650`):
- ✅ 显示笔记ID、标题、类型、优先级
- ✅ 显示创建时间和删除时间
- ✅ 恢复按钮 (handleRestoreWorkNote) - UI存在但API缺失
- ✅ 永久删除按钮 (handleHardDeleteWorkNote) - UI存在但API缺失

### 4. 其他相关组件

#### 4.1 软删除接口

**接口定义** (`backend/interfaces/soft_delete.go`):
```go
type SoftDeletable interface {
    GetDeletedAt() *time.Time
    SetDeletedAt(*time.Time)
}
```

#### 4.2 软删除辅助函数

**辅助工具** (`backend/database/soft_delete_helpers.go`):
- ✅ 提供通用的软删除查询helper
- ✅ 支持WHERE deleted_at IS NULL/NOT NULL过滤

## 需要实现的功能

### 后端需要实现

#### 1. Repository层方法

在 `backend/database/system_repository.go` 中添加：

```go
// RestoreDocument 恢复文档
func (r *SystemRepository) RestoreDocument(ctx context.Context, documentID int) error {
    query := `UPDATE documents SET deleted_at = NULL WHERE id = $1`
    _, err := r.db.ExecContext(ctx, query, documentID)
    return err
}

// HardDeleteDocument 永久删除文档
func (r *SystemRepository) HardDeleteDocument(ctx context.Context, documentID int) error {
    query := `DELETE FROM documents WHERE id = $1 AND deleted_at IS NOT NULL`
    _, err := r.db.ExecContext(ctx, query, documentID)
    return err
}

// RestoreWorkNote 恢复工作笔记
func (r *SystemRepository) RestoreWorkNote(ctx context.Context, workNoteID int) error {
    query := `UPDATE documents SET deleted_at = NULL WHERE id = $1`
    _, err := r.db.ExecContext(ctx, query, workNoteID)
    return err
}

// HardDeleteWorkNote 永久删除工作笔记
func (r *SystemRepository) HardDeleteWorkNote(ctx context.Context, workNoteID int) error {
    query := `DELETE FROM documents WHERE id = $1 AND deleted_at IS NOT NULL`
    _, err := r.db.ExecContext(ctx, query, workNoteID)
    return err
}
```

#### 2. Handler方法

在 `backend/handlers/recycle_bin_handlers.go` 中添加：

```go
// RestoreDocument 恢复文档
func (h *RecycleBinHandler) RestoreDocument(c *gin.Context) {
    documentIDStr := c.Param("id")
    documentID, err := strconv.Atoi(documentIDStr)
    if err != nil {
        response := models.NewErrorResponse(models.ErrCodeBadRequest, "无效的文档ID", nil)
        c.JSON(http.StatusBadRequest, response)
        return
    }

    err = h.db.System().RestoreDocument(c.Request.Context(), documentID)
    if err != nil {
        h.logger.Printf("Error restoring document %d: %v", documentID, err)
        response := models.NewErrorResponse(models.ErrCodeInternal, "恢复文档失败", nil)
        c.JSON(http.StatusInternalServerError, response)
        return
    }

    h.logger.Printf("Successfully restored document %d", documentID)
    response := models.NewSuccessResponse(nil, "文档恢复成功")
    c.JSON(http.StatusOK, response)
}

// HardDeleteDocument 永久删除文档
func (h *RecycleBinHandler) HardDeleteDocument(c *gin.Context) {
    documentIDStr := c.Param("id")
    documentID, err := strconv.Atoi(documentIDStr)
    if err != nil {
        response := models.NewErrorResponse(models.ErrCodeBadRequest, "无效的文档ID", nil)
        c.JSON(http.StatusBadRequest, response)
        return
    }

    err = h.db.System().HardDeleteDocument(c.Request.Context(), documentID)
    if err != nil {
        h.logger.Printf("Error hard deleting document %d: %v", documentID, err)
        response := models.NewErrorResponse(models.ErrCodeInternal, "永久删除文档失败", nil)
        c.JSON(http.StatusInternalServerError, response)
        return
    }

    h.logger.Printf("Successfully hard deleted document %d", documentID)
    response := models.NewSuccessResponse(nil, "文档已永久删除")
    c.JSON(http.StatusOK, response)
}

// RestoreWorkNote 恢复工作笔记
func (h *RecycleBinHandler) RestoreWorkNote(c *gin.Context) {
    workNoteIDStr := c.Param("id")
    workNoteID, err := strconv.Atoi(workNoteIDStr)
    if err != nil {
        response := models.NewErrorResponse(models.ErrCodeBadRequest, "无效的工作笔记ID", nil)
        c.JSON(http.StatusBadRequest, response)
        return
    }

    err = h.db.System().RestoreWorkNote(c.Request.Context(), workNoteID)
    if err != nil {
        h.logger.Printf("Error restoring work note %d: %v", workNoteID, err)
        response := models.NewErrorResponse(models.ErrCodeInternal, "恢复工作笔记失败", nil)
        c.JSON(http.StatusInternalServerError, response)
        return
    }

    h.logger.Printf("Successfully restored work note %d", workNoteID)
    response := models.NewSuccessResponse(nil, "工作笔记恢复成功")
    c.JSON(http.StatusOK, response)
}

// HardDeleteWorkNote 永久删除工作笔记
func (h *RecycleBinHandler) HardDeleteWorkNote(c *gin.Context) {
    workNoteIDStr := c.Param("id")
    workNoteID, err := strconv.Atoi(workNoteIDStr)
    if err != nil {
        response := models.NewErrorResponse(models.ErrCodeBadRequest, "无效的工作笔记ID", nil)
        c.JSON(http.StatusBadRequest, response)
        return
    }

    err = h.db.System().HardDeleteWorkNote(c.Request.Context(), workNoteID)
    if err != nil {
        h.logger.Printf("Error hard deleting work note %d: %v", workNoteID, err)
        response := models.NewErrorResponse(models.ErrCodeInternal, "永久删除工作笔记失败", nil)
        c.JSON(http.StatusInternalServerError, response)
        return
    }

    h.logger.Printf("Successfully hard deleted work note %d", workNoteID)
    response := models.NewSuccessResponse(nil, "工作笔记已永久删除")
    c.JSON(http.StatusOK, response)
}
```

#### 3. 路由注册

在 `backend/routes/recycle_bin_routes.go` 中修改：

```go
// 文档回收站路由
documents := recycleGroup.Group("/documents")
{
    documents.GET("", app.GetRecycledDocumentsHandler())
    documents.POST("/:id/restore", app.RestoreDocumentHandler())     // 新增
    documents.DELETE("/:id", app.HardDeleteDocumentHandler())        // 新增
}

// 工作笔记回收站路由
workNotes := recycleGroup.Group("/work-notes")
{
    workNotes.GET("", app.GetRecycledWorkNotesHandler())
    workNotes.POST("/:id/restore", app.RestoreWorkNoteHandler())    // 新增
    workNotes.DELETE("/:id", app.HardDeleteWorkNoteHandler())       // 新增
}
```

#### 4. Handler Factory接口

在 `backend/factories/types.go` 或相应的接口文件中添加：

```go
RestoreDocumentHandler() gin.HandlerFunc
HardDeleteDocumentHandler() gin.HandlerFunc
RestoreWorkNoteHandler() gin.HandlerFunc
HardDeleteWorkNoteHandler() gin.HandlerFunc
```

## 实现优先级

### P0 - 核心功能（必须实现）

1. ✅ **Repository层方法** - 4个方法
   - RestoreDocument
   - HardDeleteDocument
   - RestoreWorkNote
   - HardDeleteWorkNote

2. ✅ **Handler方法** - 4个handler
   - RestoreDocument handler
   - HardDeleteDocument handler
   - RestoreWorkNote handler
   - HardDeleteWorkNote handler

3. ✅ **路由注册** - 4个路由
   - POST /system/recycle/documents/:id/restore
   - DELETE /system/recycle/documents/:id
   - POST /system/recycle/work-notes/:id/restore
   - DELETE /system/recycle/work-notes/:id

### P1 - 增强功能（可选）

1. ⚠️ **批量操作**
   - 批量恢复
   - 批量永久删除

2. ⚠️ **清空回收站**
   - EmptyRecycleBin功能（目前标记为TODO）

3. ⚠️ **自动清理**
   - 定时任务，自动删除30天前的已删除项

4. ⚠️ **审计日志**
   - 记录恢复和永久删除操作

## 工作量估算

### 开发工作量

| 任务 | 难度 | 工时估算 |
|------|------|----------|
| Repository层方法 | 低 | 0.5h |
| Handler方法 | 低 | 1h |
| 路由注册和接口 | 低 | 0.5h |
| 单元测试 | 中 | 1h |
| 集成测试 | 中 | 1h |
| 文档编写 | 低 | 0.5h |

**总计**: 约 4.5 小时

### 测试工作量

| 测试类型 | 工时估算 |
|---------|----------|
| 单元测试编写 | 1h |
| API集成测试 | 1h |
| 前后端联调 | 0.5h |
| 回归测试 | 0.5h |

**总计**: 约 3 小时

### 总工时

**预估总工时**: 7-8 小时

## 技术风险

### 低风险 🟢

1. **数据模型已就绪** - Document和WorkNote都有deleted_at字段
2. **前端UI已完成** - 只需后端API支持即可使用
3. **参考实现存在** - 可以复制Task/Project的实现模式
4. **影响范围小** - 只涉及回收站功能，不影响主流程

### 需要注意的点

1. **权限控制**
   - 只有文档所有者或管理员可以恢复/删除
   - 需要检查middleware是否已实现

2. **关联数据处理**
   - 文档的版本历史是否需要级联处理
   - task_documents关联表的处理

3. **并发安全**
   - 同时恢复和删除的冲突处理

## 参考资料

### 已实现的功能

可参考以下文件的实现模式：

1. **任务恢复** - `backend/handlers/recycle_bin_handlers.go:79`
2. **任务永久删除** - `backend/handlers/recycle_bin_handlers.go:103`
3. **项目恢复** - `backend/handlers/recycle_bin_handlers.go:176`
4. **项目永久删除** - `backend/handlers/recycle_bin_handlers.go:200`

### 数据库查询模式

```sql
-- 软删除（已在Document删除时使用）
UPDATE documents SET deleted_at = NOW() WHERE id = ?

-- 恢复
UPDATE documents SET deleted_at = NULL WHERE id = ?

-- 永久删除（需确保已软删除）
DELETE FROM documents WHERE id = ? AND deleted_at IS NOT NULL
```

## 建议的实现步骤

### 第一步：实现Repository层

1. 在 `backend/database/system_repository.go` 添加4个方法
2. 参考现有的RestoreTask和HardDeleteTask实现
3. 确保SQL查询正确且有deleted_at校验

### 第二步：实现Handler层

1. 在 `backend/handlers/recycle_bin_handlers.go` 添加4个handler
2. 复制粘贴RestoreTask/HardDeleteTask的实现，修改变量名
3. 添加适当的日志和错误处理

### 第三步：注册路由

1. 修改 `backend/routes/recycle_bin_routes.go`
2. 添加4个新路由
3. 在factory中注册handler方法

### 第四步：测试

1. 编写单元测试
2. 使用Postman/curl测试API
3. 在前端UI测试完整流程
4. 验证数据库状态

### 第五步：文档和清理

1. 更新API文档
2. 添加代码注释
3. 更新swagger文档（如果有）

## 总结

### 现状

- ✅ 数据库层完全支持
- ✅ 前端UI完全实现
- ⚠️ 后端API部分实现（缺少恢复和删除功能）

### 需要做的

- [ ] 实现4个Repository方法
- [ ] 实现4个Handler方法
- [ ] 注册4个路由
- [ ] 编写测试
- [ ] 更新文档

### 结论

这是一个**简单且低风险**的任务，因为：
1. 大部分基础设施已经存在
2. 有现成的参考实现（Task/Project）
3. 前端已完全实现，只需后端支持
4. 不涉及复杂的业务逻辑

**建议直接开始实现，预计半天可以完成。**
