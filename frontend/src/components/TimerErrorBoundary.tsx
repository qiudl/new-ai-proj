import React, { Component, ReactNode } from 'react';
import { Card, Alert, Button, Typography } from 'antd';
import { ReloadOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: any;
}

class TimerErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Timer Error Boundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReload = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    window.location.reload();
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card
          style={{
            maxWidth: 600,
            margin: '20px auto',
            textAlign: 'center'
          }}
        >
          <div style={{ padding: '20px' }}>
            <ExclamationCircleOutlined 
              style={{ 
                fontSize: '48px', 
                color: '#ff4d4f',
                marginBottom: '16px'
              }} 
            />
            
            <Title level={3} style={{ color: '#ff4d4f' }}>
              计时器组件出现错误
            </Title>
            
            <Text type="secondary" style={{ display: 'block', marginBottom: '24px' }}>
              很抱歉，计时器功能遇到了问题。您可以尝试刷新页面或联系管理员。
            </Text>

            <Alert
              message="错误详情"
              description={this.state.error?.message || '未知错误'}
              type="error"
              style={{ 
                textAlign: 'left', 
                marginBottom: '24px',
                maxWidth: '400px',
                margin: '0 auto 24px auto'
              }}
            />

            <div>
              <Button 
                type="primary" 
                icon={<ReloadOutlined />}
                onClick={this.handleReload}
                style={{ marginRight: '12px' }}
              >
                刷新页面
              </Button>
              
              <Button 
                onClick={this.handleRetry}
              >
                重试
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details style={{ 
                marginTop: '24px', 
                textAlign: 'left',
                padding: '12px',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                <summary style={{ marginBottom: '8px', cursor: 'pointer' }}>
                  开发者信息 (仅开发环境显示)
                </summary>
                <pre style={{ 
                  whiteSpace: 'pre-wrap',
                  fontSize: '11px',
                  lineHeight: '1.4'
                }}>
                  {this.state.error?.stack}
                  {'\n\n'}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default TimerErrorBoundary;