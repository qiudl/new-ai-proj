import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import TokenManager from '../utils/tokenManager';
import TokenRefreshManager from '../utils/tokenRefreshManager';

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        
        // 使用TokenManager检查当前token状态
        let isTokenCurrentlyValid = TokenManager.isTokenValid();
        
        // 如果token无效，在开发环境下尝试自动刷新
        if (!isTokenCurrentlyValid) {
          
          try {
            const tokenRefreshManager = TokenRefreshManager.getInstance();
            const refreshResult = await tokenRefreshManager.refreshToken();
            
            if (refreshResult.success) {
              isTokenCurrentlyValid = true;
            } else {
              // 清除无效的token数据
              TokenManager.clearAuthData();
            }
          } catch (refreshError) {
            console.error('Token刷新过程异常:', refreshError);
            TokenManager.clearAuthData();
          }
        }
        
        setAuthenticated(isTokenCurrentlyValid);
        
      } catch (error) {
        console.error('认证检查异常:', error);
        setAuthenticated(false);
        TokenManager.clearAuthData();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px', color: '#666', fontSize: '14px' }}>
          正在验证身份...
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;