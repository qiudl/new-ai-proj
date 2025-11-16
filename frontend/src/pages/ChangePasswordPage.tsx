import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  message,
  Space,
  Typography,
  Alert,
  Divider,
} from 'antd';
import {
  LockOutlined,
  SafetyOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import passwordService, { ChangePasswordRequest } from '../services/passwordService';
import PasswordStrengthIndicator from '../components/PasswordStrengthIndicator';

const { Title, Text, Paragraph } = Typography;

/**
 * 修改密码页面
 * 允许用户自主修改密码
 */
const ChangePasswordPage: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  /**
   * 处理表单提交
   */
  const handleSubmit = async (values: ChangePasswordRequest) => {
    setLoading(true);
    try {
      const response = await passwordService.changePassword({
        old_password: values.old_password,
        new_password: values.new_password,
        confirm_password: values.confirm_password,
      });

      if (response.success) {
        message.success(response.message || '密码修改成功！请使用新密码重新登录');
        form.resetFields();
        setNewPassword('');

        // 3秒后跳转到登录页
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        const errorMsg = response.error?.details || response.error?.message || '密码修改失败';
        message.error(errorMsg);
      }
    } catch (error: any) {
      console.error('修改密码失败:', error);
      message.error('操作失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 验证新密码与确认密码是否一致
   */
  const validateConfirmPassword = (_: any, value: string) => {
    if (!value || form.getFieldValue('new_password') === value) {
      return Promise.resolve();
    }
    return Promise.reject(new Error('两次输入的密码不一致'));
  };

  return (
    <div style={{
      maxWidth: 600,
      margin: '40px auto',
      padding: '0 24px'
    }}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 页面标题 */}
          <div style={{ textAlign: 'center' }}>
            <SafetyOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
            <Title level={2}>修改密码</Title>
            <Text type="secondary">为了您的账户安全，请定期修改密码</Text>
          </div>

          <Divider />

          {/* 安全提示 */}
          <Alert
            message="安全提示"
            description={
              <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                <li>密码至少8个字符</li>
                <li>必须包含大写字母、小写字母、数字和特殊字符</li>
                <li>不要使用常见密码或个人信息</li>
                <li>定期更换密码以保障账户安全</li>
              </ul>
            }
            type="info"
            showIcon
          />

          {/* 修改密码表单 */}
          <Form
            form={form}
            name="change_password"
            layout="vertical"
            onFinish={handleSubmit}
            autoComplete="off"
          >
            {/* 旧密码 */}
            <Form.Item
              label="当前密码"
              name="old_password"
              rules={[
                { required: true, message: '请输入当前密码' },
                { min: 6, message: '密码至少6个字符' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="请输入当前密码"
                size="large"
              />
            </Form.Item>

            {/* 新密码 */}
            <Form.Item
              label="新密码"
              name="new_password"
              rules={[
                { required: true, message: '请输入新密码' },
                { min: 8, message: '密码至少8个字符' },
                {
                  pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]).{8,}$/,
                  message: '密码必须包含大小写字母、数字和特殊字符',
                },
                {
                  validator: (_, value) => {
                    const oldPassword = form.getFieldValue('old_password');
                    if (value && oldPassword && value === oldPassword) {
                      return Promise.reject(new Error('新密码不能与旧密码相同'));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="请输入新密码（至少8个字符，包含大小写字母、数字和特殊字符）"
                size="large"
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </Form.Item>

            {/* 密码强度指示器 */}
            {newPassword && (
              <Form.Item>
                <PasswordStrengthIndicator
                  password={newPassword}
                  minLength={8}
                  showRequirements={true}
                  showSuggestions={false}
                />
              </Form.Item>
            )}

            {/* 确认新密码 */}
            <Form.Item
              label="确认新密码"
              name="confirm_password"
              dependencies={['new_password']}
              rules={[
                { required: true, message: '请确认新密码' },
                { validator: validateConfirmPassword },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="请再次输入新密码"
                size="large"
              />
            </Form.Item>

            {/* 提交按钮 */}
            <Form.Item>
              <Space size="middle" style={{ width: '100%' }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  icon={<CheckCircleOutlined />}
                  size="large"
                  block
                >
                  {loading ? '正在修改...' : '确认修改'}
                </Button>
                <Button
                  size="large"
                  onClick={() => navigate(-1)}
                  block
                >
                  取消
                </Button>
              </Space>
            </Form.Item>
          </Form>

          {/* 提示信息 */}
          <Alert
            message="温馨提示"
            description="修改密码成功后，系统将自动退出登录，请使用新密码重新登录。"
            type="warning"
            showIcon
            style={{ marginTop: 16 }}
          />
        </Space>
      </Card>
    </div>
  );
};

export default ChangePasswordPage;
