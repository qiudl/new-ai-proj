// @ts-nocheck

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface PrivateRouteProps {
  children: React.ReactNode;
}

const isTokenValid = (token: string): boolean => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    const payload = JSON.parse(atob(parts[1]));
    const now = Date.now() / 1000;
    
    // 检查是否过期，给5分钟缓冲时间避免时间同步问题
    if (payload.exp && payload.exp < (now - 300)) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.warn('Token格式无效:', error);
    return false;
  }
};

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const location = useLocation();
  const token = localStorage.getItem('token');
  
  // 如果已经在登录页面，直接允许访问
  if (location.pathname === '/login') {
    return <>{children}</>;
  }
  
  // 检查token是否存在且有效
  if (!token || !isTokenValid(token)) {
    // 清除无效token（静默处理，不输出日志干扰）
    if (token) {
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');
    }
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

export default PrivateRoute;