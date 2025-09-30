# 文档组件系统 v3

## 概述
本项目的文档组件系统已完成重构，现在使用统一的 `UnifiedTaskDocumentArea` 组件处理所有文档相关功能。

## 核心组件

### UnifiedTaskDocumentArea
主要的文档处理组件，支持编辑、预览、管理等所有功能。

```typescript
<UnifiedTaskDocumentArea
  projectId={1}
  taskId={1}
  defaultViewMode="edit"
  showToolbar={true}
  enableComments={true}
  fullscreenMode={false}
/>
```

**主要功能：**
- ✅ 文档编辑和预览
- ✅ 全屏模式
- ✅ 评论系统
- ✅ 搜索功能
- ✅ 文档分享
- ✅ 键盘快捷键
- ✅ 响应式设计

### DocumentAreaAdapter
适配器组件，用于不同场景下的配置适配。

```typescript
<DocumentAreaAdapter
  projectId={1}
  taskId={1}
  mode="inline" // 'inline' | 'modal' | 'fullscreen'
  compactMode={false}
/>
```

**预设模式：**
- `inline`: 内嵌模式，适用于页面内容区
- `modal`: 模态框模式，适用于弹窗显示
- `fullscreen`: 全屏模式，适用于专注编辑

### 便捷组件
```typescript
import { 
  TaskDetailDocumentArea,    // 任务详情页模式
  TaskCardDocumentArea,      // 任务卡片模式
  ModalDocumentArea,         // 模态框模式
  FullscreenDocumentArea,    // 全屏模式
  PreviewDocumentArea        // 预览模式
} from './enhanced/DocumentAreaAdapter';
```

## 迁移指南

### 从旧组件迁移

| 旧组件 | 新组件 | 配置差异 |
|--------|--------|----------|
| TaskDocumentEditor | UnifiedTaskDocumentArea | `defaultViewMode="edit"` |
| DocumentViewer | DocumentAreaAdapter | `mode="modal", readonly=true` |
| MarkdownEditor | UnifiedTaskDocumentArea | `compactMode=true` |
| TaskDocumentManager | UnifiedTaskDocumentArea | `defaultViewMode="manage"` |

### 服务层迁移

```typescript
// 旧代码
import { taskDocumentService } from '../services/taskDocumentService';

// 新代码
import { unifiedDocumentService } from '../services/document';
```

### 实际迁移示例

#### 任务详情页
```typescript
// 旧代码
<TaskDocumentEditor 
  taskId={taskId} 
  projectId={projectId}
  onSave={handleSave}
/>

// 新代码 - 方案1: 直接使用
<UnifiedTaskDocumentArea
  taskId={taskId}
  projectId={projectId}
  defaultViewMode="edit"
  showToolbar={true}
  onSaveDocument={handleSave}
/>

// 新代码 - 方案2: 使用预设
<TaskDetailDocumentArea
  taskId={taskId}
  projectId={projectId}
  onDocumentChange={handleDocumentChange}
/>
```

#### 文档查看模态框
```typescript
// 旧代码
<DocumentViewer
  visible={visible}
  documentId={documentId}
  onClose={onClose}
/>

// 新代码
<Modal open={visible} onCancel={onClose}>
  <DocumentAreaAdapter
    projectId={projectId}
    taskId={taskId}
    mode="modal"
    currentDocumentId={documentId}
    readonly={true}
  />
</Modal>

// 或使用增强模态框
<EnhancedDocumentModal
  visible={visible}
  projectId={projectId}
  taskId={taskId}
  onClose={onClose}
  initialDocumentId={documentId}
  mode="view"
/>
```

#### 紧凑型编辑器
```typescript
// 旧代码
<MarkdownEditor
  value={content}
  onChange={handleChange}
  height={300}
/>

// 新代码
<UnifiedTaskDocumentArea
  projectId={projectId}
  taskId={taskId}
  defaultViewMode="edit"
  compactMode={true}
  headerVisible={false}
  showDocumentList={false}
  onDocumentChange={handleChange}
  style={{ height: 300 }}
/>
```

