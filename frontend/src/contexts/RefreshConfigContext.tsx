import React, { useState, useContext, createContext } from 'react';
import { 
  RefreshConfig, 
  RefreshInterval, 
  REFRESH_INTERVALS, 
  DEFAULT_REFRESH_CONFIG 
} from '../types/refreshConfig';

// 重新导出 REFRESH_INTERVALS 以便其他组件使用
export { REFRESH_INTERVALS };

// 刷新配置上下文
interface RefreshConfigContextType {
  config: RefreshConfig;
  updateConfig: (updates: Partial<RefreshConfig>) => void;
  resetConfig: () => void;
  saveConfig: () => void;
  loadConfig: () => void;
}

const RefreshConfigContext = createContext<RefreshConfigContextType | null>(null);

// 本地存储键
const STORAGE_KEY = 'taskDetailRefreshConfig';

// 刷新配置提供者组件
export const RefreshConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<RefreshConfig>(() => {
    // 从本地存储加载配置
    try {
      const savedConfig = localStorage.getItem(STORAGE_KEY);
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        return { ...DEFAULT_REFRESH_CONFIG, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load refresh config from localStorage:', error);
    }
    return DEFAULT_REFRESH_CONFIG;
  });

  const updateConfig = (updates: Partial<RefreshConfig>) => {
    setConfig(prev => {
      const newConfig = { ...prev, ...updates };
      // 自动保存到本地存储
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
      } catch (error) {
        console.warn('Failed to save refresh config to localStorage:', error);
      }
      return newConfig;
    });
  };

  const resetConfig = () => {
    setConfig(DEFAULT_REFRESH_CONFIG);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to remove refresh config from localStorage:', error);
    }
  };

  const saveConfig = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.warn('Failed to save refresh config to localStorage:', error);
    }
  };

  const loadConfig = () => {
    try {
      const savedConfig = localStorage.getItem(STORAGE_KEY);
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        setConfig({ ...DEFAULT_REFRESH_CONFIG, ...parsed });
      }
    } catch (error) {
      console.warn('Failed to load refresh config from localStorage:', error);
    }
  };

  return (
    <RefreshConfigContext.Provider value={{
      config,
      updateConfig,
      resetConfig,
      saveConfig,
      loadConfig
    }}>
      {children}
    </RefreshConfigContext.Provider>
  );
};

// 使用刷新配置的Hook
export const useRefreshConfig = (): RefreshConfigContextType => {
  const context = useContext(RefreshConfigContext);
  if (!context) {
    throw new Error('useRefreshConfig must be used within RefreshConfigProvider');
  }
  return context;
};

// 配置验证函数
export const validateRefreshConfig = (config: Partial<RefreshConfig>): string[] => {
  const errors: string[] = [];

  if (config.defaultInterval !== undefined) {
    if (config.defaultInterval < 0) {
      errors.push('默认刷新间隔不能为负数');
    }
    if (config.defaultInterval > 0 && config.defaultInterval < 10) {
      errors.push('刷新间隔不能小于10秒（性能考虑）');
    }
  }

  if (config.maxRetries !== undefined) {
    if (config.maxRetries < 0) {
      errors.push('最大重试次数不能为负数');
    }
    if (config.maxRetries > 10) {
      errors.push('最大重试次数不应超过10次');
    }
  }

  if (config.retryInterval !== undefined) {
    if (config.retryInterval < 1000) {
      errors.push('重试间隔不能小于1秒');
    }
    if (config.retryInterval > 60000) {
      errors.push('重试间隔不应超过60秒');
    }
  }

  if (config.errorNotificationDuration !== undefined) {
    if (config.errorNotificationDuration < 1000) {
      errors.push('错误通知持续时间不能小于1秒');
    }
    if (config.errorNotificationDuration > 30000) {
      errors.push('错误通知持续时间不应超过30秒');
    }
  }

  return errors;
};

// 间隔标签映射
export const getIntervalLabel = (interval: RefreshInterval): string => {
  switch (interval) {
    case REFRESH_INTERVALS.DISABLED:
      return '禁用';
    case REFRESH_INTERVALS.FAST:
      return '快速 (15秒)';
    case REFRESH_INTERVALS.NORMAL:
      return '正常 (30秒)';
    case REFRESH_INTERVALS.SLOW:
      return '慢速 (60秒)';
    case REFRESH_INTERVALS.VERY_SLOW:
      return '很慢 (2分钟)';
    default:
      return `自定义 (${interval}秒)`;
  }
};
