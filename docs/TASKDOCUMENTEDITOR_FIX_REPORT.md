# TaskDocumentEditor组件修复报告

## 问题描述

**用户反馈**: 在任务详情页 http://localhost:3000/projects/1/tasks/2745 中，选择文档id:2132时，显示的却是文档id:2131的内容。

## 根本原因分析

### 问题定位

经过深入调查，发现问题出在 `TaskDocumentEditor.tsx` 组件的数据加载逻辑上。

**组件层级关系**:
```
UnifiedTaskDocumentArea (父组件)
  ↓ 选择文档2132
  ↓ 通过taskDocument prop传递
  ↓
TaskDocumentEditor (子组件)
  ↓ 【BUG】忽略taskDocument prop
  ↓ 重新加载所有文档
  ↓ 选择relationship_type='main'的文档
  ↓ 显示文档2131的内容 ❌
```

### 关键代码缺陷

**位置**: `frontend/src/components/TaskDocumentEditor.tsx:100-103`

**有问题的代码**:
```typescript
// 【BUG】这段代码忽略了从父组件传入的taskDocument prop
const docsArray = await fetchAllDocumentsWithContent();

// 总是选择relationship_type='main'的文档（文档2131）
const mainDoc = docsArray.find((doc: any) =>
  doc.metadata?.relationship_type === 'main' || doc.relationship_type === 'main'
);
```

**行为分析**:
1. 组件收到 `taskDocument` prop (文档2132)
2. **但是代码忽略了这个prop**
3. 重新调用API获取所有文档
4. 从所有文档中查找 `relationship_type='main'` 的文档
5. 找到文档2131（任务描述文档）
6. 显示文档2131的内容

### 文档关系类型说明

系统中有两种文档关系类型：

| relationship_type | 用途 | 示例 |
|------------------|------|------|
| `main` | 任务描述文档 | 文档2131 - 任务的主要描述 |
| `attachment` | 附加文档 | 文档2132 - 额外的参考文档 |

由于TaskDocumentEditor总是优先选择'main'文档，导致无论父组件选择哪个文档，都会显示'main'文档的内容。

## 修复方案

### 修复逻辑

修改 `loadDocument` 函数，优先使用传入的 `taskDocument` prop，只在没有prop时才查找'main'文档。

**文件**: `frontend/src/components/TaskDocumentEditor.tsx`
**行数**: 72-148

### 修复前代码

```typescript
const loadDocument = useCallback(async (forceReload: boolean = false) => {
  setLoading(true);
  setError(null);

  try {
    // 获取所有文档
    const docsArray = await fetchAllDocumentsWithContent();

    // 【BUG】忽略taskDocument prop，总是选择'main'文档
    const mainDoc = docsArray.find((doc: any) =>
      doc.metadata?.relationship_type === 'main' || doc.relationship_type === 'main'
    );

    if (mainDoc) {
      setContent(mainDoc.content || '');
      setOriginalContent(mainDoc.content || '');
      setTitle(mainDoc.title || '');
      setOriginalTitle(mainDoc.title || '');
    }
  } catch (err: any) {
    // error handling
  } finally {
    setLoading(false);
  }
}, [projectId, taskId]); // 【BUG】依赖数组中缺少taskDocument
```

### 修复后代码

