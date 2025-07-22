import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Descriptions,
  Tag,
  Button,
  Space,
  Tabs,
  Table,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  message,
  Avatar,
  Timeline,
  Statistic,
  Divider,
  Alert,
  Spin,
  Typography,
  Tooltip,
  Popconfirm
} from 'antd';
import type { TabsProps } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  UserAddOutlined,
  ContactsOutlined,
  HistoryOutlined,
  PhoneOutlined,
  MailOutlined,
  GlobalOutlined,
  HomeOutlined,
  CalendarOutlined,
  DollarOutlined,
  UserOutlined,
  TeamOutlined,
  PlusOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Customer, CustomerContact, CustomerContactRequest, CustomerUserRequest } from '../types/customer';
import customerService from '../services/customerService';
import { formatCurrency, formatDate, formatDateTime, getStatusColor, getPriorityColor } from '../utils/formatters';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

const CustomerDetailPage: React.FC = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [contacts, setContacts] = useState<CustomerContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [contactForm] = Form.useForm();
  const [userForm] = Form.useForm();

  useEffect(() => {
    const loadCustomerData = async () => {
      if (!customerId) {
        setError('未找到客户ID');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const customerData = await customerService.getCustomer(parseInt(customerId));
        setCustomer(customerData);
        setError(null);
      } catch (err) {
        console.error('Error loading customer:', err);
        setError('加载客户信息失败');
        message.error('加载客户信息失败');
      } finally {
        setLoading(false);
      }
    };

    loadCustomerData();
  }, [customerId]);

  useEffect(() => {
    const loadContacts = async () => {
      if (!customerId) return;

      try {
        setContactsLoading(true);
        const response = await customerService.getCustomerContacts(parseInt(customerId));
        setContacts(response.data);
      } catch (err) {
        console.error('Error loading contacts:', err);
        message.error('加载联系记录失败');
      } finally {
        setContactsLoading(false);
      }
    };

    if (customerId) {
      loadContacts();
    }
  }, [customerId]);

  const handleEdit = () => {
    navigate(`/customers/${customerId}/edit`);
  };

  const handleDelete = async () => {
    if (!customer) return;

    try {
      await customerService.deleteCustomer(customer.id);
      message.success('客户删除成功');
      navigate('/customers');
    } catch (error) {
      console.error('Failed to delete customer:', error);
      message.error('删除客户失败');
    }
  };

  const handleAddContact = async (values: any) => {
    if (!customerId) return;

    try {
      const contactData: CustomerContactRequest = {
        contactType: values.contactType,
        subject: values.subject,
        content: values.content,
        contactDate: values.contactDate ? values.contactDate.toISOString() : new Date().toISOString(),
        nextContactDate: values.nextContactDate ? values.nextContactDate.toISOString() : undefined,
        status: values.status || 'completed',
        result: values.result
      };

      await customerService.createCustomerContact(parseInt(customerId), contactData);
      message.success('联系记录添加成功');
      setContactModalVisible(false);
      contactForm.resetFields();

      // Reload contacts
      const response = await customerService.getCustomerContacts(parseInt(customerId));
      setContacts(response.data);
    } catch (error) {
      console.error('Failed to add contact:', error);
      message.error('添加联系记录失败');
    }
  };

  const handleAddUser = async (values: any) => {
    if (!customerId) return;

    try {
      const userData: CustomerUserRequest = {
        userId: values.userId,
        role: values.role,
        isPrimary: values.isPrimary || false,
        permissions: values.permissions || {},
        accessLevel: values.accessLevel || 1
      };

      await customerService.addCustomerUser(parseInt(customerId), userData);
      message.success('关联用户成功');
      setUserModalVisible(false);
      userForm.resetFields();
    } catch (error) {
      console.error('Failed to add user:', error);
      message.error('关联用户失败');
    }
  };

  const contactColumns: ColumnsType<CustomerContact> = [
    {
      title: '联系方式',
      dataIndex: 'contactType',
      key: 'contactType',
      width: 100,
      render: (type: string) => {
        const typeMap = {
          email: { icon: <MailOutlined />, text: '邮件', color: 'blue' },
          phone: { icon: <PhoneOutlined />, text: '电话', color: 'green' },
          meeting: { icon: <ContactsOutlined />, text: '会议', color: 'orange' },
          visit: { icon: <HomeOutlined />, text: '拜访', color: 'purple' },
          other: { icon: <ContactsOutlined />, text: '其他', color: 'default' }
        };
        const config = typeMap[type as keyof typeof typeMap] || typeMap.other;
        return (
          <Space>
            {config.icon}
            <Tag color={config.color}>{config.text}</Tag>
          </Space>
        );
      },
    },
    {
      title: '主题',
      dataIndex: 'subject',
      key: 'subject',
      ellipsis: true,
    },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      width: 200,
    },
    {
      title: '联系时间',
      dataIndex: 'contactDate',
      key: 'contactDate',
      width: 120,
      render: (date: string) => formatDateTime(date),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap = {
          planned: { text: '计划中', color: 'processing' },
          completed: { text: '已完成', color: 'success' },
          cancelled: { text: '已取消', color: 'default' }
        };
        const config = statusMap[status as keyof typeof statusMap] || { text: status, color: 'default' };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
  ];

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px' 
      }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px', color: '#666', fontSize: '14px' }}>
          加载客户详情中...
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert
          message="加载失败"
          description={error || '未找到指定的客户信息'}
          type="error"
          showIcon
          action={
            <Button onClick={() => navigate('/customers')}>返回客户列表</Button>
          }
        />
      </div>
    );
  }

  // 配置标签页内容
  const tabItems: TabsProps['items'] = [
    {
      key: 'contacts',
      label: (
        <Space>
          <ContactsOutlined />
          联系记录
        </Space>
      ),
      children: (
        <>
          <div style={{ marginBottom: '16px' }}>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => setContactModalVisible(true)}
            >
              添加联系记录
            </Button>
          </div>
          <Table
            columns={contactColumns}
            dataSource={contacts}
            loading={contactsLoading}
            pagination={{ pageSize: 10 }}
            size="small"
            rowKey="id"
          />
        </>
      ),
    },
    {
      key: 'users',
      label: (
        <Space>
          <TeamOutlined />
          关联用户
        </Space>
      ),
      children: (
        <>
          <div style={{ marginBottom: '16px' }}>
            <Button 
              type="primary" 
              icon={<UserAddOutlined />}
              onClick={() => setUserModalVisible(true)}
            >
              关联用户
            </Button>
          </div>
          <Alert
            message="功能开发中"
            description="关联用户管理功能正在开发中，敬请期待。"
            type="info"
            showIcon
          />
        </>
      ),
    },
    {
      key: 'timeline',
      label: (
        <Space>
          <HistoryOutlined />
          活动时间线
        </Space>
      ),
      children: (
        <Timeline>
          <Timeline.Item color="blue">
            <Text strong>客户创建</Text>
            <br />
            <Text type="secondary">{customer ? formatDateTime(customer.createdAt) : ''}</Text>
          </Timeline.Item>
          <Timeline.Item color="green">
            <Text strong>信息更新</Text>
            <br />
            <Text type="secondary">{customer ? formatDateTime(customer.updatedAt) : ''}</Text>
          </Timeline.Item>
          {contacts.slice(0, 5).map((contact) => (
            <Timeline.Item key={contact.id} color="orange">
              <Text strong>{contact.subject || '联系记录'}</Text>
              <br />
              <Text type="secondary">{formatDateTime(contact.contactDate)}</Text>
            </Timeline.Item>
          ))}
        </Timeline>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', backgroundColor: '#f5f5f5' }}>
      {/* 页面头部 */}
      <div style={{ marginBottom: '24px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space align="center">
              <Avatar size="large" icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
              <div>
                <Title level={2} style={{ margin: 0 }}>{customer.name}</Title>
                <Text type="secondary">{customer.company}</Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button 
                type="primary" 
                icon={<EditOutlined />}
                onClick={handleEdit}
              >
                编辑
              </Button>
              <Popconfirm
                title="确定要删除此客户吗？"
                description="此操作不可恢复，请谨慎操作。"
                onConfirm={handleDelete}
                okText="确定"
                cancelText="取消"
                okType="danger"
              >
                <Button 
                  danger 
                  icon={<DeleteOutlined />}
                >
                  删除
                </Button>
              </Popconfirm>
            </Space>
          </Col>
        </Row>
      </div>

      <Row gutter={24}>
        {/* 左侧：基本信息和统计 */}
        <Col xs={24} lg={8}>
          {/* 基本信息卡片 */}
          <Card title="基本信息" style={{ marginBottom: '16px' }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="客户状态">
                <Tag color={getStatusColor(customer.status)}>
                  {customer.status === 'active' ? '活跃' :
                   customer.status === 'inactive' ? '非活跃' :
                   customer.status === 'potential' ? '潜在' : '已关闭'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="优先级">
                <Tag color={getPriorityColor(customer.priority)}>
                  {customer.priority === 'high' ? '高' :
                   customer.priority === 'medium' ? '中' : '低'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="行业">
                {customer.industry}
              </Descriptions.Item>
              <Descriptions.Item label="联系人">
                <Space>
                  <UserOutlined />
                  {customer.contactPerson}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="邮箱">
                <Space>
                  <MailOutlined />
                  <a href={`mailto:${customer.email}`}>{customer.email}</a>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="电话">
                <Space>
                  <PhoneOutlined />
                  <a href={`tel:${customer.phone}`}>{customer.phone}</a>
                </Space>
              </Descriptions.Item>
              {customer.website && (
                <Descriptions.Item label="网站">
                  <Space>
                    <GlobalOutlined />
                    <a href={customer.website} target="_blank" rel="noopener noreferrer">
                      {customer.website}
                    </a>
                  </Space>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="地址">
                <Space>
                  <HomeOutlined />
                  {customer.address}
                </Space>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* 合同信息卡片 */}
          <Card title="合同信息" style={{ marginBottom: '16px' }}>
            <Row gutter={16}>
              {customer.contractValue && (
                <Col span={24}>
                  <Statistic
                    title="合同金额"
                    value={customer.contractValue}
                    formatter={(value) => formatCurrency(Number(value))}
                    prefix={<DollarOutlined />}
                    valueStyle={{ color: '#3f8600' }}
                  />
                </Col>
              )}
              {customer.startDate && (
                <Col span={12}>
                  <Statistic
                    title="开始日期"
                    value={formatDate(customer.startDate)}
                    prefix={<CalendarOutlined />}
                  />
                </Col>
              )}
              {customer.endDate && (
                <Col span={12}>
                  <Statistic
                    title="结束日期"
                    value={formatDate(customer.endDate)}
                    prefix={<CalendarOutlined />}
                  />
                </Col>
              )}
            </Row>
          </Card>

          {/* 时间信息卡片 */}
          <Card title="时间信息">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="创建时间">
                {formatDateTime(customer.createdAt)}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">
                {formatDateTime(customer.updatedAt)}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* 右侧：详细功能标签页 */}
        <Col xs={24} lg={16}>
          <Card>
            <Tabs defaultActiveKey="contacts" items={tabItems} />
          </Card>
        </Col>
      </Row>

      {/* 添加联系记录弹窗 */}
      <Modal
        title="添加联系记录"
        open={contactModalVisible}
        onCancel={() => {
          setContactModalVisible(false);
          contactForm.resetFields();
        }}
        onOk={contactForm.submit}
        width={600}
      >
        <Form
          form={contactForm}
          layout="vertical"
          onFinish={handleAddContact}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="联系方式"
                name="contactType"
                rules={[{ required: true, message: '请选择联系方式' }]}
              >
                <Select placeholder="选择联系方式">
                  {customerService.getContactTypeOptions().map(option => (
                    <Select.Option key={option.value} value={option.value}>
                      {option.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="状态"
                name="status"
                initialValue="completed"
              >
                <Select>
                  <Select.Option value="planned">计划中</Select.Option>
                  <Select.Option value="completed">已完成</Select.Option>
                  <Select.Option value="cancelled">已取消</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            label="主题"
            name="subject"
            rules={[{ required: true, message: '请输入主题' }]}
          >
            <Input placeholder="输入联系主题" />
          </Form.Item>
          <Form.Item
            label="内容"
            name="content"
          >
            <TextArea
              placeholder="输入联系内容"
              rows={4}
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="联系时间"
                name="contactDate"
                initialValue={dayjs()}
              >
                <DatePicker 
                  showTime 
                  style={{ width: '100%' }}
                  format="YYYY-MM-DD HH:mm:ss"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="下次联系时间"
                name="nextContactDate"
              >
                <DatePicker 
                  showTime 
                  style={{ width: '100%' }}
                  format="YYYY-MM-DD HH:mm:ss"
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            label="结果"
            name="result"
          >
            <Input placeholder="联系结果" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 关联用户弹窗 */}
      <Modal
        title="关联用户"
        open={userModalVisible}
        onCancel={() => {
          setUserModalVisible(false);
          userForm.resetFields();
        }}
        onOk={userForm.submit}
      >
        <Form
          form={userForm}
          layout="vertical"
          onFinish={handleAddUser}
        >
          <Form.Item
            label="用户ID"
            name="userId"
            rules={[{ required: true, message: '请输入用户ID' }]}
          >
            <Input placeholder="输入用户ID" />
          </Form.Item>
          <Form.Item
            label="角色"
            name="role"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select placeholder="选择角色">
              {customerService.getUserRoleOptions().map(option => (
                <Select.Option key={option.value} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            label="访问级别"
            name="accessLevel"
            initialValue={1}
          >
            <Select>
              <Select.Option value={1}>级别1</Select.Option>
              <Select.Option value={2}>级别2</Select.Option>
              <Select.Option value={3}>级别3</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CustomerDetailPage;