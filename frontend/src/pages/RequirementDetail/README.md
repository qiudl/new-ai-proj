# RequirementDetail 组件库

需求详情页面的组件化架构,与任务详情页保持一致的设计风格和布局规范。

## 📁 组件结构

```
RequirementDetail/
├── index.ts                          # 统一导出
├── RequirementDetailLayout.tsx       # 布局组件
├── RequirementDetailHeader.tsx       # 顶部标题栏组件
├── RequirementDetailContent.tsx      # 左侧主内容区组件
├── RequirementDetailSidebar.tsx      # 右侧边栏组件
└── README.md                         # 文档
```

## 🎨 设计规范

### 布局规范 (与任务详情一致)
- **两栏布局**: 左侧 16 列 + 右侧 8 列 (lg 断点)
- **栏间距**: gutter [24, 24]
- **卡片间距**: marginBottom 24px
- **响应式**: xs/sm/md 全宽, lg/xl 两栏

### 视觉规范
- **卡片风格**: Ant Design Card 默认样式
- **标题样式**: 统一使用 Space + Icon + Text
- **标签样式**: 14px 字号, 4px-12px padding
- **文本层级**: Title (h2) -> Text (secondary/default)

## 📦 组件说明

### 1. RequirementDetailLayout

**职责**: 提供统一的两栏响应式布局

**Props**:
```typescript
interface RequirementDetailLayoutProps {
  content: React.ReactNode;    // 左侧主内容区
  sidebar: React.ReactNode;    // 右侧信息栏
  className?: string;          // 自定义类名
  style?: React.CSSProperties; // 自定义样式
}
```

**使用示例**:
```tsx
<RequirementDetailLayout
  content={<RequirementDetailContent {...contentProps} />}
  sidebar={<RequirementDetailSidebar {...sidebarProps} />}
/>
```

---

### 2. RequirementDetailHeader

**职责**: 显示需求标题、状态、优先级和操作按钮

**Props**:
```typescript
interface RequirementDetailHeaderProps {
  requirement: Requirement;    // 需求数据
  onEdit?: () => void;         // 编辑回调
  onDelete?: () => void;       // 删除回调
  onSubmit?: () => void;       // 提交评审回调
  onReview?: () => void;       // 评审回调
  onConvert?: () => void;      // 转换为任务回调
  onLink?: () => void;         // 关联任务回调
  onArchive?: () => void;      // 归档回调
  className?: string;          // 自定义类名
}
```

**功能**:
- ✅ 响应式操作按钮 (桌面端按钮组 / 移动端下拉菜单)
- ✅ 状态和优先级标签
- ✅ 元信息显示 (创建时间、创建人)
- ✅ 根据需求状态显示对应操作

---

### 3. RequirementDetailContent

**职责**: 展示需求描述、业务信息和Tab面板

**Props**:
```typescript
interface RequirementDetailContentProps {
  requirement: Requirement;           // 需求数据
  linkedTasks: RequirementTaskLink[]; // 关联任务列表
  loadingTasks: boolean;              // 关联任务加载状态
  activeTab: string;                  // 当前激活的Tab
  onTabChange: (key: string) => void; // Tab切换回调
  requirementId: number;              // 需求ID
}
```

**内容区域**:
1. **需求描述卡片**
   - 使用 SmartContentRenderer 渲染 Markdown
   - 最小高度 300px
   - 优雅的空状态展示

2. **业务信息卡片** (条件渲染)
   - 商业价值 (business_value)
   - 预期结果 (expected_outcome)
   - 验收标准 (acceptance_criteria)

3. **Tab 面板**
   - 评论 (comments)
   - 关联任务 (tasks)
   - 操作历史 (history)

---

### 4. RequirementDetailSidebar

**职责**: 展示需求元信息、统计数据和快速操作

**Props**:
```typescript
interface RequirementDetailSidebarProps {
  requirement: Requirement;     // 需求数据
  linkedTasksCount: number;     // 关联任务数量
  onConvert?: () => void;       // 转换为任务
  onCopyLink?: () => void;      // 复制链接
  onExportPDF?: () => void;     // 导出PDF
  onPrint?: () => void;         // 打印
  onEditTags?: () => void;      // 编辑标签
  onPreviewAttachment?: (url: string, fileName: string) => void; // 预览附件
}
```

