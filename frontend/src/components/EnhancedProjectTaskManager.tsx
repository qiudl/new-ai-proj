import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Table,
  Card,
  Button,
  Space,
  Dropdown,
  Checkbox,
  Tooltip,
  Tag,
  Avatar,
  Progress,
  Select,
  DatePicker,
  message,
  Modal,
  Typography,
  Badge,
  Collapse,
  Drawer,
  Input,
  Form,
  Row,
  Col,
  Statistic
} from 'antd';
import type { MenuProps } from 'antd';
import {
  SettingOutlined,
  DownloadOutlined,
  ReloadOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  FilterOutlined,
  SearchOutlined,
  QuestionCircleOutlined,
  UserOutlined,
  CalendarOutlined,
  ProjectOutlined,
  BranchesOutlined,
  CaretRightOutlined,
  CaretDownOutlined,
  FilterFilled,
  PlusOutlined,
  MinusCircleOutlined,
  ClearOutlined,
  SaveOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  BarChartOutlined,
  ExclamationCircleOutlined,
  NodeIndexOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { TaskService } from '../services/taskService';
import { Task, TaskStatus, TaskRequest, HierarchicalTask as APIHierarchicalTask } from '../types/task';
import { logUserAction, logApiError } from '../utils/logger';
import { formatTaskStatus } from '../utils/formatters';
import { useTimer } from '../contexts/TimerContext';
import AllFieldsTableGuide from './AllFieldsTableGuide';
import { TaskParentSelectorModal } from './TaskParentSelectorModal';
import dayjs from 'dayjs';
import '../styles/AllFieldsTaskList.css';
import '../styles/EnhancedProjectTaskManager.css';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

// 扩展Task接口以支持层级显示
interface HierarchicalTask extends Task {
  children?: HierarchicalTask[];
  level?: number;
  hasChildren?: boolean;
  isExpanded?: boolean;
}

// 自定义字段配置
interface CustomFieldConfig {
  key: string;
  title: string;
  dataType: 'string' | 'number' | 'boolean' | 'array' | 'date';
  render?: (value: React.FormEvent | React.ChangeEvent<HTMLInputElement>, record: Task) => React.ReactNode;
  width?: number;
  sortable?: boolean;
}

// 列配置
interface ColumnConfig {
  key: string;
  title: string;
  dataIndex: string | string[];
  width: number;
  fixed?: 'left' | 'right';
  visible: boolean;
  sortable: boolean;
  resizable: boolean;
  customField?: boolean;
}

// 高级筛选器配置
interface AdvancedFilter {
  id: string;
  field: string;
  operator: string;
  value: React.FormEvent | React.ChangeEvent<HTMLInputElement>;
  logicalOperator?: 'AND' | 'OR';
}

// 项目任务统计
interface ProjectTaskStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  overdueTasks: number;
  completionRate: number;
  avgProgress: number;
}

// 默认自定义字段配置
const DEFAULT_CUSTOM_FIELDS: CustomFieldConfig[] = [
  {
    key: 'priority',
    title: '优先级',
    dataType: 'string',
    width: 100,
    render: (value: string) => {
      const priorityConfig = {
        high: { color: '#ff4d4f', text: '高' },
        medium: { color: '#fa8c16', text: '中' },
        low: { color: '#52c41a', text: '低' },
        urgent: { color: '#722ed1', text: '紧急' }
      };
      const config = priorityConfig[value as keyof typeof priorityConfig] || { color: '#d9d9d9', text: '未知' };
      return <Tag color={config.color}>{config.text}</Tag>;
    }
  },
  {
    key: 'tags',
    title: '标签',
    dataType: 'array',
    width: 150,
    render: (value: string[]) => (
      <Space wrap>
        {Array.isArray(value) && value.slice(0, 2).map((tag, index) => (
          <Tag key={index} color="blue" style={{ fontSize: '11px', padding: '2px 6px' }}>{tag}</Tag>
        ))}
        {Array.isArray(value) && value.length > 2 && (
          <Tag style={{ fontSize: '11px', padding: '2px 6px' }}>+{value.length - 2}</Tag>
        )}
      </Space>
    )
  },
  {
    key: 'estimated_hours',
    title: '预估工时',
    dataType: 'number',
    width: 100,
    render: (value: number) => value ? `${value}h` : '-'
  },
  {
    key: 'progress',
    title: '进度',
    dataType: 'number',
    width: 120,
    render: (value: number) => (
      <Progress 
        percent={value || 0} 
        size="small" 
        format={(percent) => `${percent}%`}
        strokeColor={{
          '0%': '#108ee9',
          '100%': '#87d068',
        }}
      />
    )
  }
];

interface EnhancedProjectTaskManagerProps {
  projectId: number;
  projectName?: string;
}

