import api from '../services/api'; // 使用配置好认证的api实例

export interface AIModel {
  key: string;
  label: string;
  icon: string;
  description: string;
  enabled: boolean;
  provider: 'openai' | 'anthropic' | 'google' | 'deepseek';
  modelName?: string; // 实际的模型名称，如 gpt-4o, claude-sonnet-4-5-20250929
}

// 默认的AI模型配置（作为备选）
// 注意: key 必须与数据库中的 provider 字段一致
export const DEFAULT_AI_MODELS: AIModel[] = [
  {
    key: 'openai',  // 使用provider名称作为key
    label: 'GPT-4o',
    icon: '✨',
    description: '最强推理能力，适合复杂任务分解',
    enabled: true,
    provider: 'openai',
    modelName: 'gpt-4o'
  },
  {
    key: 'claude',  // anthropic的别名
    label: 'Claude 4.5 Sonnet',
    icon: '🔷',
    description: '最强代码能力和任务规划',
    enabled: true,
    provider: 'anthropic',
    modelName: 'claude-sonnet-4-5-20250929'
  },
  {
    key: 'google',
    label: 'Gemini Pro',
    icon: '💎',
    description: 'Google最新AI模型',
    enabled: false,
    provider: 'google',
    modelName: 'gemini-pro'
  },
  {
    key: 'deepseek',
    label: 'DeepSeek',
    icon: '🌟',
    description: '国产开源AI，性价比高',
    enabled: false,
    provider: 'deepseek',
    modelName: 'deepseek-chat'
  }
];

/**
 * 从后端API获取AI模型配置
 * 调用 /api/v1/system/ai-configs 获取数据库中的AI配置
 */
export const fetchAIModelsFromAPI = async (): Promise<AIModel[]> => {
  try {
    // 使用配置好认证拦截器的api实例
    const response = await api.get('/system/ai-configs/enabled');

    // 注意：axios拦截器已经解包了响应，response.data 直接是数据数组
    // 实际API返回: { success: true, data: [...] }
    // 拦截器解包后: response.data = [...]
    const configs = response.data;

    // 检查是否是数组
    if (Array.isArray(configs) && configs.length > 0) {
      // /enabled端点返回的都是启用的配置,无需filter
      return configs.map((config: any) => ({
        key: config.provider,
        label: getProviderLabel(config.provider),
        icon: getProviderIcon(config.provider),
        description: getProviderDescription(config.provider, config.model),
        enabled: true, // /enabled端点保证都是启用状态
        provider: config.provider,
        modelName: config.model
      }));
    }

    // 如果没有配置或data为null，降级到默认配置
    console.warn('No AI configurations found in database, using defaults');
    return DEFAULT_AI_MODELS;
  } catch (error) {
    console.error('Failed to fetch AI models from API:', error);
    // 降级到默认配置
    return DEFAULT_AI_MODELS;
  }
};

// Provider辅助函数
export const getProviderLabel = (provider: string): string => {
  const labels: Record<string, string> = {
    openai: 'OpenAI GPT',
    claude: 'Claude (Anthropic)',
    deepseek: 'DeepSeek',
    google: 'Google Gemini'
  };
  return labels[provider] || provider;
};

export const getProviderIcon = (provider: string): string => {
  const icons: Record<string, string> = {
    openai: '✨',
    claude: '🔷',
    deepseek: '🌟',
    google: '💎'
  };
  return icons[provider] || '🤖';
};

export const getProviderDescription = (provider: string, model: string): string => {
  const descriptions: Record<string, string> = {
    openai: '强大的推理能力，适合复杂任务',
    claude: '专业的代码理解和任务规划',
    deepseek: '高性价比，国产开源AI',
    google: 'Google最新AI模型'
  };
  return `${model} - ${descriptions[provider] || ''}`;
};

// 获取已启用的模型
export const getEnabledModels = (models: AIModel[]) => models.filter(m => m.enabled);

// 获取默认模型
export const getDefaultModel = (models: AIModel[]) => {
  const enabledModels = getEnabledModels(models);
  return enabledModels.length > 0 ? enabledModels[0].key : '';
};
