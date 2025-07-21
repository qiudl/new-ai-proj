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
  BranchesOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { TaskService } from '../services/taskService';
import { projectService } from '../services/projectService';
import { Task } from '../types/task';
import AllFieldsTableGuide from '../components/AllFieldsTableGuide';
import dayjs from 'dayjs';
import '../styles/AllFieldsTaskList.css';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

// 自定义字段配置
interface CustomFieldConfig {
  key: string;
  title: string;
  dataType: 'string' | 'number' | 'boolean' | 'array' | 'date';
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

const AllFieldsTaskListPage: React.FC = () => {
  const navigate = useNavigate();
  
  // 数据状态
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  
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

  // 初始化列配置
  const initializeColumns = useCallback(() => {
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

    setColumnConfigs([...fixedColumns, ...dynamicColumns, ...customFieldColumns]);
  }, [customFields]);

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
        sorter: config.sortable,
      };

      // 特殊列的渲染
      switch (config.key) {
        case 'id':
          return {
            ...baseColumn,
            render: (id: number) => (
              <Text strong style={{ color: '#1890ff' }}>#{id}</Text>
            ),
          };

        case 'title':
          return {
            ...baseColumn,
            render: (title: string, record: Task) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {record.parent_id && (
                  <BranchesOutlined style={{ color: '#8c8c8c' }} />
                )}
                <Button
                  type="link"
                  style={{ padding: 0, height: 'auto', textAlign: 'left' }}
                  onClick={() => navigate(`/projects/${record.project_id}/tasks/${record.id}`)}
                >
                  {title}
                </Button>
              </div>
            ),
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

        case 'project_name':
          return {
            ...baseColumn,
            render: (projectName: string, record: Task) => (
              <Button
                type="link"
                size="small"
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
            ...baseColumn,
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

        case 'parent_title':
          return {
            ...baseColumn,
            render: (parentTitle: string, record: Task) => (
              parentTitle ? (
                <Button
                  type="link"
                  size="small"
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
            ...baseColumn,
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
            ...baseColumn,
            render: (_: any, record: Task) => (
              <Space size="small">
                <Tooltip title="查看详情">
                  <Button
                    type="text"
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => navigate(`/projects/${record.project_id}/tasks/${record.id}`)}
                  />
                </Tooltip>
                <Tooltip title="编辑">
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => navigate(`/projects/${record.project_id}/tasks/${record.id}/edit`)}
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
  }, [columnConfigs, customFields, navigate]);

  // 加载数据
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [tasksResponse, projectsResponse] = await Promise.allSettled([
        TaskService.getAllTasks({
          page: pagination.current,
          page_size: pagination.pageSize,
          search: filters.search || undefined,
          status: filters.status.length > 0 ? filters.status.join(',') as any : undefined,
          assignee_id: filters.assignee_id,
          due_after: filters.due_date_range?.[0]?.format('YYYY-MM-DD'),
          due_before: filters.due_date_range?.[1]?.format('YYYY-MM-DD'),
        }),
        projectService.getProjects({ page: 1, pageSize: 100 })
      ]);

      if (tasksResponse.status === 'fulfilled') {
        let taskData = tasksResponse.value.data || [];
        
        // 前端项目筛选
        if (filters.project_id) {
          taskData = taskData.filter(task => task.project_id === filters.project_id);
        }
        
        setTasks(taskData);
        setPagination(prev => ({
          ...prev,
          total: taskData.length,
        }));
      }

      if (projectsResponse.status === 'fulfilled') {
        setProjects(projectsResponse.value.data || []);
      }
    } catch (error) {
      message.error('加载数据失败');
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, filters]);

  // 删除任务
  const handleDeleteTask = async (task: Task) => {
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
  };

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
    setColumnConfigs(prev => 
      prev.map(col => 
        col.key === columnKey ? { ...col, visible } : col
      )
    );
  };

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
    items: columnConfigs
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
            {column.customField && (
              <Tag color="blue" style={{ fontSize: '11px', padding: '2px 6px' }}>自定义</Tag>
            )}
          </div>
        ),
      })),
  });

  useEffect(() => {
    initializeColumns();
  }, [initializeColumns]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
            全字段任务列表
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
          </Space>
        </div>

        {/* 过滤器 */}
        <Card size="small" className="filters-card">
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
          </Space>
        </Card>

        {/* 批量操作 */}
        {selectedRowKeys.length > 0 && (
          <Card size="small" className="batch-actions-card">
            <Space>
              <Text>已选择 {selectedRowKeys.length} 项</Text>
              <Button 
                size="small" 
                danger 
                onClick={handleBatchDelete}
              >
                批量删除
              </Button>
              <Button 
                size="small" 
                onClick={() => setSelectedRowKeys([])}
              >
                取消选择
              </Button>
            </Space>
          </Card>
        )}
      </div>

      {/* 表格 */}
      <Card>
        <div className="all-fields-table">
          <Table
          columns={generateTableColumns}
          dataSource={tasks}
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
          size="small"
          bordered
          />
        </div>
      </Card>

      {/* 使用指南 */}
      <AllFieldsTableGuide 
        visible={guideVisible}
        onClose={() => setGuideVisible(false)}
      />
    </div>
  );
};

export default AllFieldsTaskListPage;