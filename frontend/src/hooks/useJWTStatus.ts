import { useState, useEffect, useCallback } from 'react';
import { jwtDebugger } from '../utils/jwtDebugger';

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

  // 检查JWT状态
  const checkStatus = useCallback(() => {
    const status = jwtDebugger.checkJWTStatus();
    
    // 记录模块调用
    jwtDebugger.logModuleJWTStatus(moduleName);
    
    setJwtStatus(status);
    setLoading(false);
    
    return status;
  }, [moduleName]);

  // 刷新JWT状态
  const refresh = useCallback(() => {
    setLoading(true);
    return checkStatus();
  }, [checkStatus]);

  // 测试JWT
  const testJWT = useCallback(async (endpoint?: string) => {
    return await jwtDebugger.testJWTWithAPI(endpoint);
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