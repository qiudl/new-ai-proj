/**
 * 项目任务列表组件 - 参考 AllFieldsTaskListPage 设计
 * 用于项目详情页的任务管理
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table,
  Card,
  Button,
  Space,
  Dropdown,
  Menu,
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
  Popover,
  Empty,
  Spin,
  Row,
  Col
} from 'antd';
import type { ColumnsType, TableProps } from 'antd/es/table';
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
  UserOutlined,
  CalendarOutlined,
  ProjectOutlined,
  BranchesOutlined,
  CaretRightOutlined,
  CaretDownOutlined,
  PlusOutlined,
  MoreOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  FilterFilled,
  ClearOutlined,
  NodeIndexOutlined,
  DownOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { TaskService } from '../services/taskService';
import { Task } from '../types/task';
import TimerStartButton from './TimerStartButton';
import TaskDocumentWidget from './TaskDocumentWidget';
import BatchOperationPreview from './BatchOperationPreview';
import { useTimer } from '../contexts/TimerContext';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { Search } = Input;

// 扩展Task接口以支持层级显示
interface HierarchicalTask extends Task {
  children?: HierarchicalTask[];
  level?: number;
  hasChildren?: boolean;
  isExpanded?: boolean;
}

interface ProjectTaskListProps {
  projectId: number;
  style?: React.CSSProperties;
}

const ProjectTaskList: React.FC<ProjectTaskListProps> = ({ projectId, style }) => {
  const navigate = useNavigate();
  const { timerState } = useTimer();
  
  // 数据状态
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<number>>(new Set());
  
  // 筛选和搜索状态
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [assigneeFilter, setAssigneeFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  
  // UI状态
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'hierarchy'>('hierarchy');
  const [showBatchParentModal, setShowBatchParentModal] = useState(false);
  const [batchParentLoading, setBatchParentLoading] = useState(false);
  
  // 批量更改父任务的增强状态
  const [selectedParentTask, setSelectedParentTask] = useState<Task | null>(null);
  const [batchPreviewData, setBatchPreviewData] = useState<{
    selectedTasks: Task[];
    warnings: string[];
    validationResult?: {
      valid: boolean;
      errors: string[];
      warnings: string[];
    };
  } | null>(null);
  const [batchPreviewLoading, setBatchPreviewLoading] = useState(false);
  const [batchPreviewError, setBatchPreviewError] = useState<string | null>(null);
  
  // 分页状态
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total: number, range: [number, number]) => 
      `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
  });

  // 加载任务数据
  const loadTasks = useCallback(async (params: unknown = {}) => {
    try {
      setLoading(true);
      const response = await TaskService.getTasks(projectId, {
        page: pagination.current,
        page_size: pagination.pageSize,
        search: searchText,
        status: statusFilter.length > 0 ? statusFilter : undefined,
        priority: priorityFilter.length > 0 ? priorityFilter : undefined,
        assignee: assigneeFilter.length > 0 ? assigneeFilter : undefined,
        start_date: dateRange?.[0]?.format('YYYY-MM-DD'),
        end_date: dateRange?.[1]?.format('YYYY-MM-DD'),
        ...params
      });
      
      if (response?.data && Array.isArray(response.data)) {
        setTasks(response.data);
        setPagination(prev => ({
          ...prev,
          total: response.pagination?.total || response.data.length
        }));
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      message.error('加载任务列表失败');
    } finally {
      setLoading(false);
    }
  }, [projectId, pagination.current, pagination.pageSize, searchText, statusFilter, priorityFilter, assigneeFilter, dateRange]);

  // 初始加载
  useEffect(() => {
    loadTasks();
  }, []);

  // 构建层级任务数据
  const hierarchicalTasks = useMemo(() => {
    const taskMap = new Map<number, HierarchicalTask>();
    const rootTasks: HierarchicalTask[] = [];
    
    // 先将所有任务放入map中
    tasks.forEach(task => {
      taskMap.set(task.id, { ...task, children: [], level: 0, hasChildren: false, isExpanded: false });
    });
    
    // 构建层级关系
    tasks.forEach(task => {
      const taskWithLevel = taskMap.get(task.id)!;
      if (task.parent_id && taskMap.has(task.parent_id)) {
        const parent = taskMap.get(task.parent_id)!;
        parent.children!.push(taskWithLevel);
        parent.hasChildren = true;
        taskWithLevel.level = (parent.level || 0) + 1;
      } else {
        rootTasks.push(taskWithLevel);
      }
    });
    
    // 设置展开状态：如果expandedTaskIds为空，默认展开所有有子任务的节点
    taskMap.forEach((task, taskId) => {
      if (task.hasChildren) {
        if (expandedTaskIds.size === 0) {
          // 初始状态：默认展开所有父任务
          task.isExpanded = true;
        } else {
          // 用户已经有操作：根据expandedTaskIds决定
          task.isExpanded = expandedTaskIds.has(taskId);
        }
      }
    });
    
    return rootTasks;
  }, [tasks, expandedTaskIds]);

  // 展开任务列表用于表格显示
  const flattenedTasks = useMemo(() => {
    const flatten = (tasks: HierarchicalTask[], level = 0): HierarchicalTask[] => {
      const result: HierarchicalTask[] = [];
      
      tasks.forEach(task => {
        result.push({ ...task, level });
        if (task.children && task.isExpanded) {
          result.push(...flatten(task.children, level + 1));
        }
      });
      
      return result;
    };
    
    return viewMode === 'hierarchy' ? flatten(hierarchicalTasks) : tasks.map(task => ({ ...task, level: 0 }));
  }, [hierarchicalTasks, tasks, viewMode]);

  // 切换任务展开状态
  const toggleTaskExpansion = (taskId: number) => {
    setExpandedTaskIds(prev => {
      const newSet = new Set(prev);
      
      // 如果这是首次操作（expandedTaskIds为空），先初始化所有父任务为展开状态
      if (prev.size === 0) {
        // 找到所有有子任务的父任务ID，并将它们设为展开状态
        tasks.forEach(task => {
          const hasChildren = tasks.some(t => t.parent_id === task.id);
          if (hasChildren) {
            newSet.add(task.id);
          }
        });
      }
      
      // 然后处理当前点击的任务
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      
      return newSet;
    });
  };

  // 获取状态颜色和文本
  const getTaskStatusConfig = (status: string) => {
    const configs = {
      'todo': { color: 'default', text: '待开始', icon: <ClockCircleOutlined /> },
      'in_progress': { color: 'processing', text: '进行中', icon: <PlayCircleOutlined /> },
      'completed': { color: 'success', text: '已完成', icon: <CheckCircleOutlined /> },
      'cancelled': { color: 'error', text: '已取消', icon: <ExclamationCircleOutlined /> },
    };
    return configs[status as keyof typeof configs] || configs.todo;
  };

  const getPriorityConfig = (priority: string) => {
    const configs = {
      'high': { color: 'red', text: '高' },
      'medium': { color: 'orange', text: '中' },
      'low': { color: 'green', text: '低' },
    };
    return configs[priority as keyof typeof configs] || configs.medium;
  };

  // 表格列定义
  const columns: unknown[] = [
    {
      title: '任务',
      dataIndex: 'title',
      key: 'title',
      width: 300,
      fixed: 'left',
      render: (text: string, record: HierarchicalTask) => (
        <div style={{ paddingLeft: (record.level || 0) * 20 }}>
          <Space>
            {viewMode === 'hierarchy' && record.hasChildren && (
              <Button
                type="text"
                size="small"
                icon={record.isExpanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
                onClick={() => toggleTaskExpansion(record.id)}
                style={{ padding: 0, width: 16, height: 16 }}
              />
            )}
            <Button
              type="link"
              onClick={() => navigate(`/projects/${projectId}/tasks/${record.id}`)}
              style={{ padding: 0, fontWeight: 500 }}
            >
              {text}
            </Button>
            {record.parent_id && (
              <Tag color="blue">子任务</Tag>
            )}
          </Space>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const config = getTaskStatusConfig(status);
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      },
      filters: [
        { text: '待开始', value: 'todo' },
        { text: '进行中', value: 'in_progress' },
        { text: '已完成', value: 'completed' },
        { text: '已取消', value: 'cancelled' },
      ],
      filteredValue: statusFilter,
      onFilter: (value, record) => record.status === value,
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority: string) => {
        const config = getPriorityConfig(priority);
        return <Tag color={config.color}>{config.text}</Tag>;
      },
      filters: [
        { text: '高', value: 'high' },
        { text: '中', value: 'medium' },
        { text: '低', value: 'low' },
      ],
      filteredValue: priorityFilter,
      onFilter: (value, record) => record.priority === value,
    },
    {
      title: '负责人',
      dataIndex: 'assignee_name',
      key: 'assignee_name',
      width: 120,
      render: (name: string, record: HierarchicalTask) => (
        <Space>
          <Avatar size="small" icon={<UserOutlined />} />
          <Text style={{ fontSize: '12px' }}>{name || '未分配'}</Text>
        </Space>
      ),
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 100,
      render: (progress: number) => (
        <Progress 
          percent={progress || 0} 
          size="small"
          strokeColor={progress === 100 ? '#52c41a' : '#1890ff'}
        />
      ),
    },
    {
      title: '预计工时',
      dataIndex: 'estimated_hours',
      key: 'estimated_hours',
      width: 100,
      render: (hours: number) => hours ? `${hours}h` : '-',
    },
    {
      title: '实际工时',
      dataIndex: 'actual_hours',
      key: 'actual_hours',
      width: 100,
      render: (hours: number) => hours ? `${hours}h` : '-',
    },
    {
      title: '截止日期',
      dataIndex: 'due_date',
      key: 'due_date',
      width: 120,
      render: (date: string) => {
        if (!date) return '-';
        const dueDate = dayjs(date);
        const isOverdue = dueDate.isBefore(dayjs(), 'day');
        const isToday = dueDate.isSame(dayjs(), 'day');
        
        return (
          <Text 
            style={{ 
              color: isOverdue ? '#ff4d4f' : isToday ? '#fa8c16' : undefined,
              fontSize: '12px'
            }}
          >
            {dueDate.format('MM-DD')}
            {isOverdue && <Badge status="error" />}
            {isToday && <Badge status="warning" />}
          </Text>
        );
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_, record: HierarchicalTask) => {
        const canStartTimer = record.status !== 'completed' && record.status !== 'cancelled';
        
        const menuItems: MenuProps['items'] = [
          {
            key: 'view',
            label: '查看详情',
            icon: <EyeOutlined />,
            onClick: () => navigate(`/projects/${projectId}/tasks/${record.id}`)
          },
          {
            key: 'edit',
            label: '编辑任务',
            icon: <EditOutlined />,
            onClick: () => navigate(`/projects/${projectId}/tasks/${record.id}/edit`)
          },
          { type: 'divider' },
          {
            key: 'delete',
            label: '删除任务',
            icon: <DeleteOutlined />,
            danger: true,
            onClick: () => handleDeleteTask(record.id)
          }
        ];

        return (
          <Space size="small">
            {canStartTimer && (
              <TimerStartButton
                task={record}
                size="small"
                type="text"
              />
            )}
            <TaskDocumentWidget
              projectId={projectId}
              taskId={record.id}
              compact={true}
              showTitle={false}
            />
            <Dropdown
              menu={{ items: menuItems }}
              trigger={['click']}
              placement="bottomRight"
            >
              <Button type="text" size="small" icon={<MoreOutlined />} />
            </Dropdown>
          </Space>
        );
      },
    },
  ];

  // 删除任务
  const handleDeleteTask = async (taskId: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个任务吗？此操作不可恢复。',
      okText: '确认',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await TaskService.deleteTask(projectId, taskId);
          message.success('任务删除成功');
          loadTasks();
        } catch (error) {
          message.error('删除任务失败');
        }
      }
    });
  };

  // 准备批量预览数据 - 使用后端API验证
  const prepareBatchPreviewData = useCallback(async (targetParent: Task | null) => {
    const selectedTasks = tasks.filter(task => selectedRowKeys.includes(task.id));
    
    // 基础验证
    if (selectedTasks.length === 0) {
      message.warning('请先选择任务');
      return null;
    }
    
    try {
      // 调用后端API进行全面验证
      const taskIds = selectedRowKeys.map(Number);
      const parentId = targetParent ? targetParent.id : null;
      
      const apiValidationResult = await TaskService.getBatchUpdatePreview(
        projectId,
        taskIds,
        parentId
      );
      
      // 构建本地警告消息（基于API返回的警告）
      const localWarnings: string[] = [...apiValidationResult.warnings];
      
      // 添加一些用户友好的本地警告
      const completedTasks = selectedTasks.filter(task => task.status === 'completed');
      if (completedTasks.length > 0) {
        localWarnings.push(`包含 ${completedTasks.length} 个已完成任务，更改父任务后可能影响项目进度统计`);
      }
      
      // 检查是否有父子关系的任务被同时选中
      const taskIds_set = new Set(selectedRowKeys.map(Number));
      const hasParentChildConflict = selectedTasks.some(task => 
        task.parent_id && taskIds_set.has(task.parent_id)
      );
      
      if (hasParentChildConflict) {
        localWarnings.push('选中的任务中包含父子关系的任务，请检查是否需要调整选择');
      }
      
      return {
        selectedTasks,
        warnings: localWarnings,
        validationResult: {
          valid: apiValidationResult.invalid_tasks.length === 0,
          errors: apiValidationResult.invalid_tasks.map(invalid => 
            `任务#${invalid.task_id}: ${invalid.error}`
          ),
          warnings: localWarnings,
          apiResult: apiValidationResult // 保留完整的API响应用于更详细的展示
        }
      };
    } catch (error) {
      console.error('批量验证API调用失败:', error);
      message.error('验证失败，请稍后重试');
      
      // 降级到基础本地验证作为fallback
      const localWarnings: string[] = [];
      
      // 检查任务状态
      const completedTasks = selectedTasks.filter(task => task.status === 'completed');
      if (completedTasks.length > 0) {
        localWarnings.push(`包含 ${completedTasks.length} 个已完成任务，更改父任务后可能影响项目进度统计`);
      }
      
      // 检查是否有父子关系的任务被同时选中
      const taskIds_set = new Set(selectedRowKeys.map(Number));
      const hasParentChildConflict = selectedTasks.some(task => 
        task.parent_id && taskIds_set.has(task.parent_id)
      );
      
      if (hasParentChildConflict) {
        localWarnings.push('选中的任务中包含父子关系的任务，请检查是否需要调整选择');
      }
      
      localWarnings.push('无法连接到验证服务，部分验证可能不准确');
      
      return {
        selectedTasks,
        warnings: localWarnings,
        validationResult: {
          valid: false,
          errors: ['验证服务暂时不可用，请稍后重试'],
          warnings: localWarnings
        }
      };
    }
  }, [tasks, selectedRowKeys, projectId]);

  // 批量操作
  const handleBatchAction = (action: string) => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择任务');
      return;
    }
    
    switch (action) {
      case 'delete':
        Modal.confirm({
          title: '批量删除',
          content: `确定要删除选中的 ${selectedRowKeys.length} 个任务吗？`,
          okText: '确认',
          cancelText: '取消',
          okType: 'danger',
          onOk: async () => {
            try {
              await Promise.all(selectedRowKeys.map(id => TaskService.deleteTask(projectId, Number(id))));
              message.success('批量删除成功');
              setSelectedRowKeys([]);
              loadTasks();
            } catch (error) {
              message.error('批量删除失败');
            }
          }
        });
        break;
      case 'changeParent':
        // 准备预览数据并打开增强版Modal
        setShowBatchParentModal(true);
        setSelectedParentTask(null);
        setBatchPreviewData(null); // 先清空，显示loading
        setBatchPreviewLoading(true);
        setBatchPreviewError(null);
        
        prepareBatchPreviewData(null).then(previewData => {
          if (previewData) {
            setBatchPreviewData(previewData);
          }
          setBatchPreviewLoading(false);
        }).catch(error => {
          console.error('Failed to prepare batch preview data:', error);
          setBatchPreviewError('准备批量操作预览失败，请稍后重试');
          setBatchPreviewLoading(false);
        });
        break;
      case 'updateStatus':
        Modal.confirm({
          title: '批量更新状态',
          content: (
            <div>
              <p>为选中的 {selectedRowKeys.length} 个任务设置新状态：</p>
              <Select
                placeholder="选择新状态"
                style={{ width: '100%', marginTop: 8 }}
                onChange={(value: string) => {
                  (window as any).batchStatusValue = value;
                }}
                options={[
                  { value: 'todo', label: '待开始' },
                  { value: 'in_progress', label: '进行中' },
                  { value: 'completed', label: '已完成' },
                  { value: 'blocked', label: '已阻塞' }
                ]}
              />
            </div>
          ),
          okText: '确认更新',
          cancelText: '取消',
          onOk: async () => {
            const newStatus = (window as any).batchStatusValue;
            if (!newStatus) {
              message.warning('请选择新状态');
              return;
            }
            try {
              await Promise.all(selectedRowKeys.map(id => 
                TaskService.updateTask(projectId, Number(id), { status: newStatus })
              ));
              message.success('批量更新状态成功');
              setSelectedRowKeys([]);
              loadTasks();
            } catch (error) {
              message.error('批量更新状态失败');
            }
          }
        });
        break;
      case 'setPriority':
        Modal.confirm({
          title: '批量设置优先级',
          content: (
            <div>
              <p>为选中的 {selectedRowKeys.length} 个任务设置优先级：</p>
              <Select
                placeholder="选择优先级"
                style={{ width: '100%', marginTop: 8 }}
                onChange={(value: string) => {
                  (window as any).batchPriorityValue = value;
                }}
                options={[
                  { value: 'low', label: '低' },
                  { value: 'medium', label: '中' },
                  { value: 'high', label: '高' },
                  { value: 'urgent', label: '紧急' }
                ]}
              />
            </div>
          ),
          okText: '确认设置',
          cancelText: '取消',
          onOk: async () => {
            const newPriority = (window as any).batchPriorityValue;
            if (!newPriority) {
              message.warning('请选择优先级');
              return;
            }
            try {
              await Promise.all(selectedRowKeys.map(id => 
                TaskService.updateTask(projectId, Number(id), { 
                  custom_fields: { priority: newPriority } 
                })
              ));
              message.success('批量设置优先级成功');
              setSelectedRowKeys([]);
              loadTasks();
            } catch (error) {
              message.error('批量设置优先级失败');
            }
          }
        });
        break;
      default:
        message.info(`批量${action}功能开发中`);
    }
  };

  // 批量更改父任务
  const handleBatchParentUpdate = async (parentId: number | null) => {
    setBatchParentLoading(true);
    
    try {
      const result = await TaskService.batchUpdateTasks(projectId, selectedRowKeys as number[], {
        parent_id: parentId
      });
      
      message.success(`成功更新 ${result.updated_count} 个任务的父任务`);
      
      if (result.failed_tasks && result.failed_tasks.length > 0) {
        Modal.warning({
          title: '部分任务更新失败',
          content: (
            <div>
              <p>以下任务更新失败：</p>
              <ul>
                {result.failed_tasks.map(failed => (
                  <li key={failed.task_id}>
                    任务 #{failed.task_id}: {failed.error}
                  </li>
                ))}
              </ul>
            </div>
          )
        });
      }
      
      // 刷新任务列表
      await loadTasks();
      setSelectedRowKeys([]);
      
    } catch (error) {
      console.error('批量更新父任务失败:', error);
      message.error('批量更新父任务失败，请重试');
    } finally {
      setBatchParentLoading(false);
      setShowBatchParentModal(false);
    }
  };

  // 清空筛选条件
  const clearFilters = () => {
    setSearchText('');
    setStatusFilter([]);
    setAssigneeFilter([]);
    setPriorityFilter([]);
    setDateRange(null);
    loadTasks();
  };

  // 行选择配置
  const rowSelection: TableProps<HierarchicalTask>['rowSelection'] = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    type: 'checkbox',
  };

  return (
    <div style={style}>
      <Card
        title={
          <Space align="center">
            <ProjectOutlined />
            <span>项目任务</span>
            <Badge count={tasks.length} showZero color="#108ee9" />
          </Space>
        }
        extra={
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate(`/projects/${projectId}/tasks/new`)}
            >
              新建任务
            </Button>
            <Button
              icon={<SettingOutlined />}
              onClick={() => navigate(`/projects/${projectId}/tasks`)}
            >
              任务管理
            </Button>
          </Space>
        }
      >
        {/* 工具栏 */}
        <div style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]} align="middle">
            <Col flex="auto">
              <Space wrap>
                <Search
                  placeholder="搜索任务..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onSearch={loadTasks}
                  style={{ width: 200 }}
                  allowClear
                />
                <Button
                  icon={showFilters ? <FilterFilled /> : <FilterOutlined />}
                  onClick={() => setShowFilters(!showFilters)}
                >
                  筛选
                </Button>
                <Select
                  value={viewMode}
                  onChange={setViewMode}
                  style={{ width: 100 }}
                >
                  <Option value="list">列表</Option>
                  <Option value="hierarchy">层级</Option>
                </Select>
                <Button icon={<ReloadOutlined />} onClick={() => loadTasks()}>
                  刷新
                </Button>
              </Space>
            </Col>
            <Col>
              {selectedRowKeys.length > 0 && (
                <Space>
                  <Text type="secondary">已选择 {selectedRowKeys.length} 项</Text>
                  <Button size="small" onClick={() => setSelectedRowKeys([])}>
                    取消选择
                  </Button>
                  <Dropdown
                    overlay={
                      <Menu onClick={({ key }) => handleBatchAction(key)}>
                        <Menu.Item key="updateStatus" icon={<EditOutlined />}>
                          批量更新状态
                        </Menu.Item>
                        <Menu.Item key="setPriority" icon={<ExclamationCircleOutlined />}>
                          批量设置优先级
                        </Menu.Item>
                        <Menu.Divider />
                        <Menu.Item key="changeParent" icon={<NodeIndexOutlined />}>
                          更改父任务
                        </Menu.Item>
                        <Menu.Divider />
                        <Menu.Item key="delete" icon={<DeleteOutlined />} danger>
                          批量删除
                        </Menu.Item>
                      </Menu>
                    }
                    trigger={['click']}
                    placement="bottomLeft"
                  >
                    <Button size="small">
                      批量操作 <DownOutlined />
                    </Button>
                  </Dropdown>
                </Space>
              )}
            </Col>
          </Row>

          {/* 筛选面板 */}
          {showFilters && (
            <div style={{ 
              marginTop: 16, 
              padding: 16, 
              backgroundColor: '#fafafa', 
              borderRadius: 6,
              border: '1px solid #d9d9d9'
            }}>
              <Row gutter={[16, 16]}>
                <Col span={6}>
                  <div>
                    <Text strong style={{ fontSize: '12px', color: '#666' }}>状态</Text>
                    <Select
                      mode="multiple"
                      placeholder="选择状态"
                      value={statusFilter}
                      onChange={setStatusFilter}
                      style={{ width: '100%', marginTop: 4 }}
                      size="small"
                    >
                      <Option value="todo">待开始</Option>
                      <Option value="in_progress">进行中</Option>
                      <Option value="completed">已完成</Option>
                      <Option value="cancelled">已取消</Option>
                    </Select>
                  </div>
                </Col>
                <Col span={6}>
                  <div>
                    <Text strong style={{ fontSize: '12px', color: '#666' }}>优先级</Text>
                    <Select
                      mode="multiple"
                      placeholder="选择优先级"
                      value={priorityFilter}
                      onChange={setPriorityFilter}
                      style={{ width: '100%', marginTop: 4 }}
                      size="small"
                    >
                      <Option value="high">高</Option>
                      <Option value="medium">中</Option>
                      <Option value="low">低</Option>
                    </Select>
                  </div>
                </Col>
                <Col span={8}>
                  <div>
                    <Text strong style={{ fontSize: '12px', color: '#666' }}>截止日期</Text>
                    <RangePicker
                      value={dateRange}
                      onChange={setDateRange}
                      style={{ width: '100%', marginTop: 4 }}
                      size="small"
                      format="YYYY-MM-DD"
                    />
                  </div>
                </Col>
                <Col span={4}>
                  <div style={{ paddingTop: 20 }}>
                    <Space>
                      <Button size="small" type="primary" onClick={() => loadTasks()}>
                        应用
                      </Button>
                      <Button size="small" icon={<ClearOutlined />} onClick={clearFilters}>
                        清空
                      </Button>
                    </Space>
                  </div>
                </Col>
              </Row>
            </div>
          )}
        </div>

        {/* 任务表格 */}
        <Table
          columns={columns}
          dataSource={flattenedTasks}
          rowKey="id"
          loading={loading}
          rowSelection={rowSelection}
          pagination={pagination}
          onChange={(paginationConfig, filters, sorter) => {
            setPagination({
              ...pagination,
              current: paginationConfig.current || 1,
              pageSize: paginationConfig.pageSize || 20,
            });
            
            // 处理筛选
            setStatusFilter((filters.status as string[]) || []);
            setPriorityFilter((filters.priority as string[]) || []);
          }}
          rowClassName={(record: HierarchicalTask) => {
            // 高亮当前计时的任务行
            if (timerState.isRunning && timerState.taskId === record.id) {
              return 'timer-active-row';
            }
            return '';
          }}
          scroll={{ x: 1200, y: 600 }}
          size="small"
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span>
                    暂无任务数据
                    <br />
                    <Button 
                      type="link" 
                      onClick={() => navigate(`/projects/${projectId}/tasks/new`)}
                    >
                      立即创建
                    </Button>
                  </span>
                }
              />
            )
          }}
        />
        
        {/* 批量更改父任务Modal - 增强版 */}
        <Modal
          title={(
            <Space>
              <NodeIndexOutlined />
              <span>批量更改父任务</span>
              <Badge count={selectedRowKeys.length} showZero />
            </Space>
          )}
          open={showBatchParentModal}
          onCancel={() => {
            setShowBatchParentModal(false);
            setSelectedParentTask(null);
            setBatchPreviewData(null);
          }}
          width={800}
          footer={[
            <Button 
              key="cancel" 
              onClick={() => {
                setShowBatchParentModal(false);
                setSelectedParentTask(null);
                setBatchPreviewData(null);
              }}
            >
              取消
            </Button>,
            <Button 
              key="confirm" 
              type="primary" 
              loading={batchParentLoading}
              disabled={batchPreviewData?.validationResult && !batchPreviewData.validationResult.valid}
              onClick={() => {
                const parentId = selectedParentTask ? selectedParentTask.id : null;
                handleBatchParentUpdate(parentId);
              }}
            >
              {selectedParentTask ? `设置父任务为: ${selectedParentTask.title}` : '设置为根任务'}
            </Button>,
          ]}
        >
          <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {/* 父任务选择器 */}
            <Card size="small" style={{ marginBottom: 16 }}>
              <Title level={5} style={{ margin: 0, marginBottom: 12 }}>
                选择目标父任务
              </Title>
              
              <Space wrap>
                <Button
                  type={selectedParentTask === null ? 'primary' : 'default'}
                  icon={<NodeIndexOutlined />}
                  onClick={async () => {
                    setSelectedParentTask(null);
                    setBatchPreviewData(null); // 先清空，显示loading
                    try {
                      const previewData = await prepareBatchPreviewData(null);
                      setBatchPreviewData(previewData);
                    } catch (error) {
                      console.error('Failed to prepare batch preview data:', error);
                      // setBatchPreviewData保持为null，显示错误状态
                    }
                  }}
                >
                  设为根任务
                </Button>
                
                <Select
                  placeholder="选择父任务"
                  style={{ width: 300 }}
                  value={selectedParentTask?.id}
                  onChange={async (parentId) => {
                    const parent = tasks.find(t => t.id === parentId) || null;
                    setSelectedParentTask(parent);
                    setBatchPreviewData(null); // 先清空，显示loading
                    try {
                      const previewData = await prepareBatchPreviewData(parent);
                      setBatchPreviewData(previewData);
                    } catch (error) {
                      console.error('Failed to prepare batch preview data:', error);
                      // setBatchPreviewData保持为null，显示错误状态
                    }
                  }}
                  filterOption={(input, option) => {
                    const task = tasks.find(t => t.id === option?.value);
                    return task?.title.toLowerCase().includes(input.toLowerCase()) || false;
                  }}
                  showSearch
                >
                  {tasks
                    .filter(task => !selectedRowKeys.includes(task.id)) // 排除选中的任务
                    .map(task => (
                      <Option key={task.id} value={task.id}>
                        <Space>
                          <Text code>#{task.id}</Text>
                          <Text>{task.title}</Text>
                          {task.parent_id && (
                            <Tag size="small" color="blue">子任务</Tag>
                          )}
                        </Space>
                      </Option>
                    ))
                  }
                </Select>
              </Space>
              
              {selectedParentTask && (
                <div style={{ marginTop: 12, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
                  <Space>
                    <Text strong>已选父任务:</Text>
                    <Text code>#{selectedParentTask.id}</Text>
                    <Text>{selectedParentTask.title}</Text>
                    <Tag color="blue">层级 {selectedParentTask.task_level || 0}</Tag>
                  </Space>
                </div>
              )}
            </Card>

            {/* 批量操作预览 */}
            {batchPreviewData && (
              <BatchOperationPreview
                selectedTasks={batchPreviewData.selectedTasks}
                targetParent={selectedParentTask}
                operation="changeParent"
                warnings={batchPreviewData.warnings}
                validationResult={batchPreviewData.validationResult}
              />
            )}
          </div>
        </Modal>
      </Card>
    </div>
  );
};

export default ProjectTaskList;