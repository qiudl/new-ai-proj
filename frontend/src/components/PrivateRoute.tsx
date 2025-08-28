import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Spin } from 'antd';

interface PrivateRouteProps {
  children: React.ReactNode;
}

const isTokenValid = (token: string): boolean => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    const payload = JSON.parse(atob(parts[1]));
    const now = Date.now() / 1000;
    
    // 检查是否过期（提前5分钟判断过期）
    if (payload.exp && payload.exp < (now + 300)) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('🔐 开始认证检查...');
        
        let token = localStorage.getItem('token');
        console.log('📱 当前localStorage中的token:', token ? `${token.substring(0, 20)}...` : 'null');
        
        // 如果没有token或token无效，在开发环境下自动获取
        if (!token || !isTokenValid(token)) {
          console.log('🚀 Token无效，尝试开发环境自动登录...');
          
          // 检查是否是开发环境且端口为3001
          console.log('🔍 环境检查:', {
            port: window.location.port,
            nodeEnv: process.env.NODE_ENV,
            hostname: window.location.hostname
          });
          
          if (window.location.port === '3001') {
            try {
              const response = await fetch('/api/v1/auth/dev-quick-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: 'admin' })
              });
              
              if (response.ok) {
                const data = await response.json();
                if (data.success && data.data && data.data.access_token) {
                  localStorage.setItem('token', data.data.access_token);
                  localStorage.setItem('currentUser', JSON.stringify(data.data.user));
                  console.log('✅ 自动登录成功:', data.data.user.username);
                  console.log('💾 Token已保存到localStorage:', data.data.access_token.substring(0, 20) + '...');
                  token = data.data.access_token;
                } else {
                  console.warn('自动登录API响应数据结构异常:', data);
                }
              } else {
                console.warn('自动登录API响应失败:', response.status);
              }
            } catch (error) {
              console.error('自动登录失败:', error);
            }
          } else {
            console.log('💡 非开发环境或端口不匹配，跳过自动登录');
          }
        }
        
        const isValid = !!token && isTokenValid(token);
        console.log('🔍 最终认证结果:', isValid ? '通过' : '失败');
        
        // 简化认证逻辑：如果有有效token就认为已认证
        if (isValid) {
          console.log('✅ 认证通过，允许访问');
          setAuthenticated(true);
        } else {
          console.log('❌ 认证失败，需要登录');
          setAuthenticated(false);
        }
        
      } catch (error) {
        console.error('认证检查异常:', error);
        setAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    // 使用全屏模式以满足 antd Spin 对 tip 的要求，避免控制台警告
    return (
      <Spin size="large" tip="正在验证身份..." fullscreen />
    );
  }

  if (!authenticated) {
    console.log('❌ 认证失败，重定向到登录页');
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
