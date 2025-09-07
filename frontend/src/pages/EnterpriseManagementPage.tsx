import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  Input,
  Select,
  message,
  Space,
  Tag,
  Row,
  Col,
  Statistic,
  Typography,
  Divider,
  Tabs,
  Badge,
  Dropdown,
  Alert,
  Tooltip,
  Popconfirm
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  TeamOutlined,
  BankOutlined,
  UserOutlined,
  SettingOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import enterpriseService from '../services/enterpriseService';
import {
  Enterprise,
  EnterpriseRequest,
  EnterpriseUpdateRequest,
  EnterpriseStats,
  BUSINESS_TYPE_OPTIONS,
  STATUS_OPTIONS,
  INDUSTRY_TYPE_OPTIONS
} from '../types/enterprise';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const EnterpriseManagementPage: React.FC = () => {
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [stats, setStats] = useState<EnterpriseStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEnterprise, setEditingEnterprise] = useState<Enterprise | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [form] = Form.useForm();

  // 加载企业列表
  const loadEnterprises = async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const result = await enterpriseService.getEnterprises(page, pageSize);
      setEnterprises(result.data);
      setPagination({
        current: page,
        pageSize: pageSize,
        total: result.pagination.total,
      });
    } catch (error) {
      console.error('加载企业列表失败:', error);
      message.error('加载企业列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载统计信息
  const loadStats = async () => {
    try {
      const result = await enterpriseService.getEnterpriseStats();
      setStats(result);
    } catch (error) {
      console.error('加载统计信息失败:', error);
    }
  };

  useEffect(() => {
    loadEnterprises();
    loadStats();
  }, []);

  // 处理表格分页变化
  const handleTableChange = (pagination: any) => {
    loadEnterprises(pagination.current, pagination.pageSize);
  };

  // 打开创建/编辑对话框
  const openModal = (enterprise?: Enterprise) => {
    setEditingEnterprise(enterprise || null);
    if (enterprise) {
      form.setFieldsValue(enterprise);
    } else {
      form.resetFields();
    }
    setModalVisible(true);
  };

  // 关闭对话框
  const closeModal = () => {
    setModalVisible(false);
    setEditingEnterprise(null);
    form.resetFields();
  };

  // 保存企业
  const saveEnterprise = async (values: any) => {
    try {
      if (editingEnterprise) {
        // 更新企业
        const updateData: EnterpriseUpdateRequest = values;
        await enterpriseService.updateEnterprise(editingEnterprise.id, updateData);
        message.success('更新企业成功');
      } else {
        // 创建企业
        const createData: EnterpriseRequest = values;
        await enterpriseService.createEnterprise(createData);
        message.success('创建企业成功');
      }
      closeModal();
      loadEnterprises(pagination.current, pagination.pageSize);
      loadStats(); // 刷新统计信息
    } catch (error) {
      console.error('保存企业失败:', error);
      message.error(editingEnterprise ? '更新企业失败' : '创建企业失败');
    }
  };

  // 删除企业
  const deleteEnterprise = async (id: number) => {
    try {
      await enterpriseService.deleteEnterprise(id);
      message.success('删除企业成功');
      loadEnterprises(pagination.current, pagination.pageSize);
      loadStats();
    } catch (error) {
      console.error('删除企业失败:', error);
      message.error('删除企业失败');
    }
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
    },
    {
      title: '企业名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Enterprise) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.code}
          </Text>
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
              onClick={() => {
                // TODO: Navigate to enterprise detail page
                message.info('查看企业详情功能开发中...');
              }}
            />
          </Tooltip>
          <Tooltip title="管理用户">
            <Button
              type="text"
              icon={<UserOutlined />}
              onClick={() => {
                // TODO: Navigate to enterprise users page
                message.info('企业用户管理功能开发中...');
              }}
            />
          </Tooltip>
          <Tooltip title="管理部门">
            <Button
              type="text"
              icon={<TeamOutlined />}
              onClick={() => {
                // TODO: Navigate to enterprise departments page
                message.info('企业部门管理功能开发中...');
              }}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => openModal(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除这个企业吗?"
            description="删除后无法恢复，请谨慎操作。"
            onConfirm={() => deleteEnterprise(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <BankOutlined /> 企业管理
      </Title>

      {/* 统计卡片 */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="企业总数"
                value={stats.total_enterprises}
                prefix={<BankOutlined style={{ color: '#1890ff' }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="活跃企业"
                value={stats.active_enterprises}
                prefix={<BankOutlined style={{ color: '#52c41a' }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="总用户数"
                value={stats.total_users}
                prefix={<UserOutlined style={{ color: '#722ed1' }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="总部门数"
                value={stats.total_departments}
                prefix={<TeamOutlined style={{ color: '#fa8c16' }} />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 主要内容 */}
      <Card>
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openModal()}
            >
              创建企业
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                loadEnterprises(pagination.current, pagination.pageSize);
                loadStats();
              }}
            >
              刷新
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={enterprises}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 创建/编辑对话框 */}
      <Modal
        title={editingEnterprise ? '编辑企业' : '创建企业'}
        open={modalVisible}
        onCancel={closeModal}
        width={800}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={saveEnterprise}
          initialValues={{
            status: 'active',
            business_type: 'llc',
          }}
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="企业名称"
                name="name"
                rules={[
                  { required: true, message: '请输入企业名称' },
                  { min: 1, max: 255, message: '企业名称长度为1-255个字符' }
                ]}
              >
                <Input placeholder="请输入企业名称" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="企业代码"
                name="code"
                rules={[
                  { required: true, message: '请输入企业代码' },
                  { min: 1, max: 100, message: '企业代码长度为1-100个字符' }
                ]}
              >
                <Input placeholder="请输入企业代码" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="企业描述"
            name="description"
          >
            <TextArea rows={3} placeholder="请输入企业描述" />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="业务类型"
                name="business_type"
                rules={[{ required: true, message: '请选择业务类型' }]}
              >
                <Select placeholder="请选择业务类型">
                  {BUSINESS_TYPE_OPTIONS.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="行业类型"
                name="industry_type"
              >
                <Select placeholder="请选择行业类型" allowClear>
                  {INDUSTRY_TYPE_OPTIONS.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="注册号码"
                name="registration_number"
              >
                <Input placeholder="请输入注册号码" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="税务识别号"
                name="tax_id"
              >
                <Input placeholder="请输入税务识别号" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="法定代表人"
            name="legal_representative"
          >
            <Input placeholder="请输入法定代表人" />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="联系邮箱"
                name="contact_email"
                rules={[
                  { type: 'email', message: '请输入正确的邮箱格式' }
                ]}
              >
                <Input placeholder="请输入联系邮箱" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="联系电话"
                name="contact_phone"
              >
                <Input placeholder="请输入联系电话" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="地址"
            name="address"
          >
            <Input placeholder="请输入详细地址" />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                label="城市"
                name="city"
              >
                <Input placeholder="请输入城市" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                label="省份"
                name="province"
              >
                <Input placeholder="请输入省份" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                label="邮政编码"
                name="postal_code"
              >
                <Input placeholder="请输入邮政编码" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="网站"
                name="website"
                rules={[
                  { type: 'url', message: '请输入正确的网站URL' }
                ]}
              >
                <Input placeholder="请输入网站URL" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="状态"
                name="status"
                rules={[{ required: true, message: '请选择状态' }]}
              >
                <Select placeholder="请选择状态">
                  {STATUS_OPTIONS.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <div style={{ textAlign: 'right', marginTop: '24px' }}>
            <Space>
              <Button onClick={closeModal}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                {editingEnterprise ? '更新' : '创建'}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default EnterpriseManagementPage;