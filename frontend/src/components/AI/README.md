# AI Description Generation Components

统一的AI任务描述生成组件，提供智能、快速、自定义三种生成模式。

## 组件列表

### 1. UnifiedAIDescriptionModal（推荐使用）

统一的AI描述生成对话框，整合了快速生成、自定义生成、多方案建议三种模式。

#### 特性

- 🎯 **统一入口**：三种生成模式集成在一个对话框中
- ⚡ **智能推荐**：默认智能模式，自动生成3种风格供对比
- 🔄 **并行生成**：支持多方案并行生成，实时显示进度
- 📊 **方案对比**：标签页展示多个方案，轻松对比选择
- ⌨️ **快捷键支持**：左右箭头切换方案，Ctrl+Enter应用
- 🎨 **视觉优化**：进度动画、加载状态、Markdown渲染

#### 使用示例

```tsx
import { useState } from 'react';
import { Button } from 'antd';
import { UnifiedAIDescriptionModal, AIDescriptionButton } from '@/components/AI';

function TaskEditor() {
  const [modalVisible, setModalVisible] = useState(false);
  const [description, setDescription] = useState('');

  const handleApply = (newDescription: string, mode: 'replace' | 'append') => {
    if (mode === 'replace') {
      setDescription(newDescription);
    } else {
      setDescription(prev => `${prev}\n\n${newDescription}`);
    }
  };

  return (
    <>
      {/* 方式1: 使用配套的 AIDescriptionButton */}
      <AIDescriptionButton onClick={() => setModalVisible(true)} />

      {/* 方式2: 使用自定义按钮 */}
      <Button onClick={() => setModalVisible(true)}>
        AI生成描述
      </Button>

      <UnifiedAIDescriptionModal
        visible={modalVisible}
        taskId={taskId}
        taskTitle={taskTitle}
        currentDescription={description}
        onCancel={() => setModalVisible(false)}
        onApply={handleApply}
      />
    </>
  );
}
```

#### Props

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| visible | boolean | ✅ | 对话框是否可见 |
| taskId | number | ✅ | 任务ID |
| taskTitle | string | ✅ | 任务标题 |
| currentDescription | string | ❌ | 当前任务描述（用于追加模式） |
| onCancel | () => void | ✅ | 取消回调 |
| onApply | (description: string, mode: 'replace' \| 'append') => void | ✅ | 应用回调 |

#### 生成模式

1. **智能生成（推荐）**
   - 自动生成简洁、详细、技术三种风格
   - 适合快速获取多种方案对比选择

2. **快速生成**
   - 使用默认详细风格快速生成
   - 适合需要立即获得结果的场景

3. **自定义生成**
   - 完全自定义模型、风格、长度等参数
   - 支持自定义提示词
   - 适合有特殊需求的场景

### 2. AIDescriptionButton

AI描述生成按钮组件，支持新旧两种用法。

#### 新版用法（推荐）

与 `UnifiedAIDescriptionModal` 配合使用：

```tsx
<AIDescriptionButton onClick={() => setModalVisible(true)} />
```

#### 旧版用法（向后兼容）

与旧的 `AIDescriptionModal` 配合使用：

```tsx
<AIDescriptionButton onGenerate={(mode) => openModal(mode)} />
```

## 迁移指南

### 从旧组件迁移到新组件

#### 旧代码

```tsx
import AIDescriptionModal from '@/components/AI/AIDescriptionModal';

// 需要管理3个独立的模态框
const [quickModalVisible, setQuickModalVisible] = useState(false);
const [customModalVisible, setCustomModalVisible] = useState(false);
const [suggestionsModalVisible, setSuggestionsModalVisible] = useState(false);

// 3个不同的模态框
<AIDescriptionModal
  visible={quickModalVisible}
  mode="quick"
  taskId={taskId}
  taskTitle={taskTitle}
  currentDescription={description}
  onCancel={() => setQuickModalVisible(false)}
  onApply={handleApplyDescription}
/>

<AIDescriptionModal
  visible={customModalVisible}
  mode="custom"
  taskId={taskId}
  taskTitle={taskTitle}
  currentDescription={description}
  onCancel={() => setCustomModalVisible(false)}
  onApply={handleApplyDescription}
/>

<AIDescriptionModal
  visible={suggestionsModalVisible}
  mode="suggestions"
  taskId={taskId}
  taskTitle={taskTitle}
  currentDescription={description}
  onCancel={() => setSuggestionsModalVisible(false)}
  onApply={handleApplyDescription}
/>
```

