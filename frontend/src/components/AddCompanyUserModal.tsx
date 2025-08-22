import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Switch,
  InputNumber,
  Row,
  Col,
  Card,
  Space,
  Typography,
  message,
  Alert,
  Tooltip,
  Divider
} from 'antd';
import {
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  ContactsOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { CompanyUserRequest, CompanyUser } from '../types/company';
import companyService from '../services/companyService';

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

interface AddCompanyUserModalProps {
  visible: boolean;
  companyId: number;
  companyName: string;
  editUser?: CompanyUser; // 编辑用户时传入用户数据
  onCancel: () => void;
  onSuccess: (user: CompanyUser) => void;
}

const AddCompanyUserModal: React.FC<AddCompanyUserModalProps> = ({
  visible,
  companyId,
  companyName,
  editUser,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // 编辑模式时初始化表单
  useEffect(() => {
    if (visible && editUser) {
      form.setFieldsValue({
        name: editUser.name,
        position: editUser.position,
        department: editUser.department,
        email: editUser.email,
        phone: editUser.phone,
        mobile: editUser.mobile,
        workPhone: editUser.workPhone,
        role: editUser.role,
        isPrimaryContact: editUser.isPrimaryContact,
        canMakeDecisions: editUser.canMakeDecisions,
        accessLevel: editUser.accessLevel,
        status: editUser.status,
        notes: editUser.notes,
      });
    } else if (visible && !editUser) {
      // 添加模式时重置表单
      form.resetFields();
    }
  }, [visible, editUser, form]);

  // 处理表单提交
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // 构建请求数据
      const userData: CompanyUserRequest = {
        customerId: companyId,
        name: values.name,
        position: values.position,
        department: values.department,
        email: values.email,
        phone: values.phone,
        mobile: values.mobile,
        workPhone: values.workPhone,
        role: values.role,
        isPrimaryContact: values.isPrimaryContact || false,
        canMakeDecisions: values.canMakeDecisions || false,
        accessLevel: values.accessLevel || 1,
        status: values.status || 'active',
        notes: values.notes,
      };

      let updatedUser: CompanyUser;
      
      if (editUser) {
        // 编辑模式
        updatedUser = await companyService.updateCompanyUser(companyId, editUser.id, userData);
        message.success('企业用户更新成功');
      } else {
        // 添加模式
        updatedUser = await companyService.createCompanyUser(companyId, userData);
        message.success('企业用户添加成功');
      }
      
      form.resetFields();
      onSuccess(updatedUser);
    } catch (error) {
      console.error('Failed to save company user:', error);
      if (editUser) {
        message.error('更新企业用户失败');
      } else {
        message.error('添加企业用户失败');
      }
    } finally {
      setLoading(false);
    }
  };

  // 处理取消
  const handleCancel = () => {
    if (loading) return;
    form.resetFields();
    onCancel();
  };

  // 角色变化时的处理
  const handleRoleChange = (role: string) => {
    if (role === 'primary_contact') {
      form.setFieldsValue({ isPrimaryContact: true });
    } else if (role === 'decision_maker') {
      form.setFieldsValue({ canMakeDecisions: true });
    }
  };

  return (
    <Modal
      title={
        <Space>
          <UserOutlined />
          {editUser ? `编辑用户 - ${editUser.name}` : `为 \"${companyName}\" 添加用户`}
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={800}
      destroyOnClose
      okText="添加用户"
      cancelText="取消"
    >
      <Alert
        message="添加企业用户"
        description="为企业添加内部用户，用于联系和项目管理。主要联系人和决策人将在企业合作中起重要作用。"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{
          status: 'active',
          role: 'normal',
          accessLevel: 1,
          isPrimaryContact: false,
          canMakeDecisions: false,
        }}
      >
        {/* 基本信息 */}
        <Card size="small" title={
          <Space>
            <UserOutlined />
            基本信息
          </Space>
        } style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="姓名"
                name="name"
                rules={[
                  { required: true, message: '请输入姓名' },
                  { min: 2, message: '姓名至少2个字符' },
                  { max: 50, message: '姓名不能超过50个字符' }
                ]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="请输入用户姓名"
                  maxLength={50}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="职位"
                name="position"
                rules={[{ max: 100, message: '职位不能超过100个字符' }]}
              >
                <Input
                  prefix={<ContactsOutlined />}
                  placeholder="如：技术总监、项目经理"
                  maxLength={100}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="部门"
                name="department"
                rules={[{ max: 100, message: '部门不能超过100个字符' }]}
              >
                <Input
                  prefix={<TeamOutlined />}
                  placeholder="如：技术部、商务部"
                  maxLength={100}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="状态"
                name="status"
              >
                <Select placeholder="选择用户状态">
                  {companyService.getUserStatusOptions().map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 联系信息 */}
        <Card size="small" title={
          <Space>
            <PhoneOutlined />
            联系信息
          </Space>
        } style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="邮箱"
                name="email"
                rules={[
                  { type: 'email', message: '请输入有效的邮箱地址' },
                  { max: 255, message: '邮箱不能超过255个字符' }
                ]}
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder="user@company.com"
                  maxLength={255}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="手机号"
                name="mobile"
                rules={[
                  { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' }
                ]}
              >
                <Input
                  prefix={<PhoneOutlined />}
                  placeholder="13800138000"
                  maxLength={11}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="办公电话"
                name="workPhone"
                rules={[{ max: 20, message: '办公电话不能超过20个字符' }]}
              >
                <Input
                  prefix={<PhoneOutlined />}
                  placeholder="010-12345678"
                  maxLength={20}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="其他电话"
                name="phone"
                rules={[{ max: 20, message: '电话号码不能超过20个字符' }]}
              >
                <Input
                  prefix={<PhoneOutlined />}
                  placeholder="其他联系电话"
                  maxLength={20}
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 权限信息 */}
        <Card size="small" title={
          <Space>
            <SafetyCertificateOutlined />
            权限设置
          </Space>
        } style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label={
                  <Space>
                    角色
                    <Tooltip title="用户在企业中的角色，决定其权限和职责">
                      <InfoCircleOutlined style={{ color: '#999' }} />
                    </Tooltip>
                  </Space>
                }
                name="role"
                rules={[{ required: true, message: '请选择用户角色' }]}
              >
                <Select placeholder="选择用户角色" onChange={handleRoleChange}>
                  {companyService.getUserRoleOptions().map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={
                  <Space>
                    访问级别
                    <Tooltip title="数字越高权限越大，1-5级，默认为1">
                      <InfoCircleOutlined style={{ color: '#999' }} />
                    </Tooltip>
                  </Space>
                }
                name="accessLevel"
              >
                <InputNumber
                  min={1}
                  max={5}
                  placeholder="1-5"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="isPrimaryContact"
                valuePropName="checked"
              >
                <Space>
                  <Switch />
                  <Text>设为主要联系人</Text>
                  <Tooltip title="主要联系人将作为企业的首要沟通对象">
                    <InfoCircleOutlined style={{ color: '#999' }} />
                  </Tooltip>
                </Space>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="canMakeDecisions"
                valuePropName="checked"
              >
                <Space>
                  <Switch />
                  <Text>具有决策权</Text>
                  <Tooltip title="标记该用户是否可以代表企业做出决策">
                    <InfoCircleOutlined style={{ color: '#999' }} />
                  </Tooltip>
                </Space>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 备注信息 */}
        <Card size="small" title="备注信息" style={{ marginBottom: 16 }}>
          <Form.Item
            label="备注"
            name="notes"
            rules={[{ max: 500, message: '备注不能超过500个字符' }]}
          >
            <TextArea
              rows={3}
              placeholder="用户相关的备注信息，如特殊说明、联系偏好等..."
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Card>
      </Form>
    </Modal>
  );
};

export default AddCompanyUserModal;