## 废弃组件

以下组件已废弃，建议迁移：

### ⚠️ 即将废弃
- `TaskDocumentEditor` → 使用 `UnifiedTaskDocumentArea`
- `DocumentViewer` → 使用 `DocumentAreaAdapter`
- `MarkdownEditor` → 使用 `UnifiedTaskDocumentArea`
- `TaskDocumentManager` → 使用 `UnifiedTaskDocumentArea`

### 📁 已归档
已移至 `_archived_v2_document_components/` 目录：
- TaskDocumentEditor.Complex.tsx
- OnlineDocumentEditor.tsx
- TaskDocumentEditor.enhanced.tsx
- DocumentEditor.tsx

## 性能优化

新系统包含以下优化：

### 组件层面
- **懒加载**: 高级功能组件按需加载
- **记忆化**: 使用 React.memo 和 useMemo 优化渲染
- **虚拟化**: 大文档和长列表的虚拟化渲染

### 服务层面
- **请求缓存**: 自动缓存文档数据，避免重复请求
- **请求去重**: 相同请求自动去重
- **批量操作**: 支持批量获取文档
- **预加载**: 智能预加载相关文档

### 数据层面
- **状态优化**: 减少不必要的状态变量
- **配置缓存**: 缓存组件配置映射
- **内存管理**: 及时清理不再使用的数据

## 最佳实践

### 1. 选择合适的组件
```typescript
// 页面内嵌编辑
<TaskDetailDocumentArea projectId={1} taskId={1} />

// 弹窗预览
<ModalDocumentArea projectId={1} taskId={1} />

// 全屏专注编辑
<FullscreenDocumentArea projectId={1} taskId={1} />

// 自定义配置
<UnifiedTaskDocumentArea
  projectId={1}
  taskId={1}
  defaultViewMode="edit"
  enableComments={true}
  enableSearch={true}
/>
```

### 2. 合理使用缓存
```typescript
// 服务层自动缓存，无需手动管理
const documents = await unifiedDocumentService.getTaskDocuments(1, 1);

// 需要清理缓存时
unifiedDocumentService.clearCache('documents:1:1');
```

### 3. 性能监控
```typescript
<UnifiedTaskDocumentArea
  projectId={1}
  taskId={1}
  // 开发环境启用性能监控
  enablePerformanceMonitor={process.env.NODE_ENV === 'development'}
/>
```

### 4. 渐进迁移
- 新页面直接使用新组件
- 现有页面逐步迁移，避免一次性大改
- 利用迁移映射保持向后兼容

## 故障排除

### 常见问题

**Q: 旧组件突然不工作了？**
A: 检查控制台警告，使用 `migration-map.ts` 中的重新导出。

**Q: 新组件缺少某些功能？**
A: 新组件功能更丰富，检查属性配置或查看文档。

**Q: 性能变慢了？**
A: 启用性能监控，检查是否需要开启缓存或虚拟化。

**Q: 样式显示异常？**
A: 确保引入了对应的CSS文件，检查样式类名冲突。

### 调试技巧

```typescript
// 开启调试模式
<UnifiedTaskDocumentArea
  projectId={1}
  taskId={1}
  debug={true} // 开启详细日志
/>

// 监听组件事件
<UnifiedTaskDocumentArea
  onDocumentSelect={(id) => console.log('Selected:', id)}
  onDocumentChange={(doc) => console.log('Changed:', doc)}
  onError={(error) => console.error('Error:', error)}
/>
```

## 版本历史

- **v3.0** (2025-09-30): 重构完成，统一组件架构
- **v2.x** (2025-09): 功能增强期，添加高级功能
- **v1.x** (2025-08): 初始版本，基础功能

## 反馈和支持

如有问题或建议，请：
1. 查看本文档和迁移指南
2. 检查控制台警告信息
3. 参考示例代码
4. 联系开发团队

---

**注意**: 本文档会随着系统更新而更新，请关注最新版本。