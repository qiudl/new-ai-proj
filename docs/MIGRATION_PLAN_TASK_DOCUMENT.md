# 任务文档代码迁移详细方案

**任务ID**: 2714
**创建时间**: 2025-10-22
**状态**: Phase 2 - 迁移方案设计

## 一、现状分析

### 1.1 Handler方法统计

#### HybridDocumentHandler (16个方法)
```
主要方法:
✅ GetDocuments            - 获取文档列表
✅ CreateDocument          - 创建文档
✅ GetDocument            - 获取单个文档
✅ UpdateDocument         - 更新文档
✅ DeleteDocument         - 删除文档
🔴 CopyDocument           - 复制文档 (路由引用)
🔴 ToggleTemplate         - 切换模板状态 (路由引用)
✅ CreateAndAttachDocument - 创建并关联文档
✅ GetTaskDocuments       - 获取任务文档列表
✅ HasTaskDocument        - 检查任务是否有文档
✅ GetAllTaskDocuments    - 获取所有任务文档
✅ GetTaskDocumentsWithoutProject - 无项目获取任务文档
✅ CreateTaskDocumentWithoutProject - 无项目创建任务文档
```

**关键发现**：
- 🔴 标记的方法被路由引用，需要迁移
- ✅ 标记的方法与UnifiedDocumentHandler重复

#### TaskDocumentHandler (27个方法)
```
文档CRUD:
✅ GetTaskDocument        - 获取任务文档
✅ SaveTaskDocument       - 保存任务文档 (已废弃注释)
✅ CheckTaskDocument      - 检查文档是否存在

文件处理:
🔴 ManualUploadDocument   - 手动上传文档 (路由可能引用)
🔴 APIUploadDocument      - API上传文档 (路由可能引用)
🔴 ViewFile              - 查看文件
🔴 DownloadFile          - 下载文件
🔴 DownloadTaskMarkdown  - 下载Markdown
🔴 DownloadTaskPDF       - 下载PDF

工具方法:
- validateUploadedFile
- validateFileExtension
- saveUploadedFile
- generateTaskMarkdown
- convertMarkdownToPDF
- getMimeType
- normalizeMimeType
```

**关键发现**：
- 文件上传/下载功能是独特功能，需要保留
- 部分方法已注释为"已废弃"

#### UnifiedDocumentHandler (24个方法)
```
核心CRUD:
✅ CreateDocument         - 创建文档
✅ GetDocument           - 获取文档
✅ UpdateDocument        - 更新文档
✅ DeleteDocument        - 删除文档

高级功能:
✅ GetDocumentHistory    - 版本历史
✅ ArchiveDocument       - 归档文档
✅ MigrateDocument       - 迁移文档
✅ SearchDocuments       - 搜索文档
✅ IndexDocument         - 索引文档

批量操作:
✅ BatchCreateDocuments  - 批量创建
✅ BatchUpdateDocuments  - 批量更新
✅ BatchDeleteDocuments  - 批量删除
✅ ExportDocuments       - 导出文档
✅ ImportDocuments       - 导入文档

版本控制:
✅ CompareVersions       - 比较版本
✅ GetDocumentAtVersion  - 获取特定版本
✅ ResolveConflict       - 解决冲突

协作功能:
✅ LockDocument          - 锁定文档
✅ UnlockDocument        - 解锁文档
✅ GetDocumentLockStatus - 获取锁定状态

任务相关:
✅ GetTaskDocument       - 获取任务文档
✅ SaveTaskDocument      - 保存任务文档
✅ CheckTaskDocument     - 检查任务文档
```

### 1.2 路由引用分析

#### document_routes.go 引用
```go
// 第98-99行：Legacy compatibility routes
authorized.POST("/documents/:id/copy", app.GetHybridDocumentHandler().CopyDocument)
authorized.POST("/documents/:id/toggle-template", app.GetHybridDocumentHandler().ToggleTemplate)

// 第252-253行：工作笔记兼容性路由
workNotes.POST("/:id/copy", app.GetHybridDocumentHandler().CopyDocument)
workNotes.POST("/:id/toggle-template", app.GetHybridDocumentHandler().ToggleTemplate)
```

#### project_routes.go 引用
```go
// 第120行：任务文档处理器
taskDocHandler := app.GetTaskDocumentHandler()
```

## 二、迁移策略

### 2.1 后端迁移策略

#### Strategy A: 扩展UnifiedDocumentHandler（推荐）

