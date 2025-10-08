# 工作笔记文件夹管理系统

## 📖 概述

工作笔记文件夹管理系统是一个功能完善的文件夹组织工具，支持树形结构、拖拽移动、右键菜单、面包屑导航等功能，帮助用户高效管理工作笔记。

## ✨ 核心功能

### 1. 文件夹树形导航 (WorkNoteFolderTree)

- **树形展示**：清晰的层级结构，支持无限层级
- **懒加载**：默认加载2层，按需加载子文件夹，优化性能
- **搜索功能**：实时搜索文件夹，支持防抖优化
- **笔记计数**：显示每个文件夹的笔记数量徽章
- **自定义图标**：支持文件夹图标和颜色自定义

### 2. 拖拽移动 (Drag & Drop)

- **直观操作**：鼠标拖拽即可移动文件夹
- **循环检测**：自动防止创建循环引用
- **视觉反馈**：拖拽时半透明显示，清晰提示
- **多种放置**：支持放置到节点内部或节点之间

### 3. 右键菜单 (FolderContextMenu)

- **快捷操作**：右键点击文件夹显示上下文菜单
- **功能齐全**：新建、重命名、移动、删除、查看详情
- **快捷键提示**：显示对应的键盘快捷键
- **智能定位**：菜单跟随鼠标位置显示

### 4. 面包屑导航 (FolderBreadcrumb)

- **路径显示**：显示完整的文件夹路径
- **快速跳转**：点击面包屑快速跳转到任意层级
- **路径省略**：路径过长时自动省略中间部分
- **高亮当前**：当前文件夹加粗显示

### 5. 文件夹详情 (FolderDetailDrawer)

- **完整信息**：显示文件夹的所有元数据
- **统计数据**：笔记数量、子文件夹数量等
- **时间信息**：创建时间、更新时间、相对时间
- **快捷操作**：编辑、删除按钮

### 6. 文件夹对话框 (FolderDialogs)

- **创建文件夹**：输入名称、描述、可见性等
- **编辑文件夹**：修改文件夹信息
- **移动文件夹**：选择目标父文件夹
- **删除确认**：删除前确认，防止误操作

## ⌨️ 键盘快捷键

| 快捷键 | 功能 | 说明 |
|--------|------|------|
| `F2` | 重命名 | 重命名当前选中的文件夹 |
| `Delete` | 删除 | 删除当前选中的文件夹 |
| `Ctrl+N` | 新建子文件夹 | 在当前文件夹下创建子文件夹 |
| `Ctrl+M` | 移动 | 移动当前选中的文件夹 |

## 🎨 组件架构

```
FolderManagement/
├── WorkNoteFolderTree.tsx       # 文件夹树形导航（主组件）
├── FolderBreadcrumb.tsx         # 面包屑导航
├── FolderContextMenu.tsx        # 右键菜单
├── FolderDetailDrawer.tsx       # 详情抽屉
├── FolderDialogs/               # 对话框集合
│   ├── FolderDialog.tsx         # 创建/编辑对话框
│   ├── DeleteFolderDialog.tsx   # 删除确认对话框
│   ├── MoveFolderDialog.tsx     # 移动对话框
│   ├── index.ts                 # 导出入口
│   └── README.md                # 对话框文档
└── README.md                    # 本文档
```

## 🚀 使用示例

### 基础用法

```tsx
import WorkNoteFolderTree from './components/WorkNoteFolderTree';

function MyComponent() {
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);

  return (
    <WorkNoteFolderTree
      selectedFolderId={selectedFolderId}
      onFolderSelect={(folderId, folder) => {
        setSelectedFolderId(folderId);
        console.log('选中文件夹:', folder);
      }}
      onFolderCreate={(parentId) => {
        console.log('创建子文件夹，父ID:', parentId);
      }}
      onFolderEdit={(folderId) => {
        console.log('编辑文件夹:', folderId);
      }}
      onFolderDelete={(folderId) => {
        console.log('删除文件夹:', folderId);
      }}
    />
  );
}
```

### 完整集成

```tsx
import React, { useState } from 'react';
import WorkNoteFolderTree from './components/WorkNoteFolderTree';
import FolderBreadcrumb from './components/FolderBreadcrumb';
import FolderDetailDrawer from './components/FolderDetailDrawer';
import { FolderDialog, DeleteFolderDialog, MoveFolderDialog } from './components/FolderDialogs';

function FolderManagement() {
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<WorkNoteFolder | null>(null);
  const [folders, setFolders] = useState<WorkNoteFolder[]>([]);

  // 对话框状态
  const [folderDialogVisible, setFolderDialogVisible] = useState(false);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);

  return (
    <div>
      {/* 面包屑导航 */}
      {selectedFolder && (
        <FolderBreadcrumb
          folder={selectedFolder}
          folders={folders}
          onNavigate={(folderId) => setSelectedFolderId(folderId)}
        />
      )}

      {/* 文件夹树 */}
      <WorkNoteFolderTree
        selectedFolderId={selectedFolderId}
        onFolderSelect={(folderId, folder) => {
          setSelectedFolderId(folderId);
          setSelectedFolder(folder);
        }}
        onFolderCreate={() => setFolderDialogVisible(true)}
        onFolderDetail={() => setDetailDrawerVisible(true)}
      />

      {/* 对话框 */}
      <FolderDialog
        visible={folderDialogVisible}
        onCancel={() => setFolderDialogVisible(false)}
      />

      {/* 详情抽屉 */}
      <FolderDetailDrawer
        visible={detailDrawerVisible}
        folder={selectedFolder}
        onClose={() => setDetailDrawerVisible(false)}
      />
    </div>
  );
}
```

