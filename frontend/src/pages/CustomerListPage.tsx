import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Button,
  Input,
  Select,
  Space,
  Card,
  Tag,
  Pagination,
  Modal,
  message,
  Tooltip,
  Typography,
  Row,
  Col,
  Statistic,
  Divider
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  FilterOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Customer, CustomerFilter, PaginationParams } from '../types/customer';
import customerService from '../services/customerService';
import { formatCurrency, formatDate, getStatusColor, getPriorityColor } from '../utils/formatters';

const { Search } = Input;
const { Option } = Select;
const { Title, Text } = Typography;

const CustomerListPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total: number) => `共 ${total} 条记录`,
  });
  const [filters, setFilters] = useState<CustomerFilter>({});
  const [stats, setStats] = useState<any>(null);

  // Load customers data
  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const paginationParams: PaginationParams = {
        page: pagination.current,
        pageSize: pagination.pageSize,
      };

      const response = await customerService.getCustomers(paginationParams, filters);
      setCustomers(response.data);
      setPagination(prev => ({
        ...prev,
        total: response.pagination.total,
        current: response.pagination.page,
      }));
    } catch (error) {
      console.error('Failed to load customers:', error);
      message.error('加载客户列表失败');
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, filters]);

  // Load customer statistics
  const loadStats = useCallback(async () => {
    try {
      const statsData = await customerService.getCustomerStats();
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load customer stats:', error);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Handle search
  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // Handle filter change
  const handleFilterChange = (key: keyof CustomerFilter, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // Clear filters
  const handleClearFilters = () => {
    setFilters({});
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // Handle pagination change
  const handleTableChange = (page: number, pageSize?: number) => {
    setPagination(prev => ({
      ...prev,
      current: page,
      pageSize: pageSize || prev.pageSize,
    }));
  };

  // Handle delete customer
  const handleDelete = async (id: number, name: string) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除客户"${name}"吗？此操作不可恢复。`,
      okText: '确定',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await customerService.deleteCustomer(id);
          message.success('客户删除成功');
          loadCustomers();
          loadStats();
        } catch (error) {
          console.error('Failed to delete customer:', error);
          message.error('删除客户失败');
        }
      },
    });
  };

  // Table columns configuration
  const columns: ColumnsType<Customer> = [
    {
      title: '客户名称',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left',
      width: 150,
      render: (text: string, record: Customer) => (
        <div>
          <div style={{ fontWeight: 500 }}>{text}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.company}
          </Text>
        </div>
      ),
    },
    {
      title: '行业',
      dataIndex: 'industry',
      key: 'industry',
      width: 100,
    },
    {
      title: '联系人',
      dataIndex: 'contactPerson',
      key: 'contactPerson',
      width: 100,
      render: (text: string, record: Customer) => (
        <div>
          <div>{text}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.email}
          </Text>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap = {
          active: '活跃',
          inactive: '非活跃',
          potential: '潜在',
          closed: '已关闭'
        };
        return (
          <Tag color={getStatusColor(status)}>
            {statusMap[status as keyof typeof statusMap] || status}
          </Tag>
        );
      },
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority: string) => {
        const priorityMap = {
          high: '高',
          medium: '中',
          low: '低'
        };
        return (
          <Tag color={getPriorityColor(priority)}>
            {priorityMap[priority as keyof typeof priorityMap] || priority}
          </Tag>
        );
      },
    },
    {
      title: '合同金额',
      dataIndex: 'contractValue',
      key: 'contractValue',
      width: 120,
      render: (value: number) => value ? formatCurrency(value) : '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date: string) => formatDate(date),
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 150,
      render: (_, record: Customer) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              size="small"
              onClick={() => {
                // TODO: Navigate to customer detail page
                message.info('查看客户详情功能即将推出');
              }}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              onClick={() => {
                // TODO: Navigate to customer edit page
                message.info('编辑客户功能即将推出');
              }}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              size="small"
              onClick={() => handleDelete(record.id, record.name)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>客户管理</Title>

        {/* Statistics Cards */}
        {stats && (
          <Row gutter={16} style={{ marginBottom: '24px' }}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="总客户数"
                  value={stats.totalCustomers}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="活跃客户"
                  value={stats.activeCustomers}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="潜在客户"
                  value={stats.potentialCustomers}
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="合同总额"
                  value={stats.totalContractValue}
                  formatter={(value) => formatCurrency(Number(value))}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Card>
            </Col>
          </Row>
        )}

        {/* Filters and Actions */}
        <Card style={{ marginBottom: '16px' }}>
          <Row gutter={16} align="middle">
            <Col flex="300px">
              <Search
                placeholder="搜索客户名称、公司或联系人"
                allowClear
                enterButton={<SearchOutlined />}
                onSearch={handleSearch}
              />
            </Col>
            <Col>
              <Select
                placeholder="状态"
                allowClear
                style={{ width: 120 }}
                onChange={(value) => handleFilterChange('status', value)}
                value={filters.status}
              >
                {customerService.getStatusOptions().map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col>
              <Select
                placeholder="优先级"
                allowClear
                style={{ width: 120 }}
                onChange={(value) => handleFilterChange('priority', value)}
                value={filters.priority}
              >
                {customerService.getPriorityOptions().map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col>
              <Input
                placeholder="行业"
                allowClear
                style={{ width: 120 }}
                onChange={(e) => handleFilterChange('industry', e.target.value)}
                value={filters.industry}
              />
            </Col>
            <Col>
              <Space>
                <Button
                  icon={<FilterOutlined />}
                  onClick={handleClearFilters}
                >
                  清除筛选
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    loadCustomers();
                    loadStats();
                  }}
                >
                  刷新
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    // TODO: Navigate to create customer page
                    message.info('创建客户功能即将推出');
                  }}
                >
                  新建客户
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>
      </div>

      {/* Customers Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={customers}
          rowKey="id"
          loading={loading}
          pagination={false}
          scroll={{ x: 1200 }}
          size="middle"
        />
        
        <Divider />
        
        <div style={{ textAlign: 'right' }}>
          <Pagination
            current={pagination.current}
            pageSize={pagination.pageSize}
            total={pagination.total}
            showSizeChanger={pagination.showSizeChanger}
            showQuickJumper={pagination.showQuickJumper}
            showTotal={pagination.showTotal}
            onChange={handleTableChange}
            onShowSizeChange={handleTableChange}
          />
        </div>
      </Card>
    </div>
  );
};

export default CustomerListPage;