**优势**：
- 保持架构清晰，单一Handler
- 统一接口，易于维护
- 功能集中，便于测试

**实施步骤**：

```go
// 步骤1: 在UnifiedDocumentHandler添加缺失方法
// backend/handlers/unified_document_handler.go

// 从HybridDocumentHandler迁移
func (h *UnifiedDocumentHandler) CopyDocument(c *gin.Context) {
    // 实现文档复制逻辑
}

func (h *UnifiedDocumentHandler) ToggleTemplate(c *gin.Context) {
    // 实现模板切换逻辑
}

// 从TaskDocumentHandler迁移文件处理功能
func (h *UnifiedDocumentHandler) UploadDocumentFile(c *gin.Context) {
    // 整合ManualUploadDocument + APIUploadDocument
}

func (h *UnifiedDocumentHandler) ViewDocumentFile(c *gin.Context) {
    // 从TaskDocumentHandler.ViewFile迁移
}

func (h *UnifiedDocumentHandler) DownloadDocumentFile(c *gin.Context) {
    // 从TaskDocumentHandler.DownloadFile迁移
}

func (h *UnifiedDocumentHandler) ExportMarkdown(c *gin.Context) {
    // 从TaskDocumentHandler.DownloadTaskMarkdown迁移
}

func (h *UnifiedDocumentHandler) ExportPDF(c *gin.Context) {
    // 从TaskDocumentHandler.DownloadTaskPDF迁移
}

// 工具方法（private）
func (h *UnifiedDocumentHandler) validateFile(file *multipart.FileHeader) error {
    // 整合验证逻辑
}

func (h *UnifiedDocumentHandler) generateMarkdown(projectID, taskID int) (string, error) {
    // 从TaskDocumentHandler迁移
}

func (h *UnifiedDocumentHandler) convertToPDF(markdown string) ([]byte, error) {
    // 从TaskDocumentHandler迁移
}
```

#### Strategy B: 保留专门的FileHandler（备选）

**优势**：
- 分离关注点（文档CRUD vs 文件处理）
- 减少单个Handler的复杂度

**实施步骤**：
- 保留TaskDocumentFileHandler（或创建新的DocumentFileHandler）
- 仅处理文件上传/下载/转换
- UnifiedDocumentHandler处理文档元数据

### 2.2 路由迁移

#### 更新路由配置

```go
// backend/routes/document_routes.go

// 旧路由（删除）
// authorized.POST("/documents/:id/copy", app.GetHybridDocumentHandler().CopyDocument)
// authorized.POST("/documents/:id/toggle-template", app.GetHybridDocumentHandler().ToggleTemplate)

// 新路由（使用UnifiedDocumentHandler）
authorized.POST("/documents/:id/copy", unifiedHandler.CopyDocument)
authorized.POST("/documents/:id/toggle-template", unifiedHandler.ToggleTemplate)

// 文件处理路由
authorized.POST("/projects/:projectId/tasks/:taskId/documents/upload", unifiedHandler.UploadDocumentFile)
authorized.GET("/projects/:projectId/tasks/:taskId/documents/:docId/view", unifiedHandler.ViewDocumentFile)
authorized.GET("/projects/:projectId/tasks/:taskId/documents/:docId/download", unifiedHandler.DownloadDocumentFile)
authorized.GET("/projects/:projectId/tasks/:taskId/documents/:docId/export/markdown", unifiedHandler.ExportMarkdown)
authorized.GET("/projects/:projectId/tasks/:taskId/documents/:docId/export/pdf", unifiedHandler.ExportPDF)
```

### 2.3 前端迁移策略

#### 当前前端Service分析

```typescript
// 1. taskDocumentService.ts - 主Service
- getTaskDocument(projectId, taskId)
- createTaskDocument(projectId, taskId, content)
- updateTaskDocument(projectId, taskId, content)
- deleteTaskDocument(projectId, taskId)
- hasTaskDocument(projectId, taskId)

// 2. documentService.ts - 通用Service（功能重叠）
- getDocument(id)
- createDocument(data)
- updateDocument(id, data)
- deleteDocument(id)
- searchDocuments(query)
- getDocumentVersions(id)

// 3. documentCacheService.ts - 缓存Service
- getCachedDocument(key)
- setCachedDocument(key, value)
- clearCache()
- invalidateCache(key)

// 4. taskDocumentFileService.ts - 文件Service
- uploadFile(projectId, taskId, file)
- downloadFile(projectId, taskId, docId)
- viewFile(projectId, taskId, docId)
- exportMarkdown(projectId, taskId, docId)
- exportPDF(projectId, taskId, docId)
```

