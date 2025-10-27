import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { message } from 'antd';
import { Enterprise, EnterpriseUser } from '../types/enterprise';
import { User } from '../types/user';
import enterpriseService from '../services/enterpriseService';

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

  // 获取企业列表
  const refreshEnterprises = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await enterpriseService.getEnterprises(1, 100);
      setEnterprises(response.data);
      
    } catch (err) {
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
      
      const enterprise = await enterpriseService.getEnterprise(enterpriseId);
      setCurrentEnterprise(enterprise);
      
      // 保存到本地存储
      localStorage.setItem('currentEnterpriseId', enterpriseId.toString());
      
    } catch (err) {
      console.error('❌ 企业切换失败:', err);
      const errorMessage = err instanceof Error ? err.message : '企业切换失败';
      setError(errorMessage);
      message.error(errorMessage);
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
      
      const enterprise = await enterpriseService.getEnterprise(enterpriseId);
      return enterprise;
      
    } catch (err) {
      console.error('❌ 获取用户企业信息失败:', err);
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