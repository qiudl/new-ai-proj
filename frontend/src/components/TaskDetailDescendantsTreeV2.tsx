/**
 * Refactored Task Detail Descendants Tree Component
 * 使用统一的 useTaskHierarchy Hook 重构的任务后代树组件
 */

import React, { forwardRef, useImperativeHandle } from 'react';
import { Tag, Tooltip, Avatar, Dropdown, Button, Spin, Space } from 'antd';
import { 
  PauseCircleOutlined, 
  PlayCircleOutlined, 
  CheckCircleOutlined, 
  StopOutlined, 
  CalendarOutlined, 
  UserOutlined, 
  BranchesOutlined, 
  EllipsisOutlined, 
  FileTextOutlined, 
  EditOutlined, 
  PlusOutlined, 
  ReloadOutlined, 
  WarningOutlined 
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import '../styles/TaskDescendantsTree.css';
import LoadingIndicator from './LoadingIndicator';
import { UpdateAnimation } from './AnimatedContainer';
import { useRefreshConfig } from '../contexts/RefreshConfigContext';
import { UnifiedTaskNode } from '../types/UnifiedTaskNode';
import { useTaskHierarchy } from '../hooks/useTaskHierarchy';
import { cacheEventSystem, CacheEvent } from '../utils/cacheEventSystem';
import { TaskHierarchyDisplayMode, NodeRenderConfig } from '../types/TaskHierarchy';

export interface TaskDetailDescendantsTreeRef {
  refresh: () => Promise<void>;
  updateData: (data: UnifiedTaskNode[]) => void;
  smartInvalidateNode: (nodeId: number, changeType?: 'create' | 'update' | 'delete') => Promise<void>;
}

interface Props {
  projectId: number;
  rootTaskId: number;
  limit?: number;
  displayMode?: TaskHierarchyDisplayMode;
  enableLazyLoad?: boolean;
  enableCache?: boolean;
  onNodeClick?: (node: UnifiedTaskNode) => void;
  onNodeDoubleClick?: (node: UnifiedTaskNode) => void;
  // 增强缓存功能
  useEnhancedCache?: boolean;
  onCacheEvent?: (event: CacheEvent) => void;
  enablePerformanceMonitoring?: boolean;
}

// 状态配置映射
const getStatusConfig = (status: string) => {
  const configs: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
    todo: { color: '#d9d9d9', text: '待开始', icon: <PauseCircleOutlined /> },
    in_progress: { color: '#1890ff', text: '进行中', icon: <PlayCircleOutlined /> },
    completed: { color: '#52c41a', text: '已完成', icon: <CheckCircleOutlined /> },
    cancelled: { color: '#ff4d4f', text: '已取消', icon: <StopOutlined /> },
  };
  return configs[status] || configs.todo;
};

// 节点渲染配置
const createRenderConfig = (navigate: (path: string) => void): NodeRenderConfig => ({
  showIcon: true,
  showStatus: true,
  showAssignee: false,
  showDueDate: true,
  showActions: true,
  
  taskIdRender: (node: UnifiedTaskNode) => (
    <Tag 
      color="blue" 
      style={{ marginRight: 8, fontSize: '12px', minWidth: '50px', textAlign: 'center' }}
    >
      #{node.id}
    </Tag>
  ),
  
  iconRender: (node: UnifiedTaskNode) => (
    <FileTextOutlined style={{ color: '#1890ff', marginRight: 8 }} />
  ),
  
  statusRender: (node: UnifiedTaskNode) => {
    const config = getStatusConfig(node.status);
    return (
      <Tag 
        color={config.color} 
        icon={config.icon}
        style={{ marginRight: 8 }}
      >
        {config.text}
      </Tag>
    );
  },
  
  assigneeRender: (node: UnifiedTaskNode) => {
    if (!node.assignee_name && !node.assignee_id) return null;
    return (
      <Tooltip title={node.assignee_name || `用户 ${node.assignee_id}`}>
        <Avatar 
           
          icon={<UserOutlined />} 
          style={{ marginRight: 8 }}
        />
      </Tooltip>
    );
  },
  
  dueDateRender: (node: UnifiedTaskNode) => {
    if (!node.due_date) return null;
    const isOverdue = dayjs(node.due_date).isBefore(dayjs(), 'day');
    return (
      <Tooltip title={`截止日期: ${dayjs(node.due_date).format('YYYY-MM-DD')}`}>
        <Tag 
          color={isOverdue ? 'red' : 'blue'}
          icon={<CalendarOutlined />}
          style={{ marginLeft: 8 }}
        >
          {dayjs(node.due_date).format('MM-DD')}
        </Tag>
      </Tooltip>
    );
  },
  
  actionsRender: (node: UnifiedTaskNode) => (
    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
      
      <Dropdown
        menu={{
          items: [
            {
              key: 'add-child',
              label: '添加子任务',
              icon: <PlusOutlined />
            },
            {
              key: 'edit',
              label: '编辑任务',
              icon: <EditOutlined />
            }
          ]
        }}
        trigger={['click']}
      >
        <Button
          type="text"
          
          icon={<EllipsisOutlined />}
          onClick={(e) => e.stopPropagation()}
        />
      </Dropdown>
    </div>
  ),
  
  titleRender: (node: UnifiedTaskNode) => (
    <span style={{ fontWeight: node.has_children ? 'bold' : 'normal' }}>
      {node.title}
    </span>
  )
});

