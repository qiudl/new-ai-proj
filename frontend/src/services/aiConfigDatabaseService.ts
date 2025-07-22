import { APIResponse } from '../types/api';
import { AIProvider } from '../types/ai';
import { request } from '../utils/request';

// AI配置数据库模型
export interface AIConfigEntity {
  id: number;
  provider: AIProvider;
  apiKey: string; // 前端显示时加密，只在创建/更新时传输明文
  model: string;
  baseURL?: string;
  temperature: number;
  maxTokens: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// 创建/更新AI配置请求
export interface AIConfigRequest {
  provider: AIProvider;
  apiKey: string; // 明文API密钥，后端会加密存储
  model: string;
  baseURL?: string;
  temperature: number;
  maxTokens: number;
  enabled: boolean;
}

// 获取配置响应（API密钥已脱敏）
export interface AIConfigResponse {
  id: number;
  provider: AIProvider;
  apiKeyMasked: string; // 脱敏后的API密钥，如"sk-****...****1234"
  model: string;
  baseURL?: string;
  temperature: number;
  maxTokens: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// 测试连接请求
export interface AITestRequest {
  provider: AIProvider;
  apiKey?: string; // 可选，如果不提供则使用已保存的配置
  model: string;
  baseURL?: string;
}

// 测试连接响应
export interface AITestResponse {
  success: boolean;
  message: string;
  responseTime?: number;
  modelInfo?: {
    name: string;
    version: string;
  };
}

class AIConfigDatabaseService {
  /**
   * 获取所有AI配置
   */
  async getConfigs(): Promise<APIResponse<AIConfigResponse[]>> {
    return request.get<AIConfigResponse[]>('/api/v1/system/ai-configs');
  }

  /**
   * 获取指定提供商的配置
   */
  async getConfig(provider: AIProvider): Promise<APIResponse<AIConfigResponse>> {
    return request.get<AIConfigResponse>(`/api/v1/system/ai-configs/${provider}`);
  }

  /**
   * 创建AI配置
   */
  async createConfig(config: AIConfigRequest): Promise<APIResponse<AIConfigResponse>> {
    return request.post<AIConfigResponse>('/api/v1/system/ai-configs', config);
  }

  /**
   * 更新AI配置
   */
  async updateConfig(provider: AIProvider, config: Partial<AIConfigRequest>): Promise<APIResponse<AIConfigResponse>> {
    return request.put<AIConfigResponse>(`/api/v1/system/ai-configs/${provider}`, config);
  }

  /**
   * 删除AI配置
   */
  async deleteConfig(provider: AIProvider): Promise<APIResponse<void>> {
    return request.delete<void>(`/api/v1/system/ai-configs/${provider}`);
  }

  /**
   * 测试AI连接
   */
  async testConnection(testConfig: AITestRequest): Promise<APIResponse<AITestResponse>> {
    return request.post<AITestResponse>('/api/v1/system/ai-configs/test', testConfig);
  }

  /**
   * 启用/禁用AI配置
   */
  async toggleConfig(provider: AIProvider, enabled: boolean): Promise<APIResponse<AIConfigResponse>> {
    return request.patch<AIConfigResponse>(`/api/v1/system/ai-configs/${provider}/toggle`, { enabled });
  }

  /**
   * 获取当前启用的AI配置
   */
  async getEnabledConfig(): Promise<APIResponse<AIConfigResponse | null>> {
    return request.get<AIConfigResponse | null>('/api/v1/system/ai-configs/enabled');
  }

  /**
   * 获取AI配置统计
   */
  async getConfigStats(): Promise<APIResponse<{
    total: number;
    enabled: number;
    providers: {
      provider: AIProvider;
      enabled: boolean;
      lastTested?: string;
    }[];
  }>> {
    return request.get('/api/v1/system/ai-configs/stats');
  }

  /**
   * 批量更新配置
   */
  async batchUpdateConfigs(configs: Partial<AIConfigRequest>[]): Promise<APIResponse<AIConfigResponse[]>> {
    return request.post<AIConfigResponse[]>('/api/v1/system/ai-configs/batch', { configs });
  }

  /**
   * 导出配置（不包含API密钥）
   */
  async exportConfigs(): Promise<APIResponse<{
    configs: Omit<AIConfigResponse, 'apiKeyMasked'>[];
    exportTime: string;
  }>> {
    return request.get('/api/v1/system/ai-configs/export');
  }

  /**
   * 获取API密钥掩码
   * @param apiKey 完整的API密钥
   * @returns 掩码后的API密钥
   */
  static maskApiKey(apiKey: string): string {
    if (!apiKey || apiKey.length < 8) {
      return '••••••••';
    }
    
    // 显示前4位和后4位，中间用星号代替
    const start = apiKey.substring(0, 4);
    const end = apiKey.substring(apiKey.length - 4);
    const middle = '•'.repeat(Math.max(8, apiKey.length - 8));
    
    return `${start}${middle}${end}`;
  }

  /**
   * 验证API密钥格式
   */
  static validateApiKey(provider: AIProvider, apiKey: string): {
    valid: boolean;
    message: string;
  } {
    if (!apiKey) {
      return { valid: false, message: 'API密钥不能为空' };
    }

    switch (provider) {
      case 'openai':
        if (!apiKey.startsWith('sk-')) {
          return { valid: false, message: 'OpenAI API密钥应以 sk- 开头' };
        }
        if (apiKey.length < 20) {
          return { valid: false, message: 'OpenAI API密钥长度不足' };
        }
        break;
        
      case 'claude':
        if (!apiKey.startsWith('sk-ant-')) {
          return { valid: false, message: 'Claude API密钥应以 sk-ant- 开头' };
        }
        if (apiKey.length < 30) {
          return { valid: false, message: 'Claude API密钥长度不足' };
        }
        break;
        
      case 'deepseek':
        if (!apiKey.startsWith('sk-')) {
          return { valid: false, message: 'DeepSeek API密钥应以 sk- 开头' };
        }
        if (apiKey.length < 20) {
          return { valid: false, message: 'DeepSeek API密钥长度不足' };
        }
        break;
        
      default:
        return { valid: false, message: '不支持的AI提供商' };
    }

    return { valid: true, message: 'API密钥格式正确' };
  }

  /**
   * 获取提供商的默认配置
   */
  static getDefaultConfig(provider: AIProvider): Partial<AIConfigRequest> {
    const defaults = {
      openai: {
        baseURL: 'https://api.openai.com/v1',
        model: 'gpt-3.5-turbo',
        temperature: 0.3,
        maxTokens: 2000,
        enabled: true
      },
      claude: {
        baseURL: 'https://api.anthropic.com/v1',
        model: 'claude-3-haiku-20240307',
        temperature: 0.3,
        maxTokens: 2000,
        enabled: true
      },
      deepseek: {
        baseURL: 'https://api.deepseek.com/v1',
        model: 'deepseek-chat',
        temperature: 0.3,
        maxTokens: 2000,
        enabled: true
      }
    };

    return { provider, ...defaults[provider] };
  }
}

export default new AIConfigDatabaseService();