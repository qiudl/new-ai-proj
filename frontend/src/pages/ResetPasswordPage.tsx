import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Result, Typography, Alert, Progress } from 'antd';
import { LockOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import './ResetPasswordPage.css';

const { Title, Paragraph } = Typography;

interface ResetPasswordFormValues {
  new_password: string;
  confirm_password: string;
}

const ResetPasswordPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      message.error('缺少重置令牌');
      navigate('/forgot-password');
      return;
    }

    verifyToken(token);
  }, [token, navigate]);

  const verifyToken = async (tokenValue: string) => {
    setVerifying(true);
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || '/api/v1'}/api/v1/auth/verify-reset-token`,
        { token: tokenValue }
      );

      if (response.data.success) {
        setTokenValid(true);
        setMaskedEmail(response.data.data.email);
        setExpiresAt(response.data.data.expires_at);
      }
    } catch (error: any) {
      console.error('Error verifying token:', error);
      setTokenValid(false);

      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error('令牌无效或已过期');
      }
    } finally {
      setVerifying(false);
    }
  };

  const calculatePasswordStrength = (password: string): number => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 25;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
    if (/\d/.test(password)) strength += 12.5;
    if (/[^a-zA-Z\d]/.test(password)) strength += 12.5;
    return Math.min(strength, 100);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const password = e.target.value;
    setPasswordStrength(calculatePasswordStrength(password));
  };

  const getPasswordStrengthColor = (): string => {
    if (passwordStrength < 40) return '#ff4d4f';
    if (passwordStrength < 70) return '#faad14';
    return '#52c41a';
  };

  const getPasswordStrengthText = (): string => {
    if (passwordStrength < 40) return '弱';
    if (passwordStrength < 70) return '中';
    return '强';
  };

  const handleSubmit = async (values: ResetPasswordFormValues) => {
    if (!token) {
      message.error('缺少重置令牌');
      return;
    }

    if (values.new_password !== values.confirm_password) {
      message.error('两次输入的密码不一致');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || '/api/v1'}/api/v1/auth/reset-password`,
        {
          token: token,
          new_password: values.new_password,
          confirm_password: values.confirm_password,
        }
      );

      if (response.data.success) {
        setResetSuccess(true);
        message.success('密码重置成功');

        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (error: any) {
      console.error('Error resetting password:', error);

      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error('密码重置失败，请稍后再试');
      }
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="reset-password-container">
        <Card className="reset-password-card" loading>
          <Paragraph>正在验证重置令牌...</Paragraph>
        </Card>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="reset-password-container">
        <Card className="reset-password-card">
          <Result
            status="error"
            title="令牌无效"
            subTitle="此密码重置链接已失效或不存在。请重新请求密码重置。"
            extra={[
              <Button type="primary" key="forgot">
                <Link to="/forgot-password">重新申请重置密码</Link>
              </Button>,
              <Button key="login">
                <Link to="/login">返回登录</Link>
              </Button>,
            ]}
          />
        </Card>
      </div>
    );
  }

  if (resetSuccess) {
    return (
      <div className="reset-password-container">
        <Card className="reset-password-card">
          <Result
            status="success"
            icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            title="密码重置成功"
            subTitle={
              <>
                <Paragraph>您的密码已成功重置。</Paragraph>
                <Paragraph>3秒后将自动跳转到登录页面...</Paragraph>
              </>
            }
            extra={[
              <Button type="primary" key="login">
                <Link to="/login">立即登录</Link>
              </Button>,
            ]}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="reset-password-container">
      <Card className="reset-password-card">
        <div className="reset-password-header">
          <Title level={2}>重置密码</Title>
          <Paragraph className="subtitle">
            为账户 <strong>{maskedEmail}</strong> 设置新密码
          </Paragraph>
        </div>

        {expiresAt && (
          <Alert
            message={`此链接将在 ${new Date(expiresAt).toLocaleString('zh-CN')} 失效`}
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        <Form
          form={form}
          name="reset-password"
          onFinish={handleSubmit}
          layout="vertical"
          className="reset-password-form"
        >
          <Form.Item
            name="new_password"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 8, message: '密码长度至少为8个字符' },
              {
                pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/,
                message: '密码必须包含大写字母、小写字母和数字',
              },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入新密码（至少8个字符）"
              size="large"
              onChange={handlePasswordChange}
              autoComplete="new-password"
            />
          </Form.Item>

          {passwordStrength > 0 && (
            <div className="password-strength">
              <div className="strength-label">
                <span>密码强度: </span>
                <span style={{ color: getPasswordStrengthColor() }}>
                  {getPasswordStrengthText()}
                </span>
              </div>
              <Progress
                percent={passwordStrength}
                strokeColor={getPasswordStrengthColor()}
                showInfo={false}
                size="small"
              />
            </div>
          )}

          <Form.Item
            name="confirm_password"
            label="确认新密码"
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
              placeholder="请再次输入新密码"
              size="large"
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
            >
              {loading ? '重置中...' : '重置密码'}
            </Button>
          </Form.Item>

          <div className="form-footer">
            <Paragraph className="hint-text">
              密码要求：至少8个字符，包含大写字母、小写字母和数字
            </Paragraph>
            <Link to="/login" className="back-to-login">
              返回登录
            </Link>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default ResetPasswordPage;
