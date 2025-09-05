/**
 * Refactored Enhanced Hierarchical Task Tree Component
 * 使用统一的 useTaskHierarchy Hook 重构的增强层级任务树组件
 */

import React, { useState, useCallback, useMemo } from 'react';
import { 
  Card, 
  Tree, 
  Typography, 
  Button, 
  Space, 
  message, 
  Spin, 
  Empty, 
  Badge, 
  Tag,
  Tooltip,
  Input,
  Select,
  Dropdown
} from 'antd';
import { 
  ProjectOutlined, 
  FileTextOutlined, 
  PlayCircleOutlined,
  ClockCircleOutlined,
  BranchesOutlined,
  ReloadOutlined,
  CaretRightOutlined,
  CaretDownOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  PauseCircleOutlined,
  InboxOutlined,
  SearchOutlined,
  FilterOutlined,
  ExpandOutlined,
  CompressOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTimer } from '../contexts/TimerContext';
import '../styles/EnhancedHierarchicalTaskTree.css';
import { UnifiedTaskNode } from '../types/UnifiedTaskNode';
import { useTaskHierarchy } from '../hooks/useTaskHierarchy';
import { 
  TaskHierarchyDisplayMode, 
  TaskSortMode, 
  TaskHierarchyFilter,
  NodeRenderConfig 
} from '../types/TaskHierarchy';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

interface TreeNodeData {
  key: string;
  title: React.ReactNode;
  icon?: React.ReactNode;
  children?: TreeNodeData[];
  isLeaf?: boolean;
  type: 'task';
  id: number;
  status?: string;
  parentId?: number;
  projectId?: number;
  priority?: string;
  assigneeId?: number;
  dueDate?: string;
  node: UnifiedTaskNode;
}

interface Props {
  projectId: number;
  rootTaskId?: number;
  enableVirtualScroll?: boolean;
  enableMultiSelect?: boolean;
  enableDragDrop?: boolean;
  displayMode?: TaskHierarchyDisplayMode;
  onTaskSelect?: (taskIds: number[]) => void;
  onTaskDoubleClick?: (taskId: number) => void;
  className?: string;
}

