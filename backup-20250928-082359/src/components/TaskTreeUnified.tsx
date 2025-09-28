/**
 * Unified Task Tree Component
 * 统一的任务树组件，可用于多种场景
 */

import React, { useCallback, useMemo } from 'react';
import { Tree, Empty, Spin, Button, Space, Tooltip, Tag } from 'antd';
import { 
  FileTextOutlined,
  FolderOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  UserOutlined,
  CalendarOutlined,
  BranchesOutlined,
  ExpandOutlined,
  CompressOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { UnifiedTaskNode } from '../types/UnifiedTaskNode';
import { useTaskHierarchy } from '../hooks/useTaskHierarchy';
import { TaskHierarchyProps, TaskHierarchyDisplayMode } from '../types/TaskHierarchy';

// 简化的Props接口
interface TaskTreeUnifiedProps {
  projectId: number;
  rootTaskId?: number;
  height?: number;
  showToolbar?: boolean;
  showIcons?: boolean;
  showStatus?: boolean;
  showPriority?: boolean;
  showAssignee?: boolean;
  showDueDate?: boolean;
  enableVirtualScroll?: boolean;
  enableMultiSelect?: boolean;
  maxDepth?: number;
  className?: string;
  style?: React.CSSProperties;
  onNodeClick?: (node: UnifiedTaskNode) => void;
  onNodeDoubleClick?: (node: UnifiedTaskNode) => void;
  onSelectionChange?: (selectedNodes: UnifiedTaskNode[]) => void;
}

interface TreeNodeData {
  key: string;
  title: React.ReactNode;
  icon?: React.ReactNode;
  children?: TreeNodeData[];
  isLeaf: boolean;
  node: UnifiedTaskNode;
}

export const TaskTreeUnified: React.FC<TaskTreeUnifiedProps> = ({
  projectId,
  rootTaskId,
  height = 400,
  showToolbar = true,
  showIcons = true,
  showStatus = true,
  showPriority = true,
  showAssignee = true,
  showDueDate = true,
  enableVirtualScroll = true,
  enableMultiSelect = false,
  maxDepth = 5,
  className,
  style,
  onNodeClick,
  onNodeDoubleClick,
  onSelectionChange
}) => {
  // 使用统一的任务层级Hook
  const {
    childrenByParent,
    expanded,
    isLoading,
    initialLoading,
    initialError,
    toggleExpanded,
    refresh,
    getChildren,
    isExpanded,
    expandAll,
    collapseAll
  } = useTaskHierarchy({
    projectId,
    rootTaskId,
    initialDepth: 3,
    pageSize: 1000,
    enableLazyLoad: true,
    enableCache: true,
    includeExtended: true,
    apiVersion: 'v2'
  });

  // 状态配置
  const getStatusConfig = useCallback((status: string) => {
    const configs: Record<string, { color: string; icon: React.ReactNode; text: string }> = {
      todo: { color: 'default', icon: <PauseCircleOutlined />, text: '待开始' },
      in_progress: { color: 'blue', icon: <PlayCircleOutlined />, text: '进行中' },
      completed: { color: 'green', icon: <CheckCircleOutlined />, text: '已完成' },
      cancelled: { color: 'red', icon: <StopOutlined />, text: '已取消' }
    };
    return configs[status] || configs.todo;
  }, []);

  // 优先级配置
  const getPriorityConfig = useCallback((priority?: string) => {
    const configs: Record<string, { color: string; text: string }> = {
      high: { color: 'red', text: '高' },
      medium: { color: 'orange', text: '中' },
      low: { color: 'green', text: '低' }
    };
    return configs[priority || 'low'];
  }, []);

  // 转换节点数据
  const convertNode = useCallback((node: UnifiedTaskNode, depth: number = 0): TreeNodeData => {
    const statusConfig = getStatusConfig(node.status);
    const priorityConfig = getPriorityConfig(node.priority);
    
    // 构建标题
    const titleElements: React.ReactNode[] = [];
    
    // 节点图标
    if (showIcons) {
      titleElements.push(
        <span key="icon" style={{ marginRight: 8 }}>
          {node.has_children ? (
            <FolderOutlined style={{ color: '#1890ff' }} />
          ) : (
            <FileTextOutlined style={{ color: '#52c41a' }} />
          )}
        </span>
      );
    }
    
    // 节点标题
    titleElements.push(
      <span key="title" style={{ fontWeight: node.has_children ? 'bold' : 'normal' }}>
        {node.title}
      </span>
    );
    
    // 状态标签
    if (showStatus) {
      titleElements.push(
        <Tag 
          key="status"
          color={statusConfig.color}
          icon={statusConfig.icon}
          style={{ marginLeft: 8, fontSize: '12px', padding: '2px 6px' }}
        >
          {statusConfig.text}
        </Tag>
      );
    }
    
    // 优先级标签
    if (showPriority && node.priority) {
      titleElements.push(
        <Tag 
          key="priority"
          color={priorityConfig.color}
          style={{ marginLeft: 4, fontSize: '12px', padding: '2px 6px' }}
        >
          {priorityConfig.text}
        </Tag>
      );
    }
    
    // 负责人
    if (showAssignee && node.assignee_name) {
      titleElements.push(
        <Tooltip key="assignee" title={`负责人: ${node.assignee_name}`}>
          <Tag 
            icon={<UserOutlined />} 
            style={{ marginLeft: 4, fontSize: '12px', padding: '2px 6px' }}
          >
            {node.assignee_name}
          </Tag>
        </Tooltip>
      );
    }
    
    // 截止日期
    if (showDueDate && node.due_date) {
      const isOverdue = dayjs(node.due_date).isBefore(dayjs(), 'day');
      titleElements.push(
        <Tooltip key="duedate" title={`截止日期: ${dayjs(node.due_date).format('YYYY-MM-DD')}`}>
          <Tag 
            color={isOverdue ? 'red' : 'blue'}
            icon={<CalendarOutlined />}
            style={{ marginLeft: 4, fontSize: '12px', padding: '2px 6px' }}
          >
            {dayjs(node.due_date).format('MM-DD')}
          </Tag>
        </Tooltip>
      );
    }

    return {
      key: `task-${node.id}`,
      title: (
        <div 
          style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          onClick={(e) => {
            e.stopPropagation();
            onNodeClick?.(node);
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            onNodeDoubleClick?.(node);
          }}
        >
          {titleElements}
        </div>
      ),
      icon: showIcons ? statusConfig.icon : undefined,
      isLeaf: !node.has_children,
      node,
      children: undefined // 将在buildTreeData中处理
    };
  }, [
    getStatusConfig,
    getPriorityConfig,
    showIcons,
    showStatus,
    showPriority,
    showAssignee,
    showDueDate,
    onNodeClick,
    onNodeDoubleClick
  ]);

  // 构建树数据
  const buildTreeData = useCallback((parentId?: number, currentDepth = 0): TreeNodeData[] => {
    if (currentDepth >= maxDepth) return [];
    
    const children = getChildren(parentId || rootTaskId || 0);
    if (!children || children.length === 0) return [];
    
    return children.map(node => {
      const treeNode = convertNode(node, currentDepth);
      
      // 递归构建子节点
      if (node.has_children && isExpanded(node.id) && currentDepth < maxDepth - 1) {
        treeNode.children = buildTreeData(node.id, currentDepth + 1);
      }
      
      return treeNode;
    });
  }, [getChildren, rootTaskId, maxDepth, convertNode, isExpanded]);

  // 生成树数据
  const treeData = useMemo(() => {
    return buildTreeData();
  }, [buildTreeData]);

  // 处理展开/收起
  const handleExpand = useCallback((expandedKeys: React.Key[]) => {
    expandedKeys.forEach(key => {
      const match = key.toString().match(/^task-(\d+)$/);
      if (match) {
        const taskId = parseInt(match[1], 10);
        if (!isExpanded(taskId)) {
          toggleExpanded(taskId);
        }
      }
    });
  }, [toggleExpanded, isExpanded]);

  // 处理选择
  const handleSelect = useCallback((selectedKeys: React.Key[], info: any) => {
    if (!enableMultiSelect && selectedKeys.length > 1) {
      selectedKeys = [selectedKeys[selectedKeys.length - 1]];
    }
    
    const selectedNodes = selectedKeys.map(key => {
      const match = key.toString().match(/^task-(\d+)$/);
      if (match) {
        const taskId = parseInt(match[1], 10);
        // 从树数据中找到对应的节点
        const findNode = (nodes: TreeNodeData[]): UnifiedTaskNode | null => {
          for (const node of nodes) {
            if (node.node.id === taskId) {
              return node.node;
            }
            if (node.children) {
              const found = findNode(node.children);
              if (found) return found;
            }
          }
          return null;
        };
        return findNode(treeData);
      }
      return null;
    }).filter(Boolean) as UnifiedTaskNode[];
    
    onSelectionChange?.(selectedNodes);
  }, [enableMultiSelect, treeData, onSelectionChange]);

  // 渲染加载状态
  if (initialLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', ...style }} className={className}>
        <Spin size="large" />
        <div style={{ marginTop: 16, color: '#999' }}>加载任务数据...</div>
      </div>
    );
  }

  // 渲染错误状态
  if (initialError) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', ...style }} className={className}>
        <div style={{ color: '#ff4d4f', marginBottom: 16 }}>
          加载失败: {initialError}
        </div>
        <Button 
          type="primary" 
          icon={<ReloadOutlined />}
          onClick={refresh}
        >
          重新加载
        </Button>
      </div>
    );
  }

  // 渲染空状态
  if (treeData.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', ...style }} className={className}>
        <Empty 
          description="暂无任务数据"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </div>
    );
  }

  return (
    <div style={style} className={className}>
      {/* 工具栏 */}
      {showToolbar && (
        <div style={{ 
          marginBottom: 16, 
          padding: '8px 12px',
          backgroundColor: '#fafafa',
          borderRadius: '6px',
          border: '1px solid #f0f0f0'
        }}>
          <Space>
            <Button
              
              icon={<ExpandOutlined />}
              onClick={expandAll}
              disabled={isLoading}
            >
              全部展开
            </Button>
            <Button
              
              icon={<CompressOutlined />}
              onClick={collapseAll}
              disabled={isLoading}
            >
              全部收起
            </Button>
            <Button
              type="primary"
              
              icon={<ReloadOutlined />}
              loading={isLoading}
              onClick={refresh}
            >
              刷新
            </Button>
          </Space>
        </div>
      )}

      {/* 树形结构 */}
      <Tree
        treeData={treeData}
        showLine={{ showLeafIcon: false }}
        showIcon={showIcons}
        multiple={enableMultiSelect}
        virtual={enableVirtualScroll}
        height={enableVirtualScroll ? height : undefined}
        onExpand={handleExpand}
        onSelect={handleSelect}
        expandedKeys={Array.from(expanded).map(id => `task-${id}`)}
        switcherIcon={<BranchesOutlined />}
      />
    </div>
  );
};

export default TaskTreeUnified;