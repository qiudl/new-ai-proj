/**
 * 需求列表页面
 * Requirement List Page
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Card,
  Table,
  Space,
  Tag,
  message,
  Modal,
  Spin,
  Typography,
  Tooltip,
  Input,
  Select,
  DatePicker,
  Row,
  Col,
  Divider,
  Badge,
  List,
  Dropdown,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  SearchOutlined,
  FilterOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  MoreOutlined,
  CalendarOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import { requirementApi } from '../services/requirementService';
import {
  Requirement,
  RequirementStatus,
  RequirementPriority,
  RequirementFilters,
  REQUIREMENT_STATUS_CONFIG,
  REQUIREMENT_PRIORITY_CONFIG,
} from '../types/requirement';
import { useResponsive, getResponsiveTableScroll } from '../hooks/useResponsive';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

/**
 * 需求列表页面组件
 */
const RequirementListPage: React.FC = () => {
  const navigate = useNavigate();
  const responsive = useResponsive();
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  // 筛选参数
  const [filters, setFilters] = useState<RequirementFilters>({
    page: 1,
    page_size: 20,
    sort_by: 'created_at',
    sort_order: 'desc',
  });

  /**
   * 加载需求列表
   */
  const loadRequirements = useCallback(async () => {
    try {
      setLoading(true);
      const response = await requirementApi.getRequirements(filters);
      setRequirements(response.data || []);
      setTotal(response.total || 0);
    } catch (error: any) {
      console.error('Error loading requirements:', error);
      message.error(error?.message || '加载需求列表失败');
      setRequirements([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadRequirements();
  }, [loadRequirements]);

  /**
   * 处理创建需求
   */
  const handleCreateRequirement = () => {
    navigate('/requirements/create');
  };

  /**
   * 处理查看需求
   */
  const handleViewRequirement = (record: Requirement) => {
    navigate(`/requirements/${record.id}`);
  };

  /**
   * 处理编辑需求
   */
  const handleEditRequirement = (record: Requirement) => {
    navigate(`/requirements/${record.id}/edit`);
  };

  /**
   * 处理删除需求
   */
  const handleDeleteRequirement = (record: Requirement) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除需求 "${record.title}" 吗？此操作无法撤销。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await requirementApi.deleteRequirement(record.id);
          message.success('需求已删除');
          loadRequirements();
        } catch (error: any) {
          console.error('Error deleting requirement:', error);
          message.error(error?.message || '删除需求失败');
        }
      },
    });
  };

  /**
   * 处理提交需求
   */
  const handleSubmitRequirement = async (record: Requirement) => {
    try {
      await requirementApi.submitRequirement(record.id);
      message.success('需求已提交评审');
      loadRequirements();
    } catch (error: any) {
      console.error('Error submitting requirement:', error);
      message.error(error?.message || '提交需求失败');
    }
  };

  /**
   * 处理筛选变更
   */
  const handleFilterChange = (key: keyof RequirementFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1, // 重置到第一页
    }));
  };

  /**
   * 处理重置筛选
   */
  const handleResetFilters = () => {
    setFilters({
      page: 1,
      page_size: 20,
      sort_by: 'created_at',
      sort_order: 'desc',
    });
  };

  /**
   * 处理日期范围变更
   */
  const handleDateRangeChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates && dates[0] && dates[1]) {
      setFilters((prev) => ({
        ...prev,
        due_after: dates[0].format('YYYY-MM-DD'),
        due_before: dates[1].format('YYYY-MM-DD'),
        page: 1,
      }));
    } else {
      setFilters((prev) => ({
        ...prev,
        due_after: undefined,
        due_before: undefined,
        page: 1,
      }));
    }
  };

  /**
   * 获取状态配置
   */
  const getStatusConfig = (status: string) => {
    return REQUIREMENT_STATUS_CONFIG[status as RequirementStatus] || {
      label: status,
      color: 'default',
      icon: '❓',
    };
  };

  /**
   * 获取优先级配置
   */
  const getPriorityConfig = (priority: string) => {
    return REQUIREMENT_PRIORITY_CONFIG[priority as RequirementPriority] || {
      label: priority,
      color: 'default',
      icon: '➡️',
    };
  };

  /**
   * 渲染移动端卡片视图
   */
  const renderMobileList = () => {
    return (
      <List
        dataSource={requirements}
        loading={loading}
        locale={{ emptyText: '暂无需求' }}
        pagination={{
          current: filters.page,
          pageSize: filters.page_size,
          total: total,
          showSizeChanger: false,
          onChange: (page, pageSize) => {
            setFilters((prev) => ({
              ...prev,
              page,
              page_size: pageSize,
            }));
          },
          simple: responsive.isXs, // 超小屏使用简单分页
        }}
        renderItem={(requirement) => {
          const statusConfig = getStatusConfig(requirement.status);
          const priorityConfig = getPriorityConfig(requirement.priority);

          // 移动端操作菜单
          const actionMenuItems: MenuProps['items'] = [
            {
              key: 'view',
              label: '查看详情',
              icon: <EyeOutlined />,
              onClick: () => handleViewRequirement(requirement),
            },
            {
              key: 'edit',
              label: '编辑',
              icon: <EditOutlined />,
              onClick: () => handleEditRequirement(requirement),
              disabled:
                requirement.status === RequirementStatus.Converted ||
                requirement.status === RequirementStatus.Archived,
            },
            ...(requirement.status === RequirementStatus.Draft
              ? [
                  {
                    key: 'submit',
                    label: '提交评审',
                    icon: <CheckCircleOutlined />,
                    onClick: () => handleSubmitRequirement(requirement),
                  },
                ]
              : []),
            {
              type: 'divider' as const,
            },
            {
              key: 'delete',
              label: '删除',
              icon: <DeleteOutlined />,
              danger: true,
              onClick: () => handleDeleteRequirement(requirement),
              disabled: requirement.status === RequirementStatus.Converted,
            },
          ];

          return (
            <List.Item
              key={requirement.id}
              style={{ padding: '12px 0' }}
            >
              <Card
                size="small"
                style={{ width: '100%' }}
                onClick={() => handleViewRequirement(requirement)}
                hoverable
              >
                {/* 标题和状态 */}
                <div style={{ marginBottom: '8px' }}>
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
                      <Text strong style={{ fontSize: '14px' }}>
                        {requirement.display_id}
                      </Text>
                      <Dropdown
                        menu={{ items: actionMenuItems }}
                        trigger={['click']}
                        placement="bottomRight"
                      >
                        <Button
                          type="text"
                          size="small"
                          icon={<MoreOutlined />}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Dropdown>
                    </Space>
                    <Text
                      ellipsis={{ tooltip: requirement.title }}
                      style={{ fontSize: '13px', fontWeight: 500 }}
                    >
                      {requirement.title}
                    </Text>
                  </Space>
                </div>

                {/* 状态和优先级标签 */}
                <div style={{ marginBottom: '8px' }}>
                  <Space size={4} wrap>
                    <Tag color={statusConfig.color} style={{ margin: 0 }}>
                      {statusConfig.icon} {statusConfig.label}
                    </Tag>
                    <Tag color={priorityConfig.color} style={{ margin: 0 }}>
                      {priorityConfig.icon} {priorityConfig.label}
                    </Tag>
                  </Space>
                </div>

                {/* 详细信息 */}
                <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                  <Space direction="vertical" size={2} style={{ width: '100%' }}>
                    {requirement.project_name && (
                      <Space size={4}>
                        <FileTextOutlined />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {requirement.project_name}
                        </Text>
                      </Space>
                    )}
                    <Space size={4}>
                      <UserOutlined />
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {requirement.submitter_name || '未知'}
                      </Text>
                    </Space>
                    {requirement.due_date && (
                      <Space size={4}>
                        <CalendarOutlined />
                        <Text
                          type={dayjs(requirement.due_date).isBefore(dayjs(), 'day') ? 'danger' : 'secondary'}
                          style={{ fontSize: '12px' }}
                        >
                          {dayjs(requirement.due_date).format('YYYY-MM-DD')}
                        </Text>
                      </Space>
                    )}
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {dayjs(requirement.created_at).format('YYYY-MM-DD HH:mm')}
                    </Text>
                  </Space>
                </div>
              </Card>
            </List.Item>
          );
        }}
      />
    );
  };

  /**
   * 表格列配置
   */
  const columns: ColumnsType<Requirement> = [
    {
      title: '需求编号',
      dataIndex: 'display_id',
      key: 'display_id',
      width: 120,
      fixed: 'left',
      render: (text: string) => (
        <Space align="center">
          <FileTextOutlined style={{ color: '#1890ff' }} />
          <span style={{ fontWeight: 500, color: '#1890ff' }}>{text}</span>
        </Space>
      ),
    },
    {
      title: '需求标题',
      dataIndex: 'title',
      key: 'title',
      width: 250,
      ellipsis: {
        showTitle: false,
      },
      render: (text: string, record: Requirement) => (
        <Tooltip title={text}>
          <Button
            type="link"
            onClick={() => handleViewRequirement(record)}
            style={{ padding: 0, fontSize: '14px', fontWeight: 500 }}
          >
            {text}
          </Button>
        </Tooltip>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => {
        const config = getStatusConfig(status);
        return (
          <Tag color={config.color}>
            {config.icon} {config.label}
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
        const config = getPriorityConfig(priority);
        return (
          <Tag color={config.color}>
            {config.icon} {config.label}
          </Tag>
        );
      },
    },
    {
      title: '所属项目',
      dataIndex: 'project_name',
      key: 'project_name',
      width: 150,
      ellipsis: true,
      render: (text?: string) => text || <span style={{ color: '#8c8c8c' }}>未关联</span>,
    },
    {
      title: '提交人',
      dataIndex: 'submitter_name',
      key: 'submitter_name',
      width: 120,
      ellipsis: true,
    },
    {
      title: '评审人',
      dataIndex: 'reviewer_name',
      key: 'reviewer_name',
      width: 120,
      ellipsis: true,
      render: (text?: string) => text || <span style={{ color: '#8c8c8c' }}>未分配</span>,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '截止日期',
      dataIndex: 'due_date',
      key: 'due_date',
      width: 120,
      render: (date?: string) => {
        if (!date) return <span style={{ color: '#8c8c8c' }}>无</span>;
        const dueDate = dayjs(date);
        const isOverdue = dueDate.isBefore(dayjs(), 'day');
        return (
          <span style={{ color: isOverdue ? '#ff4d4f' : undefined }}>
            {dueDate.format('YYYY-MM-DD')}
          </span>
        );
      },
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 180,
      render: (_, record: Requirement) => (
        <Space size="small">
          <Tooltip title="查看">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewRequirement(record)}
              style={{ color: '#1890ff' }}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditRequirement(record)}
              style={{ color: '#52c41a' }}
              disabled={record.status === RequirementStatus.Converted || record.status === RequirementStatus.Archived}
            />
          </Tooltip>
          {record.status === RequirementStatus.Draft && (
            <Tooltip title="提交评审">
              <Button
                type="text"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleSubmitRequirement(record)}
                style={{ color: '#1890ff' }}
              />
            </Tooltip>
          )}
          <Tooltip title="删除">
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteRequirement(record)}
              style={{ color: '#ff4d4f' }}
              danger
              disabled={record.status === RequirementStatus.Converted}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div
          style={{
            display: 'flex',
            flexDirection: responsive.isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: responsive.isMobile ? 'stretch' : 'center',
            marginBottom: '16px',
            gap: responsive.isMobile ? '12px' : '0',
          }}
        >
          <div>
            <Title level={responsive.isMobile ? 3 : 2} style={{ margin: 0 }}>
              需求管理
            </Title>
            <p style={{ color: '#8c8c8c', margin: '4px 0 0 0' }}>查看和管理所有需求</p>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateRequirement}
            block={responsive.isMobile}
          >
            创建需求
          </Button>
        </div>

        {/* 筛选条件 */}
        <Card size="small" style={{ marginBottom: '16px' }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Input
                placeholder="搜索需求标题或描述"
                prefix={<SearchOutlined />}
                allowClear
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Select
                mode="multiple"
                placeholder="筛选状态"
                allowClear
                style={{ width: '100%' }}
                value={filters.status}
                onChange={(value) => handleFilterChange('status', value)}
              >
                {Object.entries(REQUIREMENT_STATUS_CONFIG).map(([key, config]) => (
                  <Option key={key} value={key}>
                    {config.icon} {config.label}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Select
                mode="multiple"
                placeholder="筛选优先级"
                allowClear
                style={{ width: '100%' }}
                value={filters.priority}
                onChange={(value) => handleFilterChange('priority', value)}
              >
                {Object.entries(REQUIREMENT_PRIORITY_CONFIG).map(([key, config]) => (
                  <Option key={key} value={key}>
                    {config.icon} {config.label}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <RangePicker
                style={{ width: '100%' }}
                placeholder={['截止开始日期', '截止结束日期']}
                value={
                  filters.due_after && filters.due_before
                    ? [dayjs(filters.due_after), dayjs(filters.due_before)]
                    : null
                }
                onChange={handleDateRangeChange}
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Button
                icon={<SyncOutlined />}
                onClick={handleResetFilters}
                block={responsive.isMobile}
              >
                重置筛选
              </Button>
            </Col>
          </Row>
        </Card>

        {/* 统计信息 */}
        <div style={{ marginBottom: '16px', color: '#8c8c8c', fontSize: '14px' }}>
          共 {total} 个需求
          {filters.status && filters.status.length > 0 && (
            <span style={{ marginLeft: '8px' }}>
              (已筛选状态: {filters.status.map((s) => getStatusConfig(s).label).join(', ')})
            </span>
          )}
        </div>
      </div>

      {responsive.isMobile ? (
        // 移动端：卡片列表视图
        renderMobileList()
      ) : (
        // 桌面端：表格视图
        <Spin spinning={loading}>
          <Table
            dataSource={requirements}
            columns={columns}
            rowKey="id"
            pagination={{
              current: filters.page,
              pageSize: filters.page_size,
              total: total,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (page, pageSize) => {
                setFilters((prev) => ({
                  ...prev,
                  page,
                  page_size: pageSize,
                }));
              },
            }}
            size="middle"
            scroll={getResponsiveTableScroll(1400, responsive)}
            bordered
          />
        </Spin>
      )}
    </div>
  );
};

export default RequirementListPage;