const EnhancedProjectTaskManager: React.FC<EnhancedProjectTaskManagerProps> = ({ 
  projectId, 
  projectName 
}) => {
  const navigate = useNavigate();
  const { timerState, startTimer, stopTimer, pauseTimer, resumeTimer, isLoading: timerLoading } = useTimer();
  
  // 数据状态
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  
  // 批量操作状态
  const [batchOperationVisible, setBatchOperationVisible] = useState(false);
  const [batchStatus, setBatchStatus] = useState<string>('');
  const [batchLoading, setBatchLoading] = useState(false);
  
  // 批量父任务选择状态
  const [parentSelectorVisible, setParentSelectorVisible] = useState(false);
  
  // 层级管理状态
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<number>>(new Set());
  const [hierarchicalTasks, setHierarchicalTasks] = useState<HierarchicalTask[]>([]);
  
  // 分页和过滤
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 50,
    total: 0,
  });
  const [filters, setFilters] = useState({
    search: '',
    taskIdSearch: '',
    status: [] as string[],
    assignee_id: undefined as number | undefined,
    due_date_range: null as [dayjs.Dayjs, dayjs.Dayjs] | null,
  });
  
  // 列配置状态
  const [columnConfigs, setColumnConfigs] = useState<ColumnConfig[]>([]);
  const [customFields] = useState<CustomFieldConfig[]>(DEFAULT_CUSTOM_FIELDS);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createForm] = Form.useForm();
  
  // 排序状态
  const [sortConfig, setSortConfig] = useState<{
    field: string;
    order: 'ascend' | 'descend';
  } | null>(null);
  
  // 高级筛选器状态
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilter[]>([]);
  const [advancedFilterVisible, setAdvancedFilterVisible] = useState(false);

  // 项目任务统计
  const projectStats = useMemo((): ProjectTaskStats => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.status === 'completed').length;
    const inProgressTasks = tasks.filter(task => ['in_progress', 'testing'].includes(task.status)).length;
    const todoTasks = tasks.filter(task => ['todo', 'draft', 'planning'].includes(task.status)).length;
    const overdueTasks = tasks.filter(task => 
      task.due_date && dayjs(task.due_date).isBefore(dayjs(), 'day') && !['completed', 'cancelled', 'archived'].includes(task.status)
    ).length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    // 计算平均进度
    const avgProgress = tasks.length > 0 
      ? Math.round(tasks.reduce((sum, task) => sum + (task.custom_fields?.progress || 0), 0) / tasks.length)
      : 0;

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      todoTasks,
      overdueTasks,
      completionRate,
      avgProgress
    };
  }, [tasks]);

  // 初始化列配置
  const initializeColumns = useCallback(() => {
    const storageKey = `projectTaskManager_${projectId}_columnConfigs`;
    
    // 尝试从本地存储加载配置
    let savedConfigs: ColumnConfig[] | null = null;
    try {
      const saved = localStorage.getItem(storageKey);
      savedConfigs = saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.warn('Failed to load column configs from localStorage:', error);
    }
    
    if (savedConfigs && savedConfigs.length > 0) {
      setColumnConfigs(savedConfigs);
      return;
    }
    
    // 默认列配置（移除项目相关列，因为都是同一个项目）
    const fixedColumns: ColumnConfig[] = [
      {
        key: 'id',
        title: 'ID',
        dataIndex: 'id',
        width: undefined, // 自适应宽度
        fixed: 'left',
        visible: true,
        sortable: true,
        resizable: true,
      },
      {
        key: 'title',
        title: '任务标题',
        dataIndex: 'title',
        width: 300,
        fixed: 'left',
        visible: true,
        sortable: true,
        resizable: true,
      },
      {
        key: 'status',
        title: '状态',
        dataIndex: 'status',
        width: 120,
        fixed: 'left',
        visible: true,
        sortable: true,
        resizable: false,
      },
      {
        key: 'timer_actions',
        title: '计时',
        dataIndex: '',
        width: 100,
        visible: true,
        sortable: false,
        resizable: false,
      },
      {
        key: 'actions',
        title: '操作',
        dataIndex: '',
        width: 120,
        fixed: 'right',
        visible: true,
        sortable: false,
        resizable: false,
      }
    ];

    const dynamicColumns: ColumnConfig[] = [
      {
        key: 'assignee_name',
        title: '负责人',
        dataIndex: 'assignee_name',
        width: 120,
        visible: true,
        sortable: true,
        resizable: true,
      },
      {
        key: 'due_date',
        title: '截止时间',
        dataIndex: 'due_date',
        width: 120,
        visible: true,
        sortable: true,
        resizable: true,
      },
      {
        key: 'created_at',
        title: '创建时间',
        dataIndex: 'created_at',
        width: 150,
        visible: false,
        sortable: true,
        resizable: true,
      },
      {
        key: 'updated_at',
        title: '更新时间',
        dataIndex: 'updated_at',
        width: 150,
        visible: true,
        sortable: true,
        resizable: true,
      }
    ];

    // 添加自定义字段列
    const customFieldColumns: ColumnConfig[] = customFields.map(field => ({
      key: `custom_${field.key}`,
      title: field.title,
      dataIndex: ['custom_fields', field.key],
      width: field.width || 120,
      visible: true,
      sortable: field.sortable || false,
      resizable: true,
      customField: true,
    }));

    const leftFixedColumns = fixedColumns.filter(col => col.key !== 'actions');
    const rightFixedColumns = fixedColumns.filter(col => col.key === 'actions');
    
    const defaultConfigs = [...leftFixedColumns, ...dynamicColumns, ...customFieldColumns, ...rightFixedColumns];
    setColumnConfigs(defaultConfigs);
    
    // 保存默认配置到本地存储
    try {
      localStorage.setItem(storageKey, JSON.stringify(defaultConfigs));
    } catch (error) {
      console.warn('Failed to save column configs to localStorage:', error);
    }
  }, [customFields, projectId]);

  // 处理任务层级结构
  const processHierarchicalTasks = useCallback((allTasks: Task[]): HierarchicalTask[] => {
    const taskMap = new Map<number, HierarchicalTask>();
    const rootTasks: HierarchicalTask[] = [];
    
    // 建立任务映射
    allTasks.forEach(task => {
      taskMap.set(task.id, { ...task, children: [] });
    });
    
    // 构建层级关系
    allTasks.forEach(task => {
      const taskWithChildren = taskMap.get(task.id);
      if (taskWithChildren) {
        if (task.parent_id && taskMap.has(task.parent_id)) {
          // 是子任务，添加到父任务的children数组
          const parentTask = taskMap.get(task.parent_id);
          if (parentTask && parentTask.children) {
            parentTask.children.push(taskWithChildren);
          }
        } else {
          // 是根任务
          rootTasks.push(taskWithChildren);
        }
      }
    });
    
    return rootTasks;
  }, []);

  // 展开/折叠任务
  const toggleTaskExpansion = useCallback((taskId: number) => {
    setExpandedTaskIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  }, []);

  // 扁平化任务列表（用于表格显示）
  const flattenTasksForTable = useCallback((tasks: HierarchicalTask[], level = 0): HierarchicalTask[] => {
    const result: HierarchicalTask[] = [];
    
    tasks.forEach(task => {
      // 添加当前任务，包含层级信息
      const taskWithLevel = { 
        ...task, 
        level,
        hasChildren: task.children && task.children.length > 0,
        isExpanded: expandedTaskIds.has(task.id)
      };
      result.push(taskWithLevel);
      
      // 如果任务已展开且有子任务，递归添加子任务
      if (expandedTaskIds.has(task.id) && task.children && task.children.length > 0) {
        result.push(...flattenTasksForTable(task.children, level + 1));
      }
    });
    
    return result;
  }, [expandedTaskIds]);

  // 将层级任务展平为普通任务列表
  const flattenHierarchicalTasks = useCallback((hierarchicalTasks: APIHierarchicalTask[]): Task[] => {
    const result: Task[] = [];
    
    const flatten = (tasks: APIHierarchicalTask[]) => {
      tasks.forEach(task => {
        // 转换 HierarchicalTask 为 Task
        const flatTask: Task = {
          id: task.id,
          project_id: task.project_id,
          title: task.title,
          description: task.description,
          status: task.status,
          assignee_id: task.assignee_id,
          assignee_name: task.assignee_name,
          due_date: task.due_date,
          custom_fields: task.custom_fields,
          parent_id: task.parent_id,
          task_level: task.task_level,
          sort_order: task.sort_order,
          created_at: task.created_at,
          updated_at: task.updated_at,
          children_count: task.children?.length || 0
        };
        
        result.push(flatTask);
        
        // 递归处理子任务
        if (task.children && task.children.length > 0) {
          flatten(task.children);
        }
      });
    };
    
    flatten(hierarchicalTasks);
    return result;
  }, []);

  // 注释掉重复的层级任务处理，因为现在直接从API设置层级数据
  // useEffect(() => {
  //   const hierarchical = processHierarchicalTasks(tasks);
  //   setHierarchicalTasks(hierarchical);
  // }, [tasks, processHierarchicalTasks]);

  // 过滤层级任务数据
  const filteredHierarchicalTasks = useMemo(() => {
    if (!hierarchicalTasks) return [];
    
    const filterHierarchicalData = (tasksData: any[]): any[] => {
      return tasksData.filter(task => {
        // 检查当前任务是否匹配过滤条件
        let matches = true;
        
        // 搜索筛选
        if (filters.search && matches) {
          matches = task.title.toLowerCase().includes(filters.search.toLowerCase()) ||
                   (task.description && task.description.toLowerCase().includes(filters.search.toLowerCase()));
        }
        
        // 任务ID搜索筛选
        if (filters.taskIdSearch && matches) {
          matches = task.id.toString().includes(filters.taskIdSearch);
        }
        
        // 状态筛选
        if (filters.status.length > 0 && matches) {
          matches = filters.status.includes(task.status);
        }
        
        // 负责人筛选
        if (filters.assignee_id && matches) {
          matches = task.assignee_id === filters.assignee_id;
        }
        
        // 日期筛选
        if (filters.due_date_range && matches) {
          if (!task.due_date) {
            matches = false;
          } else {
            const [startDate, endDate] = filters.due_date_range;
            const taskDate = dayjs(task.due_date);
            matches = taskDate.isAfter(startDate, 'day') && taskDate.isBefore(endDate, 'day');
          }
        }
        
        // 如果当前任务匹配，保留它
        if (matches) {
          // 递归过滤子任务
          if (task.children && task.children.length > 0) {
            task.children = filterHierarchicalData(task.children);
          }
          return true;
        }
        
        // 如果当前任务不匹配，检查是否有子任务匹配
        if (task.children && task.children.length > 0) {
          const filteredChildren = filterHierarchicalData(task.children);
          if (filteredChildren.length > 0) {
            task.children = filteredChildren;
            return true; // 保留有匹配子任务的父任务
          }
        }
        
        return false;
      });
    };
    
    return filterHierarchicalData(hierarchicalTasks);
  }, [hierarchicalTasks, filters]);

  // 自动展开搜索结果的父级任务
  useEffect(() => {
    if (filters.taskIdSearch && filteredHierarchicalTasks.length > 0) {
      const newExpandedIds = new Set<number>();
      
      // 递归查找匹配的任务并展开其所有父级
      const findAndExpandMatches = (tasks: any[], parentIds: number[] = []) => {
        tasks.forEach(task => {
          // 检查当前任务是否匹配ID搜索
          if (task.id.toString().includes(filters.taskIdSearch)) {
            // 展开所有父级任务
            parentIds.forEach(parentId => newExpandedIds.add(parentId));
          }
          
          // 递归检查子任务
          if (task.children && task.children.length > 0) {
            findAndExpandMatches(task.children, [...parentIds, task.id]);
          }
        });
      };
      
      findAndExpandMatches(filteredHierarchicalTasks);
      
      // 如果有需要展开的任务，更新展开状态
      if (newExpandedIds.size > 0) {
        setExpandedTaskIds(prev => {
          const merged = new Set([...prev, ...newExpandedIds]);
          return merged;
        });
      }
    } else if (!filters.taskIdSearch) {
      // 清除任务ID搜索时，可以选择性地收起所有任务（可选）
      // setExpandedTaskIds(new Set());
    }
  }, [filters.taskIdSearch, filteredHierarchicalTasks]);

  // 获取用于表格显示的扁平化任务数据
  const displayTasks = useMemo(() => {
    return flattenTasksForTable(filteredHierarchicalTasks);
  }, [filteredHierarchicalTasks, flattenTasksForTable]);

  // 同步tasks状态和pagination，用于统计
  useEffect(() => {
    setTasks(displayTasks);
    setPagination(prev => ({
      ...prev,
      total: displayTasks.length,
    }));
  }, [displayTasks]);

  // 定时器操作处理
  const handleStartTimer = useCallback(async (task: Task) => {
    const success = await startTimer(task.id, task.title);
    if (success) {
      message.success(`开始计时: ${task.title}`);
    }
  }, [startTimer]);

  const handleStopTimer = useCallback(async () => {
    const success = await stopTimer();
    if (success) {
      message.success('计时已停止');
    }
  }, [stopTimer]);

  const handlePauseResumeTimer = useCallback(async () => {
    if (timerState.isPaused) {
      const success = await resumeTimer();
      if (success) {
        message.success('计时已恢复');
      }
    } else {
      const success = await pauseTimer();
      if (success) {
        message.success('计时已暂停');
      }
    }
  }, [timerState.isPaused, pauseTimer, resumeTimer]);

  // 加载数据
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // 使用层级任务树API
      const hierarchicalTasksFromAPI = await TaskService.getTaskTree(projectId);
      
      if (hierarchicalTasksFromAPI) {
        // 设置原始层级数据
        setHierarchicalTasks(hierarchicalTasksFromAPI);
      }
    } catch (error) {
      message.error('加载任务数据失败');
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId, filters, advancedFilters, sortConfig, flattenHierarchicalTasks]);

  // 任务创建
  const handleCreateTask = useCallback(async () => {
    try {
      const values = await createForm.validateFields();
      
      // 构造符合后端 TaskRequest 模型的数据结构
      const taskData: TaskRequest = {
        title: values.title,
        description: values.description || '',
        status: values.status || 'todo',
        assignee_id: values.assignee_id || undefined, // 使用 undefined 而不是 null
        due_date: values.due_date ? values.due_date.toISOString() : undefined, // 发送 ISO 字符串，使用 undefined
        custom_fields: {
          priority: values.priority || 'medium',
          estimated_hours: values.estimated_hours || undefined,
          tags: values.tags || []
        },
        parent_id: undefined, // 使用 undefined 而不是 null
        sort_order: 0
      };

      logUserAction('create_task_attempt', { projectId, taskTitle: taskData.title });
      await TaskService.createTask(projectId, taskData);
      
      message.success('任务创建成功');
      logUserAction('create_task_success', { projectId, taskTitle: taskData.title });
      setCreateModalVisible(false);
      createForm.resetFields();
      loadData(); // 重新加载数据
    } catch (error: Error | unknown) {
      // 使用改进的错误日志记录
      logApiError('Task creation failed in component', error, { 
        projectId, 
        component: 'EnhancedProjectTaskManager',
        action: 'handleCreateTask'
      });
      
      // 提供更详细的错误信息
      const errorMessage = (error as any)?.message || (error as any)?.error?.message || '任务创建失败';
      message.error(`任务创建失败: ${errorMessage}`);
    }
  }, [projectId, createForm, loadData]);

  // 高级筛选器操作
  const addAdvancedFilter = useCallback(() => {
    const newFilter: AdvancedFilter = {
      id: Date.now().toString(),
      field: '',
      operator: 'contains',
      value: '',
      logicalOperator: 'AND'
    };
    setAdvancedFilters(prev => [...prev, newFilter]);
  }, []);

  const updateAdvancedFilter = useCallback((id: string, updates: Partial<AdvancedFilter>) => {
    setAdvancedFilters(prev => prev.map(filter => 
      filter.id === id ? { ...filter, ...updates } : filter
    ));
  }, []);

  const removeAdvancedFilter = useCallback((id: string) => {
    setAdvancedFilters(prev => prev.filter(filter => filter.id !== id));
  }, []);

  const clearAdvancedFilters = useCallback(() => {
    setAdvancedFilters([]);
    setAdvancedFilterVisible(false);
  }, []);

  const getTaskFieldValue = (task: Task, field: string) => {
    if (field.startsWith('custom_')) {
      const customKey = field.replace('custom_', '');
      return task.custom_fields?.[customKey];
    }
    return (task as unknown)[field];
  };

  const matchesFilterCondition = (fieldValue: React.FormEvent | React.ChangeEvent<HTMLInputElement>, operator: string, filterValue: React.FormEvent | React.ChangeEvent<HTMLInputElement>) => {
    // 处理为空和不为空的特殊情况
    if (operator === 'isEmpty') {
      return fieldValue == null || fieldValue === '' || 
        (Array.isArray(fieldValue) && fieldValue.length === 0);
    }
    if (operator === 'isNotEmpty') {
      return fieldValue != null && fieldValue !== '' && 
        (!Array.isArray(fieldValue) || fieldValue.length > 0);
    }

    // 其他操作符需要非空的筛选值
    if (filterValue == null || filterValue === '') return false;

    switch (operator) {
      case 'contains':
        return String(fieldValue || '').toLowerCase().includes(String(filterValue).toLowerCase());
      case 'equals':
        return fieldValue === filterValue;
      case 'notEquals':
        return fieldValue !== filterValue;
      case 'greater':
        return Number(fieldValue) > Number(filterValue);
      case 'less':
        return Number(fieldValue) < Number(filterValue);
      case 'greaterEqual':
        return Number(fieldValue) >= Number(filterValue);
      case 'lessEqual':
        return Number(fieldValue) <= Number(filterValue);
      default:
        return true;
    }
  };

  useEffect(() => {
    initializeColumns();
  }, [initializeColumns]);

  // 生成表格列定义
  const generateTableColumns = useMemo(() => {
    const visibleColumns = columnConfigs.filter(config => config.visible);
    
    return visibleColumns.map(config => {
      const baseColumn: any = {
        key: config.key,
        title: config.title,
        dataIndex: config.dataIndex,
        width: config.width,
        fixed: config.fixed,
        sorter: config.sortable ? (a: unknown, b: unknown) => {
          // 使用自定义排序逻辑，实际排序在loadData中处理
          return 0;
        } : false,
        sortOrder: sortConfig?.field === config.key ? sortConfig.order : null,
      };

      // 特殊列的渲染
      switch (config.key) {
        case 'id':
          return {
            ...baseColumn,
            width: 'auto', // 明确设置为自动宽度
            render: (id: number) => (
              <Text strong style={{ color: '#1890ff' }}>#{id}</Text>
            ),
          };

        case 'title':
          return {
            ...baseColumn,
            render: (title: string, record: any) => {
              const level = record.level || 0;
              
              return (
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px',
                    paddingLeft: level * 24
                  }}
                >
                  {level > 0 && (
                    <BranchesOutlined style={{ color: '#8c8c8c', fontSize: '12px' }} />
                  )}
                  
                  {record.hasChildren && (
                    <Button
                      type="text"
                      size="small"
                      icon={record.isExpanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTaskExpansion(record.id);
                      }}
                      style={{
                        padding: 0,
                        minWidth: 'auto',
                        height: 'auto',
                        marginRight: '4px',
                        color: '#8c8c8c'
                      }}
                    />
                  )}
                  
                  <Button
                    type="link"
                    style={{ 
                      padding: 0, 
                      height: 'auto', 
                      textAlign: 'left',
                      fontWeight: level === 0 ? 600 : 400
                    }}
                    onClick={() => navigate(`/projects/${projectId}/tasks/${record.id}`)}
                  >
                    {title}
                  </Button>
                  
                  {record.hasChildren && (
                    <Tag color="blue" style={{ fontSize: '11px', marginLeft: '8px' }}>
                      {record.children?.length || 0} 子任务
                    </Tag>
                  )}
                </div>
              );
            },
          };

        case 'status':
          return {
            ...baseColumn,
            render: (status: string) => {
              const statusConfig = {
                todo: { color: '#d9d9d9', text: '待开始' },
                in_progress: { color: '#1890ff', text: '进行中' },
                completed: { color: '#52c41a', text: '已完成' },
                cancelled: { color: '#ff4d4f', text: '已取消' }
              };
              const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.todo;
              return <Tag color={config.color}>{config.text}</Tag>;
            },
          };

        case 'timer_actions':
          return {
            ...baseColumn,
            render: (_: any, record: Task) => {
              const isCurrentTask = timerState.taskId === record.id;
              const isRunning = timerState.isRunning && isCurrentTask;
              const isPaused = isRunning && timerState.isPaused;
              
              if (isRunning) {
                return (
                  <Space size="small">
                    <Button
                      type="text"
                      size="small"
                      icon={isPaused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
                      onClick={handlePauseResumeTimer}
                      loading={timerLoading}
                      style={{ color: isPaused ? '#fa8c16' : '#52c41a' }}
                    />
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<StopOutlined />}
                      onClick={handleStopTimer}
                      loading={timerLoading}
                    />
                  </Space>
                );
              }
              
              if (['in_progress', 'testing', 'todo', 'draft', 'planning'].includes(record.status)) {
                return (
                  <Button
                    type="text"
                    size="small"
                    icon={<PlayCircleOutlined />}
                    onClick={() => handleStartTimer(record)}
                    loading={timerLoading && timerState.taskId === record.id}
                    style={{ color: '#52c41a' }}
                    title="开始计时"
                  />
                );
              }
              
              return <Text type="secondary">-</Text>;
            },
          };

        case 'assignee_name':
          return {
            ...baseColumn,
            render: (assigneeName: string) => (
              assigneeName ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Avatar size={20} icon={<UserOutlined />} />
                  <Text style={{ fontSize: '12px' }}>{assigneeName}</Text>
                </div>
              ) : (
                <Text type="secondary">未分配</Text>
              )
            ),
          };

        case 'due_date':
          return {
            ...baseColumn,
            render: (dueDate: string) => {
              if (!dueDate) return <Text type="secondary">-</Text>;
              const date = dayjs(dueDate);
              const isOverdue = date.isBefore(dayjs(), 'day');
              const isToday = date.isSame(dayjs(), 'day');
              const isSoon = date.diff(dayjs(), 'day') <= 3 && !isOverdue;

              return (
                <Text 
                  style={{ 
                    color: isOverdue ? '#ff4d4f' : isToday ? '#fa8c16' : isSoon ? '#fa541c' : undefined 
                  }}
                >
                  <CalendarOutlined style={{ marginRight: '4px' }} />
                  {date.format('MM-DD')}
                </Text>
              );
            },
          };

        case 'created_at':
        case 'updated_at':
          return {
            ...baseColumn,
            render: (dateTime: string) => (
              <Text style={{ fontSize: '12px' }}>
                {dayjs(dateTime).format('MM-DD HH:mm')}
              </Text>
            ),
          };

        case 'actions':
          return {
            ...baseColumn,
            fixed: 'right',
            width: 120,
            render: (_: any, record: Task) => (
              <Space size="small">
                <Tooltip title="查看详情">
                  <Button
                    type="text"
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => navigate(`/projects/${projectId}/tasks/${record.id}`)}
                  />
                </Tooltip>
                <Tooltip title="编辑">
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => navigate(`/projects/${projectId}/tasks/${record.id}/edit`)}
                  />
                </Tooltip>
                <Tooltip title="删除">
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDeleteTask(record)}
                  />
                </Tooltip>
              </Space>
            ),
          };

        default:
          // 自定义字段渲染
          if (config.customField) {
            const fieldKey = config.key.replace('custom_', '');
            const fieldConfig = customFields.find(f => f.key === fieldKey);
            
            return {
              ...baseColumn,
              render: (value: any, record: Task) => {
                if (fieldConfig?.render) {
                  return fieldConfig.render(value, record);
                }
                return value || <Text type="secondary">-</Text>;
              },
            };
          }
          
          return baseColumn;
      }
    });
  }, [columnConfigs, customFields, navigate, projectId, timerState, timerLoading, handleStartTimer, handlePauseResumeTimer, handleStopTimer, toggleTaskExpansion]);

  // 删除任务
  const handleDeleteTask = useCallback(async (task: Task) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除任务"${task.title}"吗？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await TaskService.deleteTask(projectId, task.id);
          message.success('任务删除成功');
          loadData();
        } catch (error: Error | unknown) {
          console.error('Error deleting task:', error);
          const errorMessage = error?.message || error?.error?.message || '删除失败';
          message.error(`删除失败: ${errorMessage}`);
        }
      },
    });
  }, [projectId, loadData]);

  // 批量操作处理函数
  const handleBatchUpdateStatus = useCallback(async (status: string) => {
    if (selectedRowKeys.length === 0) return;

    const { text: statusText } = formatTaskStatus(status);

    Modal.confirm({
      title: '批量更新状态',
      content: `确定要将选中的 ${selectedRowKeys.length} 个任务状态更新为 "${statusText}" 吗？`,
      onOk: async () => {
        try {
          setBatchLoading(true);
          
          // 使用新的批量更新API
          const taskIds = selectedRowKeys.map(id => Number(id));
          const result = await TaskService.batchUpdateTasks(projectId, taskIds, status);
          
          // 处理结果
          if (result.failed_tasks && result.failed_tasks.length > 0) {
            const successCount = result.updated_count;
            const failureCount = result.failed_tasks.length;
            
            // 显示详细的成功/失败信息
            Modal.info({
              title: '批量更新结果',
              content: (
                <div>
                  <p>✅ 成功更新: {successCount} 个任务</p>
                  <p>❌ 更新失败: {failureCount} 个任务</p>
                  {failureCount <= 3 && (
                    <div style={{ marginTop: '8px' }}>
                      <Text type="secondary">失败任务:</Text>
                      <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                        {result.failed_tasks.map(failed => (
                          <li key={failed.task_id}>
                            任务 #{failed.task_id}: {failed.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ),
              okText: '确定'
            });
          } else {
            message.success(`✅ 成功更新了 ${result.updated_count} 个任务的状态为"${statusText}"`);
          }
          
          setSelectedRowKeys([]);
          loadData();
        } catch (error: Error | unknown) {
          logApiError('Batch status update failed', error, { 
            projectId, 
            taskCount: selectedRowKeys.length,
            targetStatus: status,
            component: 'EnhancedProjectTaskManager'
          });
          const errorMessage = error?.message || error?.error?.message || '批量更新状态失败';
          message.error(`批量更新状态失败: ${errorMessage}`);
        } finally {
          setBatchLoading(false);
        }
      }
    });
  }, [selectedRowKeys, projectId, loadData]);

  const handleBatchUpdatePriority = useCallback(async (priority: string) => {
    if (selectedRowKeys.length === 0) return;

    Modal.confirm({
      title: '批量设置优先级',
      content: `确定要将选中的 ${selectedRowKeys.length} 个任务优先级设置为 "${priority === 'low' ? '低' : priority === 'medium' ? '中' : priority === 'high' ? '高' : '紧急'}" 吗？`,
      onOk: async () => {
        try {
          // 并行更新所有选中的任务
          const updatePromises = selectedRowKeys.map(taskId => {
            const task = tasks.find(t => t.id === Number(taskId));
            const customFields = { ...task?.custom_fields, priority };
            return TaskService.updateTask(projectId, Number(taskId), { custom_fields: customFields });
          });
          
          await Promise.all(updatePromises);
          message.success(`成功设置了 ${selectedRowKeys.length} 个任务的优先级`);
          setSelectedRowKeys([]);
          loadData();
        } catch (error: Error | unknown) {
          console.error('Error in batch priority update:', error);
          const errorMessage = error?.message || error?.error?.message || '批量设置优先级失败';
          message.error(`批量设置优先级失败: ${errorMessage}`);
        }
      }
    });
  }, [selectedRowKeys, projectId, tasks, loadData]);

  const handleBatchChangeParent = useCallback(() => {
    if (selectedRowKeys.length === 0) return;
    setParentSelectorVisible(true);
  }, [selectedRowKeys]);

  const handleBatchParentSelect = useCallback(async (parentId: number | null, parentTask?: Task | null) => {
    setParentSelectorVisible(false);
    
    if (selectedRowKeys.length === 0) return;

    const parentName = parentTask ? parentTask.title : '无父任务';
    Modal.confirm({
      title: '批量更改父任务',
      content: `确定要将选中的 ${selectedRowKeys.length} 个任务的父任务设置为 "${parentName}" 吗？`,
      onOk: async () => {
        try {
          setBatchLoading(true);
          
          // 使用批量更新API，避免title验证问题
          const taskIds = selectedRowKeys.map(id => Number(id));
          const result = await TaskService.batchUpdateTasks(projectId, taskIds, { parent_id: parentId });
          
          // 处理结果
          if (result.failed_tasks && result.failed_tasks.length > 0) {
            const successCount = result.updated_count;
            const failureCount = result.failed_tasks.length;
            
            // 显示详细的成功/失败信息
            Modal.info({
              title: '批量更改父任务结果',
              content: (
                <div>
                  <p>✅ 成功更改: {successCount} 个任务</p>
                  <p>❌ 更改失败: {failureCount} 个任务</p>
                  {failureCount <= 3 && (
                    <div style={{ marginTop: '8px' }}>
                      <p><strong>失败详情:</strong></p>
                      {result.failed_tasks.slice(0, 3).map(failed => (
                        <p key={failed.task_id} style={{ fontSize: '12px', color: '#ff4d4f' }}>
                          任务ID {failed.task_id}: {failed.error}
                        </p>
                      ))}
                    </div>
                  )}
                  {failureCount > 3 && (
                    <p style={{ fontSize: '12px', color: '#8c8c8c' }}>
                      还有 {failureCount - 3} 个任务更改失败...
                    </p>
                  )}
                </div>
              ),
              width: 450,
              onOk: () => {
                setSelectedRowKeys([]);
                loadData();
              }
            });
          } else {
            message.success(`成功更改了 ${result.updated_count} 个任务的父任务`);
            setSelectedRowKeys([]);
            loadData();
          }
        } catch (error: Error | unknown) {
          console.error('Error in batch parent change:', error);
          const errorMessage = error?.message || error?.error?.message || '批量更改父任务失败';
          message.error(`批量更改父任务失败: ${errorMessage}`);
        } finally {
          setBatchLoading(false);
        }
      }
    });
  }, [selectedRowKeys, projectId, loadData]);

  const handleBatchDelete = useCallback(async () => {
    if (selectedRowKeys.length === 0) return;

    Modal.confirm({
      title: '批量删除任务',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个任务吗？此操作不可撤销。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          // 使用批量删除API如果可用，否则并行删除
          const taskIds = selectedRowKeys.map(id => Number(id));
          
          try {
            // 尝试使用批量删除API
            await TaskService.bulkDeleteTasks(projectId, taskIds);
          } catch (error) {
            // 如果批量删除不可用，使用并行删除
            const deletePromises = taskIds.map(taskId => 
              TaskService.deleteTask(projectId, taskId)
            );
            await Promise.all(deletePromises);
          }
          
          message.success(`成功删除了 ${selectedRowKeys.length} 个任务`);
          setSelectedRowKeys([]);
          loadData();
        } catch (error: Error | unknown) {
          console.error('Error in batch delete:', error);
          const errorMessage = error?.message || error?.error?.message || '批量删除失败';
          message.error(`批量删除失败: ${errorMessage}`);
        }
      }
    });
  }, [selectedRowKeys, projectId, loadData]);

  // 统一的批量操作处理函数
  const handleBatchAction = useCallback(async (key: string) => {
    if (key.startsWith('status-')) {
      const status = key.replace('status-', '');
      await handleBatchUpdateStatus(status);
    } else if (key.startsWith('priority-')) {
      const priority = key.replace('priority-', '');
      await handleBatchUpdatePriority(priority);
    } else if (key === 'changeParent') {
      handleBatchChangeParent();
    } else if (key === 'delete') {
      await handleBatchDelete();
    }
  }, [handleBatchUpdateStatus, handleBatchUpdatePriority, handleBatchChangeParent, handleBatchDelete]);

  // 行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  useEffect(() => {
    initializeColumns();
  }, [initializeColumns]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 键盘快捷键支持
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + A: 全选任务
      if ((event.ctrlKey || event.metaKey) && event.key === 'a' && selectedRowKeys.length === 0) {
        event.preventDefault();
        const allTaskIds = displayTasks.map(task => task.id);
        setSelectedRowKeys(allTaskIds);
        message.info(`已选择全部 ${allTaskIds.length} 个任务`);
      }
      // Escape: 取消选择
      else if (event.key === 'Escape' && selectedRowKeys.length > 0) {
        setSelectedRowKeys([]);
        message.info('已取消选择');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedRowKeys, displayTasks]);

  return (
    <div className="enhanced-project-task-manager">
      {/* 项目任务统计概览 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={6}>
          <Tooltip title="点击查看全部任务">
            <Card size="small" hoverable style={{ cursor: 'pointer', minHeight: '120px' }}>
              <div onClick={() => {
                // 清除所有筛选，显示全部任务
                setFilters(prev => ({ 
                  ...prev, 
                  search: '',
                  taskIdSearch: '',
                  status: [], 
                  due_date_range: null 
                }));
              }}>
                <Statistic
                  title="任务总数"
                  value={projectStats.totalTasks}
                  prefix={<BarChartOutlined style={{ color: '#1890ff' }} />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </div>
            </Card>
          </Tooltip>
        </Col>
        <Col xs={24} sm={6}>
          <Tooltip title="点击筛选已完成任务">
            <Card size="small" hoverable style={{ cursor: 'pointer', minHeight: '120px' }}>
              <div onClick={() => {
                // 筛选已完成任务
                setFilters(prev => ({ 
                  ...prev, 
                  search: '',
                  taskIdSearch: '',
                  status: ['completed'],
                  due_date_range: null 
                }));
              }}>
                <Statistic
                  title="已完成"
                  value={projectStats.completedTasks}
                  prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                  valueStyle={{ color: '#52c41a' }}
                />
                <div style={{ marginTop: '8px' }}>
                  <Progress 
                    percent={projectStats.completionRate} 
                    size="small" 
                    showInfo={false}
                    strokeColor="#52c41a"
                  />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    完成率 {projectStats.completionRate}%
                  </Text>
                </div>
              </div>
            </Card>
          </Tooltip>
        </Col>
        <Col xs={24} sm={6}>
          <Tooltip title="点击筛选进行中任务">
            <Card size="small" hoverable style={{ cursor: 'pointer', minHeight: '120px' }}>
              <div onClick={() => {
                // 筛选进行中任务
                setFilters(prev => ({ 
                  ...prev, 
                  search: '',
                  taskIdSearch: '',
                  status: ['in_progress', 'testing'],
                  due_date_range: null 
                }));
              }}>
                <Statistic
                  title="进行中"
                  value={projectStats.inProgressTasks}
                  prefix={<SyncOutlined style={{ color: '#fa8c16' }} />}
                  valueStyle={{ color: '#fa8c16' }}
                />
              </div>
            </Card>
          </Tooltip>
        </Col>
        <Col xs={24} sm={6}>
          <Tooltip title="点击筛选逾期任务">
            <Card size="small" hoverable style={{ cursor: 'pointer', minHeight: '120px' }}>
              <div onClick={() => {
                // 筛选逾期任务
                const yesterday = dayjs().subtract(1, 'day');
                setFilters(prev => ({ 
                  ...prev, 
                  search: '',
                  taskIdSearch: '',
                  status: ['draft', 'planning', 'todo', 'in_progress', 'testing', 'on_hold', 'suspended', 'blocked'], // 逾期任务应该是未完成的
                  due_date_range: [dayjs('2020-01-01'), yesterday] // 截止日期在昨天之前的
                }));
              }}>
                <Statistic
                  title="逾期任务"
                  value={projectStats.overdueTasks}
                  prefix={<ClockCircleOutlined style={{ color: projectStats.overdueTasks > 0 ? '#ff4d4f' : '#52c41a' }} />}
                  valueStyle={{ color: projectStats.overdueTasks > 0 ? '#ff4d4f' : '#52c41a' }}
                />
              </div>
            </Card>
          </Tooltip>
        </Col>
      </Row>

      {/* 当前计时器状态 */}
      {timerState.isRunning && (
        <Card size="small" style={{ marginBottom: '16px', backgroundColor: '#f6ffed', borderColor: '#b7eb8f' }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Space>
                <ClockCircleOutlined style={{ color: '#52c41a' }} />
                <Text strong>正在计时: {timerState.taskTitle}</Text>
                <Text type="secondary">({timerState.formattedTime})</Text>
                {timerState.isPaused && <Tag color="orange">已暂停</Tag>}
              </Space>
            </Col>
            <Col>
              <Space>
                <Button 
                  size="small" 
                  icon={timerState.isPaused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
                  onClick={handlePauseResumeTimer}
                  loading={timerLoading}
                >
                  {timerState.isPaused ? '继续' : '暂停'}
                </Button>
                <Button 
                  size="small" 
                  danger 
                  icon={<StopOutlined />}
                  onClick={handleStopTimer}
                  loading={timerLoading}
                >
                  停止
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>
      )}

      {/* 工具栏 - 优化为一行显示 */}
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Row justify="space-between" align="middle" gutter={8}>
          <Col flex="auto">
            <Space size="small" wrap>
              <Input
                placeholder="搜索任务"
                prefix={<SearchOutlined />}
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                style={{ width: 160 }}
                allowClear
                size="small"
              />
              <Input
                placeholder="任务ID"
                prefix={<span style={{ color: '#8c8c8c' }}>#</span>}
                value={filters.taskIdSearch}
                onChange={(e) => setFilters(prev => ({ ...prev, taskIdSearch: e.target.value }))}
                style={{ width: 100 }}
                allowClear
                size="small"
              />
              <Select
                mode="multiple"
                placeholder="状态"
                value={filters.status}
                onChange={(status) => setFilters(prev => ({ ...prev, status }))}
                style={{ width: 120 }}
                allowClear
                size="small"
              >
                <Option value="todo">待开始</Option>
                <Option value="in_progress">进行中</Option>
                <Option value="completed">已完成</Option>
                <Option value="cancelled">已取消</Option>
              </Select>
              <RangePicker
                placeholder={['开始', '结束']}
                value={filters.due_date_range}
                onChange={(dates) => setFilters(prev => ({ ...prev, due_date_range: dates as [dayjs.Dayjs, dayjs.Dayjs] | null }))}
                size="small"
                style={{ width: 180 }}
              />
              <Button 
                icon={<FilterOutlined />}
                onClick={loadData}
                size="small"
              >
                筛选
              </Button>
              <Button
                icon={<FilterFilled />}
                type={advancedFilterVisible ? 'primary' : 'default'}
                onClick={() => setAdvancedFilterVisible(!advancedFilterVisible)}
                size="small"
              >
                高级
                {advancedFilters.length > 0 && (
                  <Badge count={advancedFilters.length} size="small" style={{ marginLeft: 4 }} />
                )}
              </Button>
              {(filters.search || filters.taskIdSearch || filters.status.length > 0 || filters.due_date_range || advancedFilters.length > 0) && (
                <Button 
                  icon={<ClearOutlined />}
                  onClick={() => {
                    setFilters({
                      search: '',
                      taskIdSearch: '',
                      status: [],
                      assignee_id: undefined,
                      due_date_range: null
                    });
                    clearAdvancedFilters();
                  }}
                  size="small"
                >
                  清除
                </Button>
              )}
              <Button 
                icon={<ReloadOutlined />} 
                onClick={loadData}
                loading={loading}
                size="small"
              >
                刷新
              </Button>
            </Space>
          </Col>
          <Col>
            <Button 
              icon={<PlusOutlined />}
              type="primary"
              onClick={() => setCreateModalVisible(true)}
              size="small"
            >
              新建任务
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 高级筛选面板 */}
      {advancedFilterVisible && (
        <Card style={{ marginBottom: '16px' }}>
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={5} style={{ margin: 0 }}>高级筛选条件</Title>
            <Space>
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                onClick={addAdvancedFilter}
              >
                添加条件
              </Button>
              {advancedFilters.length > 0 && (
                <Button
                  size="small"
                  icon={<ClearOutlined />}
                  onClick={clearAdvancedFilters}
                >
                  清空条件
                </Button>
              )}
            </Space>
          </div>
          
          {advancedFilters.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              <Text>暂无筛选条件，点击"添加条件"开始设置高级筛选</Text>
            </div>
          ) : (
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              {advancedFilters.map((filter, index) => (
                <Row key={filter.id} gutter={8} align="middle">
                  {index > 0 && (
                    <Col span={2}>
                      <Select
                        value={filter.logicalOperator}
                        size="small"
                        onChange={(value) => updateAdvancedFilter(filter.id, { logicalOperator: value })}
                        style={{ width: '100%' }}
                      >
                        <Option value="AND">且</Option>
                        <Option value="OR">或</Option>
                      </Select>
                    </Col>
                  )}
                  <Col span={index > 0 ? 5 : 6}>
                    <Select
                      placeholder="选择字段"
                      value={filter.field}
                      size="small"
                      onChange={(value) => updateAdvancedFilter(filter.id, { field: value })}
                      style={{ width: '100%' }}
                    >
                      <Option value="title">任务标题</Option>
                      <Option value="description">任务描述</Option>
                      <Option value="status">状态</Option>
                      <Option value="assignee_name">负责人</Option>
                      <Option value="due_date">截止时间</Option>
                      <Option value="custom_priority">优先级</Option>
                      <Option value="custom_progress">进度</Option>
                      <Option value="custom_estimated_hours">预估工时</Option>
                      <Option value="task_level">任务层级</Option>
                    </Select>
                  </Col>
                  <Col span={4}>
                    <Select
                      placeholder="条件"
                      value={filter.operator}
                      size="small"
                      onChange={(value) => updateAdvancedFilter(filter.id, { operator: value })}
                      style={{ width: '100%' }}
                    >
                      <Option value="contains">包含</Option>
                      <Option value="equals">等于</Option>
                      <Option value="notEquals">不等于</Option>
                      <Option value="greater">大于</Option>
                      <Option value="less">小于</Option>
                      <Option value="greaterEqual">大于等于</Option>
                      <Option value="lessEqual">小于等于</Option>
                      <Option value="isEmpty">为空</Option>
                      <Option value="isNotEmpty">不为空</Option>
                    </Select>
                  </Col>
                  <Col span={index > 0 ? 5 : 6}>
                    {filter.operator === 'isEmpty' || filter.operator === 'isNotEmpty' ? (
                      <Input
                        placeholder="无需填写值"
                        size="small"
                        disabled
                        style={{ width: '100%' }}
                      />
                    ) : filter.field === 'status' ? (
                      <Select
                        placeholder="选择状态"
                        value={filter.value}
                        size="small"
                        onChange={(value) => updateAdvancedFilter(filter.id, { value })}
                        style={{ width: '100%' }}
                      >
                        <Option value="todo">待开始</Option>
                        <Option value="in_progress">进行中</Option>
                        <Option value="completed">已完成</Option>
                        <Option value="cancelled">已取消</Option>
                      </Select>
                    ) : filter.field === 'custom_priority' ? (
                      <Select
                        placeholder="选择优先级"
                        value={filter.value}
                        size="small"
                        onChange={(value) => updateAdvancedFilter(filter.id, { value })}
                        style={{ width: '100%' }}
                      >
                        <Option value="low">低</Option>
                        <Option value="medium">中</Option>
                        <Option value="high">高</Option>
                        <Option value="urgent">紧急</Option>
                      </Select>
                    ) : (
                      <Input
                        placeholder="筛选值"
                        value={filter.value}
                        size="small"
                        onChange={(e) => updateAdvancedFilter(filter.id, { value: e.target.value })}
                        style={{ width: '100%' }}
                      />
                    )}
                  </Col>
                  <Col span={2}>
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<MinusCircleOutlined />}
                      onClick={() => removeAdvancedFilter(filter.id)}
                    />
                  </Col>
                </Row>
              ))}
            </Space>
          )}
        </Card>
      )}

      {/* 批量操作工具栏 */}
      {selectedRowKeys.length > 0 && (
        <Card style={{ marginBottom: '16px', backgroundColor: '#f6ffed', borderColor: '#b7eb8f' }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Space>
                <Text strong>已选择 {selectedRowKeys.length} 个任务</Text>
                <Button
                  size="small"
                  onClick={() => {
                    const allTaskIds = displayTasks.map(task => task.id);
                    setSelectedRowKeys(allTaskIds);
                    message.info(`已选择全部 ${allTaskIds.length} 个任务`);
                  }}
                >
                  全选
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    const allTaskIds = displayTasks.map(task => task.id);
                    const unselectedIds = allTaskIds.filter(id => !selectedRowKeys.includes(id));
                    setSelectedRowKeys(unselectedIds);
                    message.info(`已反选，当前选择 ${unselectedIds.length} 个任务`);
                  }}
                >
                  反选
                </Button>
                <Button
                  size="小"
                  onClick={() => {
                    setSelectedRowKeys([]);
                    message.info('已取消选择');
                  }}
                >
                  取消选择
                </Button>
              </Space>
            </Col>
            <Col>
              <Space>
                {
                  // 使用 Antd v5 Dropdown.menu API 替代 overlay + Menu 以避免 undefined 组件问题
                }
                <Dropdown
                  menu={{
                    items: [
                      {
                        key: 'updateStatus',
                        label: '批量更新状态',
                        icon: <EditOutlined />,
                        children: [
                          { key: 'status-todo', label: '设为待开始', icon: <ClockCircleOutlined /> },
                          { key: 'status-in_progress', label: '设为进行中', icon: <SyncOutlined /> },
                          { key: 'status-completed', label: '设为已完成', icon: <CheckCircleOutlined /> },
                          { key: 'status-cancelled', label: '设为已取消', icon: <MinusCircleOutlined /> },
                        ],
                      },
                      { type: 'divider' },
                      {
                        key: 'setPriority',
                        label: '批量设置优先级',
                        icon: <ExclamationCircleOutlined />,
                        children: [
                          { key: 'priority-low', label: (<span><Tag color="green">低</Tag></span>) },
                          { key: 'priority-medium', label: (<span><Tag color="orange">中</Tag></span>) },
                          { key: 'priority-high', label: (<span><Tag color="red">高</Tag></span>) },
                          { key: 'priority-urgent', label: (<span><Tag color="purple">紧急</Tag></span>) },
                        ],
                      },
                      { type: 'divider' },
                      { key: 'changeParent', label: '更改父任务', icon: <NodeIndexOutlined /> },
                      { type: 'divider' },
                      { key: 'delete', label: '批量删除', icon: <DeleteOutlined />, danger: true },
                    ] as MenuProps['items'],
                    onClick: ({ key }) => handleBatchAction(key as string),
                  }}
                  trigger={['click']}
                  placement="bottomLeft"
                  disabled={batchLoading}
                >
                  <Button size="small" loading={batchLoading}>
                    批量操作 <CaretDownOutlined />
                  </Button>
                </Dropdown>
              </Space>
            </Col>
          </Row>
        </Card>
      )}

      {/* 任务表格 */}
      <Card>
        <Table
          columns={generateTableColumns}
          dataSource={displayTasks}
          rowKey="id"
          rowSelection={rowSelection}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
            onChange: (page, pageSize) => {
              setPagination(prev => ({ ...prev, current: page, pageSize: pageSize || 50 }));
            },
          }}
          onChange={(pagination, filters, sorter) => {
            // 处理排序
            if (sorter && !Array.isArray(sorter)) {
              if (sorter.order) {
                setSortConfig({
                  field: sorter.field as string,
                  order: sorter.order
                });
              } else {
                setSortConfig(null);
              }
            }
          }}
          loading={loading}
          scroll={{ x: 'max-content' }}
          rowClassName={(record: HierarchicalTask) => {
            const level = record.level || 0;
            const classes = [`task-level-${level}`];
            
            // 层级样式
            if (record.hasChildren) {
              classes.push('task-has-children');
            }
            if (level > 0) {
              classes.push('task-child');
            }
            
            // 计时器状态样式
            if (timerState.isRunning && timerState.taskId === record.id) {
              if (timerState.isPaused) {
                classes.push('timer-paused-row');
              } else {
                classes.push('timer-active-row');
              }
            }
            
            return classes.join(' ');
          }}
          size="small"
          bordered
        />
      </Card>

      {/* 任务创建模态框 */}
      <Modal
        title="新建任务"
        open={createModalVisible}
        onOk={handleCreateTask}
        onCancel={() => {
          setCreateModalVisible(false);
          createForm.resetFields();
        }}
        width={600}
        okText="创建"
        cancelText="取消"
      >
        <Form
          form={createForm}
          layout="vertical"
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="title"
            label="任务标题"
            rules={[{ required: true, message: '请输入任务标题' }]}
          >
            <Input placeholder="请输入任务标题" />
          </Form.Item>

          <Form.Item
            name="description"
            label="任务描述"
          >
            <Input.TextArea rows={3} placeholder="请输入任务描述" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="status"
                label="任务状态"
                initialValue="todo"
              >
                <Select>
                  <Option value="todo">待办</Option>
                  <Option value="in_progress">进行中</Option>
                  <Option value="completed">已完成</Option>
                  <Option value="cancelled">已取消</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="priority"
                label="优先级"
                initialValue="medium"
              >
                <Select>
                  <Option value="low">低</Option>
                  <Option value="medium">中</Option>
                  <Option value="high">高</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="assignee_id"
                label="负责人"
              >
                <Select placeholder="选择负责人" allowClear>
                  <Option value={1}>用户 1</Option>
                  <Option value={2}>用户 2</Option>
                  <Option value={3}>用户 3</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="due_date"
                label="截止日期"
              >
                <DatePicker style={{ width: '100%' }} placeholder="选择截止日期" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="estimated_hours"
                label="预估工时(小时)"
              >
                <Input type="number" placeholder="输入预估工时" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="tags"
                label="标签"
              >
                <Select
                  mode="tags"
                  placeholder="添加标签"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 批量父任务选择模态框 */}
      <TaskParentSelectorModal
        open={parentSelectorVisible}
        projectId={projectId}
        excludeTaskIds={selectedRowKeys.map(id => Number(id))} // 排除选中的任务
        onOk={handleBatchParentSelect}
        onCancel={() => setParentSelectorVisible(false)}
        title="批量更改父任务"
        okText="确定更改"
        cancelText="取消"
        showValidation={true}
        allowClear={true}
      />
    </div>
  );
};

export default EnhancedProjectTaskManager;