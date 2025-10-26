import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Tree, Input, Spin, Empty, message, Badge, Tabs, Card, Statistic, Row, Col } from 'antd';
import {
  FolderOutlined,
  FolderOpenOutlined,
  LockOutlined,
  TeamOutlined,
  GlobalOutlined,
  SearchOutlined,
  LoadingOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { ErrorHandler } from '../utils/error';
import type { DataNode } from 'antd/es/tree';
import {
  workNotesService,
  WorkNoteFolder,
  TreeType,
  TreeRoot,
  TreeOverviewResponse,
  FolderTreeResponse,
  TreeStats,
} from '../services/workNotesService';
import { useDebounce } from '../hooks/useDebounce';

const { Search } = Input;
const { TabPane } = Tabs;

export interface WorkNoteThreeTreesViewProps {
  selectedFolderId?: number | null;
  onFolderSelect: (folderId: number | null, folder: WorkNoteFolder | null) => void;
  onFolderCreate?: (parentId?: number, treeType?: TreeType) => void;
  onFolderEdit?: (folderId: number) => void;
  onFolderDelete?: (folderId: number) => void;
  height?: number | string;
  defaultTreeType?: TreeType;
}

/**
 * 三棵树工作笔记文件夹视图组件
 *
 * 功能：
 * - 三棵独立的文件夹树：Private(私人), Team(团队), Public(公开)
 * - 每棵树独立的权限控制和数据加载
 * - 统一的搜索和交互体验
 * - 懒加载子文件夹优化性能
 */
const WorkNoteThreeTreesView: React.FC<WorkNoteThreeTreesViewProps> = ({
  selectedFolderId,
  onFolderSelect,
  onFolderCreate,
  onFolderEdit,
  onFolderDelete,
  height = 'calc(100vh - 250px)',
  defaultTreeType = 'private',
}) => {
  // 当前激活的树类型
  const [activeTreeType, setActiveTreeType] = useState<TreeType>(defaultTreeType);

  // 三棵树的概览数据
  const [overview, setOverview] = useState<TreeOverviewResponse | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);

  // 当前树的文件夹数据
  const [folders, setFolders] = useState<WorkNoteFolder[]>([]);
  const [loading, setLoading] = useState(false);

  // 当前树的统计信息
  const [treeStats, setTreeStats] = useState<TreeStats | null>(null);

  // 搜索和展开状态
  const [searchValue, setSearchValue] = useState('');
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [loadedKeys, setLoadedKeys] = useState<React.Key[]>([]);

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

  // 加载三棵树概览
  const loadTreesOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const data = await workNotesService.getTreesOverview();
      setOverview(data);
    } catch (error: any) {
      ErrorHandler.showError(error, '加载树概览失败');
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  // 加载指定树的根文件夹
  const loadTreeFolders = useCallback(async (treeType: TreeType, parentId?: number, maxDepth: number = 2) => {
    setLoading(true);
    try {
      const data = await workNotesService.getFolderTreeByType(treeType, parentId, maxDepth);
      setFolders(data.folders || []);
      return data.folders || [];
    } catch (error: any) {
      ErrorHandler.showError(error, `加载${getTreeConfig(treeType).name}失败`);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载树统计信息
  const loadTreeStats = useCallback(async (treeType: TreeType) => {
    try {
      const stats = await workNotesService.getTreeStats(treeType);
      setTreeStats(stats);
    } catch (error: any) {
      ErrorHandler.silent(error);
    }
  }, []);

  // 初始化加载概览
  useEffect(() => {
    loadTreesOverview();
  }, [loadTreesOverview]);

  // 当切换树时，重新加载数据
  useEffect(() => {
    loadTreeFolders(activeTreeType);
    loadTreeStats(activeTreeType);
    // 清空搜索
    setSearchValue('');
    // 清空展开状态
    setExpandedKeys([]);
    setLoadedKeys([]);
  }, [activeTreeType, loadTreeFolders, loadTreeStats]);

  // 自动展开所有文件夹节点
  useEffect(() => {
    if (folders.length > 0) {
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
      setExpandedKeys(allKeys);
    }
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
        // 搜索会在当前树中进行
        const results = await workNotesService.searchFolders(debouncedSearchValue);
        // 过滤出当前树类型的文件夹
        const visibilityMap: Record<TreeType, string> = {
          private: 'private',
          team: 'team',
          public: 'public',
        };
        const filteredResults = results.filter(
          folder => folder.visibility === visibilityMap[activeTreeType]
        );
        setFolders(filteredResults);

        // 展开所有搜索结果
        const allKeys = filteredResults.map(folder => `folder-${folder.id}`);
        setExpandedKeys(allKeys);
      } catch (error: any) {
        ErrorHandler.showError(error, '搜索文件夹失败');
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [debouncedSearchValue, activeTreeType, loadTreeFolders]);

  // 将WorkNoteFolder转换为Tree DataNode
  const folderToTreeNode = (folder: WorkNoteFolder): DataNode => {
    const key = `folder-${folder.id}`;
    const hasChildren = folder.subfolders_count > 0;

    return {
      key,
      title: (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
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
      isLeaf: !hasChildren,
      children: folder.children?.map(folderToTreeNode),
      data: folder,
    };
  };

  // 构建树数据
  const treeData: DataNode[] = useMemo(() => {
    const config = getTreeConfig(activeTreeType);
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
      isLeaf: false,
      children: folders.map(folderToTreeNode),
    };

    return [rootNode];
  }, [folders, activeTreeType]);

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
    setActiveTreeType(treeType as TreeType);
  };

  // 刷新当前树
  const handleRefresh = () => {
    loadTreeFolders(activeTreeType);
    loadTreeStats(activeTreeType);
    loadTreesOverview();
    message.success('已刷新');
  };

  // 渲染概览统计卡片
  const renderOverviewCards = () => {
    if (!overview || !overview.trees) return null;

    return (
      <Row gutter={16} style={{ marginBottom: 16 }}>
        {overview.trees.map((tree: TreeRoot) => (
          <Col span={8} key={tree.type}>
            <Card
              size="small"
              hoverable
              onClick={() => setActiveTreeType(tree.type)}
              style={{
                borderColor: activeTreeType === tree.type ? getTreeConfig(tree.type).color : undefined,
                borderWidth: activeTreeType === tree.type ? 2 : 1,
              }}
            >
              <Statistic
                title={
                  <span>
                    {tree.icon} {tree.name}
                  </span>
                }
                value={tree.folder_count}
                suffix="个文件夹"
                valueStyle={{
                  fontSize: '18px',
                  color: getTreeConfig(tree.type).color,
                }}
              />
              <div style={{ marginTop: 8, color: '#8c8c8c', fontSize: '12px' }}>
                {tree.note_count} 篇笔记
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    );
  };

  return (
    <div style={{ height, display: 'flex', flexDirection: 'column' }}>
      {/* 概览统计卡片 */}
      {overviewLoading ? (
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <Spin size="small" />
        </div>
      ) : (
        renderOverviewCards()
      )}

      {/* Tab切换 */}
      <Tabs
        activeKey={activeTreeType}
        onChange={handleTreeTypeChange}
        tabBarExtraContent={
          <a onClick={handleRefresh} style={{ fontSize: '12px' }}>
            <ReloadOutlined /> 刷新
          </a>
        }
        style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
      >
        <TabPane
          tab={
            <span>
              <LockOutlined />
              私人笔记
            </span>
          }
          key="private"
          style={{ height: '100%' }}
        />
        <TabPane
          tab={
            <span>
              <TeamOutlined />
              团队笔记
            </span>
          }
          key="team"
        />
        <TabPane
          tab={
            <span>
              <GlobalOutlined />
              公开笔记
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
            description={`暂无${getTreeConfig(activeTreeType).name}`}
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
          />
        )}
      </div>

      {/* 统计信息 */}
      {treeStats && (
        <div style={{
          padding: '12px',
          borderTop: '1px solid #f0f0f0',
          background: '#fafafa',
          fontSize: '12px',
          color: '#8c8c8c',
        }}>
          <Row gutter={8}>
            <Col span={12}>文件夹: {treeStats.folder_count}</Col>
            <Col span={12}>笔记: {treeStats.note_count}</Col>
          </Row>
        </div>
      )}
    </div>
  );
};

// 使用 React.memo 优化性能
export default React.memo(WorkNoteThreeTreesView);