#### 统一后的Service架构

```typescript
// frontend/src/services/taskDocumentService.ts

/**
 * 统一的任务文档Service
 * 整合了原有的4个Service的所有功能
 */
class TaskDocumentService {
  // ========== 核心CRUD ==========

  /**
   * 获取任务文档
   * @migration 从 taskDocumentService.getTaskDocument
   */
  async getDocument(projectId: number, taskId: number): Promise<TaskDocument>

  /**
   * 创建任务文档
   * @migration 从 taskDocumentService.createTaskDocument
   */
  async createDocument(projectId: number, taskId: number, content: string): Promise<void>

  /**
   * 更新任务文档
   * @migration 从 taskDocumentService.updateTaskDocument
   */
  async updateDocument(projectId: number, taskId: number, docId: number, content: string): Promise<void>

  /**
   * 删除任务文档
   * @migration 从 taskDocumentService.deleteTaskDocument
   */
  async deleteDocument(projectId: number, taskId: number, docId: number): Promise<void>

  /**
   * 检查任务是否有文档
   * @migration 从 taskDocumentService.hasTaskDocument
   */
  async hasDocument(projectId: number, taskId: number): Promise<boolean>

  // ========== 高级功能（从documentService迁移）==========

  /**
   * 搜索文档
   * @migration 从 documentService.searchDocuments
   */
  async searchDocuments(query: string, filters?: SearchFilters): Promise<TaskDocument[]>

  /**
   * 获取文档版本历史
   * @migration 从 documentService.getDocumentVersions
   */
  async getVersionHistory(docId: number): Promise<DocumentVersion[]>

  /**
   * 比较两个版本
   * @migration 新功能，对应后端CompareVersions
   */
  async compareVersions(docId: number, version1: number, version2: number): Promise<VersionDiff>

  /**
   * 获取特定版本的文档
   * @migration 新功能，对应后端GetDocumentAtVersion
   */
  async getDocumentAtVersion(docId: number, version: number): Promise<TaskDocument>

  // ========== 缓存管理（从documentCacheService迁移）==========

  /**
   * 获取缓存的文档
   * @migration 从 documentCacheService.getCachedDocument
   */
  private async getCached(key: string): Promise<TaskDocument | null>

  /**
   * 设置文档缓存
   * @migration 从 documentCacheService.setCachedDocument
   */
  private async setCache(key: string, value: TaskDocument): Promise<void>

  /**
   * 清除缓存
   * @migration 从 documentCacheService.clearCache
   */
  async clearCache(): Promise<void>

  /**
   * 使指定缓存失效
   * @migration 从 documentCacheService.invalidateCache
   */
  async invalidateCache(key: string): Promise<void>

  // ========== 文件处理（从taskDocumentFileService迁移）==========

  /**
   * 上传文档文件
   * @migration 从 taskDocumentFileService.uploadFile
   */
  async uploadFile(projectId: number, taskId: number, file: File): Promise<UploadResult>

  /**
   * 下载文档文件
   * @migration 从 taskDocumentFileService.downloadFile
   */
  async downloadFile(projectId: number, taskId: number, docId: number): Promise<Blob>

  /**
   * 查看文档文件（在线预览）
   * @migration 从 taskDocumentFileService.viewFile
   */
  async viewFile(projectId: number, taskId: number, docId: number): Promise<string>

  /**
   * 导出为Markdown
   * @migration 从 taskDocumentFileService.exportMarkdown
   */
  async exportMarkdown(projectId: number, taskId: number, docId: number): Promise<Blob>

  /**
   * 导出为PDF
   * @migration 从 taskDocumentFileService.exportPDF
   */
  async exportPDF(projectId: number, taskId: number, docId: number): Promise<Blob>

  // ========== 批量操作（新功能）==========

  /**
   * 批量创建文档
   * @migration 新功能，对应后端BatchCreateDocuments
   */
  async batchCreate(documents: CreateDocumentRequest[]): Promise<BatchResult>

  /**
   * 批量更新文档
   * @migration 新功能，对应后端BatchUpdateDocuments
   */
  async batchUpdate(updates: UpdateDocumentRequest[]): Promise<BatchResult>

  /**
   * 批量删除文档
   * @migration 新功能，对应后端BatchDeleteDocuments
   */
  async batchDelete(docIds: number[]): Promise<BatchResult>

  // ========== 协作功能（新功能）==========

  /**
   * 锁定文档（编辑时）
   * @migration 新功能，对应后端LockDocument
   */
  async lockDocument(docId: number): Promise<LockInfo>

  /**
   * 解锁文档
   * @migration 新功能，对应后端UnlockDocument
   */
  async unlockDocument(docId: number): Promise<void>

  /**
   * 获取文档锁定状态
   * @migration 新功能，对应后端GetDocumentLockStatus
   */
  async getLockStatus(docId: number): Promise<LockInfo>

  // ========== 工具方法 ==========

  /**
   * 生成缓存key
   */
  private generateCacheKey(projectId: number, taskId: number, includeContent: boolean = true): string

  /**
   * 验证文件类型
   */
  private validateFileType(file: File): boolean

  /**
   * 格式化文档响应
   */
  private formatDocument(rawData: any): TaskDocument
}

// 导出单例
export const taskDocumentService = new TaskDocumentService();
export default taskDocumentService;
```

