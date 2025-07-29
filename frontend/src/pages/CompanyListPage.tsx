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
  Radio
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
  BuildOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  MailOutlined,
  EnvironmentOutlined,
  DollarOutlined
} from '@ant-design/icons';
// import type { ColumnsType } from 'antd/es/table'; // 暂时注释掉未使用的导入
import { Company, CompanyFilter, PaginationParams } from '../types/company';
import companyService from '../services/companyService';
import { formatCurrency, formatDate, getStatusColor, getPriorityColor } from '../utils/formatters';
import ColumnCustomizer, { ColumnConfig } from '../components/ColumnCustomizer';

const { Search } = Input;
const { Option } = Select;
const { Title, Text } = Typography;

type ViewMode = 'list' | 'card';

// 默认列配置 - 移出组件避免重复创建
const defaultColumns: ColumnConfig[] = [
  {
    key: 'companyName',
    title: '企业名称',
    visible: true,
    required: true,
    description: '企业的名称和基本信息',
    width: 200
  },
  {
    key: 'industry',
    title: '行业',
    visible: true,
    description: '企业所属行业领域',
    width: 100
  },
  {
    key: 'contact',
    title: '联系方式',
    visible: true,
    description: '企业的联系电话和邮箱',
    width: 150
  },
  {
    key: 'status',
    title: '状态',
    visible: true,
    description: '企业当前的状态',
    width: 100
  },
  {
    key: 'priority',
    title: '优先级',
    visible: true,
    description: '企业的优先级等级',
    width: 100
  },
  {
    key: 'scale',
    title: '规模',
    visible: true,
    description: '企业的规模和员工数量',
    width: 120
  },
  {
    key: 'address',
    title: '地址',
    visible: false,
    description: '企业的所在地址',
    width: 150
  },
  {
    key: 'annualContractValue',
    title: '年度合同金额',
    visible: true,
    description: '企业年度合同金额',
    width: 120
  },
  {
    key: 'totalContractValue',
    title: '总合同金额',
    visible: false,
    description: '企业总合同金额',
    width: 120
  },
  {
    key: 'createdAt',
    title: '创建时间',
    visible: true,
    description: '企业在系统中的创建时间',
    width: 120
  },
  {
    key: 'updatedAt',
    title: '更新时间',
    visible: false,
    description: '企业信息最后更新时间',
    width: 120
  },
  {
    key: 'actions',
    title: '操作',
    visible: true,
    required: true,
    description: '查看、编辑、删除操作',
    width: 150
  }
];

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
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortConfig, setSortConfig] = useState<{ field: string; direction: 'asc' | 'desc' } | null>(null);
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>([]);

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
  }, [pagination.current, pagination.pageSize, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  // Handle search
  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // Handle filter change
  const handleFilterChange = useCallback((key: keyof CompanyFilter, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  // Clear filters
  const handleClearFilters = useCallback(() => {
    setFilters({});
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  // Handle pagination change
  const handleTableChange = useCallback((page: number, pageSize?: number) => {
    setPagination(prev => ({
      ...prev,
      current: page,
      pageSize: pageSize || prev.pageSize,
    }));
  }, []);

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

  // 初始化列配置
  useEffect(() => {
    setColumnConfig(defaultColumns);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 处理列配置变更
  const handleColumnConfigChange = useCallback((newColumns: ColumnConfig[]) => {
    setColumnConfig(newColumns);
  }, []);

  // 处理状态过滤器变更
  const handleStatusFilterChange = useCallback((value: string) => {
    handleFilterChange('status', value);
  }, [handleFilterChange]);

  // 处理优先级过滤器变更
  const handlePriorityFilterChange = useCallback((value: string) => {
    handleFilterChange('priority', value);
  }, [handleFilterChange]);

  // 处理行业过滤器变更
  const handleIndustryFilterChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFilterChange('industry', e.target.value);
  }, [handleFilterChange]);

  // 处理视图模式变更
  const handleViewModeChange = useCallback((e: any) => {
    setViewMode(e.target.value);
  }, []);

  // 获取排序后的企业数据
  const getSortedCompanies = () => {
    if (!sortConfig) return companies;
    
    return [...companies].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      // 根据不同字段处理排序值
      switch (sortConfig.field) {
        case 'companyName':
          aValue = a.companyName || '';
          bValue = b.companyName || '';
          break;
        case 'industry':
          aValue = a.industry || '';
          bValue = b.industry || '';
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        case 'priority':
          // 优先级排序：high > medium > low
          const priorityMap = { high: 3, medium: 2, low: 1 };
          aValue = priorityMap[a.priority as keyof typeof priorityMap] || 0;
          bValue = priorityMap[b.priority as keyof typeof priorityMap] || 0;
          break;
        case 'annualContractValue':
        case 'totalContractValue':
          aValue = (a as any)[sortConfig.field] || 0;
          bValue = (b as any)[sortConfig.field] || 0;
          break;
        case 'createdAt':
        case 'updatedAt':
          aValue = new Date((a as any)[sortConfig.field]).getTime();
          bValue = new Date((b as any)[sortConfig.field]).getTime();
          break;
        default:
          aValue = (a as any)[sortConfig.field];
          bValue = (b as any)[sortConfig.field];
      }
      
      let comparison = 0;
      
      // 处理字符串和数字的比较
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue, 'zh-CN');
      } else {
        if (aValue < bValue) {
          comparison = -1;
        } else if (aValue > bValue) {
          comparison = 1;
        }
      }
      
      return sortConfig.direction === 'desc' ? comparison * -1 : comparison;
    });
  };

  // 处理排序
  const handleSort = (field: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    
    if (sortConfig && sortConfig.field === field && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    
    setSortConfig({ field, direction });
  };

  // 表格列配置
  const columns: any[] = columnConfig
    .filter(col => col.visible)
    .map(col => {
      const baseColumn = {
        key: col.key,
        title: col.title,
        width: col.width,
        sorter: col.key !== 'actions', // 除了操作列，所有列都支持排序
        sortOrder: sortConfig?.field === col.key ? sortConfig.direction + 'end' as any : null,
        onHeaderCell: () => ({
          onClick: () => col.key !== 'actions' && handleSort(col.key)
        })
      };

      switch (col.key) {
        case 'companyName':
          return {
            ...baseColumn,
            dataIndex: 'companyName',
            fixed: 'left',
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
          };
        case 'industry':
          return {
            ...baseColumn,
            dataIndex: 'industry',
            render: (text: string) => text || '-',
          };
        case 'contact':
          return {
            ...baseColumn,
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
          };
        case 'status':
          return {
            ...baseColumn,
            dataIndex: 'status',
            render: (status: string, record: Company) => (
              <Tag color={getStatusColor(status)}>
                {record.statusText}
              </Tag>
            ),
          };
        case 'priority':
          return {
            ...baseColumn,
            dataIndex: 'priority',
            render: (priority: string, record: Company) => (
              <Tag color={getPriorityColor(priority)}>
                {record.priorityText}
              </Tag>
            ),
          };
        case 'scale':
          return {
            ...baseColumn,
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
          };
        case 'address':
          return {
            ...baseColumn,
            dataIndex: 'address',
            render: (text: string) => (
              <Tooltip title={text}>
                <div style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <EnvironmentOutlined style={{ marginRight: 4 }} />
                  {text || '-'}
                </div>
              </Tooltip>
            ),
          };
        case 'annualContractValue':
          return {
            ...baseColumn,
            dataIndex: 'annualContractValue',
            render: (value: number) => (
              <span>
                <DollarOutlined style={{ marginRight: 4 }} />
                {value ? formatCurrency(value) : '-'}
              </span>
            ),
          };
        case 'totalContractValue':
          return {
            ...baseColumn,
            dataIndex: 'totalContractValue',
            render: (value: number) => (
              <span>
                <DollarOutlined style={{ marginRight: 4 }} />
                {value ? formatCurrency(value) : '-'}
              </span>
            ),
          };
        case 'createdAt':
          return {
            ...baseColumn,
            dataIndex: 'createdAt',
            render: (date: string) => formatDate(date),
          };
        case 'updatedAt':
          return {
            ...baseColumn,
            dataIndex: 'updatedAt',
            render: (date: string) => formatDate(date),
          };
        case 'actions':
          return {
            ...baseColumn,
            fixed: 'right',
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
          };
        default:
          return baseColumn;
      }
    }) as any[];


  // 渲染卡片视图
  const renderCardView = () => (
    <Row gutter={[16, 16]}>
      {getSortedCompanies().map((company) => (
        <Col xs={24} sm={12} lg={8} xl={6} key={company.id}>
          <Card
            hoverable
            actions={[
              <Tooltip title="查看详情" key="view">
                <Button
                  type="text"
                  icon={<EyeOutlined />}
                  onClick={() => navigate(`/companies/${company.id}`)}
                  style={{ color: '#1890ff' }}
                />
              </Tooltip>,
              <Tooltip title="编辑" key="edit">
                <Button 
                  type="text" 
                  icon={<EditOutlined />}
                  onClick={() => navigate(`/companies/${company.id}/edit`)}
                  style={{ color: '#52c41a' }}
                />
              </Tooltip>,
              <Tooltip title="删除" key="delete">
                <Button 
                  type="text" 
                  icon={<DeleteOutlined />} 
                  onClick={() => handleDelete(company.id, company.companyName)}
                  style={{ color: '#ff4d4f' }}
                  danger
                />
              </Tooltip>,
            ]}
          >
            {/* 企业名称和状态 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontWeight: 500, fontSize: '16px' }}>{company.companyName}</div>
              <Space>
                <Tag color={getStatusColor(company.status)}>
                  {company.statusText}
                </Tag>
                <Tag color={getPriorityColor(company.priority)}>
                  {company.priorityText}
                </Tag>
              </Space>
            </div>

            {/* 企业编号和类型 */}
            <div style={{ marginBottom: 12 }}>
              <Space size="small">
                {company.companyCode && (
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {company.companyCode}
                  </Text>
                )}
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {company.companyTypeText}
                </Text>
              </Space>
            </div>

            {/* 行业 */}
            {company.industry && (
              <div style={{ marginBottom: 12 }}>
                <Text type="secondary" style={{ fontSize: '13px' }}>
                  <BuildOutlined style={{ marginRight: 4 }} />
                  {company.industry}
                </Text>
              </div>
            )}

            {/* 联系方式 */}
            <div style={{ marginBottom: 12 }}>
              {company.mainEmail && (
                <div style={{ fontSize: '12px', marginBottom: 4 }}>
                  <MailOutlined style={{ marginRight: 4 }} />
                  <Text type="secondary">{company.mainEmail}</Text>
                </div>
              )}
              {company.mainPhone && (
                <div style={{ fontSize: '12px' }}>
                  <PhoneOutlined style={{ marginRight: 4 }} />
                  <Text type="secondary">{company.mainPhone}</Text>
                </div>
              )}
            </div>

            {/* 地址 */}
            {company.address && (
              <div style={{ marginBottom: 12 }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  <EnvironmentOutlined style={{ marginRight: 4 }} />
                  {company.address}
                </Text>
              </div>
            )}

            {/* 规模信息 */}
            <div style={{ marginBottom: 12 }}>
              {company.companySizeText && (
                <div style={{ fontSize: '12px', marginBottom: 4 }}>
                  <BuildOutlined style={{ marginRight: 4 }} />
                  <Text type="secondary">{company.companySizeText}</Text>
                </div>
              )}
              {company.employeeCount && (
                <div style={{ fontSize: '12px' }}>
                  <TeamOutlined style={{ marginRight: 4 }} />
                  <Text type="secondary">{company.employeeCount}人</Text>
                </div>
              )}
            </div>

            {/* 合同金额 */}
            {company.annualContractValue && (
              <div style={{ marginBottom: 12 }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  <DollarOutlined style={{ marginRight: 4 }} />
                  年度: {formatCurrency(company.annualContractValue)}
                </Text>
              </div>
            )}
            
            {/* 时间信息 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: '#8c8c8c', fontSize: '12px' }}>
              <div>
                创建: {formatDate(company.createdAt)}
              </div>
              <div>
                更新: {formatDate(company.updatedAt)}
              </div>
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
      dataSource={getSortedCompanies()}
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
                onChange={handleStatusFilterChange}
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
                onChange={handlePriorityFilterChange}
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
                onChange={handleIndustryFilterChange}
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
          
          {/* 视图切换控件和列设置 */}
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
                
                {/* 列自定义功能，仅在列表视图时显示 */}
                {viewMode === 'list' && (
                  <ColumnCustomizer
                    columns={columnConfig}
                    onChange={handleColumnConfigChange}
                    storageKey="company-list-columns"
                  />
                )}
              </div>
            </Col>
            
            <Col>
              <div style={{ color: '#8c8c8c', fontSize: '14px' }}>
                共 {companies.length} 家企业
                {sortConfig && (
                  <span style={{ marginLeft: '8px' }}>
                    (按{columnConfig.find(col => col.key === sortConfig.field)?.title}{sortConfig.direction === 'asc' ? '升序' : '降序'})
                  </span>
                )}
              </div>
            </Col>
          </Row>
        </Card>
      </div>

      {/* Companies Content */}
      <Card>
        {viewMode === 'list' ? renderListView() : renderCardView()}
        
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