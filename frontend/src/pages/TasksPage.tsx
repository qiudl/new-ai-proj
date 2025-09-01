import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button, Table, Tag, Space, Dropdown, message, Modal, Switch, Card, Col, Row, Select, DatePicker, Checkbox, Tooltip, Alert } from 'antd';
import { PlusOutlined, MoreOutlined, EditOutlined, DeleteOutlined, EyeOutlined, AppstoreAddOutlined, CaretRightOutlined, HistoryOutlined, MenuOutlined, AppstoreOutlined, BranchesOutlined, PlayCircleOutlined, PauseCircleOutlined, CloseOutlined, InboxOutlined, SearchOutlined } from '@ant-design/icons';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Task, TaskRequest, TaskStatus } from '../types/task';
import { useTaskListUrlState, TaskListFilters } from '../hooks/useUrlState';
import TasksFilterBar from '../components/TasksFilterBar';
import { TaskService } from '../services/taskService';
import SwimlaneBoard from '../components/SwimlaneBoard';
import TaskModal from '../components/TaskModal';
import TaskArchiveModal from '../components/TaskArchiveModal';
import HierarchicalTaskList from '../components/HierarchicalTaskList';
import BulkSubTaskCreator from '../components/BulkSubTaskCreator';
import ProjectSelector from '../components/ProjectSelector';
import TimerStartButton from '../components/TimerStartButton';
import ColumnCustomizer, { ColumnConfig } from '../components/ColumnCustomizer';
import ResizableTitle from '../components/ResizableTitle';
import TaskCompletionRefresh from '../components/TaskCompletionRefresh';
import { useTimer } from '../contexts/TimerContext';
import { Project, ProjectUser } from '../types/project';
import { projectService } from '../services/projectService';
import { formatRelativeTime, formatExactTime, getTimeStyle, getUpdateTimestamp } from '../utils/dateUtils';
import { formatTaskStatus } from '../utils/formatters';
import { TASK_STATUS_OPTIONS } from '../utils/bulkSubTaskConfig';
import dayjs from 'dayjs';
import '../styles/task-inline-edit.css';
import '../styles/task-hierarchy.css';
import '../styles/task-inline-edit-enhanced.css';
import '../styles/timer-components.css';
import '../styles/resizable-columns.css';

const TasksPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isSwimlaneView = new URLSearchParams(location.search).get('view') === 'swimlane';
  
  // Global timer context
  const { timerState, isTaskTiming } = useTimer();

  // MEMORY OPTIMIZATION: Use refs for timers and mounted state
  const timerUpdateRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // State management
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  // 排序状态（服务端排序），默认按ID倒序
  const [tableSort, setTableSort] = useState<{ sortBy: string; sortOrder: 'asc' | 'desc' }>({ sortBy: 'id', sortOrder: 'desc' });
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
  
  // 项目用户缓存用于负责人内联选择
  const [projectUsersCache, setProjectUsersCache] = useState<Map<number, ProjectUser[]>>(new Map());
  const [loadingProjectUsers, setLoadingProjectUsers] = useState<Set<number>>(new Set());

  const loadProjectUsers = useCallback(async (pid: number) => {
    if (!pid) return;
    if (projectUsersCache.has(pid) || loadingProjectUsers.has(pid)) return;
    setLoadingProjectUsers(prev => new Set(prev).add(pid));
    try {
      const users = await projectService.getProjectUsers(pid);
      setProjectUsersCache(prev => {
        const next = new Map(prev);
        next.set(pid, Array.isArray(users) ? users : []);
        return next;
      });
    } catch (e) {
      console.error('Failed to load project users:', e);
    } finally {
      setLoadingProjectUsers(prev => {
        const next = new Set(prev);
        next.delete(pid);
        return next;
      });
    }
  }, [projectUsersCache, loadingProjectUsers]);

  // 批量选择相关状态
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  
  // Archive modal state
  const [archiveModalVisible, setArchiveModalVisible] = useState(false);
  const [tasksToArchive, setTasksToArchive] = useState<Task[]>([]);
  
  // 批量子任务创建状态
  const [bulkSubTaskModalVisible, setBulkSubTaskModalVisible] = useState(false);
  const [selectedParentTaskForBulk, setSelectedParentTaskForBulk] = useState<Task | undefined>();
  
  // 项目筛选相关状态
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>();
  const projectIdNum = parseInt(projectId || '0');
  
  // 使用URL中的项目ID（必需）；在全局页选择了项目时也视为有效项目
  const effectiveProjectId = projectIdNum || selectedProjectId || 0;
  
  // 列自定义配置状态 - 使用useMemo创建默认配置
  const defaultColumnConfigs = useMemo((): ColumnConfig[] => [
    {
      key: 'selection',
      title: '选择',
      visible: true,
      required: true,
      description: '批量选择任务',
      width: 60,
      minWidth: 60,
      maxWidth: 100,
      resizable: false
    },
    // 在任务名称前增加 ID 列
    {
      key: 'id',
      title: 'ID',
      visible: true,
      required: false,
      description: '任务ID',
      width: 90,
      minWidth: 70,
      maxWidth: 120,
      resizable: true
    },
    {
      key: 'title',
      title: '任务名称',
      visible: true,
      required: true,
      description: '任务标题和描述',
      width: effectiveProjectId ? 400 : 350,
      minWidth: 200,
      maxWidth: 600,
      resizable: true
    },
    
    {
      key: 'status',
      title: '状态',
      visible: true,
      required: false,
      description: '任务当前状态',
      width: 120,
      minWidth: 80,
      maxWidth: 160,
      resizable: true
    },
    {
      key: 'assignee_name',
      title: '负责人',
      visible: true,
      required: false,
      description: '任务负责人',
      width: 120,
      minWidth: 80,
      maxWidth: 160,
      resizable: true
    },
    {
      key: 'priority',
      title: '优先级',
      visible: true,
      required: false,
      description: '任务优先级',
      width: 100,
      minWidth: 80,
      maxWidth: 140,
      resizable: true
    },
    // 全局任务列表：在截止时间前增加 开始时间 列
    ...(!effectiveProjectId ? [{
      key: 'start_datetime',
      title: '开始时间',
      visible: true,
      required: false,
      description: '任务计划开始时间',
      width: 140,
      minWidth: 100,
      maxWidth: 180,
      resizable: true
    }] : []),
    {
      key: 'due_date',
      title: '截止时间',
      visible: true,
      required: false,
      description: '任务截止日期',
      width: 140,
      minWidth: 100,
      maxWidth: 180,
      resizable: true
    },
    {
      key: 'updated_at',
      title: '最后更新',
      visible: true,
      required: false,
      description: '任务最后更新时间',
      width: 120,
      minWidth: 80,
      maxWidth: 160,
      resizable: true
    },
    // 全局任务列表：可选显示创建时间
    ...(!effectiveProjectId ? [{
      key: 'created_at',
      title: '创建时间',
      visible: false, // 默认隐藏，因为有了更新时间
      required: false,
      description: '任务创建时间',
      width: 120,
      minWidth: 80,
      maxWidth: 160,
      resizable: true
    }] : []),
    {
      key: 'tags',
      title: '标签',
      visible: true,
      required: false,
      description: '任务标签',
      width: effectiveProjectId ? 120 : 100,
      minWidth: 80,
      maxWidth: 200,
      resizable: true
    },
    {
      key: 'action',
      title: '操作',
      visible: true,
      required: true,
      description: '任务操作按钮',
      width: 160,
      minWidth: 120,
      maxWidth: 200,
      resizable: true
    }
  ], [effectiveProjectId]);

  const [columnConfigs, setColumnConfigs] = useState<ColumnConfig[]>(defaultColumnConfigs);
  
  // 项目筛选相关状态  
  const [selectedProject, setSelectedProject] = useState<Project | undefined>();
  const [currentProject, setCurrentProject] = useState<Project | undefined>();
  
  
  

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

  // 全局模式下预处理父子关系 - 预填充 subTasks 并自动展开有子任务的父任务
  useEffect(() => {
    if (!effectiveProjectId && Array.isArray(tasks) && tasks.length > 0) {
      const childrenMap = new Map<number, Task[]>();
      
      // 构建父子关系映射
      const validTasks = tasks.filter(task => 
        task && 
        typeof task === 'object' && 
        typeof task.id === 'number'
      );
      
      validTasks.forEach(task => {
        if (task.parent_id && typeof task.parent_id === 'number') {
          if (!childrenMap.has(task.parent_id)) {
            childrenMap.set(task.parent_id, []);
          }
          childrenMap.get(task.parent_id)!.push(task);
        }
      });
      
      // 预填充 subTasks 并自动展开有子任务的父任务
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
        
        // 自动展开所有有子任务的父任务（在全局模式下）
        setExpandedTasks(prev => {
          const newExpanded = new Set(prev);
          let hasNewExpansions = false;
          
          childrenMap.forEach((children, parentId) => {
            if (!newExpanded.has(parentId)) {
              newExpanded.add(parentId);
              hasNewExpansions = true;
              }
          });
          
          return hasNewExpansions ? newExpanded : prev;
        });
      }
    }
  }, [effectiveProjectId, tasks]);

  // Load tasks from API
  const [preset, setPreset] = useState<'all' | 'overdue' | 'planning' | 'on_hold'>('all');

  const [filters, setFilters] = useTaskListUrlState();

  // 加载排序首选项（localStorage），按项目隔离
  useEffect(() => {
    const storageKey = `task-sort-${effectiveProjectId || 'global'}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.sortBy === 'string' && (parsed.sortOrder === 'asc' || parsed.sortOrder === 'desc')) {
          setTableSort(parsed);
        }
      } else {
        // 默认：按ID倒序
        setTableSort({ sortBy: 'id', sortOrder: 'desc' });
      }
    } catch {
      setTableSort({ sortBy: 'id', sortOrder: 'desc' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveProjectId]);

  // 持久化排序状态
  useEffect(() => {
    const storageKey = `task-sort-${effectiveProjectId || 'global'}`;
    try {
      localStorage.setItem(storageKey, JSON.stringify(tableSort));
    } catch {}
  }, [tableSort, effectiveProjectId]);

  const loadTasks = useCallback(async (
    page = 1,
    pageSize = 20,
    sortOverride?: { sortBy?: string; sortOrder?: 'asc' | 'desc' }
  ) => {
    setLoading(true);
    try {
      let response: any;
      // 计算最终排序（允许按需覆盖）
      const effectiveSortBy = sortOverride?.sortBy || tableSort.sortBy || 'id';
      const effectiveSortOrder = sortOverride?.sortOrder || tableSort.sortOrder || 'desc';

      if (effectiveProjectId) {
        // Load tasks for specific project
        const reqFilters: any = {};
        if (filters?.status) reqFilters.status = filters.status;
        if (filters?.priority) reqFilters.priority = filters.priority;
        if (typeof filters?.assignee_id === 'number') reqFilters.assignee_id = filters.assignee_id;
        if (filters?.q) reqFilters.search = filters.q;
        if (typeof filters?.task_id === 'number') reqFilters.task_id = filters.task_id;
        response = await TaskService.getTasks(effectiveProjectId, {
          page,
          page_size: pageSize,
          ...reqFilters,
          sort_by: effectiveSortBy,
          sort_order: effectiveSortOrder,
          only_roots: true, // 与前端根任务视图对齐，确保总数一致
        });
      } else {
        // 全局模式：加载全部任务（跨项目）
        // 预设：all/overdue/planning/on_hold。all 不传 preset 参数
        const params: any = {
          page,
          page_size: pageSize,
          only_roots: true, // 全局列表默认展示根任务，保持计数一致
          ...(filters?.status ? { status: filters.status } : {}),
          ...(filters?.priority ? { priority: filters.priority } : {}),
          ...(typeof filters?.assignee_id === 'number' ? { assignee_id: filters.assignee_id } : {}),
          ...(filters?.q ? { q: filters.q } : {}),
          ...(typeof filters?.task_id === 'number' ? { task_id: filters.task_id } : {}),
        };
        if (preset === 'overdue') {
          params.sort_by = 'due_date';
          params.sort_order = 'asc';
          params.preset = 'overdue';
        } else if (preset === 'planning') {
          params.sort_by = 'created_at';
          params.sort_order = 'desc';
          params.preset = 'planning';
        } else if (preset === 'on_hold') {
          params.sort_by = 'created_at';
          params.sort_order = 'desc';
          params.preset = 'on_hold';
        } else {
          // all：默认按ID倒序（从服务端排序）
          params.sort_by = effectiveSortBy || 'id';
          params.sort_order = effectiveSortOrder || 'desc';
        }
        response = await TaskService.getAllTasks(params);
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
      let tasksData: unknown[] = [];
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

      // 直接使用服务端排序结果，不再在前端强制改为按更新时间排序
      const finalTasks = Array.isArray(validTasks) ? validTasks : [];

      setTasks(finalTasks as any);

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
    } catch (error: Error | unknown) {
      console.error('Error loading tasks:', error);

      // 提供更详细的错误信息
      let errorMessage = '获取任务列表失败';
      if ((error as any).message?.includes('Network')) {
        errorMessage = '网络连接失败，请检查网络状态';
      } else if ((error as any).message?.includes('timeout')) {
        errorMessage = '请求超时，请稍后重试';
      } else if ((error as any).message?.includes('404')) {
        errorMessage = '项目不存在或已被删除';
      } else if ((error as any).message?.includes('401') || (error as any).message?.includes('403')) {
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
  }, [effectiveProjectId, filters, preset, tableSort]);

  // 获取全局统计数据


// Load tasks on component mount and when preset or filters changes
  useEffect(() => {
    loadTasks();
}, [loadTasks, preset, filters]); // 当loadTasks、preset或filters变化时重新加载任务
  
  
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
        // MEMORY OPTIMIZATION: Use ref for timeout
        timerUpdateRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            setExpandedTasks(prev => new Set(prev).add(parentTaskForNew.id));
          }
        }, 500);
      }
    } catch (error: Error | unknown) {
      console.error('Task creation error:', error);
      message.error((error as any).message || '任务创建失败');
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
    } catch (error: Error | unknown) {
      message.error((error as any).message || '任务更新失败');
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
        } catch (error: Error | unknown) {
          message.error((error as any).message || '任务删除失败');
        }
      },
    });
  };

  // Handle archive single task
  const handleArchiveTask = (task: Task) => {
    setTasksToArchive([task]);
    setArchiveModalVisible(true);
  };

  // Handle bulk archive
  const handleBulkArchive = () => {
    if (selectedTaskIds.length === 0) {
      message.warning('请先选择要归档的任务');
      return;
    }
    
    const selectedTasks = tasks.filter(task => selectedTaskIds.includes(task.id));
    setTasksToArchive(selectedTasks);
    setArchiveModalVisible(true);
  };

  // Handle archive success
  const handleArchiveSuccess = () => {
    setArchiveModalVisible(false);
    setTasksToArchive([]);
    setSelectedTaskIds([]);
    loadTasks(pagination.current, pagination.pageSize);
    message.success('任务归档成功');
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
  const handleTableChange = (
    paginationParams: { current: number; pageSize: number },
    _filters: any,
    sorter: any
  ) => {
    // 解析表头排序
    let sortBy: string | undefined;
    let sortOrder: 'asc' | 'desc' | undefined;

    const resolveSort = (s: any) => {
      if (!s) return;
      const order = s.order === 'ascend' ? 'asc' : s.order === 'descend' ? 'desc' : undefined;
      if (!order) return;
      // 使用 dataIndex 或 field 或 columnKey
      const field = s.dataIndex || s.field || s.columnKey;
      if (!field) return;
      // 允许的字段映射
      const allowed = new Set(['id', 'title', 'status', 'due_date', 'created_at', 'updated_at']);
      if (allowed.has(field)) {
        sortBy = field;
        sortOrder = order as 'asc' | 'desc';
      }
    };

    if (Array.isArray(sorter)) {
      sorter.forEach(resolveSort);
    } else {
      resolveSort(sorter);
    }

    if (sortBy && sortOrder) {
      setTableSort({ sortBy, sortOrder });
      loadTasks(paginationParams.current, paginationParams.pageSize, { sortBy, sortOrder });
    } else {
      // 无排序改变，仅分页
      loadTasks(paginationParams.current, paginationParams.pageSize);
    }
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
          
        } catch (error: Error | unknown) {
          console.error('Error loading children for task:', taskId, error);
          message.error((error as any).message || '获取子任务失败');
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

  // Handle bulk create subtasks
  const handleBulkCreateSubTasks = (parentTask: Task) => {
    if (!parentTask.project_id || parentTask.project_id <= 0) {
      message.error('无法为此任务创建子任务：父任务缺少有效的项目信息');
      return;
    }
    
    setSelectedParentTaskForBulk(parentTask);
    setBulkSubTaskModalVisible(true);
  };

  // Handle bulk subtask creation success
  const handleBulkSubTaskSuccess = () => {
    setBulkSubTaskModalVisible(false);
    setSelectedParentTaskForBulk(undefined);
    message.success('批量创建子任务成功！');
    // 刷新任务列表
    if (hierarchicalView) {
      loadTasks();
    } else {
      loadTasks(pagination.current, pagination.pageSize);
    }
  };

  // Handle status update - 内联编辑状态
  const handleStatusUpdate = async (taskId: number, newStatus: string, task: Task) => {
    // 添加加载状态提示（确保在失败时也能关闭）
    const hideLoading = message.loading('正在更新状态...', 0);
    try {
      const projectId = effectiveProjectId || task.project_id;
      if (!projectId) {
        message.error('无法更新任务状态：缺少项目信息');
        return;
      }

      await TaskService.updateTask(projectId, taskId, { 
        status: newStatus as any
      });
      // analytics
      try { const { track } = await import('../utils/analytics'); track('task_update', { action: 'status_change', taskId, projectId, newStatus }); } catch {}
      
      message.success('状态更新成功');
      
      // 刷新任务列表
      loadTasks(pagination.current, pagination.pageSize);
    } catch (error: any) {
      console.error('Status update error:', error);
      const status = error?.status ?? error?.statusCode;
      if (status === 403) {
        message.error('权限不足，无法更新任务状态');
      } else if (status === 404) {
        message.error('任务不存在或已被删除');
      } else {
        message.error(error?.message || '状态更新失败');
      }
    } finally {
      hideLoading();
    }
  };

  // Handle due date update - 内联编辑截止日期
  const handleDueDateUpdate = async (taskId: number, newDueDate: string | null, task: Task) => {
    // 添加加载状态提示（确保在失败时也能关闭）
    const hideLoading = message.loading('正在更新截止日期...', 0);
    try {
      const projectId = effectiveProjectId || task.project_id;
      if (!projectId) {
        message.error('无法更新截止日期：缺少项目信息');
        return;
      }

      // 检查是否有变化
      const currentDueDate = task.due_date;
      if (currentDueDate === newDueDate) {
        return; // 没有变化，不需要更新
      }

      const updateData: Partial<TaskRequest> = {
        due_date: newDueDate || ""
      };
      
      await TaskService.updateTask(projectId, taskId, updateData);
      // analytics
      try { const { track } = await import('../utils/analytics'); track('task_update', { action: 'due_date_change', taskId, projectId, newDueDate }); } catch {}
      
      message.success('截止日期更新成功');
      
      // 刷新任务列表
      loadTasks(pagination.current, pagination.pageSize);
    } catch (error: any) {
      console.error('Due date update error:', error);
      const status = error?.status ?? error?.statusCode;
      if (status === 403) {
        message.error('权限不足，无法更新截止日期');
      } else if (status === 404) {
        message.error('任务不存在或已被删除');
      } else {
        message.error(error?.message || '截止日期更新失败');
      }
    } finally {
      hideLoading();
    }
  };

  // Handle priority update - 内联编辑优先级
  const handlePriorityUpdate = async (task: Task, newPriority: 'low' | 'medium' | 'high') => {
    try {
      const projectId = effectiveProjectId || task.project_id;
      if (!projectId) {
        message.error('无法更新优先级：缺少项目信息');
        return;
      }
      const hide = message.loading('正在更新优先级...', 0);
      await TaskService.updateTask(projectId, task.id, { priority: newPriority });
      hide();
      message.success('优先级更新成功');
      loadTasks(pagination.current, pagination.pageSize);
    } catch (error: any) {
      console.error('Priority update error:', error);
      message.error(error?.message || '优先级更新失败');
    }
  };

  // Handle assignee update - 内联编辑负责人
  const handleAssigneeUpdate = async (task: Task, assigneeId: number | null) => {
    try {
      const projectId = effectiveProjectId || task.project_id;
      if (!projectId) {
        message.error('无法更新负责人：缺少项目信息');
        return;
      }
      const hide = message.loading('正在更新负责人...', 0);
      await TaskService.updateTask(projectId, task.id, { assignee_id: assigneeId });
      hide();
      message.success('负责人更新成功');
      loadTasks(pagination.current, pagination.pageSize);
    } catch (error: any) {
      console.error('Assignee update error:', error);
      message.error(error?.message || '负责人更新失败');
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
    } catch (error: Error | unknown) {
      console.error('Title update error:', error);
      if ((error as any).statusCode === 403) {
        message.error('权限不足，无法更新任务标题');
      } else if ((error as any).statusCode === 404) {
        message.error('任务不存在或已被删除');
      } else {
        message.error((error as any).message || '标题更新失败');
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
        } catch (error: Error | unknown) {
          message.error((error as any).message || '批量删除失败');
        } finally {
          setBulkDeleteLoading(false);
        }
      },
    });
  };


  // Build expanded data source - 只显示根任务，子任务在列内展开
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

      // 只返回根任务，子任务通过列内展开显示
      const rootTasks = validTasks.filter(task => 
        task && typeof task === 'object' && typeof task.id === 'number' && !task.parent_id
      );
      
      // 为根任务添加 depth: 0
      const result = rootTasks.map(task => ({
        ...task,
        isSubTask: false,
        depth: 0
      }));
      
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error in buildExpandedDataSource:', error);
      return [];
    }
  }, [tasks]); // 只依赖 tasks，不需要 expandedTasks 和 subTasks

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

  // 当项目变化时，加载列配置
  useEffect(() => {
    const storageKey = `task-columns-${effectiveProjectId || 'global'}`;
    const saved = localStorage.getItem(storageKey);
    
    if (saved) {
      try {
        const savedConfigs = JSON.parse(saved);
        // 合并默认配置和保存的配置
        const mergedConfigs = defaultColumnConfigs.map(defaultConfig => {
          const savedConfig = savedConfigs.find((s: ColumnConfig) => s.key === defaultConfig.key);
          return savedConfig ? {
            ...defaultConfig,
            visible: savedConfig.visible !== undefined ? savedConfig.visible : defaultConfig.visible,
            width: savedConfig.width !== undefined ? savedConfig.width : defaultConfig.width
          } : defaultConfig;
        });
        setColumnConfigs(mergedConfigs);
      } catch (error) {
        console.warn('Failed to load column configuration:', error);
        setColumnConfigs(defaultColumnConfigs);
      }
    } else {
      setColumnConfigs(defaultColumnConfigs);
    }
  }, [defaultColumnConfigs, effectiveProjectId]);

  // 列宽度调整处理器
  const handleColumnResize = useCallback((key: string, width: number) => {
    setColumnConfigs(prev => {
      const newConfigs = prev.map(config => 
        config.key === key ? { ...config, width } : config
      );
      
      // 保存到localStorage
      const storageKey = `task-columns-${effectiveProjectId || 'global'}`;
      localStorage.setItem(storageKey, JSON.stringify(newConfigs));
      
      return newConfigs;
    });
  }, [effectiveProjectId]);


  // 创建可调整大小的标题
  const createResizableTitle = useCallback((config: ColumnConfig, title: React.ReactNode) => {
    if (!config.resizable) {
      return title;
    }
    
    return (
      <ResizableTitle
        width={typeof config.width === 'number' ? config.width : 120}
        onResize={(width) => handleColumnResize(config.key, width)}
        minWidth={config.minWidth}
        maxWidth={config.maxWidth}
      >
        {title}
      </ResizableTitle>
    );
  }, [handleColumnResize]);

  // 根据配置生成实际的表格列
  const generateColumns = useCallback(() => {
    const visibleConfigs = columnConfigs.filter(config => config.visible);
    
    return visibleConfigs.map(config => {
      switch (config.key) {
        case 'selection':
          return {
            title: createResizableTitle(config, 
              <Checkbox
                indeterminate={selectedTaskIds.length > 0 && selectedTaskIds.length < stableDataSource.length}
                onChange={(e) => handleSelectAll(e.target.checked)}
                checked={stableDataSource.length > 0 && selectedTaskIds.length === stableDataSource.length}
              />
            ),
            dataIndex: 'selection',
            key: 'selection',
            width: config.width,
            render: (_: unknown, record: Task) => (
              <Checkbox
                checked={selectedTaskIds.includes(record.id)}
                onChange={(e) => handleSelectTask(record.id, e.target.checked)}
              />
            ),
          };
          
        case 'id':
          return {
            title: createResizableTitle(config, 'ID'),
            dataIndex: 'id',
            key: 'id',
            width: config.width,
            fixed: 'left',
            sorter: true,
            sortOrder: tableSort.sortBy === 'id' ? (tableSort.sortOrder === 'asc' ? 'ascend' : 'descend') : null,
            render: (id: number) => (
              <span style={{ color: '#595959', fontWeight: 500 }}>#{id}</span>
            ),
          };
          
        case 'updated_at':
          return {
            title: createResizableTitle(config, '最后更新'),
            dataIndex: 'updated_at',
            key: 'updated_at',
            width: config.width,
            sorter: true,
            sortOrder: tableSort.sortBy === 'updated_at' ? (tableSort.sortOrder === 'asc' ? 'ascend' : 'descend') : null,
            render: (date: string) => {
              if (!date) return '-';
              
              const relativeTime = formatRelativeTime(date);
              const exactTime = formatExactTime(date);
              const style = getTimeStyle(date, 'updated');
              
              return (
                <Tooltip title={exactTime}>
                  <span style={style}>
                    {relativeTime}
                  </span>
                </Tooltip>
              );
            },
          };
          
        case 'title':
          return {
            title: createResizableTitle(config, '任务名称'),
            dataIndex: 'title',
            key: 'title',
            width: config.width,
            fixed: 'left',
            ellipsis: true,
            sorter: true,
            sortOrder: tableSort.sortBy === 'title' ? (tableSort.sortOrder === 'asc' ? 'ascend' : 'descend') : null,
            render: (text: string, record: Task & { isSubTask?: boolean; depth?: number }) => {
              const depth = record.depth || 0;
              const hasChildren = (record.custom_fields?.children_count || 0) > 0;
              const isExpanded = expandedTasks.has(record.id);
              
              return (
                <div>
                  <div style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%'
                  }}>
                    {hasChildren ? (
                      <button
                        className={`task-expand-button ${isExpanded ? 'expanded' : ''} ${loadingChildren.has(record.id) ? 'loading' : ''}`}
                        onClick={() => handleToggleExpand(record)}
                        disabled={loadingChildren.has(record.id)}
                        style={{ 
                          padding: 0, 
                          minWidth: 20, 
                          height: 20,
                          color: '#1890ff',
                          fontSize: '14px',
                          flexShrink: 0,
                          marginRight: 4,
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer'
                        }}
                      >
                        {loadingChildren.has(record.id) ? (
                          <span className="loading-spinner">⟳</span>
                        ) : (
                          <CaretRightOutlined />
                        )}
                      </button>
                    ) : (
                      <div style={{ width: 20, height: 20, flexShrink: 0, marginRight: 4 }} />
                    )}
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontWeight: depth === 0 ? 600 : 500,
                        fontSize: depth === 0 ? '15px' : '14px',
                        color: depth === 0 ? '#262626' : '#595959',
                        lineHeight: '1.4',
                        display: 'flex',
                        alignItems: 'center',
                        flexWrap: 'nowrap',
                        gap: 8
                      }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/projects/${record.project_id}/tasks/${record.id}`);
                          }}
                          style={{ 
                            color: 'inherit',
                            cursor: 'pointer',
                            textDecoration: 'none',
                            border: 'none',
                            background: 'none',
                            padding: 0,
                            font: 'inherit',
                            textAlign: 'left',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: 'inline-block',
                            maxWidth: '100%'
                          }}
                          title="点击查看任务详情"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.textDecoration = 'underline';
                            e.currentTarget.style.color = '#1890ff';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.textDecoration = 'none';
                            e.currentTarget.style.color = 'inherit';
                          }}
                        >
                          {text}
                        </button>
                        {hasChildren && (
                          <Tag 
                            color="blue" 
                            style={{ 
                              fontSize: 11,
                              padding: '0 6px',
                              lineHeight: '18px',
                              height: '18px',
                              flexShrink: 0
                            }}
                          >
                            {record.custom_fields?.children_count} 子任务
                          </Tag>
                        )}
                      </div>
                      {!effectiveProjectId && (
                        <div style={{ 
                          color: '#8c8c8c', 
                          fontSize: 12,
                          marginTop: 2,
                          lineHeight: '1.3',
                          wordBreak: 'break-word'
                        }}>
                          {record.project_name}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* 子任务展开区域 */}
                  {isExpanded && (
                    <div style={{ 
                      marginTop: 8,
                      borderLeft: '2px solid #e6f7ff',
                      paddingLeft: 16,
                      backgroundColor: '#fafafa',
                      borderRadius: '4px',
                      padding: '8px 0 8px 16px'
                    }}>
                      {loadingChildren.has(record.id) ? (
                        <div style={{ color: '#8c8c8c', fontSize: '13px', padding: '8px 0' }}>
                          加载子任务中...
                        </div>
                      ) : (
                        <>
                          {(subTasks.get(record.id) || []).map((subTask, index) => (
                            <div 
                              key={subTask.id}
                              style={{
                                padding: '6px 0',
                                borderBottom: index < (subTasks.get(record.id) || []).length - 1 ? '1px solid #f0f0f0' : 'none'
                              }}
                            >
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                fontSize: '14px'
                              }}>
                                <button
                                  onClick={() => navigate(`/projects/${subTask.project_id}/tasks/${subTask.id}`)}
                                  style={{
                                    color: '#595959',
                                    cursor: 'pointer',
                                    textDecoration: 'none',
                                    border: 'none',
                                    background: 'none',
                                    padding: 0,
                                    font: 'inherit',
                                    textAlign: 'left',
                                    flex: 1
                                  }}
                                >
                                  {subTask.title}
                                </button>
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            <Tag 
                              color={formatTaskStatus(subTask.status).color}
                              style={{ fontSize: '10px', margin: 0 }}
                            >
                              {formatTaskStatus(subTask.status).text}
                            </Tag>
                          </div>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            },
          };
          
          
        case 'status':
          return {
            title: createResizableTitle(config, '状态'),
            dataIndex: 'status',
            key: 'status',
            width: config.width,
            sorter: true,
            sortOrder: tableSort.sortBy === 'status' ? (tableSort.sortOrder === 'asc' ? 'ascend' : 'descend') : null,
            render: (status: TaskStatus, record: Task) => {
              return (
                <Select
                  value={status}
                  onChange={(newStatus) => handleStatusUpdate(record.id, newStatus, record)}
                  style={{ 
                    width: '100%',
                    borderRadius: '4px',
                    backgroundColor: '#fafafa'
                  }}
                  variant="borderless"
                  size="small"
                  suffixIcon={null}
                >
                  {TASK_STATUS_OPTIONS.map(opt => (
                    <Select.Option key={opt.value as string} value={opt.value as string}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 500 }}>{opt.label}</span>
                      </div>
                    </Select.Option>
                  ))}
                </Select>
              );
            },
          };
          
        case 'assignee_name':
          return {
            title: createResizableTitle(config, '负责人'),
            dataIndex: 'assignee_name',
            key: 'assignee_name',
            width: config.width,
            render: (_name: string, record: Task) => {
              const pid = record.project_id;
              const options = projectUsersCache.get(pid) || [];
              return (
                <Select
                  value={record.assignee_id ?? undefined}
                  placeholder="未分配"
                  allowClear
                  size="small"
                  variant="borderless"
                  style={{ width: '100%' }}
                  loading={loadingProjectUsers.has(pid)}
onOpenChange={(open) => { if (open) loadProjectUsers(pid); }}
                  onChange={(val) => handleAssigneeUpdate(record, (val as number) ?? null)}
                  options={options.map(u => ({ label: u.user_name, value: u.user_id }))}
                />
              );
            },
          };
          
        case 'start_datetime':
          return {
            title: createResizableTitle(config, '开始时间'),
            dataIndex: 'start_datetime',
            key: 'start_datetime',
            width: config.width,
            render: (dateTime: string) => {
              if (!dateTime) return <span style={{ color: '#8c8c8c' }}>-</span>;
              const dt = dayjs(dateTime);
              return (
                <Tooltip title={dt.format('YYYY-MM-DD HH:mm')}>
                  <span>{dt.format('YYYY-MM-DD')}</span>
                </Tooltip>
              );
            },
          };
          
        case 'due_date':
          return {
            title: createResizableTitle(config, '截止时间'),
            dataIndex: 'due_date',
            key: 'due_date',
            width: config.width,
            sorter: true,
            sortOrder: tableSort.sortBy === 'due_date' ? (tableSort.sortOrder === 'asc' ? 'ascend' : 'descend') : null,
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
                  suffixIcon={<span style={{ fontSize: '12px' }}>{icon}</span>}
                />
              );
            },
          };
          
        case 'created_at':
          return {
            title: createResizableTitle(config, '创建时间'),
            dataIndex: 'created_at',
            key: 'created_at',
            width: config.width,
            sorter: true,
            sortOrder: tableSort.sortBy === 'created_at' ? (tableSort.sortOrder === 'asc' ? 'ascend' : 'descend') : null,
            render: (date: string) => {
              if (!date) return '-';
              
              const relativeTime = formatRelativeTime(date);
              const exactTime = formatExactTime(date);
              const style = getTimeStyle(date, 'created');
              
              return (
                <Tooltip title={exactTime}>
                  <span style={style}>
                    {relativeTime}
                  </span>
                </Tooltip>
              );
            },
          };
          
        case 'priority':
          return {
            title: createResizableTitle(config, '优先级'),
            dataIndex: 'priority',
            key: 'priority',
            width: config.width,
            render: (_: string, record: Task) => {
              const current = (record as any).priority || (record.custom_fields?.priority as 'low' | 'medium' | 'high') || 'medium';
              return (
                <Select
                  value={current}
                  size="small"
                  variant="borderless"
                  style={{ width: '100%' }}
                  onChange={(val) => handlePriorityUpdate(record, val as 'low' | 'medium' | 'high')}
                  options={[
                    { label: '高', value: 'high' },
                    { label: '中', value: 'medium' },
                    { label: '低', value: 'low' },
                  ]}
                />
              );
            },
          };
          
        case 'tags':
          return {
            title: createResizableTitle(config, '标签'),
            key: 'tags',
            width: config.width,
            render: (_: unknown, record: Task) => {
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
          };
          
        case 'action':
          return {
            title: createResizableTitle(config, '操作'),
            key: 'action',
            width: config.width,
            fixed: 'right',
            render: (_: unknown, record: Task & { isSubTask?: boolean; depth?: number }) => (
              <Space size="small">
                <Button
                  type="text"
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => navigate(`/projects/${record.project_id}/tasks/${record.id}`)}
                  title="查看详情"
                />
              </Space>
            ),
          };
          
        default:
          return null;
      }
    }).filter(Boolean) as unknown[];
  }, [columnConfigs, selectedTaskIds, stableDataSource, effectiveProjectId, expandedTasks, loadingChildren, subTasks, tableSort]);

  // 保留原有的静态columns定义作为备用（当前使用generateColumns）
  const columns = [
    {
      title: (
        <Checkbox
          indeterminate={selectedTaskIds.length > 0 && selectedTaskIds.length < stableDataSource.length}
          onChange={(e) => handleSelectAll(e.target.checked)}
          checked={stableDataSource.length > 0 && selectedTaskIds.length === stableDataSource.length}
        />
      ),
      dataIndex: 'selection',
      key: 'selection',
      width: '60px',
      render: (_: unknown, record: Task) => (
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
      width: effectiveProjectId ? '35%' : '30%', // 增加全局模式下的宽度以容纳缩进
      render: (text: string, record: Task & { isSubTask?: boolean; depth?: number }) => {
        const depth = record.depth || 0;
        const isSubTask = depth > 0;
        const hasChildren = (record.custom_fields?.children_count || 0) > 0;
        const isExpanded = expandedTasks.has(record.id);
        
        return (
          <div>
            {/* 主任务 */}
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%'
            }}>
              {/* 展开/收起按钮 */}
              {hasChildren ? (
                <button
                  className={`task-expand-button ${isExpanded ? 'expanded' : ''} ${loadingChildren.has(record.id) ? 'loading' : ''}`}
                  onClick={() => handleToggleExpand(record)}
                  aria-expanded={isExpanded}
                  title={loadingChildren.has(record.id) ? '加载中...' : (isExpanded ? '折叠子任务' : '展开子任务')}
                  disabled={loadingChildren.has(record.id)}
                  style={{ 
                    padding: 0, 
                    minWidth: 20, 
                    height: 20,
                    color: '#1890ff',
                    fontSize: '14px',
                    flexShrink: 0,
                    marginRight: 4,
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer'
                  }}
                >
                  {loadingChildren.has(record.id) ? (
                    <span className="loading-spinner">⟳</span>
                  ) : (
                    <CaretRightOutlined />
                  )}
                </button>
              ) : (
                <div style={{ width: 20, height: 20, flexShrink: 0, marginRight: 4 }} />
              )}
              
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ 
                  fontWeight: depth === 0 ? 600 : 500,
                  fontSize: depth === 0 ? '15px' : '14px',
                  color: depth === 0 ? '#262626' : '#595959',
                  lineHeight: '1.4',
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'nowrap',
                  gap: 8
                }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/projects/${record.project_id}/tasks/${record.id}`);
                    }}
                    style={{ 
                      color: 'inherit',
                      cursor: 'pointer',
                      textDecoration: 'none',
                      border: 'none',
                      background: 'none',
                      padding: 0,
                      font: 'inherit',
                      textAlign: 'left',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: 'inline-block',
                      maxWidth: '100%'
                    }}
                    title="点击查看任务详情"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.textDecoration = 'underline';
                      e.currentTarget.style.color = '#1890ff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.textDecoration = 'none';
                      e.currentTarget.style.color = 'inherit';
                    }}
                  >
                    {text}
                  </button>
                  {hasChildren && (
                    <Tag 
                      color="blue" 
                      style={{ 
                        fontSize: 11,
                        padding: '0 6px',
                        lineHeight: '18px',
                        height: '18px',
                        flexShrink: 0
                      }}
                    >
                      {record.custom_fields?.children_count} 子任务
                    </Tag>
                  )}
                </div>
                {!effectiveProjectId && (
                  <div style={{ 
                    color: '#8c8c8c', 
                    fontSize: 12,
                    marginTop: 2,
                    lineHeight: '1.3',
                    wordBreak: 'break-word'
                  }}>
                    {record.project_name}
                  </div>
                )}
              </div>
            </div>
            
            {/* 子任务展开区域 - 只在任务名称列内显示 */}
            {isExpanded && (
              <div style={{ 
                marginTop: 8,
                borderLeft: '2px solid #e6f7ff',
                paddingLeft: 16,
                backgroundColor: '#fafafa',
                borderRadius: '4px',
                padding: '8px 0 8px 16px'
              }}>
                {loadingChildren.has(record.id) ? (
                  <div style={{ 
                    color: '#8c8c8c', 
                    fontSize: '13px',
                    padding: '8px 0'
                  }}>
                    加载子任务中...
                  </div>
                ) : (
                  <>
                    {(subTasks.get(record.id) || []).map((subTask, index) => (
                      <div 
                        key={subTask.id}
                        style={{
                          padding: '6px 0',
                          borderBottom: index < (subTasks.get(record.id) || []).length - 1 ? '1px solid #f0f0f0' : 'none'
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: '14px'
                        }}>
                          <button
                            onClick={() => navigate(`/projects/${subTask.project_id}/tasks/${subTask.id}`)}
                            style={{
                              color: '#595959',
                              cursor: 'pointer',
                              textDecoration: 'none',
                              border: 'none',
                              background: 'none',
                              padding: 0,
                              font: 'inherit',
                              textAlign: 'left',
                              flex: 1
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = '#1890ff';
                              e.currentTarget.style.textDecoration = 'underline';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = '#595959';
                              e.currentTarget.style.textDecoration = 'none';
                            }}
                          >
                            {subTask.title}
                          </button>
                          <div style={{
                            display: 'flex',
                            gap: 4,
                            alignItems: 'center'
                          }}>
                            <Tag 
                              color={subTask.status === 'completed' ? 'success' : subTask.status === 'in_progress' ? 'processing' : 'default'}
                              style={{ fontSize: '10px', margin: 0 }}
                            >
                              {subTask.status === 'completed' ? '完成' : subTask.status === 'in_progress' ? '进行中' : '待办'}
                            </Tag>
                            
                            {/* 子任务计时器按钮 */}
                            {!['completed', 'cancelled', 'archived'].includes(subTask.status) && (
                              <TimerStartButton
                                task={subTask}
                                size="small"
                                type="text"
                                className="subtask-timer-button"
                              />
                            )}
                            
                            <button
                              onClick={() => handleEditTask(subTask)}
                              style={{
                                color: '#1890ff',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '12px',
                                padding: '2px 4px'
                              }}
                              title="编辑子任务"
                            >
                              编辑
                            </button>
                          </div>
                        </div>
                        {subTask.description && (
                          <div style={{
                            color: '#8c8c8c',
                            fontSize: '12px',
                            marginTop: 4,
                            marginLeft: 20
                          }}>
                            {subTask.description}
                          </div>
                        )}
                      </div>
                    ))}
                    <div style={{ 
                      marginTop: 8,
                      textAlign: 'center'
                    }}>
                      <Button
                        type="dashed"
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={() => handleCreateSubTask(record)}
                        style={{
                          fontSize: '12px',
                          height: '24px'
                        }}
                      >
                        添加子任务
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      },
    },
    

    // 状态列 - 增强版内联编辑
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: '12%',
      render: (status: TaskStatus, record: Task) => {
        return (
          <Select
            value={status}
            onChange={(newStatus) => handleStatusUpdate(record.id, newStatus, record)}
            style={{ 
              width: '100%',
              borderRadius: '4px'
            }}
            variant="borderless"
            size="small"
            styles={{ popup: { root: { minWidth: 140 } } }}
            suffixIcon={null}
          >
            {TASK_STATUS_OPTIONS.map(opt => (
              <Select.Option key={opt.value as string} value={opt.value as string}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontWeight: 500 }}>{opt.label}</span>
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
      render: (_: unknown, record: Task) => {
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
      width: 160, // 增加宽度以容纳计时器按钮
      render: (_: unknown, record: Task & { isSubTask?: boolean; depth?: number }) => {
        const canStartTimer = !['completed', 'cancelled', 'archived'].includes(record.status);
        
        return (
          <Space size="small">
            {/* 计时器按钮 */}
            {canStartTimer && (
              <TimerStartButton
                task={record}
                size="small"
                type="text"
                className="task-list-timer-button"
              />
            )}
            
            {/* 添加子任务按钮 */}
            <Button
              type="text"
              size="small"
              icon={<AppstoreAddOutlined />}
              onClick={() => handleCreateSubTask(record)}
              title="添加子任务"
            />
            
            {/* 批量创建子任务按钮 */}
            <Button
              type="text"
              size="small"
              icon={<BranchesOutlined />}
              onClick={() => handleBulkCreateSubTasks(record)}
              title="批量创建子任务"
            />
            
            {/* 查看按钮 - 外显 */}
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/projects/${record.project_id}/tasks/${record.id}`)}
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
                    key: 'archive',
                    label: '归档',
                    icon: <InboxOutlined />,
                    onClick: () => handleArchiveTask(record),
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
        );
      },
    },
  ];

  // CRITICAL: Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      
      // Clear all timers
      if (timerUpdateRef.current) {
        clearTimeout(timerUpdateRef.current);
        timerUpdateRef.current = null;
      }
      
      // Clear large state objects to free memory
      setTasks([]);
      setSubTasks(new Map());
      setExpandedTasks(new Set());
      setSelectedTaskIds([]);
    };
  }, []);

  if (isSwimlaneView) {
    return (
      <div className="page-container">
        <Card style={{ marginBottom: '16px' }}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <div style={{ fontWeight: 600 }}>智能泳道视图（Beta）</div>
            <Button
              onClick={() => {
                const sp = new URLSearchParams(location.search);
                sp.delete('view');
                navigate({ pathname: location.pathname, search: sp.toString() });
              }}
            >返回列表视图</Button>
          </Space>
        </Card>
        {effectiveProjectId ? (
          <SwimlaneBoard
            projectId={effectiveProjectId}
            tasks={tasks}
            loading={loading}
            initialGroupBy="status"
            onUpdated={() => {
              // 更新后刷新一次任务数据
              loadTasks(pagination.current, pagination.pageSize);
            }}
          />
        ) : (
          <Alert type="info" message="泳道视图仅支持在具体项目内使用，请先选择项目。" />
        )}
      </div>
    );
  }

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

                {/* 全局视图的状态 Chips (全部 / 逾期 / 规划中 / 搁置) */}
                {!effectiveProjectId && (
                  <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                    {[
                      { key: 'all', label: '全部', color: '#8c8c8c' },
                      { key: 'overdue', label: '逾期', color: '#ff4d4f' },
                      { key: 'planning', label: '规划中', color: '#1890ff' },
                      { key: 'on_hold', label: '搁置', color: '#faad14' },
                    ].map((chip) => (
                      <button
                        key={chip.key}
                        onClick={() => setPreset(chip.key as any)}
                        style={{
                          border: preset === chip.key ? `2px solid ${chip.color}` : '1px solid #d9d9d9',
                          backgroundColor: preset === chip.key ? `${chip.color}14` : '#fff',
                          color: preset === chip.key ? chip.color : '#595959',
                          borderRadius: 16,
                          padding: '4px 12px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                        title={chip.key === 'on_hold' ? '状态为搁置或已设置snooze_until>现在' : (chip.key === 'all' ? '显示全部任务（不使用预设过滤）' : '')}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              
              {/* 单项目任务数量徽章 */}
              {effectiveProjectId > 0 && tasks.length > 0 && (
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
          
          {/* 筛选条：全局与项目内均显示，和 URL 同步 */}
          <Col span={24} style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'nowrap', overflowX: 'auto' }}>
              <TasksFilterBar value={filters as TaskListFilters} onChange={setFilters} compact={!effectiveProjectId} />
              <Button
                icon={<SearchOutlined />}
                onClick={() => loadTasks(1, pagination.pageSize)}
              >
                搜索
              </Button>
              <Button
                onClick={() => {
                  setFilters({} as TaskListFilters);
                  setPreset('all');
                  // 立即刷新，确保清除 task_id 等残留筛选
                  loadTasks(1, pagination.pageSize);
                }}
              >
                清空筛选
              </Button>
            </div>
          </Col>
          
          <Col>
            <Space size="large">
              {/* 视图切换 - 现代化设计 */}
              {effectiveProjectId > 0 && (
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

              {/* 显式切换到泳道视图（Beta） */}
              {effectiveProjectId > 0 && (
                <Button
                  type="default"
                  icon={<AppstoreOutlined />}
                  onClick={() => {
                    const sp = new URLSearchParams(location.search);
                    sp.set('view', 'swimlane');
                    navigate({ pathname: location.pathname, search: sp.toString() });
                  }}
                  style={{ height: '40px' }}
                >
                  泳道视图 (Beta)
                </Button>
              )}

              <ColumnCustomizer
                columns={columnConfigs}
                onChange={setColumnConfigs}
                storageKey={`task-columns-${effectiveProjectId || 'global'}`}
              />

              {selectedTaskIds.length > 0 && (
                <>
                  <Button
                    type="default"
                    icon={<InboxOutlined />}
                    onClick={handleBulkArchive}
                    style={{ height: '40px' }}
                  >
                    批量归档 ({selectedTaskIds.length})
                  </Button>
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
                </>
              )}

              {/* 仅项目路由下显示：批量导入 和 新建任务 按钮 */}
              {projectId && (
                <>
                  <Button
                    type="default"
                    onClick={() => navigate(`/projects/${projectId}/bulk-import`)}
                    style={{ height: '40px' }}
                  >
                    批量导入
                  </Button>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleNewTask}
                    size="large"
                    style={{ 
                      height: '40px',
                      fontWeight: 600,
                      boxShadow: '0 4px 12px rgba(24,144,255,0.3)'
                    }}
                  >
                    新建任务
                  </Button>
                </>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 任务内容区域 */}
      {effectiveProjectId ? (
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>任务列表</span>
              <Space>
                <TaskCompletionRefresh 
                  onRefreshCompletionStats={() => loadTasks(pagination.current, pagination.pageSize)}
                  size="small"
                  showProgress={true}
                />
              </Space>
            </div>
          }
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
                onBulkCreateSubTasks={handleBulkCreateSubTasks}
                onArchiveTask={handleArchiveTask}
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
                columns={generateColumns()}
                rowKey="id"
                loading={loading}
                scroll={{ x: 'max-content' }}
                pagination={{
                  ...pagination,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
                }}
                onChange={handleTableChange}
                sortDirections={['ascend', 'descend']}
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
                  
                  // 🎯 优化：高亮当前计时的任务行 - 使用新的isTaskTiming函数
                  if (isTaskTiming(record.id, 'project_task')) {
                    classes.push('timer-active-row');
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
          title={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>全局任务列表</span>
              <Space>
                <TaskCompletionRefresh 
                  onRefreshCompletionStats={() => loadTasks(pagination.current, pagination.pageSize)}
                  size="small"
                  showProgress={true}
                />
              </Space>
            </div>
          }
          style={{
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            borderRadius: '12px',
            border: 'none',
            minHeight: '500px'
          }}
        >
          
          {/* 全局任务表格 */}
          <Table
            dataSource={Array.isArray(stableDataSource) ? stableDataSource : []}
            columns={generateColumns()}
            rowKey="id"
            loading={loading}
            scroll={{ x: 'max-content' }}
            pagination={{
              ...pagination,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
            }}
            onChange={handleTableChange}
            sortDirections={['ascend', 'descend']}
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
              
              // 🎯 优化：高亮当前计时的任务行 - 使用新的isTaskTiming函数
              if (isTaskTiming(record.id, 'project_task')) {
                classes.push('timer-active-row');
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
          // MEMORY OPTIMIZATION: Use ref for timeout
          timerUpdateRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              setTaskModalVisible(false);
            }
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
      
      {/* Archive Modal */}
      <TaskArchiveModal
        visible={archiveModalVisible}
        onCancel={() => setArchiveModalVisible(false)}
        onSuccess={handleArchiveSuccess}
        projectId={effectiveProjectId}
        tasks={tasksToArchive}
        mode={tasksToArchive.length === 1 ? 'single' : 'bulk'}
      />

      {/* Bulk SubTask Creator Modal */}
      {selectedParentTaskForBulk && (
        <BulkSubTaskCreator
          visible={bulkSubTaskModalVisible}
          onCancel={() => setBulkSubTaskModalVisible(false)}
          onSuccess={handleBulkSubTaskSuccess}
          parentTask={selectedParentTaskForBulk}
          projectId={selectedParentTaskForBulk.project_id}
        />
      )}
    </div>
  );
};

// MEMORY OPTIMIZATION: Add cleanup useEffect for TasksPage
const TasksPageWithCleanup: React.FC = () => {
  const tasksPageRef = useRef<any>(null);
  
  useEffect(() => {
    return () => {
      // Clear any pending timers on unmount
      if (tasksPageRef.current?.timerUpdateRef?.current) {
        clearTimeout(tasksPageRef.current.timerUpdateRef.current);
      }
    };
  }, []);
  
  return <TasksPage />;
};

export default TasksPageWithCleanup;