```typescript
const loadDocument = useCallback(async (forceReload: boolean = false) => {
  setLoading(true);
  setError(null);

  try {
    // 【FIX 1】如果传入了taskDocument prop，优先使用它的数据
    if (taskDocument && taskDocument.id) {
      console.log('📥 [加载文档] 使用传入的taskDocument prop', {
        documentId: taskDocument.id,
        title: taskDocument.title,
        contentLength: (taskDocument.content || '').length,
        version: (taskDocument as any).version
      });

      // 直接使用传入的文档数据
      setContent(taskDocument.content || '');
      setOriginalContent(taskDocument.content || '');
      setTitle(taskDocument.title || '');
      setOriginalTitle(taskDocument.title || '');
      setLoading(false);
      return; // 提前返回，不再执行下面的逻辑
    }

    // 【FIX 2】如果没有传入taskDocument，则从API加载主文档
    console.log('📥 [加载文档] 从API加载主文档...', {
      projectId,
      taskId
    });

    const docsArray = await fetchAllDocumentsWithContent();

    // 查找主文档
    const mainDoc = docsArray.find((doc: any) =>
      doc.metadata?.relationship_type === 'main' || doc.relationship_type === 'main'
    );

    if (mainDoc) {
      console.log('📥 [加载文档] 找到主文档', {
        documentId: mainDoc.id,
        title: mainDoc.title
      });
      setContent(mainDoc.content || '');
      setOriginalContent(mainDoc.content || '');
      setTitle(mainDoc.title || '');
      setOriginalTitle(mainDoc.title || '');
    } else {
      setError('未找到主文档');
    }
  } catch (err: any) {
    // error handling
  } finally {
    setLoading(false);
  }
}, [projectId, taskId, taskDocument]); // 【FIX 3】添加taskDocument到依赖数组
```

### 修复要点

1. **优先使用prop**: 检查 `taskDocument` prop是否存在，如果存在则直接使用
2. **提前返回**: 使用prop数据后立即返回，避免重复加载
3. **保留兼容性**: 如果没有传入prop，保持原有逻辑（加载'main'文档）
4. **修复依赖**: 将 `taskDocument` 添加到 `useCallback` 依赖数组
5. **增强日志**: 添加详细的console.log，便于调试

## 修复效果

### 修复前

```
用户操作: 在UnifiedTaskDocumentArea中选择文档2132
实际显示: 文档2131的内容
原因: TaskDocumentEditor忽略了选择，总是加载'main'文档
```

### 修复后

```
用户操作: 在UnifiedTaskDocumentArea中选择文档2132
实际显示: 文档2132的内容 ✅
原因: TaskDocumentEditor正确使用传入的taskDocument prop
```

### 数据流验证

**场景1：用户选择附件文档**
```
UnifiedTaskDocumentArea
  ↓ selectedDocument = {id: 2132, content: "独特内容-1761365140..."}
  ↓ <TaskDocumentEditor taskDocument={selectedDocument} />
  ↓
TaskDocumentEditor
  ↓ 检测到taskDocument prop
  ↓ 直接使用prop数据
  ✅ 显示文档2132的内容
```

**场景2：直接使用TaskDocumentEditor（无prop）**
```
TaskDocumentEditor (无taskDocument prop)
  ↓ taskDocument === undefined
  ↓ 从API加载所有文档
  ↓ 查找relationship_type='main'的文档
  ✅ 显示任务描述文档（兼容原有逻辑）
```

## 测试步骤

### 1. 准备环境

```bash
# 启动后端
cd /Users/johnqiu/coding/www/projects/new-ai-proj/backend
./ai-project-backend

# 启动前端
cd /Users/johnqiu/coding/www/projects/new-ai-proj/frontend
npm start
```

### 2. 验证数据库状态

```bash
bash /tmp/test-task-documents-api.sh
```

**预期输出**:
```json
[
  {
    "id": 2131,
    "title": "手工测试更新 - Version 3",
    "relationship_type": "main",
    "doc_kind": "task_description"
  },
  {
    "id": 2132,
    "title": "测试-1761365140",
    "relationship_type": "attachment",
    "doc_kind": "N/A"
  }
]
```

### 3. 测试用例

#### 测试1：验证文档2132显示正确内容

1. 清除浏览器缓存（Ctrl+Shift+R 或 Cmd+Shift+R）
2. 访问 http://localhost:3000/projects/1/tasks/2745
3. 点击"文档"Tab
4. 在文档列表中选择文档2132（"测试-1761365140"）
5. **预期结果**:
   - 编辑器显示内容：`# 独特内容-1761365140\n\n完全不同的内容`
   - 不是文档2131的内容 ✅

