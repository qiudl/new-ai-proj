import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { message } from 'antd';
import { 
  ImpersonationStateContextType, 
  ImpersonationStatus,
  ImpersonationHistoryItem,
  ImpersonationWarning,
  ImpersonationWarningType,
  StartImpersonationResponse,
  ExitImpersonationResponse,
  ImpersonationHistoryResponse
} from '../types/impersonation';
import impersonationService from '../services/impersonationService';

const ImpersonationContext = createContext<ImpersonationStateContextType | undefined>(undefined);

export const useImpersonation = () => {
  const context = useContext(ImpersonationContext);
  if (context === undefined) {
    throw new Error('useImpersonation must be used within an ImpersonationProvider');
  }
  return context;
};

interface ImpersonationProviderProps {
  children: ReactNode;
}

export const ImpersonationProvider: React.FC<ImpersonationProviderProps> = ({ children }) => {
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonationStatus, setImpersonationStatus] = useState<ImpersonationStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');

  // 检查模拟状态
  const getImpersonationStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const status = await impersonationService.getStatus();
      
      setImpersonationStatus(status);
      setIsImpersonating(status.is_impersonating);
      
      if (status.is_impersonating) {
        
        // 检查会话是否即将过期
        if (status.session?.expires_at) {
          const expiresAt = new Date(status.session.expires_at);
          const now = new Date();
          const minutesLeft = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60));
          
          if (minutesLeft <= 10 && minutesLeft > 0) {
            setShowWarning(true);
            setWarningMessage(`模拟会话将在 ${minutesLeft} 分钟后过期`);
          } else if (minutesLeft <= 0) {
            setShowWarning(true);
            setWarningMessage('模拟会话已过期');
          }
        }
      } else {
      }
      
    } catch (err) {
      console.error('❌ 获取模拟状态失败:', err);
      const errorMessage = err instanceof Error ? err.message : '获取模拟状态失败';
      setError(errorMessage);
      
      // 如果是认证错误，清除状态
      if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
        setIsImpersonating(false);
        setImpersonationStatus(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // 开始模拟
  const startImpersonation = useCallback(async (enterpriseId: number, reason: string) => {
    try {
      setLoading(true);
      setError(null);
      
      
      const response: StartImpersonationResponse = await impersonationService.startImpersonation(enterpriseId, reason);
      
      if (response.success) {
        // 更新token
        if (response.token) {
          const oldToken = localStorage.getItem('token');
          localStorage.setItem('token', response.token);
          
          // 手动触发状态刷新，因为同窗口localStorage变化不会触发storage事件
        }
        
        // 刷新状态 - 必须在token更新后调用
        await getImpersonationStatus();
        
        message.success(`开始模拟企业: ${response.enterprise.name}`);
        
        // 设置警告提示
        setShowWarning(true);
        setWarningMessage(`您正在模拟企业 "${response.enterprise.name}" 的操作`);
        
      } else {
        throw new Error(response.message || '开始模拟失败');
      }
      
    } catch (err) {
      console.error('❌ 开始模拟失败:', err);
      const errorMessage = err instanceof Error ? err.message : '开始模拟失败';
      setError(errorMessage);
      message.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getImpersonationStatus]);

  // 退出模拟
  const exitImpersonation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      
      const response: ExitImpersonationResponse = await impersonationService.exitImpersonation();
      
      if (response.success) {
        // 更新token
        if (response.token) {
          localStorage.setItem('token', response.token);
        }
        
        // 清除状态
        setIsImpersonating(false);
        setImpersonationStatus(null);
        setShowWarning(false);
        setWarningMessage('');
        
        message.success(`已退出模拟，恢复为用户: ${response.original_user.username}`);
        
      } else {
        throw new Error(response.message || '退出模拟失败');
      }
      
    } catch (err) {
      console.error('❌ 退出模拟失败:', err);
      const errorMessage = err instanceof Error ? err.message : '退出模拟失败';
      setError(errorMessage);
      message.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // 获取模拟历史
  const getImpersonationHistory = useCallback(async (page = 1, pageSize = 10): Promise<ImpersonationHistoryItem[]> => {
    try {
      setLoading(true);
      setError(null);
      
      
      const response: ImpersonationHistoryResponse = await impersonationService.getHistory(page, pageSize);
      
      return response.data;
      
    } catch (err) {
      console.error('❌ 获取模拟历史失败:', err);
      const errorMessage = err instanceof Error ? err.message : '获取模拟历史失败';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // 刷新状态
  const refreshStatus = useCallback(async () => {
    await getImpersonationStatus();
  }, [getImpersonationStatus]);

  // 触发token变化事件的辅助函数
  const triggerTokenChangeEvent = useCallback(() => {
    window.dispatchEvent(new CustomEvent('tokenChanged'));
  }, []);

  // 关闭警告
  const dismissWarning = useCallback(() => {
    setShowWarning(false);
    setWarningMessage('');
  }, []);

  // 检查会话过期的定时器
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isImpersonating && impersonationStatus?.session?.expires_at) {
      intervalId = setInterval(() => {
        const expiresAt = new Date(impersonationStatus.session!.expires_at);
        const now = new Date();
        const minutesLeft = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60));

        if (minutesLeft <= 0) {
          setShowWarning(true);
          setWarningMessage('模拟会话已过期，请刷新页面');
          clearInterval(intervalId);
        } else if (minutesLeft <= 10) {
          setShowWarning(true);
          setWarningMessage(`模拟会话将在 ${minutesLeft} 分钟后过期`);
        }
      }, 60000); // 每分钟检查一次
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isImpersonating, impersonationStatus?.session?.expires_at]);

  // 初始化时检查模拟状态
  useEffect(() => {
    const initializeImpersonation = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        await getImpersonationStatus();
      }
    };

    initializeImpersonation();

    // 监听token变化（仅用于跨窗口）
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token') {
        if (e.newValue) {
          initializeImpersonation();
        } else {
          setIsImpersonating(false);
          setImpersonationStatus(null);
          setShowWarning(false);
          setWarningMessage('');
        }
      }
    };

    // 监听自定义token变化事件（用于同窗口）
    const handleCustomTokenChange = (e: CustomEvent) => {
      initializeImpersonation();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('tokenChanged', handleCustomTokenChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('tokenChanged', handleCustomTokenChange as EventListener);
    };
  }, [getImpersonationStatus]);

  const value: ImpersonationStateContextType = {
    isImpersonating,
    impersonationStatus,
    loading,
    error,
    startImpersonation,
    exitImpersonation,
    getImpersonationStatus,
    getImpersonationHistory,
    refreshStatus,
    triggerTokenChangeEvent,
    showWarning,
    warningMessage,
    dismissWarning,
  };

  return (
    <ImpersonationContext.Provider value={value}>
      {children}
    </ImpersonationContext.Provider>
  );
};

export default ImpersonationContext;