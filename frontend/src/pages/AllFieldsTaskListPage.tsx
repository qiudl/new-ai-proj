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
  Input,
  Form,
  MenuProps
} from 'antd';
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
  FolderOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  NotificationOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
// Note: Drag and drop functionality temporarily disabled due to missing dependencies
import { TaskService } from '../services/taskService';
import { projectService } from '../services/projectService';
import { Task } from '../types/task';
import AllFieldsTableGuide from '../components/AllFieldsTableGuide';
import dayjs from 'dayjs';
import '../styles/AllFieldsTaskList.css';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

// Note: Sortable column header simplified - drag functionality temporarily disabled

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
  // Value-first render signature (accepts any value type), record retained for context
  render?: (value: any, record: Task) => React.ReactNode;
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
  // Store actual filter value rather than DOM events
  value: unknown;
  logicalOperator?: 'AND' | 'OR';
}

// 筛选器字段选项
interface FilterFieldOption {
  value: string;
  label: string;
  dataType: 'string' | 'number' | 'date' | 'select' | 'multiSelect';
  options?: { value: unknown; label: string }[];
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
    key: 'actual_hours',
    title: '实际工时',
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
         
        format={(percent) => `${percent}%`}
        strokeColor={{
          '0%': '#108ee9',
          '100%': '#87d068',
        }}
      />
    )
  }
];

