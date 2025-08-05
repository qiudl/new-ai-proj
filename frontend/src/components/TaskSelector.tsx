import React, { useState, useEffect, useCallback } from 'react';
import { Select, Spin, Tag, Typography, Tree, Card, Space, Button, Input, Tooltip, Empty } from 'antd';
import { 
  ProjectOutlined, 
  FileTextOutlined, 
  BranchesOutlined, 
  ReloadOutlined,
  FolderOpenOutlined,
  CaretDownOutlined,
  CaretRightOutlined
} from '@ant-design/icons';
import { Task } from '../types/task';
import { Project } from '../types/project';
import { TaskService } from '../services/taskService';
import TimerService from '../services/timerService';
import { TaskOption } from '../types/timer';
import { projectService } from '../services/projectService';
import { AppError, ErrorType } from '../utils/errorTypes';

const { Option } = Select;
const { Text } = Typography;
const { Search } = Input;

interface TaskSelectorProps {
  projectId?: number;
  value?: number | Task | null;
  onChange?: (taskId: number | undefined, task?: Task | TaskOption) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  allowClear?: boolean;
  disabled?: boolean;
  filterTaskIds?: number[]; // 需要过滤掉的任务ID列表
  // Timer mode props
  timerMode?: boolean; // 是否为计时器模式
  showProjectNames?: boolean; // 是否显示项目名称
  // AI Assistant mode props
  aiMode?: boolean; // AI辅助模式，支持层级选择和父任务选择
  mode?: 'select' | 'tree'; // 显示模式：下拉选择或树形选择
  treeHeight?: number;
  // 过滤选项
  filterOptions?: {
    excludeCompleted?: boolean; // 排除已完成任务
    excludeParentTasks?: boolean; // 排除已有子任务的父任务
    onlyLeafTasks?: boolean; // 只显示叶子任务
    statusFilter?: string[]; // 状态过滤
  };
}

interface TaskTreeNode {
  key: string;
  title: React.ReactNode;
  icon?: React.ReactNode;
  children?: TaskTreeNode[];
  isLeaf?: boolean;
  task: Task;
  project?: Project;
  level: number;
}

interface TaskWithChildren extends Task {
  children?: TaskWithChildren[];
  level?: number;
}