## 🎯 性能优化

### 1. 防抖搜索
- 使用 `useDebounce` hook，300ms延迟
- 避免频繁API调用，提升用户体验

### 2. 懒加载
- 默认只加载2层文件夹树
- 展开时按需加载子文件夹
- 减少初始加载时间

### 3. React.memo
- 所有组件使用 `React.memo` 包装
- 自定义比较函数，精确控制重渲染
- 显著减少不必要的渲染

### 4. useMemo & useCallback
- 使用 `useMemo` 缓存计算结果
- 使用 `useCallback` 缓存回调函数
- 避免子组件不必要的重新创建

### 5. 虚拟滚动
- Ant Design Tree 内置虚拟滚动
- 大量节点时性能优异
- 内存占用低

## 📊 数据结构

### WorkNoteFolder 接口

```typescript
interface WorkNoteFolder {
  id: number;                    // 文件夹ID
  name: string;                  // 文件夹名称
  description?: string;          // 文件夹描述
  parent_id: number | null;      // 父文件夹ID
  path: string;                  // 文件夹路径
  icon?: string;                 // 图标emoji
  color?: string;                // 颜色（CSS颜色值）
  visibility: 'private' | 'team' | 'public';  // 可见性
  notes_count: number;           // 笔记数量
  subfolders_count: number;      // 子文件夹数量
  sort_order: number;            // 排序权重
  created_at: string;            // 创建时间
  updated_at: string;            // 更新时间
  children?: WorkNoteFolder[];   // 子文件夹（懒加载）
}
```

## 🔧 API 服务

### workNotesService

```typescript
// 获取文件夹树
getFolderTree(parentId?: number | null, depth?: number): Promise<WorkNoteFolder[]>

// 搜索文件夹
searchFolders(query: string): Promise<WorkNoteFolder[]>

// 创建文件夹
createFolder(data: CreateFolderRequest): Promise<WorkNoteFolder>

// 更新文件夹
updateFolder(id: number, data: UpdateFolderRequest): Promise<WorkNoteFolder>

// 删除文件夹
deleteFolder(id: number, force?: boolean): Promise<void>

// 移动文件夹
moveFolder(id: number, targetParentId: number | null): Promise<void>
```

## 🎨 样式定制

### 文件夹颜色

支持的颜色选项：
- 蓝色 `#1890ff`
- 绿色 `#52c41a`
- 橙色 `#fa8c16`
- 红色 `#f5222d`
- 紫色 `#722ed1`
- 青色 `#13c2c2`

### 文件夹图标

支持任意 emoji 图标：
- 📁 默认文件夹
- 📂 打开文件夹
- 📚 图书
- 💼 工作
- 🎯 目标
- ⭐ 重要
- 🔥 热门
- 📝 笔记

## ❗ 注意事项

### 删除文件夹

- 删除文件夹前会显示确认对话框
- 如果文件夹包含子文件夹，需要使用"强制删除"
- 删除后无法恢复，请谨慎操作

### 移动文件夹

- 不能将文件夹移动到自身
- 不能将文件夹移动到自己的子孙节点（防止循环引用）
- 拖拽时系统会自动检测并阻止非法操作

### 可见性设置

- `private`: 仅创建者可见
- `team`: 团队成员可见
- `public`: 所有用户可见

## 🐛 故障排除

### 文件夹树不显示

1. 检查网络请求是否成功
2. 检查控制台是否有错误信息
3. 确认 API 返回数据格式正确

### 搜索无结果

1. 检查搜索关键词是否正确
2. 确认搜索API正常工作
3. 清空搜索框重置树状态

### 拖拽无效

1. 确认文件夹有权限移动
2. 检查目标位置是否合法
3. 查看控制台错误信息

## 📝 更新日志

### v1.2.0 (2025-01-06)
- ✅ 添加拖拽移动功能
- ✅ 添加右键菜单
- ✅ 添加面包屑导航
- ✅ 全面性能优化（防抖、memo、缓存）

### v1.1.0 (2025-01-05)
- ✅ 添加文件夹对话框
- ✅ 添加详情抽屉
- ✅ 键盘快捷键支持

### v1.0.0 (2025-01-04)
- 🎉 首次发布
- ✅ 基础树形导航
- ✅ 懒加载功能
- ✅ 搜索功能

## 📚 相关文档

- [FolderDialogs 使用文档](./FolderDialogs/README.md)
- [性能优化指南](./PERFORMANCE.md)
- [API 文档](../services/workNotesService.ts)

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License
