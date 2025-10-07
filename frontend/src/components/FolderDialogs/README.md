# 文件夹CRUD对话框组件

文件夹管理相关的对话框组件集合，用于创建、编辑、删除和移动文件夹。

## 组件列表

### 1. FolderDialog

创建/编辑文件夹的表单对话框。

**功能**:
- 创建新文件夹（支持选择父文件夹）
- 编辑现有文件夹
- 表单验证
- 颜色和图标选择
- 实时预览

**使用示例**:
```typescript
import { FolderDialog } from '@/components/FolderDialogs';

const [visible, setVisible] = useState(false);
const [editingFolder, setEditingFolder] = useState<WorkNoteFolder>();

const handleConfirm = async (values: FolderFormValues) => {
  if (editingFolder) {
    await workNotesService.updateFolder(editingFolder.id, values);
  } else {
    await workNotesService.createFolder(values);
  }
  // 刷新文件夹树
  loadFolders();
};

<FolderDialog
  visible={visible}
  onClose={() => setVisible(false)}
  onConfirm={handleConfirm}
  folder={editingFolder}
  folders={folders}
/>
```

### 2. DeleteFolderDialog

删除文件夹确认对话框。

**功能**:
- 检查文件夹是否为空
- 空文件夹：直接删除
- 非空文件夹：提示用户选择（强制删除或先移动内容）
- 显示文件夹内容统计

**使用示例**:
```typescript
import { DeleteFolderDialog } from '@/components/FolderDialogs';

const [deletingFolder, setDeletingFolder] = useState<WorkNoteFolder>();

const handleDelete = async (force: boolean) => {
  await workNotesService.deleteFolder(deletingFolder.id);
  loadFolders();
};

<DeleteFolderDialog
  visible={!!deletingFolder}
  onClose={() => setDeletingFolder(undefined)}
  onConfirm={handleDelete}
  folder={deletingFolder}
/>
```

### 3. MoveFolderDialog

移动文件夹到新父级的对话框。

**功能**:
- 选择目标父文件夹
- 自动排除当前文件夹及其子文件夹（防止循环引用）
- 显示移动预览
- 树形选择器

**使用示例**:
```typescript
import { MoveFolderDialog } from '@/components/FolderDialogs';

const [movingFolder, setMovingFolder] = useState<WorkNoteFolder>();

const handleMove = async (targetParentId: number | null) => {
  await workNotesService.moveFolder(movingFolder.id, targetParentId);
  loadFolders();
};

<MoveFolderDialog
  visible={!!movingFolder}
  onClose={() => setMovingFolder(undefined)}
  onConfirm={handleMove}
  folder={movingFolder}
  folders={folders}
/>
```

### 4. ColorPicker

颜色选择器组件。

**使用示例**:
```typescript
import { ColorPicker } from '@/components/FolderDialogs';

<ColorPicker
  value={selectedColor}
  onChange={setSelectedColor}
/>
```

### 5. IconPicker

图标选择器组件。

**使用示例**:
```typescript
import { IconPicker } from '@/components/FolderDialogs';

<IconPicker
  value={selectedIcon}
  onChange={setSelectedIcon}
/>
```

## 完整集成示例

将所有对话框集成到WorkNotesManager:

