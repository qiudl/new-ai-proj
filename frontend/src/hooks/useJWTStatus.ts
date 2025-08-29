import { useState, useEffect, useCallback } from 'react';
import TokenManager from '../utils/tokenManager';

// jwtDebugger module not available - implementing inline JWT validation

interface JWTStatus {
  hasToken: boolean;
  isValid: boolean;
  isExpired: boolean;
  payload?: any;
  expiresIn?: number;
  errors: string[];
}

interface UseJWTStatusOptions {
  moduleName?: string;
  checkInterval?: number; // 检查间隔（毫秒）
  autoRefresh?: boolean; // 是否自动刷新
}

export const useJWTStatus = (options: UseJWTStatusOptions = {}) => {
  const {
    moduleName = 'useJWTStatus',
    checkInterval = 30000, // 默认30秒检查一次
    autoRefresh = true
  } = options;

  const [jwtStatus, setJwtStatus] = useState<JWTStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // 检查JWT状态 - 使用TokenManager统一处理
  const checkStatus = useCallback(() => {
    const token = TokenManager.getToken();
    
    if (!token) {
      setJwtStatus({
        hasToken: false,
        isValid: false,
        isExpired: true,
        errors: ['No token found']
      });
      setLoading(false);
      return;
    }

    const isExpired = TokenManager.isTokenExpired(token);
    const payload = TokenManager.getTokenPayload();
    const remainingTime = TokenManager.getTokenRemainingTime();
    
    setJwtStatus({
      hasToken: true,
      isValid: !isExpired,
      isExpired,
      payload,
      expiresIn: remainingTime,
      errors: isExpired ? ['Token expired'] : []
    });
    
    setLoading(false);
    return status;
  }, []);

  // 刷新JWT状态
  const refresh = useCallback(() => {
    setLoading(true);
    return checkStatus();
  }, [checkStatus]);

  // 测试JWT - 使用TokenManager
  const testJWT = useCallback(async (endpoint?: string) => {
    const token = TokenManager.getToken();
    if (!token) {
      return { success: false, error: 'No token available' };
    }
    
    try {
      const response = await fetch(endpoint || '/api/v1/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      return { 
        success: response.ok, 
        status: response.status,
        data: response.ok ? await response.json() : null,
        error: response.ok ? null : `HTTP ${response.status}`
      };
    } catch (error) {
      return { success: false, error: `Network error: ${error}` };
    }
  }, []);

  // 初始化和定时检查
  useEffect(() => {
    // 初始检查
    checkStatus();

    if (!autoRefresh) return;

    // 设置定时检查
    const interval = setInterval(() => {
      checkStatus();
    }, checkInterval);

    // 监听localStorage变化
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token') {
        checkStatus();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // 监听页面焦点变化
    const handleFocus = () => {
      checkStatus();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkStatus, checkInterval, autoRefresh]);

  return {
    jwtStatus,
    loading,
    refresh,
    testJWT,
    // 便捷属性
    hasToken: jwtStatus?.hasToken ?? false,
    isValid: jwtStatus?.isValid ?? false,
    isExpired: jwtStatus?.isExpired ?? false,
    hasErrors: (jwtStatus?.errors?.length ?? 0) > 0,
    expiresIn: jwtStatus?.expiresIn,
    userInfo: jwtStatus?.payload,
  };
};