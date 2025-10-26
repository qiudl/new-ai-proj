import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Tree, Input, Spin, Empty, message, Badge } from 'antd';
import {
  FolderOutlined,
  FolderOpenOutlined,
  FileTextOutlined,
  SearchOutlined,
  LoadingOutlined,
  FolderFilled,
} from '@ant-design/icons';
import { ErrorHandler } from '../utils/error';
import type { DataNode } from 'antd/es/tree';
import { workNotesService, WorkNoteFolder } from '../services/workNotesService';
import FolderContextMenu, { FolderAction } from './FolderContextMenu';
import { useDebounce } from '../hooks/useDebounce';

const { Search } = Input;

export interface WorkNoteFolderTreeProps {
  selectedFolderId?: number | null;
  onFolderSelect: (folderId: number | null, folder: WorkNoteFolder | null) => void;
  onFolderCreate?: (parentId?: number) => void;
  onFolderEdit?: (folderId: number) => void;
  onFolderDelete?: (folderId: number) => void;
  onFolderMove?: (folderId: number) => void;
  onFolderDetail?: (folderId: number) => void;
  height?: number | string;
  showSearch?: boolean;
}

/**
 * 工作笔记文件夹树形导航组件
 *
 * 功能：
 * - 树形展示文件夹结构
 * - 支持展开/折叠
 * - 显示文件夹图标、名称、笔记数量
 * - 高亮当前选中文件夹
 * - 懒加载子文件夹（优化性能）
 * - 文件夹搜索（防抖优化）
 */