#### 新代码

```tsx
import { UnifiedAIDescriptionModal } from '@/components/AI';

// 只需1个状态
const [aiModalVisible, setAiModalVisible] = useState(false);

// 只需1个模态框
<UnifiedAIDescriptionModal
  visible={aiModalVisible}
  taskId={taskId}
  taskTitle={taskTitle}
  currentDescription={description}
  onCancel={() => setAiModalVisible(false)}
  onApply={handleApplyDescription}
/>
```

## 技术架构

### 核心技术栈

- **React Hooks**: useState, useEffect, useRef
- **TypeScript**: 完整类型定义
- **Ant Design**: Modal, Tabs, Progress, Form等组件
- **Markdown**: 支持Markdown格式的描述渲染
- **AI服务**: 集成aiDescriptionService服务

### 状态管理

```typescript
// 生成模式
const [mode, setMode] = useState<GenerationMode>('smart');

// 生成配置
const [config, setConfig] = useState<GenerationConfig>({...});

// 生成进度
const [progress, setProgress] = useState<GenerationProgress>({...});

// 生成结果
const [results, setResults] = useState<GenerationResult[]>([]);

// 选中的结果
const [selectedResultIndex, setSelectedResultIndex] = useState(0);

// 应用模式
const [applyMode, setApplyMode] = useState<'replace' | 'append'>('replace');
```

### 并行生成逻辑

```typescript
// 按顺序生成每个风格，实时更新进度和结果
for (let i = 0; i < styles.length; i++) {
  const style = styles[i];

  // 更新当前生成风格
  setProgress(prev => ({ ...prev, currentStyle: style }));

  // 调用AI服务生成
  const result = await aiDescriptionService.generateDescription(taskId, model, options);

  // 实时更新结果
  setResults([...tempResults, result]);

  // 更新进度
  setProgress(prev => ({ ...prev, current: i + 1, completedStyles: [...prev.completedStyles, style] }));
}
```

## 性能优化

1. **防止重复请求**: 使用 `isGeneratingRef` 标志
2. **AbortController**: 支持取消正在进行的请求
3. **实时结果显示**: 每完成一个方案立即显示，无需等待全部完成
4. **状态清理**: 对话框关闭时清理所有状态
5. **键盘快捷键**: 左右箭头切换、Ctrl+Enter应用

## 最佳实践

1. **使用智能模式**: 大多数情况下推荐使用智能模式，可以快速对比多种风格
2. **合理使用追加模式**: 当已有描述需要补充时使用追加模式
3. **自定义提示词**: 有特殊需求时可以添加自定义提示词引导AI
4. **及时应用结果**: 生成完成后及时应用，避免重复生成浪费资源

## 常见问题

### Q: 如何自定义生成参数？

A: 选择"自定义生成"模式，展开高级选项，可以配置AI模型、风格、长度、上下文等参数。

### Q: 生成失败怎么办？

A: 单个方案失败不影响其他方案，可以使用"重新生成"按钮针对失败的方案重试。

### Q: 如何快速切换方案？

A: 使用键盘左右箭头键可以快速切换标签页，查看不同方案。

### Q: 旧组件还能用吗？

A: 旧组件保留用于向后兼容，但已标记为废弃（@deprecated），建议迁移到新组件。

## 更新日志

### v2.0.0 (2025-10-07)

- ✨ 全新 `UnifiedAIDescriptionModal` 组件
- 🎯 整合三种生成模式为统一入口
- 🔄 支持并行生成多个方案
- 📊 新增标签页展示和对比功能
- ⌨️ 新增键盘快捷键支持
- 🎨 优化UI/UX体验
- 📝 完善文档和示例

### v1.0.0

- 初始版本
- 分离的快速/自定义/建议模式
