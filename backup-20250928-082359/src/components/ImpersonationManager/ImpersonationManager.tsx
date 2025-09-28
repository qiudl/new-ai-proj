import React, { useEffect } from 'react';
import { ConfigProvider } from 'antd';
import { useImpersonationState } from '../../hooks/useImpersonationState';
import { ImpersonationWarningBanner } from '../ImpersonationWarningBanner';
import './ImpersonationManager.css';

interface ImpersonationManagerProps {
  children: React.ReactNode;
}

/**
 * 模拟状态管理组件
 * 负责在应用程序中统一管理模拟状态的视觉反馈
 */
const ImpersonationManager: React.FC<ImpersonationManagerProps> = ({ children }) => {
  const { isImpersonating, isExpired, isExpiringSoon } = useImpersonationState();

  // 管理body类名，用于调整页面布局
  useEffect(() => {
    const body = document.body;
    
    if (isImpersonating) {
      body.classList.add('has-impersonation-banner');
      
      if (isExpired) {
        body.classList.add('impersonation-expired');
        body.classList.remove('impersonation-expiring');
      } else if (isExpiringSoon) {
        body.classList.add('impersonation-expiring');
        body.classList.remove('impersonation-expired');
      } else {
        body.classList.remove('impersonation-expired', 'impersonation-expiring');
      }
    } else {
      body.classList.remove(
        'has-impersonation-banner', 
        'impersonation-expired', 
        'impersonation-expiring'
      );
    }

    // 清理函数
    return () => {
      body.classList.remove(
        'has-impersonation-banner', 
        'impersonation-expired', 
        'impersonation-expiring'
      );
    };
  }, [isImpersonating, isExpired, isExpiringSoon]);

  // 自定义ConfigProvider主题，在模拟状态下调整全局样式
  const getThemeConfig = () => {
    if (!isImpersonating) return {};

    const baseConfig = {
      token: {
        colorWarning: '#fa8c16',
        colorError: '#ff4d4f',
        colorInfo: '#1890ff'
      }
    };

    if (isExpired) {
      return {
        ...baseConfig,
        token: {
          ...baseConfig.token,
          colorPrimary: '#ff4d4f',
          colorLink: '#ff4d4f'
        }
      };
    }

    if (isExpiringSoon) {
      return {
        ...baseConfig,
        token: {
          ...baseConfig.token,
          colorPrimary: '#fa8c16',
          colorLink: '#fa8c16'
        }
      };
    }

    return baseConfig;
  };

  return (
    <div className={`impersonation-manager ${isImpersonating ? 'impersonating' : ''}`}>
      {/* 警告横幅 */}
      <ImpersonationWarningBanner />
      
      {/* 主要内容区域 */}
      <ConfigProvider theme={getThemeConfig()}>
        <div className="impersonation-content">
          {children}
        </div>
      </ConfigProvider>
    </div>
  );
};

export default ImpersonationManager;