const TaskSelector: React.FC<TaskSelectorProps> = ({
  projectId,
  value,
  onChange,
  placeholder = "选择任务",
  style,
  allowClear = true,
  disabled = false,
  filterTaskIds = [],
  timerMode = false,
  showProjectNames = false,
  aiMode = false,
  mode = 'select',
  treeHeight = 300,
  filterOptions = {}
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timerTasks, setTimerTasks] = useState<TaskOption[]>([]);
  const [loading, setLoading] = useState(false);
  
  // AI模式新增状态
  const [projects, setProjects] = useState<Project[]>([]);
  const [allTasks, setAllTasks] = useState<TaskWithChildren[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<TaskWithChildren[]>([]);
  const [searchText, setSearchText] = useState('');
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>(projectId);
  
  // 添加防重复调用的状态
  const [lastFetchParams, setLastFetchParams] = useState<string>('');

  // AI模式：获取项目和任务数据 - 添加防抖和错误重试
  const fetchAIData = useCallback(async () => {
    // 创建参数签名用于去重
    const currentParams = JSON.stringify({ selectedProjectId, filterTaskIds, aiMode });
    
    // 防止重复调用
    if (loading || currentParams === lastFetchParams) return;
    
    setLastFetchParams(currentParams);
    setLoading(true);
    try {
      // 获取项目列表
      const projectsResponse = await projectService.getProjects();
      const projectsList = projectsResponse?.data || [];
      setProjects(projectsList);

      // 确定要获取任务的项目
      const targetProjects = selectedProjectId 
        ? projectsList.filter(p => p.id === selectedProjectId)
        : projectsList;

      if (targetProjects.length === 0) {
        setAllTasks([]);
        setFilteredTasks([]);
        return;
      }

      // 获取所有项目的任务
      const projectsWithTasks = await Promise.all(
        targetProjects.map(async (project) => {
          try {
            const tasksResponse = await projectService.getProjectTasks(project.id, {
              page: 1,
              pageSize: 100
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
            console.warn(`获取项目${project.id}的任务失败:`, error);
            return { project, tasks: [] };
          }
        })
      );

      // 合并所有任务，添加项目信息
      const combinedTasks: TaskWithChildren[] = [];
      projectsWithTasks.forEach(({ project, tasks }) => {
        tasks.forEach(task => {
          // 递归添加项目信息
          const addProjectInfo = (t: TaskWithChildren) => {
            (t as unknown).project = project;
            if (t.children) {
              t.children.forEach(addProjectInfo);
            }
          };
          addProjectInfo(task);
          combinedTasks.push(task);
        });
      });

      setAllTasks(combinedTasks);
    } catch (error: unknown) {
      console.error('获取任务数据失败:', error);
      
      // 改进的错误处理：区分不同类型的错误
      if (error instanceof AppError) {
        if (error.type === ErrorType.AUTHENTICATION || error.statusCode === 401) {
          console.warn('认证失败，token可能已过期，用户将被重定向到登录页');
          // 认证错误已经在api.ts中处理，这里只需要记录
        } else if (error.type === ErrorType.NETWORK) {
          console.error('网络连接问题:', error.message);
          // 可以在这里显示网络错误的UI提示
        } else {
          console.error('其他错误:', error);
          // 处理其他类型的错误
        }
      } else if (error instanceof Error) {
        console.error('标准错误:', error.message);
      } else {
        console.error('未知错误:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId, filterTaskIds, aiMode]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      if (aiMode) {
        // AI模式：使用新的数据获取方法
        return await fetchAIData();
      } else if (timerMode) {
        // 计时器模式：加载所有可计时的任务
        const availableTasks = await TimerService.getAvailableTasks();
        setTimerTasks(availableTasks.filter(task => !filterTaskIds.includes(task.id)));
      } else {
        // 普通模式：按项目加载任务
        if (!projectId) {
          setTasks([]);
          return;
        }

        const response = await TaskService.getTasks(projectId, { 
          page: 1, 
          page_size: 100 
        });
        
        // 过滤掉指定的任务ID
        const availableTasks = response.data.filter(task => 
          !filterTaskIds.includes(task.id)
        );
        
        setTasks(availableTasks);
      }
    } catch (error: unknown) {
      console.error('Error loading tasks:', error);
      
      // 改进的错误处理：区分不同类型的错误
      if (error instanceof AppError) {
        if (error.type === ErrorType.AUTHENTICATION) {
          console.warn('认证失败，用户将被重定向到登录页');
          // 认证错误已经在api.ts中处理，这里只需要清空任务列表
        } else if (error.type === ErrorType.NETWORK) {
          console.error('网络连接问题:', error.message);
        } else {
          console.error('加载任务时发生未知错误:', error);
        }
      } else if (error instanceof Error) {
        console.error('标准错误:', error.message);
      } else {
        console.error('未知错误:', error);
      }
      
      // 清空任务列表
      if (timerMode) {
        setTimerTasks([]);
      } else {
        setTasks([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      if (aiMode) {
        await fetchAIData();
      } else {
        await loadTasks();
      }
    };
    
    if (mounted) {
      loadData();
    }
    
    return () => {
      mounted = false;
    };
  }, [projectId, filterTaskIds, timerMode, aiMode]); // 移除fetchAIData避免循环依赖
  // AI模式：应用过滤条件
  const applyFilters = useCallback((tasks: TaskWithChildren[]): TaskWithChildren[] => {
    const {
      excludeCompleted = false,
      excludeParentTasks = false,
      onlyLeafTasks = false,
      statusFilter
    } = filterOptions;

    const filterTask = (task: TaskWithChildren): TaskWithChildren | null => {
      // 状态过滤
      if (statusFilter && statusFilter.length > 0 && !statusFilter.includes(task.status)) {
        return null;
      }

      // 排除已完成任务
      if (excludeCompleted && task.status === 'completed') {
        return null;
      }

      // 过滤子任务
      let filteredChildren: TaskWithChildren[] = [];
      if (task.children) {
        filteredChildren = task.children
          .map(filterTask)
          .filter(Boolean) as TaskWithChildren[];
      }

      // 排除有子任务的父任务
      if (excludeParentTasks && task.children && task.children.length > 0) {
        return filteredChildren.length > 0 ? { ...task, children: filteredChildren } : null;
      }

      // 只显示叶子任务
      if (onlyLeafTasks && filteredChildren.length > 0) {
        return filteredChildren.length > 0 ? { ...task, children: filteredChildren } : null;
      }

      return { ...task, children: filteredChildren };
    };

    return tasks.map(filterTask).filter(Boolean) as TaskWithChildren[];
  }, [filterOptions]);

  // AI模式：搜索过滤
  const searchFilter = useCallback((tasks: TaskWithChildren[], searchText: string): TaskWithChildren[] => {
    if (!searchText.trim()) return tasks;

    const filterBySearch = (task: TaskWithChildren): TaskWithChildren | null => {
      const matchesSearch = task.title.toLowerCase().includes(searchText.toLowerCase()) ||
                          task.description?.toLowerCase().includes(searchText.toLowerCase());

      let filteredChildren: TaskWithChildren[] = [];
      if (task.children) {
        filteredChildren = task.children
          .map(filterBySearch)
          .filter(Boolean) as TaskWithChildren[];
      }

      if (matchesSearch || filteredChildren.length > 0) {
        return { ...task, children: filteredChildren };
      }

      return null;
    };

    return tasks.map(filterBySearch).filter(Boolean) as TaskWithChildren[];
  }, []);

  // AI模式：应用过滤和搜索
  useEffect(() => {
    if (aiMode) {
      let filtered = applyFilters(allTasks);
      filtered = searchFilter(filtered, searchText);
      setFilteredTasks(filtered);
    }
  }, [aiMode, allTasks, applyFilters, searchFilter, searchText]);

  const handleChange = (selectedTaskId: number | undefined) => {
    if (aiMode) {
      // AI模式：从层级任务中查找
      const findTask = (tasks: TaskWithChildren[]): Task | undefined => {
        for (const task of tasks) {
          if (task.id === selectedTaskId) return task;
          if (task.children) {
            const found = findTask(task.children);
            if (found) return found;
          }
        }
        return undefined;
      };
      const selectedTask = findTask(filteredTasks);
      onChange?.(selectedTaskId, selectedTask);
    } else if (timerMode) {
      const selectedTask = timerTasks.find(task => task.id === selectedTaskId);
      onChange?.(selectedTaskId, selectedTask);
    } else {
      const selectedTask = tasks.find(task => task.id === selectedTaskId);
      onChange?.(selectedTaskId, selectedTask);
    }
  };

  // Get status tag for timer mode
  const getStatusTag = (status: string) => {
    const statusMap = {
      'todo': { text: '待办', color: 'blue' },
      'in_progress': { text: '进行中', color: 'orange' },
      'completed': { text: '已完成', color: 'green' },
      'cancelled': { text: '已取消', color: 'red' }
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { text: status, color: 'default' };
    return <Tag color={statusInfo.color} style={{ fontSize: '12px' }}>{statusInfo.text}</Tag>;
  };

  const renderTaskOption = (task: Task) => {
    const hasChildren = (task.custom_fields?.children_count || 0) > 0;
    const isSubTask = !!task.parent_id;
    
    return (
      <Option key={task.id} value={task.id}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {hasChildren && <span style={{ color: '#52c41a' }}>📁</span>}
          {isSubTask && <span style={{ color: '#1890ff' }}>└─</span>}
          <span>{task.title}</span>
          {task.status === 'completed' && (
            <span style={{ color: '#52c41a', fontSize: '12px' }}>✓</span>
          )}
          {task.status === 'in_progress' && (
            <span style={{ color: '#fa8c16', fontSize: '12px' }}>⏳</span>
          )}
        </div>
      </Option>
    );
  };

  const renderTimerTaskOption = (task: TaskOption) => {
    return (
      <Option key={task.id} value={task.id}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500 }}>{task.title}</div>
            {showProjectNames && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {task.project_name}
              </Text>
            )}
          </div>
          <div>
            {getStatusTag(task.status)}
          </div>
        </div>
      </Option>
    );
  };

  // AI模式的额外功能
  const buildTreeNodes = useCallback((tasks: TaskWithChildren[]): TaskTreeNode[] => {
    return tasks.map(task => {
      const project = (task as unknown).project as Project;
      const hasChildren = task.children && task.children.length > 0;
      
      return {
        key: `task-${task.id}`,
        title: (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <Text 
                strong={task.level === 0}
                style={{ 
                  fontSize: task.level === 0 ? '13px' : '12px',
                  color: task.status === 'completed' ? '#8c8c8c' : '#262626'
                }}
              >
                {task.title}
              </Text>
              {project && showProjectNames && (
                <div style={{ marginTop: 2 }}>
                  <Text type="secondary" style={{ fontSize: '11px' }}>
                    <ProjectOutlined style={{ marginRight: 2 }} />
                    {project.name}
                  </Text>
                </div>
              )}
            </div>
            <Space size={4}>
              <Tag 
                color={task.status === 'completed' ? 'green' : 
                       task.status === 'in_progress' ? 'blue' : 'default'}
              >
                {task.status === 'todo' ? '待开始' :
                 task.status === 'in_progress' ? '进行中' :
                 task.status === 'completed' ? '已完成' : '已取消'}
              </Tag>
              {task.custom_fields?.priority && (
                <Tag 
                  color={task.custom_fields.priority === 'high' ? 'red' :
                         task.custom_fields.priority === 'medium' ? 'orange' : 'green'}
                >
                  {task.custom_fields.priority === 'high' ? '高' :
                   task.custom_fields.priority === 'medium' ? '中' : '低'}
                </Tag>
              )}
            </Space>
          </div>
        ),
        icon: hasChildren ? <BranchesOutlined /> : <FileTextOutlined />,
        children: hasChildren ? buildTreeNodes(task.children!) : undefined,
        isLeaf: !hasChildren,
        task,
        project,
        level: task.level || 0
      };
    });
  }, [showProjectNames]);

  const flattenTasks = useCallback((tasks: TaskWithChildren[]): TaskWithChildren[] => {
    const result: TaskWithChildren[] = [];
    
    const flatten = (taskList: TaskWithChildren[]) => {
      taskList.forEach(task => {
        result.push(task);
        if (task.children && task.children.length > 0) {
          flatten(task.children);
        }
      });
    };
    
    flatten(tasks);
    return result;
  }, []);

  const getTaskDisplayTitle = useCallback((task: TaskWithChildren): string => {
    const project = (task as unknown).project as Project;
    const level = task.level || 0;
    const prefix = '  '.repeat(level);
    const projectPrefix = project && showProjectNames ? `[${project.name}] ` : '';
    return `${prefix}${projectPrefix}${task.title}`;
  }, [showProjectNames]);

  // AI模式的树形渲染
  if (aiMode && mode === 'tree') {
    const treeData = buildTreeNodes(filteredTasks);
    
    return (
      <Card size="small" style={style}>
        <div style={{ marginBottom: 12 }}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Search
              placeholder="搜索任务..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 200 }}
              allowClear
            />
            <Space>
              <Tooltip title="刷新">
                <Button size="small" onClick={loadTasks} loading={loading}>
                  <ReloadOutlined />
                </Button>
              </Tooltip>
            </Space>
          </Space>
        </div>

        <div style={{ height: treeHeight, overflow: 'auto', border: '1px solid #f0f0f0', borderRadius: 4 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin />
            </div>
          ) : treeData.length === 0 ? (
            <Empty 
              description="暂无匹配的任务" 
              style={{ marginTop: 40 }}
            />
          ) : (
            <Tree
              showIcon
              blockNode
              treeData={treeData}
              expandedKeys={expandedKeys}
              selectedKeys={typeof value === 'object' && value ? [`task-${value.id}`] : []}
              onExpand={(keys) => setExpandedKeys(keys.map(k => k.toString()))}
              onSelect={(keys, info) => {
                if (keys.length > 0 && info.node) {
                  handleChange(info.node.task.id);
                } else {
                  handleChange(undefined);
                }
              }}
              switcherIcon={({ expanded }) => 
                expanded ? <CaretDownOutlined /> : <CaretRightOutlined />
              }
            />
          )}
        </div>

        {typeof value === 'object' && value && (
          <div style={{ marginTop: 8, padding: 8, background: '#f6ffed', border: '1px solid #d9f7be', borderRadius: 4 }}>
            <Text strong>已选择:</Text>
            <div style={{ marginTop: 4 }}>
              <Text>{value.title}</Text>
              {(value as unknown).project && showProjectNames && (
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  ({((value as unknown).project as Project).name})
                </Text>
              )}
            </div>
          </div>
        )}
      </Card>
    );
  }

  const currentTasks = aiMode ? flattenTasks(filteredTasks) : (timerMode ? timerTasks : tasks);
  const canSearch = timerMode || !!projectId || aiMode;
  const currentValue = typeof value === 'object' && value ? value.id : value;

  return (
    <Select
      value={currentValue}
      onChange={handleChange}
      placeholder={placeholder}
      style={style}
      allowClear={allowClear}
      disabled={disabled || (!canSearch && !timerMode && !aiMode)}
      loading={loading}
      showSearch
      filterOption={(input, option) => {
        if (aiMode) {
          const task = (currentTasks as unknown[]).find((t: unknown) => t.id === option?.value);
          const searchText = input.toLowerCase();
          return (
            task?.title?.toLowerCase().includes(searchText) ||
            (task && 'description' in task && task?.description?.toLowerCase().includes(searchText))
          ) || false;
        } else if (timerMode) {
          const task = timerTasks.find(t => t.id === option?.value);
          const searchText = input.toLowerCase();
          return (
            task?.title?.toLowerCase().includes(searchText) ||
            task?.project_name?.toLowerCase().includes(searchText)
          ) || false;
        } else {
          const task = tasks.find(t => t.id === option?.value);
          return task?.title?.toLowerCase().includes(input.toLowerCase()) || false;
        }
      }}
      notFoundContent={
        loading ? <Spin size="small" /> : 
        (!projectId && !timerMode && !aiMode) ? "请先选择项目" : 
        "暂无任务"
      }
    >
      {aiMode ? 
        (currentTasks as TaskWithChildren[]).map(task => (
          <Option key={task.id} value={task.id}>
            <div>
              <Text>{getTaskDisplayTitle(task)}</Text>
              <div style={{ marginTop: 2 }}>
                <Space size={4}>
                  <Tag color={task.status === 'completed' ? 'green' : 'default'}>
                    {task.status === 'todo' ? '待开始' : 
                     task.status === 'in_progress' ? '进行中' : 
                     task.status === 'completed' ? '已完成' : '已取消'}
                  </Tag>
                  {task.custom_fields?.priority && (
                    <Tag 
                      color={task.custom_fields.priority === 'high' ? 'red' : 'orange'}
                    >
                      {task.custom_fields.priority === 'high' ? '高优先级' : '中优先级'}
                    </Tag>
                  )}
                </Space>
              </div>
            </div>
          </Option>
        )) :
        timerMode ? timerTasks.map(renderTimerTaskOption) : tasks.map(renderTaskOption)
      }
    </Select>
  );
};

export default TaskSelector;