#### 组件更新策略

**35个组件需要更新import语句**：

```typescript
// 旧代码（需要替换）
import { documentService } from '@/services/documentService';
import { documentCacheService } from '@/services/documentCacheService';
import { taskDocumentFileService } from '@/services/taskDocumentFileService';

// 新代码
import { taskDocumentService } from '@/services/taskDocumentService';

// API调用示例
// 旧：documentService.getDocument(id)
// 新：taskDocumentService.getDocument(projectId, taskId)

// 旧：documentCacheService.getCachedDocument(key)
// 新：taskDocumentService内部自动处理缓存

// 旧：taskDocumentFileService.uploadFile(projectId, taskId, file)
// 新：taskDocumentService.uploadFile(projectId, taskId, file)
```

## 三、实施计划

### Phase 3: 后端代码迁移（3小时）

#### Step 1: 扩展UnifiedDocumentHandler（1小时）
```bash
- [ ] 添加CopyDocument方法
- [ ] 添加ToggleTemplate方法
- [ ] 添加文件上传方法（UploadDocumentFile）
- [ ] 添加文件下载方法（DownloadDocumentFile, ViewDocumentFile）
- [ ] 添加导出方法（ExportMarkdown, ExportPDF）
- [ ] 迁移私有工具方法
```

#### Step 2: 更新路由配置（0.5小时）
```bash
- [ ] 修改document_routes.go，使用UnifiedDocumentHandler
- [ ] 修改project_routes.go，移除TaskDocumentHandler引用
- [ ] 添加文件处理相关路由
- [ ] 保留旧路由作为deprecated（添加警告日志）
```

#### Step 3: 更新接口定义（0.5小时）
```bash
- [ ] 修改ApplicationInterface，移除GetHybridDocumentHandler
- [ ] 修改ApplicationInterface，移除GetTaskDocumentHandler
- [ ] 确保GetUnifiedDocumentHandler存在
- [ ] 更新main.go，不再初始化废弃的Handler
```

#### Step 4: 标记废弃Handler（1小时）
```bash
- [ ] 在HybridDocumentHandler添加@deprecated注释
- [ ] 在TaskDocumentHandler添加@deprecated注释
- [ ] 所有方法添加废弃警告日志
- [ ] 更新文档说明
```

### Phase 4: 前端代码统一（2小时）

#### Step 1: 创建统一Service（1小时）
```bash
- [ ] 创建新的taskDocumentService.ts
- [ ] 从taskDocumentService迁移核心CRUD
- [ ] 从documentService迁移高级功能
- [ ] 从documentCacheService迁移缓存逻辑
- [ ] 从taskDocumentFileService迁移文件处理
- [ ] 添加TypeScript类型定义
- [ ] 添加完整的JSDoc注释
```

#### Step 2: 更新组件引用（0.5小时）
```bash
# 使用自动化脚本批量替换
- [ ] 替换35个组件的import语句
- [ ] 更新API调用方式
- [ ] 修复TypeScript类型错误
```

#### Step 3: 删除旧Service（0.5小时）
```bash
- [ ] 确认无引用后删除documentService.ts
- [ ] 删除documentCacheService.ts
- [ ] 删除taskDocumentFileService.ts
- [ ] 删除相关测试文件
- [ ] 更新index.ts导出
```

### Phase 5: 测试验证（1小时）

#### 后端测试
```bash
- [ ] 单元测试：UnifiedDocumentHandler新方法
- [ ] 集成测试：路由是否正确响应
- [ ] 回归测试：原有功能是否正常
- [ ] 性能测试：响应时间对比
```

