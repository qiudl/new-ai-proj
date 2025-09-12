import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, Button, Result, Space, Typography, Tag, Collapse } from 'antd';
import {
  BugOutlined,
  ReloadOutlined,
  HomeOutlined,
  QuestionCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';

const { Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showReloadButton?: boolean;
  showHomeButton?: boolean;
  showDetails?: boolean;
  level?: 'page' | 'component' | 'widget';
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId: string;
  collapsed: boolean;
}

// 生成错误ID
const generateErrorId = () => {
  return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// 简化堆栈信息
const simplifyStackTrace = (stack: string): string => {
  return stack
    .split('\n')
    .slice(0, 5)
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
};

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorId: '',
    collapsed: true,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { 
      hasError: true, 
      error,
      errorId: generateErrorId(),
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // 调用自定义错误处理函数
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    console.error('ErrorBoundary caught an error:', {
      error,
      errorInfo,
      errorId: this.state.errorId,
      component: errorInfo.componentStack,
    });

    // 可以在这里发送错误报告到监控服务
    this.reportError(error, errorInfo);
  }

  // 错误报告函数
  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    const errorReport = {
      errorId: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      level: this.props.level || 'component',
    };

    if (process.env.NODE_ENV === 'production') {
      console.log('Error report:', errorReport);
    }
  };

  private handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: undefined,
      errorInfo: undefined,
      errorId: '',
      collapsed: true,
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private toggleDetails = () => {
    this.setState(prev => ({ collapsed: !prev.collapsed }));
  };

  private renderErrorDetails = () => {
    const { error, errorInfo, errorId } = this.state;
    
    if (!error || !errorInfo) return null;

    return (
      <Card 
         
        title="错误详情" 
        extra={
          <Button 
            type="link" 
             
            onClick={this.toggleDetails}
          >
            {this.state.collapsed ? '展开' : '收起'}
          </Button>
        }
        style={{ marginTop: 16, textAlign: 'left' }}
      >
        <Collapse 
          activeKey={this.state.collapsed ? [] : ['details']}
          ghost
          onChange={() => this.toggleDetails()}
        >
          <Panel header="技术详情" key="details">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>错误ID：</Text>
                <Tag color="red">{errorId}</Tag>
              </div>
              
              <div>
                <Text strong>错误消息：</Text>
                <Paragraph code>{error.message}</Paragraph>
              </div>

              <div>
                <Text strong>发生时间：</Text>
                <Text>{new Date().toLocaleString()}</Text>
              </div>

              {error.stack && (
                <div>
                  <Text strong>堆栈跟踪：</Text>
                  <Paragraph>
                    <pre style={{ 
                      fontSize: '12px', 
                      background: '#f5f5f5',
                      padding: '8px',
                      borderRadius: '4px',
                      overflow: 'auto',
                      maxHeight: '200px',
                    }}>
                      {simplifyStackTrace(error.stack)}
                    </pre>
                  </Paragraph>
                </div>
              )}

              {errorInfo.componentStack && (
                <div>
                  <Text strong>组件堆栈：</Text>
                  <Paragraph>
                    <pre style={{ 
                      fontSize: '12px', 
                      background: '#f5f5f5',
                      padding: '8px',
                      borderRadius: '4px',
                      overflow: 'auto',
                      maxHeight: '150px',
                    }}>
                      {errorInfo.componentStack}
                    </pre>
                  </Paragraph>
                </div>
              )}
            </Space>
          </Panel>
        </Collapse>
      </Card>
    );
  };

  private renderErrorUI = () => {
    const { 
      level = 'component', 
      showReloadButton = true, 
      showHomeButton = false, 
      showDetails = true 
    } = this.props;

    // 小部件级错误：较小的错误提示
    if (level === 'widget') {
      return (
        <div style={{ 
          padding: '16px', 
          textAlign: 'center',
          border: '1px dashed #d9d9d9',
          borderRadius: '6px',
          background: '#fafafa',
        }}>
          <Space direction="vertical">
            <WarningOutlined style={{ fontSize: '24px', color: '#faad14' }} />
            <Text type="secondary">组件加载失败</Text>
            <Button  onClick={this.handleReset}>
              重试
            </Button>
          </Space>
        </div>
      );
    }

    // 页面级或应用级错误：完整的错误页面
    const actions = [];
    
    if (level === 'component') {
      actions.push(
        <Button key="reset" type="primary" onClick={this.handleReset}>
          重新加载组件
        </Button>
      );
    }

    if (showReloadButton) {
      actions.push(
        <Button key="reload" icon={<ReloadOutlined />} onClick={this.handleReload}>
          刷新页面
        </Button>
      );
    }

    if (showHomeButton) {
      actions.push(
        <Button key="home" icon={<HomeOutlined />} onClick={this.handleGoHome}>
          回到首页
        </Button>
      );
    }

    return (
      <div style={{ padding: '24px' }}>
        <Result
          status="error"
          icon={<BugOutlined />}
          title="哎呀，出现了一些问题"
          subTitle={
            level === 'page' 
              ? "页面遇到了意外错误，我们已经记录了这个问题。" 
              : "这个组件遇到了意外错误，请尝试重新加载。"
          }
          extra={actions}
        />

        {showDetails && this.renderErrorDetails()}

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Space>
            <QuestionCircleOutlined />
            <Text type="secondary">
              如果问题持续存在，请联系技术支持并提供错误ID
            </Text>
          </Space>
        </div>
      </div>
    );
  };

  public render() {
    if (this.state.hasError) {
      // 如果提供了自定义fallback，优先使用
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // 否则使用默认错误界面
      return this.renderErrorUI();
    }

    return this.props.children;
  }
}

// 高阶组件：为任何组件添加错误边界
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps} level="component">
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

// Hook：用于在函数组件中处理错误
export const useErrorBoundaryHandler = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = () => setError(null);

  const captureError = (error: Error) => {
    setError(error);
    // 触发错误边界
    throw error;
  };

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return {
    captureError,
    resetError,
    hasError: !!error,
  };
};

// 应用级错误边界包装器
export const AppErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    level="page"
    showReloadButton={true}
    showHomeButton={true}
    showDetails={process.env.NODE_ENV === 'development'}
    onError={(error, errorInfo) => {
      // 应用级错误处理
      console.error('Application Error:', error, errorInfo);
    }}
  >
    {children}
  </ErrorBoundary>
);

export default ErrorBoundary;