const WorkNoteFolderTreeComponent: React.FC<WorkNoteFolderTreeProps> = ({
  selectedFolderId,
  onFolderSelect,
  onFolderCreate,
  onFolderEdit,
  onFolderDelete,
  onFolderMove,
  onFolderDetail,
  height = 'calc(100vh - 250px)',
  showSearch = true,
}) => {
  const [folders, setFolders] = useState<WorkNoteFolder[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [loadedKeys, setLoadedKeys] = useState<React.Key[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);

  // 右键菜单状态
  const [contextMenuFolder, setContextMenuFolder] = useState<WorkNoteFolder | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);

  // 拖拽状态
  const [draggingKey, setDraggingKey] = useState<React.Key | null>(null);

  // 防抖搜索值（300ms延迟）
  const debouncedSearchValue = useDebounce(searchValue, 300);

  // 加载文件夹树（根目录）
  const loadRootFolders = async () => {
    setLoading(true);
    try {
      const data = await workNotesService.getFolderTree(null, 2); // 默认加载2层
      setFolders(data);
    } catch (error: any) {
      ErrorHandler.showError(error, '加载文件夹失败');
    } finally {
      setLoading(false);
    }
  };

  // 懒加载子文件夹
  const loadChildFolders = async (parentId: number): Promise<WorkNoteFolder[]> => {
    try {
      const data = await workNotesService.getFolderTree(parentId, 1);
      return data;
    } catch (error: any) {
      ErrorHandler.showError(error, '加载子文件夹失败');
      return [];
    }
  };

  // 初始化加载
  useEffect(() => {
    loadRootFolders();
  }, []);

  // 同步选中状态
  useEffect(() => {
    if (selectedFolderId) {
      setSelectedKeys([`folder-${selectedFolderId}`]);
    } else {
      setSelectedKeys(['root']);
    }
  }, [selectedFolderId]);

  // 防抖搜索效果
  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedSearchValue.trim()) {
        loadRootFolders();
        return;
      }

      setLoading(true);
      try {
        const results = await workNotesService.searchFolders(debouncedSearchValue);
        setFolders(results);
        // 展开所有搜索结果
        const allKeys = results.map(folder => `folder-${folder.id}`);
        setExpandedKeys(allKeys);
      } catch (error: any) {
        ErrorHandler.showError(error, '搜索文件夹失败');
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [debouncedSearchValue]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 只在选中文件夹时响应快捷键
      if (!selectedFolderId) {
        return;
      }

      // 获取当前选中的文件夹
      const findFolderById = (folders: WorkNoteFolder[], id: number): WorkNoteFolder | null => {
        for (const folder of folders) {
          if (folder.id === id) return folder;
          if (folder.children) {
            const found = findFolderById(folder.children, id);
            if (found) return found;
          }
        }
        return null;
      };

      const currentFolder = findFolderById(folders, selectedFolderId);
      if (!currentFolder) return;

      // F2: 重命名
      if (e.key === 'F2') {
        e.preventDefault();
        onFolderEdit?.(selectedFolderId);
        return;
      }

      // Delete: 删除
      if (e.key === 'Delete') {
        e.preventDefault();
        onFolderDelete?.(selectedFolderId);
        return;
      }

      // Ctrl+N: 新建子文件夹
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        onFolderCreate?.(selectedFolderId);
        return;
      }

      // Ctrl+M: 移动
      if (e.ctrlKey && e.key === 'm') {
        e.preventDefault();
        onFolderMove?.(selectedFolderId);
        return;
      }
    };

    // 添加事件监听
    document.addEventListener('keydown', handleKeyDown);

    // 清理
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedFolderId, folders, onFolderCreate, onFolderEdit, onFolderDelete, onFolderMove]);

  // 将WorkNoteFolder转换为Tree DataNode
  const folderToTreeNode = (folder: WorkNoteFolder): DataNode => {
    const key = `folder-${folder.id}`;
    const hasChildren = folder.subfolders_count > 0;
    const isDragging = draggingKey === key;

    return {
      key,
      title: (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            opacity: isDragging ? 0.5 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          <span style={{
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: folder.color || undefined
          }}>
            {folder.icon && <span style={{ marginRight: 4 }}>{folder.icon}</span>}
            {folder.name}
          </span>
          {folder.notes_count > 0 && (
            <Badge
              count={folder.notes_count}
              style={{
                backgroundColor: '#52c41a',
                marginLeft: 8
              }}
              showZero={false}
            />
          )}
        </div>
      ),
      isLeaf: !hasChildren,
      children: folder.children?.map(folderToTreeNode),
      // 存储原始文件夹数据
      data: folder,
      className: isDragging ? 'dragging-node' : '',
    };
  };

  // 构建树数据
  const treeData: DataNode[] = useMemo(() => {
    const rootNode: DataNode = {
      key: 'root',
      title: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <span style={{ fontWeight: 500 }}>全部笔记</span>
        </div>
      ),
      isLeaf: false,
      children: folders.map(folderToTreeNode),
    };

    return [rootNode];
  }, [folders, draggingKey]);

  // 处理节点选择
  const handleSelect = (selectedKeys: React.Key[], info: any) => {
    if (selectedKeys.length === 0) return;

    const key = selectedKeys[0] as string;
    if (key === 'root') {
      onFolderSelect(null, null);
      setSelectedKeys(['root']);
    } else {
      const folderId = parseInt(key.replace('folder-', ''));
      // 从树节点中获取文件夹数据
      const folder = info.node.data as WorkNoteFolder;
      onFolderSelect(folderId, folder);
      setSelectedKeys([key]);
    }
  };

  // 处理节点展开
  const handleExpand = (expandedKeys: React.Key[]) => {
    setExpandedKeys(expandedKeys);
  };

  // 懒加载数据
  const handleLoadData = async (treeNode: any): Promise<void> => {
    const key = treeNode.key as string;

    // 根节点不需要加载
    if (key === 'root') {
      return;
    }

    // 已经加载过的节点不重复加载
    if (loadedKeys.includes(key)) {
      return;
    }

    const folderId = parseInt(key.replace('folder-', ''));
    const children = await loadChildFolders(folderId);

    // 更新文件夹数据
    const updateFolderChildren = (folders: WorkNoteFolder[]): WorkNoteFolder[] => {
      return folders.map(folder => {
        if (folder.id === folderId) {
          return { ...folder, children };
        }
        if (folder.children) {
          return { ...folder, children: updateFolderChildren(folder.children) };
        }
        return folder;
      });
    };

    setFolders(prevFolders => updateFolderChildren(prevFolders));
    setLoadedKeys(prev => [...prev, key]);
  };

  // 处理搜索输入（仅更新searchValue状态，实际搜索由debouncedSearchValue触发）
  const handleSearchChange = (value: string) => {
    setSearchValue(value);
  };

  // 处理右键点击
  const handleRightClick = (info: any) => {
    const key = info.node.key as string;

    // 根节点不显示右键菜单
    if (key === 'root') {
      return;
    }

    const folder = info.node.data as WorkNoteFolder;
    setContextMenuFolder(folder);
    setContextMenuPosition({ x: info.event.clientX, y: info.event.clientY });
  };

  // 关闭右键菜单
  const handleCloseContextMenu = () => {
    setContextMenuFolder(null);
    setContextMenuPosition(null);
  };

  // 处理右键菜单操作
  const handleContextMenuAction = (action: FolderAction, folder: WorkNoteFolder) => {
    switch (action) {
      case 'create':
        onFolderCreate?.(folder.id);
        break;
      case 'rename':
        onFolderEdit?.(folder.id);
        break;
      case 'move':
        onFolderMove?.(folder.id);
        break;
      case 'delete':
        onFolderDelete?.(folder.id);
        break;
      case 'detail':
        onFolderDetail?.(folder.id);
        break;
      default:
        break;
    }
  };

  // 查找文件夹（递归）
  const findFolderById = (folders: WorkNoteFolder[], id: number): WorkNoteFolder | null => {
    for (const folder of folders) {
      if (folder.id === id) return folder;
      if (folder.children) {
        const found = findFolderById(folder.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  // 检查是否是子孙节点（防止循环引用）
  const isDescendant = (folderId: number, ancestorId: number): boolean => {
    const folder = findFolderById(folders, folderId);
    if (!folder || !folder.parent_id) return false;
    if (folder.parent_id === ancestorId) return true;
    return isDescendant(folder.parent_id, ancestorId);
  };

  // 检查是否允许拖拽放置
  const checkCanDrop = (dragNode: any, dropNode: any, dropPosition: number): boolean => {
    const dragKey = dragNode.key as string;
    const dropKey = dropNode.key as string;

    // 不能拖拽到根节点上
    if (dropKey === 'root' && dropPosition === 0) {
      return false;
    }

    // 如果是拖拽到根节点内部（作为根级文件夹），允许
    if (dropKey === 'root' && dropPosition !== 0) {
      return true;
    }

    // 不能拖拽到自身
    if (dragKey === dropKey) {
      return false;
    }

    const dragFolderId = parseInt(dragKey.replace('folder-', ''));
    const dropFolderId = parseInt(dropKey.replace('folder-', ''));

    // 不能拖拽到自己的子孙节点
    if (isDescendant(dropFolderId, dragFolderId)) {
      return false;
    }

    return true;
  };

  // 处理拖拽放置
  const handleDrop = async (info: any) => {
    const dragKey = info.dragNode.key as string;
    const dropKey = info.node.key as string;
    const dropPosition = info.dropPosition;
    const dropToGap = info.dropToGap;

    // 根节点特殊处理
    if (dragKey === 'root' || dropKey === 'root') {
      if (dropKey === 'root' && dropToGap) {
        // 拖拽到根节点内部，移动到根级
        const dragFolderId = parseInt(dragKey.replace('folder-', ''));
        const dragFolder = findFolderById(folders, dragFolderId);

        if (dragFolder) {
          try {
            await workNotesService.moveFolder(dragFolderId, null);
            message.success(`已将"${dragFolder.name}"移动到根目录`);
            await loadRootFolders();
          } catch (error: any) {
            ErrorHandler.showError(error, '移动文件夹失败');
          }
        }
      }
      return;
    }

    const dragFolderId = parseInt(dragKey.replace('folder-', ''));
    const dropFolderId = parseInt(dropKey.replace('folder-', ''));

    const dragFolder = findFolderById(folders, dragFolderId);
    const dropFolder = findFolderById(folders, dropFolderId);

    if (!dragFolder || !dropFolder) {
      return;
    }

    try {
      let targetParentId: number | null = null;

      if (dropToGap) {
        // 放置到节点之间，与目标节点成为兄弟节点
        targetParentId = dropFolder.parent_id || null;
      } else {
        // 放置到节点内部，成为目标节点的子节点
        targetParentId = dropFolderId;
      }

      await workNotesService.moveFolder(dragFolderId, targetParentId);

      if (targetParentId === null) {
        message.success(`已将"${dragFolder.name}"移动到根目录`);
      } else {
        const targetFolder = findFolderById(folders, targetParentId);
        message.success(`已将"${dragFolder.name}"移动到"${targetFolder?.name || ''}"`);
      }

      // 刷新文件夹树
      await loadRootFolders();
    } catch (error: any) {
      ErrorHandler.showError(error, '移动文件夹失败');
    } finally {
      setDraggingKey(null);
    }
  };

  return (
    <div style={{ height, display: 'flex', flexDirection: 'column' }}>
      {/* 搜索框 */}
      {showSearch && (
        <div style={{ padding: '8px 0', marginBottom: 8 }}>
          <Search
            placeholder="搜索文件夹..."
            allowClear
            prefix={<SearchOutlined />}
            value={searchValue}
            onChange={e => handleSearchChange(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
      )}

      {/* 树形结构 */}
      <div style={{ flex: 1, overflow: 'auto', paddingRight: 8 }}>
        {loading && folders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
            <div style={{ marginTop: 12, color: '#8c8c8c' }}>加载中...</div>
          </div>
        ) : folders.length === 0 && !searchValue ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无文件夹"
            style={{ marginTop: 40 }}
          />
        ) : folders.length === 0 && searchValue ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={`未找到"${searchValue}"相关的文件夹`}
            style={{ marginTop: 40 }}
          />
        ) : (
          <Tree
            showLine={{ showLeafIcon: false }}
            showIcon
            selectedKeys={selectedKeys}
            expandedKeys={expandedKeys}
            onSelect={handleSelect}
            onExpand={handleExpand}
            loadData={handleLoadData}
            treeData={treeData}
            defaultExpandedKeys={['root']}
            style={{ background: 'transparent' }}
            blockNode
            draggable
            allowDrop={(options) => {
              return checkCanDrop(options.dragNode, options.dropNode, options.dropPosition);
            }}
            onDragStart={(info) => {
              setDraggingKey(info.node.key);
            }}
            onDragEnd={() => {
              setDraggingKey(null);
            }}
            onDrop={handleDrop}
          />
        )}
      </div>
    </div>
  );
};

// 使用 React.memo 优化性能
const WorkNoteFolderTree = React.memo(WorkNoteFolderTreeComponent, (prevProps, nextProps) => {
  // 自定义比较函数，只在这些props改变时重新渲染
  return (
    prevProps.selectedFolderId === nextProps.selectedFolderId &&
    prevProps.height === nextProps.height &&
    prevProps.showSearch === nextProps.showSearch &&
    prevProps.onFolderSelect === nextProps.onFolderSelect &&
    prevProps.onFolderCreate === nextProps.onFolderCreate &&
    prevProps.onFolderEdit === nextProps.onFolderEdit &&
    prevProps.onFolderDelete === nextProps.onFolderDelete &&
    prevProps.onFolderMove === nextProps.onFolderMove &&
    prevProps.onFolderDetail === nextProps.onFolderDetail
  );
});

WorkNoteFolderTree.displayName = 'WorkNoteFolderTree';

export default WorkNoteFolderTree;