```typescript
import React, { useState } from 'react';
import { workNotesService, WorkNoteFolder } from '../services/workNotesService';
import WorkNoteFolderTree from './WorkNoteFolderTree';
import {
  FolderDialog,
  DeleteFolderDialog,
  MoveFolderDialog,
  FolderFormValues,
} from './FolderDialogs';

const WorkNotesManager: React.FC = () => {
  const [folders, setFolders] = useState<WorkNoteFolder[]>([]);

  // 对话框状态
  const [folderDialogVisible, setFolderDialogVisible] = useState(false);
  const [editingFolder, setEditingFolder] = useState<WorkNoteFolder>();
  const [deletingFolder, setDeletingFolder] = useState<WorkNoteFolder>();
  const [movingFolder, setMovingFolder] = useState<WorkNoteFolder>();
  const [parentId, setParentId] = useState<number>();

  // 加载文件夹
  const loadFolders = async () => {
    const data = await workNotesService.getFolderTree();
    setFolders(data);
  };

  // 创建文件夹
  const handleCreateFolder = async (values: FolderFormValues) => {
    await workNotesService.createFolder(values);
    loadFolders();
  };

  // 编辑文件夹
  const handleEditFolder = async (values: FolderFormValues) => {
    if (editingFolder) {
      await workNotesService.updateFolder(editingFolder.id, values);
      loadFolders();
    }
  };

  // 删除文件夹
  const handleDeleteFolder = async (force: boolean) => {
    if (deletingFolder) {
      await workNotesService.deleteFolder(deletingFolder.id);
      loadFolders();
    }
  };

  // 移动文件夹
  const handleMoveFolder = async (targetParentId: number | null) => {
    if (movingFolder) {
      await workNotesService.moveFolder(movingFolder.id, targetParentId);
      loadFolders();
    }
  };

  return (
    <div>
      <WorkNoteFolderTree
        folders={folders}
        onFolderCreate={(parentId) => {
          setParentId(parentId);
          setEditingFolder(undefined);
          setFolderDialogVisible(true);
        }}
        onFolderEdit={(folderId) => {
          const folder = findFolderById(folders, folderId);
          setEditingFolder(folder);
          setFolderDialogVisible(true);
        }}
        onFolderDelete={(folderId) => {
          const folder = findFolderById(folders, folderId);
          setDeletingFolder(folder);
        }}
        onFolderMove={(folderId) => {
          const folder = findFolderById(folders, folderId);
          setMovingFolder(folder);
        }}
      />

      {/* 创建/编辑对话框 */}
      <FolderDialog
        visible={folderDialogVisible}
        onClose={() => {
          setFolderDialogVisible(false);
          setEditingFolder(undefined);
          setParentId(undefined);
        }}
        onConfirm={editingFolder ? handleEditFolder : handleCreateFolder}
        folder={editingFolder}
        parentId={parentId}
        folders={folders}
      />

      {/* 删除对话框 */}
      <DeleteFolderDialog
        visible={!!deletingFolder}
        onClose={() => setDeletingFolder(undefined)}
        onConfirm={handleDeleteFolder}
        folder={deletingFolder}
      />

      {/* 移动对话框 */}
      <MoveFolderDialog
        visible={!!movingFolder}
        onClose={() => setMovingFolder(undefined)}
        onConfirm={handleMoveFolder}
        folder={movingFolder}
        folders={folders}
      />
    </div>
  );
};

// 辅助函数：根据ID查找文件夹
function findFolderById(folders: WorkNoteFolder[], id: number): WorkNoteFolder | undefined {
  for (const folder of folders) {
    if (folder.id === id) return folder;
    if (folder.children) {
      const found = findFolderById(folder.children, id);
      if (found) return found;
    }
  }
  return undefined;
}
```

## 特性

### 表单验证
- 文件夹名称：必填，1-100字符，不能包含 / 或 \
- 描述：可选，最多500字符

### 防循环引用
MoveFolderDialog 会自动排除：
- 当前文件夹本身
- 当前文件夹的所有子文件夹

### 非空文件夹删除
DeleteFolderDialog 会检查文件夹内容：
- 显示笔记数量和子文件夹数量
- 要求用户勾选"强制删除"选项
- 提供友好的建议

### 实时预览
FolderDialog 提供：
- 颜色和图标的实时预览
- 文件夹名称预览

## 开发状态

- ✅ FolderDialog - 完成
- ✅ DeleteFolderDialog - 完成
- ✅ MoveFolderDialog - 完成
- ✅ ColorPicker - 完成
- ✅ IconPicker - 完成

## 下一步

Task 3007 will add:
- 右键菜单集成
- 面包屑导航
- 工具栏按钮
