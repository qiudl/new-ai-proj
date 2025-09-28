import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  message, 
  Row, 
  Col, 
  Typography, 
  Space,
  Spin,
  Alert,
  Divider,
  Avatar,
  Tag
} from 'antd';
import { 
  UserOutlined, 
  MailOutlined, 
  LockOutlined, 
  SaveOutlined,
  EditOutlined 
} from '@ant-design/icons';
import { userService } from '../services/userService';
import { User, UserProfileUpdateRequest, PasswordChangeRequest } from '../types/user';
import GoogleCalendarIntegration from '../components/GoogleCalendarIntegration';

const { Title, Text } = Typography;

const UserProfilePage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Load user profile on mount
  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const response = await userService.getProfile();
      
      if (response.data) {
        setUser(response.data);
        
        // Set form initial values
        profileForm.setFieldsValue({
          username: response.data.username,
          email: response.data.email,
        });
      }
    } catch (error: Error | unknown) {
      message.error('加载用户资料失败');
      console.error('Error loading user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (values: UserProfileUpdateRequest) => {
    try {
      setProfileLoading(true);
      const response = await userService.updateProfile(values);
      
      if (response.data) {
        setUser(response.data);
      }
      
      message.success('个人资料更新成功');
    } catch (error: Error | unknown) {
      const errorMessage = (error as any).response?.data?.error?.message || '更新个人资料失败';
      message.error(errorMessage);
      console.error('Error updating profile:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (values: PasswordChangeRequest) => {
    try {
      setPasswordLoading(true);
      await userService.changePassword(values);
      passwordForm.resetFields();
      message.success('密码修改成功');
    } catch (error: Error | unknown) {
      const errorMessage = (error as any).response?.data?.error?.message || '密码修改失败';
      message.error(errorMessage);
      console.error('Error changing password:', error);
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px' 
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return (
      <Alert
        message="加载失败"
        description="无法加载用户资料，请刷新页面重试"
        type="error"
        showIcon
      />
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <Title level={2} style={{ margin: 0 }}>个人资料</Title>
        <Text type="secondary">管理您的账户信息和安全设置</Text>
      </div>

      <Row gutter={[24, 24]}>
        {/* User Info Card */}
        <Col xs={24} lg={8}>
          <Card title="基本信息">
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <Avatar size={80} icon={<UserOutlined />} />
              <div style={{ marginTop: '16px' }}>
                <Title level={4} style={{ margin: '8px 0 4px 0' }}>
                  {user.username}
                </Title>
                <Text type="secondary">{user.email}</Text>
                <div style={{ marginTop: '8px' }}>
                  <Tag color={user.role === 'admin' ? 'red' : 'blue'}>
                    {user.role === 'admin' ? '管理员' : '普通用户'}
                  </Tag>
                </div>
              </div>
            </div>
            
            <div style={{ color: '#8c8c8c', fontSize: '12px' }}>
              <div style={{ marginBottom: '4px' }}>
                <strong>注册时间：</strong>
                {new Date(user.created_at).toLocaleDateString()}
              </div>
              <div>
                <strong>最后更新：</strong>
                {new Date(user.updated_at).toLocaleDateString()}
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* Profile Update Form */}
            <Card 
              title={
                <span>
                  <EditOutlined style={{ marginRight: '8px' }} />
                  编辑个人资料
                </span>
              }
            >
              <Form
                form={profileForm}
                layout="vertical"
                onFinish={handleProfileUpdate}
                requiredMark={false}
              >
                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label="用户名"
                      name="username"
                      rules={[
                        { required: true, message: '请输入用户名' },
                        { min: 3, message: '用户名至少3个字符' },
                        { max: 50, message: '用户名最多50个字符' }
                      ]}
                    >
                      <Input 
                        prefix={<UserOutlined />} 
                        placeholder="输入用户名" 
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label="邮箱地址"
                      name="email"
                      rules={[
                        { required: true, message: '请输入邮箱地址' },
                        { type: 'email', message: '请输入有效的邮箱地址' }
                      ]}
                    >
                      <Input 
                        prefix={<MailOutlined />} 
                        placeholder="输入邮箱地址" 
                      />
                    </Form.Item>
                  </Col>
                </Row>
                
                <Form.Item style={{ marginBottom: 0 }}>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    icon={<SaveOutlined />}
                    loading={profileLoading}
                  >
                    保存更改
                  </Button>
                </Form.Item>
              </Form>
            </Card>

            <Divider />

            {/* Google Calendar Integration */}
            <GoogleCalendarIntegration />

            <Divider />

            {/* Password Change Form */}
            <Card 
              title={
                <span>
                  <LockOutlined style={{ marginRight: '8px' }} />
                  修改密码
                </span>
              }
            >
              <Form
                form={passwordForm}
                layout="vertical"
                onFinish={handlePasswordChange}
                requiredMark={false}
              >
                <Form.Item
                  label="当前密码"
                  name="current_password"
                  rules={[
                    { required: true, message: '请输入当前密码' }
                  ]}
                >
                  <Input.Password 
                    prefix={<LockOutlined />} 
                    placeholder="输入当前密码" 
                  />
                </Form.Item>

                <Form.Item
                  label="新密码"
                  name="new_password"
                  rules={[
                    { required: true, message: '请输入新密码' },
                    { min: 6, message: '密码至少6个字符' }
                  ]}
                >
                  <Input.Password 
                    prefix={<LockOutlined />} 
                    placeholder="输入新密码" 
                  />
                </Form.Item>

                <Form.Item
                  label="确认新密码"
                  name="confirm_password"
                  dependencies={['new_password']}
                  rules={[
                    { required: true, message: '请确认新密码' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('new_password') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('两次输入的密码不一致'));
                      },
                    }),
                  ]}
                >
                  <Input.Password 
                    prefix={<LockOutlined />} 
                    placeholder="确认新密码" 
                  />
                </Form.Item>
                
                <Form.Item style={{ marginBottom: 0 }}>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    icon={<SaveOutlined />}
                    loading={passwordLoading}
                  >
                    修改密码
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </Space>
        </Col>
      </Row>
    </div>
  );
};

export default UserProfilePage;