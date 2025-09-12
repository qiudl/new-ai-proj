import React, { useState, useEffect } from 'react';
import {
  Modal,
  Input,
  Select,
  Table,
  Button,
  Space,
  Typography,
  Tag,
  Row,
  Col,
  Card,
  Empty,
  Spin,
  message,
  Pagination,
  Tooltip
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  TagOutlined,
  CalendarOutlined,
  UserOutlined,
  ClearOutlined
} from '@ant-design/icons';
import { TaskService } from '../services/taskService';
import { Task } from '../types/task';

const { Search } = Input;
const { Option } = Select;
const { Text } = Typography;

interface WorkNoteTaskSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (task: Task) => void;
  selectedTaskId?: number;
  title?: string;
}

const WorkNoteTaskSelectionModal: React.FC<WorkNoteTaskSelectionModalProps> = ({
  visible,
  onClose,
  onSelect,
  selectedTaskId,
  title = '选择目标任务'
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // 状态配置
  const statusConfig = {
    todo: { color: 'default', text: '待办' },
    in_progress: { color: 'processing', text: '进行中' },
    completed: { color: 'success', text: '已完成' },
    cancelled: { color: 'error', text: '已取消' },
    on_hold: { color: 'warning', text: '暂停' },
    planning: { color: 'purple', text: '规划中' },
    testing: { color: 'cyan', text: '测试中' },
    blocked: { color: 'red', text: '阻塞' },
    archived: { color: 'default', text: '已归档' }
  };

  const priorityConfig = {
    low: { color: 'green', text: '低' },
    medium: { color: 'orange', text: '中' },
    high: { color: 'red', text: '高' },
    urgent: { color: 'volcano', text: '紧急' }
  };

  // 加载任务数据
  const loadTasks = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        page_size: pageSize
      };

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (priorityFilter !== 'all') {
        params.priority = priorityFilter;
      }

      const response = await TaskService.getAllTasks(params);
      setTasks(response.data || []);
      setTotal(response.pagination?.total || 0);
      
      // 如果有预选的任务ID，设置为选中状态
      if (selectedTaskId) {
        const preselectedTask = response.data?.find((task: Task) => task.id === selectedTaskId);
        if (preselectedTask) {
          setSelectedTask(preselectedTask);
        }
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
      message.error('加载任务失败');
      setTasks([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadTasks();
    }
  }, [visible, currentPage, pageSize, searchQuery, statusFilter, priorityFilter]);

  useEffect(() => {
    if (visible) {
      setCurrentPage(1);
    }
  }, [searchQuery, statusFilter, priorityFilter]);

  // 处理搜索
  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

  // 处理筛选重置
  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setCurrentPage(1);
  };

  // 处理任务选择
  const handleTaskSelect = (task: Task) => {
    setSelectedTask(task);
  };

  // 确认选择
  const handleConfirm = () => {
    if (selectedTask) {
      onSelect(selectedTask);
      onClose();
    }
  };

  // 处理关闭
  const handleClose = () => {
    setSelectedTask(null);
    setSearchQuery('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setCurrentPage(1);
    onClose();
  };

  // 获取优先级文本
  const getPriorityText = (task: Task) => {
    return task.priority || task.custom_fields?.priority || '无';
  };

  // 表格列配置
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: (id: number) => <Text strong>#{id}</Text>
    },
    {
      title: '任务标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: { showTitle: true },
      render: (title: string, record: Task) => (
        <div>
          <Text strong style={{ color: selectedTask?.id === record.id ? '#1890ff' : 'inherit' }}>
            {title}
          </Text>
          {record.description && (
            <div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {record.description.length > 60 
                  ? `${record.description.substring(0, 60)}...` 
                  : record.description}
              </Text>
            </div>
          )}
        </div>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const config = statusConfig[status as keyof typeof statusConfig] || { color: 'default', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (_: any, record: Task) => {
        const priority = getPriorityText(record);
        if (priority === '无') return <Text type="secondary">-</Text>;
        const config = priorityConfig[priority.toLowerCase() as keyof typeof priorityConfig] || { color: 'default', text: priority };
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: Task) => (
        <Button
          type={selectedTask?.id === record.id ? 'primary' : 'default'}
          
          icon={selectedTask?.id === record.id ? <CheckCircleOutlined /> : undefined}
          onClick={() => handleTaskSelect(record)}
        >
          {selectedTask?.id === record.id ? '已选择' : '选择'}
        </Button>
      )
    }
  ];

  return (
    <Modal
      title={
        <Space>
          <TagOutlined />
          {title}
        </Space>
      }
      visible={visible}
      onCancel={handleClose}
      width={900}
      style={{ top: 50 }}
      footer={
        <Space>
          <Button onClick={handleClose}>取消</Button>
          <Button 
            type="primary" 
            disabled={!selectedTask}
            onClick={handleConfirm}
            icon={<CheckCircleOutlined />}
          >
            确定选择 {selectedTask ? `(#${selectedTask.id})` : ''}
          </Button>
        </Space>
      }
    >
      <div style={{ marginBottom: 16 }}>
        {/* 搜索和筛选工具栏 */}
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} md={8}>
            <Search
              placeholder="搜索任务标题、描述、ID..."
              allowClear
              onSearch={handleSearch}
              onChange={(e) => !e.target.value && setSearchQuery('')}
              style={{ width: '100%' }}
              prefix={<SearchOutlined />}
            />
          </Col>
          <Col xs={12} sm={6} md={5}>
            <Select
              placeholder="状态筛选"
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={setStatusFilter}
              suffixIcon={<FilterOutlined />}
            >
              <Option value="all">全部状态</Option>
              {Object.entries(statusConfig).map(([key, config]) => (
                <Option key={key} value={key}>
                  <Tag color={config.color} style={{ margin: 0, marginRight: 4 }}>
                    {config.text}
                  </Tag>
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} sm={6} md={5}>
            <Select
              placeholder="优先级筛选"
              style={{ width: '100%' }}
              value={priorityFilter}
              onChange={setPriorityFilter}
              suffixIcon={<FilterOutlined />}
            >
              <Option value="all">全部优先级</Option>
              {Object.entries(priorityConfig).map(([key, config]) => (
                <Option key={key} value={key}>
                  <Tag color={config.color} style={{ margin: 0, marginRight: 4 }}>
                    {config.text}
                  </Tag>
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={24} md={6}>
            <Space>
              <Tooltip title="刷新任务列表">
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={loadTasks}
                  loading={loading}
                  size="middle"
                />
              </Tooltip>
              <Tooltip title="重置所有筛选条件">
                <Button 
                  icon={<ClearOutlined />} 
                  onClick={handleResetFilters}
                  size="middle"
                />
              </Tooltip>
            </Space>
          </Col>
        </Row>

        {/* 筛选状态指示 */}
        {(searchQuery || statusFilter !== 'all' || priorityFilter !== 'all') && (
          <div style={{ marginTop: 8, padding: '4px 0' }}>
            <Space size={[4, 4]} wrap>
              <Text type="secondary" style={{ fontSize: '12px' }}>当前筛选：</Text>
              {searchQuery && (
                <Tag closable onClose={() => setSearchQuery('')} style={{ fontSize: '11px' }}>
                  搜索: {searchQuery}
                </Tag>
              )}
              {statusFilter !== 'all' && (
                <Tag closable onClose={() => setStatusFilter('all')} style={{ fontSize: '11px' }}>
                  状态: {statusConfig[statusFilter as keyof typeof statusConfig]?.text}
                </Tag>
              )}
              {priorityFilter !== 'all' && (
                <Tag closable onClose={() => setPriorityFilter('all')} style={{ fontSize: '11px' }}>
                  优先级: {priorityConfig[priorityFilter as keyof typeof priorityConfig]?.text}
                </Tag>
              )}
            </Space>
          </div>
        )}
      </div>

      {/* 选中任务预览卡片 */}
      {selectedTask && (
        <Card  style={{ marginBottom: 16, background: '#f0f9ff', borderColor: '#91d5ff' }}>
          <Space>
            <CheckCircleOutlined style={{ color: '#1890ff' }} />
            <Text strong style={{ color: '#1890ff' }}>
              已选择任务：#{selectedTask.id} {selectedTask.title}
            </Text>
            <Tag color={statusConfig[selectedTask.status as keyof typeof statusConfig]?.color}>
              {statusConfig[selectedTask.status as keyof typeof statusConfig]?.text}
            </Tag>
          </Space>
        </Card>
      )}

      {/* 任务表格 */}
      <Spin spinning={loading}>
        <Table
          columns={columns}
          dataSource={tasks}
          rowKey="id"
          pagination={false}
          
          scroll={{ y: 350 }}
          rowSelection={undefined}
          onRow={(record) => ({
            onClick: () => handleTaskSelect(record),
            style: {
              cursor: 'pointer',
              backgroundColor: selectedTask?.id === record.id ? '#e6f7ff' : 'transparent'
            }
          })}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <div>
                    <Text type="secondary">
                      {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' 
                        ? '没有找到匹配的任务' 
                        : '暂无任务数据'}
                    </Text>
                    <div style={{ marginTop: 8 }}>
                      <Button 
                        type="link" 
                        
                        onClick={handleResetFilters}
                        style={{ padding: 0 }}
                      >
                        重置筛选条件
                      </Button>
                    </div>
                  </div>
                }
              />
            )
          }}
        />
      </Spin>

      {/* 分页组件 */}
      {total > 0 && (
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Pagination
            current={currentPage}
            total={total}
            pageSize={pageSize}
            showSizeChanger
            showQuickJumper
            showTotal={(total, range) => 
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条任务`
            }
            pageSizeOptions={['10', '20', '50']}
            onChange={(page, size) => {
              setCurrentPage(page);
              if (size !== pageSize) {
                setPageSize(size);
                setCurrentPage(1);
              }
            }}
            
          />
        </div>
      )}

      {/* 统计信息 */}
      <div style={{ marginTop: 8, textAlign: 'center' }}>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {loading ? '正在加载...' : `共 ${total} 个任务${selectedTask ? `，已选择 #${selectedTask.id}` : ''}`}
        </Text>
      </div>
    </Modal>
  );
};

export default WorkNoteTaskSelectionModal;