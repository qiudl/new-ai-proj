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
  Divider,
  Radio,
  Badge
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  FilterOutlined,
  ReloadOutlined,
  TeamOutlined,
  UserOutlined,
  BankOutlined,
  EnvironmentOutlined,
  AppstoreOutlined,
  UnorderedListOutlined
} from '@ant-design/icons';
import enterpriseService from '../services/enterpriseService';
import { formatDate } from '../utils/formatters';
import {
  Enterprise,
  BUSINESS_TYPE_OPTIONS,
  STATUS_OPTIONS,
  INDUSTRY_TYPE_OPTIONS
} from '../types/enterprise';

const { Search } = Input;
const { Option } = Select;
const { Title, Text } = Typography;

type ViewMode = 'list' | 'card';

// 企业筛选接口
interface EnterpriseFilter {
  search?: string;
  status?: string;
  businessType?: string;
  industryType?: string;
}

const EnterpriseManagementPage: React.FC = () => {
  const navigate = useNavigate();
  
  // 基础状态
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  
  // 分页状态
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total: number) => `共 ${total} 条记录`,
  });
  
  // 筛选状态
  const [filters, setFilters] = useState<EnterpriseFilter>({});

  // 加载企业列表
  const loadEnterprises = useCallback(async () => {
    setLoading(true);
    try {
      // 准备筛选参数
      const filterParams: any = {};
      
      if (filters.search) {
        filterParams.search = filters.search;
      }
      if (filters.status) {
        filterParams.status = filters.status;
      }
      if (filters.businessType) {
        filterParams.business_type = filters.businessType;
      }
      if (filters.industryType) {
        filterParams.industry_type = filters.industryType;
      }
      
      const result = await enterpriseService.getEnterprises(
        pagination.current, 
        pagination.pageSize, 
        filterParams
      );
      
      setEnterprises(result?.data || []);
      setPagination(prev => ({
        ...prev,
        total: result?.pagination?.total || 0,
      }));
    } catch (error) {
      console.error('加载企业列表失败:', error);
      message.error('加载企业列表失败: ' + (error?.message || '未知错误'));
      setEnterprises([]);
      setPagination(prev => ({
        ...prev,
        total: 0,
        current: 1,
      }));
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, filters]);

  useEffect(() => {
    loadEnterprises();
  }, [loadEnterprises]);

  // 处理搜索
  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // 处理筛选变化
  const handleFilterChange = useCallback((key: keyof EnterpriseFilter, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  // 清除筛选
  const handleClearFilters = useCallback(() => {
    setFilters({});
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  // 处理分页变化  
  const handleTableChange = useCallback((page: number, pageSize?: number) => {
    setPagination(prev => ({
      ...(prev || { current: 1, pageSize: 20, total: 0, showSizeChanger: true, showQuickJumper: true, showTotal: (total: number) => `共 ${total} 条记录` }),
      current: page,
      pageSize: pageSize || prev?.pageSize || 20,
    }));
  }, []);

  // 处理视图模式变化
  const handleViewModeChange = (e: any) => {
    setViewMode(e.target.value);
  };

  // 处理删除企业
  const handleDelete = async (id: number, name: string) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除企业"${name}"吗？此操作不可恢复。`,
      okText: '确定',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await enterpriseService.deleteEnterprise(id);
          message.success('企业删除成功');
          loadEnterprises();
        } catch (error) {
          console.error('删除企业失败:', error);
          message.error('删除企业失败');
        }
      },
    });
  };

  // 管理用户
  const handleManageUsers = (enterprise: Enterprise) => {
    navigate(`/enterprises/${enterprise.id}/users`);
  };


  // 状态标签颜色映射
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'inactive': return 'orange';
      case 'suspended': return 'red';
      default: return 'default';
    }
  };

  // 业务类型标签颜色映射
  const getBusinessTypeColor = (businessType: string) => {
    switch (businessType) {
      case 'corporation': return 'blue';
      case 'llc': return 'cyan';
      case 'partnership': return 'purple';
      case 'individual': return 'orange';
      default: return 'default';
    }
  };

  // 表格列定义
  const columns: ColumnsType<Enterprise> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      fixed: 'left',
    },
    {
      title: '企业名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      fixed: 'left',
      render: (text: string, record: Enterprise) => (
        <div>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>
            {text}
          </div>
          <Space size="small">
            {record.code && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {record.code}
              </Text>
            )}
          </Space>
        </div>
      ),
    },
    {
      title: '业务类型',
      dataIndex: 'business_type',
      key: 'business_type',
      render: (text: string, record: Enterprise) => (
        <Tag color={getBusinessTypeColor(text)}>
          {record.business_type_text}
        </Tag>
      ),
    },
    {
      title: '行业类型',
      dataIndex: 'industry_type',
      key: 'industry_type',
      render: (text: string | undefined, record: Enterprise) => (
        text ? (
          <Tag color="geekblue">
            {record.industry_type_text || text}
          </Tag>
        ) : (
          <Text type="secondary">未设置</Text>
        )
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (text: string, record: Enterprise) => (
        <Tag color={getStatusColor(text)}>
          {record.status_text}
        </Tag>
      ),
    },
    {
      title: '用户数',
      dataIndex: 'user_count',
      key: 'user_count',
      render: (count: number) => (
        <Badge count={count} showZero style={{ backgroundColor: '#1890ff' }} />
      ),
    },
    {
      title: '部门数',
      dataIndex: 'department_count',
      key: 'department_count',
      render: (count: number) => (
        <Badge count={count} showZero style={{ backgroundColor: '#52c41a' }} />
      ),
    },
    {
      title: '联系方式',
      key: 'contact',
      render: (_, record: Enterprise) => (
        <div>
          {record.contact_email && (
            <div><Text type="secondary">{record.contact_email}</Text></div>
          )}
          {record.contact_phone && (
            <div><Text type="secondary">{record.contact_phone}</Text></div>
          )}
        </div>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 200,
      render: (_, record: Enterprise) => (
        <Space>
          <Tooltip title="查看详情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/enterprises/${record.id}`)}
            />
          </Tooltip>
          <Tooltip title="管理用户">
            <Button
              type="text"
              icon={<UserOutlined />}
              onClick={() => handleManageUsers(record)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => navigate(`/enterprises/${record.id}/edit`)}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              type="text"
              icon={<DeleteOutlined />}
              danger
              onClick={() => handleDelete(record.id, record.name)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // 渲染卡片视图
  const renderCardView = () => (
    <Row gutter={[16, 16]}>
      {enterprises.map((enterprise) => (
        <Col xs={24} sm={12} lg={8} xl={6} key={enterprise.id}>
          <Card
            size="small"
            hoverable
            actions={[
              <Tooltip title="查看详情" key="view">
                <EyeOutlined onClick={() => navigate(`/enterprises/${enterprise.id}`)} />
              </Tooltip>,
              <Tooltip title="管理用户" key="users">
                <UserOutlined onClick={() => handleManageUsers(enterprise)} />
              </Tooltip>,
              <Tooltip title="编辑" key="edit">
                <EditOutlined onClick={() => navigate(`/enterprises/${enterprise.id}/edit`)} />
              </Tooltip>,
              <Tooltip title="删除" key="delete">
                <DeleteOutlined onClick={() => handleDelete(enterprise.id, enterprise.name)} />
              </Tooltip>
            ]}
          >
            {/* 企业名称 */}
            <div style={{ marginBottom: 12 }}>
              <Text strong style={{ fontSize: '16px' }}>{enterprise.name}</Text>
              {enterprise.code && (
                <div>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {enterprise.code}
                  </Text>
                </div>
              )}
            </div>

            {/* 状态和类型标签 */}
            <div style={{ marginBottom: 12 }}>
              <Space size="small" wrap>
                <Tag color="blue">{enterprise.status_text}</Tag>
                <Tag color="green">{enterprise.business_type_text}</Tag>
                {enterprise.industry_type_text && (
                  <Tag color="geekblue">{enterprise.industry_type_text}</Tag>
                )}
              </Space>
            </div>

            {/* 联系方式 */}
            {(enterprise.contact_email || enterprise.contact_phone) && (
              <div style={{ marginBottom: 12 }}>
                {enterprise.contact_email && (
                  <div style={{ fontSize: '12px', marginBottom: 4 }}>
                    <Text type="secondary">{enterprise.contact_email}</Text>
                  </div>
                )}
                {enterprise.contact_phone && (
                  <div style={{ fontSize: '12px' }}>
                    <Text type="secondary">{enterprise.contact_phone}</Text>
                  </div>
                )}
              </div>
            )}

            {/* 地址 */}
            {enterprise.address && (
              <div style={{ marginBottom: 12 }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  <EnvironmentOutlined style={{ marginRight: 4 }} />
                  {enterprise.address}
                </Text>
              </div>
            )}

            {/* 统计信息 */}
            <div style={{ marginBottom: 12 }}>
              <Space size="large">
                <span style={{ fontSize: '12px' }}>
                  <UserOutlined style={{ marginRight: 4 }} />
                  <Text type="secondary">{enterprise.user_count || 0}用户</Text>
                </span>
                <span style={{ fontSize: '12px' }}>
                  <TeamOutlined style={{ marginRight: 4 }} />
                  <Text type="secondary">{enterprise.department_count || 0}部门</Text>
                </span>
              </Space>
            </div>
            
            {/* 时间信息 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: '#8c8c8c', fontSize: '12px' }}>
              <div>
                创建: {formatDate(enterprise.created_at)}
              </div>
              {enterprise.updated_at && (
                <div>
                  更新: {formatDate(enterprise.updated_at)}
                </div>
              )}
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );

  // 渲染列表视图
  const renderListView = () => (
    <Table
      columns={columns}
      dataSource={enterprises}
      rowKey="id"
      loading={loading}
      pagination={false}
      scroll={{ x: 1400 }}
      size="middle"
    />
  );

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>企业客户管理</Title>

        {/* Filters and Actions */}
        <Card style={{ marginBottom: '16px' }}>
          <Row gutter={16} align="middle" style={{ marginBottom: '16px' }}>
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
                {STATUS_OPTIONS.map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col>
              <Select
                placeholder="业务类型"
                allowClear
                style={{ width: 120 }}
                onChange={(value) => handleFilterChange('businessType', value)}
                value={filters.businessType}
              >
                {BUSINESS_TYPE_OPTIONS.map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col>
              <Select
                placeholder="行业类型"
                allowClear
                style={{ width: 120 }}
                onChange={(value) => handleFilterChange('industryType', value)}
                value={filters.industryType}
              >
                {INDUSTRY_TYPE_OPTIONS.map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
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
                    loadEnterprises();
                  }}
                >
                  刷新
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => navigate('/enterprises/create')}
                >
                  新建企业
                </Button>
              </Space>
            </Col>
          </Row>
          
          {/* 视图切换控件 */}
          <Row justify="space-between" align="middle">
            <Col>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: '#8c8c8c' }}>视图模式:</span>
                <Radio.Group 
                  value={viewMode} 
                  onChange={handleViewModeChange}
                  buttonStyle="solid"
                  size="small"
                >
                  <Radio.Button value="list">
                    <UnorderedListOutlined /> 列表
                  </Radio.Button>
                  <Radio.Button value="card">
                    <AppstoreOutlined /> 卡片
                  </Radio.Button>
                </Radio.Group>
              </div>
            </Col>
            
            <Col>
              <div style={{ color: '#8c8c8c', fontSize: '14px' }}>
                共 {enterprises.length} 家企业
              </div>
            </Col>
          </Row>
        </Card>

        {/* 内容区域 */}
        {viewMode === 'card' ? renderCardView() : renderListView()}
        
        <Divider />
        
        <div style={{ textAlign: 'right' }}>
          <Pagination
            current={pagination?.current || 1}
            pageSize={pagination?.pageSize || 20}
            total={pagination?.total || 0}
            showSizeChanger={pagination?.showSizeChanger || true}
            showQuickJumper={pagination?.showQuickJumper || true}
            showTotal={pagination?.showTotal || ((total: number) => `共 ${total} 条记录`)}
            onChange={handleTableChange}
            onShowSizeChange={handleTableChange}
          />
        </div>
      </div>
    </div>
  );
};

export default EnterpriseManagementPage;
