import React from 'react';
import { fetchTaskDescendants } from '../services/taskService';
import { Tag, Tooltip, Avatar, Dropdown, Button, Spin } from 'antd';
import { PauseCircleOutlined, PlayCircleOutlined, CheckCircleOutlined, StopOutlined, CalendarOutlined, UserOutlined, BranchesOutlined, EllipsisOutlined, FileTextOutlined, EditOutlined, PlusOutlined, ReloadOutlined, WarningOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import '../styles/TaskDescendantsTree.css';
import { useAutoRefreshOptimized } from '../hooks/useAutoRefreshOptimized';
import LoadingIndicator from './LoadingIndicator';
import AnimatedContainer, { UpdateAnimation } from './AnimatedContainer';
import { useRefreshConfig } from '../contexts/RefreshConfigContext';

type Node = {
  id: number;
  parent_id: number;
  title: string;
  status: string;
  level: number;
  has_children: boolean;
  sort_order: number;
  // Optional fields when backend provides them
  assignee_id?: number | null;
  assignee_name?: string | null;
  due_date?: string | null;
  priority?: 'low' | 'medium' | 'high' | string;
  children_count?: number;
  progress_percent?: number; // 0-100
};

type Props = { projectId: number; rootTaskId: number; limit?: number };

const getStatusConfig = (status: string) => {
  const configs: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
    todo: { color: '#d9d9d9', text: '待开始', icon: <PauseCircleOutlined /> },
    in_progress: { color: '#1890ff', text: '进行中', icon: <PlayCircleOutlined /> },
    completed: { color: '#52c41a', text: '已完成', icon: <CheckCircleOutlined /> },
    cancelled: { color: '#ff4d4f', text: '已取消', icon: <StopOutlined /> },
  };
  return configs[status] || configs.todo;
};

