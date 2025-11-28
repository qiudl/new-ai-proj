import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { message } from 'antd';
import { Enterprise, EnterpriseUser } from '../types/enterprise';
import { User } from '../types/user';
import enterpriseService from '../services/enterpriseService';
import { getCurrentUser } from '../utils/userUtils';

interface EnterpriseContextType {
  currentEnterprise: Enterprise | null;
  setCurrentEnterprise: (enterprise: Enterprise | null) => void;
  enterprises: Enterprise[];
  loading: boolean;
  error: string | null;
  refreshEnterprises: () => Promise<void>;
  // 企业用户相关
  switchToEnterprise: (enterpriseId: number) => Promise<void>;
  getUserEnterprise: (user: User) => Promise<Enterprise | null>;
}

const EnterpriseContext = createContext<EnterpriseContextType | undefined>(undefined);

export const useEnterprise = () => {
  const context = useContext(EnterpriseContext);
  if (context === undefined) {
    throw new Error('useEnterprise must be used within an EnterpriseProvider');
  }
  return context;
};

interface EnterpriseProviderProps {
  children: ReactNode;
}

export const EnterpriseProvider: React.FC<EnterpriseProviderProps> = ({ children }) => {
  const [currentEnterprise, setCurrentEnterprise] = useState<Enterprise | null>(null);
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 检查是否为企业用户（user_type 为 'company' 或 'enterprise'）
  const isEnterpriseUser = (user: User | null): boolean => {
    return user?.user_type === 'company' || user?.user_type === 'enterprise';
  };

  // 获取企业列表
  const refreshEnterprises = async () => {
    try {
      setLoading(true);
      setError(null);

      // 获取当前用户信息
      const currentUser = getCurrentUser();

      // 企业用户：只获取自己所属的企业信息，使用企业级 API
      if (isEnterpriseUser(currentUser)) {
        if (currentUser?.enterprise_id) {
          try {
            // 使用 getEnterpriseAuto 自动选择正确的 API 端点
            const enterprise = await enterpriseService.getEnterpriseAuto(currentUser.enterprise_id);
            setEnterprises([enterprise]);
            // 同时设置为当前企业
            if (!currentEnterprise) {
              setCurrentEnterprise(enterprise);
            }
          } catch (err: any) {
            // 获取自己企业信息失败，静默处理
            if (process.env.NODE_ENV === 'development') {
              console.warn('⚠️ 获取用户所属企业信息失败:', err);
            }
            setEnterprises([]);
          }
        } else {
          // 企业用户但没有 enterprise_id，设置空列表
          if (process.env.NODE_ENV === 'development') {
            console.warn('⚠️ 企业用户缺少 enterprise_id');
          }
          setEnterprises([]);
        }
        return;
      }

      // 系统用户：获取所有企业列表
      const response = await enterpriseService.getEnterprises(1, 100);
      setEnterprises(response.data);

    } catch (err: any) {
      // 如果是404/403错误，说明用户无权访问系统管理API或后端尚未实现，静默处理
      if (err?.response?.status === 404 || err?.response?.status === 403 || err?.status === 404 || err?.status === 403) {
        // 仅在开发环境显示警告，生产环境完全静默
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ 企业列表API不可用（权限不足或后端未实现）');
        }
        setEnterprises([]); // 设置空列表
        setError(null); // 不显示错误
        return; // 静默处理，不显示错误消息
      }

      // 仅对非权限问题的真实错误打印日志和显示提示
      console.error('❌ 刷新企业列表失败:', err);
      const errorMessage = err instanceof Error ? err.message : '刷新企业列表失败';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 切换到指定企业
  const switchToEnterprise = async (enterpriseId: number) => {
    try {
      setLoading(true);
      setError(null);

      const enterprise = await enterpriseService.getEnterpriseAuto(enterpriseId);
      setCurrentEnterprise(enterprise);

      // 保存到本地存储
      localStorage.setItem('currentEnterpriseId', enterpriseId.toString());

    } catch (err: any) {
      // 仅在非404/403错误时打印日志和显示错误
      if (err?.response?.status !== 404 && err?.response?.status !== 403) {
        console.error('❌ 企业切换失败:', err);
        const errorMessage = err instanceof Error ? err.message : '企业切换失败';
        setError(errorMessage);
        message.error(errorMessage);
      } else {
        // 权限不足的情况，显示友好提示
        const errorMessage = '您没有权限访问该企业信息';
        setError(errorMessage);
        message.error(errorMessage);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 根据用户信息获取企业
  const getUserEnterprise = async (user: User): Promise<Enterprise | null> => {
    try {
      const enterpriseId = user.enterprise_id;
      if (!enterpriseId) {
        return null;
      }

      const enterprise = await enterpriseService.getEnterpriseAuto(enterpriseId);
      return enterprise;

    } catch (err: any) {
      // 仅在非404/403错误时打印日志
      if (err?.response?.status !== 404 && err?.response?.status !== 403) {
        console.error('❌ 获取用户企业信息失败:', err);
      }
      return null;
    }
  };

  // 初始化时恢复企业信息
  useEffect(() => {
    const initializeEnterprise = async () => {
      // 检查用户是否已登录
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }

      // 尝试从本地存储恢复当前企业
      const savedEnterpriseId = localStorage.getItem('currentEnterpriseId');
      if (savedEnterpriseId) {
        try {
          await switchToEnterprise(parseInt(savedEnterpriseId, 10));
        } catch (error) {
          console.warn('⚠️ 恢复企业状态失败:', error);
          localStorage.removeItem('currentEnterpriseId');
        }
      }

      // 加载企业列表
      await refreshEnterprises();
    };

    initializeEnterprise();

    // 监听存储变化（登录/登出）
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token') {
        if (e.newValue) {
          // 用户登录，刷新企业列表
          initializeEnterprise();
        } else {
          // 用户登出，清空企业数据
          setCurrentEnterprise(null);
          setEnterprises([]);
          localStorage.removeItem('currentEnterpriseId');
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const value: EnterpriseContextType = {
    currentEnterprise,
    setCurrentEnterprise,
    enterprises,
    loading,
    error,
    refreshEnterprises,
    switchToEnterprise,
    getUserEnterprise,
  };

  return (
    <EnterpriseContext.Provider value={value}>
      {children}
    </EnterpriseContext.Provider>
  );
};

export default EnterpriseContext;