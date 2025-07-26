# UnifiedDocumentManager 组件使用指南

## 概述

`UnifiedDocumentManager` 是一个统一的文档管理组件，合并了 `DocumentFileManager` 和 `DocumentList` 的所有功能，提供简洁和高级两种模式。

## 特性

### 🎯 双模式设计
- **简洁模式**: 类似原 `DocumentList`，提供基础的表格视图和搜索排序功能
- **高级模式**: 类似原 `DocumentFileManager`，提供完整的文档管理功能

### 🔧 核心功能
- ✅ 表格和网格两种视图模式
- ✅ 高级搜索和过滤
- ✅ 批量操作（删除、复制、导出）
- ✅ 文件上传和管理
- ✅ 拖拽排序（网格模式）
- ✅ 文档预览和编辑
- ✅ 模板管理
- ✅ 权限控制

## 安装和导入

```typescript
import UnifiedDocumentManager from '../components/UnifiedDocumentManager';
```

## 基础用法

### 简洁模式（推荐用于项目页面）

```typescript
<UnifiedDocumentManager
  mode="simple"
  projectId={projectId}
  projectName="我的项目"
  onDocumentSelect={(doc) => console.log('Selected:', doc)}
/>
```

### 高级模式（推荐用于文档管理页面）

```typescript
<UnifiedDocumentManager
  mode="advanced"
  folderId={folderId}
  defaultView="grid"
  allowUpload={true}
  allowBatch={true}
  onDocumentUpdate={() => refetchData()}
/>
```

## API 参考

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `mode` | `'simple' \| 'advanced'` | `'simple'` | 组件模式 |
| `projectId` | `number` | - | 项目ID（限制文档范围） |
| `projectName` | `string` | - | 项目名称（显示用） |
| `folderId` | `number` | - | 文件夹ID（高级模式） |
| `showSearch` | `boolean` | `true` | 显示搜索框 |
| `showToolbar` | `boolean` | `true` | 显示工具栏 |
| `allowUpload` | `boolean` | `true` | 允许上传文件 |
| `allowBatch` | `boolean` | `false` | 允许批量操作 |
| `defaultView` | `'table' \| 'grid'` | `'table'` | 默认视图模式 |
| `showViewToggle` | `boolean` | `true` | 显示视图切换按钮 |

### 回调函数

| 回调 | 类型 | 说明 |
|------|------|------|
| `onDocumentSelect` | `(doc) => void` | 文档选择回调 |
| `onDocumentUpdate` | `() => void` | 文档更新回调 |
| `onCreateDocument` | `() => void` | 创建文档回调 |
| `onEditDocument` | `(doc) => void` | 编辑文档回调 |

## 使用场景

### 1. 项目文档列表页面

```typescript
// 简洁模式，只显示该项目的文档
<UnifiedDocumentManager
  mode="simple"
  projectId={projectId}
  projectName={project.name}
  showViewToggle={false}
  onDocumentSelect={(doc) => navigate(`/documents/${doc.id}`)}
  onCreateDocument={() => navigate(`/projects/${projectId}/documents/new`)}
/>
```

### 2. 全局文档管理页面

```typescript
// 高级模式，显示所有文档，支持文件夹管理
<UnifiedDocumentManager
  mode="advanced"
  folderId={currentFolderId}
  allowUpload={true}
  allowBatch={true}
  defaultView="grid"
  onDocumentUpdate={() => {
    // 刷新相关数据
    refetchFolders();
    refetchStats();
  }}
/>
```

### 3. 文档选择器

```typescript
// 简洁模式，用于选择文档
<UnifiedDocumentManager
  mode="simple"
  showToolbar={false}
  onDocumentSelect={(doc) => {
    setSelectedDocument(doc);
    setModalVisible(false);
  }}
/>
```

## 迁移指南

### 从 DocumentList 迁移

```typescript
// 旧代码
<DocumentList
  projectId={projectId}
  onCreateDocument={handleCreate}
  onEditDocument={handleEdit}
/>

// 新代码
<UnifiedDocumentManager
  mode="simple"
  projectId={projectId}
  onCreateDocument={handleCreate}
  onEditDocument={handleEdit}
/>
```

### 从 DocumentFileManager 迁移

```typescript
// 旧代码
<DocumentFileManager
  folderId={folderId}
  showSearch={true}
  onDocumentSelect={handleSelect}
  onDocumentUpdate={handleUpdate}
/>

// 新代码
<UnifiedDocumentManager
  mode="advanced"
  folderId={folderId}
  showSearch={true}
  allowUpload={true}
  allowBatch={true}
  onDocumentSelect={handleSelect}
  onDocumentUpdate={handleUpdate}
/>
```

## 自定义样式

组件支持通过 CSS 类名进行样式自定义：

```css
/* 简洁模式样式 */
.unified-document-manager--simple {
  .ant-table {
    font-size: 14px;
  }
}

/* 高级模式样式 */
.unified-document-manager--advanced {
  .document-grid {
    gap: 20px;
  }
  
  .document-card {
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
}
```

## 性能优化

### 1. 懒加载
组件支持分页和虚拟滚动，自动处理大量文档的性能问题。

### 2. 搜索防抖
搜索输入自动进行防抖处理，避免频繁API调用。

### 3. 缓存策略
组件内部实现了基础的状态缓存，减少不必要的重新渲染。

## 最佳实践

### 1. 根据场景选择模式
- 项目内文档管理 → 简洁模式
- 全局文档管理 → 高级模式
- 文档选择器 → 简洁模式 + 隐藏工具栏

### 2. 合理配置功能
```typescript
// 只读场景
<UnifiedDocumentManager
  mode="simple"
  showToolbar={false}
  allowUpload={false}
  allowBatch={false}
/>

// 管理员场景
<UnifiedDocumentManager
  mode="advanced"
  allowUpload={true}
  allowBatch={true}
  showViewToggle={true}
/>
```

### 3. 错误处理
```typescript
<UnifiedDocumentManager
  mode="advanced"
  onDocumentUpdate={() => {
    try {
      refetchData();
    } catch (error) {
      message.error('刷新失败，请重试');
    }
  }}
/>
```

## 常见问题

### Q: 如何实现模式动态切换？
A: 组件支持运行时模式切换，用户可以通过顶部的开关进行切换。

### Q: 批量操作支持哪些功能？
A: 目前支持批量删除、复制、设为模板、导出等操作。

### Q: 如何自定义文档类型？
A: 可以通过修改 `DOCUMENT_TYPES` 配置对象来自定义文档类型。

### Q: 组件是否支持国际化？
A: 目前主要支持中文，国际化功能可以通过 react-i18next 等库扩展。

## 更新日志

### v1.0.0
- 初始版本
- 合并 DocumentFileManager 和 DocumentList 功能
- 支持简洁和高级两种模式
- 实现模块化架构设计