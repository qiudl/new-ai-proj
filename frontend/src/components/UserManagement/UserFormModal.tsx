import React from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Radio,
  Row,
  Col,
  Space
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  LockOutlined,
  BuildOutlined,
  BankOutlined,
  PhoneOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { User, USER_ROLE_CONFIG } from '../../types/user';
import { useUserForm, UserFormMode } from '../../hooks/useUserForm';
import EnterpriseSelector from '../EnterpriseSelector';

const { Option } = Select;

interface UserFormModalProps {
  visible: boolean;
  mode: UserFormMode;
  user?: User;
  onCancel: () => void;
  onSuccess: () => void;
}

const UserFormModal: React.FC<UserFormModalProps> = ({
  visible,
  mode,
  user,
  onCancel,
  onSuccess
}) => {
  const {
    form,
    loading,
    userType,
    availableRoles,
    handleUserTypeChange,
    handleSubmit,
    handleCancel
  } = useUserForm({
    mode,
    user,
    onSuccess,
    onCancel
  });

  return (
    <Modal
      title={
        <Space>
          <UserOutlined />
          {mode === 'create' ? '创建用户' : '编辑用户'}
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      onOk={() => form.submit()}
      confirmLoading={loading}
      width={700}
      okText={mode === 'create' ? '创建' : '保存'}
      cancelText="取消"
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          user_type: 'system'
        }}
      >
        {/* 用户类型选择 */}
        <Form.Item
          name="user_type"
          label="用户类型"
          rules={[{ required: true, message: '请选择用户类型' }]}
        >
          <Radio.Group
            onChange={(e) => handleUserTypeChange(e.target.value)}
            disabled={mode === 'edit'} // 编辑模式不允许修改用户类型
          >
            <Radio value="system">
              <Space>
                <BuildOutlined />
                系统用户
              </Space>
            </Radio>
            <Radio value="company">
              <Space>
                <BankOutlined />
                企业用户
              </Space>
            </Radio>
          </Radio.Group>
        </Form.Item>

        {/* 基本信息 */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="username"
              label="用户名"
              rules={[
                { required: true, message: '请输入用户名' },
                { min: 3, max: 50, message: '用户名长度为3-50个字符' },
                {
                  pattern: /^[a-zA-Z0-9_]+$/,
                  message: '用户名只能包含字母、数字和下划线'
                }
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="请输入用户名"
                disabled={mode === 'edit'} // 编辑模式不允许修改用户名
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name="email"
              label="邮箱"
              rules={[
                { required: true, message: '请输入邮箱' },
                { type: 'email', message: '请输入有效的邮箱地址' }
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="请输入邮箱"
              />
            </Form.Item>
          </Col>
        </Row>

        {/* 密码（仅创建模式） */}
        {mode === 'create' && (
          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6个字符' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入密码"
            />
          </Form.Item>
        )}

        {/* 角色和企业选择 */}
        <Row gutter={16}>
          <Col span={userType === 'company' ? 12 : 24}>
            <Form.Item
              name="role"
              label="角色"
              rules={[{ required: true, message: '请选择角色' }]}
            >
              <Select
                placeholder={`请选择${userType === 'system' ? '系统' : '企业'}用户角色`}
                allowClear
              >
                {availableRoles.map(role => {
                  const config = USER_ROLE_CONFIG[role as keyof typeof USER_ROLE_CONFIG];
                  return config ? (
                    <Option key={role} value={role}>
                      <Space>
                        {config.icon}
                        {config.label}
                      </Space>
                    </Option>
                  ) : null;
                })}
              </Select>
            </Form.Item>
          </Col>

          {/* 企业选择（企业用户专用） */}
          {userType === 'company' && (
            <Col span={12}>
              <Form.Item
                name="enterprise_id"
                label="所属企业"
                rules={[{ required: true, message: '请选择所属企业' }]}
              >
                <EnterpriseSelector
                  placeholder="请选择企业"
                  allowClear
                />
              </Form.Item>
            </Col>
          )}
        </Row>

        {/* 个人信息 */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name={['profile', 'name']} label="姓名">
              <Input
                prefix={<UserOutlined />}
                placeholder="请输入真实姓名"
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name={['profile', 'phone']}
              label="电话"
              rules={[
                {
                  pattern: /^1[3-9]\d{9}$/,
                  message: '请输入有效的手机号码'
                }
              ]}
            >
              <Input
                prefix={<PhoneOutlined />}
                placeholder="请输入联系电话"
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name={['profile', 'department']} label="部门">
          <Input
            prefix={<TeamOutlined />}
            placeholder="请输入部门"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default UserFormModal;
