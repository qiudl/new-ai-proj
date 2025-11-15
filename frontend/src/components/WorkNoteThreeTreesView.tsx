import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Tree, Input, Spin, Empty, message, Badge, Tabs, Button, Space } from 'antd';
import {
  FolderOutlined,
  FolderOpenOutlined,
  LockOutlined,
  TeamOutlined,
  GlobalOutlined,
  SearchOutlined,
  LoadingOutlined,
  ReloadOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { ErrorHandler } from '../utils/error';
import type { DataNode as AntdDataNode } from 'antd/es/tree';
import {
  workNotesService,
  WorkNoteFolder,
  TreeType,
} from '../services/workNotesService';
import { useDebounce } from '../hooks/useDebounce';
import FolderContextMenu, { FolderAction } from './FolderContextMenu';
import { useWorkNotePermissions } from '../hooks/useWorkNotePermissions';

// 扩展DataNode以包含自定义data属性
interface DataNode extends AntdDataNode {
  data?: WorkNoteFolder;
}

const { Search } = Input;
const { TabPane } = Tabs;

export interface WorkNoteThreeTreesViewProps {
  selectedFolderId?: number | null;
  onFolderSelect: (folderId: number | null, folder: WorkNoteFolder | null) => void;
  onFolderCreate?: (parentId?: number, treeType?: TreeType) => void;
  onFolderEdit?: (folderId: number) => void;
  onFolderDelete?: (folderId: number) => void;
  onFolderMove?: (folderId: number) => void;
  onFolderDetail?: (folderId: number) => void;
  onTreeTypeChange?: (treeType: TreeType) => void; // 新增：树类型变化回调
  height?: number | string;
  defaultTreeType?: TreeType;
}

/**
 * 三棵树工作笔记文件夹视图组件（树状结构）
 *
 * 功能：
 * - 三棵独立的文件夹树：Private(私人), Team(团队), Public(公开)
 * - 每棵树独立的权限控制和数据加载
 * - 树状结构展示，支持拖拽、右键菜单
 * - 支持创建子文件夹
 * - 懒加载子文件夹优化性能
 */
const WorkNoteThreeTreesView: React.FC<WorkNoteThreeTreesViewProps> = ({
  selectedFolderId,
  onFolderSelect,
  onFolderCreate,
  onFolderEdit,
  onFolderDelete,
  onFolderMove,
  onFolderDetail,
  onTreeTypeChange,
  height = 'calc(100vh - 250px)',
  defaultTreeType = 'private',
}) => {
  // 权限检查
  const { canCreateFolder, isSystemAdmin } = useWorkNotePermissions();

  // 当前激活的树类型
  const [activeTreeType, setActiveTreeType] = useState<TreeType>(defaultTreeType);

  // 当前树的文件夹数据
  const [folders, setFolders] = useState<WorkNoteFolder[]>([]);
  const [loading, setLoading] = useState(false);

  // 搜索和展开状态
  const [searchValue, setSearchValue] = useState('');
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [loadedKeys, setLoadedKeys] = useState<React.Key[]>([]);

  // 右键菜单状态
  const [contextMenuFolder, setContextMenuFolder] = useState<WorkNoteFolder | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);

  // 拖拽状态
  const [draggingKey, setDraggingKey] = useState<React.Key | null>(null);

  // 防抖搜索值（300ms延迟）
  const debouncedSearchValue = useDebounce(searchValue, 300);

  // 获取树的配置信息
  const getTreeConfig = (treeType: TreeType) => {
    const configs = {
      private: {
        icon: <LockOutlined />,
        name: '私人笔记',
        color: '#1890ff',
        description: '只有我可以看到',
      },
      team: {
        icon: <TeamOutlined />,
        name: '团队笔记',
        color: '#52c41a',
        description: '团队成员可见',
      },
      public: {
        icon: <GlobalOutlined />,
        name: '公开笔记',
        color: '#fa8c16',
        description: '所有人可见',
      },
    };
    return configs[treeType];
  };

  // 将扁平数组转换为树形结构
  const buildTree = useCallback((flatFolders: WorkNoteFolder[]): WorkNoteFolder[] => {
    const folderMap = new Map<number, WorkNoteFolder>();
    const rootFolders: WorkNoteFolder[] = [];

    // 创建所有文件夹的映射
    flatFolders.forEach(folder => {
      folderMap.set(folder.id, { ...folder, children: [] });
    });

    // 构建树形结构
    flatFolders.forEach(folder => {
      const folderNode = folderMap.get(folder.id)!;
      if (folder.parent_id) {
        const parent = folderMap.get(folder.parent_id);
        if (parent) {
          if (!parent.children) parent.children = [];
          parent.children.push(folderNode);
        } else {
          // 父文件夹不在当前列表中，作为根节点处理
          rootFolders.push(folderNode);
        }
      } else {
        // 无父文件夹，是根节点
        rootFolders.push(folderNode);
      }
    });

    return rootFolders;
  }, []);

  // 加载指定树的根文件夹
  const loadTreeFolders = useCallback(async (treeType: TreeType, parentId?: number, maxDepth: number = 2) => {
    setLoading(true);
    try {
      const data = await workNotesService.getFolderTreeByType(treeType, parentId, maxDepth);
      const loadedFolders = data.folders || [];

      if (parentId === undefined) {
        // 加载根文件夹时，构建完整的树形结构
        const treeFolders = buildTree(loadedFolders);
        setFolders(treeFolders);
        return treeFolders;
      }

      return loadedFolders;
    } catch (error: any) {
      ErrorHandler.showError(error, `加载${getTreeConfig(treeType).name}失败`);
      return [];
    } finally {
      setLoading(false);
    }
  }, [buildTree]);

  // 当切换树时，重新加载数据
  useEffect(() => {
    loadTreeFolders(activeTreeType);
    // 清空搜索
    setSearchValue('');
    // 清空展开状态
    setExpandedKeys([]);
    setLoadedKeys([]);
  }, [activeTreeType, loadTreeFolders]);

  // 自动展开所有文件夹节点 (防止重复更新导致insertBefore错误)
  const lastFoldersLength = React.useRef(0);
  const expandKeysTimerRef = React.useRef<number | null>(null);

  useEffect(() => {
    // 只在文件夹数量变化时更新expandedKeys,避免频繁触发
    if (folders.length > 0 && folders.length !== lastFoldersLength.current) {
      const collectAllKeys = (folderList: WorkNoteFolder[]): React.Key[] => {
        const keys: React.Key[] = ['root'];
        const traverse = (folders: WorkNoteFolder[]) => {
          folders.forEach(folder => {
            keys.push(`folder-${folder.id}`);
            if (folder.children && folder.children.length > 0) {
              traverse(folder.children);
            }
          });
        };
        traverse(folderList);
        return keys;
      };

      const allKeys = collectAllKeys(folders);

      // 清除之前的延迟更新
      if (expandKeysTimerRef.current !== null) {
        cancelAnimationFrame(expandKeysTimerRef.current);
      }

      // 使用双重延迟确保DOM完全稳定
      expandKeysTimerRef.current = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setExpandedKeys(allKeys);
          expandKeysTimerRef.current = null;
        });
      });

      lastFoldersLength.current = folders.length;
    }

    // 清理函数
    return () => {
      if (expandKeysTimerRef.current !== null) {
        cancelAnimationFrame(expandKeysTimerRef.current);
      }
    };
  }, [folders]);

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
        loadTreeFolders(activeTreeType);
        return;
      }

      setLoading(true);
      try {
        // 搜索当前树类型的文件夹,直接传入 visibility 参数
        const visibilityMap: Record<TreeType, 'private' | 'team' | 'public'> = {
          private: 'private',
          team: 'team',
          public: 'public',
        };

        // 使用 visibility 参数进行搜索,后端会过滤
        const results = await workNotesService.searchFolders(
          debouncedSearchValue,
          visibilityMap[activeTreeType]
        );

        // 将搜索结果构建为树形结构
        const treeFolders = buildTree(results);
        setFolders(treeFolders);

        // 展开所有搜索结果
        const allKeys = results.map(folder => `folder-${folder.id}`);
        setExpandedKeys(['root', ...allKeys]);
      } catch (error: any) {
        ErrorHandler.showError(error, '搜索文件夹失败');
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [debouncedSearchValue, activeTreeType, loadTreeFolders, buildTree]);

  // 将WorkNoteFolder转换为Tree DataNode
  const folderToTreeNode = useCallback((folder: WorkNoteFolder): DataNode => {
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
                backgroundColor: getTreeConfig(activeTreeType).color,
                marginLeft: 8
              }}
              showZero={false}
            />
          )}
        </div>
      ),
      icon: undefined, // 不显示文件夹图标
      isLeaf: !hasChildren,
      children: folder.children?.map(folderToTreeNode),
      data: folder,
      className: isDragging ? 'dragging-node' : '',
    };
  }, [draggingKey, activeTreeType]);

  // 构建树数据
  const treeData: DataNode[] = useMemo(() => {
    const config = getTreeConfig(activeTreeType);

    // 过滤出根级文件夹（parent_id 为 null 或 undefined）
    const rootFolders = folders.filter(folder => !folder.parent_id);

    const rootNode: DataNode = {
      key: 'root',
      title: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <span style={{ fontWeight: 500 }}>
            {config.icon}
            <span style={{ marginLeft: 8 }}>{config.name}</span>
          </span>
        </div>
      ),
      icon: undefined, // 不显示根节点图标，避免重复
      isLeaf: false,
      children: rootFolders.map(folderToTreeNode),
    };

    return [rootNode];
  }, [folders, activeTreeType, folderToTreeNode]);

  // 处理节点选择
  const handleSelect = (selectedKeys: React.Key[], info: any) => {
    if (selectedKeys.length === 0) return;

    const key = selectedKeys[0] as string;
    if (key === 'root') {
      onFolderSelect(null, null);
      setSelectedKeys(['root']);
    } else {
      const folderId = parseInt(key.replace('folder-', ''));
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

    if (key === 'root') {
      return;
    }

    if (loadedKeys.includes(key)) {
      return;
    }

    const folderId = parseInt(key.replace('folder-', ''));
    const children = await loadTreeFolders(activeTreeType, folderId, 1);

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

  // 处理搜索输入
  const handleSearchChange = (value: string) => {
    setSearchValue(value);
  };

  // 切换树类型
  const handleTreeTypeChange = (treeType: string) => {
    const newTreeType = treeType as TreeType;
    setActiveTreeType(newTreeType);
    // 通知父组件树类型已变化
    if (onTreeTypeChange) {
      onTreeTypeChange(newTreeType);
    }
  };

  // 刷新当前树
  const handleRefresh = () => {
    loadTreeFolders(activeTreeType);
    message.success('已刷新');
  };

  // 处理右键点击
  const handleRightClick = (info: any) => {
    const key = info.node.key as string;

    // 根节点特殊处理：只允许创建根级文件夹
    if (key === 'root') {
      setContextMenuFolder(null); // 设置为null表示根节点
      setContextMenuPosition({ x: info.event.clientX, y: info.event.clientY });
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
  const handleContextMenuAction = (action: FolderAction, folder: WorkNoteFolder | null) => {
    switch (action) {
      case 'create':
        if (folder) {
          // 在文件夹下创建子文件夹
          onFolderCreate?.(folder.id, activeTreeType);
        } else {
          // 在根节点下创建根级文件夹
          onFolderCreate?.(undefined, activeTreeType);
        }
        break;
      case 'rename':
        if (folder) {
          onFolderEdit?.(folder.id);
        }
        break;
      case 'move':
        if (folder) {
          onFolderMove?.(folder.id);
        }
        break;
      case 'delete':
        if (folder) {
          onFolderDelete?.(folder.id);
        }
        break;
      case 'detail':
        if (folder) {
          onFolderDetail?.(folder.id);
        }
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
            await loadTreeFolders(activeTreeType);
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
      await loadTreeFolders(activeTreeType);
    } catch (error: any) {
      ErrorHandler.showError(error, '移动文件夹失败');
    } finally {
      setDraggingKey(null);
    }
  };

  // 快速创建根级文件夹
  const handleQuickCreateRoot = () => {
    onFolderCreate?.(undefined, activeTreeType);
  };

  return (
    <div style={{ height, display: 'flex', flexDirection: 'column' }}>
      {/* Tab切换 */}
      <Tabs
        activeKey={activeTreeType}
        onChange={handleTreeTypeChange}
        tabBarExtraContent={
          <Button
            type="text"
            size="small"
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
          />
        }
        style={{ marginBottom: 8 }}
      >
        <TabPane
          tab={
            <span>
              <LockOutlined />
              私人
            </span>
          }
          key="private"
        />
        <TabPane
          tab={
            <span>
              <TeamOutlined />
              团队
            </span>
          }
          key="team"
        />
        <TabPane
          tab={
            <span>
              <GlobalOutlined />
              公开
            </span>
          }
          key="public"
        />
      </Tabs>

      {/* 搜索框 */}
      <div style={{ padding: '8px 0', marginBottom: 8 }}>
        <Search
          placeholder={`搜索${getTreeConfig(activeTreeType).name}中的文件夹...`}
          allowClear
          prefix={<SearchOutlined />}
          value={searchValue}
          onChange={e => handleSearchChange(e.target.value)}
          style={{ width: '100%' }}
        />
      </div>

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
            description={
              <span>
                {`暂无${getTreeConfig(activeTreeType).name}`}
                <br />
                {canCreateFolder(activeTreeType) ? (
                  <Button
                    type="link"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={handleQuickCreateRoot}
                  >
                    创建第一个文件夹
                  </Button>
                ) : (
                  <span style={{ color: '#999', fontSize: 12 }}>
                    {activeTreeType === 'public'
                      ? '只有系统管理员可以创建公开文件夹'
                      : activeTreeType === 'team'
                      ? '只有系统管理员可以创建团队文件夹'
                      : '您没有权限创建文件夹'}
                  </span>
                )}
              </span>
            }
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
            onRightClick={handleRightClick}
          />
        )}
      </div>

      {/* 右键菜单 */}
      {contextMenuPosition && (
        <FolderContextMenu
          folder={contextMenuFolder}
          position={contextMenuPosition}
          onAction={handleContextMenuAction}
          onClose={handleCloseContextMenu}
          showCreateOnly={contextMenuFolder === null}
        />
      )}
    </div>
  );
};

// 使用 React.memo 优化性能
export default React.memo(WorkNoteThreeTreesView);