const AllFieldsTaskListPage: React.FC = () => {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  
  // 数据状态
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  
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
    status: [] as string[],
    project_id: undefined as number | undefined,
    assignee_id: undefined as number | undefined,
    due_date_range: null as [dayjs.Dayjs, dayjs.Dayjs] | null,
  });
  
  // 列配置状态
  const [columnConfigs, setColumnConfigs] = useState<ColumnConfig[]>([]);
  const [customFields] = useState<CustomFieldConfig[]>(DEFAULT_CUSTOM_FIELDS);
  const [guideVisible, setGuideVisible] = useState(false);
  
  // 高级筛选器状态
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilter[]>([]);
  const [advancedFilterVisible, setAdvancedFilterVisible] = useState(false);
  const [filterForm] = Form.useForm();
  
  // 移除了WebSocket实时更新功能
  const [notificationSettings, setNotificationSettings] = useState({
    showCreateNotifications: true,
    showUpdateNotifications: true,
    showDeleteNotifications: true,
    autoRefreshInterval: 30000, // 30秒
  });
  
  // 筛选器字段选项配置
  const filterFieldOptions: FilterFieldOption[] = useMemo(() => [
    { value: 'title', label: '任务标题', dataType: 'string' },
    { value: 'status', label: '状态', dataType: 'select', options: [
      { value: 'todo', label: '待开始' },
      { value: 'in_progress', label: '进行中' },
      { value: 'completed', label: '已完成' },
      { value: 'cancelled', label: '已取消' }
    ]},
    { value: 'project_name', label: '所属项目', dataType: 'string' },
    { value: 'assignee_name', label: '负责人', dataType: 'string' },
    { value: 'due_date', label: '截止时间', dataType: 'date' },
    { value: 'created_at', label: '创建时间', dataType: 'date' },
    { value: 'updated_at', label: '更新时间', dataType: 'date' },
    { value: 'priority', label: '优先级', dataType: 'select', options: [
      { value: 'high', label: '高' },
      { value: 'medium', label: '中' },
      { value: 'low', label: '低' },
      { value: 'urgent', label: '紧急' }
    ]},
    { value: 'estimated_hours', label: '预估工时', dataType: 'number' },
    { value: 'actual_hours', label: '实际工时', dataType: 'number' },
    { value: 'progress', label: '进度', dataType: 'number' },
  ], []);
  
  // 筛选器操作符选项
  const getOperatorOptions = (dataType: string) => {
    switch (dataType) {
      case 'string':
        return [
          { value: 'contains', label: '包含' },
          { value: 'equals', label: '等于' },
          { value: 'startsWith', label: '开始于' },
          { value: 'endsWith', label: '结束于' },
          { value: 'notContains', label: '不包含' },
          { value: 'notEquals', label: '不等于' }
        ];
      case 'number':
        return [
          { value: 'equals', label: '等于' },
          { value: 'notEquals', label: '不等于' },
          { value: 'greater', label: '大于' },
          { value: 'greaterOrEqual', label: '大于等于' },
          { value: 'less', label: '小于' },
          { value: 'lessOrEqual', label: '小于等于' }
        ];
      case 'date':
        return [
          { value: 'equals', label: '等于' },
          { value: 'before', label: '早于' },
          { value: 'after', label: '晚于' },
          { value: 'between', label: '介于' }
        ];
      case 'select':
      case 'multiSelect':
        return [
          { value: 'equals', label: '等于' },
          { value: 'notEquals', label: '不等于' },
          { value: 'in', label: '包含在' },
          { value: 'notIn', label: '不包含在' }
        ];
      default:
        return [{ value: 'equals', label: '等于' }];
    }
  };
  
  // 拖拽约束：只有中间的动态列和自定义字段列可以拖拽
  const isDraggableColumn = useCallback((columnKey: string) => {
    // 左侧固定列：不可拖拽
    const leftFixedKeys = ['selection', 'id', 'title', 'status'];
    
    // 右侧固定列：不可拖拽
    const rightFixedKeys = ['actions'];
    
    // 只有不在固定列中的列才可以拖拽
    return !leftFixedKeys.includes(columnKey) && !rightFixedKeys.includes(columnKey);
  }, []);

  // Note: Drag sensors temporarily disabled - 等待@dnd-kit依赖安装后启用

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
          await TaskService.deleteTask(task.project_id, task.id);
          message.success('任务删除成功');
          loadData();
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  }, []);

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

  // 更新分层任务数据
  useEffect(() => {
    const hierarchical = processHierarchicalTasks(tasks);
    setHierarchicalTasks(hierarchical);
  }, [tasks, processHierarchicalTasks]);

  // 初始化列配置
  const initializeColumns = useCallback(() => {
    // 尝试从本地存储加载配置
    let savedConfigs: ColumnConfig[] | null = null;
    try {
      const saved = localStorage.getItem('allFieldsTaskList_columnConfigs');
      savedConfigs = saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.warn('Failed to load column configs from localStorage:', error);
    }
    
    if (savedConfigs && savedConfigs.length > 0) {
      setColumnConfigs(savedConfigs);
      return;
    }
    
    // 默认列配置
    const fixedColumns: ColumnConfig[] = [
      {
        key: 'id',
        title: 'ID',
        dataIndex: 'id',
        width: 80,
        fixed: 'left',
        visible: true,
        sortable: true,
        resizable: false,
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
        key: 'project_name',
        title: '所属项目',
        dataIndex: 'project_name',
        width: 150,
        visible: true,
        sortable: true,
        resizable: true,
      },
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
      },
      {
        key: 'parent_title',
        title: '父任务',
        dataIndex: 'parent_title',
        width: 200,
        visible: false,
        sortable: false,
        resizable: true,
      },
      {
        key: 'children_count',
        title: '子任务数',
        dataIndex: 'children_count',
        width: 100,
        visible: false,
        sortable: true,
        resizable: false,
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

    // 分离左侧固定列和右侧操作列
    const leftFixedColumns = fixedColumns.filter(col => col.key !== 'actions');
    const rightFixedColumns = fixedColumns.filter(col => col.key === 'actions');
    
    // 正确的列顺序：左侧固定 + 中间可移动(动态+自定义) + 右侧固定操作
    // 这确保了操作列始终在最右侧，自定义字段在中间可以拖拽排序
    const defaultConfigs = [...leftFixedColumns, ...dynamicColumns, ...customFieldColumns, ...rightFixedColumns];
    setColumnConfigs(defaultConfigs);
    
    // 保存默认配置到本地存储
    try {
      localStorage.setItem('allFieldsTaskList_columnConfigs', JSON.stringify(defaultConfigs));
    } catch (error) {
      console.warn('Failed to save column configs to localStorage:', error);
    }
  }, [customFields]);

  // 获取用于表格显示的扁平化任务数据
  const displayTasks = useMemo(() => {
    return flattenTasksForTable(hierarchicalTasks);
  }, [hierarchicalTasks, flattenTasksForTable]);

  // 生成表格列定义
  const generateTableColumns = useMemo(() => {
    const visibleColumns = columnConfigs.filter(config => config.visible);
    
    return visibleColumns.map(config => {
      const baseColumn: unknown = {
        key: config.key,
        title: config.title,
        dataIndex: config.dataIndex,
        width: config.width,
        fixed: config.fixed,
        sorter: config.sortable,
      };

      // 特殊列的渲染
      switch (config.key) {
        case 'id':
          return {
            ...(baseColumn as any),
            render: (id: number) => (
              <Text strong style={{ color: '#1890ff' }}>#{id}</Text>
            ),
          };

        case 'title':
          return {
            ...(baseColumn as any),
            render: (title: string, record: any) => {
              const hasChildren = record.hasChildren || false;
              const isExpanded = record.isExpanded || false;
              const level = record.level || 0;
              
              return (
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px',
                    paddingLeft: level * 24 // 根据层级缩进
                  }}
                >
                  {/* 展开/折叠按钮 */}
                  {hasChildren ? (
                    <Button
                      type="text"
                      
                      icon={isExpanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTaskExpansion(record.id);
                      }}
                      style={{ 
                        width: 20, 
                        height: 20, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        minWidth: 20
                      }}
                    />
                  ) : (
                    <div style={{ width: 20, height: 20, minWidth: 20 }} />
                  )}
                  
                  {/* 层级指示器 */}
                  {level > 0 && (
                    <BranchesOutlined style={{ color: '#8c8c8c', fontSize: '12px' }} />
                  )}
                  
                  {/* 任务标题 */}
                  <Button
                    type="link"
                    style={{ 
                      padding: 0, 
                      height: 'auto', 
                      textAlign: 'left',
                      fontWeight: level === 0 ? 600 : 400,
                      fontSize: level === 0 ? '14px' : '13px'
                    }}
                    onClick={() => navigate(`/projects/${record.project_id}/tasks/${record.id}`)}
                  >
                    {title}
                  </Button>
                  
                  {/* 子任务数量标识 */}
                  {hasChildren && (
                    <Tag 
                      color="blue" 
                      style={{ 
                        fontSize: '11px',
                        marginLeft: '8px',
                        lineHeight: '16px'
                      }}
                    >
                      {record.children?.length || 0} 子任务
                    </Tag>
                  )}
                </div>
              );
            },
          };

        case 'status':
          return {
            ...(baseColumn as any),
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

        case 'project_name':
          return {
            ...(baseColumn as any),
            render: (projectName: string, record: Task) => (
              <Button
                type="link"
                
                style={{ padding: 0 }}
                onClick={() => navigate(`/projects/${record.project_id}`)}
              >
                <ProjectOutlined style={{ marginRight: '4px' }} />
                {projectName || `项目${record.project_id}`}
              </Button>
            ),
          };

        case 'assignee_name':
          return {
            ...(baseColumn as any),
            render: (assigneeName: string, record: Task) => (
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
            ...(baseColumn as any),
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
            ...(baseColumn as any),
            render: (dateTime: string) => (
              <Text style={{ fontSize: '12px' }}>
                {dayjs(dateTime).format('MM-DD HH:mm')}
              </Text>
            ),
          };

        case 'parent_title':
          return {
            ...(baseColumn as any),
            render: (parentTitle: string, record: Task) => (
              parentTitle ? (
                <Button
                  type="link"
                  
                  style={{ padding: 0 }}
                  onClick={() => navigate(`/projects/${record.project_id}/tasks/${record.parent_id}`)}
                >
                  {parentTitle}
                </Button>
              ) : (
                <Text type="secondary">-</Text>
              )
            ),
          };

        case 'children_count':
          return {
            ...(baseColumn as any),
            render: (count: number) => (
              count > 0 ? (
                <Badge count={count} color="#52c41a" />
              ) : (
                <Text type="secondary">-</Text>
              )
            ),
          };

        case 'actions':
          return {
            ...(baseColumn as any),
            fixed: 'right', // 确保操作列固定在右侧
            width: 120, // 固定宽度
            render: (_: unknown, record: Task) => (
              <Space >
                <Tooltip title="查看详情">
                  <Button
                    type="text"
                    
                    icon={<EyeOutlined />}
                    onClick={() => navigate(`/projects/${record.project_id}/tasks/${record.id}`)}
                  />
                </Tooltip>
                <Tooltip title="编辑">
                  <Button
                    type="text"
                    
                    icon={<EditOutlined />}
                    onClick={() => navigate(`/projects/${record.project_id}/tasks/${record.id}/edit`)}
                  />
                </Tooltip>
                <Tooltip title="删除">
                  <Button
                    type="text"
                    
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
              ...(baseColumn as any),
              render: (value: any, record: Task) => {
                if (fieldConfig?.render) {
                  return fieldConfig.render(value, record);
                }
                return (value as React.ReactNode) ?? <Text type="secondary">-</Text>;
              },
            };
          }
          
          return baseColumn;
      }
    });
  }, [columnConfigs, customFields, navigate, handleDeleteTask]);

  // 加载数据
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [tasksResponse, projectsResponse] = await Promise.allSettled([
        TaskService.getTasks(projectIdNum, {
          page: pagination.current,
          page_size: pagination.pageSize,
          search: filters.search || undefined,
          status: filters.status.length > 0 ? filters.status.join(',') as any : undefined,
          assignee_id: filters.assignee_id,
          due_after: filters.due_date_range?.[0]?.format('YYYY-MM-DD'),
          due_before: filters.due_date_range?.[1]?.format('YYYY-MM-DD'),
        }),
        projectService.getProject(projectIdNum)
      ]);

      if (tasksResponse.status === 'fulfilled') {
        let taskData = tasksResponse.value.data || [];
        
        // 前端项目筛选
        if (filters.project_id) {
          taskData = taskData.filter(task => task.project_id === filters.project_id);
        }
        
        // 应用高级筛选器
        if (advancedFilters.length > 0) {
          taskData = taskData.filter((task: Task) => matchesAdvancedFilters(task));
        }
        
        setTasks(taskData);
        setPagination(prev => ({
          ...prev,
          total: taskData.length,
        }));
      }

      if (projectsResponse.status === 'fulfilled') {
        // 设置当前项目信息
        const currentProject = projectsResponse.value;
        setProjects(currentProject ? [currentProject] : []);
      }
    } catch (error) {
      message.error('加载数据失败');
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.current, pagination.pageSize, advancedFilters, projectId]);

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的任务');
      return;
    }

    Modal.confirm({
      title: '批量删除确认',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个任务吗？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await Promise.all(
            selectedRowKeys.map(async (taskId) => {
              const task = tasks.find(t => t.id === taskId);
              if (task) {
                await TaskService.deleteTask(task.project_id, task.id);
              }
            })
          );
          message.success('批量删除成功');
          setSelectedRowKeys([]);
          loadData();
        } catch (error) {
          message.error('批量删除失败');
        }
      },
    });
  };

  // 列显示控制
  const handleColumnVisibilityChange = (columnKey: string, visible: boolean) => {
    setColumnConfigs(prev => {
      const newConfigs = prev.map(col => 
        col.key === columnKey ? { ...col, visible } : col
      );
      
      // 保存到本地存储
      saveColumnConfigsToStorage(newConfigs);
      return newConfigs;
    });
  };
  
  // 重置列配置
  const handleResetColumns = () => {
    try {
      localStorage.removeItem('allFieldsTaskList_columnConfigs');
      initializeColumns();
      message.success('列配置已重置');
    } catch (error) {
      message.error('重置失败');
    }
  };

  // 保存列配置到本地存储
  const saveColumnConfigsToStorage = useCallback((configs: ColumnConfig[]) => {
    try {
      localStorage.setItem('allFieldsTaskList_columnConfigs', JSON.stringify(configs));
    } catch (error) {
      console.warn('Failed to save column configs to localStorage:', error);
    }
  }, []);

  // 高级筛选器处理函数
  const addAdvancedFilter = () => {
    const newFilter: AdvancedFilter = {
      id: `filter_${Date.now()}`,
      field: '',
      operator: '',
      value: '',
      logicalOperator: advancedFilters.length > 0 ? 'AND' : undefined
    };
    setAdvancedFilters([...advancedFilters, newFilter]);
  };

  const removeAdvancedFilter = (filterId: string) => {
    setAdvancedFilters(prev => prev.filter(f => f.id !== filterId));
  };

  const updateAdvancedFilter = (filterId: string, updates: Partial<AdvancedFilter>) => {
    setAdvancedFilters(prev => 
      prev.map(f => f.id === filterId ? { ...f, ...updates } : f)
    );
  };

  const clearAdvancedFilters = () => {
    setAdvancedFilters([]);
    setAdvancedFilterVisible(false);
  };

  const applyAdvancedFilters = () => {
    // 这里可以扩展为更复杂的筛选逻辑
    // 目前先关闭面板，实际筛选逻辑在loadData中处理
    setAdvancedFilterVisible(false);
    loadData();
    message.success(`已应用 ${advancedFilters.length} 个高级筛选条件`);
  };

  // 检查任务是否符合高级筛选条件
  const matchesAdvancedFilters = useCallback((task: Task) => {
    if (advancedFilters.length === 0) return true;

    // 简化的筛选逻辑 - 这里可以根据需要扩展
    return advancedFilters.every((filter) => {
      if (!filter.field || !filter.operator) return true;

      const fieldValue = getTaskFieldValue(task, filter.field);
      return matchesFilterCondition(fieldValue, filter.operator, filter.value);
    });
  }, [advancedFilters]);

  const getTaskFieldValue = (task: Task, field: string) => {
    if (field.startsWith('custom_')) {
      const customKey = field.replace('custom_', '');
      return task.custom_fields?.[customKey];
    }
    return (task as unknown)[field];
  };

