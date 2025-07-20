import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Table, Tag, Space, Dropdown, message, Modal, Switch, Card, Col, Row, Select, DatePicker, Checkbox } from 'antd';
import { PlusOutlined, ImportOutlined, MoreOutlined, EditOutlined, DeleteOutlined, EyeOutlined, AppstoreAddOutlined, CaretRightOutlined, HistoryOutlined, MenuOutlined, AppstoreOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { Task, TaskRequest, TaskStatus } from '../types/task';
import { TaskService } from '../services/taskService';
import TaskModal from '../components/TaskModal';
import HierarchicalTaskList from '../components/HierarchicalTaskList';
import ProjectSelector from '../components/ProjectSelector';
import { Project } from '../types/project';
import { projectService } from '../services/projectService';
import dayjs from 'dayjs';
import '../styles/task-inline-edit.css';
import '../styles/task-hierarchy.css';
import '../styles/task-inline-edit-enhanced.css';

const TasksPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  // State management
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [modalLoading, setModalLoading] = useState(false);
  const [hierarchicalView, setHierarchicalView] = useState(true);
  const [parentTaskForNew, setParentTaskForNew] = useState<Task | undefined>();
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
  const [subTasks, setSubTasks] = useState<Map<number, Task[]>>(new Map());
  const [loadingChildren, setLoadingChildren] = useState<Set<number>>(new Set());
  const [editingTitle, setEditingTitle] = useState<number | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState<string>('');
  const [savingTitle, setSavingTitle] = useState<boolean>(false);
  
  // 批量选择相关状态
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  
  // 项目筛选相关状态
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>();
  const [selectedProject, setSelectedProject] = useState<Project | undefined>();
  const [currentProject, setCurrentProject] = useState<Project | undefined>();
  
  // 全局统计状态
  const [globalStats, setGlobalStats] = useState<{
    totalTasks: number;
    todoTasks: number;
    inProgressTasks: number;
    completedTasks: number;
    projectCount: number;
  }>({
    totalTasks: 0,
    todoTasks: 0,
    inProgressTasks: 0,
    completedTasks: 0,
    projectCount: 0
  });

  const projectIdNum = parseInt(projectId || '0');
  
  // 如果URL中有projectId，使用URL中的项目ID，否则使用选择的项目ID
  const effectiveProjectId = projectIdNum || selectedProjectId;

  // Load project information when projectId is provided in URL
  useEffect(() => {
    const loadCurrentProject = async () => {
      if (projectIdNum && projectIdNum > 0) {
        try {
          const project = await projectService.getProject(projectIdNum);
          setCurrentProject(project);
        } catch (error) {
          console.error('Error loading project:', error);
          // Don't show error message for project loading failure
        }
      } else {
        setCurrentProject(undefined);
      }
    };

    loadCurrentProject();
  }, [projectIdNum]);

  // 处理全局模式下的父子任务关系
  useEffect(() => {
    if (!effectiveProjectId && Array.isArray(tasks) && tasks.length > 0) {
      // 构建任务映射和父子关系
      const childrenMap = new Map<number, Task[]>();
      
      // 额外验证每个任务对象
      const validTasks = tasks.filter(task => 
        task && 
        typeof task === 'object' && 
        typeof task.id === 'number'
      );
      
      validTasks.forEach(task => {
        if (task && typeof task === 'object' && task.parent_id && typeof task.parent_id === 'number') {
          if (!childrenMap.has(task.parent_id)) {
            childrenMap.set(task.parent_id, []);
          }
          childrenMap.get(task.parent_id)!.push(task);
        }
      });
      
      // 更新subTasks状态，但只有当内容真正变化时才更新
      if (childrenMap.size > 0) {
        setSubTasks(prev => {
          const newSubTasks = new Map(prev);
          let hasChanges = false;
          
          childrenMap.forEach((children, parentId) => {
            // 检查是否已存在且内容相同
            const existing = newSubTasks.get(parentId);
            if (!existing || existing.length !== children.length || 
                !existing.every((task, index) => task.id === children[index].id)) {
              newSubTasks.set(parentId, children);
              hasChanges = true;
            }
          });
          
          return hasChanges ? newSubTasks : prev;
        });
      }
    }
  }, [effectiveProjectId, tasks]);

  // Load tasks from API
  const loadTasks = useCallback(async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      let response: any;
      if (effectiveProjectId) {
        // Load tasks for specific project
        response = await TaskService.getTasks(effectiveProjectId, {
          page,
          page_size: pageSize,
        });
      } else {
        // Load all tasks across projects
        response = await TaskService.getAllTasks({
          page,
          page_size: pageSize,
        });
      }
      
      // Comprehensive validation of response structure
      if (!response) {
        console.warn('Response is null or undefined');
        setTasks([]);
        setPagination({
          current: page,
          pageSize: pageSize,
          total: 0,
        });
        return;
      }
      
      // Validate response.data exists and is properly structured
      if (!response.data || typeof response.data !== 'object') {
        console.warn('Invalid response.data structure:', response);
        setTasks([]);
        setPagination({
          current: page,
          pageSize: pageSize,
          total: 0,
        });
        return;
      }
      
      // Ensure the data field is an array
      let tasksData: any[] = [];
      if (Array.isArray(response.data)) {
        // If response.data is directly an array
        tasksData = response.data;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        // If response.data.data is the array
        tasksData = response.data.data;
      } else {
        console.warn('Tasks data is not an array:', response.data);
        tasksData = [];
      }
      
      // Additional validation - filter out invalid task objects
      const validTasks = tasksData.filter((task: any) => 
        task && 
        typeof task === 'object' && 
        typeof task.id === 'number' && 
        typeof task.title === 'string'
      );
      
      if (validTasks.length !== tasksData.length) {
        console.warn(`Filtered out ${tasksData.length - validTasks.length} invalid tasks`);
      }
      
      // 确保设置有效的数组
      const finalTasks = Array.isArray(validTasks) ? validTasks : [];
      setTasks(finalTasks);
      
      // 修复分页计算，确保total不会超过实际需要的页数
      const actualTotal = response.pagination?.total || 0;
      const currentPageData = validTasks.length;
      
      // 如果当前页数据少于pageSize且不是第一页，说明这是最后一页
      const adjustedTotal = (page > 1 && currentPageData < pageSize) 
        ? (page - 1) * pageSize + currentPageData 
        : actualTotal;
      
      setPagination({
        current: response.pagination?.page || page,
        pageSize: response.pagination?.page_size || pageSize,
        total: adjustedTotal,
      });
    } catch (error: any) {
      console.error('Error loading tasks:', error);
      
      // 提供更详细的错误信息
      let errorMessage = '获取任务列表失败';
      if (error.message?.includes('Network')) {
        errorMessage = '网络连接失败，请检查网络状态';
      } else if (error.message?.includes('timeout')) {
        errorMessage = '请求超时，请稍后重试';
      } else if (error.message?.includes('404')) {
        errorMessage = '项目不存在或已被删除';
      } else if (error.message?.includes('401') || error.message?.includes('403')) {
        errorMessage = '权限不足，请重新登录';
      }
      
      message.error(errorMessage);
      // Set empty array on error to prevent undefined state
      setTasks([]);
      setPagination({
        current: page,
        pageSize: pageSize,
        total: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [effectiveProjectId]);

  // 获取全局统计数据
  const loadGlobalStats = useCallback(async () => {
    if (effectiveProjectId) return; // 只在全局模式下获取统计
    
    try {
      // 获取不分页的全局任务数据用于统计
      const response: any = await TaskService.getAllTasks({
        page: 1,
        page_size: 1000 // 获取足够多的数据用于统计
      });
      
      if (response && response.data) {
        // Validate that data is an array
        let allTasks: any[] = [];
        if (Array.isArray(response.data)) {
          allTasks = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          allTasks = response.data.data;
        } else {
          console.warn('Global stats: tasks data is not an array:', response.data);
          allTasks = [];
        }
        
        // Filter out invalid tasks
        const validTasks = allTasks.filter((task: any) => 
          task && 
          typeof task === 'object' && 
          typeof task.id === 'number' && 
          typeof task.status === 'string' &&
          typeof task.project_id === 'number'
        );
        
        // 额外的安全检查
        if (!Array.isArray(validTasks)) {
          console.warn('Valid tasks is not an array after filtering');
          return;
        }
        
        const stats = {
          totalTasks: response.pagination?.total || validTasks.length,
          todoTasks: validTasks.filter((task: any) => task.status === 'todo').length,
          inProgressTasks: validTasks.filter((task: any) => task.status === 'in_progress').length,
          completedTasks: validTasks.filter((task: any) => task.status === 'completed').length,
          projectCount: new Set(validTasks.map((task: any) => task.project_id)).size
        };
        setGlobalStats(stats);
      }
    } catch (error) {
      console.error('Error loading global stats:', error);
      // Don't show error message for stats loading failure
    }
  }, [effectiveProjectId]);

  // 在全局模式下加载统计数据
  useEffect(() => {
    if (!effectiveProjectId) {
      loadGlobalStats();
    }
  }, [effectiveProjectId, loadGlobalStats]);

  // Load tasks on component mount
  useEffect(() => {
    loadTasks();
  }, [loadTasks]); // 当loadTasks函数变化时重新加载任务
  
  // Initial load is handled by the loadTasks useEffect above
  
  // 项目选择处理函数
  const handleProjectChange = (projectId: number, project?: Project) => {
    setSelectedProjectId(projectId);
    setSelectedProject(project);
    // 清空展开状态和子任务缓存
    setExpandedTasks(new Set());
    setSubTasks(new Map());
  };
  
  // 处理项目清除（回到全局视图）
  const handleProjectClear = () => {
    setSelectedProjectId(undefined);
    setSelectedProject(undefined);
    setExpandedTasks(new Set());
    setSubTasks(new Map());
    // 重新加载全局任务
    loadTasks();
  };

  // Handle task creation - 修复项目继承逻辑
  const handleCreateTask = async (taskData: TaskRequest) => {
    setModalLoading(true);
    try {
      // 确定项目ID的优先级：父任务项目 > 当前选择的项目
      let projectId = effectiveProjectId;
      
      if (parentTaskForNew) {
        // 子任务必须使用父任务的项目ID
        projectId = parentTaskForNew.project_id;
        
        if (!projectId || projectId <= 0) {
          message.error('父任务缺少有效的项目信息，无法创建子任务');
          return;
        }
        
        // 验证项目一致性
        if (effectiveProjectId && effectiveProjectId !== projectId) {
          console.warn(`Project ID mismatch: effective=${effectiveProjectId}, parent=${projectId}`);
        }
      } else if (!projectId || projectId <= 0) {
        message.error('任务必须关联一个有效项目，请先选择项目');
        return;
      }
      
      // 添加parent_id如果是创建子任务
      const requestData = parentTaskForNew 
        ? { ...taskData, parent_id: parentTaskForNew.id }
        : taskData;
      
      console.log('Creating task with project ID:', projectId, 'Parent:', parentTaskForNew?.id);
      
      await TaskService.createTask(projectId, requestData);
      message.success(parentTaskForNew ? '子任务创建成功' : '任务创建成功');
      setTaskModalVisible(false);
      setParentTaskForNew(undefined);
      
      // 刷新任务列表
      setSubTasks(new Map());
      setExpandedTasks(new Set());
      loadTasks(pagination.current, pagination.pageSize);
      
      // 如果是全局模式下创建的子任务，自动展开父任务
      if (!effectiveProjectId && parentTaskForNew) {
        setTimeout(() => {
          setExpandedTasks(prev => new Set(prev).add(parentTaskForNew.id));
        }, 500);
      }
    } catch (error: any) {
      console.error('Task creation error:', error);
      message.error(error.message || '任务创建失败');
    } finally {
      setModalLoading(false);
    }
  };

  // Handle task update
  const handleUpdateTask = async (taskData: TaskRequest) => {
    if (!editingTask) return;
    
    setModalLoading(true);
    try {
      // 严格验证项目关联
      const projectId = effectiveProjectId || editingTask.project_id;
      
      if (!projectId || projectId <= 0) {
        message.error('任务缺少有效的项目关联，无法更新');
        return;
      }
      
      await TaskService.updateTask(projectId, editingTask.id, taskData);
      message.success('任务更新成功');
      setTaskModalVisible(false);
      setEditingTask(undefined);
      
      // Refresh task list and clear expanded subtasks cache to reflect changes
      setSubTasks(new Map());
      setExpandedTasks(new Set());
      loadTasks(pagination.current, pagination.pageSize);
    } catch (error: any) {
      message.error(error.message || '任务更新失败');
    } finally {
      setModalLoading(false);
    }
  };

  // Handle task deletion
  const handleDeleteTask = (task: Task) => {
    const hasChildren = (task.custom_fields?.children_count || 0) > 0;
    const deleteMessage = hasChildren 
      ? `确定要删除任务"${task.title}"吗？\n\n⚠️ 删除此任务将同时删除其所有子任务，此操作不可撤销。`
      : `确定要删除任务"${task.title}"吗？此操作不可撤销。`;
    
    Modal.confirm({
      title: '确认删除',
      content: deleteMessage,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          // Use the task's project_id if effectiveProjectId is not available (for global task list)
          const projectId = effectiveProjectId || task.project_id;
          await TaskService.deleteTask(projectId, task.id);
          const successMessage = hasChildren 
            ? '任务及其所有子任务删除成功' 
            : '任务删除成功';
          message.success(successMessage);
          
          // Refresh task list and clear expanded subtasks cache to reflect changes
          setSubTasks(new Map());
          setExpandedTasks(new Set());
          loadTasks(pagination.current, pagination.pageSize);
        } catch (error: any) {
          message.error(error.message || '任务删除失败');
        }
      },
    });
  };

  // Handle edit task
  const handleEditTask = (task: Task) => {
    // 确保任务有有效的项目ID
    if (!task.project_id) {
      message.error('无法编辑此任务：缺少项目信息');
      return;
    }
    setEditingTask(task);
    setTaskModalVisible(true);
  };

  // Handle create new task
  const handleNewTask = () => {
    if (!effectiveProjectId) {
      message.warning('全局模式下请先从上方选择一个项目，然后新建任务');
      return;
    }
    setEditingTask(undefined);
    setParentTaskForNew(undefined);
    setTaskModalVisible(true);
  };

  // Handle create subtask - 修复项目继承逻辑
  const handleCreateSubTask = (parentTask: Task) => {
    // 严格验证父任务的项目ID
    if (!parentTask.project_id || parentTask.project_id <= 0) {
      message.error('无法为此任务创建子任务：父任务缺少有效的项目信息');
      return;
    }
    
    // 在全局模式下，自动设置项目选择器到父任务的项目
    if (!effectiveProjectId && parentTask.project_id) {
      message.info(`已自动选择项目：${(parentTask as any).project_name || parentTask.project_id}`);
      setSelectedProjectId(parentTask.project_id);
      // 如果有项目名称，也设置项目对象
      if ((parentTask as any).project_name) {
        setSelectedProject({
          id: parentTask.project_id,
          name: (parentTask as any).project_name,
          description: '',
          owner_id: 1, // 默认值
          created_at: '',
          updated_at: ''
        });
      }
    }
    
    // 验证项目一致性
    if (effectiveProjectId && effectiveProjectId !== parentTask.project_id) {
      message.warning(`注意：当前选择的项目与父任务项目不一致。子任务将创建在父任务的项目中。`);
    }
    
    setEditingTask(undefined);
    setParentTaskForNew(parentTask);
    setTaskModalVisible(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setTaskModalVisible(false);
    setEditingTask(undefined);
    setParentTaskForNew(undefined);
  };

  // Handle pagination change
  const handleTableChange = (paginationParams: any) => {
    loadTasks(paginationParams.current, paginationParams.pageSize);
  };

  // Handle task expand/collapse
  const handleToggleExpand = async (task: Task) => {
    const taskId = task.id;
    const newExpandedTasks = new Set(expandedTasks);
    
    if (expandedTasks.has(taskId)) {
      // Collapse - 递归折叠所有子任务
      const collapseRecursively = (parentId: number) => {
        newExpandedTasks.delete(parentId);
        const children = subTasks.get(parentId) || [];
        children.forEach(child => {
          if (expandedTasks.has(child.id)) {
            collapseRecursively(child.id);
          }
        });
      };
      
      collapseRecursively(taskId);
      setExpandedTasks(newExpandedTasks);
    } else {
      // Expand - load subtasks if not already loaded
      if (!subTasks.has(taskId)) {
        // 防止重复加载
        if (loadingChildren.has(taskId)) {
          return;
        }
        
        try {
          // 设置加载状态
          setLoadingChildren(prev => new Set(prev).add(taskId));
          
          // Use the task's project_id if effectiveProjectId is not available (for global task list)
          const projectId = effectiveProjectId || task.project_id;
          const children = await TaskService.getTaskChildren(projectId, taskId);
          
          // 验证子任务数据
          const validChildren = Array.isArray(children) ? children.filter(child => 
            child && 
            typeof child === 'object' && 
            typeof child.id === 'number'
          ) : [];
          
          const newSubTasks = new Map(subTasks);
          newSubTasks.set(taskId, validChildren);
          setSubTasks(newSubTasks);
          
          // 展开任务
          newExpandedTasks.add(taskId);
          setExpandedTasks(newExpandedTasks);
          
        } catch (error: any) {
          console.error('Error loading children for task:', taskId, error);
          message.error(error.message || '获取子任务失败');
          return;
        } finally {
          // 清除加载状态
          setLoadingChildren(prev => {
            const newSet = new Set(prev);
            newSet.delete(taskId);
            return newSet;
          });
        }
      } else {
        // 子任务已加载，直接展开
        newExpandedTasks.add(taskId);
        setExpandedTasks(newExpandedTasks);
      }
    }
  };

  // Handle view task details
  const handleViewTask = (task: Task) => {
    navigate(`/projects/${task.project_id}/tasks/${task.id}`);
  };

  // Handle status update - 内联编辑状态
  const handleStatusUpdate = async (taskId: number, newStatus: string, task: Task) => {
    try {
      const projectId = effectiveProjectId || task.project_id;
      if (!projectId) {
        message.error('无法更新任务状态：缺少项目信息');
        return;
      }

      // 添加加载状态提示
      const hideLoading = message.loading('正在更新状态...', 0);

      await TaskService.updateTask(projectId, taskId, { 
        status: newStatus as any
      });
      
      hideLoading();
      message.success('状态更新成功');
      
      // 刷新任务列表
      loadTasks(pagination.current, pagination.pageSize);
    } catch (error: any) {
      console.error('Status update error:', error);
      if (error.statusCode === 403) {
        message.error('权限不足，无法更新任务状态');
      } else if (error.statusCode === 404) {
        message.error('任务不存在或已被删除');
      } else {
        message.error(error.message || '状态更新失败');
      }
    }
  };

  // Handle due date update - 内联编辑截止日期
  const handleDueDateUpdate = async (taskId: number, newDueDate: string | null, task: Task) => {
    try {
      const projectId = effectiveProjectId || task.project_id;
      if (!projectId) {
        message.error('无法更新截止日期：缺少项目信息');
        return;
      }

      // 添加加载状态提示
      const hideLoading = message.loading('正在更新截止日期...', 0);

      await TaskService.updateTask(projectId, taskId, { 
        due_date: newDueDate || undefined
      });
      
      hideLoading();
      message.success('截止日期更新成功');
      
      // 刷新任务列表
      loadTasks(pagination.current, pagination.pageSize);
    } catch (error: any) {
      console.error('Due date update error:', error);
      if (error.statusCode === 403) {
        message.error('权限不足，无法更新截止日期');
      } else if (error.statusCode === 404) {
        message.error('任务不存在或已被删除');
      } else {
        message.error(error.message || '截止日期更新失败');
      }
    }
  };

  // Handle title inline editing
  const handleTitleEdit = (task: Task) => {
    setEditingTitle(task.id);
    setEditingTitleValue(task.title);
  };

  const handleTitleSave = async (task: Task) => {
    if (savingTitle) return; // 防止重复提交
    
    const trimmedValue = editingTitleValue.trim();
    
    if (!trimmedValue) {
      message.warning('任务标题不能为空');
      return;
    }

    if (trimmedValue === task.title) {
      setEditingTitle(null);
      setEditingTitleValue('');
      return;
    }

    try {
      setSavingTitle(true);
      
      const projectId = effectiveProjectId || task.project_id;
      if (!projectId) {
        message.error('无法更新任务：缺少项目信息');
        return;
      }

      await TaskService.updateTask(projectId, task.id, {
        title: trimmedValue
      });

      message.success('任务标题更新成功');
      setEditingTitle(null);
      setEditingTitleValue('');
      
      // 刷新任务列表
      loadTasks(pagination.current, pagination.pageSize);
    } catch (error: any) {
      console.error('Title update error:', error);
      if (error.statusCode === 403) {
        message.error('权限不足，无法更新任务标题');
      } else if (error.statusCode === 404) {
        message.error('任务不存在或已被删除');
      } else {
        message.error(error.message || '标题更新失败');
      }
    } finally {
      setSavingTitle(false);
    }
  };

  const handleTitleCancel = () => {
    setEditingTitle(null);
    setEditingTitleValue('');
  };

  // 批量选择处理函数
  const handleSelectTask = (taskId: number, checked: boolean) => {
    setSelectedTaskIds(prev => {
      if (checked) {
        return [...prev, taskId];
      } else {
        return prev.filter(id => id !== taskId);
      }
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const validTasks = Array.isArray(stableDataSource) ? stableDataSource : [];
      const allTaskIds = validTasks.map(task => task.id);
      setSelectedTaskIds(allTaskIds);
    } else {
      setSelectedTaskIds([]);
    }
  };

  const handleBulkDelete = () => {
    if (selectedTaskIds.length === 0) {
      message.warning('请先选择要删除的任务');
      return;
    }

    const hasChildren = selectedTaskIds.some(taskId => {
      const task = stableDataSource.find(t => t.id === taskId);
      return task && (task.custom_fields?.children_count || 0) > 0;
    });

    const deleteMessage = hasChildren 
      ? `确定要删除选中的 ${selectedTaskIds.length} 个任务吗？\n\n⚠️ 删除包含子任务的任务将同时删除其所有子任务，此操作不可撤销。`
      : `确定要删除选中的 ${selectedTaskIds.length} 个任务吗？此操作不可撤销。`;

    Modal.confirm({
      title: '批量删除确认',
      content: deleteMessage,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        setBulkDeleteLoading(true);
        try {
          const projectId = effectiveProjectId;
          if (!projectId) {
            message.error('无法删除任务：缺少项目信息');
            return;
          }

          const result = await TaskService.bulkDeleteTasks(projectId, selectedTaskIds);
          message.success(result.message);
          
          // 清空选择
          setSelectedTaskIds([]);
          
          // 刷新任务列表
          setSubTasks(new Map());
          setExpandedTasks(new Set());
          loadTasks(pagination.current, pagination.pageSize);
        } catch (error: any) {
          message.error(error.message || '批量删除失败');
        } finally {
          setBulkDeleteLoading(false);
        }
      },
    });
  };


  // Build expanded data source including subtasks - 修复层级处理和数据验证
  const buildExpandedDataSource = useCallback(() => {
    try {
      // Ensure tasks is always an array and not null/undefined
      if (!tasks || !Array.isArray(tasks)) {
        console.warn('Tasks is not a valid array:', tasks);
        return [];
      }

      // 额外的数组验证
      const validTasks = tasks.filter(task => 
        task && 
        typeof task === 'object' && 
        typeof task.id === 'number' &&
        typeof task.title === 'string'
      );

      if (validTasks.length === 0) {
        console.warn('No valid tasks found');
        return [];
      }

      const result: (Task & { isSubTask?: boolean; depth?: number })[] = [];
      
      // Recursive function to add tasks and their expanded children
      const addTaskWithChildren = (task: Task, depth: number) => {
        try {
          if (!task || typeof task !== 'object' || typeof task.id !== 'number') {
            console.warn('Invalid task object:', task);
            return;
          }
          
          result.push({ ...task, isSubTask: depth > 0, depth });
          
          // Add expanded subtasks recursively
          if (expandedTasks.has(task.id)) {
            const children = subTasks.get(task.id) || [];
            if (Array.isArray(children)) {
              children.forEach(child => {
                if (child && typeof child === 'object' && typeof child.id === 'number') {
                  addTaskWithChildren(child, depth + 1);
                }
              });
            }
          }
        } catch (error) {
          console.error('Error adding task with children:', error, task);
        }
      };
      
      // 在全局模式下，需要特殊处理层级关系
      if (!effectiveProjectId) {
        // 构建任务映射和父子关系
        const taskMap = new Map<number, Task>();
        const childrenMap = new Map<number, Task[]>();
        
        validTasks.forEach(task => {
          if (task && typeof task === 'object' && typeof task.id === 'number') {
            taskMap.set(task.id, task);
            if (task.parent_id && typeof task.parent_id === 'number') {
              if (!childrenMap.has(task.parent_id)) {
                childrenMap.set(task.parent_id, []);
              }
              childrenMap.get(task.parent_id)!.push(task);
            }
          }
        });
        
        // 只显示根任务，子任务通过展开显示
        const rootTasks = validTasks.filter(task => 
          task && typeof task === 'object' && typeof task.id === 'number' && !task.parent_id
        );
        rootTasks.forEach(task => {
          if (task && typeof task === 'object' && typeof task.id === 'number') {
            addTaskWithChildren(task, 0);
          }
        });
        
        // 如果有子任务在全局任务列表中，但父任务不在当前页面，单独显示这些"孤儿"子任务
        const orphanTasks = validTasks.filter(task => {
          if (!task || typeof task !== 'object' || typeof task.id !== 'number' || !task.parent_id) return false;
          // 检查父任务是否在当前任务列表中
          return !taskMap.has(task.parent_id);
        });
        
        orphanTasks.forEach(task => {
          if (task && typeof task === 'object' && typeof task.id === 'number') {
            // 为孤儿任务设置depth为1，表示它是某个不在当前页面的父任务的子任务
            addTaskWithChildren(task, 1);
          }
        });
        
      } else {
        // 项目模式下的原有逻辑
        const rootTasks = validTasks.filter(task => 
          task && typeof task === 'object' && typeof task.id === 'number' && !task.parent_id
        );
        rootTasks.forEach(task => {
          if (task && typeof task === 'object' && typeof task.id === 'number') {
            addTaskWithChildren(task, 0);
          }
        });
      }
      
      // 确保返回值是数组
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error in buildExpandedDataSource:', error);
      return [];
    }
  }, [tasks, effectiveProjectId, expandedTasks, subTasks]);

  // 使用 useMemo 创建稳定的数据源
  const stableDataSource = useMemo(() => {
    try {
      // Double-check that tasks is a valid array
      if (!tasks || !Array.isArray(tasks)) {
        console.warn('Tasks is not an array in useMemo:', tasks);
        return [];
      }
      
      // Ensure tasks contains valid objects
      const validTasks = tasks.filter(task => 
        task && 
        typeof task === 'object' && 
        typeof task.id === 'number'
      );
      
      if (validTasks.length === 0) {
        return [];
      }
      
      const result = buildExpandedDataSource();
      
      // Ensure result is a valid array with valid objects
      if (!Array.isArray(result)) {
        console.warn('buildExpandedDataSource returned non-array:', result);
        return [];
      }
      
      const validResult = result.filter(item => 
        item && 
        typeof item === 'object' && 
        typeof item.id === 'number'
      );
      
      return validResult;
    } catch (error) {
      console.error('Error in stableDataSource useMemo:', error);
      return [];
    }
  }, [buildExpandedDataSource, tasks]);

  const columns = [
    {
      title: (
        <Checkbox
          indeterminate={selectedTaskIds.length > 0 && selectedTaskIds.length < stableDataSource.length}
          onChange={(e) => handleSelectAll(e.target.checked)}
          checked={stableDataSource.length > 0 && selectedTaskIds.length === stableDataSource.length}
        >
          选择
        </Checkbox>
      ),
      dataIndex: 'selection',
      key: 'selection',
      width: '60px',
      render: (_: any, record: Task) => (
        <Checkbox
          checked={selectedTaskIds.includes(record.id)}
          onChange={(e) => handleSelectTask(record.id, e.target.checked)}
        />
      ),
    },
    {
      title: '任务名称',
      dataIndex: 'title',
      key: 'title',
      width: effectiveProjectId ? '35%' : '25%',
      render: (text: string, record: Task & { isSubTask?: boolean; depth?: number }) => {
        const depth = record.depth || 0;
        const isSubTask = depth > 0;
        const hasChildren = (record.custom_fields?.children_count || 0) > 0;
        const isExpanded = expandedTasks.has(record.id);
        
        return (
          <div className="task-name-with-indent">
            {/* 缩进空间 */}
            <div 
              className="task-indent-space" 
              style={{ width: depth * 20 }}
            />
            
            {/* 层级连接线容器 */}
            {depth > 0 && (
              <div className="task-connection-container">
                <div className="task-connection-line" />
              </div>
            )}
            
            {/* 层级深度指示器 */}
            {depth > 0 && (
              <div className={`task-depth-indicator depth-${Math.min(depth, 4)}`} />
            )}
            
            {/* 展开/收起按钮 */}
            {hasChildren ? (
              <button
                className={`task-expand-button ${isExpanded ? 'expanded' : ''} ${loadingChildren.has(record.id) ? 'loading' : ''}`}
                onClick={() => handleToggleExpand(record)}
                aria-expanded={isExpanded}
                title={loadingChildren.has(record.id) ? '加载中...' : (isExpanded ? '折叠子任务' : '展开子任务')}
                disabled={loadingChildren.has(record.id)}
              >
                {loadingChildren.has(record.id) ? (
                  <span className="loading-spinner">⟳</span>
                ) : (
                  <CaretRightOutlined />
                )}
              </button>
            ) : (
              <span style={{ width: '20px', display: 'inline-block' }} />
            )}
            
            {/* 任务图标 */}
            {hasChildren && (
              <span className="parent-task-icon">📁</span>
            )}
            {isSubTask && (
              <span className="sub-task-icon">📄</span>
            )}
            
            {/* 任务名称文本 */}
            <div 
              className="task-name-text"
              onMouseEnter={(e) => {
                const editIcon = e.currentTarget.querySelector('.task-title-edit-icon');
                if (editIcon) {
                  (editIcon as HTMLElement).style.opacity = '1';
                }
              }}
              onMouseLeave={(e) => {
                const editIcon = e.currentTarget.querySelector('.task-title-edit-icon');
                if (editIcon) {
                  (editIcon as HTMLElement).style.opacity = '0';
                }
              }}
            >
              {editingTitle === record.id ? (
                <div className="inline-edit-buttons">
                  <input
                    type="text"
                    value={editingTitleValue}
                    onChange={(e) => setEditingTitleValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleTitleSave(record);
                      } else if (e.key === 'Escape') {
                        handleTitleCancel();
                      }
                    }}
                    onBlur={() => handleTitleSave(record)}
                    autoFocus
                    className="inline-edit-input"
                    style={{
                      fontSize: '14px',
                      fontWeight: isSubTask ? 400 : 500,
                      color: isSubTask ? '#666' : '#000',
                      width: '300px',
                      lineHeight: '20px',
                      padding: '4px 8px'
                    }}
                  />
                  <button
                    onClick={() => handleTitleSave(record)}
                    className="inline-edit-button save"
                    disabled={savingTitle}
                  >
                    {savingTitle ? '保存中...' : '保存'}
                  </button>
                  <button
                    onClick={handleTitleCancel}
                    className="inline-edit-button cancel"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewTask(record);
                    }}
                    style={{ 
                      fontWeight: isSubTask ? 400 : 500,
                      color: isSubTask ? '#1890ff' : '#1890ff',
                      marginBottom: record.description ? '2px' : '0',
                      lineHeight: '20px',
                      cursor: 'pointer',
                      textDecoration: 'none',
                      border: 'none',
                      background: 'none',
                      padding: 0,
                      font: 'inherit'
                    }}
                    title="点击查看任务详情"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.textDecoration = 'underline';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.textDecoration = 'none';
                    }}
                  >
                    {text}
                  </button>
                  <div
                    className="task-title-edit-icon"
                    style={{
                      opacity: 0,
                      transition: 'opacity 0.2s',
                      cursor: 'pointer',
                      color: '#999',
                      fontSize: '12px'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTitleEdit(record);
                    }}
                    title="编辑任务标题"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#1890ff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#999';
                    }}
                  >
                    ✏️
                  </div>
                </div>
              )}
              
              {/* 任务描述 */}
              {record.description && (
                <div style={{ 
                  color: '#8c8c8c', 
                  fontSize: 12, 
                  lineHeight: '1.3',
                  maxWidth: '300px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {record.description}
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    
    // 项目列 - 只在全局视图显示，并且优化样式
    ...(!effectiveProjectId ? [{
      title: '所属项目',
      dataIndex: 'project_name',
      key: 'project_name',
      width: '15%',
      render: (name: string, record: Task) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: `hsl(${(record.project_id * 137.5) % 360}, 70%, 60%)`
          }} />
          <span style={{ 
            fontWeight: 500,
            color: '#262626'
          }}>
            {name || '未知项目'}
          </span>
        </div>
      ),
    }] : []),

    // 状态列 - 增强版内联编辑
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: '12%',
      render: (status: TaskStatus, record: Task) => {
        const statusConfig = {
          todo: { color: 'default', text: '待办', bgColor: '#fafafa', dotColor: '#d9d9d9' },
          in_progress: { color: 'processing', text: '进行中', bgColor: '#e6f7ff', dotColor: '#1890ff' },
          completed: { color: 'success', text: '已完成', bgColor: '#f6ffed', dotColor: '#52c41a' },
          cancelled: { color: 'error', text: '已取消', bgColor: '#fff2f0', dotColor: '#ff4d4f' }
        };
        
        const config = statusConfig[status] || statusConfig.todo;
        
        return (
          <Select
            value={status}
            onChange={(newStatus) => handleStatusUpdate(record.id, newStatus, record)}
            style={{ 
              width: '100%',
              backgroundColor: config.bgColor,
              borderRadius: '4px'
            }}
            variant="borderless"
            size="small"
            dropdownStyle={{ minWidth: 140 }}
            suffixIcon={null}
          >
            {Object.entries(statusConfig).map(([key, conf]) => (
              <Select.Option key={key} value={key}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: conf.dotColor
                  }} />
                  <span style={{ fontWeight: 500 }}>{conf.text}</span>
                </div>
              </Select.Option>
            ))}
          </Select>
        );
      },
    },
    
    // 负责人列
    {
      title: '负责人',
      dataIndex: 'assignee_name',
      key: 'assignee_name',
      width: '12%',
      render: (name: string, record: Task) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: name ? '#1890ff' : '#d9d9d9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            color: 'white',
            fontWeight: 500
          }}>
            {name ? name.charAt(0).toUpperCase() : '?'}
          </div>
          <span style={{ 
            color: name ? '#262626' : '#8c8c8c',
            fontSize: '13px'
          }}>
            {name || '未分配'}
          </span>
        </div>
      ),
    },
    
    // 截止时间列 - 增强版内联编辑
    {
      title: '截止时间',
      dataIndex: 'due_date',
      key: 'due_date',
      width: '12%',
      render: (date: string, record: Task) => {
        const currentDate = date ? dayjs(date) : null;
        const now = dayjs();
        const isOverdue = currentDate && currentDate.isBefore(now, 'day');
        const isUpcoming = currentDate && currentDate.diff(now, 'day') <= 3 && currentDate.diff(now, 'day') >= 0;
        
        let bgColor = '#fafafa';
        let textColor = '#8c8c8c';
        let icon = '📅';
        
        if (isOverdue) {
          bgColor = '#fff2f0';
          textColor = '#ff4d4f';
          icon = '⚠️';
        } else if (isUpcoming) {
          bgColor = '#fff7e6';
          textColor = '#fa8c16';
          icon = '⏰';
        }
        
        return (
          <DatePicker
            value={currentDate}
            onChange={(newDate) => {
              const dateString = newDate ? newDate.format('YYYY-MM-DD') : null;
              handleDueDateUpdate(record.id, dateString, record);
            }}
            style={{ 
              width: '100%',
              backgroundColor: bgColor,
              borderRadius: '4px',
              color: textColor,
              fontWeight: 500
            }}
            variant="borderless"
            size="small"
            placeholder="设置截止日期"
            format="YYYY-MM-DD"
            allowClear
            suffixIcon={
              <span style={{ fontSize: '12px' }}>{icon}</span>
            }
          />
        );
      },
    },

    // 创建时间列 - 只在全局视图显示
    ...(!effectiveProjectId ? [{
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: '12%',
      render: (date: string) => {
        if (!date) return '-';
        const createDate = new Date(date);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - createDate.getTime()) / (1000 * 60 * 60 * 24));
        
        let timeText = '';
        if (diffDays === 0) {
          timeText = '今天';
        } else if (diffDays === 1) {
          timeText = '昨天';
        } else if (diffDays < 7) {
          timeText = `${diffDays}天前`;
        } else {
          timeText = createDate.toLocaleDateString();
        }
        
        return (
          <span style={{ color: '#8c8c8c', fontSize: '13px' }}>
            {timeText}
          </span>
        );
      },
    }] : []),

    // 标签列
    {
      title: '标签',
      key: 'tags',
      width: effectiveProjectId ? '12%' : '10%',
      render: (_: any, record: Task) => {
        const tags = record.custom_fields?.tags || [];
        
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
            {Array.isArray(tags) && tags.length > 0 ? (
              <>
                {tags.slice(0, 2).map((tag: string) => (
                  <Tag 
                    key={tag} 
                    style={{ 
                      marginBottom: 2, 
                      fontSize: '11px',
                      padding: '0 6px',
                      lineHeight: '18px',
                      borderRadius: '9px'
                    }}
                    color="blue"
                  >
                    {tag}
                  </Tag>
                ))}
                {tags.length > 2 && (
                  <Tag style={{ 
                    fontSize: '11px',
                    padding: '0 6px',
                    lineHeight: '18px',
                    borderRadius: '9px'
                  }}>
                    +{tags.length - 2}
                  </Tag>
                )}
              </>
            ) : (
              <span style={{ color: '#8c8c8c', fontSize: '12px' }}>无标签</span>
            )}
          </div>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: Task & { isSubTask?: boolean; depth?: number }) => (
        <Space size="small">
          {/* 添加子任务按钮 */}
          <Button
            type="text"
            size="small"
            icon={<AppstoreAddOutlined />}
            onClick={() => handleCreateSubTask(record)}
            title="添加子任务"
          />
          
          {/* 查看按钮 - 外显 */}
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewTask(record)}
            title="查看详情"
          />
          
          {/* 更多操作下拉菜单 */}
          <Dropdown
            menu={{
              items: [
                {
                  key: 'history',
                  label: '更新历史',
                  icon: <HistoryOutlined />,
                  onClick: () => navigate(`/projects/${record.project_id}/tasks/${record.id}?tab=history`),
                },
                {
                  key: 'edit',
                  label: '编辑',
                  icon: <EditOutlined />,
                  onClick: () => handleEditTask(record),
                },
                {
                  key: 'delete',
                  label: '删除',
                  icon: <DeleteOutlined />,
                  danger: true,
                  onClick: () => handleDeleteTask(record),
                },
              ],
            }}
          >
            <Button type="text" size="small" icon={<MoreOutlined />} title="更多操作" />
          </Dropdown>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      {/* 项目选择卡片 - 增强样式 */}
      {!projectId && (
        <Card 
          style={{
            marginBottom: '24px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            borderRadius: '12px',
            border: 'none',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
          }}
        >
          <Row gutter={[24, 16]} align="middle">
            <Col xs={24} sm={12} md={10} lg={8}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px', 
                  fontWeight: 600,
                  color: 'white',
                  fontSize: '16px'
                }}>
                  选择项目
                </label>
                <ProjectSelector
                  value={selectedProjectId}
                  onChange={(projectId, project) => {
                    if (projectId) {
                      handleProjectChange(projectId, project);
                    } else {
                      handleProjectClear();
                    }
                  }}
                  style={{ width: '100%' }}
                  placeholder="全部项目"
                  allowClear
                />
              </div>
            </Col>
            
            {selectedProject && (
              <Col xs={24} sm={12} md={14} lg={16}>
                <div style={{ 
                  padding: '16px 20px',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '8px',
                  backdropFilter: 'blur(10px)'
                }}>
                  <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
                    <strong>当前项目:</strong> {selectedProject.name}
                  </div>
                  <div style={{ fontSize: '14px', opacity: 0.9 }}>
                    {selectedProject.description || '暂无描述'}
                  </div>
                </div>
              </Col>
            )}
          </Row>
        </Card>
      )}
      
      {/* 现代化头部卡片 */}
      <Card 
        style={{
          marginBottom: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderRadius: '12px',
          border: 'none'
        }}
      >
        <Row justify="space-between" align="middle">
          <Col>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div>
                <h1 style={{ 
                  margin: 0, 
                  fontSize: '24px', 
                  fontWeight: 600, 
                  color: '#262626' 
                }}>
                  {effectiveProjectId ? '项目任务列表' : '全局任务列表'}
                </h1>
                <p style={{ 
                  margin: '4px 0 0 0', 
                  color: '#8c8c8c',
                  fontSize: '14px'
                }}>
                  {projectId ? `项目: ${currentProject?.name || '加载中...'}` : 
                   selectedProject ? `项目: ${selectedProject.name}` : 
                   '全部项目 - 跨项目任务管理'}
                </p>
              </div>
              
              {/* 统计信息 */}
              {!effectiveProjectId && globalStats.totalTasks > 0 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{
                    padding: '6px 12px',
                    backgroundColor: '#f0f9ff',
                    border: '1px solid #91d5ff',
                    borderRadius: '16px',
                    fontSize: '13px',
                    color: '#1890ff',
                    fontWeight: 500
                  }}>
                    📊 {globalStats.projectCount} 个项目
                  </div>
                  <div style={{
                    padding: '6px 12px',
                    backgroundColor: '#f6ffed',
                    border: '1px solid #b7eb8f',
                    borderRadius: '16px',
                    fontSize: '13px',
                    color: '#52c41a',
                    fontWeight: 500
                  }}>
                    ✅ {globalStats.completedTasks} 已完成
                  </div>
                  <div style={{
                    padding: '6px 12px',
                    backgroundColor: '#fff7e6',
                    border: '1px solid #ffd591',
                    borderRadius: '16px',
                    fontSize: '13px',
                    color: '#fa8c16',
                    fontWeight: 500
                  }}>
                    ⏳ {globalStats.inProgressTasks} 进行中
                  </div>
                  <div style={{
                    padding: '6px 12px',
                    backgroundColor: '#fafafa',
                    border: '1px solid #d9d9d9',
                    borderRadius: '16px',
                    fontSize: '13px',
                    color: '#8c8c8c',
                    fontWeight: 500
                  }}>
                    📝 {globalStats.todoTasks} 待开始
                  </div>
                </div>
              )}
              
              {/* 单项目任务数量徽章 */}
              {effectiveProjectId && tasks.length > 0 && (
                <div style={{
                  padding: '4px 12px',
                  backgroundColor: '#e6f7ff',
                  border: '1px solid #91d5ff',
                  borderRadius: '16px',
                  fontSize: '14px',
                  color: '#1890ff',
                  fontWeight: 500
                }}>
                  共 {tasks.length} 个任务
                </div>
              )}
            </div>
          </Col>
          
          <Col>
            <Space size="large">
              {/* 视图切换 - 现代化设计 */}
              {effectiveProjectId && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  padding: '8px 16px',
                  backgroundColor: '#fafafa',
                  borderRadius: '20px',
                  border: '1px solid #d9d9d9'
                }}>
                  <MenuOutlined 
                    style={{ 
                      color: hierarchicalView ? '#1890ff' : '#8c8c8c',
                      fontSize: '16px',
                      transition: 'color 0.3s'
                    }} 
                  />
                  <Switch
                    checked={hierarchicalView}
                    onChange={setHierarchicalView}
                    checkedChildren="层级"
                    unCheckedChildren="列表"
                    style={{ fontWeight: 500 }}
                  />
                  <AppstoreOutlined 
                    style={{ 
                      color: !hierarchicalView ? '#1890ff' : '#8c8c8c',
                      fontSize: '16px',
                      transition: 'color 0.3s'
                    }} 
                  />
                </div>
              )}

              <Button
                type="default"
                icon={<ImportOutlined />}
                onClick={() => {
                  if (!effectiveProjectId) {
                    message.warning('全局模式下请先从上方选择一个项目，然后进行批量导入');
                    return;
                  }
                  navigate(`/projects/${effectiveProjectId}/bulk-import`);
                }}
                style={{ height: '40px' }}
              >
                批量导入
              </Button>
              
              {selectedTaskIds.length > 0 && (
                <Button
                  type="default"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={handleBulkDelete}
                  loading={bulkDeleteLoading}
                  style={{ height: '40px' }}
                >
                  批量删除 ({selectedTaskIds.length})
                </Button>
              )}
              
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  if (!effectiveProjectId) {
                    message.warning('全局模式下请先从上方选择一个项目，然后新建任务');
                    return;
                  }
                  handleNewTask();
                }}
                size="large"
                style={{ 
                  height: '40px',
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(24,144,255,0.3)'
                }}
              >
                新建任务
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 任务内容区域 */}
      {effectiveProjectId ? (
        <Card
          style={{
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            borderRadius: '12px',
            border: 'none',
            minHeight: '500px'
          }}
        >
          {hierarchicalView ? (
            <div>
              <div style={{ 
                marginBottom: '16px', 
                padding: '12px 16px',
                backgroundColor: '#f0f9ff',
                borderRadius: '6px',
                border: '1px solid #bae7ff'
              }}>
                <strong style={{ color: '#1890ff' }}>层级视图</strong>
                <span style={{ marginLeft: '8px', color: '#666' }}>
                  点击箭头图标展开/折叠子任务，点击 + 号添加子任务，点击 ⋯ 进行更多操作
                </span>
              </div>
              <HierarchicalTaskList
                projectId={effectiveProjectId}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                onCreateSubTask={handleCreateSubTask}
                loading={loading}
              />
            </div>
          ) : (
            <div>
              <div style={{ 
                marginBottom: '16px', 
                padding: '12px 16px',
                backgroundColor: '#f6ffed',
                borderRadius: '6px',
                border: '1px solid #b7eb8f'
              }}>
                <strong style={{ color: '#52c41a' }}>列表视图</strong>
                <span style={{ marginLeft: '8px', color: '#666' }}>
                  完整的任务列表，支持分页、排序和搜索功能
                </span>
              </div>
              <Table
                dataSource={Array.isArray(stableDataSource) ? stableDataSource : []}
                columns={columns}
                rowKey="id"
                loading={loading}
                pagination={pagination.total > pagination.pageSize ? {
                  ...pagination,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
                } : false}
                onChange={handleTableChange}
                rowClassName={(record: Task & { isSubTask?: boolean; depth?: number }) => {
                  const depth = record.depth || 0;
                  const classes = ['task-hierarchy-item'];
                  
                  if (depth > 0) {
                    classes.push(`depth-${Math.min(depth, 6)}`);
                  }
                  
                  // 添加响应式类
                  if (depth > 6) {
                    classes.push('depth-warning');
                  }
                  
                  return classes.join(' ');
                }}
                expandable={{
                  childrenColumnName: 'nonExistentField' // 禁用默认的展开功能
                }}
              />
            </div>
          )}
        </Card>
      ) : (
        // 全局任务视图
        <Card
          style={{
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            borderRadius: '12px',
            border: 'none',
            minHeight: '500px'
          }}
        >
          <div style={{ 
            marginBottom: '16px', 
            padding: '12px 16px',
            backgroundColor: '#f0f9ff',
            borderRadius: '6px',
            border: '1px solid #bae7ff'
          }}>
            <strong style={{ color: '#1890ff' }}>全局任务视图</strong>
            <span style={{ marginLeft: '8px', color: '#666' }}>
              显示所有项目的任务，支持筛选、搜索和跨项目管理
            </span>
          </div>
          
          {/* 全局任务表格 */}
          <Table
            dataSource={Array.isArray(stableDataSource) ? stableDataSource : []}
            columns={columns}
            rowKey="id"
            loading={loading}
            pagination={pagination.total > pagination.pageSize ? {
              ...pagination,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
            } : false}
            onChange={handleTableChange}
            rowClassName={(record: Task & { isSubTask?: boolean; depth?: number }) => {
              const depth = record.depth || 0;
              const classes = ['task-hierarchy-item'];
              
              if (depth > 0) {
                classes.push(`depth-${Math.min(depth, 6)}`);
              }
              
              // 添加响应式类
              if (depth > 6) {
                classes.push('depth-warning');
              }
              
              return classes.join(' ');
            }}
            expandable={{
              childrenColumnName: 'nonExistentField' // 禁用默认的展开功能
            }}
          />
        </Card>
      )}

      {(() => {
        const modalProjectId = effectiveProjectId || parentTaskForNew?.project_id || editingTask?.project_id;
        
        // 如果模态框应该显示但没有有效的项目ID，显示错误提示
        if (taskModalVisible && !modalProjectId) {
          // 自动关闭模态框并显示错误
          setTimeout(() => {
            setTaskModalVisible(false);
            setEditingTask(undefined);
            setParentTaskForNew(undefined);
            message.error('操作失败：缺少项目信息，请刷新页面后重试');
          }, 0);
          return null;
        }
        
        return modalProjectId && taskModalVisible ? (
          <TaskModal
            visible={taskModalVisible}
            task={editingTask}
            projectId={modalProjectId}
            onOk={editingTask ? handleUpdateTask : handleCreateTask}
            onCancel={handleModalClose}
            loading={modalLoading}
            parentTask={parentTaskForNew}
            allowParentSelection={!editingTask && !parentTaskForNew}
          />
        ) : null;
      })()}
    </div>
  );
};

export default TasksPage;
