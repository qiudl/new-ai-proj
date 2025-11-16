import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Result, Typography } from 'antd';
import { MailOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './ForgotPasswordPage.css';

const { Title, Paragraph } = Typography;

interface ForgotPasswordFormValues {
  email: string;
}

const ForgotPasswordPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState('');

  const handleSubmit = async (values: ForgotPasswordFormValues) => {
    setLoading(true);

    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:8080'}/api/v1/auth/forgot-password`, {
        email: values.email,
      });

      if (response.data.success) {
        setMaskedEmail(response.data.data.email || values.email);
        setEmailSent(true);
        message.success('密码重置邮件已发送');
      }
    } catch (error: any) {
      console.error('Error requesting password reset:', error);

      // Check for rate limiting error
      if (error.response?.status === 429) {
        message.error('请求过于频繁，请稍后再试');
      } else if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error('发送重置邮件失败，请稍后再试');
      }
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="forgot-password-container">
        <Card className="forgot-password-card">
          <Result
            status="success"
            title="邮件已发送"
            subTitle={
              <>
                <Paragraph>
                  我们已向 <strong>{maskedEmail}</strong> 发送了密码重置邮件。
                </Paragraph>
                <Paragraph>
                  请检查您的邮箱（包括垃圾邮件文件夹），并点击邮件中的链接重置密码。
                </Paragraph>
                <Paragraph>
                  重置链接将在 <strong>30分钟</strong> 后失效。
                </Paragraph>
              </>
            }
            extra={[
              <Button type="primary" key="login">
                <Link to="/login">返回登录</Link>
              </Button>,
              <Button
                key="resend"
                onClick={() => {
                  setEmailSent(false);
                  form.resetFields();
                }}
              >
                重新发送
              </Button>,
            ]}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="forgot-password-container">
      <Card className="forgot-password-card">
        <div className="forgot-password-header">
          <Link to="/login" className="back-link">
            <ArrowLeftOutlined /> 返回登录
          </Link>
          <Title level={2}>忘记密码</Title>
          <Paragraph className="subtitle">
            请输入您的注册邮箱，我们将向您发送密码重置链接
          </Paragraph>
        </div>

        <Form
          form={form}
          name="forgot-password"
          onFinish={handleSubmit}
          layout="vertical"
          className="forgot-password-form"
        >
          <Form.Item
            name="email"
            label="邮箱地址"
            rules={[
              { required: true, message: '请输入邮箱地址' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="your.email@example.com"
              size="large"
              autoComplete="email"
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
              {loading ? '发送中...' : '发送重置邮件'}
            </Button>
          </Form.Item>

          <div className="form-footer">
            <Paragraph className="hint-text">
              如果您没有收到邮件，请检查垃圾邮件文件夹或联系系统管理员
            </Paragraph>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default ForgotPasswordPage;