const EnhancedHierarchicalTaskTreeV2: React.FC<Props> = ({
  projectId,
  rootTaskId,
  enableVirtualScroll = false,
  enableMultiSelect = false,
  enableDragDrop = false,
  displayMode = TaskHierarchyDisplayMode.TREE,
  onTaskSelect,
  onTaskDoubleClick,
  className
}) => {
  const navigate = useNavigate();
  const { startTimer, stopTimer, timerState } = useTimer();
  
  // 状态管理
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [sortMode, setSortMode] = useState<TaskSortMode>(TaskSortMode.SORT_ORDER);
  const [filter, setFilter] = useState<TaskHierarchyFilter>({});
  
  // 自定义排序函数
  const customSortFn = useCallback((a: UnifiedTaskNode, b: UnifiedTaskNode) => {
    switch (sortMode) {
      case TaskSortMode.PRIORITY:
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
        return bPriority - aPriority;
      case TaskSortMode.STATUS:
        return a.status.localeCompare(b.status);
      case TaskSortMode.CREATED_AT:
        return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
      case TaskSortMode.UPDATED_AT:
        return new Date(b.updated_at || '').getTime() - new Date(a.updated_at || '').getTime();
      case TaskSortMode.DUE_DATE:
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      case TaskSortMode.SORT_ORDER:
      default:
        return a.sort_order - b.sort_order || a.id - b.id;
    }
  }, [sortMode]);

  // 使用统一的任务层级Hook
  const {
    childrenByParent,
    expanded,
    isLoading,
    loadingById,
    errorById,
    initialLoading,
    initialError,
    toggleExpanded,
    expandNode,
    collapseNode,
    loadChildren,
    refresh,
    clear,
    getChildren,
    hasChildren,
    isExpanded,
    isNodeLoading,
    getNodeError,
    expandAll,
    collapseAll
  } = useTaskHierarchy({
    projectId,
    rootTaskId,
    initialDepth: 3,
    pageSize: 500,
    enableLazyLoad: true,
    enableCache: true,
    includeExtended: true,
    apiVersion: 'v2',
    sortFn: customSortFn,
    onError: (error, context) => {
      console.error(`HierarchicalTaskTree Error in ${context}:`, error);
      message.error(`加载失败: ${error.message}`);
    }
  });

  // 获取状态配置
  const getStatusConfig = useCallback((status: string) => {
    const configs: Record<string, { color: string; icon: React.ReactNode; text: string }> = {
      todo: { color: '#d9d9d9', icon: <PauseCircleOutlined />, text: '待开始' },
      in_progress: { color: '#1890ff', icon: <PlayCircleOutlined />, text: '进行中' },
      completed: { color: '#52c41a', icon: <CheckCircleOutlined />, text: '已完成' },
      cancelled: { color: '#ff4d4f', icon: <ExclamationCircleOutlined />, text: '已取消' }
    };
    return configs[status] || configs.todo;
  }, []);

  // 获取优先级配置
  const getPriorityConfig = useCallback((priority?: string) => {
    const configs: Record<string, { color: string; text: string }> = {
      high: { color: 'red', text: '高' },
      medium: { color: 'orange', text: '中' },
      low: { color: 'green', text: '低' }
    };
    return configs[priority || 'low'];
  }, []);

  // 过滤节点
  const filterNodes = useCallback((nodes: UnifiedTaskNode[]): UnifiedTaskNode[] => {
    return nodes.filter(node => {
      // 关键词搜索
      if (searchValue && !node.title.toLowerCase().includes(searchValue.toLowerCase())) {
        return false;
      }
      
      // 状态过滤
      if (filter.statuses && filter.statuses.length > 0 && !filter.statuses.includes(node.status)) {
        return false;
      }
      
      // 优先级过滤
      if (filter.priorities && filter.priorities.length > 0 && !filter.priorities.includes(node.priority || 'low')) {
        return false;
      }
      
      // 负责人过滤
      if (filter.assigneeIds && filter.assigneeIds.length > 0 && !filter.assigneeIds.includes(node.assignee_id || 0)) {
        return false;
      }
      
      return true;
    });
  }, [searchValue, filter]);

  // 转换为Antd Tree数据结构
  const convertToTreeData = useCallback((nodes: UnifiedTaskNode[]): TreeNodeData[] => {
    const filteredNodes = filterNodes(nodes);
    
    return filteredNodes.map(node => {
      const statusConfig = getStatusConfig(node.status);
      const priorityConfig = getPriorityConfig(node.priority);
      const isTimerActive = timerState.isRunning && timerState.taskId === node.id;

      return {
        key: `task-${node.id}`,
        title: (
          <div className="tree-node-title" style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <Space size="small" style={{ flex: 1 }}>
              <FileTextOutlined style={{ color: '#1890ff' }} />
              <Text strong>{node.title}</Text>
              <Tag 
                color={statusConfig.color} 
                icon={statusConfig.icon} 
                style={{ fontSize: '12px', padding: '2px 6px' }}
              >
                {statusConfig.text}
              </Tag>
              <Tag 
                color={priorityConfig.color} 
                style={{ fontSize: '12px', padding: '2px 6px' }}
              >
                {priorityConfig.text}
              </Tag>
              {isTimerActive && (
                <Badge 
                  status="processing" 
                  text={<Text type="secondary">计时中</Text>}
                />
              )}
              {node.due_date && (
                <Tag 
                  color={new Date(node.due_date) < new Date() ? 'red' : 'blue'}
                  style={{ fontSize: '12px', padding: '2px 6px' }}
                  icon={<ClockCircleOutlined />}
                >
                  {new Date(node.due_date).toLocaleDateString()}
                </Tag>
              )}
            </Space>
            
            <Space size="small">
              <Tooltip title="开始/停止计时">
                <Button
                  type="text"
                  size="small"
                  icon={isTimerActive ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isTimerActive) {
                      stopTimer();
                    } else {
                      startTimer(node.id, node.title);
                    }
                  }}
                />
              </Tooltip>
              
              <Tooltip title="查看详情">
                <Button
                  type="text"
                  size="small"
                  icon={<FileTextOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/projects/${projectId}/tasks/${node.id}`);
                  }}
                />
              </Tooltip>
            </Space>
          </div>
        ),
        icon: statusConfig.icon,
        isLeaf: !node.has_children,
        type: 'task' as const,
        id: node.id,
        status: node.status,
        parentId: node.parent_id || undefined,
        projectId: node.project_id,
        priority: node.priority,
        assigneeId: node.assignee_id || undefined,
        dueDate: node.due_date || undefined,
        node
      };
    });
  }, [
    filterNodes,
    getStatusConfig,
    getPriorityConfig,
    timerState,
    navigate,
    projectId,
    startTimer,
    stopTimer
  ]);

  // 构建完整的树数据
  const buildTreeData = useCallback((parentId?: number): TreeNodeData[] => {
    const children = getChildren(parentId || rootTaskId || 0);
    if (!children || children.length === 0) return [];
    
    const treeNodes = convertToTreeData(children);
    
    return treeNodes.map(node => ({
      ...node,
      children: node.node.has_children ? buildTreeData(node.id) : undefined
    }));
  }, [getChildren, rootTaskId, convertToTreeData]);

  const treeData = useMemo(() => {
    return buildTreeData();
  }, [buildTreeData]);

  // 处理节点选择
  const handleSelect = useCallback((selectedKeys: React.Key[], info: any) => {
    const keys = selectedKeys as string[];
    setSelectedKeys(keys);
    
    const taskIds = keys.map(key => {
      const match = key.toString().match(/^task-(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    }).filter(id => id > 0);
    
    onTaskSelect?.(taskIds);
  }, [onTaskSelect]);

  // 处理节点展开
  const handleExpand = useCallback((expandedKeys: React.Key[]) => {
    setExpandedKeys(expandedKeys as string[]);
    
    // 同步到useTaskHierarchy的展开状态
    expandedKeys.forEach(key => {
      const match = key.toString().match(/^task-(\d+)$/);
      if (match) {
        const taskId = parseInt(match[1], 10);
        if (!isExpanded(taskId)) {
          expandNode(taskId);
        }
      }
    });
  }, [expandNode, isExpanded]);

  // 处理双击
  const handleDoubleClick = useCallback((e: React.MouseEvent, node: any) => {
    const taskId = node.id;
    onTaskDoubleClick?.(taskId);
  }, [onTaskDoubleClick]);

  // 处理搜索
  const handleSearch = useCallback((value: string) => {
    setSearchValue(value);
  }, []);

  // 处理排序
  const handleSortChange = useCallback((value: TaskSortMode) => {
    setSortMode(value);
  }, []);

  // 处理过滤
  const handleFilterChange = useCallback((newFilter: Partial<TaskHierarchyFilter>) => {
    setFilter(prev => ({ ...prev, ...newFilter }));
  }, []);

  // 渲染内容
  if (initialLoading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">加载任务数据中...</Text>
          </div>
        </div>
      </Card>
    );
  }

  if (initialError) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <ExclamationCircleOutlined style={{ fontSize: 48, color: '#ff4d4f', marginBottom: 16 }} />
          <div>
            <Text type="danger">加载失败: {initialError}</Text>
          </div>
          <Button 
            type="primary" 
            icon={<ReloadOutlined />}
            onClick={refresh}
            style={{ marginTop: 16 }}
          >
            重新加载
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      className={className}
      title={
        <Space>
          <BranchesOutlined />
          <span>任务层级结构</span>
          <Badge count={treeData.length} showZero />
        </Space>
      }
      extra={
        <Space>
          <Button
            size="small"
            icon={<ExpandOutlined />}
            onClick={expandAll}
            disabled={isLoading}
          >
            全部展开
          </Button>
          <Button
            size="small"
            icon={<CompressOutlined />}
            onClick={collapseAll}
            disabled={isLoading}
          >
            全部收起
          </Button>
          <Button
            type="primary"
            size="small"
            icon={<ReloadOutlined />}
            loading={isLoading}
            onClick={refresh}
          >
            刷新
          </Button>
        </Space>
      }
    >
      {/* 搜索和过滤工具栏 */}
      <div style={{ marginBottom: 16 }}>
        <Space wrap>
          <Search
            placeholder="搜索任务..."
            allowClear
            style={{ width: 200 }}
            onSearch={handleSearch}
            onChange={(e) => setSearchValue(e.target.value)}
            prefix={<SearchOutlined />}
          />
          
          <Select
            value={sortMode}
            onChange={handleSortChange}
            style={{ width: 120 }}
            size="small"
          >
            <Option value={TaskSortMode.SORT_ORDER}>默认排序</Option>
            <Option value={TaskSortMode.PRIORITY}>优先级</Option>
            <Option value={TaskSortMode.STATUS}>状态</Option>
            <Option value={TaskSortMode.DUE_DATE}>截止时间</Option>
            <Option value={TaskSortMode.UPDATED_AT}>更新时间</Option>
          </Select>
          
          <Dropdown
            menu={{
              items: [
                {
                  key: 'status',
                  label: '状态过滤',
                  children: [
                    { key: 'todo', label: '待开始' },
                    { key: 'in_progress', label: '进行中' },
                    { key: 'completed', label: '已完成' },
                    { key: 'cancelled', label: '已取消' }
                  ]
                },
                {
                  key: 'priority',
                  label: '优先级过滤',
                  children: [
                    { key: 'high', label: '高优先级' },
                    { key: 'medium', label: '中优先级' },
                    { key: 'low', label: '低优先级' }
                  ]
                }
              ]
            }}
            trigger={['click']}
          >
            <Button size="small" icon={<FilterOutlined />}>
              过滤
            </Button>
          </Dropdown>
        </Space>
      </div>

      {/* 树形结构 */}
      {treeData.length === 0 ? (
        <Empty
          image={<InboxOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
          description="暂无任务数据"
        />
      ) : (
        <Tree
          treeData={treeData}
          selectedKeys={selectedKeys}
          expandedKeys={expandedKeys}
          multiple={enableMultiSelect}
          showLine={{ showLeafIcon: false }}
          showIcon
          virtual={enableVirtualScroll}
          height={enableVirtualScroll ? 400 : undefined}
          onSelect={handleSelect}
          onExpand={handleExpand}
          switcherIcon={({ expanded }) => 
            expanded ? <CaretDownOutlined /> : <CaretRightOutlined />
          }
        />
      )}
    </Card>
  );
};

export default EnhancedHierarchicalTaskTreeV2;