const matchesFilterCondition = (fieldValue: unknown, operator: string, filterValue: unknown) => {
    if (fieldValue == null || filterValue == null) return false;

    switch (operator) {
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(filterValue).toLowerCase());
      case 'equals':
        return fieldValue === filterValue;
      case 'notEquals':
        return fieldValue !== filterValue;
      case 'startsWith':
        return String(fieldValue).toLowerCase().startsWith(String(filterValue).toLowerCase());
      case 'endsWith':
        return String(fieldValue).toLowerCase().endsWith(String(filterValue).toLowerCase());
      case 'notContains':
        return !String(fieldValue).toLowerCase().includes(String(filterValue).toLowerCase());
      case 'greater':
        return Number(fieldValue) > Number(filterValue);
      case 'greaterOrEqual':
        return Number(fieldValue) >= Number(filterValue);
      case 'less':
        return Number(fieldValue) < Number(filterValue);
      case 'lessOrEqual':
        return Number(fieldValue) <= Number(filterValue);
      case 'before':
        return dayjs(fieldValue as any).isBefore(dayjs(filterValue as any));
      case 'after':
        return dayjs(fieldValue as any).isAfter(dayjs(filterValue as any));
      case 'in':
        return Array.isArray(filterValue) ? filterValue.includes(fieldValue as any) : fieldValue === filterValue;
      case 'notIn':
        return Array.isArray(filterValue) ? !filterValue.includes(fieldValue as any) : fieldValue !== filterValue;
      default:
        return true;
    }
  };

  // 移除了WebSocket连接管理功能

  // 移除了WebSocket消息处理和实时更新功能

  // Note: Drag end handler temporarily disabled

  // 导出功能
  const handleExport = () => {
    const headers = columnConfigs
      .filter(col => col.visible && col.key !== 'actions')
      .map(col => col.title);
    
    const rows = tasks.map(task => 
      columnConfigs
        .filter(col => col.visible && col.key !== 'actions')
        .map(col => {
          if (col.key === 'id') return task.id;
          if (col.key === 'title') return task.title;
          if (col.key === 'status') return task.status;
          if (col.key === 'project_name') return task.project_name || `项目${task.project_id}`;
          if (col.key === 'assignee_name') return task.assignee_name || '';
          if (col.key === 'due_date') return task.due_date || '';
          if (col.key === 'created_at') return dayjs(task.created_at).format('YYYY-MM-DD HH:mm');
          if (col.key === 'updated_at') return dayjs(task.updated_at).format('YYYY-MM-DD HH:mm');
          if (col.customField) {
            const fieldKey = col.key.replace('custom_', '');
            const value = task.custom_fields?.[fieldKey];
            return Array.isArray(value) ? value.join(', ') : value || '';
          }
          return '';
        })
    );

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `tasks_${dayjs().format('YYYY-MM-DD')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    message.success('导出成功');
  };

  // 列设置菜单
  const getColumnSettingsMenu = (): MenuProps => ({
    items: [
      {
        key: 'info',
        label: (
          <div style={{ 
            padding: '8px 0', 
            borderBottom: '1px solid #f0f0f0', 
            marginBottom: '8px',
            fontSize: '12px',
            color: '#666'
          }}>
            <div>💡 列布局说明：</div>
            <div>• 左侧：ID、标题、状态（固定不可移动）</div>
            <div>• 中间：项目、自定义字段（可拖拽排序）</div>
            <div>• 右侧：操作按钮（固定不可移动）</div>
          </div>
        ),
        disabled: true,
      },
      ...columnConfigs
        .filter(col => col.key !== 'actions')
        .map(column => ({
          key: column.key,
          label: (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: '200px' }}>
              <Checkbox
                checked={column.visible}
                onChange={(e) => handleColumnVisibilityChange(column.key, e.target.checked)}
              >
                {column.title}
              </Checkbox>
              <Space>
                {column.customField && (
                  <Tag color="blue" style={{ fontSize: '11px', padding: '2px 6px' }}>自定义</Tag>
                )}
                {column.fixed && (
                  <Tag color="orange" style={{ fontSize: '11px', padding: '2px 6px' }}>固定</Tag>
                )}
                {isDraggableColumn(column.key) && (
                  <Tag color="green" style={{ fontSize: '11px', padding: '2px 6px' }}>可移动</Tag>
                )}
              </Space>
            </div>
          ),
        })),
      {
        type: 'divider',
        key: 'divider'
      },
      {
        key: 'reset',
        label: (
          <Button 
            type="text" 
            danger 
             
            onClick={handleResetColumns}
            style={{ width: '100%', textAlign: 'left' }}
          >
            重置列配置
          </Button>
        ),
      },
      {
        key: 'selectAll',
        label: (
          <Button 
            type="text" 
             
            onClick={() => {
              setColumnConfigs(prev => {
                const newConfigs = prev.map(col => ({ ...col, visible: true }));
                saveColumnConfigsToStorage(newConfigs);
                return newConfigs;
              });
            }}
            style={{ width: '100%', textAlign: 'left' }}
          >
            显示所有列
          </Button>
        ),
      },
      {
        key: 'selectNone',
        label: (
          <Button 
            type="text" 
             
            onClick={() => {
              setColumnConfigs(prev => {
                const newConfigs = prev.map(col => 
                  col.fixed ? col : { ...col, visible: false }
                );
                saveColumnConfigsToStorage(newConfigs);
                return newConfigs;
              });
            }}
            style={{ width: '100%', textAlign: 'left' }}
          >
            隐藏可选列
          </Button>
        ),
      }
    ],
  });

  useEffect(() => {
    initializeColumns();
  }, [initializeColumns]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 移除了WebSocket连接管理的useEffect

  // 自动刷新定时器
  useEffect(() => {
    if (notificationSettings.autoRefreshInterval > 0) {
      const interval = setInterval(() => {
        loadData();
      }, notificationSettings.autoRefreshInterval);

      return () => clearInterval(interval);
    }
  }, [notificationSettings.autoRefreshInterval, loadData]);

  // 移除了WebSocket设置加载

  // 强制要求项目ID - 全字段页面只支持项目内任务
  if (!projectId) {
    navigate('/projects');
    return null;
  }

  const projectIdNum = parseInt(projectId, 10);

  // 行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  return (
    <div className="all-fields-task-list">
      {/* 页面标题和操作栏 */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <Title level={2} style={{ margin: 0 }}>
            {projects[0]?.name || `项目${projectIdNum}`} - 全字段任务列表
          </Title>
          <Space>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={loadData}
              loading={loading}
            >
              刷新
            </Button>
            <Button 
              icon={<DownloadOutlined />} 
              onClick={handleExport}
            >
              导出
            </Button>
            <Dropdown menu={getColumnSettingsMenu()} trigger={['click']}>
              <Button icon={<SettingOutlined />}>
                列设置
              </Button>
            </Dropdown>
            <Button 
              icon={<QuestionCircleOutlined />}
              onClick={() => setGuideVisible(true)}
            >
              使用指南
            </Button>
            <Space.Compact>
              {/* 移除了WebSocket实时更新按钮 */}
            </Space.Compact>
            {/* 移除了最后更新时间显示 */}
            <Text type="secondary" style={{ fontSize: '12px' }}>
              💡 点击列头进行排序
            </Text>
          </Space>
        </div>

        {/* 过滤器 */}
        <Card  className="filters-card">
          <Space wrap>
            <Input
              placeholder="搜索任务标题"
              prefix={<SearchOutlined />}
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              style={{ width: 200 }}
              allowClear
            />
            <Select
              mode="multiple"
              placeholder="筛选状态"
              value={filters.status}
              onChange={(status) => setFilters(prev => ({ ...prev, status }))}
              style={{ width: 200 }}
              allowClear
            >
              <Option value="todo">待开始</Option>
              <Option value="in_progress">进行中</Option>
              <Option value="completed">已完成</Option>
              <Option value="cancelled">已取消</Option>
            </Select>
            <Select
              placeholder="筛选项目"
              value={filters.project_id}
              onChange={(project_id) => setFilters(prev => ({ ...prev, project_id }))}
              style={{ width: 200 }}
              allowClear
            >
              {projects.map(project => (
                <Option key={project.id} value={project.id}>
                  {project.name}
                </Option>
              ))}
            </Select>
            <RangePicker
              placeholder={['开始日期', '结束日期']}
              value={filters.due_date_range}
              onChange={(dates) => setFilters(prev => ({ ...prev, due_date_range: dates as [dayjs.Dayjs, dayjs.Dayjs] | null }))}
            />
            <Button 
              icon={<FilterOutlined />}
              onClick={loadData}
            >
              应用筛选
            </Button>
            <Button 
              icon={<FilterFilled />}
              type={advancedFilters.length > 0 ? "primary" : "default"}
              onClick={() => setAdvancedFilterVisible(true)}
            >
              高级筛选 {advancedFilters.length > 0 && `(${advancedFilters.length})`}
            </Button>
          </Space>
        </Card>

        {/* 批量操作 */}
        {selectedRowKeys.length > 0 && (
          <Card  className="batch-actions-card">
            <Space>
              <Text>已选择 {selectedRowKeys.length} 项</Text>
              <Button 
                 
                danger 
                onClick={handleBatchDelete}
              >
                批量删除
              </Button>
              <Button 
                 
                onClick={() => setSelectedRowKeys([])}
              >
                取消选择
              </Button>
            </Space>
          </Card>
        )}
      </div>

      {/* 移除了WebSocket连接状态提示 */}

      {/* 表格 */}
      <Card>
        <div className="all-fields-table">
          <style>
            {`
              .task-level-0 {
                background-color: #fafafa;
                font-weight: 600;
              }
              .task-level-1 {
                background-color: #f5f5f5;
              }
              .task-level-2 {
                background-color: #f0f0f0;
              }
              .task-level-3 {
                background-color: #ebebeb;
              }
              .task-child {
                border-left: 2px solid #e6f7ff;
              }
              .task-has-children {
                font-weight: 500;
              }
              .ant-table-tbody > tr.task-child:hover {
                background-color: #e6f7ff !important;
              }
              .ant-table-tbody > tr.task-level-0:hover {
                background-color: #f0f9ff !important;
              }
              .ant-table-thead th[data-column-key="actions"] {
                position: sticky !important;
                right: 0 !important;
                z-index: 2 !important;
                background: white !important;
                box-shadow: -2px 0 4px rgba(0,0,0,0.1) !important;
              }
              .ant-table-tbody td[data-column-key="actions"] {
                position: sticky !important;
                right: 0 !important;
                z-index: 1 !important;
                background: inherit !important;
                box-shadow: -2px 0 4px rgba(0,0,0,0.1) !important;
              }
            `}
          </style>
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
            loading={loading}
            scroll={{ x: 'max-content', y: 600 }}
            rowClassName={(record: any) => {
              const level = record.level || 0;
              const classes = [`task-level-${level}`];
              if (record.hasChildren) {
                classes.push('task-has-children');
              }
              if (level > 0) {
                classes.push('task-child');
              }
              return classes.join(' ');
            }}
            
            bordered
          />
        </div>
      </Card>

      {/* 移除了WebSocket设置模态框 */}

      {/* 高级筛选器模态框 */}
      <Modal
        title={
          <Space>
            <FilterFilled />
            高级筛选器
          </Space>
        }
        open={advancedFilterVisible}
        onCancel={() => setAdvancedFilterVisible(false)}
        footer={
          <Space>
            <Button onClick={() => setAdvancedFilterVisible(false)}>
              取消
            </Button>
            <Button onClick={clearAdvancedFilters}>
              <ClearOutlined />
              清空
            </Button>
            <Button type="primary" onClick={applyAdvancedFilters}>
              应用筛选
            </Button>
          </Space>
        }
        width={800}
        destroyOnHidden
      >
        <div style={{ marginBottom: '16px' }}>
          <Button 
            type="dashed" 
            icon={<PlusOutlined />}
            onClick={addAdvancedFilter}
            block
          >
            添加筛选条件
          </Button>
        </div>

        {advancedFilters.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            <FilterOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
            <div>暂无筛选条件，点击上方按钮添加</div>
          </div>
        ) : (
          <div>
            {advancedFilters.map((filter, index) => {
              const selectedField = filterFieldOptions.find(f => f.value === filter.field);
              const operatorOptions = selectedField ? getOperatorOptions(selectedField.dataType) : [];
              
              return (
                <Card 
                  key={filter.id} 
                   
                  style={{ marginBottom: '12px' }}
                  title={
                    <Space>
                      {index > 0 && (
                        <Select
                          value={filter.logicalOperator}
                          onChange={(value) => updateAdvancedFilter(filter.id, { logicalOperator: value })}
                          style={{ width: 80 }}
                          
                        >
                          <Option value="AND">且</Option>
                          <Option value="OR">或</Option>
                        </Select>
                      )}
                      <span>筛选条件 {index + 1}</span>
                    </Space>
                  }
                  extra={
                    <Button 
                      type="text" 
                      danger 
                      
                      icon={<MinusCircleOutlined />}
                      onClick={() => removeAdvancedFilter(filter.id)}
                    />
                  }
                >
                  <Space.Compact style={{ display: 'flex', gap: '8px' }}>
                    <Select
                      placeholder="选择字段"
                      value={filter.field}
                      onChange={(value) => updateAdvancedFilter(filter.id, { field: value, operator: '', value: '' })}
                      style={{ flex: 1 }}
                    >
                      {filterFieldOptions.map(option => (
                        <Option key={option.value} value={option.value}>
                          {option.label}
                        </Option>
                      ))}
                    </Select>
                    
                    <Select
                      placeholder="选择操作符"
                      value={filter.operator}
                      onChange={(value) => updateAdvancedFilter(filter.id, { operator: value, value: '' })}
                      style={{ flex: 1 }}
                      disabled={!filter.field}
                    >
                      {operatorOptions.map(option => (
                        <Option key={option.value} value={option.value}>
                          {option.label}
                        </Option>
                      ))}
                    </Select>
                    
                    <div style={{ flex: 1 }}>
                      {selectedField?.dataType === 'select' && selectedField.options ? (
                        <Select
                          placeholder="选择值"
                          value={filter.value}
                          onChange={(value) => updateAdvancedFilter(filter.id, { value })}
                          style={{ width: '100%' }}
                          disabled={!filter.operator}
                        >
                          {selectedField.options.map(option => (
                            <Option key={String(option.value)} value={option.value as any}>
                              {option.label}
                            </Option>
                          ))}
                        </Select>
                      ) : selectedField?.dataType === 'date' ? (
                        <DatePicker
                          placeholder="选择日期"
                          value={filter.value ? dayjs(filter.value as any) : null}
                          onChange={(date) => updateAdvancedFilter(filter.id, { value: date?.format('YYYY-MM-DD') })}
                          style={{ width: '100%' }}
                          disabled={!filter.operator}
                        />
                      ) : selectedField?.dataType === 'number' ? (
                        <Input
                          type="number"
                          placeholder="输入数值"
                          value={filter.value as any}
                          onChange={(e) => updateAdvancedFilter(filter.id, { value: e.target.value })}
                          disabled={!filter.operator}
                        />
                      ) : (
                        <Input
                          placeholder="输入值"
                          value={filter.value as any}
                          onChange={(e) => updateAdvancedFilter(filter.id, { value: e.target.value })}
                          disabled={!filter.operator}
                        />
                      )}
                    </div>
                  </Space.Compact>
                </Card>
              );
            })}
          </div>
        )}
        
        {advancedFilters.length > 0 && (
          <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
            <Text strong>筛选预览：</Text>
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
              {advancedFilters.map((filter, index) => {
                const field = filterFieldOptions.find(f => f.value === filter.field);
                const operator = field ? getOperatorOptions(field.dataType).find(op => op.value === filter.operator) : null;
                
                return (
                  <span key={filter.id}>
                    {index > 0 && (
                      <Tag color={filter.logicalOperator === 'AND' ? 'blue' : 'orange'} style={{ margin: '0 4px' }}>
                        {filter.logicalOperator === 'AND' ? '且' : '或'}
                      </Tag>
                    )}
                    <Tag color="green">{field?.label || '?'}</Tag>
                    <Tag>{operator?.label || '?'}</Tag>
                    <Tag color="purple">{String(filter.value ?? '?')}</Tag>
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </Modal>

      {/* 使用指南 */}
      <AllFieldsTableGuide 
        visible={guideVisible}
        onClose={() => setGuideVisible(false)}
      />
    </div>
  );
};

export default AllFieldsTaskListPage;