#### 前端测试
```bash
- [ ] 单元测试：新Service的每个方法
- [ ] 集成测试：组件与Service交互
- [ ] E2E测试：完整的文档管理流程
- [ ] 兼容性测试：所有引用组件
```

### Phase 6: 文档更新和提交（0.5小时）

```bash
- [ ] 更新API文档（Swagger/OpenAPI）
- [ ] 更新开发者文档
- [ ] 创建迁移指南（给其他开发者）
- [ ] 提交代码并创建PR
- [ ] 更新CHANGELOG
```

## 四、风险评估和缓解

### 4.1 技术风险

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 遗漏路由引用 | 中 | 高 | 全代码扫描，添加deprecation日志 |
| 方法签名不兼容 | 低 | 中 | 保持API兼容，添加适配层 |
| 缓存失效 | 中 | 低 | 统一缓存key生成规则 |
| 类型定义冲突 | 低 | 低 | 使用统一的TypeScript类型 |

### 4.2 测试策略

#### 回归测试清单
```
核心功能:
✅ 创建文档 - 确保新建文档正常
✅ 读取文档 - 确保可以获取文档
✅ 更新文档 - 确保修改保存成功
✅ 删除文档 - 确保删除后不可见

新迁移功能:
✅ 复制文档 - CopyDocument方法
✅ 切换模板 - ToggleTemplate方法
✅ 文件上传 - UploadDocumentFile方法
✅ 文件下载 - DownloadDocumentFile方法
✅ Markdown导出 - ExportMarkdown方法
✅ PDF导出 - ExportPDF方法

性能验证:
✅ 响应时间 - 不应超过之前的1.2倍
✅ 内存使用 - 减少Handler数量应降低内存
✅ 并发性能 - 多用户同时操作
```

## 五、回滚方案

### 5.1 Git策略

```bash
# 每个Phase单独提交
git checkout -b feature/task-document-cleanup
git commit -m "Phase 1: Remove deprecated files"
git commit -m "Phase 2: Migration planning"
git commit -m "Phase 3: Backend migration"
git commit -m "Phase 4: Frontend unification"
git commit -m "Phase 5: Testing"
git commit -m "Phase 6: Documentation"

# 如需回滚
git revert <commit-hash>
```

### 5.2 Feature Flag

```go
// backend/config/feature_flags.go
const (
    UseUnifiedDocumentHandler = true  // 切换为false可回滚
)

// 在路由中使用
if config.UseUnifiedDocumentHandler {
    authorized.POST("/documents/:id/copy", unifiedHandler.CopyDocument)
} else {
    authorized.POST("/documents/:id/copy", hybridHandler.CopyDocument)
}
```

## 六、成功指标

### 6.1 代码指标

- ✅ Handler文件减少：18个 → 8个（-55%）
- ✅ 后端代码减少：~8000行 → ~3000行（-62%）
- ✅ 前端Service减少：4个 → 1个（-75%）
- ✅ 前端代码减少：~3000行 → ~1500行（-50%）

### 6.2 质量指标

- ✅ 测试覆盖率 > 80%
- ✅ 无P0/P1 bug
- ✅ 性能无退化（<5%）
- ✅ 代码Review通过

### 6.3 交付指标

- ✅ 文档完整性 100%
- ✅ 所有TODO完成
- ✅ PR合并到主分支
- ✅ 生产环境验证通过

## 七、下一步行动

### 立即执行（Phase 3）
```bash
cd backend/handlers
# 开始修改unified_document_handler.go
```

### 关键文件
```
后端:
- backend/handlers/unified_document_handler.go [编辑]
- backend/handlers/hybrid_document_handler.go [标记废弃]
- backend/handlers/task_document_handler.go [标记废弃]
- backend/routes/document_routes.go [更新路由]
- backend/routes/project_routes.go [更新路由]
- backend/routes/interfaces.go [移除废弃接口]

前端:
- frontend/src/services/taskDocumentService.ts [重写]
- frontend/src/services/documentService.ts [删除]
- frontend/src/services/documentCacheService.ts [删除]
- frontend/src/services/taskDocumentFileService.ts [删除]
```

## 八、参考资料

- 主文档：`/docs/CODE_CLEANUP_TASK_DOCUMENT.md`
- 任务文档：Task #2714
- Handler代码：`/backend/handlers/`
- 路由配置：`/backend/routes/`
- 前端Service：`/frontend/src/services/`
