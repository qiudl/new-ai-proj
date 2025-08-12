import React, { useState } from 'react';
import { Form, Input, Button, message, Tag } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

interface LoginForm {
  username: string;
  password: string;
}

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // 获取环境信息
  const isLocalDev = process.env.REACT_APP_LOCAL_DEV === 'true';
  const environment = process.env.REACT_APP_ENV || 'production';
  
  // 根据环境确定标识
  const getEnvironmentLabel = () => {
    if (isLocalDev && environment === 'development') {
      return { text: '本地开发环境', color: '#52c41a', port: '3001', detail: '本机PostgreSQL端口5433' };
    } else if (environment === 'test') {
      return { text: '测试环境', color: '#1890ff', port: 'nginx端口80', detail: 'Docker Compose架构' };
    } else {
      return { text: '生产环境', color: '#fa541c', port: '80', detail: '' };
    }
  };

  const envInfo = getEnvironmentLabel();

  const onFinish = async (values: LoginForm) => {
    setLoading(true);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
      
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // Store token and user info
          localStorage.setItem('token', data.data.token);
          localStorage.setItem('currentUser', JSON.stringify({
            id: data.data.user.id,
            username: data.data.user.username,
            role: data.data.user.role
          }));
          message.success('登录成功');
          navigate('/');
        } else {
          message.error(data.message || '登录失败');
        }
      } else if (response.status === 401) {
        message.error('用户名或密码错误');
      } else if (response.status >= 500) {
        message.error('服务器内部错误，请稍后重试');
      } else {
        message.error('登录失败，请检查网络连接');
      }
    } catch (error: Error | unknown) {
      console.error('Login error:', error);
      
      if (error.name === 'AbortError') {
        message.error('登录请求超时，请检查网络连接或稍后重试');
      } else if (error.message.includes('Failed to fetch')) {
        message.error('无法连接到服务器，请确保服务已启动');
      } else {
        message.error('登录失败，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        {/* 环境标识 */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <Tag 
            color={envInfo.color} 
            style={{ 
              fontSize: '16px', 
              fontWeight: 'bold',
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              marginBottom: '8px'
            }}
          >
            {envInfo.text} ({envInfo.port})
          </Tag>
          {envInfo.detail && (
            <div style={{ 
              fontSize: '12px', 
              color: '#8c8c8c', 
              marginTop: '4px' 
            }}>
              {envInfo.detail}
            </div>
          )}
        </div>
        
        <h1 className="login-title">AI上下文任务系统</h1>
        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              style={{ width: '100%' }}
            >
              登录
            </Button>
          </Form.Item>
        </Form>
        
        <div style={{ textAlign: 'center', marginTop: '16px', color: '#8c8c8c' }}>
          <p>请使用正确的用户名和密码登录</p>
          <p>如无法登录，请联系系统管理员</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;