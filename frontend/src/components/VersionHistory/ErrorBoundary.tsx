/**
 * ErrorBoundary - 错误边界组件
 * 捕获子组件中的错误，防止整个应用崩溃
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary组件
 * 用于捕获版本历史组件中的错误
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // 更新状态以触发降级UI渲染
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 记录错误信息
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // 如果提供了自定义fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 默认错误UI
      return (
        <div style={{ padding: '24px' }}>
          <Alert
            message="组件渲染出错"
            description={
              <div>
                <p>抱歉，版本历史功能遇到了问题。</p>
                {this.state.error && (
                  <p style={{ marginTop: '8px', fontSize: '12px', color: '#8c8c8c' }}>
                    错误信息: {this.state.error.message}
                  </p>
                )}
                <Button
                  type="primary"
                  icon={<ReloadOutlined />}
                  onClick={this.handleReset}
                  style={{ marginTop: '12px' }}
                >
                  重新加载
                </Button>
              </div>
            }
            type="error"
            showIcon
          />
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