export const TaskDetailDescendantsTree: React.FC<Props> = ({ projectId, rootTaskId, limit = 200 }) => {
  const navigate = useNavigate();
  
  // 获取刷新配置（位于 RefreshConfigProvider 内，因此可直接读取）
  const { config: refreshConfig } = useRefreshConfig();
  const [childrenByParent, setChildrenByParent] = React.useState<Map<number, Node[]>>(new Map());
  const [expanded, setExpanded] = React.useState<Set<number>>(new Set());
  const [loadingById, setLoadingById] = React.useState<Record<number, boolean>>({});
  const [errorById, setErrorById] = React.useState<Record<number, string | undefined>>({});
  const [initialLoading, setInitialLoading] = React.useState<boolean>(false);
  const [initialError, setInitialError] = React.useState<string | null>(null);
  
  // 使用 useRef 来存储是否已经初始化，避免重复初始化
  const isInitializedRef = React.useRef(false);
  const prevPropsRef = React.useRef({ projectId, rootTaskId, limit });

  // Memoize context to avoid recreating a new object each render, which would retrigger auto-refresh effects
  const autoRefreshContext = React.useMemo(() => ({
    component: 'TaskDetailDescendantsTree',
    section: 'taskTree',
    rootTaskId,
    projectId
  }), [rootTaskId, projectId]);

  // 固定依赖数组引用，避免 useAutoRefreshOptimized 因依赖数组引用变化而重复触发
  const refreshDeps = React.useMemo<React.DependencyList>(() => {
    const deps = [projectId, rootTaskId, limit];
    // 只有当依赖真正变化时才返回新数组
    const prev = prevPropsRef.current;
    if (prev.projectId === projectId && prev.rootTaskId === rootTaskId && prev.limit === limit) {
      return prevPropsRef.current.deps || deps;
    }
    prevPropsRef.current = { projectId, rootTaskId, limit, deps };
    return deps;
  }, [projectId, rootTaskId, limit]);

  const setNodeLoading = (id: number, val: boolean) => setLoadingById(prev => ({ ...prev, [id]: val }));
  const setNodeError = (id: number, msg?: string) => setErrorById(prev => ({ ...prev, [id]: msg }));

  const sortNodes = React.useCallback((arr: Node[]) => {
    return [...arr].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  }, []);

  // 加载子任务的函数（用于自动刷新）
  const loadRootChildren = React.useCallback(async () => {
    const json = await fetchTaskDescendants(projectId, rootTaskId, { depth: 1, limit });
    const data = (json?.data?.data ?? []) as Node[];
    const children = data.filter(n => n.parent_id === rootTaskId);
    
    setChildrenByParent(prev => {
      const next = new Map(prev);
      next.set(rootTaskId, sortNodes(children));
      return next;
    });
    
    return children;
  }, [projectId, rootTaskId, limit, sortNodes]);

  // 暂时禁用自动刷新避免无限循环，改为手动刷新
  const [isTreeRefreshing, setIsTreeRefreshing] = React.useState(false);
  const [treeRefreshError, setTreeRefreshError] = React.useState<Error | null>(null);
  
  const refreshTree = React.useCallback(async () => {
    if (isTreeRefreshing) return;
    
    setIsTreeRefreshing(true);
    setTreeRefreshError(null);
    
    try {
      await loadRootChildren();
    } catch (error) {
      setTreeRefreshError(error as Error);
      console.error('手动刷新失败:', error);
    } finally {
      setIsTreeRefreshing(false);
    }
  }, [loadRootChildren, isTreeRefreshing]);
  
  // 提供清理函数给父组件
  const cleanupTree = React.useCallback(() => {
    setIsTreeRefreshing(false);
    setTreeRefreshError(null);
  }, []);
  
  // 模拟自动刷新的返回值，但不实际启用自动刷新
  const treeRefreshType = 'manual';
  const treeRefreshStartTime = undefined;
  const treeLastUpdate = undefined;
  const treeNextUpdate = undefined;
  const treeStats = null;
  const treeMemoryStats = null;

  const loadChildren = React.useCallback(async (parentId: number) => {
    if (childrenByParent.has(parentId)) return;
    setNodeLoading(parentId, true);
    setNodeError(parentId, undefined);
    try {
      const json = await fetchTaskDescendants(projectId, parentId, { depth: 1, limit });
      const data = (json?.data?.data ?? []) as Node[];
      const children = data.filter(n => n.parent_id === parentId);
      setChildrenByParent(prev => {
        const next = new Map(prev);
        next.set(parentId, sortNodes(children));
        return next;
      });
    } catch (e: any) {
      setNodeError(parentId, e?.message || '加载失败');
    } finally {
      setNodeLoading(parentId, false);
    }
  }, [childrenByParent, projectId, limit, sortNodes]);

  // 组件卸载清理
  React.useEffect(() => {
    return () => {
      try {
        cleanupTree?.();
      } catch (error) {
        console.warn('Failed to cleanup task tree:', error);
      }
    };
  }, [cleanupTree]);

  // initial load root children - 使用 ref 确保只初始化一次
  React.useEffect(() => {
    const currentKey = `${projectId}-${rootTaskId}-${limit}`;
    const lastKey = prevPropsRef.current.lastKey;
    
    // 如果已经初始化过相同的参数，跳过
    if (isInitializedRef.current && lastKey === currentKey) {
      return;
    }
    
    let mounted = true;
    isInitializedRef.current = true;
    prevPropsRef.current.lastKey = currentKey;
    
    setChildrenByParent(new Map());
    setExpanded(new Set());
    setInitialLoading(true);
    setInitialError(null);
    
    (async () => {
      try {
        const json = await fetchTaskDescendants(projectId, rootTaskId, { depth: 1, limit });
        if (!mounted) return;
        const data = (json?.data?.data ?? []) as Node[];
        const children = data.filter(n => n.parent_id === rootTaskId);
        setChildrenByParent(new Map([[rootTaskId, sortNodes(children)]]));
      } catch (e: any) {
        if (!mounted) return;
        setInitialError(e?.message || '加载失败');
      } finally {
        if (!mounted) return;
        setInitialLoading(false);
      }
    })();
    
    return () => { 
      mounted = false;
    };
  }, [projectId, rootTaskId, limit, sortNodes]);
  
  // 当关键参数真正变化时，重置初始化标志
  React.useEffect(() => {
    const currentKey = `${projectId}-${rootTaskId}-${limit}`;
    const lastKey = prevPropsRef.current.lastKey;
    if (lastKey && lastKey !== currentKey) {
      isInitializedRef.current = false;
    }
  }, [projectId, rootTaskId, limit]);

  const toggleExpand = async (node: Node) => {
    const isExpanded = expanded.has(node.id);
    if (isExpanded) {
      const next = new Set(expanded);
      next.delete(node.id);
      setExpanded(next);
      return;
    }
    // expanding
    if (!childrenByParent.has(node.id) && node.has_children) {
      await loadChildren(node.id);
    }
    const next = new Set(expanded);
    next.add(node.id);
    setExpanded(next);
  };

  const renderChildren = (parentId: number, depth = 0) => {
    const children = childrenByParent.get(parentId) ?? [];
    if (!children.length) return null;
    return (
      <div className="tdt-children">
        {children.map((child) => {
          const isExpanded = expanded.has(child.id);
          const isLoading = !!loadingById[child.id];
          const err = errorById[child.id];
          return (
            <AnimatedContainer
              key={child.id}
              type="slide"
              direction="up"
              duration="fast"
              visible={true}
              delay={0}
            >
              <UpdateAnimation
                updateTrigger={`${child.status}-${child.title}-${child.progress_percent || 0}`}
                type="highlight"
                duration="fast"
              >
                <div className="tdt-node" style={{ paddingLeft: depth * 16 }}>
                  <div className="tdt-row">
                {child.has_children ? (
                  <button
                    className="tdt-toggle"
                    aria-label={isExpanded ? '折叠' : '展开'}
                    onClick={() => toggleExpand(child)}
                    disabled={isLoading}
                  >
                    {isExpanded ? '▾' : '▸'}
                  </button>
                ) : (
                  <span className="tdt-spacer" />
                )}
                <span className="tdt-id">#${child.id}</span>
                <span
                  className="tdt-title tdt-title-link"
                  title={child.title}
                  onClick={() => navigate(`/projects/${projectId}/tasks/${child.id}`)}
                >
                  {child.title}
                </span>
                {/* meta cluster: priority, due date, assignee, children count, progress */}
                <span className="tdt-meta">
                  {/* priority */}
                  {child.priority && (
                    <Tooltip title={`优先级：${child.priority === 'high' ? '高' : child.priority === 'medium' ? '中' : child.priority === 'low' ? '低' : child.priority}`}>
                      <Tag className="tdt-priority-tag" color={child.priority === 'high' ? 'red' : child.priority === 'medium' ? 'orange' : 'green'} style={{ marginRight: 4 }}>
                        {child.priority === 'high' ? '高' : child.priority === 'medium' ? '中' : '低'}
                      </Tag>
                    </Tooltip>
                  )}
                  {/* due date */}
                  {child.due_date && (
                    <Tooltip
                      title={(() => {
                        const due = dayjs(child.due_date);
                        const now = dayjs();
                        const diff = due.diff(now, 'day');
                        const text = diff < 0 ? `已逾期 ${Math.abs(diff)} 天` : diff === 0 ? '今天到期' : `${diff} 天后到期`;
                        return (
                          <div>
                            <div>截止：{due.format('YYYY-MM-DD')}</div>
                            <div style={{ color: diff < 0 ? '#ff4d4f' : diff <= 3 ? '#fa8c16' : '#8c8c8c' }}>{text}</div>
                          </div>
                        );
                      })()}
                    >
                      <span className="tdt-due" style={{ color: (() => {
                        const now = dayjs();
                        const due = dayjs(child.due_date);
                        const diff = due.diff(now, 'day');
                        return diff < 0 ? '#ff4d4f' : diff <= 3 ? '#fa8c16' : '#8c8c8c';
                      })() }}>
                        <CalendarOutlined />
                      </span>
                    </Tooltip>
                  )}
                  {/* assignee */}
                  {typeof child.assignee_id !== 'undefined' && child.assignee_id !== null && (
                    <Tooltip
                      title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Avatar size={20} icon={<UserOutlined />} />
                          <div>
                            <div>负责人：{child.assignee_name || `用户 ${child.assignee_id}`}</div>
                            <div style={{ color: '#8c8c8c' }}>ID：{child.assignee_id}</div>
                          </div>
                        </div>
                      }
                    >
                      <Avatar size={18} icon={<UserOutlined />} style={{ marginLeft: 6 }} />
                    </Tooltip>
                  )}
                  {/* children count */}
                  {typeof child.children_count === 'number' && child.children_count > 0 && (
                    <Tooltip title={`子任务：${child.children_count}`}>
                      <span className="tdt-children-count"><BranchesOutlined /> {child.children_count}</span>
                    </Tooltip>
                  )}
                  {/* progress as checkmark if completed, else percent if available */}
                  {child.status === 'completed' ? (
                    <Tooltip title="已完成">
                      <CheckCircleOutlined style={{ color: '#52c41a', marginLeft: 6 }} />
                    </Tooltip>
                  ) : (typeof child.progress_percent === 'number' && child.progress_percent >= 0) ? (
                    <Tooltip title={`进度：${Math.round(child.progress_percent)}%`}>
                      <span className="tdt-progress">{Math.round(child.progress_percent)}%</span>
                    </Tooltip>
                  ) : null}
                </span>
                <span className="tdt-status-tag">
                  {(() => {
                    const cfg = getStatusConfig(child.status);
                    return <Tag color={cfg.color} className="tdt-tag">{cfg.icon}<span style={{ marginLeft: 4 }}>{cfg.text}</span></Tag>;
                  })()}
                </span>
              {/* more actions */}
              <Dropdown
                trigger={['click']}
                menu={{
                  items: [
                    { key: 'open', icon: <FileTextOutlined />, label: '打开详情' },
                    { key: 'document', icon: <FileTextOutlined />, label: '打开文档' },
                    { key: 'edit', icon: <EditOutlined />, label: '编辑任务' },
                    { key: 'new-sub', icon: <PlusOutlined />, label: '新建子任务' },
                  ],
                  onClick: (info) => {
                    if (info.key === 'open') navigate(`/projects/${projectId}/tasks/${child.id}`);
                    if (info.key === 'document') navigate(`/projects/${projectId}/tasks/${child.id}?tab=document`);
                    if (info.key === 'edit') navigate(`/projects/${projectId}/tasks/${child.id}/edit`);
                    if (info.key === 'new-sub') navigate(`/projects/${projectId}/bulk-import?parentTaskId=${child.id}`);
                  }
                }}
              >
                <button className="tdt-more" aria-label="更多操作">
                  <EllipsisOutlined />
                </button>
              </Dropdown>
            </div>
            {err && <div className="tdt-error">{err}</div>}
            {isExpanded && (
              isLoading ? (
                <div className="tdt-loading">
                  <LoadingIndicator
                    loading={true}
                    type="auto"
                    size="small"
                    style="dots"
                    tip="加载子任务..."
                  />
                </div>
              ) : (
                renderChildren(child.id, depth + 1)
              )
            )}
                </div>
              </UpdateAnimation>
            </AnimatedContainer>
          );
        })}
      </div>
    );
  };

  if (initialLoading) return <div className="tdt-initial">加载中…</div>;
  if (initialError) return <div className="tdt-error">加载失败：{initialError}</div>;
  const rootChildren = childrenByParent.get(rootTaskId) ?? [];
  if (!rootChildren.length) return <div className="tdt-empty">暂无子任务</div>;

  return (
    <AnimatedContainer type="fade" visible={true}>
      <div className="task-descendants-tree">
        {/* 添加刷新控制栏 */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '12px',
          padding: '8px 12px',
          background: '#fafafa',
          borderRadius: '6px',
          border: '1px solid #f0f0f0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#666' }}>子任务树</span>
            <LoadingIndicator
              loading={isTreeRefreshing}
              type={treeRefreshType || 'auto'}
              size="small"
              style="dots"
              showDuration={true}
              startTime={treeRefreshStartTime}
              lastUpdateTime={treeLastUpdate}
              nextUpdateTime={treeNextUpdate}
            />
            {treeRefreshError && (
              <Tooltip title={`自动刷新失败: ${treeRefreshError.message}`}>
                <WarningOutlined style={{ color: '#faad14', fontSize: '12px' }} />
              </Tooltip>
            )}
            {treeStats && treeStats.totalRefreshes > 0 && (
              <Tooltip title={
                <div>
                  <div>刷新统计:</div>
                  <div>总数: {treeStats.totalRefreshes}</div>
                  <div>成功: {treeStats.successfulRefreshes}</div>
                  <div>缓存命中: {treeStats.cacheHits}</div>
                  <div>响应时间: {treeStats.averageResponseTime}ms</div>
                  {treeMemoryStats && (
                    <div style={{ marginTop: '4px', borderTop: '1px solid #f0f0f0', paddingTop: '4px' }}>
                      <div>内存: {treeMemoryStats.percentage.toFixed(1)}%</div>
                    </div>
                  )}
                </div>
              }>
                <span style={{ 
                  fontSize: '10px', 
                  color: treeMemoryStats && treeMemoryStats.percentage > 80 ? '#fa8c16' : '#8c8c8c',
                  cursor: 'help'
                }}>
                  {treeStats.cacheHits > 0 && '⚡'}
                  {treeStats.successfulRefreshes}/{treeStats.totalRefreshes}
                </span>
              </Tooltip>
            )}
          </div>
          <Button
            type="text"
            size="small"
            icon={<ReloadOutlined />}
            onClick={() => refreshTree()}
            disabled={isTreeRefreshing}
            style={{ 
              fontSize: '12px',
              height: '24px',
              padding: '0 8px',
              color: '#8c8c8c'
            }}
          >
            刷新
          </Button>
        </div>
        <UpdateAnimation
          updateTrigger={childrenByParent.get(rootTaskId)?.length || 0}
          type="highlight"
          duration="normal"
        >
          {renderChildren(rootTaskId, 0)}
        </UpdateAnimation>
      </div>
    </AnimatedContainer>
  );
};