**信息卡片**:
1. **📊 需求信息**: 编号、项目、类型、状态、优先级、标签
2. **👤 人员**: 创建人、审批人
3. **📅 时间**: 创建、提交、审批、截止、更新时间
4. **📋 评审信息**: 状态、评分、复杂度、预估工时、评审意见
5. **📈 统计**: 评论数、浏览次数、关联任务数
6. **⚡ 快速操作**: 转为任务、复制链接、导出PDF、打印
7. **📎 附件**: 附件列表和预览/下载

---

## 🔄 与任务详情页的对应关系

| 需求详情组件 | 任务详情组件 | 说明 |
|------------|------------|------|
| `RequirementDetailLayout` | `TaskDetailLayout` | 完全一致的布局结构 |
| `RequirementDetailHeader` | `TaskDetailHeaderCard` | 相似的Header设计 |
| `RequirementDetailContent` | `TaskDetailContent` | 左侧主内容区 |
| `RequirementDetailSidebar` | `TaskDetailSidebar` | 右侧信息栏 |

## 📊 统计数据

- **组件数量**: 4 个核心组件
- **代码行数**: ~500 行 (含注释和类型定义)
- **TypeScript**: 100% 类型安全
- **响应式**: 完整支持移动端和桌面端
- **可复用性**: 高度模块化,易于维护

## 🎯 设计原则

1. **组件化**: 职责单一,高内聚低耦合
2. **类型安全**: 完整的 TypeScript 类型定义
3. **响应式**: 移动优先,适配各种屏幕尺寸
4. **一致性**: 与任务详情页保持视觉和交互一致
5. **可维护**: 清晰的代码结构和完善的文档
6. **可测试**: Props 接口清晰,便于单元测试

## 🚀 使用示例

```tsx
import React, { useState } from 'react';
import {
  RequirementDetailLayout,
  RequirementDetailHeader,
  RequirementDetailContent,
  RequirementDetailSidebar,
} from './RequirementDetail';

const RequirementDetailPage: React.FC = () => {
  const [requirement, setRequirement] = useState<Requirement | null>(null);
  const [activeTab, setActiveTab] = useState('comments');
  const [linkedTasks, setLinkedTasks] = useState<RequirementTaskLink[]>([]);

  return (
    <div style={{ padding: '24px' }}>
      {/* 返回按钮 */}
      <Button onClick={handleBack}>返回需求列表</Button>

      {/* 顶部标题栏 */}
      <RequirementDetailHeader
        requirement={requirement}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onSubmit={handleSubmit}
        onReview={handleReview}
        onConvert={handleConvert}
        onLink={handleLink}
        onArchive={handleArchive}
      />

      {/* 主内容区域 */}
      <RequirementDetailLayout
        content={
          <RequirementDetailContent
            requirement={requirement}
            linkedTasks={linkedTasks}
            loadingTasks={false}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            requirementId={requirement.id}
          />
        }
        sidebar={
          <RequirementDetailSidebar
            requirement={requirement}
            linkedTasksCount={linkedTasks.length}
            onConvert={handleOpenConvert}
            onCopyLink={handleCopyLink}
            onExportPDF={handleExportPDF}
            onPrint={handlePrint}
            onEditTags={handleOpenTagsModal}
            onPreviewAttachment={handlePreviewAttachment}
          />
        }
      />
    </div>
  );
};
```

## 📝 更新日志

### v1.0.0 (2025-01-08)
- ✅ 创建 RequirementDetailLayout 布局组件
- ✅ 创建 RequirementDetailHeader 标题栏组件
- ✅ 创建 RequirementDetailContent 主内容区组件
- ✅ 创建 RequirementDetailSidebar 侧边栏组件
- ✅ 统一布局规范与任务详情页一致
- ✅ 完整的 TypeScript 类型支持
- ✅ 响应式设计支持

## 🔧 技术栈

- React 18.2.0
- TypeScript 5.3.3
- Ant Design 5.6.1
- dayjs (日期格式化)
- SmartContentRenderer (Markdown 渲染)

## 📚 相关文档

- [任务详情页组件架构](../TaskDetail/README.md)
- [需求管理系统设计](../../../docs/REQUIREMENT_SYSTEM.md)
- [组件开发规范](../../../docs/COMPONENT_GUIDELINES.md)
