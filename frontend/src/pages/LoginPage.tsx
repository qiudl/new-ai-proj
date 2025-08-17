import React, { useState } from 'react';
import { Form, Input, Button, message, Tag, Divider, Space } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { detectEnvironment, createEnvironmentTagProps, getEnvironmentConfig } from '../utils/environmentDetection';

interface LoginForm {
  username: string;
  password: string;
}

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [quickLoadingUser, setQuickLoadingUser] = useState<string | null>(null);
  const navigate = useNavigate();

  // 使用统一的环境检测工具
  const envInfo = detectEnvironment();
  const envTagProps = createEnvironmentTagProps('normal');

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

  // 开发环境快速登录
  const handleQuickLogin = async (username: 'admin' | 'qiudl') => {
    const { apiBaseURL, isLocal } = getEnvironmentConfig();
    if (!isLocal) {
      message.warning('快速登录仅在本地开发环境可用');
      return;
    }
    try {
      setQuickLoadingUser(username);
      const resp = await fetch(`${apiBaseURL}/auth/dev-quick-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      if (data.success && data.data) {
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('currentUser', JSON.stringify({
          id: data.data.user.id,
          username: data.data.user.username,
          role: data.data.user.role
        }));
        message.success(`已使用 ${username} 快速登录`);
        navigate('/');
      } else {
        message.error(data.message || '快速登录失败');
      }
    } catch (e: any) {
      message.error(e?.message || '快速登录失败');
    } finally {
      setQuickLoadingUser(null);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        {/* 环境标识 */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <Tag 
            {...envTagProps}
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
        
        {/* 本地开发环境下显示快速登录区块 */}
        {envInfo.text.includes('本地开发') && (
          <div style={{ marginTop: 16 }}>
            <Divider plain>开发便捷登录</Divider>
            <div style={{
              background: '#fafafa',
              border: '1px dashed #d9d9d9',
              borderRadius: 8,
              padding: 12,
            }}>
              <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 8 }}>
                本地开发仅：支持免密快速登录以下两个账号
              </div>
              <Space style={{ width: '100%', justifyContent: 'center' }} wrap>
                <Button
                  onClick={() => handleQuickLogin('admin')}
                  loading={quickLoadingUser === 'admin'}
                >
                  快速登录：admin
                </Button>
                <Button
                  onClick={() => handleQuickLogin('qiudl')}
                  loading={quickLoadingUser === 'qiudl'}
                >
                  快速登录：qiudl
                </Button>
              </Space>
              <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 8, textAlign: 'center' }}>
                或手动输入：
                <span style={{ marginLeft: 6 }}>admin / 任意密码</span>
                <span style={{ marginLeft: 12 }}>qiudl / 任意密码</span>
              </div>
            </div>
          </div>
        )}
        
       
      </div>
    </div>
  );
};

export default LoginPage;