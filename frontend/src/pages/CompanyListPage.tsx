import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Divider
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  FilterOutlined,
  ReloadOutlined,
  TeamOutlined,
  PhoneOutlined,
  BuildOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Company, CompanyFilter, PaginationParams } from '../types/company';
import companyService from '../services/companyService';
import { formatCurrency, formatDate, getStatusColor, getPriorityColor } from '../utils/formatters';

const { Search } = Input;
const { Option } = Select;
const { Title, Text } = Typography;

const CompanyListPage: React.FC = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total: number) => `共 ${total} 条记录`,
  });
  const [filters, setFilters] = useState<CompanyFilter>({});

  // Load companies data
  const loadCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const paginationParams: PaginationParams = {
        page: pagination.current,
        pageSize: pagination.pageSize,
      };

      const response = await companyService.getCompanies(paginationParams, filters);
      setCompanies(response.data);
      setPagination(prev => ({
        ...prev,
        total: response.pagination.total,
        current: response.pagination.page,
      }));
    } catch (error) {
      console.error('Failed to load companies:', error);
      message.error('加载企业列表失败');
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, filters]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  // Handle search
  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // Handle filter change
  const handleFilterChange = (key: keyof CompanyFilter, value: string) => {
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

  // Handle delete company
  const handleDelete = async (id: number, name: string) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除企业"${name}"吗？此操作不可恢复。`,
      okText: '确定',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await companyService.deleteCompany(id);
          message.success('企业删除成功');
          loadCompanies();
        } catch (error) {
          console.error('Failed to delete company:', error);
          message.error('删除企业失败');
        }
      },
    });
  };

  // Table columns configuration
  const columns: ColumnsType<Company> = [
    {
      title: '企业名称',
      dataIndex: 'companyName',
      key: 'companyName',
      fixed: 'left',
      width: 200,
      render: (text: string, record: Company) => (
        <div>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>{text}</div>
          <Space size="small">
            {record.companyCode && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {record.companyCode}
              </Text>
            )}
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.companyTypeText}
            </Text>
          </Space>
        </div>
      ),
    },
    {
      title: '行业',
      dataIndex: 'industry',
      key: 'industry',
      width: 100,
      render: (text: string) => text || '-',
    },
    {
      title: '联系方式',
      key: 'contact',
      width: 150,
      render: (_, record: Company) => (
        <div>
          {record.mainEmail && (
            <div style={{ fontSize: '12px', marginBottom: 2 }}>
              <Text type="secondary">{record.mainEmail}</Text>
            </div>
          )}
          {record.mainPhone && (
            <div style={{ fontSize: '12px' }}>
              <PhoneOutlined style={{ marginRight: 4 }} />
              <Text type="secondary">{record.mainPhone}</Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string, record: Company) => (
        <Tag color={getStatusColor(status)}>
          {record.statusText}
        </Tag>
      ),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority: string, record: Company) => (
        <Tag color={getPriorityColor(priority)}>
          {record.priorityText}
        </Tag>
      ),
    },
    {
      title: '规模',
      key: 'scale',
      width: 120,
      render: (_, record: Company) => (
        <div>
          {record.companySizeText && (
            <div style={{ fontSize: '12px', marginBottom: 2 }}>
              <BuildOutlined style={{ marginRight: 4 }} />
              <Text type="secondary">{record.companySizeText}</Text>
            </div>
          )}
          {record.employeeCount && (
            <div style={{ fontSize: '12px' }}>
              <TeamOutlined style={{ marginRight: 4 }} />
              <Text type="secondary">{record.employeeCount}人</Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: '年度合同金额',
      dataIndex: 'annualContractValue',
      key: 'annualContractValue',
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
      render: (_, record: Company) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              size="small"
              onClick={() => {
                navigate(`/companies/${record.id}`);
              }}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              onClick={() => {
                navigate(`/companies/${record.id}/edit`);
              }}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              size="small"
              onClick={() => handleDelete(record.id, record.companyName)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>企业客户管理</Title>

        {/* Filters and Actions */}
        <Card style={{ marginBottom: '16px' }}>
          <Row gutter={16} align="middle">
            <Col flex="300px">
              <Search
                placeholder="搜索企业名称、邮箱或电话"
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
                {companyService.getStatusOptions().map(option => (
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
                {companyService.getPriorityOptions().map(option => (
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
                    loadCompanies();
                  }}
                >
                  刷新
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    navigate('/companies/create');
                  }}
                >
                  新建企业
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>
      </div>

      {/* Companies Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={companies}
          rowKey="id"
          loading={loading}
          pagination={false}
          scroll={{ x: 1400 }}
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

export default CompanyListPage;