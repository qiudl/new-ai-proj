import React, { useState } from 'react';
import { Table, Tag, Button, Space, Input, Select, DatePicker, Tooltip, Modal, message } from 'antd';
import { EditOutlined, DeleteOutlined, EyeOutlined, SearchOutlined, FilterOutlined } from '@ant-design/icons';
import { ColumnsType, TableProps } from 'antd/es/table';
import { Task } from '../types/task';
import dayjs from 'dayjs';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface EnhancedTaskTableProps {
  tasks: Task[];
  loading: boolean;
  selectedProjectId?: number;
  onView: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  pagination?: TableProps<Task>['pagination'];
}

interface FilterState {
  search: string;
  status: string[];
  priority: string[];
  dateRange: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null;
  assignee: string[];
}

const EnhancedTaskTable: React.FC<EnhancedTaskTableProps> = ({
  tasks,
  loading,
  selectedProjectId,
  onView,
  onEdit,
  onDelete,
  pagination
}) => {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: [],
    priority: [],
    dateRange: null,
    assignee: []
  });
  const [filteredTasks, setFilteredTasks] = useState<Task[]>(tasks);

  React.useEffect(() => {
    applyFilters();
  }, [tasks, filters]);

  const applyFilters = () => {
    let filtered = [...tasks];

    // 搜索过滤
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(searchLower) ||
        task.description.toLowerCase().includes(searchLower)
      );
    }

    // 状态过滤
    if (filters.status.length > 0) {
      filtered = filtered.filter(task => filters.status.includes(task.status));
    }

    // 优先级过滤
    if (filters.priority.length > 0) {
      filtered = filtered.filter(task => {
        const priority = task.custom_fields?.priority as string;
        return priority && filters.priority.includes(priority);
      });
    }

    // 日期范围过滤
    if (filters.dateRange && filters.dateRange[0] && filters.dateRange[1]) {
      filtered = filtered.filter(task => {
        if (!task.due_date) return false;
        const dueDate = dayjs(task.due_date);
        return dueDate.isAfter(filters.dateRange![0]) && dueDate.isBefore(filters.dateRange![1]);
      });
    }

    setFilteredTasks(filtered);
  };

  const handleDelete = (task: Task) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除任务 "${task.title}" 吗？此操作无法撤销。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => onDelete(task),
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return 'default';
      case 'in_progress': return 'processing';
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'todo': return '待处理';
      case 'in_progress': return '进行中';
      case 'completed': return '已完成';
      case 'cancelled': return '已取消';
      default: return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'green';
      case 'medium': return 'orange';
      case 'high': return 'red';
      default: return 'default';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'low': return '低';
      case 'medium': return '中';
      case 'high': return '高';
      default: return priority;
    }
  };

  const columns: ColumnsType<Task> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: '任务标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: {
        showTitle: false,
      },
      render: (title: string, record: Task) => (
        <Tooltip placement="topLeft" title={title}>
          <Button 
            type="link" 
            style={{ padding: 0, textAlign: 'left', height: 'auto' }}
            onClick={() => onView(record)}
          >
            {title}
          </Button>
        </Tooltip>
      ),
      sorter: (a, b) => a.title.localeCompare(b.title),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: {
        showTitle: false,
      },
      render: (description: string) => (
        <Tooltip placement="topLeft" title={description}>
          {description || '无描述'}
        </Tooltip>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      ),
      filters: [
        { text: '待处理', value: 'todo' },
        { text: '进行中', value: 'in_progress' },
        { text: '已完成', value: 'completed' },
        { text: '已取消', value: 'cancelled' },
      ],
      onFilter: (value, record) => record.status === value,
      sorter: (a, b) => a.status.localeCompare(b.status),
    },
    {
      title: '优先级',
      key: 'priority',
      width: 100,
      render: (_, record: Task) => {
        const priority = record.custom_fields?.priority as string;
        return priority ? (
          <Tag color={getPriorityColor(priority)}>
            {getPriorityText(priority)}
          </Tag>
        ) : <span>-</span>;
      },
      filters: [
        { text: '高', value: 'high' },
        { text: '中', value: 'medium' },
        { text: '低', value: 'low' },
      ],
      onFilter: (value, record) => record.custom_fields?.priority === value,
      sorter: (a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const aPriority = a.custom_fields?.priority as keyof typeof priorityOrder || 'low';
        const bPriority = b.custom_fields?.priority as keyof typeof priorityOrder || 'low';
        return (priorityOrder[bPriority] || 0) - (priorityOrder[aPriority] || 0);
      },
    },
    {
      title: '负责人',
      dataIndex: 'assignee_id',
      key: 'assignee_id',
      width: 120,
      render: (assigneeId: number) => assigneeId ? `用户 ${assigneeId}` : '未分配',
      sorter: (a, b) => (a.assignee_id || 0) - (b.assignee_id || 0),
    },
    {
      title: '截止时间',
      dataIndex: 'due_date',
      key: 'due_date',
      width: 120,
      render: (dueDate: string) => {
        if (!dueDate) return '未设置';
        const date = dayjs(dueDate);
        const isOverdue = date.isBefore(dayjs(), 'day');
        return (
          <span style={{ color: isOverdue ? '#ff4d4f' : undefined }}>
            {date.format('YYYY-MM-DD')}
          </span>
        );
      },
      sorter: (a, b) => {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return dayjs(a.due_date).unix() - dayjs(b.due_date).unix();
      },
    },
    {
      title: '预估工时',
      key: 'estimated_hours',
      width: 100,
      render: (_, record: Task) => {
        const hours = record.custom_fields?.estimated_hours as number;
        return hours ? `${hours}h` : '-';
      },
      sorter: (a, b) => {
        const aHours = a.custom_fields?.estimated_hours as number || 0;
        const bHours = b.custom_fields?.estimated_hours as number || 0;
        return aHours - bHours;
      },
    },
    {
      title: '标签',
      key: 'tags',
      width: 150,
      render: (_, record: Task) => {
        const tags = record.custom_fields?.tags as string[];
        return tags && Array.isArray(tags) ? (
          <Space wrap>
            {tags.slice(0, 2).map((tag: string, index: number) => (
              <Tag key={index} color="blue" style={{ margin: '2px' }}>
                {tag}
              </Tag>
            ))}
            {tags.length > 2 && <span>+{tags.length - 2}</span>}
          </Space>
        ) : <span>-</span>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (createdAt: string) => dayjs(createdAt).format('YYYY-MM-DD'),
      sorter: (a, b) => dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 120,
      render: (updatedAt: string) => dayjs(updatedAt).format('YYYY-MM-DD'),
      sorter: (a, b) => dayjs(a.updated_at).unix() - dayjs(b.updated_at).unix(),
      defaultSortOrder: 'descend',
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 150,
      render: (_, record: Task) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => onView(record)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => onEdit(record)}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* 过滤器区域 */}
      <div style={{ 
        marginBottom: '16px', 
        padding: '16px', 
        backgroundColor: '#fafafa', 
        borderRadius: '6px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        alignItems: 'center'
      }}>
        <Search
          placeholder="搜索任务标题或描述"
          allowClear
          style={{ width: 250 }}
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          prefix={<SearchOutlined />}
        />
        
        <Select
          mode="multiple"
          placeholder="筛选状态"
          style={{ minWidth: 150 }}
          value={filters.status}
          onChange={(status) => setFilters({ ...filters, status })}
          allowClear
        >
          <Option value="todo">待处理</Option>
          <Option value="in_progress">进行中</Option>
          <Option value="completed">已完成</Option>
          <Option value="cancelled">已取消</Option>
        </Select>

        <Select
          mode="multiple"
          placeholder="筛选优先级"
          style={{ minWidth: 120 }}
          value={filters.priority}
          onChange={(priority) => setFilters({ ...filters, priority })}
          allowClear
        >
          <Option value="high">高</Option>
          <Option value="medium">中</Option>
          <Option value="low">低</Option>
        </Select>

        <RangePicker
          placeholder={['开始日期', '结束日期']}
          style={{ width: 220 }}
          value={filters.dateRange}
          onChange={(dateRange) => setFilters({ ...filters, dateRange })}
          allowClear
        />

        <Button
          icon={<FilterOutlined />}
          onClick={() => setFilters({
            search: '',
            status: [],
            priority: [],
            dateRange: null,
            assignee: []
          })}
        >
          清除筛选
        </Button>

        <div style={{ marginLeft: 'auto', color: '#666' }}>
          显示 {filteredTasks.length} / {tasks.length} 条任务
        </div>
      </div>

      {/* 任务表格 */}
      <Table
        columns={columns}
        dataSource={filteredTasks}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
        scroll={{ x: 1500, y: 600 }}
        size="middle"
        bordered
      />
    </div>
  );
};

export default EnhancedTaskTable;