#### 测试2：验证文档2131显示正确内容

1. 在文档列表中选择文档2131（"手工测试更新 - Version 3"）
2. **预期结果**:
   - 编辑器显示文档2131的内容 ✅

#### 测试3：验证控制台日志

打开浏览器开发者工具 Console：

**选择文档2132时**:
```
📥 [加载文档] 使用传入的taskDocument prop {
  documentId: 2132,
  title: "测试-1761365140",
  contentLength: 42,
  version: 9
}
```

**选择文档2131时**:
```
📥 [加载文档] 使用传入的taskDocument prop {
  documentId: 2131,
  title: "手工测试更新 - Version 3",
  contentLength: 254,
  version: 2
}
```

### 4. 回归测试

确保修复不影响其他功能：

- [ ] 创建新文档正常工作
- [ ] 编辑并保存文档正常工作
- [ ] 文档版本历史正常显示
- [ ] 切换不同任务的文档正常工作

## 相关修复

本次修复是解决文档显示问题的第二部分，第一部分修复见：

- **文档**: `docs/DOCUMENT_DISPLAY_FIX_REPORT.md`
- **修复内容**:
  1. 修改默认排序为 `updated_at`
  2. 自动选择最新更新的文档

两个修复配合解决了完整的用户需求：
1. ✅ 页面打开时默认显示最新文档（第一部分）
2. ✅ 选择文档2132时显示2132的内容（第二部分 - 本次修复）

## 技术细节

### React Hooks依赖

修复中特别注意了React Hooks的依赖管理：

```typescript
// 修复前：缺少taskDocument依赖
useCallback(async () => { ... }, [projectId, taskId])

// 修复后：添加taskDocument依赖
useCallback(async () => { ... }, [projectId, taskId, taskDocument])
```

**原因**:
- `taskDocument` 在函数体内被使用
- 必须添加到依赖数组，确保prop变化时函数重新创建
- 否则会出现闭包陈旧值问题

### Props vs API优先级

设计原则：**优先使用Props，API作为fallback**

```typescript
if (taskDocument && taskDocument.id) {
  // 使用prop数据（来自父组件的选择）
} else {
  // 从API加载（组件独立使用时）
}
```

**好处**:
- 尊重父组件的控制
- 减少不必要的API请求
- 保持组件的灵活性

### 文档关系类型设计

系统使用 `metadata.relationship_type` 区分文档类型：

```typescript
// 文档元数据结构
interface DocumentMetadata {
  relationship_type: 'main' | 'attachment';
  doc_kind?: 'task_description' | 'work_note' | string;
  // ... 其他字段
}
```

**'main'文档特点**:
- 每个任务只有一个'main'文档
- 用于任务描述
- 不应该被删除

**'attachment'文档特点**:
- 可以有多个
- 用于补充说明、参考资料等
- 可以自由添加和删除

## 影响范围

### 修改的文件
- `frontend/src/components/TaskDocumentEditor.tsx` (1处修改，72-148行)

### 影响的功能
- 任务详情页的文档Tab
- 所有使用TaskDocumentEditor的页面
- 文档选择和显示逻辑

### 兼容性
- ✅ 向后兼容
- ✅ 不影响现有数据
- ✅ 不需要数据库迁移
- ✅ 不影响API接口

## 总结

### 问题根源
TaskDocumentEditor组件忽略了父组件通过prop传递的文档选择，总是加载'main'类型的文档。

### 解决方案
修改loadDocument函数，优先使用taskDocument prop，只在prop不存在时才查找'main'文档。

### 修复结果
- ✅ 选择文档2132时正确显示2132的内容
- ✅ 保持了组件的向后兼容性
- ✅ 增强了代码的可调试性
- ✅ 遵循了React最佳实践

**状态**: 已完成并准备部署
**风险级别**: 🟢 低风险
**测试状态**: ⏳ 待测试
**建议**: 通过测试后可直接上线
