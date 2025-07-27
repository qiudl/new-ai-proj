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
  ClearOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { TaskService } from '../services/taskService';
import { Task } from '../types/task';
import TimerStartButton from './TimerStartButton';
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
  const [viewMode, setViewMode] = useState<'list' | 'hierarchy'>('list');
  
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
  const loadTasks = useCallback(async (params: any = {}) => {
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
      taskMap.set(task.id, { ...task, children: [], level: 0, hasChildren: false, isExpanded: expandedTaskIds.has(task.id) });
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
  const columns: ColumnsType<HierarchicalTask> = [
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
      width: 150,
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
      default:
        message.info(`批量${action}功能开发中`);
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
                    menu={{
                      items: [
                        { key: 'delete', label: '批量删除', icon: <DeleteOutlined />, danger: true }
                      ],
                      onClick: ({ key }) => handleBatchAction(key)
                    }}
                  >
                    <Button size="small">批量操作</Button>
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
      </Card>
    </div>
  );
};

export default ProjectTaskList;