export const TaskDetailDescendantsTreeV2 = forwardRef<TaskDetailDescendantsTreeRef, Props>(({
  projectId,
  rootTaskId,
  limit = 200,
  displayMode = TaskHierarchyDisplayMode.TREE,
  enableLazyLoad = true,
  enableCache = true,
  onNodeClick,
  onNodeDoubleClick,
  useEnhancedCache = false,
  onCacheEvent,
  enablePerformanceMonitoring = false
}, ref) => {
  const navigate = useNavigate();
  const { config: refreshConfig } = useRefreshConfig();
  
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
    collapseAll,
    smartInvalidateNode,
    getCacheStats
  } = useTaskHierarchy({
    projectId,
    rootTaskId,
    initialDepth: 2,
    pageSize: limit,
    enableLazyLoad,
    enableCache,
    includeExtended: true,
    apiVersion: 'v2',
    useEnhancedCache,
    onError: (error, context) => {
      console.error(`TaskHierarchy Error in ${context}:`, error);
    },
    onDataChange: (data) => {
      // 可以在这里处理数据变更事件
      if (enablePerformanceMonitoring) {
        console.log('Task hierarchy data updated:', {
          totalNodes: Array.from(data.values()).reduce((sum, nodes) => sum + nodes.length, 0),
          cacheStats: getCacheStats ? getCacheStats() : null
        });
      }
    },
    onCacheEvent: (event) => {
      if (onCacheEvent) {
        onCacheEvent(event);
      }
      
      if (enablePerformanceMonitoring) {
        // 记录性能指标
        cacheEventSystem.emit({
          ...event,
          source: 'TaskDetailDescendantsTreeV2'
        });
      }
    }
  });

  // 节点渲染配置
  const renderConfig = React.useMemo(
    () => createRenderConfig(navigate),
    [navigate]
  );

  // 向外暴露刷新方法
  useImperativeHandle(ref, () => ({
    refresh,
    updateData: (data: UnifiedTaskNode[]) => {
      // 处理外部数据更新
      console.log('Received external data update:', data.length, 'nodes');
      // 触发刷新以重新同步
      refresh();
    },
    smartInvalidateNode: async (nodeId: number, changeType: 'create' | 'update' | 'delete' = 'update') => {
      if (smartInvalidateNode) {
        await smartInvalidateNode(nodeId, changeType);
      } else {
        // 降级到普通刷新
        await refresh();
      }
    }
  }), [refresh, smartInvalidateNode]);

  // 处理节点点击
  const handleNodeClick = React.useCallback((node: UnifiedTaskNode, event: React.MouseEvent) => {
    event.preventDefault();
    
    if (onNodeClick) {
      onNodeClick(node);
    } else {
      navigate(`/projects/${projectId}/tasks/${node.id}`);
    }
  }, [navigate, projectId, onNodeClick]);

  // 处理节点双击
  const handleNodeDoubleClick = React.useCallback((node: UnifiedTaskNode, event: React.MouseEvent) => {
    event.preventDefault();
    
    if (onNodeDoubleClick) {
      onNodeDoubleClick(node);
    } else if (node.has_children) {
      toggleExpanded(node.id);
    }
  }, [toggleExpanded, onNodeDoubleClick]);

  // 处理展开/收起
  const handleToggleExpand = React.useCallback((node: UnifiedTaskNode, event: React.MouseEvent) => {
    event.stopPropagation();
    toggleExpanded(node.id);
  }, [toggleExpanded]);

  // 渲染单个节点
  const renderNode = React.useCallback((node: UnifiedTaskNode, depth: number = 0): React.ReactNode => {
    const children = getChildren(node.id);
    const hasChildNodes = node.has_children || (children && children.length > 0);
    const isNodeExpanded = isExpanded(node.id);
    const isLoading = isNodeLoading(node.id);
    const error = getNodeError(node.id);

    return (
      <div key={node.id} style={{ marginLeft: depth * 20 }}>
        <div
          className="task-node"
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            backgroundColor: '#fff',
            border: '1px solid #f0f0f0',
            marginBottom: '4px'
          }}
          onClick={(e) => handleNodeClick(node, e)}
          onDoubleClick={(e) => handleNodeDoubleClick(node, e)}
        >
          {/* 展开/收起按钮 */}
          {hasChildNodes && (
            <Button
              type="text"
              
              icon={isNodeExpanded ? <BranchesOutlined rotate={90} /> : <BranchesOutlined />}
              onClick={(e) => handleToggleExpand(node, e)}
              loading={isLoading}
              style={{ marginRight: 8 }}
            />
          )}

          {/* 任务ID */}
          {renderConfig.taskIdRender?.(node)}

          {/* 节点图标
          {renderConfig.iconRender?.(node)} */}

          {/* 节点标题 */}
          {renderConfig.titleRender?.(node)}

          {/* 状态标签 */}
          {renderConfig.showStatus && renderConfig.statusRender?.(node)}

          {/* 负责人 */}
          {renderConfig.showAssignee && renderConfig.assigneeRender?.(node)}

          {/* 截止日期 */}
          {renderConfig.showDueDate && renderConfig.dueDateRender?.(node)}

          {/* 操作按钮 */}
          {renderConfig.showActions && renderConfig.actionsRender?.(node)}
        </div>

        {/* 错误提示 */}
        {error && (
          <div style={{ marginLeft: 20, padding: '4px 8px' }}>
            <Tag color="red" icon={<WarningOutlined />}>
              {error}
            </Tag>
          </div>
        )}

        {/* 子节点 */}
        {isNodeExpanded && children && (
          <div
            className="task-children-container"
            style={{
              marginLeft: 20,
              animation: 'fadeIn 0.2s ease-in-out'
            }}
          >
            {children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }, [
    getChildren,
    isExpanded,
    isNodeLoading,
    getNodeError,
    handleNodeClick,
    handleNodeDoubleClick,
    handleToggleExpand,
    renderConfig
  ]);

  // 渲染树结构
  const renderTree = React.useCallback(() => {
    const rootChildren = getChildren(rootTaskId);
    
    if (!rootChildren || rootChildren.length === 0) {
      if (initialLoading) {
        return (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <LoadingIndicator loading={true} tip="加载任务数据中..." />
          </div>
        );
      }
      
      if (initialError) {
        return (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <Tag color="red" icon={<WarningOutlined />}>
              {initialError}
            </Tag>
            <br />
            <Button 
              type="primary" 
              icon={<ReloadOutlined />}
              onClick={refresh}
              style={{ marginTop: 16 }}
            >
              重试
            </Button>
          </div>
        );
      }

      return (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
          暂无子任务
        </div>
      );
    }

    return (
      <div className="task-descendants-tree">
        {rootChildren.map(node => renderNode(node))}
      </div>
    );
  }, [rootTaskId, getChildren, initialLoading, initialError, renderNode, refresh]);

  const rootChildren = getChildren(rootTaskId);
  const hasSubtasks = rootChildren && rootChildren.length > 0;

  return (
    <div className="task-detail-descendants-tree-v2" style={{ padding: '16px' }}>
      <style>
        {`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .task-children-container {
            will-change: opacity, transform;
          }
        `}
      </style>

      {/* 工具栏 - 只在有子任务时显示 */}
      {hasSubtasks && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '16px',
          padding: '8px 12px',
          backgroundColor: '#f5f5f5',
          borderRadius: '6px'
        }}>
          <div>
            <Space.Compact>
              <Button
                icon={<BranchesOutlined />}
                onClick={expandAll}
              >
                全部展开
              </Button>
              <Button
                icon={<BranchesOutlined rotate={90} />}
                onClick={collapseAll}
              >
                全部收起
              </Button>
            </Space.Compact>
          </div>
          
          <div>
            <Button
              type="primary"
              
              icon={<ReloadOutlined />}
              onClick={refresh}
              loading={isLoading}
            >
              刷新
            </Button>
          </div>
        </div>
      )}

      {/* 树形结构 */}
      <UpdateAnimation updateTrigger={childrenByParent.size}>
        {renderTree()}
      </UpdateAnimation>
    </div>
  );
});

export default TaskDetailDescendantsTreeV2;