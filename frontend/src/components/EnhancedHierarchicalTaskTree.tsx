import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Tooltip,
  Progress,
  Tag
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
  console.log('🔧 EnhancedHierarchicalTaskTree 组件开始加载');
  
  const [loading, setLoading] = useState(true);
  const [treeData, setTreeData] = useState<TreeNodeData[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate();
  
  const { timerState, startTimer, pauseTimer, resumeTimer } = useTimer();
  
  console.log('🔧 定时器状态:', timerState);

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
            {task.title}
          </span>
          
          {/* 紧凑状态指示器 */}
          <div className="task-status-indicators">
            {/* 子任务计数 */}
            {task.children && task.children.length > 0 && (
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
            {(() => {
              const isInProgress = task.status === 'in_progress';
              const shouldShowTimerControls = isInProgress;
              console.log(`🔧 任务 ${task.title} 计时器显示条件:`, {
                status: task.status,
                isInProgress,
                isCurrentTimer,
                timerIsRunning: timerState.isRunning,
                timerIsPaused: timerState.isPaused,
                shouldShowTimerControls
              });
              return shouldShowTimerControls;
            })() && (
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
                        console.log('🔧 暂停按钮被点击了!', task.title);
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
                        console.log('🔧 继续按钮被点击了!', task.title);
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
                        console.log('🔧 开始计时按钮被点击了!', task.title);
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
      icon: task.children && task.children.length > 0 ? <BranchesOutlined /> : <FileTextOutlined />,
      children: task.children && task.children.length > 0 ? 
        task.children.map(child => buildEnhancedTaskNode(child, projectId, level + 1)) : 
        undefined,
      isLeaf: !task.children || task.children.length === 0,
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

  // 获取项目和任务数据
  const fetchProjectsAndTasks = useCallback(async () => {
    try {
      setLoading(true);
      
      const projectsResponse = await projectService.getProjects();
      const projectsList = projectsResponse?.data || [];
      setProjects(projectsList);

      const projectsWithTasks = await Promise.all(
        projectsList.map(async (project) => {
          try {
            const tasksResponse = await projectService.getProjectTasks(project.id, {
              page: 1,
              pageSize: 50
            });
            const tasks = tasksResponse.data || [];
            
            // 构建层级任务结构
            const taskMap = new Map<number, TaskWithChildren>();
            const rootTasks: TaskWithChildren[] = [];
            
            tasks.forEach(task => {
              taskMap.set(task.id, { ...task, children: [], level: 0 });
            });
            
            tasks.forEach(task => {
              const taskWithChildren = taskMap.get(task.id)!;
              if (task.parent_id && taskMap.has(task.parent_id)) {
                const parent = taskMap.get(task.parent_id)!;
                parent.children = parent.children || [];
                taskWithChildren.level = (parent.level || 0) + 1;
                parent.children.push(taskWithChildren);
              } else {
                rootTasks.push(taskWithChildren);
              }
            });
            
            return { project, tasks: rootTasks };
          } catch (error) {
            console.warn(`Failed to fetch tasks for project ${project.id}:`, error);
            return { project, tasks: [] };
          }
        })
      );

      // 构建增强的树节点
      const treeNodes: TreeNodeData[] = projectsWithTasks
        .filter(({ tasks }) => tasks.length > 0)
        .map(({ project, tasks }) => {
          const totalTasks = tasks.reduce((count, task) => {
            const countTaskAndChildren = (t: TaskWithChildren): number => {
              return 1 + (t.children?.reduce((sum, child) => sum + countTaskAndChildren(child), 0) || 0);
            };
            return count + countTaskAndChildren(task);
          }, 0);
          
          const completedTasks = tasks.reduce((count, task) => {
            const countCompletedTaskAndChildren = (t: TaskWithChildren): number => {
              const thisTaskCount = t.status === 'completed' ? 1 : 0;
              const childrenCount = t.children?.reduce((sum, child) => sum + countCompletedTaskAndChildren(child), 0) || 0;
              return thisTaskCount + childrenCount;
            };
            return count + countCompletedTaskAndChildren(task);
          }, 0);
          
          const projectProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

          return {
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
                  <span className="subtask-counter">
                    {completedTasks}/{totalTasks}
                  </span>
                  <div 
                    className="status-dot"
                    style={{ backgroundColor: projectProgress === 100 ? '#52c41a' : '#1890ff' }}
                  />
                  <Button
                    type="text"
                    size="small"
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
            children: tasks.map(task => buildEnhancedTaskNode(task, project.id, 0)),
            isLeaf: false,
            type: 'project' as const,
            id: project.id,
            level: 0
          };
        });


      setTreeData(treeNodes);
      
      // 默认展开项目节点和有子任务的父任务（仅一级）
      const expandedKeys: string[] = [];
      
      treeNodes.forEach(projectNode => {
        // 展开项目节点
        expandedKeys.push(projectNode.key);
        
        // 展开有子任务的父任务（仅第一级）
        if (projectNode.children) {
          projectNode.children.forEach(taskNode => {
            if (taskNode.children && taskNode.children.length > 0) {
              expandedKeys.push(taskNode.key);
            }
          });
        }
      });
      
      setExpandedKeys(expandedKeys);
      
    } catch (error) {
      console.error('Failed to fetch projects and tasks:', error);
      message.error('加载项目和任务失败');
    } finally {
      setLoading(false);
    }
  }, [navigate, timerState.taskId, timerState.isRunning, timerState.isPaused, showProjectInfo]);

  // 启动计时器
  const handleStartTimer = useCallback(async (task: Task) => {
    console.log('🎯 检测到任务计时器启动', { taskId: task.id, taskTitle: task.title });
    
    try {
      const success = await startTimer(task.id, task.title);
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
    
    const node = info.node;
    if (node.type === 'project') {
      navigate(`/projects/${node.id}`);
    } else if (node.type === 'task') {
      navigate(`/projects/${node.projectId}/tasks/${node.id}`);
    }
  }, [navigate]);

  // 处理节点展开
  const handleExpand = useCallback((expandedKeys: React.Key[]) => {
    setExpandedKeys(expandedKeys.map(key => key.toString()));
  }, []);

  // 刷新数据
  const handleRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    fetchProjectsAndTasks();
  }, [fetchProjectsAndTasks]);

  useEffect(() => {
    fetchProjectsAndTasks();
  }, [fetchProjectsAndTasks, refreshKey]);

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
          style={{ height, width: '100%' }}
        >
          <div className="hierarchical-task-loading">
            <Spin size="large" />
            <div className="loading-text">
              <Text type="secondary">加载项目和任务中...</Text>
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
            <span>我的任务</span>
            <Badge count={treeData.length} showZero={false} />
          </Space>
        }
        extra={
          <Space>
            <Button
              type="text"
              icon={<InboxOutlined />}
              onClick={() => navigate('/archived-tasks')}
              title="查看归档任务"
            >
              归档管理
            </Button>
            <Button
              type="text"
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
            >
              刷新
            </Button>
          </Space>
        }
        style={{ height, width: '100%' }}
        styles={{ 
          body: { 
            padding: compactMode ? '8px' : '16px',
            height: 'calc(100% - 57px)',
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