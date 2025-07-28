import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Typography,
  Tooltip,
  message,
  Popconfirm,
  Breadcrumb,
  Statistic,
  Row,
  Col,
  Empty,
  Input,
  Select,
  DatePicker
} from 'antd';
import {
  InboxOutlined,
  ReloadOutlined,
  UndoOutlined,
  SearchOutlined,
  HomeOutlined,
  ProjectOutlined,
  CalendarOutlined,
  UserOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { getArchivedTasks, unarchiveTask, getArchiveStatistics, ArchivedTask, ArchiveStatistics } from '../services/archiveService';

const { Title, Text } = Typography;
const { Search } = Input;
const { RangePicker } = DatePicker;

const ArchivedTasksPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  
  const [tasks, setTasks] = useState<ArchivedTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState<ArchiveStatistics | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });
  
  // 过滤器状态
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    archivedBy: '',
    dateRange: null as [dayjs.Dayjs, dayjs.Dayjs] | null
  });

  // 获取归档任务
  const fetchArchivedTasks = useCallback(async (page = 1, pageSize = 20) => {
    if (!projectId) return;
    
    try {
      setLoading(true);
      const data = await getArchivedTasks(parseInt(projectId), page, pageSize);
      setTasks(data.tasks);
      setPagination({
        current: data.page,
        pageSize: data.page_size,
        total: data.total
      });
    } catch (error: any) {
      message.error(error.message || '获取归档任务失败');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // 获取统计信息
  const fetchStatistics = useCallback(async () => {
    if (!projectId) return;
    
    try {
      const stats = await getArchiveStatistics(parseInt(projectId));
      setStatistics(stats);
    } catch (error: any) {
      message.error(error.message || '获取统计信息失败');
    }
  }, [projectId]);

  // 取消归档
  const handleUnarchive = async (taskId: number, taskTitle: string) => {
    if (!projectId) return;
    
    try {
      await unarchiveTask(parseInt(projectId), taskId);
      message.success(`任务 "${taskTitle}" 已恢复到活跃状态`);
      fetchArchivedTasks(pagination.current, pagination.pageSize);
      fetchStatistics();
    } catch (error: any) {
      message.error(error.message || '取消归档失败');
    }
  };

  // 处理分页变化
  const handleTableChange = (newPagination: any) => {
    fetchArchivedTasks(newPagination.current, newPagination.pageSize);
  };

  // 处理搜索
  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
    // 实际项目中，这里应该调用带搜索参数的API
    fetchArchivedTasks(1, pagination.pageSize);
  };

  // 获取状态标签
  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      todo: { color: 'default', text: '待办' },
      in_progress: { color: 'processing', text: '进行中' },
      completed: { color: 'success', text: '已完成' },
      cancelled: { color: 'error', text: '已取消' }
    };
    
    const statusInfo = statusMap[status] || { color: 'default', text: status };
    return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
  };

  // 表格列配置
  const columns = [
    {
      title: '任务标题',
      dataIndex: 'title',
      key: 'title',
      width: 300,
      render: (title: string, record: ArchivedTask) => (
        <div>
          <div style={{ fontWeight: 500, marginBottom: '4px' }}>
            {title}
          </div>
          {record.description && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.description.length > 50 
                ? `${record.description.substring(0, 50)}...` 
                : record.description}
            </Text>
          )}
        </div>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status)
    },
    {
      title: '归档信息',
      key: 'archiveInfo',
      width: 200,
      render: (record: ArchivedTask) => (
        <div>
          <div style={{ marginBottom: '4px' }}>
            <CalendarOutlined style={{ marginRight: '4px', color: '#666' }} />
            <Text style={{ fontSize: '12px' }}>
              {dayjs(record.archived_at).format('YYYY-MM-DD HH:mm')}
            </Text>
          </div>
          {record.archived_by_username && (
            <div style={{ marginBottom: '4px' }}>
              <UserOutlined style={{ marginRight: '4px', color: '#666' }} />
              <Text style={{ fontSize: '12px' }}>
                {record.archived_by_username}
              </Text>
            </div>
          )}
          {record.archive_reason && (
            <div>
              <FileTextOutlined style={{ marginRight: '4px', color: '#666' }} />
              <Text style={{ fontSize: '12px' }} type="secondary">
                {record.archive_reason.length > 30 
                  ? `${record.archive_reason.substring(0, 30)}...`
                  : record.archive_reason}
              </Text>
            </div>
          )}
        </div>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (date: string) => (
        <Text style={{ fontSize: '12px' }}>
          {dayjs(date).format('YYYY-MM-DD')}
        </Text>
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (record: ArchivedTask) => (
        <Space size="small">
          <Popconfirm
            title="确认取消归档"
            description={`确定要将任务 "${record.title}" 恢复到活跃状态吗？`}
            onConfirm={() => handleUnarchive(record.id, record.title)}
            okText="确认"
            cancelText="取消"
          >
            <Button 
              type="link" 
              size="small" 
              icon={<UndoOutlined />}
              style={{ padding: 0 }}
            >
              恢复
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  useEffect(() => {
    fetchArchivedTasks();
    fetchStatistics();
  }, [fetchArchivedTasks, fetchStatistics]);

  return (
    <div style={{ padding: '24px' }}>
      {/* 面包屑导航 */}
      <Breadcrumb style={{ marginBottom: '16px' }}>
        <Breadcrumb.Item>
          <HomeOutlined />
          <span 
            style={{ cursor: 'pointer', marginLeft: '4px' }} 
            onClick={() => navigate('/')}
          >
            首页
          </span>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <ProjectOutlined />
          <span 
            style={{ cursor: 'pointer', marginLeft: '4px' }}
            onClick={() => navigate(`/projects/${projectId}`)}
          >
            项目管理
          </span>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <InboxOutlined />
          <span style={{ marginLeft: '4px' }}>归档任务</span>
        </Breadcrumb.Item>
      </Breadcrumb>

      {/* 页面标题和统计信息 */}
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ marginBottom: '16px' }}>
          <InboxOutlined style={{ marginRight: '8px' }} />
          归档任务管理
        </Title>
        
        {statistics && (
          <Row gutter={16} style={{ marginBottom: '16px' }}>
            <Col span={6}>
              <Card size="small">
                <Statistic 
                  title="活跃任务" 
                  value={statistics.active_tasks} 
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic 
                  title="归档任务" 
                  value={statistics.archived_tasks}
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic 
                  title="总任务数" 
                  value={statistics.total_tasks}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic 
                  title="归档比例" 
                  value={statistics.total_tasks > 0 
                    ? ((statistics.archived_tasks / statistics.total_tasks) * 100).toFixed(1)
                    : 0
                  }
                  suffix="%"
                  valueStyle={{ color: '#722ed1' }}
                />
              </Card>
            </Col>
          </Row>
        )}
      </div>

      {/* 搜索和过滤器 */}
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Row gutter={16} align="middle">
          <Col span={8}>
            <Search
              placeholder="搜索任务标题或描述"
              allowClear
              onSearch={handleSearch}
              style={{ width: '100%' }}
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="任务状态"
              allowClear
              style={{ width: '100%' }}
              onChange={(value) => setFilters(prev => ({ ...prev, status: value || '' }))}
            >
              <Select.Option value="todo">待办</Select.Option>
              <Select.Option value="in_progress">进行中</Select.Option>
              <Select.Option value="completed">已完成</Select.Option>
              <Select.Option value="cancelled">已取消</Select.Option>
            </Select>
          </Col>
          <Col span={6}>
            <RangePicker
              placeholder={['归档开始时间', '归档结束时间']}
              style={{ width: '100%' }}
              onChange={(dates) => setFilters(prev => ({ ...prev, dateRange: dates }))}
            />
          </Col>
          <Col span={6}>
            <Space>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={() => fetchArchivedTasks(1, pagination.pageSize)}
              >
                刷新
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 归档任务表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={tasks}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条归档任务`
          }}
          onChange={handleTableChange}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无归档任务"
              />
            )
          }}
          scroll={{ x: 800 }}
        />
      </Card>
    </div>
  );
};

export default ArchivedTasksPage;