import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import api from '../../../services/api';
import { AIConfig } from '../types';

/**
 * AI配置数据Hook
 */
export const useAIConfigs = () => {
  const [configs, setConfigs] = useState<AIConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 获取已启用的AI配置列表
   */
  const fetchAIConfigs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get<{
        success: boolean;
        data: any[];
        message?: string;
      }>('/system/ai-configs/enabled');

      if (!response.data.success) {
        throw new Error(response.data.message || '获取AI配置失败');
      }

      // 转换后端数据格式到前端格式
      const aiConfigs: AIConfig[] = response.data.data.map((item: any) => ({
        id: item.id,
        provider: item.provider,
        model: item.model,
        displayName: `${item.provider.toUpperCase()} - ${item.model}`,
        description: item.description || `使用${item.provider}的${item.model}模型`,
        isEnabled: item.enabled,
      }));

      setConfigs(aiConfigs);
    } catch (err: any) {
      const errorMessage = err.message || '获取AI配置失败';
      setError(errorMessage);
      message.error(errorMessage);
      console.error('获取AI配置失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 组件挂载时获取数据
  useEffect(() => {
    fetchAIConfigs();
  }, [fetchAIConfigs]);

  return {
    configs,
    loading,
    error,
    reload: fetchAIConfigs,
  };
};
