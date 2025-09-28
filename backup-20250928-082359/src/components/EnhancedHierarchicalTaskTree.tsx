import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Tooltip
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
  InboxOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTimer } from '../contexts/TimerContext';
import '../styles/EnhancedHierarchicalTaskTree.css';
import { projectService } from '../services/projectService';
import { Project } from '../types/project';
import { Task } from '../types/task';
import { TaskService } from '../services/taskService';

const { Title, Text } = Typography;

interface TreeNodeData {
  key: string;
  title: React.ReactNode;
  icon?: React.ReactNode;
  children?: TreeNodeData[];
  isLeaf?: boolean;
  type: 'project' | 'task';
  id: number;
  status?: string;
  parentId?: number;
  projectId?: number;
  priority?: string;
  dueDate?: string;
  progress?: number;
  level: number; // 添加层级深度
}

interface TaskWithChildren extends Task {
  children?: TaskWithChildren[];
  level?: number;
}

interface EnhancedHierarchicalTaskTreeProps {
  height?: string | number;
  showProjectInfo?: boolean;
  compactMode?: boolean;
}

const EnhancedHierarchicalTaskTree: React.FC<EnhancedHierarchicalTaskTreeProps> = ({
  height = '100%',
  showProjectInfo = true,
  compactMode = false
}) => {
  const [loading, setLoading] = useState(true);
  const [treeData, setTreeData] = useState<TreeNodeData[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set());
  const loadedProjectRootsRef = useRef<Set<number>>(new Set()); // 已加载过的项目根任务
  const loadedTaskChildrenRef = useRef<Set<string>>(new Set()); // 已加载过的任务子节点
  const navigate = useNavigate();
  
  const { timerState, startTimer, pauseTimer, resumeTimer } = useTimer();

  // 获取任务状态颜色
  const getStatusColor = (status: string): string => {
    const colorMap: Record<string, string> = {
      'todo': '#d9d9d9',
      'in_progress': '#1890ff',
      'completed': '#52c41a',
      'cancelled': '#ff4d4f'
    };
    return colorMap[status] || '#d9d9d9';
  };

  // 获取任务状态文本
  const getStatusText = (status: string): string => {
    const textMap: Record<string, string> = {
      'todo': '待开始',
      'in_progress': '进行中',
      'completed': '已完成',
      'cancelled': '已取消'
    };
    return textMap[status] || '未知';
  };

  // 获取优先级颜色
  const getPriorityColor = (priority?: string): string => {
    const colorMap: Record<string, string> = {
      'high': '#ff4d4f',
      'medium': '#fa8c16',
      'low': '#52c41a'
    };
    return colorMap[priority || 'medium'] || '#fa8c16';
  };

  // 获取优先级文本
  const getPriorityText = (priority?: string): string => {
    const textMap: Record<string, string> = {
      'high': '高',
      'medium': '中',
      'low': '低'
    };
    return textMap[priority || 'medium'] || '中';
  };

  // 计算任务子树的完成进度
  const calculateTaskProgress = (task: TaskWithChildren): number => {
    if (!task.children || task.children.length === 0) {
      return task.status === 'completed' ? 100 : 0;
    }
    
    const totalTasks = task.children.length;
    const completedTasks = task.children.filter(child => child.status === 'completed').length;
    return Math.round((completedTasks / totalTasks) * 100);
  };

  // 检查任务是否即将到期
  const isTaskDueSoon = (dueDate?: string): boolean => {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    const now = new Date();
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 3 && diffDays >= 0;
  };

  // 检查任务是否已过期
  const isTaskOverdue = (dueDate?: string): boolean => {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    const now = new Date();
    return due.getTime() < now.getTime();
  };

  // 构建紧凑的任务节点 - 一行显示
  const buildEnhancedTaskNode = (task: TaskWithChildren, projectId: number, level: number = 0): TreeNodeData => {
    const taskProgress = calculateTaskProgress(task);
    const isDueSoon = isTaskDueSoon(task.due_date);
    const isOverdue = isTaskOverdue(task.due_date);
    const isCurrentTimer = timerState.taskId === task.id;

    const hasKnownChildren = Array.isArray(task.children) && task.children.length > 0;
    const mayHaveChildren = typeof (task as any)?.custom_fields?.children_count === 'number'
      ? ((task as any).custom_fields.children_count as number) > 0
      : true; // 未知则默认可展开，走懒加载
    
    return {
      key: `task-${task.id}`,
      title: (
        <div className="task-compact-row">
          {/* 任务标题 - 主要内容 */}
          <span style={{ 
            color: task.status === 'completed' ? '#8c8c8c' : '#262626',
            fontWeight: level === 0 ? 500 : 400,
            textDecoration: task.status === 'completed' ? 'line-through' : 'none',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
            fontSize: level === 0 ? '13px' : '12px',
            marginRight: '6px'
          }}>
            <span style={{ 
              color: '#8c8c8c', 
              fontSize: '11px', 
              marginRight: '4px',
              fontWeight: 'normal'
            }}>
              #{task.id}
            </span>
            {task.title}
          </span>
          
          {/* 紧凑状态指示器 */}
          <div className="task-status-indicators">
            {/* 子任务计数 */}
            {Array.isArray(task.children) && task.children.length > 0 && (
              <span className="subtask-counter">
                {task.children.filter(c => c.status === 'completed').length}/{task.children.length}
              </span>
            )}
            
            {/* 状态点 */}
            <div 
              className="status-dot"
              style={{ backgroundColor: getStatusColor(task.status) }}
            />
            
            {/* 优先级指示 */}
            {task.custom_fields?.priority && task.custom_fields.priority !== 'medium' && (
              <div 
                className="priority-dot"
                style={{ backgroundColor: getPriorityColor(task.custom_fields.priority) }}
              />
            )}
            
            {/* 到期提醒 */}
            {(isOverdue || isDueSoon) && (
              <ExclamationCircleOutlined 
                style={{ 
                  color: isOverdue ? '#ff4d4f' : '#fa8c16',
                  fontSize: '10px'
                }} 
              />
            )}
            
            {/* 计时器状态 */}
            {task.status === 'in_progress' && (
              <>
                {isCurrentTimer && timerState.isRunning ? (
                  <Tooltip title="暂停计时">
                    <PauseCircleOutlined
                      style={{ 
                        color: '#fa8c16',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        pauseTimer();
                      }}
                    />
                  </Tooltip>
                ) : isCurrentTimer && timerState.isPaused ? (
                  <Tooltip title="继续计时">
                    <PlayCircleOutlined
                      style={{ 
                        color: '#52c41a',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        resumeTimer();
                      }}
                    />
                  </Tooltip>
                ) : !timerState.isRunning ? (
                  <Tooltip title="开始计时">
                    <PlayCircleOutlined
                      style={{ 
                        color: '#52c41a',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartTimer(task);
                      }}
                    />
                  </Tooltip>
                ) : null}
              </>
            )}
            
            {/* 当前计时状态点 */}
            {isCurrentTimer && timerState.isRunning && (
              <div className="timer-active-dot status-dot" style={{ backgroundColor: '#52c41a' }} />
            )}
          </div>
        </div>
      ),
      icon: hasKnownChildren ? <BranchesOutlined /> : <FileTextOutlined />,
      children: hasKnownChildren ? 
        task.children!.map(child => buildEnhancedTaskNode(child, projectId, level + 1)) : 
        undefined,
      isLeaf: hasKnownChildren ? false : !mayHaveChildren,
      type: 'task' as const,
      id: task.id,
      status: task.status,
      parentId: task.parent_id,
      projectId: projectId,
      priority: task.custom_fields?.priority,
      dueDate: task.due_date,
      progress: taskProgress,
      level: level
    };
  };

  // 辅助函数：持久化展开状态
  const STORAGE_KEY = 'enhanced_hierarchical_task_tree_expanded_keys';
  const saveExpandedKeys = useCallback((keys: string[]) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
    } catch {}
  }, []);
  const restoreExpandedKeys = useCallback((): string[] => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  }, []);

  // 更新树数据的工具方法
  const updateTreeData = useCallback((list: TreeNodeData[], key: string, children: TreeNodeData[]): TreeNodeData[] => {
    return list.map(node => {
      if (node.key === key) {
        return { ...node, children };
      }
      if (node.children) {
        return { ...node, children: updateTreeData(node.children, key, children) };
      }
      return node;
    });
  }, []);

  // 初始仅加载项目列表
  const fetchProjectsOnly = useCallback(async () => {
    try {
      setLoading(true);
      const projectsResponse = await projectService.getProjects();
      // axios 拦截器已将 { success, data } 解包为 data（此处为分页对象：{ data: Project[], pagination }）
      const projectsList = Array.isArray((projectsResponse as any)?.data)
        ? (projectsResponse as any).data
        : Array.isArray(projectsResponse)
          ? (projectsResponse as any)
          : [];
      setProjects(projectsList);

      const treeNodes: TreeNodeData[] = projectsList.map((project) => ({
        key: `project-${project.id}`,
        title: showProjectInfo ? (
          <div className="task-compact-row">
            <span style={{ 
              fontWeight: 600, 
              color: '#262626',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
              fontSize: '14px'
            }}>
              {project.name}
            </span>
            
            <div className="task-status-indicators">
              <Button
                type="text"
                
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/projects/${project.id}`);
                }}
                style={{ 
                  fontSize: '11px',
                  height: '18px',
                  padding: '0 4px',
                  color: '#1890ff'
                }}
              >
                进入
              </Button>
            </div>
          </div>
        ) : (
          <span style={{ fontWeight: 600, color: '#262626' }}>{project.name}</span>
        ),
        icon: <ProjectOutlined />,
        isLeaf: false,
        type: 'project' as const,
        id: project.id,
        level: 0
      }));

      setTreeData(treeNodes);

      // 恢复展开状态
      const restored = restoreExpandedKeys();
      if (restored.length > 0) {
        setExpandedKeys(restored);
        // 如果有已展开的项目节点，触发加载
        restored.forEach(key => {
          if (key.startsWith('project-')) {
            const pid = parseInt(key.replace('project-', ''), 10);
            if (!loadedProjectRootsRef.current.has(pid)) {
              loadProjectRootTasks(pid, key);
            }
          }
        });
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      message.error('加载项目失败');
    } finally {
      setLoading(false);
    }
  }, [navigate, showProjectInfo, restoreExpandedKeys]);

  // 懒加载：加载项目的根任务
  const loadProjectRootTasks = useCallback(async (projectId: number, projectKey?: string) => {
    if (loadedProjectRootsRef.current.has(projectId)) return;
    const key = projectKey || `project-${projectId}`;
    setLoadingNodes(prev => new Set(prev).add(key));
    try {
      const resp = await TaskService.getRootTasks(projectId, { page: 1, page_size: 200 });
      const tasks = Array.isArray((resp as any)?.data) ? (resp as any).data : Array.isArray(resp) ? resp as any : [];

      const taskNodes = (tasks as Task[]).map(task => buildEnhancedTaskNode({ ...task, children: [] }, projectId, 0));
      setTreeData(prev => updateTreeData(prev, key, taskNodes));
      loadedProjectRootsRef.current.add(projectId);
    } catch (error) {
      console.error('加载项目根任务失败:', error);
      message.error('加载项目根任务失败');
      // 设置为空避免重复请求
      setTreeData(prev => updateTreeData(prev, key, []));
      loadedProjectRootsRef.current.add(projectId);
    } finally {
      setLoadingNodes(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }, [updateTreeData, buildEnhancedTaskNode]);

  // 懒加载：加载任务的子任务
  const loadTaskChildren = useCallback(async (projectId: number, taskId: number, taskKey?: string) => {
    const key = taskKey || `task-${taskId}`;
    if (loadedTaskChildrenRef.current.has(key)) return;
    setLoadingNodes(prev => new Set(prev).add(key));
    try {
      const resp = await TaskService.getTaskChildren(projectId, taskId);
      const children = Array.isArray((resp as any)?.data?.data) ? (resp as any).data.data
        : Array.isArray((resp as any)?.data) ? (resp as any).data
        : Array.isArray(resp) ? (resp as any)
        : [];

      const childNodes = (children as Task[]).map(child => buildEnhancedTaskNode({ ...child, children: [] }, projectId, 1));
      setTreeData(prev => updateTreeData(prev, key, childNodes));
      loadedTaskChildrenRef.current.add(key);
    } catch (error) {
      console.error('加载子任务失败:', error);
      message.error('加载子任务失败');
      // 设置为空避免重复请求
      setTreeData(prev => updateTreeData(prev, key, []));
      loadedTaskChildrenRef.current.add(key);
    } finally {
      setLoadingNodes(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }, [updateTreeData, buildEnhancedTaskNode]);

  // 启动计时器
  const handleStartTimer = useCallback(async (task: Task) => {
    try {
      const success = await startTimer(task.id, task.title, 'project');
      if (success) {
        message.success(`开始计时: ${task.title}`);
      }
    } catch (error) {
      console.error('Failed to start timer:', error);
      message.error('启动计时器失败');
    }
  }, [startTimer]);

  // 处理节点选择
  const handleSelect = useCallback((selectedKeys: React.Key[], info: any) => {
    if (selectedKeys.length === 0) return;
    const node = info.node as TreeNodeData & { key: string };
    if (node.type === 'task' && node.projectId) {
      navigate(`/projects/${node.projectId}/tasks/${node.id}`);
    }
    // 点击项目节点不跳转，保持用于展开/收起
  }, [navigate]);

  // 处理节点展开/收起
  const handleExpand = useCallback((keys: React.Key[], info: any) => {
    const normalized = keys.map(k => k.toString());
    setExpandedKeys(normalized);
    saveExpandedKeys(normalized);

    // 懒加载：当展开节点时加载其子节点
    const node = info.node as TreeNodeData & { key: string };
    if (info.expanded) {
      if (node.type === 'project') {
        loadProjectRootTasks(node.id, node.key);
      } else if (node.type === 'task' && node.projectId) {
        loadTaskChildren(node.projectId, node.id, node.key);
      }
    }
  }, [saveExpandedKeys, loadProjectRootTasks, loadTaskChildren]);

  // Tree 的 loadData（用于显示 loading 效果）
  const loadData = useCallback(async (node: any) => {
    const dataNode = node as TreeNodeData & { key: string };
    if (dataNode.type === 'project') {
      await loadProjectRootTasks(dataNode.id, dataNode.key);
    } else if (dataNode.type === 'task' && dataNode.projectId) {
      await loadTaskChildren(dataNode.projectId, dataNode.id, dataNode.key);
    }
  }, [loadProjectRootTasks, loadTaskChildren]);

  useEffect(() => {
    fetchProjectsOnly();
  }, [fetchProjectsOnly, refreshKey]);



  const memoizedTreeData = useMemo(() => treeData, [treeData]);

  if (loading) {
    return (
      <div className="enhanced-hierarchical-task-tree">
        <Card 
          title={
            <Space>
              <BranchesOutlined />
              <span>我的任务</span>
            </Space>
          }
          style={{ width: '100%' }}
        >
          <div className="hierarchical-task-loading">
            <Spin size="large" />
            <div className="loading-text">
              <Text type="secondary">加载项目中...</Text>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={`enhanced-hierarchical-task-tree ${compactMode ? 'compact-mode' : ''}`}>
      <Card
        title={
          <Space>
            <BranchesOutlined />
            <span>任务树</span>
            <Badge count={treeData.length} showZero={false} />
          </Space>
        }
        extra={
          <Space>
            <Button
              type="text"
              icon={<InboxOutlined />}
              onClick={() => {
                // 导航到第一个项目的归档任务页面，如果没有项目则提示
                if (projects.length > 0) {
                  navigate(`/projects/${projects[0].id}/archived-tasks`);
                } else {
                  message.info('暂无项目，请先创建项目');
                }
              }}
              title="查看归档任务"
            >
              归档管理
            </Button>
            <Button
              type="text"
              icon={<ReloadOutlined />}
              onClick={() => setRefreshKey(prev => prev + 1)}
            >
              刷新
            </Button>
          </Space>
        }
        style={{ width: '100%' }}
        styles={{ 
          body: { 
            padding: compactMode ? '8px' : '16px',
            overflow: 'auto',
            width: '100%'
          } 
        }}
      >
      {memoizedTreeData.length === 0 ? (
        <div className="hierarchical-task-empty">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无项目或任务"
            style={{ marginTop: '40px' }}
          >
            <Button
              type="primary"
              onClick={() => navigate('/projects')}
            >
              去创建项目
            </Button>
          </Empty>
        </div>
      ) : (
        <Tree
          showIcon
          treeData={memoizedTreeData}
          expandedKeys={expandedKeys}
          onExpand={handleExpand}
          onSelect={handleSelect}
          loadData={loadData}
          switcherIcon={({ expanded }) => 
            expanded ? <CaretDownOutlined /> : <CaretRightOutlined />
          }
          style={{
            background: 'transparent',
            width: '100%'
          }}
          virtual={false}
          blockNode={true}
        />
      )}
      </Card>
    </div>
  );
};

export default EnhancedHierarchicalTaskTree;