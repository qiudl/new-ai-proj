// @ts-nocheck
import React, { useEffect, useState, useRef } from 'react';
import { Spin, Alert } from 'antd';

interface GlobalLoadingProps {
  loading: boolean;
  tip?: string;
  children: React.ReactNode;
  timeout?: number; // 超时时间(ms)
  onTimeout?: () => void; // 超时回调
  error?: string | null; // 错误信息
}

const GlobalLoading: React.FC<GlobalLoadingProps> = ({ 
  loading, 
  tip = "加载中...", 
  children,
  timeout = 30000, // 默认30秒超时
  onTimeout,
  error
}) => {
  const [isTimeout, setIsTimeout] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 💡 修复：添加超时检测
  useEffect(() => {
    if (loading) {
      setIsTimeout(false);
      
      // 设置超时定时器
      timeoutRef.current = setTimeout(() => {
        setIsTimeout(true);
        onTimeout?.();
      }, timeout);
    } else {
      // 加载完成，清除超时定时器
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsTimeout(false);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [loading, timeout, onTimeout]);

  // 💡 修复：添加错误状态处理
  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <Alert
          message="加载失败"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: '16px' }}
        />
        {children}
      </div>
    );
  }

  // 💡 修复：添加超时状态处理
  if (isTimeout) {
    return (
      <div style={{ padding: '20px' }}>
        <Alert
          message="加载超时"
          description="加载时间过长，请检查网络连接或刷新页面重试"
          type="warning"
          showIcon
          style={{ marginBottom: '16px' }}
        />
        {children}
      </div>
    );
  }

  return (
    <Spin 
      spinning={loading} 
      tip={tip}
      size="large"
      style={{
        minHeight: '200px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {children}
    </Spin>
  );
};

export default GlobalLoading;