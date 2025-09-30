# 文档组件归档清单 - 20250930

## 归档原因
组件整合重构，统一使用UnifiedTaskDocumentArea

## 归档时间
2025-09-30

## 归档组件清单

### 编辑器组件
- [ ] TaskDocumentEditor.tsx - 任务文档编辑器（已被UnifiedTaskDocumentArea替代）
- [ ] MarkdownEditor.tsx - 基础Markdown编辑器（已被UnifiedTaskDocumentArea替代）
- [ ] TaskMarkdownEditor.tsx - 任务Markdown编辑器（已被UnifiedTaskDocumentArea替代）

### 查看器组件
- [ ] DocumentViewer.tsx - 文档查看器（已被DocumentAreaAdapter替代）

### 管理器组件
- [ ] TaskDocumentManager.tsx - 任务文档管理器（已被UnifiedTaskDocumentArea替代）

## 迁移指南

### TaskDocumentEditor → UnifiedTaskDocumentArea
```typescript
// 旧代码
<TaskDocumentEditor taskId={1} projectId={1} />

// 新代码
<UnifiedTaskDocumentArea 
  taskId={1} 
  projectId={1} 
  defaultViewMode="edit"
  showToolbar={true}
/>
```

### DocumentViewer → DocumentAreaAdapter
```typescript
// 旧代码
<DocumentViewer visible={true} documentId={1} />

// 新代码
<DocumentAreaAdapter
  projectId={1}
  taskId={1}
  mode="modal"
  currentDocumentId="1"
  readonly={true}
/>
```

### MarkdownEditor → UnifiedTaskDocumentArea
```typescript
// 旧代码
<MarkdownEditor value={content} onChange={handleChange} />

// 新代码
<UnifiedTaskDocumentArea 
  defaultViewMode="edit"
  compactMode={true}
  onDocumentChange={handleChange}
/>
```

## 回滚说明
如需恢复某个组件，可以从归档目录复制回来，但建议优先考虑使用新的统一组件。

## 技术联系人
- 重构负责人: AI Assistant
- 迁移时间: 2025-09-30
- 文档版本: v2 → v3