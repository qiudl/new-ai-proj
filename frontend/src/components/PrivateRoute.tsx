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
        console.log('🔐 开始认证检查...');
        
        // 使用TokenManager检查当前token状态
        let isTokenCurrentlyValid = TokenManager.isTokenValid();
        console.log('📱 Token状态检查:', isTokenCurrentlyValid ? '有效' : '无效');
        
        // 如果token无效，在开发环境下尝试自动刷新
        if (!isTokenCurrentlyValid) {
          console.log('🚀 Token无效，尝试自动刷新...');
          
          try {
            const tokenRefreshManager = TokenRefreshManager.getInstance();
            const refreshResult = await tokenRefreshManager.refreshToken();
            
            if (refreshResult.success) {
              console.log('✅ Token自动刷新成功');
              isTokenCurrentlyValid = true;
            } else {
              console.log('❌ Token刷新失败:', refreshResult.error);
              // 清除无效的token数据
              TokenManager.clearAuthData();
            }
          } catch (refreshError) {
            console.error('Token刷新过程异常:', refreshError);
            TokenManager.clearAuthData();
          }
        }
        
        console.log('🔍 最终认证结果:', isTokenCurrentlyValid ? '通过' : '失败');
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
    // 使用包装容器以满足 antd Spin 对 tip 的要求
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <Spin size="large" tip="正在验证身份...">
          <div style={{ padding: 50 }} />
        </Spin>
      </div>
    );
  }

  if (!authenticated) {
    console.log('❌ 认证失败，重定向到登录页');
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;