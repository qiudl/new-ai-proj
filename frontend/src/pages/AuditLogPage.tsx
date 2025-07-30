import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table,
  Typography,
  Tag,
  Modal,
  Button,
  Space,
  Card,
  Row,
  Col,
  Input,
  Select,
  DatePicker,
  Statistic,
  Switch,
  Tooltip,
  Badge,
  Drawer,
  Progress,
  Alert,
  Divider,
  Empty,
  message,
  Spin
} from 'antd';
import {
  EyeOutlined,
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  DownloadOutlined,
  BarChartOutlined,
  ClockCircleOutlined,
  UserOutlined,
  FileTextOutlined,
  SettingOutlined,
  ClearOutlined,
  ExportOutlined,
  SyncOutlined
} from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, Pie, Cell, BarChart, Bar } from 'recharts';
import dayjs, { Dayjs } from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import { SystemService, AuditLog, AuditLogFilter, AuditStats, PaginatedResponse } from '../services/systemService';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const AuditLogPage: React.FC = () => {
  // 状态管理
  const [loading, setLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  
  // 筛选器状态
  const [filters, setFilters] = useState<AuditLogFilter>({});
  const [tempFilters, setTempFilters] = useState<AuditLogFilter>({});
  
  // 统计数据状态
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // 加载审计日志
  const loadAuditLogs = useCallback(async (page = 1, size = pageSize, currentFilters = filters) => {
    setLoading(true);
    try {
      const response: PaginatedResponse<AuditLog> = await SystemService.getAuditLogs(page, size, currentFilters);
      
      // Validate that response.data is an array
      if (!response || !response.data) {
        console.warn('Invalid response structure:', response);
        setAuditLogs([]);
        setTotal(0);
        return;
      }
      
      // Ensure data is an array
      const auditData = Array.isArray(response.data) ? response.data : [];
      
      // Filter out invalid audit log objects
      const validAuditLogs = auditData.filter(log => 
        log && 
        typeof log === 'object' && 
        typeof log.id !== 'undefined'
      );
      
      setAuditLogs(validAuditLogs);
      setTotal(response.pagination?.total || 0);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error loading audit logs:', error);
      message.error('加载审计日志失败');
      setAuditLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [pageSize, filters]);

  // 加载统计数据
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const statsData = await SystemService.getAuditStats(filters);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
      message.error('加载统计数据失败');
    } finally {
      setStatsLoading(false);
    }
  }, [filters]);

  // 应用筛选器
  const applyFilters = useCallback(() => {
    setFilters({ ...tempFilters });
    setFilterVisible(false);
    loadAuditLogs(1, pageSize, tempFilters);
  }, [tempFilters, loadAuditLogs, pageSize]);

  // 清除筛选器
  const clearFilters = useCallback(() => {
    const emptyFilters = {};
    setFilters(emptyFilters);
    setTempFilters(emptyFilters);
    loadAuditLogs(1, pageSize, emptyFilters);
  }, [loadAuditLogs, pageSize]);

  // 刷新数据
  const refreshData = useCallback(() => {
    loadAuditLogs(currentPage, pageSize);
    if (statsVisible) {
      loadStats();
    }
  }, [loadAuditLogs, loadStats, currentPage, pageSize, statsVisible]);

  // 自动刷新控制
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(refreshData, 30000); // 30秒刷新
      setRefreshInterval(interval);
      return () => clearInterval(interval);
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  }, [autoRefresh, refreshData, refreshInterval]);

  // 初始加载
  useEffect(() => {
    loadAuditLogs(1);
  }, [loadAuditLogs]);

  // 导出数据
  const exportData = useCallback(async (format: 'csv' | 'excel' = 'csv') => {
    try {
      // 临时实现：导出当前页面数据
      const csvData = auditLogs.map(log => ({
        时间: dayjs(log.created_at).format('YYYY-MM-DD HH:mm:ss'),
        用户: log.user_name || `用户${log.user_id}`,
        操作: getActionText(log.action),
        实体类型: getEntityTypeText(log.entity_type),
        实体ID: log.entity_id,
        IP地址: log.ip_address || '',
        状态: log.status || ''
      }));
      
      const csvContent = [
        Object.keys(csvData[0]).join(','),
        ...csvData.map(row => Object.values(row).join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `audit_logs_${dayjs().format('YYYY-MM-DD')}.csv`;
      link.click();
      
      message.success('数据导出成功');
    } catch (error) {
      console.error('Export error:', error);
      message.error('数据导出失败');
    }
  }, [auditLogs]);

  // 获取操作颜色
  const getActionColor = (action: string) => {
    const colorMap: Record<string, string> = {
      create: 'green',
      update: 'blue',
      delete: 'red',
      soft_delete: 'orange',
      restore: 'cyan',
      hard_delete: 'volcano',
      login: 'purple',
      logout: 'default'
    };
    return colorMap[action] || 'default';
  };

  // 获取操作文本
  const getActionText = (action: string) => {
    const textMap: Record<string, string> = {
      create: '创建',
      update: '更新',
      delete: '删除',
      soft_delete: '软删除',
      restore: '恢复',
      hard_delete: '永久删除',
      login: '登录',
      logout: '登出'
    };
    return textMap[action] || action;
  };

  // 获取实体类型文本
  const getEntityTypeText = (entityType: string) => {
    const textMap: Record<string, string> = {
      project: '项目',
      task: '任务',
      user: '用户'
    };
    return textMap[entityType] || entityType;
  };

  // 显示日志详情
  const showLogDetail = (log: AuditLog) => {
    setSelectedLog(log);
    setModalVisible(true);
  };

  // 筛选器活动状态
  const hasActiveFilters = useMemo(() => {
    return Object.keys(filters).some(key => filters[key as keyof AuditLogFilter] !== undefined && filters[key as keyof AuditLogFilter] !== '');
  }, [filters]);

  // 表格列定义
  const columns: any[] = [
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (text) => (
        <Tooltip title={dayjs(text).format('YYYY-MM-DD HH:mm:ss')}>
          <Text>{dayjs(text).format('MM-DD HH:mm')}</Text>
        </Tooltip>
      ),
      sorter: (a, b) => dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
    },
    {
      title: '用户',
      dataIndex: 'user_name',
      key: 'user_name',
      width: 100,
      render: (name, record) => (
        <Space>
          <UserOutlined />
          <Text>{name || `用户${record.user_id}`}</Text>
        </Space>
      ),
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      width: 100,
      render: (action) => (
        <Tag color={getActionColor(action)}>
          {getActionText(action)}
        </Tag>
      ),
      filters: [
        { text: '创建', value: 'create' },
        { text: '更新', value: 'update' },
        { text: '删除', value: 'delete' },
        { text: '软删除', value: 'soft_delete' },
        { text: '恢复', value: 'restore' },
        { text: '永久删除', value: 'hard_delete' },
        { text: '登录', value: 'login' },
        { text: '登出', value: 'logout' },
      ],
      onFilter: (value, record) => record.action === value,
    },
    {
      title: '实体类型',
      dataIndex: 'entity_type',
      key: 'entity_type',
      width: 100,
      render: (entityType) => (
        <Space>
          <FileTextOutlined />
          <Text>{getEntityTypeText(entityType)}</Text>
        </Space>
      ),
      filters: [
        { text: '项目', value: 'project' },
        { text: '任务', value: 'task' },
        { text: '用户', value: 'user' },
      ],
      onFilter: (value, record) => record.entity_type === value,
    },
    {
      title: '实体ID',
      dataIndex: 'entity_id',
      key: 'entity_id',
      width: 80,
    },
    {
      title: 'IP地址',
      dataIndex: 'ip_address',
      key: 'ip_address',
      width: 120,
      render: (ip) => ip || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status) => {
        const color = status === 'success' ? 'green' : status === 'error' ? 'red' : 'default';
        return status ? <Tag color={color}>{status}</Tag> : '-';
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => showLogDetail(record)}
          >
            详情
          </Button>
        </Space>
      ),
    },
  ];

  // 图表颜色
  const CHART_COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#fa8c16', '#13c2c2', '#eb2f96'];

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      {/* 标题和控制栏 */}
      <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>
            <FileTextOutlined style={{ marginRight: '8px' }} />
            系统审计日志
          </Title>
        </Col>
        <Col>
          <Space size="middle">
            <Badge dot={hasActiveFilters}>
              <Button 
                icon={<FilterOutlined />} 
                onClick={() => setFilterVisible(true)}
              >
                高级筛选
              </Button>
            </Badge>
            <Button 
              icon={<BarChartOutlined />} 
              onClick={() => {
                setStatsVisible(true);
                loadStats();
              }}
            >
              统计分析
            </Button>
            <Button 
              icon={<DownloadOutlined />} 
              onClick={() => exportData('csv')}
              disabled={auditLogs.length === 0}
            >
              导出CSV
            </Button>
            <Tooltip title={autoRefresh ? '关闭自动刷新' : '开启自动刷新'}>
              <Switch
                checkedChildren={<SyncOutlined />}
                unCheckedChildren={<ClockCircleOutlined />}
                checked={autoRefresh}
                onChange={setAutoRefresh}
              />
            </Tooltip>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={refreshData}
              loading={loading}
            >
              刷新
            </Button>
          </Space>
        </Col>
      </Row>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总事件数"
              value={total}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="今日事件"
              value={stats?.timeline_data?.find(d => d.date === dayjs().format('YYYY-MM-DD'))?.count || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="活跃用户"
              value={stats?.unique_users || 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="错误率"
              value={stats?.error_rate || 0}
              suffix="%"
              prefix={<SettingOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 活动筛选器提示 */}
      {hasActiveFilters && (
        <Alert
          message={
            <Space>
              <span>当前筛选器已激活</span>
              <Button type="link" size="small" onClick={clearFilters}>
                清除所有筛选器
              </Button>
            </Space>
          }
          type="info"
          showIcon
          closable
          style={{ marginBottom: '16px' }}
        />
      )}

      {/* 数据表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={auditLogs}
          loading={loading}
          rowKey="id"
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            onChange: (page, size) => {
              setPageSize(size || 20);
              loadAuditLogs(page, size);
            },
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
          scroll={{ x: 1200 }}
          size="small"
        />
      </Card>

      {/* 筛选器抽屉 */}
      <Drawer
        title="高级筛选器"
        placement="right"
        onClose={() => setFilterVisible(false)}
        open={filterVisible}
        width={400}
        zIndex={1001}
        extra={
          <Space>
            <Button onClick={() => setTempFilters({})}>重置</Button>
            <Button type="primary" onClick={applyFilters}>应用</Button>
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Text strong>操作类型</Text>
            <Select
              style={{ width: '100%', marginTop: '8px' }}
              placeholder="选择操作类型"
              value={tempFilters.action}
              onChange={(value) => setTempFilters({...tempFilters, action: value})}
              allowClear
            >
              <Option value="create">创建</Option>
              <Option value="update">更新</Option>
              <Option value="delete">删除</Option>
              <Option value="soft_delete">软删除</Option>
              <Option value="restore">恢复</Option>
              <Option value="hard_delete">永久删除</Option>
              <Option value="login">登录</Option>
              <Option value="logout">登出</Option>
            </Select>
          </div>

          <div>
            <Text strong>实体类型</Text>
            <Select
              style={{ width: '100%', marginTop: '8px' }}
              placeholder="选择实体类型"
              value={tempFilters.entity_type}
              onChange={(value) => setTempFilters({...tempFilters, entity_type: value})}
              allowClear
            >
              <Option value="project">项目</Option>
              <Option value="task">任务</Option>
              <Option value="user">用户</Option>
            </Select>
          </div>

          <div>
            <Text strong>时间范围</Text>
            <RangePicker
              style={{ width: '100%', marginTop: '8px' }}
              value={tempFilters.start_date && tempFilters.end_date ? [dayjs(tempFilters.start_date), dayjs(tempFilters.end_date)] : undefined}
              onChange={(dates) => {
                if (dates) {
                  setTempFilters({
                    ...tempFilters, 
                    start_date: dates[0]?.format('YYYY-MM-DD'), 
                    end_date: dates[1]?.format('YYYY-MM-DD')
                  });
                } else {
                  setTempFilters({
                    ...tempFilters,
                    start_date: undefined,
                    end_date: undefined
                  });
                }
              }}
              format="YYYY-MM-DD"
            />
          </div>

          <div>
            <Text strong>IP地址</Text>
            <Input
              style={{ marginTop: '8px' }}
              placeholder="输入IP地址"
              value={tempFilters.ip_address}
              onChange={(e) => setTempFilters({...tempFilters, ip_address: e.target.value})}
              allowClear
            />
          </div>

          <div>
            <Text strong>搜索文本</Text>
            <Input
              style={{ marginTop: '8px' }}
              placeholder="搜索操作、实体、用户等..."
              value={tempFilters.search}
              onChange={(e) => setTempFilters({...tempFilters, search: e.target.value})}
              allowClear
              prefix={<SearchOutlined />}
            />
          </div>

          <div>
            <Text strong>状态</Text>
            <Select
              style={{ width: '100%', marginTop: '8px' }}
              placeholder="选择状态"
              value={tempFilters.status}
              onChange={(value) => setTempFilters({...tempFilters, status: value})}
              allowClear
            >
              <Option value="success">成功</Option>
              <Option value="error">错误</Option>
            </Select>
          </div>
        </Space>
      </Drawer>

      {/* 统计分析抽屉 */}
      <Drawer
        title="统计分析"
        placement="right"
        onClose={() => setStatsVisible(false)}
        open={statsVisible}
        width={800}
        zIndex={1001}
      >
        {statsLoading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Spin size="large" />
            <div style={{ marginTop: '16px' }}>加载统计数据中...</div>
          </div>
        ) : stats ? (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {/* 操作类型分布 */}
            <Card title="操作类型分布" size="small">
              {/* Chart temporarily disabled due to missing recharts dependency */}
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
                <Text type="secondary">图表功能暂时不可用</Text>
              </div>
            </Card>

            {/* 时间线分析 */}
            <Card title="7天活动趋势" size="small">
              <div style={{ width: '100%', height: 200 }}>
                <LineChart width={400} height={200} data={stats.timeline_data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#1890ff" strokeWidth={2} />
                </LineChart>
              </div>
            </Card>

            {/* 实体类型分布 */}
            <Card title="实体类型分布" size="small">
              <div style={{ width: '100%', height: 200 }}>
                <BarChart width={400} height={200} data={stats.entities_distribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="entity_type" />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="count" fill="#52c41a" />
                </BarChart>
              </div>
            </Card>

            {/* 活跃用户排行 */}
            {stats.top_users && stats.top_users.length > 0 && (
              <Card title="活跃用户排行" size="small">
                <Space direction="vertical" style={{ width: '100%' }}>
                  {stats.top_users.map((user, index) => (
                    <Row key={user.user_name} justify="space-between" align="middle">
                      <Col>
                        <Badge count={index + 1} style={{ backgroundColor: CHART_COLORS[index] }}>
                          <Text style={{ marginLeft: '24px' }}>{user.user_name}</Text>
                        </Badge>
                      </Col>
                      <Col>
                        <Text strong>{user.count} 次操作</Text>
                      </Col>
                    </Row>
                  ))}
                </Space>
              </Card>
            )}

            {/* 峰值时间分析 */}
            {stats.peak_hours && (
              <Card title="24小时活动分布" size="small">
                <div style={{ width: '100%', height: 200 }}>
                  <BarChart width={400} height={200} data={stats.peak_hours}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="count" fill="#faad14" />
                  </BarChart>
                </div>
              </Card>
            )}
          </Space>
        ) : (
          <Empty description="暂无统计数据" />
        )}
      </Drawer>

      {/* 日志详情模态框 */}
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            {selectedLog && `${getActionText(selectedLog.action)} ${getEntityTypeText(selectedLog.entity_type)} - 详细信息`}
          </Space>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={800}
        zIndex={1002}
      >
        {selectedLog && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Row gutter={16}>
              <Col span={12}>
                <Text strong>操作时间：</Text>
                <div>{dayjs(selectedLog.created_at).format('YYYY-MM-DD HH:mm:ss')}</div>
              </Col>
              <Col span={12}>
                <Text strong>操作类型：</Text>
                <div>
                  <Tag color={getActionColor(selectedLog.action)}>
                    {getActionText(selectedLog.action)}
                  </Tag>
                </div>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Text strong>实体类型：</Text>
                <div>{getEntityTypeText(selectedLog.entity_type)}</div>
              </Col>
              <Col span={12}>
                <Text strong>实体ID：</Text>
                <div>{selectedLog.entity_id}</div>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Text strong>用户：</Text>
                <div>{selectedLog.user_name || `用户${selectedLog.user_id}`}</div>
              </Col>
              <Col span={12}>
                <Text strong>IP地址：</Text>
                <div>{selectedLog.ip_address || '-'}</div>
              </Col>
            </Row>

            {selectedLog.session_id && (
              <div>
                <Text strong>会话ID：</Text>
                <div>
                  <Text code>{selectedLog.session_id}</Text>
                </div>
              </div>
            )}

            {selectedLog.status && (
              <div>
                <Text strong>状态：</Text>
                <div>
                  <Tag color={selectedLog.status === 'success' ? 'green' : selectedLog.status === 'error' ? 'red' : 'default'}>
                    {selectedLog.status}
                  </Tag>
                </div>
              </div>
            )}

            {selectedLog.error_message && (
              <div>
                <Text strong>错误信息：</Text>
                <div style={{ 
                  background: '#fff2f0', 
                  border: '1px solid #ffccc7',
                  padding: '8px', 
                  borderRadius: '4px',
                  color: '#a8071a'
                }}>
                  {selectedLog.error_message}
                </div>
              </div>
            )}

            {selectedLog.description && (
              <div>
                <Text strong>描述：</Text>
                <div>{selectedLog.description}</div>
              </div>
            )}

            {selectedLog.user_agent && (
              <div>
                <Text strong>用户代理：</Text>
                <div style={{ 
                  maxHeight: '100px', 
                  overflow: 'auto', 
                  background: '#f5f5f5', 
                  padding: '8px', 
                  borderRadius: '4px',
                  fontSize: '12px'
                }}>
                  {selectedLog.user_agent}
                </div>
              </div>
            )}

            {selectedLog.entity_data && (
              <div>
                <Text strong>实体数据：</Text>
                <pre style={{ 
                  background: '#f5f5f5', 
                  padding: '12px', 
                  borderRadius: '4px',
                  maxHeight: '300px',
                  overflow: 'auto',
                  fontSize: '12px'
                }}>
                  {JSON.stringify(selectedLog.entity_data, null, 2)}
                </pre>
              </div>
            )}
          </Space>
        )}
      </Modal>
    </div>
  );
};

export default AuditLogPage;