import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Tree, Typography, Button, Space, message, Spin, Empty, Badge } from 'antd';
import { 
  ProjectOutlined, 
  FileTextOutlined, 
  PlayCircleOutlined,
  ClockCircleOutlined,
  BranchesOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTimer } from '../contexts/TimerContext';
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
  projectId?: number; // Add project ID for tasks
}

interface TaskWithChildren extends Task {
  children?: Task[];
}

const MVPMyTasksTree: React.FC = () => {
  console.log('🔧 MVPMyTasksTree 组件开始加载');
  
  const [loading, setLoading] = useState(true);
  const [treeData, setTreeData] = useState<TreeNodeData[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate();
  
  // 🎯 使用统一的定时器
  const { timerState, startTimer } = useTimer();
  
  console.log('🔧 定时器状态:', timerState);

  // 🎯 简化的数据获取
  const fetchProjectsAndTasks = useCallback(async () => {
    try {
      setLoading(true);
      
      const projectsResponse = await projectService.getProjects();
      const projectsList = projectsResponse.data || [];
      setProjects(projectsList);

      const projectsWithTasks = await Promise.all(
        projectsList.map(async (project) => {
          try {
            const tasksResponse = await projectService.getProjectTasks(project.id, {
              page: 1,
              pageSize: 20
            });
            const tasks = tasksResponse.data || [];
            
            // 🎯 简化的任务层级构建
            const taskMap = new Map<number, TaskWithChildren>();
            const rootTasks: TaskWithChildren[] = [];
            
            tasks.forEach(task => {
              taskMap.set(task.id, { ...task, children: [] });
            });
            
            tasks.forEach(task => {
              const taskWithChildren = taskMap.get(task.id)!;
              if (task.parent_id && taskMap.has(task.parent_id)) {
                const parent = taskMap.get(task.parent_id)!;
                parent.children = parent.children || [];
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

      // 🎯 简化的树数据构建
      const treeNodes: TreeNodeData[] = projectsWithTasks
        .filter(({ tasks }) => tasks.length > 0)
        .map(({ project, tasks }) => {
          const buildTaskNodes = (tasks: TaskWithChildren[], projectId: number): TreeNodeData[] => {
            return tasks.map(task => ({
              key: `task-${task.id}`,
              title: (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  width: '100%',
                  minWidth: 0
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    flex: 1,
                    minWidth: 0
                  }}>
                    <span style={{ 
                      marginRight: '8px',
                      color: task.status === 'in_progress' ? '#1890ff' : '#8c8c8c',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1
                    }}>
                      {task.title}
                    </span>
                    <Badge 
                      status={task.status === 'in_progress' ? 'processing' : 'default'} 
                      text={task.status === 'in_progress' ? '进行中' : '待开始'}
                      style={{ fontSize: '11px', flexShrink: 0 }}
                    />
                  </div>
                  {/* 🎯 简化的计时按钮 - 只有进行中的任务且不是当前计时任务才显示 */}
                  {(() => {
                    const shouldShow = task.status === 'in_progress' && timerState.taskId !== task.id && !timerState.isRunning;
                    console.log(`🔧 任务 ${task.title} 按钮显示条件:`, {
                      status: task.status,
                      isInProgress: task.status === 'in_progress',
                      notCurrentTask: timerState.taskId !== task.id,
                      timerNotRunning: !timerState.isRunning,
                      shouldShow
                    });
                    return shouldShow;
                  })() && (
                    <Button
                      type="text"
                      size="small"
                      icon={<PlayCircleOutlined />}
                      onClick={(e) => {
                        console.log('🔧 按钮被点击了!', task.title);
                        e.stopPropagation();
                        handleStartTimer(task);
                      }}
                      style={{ 
                        marginLeft: '8px', 
                        flexShrink: 0,
                        color: '#52c41a',
                        borderColor: '#52c41a'
                      }}
                      title="开始计时"
                    />
                  )}
                  {/* 🎯 显示当前计时状态 */}
                  {timerState.taskId === task.id && timerState.isRunning && (
                    <span style={{ 
                      color: '#52c41a', 
                      fontSize: '12px', 
                      marginLeft: '8px',
                      flexShrink: 0
                    }}>
                      <ClockCircleOutlined /> 计时中
                    </span>
                  )}
                </div>
              ),
              icon: task.children && task.children.length > 0 ? <BranchesOutlined /> : <FileTextOutlined />,
              children: task.children && task.children.length > 0 ? buildTaskNodes(task.children, projectId) : undefined,
              isLeaf: !task.children || task.children.length === 0,
              type: 'task' as const,
              id: task.id,
              status: task.status,
              parentId: task.parent_id,
              projectId: projectId // Pass project ID to task nodes
            }));
          };

          return {
            key: `project-${project.id}`,
            title: (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                width: '100%',
                minWidth: 0
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  flex: 1,
                  minWidth: 0
                }}>
                  <span style={{ 
                    fontWeight: 500, 
                    color: '#262626',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1
                  }}>
                    {project.name}
                  </span>
                  <Badge 
                    count={tasks.length} 
                    showZero={false}
                    style={{ 
                      backgroundColor: '#f0f0f0', 
                      color: '#666',
                      marginLeft: '8px',
                      flexShrink: 0
                    }}
                  />
                </div>
                <Button
                  type="text"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/projects/${project.id}`);
                  }}
                  style={{ marginLeft: '8px', flexShrink: 0 }}
                >
                  进入项目
                </Button>
              </div>
            ),
            icon: <ProjectOutlined />,
            children: buildTaskNodes(tasks, project.id),
            isLeaf: false,
            type: 'project' as const,
            id: project.id
          };
        });

      setTreeData(treeNodes);
      
      if (treeNodes.length > 0) {
        setExpandedKeys([treeNodes[0].key]);
      }
      
    } catch (error) {
      console.error('Failed to fetch projects and tasks:', error);
      message.error('加载项目和任务失败');
    } finally {
      setLoading(false);
    }
  }, [navigate, timerState.taskId, timerState.isRunning]);

  // 🎯 简化的启动计时器
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

  // 🎯 简化的事件处理
  const handleSelect = useCallback((selectedKeys: React.Key[], info: any) => {
    if (selectedKeys.length === 0) return;
    
    const node = info.node;
    if (node.type === 'project') {
      navigate(`/projects/${node.id}`);
    } else if (node.type === 'task') {
      // Navigate to task detail page using correct route pattern
      navigate(`/projects/${node.projectId}/tasks/${node.id}`);
    }
  }, [navigate]);

  const handleExpand = useCallback((expandedKeys: React.Key[]) => {
    setExpandedKeys(expandedKeys.map(key => key.toString()));
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    fetchProjectsAndTasks();
  }, [fetchProjectsAndTasks]);

  useEffect(() => {
    fetchProjectsAndTasks();
  }, [refreshKey]);

  const memoizedTreeData = useMemo(() => treeData, [treeData]);

  if (loading) {
    return (
      <Card 
        className="my-tasks-tree-card"
        title={
          <Space>
            <BranchesOutlined />
            <span>我的任务</span>
          </Space>
        }
        style={{ 
          height: '100%',
          width: '100%'
        }}
      >
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px' }}>
            <Text type="secondary">加载项目和任务中...</Text>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className="my-tasks-tree-card"
      title={
        <Space>
          <BranchesOutlined />
          <span>我的任务</span>
          <Badge count={treeData.length} showZero={false} />
        </Space>
      }
      extra={
        <Button
          type="text"
          icon={<ReloadOutlined />}
          onClick={handleRefresh}
          size="small"
        >
          刷新
        </Button>
      }
      style={{ 
        height: '100%',
        width: '100%'
      }}
      styles={{ 
        body: { 
          padding: '16px',
          height: 'calc(100% - 57px)',
          overflow: 'auto',
          width: '100%'
        } 
      }}
    >
      {memoizedTreeData.length === 0 ? (
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
      ) : (
        <Tree
          showIcon
          treeData={memoizedTreeData}
          expandedKeys={expandedKeys}
          onExpand={handleExpand}
          onSelect={handleSelect}
          style={{
            background: 'transparent',
            width: '100%'
          }}
          virtual={false}
        />
      )}
    </Card>
  );
};

export default MVPMyTasksTree;